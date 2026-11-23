import { CUBIE_STICKER_GROUPS_54, CROSS_EDGE_PAIRS, F2L_BY_ID, F2L_DATA, OLL_BY_ID, OLL_DATA, PLL_BY_ID, PLL_DATA, SCANNER_SAMPLE_OFFSETS, SCANNER_FLAT_GRID_CENTROIDS, SCANNER_COLOR_CODES } from './constants';

export function simplifyMoveSequence(algStr = '', preserveParens = false) {
  const rawTokens = (algStr || '').replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const stack = [];
  rawTokens.forEach((tok) => {
    const face = tok[0];
    if (!'UDFBRLxyz'.includes(face)) return;
    const mod = tok.slice(1);
    const pow = mod === '2' ? 2 : mod === "'" ? 3 : 1;
    if (stack.length > 0 && stack[stack.length - 1].face === face) {
      const combined = (stack[stack.length - 1].pow + pow) % 4;
      if (combined === 0) stack.pop();
      else stack[stack.length - 1].pow = combined;
    } else {
      stack.push({ face, pow });
    }
  });
  const clean = stack
    .map(({ face, pow }) => {
      const p = ((pow % 4) + 4) % 4;
      return p === 0 ? null : p === 1 ? face : p === 2 ? `${face}2` : `${face}'`;
    })
    .filter(Boolean)
    .join(' ');
  return !preserveParens || !clean ? clean : formatAlgWithTriggerBrackets(clean);
}

export function formatAlgWithTriggerBrackets(algStr = '') {
  if (!algStr) return '';
  let out = ` ${algStr.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const triggers = [
    "R U R' U'", "L' U' L U", "R' F R F'", "F R' F' R", "R U2 R'",
    "F' U2 F", "R U' R'", "U R U' R'", "U' F' U F", "U' R U R'",
    "U F' U' F", "F' U' F", "R U R'", "M2 U M2", "M' U M2 U"
  ];
  triggers.forEach((trig) => {
    const rx = new RegExp(`(?<!\\()\\b${trig.replace(/'/g, "\\'")}\\b(?!\\))`, 'g');
    out = out.replace(rx, `(${trig})`);
  });
  return out.replace(/\s+/g, ' ').trim();
}

export const scannedFacesTo54Array = (u, f, r, d, b, l) => [...u, ...r, ...f, ...d, ...l, ...b];

export const normalizeColorPattern = (stickers) => {
  const map = {};
  let idx = 0;
  return stickers.map((c) => (map[c] ??= String(idx++))).join('');
};

export function buildOrientationTipForStage(phaseKey, caseObj, algStr = '', aufHint = '', slotInfo = null) {
  const cleanAlg = (algStr || '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const preAufMatch = (aufHint || '').match(/Pre-AUF:\s*(U2|U'|U)/i);
  const preAuf = preAufMatch ? preAufMatch[1] : '';
  const hasLeadingY = /^y2|^y'|^y/.test(cleanAlg);
  const leadingY = hasLeadingY ? cleanAlg.split(/\s+/)[0] : '';

  if (phaseKey === 'cross') {
    return 'Hold White center on Bottom (D) and Green center facing you (F) — keep Orange on Right (R) and Red on Left (L) throughout.';
  }
  if (phaseKey === 'f2l') {
    const fCol = slotInfo?.frontColor || 'Green';
    const rCol = slotInfo?.rightColor || 'Orange';
    const slotNote = slotInfo?.slotLabel ? ` (${slotInfo.slotLabel} slot)` : '';
    const rotNote = leadingY
      ? ` Start with a ${leadingY} whole-cube rotation so the target slot sits at Front-Right.`
      : ` Hold White on Bottom (D) with ${fCol} in Front (F) and ${rCol} on Right (R) so your target pair${slotNote} sits at Front-Right.`;
    return `${rotNote.trim()} Keep your thumbs on the front layer without tilting D up.`;
  }
  if (phaseKey === 'oll') {
    const recognitionTip = caseObj?.recognition ? ` Pattern cue: ${caseObj.recognition}` : '';
    const aufTip = preAuf
      ? ` Turn the top layer ${preAuf} first (without rotating the whole cube) to match the diagram.`
      : ' No top-layer U turn needed — align the yellow pattern exactly as shown in the diagram.';
    return `Hold White on Bottom (D), Yellow on Top (U), and Green in Front (F).${aufTip}${recognitionTip}`;
  }
  const pllRec = caseObj?.recognition ? ` Look for: ${caseObj.recognition}` : '';
  const pllAuf = preAuf
    ? ` Turn the top layer ${preAuf} first so headlights/bars match the diagram's angle, then execute.`
    : ' Align the top layer so headlights/solved bars match the diagram before starting.';
  return `Hold White on Bottom (D), Yellow on Top (U), and Green in Front (F).${pllAuf}${pllRec}`;
}

export function applyMovesTo54State(stateArr, movesStr) {
  if (!movesStr) return stateArr;
  const s = [...stateArr];
  const rotCW = (o) => {
    const t = s.slice(o, o + 9);
    s[o] = t[6]; s[o + 1] = t[3]; s[o + 2] = t[0];
    s[o + 3] = t[7]; s[o + 4] = t[4]; s[o + 5] = t[1];
    s[o + 6] = t[8]; s[o + 7] = t[5]; s[o + 8] = t[2];
  };
  const rotCCW = (o) => { rotCW(o); rotCW(o); rotCW(o); };
  const cyc = (a, b, c, d) => {
    const tmp = s[a]; s[a] = s[d]; s[d] = s[c]; s[c] = s[b]; s[b] = tmp;
  };
  const turnM = () => { cyc(1, 19, 28, 52); cyc(4, 22, 31, 49); cyc(7, 25, 34, 46); };
  const turnE = () => { cyc(21, 12, 48, 39); cyc(22, 13, 49, 40); cyc(23, 14, 50, 41); };
  const turnS = () => { cyc(3, 10, 32, 43); cyc(4, 13, 31, 40); cyc(5, 16, 30, 37); };
  const turnOnce = (tok) => {
    if (tok === 'U') { rotCW(0); cyc(18, 36, 45, 9); cyc(19, 37, 46, 10); cyc(20, 38, 47, 11); }
    else if (tok === 'D') { rotCW(27); cyc(24, 15, 51, 42); cyc(25, 16, 52, 43); cyc(26, 17, 53, 44); }
    else if (tok === 'F') { rotCW(18); cyc(6, 9, 29, 44); cyc(7, 12, 28, 41); cyc(8, 15, 27, 38); }
    else if (tok === 'B') { rotCW(45); cyc(2, 36, 33, 17); cyc(1, 39, 34, 14); cyc(0, 42, 35, 11); }
    else if (tok === 'R') { rotCW(9); cyc(2, 51, 29, 20); cyc(5, 48, 32, 23); cyc(8, 45, 35, 26); }
    else if (tok === 'L') { rotCW(36); cyc(0, 18, 27, 53); cyc(3, 21, 30, 50); cyc(6, 24, 33, 47); }
    else if (tok === 'r') { turnOnce('R'); turnM(); turnM(); turnM(); }
    else if (tok === 'l') { turnOnce('L'); turnM(); }
    else if (tok === 'f') { turnOnce('F'); turnS(); }
    else if (tok === 'u') { turnOnce('U'); turnE(); turnE(); turnE(); }
    else if (tok === 'M') turnM();
    else if (tok === 'E') turnE();
    else if (tok === 'S') turnS();
    else if (tok === 'x') {
      rotCW(9); rotCCW(36);
      for (let i = 0; i < 9; i++) {
        const tmp = s[i]; s[i] = s[18 + i]; s[18 + i] = s[27 + i];
        s[27 + i] = s[53 - i]; s[53 - i] = tmp;
      }
    } else if (tok === 'y') {
      rotCW(0); rotCCW(27);
      for (let i = 0; i < 9; i++) cyc(18 + i, 9 + i, 45 + i, 36 + i);
    } else if (tok === 'z') {
      rotCW(18); rotCCW(45);
      rotCW(0); rotCW(9); rotCW(27); rotCW(36);
      for (let i = 0; i < 9; i++) {
        const tmp = s[9 + i]; s[9 + i] = s[i]; s[i] = s[36 + i];
        s[36 + i] = s[27 + i]; s[27 + i] = tmp;
      }
    }
  };
  (movesStr || '').replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean).forEach((tok) => {
    const face = tok[0];
    if (!'UDFBRLrlfuMESxyz'.includes(face)) return;
    const count = tok.endsWith('2') ? 2 : tok.endsWith("'") ? 3 : 1;
    for (let i = 0; i < count; i++) turnOnce(face);
  });
  return s;
}

export function inspectCrossOn54(s) {
  const checks = [
    { name: 'Green (DF)', solved: s[28] === 'W' && s[25] === s[22] },
    { name: 'Orange (DR)', solved: s[32] === 'W' && s[16] === s[13] },
    { name: 'Blue (DB)', solved: s[34] === 'W' && s[52] === s[49] },
    { name: 'Red (DL)', solved: s[30] === 'W' && s[43] === s[40] }
  ];
  return {
    solvedCount: checks.filter((c) => c.solved).length,
    solvedNames: checks.filter((c) => c.solved).map((c) => c.name),
    unsolvedNames: checks.filter((c) => !c.solved).map((c) => c.name)
  };
}

const OPTIMAL_CROSS_CACHE = new Map();
const CROSS_HTM_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'R', "R'", 'R2', 'B', "B'", 'B2', 'L', "L'", 'L2'];
const OPPOSITE_FACE_MAP = { U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L' };
const CROSS_EDGE_SPECS = [
  { dIdx: 28, sideIdx: 25, centerCol: 'G' },
  { dIdx: 32, sideIdx: 16, centerCol: 'O' },
  { dIdx: 34, sideIdx: 52, centerCol: 'B' },
  { dIdx: 30, sideIdx: 43, centerCol: 'R' }
];

export function encodeCrossEdgesKey(s) {
  const pos = [0, 0, 0, 0];
  const slots = [
    [28, 25], [32, 16], [34, 52], [30, 43],
    [7, 19], [5, 10], [1, 46], [3, 37],
    [23, 12], [14, 48], [39, 50], [41, 21]
  ];
  for (let idx = 0; idx < 12; idx++) {
    const [a, b] = slots[idx];
    const ca = s[a], cb = s[b];
    if (ca === 'W' || cb === 'W') {
      const other = ca === 'W' ? cb : ca;
      const flip = ca === 'W' ? 0 : 1;
      const eId = other === 'G' ? 0 : other === 'O' ? 1 : other === 'B' ? 2 : 3;
      pos[eId] = idx * 2 + flip;
    }
  }
  return (pos[0] << 15) | (pos[1] << 10) | (pos[2] << 5) | pos[3];
}

export function crossHeuristicLowerBound(s) {
  let unsolved = 0;
  let needsFOrB = 0;
  for (let i = 0; i < 4; i++) {
    const { dIdx, sideIdx, centerCol } = CROSS_EDGE_SPECS[i];
    if (s[dIdx] !== 'W' || s[sideIdx] !== centerCol) {
      unsolved++;
      if (s[dIdx] === centerCol && s[sideIdx] === 'W') needsFOrB++;
    }
  }
  if (unsolved === 0) return 0;
  return Math.max(Math.ceil(unsolved / 2), needsFOrB > 0 ? 2 : 1);
}

export function solveExactCrossFrom54(startState) {
  const initialInfo = inspectCrossOn54(startState);
  if (initialInfo.solvedCount === 4) return { moves: '', postState: startState, info: initialInfo };

  const cacheKey = encodeCrossEdgesKey(startState);
  if (OPTIMAL_CROSS_CACHE.has(cacheKey)) {
    const cachedMoves = OPTIMAL_CROSS_CACHE.get(cacheKey);
    const postSt = applyMovesTo54State(startState, cachedMoves);
    return { moves: cachedMoves, postState: postSt, info: inspectCrossOn54(postSt) };
  }

  let foundSolution = null;
  const path = [];

  const dfs = (state, depth, maxDepth, lastFace, prevFace) => {
    const h = crossHeuristicLowerBound(state);
    if (h === 0) {
      foundSolution = path.join(' ');
      return true;
    }
    if (depth + h > maxDepth) return false;

    for (let i = 0; i < CROSS_HTM_MOVES.length; i++) {
      const mv = CROSS_HTM_MOVES[i];
      const face = mv[0];
      if (face === lastFace) continue;
      if (prevFace && face === prevFace && OPPOSITE_FACE_MAP[face] === lastFace) continue;

      path.push(mv);
      const nextSt = applyMovesTo54State(state, mv);
      if (dfs(nextSt, depth + 1, maxDepth, face, lastFace)) return true;
      path.pop();
    }
    return false;
  };

  const startBound = Math.max(1, crossHeuristicLowerBound(startState));
  for (let maxDepth = startBound; maxDepth <= 8; maxDepth++) {
    if (dfs(startState, 0, maxDepth, '', '')) break;
  }

  const cleanMoves = simplifyMoveSequence(foundSolution || '');
  const finalState = cleanMoves ? applyMovesTo54State(startState, cleanMoves) : startState;
  if (inspectCrossOn54(finalState).solvedCount === 4) {
    if (OPTIMAL_CROSS_CACHE.size >= 512) {
      const oldestKey = OPTIMAL_CROSS_CACHE.keys().next().value;
      if (oldestKey !== undefined) OPTIMAL_CROSS_CACHE.delete(oldestKey);
    }
    OPTIMAL_CROSS_CACHE.set(cacheKey, cleanMoves);
  }
  return { moves: cleanMoves, postState: finalState, info: inspectCrossOn54(finalState) };
}

export function isFrontRightF2LSolved54(s) {
  return s[29] === 'W' && s[26] === s[22] && s[23] === s[22] && s[15] === s[13] && s[12] === s[13];
}

export function countSolvedF2LSlots54(s) {
  let rot = [...s];
  let count = 0;
  for (let i = 0; i < 4; i++) {
    if (isFrontRightF2LSolved54(rot)) count++;
    rot = applyMovesTo54State(rot, 'y');
  }
  return count;
}

export function matchBestF2LForFrontRight54(s) {
  const fCenter = s[22];
  const rCenter = s[13];
  const targetColors = new Set(['W', fCenter, rCenter]);
  const edgeTargetColors = new Set([fCenter, rCenter]);
  const baseSolvedSlots = countSolvedF2LSlots54(s);

  const cornerSlots = [
    { name: 'UFR', stickers: [s[8], s[20], s[9]], extract: '' },
    { name: 'UFL', stickers: [s[6], s[18], s[38]], extract: "U'" },
    { name: 'UBR', stickers: [s[2], s[11], s[45]], extract: 'U' },
    { name: 'UBL', stickers: [s[0], s[36], s[47]], extract: 'U2' },
    { name: 'DFR', stickers: [s[29], s[26], s[15]], extract: "R U R' U'" },
    { name: 'DFL', stickers: [s[27], s[24], s[44]], extract: "L' U' L" },
    { name: 'DBR', stickers: [s[35], s[17], s[51]], extract: "R' U R U'" },
    { name: 'DBL', stickers: [s[33], s[42], s[53]], extract: "L U2 L'" }
  ];
  const middleEdgeSlots = [
    { name: 'FR', stickers: [s[23], s[12]], extract: "R U R' U'" },
    { name: 'FL', stickers: [s[21], s[41]], extract: "L' U' L" },
    { name: 'BR', stickers: [s[48], s[14]], extract: "R' U R" },
    { name: 'BL', stickers: [s[50], s[39]], extract: "L U L'" }
  ];

  const foundCorner = cornerSlots.find((c) => c.stickers.every((col) => targetColors.has(col)) && new Set(c.stickers).size === 3);
  const foundEdge = middleEdgeSlots.find((e) => e.stickers.every((col) => edgeTargetColors.has(col)) && new Set(e.stickers).size === 2);

  let bestCanonical = null;
  for (const preU of ['', 'U', "U'", 'U2']) {
    const uState = preU ? applyMovesTo54State(s, preU) : s;
    for (const candidate of F2L_DATA) {
      const after = applyMovesTo54State(uState, candidate.alg);
      if (isFrontRightF2LSolved54(after) && inspectCrossOn54(after).solvedCount === 4 && countSolvedF2LSlots54(after) >= baseSolvedSlots + 1) {
        const rawCombined = simplifyMoveSequence(`${preU} ${candidate.alg}`, false);
        const moveLen = rawCombined ? rawCombined.split(/\s+/).length : 0;
        if (!bestCanonical || moveLen < bestCanonical.moveLen) {
          bestCanonical = {
            caseObj: candidate,
            preU,
            fullAlg: simplifyMoveSequence(rawCombined, true),
            rawAlg: rawCombined,
            moveLen,
            postState: applyMovesTo54State(s, rawCombined)
          };
        }
      }
    }
  }
  if (bestCanonical) return bestCanonical;

  const setupCandidates = Array.from(new Set([
    foundCorner?.extract || '',
    foundEdge?.extract || '',
    foundCorner?.name === 'DFR' ? "R U' R' U" : '',
    foundEdge?.name === 'FR' ? "R U' R' U" : '',
    simplifyMoveSequence(`${foundCorner?.extract || ''} ${foundEdge?.extract || ''}`),
    simplifyMoveSequence(`${foundEdge?.extract || ''} ${foundCorner?.extract || ''}`)
  ])).filter(Boolean);

  let bestVerified = null;
  for (const setupPrefix of setupCandidates) {
    const workState = applyMovesTo54State(s, setupPrefix);
    if (countSolvedF2LSlots54(workState) < baseSolvedSlots) continue;
    for (const preU of ['', 'U', "U'", 'U2']) {
      const uState = preU ? applyMovesTo54State(workState, preU) : workState;
      for (const candidate of F2L_DATA) {
        const after = applyMovesTo54State(uState, candidate.alg);
        if (isFrontRightF2LSolved54(after) && inspectCrossOn54(after).solvedCount === 4 && countSolvedF2LSlots54(after) >= baseSolvedSlots + 1) {
          const rawCombined = simplifyMoveSequence(`${setupPrefix} ${preU} ${candidate.alg}`, false);
          const moveLen = rawCombined ? rawCombined.split(/\s+/).length : 0;
          if (!bestVerified || moveLen < bestVerified.moveLen) {
            bestVerified = {
              caseObj: candidate,
              preU: simplifyMoveSequence(`${setupPrefix} ${preU}`),
              fullAlg: simplifyMoveSequence(rawCombined, true),
              rawAlg: rawCombined,
              moveLen,
              postState: applyMovesTo54State(s, rawCombined)
            };
          }
        }
      }
    }
    if (bestVerified) break;
  }

  if (bestVerified) return bestVerified;
  const fallback = F2L_BY_ID.get(4) || F2L_DATA[0];
  const fallbackRaw = simplifyMoveSequence(`${foundCorner?.extract || ''} ${fallback.alg}`, false);
  return { caseObj: fallback, preU: '', fullAlg: simplifyMoveSequence(fallbackRaw, true), rawAlg: fallbackRaw, moveLen: 99, postState: applyMovesTo54State(s, fallbackRaw) };
}

export function solveAllF2LPairsFrom54(postCrossState) {
  let curState = [...postCrossState];
  const colorNameMap = { G: 'Green', O: 'Orange', B: 'Blue', R: 'Red' };
  const slotSteps = [];
  const fullF2LTokens = [];
  for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
    if (!isFrontRightF2LSolved54(curState)) {
      const frontColor = colorNameMap[curState[22]] || 'Green';
      const rightColor = colorNameMap[curState[13]] || 'Orange';
      const solvedPair = matchBestF2LForFrontRight54(curState);
      slotSteps.push({
        slotNumber: slotSteps.length + 1,
        slotColors: `${curState[22]}/${curState[13]}`,
        slotLabel: `${frontColor}/${rightColor}`,
        frontColor,
        rightColor,
        preU: solvedPair.preU || '',
        caseObj: solvedPair.caseObj,
        alg: solvedPair.fullAlg,
        rawAlg: solvedPair.rawAlg
      });
      fullF2LTokens.push(solvedPair.rawAlg);
      curState = solvedPair.postState;
    }
    if (slotIdx < 3) { fullF2LTokens.push('y'); curState = applyMovesTo54State(curState, 'y'); }
  }
  return { steps: slotSteps, combinedAlg: simplifyMoveSequence(fullF2LTokens.join(' '), true) || 'All 4 F2L Pairs Solved ✓', postState: curState };
}

export function invertAlgorithm(alg) {
  const cleaned = alg.replace(/[()]/g, '').trim();
  if (!cleaned) return '';
  return cleaned.split(/\s+/).reverse().map((tok) => tok.endsWith('2') ? tok : tok.endsWith("'") ? tok.slice(0, -1) : `${tok}'`).join(' ');
}

let CACHED_SIGNATURES = null;
export function getCaseSignatures() {
  if (CACHED_SIGNATURES) return CACHED_SIGNATURES;
  const ollSigs = OLL_DATA.map((item) => {
    let curSt = applyMovesTo54State(
      [
        ...Array(9).fill('Y'), ...Array(9).fill('O'), ...Array(9).fill('G'),
        ...Array(9).fill('W'), ...Array(9).fill('R'), ...Array(9).fill('B')
      ], 
      invertAlgorithm(item.alg)
    );
    const rotations = Array.from({ length: 4 }, (_, rot) => {
      const sig = {
        rot,
        uMask: curSt.slice(0, 9).map((c) => (c === 'Y' ? '1' : '0')).join(''),
        sideMask: [...curSt.slice(18, 21), ...curSt.slice(9, 12)].map((c) => (c === 'Y' ? '1' : '0')).join(''),
        fullSideMask: [...curSt.slice(18, 21), ...curSt.slice(9, 12), ...curSt.slice(45, 48), ...curSt.slice(36, 39)]
          .map((c) => (c === 'Y' ? '1' : '0'))
          .join('')
      };
      curSt = applyMovesTo54State(curSt, "U'");
      return sig;
    });
    return { item, rotations };
  });

  const pllSigs = PLL_DATA.filter((item) => item.id <= 21).map((item) => {
    let curSt = applyMovesTo54State(
      [
        ...Array(9).fill('Y'), ...Array(9).fill('O'), ...Array(9).fill('G'),
        ...Array(9).fill('W'), ...Array(9).fill('R'), ...Array(9).fill('B')
      ], 
      invertAlgorithm(item.alg)
    );
    const rotations = Array.from({ length: 4 }, (_, rot) => {
      const pattern = normalizeColorPattern([...curSt.slice(18, 21), ...curSt.slice(9, 12)]);
      const fullPattern = normalizeColorPattern([...curSt.slice(18, 21), ...curSt.slice(9, 12), ...curSt.slice(45, 48), ...curSt.slice(36, 39)]);
      curSt = applyMovesTo54State(curSt, "U'");
      return { rot, pattern, fullPattern };
    });
    return { item, rotations };
  });
  CACHED_SIGNATURES = { ollSigs, pllSigs };
  return CACHED_SIGNATURES;
}

export function matchBestOllFromGrids(uGrid, fGrid, rGrid, bGrid = null, lGrid = null, topColor = 'Y') {
  const { ollSigs } = getCaseSignatures();
  const has4Sides = Boolean(bGrid && lGrid);
  const scannedUMask = uGrid.map((c) => (c === topColor ? '1' : '0')).join('');
  const scannedSide2 = [...fGrid.slice(0, 3), ...rGrid.slice(0, 3)].map((c) => (c === topColor ? '1' : '0')).join('');
  const scannedSide4 = has4Sides
    ? [...fGrid.slice(0, 3), ...rGrid.slice(0, 3), ...bGrid.slice(0, 3), ...lGrid.slice(0, 3)].map((c) => (c === topColor ? '1' : '0')).join('')
    : '';

  let bestOll = ollSigs[0].item, bestScore = -1, bestRot = 0;
  ollSigs.forEach(({ item, rotations }) => rotations.forEach(({ rot, uMask, sideMask, fullSideMask }) => {
    let score = rot === 0 ? 0.5 : 0;
    if (has4Sides) {
      if (uMask === scannedUMask && fullSideMask === scannedSide4) score += 150;
      for (let i = 0; i < 9; i++) if (scannedUMask[i] === uMask[i]) score += 4;
      for (let j = 0; j < 12; j++) if (scannedSide4[j] === fullSideMask[j]) score += 4;
    } else {
      if (uMask === scannedUMask && sideMask === scannedSide2) score += 100;
      for (let i = 0; i < 9; i++) if (scannedUMask[i] === uMask[i]) score += 4;
      for (let j = 0; j < 6; j++) if (scannedSide2[j] === sideMask[j]) score += 3;
    }
    if (score > bestScore) { bestScore = score; bestOll = item; bestRot = rot; }
  }));
  return { bestOll, bestScore, bestRot, preAuf: ['', 'U', 'U2', "U'"][bestRot] };
}

export function matchBestPllFromGrids(fGrid, rGrid, bGrid = null, lGrid = null, full54State = null) {
  const { pllSigs } = getCaseSignatures();
  const has4Sides = Boolean(bGrid && lGrid);
  const sideStickers = has4Sides
    ? [...fGrid.slice(0, 3), ...rGrid.slice(0, 3), ...bGrid.slice(0, 3), ...lGrid.slice(0, 3)]
    : [...fGrid.slice(0, 3), ...rGrid.slice(0, 3)];
  const scannedPattern = normalizeColorPattern(sideStickers);

  let bestPll = pllSigs[0].item, bestScore = -1, bestRot = 0;
  pllSigs.forEach(({ item, rotations }) => rotations.forEach(({ rot, pattern, fullPattern }) => {
    const target = has4Sides ? fullPattern : pattern;
    let score = rot === 0 ? 0.5 : 0;
    if (target === scannedPattern) score += 150;
    for (let i = 0; i < target.length; i++) if (target[i] === scannedPattern[i]) score += 4;
    if (score > bestScore) { bestScore = score; bestPll = item; bestRot = rot; }
  }));

  const preAuf = ['', 'U', 'U2', "U'"][bestRot];
  let postAuf = '';
  if (full54State) {
    const afterPll = applyMovesTo54State(full54State, `${preAuf} ${bestPll.alg}`);
    for (const candidateAuf of ['', 'U', "U'", 'U2']) {
      const testSt = candidateAuf ? applyMovesTo54State(afterPll, candidateAuf) : afterPll;
      if (testSt[19] === testSt[22] && testSt[10] === testSt[13]) { postAuf = candidateAuf; break; }
    }
  }
  const aufHint = preAuf
    ? `Pre-AUF: ${preAuf} before executing${postAuf ? ` • Post-AUF: ${postAuf}` : ''}`
    : postAuf
    ? `No Pre-AUF • Finish with ${postAuf} AUF`
    : 'Ready from current angle (No Pre-AUF)';
  return { bestPll, bestScore, preAuf, postAuf, aufHint };
}

export function analyzeFull54Cube(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid) {
  const initial54 = scannedFacesTo54Array(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid);
  const crossCheck = inspectCrossOn54(initial54);
  const remainingF2lPairs = 4 - countSolvedF2LSlots54(initial54);

  const crossSol = solveExactCrossFrom54(initial54);
  const f2lSol = solveAllF2LPairsFrom54(crossSol.postState);
  const postF2L54 = f2lSol.postState;
  const firstF2lStep = f2lSol.steps[0] || null;
  const firstF2lCase = firstF2lStep?.caseObj || F2L_BY_ID.get(4) || F2L_DATA[0];

  const solvedMeta = { crossSolved: true, solvedCrossCount: 4, remainingCrossNames: [], remainingF2lPairs: 0, unsolvedSlotNames: [] };
  const ollAnalysis = analyzeScanned3FaceCube(postF2L54.slice(0, 9), postF2L54.slice(18, 27), postF2L54.slice(9, 18), solvedMeta, null, postF2L54);
  const matchedOllCase = ollAnalysis.phase === 'oll' ? ollAnalysis.matchedCase : OLL_BY_ID.get(27) || OLL_DATA[0];
  const matchedOllAlg = ollAnalysis.phase === 'oll'
    ? simplifyMoveSequence(`${ollAnalysis.aufHint.startsWith('Pre-AUF:') ? ollAnalysis.aufHint.replace('Pre-AUF:', '').replace('before executing', '').trim() : ''} ${matchedOllCase.alg}`, true)
    : 'Top Yellow Already Oriented ✓';

  const postOll54 = ollAnalysis.phase === 'oll' ? applyMovesTo54State(postF2L54, matchedOllAlg) : postF2L54;
  const pllAnalysis = analyzeScanned3FaceCube(postOll54.slice(0, 9), postOll54.slice(18, 27), postOll54.slice(9, 18), solvedMeta, null, postOll54);
  const matchedPllCase = pllAnalysis.phase === 'pll' ? pllAnalysis.matchedCase : PLL_BY_ID.get(8) || PLL_DATA[0];
  const prePllAuf = pllAnalysis.aufHint?.startsWith('Pre-AUF:')
    ? pllAnalysis.aufHint.replace('Pre-AUF:', '').replace('before executing', '').trim()
    : '';
  const postPllAuf = pllAnalysis.postAuf || '';
  const matchedPllAlg = simplifyMoveSequence(`${prePllAuf} ${matchedPllCase.alg} ${postPllAuf}`, true);

  const isCrossDone = crossCheck.solvedCount === 4;
  const cfopStages = [
    {
      stage: '1. Cross',
      phaseKey: 'cross',
      label: isCrossDone ? 'Cross Solved ✓ (4/4)' : `Solve ${crossCheck.unsolvedNames.length} Edge${crossCheck.unsolvedNames.length === 1 ? '' : 's'}`,
      alg: crossSol.moves ? formatAlgWithTriggerBrackets(crossSol.moves) : 'Cross Already Solved ✓',
      fingertrick: isCrossDone
        ? 'All 4 white cross edges are aligned with their centers—jump straight to F2L Pair 1.'
        : 'Execute in a single smooth fingertrick flow while tracking your first F2L corner-edge pair.',
      orientationTip: buildOrientationTipForStage('cross', null, crossSol.moves),
      summary: isCrossDone
        ? 'Cross is already solved! Begin immediately with Stage 2 (F2L).'
        : `Solves ${crossCheck.unsolvedNames.join(', ')} cleanly with zero redundant moves, transitioning directly into ${firstF2lCase.name}.`
    },
    {
      stage: '2. F2L Pairs',
      phaseKey: 'f2l',
      label: f2lSol.steps.length === 0 ? 'All 4 Pairs Solved ✓' : `${f2lSol.steps.length} Pair${f2lSol.steps.length === 1 ? '' : 's'} (${f2lSol.steps.map((st) => st.caseObj.name).join(' → ')})`,
      alg: f2lSol.combinedAlg,
      caseObj: firstF2lCase,
      subSteps: f2lSol.steps,
      fingertrick: firstF2lCase.fingertrick,
      orientationTip: buildOrientationTipForStage('f2l', firstF2lCase, f2lSol.combinedAlg, '', firstF2lStep),
      summary: f2lSol.steps.length === 0
        ? 'All 4 F2L slots are complete—advance straight to Stage 3 (OLL).'
        : `Solves all ${f2lSol.steps.length} remaining F2L slot${f2lSol.steps.length === 1 ? '' : 's'} sequentially (${f2lSol.steps.map((st) => `${st.caseObj.name}: ${st.alg}`).join(' | ')}).`
    },
    {
      stage: '3. OLL Target',
      phaseKey: 'oll',
      label: ollAnalysis.phase === 'oll' ? matchedOllCase.name : 'OLL Skip ✓',
      alg: matchedOllAlg,
      caseObj: matchedOllCase,
      fingertrick: matchedOllCase.fingertrick,
      orientationTip: buildOrientationTipForStage('oll', matchedOllCase, matchedOllAlg, ollAnalysis.aufHint),
      summary: ollAnalysis.phase === 'oll'
        ? `Orients the entire yellow top face in 1 look, setting up ${matchedPllCase.name} for PLL.`
        : 'Top face is already solid yellow after F2L—skip directly to Stage 4 (PLL).'
    },
    {
      stage: '4. PLL Finish',
      phaseKey: 'pll',
      label: `${matchedPllCase.name}${postPllAuf ? ` + ${postPllAuf}` : ''}`,
      alg: matchedPllAlg,
      caseObj: matchedPllCase,
      fingertrick: matchedPllCase.fingertrick,
      orientationTip: buildOrientationTipForStage('pll', matchedPllCase, matchedPllAlg, pllAnalysis.aufHint),
      summary: `${matchedPllCase.recognition} ${postPllAuf ? `Finish with ${postPllAuf} AUF to solve the cube.` : 'Solves the cube with no AUF needed.'}`
    }
  ];

  const primaryStage = isCrossDone ? (f2lSol.steps.length > 0 ? cfopStages[1] : ollAnalysis.phase === 'oll' ? cfopStages[2] : cfopStages[3]) : cfopStages[0];

  return {
    phase: primaryStage.phaseKey,
    isFullScramble: true,
    crossSolved: isCrossDone,
    solvedCrossCount: crossCheck.solvedCount,
    remainingCrossNames: crossCheck.unsolvedNames,
    remainingF2lPairs,
    phaseLabel: isCrossDone ? `Cross ✓ • ${remainingF2lPairs} F2L Left • Full CFOP Roadmap` : `Cross ${crossCheck.solvedCount}/4 • ${remainingF2lPairs} F2L Left • Full CFOP`,
    confidence: 97,
    matchedCase: primaryStage.caseObj || { id: 1, name: primaryStage.label, alg: primaryStage.alg, fingertrick: primaryStage.fingertrick },
    orientationTip: primaryStage.orientationTip,
    aufHint: isCrossDone
      ? `Cross Solved ✓ • ${f2lSol.steps.length} F2L Pair${f2lSol.steps.length === 1 ? '' : 's'} → ${matchedOllCase.name} → ${matchedPllCase.name}`
      : `Remaining Cross: ${crossCheck.unsolvedNames.join(', ')} • ${remainingF2lPairs} F2L Left`,
    nextUpTitle: `Complete CFOP Chain: ${cfopStages.map((s) => s.label).join(' → ')}`,
    nextUpBadge: 'Verified Start-to-Finish CFOP',
    nextUpCase: firstF2lCase,
    nextUpSummary: primaryStage.summary,
    cfopStages
  };
}

export function analyzeScanned3FaceCube(uGrid, fGrid, rGrid, fullMeta = null, userHints = null, full54State = null) {
  const { pllSigs } = getCaseSignatures();
  const topColor = uGrid[4] || 'Y';
  const fCenter = fGrid[4] || 'G';
  const rCenter = rGrid[4] || 'O';

  const greenEdgeSolved = fGrid[7] === fCenter;
  const orangeEdgeSolved = rGrid[7] === rCenter;
  const visibleUnsolved = [...(!greenEdgeSolved ? ['Green (DF)'] : []), ...(!orangeEdgeSolved ? ['Orange (DR)'] : [])];
  const isCrossSolved = fullMeta ? fullMeta.crossSolved : userHints?.crossSolved ?? (greenEdgeSolved && orangeEdgeSolved);

  const frSlotSolved = fGrid[8] === fCenter && fGrid[5] === fCenter && rGrid[6] === rCenter && rGrid[3] === rCenter;
  const flVisibleSolved = fGrid[6] === fCenter && fGrid[3] === fCenter;
  const brVisibleSolved = rGrid[8] === rCenter && rGrid[5] === rCenter;

  const hintedF2l = userHints?.f2lCompletedStatus || null;
  const f2lRowsSolved = fullMeta ? fullMeta.remainingF2lPairs === 0 :
    hintedF2l === 'all' ? true : (hintedF2l === 'none' || hintedF2l === 'some') ? false :
    frSlotSolved && flVisibleSolved && brVisibleSolved;

  const baseOpen = (frSlotSolved ? 0 : 1) + (flVisibleSolved ? 0 : 1) + (brVisibleSolved ? 0 : 1);
  const estimatedRemainingPairs = fullMeta ? fullMeta.remainingF2lPairs :
    hintedF2l === 'all' ? 0 : hintedF2l === 'none' ? 4 : hintedF2l === 'some' ? Math.max(1, baseOpen) : baseOpen;

  const allTopOriented = uGrid.every((c) => c === topColor);

  if (!isCrossSolved) {
    const missingLabel = visibleUnsolved.length > 0 ? visibleUnsolved.join(' & ') : 'Back/Left Cross Edges';
    const crossAlg = !greenEdgeSolved && !orangeEdgeSolved ? "F R' D' R F2" : !greenEdgeSolved ? "F' R' D' R F" : !orangeEdgeSolved ? "R' F D F' R" : "D' R' D";
    const firstF2l = F2L_BY_ID.get(4) || F2L_DATA[0];
    return {
      phase: 'cross',
      crossSolved: false,
      solvedCrossCount: fullMeta ? fullMeta.solvedCrossCount : 2 - visibleUnsolved.length,
      remainingCrossNames: visibleUnsolved.length > 0 ? visibleUnsolved : ['Blue (DB)', 'Red (DL)'],
      remainingF2lPairs: Math.max(1, estimatedRemainingPairs),
      phaseLabel: `Cross Unsolved (${missingLabel}) • ${Math.max(1, estimatedRemainingPairs)} F2L Left`,
      confidence: 94,
      matchedCase: { id: 1, name: `Solve Remaining Cross: ${missingLabel}`, alg: crossAlg, fingertrick: 'Align white edges to their matching centers on D before inserting F2L pairs.' },
      orientationTip: buildOrientationTipForStage('cross', null, crossAlg),
      aufHint: visibleUnsolved.length > 0 ? `Remaining Cross Edges: ${visibleUnsolved.join(', ')} (Scan D•B•L for full 4-edge solve)` : 'Front cross edges look aligned — capture D•B•L to locate hidden back/left cross edges',
      nextUpTitle: `Next Up: F2L (${Math.max(1, estimatedRemainingPairs)} Pairs Left)`,
      nextUpBadge: 'Cross → F2L Transition',
      nextUpCase: firstF2l,
      nextUpSummary: `Finish ${missingLabel} (${crossAlg}), then solve the remaining ${Math.max(1, estimatedRemainingPairs)} F2L pairs starting with Front-Right.`
    };
  }

  if (allTopOriented && f2lRowsSolved) {
    const alreadySolved = full54State
      ? full54State.slice(18, 21).every((c) => c === full54State[22]) &&
        full54State.slice(9, 12).every((c) => c === full54State[13]) &&
        full54State.slice(45, 48).every((c) => c === full54State[49]) &&
        full54State.slice(36, 39).every((c) => c === full54State[40])
      : fGrid[0] === fCenter && fGrid[1] === fCenter && fGrid[2] === fCenter && rGrid[0] === rCenter && rGrid[1] === rCenter && rGrid[2] === rCenter;

    if (alreadySolved) {
      const solvedCase = PLL_BY_ID.get(1) || PLL_DATA[0];
      return {
        phase: 'pll', crossSolved: true, remainingF2lPairs: 0, phaseLabel: 'Cube Solved ✓ (0 Moves Needed)',
        confidence: 99, matchedCase: solvedCase, aufHint: 'Solved! All layers match their centers.',
        orientationTip: buildOrientationTipForStage('pll', solvedCase, '', 'Solved!'),
        nextUpTitle: 'Cube Solved! ✓', nextUpBadge: 'Complete', nextUpCase: null, nextUpSummary: 'Every visible face is solved—no algorithm needed.'
      };
    }

    const { bestPll, bestScore, preAuf, postAuf, aufHint } = matchBestPllFromGrids(
      fGrid, rGrid, full54State?.slice(45, 54) || null, full54State?.slice(36, 45) || null, full54State
    );

    return {
      phase: 'pll', crossSolved: true, remainingF2lPairs: 0, phaseLabel: 'Cross Solved ✓ • 0 F2L Left • PLL',
      confidence: Math.min(99, full54State ? 99 : Math.round(74 + bestScore * 1.4)),
      matchedCase: bestPll,
      postAuf,
      aufHint,
      orientationTip: buildOrientationTipForStage('pll', bestPll, bestPll.alg, aufHint),
      nextUpTitle: preAuf ? `Execute ${preAuf} → ${bestPll.name}` : `Execute ${bestPll.name}`,
      nextUpBadge: 'Final Layer PLL', nextUpCase: null,
      nextUpSummary: `Cross & all 4 F2L pairs are solved. ${preAuf ? `Do ${preAuf} first, then execute ` : 'Execute '}${bestPll.name} (${bestPll.alg})${postAuf ? ` and finish with ${postAuf}` : ''}.`
    };
  }

  if (f2lRowsSolved && !allTopOriented) {
    const { bestOll, bestScore, preAuf } = matchBestOllFromGrids(
      uGrid, fGrid, rGrid, full54State?.slice(45, 54) || null, full54State?.slice(36, 45) || null, topColor
    );

    const simBase = full54State || SOLVED_54_STATE;
    const simMoves = full54State ? `${preAuf} ${bestOll.alg}` : `${invertAlgorithm(bestOll.alg)} ${preAuf} ${bestOll.alg}`;
    const postState = applyMovesTo54State(simBase, simMoves);
    const postFullPattern = normalizeColorPattern([...postState.slice(18, 21), ...postState.slice(9, 12), ...postState.slice(45, 48), ...postState.slice(36, 39)]);
    const predictedPll = pllSigs.find((p) => p.rotations.some((r) => r.fullPattern === postFullPattern))?.item || PLL_BY_ID.get(8) || PLL_DATA[0];
    const aufHint = !preAuf ? 'Ready from current angle' : `Pre-AUF: ${preAuf} before executing`;

    return {
      phase: 'oll', crossSolved: true, remainingF2lPairs: 0, phaseLabel: 'Cross Solved ✓ • 0 F2L Left • OLL',
      confidence: Math.min(99, full54State ? 99 : Math.round(62 + bestScore * 0.7)),
      matchedCase: bestOll,
      aufHint,
      orientationTip: buildOrientationTipForStage('oll', bestOll, bestOll.alg, aufHint),
      nextUpTitle: `Follow-Up Case: ${predictedPll.name}`, nextUpBadge: 'Predicted Next PLL', nextUpCase: predictedPll,
      nextUpSummary: `Cross & all 4 F2L pairs are solved. ${preAuf ? `Turn ${preAuf} first, then execute ` : 'Execute '}${bestOll.name} to orient the yellow top.`
    };
  }

  const pairsLeft = Math.max(1, estimatedRemainingPairs);
  const [frCornerTop, frCornerFront, frCornerRight] = [uGrid[8], fGrid[2], rGrid[0]];
  const targetCornerSet = new Set(['W', fCenter, rCenter]);
  const targetEdgeSet = new Set([fCenter, rCenter]);

  const ufrHasTargetCorner = [frCornerTop, frCornerFront, frCornerRight].every((c) => targetCornerSet.has(c)) && new Set([frCornerTop, frCornerFront, frCornerRight]).size === 3;
  const dfrHasTargetCorner = [fGrid[8], rGrid[6]].includes('W') || (fGrid[8] === fCenter && rGrid[6] === rCenter);
  const urHasTargetEdge = [uGrid[5], rGrid[1]].every((c) => targetEdgeSet.has(c)) && uGrid[5] !== rGrid[1];
  const ufHasTargetEdge = [uGrid[7], fGrid[1]].every((c) => targetEdgeSet.has(c)) && uGrid[7] !== fGrid[1];
  const frHasTargetEdge = [fGrid[5], rGrid[3]].every((c) => targetEdgeSet.has(c)) && fGrid[5] !== rGrid[3];

  let targetF2lId = 4;
  let f2lPreU = '';
  if (dfrHasTargetCorner && frHasTargetEdge) {
    if (fGrid[8] === fCenter && rGrid[6] === rCenter && fGrid[5] === rCenter) targetF2lId = 37;
    else if (fGrid[5] === fCenter && rGrid[3] === rCenter) targetF2lId = fGrid[8] === 'W' ? 39 : 38;
    else targetF2lId = fGrid[8] === 'W' ? 41 : 40;
  } else if (dfrHasTargetCorner) {
    if (fGrid[8] === fCenter && rGrid[6] === rCenter) targetF2lId = urHasTargetEdge ? 25 : 26;
    else if (fGrid[8] === 'W') targetF2lId = ufHasTargetEdge ? 29 : 28;
    else targetF2lId = ufHasTargetEdge ? 30 : 27;
  } else if (ufrHasTargetCorner && frHasTargetEdge) {
    const edgeFlipped = fGrid[5] === rCenter;
    if (frCornerTop === 'W') targetF2lId = edgeFlipped ? 31 : 32;
    else if (frCornerRight === 'W') targetF2lId = edgeFlipped ? 35 : 33;
    else targetF2lId = edgeFlipped ? 36 : 34;
  } else if (ufrHasTargetCorner) {
    if (frCornerTop === 'W') {
      if (urHasTargetEdge) targetF2lId = uGrid[5] === rCenter ? 17 : 24;
      else if (ufHasTargetEdge) targetF2lId = uGrid[7] === fCenter ? 18 : 23;
      else targetF2lId = 21;
    } else if (frCornerRight === 'W') {
      if (urHasTargetEdge) targetF2lId = uGrid[5] === fCenter ? 11 : 14;
      else if (ufHasTargetEdge) targetF2lId = uGrid[7] === fCenter ? 1 : 9;
      else targetF2lId = uGrid[1] === fCenter ? 5 : 7;
    } else {
      if (ufHasTargetEdge) targetF2lId = uGrid[7] === rCenter ? 13 : 15;
      else if (urHasTargetEdge) targetF2lId = uGrid[5] === rCenter ? 2 : 10;
      else targetF2lId = uGrid[1] === rCenter ? 6 : 8;
    }
  } else {
    // Check other visible U-layer corners (UFL at uGrid[6]/fGrid[0] or UBR at uGrid[2]/rGrid[2]) and guide AUF to UFR
    const uflHasTargetCorner = [uGrid[6], fGrid[0]].every((c) => targetCornerSet.has(c)) && uGrid[6] !== fGrid[0];
    const ubrHasTargetCorner = [uGrid[2], rGrid[2]].every((c) => targetCornerSet.has(c)) && uGrid[2] !== rGrid[2];
    if (uflHasTargetCorner) {
      f2lPreU = "U'";
      if (uGrid[6] === 'W') targetF2lId = urHasTargetEdge || ufHasTargetEdge ? 17 : 21;
      else if (fGrid[0] === 'W') targetF2lId = urHasTargetEdge ? 11 : 1;
      else targetF2lId = ufHasTargetEdge ? 13 : 2;
    } else if (ubrHasTargetCorner) {
      f2lPreU = 'U';
      if (uGrid[2] === 'W') targetF2lId = urHasTargetEdge || ufHasTargetEdge ? 18 : 22;
      else if (rGrid[2] === 'W') targetF2lId = ufHasTargetEdge ? 15 : 2;
      else targetF2lId = urHasTargetEdge ? 14 : 1;
    } else if (urHasTargetEdge || ufHasTargetEdge) {
      targetF2lId = urHasTargetEdge ? 4 : 3;
    } else {
      targetF2lId = 4;
    }
  }

  const baseMatchedF2L = F2L_BY_ID.get(targetF2lId) || F2L_DATA[0];
  const combinedF2lAlg = f2lPreU ? simplifyMoveSequence(`${f2lPreU} ${baseMatchedF2L.alg}`, true) : baseMatchedF2L.alg;
  const matchedF2L = { ...baseMatchedF2L, alg: combinedF2lAlg };
  const nextOllPreview = OLL_BY_ID.get(27) || OLL_DATA[0];
  const remAfter = pairsLeft - 1;
  const aufHint = fullMeta?.unsolvedSlotNames?.length && frSlotSolved
    ? `Rotate y/y' to bring open ${fullMeta.unsolvedSlotNames[0]} slot to Front-Right`
    : f2lPreU
    ? `Pre-AUF: ${f2lPreU} to bring target corner to Front-Right (UFR)`
    : 'Target Slot: Front-Right (White–Green–Orange)';

  return {
    phase: 'f2l', crossSolved: true, remainingF2lPairs: pairsLeft,
    phaseLabel: `Cross Solved ✓ • ${pairsLeft} F2L Pair${pairsLeft === 1 ? '' : 's'} Left`, confidence: 91,
    matchedCase: matchedF2L,
    aufHint,
    orientationTip: buildOrientationTipForStage('f2l', matchedF2L, matchedF2L.alg, aufHint, { frontColor: 'Green', rightColor: 'Orange', slotLabel: 'Green/Orange' }),
    nextUpTitle: remAfter > 0 ? `After This: ${remAfter} F2L Pair${remAfter === 1 ? '' : 's'} Left → OLL` : `Last F2L Pair! Next Up: ${nextOllPreview.name} (OLL)`,
    nextUpBadge: remAfter > 0 ? `${pairsLeft} Pairs Remaining` : 'Final F2L → OLL',
    nextUpCase: nextOllPreview,
    nextUpSummary: remAfter > 0
      ? `Cross is solved. Insert ${matchedF2L.name} into Front-Right, then solve the remaining ${remAfter} pair${remAfter === 1 ? '' : 's'} before OLL.`
      : `Cross is solved and this is your final F2L pair! Insert ${matchedF2L.name} to advance directly into OLL.`
  };
}


export function rgbToHsv(r, g, b) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

export function rgbToLab(r, g, b) {
  const toLin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const [rl, gl, bl] = [toLin(r), toLin(g), toLin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f((rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047);
  const fy = f((rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000);
  const fz = f((rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function classifyStickerRgb(rgb, centerSamples, SCANNER_COLOR_CODES, SCANNER_COLOR_META) {
  const [r, g, b] = rgb;
  const [h, s, v] = rgbToHsv(r, g, b);
  const [L, a, bAxis] = rgbToLab(r, g, b);
  const canonicalLab = { Y: [88, -8, 82], W: [94, 0, 2], G: [62, -55, 38], B: [46, 12, -58], O: [66, 48, 64], R: [48, 68, 46] };
  const whiteLab = centerSamples?.W ? rgbToLab(...centerSamples.W) : canonicalLab.W;
  const yellowLab = centerSamples?.Y ? rgbToLab(...centerSamples.Y) : canonicalLab.Y;
  const whiteYellowMidB = (whiteLab[2] + yellowLab[2]) * 0.5;
  if (s <= 0.26 && v >= 0.44 && bAxis < whiteYellowMidB) return 'W';

  let bestCode = 'Y';
  let bestScore = Infinity;
  const hUnwrapped = h > 180 ? h - 360 : h;
  SCANNER_COLOR_CODES.forEach((code) => {
    const refLab = centerSamples?.[code] ? rgbToLab(...centerSamples[code]) : canonicalLab[code];
    const dL = (L - refLab[0]) * 0.45;
    const da = a - refLab[1];
    const db = bAxis - refLab[2];
    let dist = Math.sqrt(dL * dL + da * da + db * db);
    if (code === 'R' && hUnwrapped > 14 && hUnwrapped < 48) dist += 24;
    if (code === 'O' && (hUnwrapped <= 10 || hUnwrapped > 330)) dist += 24;
    if (code === 'Y' && (hUnwrapped < 34 || hUnwrapped > 80)) dist += 28;
    if (code === 'W' && bAxis > whiteYellowMidB) dist += 32;
    if (dist < bestScore) { bestScore = dist; bestCode = code; }
  });
  return bestCode;
}

export const SCANNER_FLAT_GRID_CENTROIDS = Array.from({ length: 9 }, (_, i) => [
  (32 + (136 / 3) * ((i % 3) + 0.5)) / 200,
  (32 + (136 / 3) * (Math.floor(i / 3) + 0.5)) / 200
]);

export const SCANNER_SAMPLE_OFFSETS = [
  [0, 0], [-0.018, -0.018], [0.018, -0.018], [-0.018, 0.018],
  [0.018, 0.018], [0, -0.026], [0, 0.026], [-0.026, 0], [0.026, 0]
];

export function classifyCapturedFaceBatch(rawFacesMap, fallbackFaces, lockedFaces = {}, savedPalette = null, SCANNER_COLOR_CODES, SCANNER_COLOR_META) {
  const entries = Object.entries(rawFacesMap).filter(([, list]) => Array.isArray(list) && list.length === 9);
  if (entries.length === 0) return fallbackFaces;
  const expectedCenter = { U: 'Y', F: 'G', R: 'O', D: 'W', B: 'B', L: 'R' };
  const centerSamples = { ...(savedPalette || {}) };
  entries.forEach(([fKey, rgbList]) => { if (expectedCenter[fKey]) centerSamples[expectedCenter[fKey]] = rgbList[4]; });
  const nextFaces = { ...fallbackFaces };
  entries.forEach(([fKey, rgbList]) => {
    const locked = lockedFaces?.[fKey];
    nextFaces[fKey] = rgbList.map((rgb, idx) =>
      Array.isArray(locked) && locked[idx] ? locked[idx] :
      idx === 4 && expectedCenter[fKey] ? expectedCenter[fKey] :
      classifyStickerRgb(rgb, centerSamples, SCANNER_COLOR_CODES, SCANNER_COLOR_META)
    );
  });
  return nextFaces;
}
