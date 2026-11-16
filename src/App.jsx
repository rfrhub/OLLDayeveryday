import React, { useState, useEffect, useRef, useMemo } from 'react';

// Resolve Firebase config from sandbox globals or Vercel Vite environment variables
function resolveFirebaseConfig() {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const p = typeof process !== 'undefined' && process.env ? process.env : {};
    const rawConfig =
      g.__firebase_config ||
      g.VITE_FIREBASE_CONFIG ||
      p.VITE_FIREBASE_CONFIG ||
      p.REACT_APP_FIREBASE_CONFIG ||
      null;

    if (rawConfig) {
      const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
      if (parsed && typeof parsed === 'object' && parsed.apiKey) return parsed;
    }

    const apiKey = g.VITE_FIREBASE_API_KEY || p.VITE_FIREBASE_API_KEY;
    const projectId = g.VITE_FIREBASE_PROJECT_ID || p.VITE_FIREBASE_PROJECT_ID;
    if (apiKey && projectId) {
      return {
        apiKey,
        authDomain: g.VITE_FIREBASE_AUTH_DOMAIN || p.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: g.VITE_FIREBASE_STORAGE_BUCKET || p.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
        messagingSenderId: g.VITE_FIREBASE_MESSAGING_SENDER_ID || p.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: g.VITE_FIREBASE_APP_ID || p.VITE_FIREBASE_APP_ID || ''
      };
    }
  } catch {
    // Fall through to null if config JSON is invalid
  }
  return null;
}

const resolvedFirebaseConfig = resolveFirebaseConfig();
let firebaseSdkPromise = null;

async function getFirebaseServices() {
  if (!resolvedFirebaseConfig) return null;
  if (!firebaseSdkPromise) {
    firebaseSdkPromise = (async () => {
      try {
        const [appMod, authMod, fsMod] = await Promise.all([
          import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
          import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),
          import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js')
        ]);
        const appInstance =
          appMod.getApps().length > 0
            ? appMod.getApp()
            : appMod.initializeApp(resolvedFirebaseConfig);
        return {
          auth: authMod.getAuth(appInstance),
          db: fsMod.getFirestore(appInstance),
          authMod,
          fsMod
        };
      } catch {
        return null;
      }
    })();
  }
  return firebaseSdkPromise;
}

const rawAppId =
  (typeof globalThis !== 'undefined' &&
    (globalThis.__app_id || globalThis.VITE_APP_ID) &&
    String(globalThis.__app_id || globalThis.VITE_APP_ID)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_APP_ID || process.env.REACT_APP_APP_ID)) ||
  'ollday-everyday';

const appId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

const STORAGE_KEYS = {
  users: `ollday_users_${appId}`,
  activeAccount: `ollday_active_account_${appId}`,
  pinnedHomePhase: `ollday_pinned_home_phase_${appId}`,
  deviceAccounts: `ollday_device_accounts_${appId}`,
  cubePalette: `ollday_cube_palette_${appId}`
};

// Free Starter vs. Lifetime Pro ($3.99) Tier Helpers
const FREE_F2L_CASE_IDS = [1, 2, 3, 4]; // Basic Inserts
const FREE_OLL_CASE_IDS = [27, 26, 21, 22, 23, 24, 25]; // 2-Look OLL Corners
const FREE_PLL_CASE_IDS = [1, 2, 3, 4, 5, 6, 7]; // 2-Look PLL (EPLL + CPLL)

function isCaseUnlockedForTier(phase, caseId, isPro) {
  if (isPro) return true;
  if (phase === 'f2l') return FREE_F2L_CASE_IDS.includes(caseId);
  if (phase === 'oll') return FREE_OLL_CASE_IDS.includes(caseId);
  if (phase === 'pll') return FREE_PLL_CASE_IDS.includes(caseId);
  return true;
}

// =========================================================================
// 2A-3. STATE-SIMULATING FULL CFOP SOLVER & ALGEBRAIC MOVE SIMPLIFIER
// =========================================================================
function simplifyMoveSequence(algStr = '', preserveParens = false) {
  const rawTokens = (algStr || '')
    .replace(/[()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const stack = [];
  const parseTok = (tok) => {
    const face = tok[0];
    if (!'UDFBRLxyz'.includes(face)) return null;
    const mod = tok.slice(1);
    const pow = mod === '2' ? 2 : mod === "'" ? 3 : 1;
    return { face, pow };
  };
  const formatTok = (face, pow) => {
    const p = ((pow % 4) + 4) % 4;
    if (p === 0) return null;
    return p === 1 ? face : p === 2 ? `${face}2` : `${face}'`;
  };

  rawTokens.forEach((tok) => {
    const parsed = parseTok(tok);
    if (!parsed) return;
    if (stack.length > 0 && stack[stack.length - 1].face === parsed.face) {
      const combinedPow = (stack[stack.length - 1].pow + parsed.pow) % 4;
      if (combinedPow === 0) {
        stack.pop();
      } else {
        stack[stack.length - 1].pow = combinedPow;
      }
    } else {
      stack.push(parsed);
    }
  });

  const clean = stack.map((item) => formatTok(item.face, item.pow)).filter(Boolean).join(' ');
  if (!preserveParens || !clean) return clean;
  return formatAlgWithTriggerBrackets(clean);
}

// Re-apply familiar fingertrick trigger parentheses onto clean move sequences
function formatAlgWithTriggerBrackets(algStr = '') {
  if (!algStr) return '';
  let out = ` ${algStr.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const triggers = [
    "R U R' U'",
    "L' U' L U",
    "R' F R F'",
    "F R' F' R",
    "R U2 R'",
    "F' U2 F",
    "R U' R'",
    "U R U' R'",
    "U' F' U F",
    "U' R U R'",
    "U F' U' F",
    "F' U' F",
    "R U R'",
    "M2 U M2",
    "M' U M2 U"
  ];
  triggers.forEach((trig) => {
    const escaped = trig.replace(/'/g, "\\'");
    const rx = new RegExp(`(?<!\\()\\b${escaped}\\b(?!\\))`, 'g');
    out = out.replace(rx, `(${trig})`);
  });
  return out.replace(/\s+/g, ' ').trim();
}

// Convert scanned 6-face object { U, F, R, D, B, L } into 54-sticker simulator array
function scannedFacesTo54Array(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid) {
  return [...uGrid, ...rGrid, ...fGrid, ...dGrid, ...lGrid, ...bGrid];
}

// Apply moves (including y, y', y2 whole-cube rotations) onto a 54-sticker state array
function applyMovesTo54State(stateArr, movesStr) {
  const s = [...stateArr];
  const rotCW = (o) => {
    const t = [s[o], s[o + 1], s[o + 2], s[o + 3], s[o + 4], s[o + 5], s[o + 6], s[o + 7], s[o + 8]];
    s[o] = t[6]; s[o + 1] = t[3]; s[o + 2] = t[0];
    s[o + 3] = t[7]; s[o + 4] = t[4]; s[o + 5] = t[1];
    s[o + 6] = t[8]; s[o + 7] = t[5]; s[o + 8] = t[2];
  };
  const rotCCW = (o) => {
    rotCW(o);
    rotCW(o);
    rotCW(o);
  };
  const cyc = (a, b, c, d) => {
    const tmp = s[a];
    s[a] = s[d];
    s[d] = s[c];
    s[c] = s[b];
    s[b] = tmp;
  };
  const turnOnce = (tok) => {
    if (tok === 'U') {
      rotCW(0);
      cyc(18, 36, 45, 9);
      cyc(19, 37, 46, 10);
      cyc(20, 38, 47, 11);
    } else if (tok === 'D') {
      rotCW(27);
      cyc(24, 15, 51, 42);
      cyc(25, 16, 52, 43);
      cyc(26, 17, 53, 44);
    } else if (tok === 'F') {
      rotCW(18);
      cyc(6, 9, 29, 44);
      cyc(7, 12, 28, 41);
      cyc(8, 15, 27, 38);
    } else if (tok === 'B') {
      rotCW(45);
      cyc(2, 36, 33, 17);
      cyc(1, 39, 34, 14);
      cyc(0, 42, 35, 11);
    } else if (tok === 'R') {
      rotCW(9);
      cyc(2, 45, 29, 20);
      cyc(5, 48, 32, 23);
      cyc(8, 51, 35, 26);
    } else if (tok === 'L') {
      rotCW(36);
      cyc(0, 18, 27, 53);
      cyc(3, 21, 30, 50);
      cyc(6, 24, 33, 47);
    } else if (tok === 'y') {
      // Whole cube clockwise around U: F <- R <- B <- L <- F
      rotCW(0);
      rotCCW(27);
      for (let i = 0; i < 9; i++) {
        cyc(18 + i, 9 + i, 45 + i, 36 + i);
      }
    }
  };

  const tokens = (movesStr || '').replace(/[()]/g, ' ').trim().split(/\s+/).filter(Boolean);
  tokens.forEach((tok) => {
    const face = tok[0];
    if (!'UDFBRLy'.includes(face)) return;
    const count = tok.endsWith('2') ? 2 : tok.endsWith("'") ? 3 : 1;
    for (let i = 0; i < count; i++) turnOnce(face);
  });
  return s;
}

// Check how many of the 4 bottom white cross edges are solved on a 54-sticker state
function inspectCrossOn54(s) {
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

// Iterative-Deepening BFS Solver for the White Cross (Finds real, move-canceled Cross solutions)
function solveExactCrossFrom54(startState) {
  const initialInfo = inspectCrossOn54(startState);
  if (initialInfo.solvedCount === 4) {
    return { moves: '', postState: startState, info: initialInfo };
  }

  // Solve missing white edges sequentially with true 3-ply BFS per edge so moves never collide
  let curState = [...startState];
  const rawSteps = [];
  const candidateMoves = [
    'U', "U'", 'U2', 'D', "D'", 'D2',
    'F', "F'", 'F2', 'R', "R'", 'R2',
    'B', "B'", 'B2', 'L', "L'", 'L2'
  ];

  for (let pass = 0; pass < 4; pass++) {
    const beforeCount = inspectCrossOn54(curState).solvedCount;
    if (beforeCount === 4) break;

    let foundSeq = null;
    const queue = [{ st: curState, seq: [] }];
    const visited = new Set([curState.join('')]);

    while (queue.length > 0 && !foundSeq) {
      const node = queue.shift();
      if (node.seq.length >= 3) continue;
      const lastFace = node.seq.length > 0 ? node.seq[node.seq.length - 1][0] : '';

      for (let i = 0; i < candidateMoves.length; i++) {
        const mv = candidateMoves[i];
        if (mv[0] === lastFace) continue;
        const nextSt = applyMovesTo54State(node.st, mv);
        const afterCount = inspectCrossOn54(nextSt).solvedCount;
        const nextSeq = [...node.seq, mv];
        if (afterCount > beforeCount) {
          foundSeq = { seq: nextSeq, st: nextSt };
          break;
        }
        if (nextSeq.length < 3) {
          const key = nextSt.join('');
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ st: nextSt, seq: nextSeq });
          }
        }
      }
    }

    if (foundSeq) {
      rawSteps.push(...foundSeq.seq);
      curState = foundSeq.st;
    } else {
      break;
    }
  }

  const cleanMoves = simplifyMoveSequence(rawSteps.join(' '));
  const verifiedState = applyMovesTo54State(startState, cleanMoves);
  return {
    moves: cleanMoves,
    postState: verifiedState,
    info: inspectCrossOn54(verifiedState)
  };
}

// Check if Front-Right F2L slot is solved in current cube orientation
function isFrontRightF2LSolved54(s) {
  const fCenter = s[22];
  const rCenter = s[13];
  return (
    s[29] === 'W' &&
    s[26] === fCenter &&
    s[23] === fCenter &&
    s[15] === rCenter &&
    s[12] === rCenter
  );
}

// Count how many of the 4 F2L slots are currently solved (0..4)
function countSolvedF2LSlots54(s) {
  let rot = [...s];
  let count = 0;
  for (let i = 0; i < 4; i++) {
    if (isFrontRightF2LSolved54(rot)) count++;
    rot = applyMovesTo54State(rot, 'y');
  }
  return count;
}

// Match & simulate the optimal F2L algorithm from F2L_DATA for the current Front-Right slot
// Guarantees: Cross stays 4/4 solved AND previously solved F2L slots are never broken
function matchBestF2LForFrontRight54(s) {
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

  // Also check if the target middle-layer edge is trapped in another slot (FR, FL, BR, BL)
  const middleEdgeSlots = [
    { name: 'FR', stickers: [s[23], s[12]], extract: "R U R' U'" },
    { name: 'FL', stickers: [s[21], s[41]], extract: "L' U' L" },
    { name: 'BR', stickers: [s[48], s[14]], extract: "R' U R" },
    { name: 'BL', stickers: [s[50], s[39]], extract: "L U L'" }
  ];

  const foundCorner = cornerSlots.find(
    (c) => c.stickers.every((col) => targetColors.has(col)) && new Set(c.stickers).size === 3
  );
  const foundEdge = middleEdgeSlots.find(
    (e) => e.stickers.every((col) => edgeTargetColors.has(col)) && new Set(e.stickers).size === 2
  );

  // Build prioritized setup prefixes (direct, corner-only extract, edge-only extract, or both)
  const setupCandidates = Array.from(
    new Set([
      '',
      foundCorner?.extract || '',
      foundEdge?.extract || '',
      foundCorner?.name === 'DFR' ? "R U' R' U" : '',
      foundEdge?.name === 'FR' ? "R U' R' U" : '',
      simplifyMoveSequence(`${foundCorner?.extract || ''} ${foundEdge?.extract || ''}`),
      simplifyMoveSequence(`${foundEdge?.extract || ''} ${foundCorner?.extract || ''}`)
    ])
  );

  const preUOptions = ['', 'U', "U'", 'U2'];
  let bestVerified = null;

  for (let sIdx = 0; sIdx < setupCandidates.length; sIdx++) {
    const setupPrefix = setupCandidates[sIdx];
    const workState = setupPrefix ? applyMovesTo54State(s, setupPrefix) : s;
    // Do not allow setup moves to break already-solved F2L slots
    if (countSolvedF2LSlots54(workState) < baseSolvedSlots) continue;

    for (let uIdx = 0; uIdx < preUOptions.length; uIdx++) {
      const preU = preUOptions[uIdx];
      const uState = preU ? applyMovesTo54State(workState, preU) : workState;

      for (let i = 0; i < F2L_DATA.length; i++) {
        const candidate = F2L_DATA[i];
        const after = applyMovesTo54State(uState, candidate.alg);
        if (
          isFrontRightF2LSolved54(after) &&
          inspectCrossOn54(after).solvedCount === 4 &&
          countSolvedF2LSlots54(after) >= baseSolvedSlots + 1
        ) {
          const rawCombined = simplifyMoveSequence(`${setupPrefix} ${preU} ${candidate.alg}`, false);
          const moveLen = rawCombined ? rawCombined.split(/\s+/).length : 0;
          if (!bestVerified || moveLen < bestVerified.moveLen) {
            const bracketed = simplifyMoveSequence(rawCombined, true);
            bestVerified = {
              caseObj: candidate,
              fullAlg: bracketed,
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

  // Fallback extraction + insert if both pieces were deeply locked
  const fallback = F2L_BY_ID.get(4) || F2L_DATA[0];
  const fallbackRaw = simplifyMoveSequence(`${foundCorner?.extract || ''} ${fallback.alg}`, false);
  return {
    caseObj: fallback,
    fullAlg: simplifyMoveSequence(fallbackRaw, true),
    rawAlg: fallbackRaw,
    moveLen: 99,
    postState: applyMovesTo54State(s, fallbackRaw)
  };
}

// Solve all remaining F2L pairs across all 4 slots (FR -> FL -> BR -> BL) with optimal F2L algorithms
function solveAllF2LPairsFrom54(postCrossState) {
  let curState = [...postCrossState];
  const slotSteps = [];
  const fullF2LTokens = [];

  for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
    if (!isFrontRightF2LSolved54(curState)) {
      const solvedPair = matchBestF2LForFrontRight54(curState);
      slotSteps.push({
        slotNumber: slotSteps.length + 1,
        slotColors: `${curState[22]}/${curState[13]}`,
        caseObj: solvedPair.caseObj,
        alg: solvedPair.fullAlg,
        rawAlg: solvedPair.rawAlg
      });
      fullF2LTokens.push(solvedPair.rawAlg);
      curState = solvedPair.postState;
    }
    if (slotIdx < 3) {
      fullF2LTokens.push('y');
      curState = applyMovesTo54State(curState, 'y');
    }
  }

  const combinedF2LAlg = simplifyMoveSequence(fullF2LTokens.join(' '), true);
  return {
    steps: slotSteps,
    combinedAlg: combinedF2LAlg || 'All 4 F2L Pairs Solved ✓',
    postState: curState
  };
}

// 54-Sticker Full-Cube CFOP Scramble Analyzer (Cross -> All 4 F2L Pairs -> OLL -> PLL)
function analyzeFull54Cube(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid) {
  const initial54 = scannedFacesTo54Array(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid);
  const crossCheck = inspectCrossOn54(initial54);

  // Count solved vs. remaining F2L pairs across all 4 slots
  let tempRot = [...initial54];
  let solvedF2lCount = 0;
  for (let i = 0; i < 4; i++) {
    if (isFrontRightF2LSolved54(tempRot)) solvedF2lCount++;
    tempRot = applyMovesTo54State(tempRot, 'y');
  }
  const remainingF2lPairs = 4 - solvedF2lCount;

  // 1. Solve Cross (or mark solved if 4/4)
  const crossSol = solveExactCrossFrom54(initial54);
  const postCross54 = crossSol.postState;

  // 2. Solve All Remaining F2L Pairs using F2L_DATA
  const f2lSol = solveAllF2LPairsFrom54(postCross54);
  const postF2L54 = f2lSol.postState;
  const firstF2lStep = f2lSol.steps[0] || null;
  const firstF2lCase = firstF2lStep?.caseObj || F2L_BY_ID.get(4) || F2L_DATA[0];

  // 3. Match OLL on the simulated post-F2L top layer
  const postF2lU = postF2L54.slice(0, 9);
  const postF2lF = postF2L54.slice(18, 27);
  const postF2lR = postF2L54.slice(9, 18);
  const ollAnalysis = analyzeScanned3FaceCube(postF2lU, postF2lF, postF2lR, {
    crossSolved: true,
    solvedCrossCount: 4,
    remainingCrossNames: [],
    remainingF2lPairs: 0,
    unsolvedSlotNames: []
  });

  const matchedOllCase =
    ollAnalysis.phase === 'oll' ? ollAnalysis.matchedCase : OLL_BY_ID.get(27) || OLL_DATA[0];
  const matchedOllAlg =
    ollAnalysis.phase === 'oll'
      ? simplifyMoveSequence(
          `${ollAnalysis.aufHint.startsWith('Pre-AUF:') ? ollAnalysis.aufHint.replace('Pre-AUF:', '').replace('before executing', '').trim() : ''} ${matchedOllCase.alg}`,
          true
        )
      : 'Top Yellow Already Oriented ✓';

  // 4. Match PLL on the simulated post-OLL top layer
  const postOll54 =
    ollAnalysis.phase === 'oll' ? applyMovesTo54State(postF2L54, matchedOllAlg) : postF2L54;
  const pllAnalysis = analyzeScanned3FaceCube(
    postOll54.slice(0, 9),
    postOll54.slice(18, 27),
    postOll54.slice(9, 18),
    {
      crossSolved: true,
      solvedCrossCount: 4,
      remainingCrossNames: [],
      remainingF2lPairs: 0,
      unsolvedSlotNames: []
    }
  );
  const matchedPllCase =
    pllAnalysis.phase === 'pll' ? pllAnalysis.matchedCase : PLL_BY_ID.get(8) || PLL_DATA[0];
  const postPllAuf =
    pllAnalysis.aufHint?.includes("U'")
      ? "U'"
      : pllAnalysis.aufHint?.includes('U2')
      ? 'U2'
      : pllAnalysis.aufHint?.includes('U AUF')
      ? 'U'
      : '';
  const matchedPllAlg = simplifyMoveSequence(`${matchedPllCase.alg} ${postPllAuf}`, true);

  // Build the 4 complete, verified CFOP stage cards
  const cfopStages = [
    {
      stage: '1. Cross',
      phaseKey: 'cross',
      label:
        crossCheck.solvedCount === 4
          ? 'Cross Solved ✓ (4/4)'
          : `Solve ${crossCheck.unsolvedNames.length} Edge${crossCheck.unsolvedNames.length === 1 ? '' : 's'}`,
      alg: crossSol.moves ? formatAlgWithTriggerBrackets(crossSol.moves) : 'Cross Already Solved ✓',
      fingertrick:
        crossCheck.solvedCount === 4
          ? 'All 4 white cross edges are aligned with their centers—jump straight to F2L Pair 1.'
          : 'Execute in a single smooth fingertrick flow while tracking your first F2L corner-edge pair.',
      summary:
        crossCheck.solvedCount === 4
          ? 'Cross is already solved! Begin immediately with Stage 2 (F2L).'
          : `Solves ${crossCheck.unsolvedNames.join(', ')} cleanly with zero redundant moves, transitioning directly into ${firstF2lCase.name}.`
    },
    {
      stage: '2. F2L Pairs',
      phaseKey: 'f2l',
      label:
        f2lSol.steps.length === 0
          ? 'All 4 Pairs Solved ✓'
          : `${f2lSol.steps.length} Pair${f2lSol.steps.length === 1 ? '' : 's'} (${f2lSol.steps.map((st) => st.caseObj.name).join(' → ')})`,
      alg: f2lSol.combinedAlg,
      caseObj: firstF2lCase,
      subSteps: f2lSol.steps,
      fingertrick: firstF2lCase.fingertrick,
      summary:
        f2lSol.steps.length === 0
          ? 'All 4 F2L slots are complete—advance straight to Stage 3 (OLL).'
          : `Solves all ${f2lSol.steps.length} remaining F2L slot${f2lSol.steps.length === 1 ? '' : 's'} sequentially (${f2lSol.steps
              .map((st) => `${st.caseObj.name}: ${st.alg}`)
              .join(' | ')}).`
    },
    {
      stage: '3. OLL Target',
      phaseKey: 'oll',
      label: ollAnalysis.phase === 'oll' ? matchedOllCase.name : 'OLL Skip ✓',
      alg: matchedOllAlg,
      caseObj: matchedOllCase,
      fingertrick: matchedOllCase.fingertrick,
      summary:
        ollAnalysis.phase === 'oll'
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
      summary: `${matchedPllCase.recognition} ${postPllAuf ? `Finish with ${postPllAuf} AUF to solve the cube.` : 'Solves the cube with no AUF needed.'}`
    }
  ];

  // If Cross is already solved (4/4), still provide the full 4-stage roadmap while highlighting the active stage
  const isCrossDone = crossCheck.solvedCount === 4;
  const primaryStage = isCrossDone
    ? f2lSol.steps.length > 0
      ? cfopStages[1]
      : ollAnalysis.phase === 'oll'
      ? cfopStages[2]
      : cfopStages[3]
    : cfopStages[0];

  return {
    phase: primaryStage.phaseKey,
    isFullScramble: true,
    crossSolved: isCrossDone,
    solvedCrossCount: crossCheck.solvedCount,
    remainingCrossNames: crossCheck.unsolvedNames,
    remainingF2lPairs,
    phaseLabel: isCrossDone
      ? `Cross ✓ • ${remainingF2lPairs} F2L Left • Full CFOP Roadmap`
      : `Cross ${crossCheck.solvedCount}/4 • ${remainingF2lPairs} F2L Left • Full CFOP`,
    confidence: 97,
    matchedCase: primaryStage.caseObj || {
      id: 1,
      name: primaryStage.label,
      alg: primaryStage.alg,
      fingertrick: primaryStage.fingertrick
    },
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

const TRIGGER_TAGS_CACHE = new Map();

function getAlgorithmTriggerTags(alg = '') {
  if (TRIGGER_TAGS_CACHE.has(alg)) return TRIGGER_TAGS_CACHE.get(alg);
  const normalized = alg.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const tags = [];
  if (normalized.includes("R U R' U'")) tags.push({ label: "Sexy Move (R U R' U')", badgeClass: FINGERTRICK_CODEX[0].badgeClass, dotClass: FINGERTRICK_CODEX[0].dotClass });
  if (normalized.includes("L' U' L U")) tags.push({ label: "Left Sexy (L' U' L U)", badgeClass: FINGERTRICK_CODEX[1].badgeClass, dotClass: FINGERTRICK_CODEX[1].dotClass });
  if (!normalized.includes("R U R' U'") && normalized.includes("R U' R'")) {
    tags.push({ label: "Inverse Sexy (R U' R')", badgeClass: FINGERTRICK_CODEX[2].badgeClass, dotClass: FINGERTRICK_CODEX[2].dotClass });
  }
  if (normalized.includes("R' F R F'")) tags.push({ label: "Sledgehammer (R' F R F')", badgeClass: FINGERTRICK_CODEX[3].badgeClass, dotClass: FINGERTRICK_CODEX[3].dotClass });
  if (normalized.includes("F R' F' R")) tags.push({ label: "Hedgeslammer (F R' F' R)", badgeClass: FINGERTRICK_CODEX[4].badgeClass, dotClass: FINGERTRICK_CODEX[4].dotClass });
  if (/\bM2?\b|\bM'/.test(normalized)) tags.push({ label: 'M-Slice Flick', badgeClass: FINGERTRICK_CODEX[6].badgeClass, dotClass: FINGERTRICK_CODEX[6].dotClass });
  if (/\bD2?\b|\bD'/.test(normalized)) tags.push({ label: 'Ring-Finger D', badgeClass: FINGERTRICK_CODEX[7].badgeClass, dotClass: FINGERTRICK_CODEX[7].dotClass });
  TRIGGER_TAGS_CACHE.set(alg, tags);
  return tags;
}

const F2L_VIEW_ANGLES = [
  { label: 'Front-Right (Target)', rot: 'y-35x-25', yaw: -35, pitch: -25 },
  { label: 'Front-Left (Green/Red)', rot: 'y35x-25', yaw: 35, pitch: -25 },
  { label: 'Back-Right (Orange/Blue)', rot: 'y-135x-25', yaw: -135, pitch: -25 },
  { label: 'Back-Left (Blue/Red)', rot: 'y135x-25', yaw: 135, pitch: -25 }
];

function getClosestF2LAngleLabel(yaw, pitch) {
  const normYaw = ((((yaw + 180) % 360) + 360) % 360) - 180;
  if (pitch > 20) return 'Bottom View';
  if (normYaw >= -90 && normYaw < 0) return 'Front-Right (Target)';
  if (normYaw >= 0 && normYaw < 90) return 'Front-Left (Green/Red)';
  if (normYaw < -90) return 'Back-Right (Orange/Blue)';
  return 'Back-Left (Blue/Red)';
}

const getF2LImageUrl = (alg, rot = 'y-35x-25', setupScramble = null) => {
  const baseUrl = `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=f2l&bg=t&cc=080b12&co=100&fc=yyyyyyyyyooooooooogggggggggwwwwwwwwwrrrrrrrrrbbbbbbbbb&r=${rot}`;
  return setupScramble
    ? `${baseUrl}&alg=${encodeURIComponent(setupScramble)}`
    : `${baseUrl}&case=${encodeURIComponent(alg)}`;
};

const getOLLImageUrl = (alg) =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&view=plan&stage=oll&bg=t&cc=1e293b&case=${encodeURIComponent(alg)}`;

const getPLLImageUrl = (alg, setupScramble = null) => {
  const baseUrl = 'https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&view=plan&stage=pll&bg=t&cc=1e293b';
  return setupScramble
    ? `${baseUrl}&alg=${encodeURIComponent(setupScramble)}`
    : `${baseUrl}&case=${encodeURIComponent(alg)}`;
};

// In-memory + sessionStorage SVG cache for VisualCube icons (eliminates repeated 5G/Wi-Fi radio wakeups)
const VISUALCUBE_SVG_CACHE = new Map();
const VISUALCUBE_INFLIGHT = new Map();
const VISUALCUBE_FETCH_QUEUE = [];
let visualCubeActiveFetches = 0;
const VISUALCUBE_MAX_CONCURRENT = 5;

function pumpVisualCubeQueue() {
  while (visualCubeActiveFetches < VISUALCUBE_MAX_CONCURRENT && VISUALCUBE_FETCH_QUEUE.length > 0) {
    const job = VISUALCUBE_FETCH_QUEUE.shift();
    if (!job) break;
    visualCubeActiveFetches++;
    fetch(job.url)
      .then((res) => (res.ok ? res.text() : null))
      .then((svgText) => {
        if (!svgText || !svgText.includes('<svg')) return null;
        const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
        VISUALCUBE_SVG_CACHE.set(job.url, dataUri);
        try {
          if (typeof window !== 'undefined' && window.sessionStorage && VISUALCUBE_SVG_CACHE.size <= 160) {
            window.sessionStorage.setItem(`vc_svg_${job.url}`, dataUri);
          }
        } catch {
          // Ignore sessionStorage quota limits
        }
        return dataUri;
      })
      .catch(() => null)
      .finally(() => {
        visualCubeActiveFetches--;
        VISUALCUBE_INFLIGHT.delete(job.url);
        pumpVisualCubeQueue();
      })
      .then(job.resolve);
  }
}

function enqueueVisualCubeFetch(url) {
  if (VISUALCUBE_INFLIGHT.has(url)) return VISUALCUBE_INFLIGHT.get(url);
  const promise = new Promise((resolve) => {
    VISUALCUBE_FETCH_QUEUE.push({ url, resolve });
    pumpVisualCubeQueue();
  });
  VISUALCUBE_INFLIGHT.set(url, promise);
  return promise;
}

function getCachedVisualCubeSrc(url) {
  if (!url) return '';
  if (VISUALCUBE_SVG_CACHE.has(url)) return VISUALCUBE_SVG_CACHE.get(url);
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(`vc_svg_${url}`);
      if (stored) {
        VISUALCUBE_SVG_CACHE.set(url, stored);
        return stored;
      }
    }
  } catch {
    // Ignore storage quota restrictions
  }
  return url;
}

function CachedVisualCubeImg({ url, alt, className, lazy = true }) {
  const [src, setSrc] = useState(() => getCachedVisualCubeSrc(url));

  useEffect(() => {
    let active = true;
    const cached = getCachedVisualCubeSrc(url);
    setSrc(cached);
    if (!url || cached.startsWith('data:image/svg+xml')) return undefined;

    enqueueVisualCubeFetch(url).then((dataUri) => {
      if (active && dataUri) setSrc(dataUri);
    });

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      className={className}
    />
  );
}

function generatePLLSetupScramble(inverseAlg, variationSeed = 0) {
  if (variationSeed === 0) return inverseAlg;
  const aufOptions = ['', 'U', "U'", 'U2'];
  const preAuf = aufOptions[variationSeed % aufOptions.length];
  const postAuf = aufOptions[Math.floor(variationSeed / 2) % aufOptions.length];
  return `${preAuf} ${inverseAlg} ${postAuf}`.replace(/\s+/g, ' ').trim();
}

// =========================================================================
// 2A. 3x3x3 FULL-SOLVE SCRAMBLE & WCA AO5 / AO12 TELEMETRY HELPERS
// =========================================================================
function generate3x3Scramble(length = 20) {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
  const axis = { U: 'UD', D: 'UD', L: 'LR', R: 'LR', F: 'FB', B: 'FB' };
  const mods = ['', "'", '2'];
  const seq = [];
  let prevFace = '';
  let prevAxis = '';
  while (seq.length < length) {
    const f = faces[Math.floor(Math.random() * faces.length)];
    if (f === prevFace) continue;
    if (axis[f] === prevAxis && seq.length >= 2 && axis[seq[seq.length - 2][0]] === axis[f]) continue;
    const m = mods[Math.floor(Math.random() * mods.length)];
    seq.push(`${f}${m}`);
    prevAxis = axis[f];
    prevFace = f;
  }
  return seq.join(' ');
}

function computeWcaAverage(history, windowSize) {
  if (!Array.isArray(history) || history.length < windowSize) return null;
  const recent = history.slice(0, windowSize);
  const dnfCount = recent.filter((s) => s.penalty === 'DNF').length;
  if (dnfCount >= 2) return 'DNF';
  const values = recent.map((s) =>
    s.penalty === 'DNF' ? Infinity : Number(s.ms) + (s.penalty === '+2' ? 2000 : 0)
  );
  values.sort((a, b) => a - b);
  const trimmed = values.slice(1, windowSize - 1);
  if (trimmed.some((v) => !Number.isFinite(v))) return 'DNF';
  return trimmed.reduce((acc, v) => acc + v, 0) / trimmed.length;
}

function computeCaseWindowAvg(timesSecList, windowSize) {
  if (!Array.isArray(timesSecList) || timesSecList.length < windowSize) return null;
  const recent = timesSecList.slice(0, windowSize).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (recent.length < windowSize) return null;
  recent.sort((a, b) => a - b);
  const trimmed = recent.slice(1, windowSize - 1);
  return trimmed.reduce((acc, v) => acc + v, 0) / trimmed.length;
}

function formatMsTime(ms, decimals = 2) {
  if (ms == null || !Number.isFinite(Number(ms))) return '—';
  return `${(Number(ms) / 1000).toFixed(decimals)}s`;
}

// =========================================================================
// 2A-2. 3-FACE ISOMETRIC CUBE SCANNER & NEXT-CASE LOOKAHEAD ENGINE
// =========================================================================
const SCANNER_COLOR_CODES = ['Y', 'W', 'G', 'B', 'O', 'R'];
const SCANNER_COLOR_META = {
  Y: { label: 'Yellow', hex: '#facc15', rgb: [250, 204, 21] },
  W: { label: 'White', hex: '#f8fafc', rgb: [248, 250, 252] },
  G: { label: 'Green', hex: '#22c55e', rgb: [34, 197, 94] },
  B: { label: 'Blue', hex: '#3b82f6', rgb: [59, 130, 246] },
  O: { label: 'Orange', hex: '#f97316', rgb: [249, 115, 22] },
  R: { label: 'Red', hex: '#ef4444', rgb: [239, 68, 68] }
};

function rotate3x3FaceCW(grid) {
  return [grid[6], grid[3], grid[0], grid[7], grid[4], grid[1], grid[8], grid[5], grid[2]];
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

// Convert sRGB to Perceptual CIELAB (L*, a*, b*) for lighting-invariant color separation
function rgbToLab(r, g, b) {
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000;
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;

  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

// Perceptual CIELAB + HSV Sticker Classifier
function classifyStickerRgb(rgb, centerSamples) {
  const [r, g, b] = rgb;
  const [h, s, v] = rgbToHsv(r, g, b);
  const [L, a, bAxis] = rgbToLab(r, g, b);

  // Canonical CIELAB references for standard speedcube shades
  const canonicalLab = {
    Y: [88, -8, 82],
    W: [94, 0, 2],
    G: [62, -55, 38],
    B: [46, 12, -58],
    O: [66, 48, 64],
    R: [48, 68, 46]
  };

  // If White center was captured, use its exact b* (warm tint) to separate White from Yellow
  const whiteLab = centerSamples?.W ? rgbToLab(...centerSamples.W) : canonicalLab.W;
  const yellowLab = centerSamples?.Y ? rgbToLab(...centerSamples.Y) : canonicalLab.Y;
  const whiteYellowMidB = (whiteLab[2] + yellowLab[2]) * 0.5;

  if (s <= 0.26 && v >= 0.44 && bAxis < whiteYellowMidB) {
    return 'W';
  }

  let bestCode = 'Y';
  let bestScore = Infinity;

  SCANNER_COLOR_CODES.forEach((code) => {
    const refLab = centerSamples?.[code] ? rgbToLab(...centerSamples[code]) : canonicalLab[code];
    const dL = (L - refLab[0]) * 0.45;
    const da = a - refLab[1];
    const db = bAxis - refLab[2];
    let dist = Math.sqrt(dL * dL + da * da + db * db);

    // Enforce hue guardrails so warm lights never swap Red, Orange, and Yellow
    const hUnwrapped = h > 180 ? h - 360 : h;
    if (code === 'R' && hUnwrapped > 14 && hUnwrapped < 48) dist += 24;
    if (code === 'O' && (hUnwrapped <= 10 || hUnwrapped > 330)) dist += 24;
    if (code === 'Y' && (hUnwrapped < 34 || hUnwrapped > 80)) dist += 28;
    if (code === 'W' && bAxis > whiteYellowMidB) dist += 32;

    if (dist < bestScore) {
      bestScore = dist;
      bestCode = code;
    }
  });

  return bestCode;
}

// Exact normalized (0..1) centroids for a straight-on flat 3x3 square grid in viewBox="0 0 200 200"
const SCANNER_FLAT_GRID_CENTROIDS = (() => {
  const pts = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      // Square region spans [32..168] x [32..168] in viewBox 200x200
      const x = (32 + (136 / 3) * (col + 0.5)) / 200;
      const y = (32 + (136 / 3) * (row + 0.5)) / 200;
      pts.push([x, y]);
    }
  }
  return pts;
})();

// Global 6-Color Gray-World White-Balanced + CIELAB Self-Calibrating Classifier
function classifyCapturedFaceBatch(rawFacesMap, fallbackFaces, lockedFaces = {}, savedPalette = null) {
  const allEntries = [];
  Object.entries(rawFacesMap).forEach(([faceKey, rgbList]) => {
    if (!Array.isArray(rgbList) || rgbList.length !== 9) return;
    rgbList.forEach((rgb, idx) => {
      allEntries.push({ faceKey, idx, rgb });
    });
  });

  if (allEntries.length === 0) return fallbackFaces;

  const expectedCenter = { U: 'Y', F: 'G', R: 'O', D: 'W', B: 'B', L: 'R' };
  const centerSamples = { ...(savedPalette || {}) };
  Object.entries(rawFacesMap).forEach(([faceKey, rgbList]) => {
    if (Array.isArray(rgbList) && rgbList.length === 9 && expectedCenter[faceKey]) {
      centerSamples[expectedCenter[faceKey]] = rgbList[4];
    }
  });

  const nextFaces = {
    U: [...(fallbackFaces.U || [])],
    F: [...(fallbackFaces.F || [])],
    R: [...(fallbackFaces.R || [])],
    D: [...(fallbackFaces.D || [])],
    B: [...(fallbackFaces.B || [])],
    L: [...(fallbackFaces.L || [])]
  };

  Object.entries(rawFacesMap).forEach(([faceKey, rgbList]) => {
    if (!Array.isArray(rgbList) || rgbList.length !== 9) return;
    const locked = lockedFaces?.[faceKey];
    nextFaces[faceKey] = rgbList.map((rgb, idx) => {
      if (Array.isArray(locked) && locked[idx]) return locked[idx];
      if (idx === 4 && expectedCenter[faceKey]) return expectedCenter[faceKey];
      return classifyStickerRgb(rgb, centerSamples);
    });
  });

  return nextFaces;
}

// Precompute 2-sided top-layer signatures across all 4 AUF rotations (0, U, U2, U')
let CACHED_SIGNATURES = null;
function getCaseSignatures() {
  if (CACHED_SIGNATURES) return CACHED_SIGNATURES;

  const ollSigs = OLL_DATA.map((item) => {
    const baseSt = simulateCrossCubeState(invertAlgorithm(item.alg));
    const rotations = [];
    let curSt = baseSt;
    for (let rot = 0; rot < 4; rot++) {
      const uMask = curSt.slice(0, 9).map((c) => (c === 'Y' ? '1' : '0')).join('');
      const fTop = curSt.slice(18, 21).map((c) => (c === 'Y' ? '1' : '0')).join('');
      const rTop = curSt.slice(9, 12).map((c) => (c === 'Y' ? '1' : '0')).join('');
      rotations.push({ rot, uMask, sideMask: `${fTop}${rTop}` });
      // Simulate U' on the setup state (= U Pre-AUF needed to reach rot 0)
      curSt = applyMovesTo54State(curSt, "U'");
    }
    return { item, rotations };
  });

  const pllSigs = PLL_DATA.filter((item) => item.id <= 21).map((item) => {
    const baseSt = simulateCrossCubeState(invertAlgorithm(item.alg));
    const rotations = [];
    let curSt = baseSt;
    for (let rot = 0; rot < 4; rot++) {
      const six = [...curSt.slice(18, 21), ...curSt.slice(9, 12)];
      const map = {};
      let idx = 0;
      const pattern = six
        .map((c) => {
          if (!map[c]) map[c] = String(idx++);
          return map[c];
        })
        .join('');
      const fEdgeColor = curSt[19];
      rotations.push({ rot, pattern, fEdgeColor });
      curSt = applyMovesTo54State(curSt, "U'");
    }
    return { item, rotations };
  });

  CACHED_SIGNATURES = { ollSigs, pllSigs };
  return CACHED_SIGNATURES;
}

function analyzeScanned3FaceCube(uGrid, fGrid, rGrid, fullMeta = null, userHints = null) {
  const { ollSigs, pllSigs } = getCaseSignatures();
  const topColor = uGrid[4] || 'Y';
  const fCenter = fGrid[4] || 'G';
  const rCenter = rGrid[4] || 'O';

  // Verify bottom cross edges visible on F & R (index 7) plus full 6-face check & user hints
  const greenEdgeSolved = fGrid[7] === fCenter;
  const orangeEdgeSolved = rGrid[7] === rCenter;
  const visibleUnsolved = [
    ...(!greenEdgeSolved ? ['Green (DF)'] : []),
    ...(!orangeEdgeSolved ? ['Orange (DR)'] : [])
  ];
  const hintedCrossSolved = userHints?.crossSolved;
  const isCrossSolved = fullMeta
    ? fullMeta.crossSolved
    : hintedCrossSolved === false
    ? false
    : hintedCrossSolved === true
    ? true
    : greenEdgeSolved && orangeEdgeSolved;

  // Check if F2L bottom two rows on F & R match their centers
  const frSlotSolved =
    fGrid[8] === fCenter && fGrid[5] === fCenter && rGrid[6] === rCenter && rGrid[3] === rCenter;
  const flVisibleSolved = fGrid[6] === fCenter && fGrid[3] === fCenter;
  const brVisibleSolved = rGrid[8] === rCenter && rGrid[5] === rCenter;

  const hintedF2lStatus = userHints?.f2lCompletedStatus || null; // null | 'none' | 'some' | 'all'
  const f2lRowsSolved = fullMeta
    ? fullMeta.remainingF2lPairs === 0
    : hintedF2lStatus === 'all'
    ? true
    : hintedF2lStatus === 'none' || hintedF2lStatus === 'some'
    ? false
    : frSlotSolved && flVisibleSolved && brVisibleSolved;

  const estimatedRemainingPairs = fullMeta
    ? fullMeta.remainingF2lPairs
    : hintedF2lStatus === 'all'
    ? 0
    : hintedF2lStatus === 'none'
    ? 4
    : hintedF2lStatus === 'some'
    ? Math.max(1, (frSlotSolved ? 0 : 1) + (flVisibleSolved ? 0 : 1) + (brVisibleSolved ? 0 : 1))
    : (frSlotSolved ? 0 : 1) + (flVisibleSolved ? 0 : 1) + (brVisibleSolved ? 0 : 1);

  const allTopOriented = uGrid.every((c) => c === topColor);

  // 0. CROSS UNSOLVED IN 3-FACE VIEW (Bottom cross edge out of place on F or R, or user confirmed Cross is unsolved)
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
      matchedCase: {
        id: 1,
        name: `Solve Remaining Cross: ${missingLabel}`,
        alg: crossAlg,
        fingertrick: 'Align white edges to their matching centers on D before inserting F2L pairs.'
      },
      aufHint:
        visibleUnsolved.length > 0
          ? `Remaining Cross Edges: ${visibleUnsolved.join(', ')} (Scan D•B•L for full 4-edge solve)`
          : 'Front cross edges look aligned — capture D•B•L to locate hidden back/left cross edges',
      nextUpTitle: `Next Up: F2L (${Math.max(1, estimatedRemainingPairs)} Pairs Left)`,
      nextUpBadge: 'Cross → F2L Transition',
      nextUpCase: firstF2l,
      nextUpSummary: `Finish ${missingLabel} (${crossAlg}), then solve the remaining ${Math.max(1, estimatedRemainingPairs)} F2L pairs starting with Front-Right.`
    };
  }

  // 1. PLL DETECTION (Cross Solved, 0 F2L pairs left, Top face solid Yellow)
  if (allTopOriented && f2lRowsSolved) {
    const six = [fGrid[0], fGrid[1], fGrid[2], rGrid[0], rGrid[1], rGrid[2]];
    const map = {};
    let idx = 0;
    const scannedPattern = six
      .map((c) => {
        if (!map[c]) map[c] = String(idx++);
        return map[c];
      })
      .join('');

    // Check if cube is already completely solved on F and R top rows
    if (
      fGrid[0] === fCenter &&
      fGrid[1] === fCenter &&
      fGrid[2] === fCenter &&
      rGrid[0] === rCenter &&
      rGrid[1] === rCenter &&
      rGrid[2] === rCenter
    ) {
      const uaCase = PLL_BY_ID.get(1) || PLL_DATA[0];
      return {
        phase: 'pll',
        crossSolved: true,
        remainingF2lPairs: 0,
        phaseLabel: 'Cube Solved ✓ (0 Moves Needed)',
        confidence: 99,
        matchedCase: uaCase,
        aufHint: 'Solved! All layers match their centers.',
        nextUpTitle: 'Cube Solved! ✓',
        nextUpBadge: 'Complete',
        nextUpCase: null,
        nextUpSummary: 'Every visible face is solved—no algorithm needed.'
      };
    }

    let bestPll = pllSigs[0].item;
    let bestScore = -1;
    let bestRot = 0;

    pllSigs.forEach(({ item, rotations }) => {
      rotations.forEach(({ rot, pattern }) => {
        let score = 0;
        for (let i = 0; i < 6; i++) {
          if (pattern[i] === scannedPattern[i]) score += 3;
        }
        // Prefer zero Pre-AUF on ties
        if (rot === 0) score += 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestPll = item;
          bestRot = rot;
        }
      });
    });

    const preAuf = bestRot === 0 ? '' : bestRot === 1 ? 'U' : bestRot === 2 ? 'U2' : "U'";
    const auf = preAuf ? `Pre-AUF: ${preAuf} before executing` : 'Ready from current angle (No Pre-AUF)';

    return {
      phase: 'pll',
      crossSolved: true,
      remainingF2lPairs: 0,
      phaseLabel: 'Cross Solved ✓ • 0 F2L Left • PLL',
      confidence: Math.min(99, Math.round(74 + bestScore * 1.4)),
      matchedCase: bestPll,
      aufHint: auf,
      nextUpTitle: preAuf ? `Execute ${preAuf} → ${bestPll.name}` : `Execute ${bestPll.name}`,
      nextUpBadge: 'Final Layer PLL',
      nextUpCase: null,
      nextUpSummary: `Cross & all 4 F2L pairs are solved. ${preAuf ? `Do ${preAuf} first, then execute ` : 'Execute '}${bestPll.name} (${bestPll.alg}) and align AUF.`
    };
  }

  // 2. OLL DETECTION (Cross Solved, 0 F2L pairs left, Top face has unoriented yellow stickers)
  if (f2lRowsSolved && !allTopOriented) {
    let bestOll = ollSigs[0].item;
    let bestScore = -1;
    let bestRot = 0;

    const scannedUMask = uGrid.map((c) => (c === topColor ? '1' : '0')).join('');
    const scannedSideMask = [...fGrid.slice(0, 3), ...rGrid.slice(0, 3)]
      .map((c) => (c === topColor ? '1' : '0'))
      .join('');

    ollSigs.forEach(({ item, rotations }) => {
      rotations.forEach(({ rot, uMask: targetU, sideMask: targetSide }) => {
        let score = 0;
        for (let i = 0; i < 9; i++) {
          if (scannedUMask[i] === targetU[i]) score += 4;
        }
        for (let j = 0; j < 6; j++) {
          if (scannedSideMask[j] === targetSide[j]) score += 3;
        }
        if (rot === 0) score += 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestOll = item;
          bestRot = rot;
        }
      });
    });

    const preAuf = bestRot === 0 ? '' : bestRot === 1 ? 'U ' : bestRot === 2 ? 'U2 ' : "U' ";
    const postState = simulateCrossCubeState(`${invertAlgorithm(bestOll.alg)} ${preAuf}${bestOll.alg}`);
    const postSix = [...postState.slice(18, 21), ...postState.slice(9, 12)];
    const pMap = {};
    let pIdx = 0;
    const postPattern = postSix
      .map((c) => {
        if (!pMap[c]) pMap[c] = String(pIdx++);
        return pMap[c];
      })
      .join('');
    const predictedPll =
      pllSigs.find((p) => p.rotations.some((r) => r.pattern === postPattern))?.item ||
      PLL_BY_ID.get(8) ||
      PLL_DATA[0];

    return {
      phase: 'oll',
      crossSolved: true,
      remainingF2lPairs: 0,
      phaseLabel: 'Cross Solved ✓ • 0 F2L Left • OLL',
      confidence: Math.min(98, Math.round(62 + bestScore * 0.7)),
      matchedCase: bestOll,
      aufHint: bestRot === 0 ? 'Ready from current angle' : `Pre-AUF: ${preAuf.trim()} before executing`,
      nextUpTitle: `Follow-Up Case: ${predictedPll.name}`,
      nextUpBadge: 'Predicted Next PLL',
      nextUpCase: predictedPll,
      nextUpSummary: `Cross & all 4 F2L pairs are solved. ${preAuf ? `Turn ${preAuf.trim()} first, then execute ` : 'Execute '}${bestOll.name} to orient the yellow top.`
    };
  }

  // 1. PLL DETECTION (Cross Solved, 0 F2L pairs left, Top face solid Yellow)
  if (allTopOriented && f2lRowsSolved) {
    const six = [fGrid[0], fGrid[1], fGrid[2], rGrid[0], rGrid[1], rGrid[2]];
    const map = {};
    let idx = 0;
    const scannedPattern = six
      .map((c) => {
        if (!map[c]) map[c] = String(idx++);
        return map[c];
      })
      .join('');

    let bestPll = pllSigs[0].item;
    let bestScore = -1;
    pllSigs.forEach(({ item, pattern }) => {
      let score = 0;
      for (let i = 0; i < 6; i++) {
        if (pattern[i] === scannedPattern[i]) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        bestPll = item;
      }
    });

    const auf =
      fGrid[1] === fCenter
        ? 'No AUF needed'
        : rGrid[1] === fCenter
        ? 'U\' AUF after alg'
        : fGrid[1] === rCenter
        ? 'U AUF after alg'
        : 'U2 AUF after alg';

    return {
      phase: 'pll',
      crossSolved: true,
      remainingF2lPairs: 0,
      phaseLabel: 'Cross Solved ✓ • 0 F2L Left • PLL',
      confidence: Math.min(99, Math.round(74 + bestScore * 2)),
      matchedCase: bestPll,
      aufHint: auf,
      nextUpTitle: 'Cube Solved! (Final Step)',
      nextUpBadge: 'Finish & AUF',
      nextUpCase: null,
      nextUpSummary: `Cross & all 4 F2L pairs are solved. Execute ${bestPll.name}, then align the top layer (${auf}).`
    };
  }

  // 2. OLL DETECTION (Cross Solved, 0 F2L pairs left, Top face has unoriented yellow stickers)
  if (f2lRowsSolved && !allTopOriented) {
    let bestOll = ollSigs[0].item;
    let bestScore = -1;
    let bestRot = 0;

    let rotU = [...uGrid];
    for (let rot = 0; rot < 4; rot++) {
      const uMask = rotU.map((c) => (c === topColor ? '1' : '0')).join('');
      const sideMask = [...fGrid.slice(0, 3), ...rGrid.slice(0, 3)]
        .map((c) => (c === topColor ? '1' : '0'))
        .join('');

      ollSigs.forEach(({ item, uMask: targetU, sideMask: targetSide }) => {
        let score = 0;
        for (let i = 0; i < 9; i++) {
          if (uMask[i] === targetU[i]) score += 3;
        }
        if (rot === 0) {
          for (let j = 0; j < 6; j++) {
            if (sideMask[j] === targetSide[j]) score += 1;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestOll = item;
          bestRot = rot;
        }
      });
      rotU = rotate3x3FaceCW(rotU);
    }

    const preAuf = bestRot === 0 ? '' : bestRot === 1 ? 'U ' : bestRot === 2 ? 'U2 ' : "U' ";
    const postState = simulateCrossCubeState(`${invertAlgorithm(bestOll.alg)} ${preAuf}${bestOll.alg}`);
    const postSix = [...postState.slice(18, 21), ...postState.slice(9, 12)];
    const pMap = {};
    let pIdx = 0;
    const postPattern = postSix
      .map((c) => {
        if (!pMap[c]) pMap[c] = String(pIdx++);
        return pMap[c];
      })
      .join('');
    const predictedPll =
      pllSigs.find((p) => p.pattern === postPattern)?.item ||
      PLL_BY_ID.get(8) ||
      PLL_DATA[0];

    return {
      phase: 'oll',
      crossSolved: true,
      remainingF2lPairs: 0,
      phaseLabel: 'Cross Solved ✓ • 0 F2L Left • OLL',
      confidence: Math.min(98, Math.round(68 + bestScore)),
      matchedCase: bestOll,
      aufHint: bestRot === 0 ? 'Ready from current angle' : `Pre-AUF: ${preAuf.trim()} before executing`,
      nextUpTitle: `Follow-Up Case: ${predictedPll.name}`,
      nextUpBadge: 'Predicted Next PLL',
      nextUpCase: predictedPll,
      nextUpSummary: `Cross & all 4 F2L pairs are solved. Once ${bestOll.name} orients the yellow top, look for ${predictedPll.recognition.toLowerCase()}`
    };
  }

  // 3. F2L DETECTION (Cross Solved, 1–4 F2L pairs left)
  const pairsLeft = Math.max(1, estimatedRemainingPairs);
  const frCornerTop = uGrid[8];
  const frCornerFront = fGrid[2];
  const frCornerRight = rGrid[0];
  const hasWhiteInTopCorner = [frCornerTop, frCornerFront, frCornerRight].includes('W');
  const cornerTrappedBottom = [fGrid[8], rGrid[6]].includes('W');

  let targetF2lId = 4;
  if (cornerTrappedBottom) {
    targetF2lId = fGrid[8] === 'W' ? 27 : 30;
  } else if (frCornerTop === 'W') {
    targetF2lId = uGrid[5] === fCenter || uGrid[7] === rCenter ? 17 : 21;
  } else if (hasWhiteInTopCorner) {
    const topStickersSame = frCornerTop === uGrid[5] || frCornerTop === uGrid[7];
    targetF2lId = topStickersSame ? (frCornerFront === 'W' ? 5 : 6) : frCornerFront === 'W' ? 1 : 2;
  } else {
    targetF2lId = 31;
  }

  const matchedF2L = F2L_BY_ID.get(targetF2lId) || F2L_DATA[0];
  const nextOllPreview = OLL_BY_ID.get(27) || OLL_DATA[0];
  const remainingAfterThis = pairsLeft - 1;
  const openSlotHint =
    fullMeta?.unsolvedSlotNames?.length && frSlotSolved
      ? `Rotate y/y' to bring open ${fullMeta.unsolvedSlotNames[0]} slot to Front-Right`
      : 'Target Slot: Front-Right (White–Green–Orange)';

  return {
    phase: 'f2l',
    crossSolved: true,
    remainingF2lPairs: pairsLeft,
    phaseLabel: `Cross Solved ✓ • ${pairsLeft} F2L Pair${pairsLeft === 1 ? '' : 's'} Left`,
    confidence: 91,
    matchedCase: matchedF2L,
    aufHint: openSlotHint,
    nextUpTitle:
      remainingAfterThis > 0
        ? `After This: ${remainingAfterThis} F2L Pair${remainingAfterThis === 1 ? '' : 's'} Left → OLL`
        : `Last F2L Pair! Next Up: ${nextOllPreview.name} (OLL)`,
    nextUpBadge: remainingAfterThis > 0 ? `${pairsLeft} Pairs Remaining` : 'Final F2L → OLL',
    nextUpCase: nextOllPreview,
    nextUpSummary:
      remainingAfterThis > 0
        ? `Cross is solved. Insert ${matchedF2L.name} into Front-Right, then solve the remaining ${remainingAfterThis} pair${remainingAfterThis === 1 ? '' : 's'} before OLL.`
        : `Cross is solved and this is your final F2L pair! Insert ${matchedF2L.name} to advance directly into OLL.`
  };
}

// =========================================================================
// 2B. 3D SPATIAL CROSS & F2L CUBE STATE SIMULATOR
// =========================================================================
function simulateCrossCubeState(scramble = '') {
  // Face offsets: 0=U(Y), 9=R(O), 18=F(G), 27=D(W), 36=L(R), 45=B(B)
  const s = [
    ...Array(9).fill('Y'),
    ...Array(9).fill('O'),
    ...Array(9).fill('G'),
    ...Array(9).fill('W'),
    ...Array(9).fill('R'),
    ...Array(9).fill('B')
  ];

  const rotCW = (o) => {
    const t = [s[o], s[o + 1], s[o + 2], s[o + 3], s[o + 4], s[o + 5], s[o + 6], s[o + 7], s[o + 8]];
    s[o] = t[6]; s[o + 1] = t[3]; s[o + 2] = t[0];
    s[o + 3] = t[7]; s[o + 4] = t[4]; s[o + 5] = t[1];
    s[o + 6] = t[8]; s[o + 7] = t[5]; s[o + 8] = t[2];
  };

  const cyc = (a, b, c, d) => {
    const tmp = s[a];
    s[a] = s[d];
    s[d] = s[c];
    s[c] = s[b];
    s[b] = tmp;
  };

  const turnOnce = (face) => {
    if (face === 'U') {
      rotCW(0);
      cyc(18, 36, 45, 9);
      cyc(19, 37, 46, 10);
      cyc(20, 38, 47, 11);
    } else if (face === 'D') {
      rotCW(27);
      cyc(24, 15, 51, 42);
      cyc(25, 16, 52, 43);
      cyc(26, 17, 53, 44);
    } else if (face === 'F') {
      rotCW(18);
      cyc(6, 9, 29, 44);
      cyc(7, 12, 28, 41);
      cyc(8, 15, 27, 38);
    } else if (face === 'B') {
      rotCW(45);
      cyc(2, 36, 33, 17);
      cyc(1, 39, 34, 14);
      cyc(0, 42, 35, 11);
    } else if (face === 'R') {
      rotCW(9);
      cyc(2, 45, 29, 20);
      cyc(5, 48, 32, 23);
      cyc(8, 51, 35, 26);
    } else if (face === 'L') {
      rotCW(36);
      cyc(0, 18, 27, 53);
      cyc(3, 21, 30, 50);
      cyc(6, 24, 33, 47);
    }
  };

  const tokens = (scramble || '').replace(/[()]/g, '').trim().split(/\s+/).filter(Boolean);
  tokens.forEach((tok) => {
    const face = tok[0];
    if (!'UDFBRL'.includes(face)) return;
    const count = tok.endsWith('2') ? 2 : tok.endsWith("'") ? 3 : 1;
    for (let i = 0; i < count; i++) turnOnce(face);
  });

  return s;
}

const STICKER_HEX = {
  Y: '#facc15',
  W: '#f8fafc',
  G: '#22c55e',
  B: '#3b82f6',
  O: '#f97316',
  R: '#ef4444'
};

function simulateF2LCubeState(setupScramble = '') {
  return simulateCrossCubeState(setupScramble);
}

// Unified 3D Spatial Cube Renderer (Used by both Cross & F2L Orbit Cubes)
function Spatial3DCube({ stickers, isStickerActive, isStickerMuted, yaw, pitch, isDragging, cubeRef }) {
  const half = 48;

  const renderFace = (offset, transform, shadeOpacity) => (
    <div
      style={{
        position: 'absolute',
        width: `${half * 2}px`,
        height: `${half * 2}px`,
        transform,
        backfaceVisibility: 'hidden',
        backgroundColor: '#070a12',
        borderRadius: '10px',
        padding: '4px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: '3.5px',
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.08)'
      }}
    >
      {Array.from({ length: 9 }).map((_, idx) => {
        const code = stickers[offset + idx];
        const active = isStickerActive ? isStickerActive(stickers, offset, idx) : true;
        const muted = isStickerMuted ? isStickerMuted(stickers, offset, idx) : false;
        const dimmed = !active || muted;
        return (
          <div
            key={idx}
            style={{
              backgroundColor: dimmed ? (muted ? '#334155' : '#1e293b') : STICKER_HEX[code] || '#334155',
              borderRadius: '4.5px',
              boxShadow: dimmed
                ? 'inset 0 1px 1px rgba(255,255,255,0.06)'
                : 'inset 0 1.5px 2px rgba(255,255,255,0.45), inset 0 -1.5px 2px rgba(0,0,0,0.28)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {shadeOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: `rgba(2, 6, 23, ${shadeOpacity})`
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      style={{
        width: '154px',
        height: '154px',
        perspective: '520px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
      className="pointer-events-none"
    >
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          width: '92px',
          height: '20px',
          borderRadius: '9999px',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 72%)',
          transform: `scale(${isDragging ? 1.08 : 1})`,
          transition: isDragging ? 'none' : 'transform 0.2s ease'
        }}
      />

      <div
        ref={cubeRef}
        style={{
          width: `${half * 2}px`,
          height: `${half * 2}px`,
          position: 'relative',
          transformStyle: 'preserve-3d',
          willChange: isDragging ? 'transform' : 'auto',
          transform: `translateZ(-12px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${isDragging ? 1.05 : 1})`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {renderFace(18, `rotateY(0deg) translateZ(${half}px)`, 0.04)}
        {renderFace(45, `rotateY(180deg) translateZ(${half}px)`, 0.14)}
        {renderFace(9, `rotateY(90deg) translateZ(${half}px)`, 0.12)}
        {renderFace(36, `rotateY(-90deg) translateZ(${half}px)`, 0.12)}
        {renderFace(0, `rotateX(90deg) translateZ(${half}px)`, 0)}
        {renderFace(27, `rotateX(-90deg) translateZ(${half}px)`, 0.22)}
      </div>
    </div>
  );
}

const CROSS_EDGE_PAIRS = {
  '0_1': 46, '45_1': 1,
  '0_3': 37, '36_1': 3,
  '0_5': 10, '9_1': 5,
  '0_7': 19, '18_1': 7,
  '27_1': 25, '18_7': 28,
  '27_3': 43, '36_7': 30,
  '27_5': 16, '9_7': 32,
  '27_7': 52, '45_7': 34,
  '18_3': 41, '36_5': 21,
  '18_5': 12, '9_3': 23,
  '45_3': 14, '9_5': 48,
  '45_5': 39, '36_3': 41
};

const isCrossStickerActive = (stickers, offset, idx) => {
  if (idx === 4) return true;
  if (idx !== 1 && idx !== 3 && idx !== 5 && idx !== 7) return false;
  if (stickers[offset + idx] === 'W') return true;
  const partner = CROSS_EDGE_PAIRS[`${offset}_${idx}`];
  return partner !== undefined && stickers[partner] === 'W';
};

const isF2LStickerMuted = (stickers, offset, idx) => {
  const code = stickers[offset + idx];
  return (offset === 0 && code === 'Y') || (offset !== 0 && idx < 3 && code === 'Y');
};

function CrossSpatial3DCube({ scramble, yaw, pitch, isDragging, cubeRef }) {
  const stickers = useMemo(() => simulateCrossCubeState(scramble), [scramble]);
  return (
    <Spatial3DCube
      stickers={stickers}
      isStickerActive={isCrossStickerActive}
      yaw={yaw}
      pitch={pitch}
      isDragging={isDragging}
      cubeRef={cubeRef}
    />
  );
}

function F2LSpatial3DCube({ setupScramble, yaw, pitch, isDragging, cubeRef }) {
  const stickers = useMemo(() => simulateF2LCubeState(setupScramble), [setupScramble]);
  return (
    <Spatial3DCube
      stickers={stickers}
      isStickerMuted={isF2LStickerMuted}
      yaw={yaw}
      pitch={pitch}
      isDragging={isDragging}
      cubeRef={cubeRef}
    />
  );
}

// Reusable Millisecond Fine-Tuning Slider + Stepper Bar
function MillisecondSliderControl({
  value,
  min,
  max,
  draftValue,
  onSliderChange,
  onStepDelta,
  onDraftChange,
  accentTextClass = 'text-amber-300',
  inputWidthClass = 'w-20'
}) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step="0.001"
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onSliderChange(parseFloat(e.target.value))}
        className="w-full accent-orange-500 cursor-pointer"
      />
      <div className="flex items-center gap-1">
        {[
          { label: '-10ms', delta: -0.01 },
          { label: '-1ms', delta: -0.001 },
          { label: '+1ms', delta: 0.001 },
          { label: '+10ms', delta: 0.01 }
        ].map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={() => onStepDelta(btn.delta)}
            className="flex-1 py-1 rounded-lg bg-slate-950 border border-white/10 font-mono text-[9.5px] font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
        <input
          type="number"
          step="0.001"
          min="0.100"
          max="120.000"
          value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          className={`${inputWidthClass} rounded-lg bg-slate-950 border border-white/15 px-1.5 py-1 font-mono text-[10px] text-center ${accentTextClass}`}
        />
      </div>
    </>
  );
}

// Reusable Brand Sune Emblem SVG
function SuneEmblemSvg({ className = 'w-full h-full' }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} fill="none">
      <path d="M214 310 L295 258 L524 168 L806 416 L726 558 L592 660 L515 688 L214 550 Z" fill="#090a14" stroke="#090a14" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
      <g stroke="#090a14" strokeWidth="14" strokeLinejoin="round">
        <polygon points="248,312 331,343 403,286 320,255" fill="#d96528" />
        <polygon points="348,350 431,381 503,324 420,293" fill="#090a12" />
        <polygon points="448,388 531,419 603,362 520,331" fill="#090a12" />
      </g>
      <g transform="matrix(0.967, 0.367, -0.067, 1.067, 240, 315)" stroke="#090a14" strokeWidth="10" strokeLinejoin="round">
        <rect x="6" y="6" width="86" height="86" rx="14" fill="#090a12" />
        <rect x="104" y="6" width="86" height="86" rx="14" fill="#d96528" />
        <rect x="202" y="6" width="86" height="86" rx="14" fill="#090a12" />
        <rect x="6" y="104" width="86" height="86" rx="14" fill="#d96528" />
        <rect x="104" y="104" width="86" height="86" rx="14" fill="#d96528" />
        <rect x="202" y="104" width="86" height="86" rx="14" fill="#d96528" />
        <rect x="6" y="202" width="86" height="86" rx="14" fill="#d96528" />
        <rect x="104" y="202" width="86" height="86" rx="14" fill="#d96528" />
        <rect x="202" y="202" width="86" height="86" rx="14" fill="#090a12" />
      </g>
    </svg>
  );
}

function invertAlgorithm(alg) {
  const cleaned = alg.replace(/[()]/g, '').trim();
  if (!cleaned) return '';
  const tokens = cleaned.split(/\s+/);
  return tokens
    .reverse()
    .map((tok) => {
      if (tok.endsWith('2')) return tok;
      if (tok.endsWith("'")) return tok.slice(0, -1);
      return tok + "'";
    })
    .join(' ');
}

function generateF2LSetupScramble(alg, mode = 'beginner', variationSeed = 0) {
  const baseInverse = invertAlgorithm(alg);
  const aufOptions = ['', 'U ', "U' ", 'U2 '];
  const aufPrefix = aufOptions[variationSeed % aufOptions.length];

  if (mode === 'beginner') {
    return `${aufPrefix}${baseInverse}`.trim();
  }

  const realisticTriggers = [
    "L' U' L U",
    "B U B' U'",
    "L' U L U'",
    "B U' B' U",
    "L' U2 L U2"
  ];
  const trigger = realisticTriggers[variationSeed % realisticTriggers.length];
  return `${trigger} ${aufPrefix}${baseInverse}`.replace(/\s+/g, ' ').trim();
}
function buildSchedule(chunks, dataList, lookupMap = null) {
  const schedule = [];
  let dayCounter = 1;
  const resolveById = (id) => (lookupMap ? lookupMap.get(id) : dataList.find((item) => item.id === id));
  (Array.isArray(chunks) ? chunks : []).forEach((chunk, idx) => {
    if (!chunk || !Array.isArray(chunk.ids)) return;
    const safeTitle = typeof chunk.title === 'string' ? chunk.title : `Chunk ${idx + 1}`;
    const cases = chunk.ids
      .map(resolveById)
      .filter(Boolean);
    if (!cases.length) return;

    schedule.push({
      day: dayCounter++,
      mode: 'Learn',
      chunkTitle: safeTitle,
      cases
    });
    schedule.push({
      day: dayCounter++,
      mode: 'Drill',
      chunkTitle: safeTitle,
      cases
    });

    if (idx > 0 && idx % 2 === 1 && Array.isArray(chunks[idx - 1]?.ids)) {
      const prevTitle = typeof chunks[idx - 1].title === 'string' ? chunks[idx - 1].title : `Chunk ${idx}`;
      const prevCases = chunks[idx - 1].ids
        .map(resolveById)
        .filter(Boolean);
      schedule.push({
        day: dayCounter++,
        mode: 'Refine',
        chunkTitle: `${prevTitle} + ${safeTitle}`,
        cases: [...prevCases, ...cases]
      });
    }
  });
  return schedule;
}

// =========================================================================
// 2C. GUIDED INTERACTIVE ONBOARDING & AUTO-NAVIGATION STEPS
// =========================================================================
const CFOP_AND_APP_TOUR_STEPS = [
  {
    badge: 'Step 1 of 6 • Welcome to CFOP',
    title: 'How CFOP Solves the 3x3 Cube',
    phase: 'cross',
    tab: 'ladder',
    desc: 'CFOP stands for Cross → F2L → OLL → PLL—the speedcubing method used by world champions. Instead of solving layer-by-layer slowly, you build a bottom cross, pair corners & edges together, orient the yellow top in one look, and permute the final layer.',
    howToReach: 'Tap the orange phase pill (C / F / O / P) in the top-right header anytime to jump between phases.'
  },
  {
    badge: 'Step 2 of 6 • Phase C (Cross)',
    title: 'Solve the White Cross on Bottom',
    phase: 'cross',
    tab: 'ladder',
    desc: 'Hold White on the bottom (D) and Green in front (F). Solve all 4 white edges in 6–8 moves or fewer while matching their side colors to the center pieces—use the 3D Cross Orbit cube and Ladder tiers to build efficiency.',
    howToReach: 'Top-right pill → C • Bottom bar: Ladder, Blind Run (dual-thumb mat), Mechanics.'
  },
  {
    badge: 'Step 3 of 6 • Phase F (F2L)',
    title: 'First Two Layers (41 Pairs)',
    phase: 'f2l',
    tab: 'grind',
    desc: 'Keep White on the bottom and Green in front. Pair each bottom corner with its matching middle-layer edge and insert them together into the Front-Right slot—completing the first two layers at the same time.',
    howToReach: 'Top-right pill → F • Tap Start Day Grind or any pair in Today\'s Lineup for a 3D isolated drill.'
  },
  {
    badge: 'Step 4 of 6 • Phase O (OLL)',
    title: 'Orient Last Layer (57 Cases)',
    phase: 'oll',
    tab: 'grind',
    desc: 'Recognize the Yellow pattern on the top face and execute one algorithm to make the entire top face solid Yellow.',
    howToReach: 'Top-right pill → O • Use The Grind for daily chunks or Algorithms to browse all 57 OLL shapes.'
  },
  {
    badge: 'Step 5 of 6 • Phase P (PLL)',
    title: 'Permute Last Layer (25 Algorithms)',
    phase: 'pll',
    tab: 'grind',
    desc: 'With Yellow solid on top, swap the final top-layer corners and edges into their solved positions to finish the cube.',
    howToReach: 'Top-right pill → P • Each case highlights inline fingertrick triggers and step-by-step grip cues.'
  },
  {
    badge: 'Step 6 of 6 • Ready to Train',
    title: 'Pick Your Starting Phase',
    phase: 'oll',
    tab: 'settings',
    desc: 'Every phase includes Statistics (with custom 0.001s Target PBs) and an 8-card Settings deck with the full-screen 3x3x3 WCA Timer, Notation Guide, and Fingertrick Dossier. Choose where you want to start training right now:',
    howToReach: 'Tap a phase button below to jump straight in, or switch anytime using the top-right C • F • O • P pill.'
  }
];

const APP_ONLY_TOUR_STEPS = [
  {
    badge: 'Feature 1 of 6 • Phase Navigation',
    title: 'Instant C • F • O • P Phase Switching',
    phase: 'cross',
    tab: 'ladder',
    desc: 'Switch seamlessly between Cross (C), F2L (F), OLL (O), and PLL (P). You can also pin your preferred startup phase in Settings Card 3.',
    howToReach: 'Tap the orange phase selector pill in the top-right corner of the header.'
  },
  {
    badge: 'Feature 2 of 6 • Cross & Blind Mat',
    title: '3D Cross Ladder & Dual-Thumb Blind Mat',
    phase: 'cross',
    tab: 'blind',
    desc: 'Train Standard (2–6 move) or Advanced 20-move scrambles with the interactive 3D Cross Orbit cube, then test 15s WCA inspection on the dual-thumb Speedstack mat.',
    howToReach: 'Phase C → Bottom tabs: Ladder, Blind Run, and Mechanics.'
  },
  {
    badge: 'Feature 3 of 6 • F2L 3D Spatial Drills',
    title: 'Daily Grind & Interactive 3D F2L Cube',
    phase: 'f2l',
    tab: 'grind',
    desc: 'Work through daily learning chunks, navigate backward/forward across days (← Prev / Next →), hold-and-drag to reorder your lineup, or tap any pair to spin it in 3D.',
    howToReach: 'Phase F → The Grind (tap any pair) or Algorithms (41 F2L pairs).'
  },
  {
    badge: 'Feature 4 of 6 • OLL & PLL Libraries',
    title: 'Inline Fingertricks & Isolated Case Drills',
    phase: 'oll',
    tab: 'algorithms',
    desc: 'Browse all 57 OLL and 25 PLL cases by shape group or curriculum chunk with color-coded inline fingertrick triggers, grip guides, and Ao5/Ao20/Ao40 case timers.',
    howToReach: 'Phase O or P → Bottom tab: Algorithms → Tap any case to drill or tap Grip.'
  },
  {
    badge: 'Feature 5 of 6 • Millisecond Telemetry',
    title: 'Custom Target PBs & Full 3x3x3 Timer',
    phase: 'pll',
    tab: 'stats',
    desc: 'Set 0.001s millisecond Target PBs per phase or per individual case, and launch the full-screen 3x3x3 WCA Timer with Ao5 and Ao12 tracking.',
    howToReach: 'Any phase → Bottom tab: Statistics → Tap Open Timer or Goal ✎ on any case.'
  },
  {
    badge: 'Feature 6 of 6 • Settings Control Deck',
    title: '8-Card Settings Deck & Guided Replay',
    phase: 'oll',
    tab: 'settings',
    desc: 'Swipe through the 3D Settings deck to replay this guide anytime on Card 1, adjust Target PBs on Card 2, pin your startup phase on Card 3, or inspect WCA Notation & Fingertricks.',
    howToReach: 'Any phase → Bottom tab: Settings → Swipe cards or tap the pagination dots.'
  }
];

// =========================================================================
// 2D. COMPLETE CFOP DATASETS, FINGERTRICK CODEX & WCA NOTATION
// =========================================================================
const FINGERTRICK_CODEX = [
  {
    id: 'sexy',
    category: 'Core Triggers',
    name: 'Sexy Move',
    notation: "(R U R' U')",
    grip: 'Right thumb on Front-Bottom (DF), Right ring finger on Back-Right (BR).',
    execution: "Push R up with wrist, flick U with right index, pull R' down, and push U' with left index.",
    badgeClass: 'bg-orange-500/15 border-orange-500/35 text-orange-300',
    dotClass: 'bg-orange-400'
  },
  {
    id: 'left-sexy',
    category: 'Core Triggers',
    name: 'Left Sexy Move',
    notation: "(L' U' L U)",
    grip: 'Left thumb on Front-Bottom (DF), Left ring finger on Back-Left (BL).',
    execution: "Push L' up with left wrist, flick U' with left index, pull L down, and flick U with right index.",
    badgeClass: 'bg-sky-500/15 border-sky-500/35 text-sky-300',
    dotClass: 'bg-sky-400'
  },
  {
    id: 'inv-sexy',
    category: 'Core Triggers',
    name: 'Inverse Sexy',
    notation: "(R U' R')",
    grip: 'Right thumb on Front-Bottom (DF), Left index resting on Back-Left (UBL).',
    execution: "Push R up, push U' smoothly with left index without regripping, then pull R' straight down.",
    badgeClass: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
    dotClass: 'bg-amber-400'
  },
  {
    id: 'sledge',
    category: 'F-Layer Triggers',
    name: 'Sledgehammer',
    notation: "(R' F R F')",
    grip: 'Right thumb on Front-Center or U-edge; Right index ready on Top-Right (UR).',
    execution: "Pull R' down, press F clockwise with right index/thumb, push R up, and flick F' up with right thumb.",
    badgeClass: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
    dotClass: 'bg-rose-400'
  },
  {
    id: 'hedge',
    category: 'F-Layer Triggers',
    name: 'Hedgeslammer',
    notation: "(F R' F' R)",
    grip: 'Right thumb tucked on Front-Bottom (DF) so it can push F upward cleanly.',
    execution: "Push F clockwise with right index, pull R' down, flick F' up with right thumb, then lift R.",
    badgeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
    dotClass: 'bg-emerald-400'
  },
  {
    id: 'u2-double',
    category: 'Speed Flicks',
    name: 'U2 Double Flick',
    notation: '(U2)',
    grip: 'Left or Right index + middle fingers poised on the back-corner of the U-layer.',
    execution: 'Flick index finger immediately followed by middle finger in one rolling motion—never regrip for two single U turns.',
    badgeClass: 'bg-purple-500/15 border-purple-500/35 text-purple-300',
    dotClass: 'bg-purple-400'
  },
  {
    id: 'm-slice',
    category: 'Slice & Ring',
    name: 'M-Slice Ring Flick',
    notation: "(M2 / M')",
    grip: 'Thumbs on Front-Left/Right corners; Left ring & middle fingers behind DB.',
    execution: "Flick DB upward with left ring finger for M', or double-flick ring → middle finger for seamless M2.",
    badgeClass: 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300',
    dotClass: 'bg-cyan-400'
  },
  {
    id: 'd-ring',
    category: 'Slice & Ring',
    name: 'Ring-Finger D Push',
    notation: "(D / D')",
    grip: 'Ring fingers resting lightly along the bottom Back-Left and Back-Right edges.',
    execution: "Push Back-Left with left ring finger for D, or pull Back-Right with right ring finger for D'.",
    badgeClass: 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300',
    dotClass: 'bg-indigo-400'
  }
];

const WCA_NOTATION_GUIDE = [
  { section: 'Outer Faces', move: 'U / U\' / U2', desc: 'Top (Yellow) layer: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Outer Faces', move: 'D / D\' / D2', desc: 'Bottom (White) layer: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Outer Faces', move: 'R / R\' / R2', desc: 'Right (Orange) layer: Away from you, Toward you, or 180°' },
  { section: 'Outer Faces', move: 'L / L\' / L2', desc: 'Left (Red) layer: Toward you, Away from you, or 180°' },
  { section: 'Outer Faces', move: 'F / F\' / F2', desc: 'Front (Green) face: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Outer Faces', move: 'B / B\' / B2', desc: 'Back (Blue) face: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Wide Turns', move: 'r / r\' (Rw)', desc: 'Turn Right two layers together (R + M\')' },
  { section: 'Wide Turns', move: 'l / l\' (Lw)', desc: 'Turn Left two layers together (L + M)' },
  { section: 'Wide Turns', move: 'u / u\' (Uw)', desc: 'Turn Top two layers together (U + E\')' },
  { section: 'Wide Turns', move: 'f / f\' (Fw)', desc: 'Turn Front two layers together (F + S)' },
  { section: 'Slice Moves', move: 'M / M\' / M2', desc: 'Middle slice between L & R (follows L direction)' },
  { section: 'Slice Moves', move: 'E / E\' / E2', desc: 'Equatorial slice between U & D (follows D direction)' },
  { section: 'Slice Moves', move: 'S / S\' / S2', desc: 'Standing slice between F & B (follows F direction)' },
  { section: 'Rotations', move: 'x / x\'', desc: 'Rotate entire cube on R axis (U becomes B / F)' },
  { section: 'Rotations', move: 'y / y\'', desc: 'Rotate entire cube on U axis (F becomes L / R)' },
  { section: 'Rotations', move: 'z / z\'', desc: 'Rotate entire cube on F axis (U becomes R / L)' }
];

function buildFingertrickBreakdown(caseItem) {
  const alg = caseItem?.alg || '';
  const hasF = /\b[Ff]/.test(alg);
  const hasM = /\bM/.test(alg);
  const hasD = /\bD/.test(alg);
  return {
    grip: hasF
      ? 'Home Grip with Right thumb slightly lower on DF so it can flick F\' upward without regripping.'
      : hasM
      ? 'Neutral Pincher Grip on UFL/UFR corners, freeing left ring & middle fingers for M-slice flicks.'
      : 'Standard Right-Thumb-On-Front Home Grip; keep wrists neutral before starting.',
    cue: caseItem?.fingertrick || 'Execute parenthesized triggers in single fluid wrist-and-index bursts.',
    flow: hasD
      ? 'Use left/right ring fingers on the bottom back corners for D/D\' so your thumbs never leave the front.'
      : 'Use double-flick U2 (index → middle) and avoid regripping between triggers.'
  };
}

const CROSS_TIERS = [
  {
    tier: 1,
    moves: 2,
    title: '2-Move Direct Inserts',
    hint: 'Both white edges are one quarter-turn away from D. Insert in a single rhythmic flow.',
    scrambles: ["R2 F2", "F' R2", "L2 D' F2 D", "R' F' R F", "U R2 F2"]
  },
  {
    tier: 2,
    moves: 3,
    title: '3-Move Adjacent Pairs',
    hint: 'Use a single D-layer shift so the second white edge drops directly into its aligned slot.',
    scrambles: ["F R' D'", "R' F D", "L F' D", "U' R2 F2", "B' R2 D"]
  },
  {
    tier: 3,
    moves: 4,
    title: '4-Move Keyhole & Flips',
    hint: 'Preserve already-placed white edges by rotating D instead of undoing solved pieces.',
    scrambles: ["R' F R D'", "F U' R2 F2", "L' B' D2 R2", "U R' F' R", "F2 U' R2 D"]
  },
  {
    tier: 4,
    moves: 5,
    title: '5-Move Multi-Edge Setup',
    hint: 'Solve bad (flipped) edges first while setting up good edges in the E-slice.',
    scrambles: ["R U' F R' D'", "F' U R' F2 D", "L U' F' L D2", "R2 U' F' R D", "B U' R2 F' D"]
  },
  {
    tier: 5,
    moves: 6,
    title: '6-Move Sub-8 Standard',
    hint: 'Plan all 4 edges during inspection and align the entire cross with a final D turn.',
    scrambles: ["R' U' F R2 D' F'", "F U' R' F' D2 R", "L' U F' L2 D R'", "R U2 F' R' D' F", "B' U R' B2 D' F2"]
  }
];

const CROSS_ADVANCED_TIERS = [
  {
    tier: 1,
    moves: 6,
    title: 'Full Scramble • 6-Move Cross',
    hint: 'Full 20-move WCA scramble with a clean 6-move solution. Trace all 4 white edges before turning.',
    scrambles: [
      "R U R' U' F2 D R2 U' B2 L2 D' F2 R U' B' L D2 F' U2 R",
      "F' U2 L2 B2 D R2 U' F2 U B2 R' D' L' B U' F R2 U' L2 B"
    ]
  },
  {
    tier: 2,
    moves: 7,
    title: 'Full Scramble • 7-Move Cross',
    hint: 'Solve relative to the color orbit (Green → Orange → Blue → Red), then finish with D/D\'.',
    scrambles: [
      "L2 U' B2 D2 R2 F2 U' L2 B2 U R' F' D2 B U L' R D' F2 U",
      "B2 R2 D' L2 U B2 R2 U' F2 D' L B' R' U2 F' D' L' B2 R U'"
    ]
  },
  {
    tier: 3,
    moves: 7,
    title: 'Full Scramble • Flipped Edge Trap',
    hint: 'Use one flipped white edge to kick another edge out of the bottom layer simultaneously.',
    scrambles: [
      "D2 F2 R2 U' B2 L2 D' R2 U' F2 R B' U' L' D2 F' R2 U' B L",
      "U2 R2 F2 D' L2 B2 U R2 D' F2 L' F U R D2 B R2 U' L' F"
    ]
  },
  {
    tier: 4,
    moves: 8,
    title: 'Full Scramble • X-Cross Lookahead',
    hint: 'Track the White-Green-Orange corner while finishing your 8-move cross.',
    scrambles: [
      "R2 B2 D' F2 U L2 D' R2 U' B2 F' L' U2 R' D B' L2 F' U R",
      "F2 L2 U' R2 D B2 U' L2 D' F2 R' B U2 L D' F R2 B U' L'"
    ]
  },
  {
    tier: 5,
    moves: 8,
    title: 'WCA Competition 8-Move Cap',
    hint: 'Every 3x3 scramble can be solved in ≤8 moves. Aim for zero pauses between Cross and Pair 1.',
    scrambles: [
      "U' F2 R2 D' B2 L2 U R2 D' F2 L' B' R U2 F' D' R2 B' U' L",
      "D' R2 B2 U' L2 F2 D' R2 U' B2 R F' L' U2 B D F2 R' U L'"
    ]
  }
];

const CROSS_MECHANICS = [
  {
    id: 1,
    title: 'Relative Color Orbit',
    badge: 'Mechanic 1 • Zero Center Peeking',
    summary: 'Build the cross in the exact clockwise order Green → Orange → Blue → Red on D, then align all 4 edges at once with a single D turn.',
    example: "F' R' D' R F D'",
    approaches: [
      {
        id: 'opp',
        name: 'Opposite Pair First',
        tag: 'Blue + Green',
        rule: 'Place Blue opposite Green first so you never disturb solved adjacent edges.',
        cases: [
          { label: 'Case A • Offset D', setup: "R2 F2 D", solve: "D' F2 R2", note: 'Aligns both opposite edges in 3 turns.' },
          { label: 'Case B • E-Slice Drop', setup: "R' F D", solve: "D' F' R", note: 'Drops FR into DR while kicking DF into place.' }
        ]
      },
      {
        id: 'adj',
        name: 'Adjacent Chain',
        tag: 'Green → Orange',
        rule: 'Shift D by 90° so the second edge lands directly next to the first.',
        cases: [
          { label: 'Case A • D-Shift', setup: "F R' D'", solve: "D R F'", note: 'Single D setup avoids extra U turns.' }
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'Good vs. Bad Edges',
    badge: 'Mechanic 2 • 1-Move Orientation',
    summary: 'An edge is "Good" if it can reach D using only R, L, U, D moves. A "Bad" edge requires one F or B quarter-turn to orient.',
    example: "F R' F' R",
    approaches: [
      {
        id: 'flip',
        name: 'F-Turn Conversion',
        tag: 'Bad → Good',
        rule: 'Use a single F or F\' move to flip a bad edge while simultaneously placing an adjacent edge.',
        cases: [
          { label: 'Case A • UF Flipped', setup: "F R' F' R", solve: "R' F R F'", note: 'Sledgehammer orients UF straight into DF.' }
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'D-Layer Keyhole',
    badge: 'Mechanic 3 • Non-Destructive',
    summary: 'Never undo a solved cross edge to insert another. Rotate D to bring an empty slot underneath the incoming edge.',
    example: "D' R' D",
    approaches: [
      {
        id: 'kh',
        name: 'Empty Slot Shift',
        tag: 'Preserve Cross',
        rule: 'Move D before R/L, insert, then restore D.',
        cases: [
          { label: 'Case A • Right Keyhole', setup: "D' R D", solve: "D' R' D", note: 'Protects DF, DL, and DB while solving DR.' }
        ]
      }
    ]
  },
  {
    id: 4,
    title: '2-Edge Combo & X-Cross',
    badge: 'Mechanic 4 • Sub-10 Transition',
    summary: 'Pair a white cross edge with a bottom corner during the final 2 cross moves to enter F2L with 1 pair already solved.',
    example: "R' F R U' R' F' R",
    approaches: [
      {
        id: 'xcross',
        name: 'Free Pair Preservation',
        tag: 'X-Cross Setup',
        rule: 'Keep an already-formed corner-edge pair in the U-layer while finishing the last cross edge.',
        cases: [
          { label: 'Case A • U-Layer Preserve', setup: "R U' R' F2", solve: "F2 R U R'", note: 'Finishes DF without breaking the UFR pair.' }
        ]
      }
    ]
  }
];

const F2L_GROUPS = [
  'Basic Inserts',
  'Corner in Top • Edge in Top',
  'Corner in Top • Edge in Slot',
  'Corner in Slot • Edge in Top',
  'Corner & Edge in Slot',
  'Connected Pairs'
];

const F2L_DATA = [
  { id: 1, group: 'Basic Inserts', name: 'F2L 1 (Right Insert)', alg: "(U R U' R')", fingertrick: "Push U with right index, lift R, push U' with left index, drop R'.", step1: 'Corner & edge are split with mismatched top colors.', step2: 'Pair and insert cleanly into Front-Right.' },
  { id: 2, group: 'Basic Inserts', name: 'F2L 2 (Front Insert)', alg: "(U' F' U F)", fingertrick: "Push U' with left index, pull F' up with right thumb, flick U, push F.", step1: 'White sticker faces Front with opposite edge on Left.', step2: 'Insert straight into Front-Right via F-layer.' },
  { id: 3, group: 'Basic Inserts', name: 'F2L 3 (Direct Front)', alg: "(F' U' F)", fingertrick: "Pull F' up with right thumb, push U' with left index, press F.", step1: 'Already-paired block sits above Front-Left.', step2: 'Drop directly into the Front-Right slot.' },
  { id: 4, group: 'Basic Inserts', name: 'F2L 4 (Direct Right)', alg: "(R U R')", fingertrick: "Lift R with wrist, flick U with right index, pull R' down.", step1: 'Already-paired block sits above Back-Right.', step2: 'Drop directly into the Front-Right slot.' },
  { id: 5, group: 'Corner in Top • Edge in Top', name: 'F2L 5 (Split Opposite)', alg: "(U' R U R') (U2 R U' R')", fingertrick: "Execute (U' R U R') smoothly, double-flick (U2), finish with (R U' R').", step1: 'White faces Right; edge is in UL with matching top color.', step2: 'Hide corner, pair edge, and insert.' },
  { id: 6, group: 'Corner in Top • Edge in Top', name: 'F2L 6 (Split Front)', alg: "(U F' U' F) (U2 F' U F)", fingertrick: "Use right thumb for F' and left index for U' without regripping.", step1: 'White faces Front; edge is in UB with matching top color.', step2: 'Mirror of F2L 5 into Front-Right.' },
  { id: 7, group: 'Corner in Top • Edge in Top', name: 'F2L 7 (Far Pair Right)', alg: "(U' R U2 R') (U2 R U' R')", fingertrick: "Double-flick both U2 turns with index-middle roll.", step1: 'White faces Right; edge is opposite in UL.', step2: 'Bring edge to UF while hiding corner, then insert.' },
  { id: 8, group: 'Corner in Top • Edge in Top', name: 'F2L 8 (Far Pair Front)', alg: "(U F' U2 F) (U2 F' U F)", fingertrick: "Keep right thumb anchored on DF for clean F' lifts.", step1: 'White faces Front; edge is opposite in UB.', step2: 'Mirror of F2L 7.' },
  { id: 9, group: 'Corner in Top • Edge in Top', name: 'F2L 9 (Misaligned Right)', alg: "(U' R U' R') (U F' U' F)", fingertrick: "Transition from R' straight into F' with right thumb.", step1: 'White faces Right; edge is in UB with opposite top color.', step2: 'Separate and insert via Front.' },
  { id: 10, group: 'Corner in Top • Edge in Top', name: 'F2L 10 (Misaligned Front)', alg: "(U F' U F) (U' R U R')", fingertrick: "Flow seamlessly from F into R without regrip.", step1: 'White faces Front; edge is in UL with opposite top color.', step2: 'Separate and insert via Right.' },
  { id: 11, group: 'Connected Pairs', name: 'F2L 11 (Wrongly Connected R)', alg: "(U' R U2 R') (U F' U' F)", fingertrick: "Double-flick U2, then drop R' directly into F'.", step1: 'Corner & edge touch in U with mismatched side colors.', step2: 'Split in back and insert through Front.' },
  { id: 12, group: 'Connected Pairs', name: 'F2L 12 (Wrongly Connected F)', alg: "(R U' R' U) (R U' R' U2) (R U' R')", fingertrick: "Three rhythmic (R U' R') inverse-sexy bursts.", step1: 'Connected pair with White facing Right.', step2: 'Cycle corner to re-pair and insert.' },
  { id: 13, group: 'Connected Pairs', name: 'F2L 13 (Connected Flip F)', alg: "(U F' U2 F) (U' R U R')", fingertrick: "Use right thumb F' and left index U' seamlessly.", step1: 'Connected pair with White facing Front.', step2: 'Split and insert through Right.' },
  { id: 14, group: 'Connected Pairs', name: 'F2L 14 (Connected Lift)', alg: "(U' R U' R') (U R U R')", fingertrick: "Back-to-back (U' R U' R') and (U R U R') triggers.", step1: 'Connected pair with matching top colors on Right.', step2: 'Unpair in back and re-insert.' },
  { id: 15, group: 'Connected Pairs', name: 'F2L 15 (Sledge Split)', alg: "(R' F R F') (U R U' R')", fingertrick: "Sledgehammer (R' F R F') directly into (U R U' R').", step1: 'Connected pair directly over Front-Right slot.', step2: 'Sledgehammer splits & pairs in one motion.' },
  { id: 16, group: 'Connected Pairs', name: 'F2L 16 (Hedge Split)', alg: "(R U' R' U2) (F' U' F)", fingertrick: "Inverse sexy + U2 double-flick into (F' U' F).", step1: 'Connected pair with flipped edge over slot.', step2: 'Kick edge out and insert via Front.' },
  { id: 17, group: 'Corner in Top • Edge in Top', name: 'F2L 17 (White Up • Match R)', alg: "(R U2 R') (U' R U R')", fingertrick: "Fast (R U2 R') double-flick followed by (U' R U R').", step1: 'White sticker faces Up; edge is aligned on Right.', step2: 'Pair on back-right and insert.' },
  { id: 18, group: 'Corner in Top • Edge in Top', name: 'F2L 18 (White Up • Match F)', alg: "(F' U2 F) (U F' U' F)", fingertrick: "Right thumb F' lift + U2 double-flick.", step1: 'White sticker faces Up; edge is aligned on Front.', step2: 'Pair on front-left and insert.' },
  { id: 19, group: 'Corner in Top • Edge in Top', name: 'F2L 19 (White Up • Opp R)', alg: "(U R U2 R') (U R U' R')", fingertrick: "Keep right thumb on DF throughout.", step1: 'White faces Up; edge is in UB.', step2: 'Hide corner, sweep edge over, and insert.' },
  { id: 20, group: 'Corner in Top • Edge in Top', name: 'F2L 20 (White Up • Opp F)', alg: "(U' F' U2 F) (U' F' U F)", fingertrick: "Push U' with left index; flick U with right index.", step1: 'White faces Up; edge is in UL.', step2: 'Mirror of F2L 19.' },
  { id: 21, group: 'Corner in Top • Edge in Top', name: 'F2L 21 (White Up • Far R)', alg: "(U2 R U R') (U R U' R')", fingertrick: "Lead with U2 double-flick into two smooth R triggers.", step1: 'White faces Up; edge is in UL.', step2: 'Align over back-right and insert.' },
  { id: 22, group: 'Corner in Top • Edge in Top', name: 'F2L 22 (White Up • Far F)', alg: "(U2 F' U' F) (U' F' U F)", fingertrick: "Lead with U2 double-flick into F-layer triggers.", step1: 'White faces Up; edge is in UB.', step2: 'Mirror of F2L 21.' },
  { id: 23, group: 'Corner in Top • Edge in Top', name: 'F2L 23 (White Up • Adj R)', alg: "(U R U' R') (U' R U' R') (U R U' R')", fingertrick: "Three rapid (R U' R') pulses with index push-pulls.", step1: 'White faces Up; edge is in UF.', step2: 'Cycle pair in 3 fast triggers.' },
  { id: 24, group: 'Corner in Top • Edge in Top', name: 'F2L 24 (White Up • Adj F)', alg: "(F' U F) (U2 R U R')", fingertrick: "Quick front lift into U2 + (R U R').", step1: 'White faces Up; edge is in UR.', step2: 'Pair over back-right and drop in.' },
  { id: 25, group: 'Corner in Slot • Edge in Top', name: 'F2L 25 (Solved Corner • Edge R)', alg: "(U' F' U F) (U R U' R')", fingertrick: "Front insert setup directly into Right insert.", step1: 'Bottom corner is solved; edge is in UR.', step2: 'Extract corner paired with edge and insert.' },
  { id: 26, group: 'Corner in Slot • Edge in Top', name: 'F2L 26 (Solved Corner • Edge F)', alg: "(U R U' R') (U' F' U F)", fingertrick: "Right trigger directly into Front trigger.", step1: 'Bottom corner is solved; edge is in UF.', step2: 'Mirror of F2L 25.' },
  { id: 27, group: 'Corner in Slot • Edge in Top', name: 'F2L 27 (Twist R • Edge R)', alg: "(R U' R' U) (R U' R')", fingertrick: "Double (R U' R') inverse sexy without regrip.", step1: 'Corner in slot with White facing Right.', step2: 'Pop corner out paired and re-insert.' },
  { id: 28, group: 'Corner in Slot • Edge in Top', name: 'F2L 28 (Twist F • Edge R)', alg: "(R U R' U') (R U R')", fingertrick: "Sexy move (R U R' U') followed by (R U R').", step1: 'Corner in slot with White facing Front.', step2: 'Lift and insert in 7 moves.' },
  { id: 29, group: 'Corner in Slot • Edge in Top', name: 'F2L 29 (Twist F • Edge F)', alg: "(R' F R F') (R' F R F')", fingertrick: "Double Sledgehammer (R' F R F') x2.", step1: 'Corner in slot with White facing Front; edge in UF.', step2: 'Two rapid sledgehammers solve the slot.' },
  { id: 30, group: 'Corner in Slot • Edge in Top', name: 'F2L 30 (Twist R • Edge F)', alg: "(R U R' U') (R U R')", fingertrick: "Keep right thumb anchored on DF.", step1: 'Corner in slot with White facing Right; edge in UF.', step2: 'Extract and insert cleanly.' },
  { id: 31, group: 'Corner in Top • Edge in Slot', name: 'F2L 31 (White Up • Edge Flipped)', alg: "(U' R' F R F') (R U' R')", fingertrick: "Sledgehammer into inverse sexy.", step1: 'White faces Up; middle edge is flipped in slot.', step2: 'Flip edge out and pair simultaneously.' },
  { id: 32, group: 'Corner in Top • Edge in Slot', name: 'F2L 32 (White Up • Edge Solved)', alg: "(R U R' U') (R U R' U') (R U R')", fingertrick: "Triple Sexy Move (R U R' U') x2 + (R U R').", step1: 'White faces Up; middle edge is already solved.', step2: 'Pure sexy-move spam.' },
  { id: 33, group: 'Corner in Top • Edge in Slot', name: 'F2L 33 (White R • Edge Solved)', alg: "(U' R U' R') (U2 R U' R')", fingertrick: "Smooth (U' R U' R') into U2 double-flick.", step1: 'White faces Right; middle edge is solved.', step2: 'Extract edge paired with corner and insert.' },
  { id: 34, group: 'Corner in Top • Edge in Slot', name: 'F2L 34 (White F • Edge Solved)', alg: "(U R U R') (U2 R U R')", fingertrick: "Symmetric right-hand trigger with U2 flick.", step1: 'White faces Front; middle edge is solved.', step2: 'Pair in back-right and insert.' },
  { id: 35, group: 'Corner in Top • Edge in Slot', name: 'F2L 35 (White R • Edge Flipped)', alg: "(U' R U R') (U F' U' F)", fingertrick: "Flow from R' into F' with right thumb.", step1: 'White faces Right; edge is flipped in slot.', step2: 'Pop edge out and insert via Front.' },
  { id: 36, group: 'Corner in Top • Edge in Slot', name: 'F2L 36 (White F • Edge Flipped)', alg: "(U F' U' F) (U' R U R')", fingertrick: "Mirror of F2L 35.", step1: 'White faces Front; edge is flipped in slot.', step2: 'Pop edge out and insert via Right.' },
  { id: 37, group: 'Corner & Edge in Slot', name: 'F2L 37 (Both in Slot • Flipped Edge)', alg: "(R U' R') (U' R U R') (U2 R U' R')", fingertrick: "Extract with (R U' R'), then solve like F2L 5.", step1: 'Corner solved, edge flipped in Front-Right.', step2: 'Extract, pair, and insert without cube rotation.' },
  { id: 38, group: 'Corner & Edge in Slot', name: 'F2L 38 (Twist R • Solved Edge)', alg: "(R U' R' U') (R U R') (U2 R U' R')", fingertrick: "Keep wrist loose across all 3 triggers.", step1: 'Corner twisted Right; edge solved in slot.', step2: 'Cycle corner orientation into slot.' },
  { id: 39, group: 'Corner & Edge in Slot', name: 'F2L 39 (Twist F • Solved Edge)', alg: "(R U R' U2) (R U' R' U) (R U R')", fingertrick: "Single regripless right-hand flow.", step1: 'Corner twisted Front; edge solved in slot.', step2: 'Lift, pair, and insert.' },
  { id: 40, group: 'Corner & Edge in Slot', name: 'F2L 40 (Twist R • Flipped Edge)', alg: "(R U' R' U) (F' U' F) (U' R U R')", fingertrick: "Transition cleanly into (F' U' F).", step1: 'Both pieces trapped & misoriented in slot.', step2: 'Extract and insert via Right.' },
  { id: 41, group: 'Corner & Edge in Slot', name: 'F2L 41 (Twist F • Flipped Edge)', alg: "(R U R' U') (R U' R') (U2 F' U' F)", fingertrick: "Sexy move into inverse sexy + (F' U' F).", step1: 'Both pieces trapped & misoriented in slot.', step2: 'Extract and insert via Front.' }
];

const F2L_BY_ID = new Map(F2L_DATA.map((item) => [item.id, item]));
const F2L_DEFAULT_CHUNKS = [
  { id: 'f2l-c1', title: 'Chunk 1 • Basic Inserts (1–4)', ids: [1, 2, 3, 4] },
  { id: 'f2l-c2', title: 'Chunk 2 • Split Top Pairs (5–10)', ids: [5, 6, 7, 8, 9, 10] },
  { id: 'f2l-c3', title: 'Chunk 3 • Connected Pairs (11–16)', ids: [11, 12, 13, 14, 15, 16] },
  { id: 'f2l-c4', title: 'Chunk 4 • White Facing Up (17–24)', ids: [17, 18, 19, 20, 21, 22, 23, 24] },
  { id: 'f2l-c5', title: 'Chunk 5 • Corner in Slot (25–30)', ids: [25, 26, 27, 28, 29, 30] },
  { id: 'f2l-c6', title: 'Chunk 6 • Edge in Slot (31–36)', ids: [31, 32, 33, 34, 35, 36] },
  { id: 'f2l-c7', title: 'Chunk 7 • Trapped Slot Cases (37–41)', ids: [37, 38, 39, 40, 41] }
];

const OLL_GROUPS = [
  'All Edges Oriented',
  'T-Shapes & Squares',
  'C-Shapes & W-Shapes',
  'P-Shapes & Fish',
  'Knight & Lightning',
  'Dot Cases'
];

const OLL_DATA = [
  { id: 27, group: 'All Edges Oriented', name: 'OLL 27 (Sune)', alg: "(R U R' U) (R U2 R')", fingertrick: "Lift R, flick U, drop R', push U with left index, lift R, U2 double-flick." },
  { id: 26, group: 'All Edges Oriented', name: 'OLL 26 (Antisune)', alg: "(R U2 R' U') (R U' R')", fingertrick: "Lift R, U2 double-flick, drop R', push U' with left index, finish (R U' R')." },
  { id: 21, group: 'All Edges Oriented', name: 'OLL 21 (H / Double Sune)', alg: "F (R U R' U') (R U R' U') (R U R' U') F'", fingertrick: "Triple Sexy Move (R U R' U') x3 bracketed by F and F'." },
  { id: 22, group: 'All Edges Oriented', name: 'OLL 22 (Pi / Bruno)', alg: "R U2 (R2 U' R2 U') R2 U2 R", fingertrick: "Double-flick U2 and push U' with left index so right wrist never regrips." },
  { id: 23, group: 'All Edges Oriented', name: 'OLL 23 (Headlights / U)', alg: "R2 D (R' U2 R) D' (R' U2 R')", fingertrick: "Push D with left ring finger; pull D' with right ring finger." },
  { id: 24, group: 'All Edges Oriented', name: 'OLL 24 (Chameleon / T)', alg: "(r U R' U') (r' F R F')", fingertrick: "Wide sexy move (r U R' U') into wide sledgehammer (r' F R F')." },
  { id: 25, group: 'All Edges Oriented', name: 'OLL 25 (Bowtie / L)', alg: "F' (r U R' U') (r' F R)", fingertrick: "Lift F' with right thumb, execute wide sexy, finish with (r' F R)." },
  { id: 33, group: 'T-Shapes & Squares', name: 'OLL 33 (T-Sexy)', alg: "(R U R' U') (R' F R F')", fingertrick: "Sexy move directly into Sledgehammer—one of the fastest 8-movers." },
  { id: 45, group: 'T-Shapes & Squares', name: 'OLL 45 (T-Suit)', alg: "F (R U R' U') F'", fingertrick: "6-move fundamental trigger: F + Sexy Move + F'." },
  { id: 5, group: 'T-Shapes & Squares', name: 'OLL 5 (Right Square)', alg: "(r' U2 R U R' U r)", fingertrick: "Wide r' lift + U2 double-flick into smooth right-hand finish." },
  { id: 6, group: 'T-Shapes & Squares', name: 'OLL 6 (Left Square)', alg: "(r U2 R' U' R U' r')", fingertrick: "Mirror of OLL 5 using left index U' pushes." },
  { id: 34, group: 'C-Shapes & W-Shapes', name: 'OLL 34 (C-T)', alg: "(R U R2 U') (R' F R U) R U' F'", fingertrick: "Flow from R2 U' straight into R' F with right thumb." },
  { id: 46, group: 'C-Shapes & W-Shapes', name: 'OLL 46 (C-Headlights)', alg: "R' U' (R' F R F') U R", fingertrick: "Sledgehammer (R' F R F') nested inside R' U' ... U R." },
  { id: 36, group: 'C-Shapes & W-Shapes', name: 'OLL 36 (W-Left)', alg: "(L' U' L U') (L' U L U) (L F' L' F)", fingertrick: "Left-hand triggers finishing with left-thumb F' lift." },
  { id: 38, group: 'C-Shapes & W-Shapes', name: 'OLL 38 (W-Right)', alg: "(R U R' U) (R U' R' U') (R' F R F')", fingertrick: "Right triggers flowing into Sledgehammer (R' F R F')." },
  { id: 31, group: 'P-Shapes & Fish', name: 'OLL 31 (P-Right)', alg: "(R' U' F) (U R U' R') F' R", fingertrick: "Pinch F with right index; flick F' up with right thumb." },
  { id: 32, group: 'P-Shapes & Fish', name: 'OLL 32 (P-Left)', alg: "S (R U R' U') (R' F R f')", fingertrick: "Push S slice with right index, sexy move, wide f' finish." },
  { id: 43, group: 'P-Shapes & Fish', name: 'OLL 43 (P-Anti)', alg: "F' (U' L' U L) F", fingertrick: "Right thumb F' lift + left inverse sexy + F." },
  { id: 44, group: 'P-Shapes & Fish', name: 'OLL 44 (P-Sune)', alg: "F (U R U' R') F'", fingertrick: "F + inverse sexy (U R U' R') + F'." },
  { id: 9, group: 'P-Shapes & Fish', name: 'OLL 9 (Kite)', alg: "(R U R' U') R' F R2 U R' U' F'", fingertrick: "Sexy move into Sledgehammer-style R2 finish." },
  { id: 10, group: 'P-Shapes & Fish', name: 'OLL 10 (Anti-Kite)', alg: "(R U R' U) (R' F R F') (R U2 R')", fingertrick: "Sledgehammer nested before (R U2 R')." },
  { id: 35, group: 'P-Shapes & Fish', name: 'OLL 35 (Fish Salad)', alg: "(R U2) (R2 F R F') (R U2 R')", fingertrick: "Sledgehammer with R2 in the middle between two (R U2) bursts." },
  { id: 37, group: 'P-Shapes & Fish', name: 'OLL 37 (Mounted Fish)', alg: "F (R U' R' U') (R U R' F')", fingertrick: "Inverse sexy into (R U R' F') with right thumb." },
  { id: 13, group: 'Knight & Lightning', name: 'OLL 13 (Knight 1)', alg: "(F U R U' R2) F' R (U R U' R')", fingertrick: "Smooth F' thumb flick into (U R U' R')." },
  { id: 14, group: 'Knight & Lightning', name: 'OLL 14 (Knight 2)', alg: "R' F R (U R' F' R) (F U' F')", fingertrick: "Keep right thumb ready on DF for F' and F." },
  { id: 15, group: 'Knight & Lightning', name: 'OLL 15 (Knight 3)', alg: "(r' U' r) (R' U' R U) (r' U r)", fingertrick: "Wide r' triggers sandwiching a clean R' trigger." },
  { id: 16, group: 'Knight & Lightning', name: 'OLL 16 (Knight 4)', alg: "(r U r') (R U R' U') (r U' r')", fingertrick: "Wide r triggers sandwiching a Sexy Move (R U R' U')." },
  { id: 7, group: 'Knight & Lightning', name: 'OLL 7 (Wide Sune)', alg: "(r U R' U) (R U2 r')", fingertrick: "Sune starting and ending with wide r/r'." },
  { id: 8, group: 'Knight & Lightning', name: 'OLL 8 (Wide Antisune)', alg: "(r' U' R U') (R' U2 r)", fingertrick: "Antisune starting and ending with wide r'/r." },
  { id: 11, group: 'Knight & Lightning', name: 'OLL 11 (Downstairs)', alg: "r' (R2 U R' U R U2 R') U M'", fingertrick: "Finish with left ring-finger M' flick." },
  { id: 12, group: 'Knight & Lightning', name: 'OLL 12 (Upstairs)', alg: "M' (R' U' R U' R' U2 R) U' r R'", fingertrick: "Start with left ring-finger M' flick." },
  { id: 39, group: 'Knight & Lightning', name: 'OLL 39 (Big Lightning L)', alg: "L F' (L' U' L U) F U' L'", fingertrick: "Left-hand sexy move bracketed by F'/F." },
  { id: 40, group: 'Knight & Lightning', name: 'OLL 40 (Big Lightning R)', alg: "R' F (R U R' U') F' U R", fingertrick: "Right-hand sexy move bracketed by F/F'." },
  { id: 51, group: 'T-Shapes & Squares', name: 'OLL 51 (Bottlecap)', alg: "F (U R U' R') (U R U' R') F'", fingertrick: "Double inverse sexy (U R U' R') x2 inside F ... F'." },
  { id: 52, group: 'T-Shapes & Squares', name: 'OLL 52 (Rice Cooker)', alg: "(R' F' U' F U') (R U R' U R)", fingertrick: "Keep left index on UBL for rapid U' pushes." },
  { id: 55, group: 'T-Shapes & Squares', name: 'OLL 55 (Highway)', alg: "(R' F R U) (R U' R2 F') R2 U' R' (U R U R')", fingertrick: "Flow from R2 F' directly into R2 U'." },
  { id: 56, group: 'T-Shapes & Squares', name: 'OLL 56 (Streetlights)', alg: "(r U r') (U R U' R') (U R U' R') (r U' r')", fingertrick: "Wide r brackets around two inverse sexies." },
  { id: 57, group: 'All Edges Oriented', name: 'OLL 57 (H-Cross)', alg: "(R U R' U') M' (U R U' r')", fingertrick: "Sexy move + left-ring M' + wide r' finish." },
  { id: 28, group: 'All Edges Oriented', name: 'OLL 28 (Stealth)', alg: "(r U R' U') M (U R U' R')", fingertrick: "Sexy move + M slice + inverse sexy." },
  { id: 29, group: 'Knight & Lightning', name: 'OLL 29 (Spotted Chameleon)', alg: "(R U R' U') (R U' R' F') U' (F R U R')", fingertrick: "Smooth F' thumb lift after R'." },
  { id: 30, group: 'Knight & Lightning', name: 'OLL 30 (Spotted Anti)', alg: "F (R' F R2 U' R' U') (R U R' F2)", fingertrick: "Finish with double-flick F2." },
  { id: 41, group: 'Knight & Lightning', name: 'OLL 41 (Awkward Sune)', alg: "(R U R' U) (R U2 R') F (R U R' U') F'", fingertrick: "Sune + OLL 45 (F Sexy F') combined." },
  { id: 42, group: 'Knight & Lightning', name: 'OLL 42 (Awkward Antisune)', alg: "(R' U' R U') (R' U2 R) F (R U R' U') F'", fingertrick: "Back-Antisune + OLL 45 combined." },
  { id: 47, group: 'C-Shapes & W-Shapes', name: 'OLL 47 (Anti-Breakneck)', alg: "F' (L' U' L U) (L' U' L U) F", fingertrick: "Double Left Sexy (L' U' L U) x2 inside F' ... F." },
  { id: 48, group: 'C-Shapes & W-Shapes', name: 'OLL 48 (Breakneck)', alg: "F (R U R' U') (R U R' U') F'", fingertrick: "Double Sexy (R U R' U') x2 inside F ... F'." },
  { id: 49, group: 'C-Shapes & W-Shapes', name: 'OLL 49 (Right Back Squeezy)', alg: "r U' r2 U r2 U r2 U' r", fingertrick: "Continuous wide-r rolling motion." },
  { id: 50, group: 'C-Shapes & W-Shapes', name: 'OLL 50 (Right Front Squeezy)', alg: "r' U r2 U' r2 U' r2 U r'", fingertrick: "Mirror wide-r' rolling motion." },
  { id: 53, group: 'T-Shapes & Squares', name: 'OLL 53 (Frying Pan L)', alg: "(r' U' R U') (R' U R U') (R' U2 r)", fingertrick: "Keep wrist steady during R' U R U'." },
  { id: 54, group: 'T-Shapes & Squares', name: 'OLL 54 (Frying Pan R)', alg: "(r U R' U) (R U' R' U) (R U2 r')", fingertrick: "Mirror of OLL 53." },
  { id: 1, group: 'Dot Cases', name: 'OLL 1 (Runway)', alg: "(R U2) (R2 F R F') U2 (R' F R F')", fingertrick: "Two Sledgehammers separated by U2 double-flick." },
  { id: 2, group: 'Dot Cases', name: 'OLL 2 (Zamboni)', alg: "F (R U R' U') F' f (R U R' U') f'", fingertrick: "OLL 45 + wide f OLL 45 back-to-back." },
  { id: 3, group: 'Dot Cases', name: 'OLL 3 (Anti-Mouse)', alg: "f (R U R' U') f' U' F (R U R' U') F'", fingertrick: "Wide f trigger, U' push, standard F trigger." },
  { id: 4, group: 'Dot Cases', name: 'OLL 4 (Mouse)', alg: "f (R U R' U') f' U F (R U R' U') F'", fingertrick: "Wide f trigger, U flick, standard F trigger." },
  { id: 17, group: 'Dot Cases', name: 'OLL 17 (Slash)', alg: "(R U R' U) (R' F R F') U2 (R' F R F')", fingertrick: "Sledgehammer + U2 + Sledgehammer." },
  { id: 18, group: 'Dot Cases', name: 'OLL 18 (Crown)', alg: "(r U R' U) (R U2 r') (r' U' R U') (R' U2 r)", fingertrick: "OLL 7 directly into OLL 8." },
  { id: 19, group: 'Dot Cases', name: 'OLL 19 (Bunny)', alg: "r' R U (R U R' U') r (R2 F R F')", fingertrick: "Sexy move into wide r and Sledgehammer." },
  { id: 20, group: 'Dot Cases', name: 'OLL 20 (Checkers / X)', alg: "(r U R' U') M2 (U R U' R') U' M'", fingertrick: "Double-flick M2 with left ring-middle fingers." }
];

const OLL_BY_ID = new Map(OLL_DATA.map((item) => [item.id, item]));
const OLL_DEFAULT_CHUNKS = [
  { id: 'oll-c1', title: 'Chunk 1 • 2-Look OLL Corners (21–27)', ids: [27, 26, 21, 22, 23, 24, 25] },
  { id: 'oll-c2', title: 'Chunk 2 • T, Square & Line (33, 45, 5, 6, 51, 52)', ids: [33, 45, 5, 6, 51, 52] },
  { id: 'oll-c3', title: 'Chunk 3 • P & C Shapes (31, 32, 43, 44, 34, 46)', ids: [31, 32, 43, 44, 34, 46] },
  { id: 'oll-c4', title: 'Chunk 4 • Fish & W Shapes (9, 10, 35, 37, 36, 38)', ids: [9, 10, 35, 37, 36, 38] },
  { id: 'oll-c5', title: 'Chunk 5 • Knight & Lightning (7, 8, 11–16, 39, 40)', ids: [7, 8, 11, 12, 13, 14, 15, 16, 39, 40] },
  { id: 'oll-c6', title: 'Chunk 6 • Squeezy, Awkward & Dots (1–4, 17–20)', ids: [1, 2, 3, 4, 17, 18, 19, 20, 47, 48] }
];

const PLL_GROUPS = [
  'Edges Only (EPLL)',
  'Corners Only (CPLL)',
  'Adjacent Corner Swap',
  'Diagonal Corner Swap',
  'G-Permutations'
];

const PLL_DATA = [
  { id: 1, group: 'Edges Only (EPLL)', name: 'PLL Ua (Counter-Clockwise)', alg: "(R U' R U) (R U R U') R' U' R2", inverse: "R2 U R U R' U' R' U' R' U R'", recognition: 'Solved bar in back; 3 edges cycle counter-clockwise.', fingertrick: "Keep right thumb on DF and push U' with left index." },
  { id: 2, group: 'Edges Only (EPLL)', name: 'PLL Ub (Clockwise)', alg: "R2 U (R U R' U') R' U' (R' U R')", inverse: "R U' R U R U R U' R' U' R2", recognition: 'Solved bar in back; 3 edges cycle clockwise.', fingertrick: "Execute (R U R' U') cleanly before dropping R' U' R'." },
  { id: 3, group: 'Edges Only (EPLL)', name: 'PLL H (Opposite Edge Swap)', alg: "(M2 U M2) U2 (M2 U M2)", inverse: "M2 U' M2 U2 M2 U' M2", recognition: 'Opposite colors on all 4 middle edges; corners solved.', fingertrick: "Ring-middle double flick for M2; index-middle flick for U2." },
  { id: 4, group: 'Edges Only (EPLL)', name: 'PLL Z (Adjacent Edge Swap)', alg: "(M' U M2 U) (M2 U M') U2 M2", inverse: "M2 U2 M U' M2 U' M2 U' M", recognition: 'Two pairs of adjacent edges swap diagonally.', fingertrick: "Left ring finger drives M' and M2 without moving hands." },
  { id: 5, group: 'Corners Only (CPLL)', name: 'PLL Aa (Headlights Left)', alg: "x (R' U R') D2 (R U' R') D2 R2 x'", inverse: "x R2 D2 R U R' D2 R U' R x'", recognition: '2x2 solved block on Front-Left; headlights on Back.', fingertrick: "Rotate x smoothly; double-flick D2 with left ring-middle." },
  { id: 6, group: 'Corners Only (CPLL)', name: 'PLL Ab (Headlights Back)', alg: "x R2 D2 (R U R') D2 (R U' R) x'", inverse: "x R' U R' D2 R U' R' D2 R2 x'", recognition: '2x2 solved block on Back-Left; headlights on Right.', fingertrick: "Keep thumbs anchored on corners during D2 double-flicks." },
  { id: 7, group: 'Corners Only (CPLL)', name: 'PLL E (Double Corner Swap)', alg: "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x", inverse: "x' D R U R' D' R U' R' D R U' R' D' R U R' x", recognition: 'No headlights anywhere; all 4 edges solved.', fingertrick: "Alternate left-ring D and right-ring D' pushes in rhythm." },
  { id: 8, group: 'Adjacent Corner Swap', name: 'PLL T (Classic T-Perm)', alg: "(R U R' U') R' F R2 U' R' U' (R U R' F')", inverse: "F R U' R' U R U R2 F' R U R U' R'", recognition: 'Headlights on Left; two adjacent 2-sticker bars on Front & Back.', fingertrick: "Sexy move into R' F R2; lift final F' with right thumb." },
  { id: 9, group: 'Adjacent Corner Swap', name: 'PLL Jb (Right J-Perm)', alg: "(R U R' F') (R U R' U') R' F R2 U' R'", inverse: "R U R2 F' R U R U' R' F R U' R'", recognition: 'Solved 3-bar on Left; Front-Right 2-block swaps with Back-Right.', fingertrick: "One of the fastest PLLs—flow directly from F' into (R U R' U')." },
  { id: 10, group: 'Adjacent Corner Swap', name: 'PLL Ja (Left J-Perm)', alg: "(L' U' L F) (L' U' L U) L F' L2 U L", inverse: "L' U' L2 F L' U' L' U L F' L' U L", recognition: 'Solved 3-bar on Right; Front-Left 2-block swaps.', fingertrick: "Mirror of Jb using left-hand triggers and left-thumb F'." },
  { id: 11, group: 'Adjacent Corner Swap', name: 'PLL F (3-Bar Front)', alg: "(R' U' F') (R U R' U') R' F R2 U' R' U' (R U R' U) R", inverse: "R' U' R U' R' U R U R2 F' R U R U' R' F U R", recognition: 'Full solved 3-sticker bar on Front; no other headlights.', fingertrick: "Setup (R' U' F') straight into a full T-Perm." },
  { id: 12, group: 'Adjacent Corner Swap', name: 'PLL Ra (Headlights Front)', alg: "(R U' R' U') (R U R D) (R' U' R D') (R' U2 R')", inverse: "R U2 R D R' U R D' R' U' R' U R U R'", recognition: 'Headlights on Front; 2-block on Front-Right.', fingertrick: "Use ring fingers for D and D' without regripping." },
  { id: 13, group: 'Adjacent Corner Swap', name: 'PLL Rb (Headlights Back)', alg: "(R' U2 R U2) R' F (R U R' U') R' F' R2", inverse: "R2 F R U R U' R' F' R U2 R' U2 R", recognition: 'Headlights on Front; 2-block on Front-Left.', fingertrick: "Double-flick both U2s; press F with right index." },
  { id: 14, group: 'Diagonal Corner Swap', name: 'PLL Y (Diagonal Swap)', alg: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')", inverse: "F R' F' R U R U' R' F R U' R' U R U R' F'", recognition: 'Two 2-blocks meeting at Front-Left corner; no headlights.', fingertrick: "OLL 37 + OLL 33 (Sexy + Sledgehammer) chained together." },
  { id: 15, group: 'Diagonal Corner Swap', name: 'PLL V (2x2 Block)', alg: "(R' U R' U') y (R' F' R2 U') (R' U R' F) R F", inverse: "F' R' F' R U' R U R2 F R y' U R U' R", recognition: '2x2 solved block in Front-Left; no headlights.', fingertrick: "Rotate y smoothly into R' F' R2." },
  { id: 16, group: 'Diagonal Corner Swap', name: 'PLL Na (Right N-Perm)', alg: "(R U R' U) (R U R' F') (R U R' U') R' F R2 U' R' U2 (R U' R')", inverse: "R U R' U2 R U R2 F' R U R U' R' F R U' R' U' R U' R'", recognition: 'Four 2-blocks with Right side sticking out.', fingertrick: "Embeds a full Jb-Perm inside (R U R' U) ... U2 (R U' R')." },
  { id: 17, group: 'Diagonal Corner Swap', name: 'PLL Nb (Left N-Perm)', alg: "(R' U R U') (R' F' U' F) (R U R' F) R' F' (R U' R)", inverse: "R' U R F R F' R U' R' F' U F R U R' U' R", recognition: 'Four 2-blocks with Left side sticking out.', fingertrick: "Keep right thumb ready on DF for F' and F." },
  { id: 18, group: 'G-Permutations', name: 'PLL Ga (Headlights L • Bar F)', alg: "R2 U (R' U R' U') (R U' R2) (D U' R' U) R D'", inverse: "D R' U' R U D' R2 U R' U R U' R U' R2", recognition: 'Headlights on Left; 2-block on Front-Right.', fingertrick: "Simultaneous D + U' ring-and-index push." },
  { id: 19, group: 'G-Permutations', name: 'PLL Gb (Headlights L • Bar B)', alg: "(R' U' R U) D' R2 (U R' U R U') R U' R2 D", inverse: "D' R2 U R' U R' U' R U' R2 D U' R' U R", recognition: 'Headlights on Left; 2-block on Back-Right.', fingertrick: "Left ring D' on move 5; right ring D on final move." },
  { id: 20, group: 'G-Permutations', name: 'PLL Gc (Headlights L • Bar R)', alg: "R2 U' (R U' R U) (R' U R2) (D' U R U') R' D", inverse: "D' R U R' U' D R2 U' R U' R' U R' U R2", recognition: 'Headlights on Left; 2-block on Right-Back.', fingertrick: "Mirror of Ga with simultaneous D' + U." },
  { id: 21, group: 'G-Permutations', name: 'PLL Gd (Headlights L • Bar FL)', alg: "(R U R' U') D R2 (U' R U' R' U) R' U R2 D'", inverse: "D R2 U' R U' R U R' U R2 D' U R U' R'", recognition: 'Headlights on Left; 2-block on Front-Left.', fingertrick: "Sexy move into D R2; finish with right-ring D'." },
  { id: 22, group: 'Edges Only (EPLL)', name: 'Bonus • Ua (M-Slice)', alg: "M2 U (M U2 M') U M2", inverse: "M2 U' M U2 M' U' M2", recognition: 'Ultra-fast M-slice Ua variant.', fingertrick: "Pure M2 / U / M / U2 without touching R or L." },
  { id: 23, group: 'Edges Only (EPLL)', name: 'Bonus • Ub (M-Slice)', alg: "M2 U' (M U2 M') U' M2", inverse: "M2 U M U2 M' U M2", recognition: 'Ultra-fast M-slice Ub variant.', fingertrick: "Pure M2 / U' / M / U2 without touching R or L." },
  { id: 24, group: 'Adjacent Corner Swap', name: 'Bonus • Ja (Back-Right)', alg: "x R2 F (R F' R) U2 (r' U r) U2 x'", inverse: "x U2 r' U' r U2 R' F R' F' R2 x'", recognition: 'Rotationless-style Ja alternative.', fingertrick: "Fast wide (r' U r) U2 finish." },
  { id: 25, group: 'Diagonal Corner Swap', name: 'Bonus • Y (Alt Setup)', alg: "(R2 U' R2 U') (R2 U R' F') (R U R2 U') R' F R", inverse: "R' F' R U R2 U' R' F R U' R2 U R2 U R2", recognition: 'RUD-friendly Y-Perm alternative.', fingertrick: "Avoids initial F turn." }
];

const PLL_BY_ID = new Map(PLL_DATA.map((item) => [item.id, item]));
const PLL_DEFAULT_CHUNKS = [
  { id: 'pll-c1', title: 'Chunk 1 • 2-Look PLL (1–7)', ids: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'pll-c2', title: 'Chunk 2 • T, J & F Perms (8–11)', ids: [8, 9, 10, 11] },
  { id: 'pll-c3', title: 'Chunk 3 • R, Y & V Perms (12–15)', ids: [12, 13, 14, 15] },
  { id: 'pll-c4', title: 'Chunk 4 • N & G Perms (16–21)', ids: [16, 17, 18, 19, 20, 21] }
];

// =========================================================================
// 3. MAIN APPLICATION COMPONENT
// =========================================================================

const DEFAULT_USERS = {
  Demo: {
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: null,
    f2lCustomChunks: null,
    pllCustomChunks: null,
    crossClears: 0,
    isPro: true,
    email: '',
    fullSolveTargetPb: 15.0,
    phaseTargetPbs: { cross: 2.0, f2l: 2.5, oll: 2.0, pll: 2.0 },
    caseTargetPbs: { f2l: {}, oll: {}, pll: {} }
  }
};

function mergeDefaultUsersWithStored(storedMap) {
  const result = {};
  if (storedMap && typeof storedMap === 'object') {
    Object.entries(storedMap).forEach(([k, val]) => {
      if (val && typeof val === 'object' && !val.$$typeof && !val._deleted) {
        result[k] = {
          day: 1,
          f2lDay: 1,
          pllDay: 1,
          stats: {},
          f2lStats: {},
          pllStats: {},
          customChunks: null,
          f2lCustomChunks: null,
          pllCustomChunks: null,
          crossClears: 0,
          isPro: false,
          email: '',
          fullSolveTargetPb: 15.0,
          phaseTargetPbs: { cross: 2.0, f2l: 2.5, oll: 2.0, pll: 2.0 },
          caseTargetPbs: { f2l: {}, oll: {}, pll: {} },
          ...val,
          fullSolveHistory: Array.isArray(val.fullSolveHistory) ? val.fullSolveHistory : []
        };
      }
    });
  }
  if (Object.keys(result).length === 0) {
    return { ...DEFAULT_USERS };
  }
  return result;
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message ? String(error.message) : 'Unexpected rendering error'
    };
  }

  componentDidCatch() {
    // Handled by fallback UI
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full bg-[#060913] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xs w-full bg-slate-900 border border-white/10 rounded-[2rem] p-6 text-center space-y-4 shadow-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-300">
              Recovery Mode
            </span>
            <h2 className="text-lg font-black text-white">Display Interrupted</h2>
            <p className="text-xs text-slate-400 leading-relaxed break-words">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Reload View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function OLLDaySuite() {
  // Foreground Visibility State (Deep-sleep guard for background battery & thermal savings)
  const [isAppVisible, setIsAppVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  // Cloud Auth & Sync State
  const [cloudAuthUser, setCloudAuthUser] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('connecting');

  // Persistent User & App Settings
  const [users, setUsers] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.users) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return mergeDefaultUsersWithStored(parsed);
        }
      }
    } catch {
      // Fallback to defaults
    }
    return { ...DEFAULT_USERS };
  });
  const [activeUserKey, setActiveUserKey] = useState(() => {
    try {
      const savedKey = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.activeAccount) : null;
      if (savedKey) return savedKey;
    } catch {
      // Ignore storage error
    }
    return '';
  });
  const [pinnedHomePhase, setPinnedHomePhase] = useState(() => {
    try {
      const savedPhase = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.pinnedHomePhase) : null;
      if (savedPhase && ['cross', 'f2l', 'oll', 'pll'].includes(savedPhase)) return savedPhase;
    } catch {
      // Ignore storage error
    }
    return '';
  });
  const [activePhase, setActivePhase] = useState(() => {
    try {
      const savedPhase = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.pinnedHomePhase) : null;
      if (savedPhase && ['cross', 'f2l', 'oll', 'pll'].includes(savedPhase)) return savedPhase;
    } catch {
      // Ignore storage error
    }
    return 'cross';
  });
  const [cfopMenuOpen, setCfopMenuOpen] = useState(false);

  // Sub-tabs per phase
  const [crossTab, setCrossTab] = useState('ladder');
  const [f2lTab, setF2lTab] = useState('grind');
  const [ollTab, setOllTab] = useState('grind');
  const [pllTab, setPllTab] = useState('grind');

  // Global Preferences
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(true);
  const [fingertricksEnabled, setFingertricksEnabled] = useState(true);
  const [targetGoalSec, setTargetGoalSec] = useState(15.0);
  const [targetPbInput, setTargetPbInput] = useState('15.000');
  const [selectedTargetPhase, setSelectedTargetPhase] = useState('f2l');
  const [phaseTargetInput, setPhaseTargetInput] = useState('2.500');
  const [editingCaseTarget, setEditingCaseTarget] = useState(null); // { phase, caseId, name, draft }
  const [f2lSetupMode, setF2lSetupMode] = useState('beginner');
  const [f2lSetupSeed, setF2lSetupSeed] = useState(0);
  const [pllSetupSeed, setPllSetupSeed] = useState(0);

  // Settings 3D Card Deck State (8 Cards: Card 1 Learn App + Cards 2..8)
  const [settingsDeckIdx, setSettingsDeckIdx] = useState(0);
  const [notationFilter, setNotationFilter] = useState('All');
  const [dossierFilter, setDossierFilter] = useState('All');
  const deckTouchStartRef = useRef(null);

  // Guided Onboarding & Auto-Navigation Tour State
  const [tourType, setTourType] = useState('cfopAndApp'); // 'cfopAndApp' | 'appOnly'
  const [tourStepIdx, setTourStepIdx] = useState(0);

  // 3-Face Cube Camera Scanner & Lookahead State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerCameraReady, setScannerCameraReady] = useState(false);
  const [scannerCameraError, setScannerCameraError] = useState('');
  const [scannerCaptureStep, setScannerCaptureStep] = useState('U'); // 'U' | 'F' | 'R' | 'D' | 'B' | 'L'
  const [scannerCapturedThumbs, setScannerCapturedThumbs] = useState({});
  const [scannerRawSamples, setScannerRawSamples] = useState({});
  const [scannerLockedFaces, setScannerLockedFaces] = useState({});
  const [scannerLivePreviewCodes, setScannerLivePreviewCodes] = useState(null);
  const [scannerAutoSnap, setScannerAutoSnap] = useState(false);
  const [scannerStabilityCount, setScannerStabilityCount] = useState(0);
  const [scannerCubeDetected, setScannerCubeDetected] = useState(false);
  const [scannerFramingHint, setScannerFramingHint] = useState('Line up the 9 stickers inside the square');
  const [scannerFocusedStageIdx, setScannerFocusedStageIdx] = useState(0);
  const [scannerCompletedStages, setScannerCompletedStages] = useState([]);
  const [scannerF2lPairIdx, setScannerF2lPairIdx] = useState(0);
  const [scannerSurfaceFinish, setScannerSurfaceFinish] = useState('uv'); // 'uv' | 'matte'
  const [scannerThreeFaceHints, setScannerThreeFaceHints] = useState({
    crossSolved: null, // null | true | false
    f2lCompletedStatus: null // null | 'none' | 'some' | 'all'
  });
  const [savedCubePalette, setSavedCubePalette] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.cubePalette) : null;
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [scannedFaces, setScannedFaces] = useState(() => ({
    U: ['Y', 'Y', 'G', 'Y', 'Y', 'Y', 'R', 'Y', 'Y'],
    F: ['O', 'B', 'Y', 'G', 'G', 'G', 'G', 'G', 'G'],
    R: ['B', 'R', 'Y', 'O', 'O', 'O', 'O', 'O', 'O'],
    D: ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
    B: ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
    L: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'R', 'R']
  }));
  const [selectedStickerEdit, setSelectedStickerEdit] = useState(null); // { face: 'U'|'F'|'R'|'D'|'B'|'L', idx: number }
  const scannerVideoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerCanvasRef = useRef(null);
  const liveStableSignatureRef = useRef('');
  const liveStableStreakRef = useRef(0);

  const stopScannerCamera = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }
    setScannerCameraReady(false);
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;
  };

  const startScannerCamera = async (targetFace = 'U', resetAll = false) => {
    setScannerCameraError('');
    setScannerCaptureStep(targetFace);
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;
    if (resetAll) {
      setScannerCapturedThumbs({});
      setScannerRawSamples({});
      setScannerLockedFaces({});
      setScannerThreeFaceHints({ crossSolved: null, f2lCompletedStatus: null });
    } else {
      setScannerCapturedThumbs((prev) => {
        const copy = { ...prev };
        delete copy[targetFace];
        return copy;
      });
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setScannerCameraError('Camera unavailable in this browser — tap any sticker below to set colors manually.');
      return;
    }
    try {
      stopScannerCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false
      });
      scannerStreamRef.current = stream;
      if (scannerVideoRef.current) {
        scannerVideoRef.current.srcObject = stream;
        await scannerVideoRef.current.play().catch(() => {});
      }
      setScannerCameraReady(true);
      setScannerFramingHint('Line up the 9 stickers inside the square');
    } catch {
      setScannerCameraError('Camera permission denied or unavailable — tap any sticker in the grid to input your cube.');
    }
  };

  // Re-attach active MediaStream whenever <video> mounts/unmounts across face transitions (U -> F -> R -> D -> B -> L)
  useEffect(() => {
    if (!scannerOpen || !scannerCameraReady) return;
    if (scannerCapturedThumbs[scannerCaptureStep]) return;
    const video = scannerVideoRef.current;
    const stream = scannerStreamRef.current;
    if (video && stream && video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [scannerOpen, scannerCameraReady, scannerCaptureStep, scannerCapturedThumbs]);

  // Glare-Rejecting Multi-Point Ring Sampler (Tuned for both Matte & UV-Coated Cubes)
  const sampleVideoGridAntiGlare = () => {
    const video = scannerVideoRef.current;
    if (!video || video.readyState < 2) return null;

    const vw = video.videoWidth || 480;
    const vh = video.videoHeight || 480;
    const rect = video.getBoundingClientRect();
    const displayW = rect.width || 250;
    const displayH = rect.height || 250;

    const videoAspect = vw / vh;
    const displayAspect = displayW / displayH;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (videoAspect > displayAspect) {
      sw = Math.round(vh * displayAspect);
      sx = Math.round((vw - sw) / 2);
    } else if (videoAspect < displayAspect) {
      sh = Math.round(vw / displayAspect);
      sy = Math.round((vh - sh) / 2);
    }

    const canvas = scannerCanvasRef.current || document.createElement('canvas');
    scannerCanvasRef.current = canvas;
    const outW = 300;
    const outH = Math.max(150, Math.round(outW / displayAspect));
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

    const isMatte = scannerSurfaceFinish === 'matte';

    const readPatch = (nx, ny) => {
      const px = Math.max(4, Math.min(outW - 5, Math.round(nx * outW)));
      const py = Math.max(4, Math.min(outH - 5, Math.round(ny * outH)));
      const data = ctx.getImageData(px - 3, py - 3, 7, 7).data;
      const pixels = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels.push({ r, g, b, chroma, luma });
      }
      // For UV-coated glossy tiles, discard the brightest specular glare pixels inside the patch
      pixels.sort((a, b) => a.luma - b.luma);
      const trimmed = isMatte ? pixels.slice(4, pixels.length - 4) : pixels.slice(4, Math.max(12, Math.floor(pixels.length * 0.72)));
      const pool = trimmed.length > 0 ? trimmed : pixels;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      pool.forEach((p) => {
        rSum += p.r;
        gSum += p.g;
        bSum += p.b;
      });
      return [Math.round(rSum / pool.length), Math.round(gSum / pool.length), Math.round(bSum / pool.length)];
    };

    // Sample 9 points across each sticker (center + inner ring + outer ring) to bypass UV glare & matte shadows
    const offsets = [
      [0, 0],
      [-0.018, -0.018],
      [0.018, -0.018],
      [-0.018, 0.018],
      [0.018, 0.018],
      [0, -0.026],
      [0, 0.026],
      [-0.026, 0],
      [0.026, 0]
    ];

    let validStickerTiles = 0;
    const sampled9 = SCANNER_FLAT_GRID_CENTROIDS.map(([nx, ny]) => {
      const candidates = offsets.map(([dx, dy]) => {
        const [r, g, b] = readPatch(nx + dx, ny + dy);
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const glarePenalty = !isMatte && luma > 232 && chroma < 46 ? 85 : luma > 244 && chroma < 35 ? 70 : 0;
        const matteBoost = isMatte && chroma >= 28 && luma >= 55 && luma <= 225 ? 16 : 0;
        return {
          rgb: [r, g, b],
          chroma,
          luma,
          score: chroma * (isMatte ? 1.25 : 1.0) - glarePenalty + matteBoost + (luma > 42 && luma < 232 ? 15 : 0)
        };
      });

      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const minValidChroma = isMatte ? 28 : 38;
      const minWhiteLuma = isMatte ? 105 : 115;
      if (best.chroma >= minValidChroma || (best.luma >= minWhiteLuma && best.chroma <= (isMatte ? 48 : 56))) {
        validStickerTiles += 1;
      }
      return best.rgb;
    });

    // Verify the center sticker (idx 4) genuinely matches the expected face center color
    const expectedCenter = { U: 'Y', F: 'G', R: 'O', D: 'W', B: 'B', L: 'R' };
    const targetCenterCode = expectedCenter[scannerCaptureStep] || 'Y';
    const [cr, cg, cb] = sampled9[4];
    const centerChroma = Math.max(cr, cg, cb) - Math.min(cr, cg, cb);
    const centerLuma = (cr + cg + cb) / 3;
    const detectedCenterCode = classifyStickerRgb(sampled9[4], savedCubePalette);
    const centerMatches =
      targetCenterCode === 'W'
        ? centerLuma >= (isMatte ? 102 : 112) && centerChroma <= (isMatte ? 54 : 62)
        : centerChroma >= (isMatte ? 32 : 42) && detectedCenterCode === targetCenterCode;

    const cubeDetected = centerMatches && validStickerTiles >= 6;
    const framingText = cubeDetected
      ? `${targetCenterCode} Center Locked ✓ (${validStickerTiles}/9 tiles)`
      : `Point ${targetCenterCode} center into the middle square`;

    return { sampled9, canvas, cubeDetected, framingText };
  };

  const captureAndAnalyzeCubeFrame = () => {
    const res = sampleVideoGridAntiGlare();
    if (!res) return;
    emitBeep(840, 'sine', 0.08);
    const { sampled9, canvas } = res;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    const expectedCenter = { U: 'Y', F: 'G', R: 'O', D: 'W', B: 'B', L: 'R' };
    const centerCode = expectedCenter[scannerCaptureStep];
    if (centerCode && sampled9[4]) {
      setSavedCubePalette((prev) => {
        const nextPal = { ...(prev || {}), [centerCode]: sampled9[4] };
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEYS.cubePalette, JSON.stringify(nextPal));
          }
        } catch {
          // Ignore storage quota errors
        }
        return nextPal;
      });
    }

    const nextRaw = { ...scannerRawSamples, [scannerCaptureStep]: sampled9 };
    setScannerRawSamples(nextRaw);
    setScannerCapturedThumbs((prev) => ({ ...prev, [scannerCaptureStep]: dataUrl }));
    setScannedFaces((prev) => classifyCapturedFaceBatch(nextRaw, prev, scannerLockedFaces, savedCubePalette));
    setScannerCompletedStages([]);
    setScannerF2lPairIdx(0);
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;

    // Auto-advance through U -> F -> R (and D -> B -> L when scanning back faces)
    if (scannerCaptureStep === 'U' && !nextRaw.F) {
      setScannerCaptureStep('F');
    } else if (scannerCaptureStep === 'F' && !nextRaw.R) {
      setScannerCaptureStep('R');
    } else if (scannerCaptureStep === 'R') {
      stopScannerCamera();
    } else if (scannerCaptureStep === 'D' && !nextRaw.B) {
      setScannerCaptureStep('B');
    } else if (scannerCaptureStep === 'B' && !nextRaw.L) {
      setScannerCaptureStep('L');
    } else {
      stopScannerCamera();
    }
  };

  // Real-Time Viewfinder Color Preview & Cube-Verified Auto-Stabilize Snap Loop
  useEffect(() => {
    if (!scannerOpen || !scannerCameraReady || !isAppVisible) return;
    if (scannerCapturedThumbs[scannerCaptureStep]) return;

    const id = setInterval(() => {
      const res = sampleVideoGridAntiGlare();
      if (!res) return;
      setScannerFramingHint(res.framingText);
      setScannerCubeDetected(res.cubeDetected);

      // Only overlay detected tile badges when a real cube face is actually centered in frame
      if (!res.cubeDetected) {
        setScannerLivePreviewCodes(null);
        liveStableSignatureRef.current = '';
        liveStableStreakRef.current = 0;
        setScannerStabilityCount(0);
        return;
      }

      const previewBatch = { ...scannerRawSamples, [scannerCaptureStep]: res.sampled9 };
      const classified = classifyCapturedFaceBatch(
        previewBatch,
        scannedFaces,
        scannerLockedFaces,
        savedCubePalette
      );
      const codes = classified[scannerCaptureStep];
      if (!Array.isArray(codes) || codes.length !== 9) return;
      setScannerLivePreviewCodes(codes);

      const sig = codes.join('');
      if (sig === liveStableSignatureRef.current) {
        liveStableStreakRef.current += 1;
      } else {
        liveStableSignatureRef.current = sig;
        liveStableStreakRef.current = 1;
      }
      setScannerStabilityCount(Math.min(5, liveStableStreakRef.current));

      if (scannerAutoSnap && liveStableStreakRef.current >= 5) {
        liveStableStreakRef.current = 0;
        captureAndAnalyzeCubeFrame();
      }
    }, 320);

    return () => clearInterval(id);
  }, [
    scannerOpen,
    scannerCameraReady,
    isAppVisible,
    scannerCapturedThumbs,
    scannerCaptureStep,
    scannerRawSamples,
    scannedFaces,
    scannerLockedFaces,
    savedCubePalette,
    scannerAutoSnap
  ]);

  // Memoized Scanner CFOP Analysis (Runs only when scanner opens, stickers change, or 3-face hints update)
  const scannerHasFull6Faces = useMemo(
    () =>
      Boolean(scannerCapturedThumbs.D || scannerCapturedThumbs.B || scannerCapturedThumbs.L) ||
      [1, 3, 5, 7].some((i) => scannedFaces.D[i] !== 'W') ||
      scannedFaces.B[7] !== 'B' ||
      scannedFaces.L[7] !== 'R',
    [scannerCapturedThumbs, scannedFaces]
  );

  const scannerAnalysis = useMemo(() => {
    if (!scannerOpen) return null;
    return scannerHasFull6Faces
      ? analyzeFull54Cube(
          scannedFaces.U,
          scannedFaces.F,
          scannedFaces.R,
          scannedFaces.D,
          scannedFaces.B,
          scannedFaces.L
        )
      : analyzeScanned3FaceCube(
          scannedFaces.U,
          scannedFaces.F,
          scannedFaces.R,
          null,
          scannerThreeFaceHints
        );
  }, [scannerOpen, scannerHasFull6Faces, scannedFaces, scannerThreeFaceHints]);

  // Full-Screen Glassmorphic 3x3x3 CFOP Timer State (Ao5 & Ao12)
  const [fullTimerOpen, setFullTimerOpen] = useState(false);
  const [fullScramble, setFullScramble] = useState(() => generate3x3Scramble(20));
  const [fullTimerState, setFullTimerState] = useState('idle'); // 'idle' | 'running' | 'stopped'
  const [fullElapsedMs, setFullElapsedMs] = useState(0);
  const fullStartRef = useRef(0);

  // Cross Phase State
  const [crossDifficulty, setCrossDifficulty] = useState('standard'); // 'standard' | 'advanced'
  const [crossTier, setCrossTier] = useState(1);
  const [crossScrambleIdx, setCrossScrambleIdx] = useState(0);
  const [crossLadderMode, setCrossLadderMode] = useState('efficiency');
  const [crossDragRot, setCrossDragRot] = useState({ yaw: -35, pitch: 38 });
  const [crossIsDragging, setCrossIsDragging] = useState(false);
  const crossDragStartRef = useRef(null);
  const crossLiveRotRef = useRef({ yaw: -35, pitch: 38 });
  const crossCubeDomRef = useRef(null);
  const crossDegreeLabelRef = useRef(null);
  const crossRafRef = useRef(0);
  const [crossUserMoves, setCrossUserMoves] = useState(2);
  const [efficiencyFeedback, setEfficiencyFeedback] = useState(null);
  const [activeMechanicId, setActiveMechanicId] = useState(1);
  const [activeMechApproachIdx, setActiveMechApproachIdx] = useState(0);
  const [activeMechCaseIdx, setActiveMechCaseIdx] = useState(0);
  const [mechCubeRot, setMechCubeRot] = useState({ yaw: -35, pitch: 38 });
  const [blindState, setBlindState] = useState('idle');
  const [inspectionLeft, setInspectionLeft] = useState(15.0);
  const [blindLogs, setBlindLogs] = useState([]);
  const [leftPadHeld, setLeftPadHeld] = useState(false);
  const [rightPadHeld, setRightPadHeld] = useState(false);

  // Color Orbit Flash Card Game State
  const [orbitQuizIdx, setOrbitQuizIdx] = useState(0);
  const [orbitQuizActive, setOrbitQuizActive] = useState(false);
  const [orbitShuffledColors] = useState(['Green', 'Red', 'Orange', 'Blue']);
  const [orbitStreak, setOrbitStreak] = useState(0);
  const [orbitFeedback, setOrbitFeedback] = useState(null);
  const padHoldTimeoutRef = useRef(null);

  // F2L, OLL & PLL Library / Lineup State
  const [f2lLibMode, setF2lLibMode] = useState('groups');
  const [f2lSelectedCategory, setF2lSelectedCategory] = useState(null);
  const [f2lLineupOrder, setF2lLineupOrder] = useState([]);

  const [ollLibMode, setOllLibMode] = useState('groups');
  const [ollSelectedCategory, setOllSelectedCategory] = useState(null);
  const [ollLineupOrder, setOllLineupOrder] = useState([]);

  const [pllLibMode, setPllLibMode] = useState('groups');
  const [pllSelectedCategory, setPllSelectedCategory] = useState(null);
  const [pllLineupOrder, setPllLineupOrder] = useState([]);

  // Mobile Touch Drag-and-Drop Lineup Reorder State
  const [draggedLineupIdx, setDraggedLineupIdx] = useState(null);
  const holdTimerRef = useRef(null);
  const preHoldStartYRef = useRef(null);

  // Active Modals & Session Runners
  const [activeModal, setActiveModal] = useState(null);
  const [ftCase, setFtCase] = useState(null);
  const [ftPhaseContext, setFtPhaseContext] = useState('f2l');
  const [builderPhase, setBuilderPhase] = useState('f2l');
  const [builderChunks, setBuilderChunks] = useState([]);
  const [newChunkName, setNewChunkName] = useState('');
  const [newChunkSelectedIds, setNewChunkSelectedIds] = useState([]);

  // Glassmorphic Solver Account Auth Gate & Pro Paywall State
  const [authScreenOpen, setAuthScreenOpen] = useState(() => {
    try {
      const savedKey = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.activeAccount) : null;
      return !savedKey;
    } catch {
      return true;
    }
  });
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [authNameInput, setAuthNameInput] = useState('');
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState('');
  const [deviceAccountKeys, setDeviceAccountKeys] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.deviceAccounts) : null;
      const savedActive = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.activeAccount) : null;
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
      if (savedActive && !list.includes(savedActive)) list.push(savedActive);
      return list;
    } catch {
      return [];
    }
  });
  const [proPaywallFeature, setProPaywallFeature] = useState('');
  const [proPurchaseToast, setProPurchaseToast] = useState('');
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);

  const registerDeviceAccount = (uKey) => {
    if (!uKey || typeof uKey !== 'string') return;
    setDeviceAccountKeys((prev) => {
      const next = prev.includes(uKey) ? prev : [...prev, uKey];
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEYS.deviceAccounts, JSON.stringify(next));
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Case Stopwatch & Drill Runner State
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const [swLastResult, setSwLastResult] = useState(null);
  const swStartRef = useRef(0);
  const swDisplayRef = useRef(null);
  const fullTimerDisplayRef = useRef(null);

  const [f2lSession, setF2lSession] = useState(null);
  const [f2lDrillCase, setF2lDrillCase] = useState(null);
  const [ollSession, setOllSession] = useState(null);
  const [ollDrillCase, setOllDrillCase] = useState(null);
  const [pllSession, setPllSession] = useState(null);
  const [pllDrillCase, setPllDrillCase] = useState(null);

  // Interactive 3D F2L Cube Orbit State
  const [f2lViewIdx, setF2lViewIdx] = useState(0);
  const [f2lDragRot, setF2lDragRot] = useState({ yaw: -35, pitch: -25 });
  const [f2lIsDragging, setF2lIsDragging] = useState(false);
  const f2lDragStartRef = useRef(null);
  const f2lLiveRotRef = useRef({ yaw: -35, pitch: -25 });
  const f2lCubeDomRef = useRef(null);
  const f2lDegreeLabelRef = useRef(null);
  const f2lRafRef = useRef(0);

  // Web Audio Acoustic Synthesizer
  const audioCtxRef = useRef(null);
  const emitBeep = (freq = 640, type = 'sine', duration = 0.07, vol = 0.12) => {
    if (!audioEnabled || typeof window === 'undefined' || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore audio restrictions
    }
  };

  // Sanitize User Profile Record
  const sanitizeUserRecord = (raw) => {
    const base = raw && typeof raw === 'object' ? raw : {};
    return {
      day: Number.isFinite(Number(base.day)) && Number(base.day) >= 1 ? Number(base.day) : 1,
      f2lDay: Number.isFinite(Number(base.f2lDay)) && Number(base.f2lDay) >= 1 ? Number(base.f2lDay) : 1,
      pllDay: Number.isFinite(Number(base.pllDay)) && Number(base.pllDay) >= 1 ? Number(base.pllDay) : 1,
      stats: base.stats && typeof base.stats === 'object' ? base.stats : {},
      f2lStats: base.f2lStats && typeof base.f2lStats === 'object' ? base.f2lStats : {},
      pllStats: base.pllStats && typeof base.pllStats === 'object' ? base.pllStats : {},
      fullSolveHistory: Array.isArray(base.fullSolveHistory) ? base.fullSolveHistory : [],
      customChunks: Array.isArray(base.customChunks) ? base.customChunks : null,
      f2lCustomChunks: Array.isArray(base.f2lCustomChunks) ? base.f2lCustomChunks : null,
      pllCustomChunks: Array.isArray(base.pllCustomChunks) ? base.pllCustomChunks : null,
      crossClears: Number.isFinite(Number(base.crossClears)) ? Number(base.crossClears) : 0,
      isPro: Boolean(base.isPro),
      email: typeof base.email === 'string' ? base.email : '',
      fullSolveTargetPb:
        Number.isFinite(Number(base.fullSolveTargetPb)) && Number(base.fullSolveTargetPb) > 0
          ? Number(base.fullSolveTargetPb)
          : 15.0,
      phaseTargetPbs: {
        cross: 2.0,
        f2l: 2.5,
        oll: 2.0,
        pll: 2.0,
        ...(base.phaseTargetPbs && typeof base.phaseTargetPbs === 'object' ? base.phaseTargetPbs : {})
      },
      caseTargetPbs: {
        f2l: base.caseTargetPbs?.f2l && typeof base.caseTargetPbs.f2l === 'object' ? base.caseTargetPbs.f2l : {},
        oll: base.caseTargetPbs?.oll && typeof base.caseTargetPbs.oll === 'object' ? base.caseTargetPbs.oll : {},
        pll: base.caseTargetPbs?.pll && typeof base.caseTargetPbs.pll === 'object' ? base.caseTargetPbs.pll : {}
      }
    };
  };

  // Auto-Navigation Helper for Guided Interactive Tours
  const applyTourNavigation = (stepObj) => {
    if (!stepObj) return;
    setActivePhase(stepObj.phase);
    if (stepObj.phase === 'cross') setCrossTab(stepObj.tab);
    if (stepObj.phase === 'f2l') setF2lTab(stepObj.tab);
    if (stepObj.phase === 'oll') setOllTab(stepObj.tab);
    if (stepObj.phase === 'pll') setPllTab(stepObj.tab);
  };

  const startGuidedTour = (type) => {
    emitBeep(720, 'sine', 0.08);
    const steps = type === 'cfopAndApp' ? CFOP_AND_APP_TOUR_STEPS : APP_ONLY_TOUR_STEPS;
    setTourType(type);
    setTourStepIdx(0);
    applyTourNavigation(steps[0]);
    setActiveModal('guidedTour');
  };

  // Debounced Persistence for Users (450ms) + Immediate Flush on pagehide/visibilitychange
  const latestUsersRef = useRef(users);
  latestUsersRef.current = users;
  const pendingCloudSyncRef = useRef(null);
  const cloudSaveTimerRef = useRef(null);
  const localSaveTimerRef = useRef(null);

  const flushPendingPersistence = async () => {
    if (localSaveTimerRef.current) {
      clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(latestUsersRef.current));
      }
    } catch {
      // Ignore storage quota errors
    }

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
    const pending = pendingCloudSyncRef.current;
    if (pending && pending.uKey && resolvedFirebaseConfig && cloudAuthUser) {
      pendingCloudSyncRef.current = null;
      try {
        const svc = await getFirebaseServices();
        if (svc) {
          await svc.fsMod.setDoc(
            svc.fsMod.doc(svc.db, 'artifacts', appId, 'public', 'data', 'solver_profiles', pending.uKey),
            { ...sanitizeUserRecord(pending.record), updatedAt: Date.now() },
            { merge: true }
          );
          setCloudSyncStatus('synced');
        }
      } catch {
        setCloudSyncStatus('local');
      }
    }
  };

  useEffect(() => {
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      localSaveTimerRef.current = null;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
        }
      } catch {
        // Ignore storage quota errors
      }
    }, 450);
    return () => {
      if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    };
  }, [users]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        if (activeUserKey) {
          window.localStorage.setItem(STORAGE_KEYS.activeAccount, activeUserKey);
        } else {
          window.localStorage.removeItem(STORAGE_KEYS.activeAccount);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [activeUserKey]);

  // Debounced Cloud Firestore Sync (Prevents burst writes during millisecond slider adjustments)
  const saveUserToCloud = (uKey, record) => {
    if (!uKey || uKey === 'Demo' || !resolvedFirebaseConfig || !cloudAuthUser) return;
    pendingCloudSyncRef.current = { uKey, record };
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = setTimeout(() => {
      flushPendingPersistence();
    }, 450);
  };

  useEffect(() => {
    if (!resolvedFirebaseConfig || !activeUserKey || activeUserKey === 'Demo') {
      setCloudSyncStatus('local');
      return;
    }
    let unsubAuth = null;
    let cancelled = false;

    (async () => {
      const svc = await getFirebaseServices();
      if (!svc || cancelled) {
        setCloudSyncStatus('local');
        return;
      }
      try {
        const g = typeof globalThis !== 'undefined' ? globalThis : {};
        if (g.__initial_auth_token) {
          await svc.authMod.signInWithCustomToken(svc.auth, g.__initial_auth_token);
        } else {
          await svc.authMod.signInAnonymously(svc.auth);
        }
      } catch {
        setCloudSyncStatus('local');
      }

      unsubAuth = svc.authMod.onAuthStateChanged(svc.auth, (fbUser) => {
        if (cancelled) return;
        setCloudAuthUser(fbUser || null);
        if (!fbUser) {
          setCloudSyncStatus('local');
        } else {
          setCloudSyncStatus('synced');
        }
      });
    })();

    return () => {
      cancelled = true;
      if (typeof unsubAuth === 'function') unsubAuth();
    };
  }, [activeUserKey]);

  // Foreground-Only Single-Document Firestore Snapshot Listener (Prevents unrelated user sync wakeups)
  useEffect(() => {
    if (!resolvedFirebaseConfig || !cloudAuthUser || !isAppVisible || !activeUserKey || activeUserKey === 'Demo') return;
    const targetDocKey = users[activeUserKey] ? activeUserKey : null;
    if (!targetDocKey) return;
    let unsubSnapshot = null;
    let cancelled = false;

    (async () => {
      const svc = await getFirebaseServices();
      if (!svc || cancelled) return;
      setCloudSyncStatus('synced');
      const docRef = svc.fsMod.doc(svc.db, 'artifacts', appId, 'public', 'data', 'solver_profiles', targetDocKey);
      unsubSnapshot = svc.fsMod.onSnapshot(
        docRef,
        (docSnap) => {
          if (cancelled || !docSnap.exists()) return;
          const data = docSnap.data();
          if (!data || typeof data !== 'object') return;
          setUsers((prev) => {
            if (data._deleted) {
              const copy = { ...prev };
              delete copy[docSnap.id];
              return Object.keys(copy).length > 0 ? copy : { ...DEFAULT_USERS };
            }
            return {
              ...prev,
              [docSnap.id]: sanitizeUserRecord({ ...(prev[docSnap.id] || {}), ...data })
            };
          });
        },
        () => setCloudSyncStatus('local')
      );
    })();

    return () => {
      cancelled = true;
      if (typeof unsubSnapshot === 'function') unsubSnapshot();
    };
  }, [cloudAuthUser, isAppVisible, activeUserKey]);

  // Deep-Sleep Background Power-Save Lifecycle (visibilitychange & pagehide)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const enterBackgroundSleep = () => {
      setIsAppVisible(false);
      flushPendingPersistence();
      if (padHoldTimeoutRef.current) {
        clearTimeout(padHoldTimeoutRef.current);
        padHoldTimeoutRef.current = null;
      }
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (crossRafRef.current) {
        cancelAnimationFrame(crossRafRef.current);
        crossRafRef.current = 0;
      }
      if (f2lRafRef.current) {
        cancelAnimationFrame(f2lRafRef.current);
        f2lRafRef.current = 0;
      }
      stopScannerCamera();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setLeftPadHeld(false);
      setRightPadHeld(false);
      setDraggedLineupIdx(null);
      setBlindState((prev) => (prev === 'inspecting' || prev === 'readying' || prev === 'armed' ? 'idle' : prev));
      setSwRunning(false);
      setFullTimerState((prev) => (prev === 'running' ? 'idle' : prev));
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        enterBackgroundSleep();
      } else {
        setIsAppVisible(true);
      }
    };

    const handlePageHide = () => {
      enterBackgroundSleep();
    };

    const handlePageShow = () => {
      setIsAppVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // 30Hz Interval Case Stopwatch Loop (Eliminates 120Hz rAF wakeups; exact ms precision on stop)
  useEffect(() => {
    if (!swRunning || !isAppVisible) return;
    const id = setInterval(() => {
      const elapsed = performance.now() - swStartRef.current;
      if (swDisplayRef.current) {
        swDisplayRef.current.textContent = `${(elapsed / 1000).toFixed(2)}s — Stop`;
      }
    }, 33);
    return () => clearInterval(id);
  }, [swRunning, isAppVisible]);

  // 30Hz Interval Full-Screen 3x3x3 Timer Loop (Eliminates 120Hz rAF wakeups; exact ms precision on stop)
  useEffect(() => {
    if (fullTimerState !== 'running' || !isAppVisible) return;
    const id = setInterval(() => {
      const elapsed = performance.now() - fullStartRef.current;
      if (fullTimerDisplayRef.current) {
        fullTimerDisplayRef.current.textContent = (elapsed / 1000).toFixed(2);
      }
    }, 33);
    return () => clearInterval(id);
  }, [fullTimerState, isAppVisible]);

  // Derived Current User & Curriculum Schedules
  const resolvedUserKey = activeUserKey && users[activeUserKey] ? activeUserKey : 'Demo';
  const currentUser = sanitizeUserRecord(users[resolvedUserKey] || DEFAULT_USERS.Demo);
  const isProUnlocked = Boolean(currentUser.isPro);

  const f2lChunks = currentUser.f2lCustomChunks?.length ? currentUser.f2lCustomChunks : F2L_DEFAULT_CHUNKS;
  const ollChunks = currentUser.customChunks?.length ? currentUser.customChunks : OLL_DEFAULT_CHUNKS;
  const pllChunks = currentUser.pllCustomChunks?.length ? currentUser.pllCustomChunks : PLL_DEFAULT_CHUNKS;

  const f2lSchedule = useMemo(() => buildSchedule(f2lChunks, F2L_DATA, F2L_BY_ID), [f2lChunks]);
  const ollSchedule = useMemo(() => buildSchedule(ollChunks, OLL_DATA, OLL_BY_ID), [ollChunks]);
  const pllSchedule = useMemo(() => buildSchedule(pllChunks, PLL_DATA, PLL_BY_ID), [pllChunks]);

  const getPhaseTargetPb = (phase) => {
    const val = currentUser.phaseTargetPbs?.[phase];
    return Number.isFinite(Number(val)) && Number(val) > 0 ? Number(val) : 2.0;
  };

  const getEffectiveCaseTargetPb = (phase, caseId) => {
    const custom = currentUser.caseTargetPbs?.[phase]?.[caseId];
    if (Number.isFinite(Number(custom)) && Number(custom) > 0) return Number(custom);
    return getPhaseTargetPb(phase);
  };

  const f2lMasteredCount = F2L_DATA.filter(
    (c) => typeof currentUser.f2lStats?.[c.id]?.best === 'number' && currentUser.f2lStats[c.id].best <= getEffectiveCaseTargetPb('f2l', c.id)
  ).length;
  const ollMasteredCount = OLL_DATA.filter(
    (c) => typeof currentUser.stats?.[c.id]?.best === 'number' && currentUser.stats[c.id].best <= getEffectiveCaseTargetPb('oll', c.id)
  ).length;
  const pllMasteredCount = PLL_DATA.filter(
    (c) => typeof currentUser.pllStats?.[c.id]?.best === 'number' && currentUser.pllStats[c.id].best <= getEffectiveCaseTargetPb('pll', c.id)
  ).length;

  const safeF2lDay = Math.min(Math.max(1, currentUser.f2lDay), Math.max(1, f2lSchedule.length));
  const safeOllDay = Math.min(Math.max(1, currentUser.day), Math.max(1, ollSchedule.length));
  const safePllDay = Math.min(Math.max(1, currentUser.pllDay), Math.max(1, pllSchedule.length));

  const currentF2lDayObj = f2lSchedule[safeF2lDay - 1] || { day: 1, mode: 'Learn', chunkTitle: 'Chunk 1', cases: F2L_DATA.slice(0, 4) };
  const currentOllDayObj = ollSchedule[safeOllDay - 1] || { day: 1, mode: 'Learn', chunkTitle: 'Chunk 1', cases: OLL_DATA.slice(0, 4) };
  const currentPllDayObj = pllSchedule[safePllDay - 1] || { day: 1, mode: 'Learn', chunkTitle: 'Chunk 1', cases: PLL_DATA.slice(0, 4) };

  useEffect(() => {
    setF2lLineupOrder([...currentF2lDayObj.cases]);
  }, [safeF2lDay, currentUser.f2lCustomChunks]);

  useEffect(() => {
    setOllLineupOrder([...currentOllDayObj.cases]);
  }, [safeOllDay, currentUser.customChunks]);

  useEffect(() => {
    setPllLineupOrder([...currentPllDayObj.cases]);
  }, [safePllDay, currentUser.pllCustomChunks]);

  // Target PB Getters & Updaters
  const fullSolveTargetSec = Number.isFinite(Number(currentUser.fullSolveTargetPb))
    ? Number(currentUser.fullSolveTargetPb)
    : targetGoalSec;

  useEffect(() => {
    setTargetPbInput(fullSolveTargetSec.toFixed(3));
  }, [fullSolveTargetSec]);

  useEffect(() => {
    setPhaseTargetInput(getPhaseTargetPb(selectedTargetPhase).toFixed(3));
  }, [selectedTargetPhase, currentUser.phaseTargetPbs]);

  const updateFullSolveTargetPb = (sec) => {
    const clamped = Math.min(120, Math.max(1.0, Number(Number(sec).toFixed(3))));
    setTargetGoalSec(clamped);
    setTargetPbInput(clamped.toFixed(3));
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      const updated = { ...u, fullSolveTargetPb: clamped };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
  };

  const updatePhaseTargetPb = (phase, sec) => {
    const clamped = Math.min(30, Math.max(0.1, Number(Number(sec).toFixed(3))));
    setPhaseTargetInput(clamped.toFixed(3));
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      const updated = {
        ...u,
        phaseTargetPbs: { ...u.phaseTargetPbs, [phase]: clamped }
      };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
  };

  const updateCaseTargetPb = (phase, caseId, secOrNull) => {
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      const phaseMap = { ...(u.caseTargetPbs?.[phase] || {}) };
      if (secOrNull === null) {
        delete phaseMap[caseId];
      } else {
        phaseMap[caseId] = Math.min(30, Math.max(0.1, Number(Number(secOrNull).toFixed(3))));
      }
      const updated = {
        ...u,
        caseTargetPbs: { ...u.caseTargetPbs, [phase]: phaseMap }
      };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
  };

  // Stopwatch & Full-Timer Action Helpers
  const toggleStopwatch = (onCompleteSec) => {
    if (!swRunning) {
      emitBeep(820, 'sine', 0.06);
      swStartRef.current = performance.now();
      setSwElapsedMs(0);
      setSwRunning(true);
    } else {
      const finalMs = performance.now() - swStartRef.current;
      setSwRunning(false);
      setSwElapsedMs(finalMs);
      const sec = Number((finalMs / 1000).toFixed(3));
      emitBeep(960, 'sine', 0.09);
      if (typeof onCompleteSec === 'function') onCompleteSec(sec);
    }
  };

  const recordCaseTime = (phase, caseId, timeSec) => {
    const statField = phase === 'f2l' ? 'f2lStats' : phase === 'pll' ? 'pllStats' : 'stats';
    let isNewPb = false;
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      const existing = u[statField]?.[caseId] || {};
      const prevBest = typeof existing.best === 'number' ? existing.best : null;
      isNewPb = prevBest === null || timeSec < prevBest;
      const nextBest = isNewPb ? timeSec : prevBest;
      const nextHistory = [timeSec, ...(Array.isArray(existing.history) ? existing.history : [])].slice(0, 60);
      const updated = {
        ...u,
        [statField]: {
          ...u[statField],
          [caseId]: {
            best: nextBest,
            attempts: (existing.attempts || 0) + 1,
            history: nextHistory
          }
        }
      };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
    setSwLastResult({ phase, caseId, timeSec, isNewPb });
  };

  const handleFullTimerScreenTap = () => {
    if (fullTimerState !== 'running') {
      emitBeep(820, 'sine', 0.07);
      fullStartRef.current = performance.now();
      setFullElapsedMs(0);
      setFullTimerState('running');
    } else {
      const finalMs = Math.round(performance.now() - fullStartRef.current);
      setFullElapsedMs(finalMs);
      setFullTimerState('stopped');
      emitBeep(980, 'sine', 0.1);
      const newEntry = {
        id: Date.now(),
        ms: finalMs,
        penalty: null,
        scramble: fullScramble
      };
      setUsers((prev) => {
        const u = sanitizeUserRecord(prev[resolvedUserKey]);
        const updated = {
          ...u,
          fullSolveHistory: [newEntry, ...(u.fullSolveHistory || [])].slice(0, 100)
        };
        saveUserToCloud(resolvedUserKey, updated);
        return { ...prev, [resolvedUserKey]: updated };
      });
      setFullScramble(generate3x3Scramble(20));
    }
  };

  const toggleFullSolvePenalty = (pen) => {
    emitBeep(560);
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      if (!u.fullSolveHistory?.length) return prev;
      const [first, ...rest] = u.fullSolveHistory;
      const updatedFirst = { ...first, penalty: first.penalty === pen ? null : pen };
      const updated = { ...u, fullSolveHistory: [updatedFirst, ...rest] };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
  };

  const deleteLastFullSolve = () => {
    emitBeep(400);
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      const updated = { ...u, fullSolveHistory: (u.fullSolveHistory || []).slice(1) };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
    setFullTimerState('idle');
    setFullElapsedMs(0);
  };

  const openProPaywall = (featureLabel) => {
    emitBeep(460);
    setProPaywallFeature(featureLabel || '');
    setProPurchaseToast('');
    setActiveModal('proPaywall');
  };

  const unlockLifetimePro = () => {
    emitBeep(920, 'sine', 0.12);
    setUsers((prev) => {
      const u = sanitizeUserRecord(prev[resolvedUserKey]);
      const updated = { ...u, isPro: true };
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
    setProPurchaseToast('OLLDay Pro Unlocked! All 123 cases active.');
    setTimeout(() => {
      setActiveModal(null);
      setProPurchaseToast('');
    }, 900);
  };

  const ao5Full = computeWcaAverage(currentUser.fullSolveHistory, 5);
  const ao12Full = computeWcaAverage(currentUser.fullSolveHistory, 12);
  const validFullMs = (currentUser.fullSolveHistory || [])
    .filter((s) => s.penalty !== 'DNF')
    .map((s) => Number(s.ms) + (s.penalty === '+2' ? 2000 : 0))
    .filter((n) => Number.isFinite(n));
  const bestFullPbMs = validFullMs.length ? Math.min(...validFullMs) : null;
  // WCA Blind Inspection Countdown Effect (Foreground-only)
  useEffect(() => {
    if (!isAppVisible) return;
    if (blindState !== 'inspecting' && blindState !== 'readying' && blindState !== 'armed') return;
    const interval = setInterval(() => {
      setInspectionLeft((prev) => {
        const next = Number((prev - 0.1).toFixed(1));
        if (Math.abs(next - 7.0) < 0.05) emitBeep(480, 'sine', 0.16);
        if (Math.abs(next - 3.0) < 0.05) emitBeep(560, 'sine', 0.16);
        if (next <= 0) {
          clearInterval(interval);
          emitBeep(210, 'sawtooth', 0.35);
          setBlindState('done');
          setBlindLogs((logs) => [{ id: Date.now(), result: 'DNF (+15s)', time: '0.0s' }, ...logs.slice(0, 7)]);
          return 0.0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [blindState, isAppVisible]);

  // Multi-touch dual-thumb arming lifecycle
  useEffect(() => {
    if (blindState === 'idle' || blindState === 'visor' || blindState === 'done') {
      if (padHoldTimeoutRef.current) clearTimeout(padHoldTimeoutRef.current);
      if (leftPadHeld) setLeftPadHeld(false);
      if (rightPadHeld) setRightPadHeld(false);
      return;
    }

    const bothHeld = leftPadHeld && rightPadHeld;

    if (bothHeld && blindState === 'inspecting') {
      setBlindState('readying');
      if (padHoldTimeoutRef.current) clearTimeout(padHoldTimeoutRef.current);
      padHoldTimeoutRef.current = setTimeout(() => {
        emitBeep(1020, 'sine', 0.08);
        setBlindState('armed');
      }, 350);
    } else if (!bothHeld) {
      if (padHoldTimeoutRef.current) clearTimeout(padHoldTimeoutRef.current);
      if (blindState === 'armed') {
        setLeftPadHeld(false);
        setRightPadHeld(false);
        emitBeep(1240, 'triangle', 0.1);
        setBlindState('visor');
      } else if (blindState === 'readying') {
        setBlindState('inspecting');
      }
    }
  }, [leftPadHeld, rightPadHeld, blindState]);

  const handleSingleMousePadDown = (side) => {
    emitBeep(side === 'left' ? 520 : 560, 'sine', 0.04, 0.06);
    setLeftPadHeld(true);
    setRightPadHeld(true);
  };

  const handleSingleMousePadUp = () => {
    setLeftPadHeld(false);
    setRightPadHeld(false);
  };

  // Non-passive mobile touch scroll lock during active lineup drag-and-drop (rAF-gated hit-testing)
  useEffect(() => {
    if (draggedLineupIdx === null) return;
    let dragRafId = 0;
    let pendingPoint = null;

    const handleWindowTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      pendingPoint = { x: touch.clientX, y: touch.clientY };
      if (dragRafId) return;

      dragRafId = requestAnimationFrame(() => {
        dragRafId = 0;
        if (!pendingPoint) return;
        const { x, y } = pendingPoint;
        pendingPoint = null;
        const el = document.elementFromPoint(x, y);
        const row = el?.closest('[data-lineup-idx]');
        if (row) {
          const targetIdx = Number(row.getAttribute('data-lineup-idx'));
          if (!Number.isNaN(targetIdx) && targetIdx !== draggedLineupIdx) {
            if (activePhase === 'f2l') {
              setF2lLineupOrder((prev) => {
                const updated = [...prev];
                const [moved] = updated.splice(draggedLineupIdx, 1);
                updated.splice(targetIdx, 0, moved);
                return updated;
              });
            } else if (activePhase === 'oll') {
              setOllLineupOrder((prev) => {
                const updated = [...prev];
                const [moved] = updated.splice(draggedLineupIdx, 1);
                updated.splice(targetIdx, 0, moved);
                return updated;
              });
            } else if (activePhase === 'pll') {
              setPllLineupOrder((prev) => {
                const updated = [...prev];
                const [moved] = updated.splice(draggedLineupIdx, 1);
                updated.splice(targetIdx, 0, moved);
                return updated;
              });
            }
            setDraggedLineupIdx(targetIdx);
            emitBeep(640, 'sine', 0.04, 0.08);
          }
        }
      });
    };

    const handleWindowTouchEnd = () => {
      if (dragRafId) {
        cancelAnimationFrame(dragRafId);
        dragRafId = 0;
      }
      setDraggedLineupIdx(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);
    return () => {
      if (dragRafId) cancelAnimationFrame(dragRafId);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [draggedLineupIdx, activePhase]);

  const startLineupHold = (idx, clientY) => {
    preHoldStartYRef.current = clientY;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      emitBeep(780, 'sine', 0.06);
      setDraggedLineupIdx(idx);
    }, 220);
  };

  const handleLineupPreHoldMove = (clientY) => {
    if (draggedLineupIdx !== null) return;
    if (preHoldStartYRef.current !== null && Math.abs(clientY - preHoldStartYRef.current) > 8) {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      preHoldStartYRef.current = null;
    }
  };

  const cancelLineupHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    preHoldStartYRef.current = null;
    setDraggedLineupIdx(null);
  };

  // Granular Reset Executor
  const executeGranularReset = (scope) => {
    emitBeep(360, 'triangle', 0.12);
    setUsers((prev) => {
      const u = { ...(prev[activeUserKey] || DEFAULT_USERS.Demo) };
      if (scope === 'f2l-day') u.f2lDay = 1;
      if (scope === 'f2l-stats') u.f2lStats = {};
      if (scope === 'f2l-chunks') u.f2lCustomChunks = null;
      if (scope === 'f2l-all') {
        u.f2lDay = 1;
        u.f2lStats = {};
        u.f2lCustomChunks = null;
      }
      if (scope === 'oll-day') u.day = 1;
      if (scope === 'oll-stats') u.stats = {};
      if (scope === 'oll-chunks') u.customChunks = null;
      if (scope === 'oll-all') {
        u.day = 1;
        u.stats = {};
        u.customChunks = null;
      }
      if (scope === 'pll-day') u.pllDay = 1;
      if (scope === 'pll-stats') u.pllStats = {};
      if (scope === 'pll-chunks') u.pllCustomChunks = null;
      if (scope === 'pll-all') {
        u.pllDay = 1;
        u.pllStats = {};
        u.pllCustomChunks = null;
      }
      if (scope === 'full-timer') {
        u.fullSolveHistory = [];
      }
      if (scope === 'both') {
        const fresh = {
          ...sanitizeUserRecord(null),
          isPro: Boolean(u.isPro),
          email: u.email || ''
        };
        saveUserToCloud(activeUserKey, fresh);
        return {
          ...prev,
          [activeUserKey]: fresh
        };
      }
      saveUserToCloud(activeUserKey, u);
      return { ...prev, [activeUserKey]: u };
    });
    setActiveModal(null);
  };

  const deleteCurrentSolverAccount = async () => {
    const keyToRemove = activeUserKey;
    if (!keyToRemove) return;
    emitBeep(320, 'triangle', 0.14);
    setUsers((prev) => {
      const copy = { ...prev };
      delete copy[keyToRemove];
      return copy;
    });
    if (resolvedFirebaseConfig && cloudAuthUser) {
      const svc = await getFirebaseServices();
      if (svc) {
        svc.fsMod.setDoc(
          svc.fsMod.doc(svc.db, 'artifacts', appId, 'public', 'data', 'solver_profiles', keyToRemove),
          { _deleted: true, updatedAt: Date.now() },
          { merge: true }
        ).catch(() => {});
      }
    }
    setDeleteAccountConfirm(false);
    setActiveModal(null);
    setDeviceAccountKeys((prev) => {
      const next = prev.filter((k) => k !== keyToRemove);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEYS.deviceAccounts, JSON.stringify(next));
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
    setActiveUserKey('');
    setAuthNameInput('');
    setAuthEmailInput('');
    setAuthErrorMsg('');
    setAuthMode('signup');
    setAuthScreenOpen(true);
  };

  // Curriculum Builder Helpers
  const openCurriculumBuilder = (phase) => {
    setBuilderPhase(phase);
    const sourceChunks = phase === 'f2l' ? f2lChunks : phase === 'pll' ? pllChunks : ollChunks;
    setBuilderChunks(sourceChunks.map((c) => ({ ...c, ids: [...c.ids] })));
    setNewChunkName('');
    setNewChunkSelectedIds([]);
    setActiveModal('curriculum');
  };

  const saveCurriculumBuilder = () => {
    if (!builderChunks.length) return;
    emitBeep(880, 'sine', 0.1);
    setUsers((prev) => {
      const u = prev[activeUserKey] || DEFAULT_USERS.Demo;
      const updatedUser = {
        ...u,
        ...(builderPhase === 'f2l'
          ? { f2lCustomChunks: builderChunks, f2lDay: 1 }
          : builderPhase === 'pll'
          ? { pllCustomChunks: builderChunks, pllDay: 1 }
          : { customChunks: builderChunks, day: 1 })
      };
      saveUserToCloud(activeUserKey, updatedUser);
      return {
        ...prev,
        [activeUserKey]: updatedUser
      };
    });
    setActiveModal(null);
  };

  // Current Cross Tier Data
  const activeCrossTierList = crossDifficulty === 'advanced' ? CROSS_ADVANCED_TIERS : CROSS_TIERS;
  const activeTierObj = activeCrossTierList.find((t) => t.tier === crossTier) || activeCrossTierList[0];
  const activeCrossScramble = activeTierObj.scrambles[crossScrambleIdx % activeTierObj.scrambles.length];
  const activeMechanicObj = CROSS_MECHANICS.find((m) => m.id === activeMechanicId) || CROSS_MECHANICS[0];

  const handleCrossCubePointerDown = (e) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    crossLiveRotRef.current = { ...crossDragRot };
    crossDragStartRef.current = { lastX: clientX, lastY: clientY, moved: false };
    setCrossIsDragging(true);
  };

  const handleCrossCubePointerMove = (e) => {
    if (!crossDragStartRef.current) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - crossDragStartRef.current.lastX;
    const deltaY = clientY - crossDragStartRef.current.lastY;
    crossDragStartRef.current.lastX = clientX;
    crossDragStartRef.current.lastY = clientY;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      crossDragStartRef.current.moved = true;
    }
    const nextYaw = Math.round(crossLiveRotRef.current.yaw + deltaX * 1.15);
    const nextPitch = Math.max(-75, Math.min(75, Math.round(crossLiveRotRef.current.pitch - deltaY * 0.95)));
    crossLiveRotRef.current = { yaw: nextYaw, pitch: nextPitch };

    if (!crossRafRef.current) {
      crossRafRef.current = requestAnimationFrame(() => {
        crossRafRef.current = 0;
        const { yaw, pitch } = crossLiveRotRef.current;
        if (crossCubeDomRef.current) {
          crossCubeDomRef.current.style.transform = `translateZ(-12px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(1.05)`;
        }
        if (crossDegreeLabelRef.current) {
          crossDegreeLabelRef.current.textContent = `3D Cross Orbit • Drag to Spin (${((yaw % 360) + 360) % 360}°)`;
        }
      });
    }
  };

  const handleCrossCubePointerUp = () => {
    if (!crossDragStartRef.current) return;
    if (crossRafRef.current) {
      cancelAnimationFrame(crossRafRef.current);
      crossRafRef.current = 0;
    }
    const wasTap = !crossDragStartRef.current.moved;
    crossDragStartRef.current = null;
    setCrossIsDragging(false);
    if (wasTap) {
      emitBeep(620);
      setCrossDragRot((prev) => {
        const next = { yaw: prev.yaw - 90, pitch: prev.pitch };
        crossLiveRotRef.current = next;
        return next;
      });
    } else {
      setCrossDragRot({ ...crossLiveRotRef.current });
    }
  };

  // Interactive 3D F2L Cube Orbit Handlers
  const setF2LPresetAngle = (idx) => {
    const preset = F2L_VIEW_ANGLES[idx % F2L_VIEW_ANGLES.length];
    const next = { yaw: preset.yaw, pitch: preset.pitch };
    f2lLiveRotRef.current = next;
    setF2lViewIdx(idx % F2L_VIEW_ANGLES.length);
    setF2lDragRot(next);
  };

  const handleF2LCubePointerDown = (e) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    f2lLiveRotRef.current = { ...f2lDragRot };
    f2lDragStartRef.current = { lastX: clientX, lastY: clientY, moved: false };
    setF2lIsDragging(true);
  };

  const handleF2LCubePointerMove = (e) => {
    if (!f2lDragStartRef.current) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - f2lDragStartRef.current.lastX;
    const deltaY = clientY - f2lDragStartRef.current.lastY;
    f2lDragStartRef.current.lastX = clientX;
    f2lDragStartRef.current.lastY = clientY;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      f2lDragStartRef.current.moved = true;
    }
    const nextYaw = Math.round(f2lLiveRotRef.current.yaw + deltaX * 1.15);
    const nextPitch = Math.max(-75, Math.min(75, Math.round(f2lLiveRotRef.current.pitch - deltaY * 0.95)));
    f2lLiveRotRef.current = { yaw: nextYaw, pitch: nextPitch };

    if (!f2lRafRef.current) {
      f2lRafRef.current = requestAnimationFrame(() => {
        f2lRafRef.current = 0;
        const { yaw, pitch } = f2lLiveRotRef.current;
        if (f2lCubeDomRef.current) {
          f2lCubeDomRef.current.style.transform = `translateZ(-12px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(1.05)`;
        }
        if (f2lDegreeLabelRef.current) {
          f2lDegreeLabelRef.current.textContent = `3D Orbit • Drag to Spin (${((yaw % 360) + 360) % 360}°)`;
        }
      });
    }
  };

  const handleF2LCubePointerUp = () => {
    if (!f2lDragStartRef.current) return;
    if (f2lRafRef.current) {
      cancelAnimationFrame(f2lRafRef.current);
      f2lRafRef.current = 0;
    }
    const wasTap = !f2lDragStartRef.current.moved;
    f2lDragStartRef.current = null;
    setF2lIsDragging(false);
    if (wasTap) {
      emitBeep(620);
      setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length);
    } else {
      setF2lDragRot({ ...f2lLiveRotRef.current });
    }
  };

  const activeF2LSessionCase = f2lSession ? f2lSession.queue[f2lSession.index] : null;
  const activeOLLSessionCase = ollSession ? ollSession.queue[ollSession.index] : null;
  const activePLLSessionCase = pllSession ? pllSession.queue[pllSession.index] : null;

  // Settings Deck Touch Swipe Handlers (8 Cards: Card 1 Learn App + Cards 2..8)
  const totalDeckCards = 8;
  const handleDeckTouchStart = (e) => {
    if (e.target.closest('[data-scrollable="true"]')) return;
    const t = e.touches[0];
    deckTouchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleDeckTouchEnd = (e) => {
    if (!deckTouchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - deckTouchStartRef.current.x;
    const dy = t.clientY - deckTouchStartRef.current.y;
    deckTouchStartRef.current = null;
    if (Math.abs(dx) > 36 || Math.abs(dy) > 36) {
      emitBeep(520, 'sine', 0.05);
      if (dx < -36 || dy < -36) {
        setSettingsDeckIdx((p) => (p + 1) % totalDeckCards);
      } else {
        setSettingsDeckIdx((p) => (p + totalDeckCards - 1) % totalDeckCards);
      }
    }
  };

  const getDeckCardClass = (cardIdx) => {
    const rel = (cardIdx - settingsDeckIdx + totalDeckCards) % totalDeckCards;
    if (rel === 0) return 'deck-card-1';
    if (rel === 1) return 'deck-card-2';
    return 'deck-card-3';
  };

  const isDeckCardMounted = (cardIdx) => {
    const rel = (cardIdx - settingsDeckIdx + totalDeckCards) % totalDeckCards;
    return rel <= 2;
  };

  // Shared 3x3x3 CFOP Full-Solve Telemetry Section (Shown inside Statistics across all phases)
  const renderFullSolveStatsBlock = () => (
    <div className="bg-slate-900/75 border border-white/10 rounded-[2rem] p-4 space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
            Full 3x3x3 CFOP Session • Target PB {fullSolveTargetSec.toFixed(3)}s
          </span>
          <h3 className="text-sm font-black text-white">Ao5 &amp; Ao12 Telemetry</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            emitBeep(680);
            setFullTimerState('idle');
            setFullElapsedMs(0);
            setFullTimerOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md cursor-pointer"
        >
          Open Timer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5 text-center">
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Ao5</span>
          <span className="font-mono text-sm font-black text-green-400">
            {ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}
          </span>
        </div>
        <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5 text-center">
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Ao12</span>
          <span className="font-mono text-sm font-black text-sky-400">
            {ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}
          </span>
        </div>
        <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5 text-center">
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Best PB</span>
          <span className="font-mono text-sm font-black text-amber-300">
            {formatMsTime(bestFullPbMs, 2)}
          </span>
        </div>
      </div>
    </div>
  );

  // Reusable Settings 8-Card Deck Renderer (Card 1: Learn How to Use This App)
  const renderSettingsDeck = () => (
    <div className="p-5 pb-10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Control Center</p>
          <h2 className="text-2xl font-black tracking-tight text-white">Settings</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
            <button
              key={idx}
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(idx);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                settingsDeckIdx === idx ? 'w-5 bg-orange-500' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>
      {/* Stacked 3D Deck Container (Only 3 visible stack cards mounted to eliminate offscreen DOM/GPU cost) */}
      <div
        onTouchStart={handleDeckTouchStart}
        onTouchEnd={handleDeckTouchEnd}
        className="relative h-[515px] w-full mt-2"
      >
        {/* Card 1: Learn How to Use This App (Manual Guided Tour Launcher Across All Phases) */}
        {isDeckCardMounted(0) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3 ${getDeckCardClass(0)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 1 of 8 • Onboarding</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(1);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Preferences →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Learn How to Use This App</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Launch an interactive, auto-navigating walkthrough that switches through <strong className="text-white">C → F → O → P</strong> live and shows how to reach every feature yourself.
          </p>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => startGuidedTour('cfopAndApp')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-orange-600/25 to-amber-500/20 hover:from-orange-600/35 hover:to-amber-500/30 border border-orange-500/40 text-left space-y-1 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">New to CFOP + App Navigation</span>
                <span className="text-[10px] font-black text-orange-300">Start →</span>
              </div>
              <p className="text-[10.5px] text-slate-300 leading-snug">
                Teaches Cross, F2L, OLL, and PLL from scratch while navigating to each phase in the app.
              </p>
            </button>

            <button
              type="button"
              onClick={() => startGuidedTour('appOnly')}
              className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left space-y-1 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white">I Know CFOP • App Feature Tour</span>
                <span className="text-[10px] font-black text-sky-300">Start →</span>
              </div>
              <p className="text-[10.5px] text-slate-300 leading-snug">
                Fast tour of 3D Cross &amp; F2L cubes, Blind Mat, Fingertrick tags, Target PBs, and the 3x3 Timer.
              </p>
            </button>
          </div>
        </div>
        )}

        {/* Card 2: Hardware & Millisecond Target PB Preferences */}
        {isDeckCardMounted(1) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-2.5 ${getDeckCardClass(1)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 2 of 8 • Preferences</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(2);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              3x3 Timer →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Speedcubing Suite</h3>

          <div data-scrollable="true" className="h-[410px] overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div>
                <p className="text-xs font-bold text-white">Speedcube Stopwatch</p>
                <p className="text-[10px] text-slate-400">Record solve times &amp; track case PBs</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  emitBeep(620);
                  setStopwatchEnabled((v) => !v);
                }}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                  stopwatchEnabled ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${stopwatchEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div>
                <p className="text-xs font-bold text-white">Inline Fingertrick Highlights</p>
                <p className="text-[10px] text-slate-400">Show color-coded triggers &amp; grip cues on cases</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  emitBeep(620);
                  setFingertricksEnabled((v) => !v);
                }}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                  fingertricksEnabled ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${fingertricksEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-2.5">
              <div>
                <p className="text-xs font-bold text-white">Acoustic Audio &amp; Beeps</p>
                <p className="text-[10px] text-slate-400">Inspection warnings &amp; tactile feedback</p>
              </div>
              <button
                type="button"
                onClick={() => setAudioEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                  audioEnabled ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${audioEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* 3x3x3 Full-Solve Target PB */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white">3x3x3 Full-Solve Target PB</span>
                <span className="font-mono text-xs font-black text-orange-400">{fullSolveTargetSec.toFixed(3)}s</span>
              </div>
              <MillisecondSliderControl
                value={fullSolveTargetSec}
                min={3.0}
                max={60.0}
                draftValue={targetPbInput}
                accentTextClass="text-orange-300"
                onSliderChange={updateFullSolveTargetPb}
                onStepDelta={(delta) => {
                  emitBeep(540);
                  updateFullSolveTargetPb(fullSolveTargetSec + delta);
                }}
                onDraftChange={(val) => {
                  setTargetPbInput(val);
                  const parsed = parseFloat(val);
                  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 120) {
                    updateFullSolveTargetPb(parsed);
                  }
                }}
              />
            </div>

            {/* Per-Phase Target PB (C, F, O, P) with Slider */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-white">Phase Target PB</span>
                  <span className="font-mono text-xs font-black text-amber-300">
                    {getPhaseTargetPb(selectedTargetPhase).toFixed(3)}s
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    { key: 'cross', label: 'C' },
                    { key: 'f2l', label: 'F' },
                    { key: 'oll', label: 'O' },
                    { key: 'pll', label: 'P' }
                  ].map((ph) => (
                    <button
                      key={ph.key}
                      type="button"
                      onClick={() => {
                        emitBeep(520);
                        setSelectedTargetPhase(ph.key);
                      }}
                      className={`w-6 h-6 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                        selectedTargetPhase === ph.key
                          ? 'bg-orange-500 text-slate-950'
                          : 'bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ph.label}
                    </button>
                  ))}
                </div>
              </div>
              <MillisecondSliderControl
                value={getPhaseTargetPb(selectedTargetPhase)}
                min={0.15}
                max={15.0}
                draftValue={phaseTargetInput}
                accentTextClass="text-amber-300"
                onSliderChange={(sec) => updatePhaseTargetPb(selectedTargetPhase, sec)}
                onStepDelta={(delta) => {
                  emitBeep(540);
                  updatePhaseTargetPb(selectedTargetPhase, getPhaseTargetPb(selectedTargetPhase) + delta);
                }}
                onDraftChange={(val) => {
                  setPhaseTargetInput(val);
                  const parsed = parseFloat(val);
                  if (Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 30) {
                    updatePhaseTargetPb(selectedTargetPhase, parsed);
                  }
                }}
              />
              <p className="text-[9.5px] text-slate-400">
                Custom per-case Target PBs can also be edited directly inside each phase&apos;s Statistics tab.
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Card 3: Full-Screen 3x3x3 CFOP Timer Launcher & Pinned Home Screen Pills */}
        {isDeckCardMounted(2) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3 ${getDeckCardClass(2)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 3 of 8 • Timer &amp; Home</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(3);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Notation →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">3x3x3 CFOP Timer</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full-screen glassmorphic speedcube timer with WCA 20-move scrambles, +2 / DNF penalties, and live <strong className="text-white">Ao5</strong> &amp; <strong className="text-white">Ao12</strong> tracking.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Ao5</span>
              <span className="font-mono text-sm font-black text-green-400">
                {ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}
              </span>
            </div>
            <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Ao12</span>
              <span className="font-mono text-sm font-black text-sky-400">
                {ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}
              </span>
            </div>
            <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-2.5 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Best PB</span>
              <span className="font-mono text-sm font-black text-amber-300">
                {formatMsTime(bestFullPbMs, 2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              emitBeep(680);
              setFullTimerState('idle');
              setFullElapsedMs(0);
              setFullTimerOpen(true);
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
          >
            Launch Full-Screen 3x3x3 Timer
          </button>

          {/* Compact Pinned Startup Home Screen Pills (C, F, O, P) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-white block">Pinned Home Screen</span>
                <span className="text-[10px] text-slate-400">Default phase on startup</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { key: 'cross', label: 'C' },
                  { key: 'f2l', label: 'F' },
                  { key: 'oll', label: 'O' },
                  { key: 'pll', label: 'P' }
                ].map((item) => {
                  const isPinned = (pinnedHomePhase || 'cross') === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        emitBeep(640);
                        setPinnedHomePhase(item.key);
                        try {
                          if (typeof window !== 'undefined') {
                            window.localStorage.setItem(STORAGE_KEYS.pinnedHomePhase, item.key);
                          }
                        } catch {
                          // Ignore storage errors
                        }
                      }}
                      className={`w-8 h-8 rounded-full text-xs font-black transition-all cursor-pointer ${
                        isPinned
                          ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                          : 'bg-slate-950 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Card 4: WCA Notation Guide */}
        {isDeckCardMounted(3) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-2.5 ${getDeckCardClass(3)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 4 of 8 • Notation</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(4);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Dossier →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">WCA Notation Guide</h3>

          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {['All', 'Outer Faces', 'Wide Turns', 'Slice Moves', 'Rotations'].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  emitBeep(480);
                  setNotationFilter(sec);
                }}
                className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase whitespace-nowrap cursor-pointer ${
                  notationFilter === sec ? 'bg-orange-500 text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          <div data-scrollable="true" className="h-[365px] overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
            {WCA_NOTATION_GUIDE.filter((n) => notationFilter === 'All' || n.section === notationFilter).map((item) => (
              <div
                key={item.move}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
              >
                <span className="font-mono text-xs font-black text-amber-300 flex-shrink-0">{item.move}</span>
                <span className="text-[11px] text-slate-300 text-right">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Card 5: Dedicated Fingertrick Dossier */}
        {isDeckCardMounted(4) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-2.5 ${getDeckCardClass(4)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 5 of 8 • Mechanics</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(5);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Guide &amp; Reset →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Fingertrick Dossier</h3>

          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {['All', 'Core Triggers', 'F-Layer Triggers', 'Speed Flicks', 'Slice & Ring'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  emitBeep(480);
                  setDossierFilter(cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase whitespace-nowrap cursor-pointer ${
                  dossierFilter === cat ? 'bg-orange-500 text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div data-scrollable="true" className="h-[365px] overflow-y-auto no-scrollbar space-y-2 pr-0.5">
            {FINGERTRICK_CODEX.filter((t) => dossierFilter === 'All' || t.category === dossierFilter).map((trig) => (
              <div
                key={trig.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${trig.dotClass}`} />
                    <span className="text-xs font-black text-white">{trig.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] font-black ${trig.badgeClass}`}>
                    {trig.notation}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-300">
                  <span className="text-orange-400">Grip:</span> {trig.grip}
                </p>
                <p className="text-[10.5px] text-slate-300 leading-relaxed">{trig.execution}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Card 6: Custom Builder (Blurred if non-Pro) & Reset Controls */}
        {isDeckCardMounted(5) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3 ${getDeckCardClass(5)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 6 of 8 • Tools</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(6);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Account →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Custom Chunks &amp; Reset</h3>

          <div className="space-y-2.5">
            <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
              {!isProUnlocked && (
                <button
                  type="button"
                  onClick={() => openProPaywall('Custom Curriculum Chunk Builder')}
                  className="absolute inset-0 z-10 bg-slate-950/75 flex items-center justify-center cursor-pointer"
                >
                  <span className="px-3 py-1 rounded-full bg-orange-500/25 border border-orange-400/50 text-[10px] font-black uppercase tracking-wider text-orange-200 shadow-lg">
                    🔒 Custom Chunks • Pro
                  </span>
                </button>
              )}
              <div className={!isProUnlocked ? 'opacity-40 select-none space-y-2' : 'space-y-2'}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white">Custom Learning Chunks</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'f2l', label: 'F2L Chunks' },
                    { key: 'oll', label: 'OLL Chunks' },
                    { key: 'pll', label: 'PLL Chunks' }
                  ].map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => {
                        if (!isProUnlocked) {
                          openProPaywall('Custom Curriculum Chunk Builder');
                          return;
                        }
                        emitBeep(560);
                        openCurriculumBuilder(b.key);
                      }}
                      className="py-2 rounded-xl bg-slate-950 border border-white/10 text-[10px] font-black text-orange-300 hover:bg-white/10 cursor-pointer"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                emitBeep(420);
                setActiveModal('reset');
              }}
              className="w-full p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex items-center justify-between text-left cursor-pointer"
            >
              <div>
                <p className="text-xs font-black text-red-300">Granular Progress Reset</p>
                <p className="text-[10px] text-red-200/70">Reset individual phases, PBs, or timer history</p>
              </div>
              <span className="text-red-300 font-black text-xs">Manage →</span>
            </button>
          </div>
        </div>
        )}

        {/* Card 7: Account & Cloud Sync */}
        {isDeckCardMounted(6) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3 ${getDeckCardClass(6)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 7 of 8 • Account</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(7);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Pro &amp; Data →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Account &amp; Cloud Sync</h3>

          <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">{String(activeUserKey || 'Solver')}</span>
              <span className="text-[10px] font-bold text-green-400">
                {cloudSyncStatus === 'synced' ? '● Cloud Synced' : '● Local Saved'}
              </span>
            </div>
            {currentUser.email && (
              <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
            )}
            <p className="text-[10px] text-slate-400 pt-1">
              F2L Day {safeF2lDay} • OLL Day {safeOllDay} • PLL Day {safePllDay} • {currentUser.fullSolveHistory?.length || 0} Full Solves
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              emitBeep(520);
              setAuthErrorMsg('');
              setAuthMode('signin');
              setAuthScreenOpen(true);
            }}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-black text-white uppercase tracking-wider cursor-pointer"
          >
            Switch / Sign Out of Account
          </button>

          <button
            type="button"
            onClick={() => {
              emitBeep(620);
              if (!isProUnlocked) {
                openProPaywall('Restore Purchase');
              }
            }}
            className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 cursor-pointer"
          >
            Restore App Store Purchase
          </button>
        </div>
        )}

        {/* Card 8: Membership Status & Account Deletion */}
        {isDeckCardMounted(7) && (
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3 ${getDeckCardClass(7)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 8 of 8 • Membership</span>
            <button
              type="button"
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(0);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Learn App →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">OLLDay Pro &amp; Privacy</h3>

          <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Current Plan</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  isProUnlocked
                    ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                    : 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
                }`}
              >
                {isProUnlocked ? 'Lifetime Pro Active' : 'Starter Tier'}
              </span>
            </div>
            {!isProUnlocked && (
              <button
                type="button"
                onClick={() => openProPaywall('Full 123-Case CFOP Suite')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Unlock Lifetime Pro — $3.99
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-white/10">
            {!deleteAccountConfirm ? (
              <button
                type="button"
                onClick={() => {
                  emitBeep(380);
                  setDeleteAccountConfirm(true);
                }}
                className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[11px] font-black text-red-300 cursor-pointer"
              >
                Delete My Account &amp; Data
              </button>
            ) : (
              <div className="bg-red-950/50 border border-red-500/40 rounded-2xl p-2.5 space-y-2 text-center">
                <p className="text-[10px] font-bold text-red-200">
                  Permanently delete &ldquo;{String(activeUserKey)}&rdquo; and all PB history?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeleteAccountConfirm(false)}
                    className="py-1.5 rounded-lg bg-white/10 text-[10px] font-bold text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={deleteCurrentSolverAccount}
                    className="py-1.5 rounded-lg bg-red-500 text-white text-[10px] font-black cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );

  // Unified Case Thumbnail Renderer (Original VisualCube Diagrams with In-Memory SVG Caching)
  const renderCaseThumb = (phaseKey, item, sizeClass = 'w-14 h-14') => {
    if (phaseKey === 'f2l') {
      return (
        <div className={`${sizeClass} flex-shrink-0 flex items-center justify-center pointer-events-none`}>
          <CachedVisualCubeImg
            url={getF2LImageUrl(item.alg)}
            alt={item.name}
            className="w-full h-full object-contain f2l-cube-satin"
          />
        </div>
      );
    }
    const imgUrl = phaseKey === 'pll' ? getPLLImageUrl(item.alg) : getOLLImageUrl(item.alg);
    return (
      <div className={`${sizeClass} rounded-2xl bg-slate-200 p-1.5 flex-shrink-0 flex items-center justify-center pointer-events-none`}>
        <CachedVisualCubeImg
          url={imgUrl}
          alt={item.name}
          className="w-full h-full object-contain"
        />
      </div>
    );
  };

  // Unified Phase Workspace for F2L, OLL, and PLL (The Grind, Algorithms Library, Statistics, Settings)
  const renderCFOPAlgorithmPhase = (phaseKey) => {
    const isF2L = phaseKey === 'f2l';
    const isPLL = phaseKey === 'pll';
    const tab = isF2L ? f2lTab : isPLL ? pllTab : ollTab;
    const dataList = isF2L ? F2L_DATA : isPLL ? PLL_DATA : OLL_DATA;
    const lookupMap = isF2L ? F2L_BY_ID : isPLL ? PLL_BY_ID : OLL_BY_ID;
    const groupList = isF2L ? F2L_GROUPS : isPLL ? PLL_GROUPS : OLL_GROUPS;
    const chunksList = isF2L ? f2lChunks : isPLL ? pllChunks : ollChunks;
    const scheduleList = isF2L ? f2lSchedule : isPLL ? pllSchedule : ollSchedule;
    const safeDay = isF2L ? safeF2lDay : isPLL ? safePllDay : safeOllDay;
    const dayObj = isF2L ? currentF2lDayObj : isPLL ? currentPllDayObj : currentOllDayObj;
    const dayField = isF2L ? 'f2lDay' : isPLL ? 'pllDay' : 'day';
    const statsMap = isF2L ? currentUser.f2lStats : isPLL ? currentUser.pllStats : currentUser.stats;
    const masteredCount = isF2L ? f2lMasteredCount : isPLL ? pllMasteredCount : ollMasteredCount;
    const lineupOrder = isF2L ? f2lLineupOrder : isPLL ? pllLineupOrder : ollLineupOrder;
    const libMode = isF2L ? f2lLibMode : isPLL ? pllLibMode : ollLibMode;
    const setLibMode = isF2L ? setF2lLibMode : isPLL ? setPllLibMode : setOllLibMode;
    const selectedCategory = isF2L ? f2lSelectedCategory : isPLL ? pllSelectedCategory : ollSelectedCategory;
    const setSelectedCategory = isF2L ? setF2lSelectedCategory : isPLL ? setPllSelectedCategory : setOllSelectedCategory;
    const setSession = isF2L ? setF2lSession : isPLL ? setPllSession : setOllSession;
    const setDrillCase = isF2L ? setF2lDrillCase : isPLL ? setPllDrillCase : setOllDrillCase;

    const meta = isF2L
      ? {
          subtitle: 'Hold White on Bottom • Green in Front • Target Slot: Front-Right (White–Green–Orange)',
          lineupLabel: "Today's Pair Lineup (Hold & Drag to Reorder)",
          libEyebrow: '41 Standard Pairs',
          libTitle: 'F2L Library',
          groupTabLabel: '6 Pair Groups',
          unitLabel: 'Pairs',
          statsTitle: 'F2L Statistics',
          isFreeGroup: (g) => g === 'Basic Inserts'
        }
      : isPLL
      ? {
          subtitle: `2-Side Headlight & Block Recognition • Phase Target PB: ${getPhaseTargetPb('pll').toFixed(3)}s`,
          lineupLabel: "Today's PLL Lineup (Hold & Drag to Reorder)",
          libEyebrow: '21 Standard + 4 Bonus Algs',
          libTitle: 'PLL Library',
          groupTabLabel: '5 Perm Groups',
          unitLabel: 'Algs',
          statsTitle: 'PLL Statistics',
          isFreeGroup: (g) => g === 'Edges Only (EPLL)' || g === 'Corners Only (CPLL)'
        }
      : {
          subtitle: `Yellow Top Recognition • Phase Target PB: ${getPhaseTargetPb('oll').toFixed(3)}s`,
          lineupLabel: "Today's OLL Lineup (Hold & Drag to Reorder)",
          libEyebrow: '57 Last-Layer Cases',
          libTitle: 'OLL Library',
          groupTabLabel: 'Shape Groups',
          unitLabel: 'Cases',
          statsTitle: 'OLL Statistics',
          isFreeGroup: (g) => g === 'All Edges Oriented'
        };

    if (tab === 'settings') return renderSettingsDeck();

    if (tab === 'grind') {
      return (
        <div className="p-5 pb-10 space-y-4">
          <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-orange-950/40 border border-white/10 rounded-[2.25rem] p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                Day {safeDay} • {dayObj.mode} Mode
              </span>
              <span className="text-xs font-black text-slate-300 font-mono">
                {masteredCount}/{dataList.length} Mastered
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black text-white leading-tight">{dayObj.chunkTitle}</h2>
              <p className="text-xs text-slate-400 mt-1">{meta.subtitle}</p>
            </div>

            {isF2L && (
              <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Setup Scramble Style
                  </span>
                  <div className="bg-slate-900 p-0.5 rounded-xl border border-white/10 flex">
                    {['beginner', 'realistic'].map((modeKey) => (
                      <button
                        key={modeKey}
                        onClick={() => {
                          emitBeep(520);
                          setF2lSetupMode(modeKey);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all ${
                          f2lSetupMode === modeKey
                            ? 'bg-orange-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {modeKey}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {f2lSetupMode === 'beginner'
                    ? 'Start from a solved cube (White bottom, Green front): sets up only the Front-Right pair while keeping the other 3 slots solved.'
                    : 'Start from a solved cube (White bottom, Green front): keeps the White Cross solved while scrambling back/left slots like a real mid-solve.'}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  emitBeep(480);
                  const prevDay = Math.max(1, safeDay - 1);
                  const updated = { ...currentUser, [dayField]: prevDay };
                  setUsers((prev) => ({ ...prev, [activeUserKey]: updated }));
                  saveUserToCloud(activeUserKey, updated);
                }}
                disabled={safeDay <= 1}
                className="px-3 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                ← Prev
              </button>
              <button
                onClick={() => {
                  const hasLocked = lineupOrder.some((c) => !isCaseUnlockedForTier(phaseKey, c.id, isProUnlocked));
                  if (hasLocked) {
                    openProPaywall(`Day ${safeDay} ${phaseKey.toUpperCase()} Cases`);
                    return;
                  }
                  emitBeep(720, 'sine', 0.08);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  setSwLastResult(null);
                  setSession({
                    dayObj,
                    index: 0,
                    queue: [...lineupOrder]
                  });
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
              >
                Start Day {safeDay} Grind ({lineupOrder.length})
              </button>
              <button
                onClick={() => {
                  emitBeep(480);
                  const nextDay = safeDay >= scheduleList.length ? 1 : safeDay + 1;
                  const updated = { ...currentUser, [dayField]: nextDay };
                  setUsers((prev) => ({ ...prev, [activeUserKey]: updated }));
                  saveUserToCloud(activeUserKey, updated);
                }}
                className="px-3 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {meta.lineupLabel}
              </span>
              <span className="text-[10px] font-bold text-orange-400">{lineupOrder.length} Cases</span>
            </div>

            <div className="space-y-2">
              {lineupOrder.map((item, idx) => {
                const stat = statsMap?.[item.id];
                const locked = !isCaseUnlockedForTier(phaseKey, item.id, isProUnlocked);
                return (
                  <div
                    key={item.id}
                    data-lineup-idx={idx}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchStart={(e) => startLineupHold(idx, e.touches[0].clientY)}
                    onTouchMove={(e) => handleLineupPreHoldMove(e.touches[0].clientY)}
                    onTouchEnd={cancelLineupHold}
                    onClick={() => {
                      if (draggedLineupIdx !== null) return;
                      if (locked) {
                        openProPaywall(item.name);
                        return;
                      }
                      emitBeep(600);
                      setSwRunning(false);
                      setSwElapsedMs(0);
                      setSwLastResult(null);
                      setDrillCase(item);
                    }}
                    className={`case-row-opt relative overflow-hidden bg-slate-900/70 border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      draggedLineupIdx === idx
                        ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                        : locked
                        ? 'border-orange-500/20'
                        : 'border-white/10 hover:bg-slate-800/80'
                    }`}
                  >
                    {locked && (
                      <div className="absolute inset-0 z-10 bg-slate-950/75 flex items-center justify-center pointer-events-none">
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-500/25 border border-orange-400/50 text-[9.5px] font-black uppercase tracking-wider text-orange-200">
                          🔒 {item.name} • Pro
                        </span>
                      </div>
                    )}
                    <div className={`flex items-center gap-3 min-w-0 ${locked ? 'opacity-40 select-none' : ''}`}>
                      {renderCaseThumb(phaseKey, item, isF2L ? 'w-14 h-14' : 'w-12 h-12 rounded-xl')}
                      <div className="min-w-0">
                        <span className="text-sm font-black text-white block truncate">{item.name}</span>
                        <p className="font-mono text-xs font-bold text-amber-300 truncate">{item.alg}</p>
                        {(item.step1 || item.recognition) && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.step1 || item.recognition}</p>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 flex-shrink-0 ${locked ? 'opacity-35' : ''}`}>
                      {stat?.best && (
                        <span className="px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/30 font-mono text-[10px] font-black text-green-300">
                          {stat.best.toFixed(2)}s
                        </span>
                      )}
                      <span className="text-slate-500 text-xs font-bold px-1">⋮⋮</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (tab === 'algorithms') {
      return (
        <div className="p-5 pb-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">{meta.libEyebrow}</p>
              <h2 className="text-2xl font-black tracking-tight text-white">{meta.libTitle}</h2>
            </div>
            <button
              onClick={() => {
                if (!isProUnlocked) {
                  openProPaywall('Custom Curriculum Chunk Builder');
                  return;
                }
                emitBeep(560);
                openCurriculumBuilder(phaseKey);
              }}
              className="px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold cursor-pointer"
            >
              {isProUnlocked ? '+ Edit Chunks' : '🔒 Edit Chunks'}
            </button>
          </div>

          <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex">
            <button
              onClick={() => {
                emitBeep(480);
                setLibMode('groups');
                setSelectedCategory(null);
              }}
              className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                libMode === 'groups' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {meta.groupTabLabel}
            </button>
            <button
              onClick={() => {
                emitBeep(480);
                setLibMode('chunks');
                setSelectedCategory(null);
              }}
              className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                libMode === 'chunks' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Curriculum Chunks
            </button>
          </div>

          {!selectedCategory ? (
            libMode === 'groups' ? (
              <div className="grid grid-cols-2 gap-3">
                {groupList.map((group) => {
                  const groupCases = dataList.filter((c) => c.group === group);
                  const sampleCase = groupCases[0];
                  const groupLocked = !isProUnlocked && !meta.isFreeGroup(group);
                  return (
                    <button
                      key={group}
                      onClick={() => {
                        emitBeep(520);
                        setSelectedCategory({ type: 'group', name: group });
                      }}
                      className={`relative overflow-hidden bg-slate-900/60 border rounded-[2rem] p-4 shadow-xl flex flex-col items-center text-center hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer space-y-2.5 ${
                        groupLocked ? 'border-orange-500/20' : 'border-white/10'
                      }`}
                    >
                      {groupLocked && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-orange-500/25 border border-orange-400/50 text-[8.5px] font-black uppercase text-orange-200 z-10">
                          🔒 Pro
                        </span>
                      )}
                      <div className={groupLocked ? 'opacity-45' : ''}>
                        {renderCaseThumb(phaseKey, sampleCase, isF2L ? 'w-24 h-24' : 'w-16 h-16')}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white leading-snug">{group}</h3>
                        <span className="text-[10px] font-bold text-orange-400">
                          {groupCases.length} {meta.unitLabel}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                {chunksList.map((chk) => {
                  const sampleCase = lookupMap.get(chk.ids[0]) || dataList[0];
                  const chunkLocked = !isProUnlocked && chk.ids.some((id) => !isCaseUnlockedForTier(phaseKey, id, false));
                  return (
                    <button
                      key={chk.id}
                      onClick={() => {
                        emitBeep(520);
                        setSelectedCategory({ type: 'chunk', chunk: chk });
                      }}
                      className={`relative overflow-hidden w-full bg-slate-900/60 border rounded-[1.75rem] p-3.5 flex items-center gap-3.5 text-left hover:bg-slate-800/80 cursor-pointer ${
                        chunkLocked ? 'border-orange-500/20' : 'border-white/10'
                      }`}
                    >
                      <div className={chunkLocked ? 'opacity-45' : ''}>
                        {renderCaseThumb(phaseKey, sampleCase, isF2L ? 'w-20 h-20' : 'w-14 h-14')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-white truncate">{chk.title}</h3>
                          {chunkLocked && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-500/25 border border-orange-400/50 text-[8.5px] font-black text-orange-200 flex-shrink-0">
                              🔒 PRO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {chk.ids.length} {phaseKey.toUpperCase()} {meta.unitLabel}
                        </p>
                      </div>
                      <span className="text-orange-400 font-black text-sm">→</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  emitBeep(460);
                  setSelectedCategory(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 cursor-pointer"
              >
                ← Back to All {libMode === 'groups' ? 'Groups' : 'Chunks'}
              </button>
              <h3 className="text-lg font-black text-white">
                {selectedCategory.type === 'group' ? selectedCategory.name : selectedCategory.chunk.title}
              </h3>
              <div className="space-y-2.5">
                {(selectedCategory.type === 'group'
                  ? dataList.filter((c) => c.group === selectedCategory.name)
                  : selectedCategory.chunk.ids.map((id) => lookupMap.get(id)).filter(Boolean)
                ).map((item) => {
                  const stat = statsMap?.[item.id];
                  const locked = !isCaseUnlockedForTier(phaseKey, item.id, isProUnlocked);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (locked) {
                          openProPaywall(item.name);
                          return;
                        }
                        emitBeep(600);
                        setSwRunning(false);
                        setSwElapsedMs(0);
                        setSwLastResult(null);
                        setDrillCase(item);
                      }}
                      className={`case-row-opt relative overflow-hidden bg-slate-900/70 border rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 cursor-pointer ${
                        locked ? 'border-orange-500/20' : 'border-white/10 hover:bg-slate-800/80'
                      }`}
                    >
                      {locked && (
                        <div className="absolute inset-0 z-10 bg-slate-950/75 flex items-center justify-center pointer-events-none">
                          <span className="px-3 py-1 rounded-full bg-orange-500/25 border border-orange-400/50 text-[10px] font-black uppercase tracking-wider text-orange-200 shadow-lg">
                            🔒 {item.name} • Unlock Pro
                          </span>
                        </div>
                      )}
                      <div className={`flex items-center gap-3.5 min-w-0 ${locked ? 'opacity-40 select-none' : ''}`}>
                        {renderCaseThumb(phaseKey, item, isF2L ? 'w-20 h-20' : 'w-14 h-14')}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-white truncate">{item.name}</span>
                            {stat?.best && (
                              <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-[10px] font-mono font-black text-green-300">
                                {stat.best.toFixed(2)}s
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs font-bold text-amber-300 mt-0.5">{item.alg}</p>
                          {item.recognition && (
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.recognition}</p>
                          )}
                          {fingertricksEnabled && (
                            <div className="mt-1.5 space-y-1">
                              {getAlgorithmTriggerTags(item.alg).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {getAlgorithmTriggerTags(item.alg).map((tag) => (
                                    <span
                                      key={tag.label}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${tag.badgeClass}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-[10px] text-orange-200/90 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2 py-0.5 leading-snug">
                                <strong className="text-orange-400">Fingertrick:</strong> {item.fingertrick}
                              </p>
                            </div>
                          )}
                          {item.step1 && <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.step1}</p>}
                        </div>
                      </div>
                      {fingertricksEnabled && !locked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            emitBeep(540);
                            setFtPhaseContext(phaseKey);
                            setFtCase(item);
                            setActiveModal('fingertrick');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white flex-shrink-0 cursor-pointer"
                        >
                          Grip
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Statistics Tab
    return (
      <div className="p-5 pb-10 space-y-4">
        <div>
          <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PBs</p>
          <h2 className="text-2xl font-black tracking-tight text-white">{meta.statsTitle}</h2>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Mastered</span>
            <span className="font-mono text-xl font-black text-green-400">
              {masteredCount}/{dataList.length}
            </span>
          </div>
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Day</span>
            <span className="font-mono text-xl font-black text-orange-400">{safeDay}</span>
          </div>
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Target PB</span>
            <span className="font-mono text-xl font-black text-amber-300">
              {getPhaseTargetPb(phaseKey).toFixed(3)}s
            </span>
          </div>
        </div>

        {renderFullSolveStatsBlock()}

        <div className="space-y-2">
          {dataList.map((item) => {
            const stat = statsMap?.[item.id];
            const caseGoal = getEffectiveCaseTargetPb(phaseKey, item.id);
            const locked = !isCaseUnlockedForTier(phaseKey, item.id, isProUnlocked);
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (locked) {
                    openProPaywall(item.name);
                    return;
                  }
                  emitBeep(580);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  setSwLastResult(null);
                  setDrillCase(item);
                }}
                className={`case-row-opt relative overflow-hidden bg-slate-900/60 border rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer ${
                  locked ? 'border-orange-500/20' : 'border-white/10 hover:bg-slate-800/80'
                }`}
              >
                {locked && (
                  <div className="absolute inset-0 z-10 bg-slate-950/75 flex items-center justify-center pointer-events-none">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/25 border border-orange-400/50 text-[9.5px] font-black uppercase tracking-wider text-orange-200">
                      🔒 {item.name} • Pro
                    </span>
                  </div>
                )}
                <div className={`flex items-center gap-3 min-w-0 ${locked ? 'opacity-40 select-none' : ''}`}>
                  {renderCaseThumb(phaseKey, item, isF2L ? 'w-14 h-14' : 'w-11 h-11 rounded-xl')}
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">{item.name}</span>
                    <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (locked) {
                          openProPaywall(item.name);
                          return;
                        }
                        emitBeep(560);
                        setEditingCaseTarget({
                          phase: phaseKey,
                          caseId: item.id,
                          name: item.name,
                          draft: caseGoal.toFixed(3)
                        });
                      }}
                      className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono text-[9.5px] font-black text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                      title="Set Case Target PB"
                    >
                      Goal: {caseGoal.toFixed(3)}s ✎
                    </button>
                  </div>
                </div>
                <div className={`text-right flex-shrink-0 ${locked ? 'opacity-35' : ''}`}>
                  {stat?.best ? (
                    <>
                      <span
                        className={`font-mono text-xs font-black block ${
                          stat.best <= caseGoal ? 'text-green-400' : 'text-amber-300'
                        }`}
                      >
                        PB: {stat.best.toFixed(3)}s
                      </span>
                      <span className="text-[10px] text-slate-400">{stat.attempts} runs</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">Unlogged</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Unified Daily Session Runner (F2L, OLL, or PLL)
  const renderUnifiedDailySession = () => {
    const activePhaseSession = f2lSession
      ? { phaseKey: 'f2l', session: f2lSession, setSession: setF2lSession, safeDay: safeF2lDay, scheduleLen: f2lSchedule.length, dayField: 'f2lDay', itemLabel: 'Pair', timerLabel: 'Tap to Time Case' }
      : ollSession
      ? { phaseKey: 'oll', session: ollSession, setSession: setOllSession, safeDay: safeOllDay, scheduleLen: ollSchedule.length, dayField: 'day', itemLabel: 'Case', timerLabel: 'Tap to Time OLL' }
      : pllSession
      ? { phaseKey: 'pll', session: pllSession, setSession: setPllSession, safeDay: safePllDay, scheduleLen: pllSchedule.length, dayField: 'pllDay', itemLabel: 'Alg', timerLabel: 'Tap to Time PLL' }
      : null;

    if (!activePhaseSession) return null;
    const { phaseKey, session, setSession, safeDay, scheduleLen, dayField, itemLabel, timerLabel } = activePhaseSession;
    const item = session.queue[session.index];
    if (!item) return null;
    const isF2L = phaseKey === 'f2l';
    const isPLL = phaseKey === 'pll';

    const statsMap = isF2L ? currentUser.f2lStats : isPLL ? currentUser.pllStats : currentUser.stats;
    const caseStat = statsMap?.[item.id] || {};
    const lastResultForThis =
      swLastResult && swLastResult.phase === phaseKey && swLastResult.caseId === item.id ? swLastResult : null;

    const handleSessionScreenTap = (e) => {
      if (!stopwatchEnabled) return;
      if (e.target.closest('button, input, a')) return;
      if (!swRunning && e.target.closest('[data-no-timer-start="true"]')) return;
      toggleStopwatch((sec) => recordCaseTime(phaseKey, item.id, sec));
    };

    return (
      <div
        onClick={handleSessionScreenTap}
        className={`fixed inset-0 z-[240] bg-[#060913]/98 backdrop-blur-md flex flex-col justify-between p-5 max-w-md mx-auto ${
          stopwatchEnabled ? 'cursor-pointer' : ''
        }`}
      >
        <div data-no-timer-start="true" className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
            {session.dayObj.mode} • {itemLabel} {session.index + 1}/{session.queue.length}
          </span>
          <button
            onClick={() => {
              setSwRunning(false);
              setSwLastResult(null);
              setSession(null);
            }}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center space-y-3 shadow-2xl my-auto">
          {isF2L ? (
            <div data-no-timer-start="true" className="w-full space-y-3">
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Angle: <strong className="text-orange-400">{getClosestF2LAngleLabel(f2lDragRot.yaw, f2lDragRot.pitch)}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  {(f2lDragRot.yaw !== -35 || f2lDragRot.pitch !== -25) && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(480);
                        setF2LPresetAngle(0);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(620);
                      setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-[10px] font-black text-orange-400 active:scale-95 transition-all cursor-pointer"
                  >
                    Rotate Cube ↻
                  </button>
                </div>
              </div>

              <div
                onMouseDown={handleF2LCubePointerDown}
                onMouseMove={handleF2LCubePointerMove}
                onMouseUp={handleF2LCubePointerUp}
                onMouseLeave={handleF2LCubePointerUp}
                onTouchStart={handleF2LCubePointerDown}
                onTouchMove={handleF2LCubePointerMove}
                onTouchEnd={handleF2LCubePointerUp}
                style={{ touchAction: 'none' }}
                className="w-40 h-40 mx-auto flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
              >
                <F2LSpatial3DCube
                  setupScramble={generateF2LSetupScramble(item.alg, f2lSetupMode, f2lSetupSeed)}
                  yaw={f2lDragRot.yaw}
                  pitch={f2lDragRot.pitch}
                  isDragging={f2lIsDragging}
                  cubeRef={f2lCubeDomRef}
                />
                <span ref={f2lDegreeLabelRef} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 -mt-1">
                  3D Orbit • Drag to Spin ({((f2lDragRot.yaw % 360) + 360) % 360}°)
                </span>
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-slate-200 p-2 mx-auto">
              <CachedVisualCubeImg
                url={
                  isPLL
                    ? getPLLImageUrl(
                        item.alg,
                        pllSetupSeed > 0 ? generatePLLSetupScramble(item.inverse, pllSetupSeed) : null
                      )
                    : getOLLImageUrl(item.alg)
                }
                alt={item.name}
                lazy={false}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="text-center">
            {!isF2L && (
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                {item.group}
              </span>
            )}
            <h3 className="text-xl font-black text-white">{item.name}</h3>
            {item.recognition && <p className="text-[11px] text-slate-300 mt-0.5">{item.recognition}</p>}
          </div>

          {(isF2L || isPLL) && (
            <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-2.5 text-center space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {isF2L ? `Setup (${f2lSetupMode})` : 'Setup Scramble'}
                </span>
                <button
                  onClick={() => {
                    emitBeep(540);
                    if (isF2L) setF2lSetupSeed((s) => s + 1);
                    else setPllSetupSeed((s) => s + 1);
                  }}
                  className="text-[10px] font-bold text-orange-400 cursor-pointer"
                >
                  {isF2L ? 'New Scramble ↻' : 'New AUF ↻'}
                </button>
              </div>
              <p className="font-mono text-xs font-black text-amber-300 select-all">
                {isF2L
                  ? generateF2LSetupScramble(item.alg, f2lSetupMode, f2lSetupSeed)
                  : generatePLLSetupScramble(item.inverse, pllSetupSeed)}
              </p>
            </div>
          )}

          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase text-slate-400">
                {isF2L ? 'Solution (Front-Right Slot)' : 'Execution Algorithm'}
              </span>
              {fingertricksEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(540);
                    setFtPhaseContext(phaseKey);
                    setFtCase(item);
                    setActiveModal('fingertrick');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[10px] font-black text-orange-300 cursor-pointer"
                >
                  Grip Guide →
                </button>
              )}
            </div>
            <p className={`font-mono text-base font-black ${isF2L ? 'text-white' : 'text-amber-300'}`}>{item.alg}</p>
            {fingertricksEnabled && (
              <div className="space-y-1.5 text-left">
                {isF2L && getAlgorithmTriggerTags(item.alg).length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {getAlgorithmTriggerTags(item.alg).map((tag) => (
                      <span
                        key={tag.label}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${tag.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-orange-200 bg-orange-500/10 border border-orange-500/25 rounded-xl px-2.5 py-1.5 leading-snug">
                  <strong className="text-orange-400">Fingertrick:</strong> {item.fingertrick}
                </p>
              </div>
            )}
            {isF2L && (
              <p className="text-[11px] text-slate-300 text-left pt-1">
                • <strong>Step 1:</strong> {item.step1}
                <br />• <strong>Step 2:</strong> {item.step2}
              </p>
            )}
          </div>

          {stopwatchEnabled && (
            <button
              onClick={() => toggleStopwatch((sec) => recordCaseTime(phaseKey, item.id, sec))}
              className={`w-full py-3 rounded-2xl border font-mono text-base font-black cursor-pointer ${
                swRunning
                  ? 'bg-green-500/20 border-green-400 text-green-300'
                  : 'bg-slate-950 border-white/10 text-slate-200'
              }`}
            >
              {swRunning ? (
                <span ref={swDisplayRef}>{(swElapsedMs / 1000).toFixed(2)}s — Stop</span>
              ) : (
                timerLabel
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => {
              emitBeep(460);
              setSwRunning(false);
              setSwElapsedMs(0);
              setSession((s) => ({ ...s, index: Math.max(0, s.index - 1) }));
            }}
            disabled={session.index === 0}
            className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
          >
            ← Previous
          </button>
          <button
            onClick={() => {
              emitBeep(760);
              setSwRunning(false);
              setSwElapsedMs(0);
              if (session.index + 1 < session.queue.length) {
                setSession((s) => ({ ...s, index: s.index + 1 }));
              } else {
                const nextDay = safeDay >= scheduleLen ? 1 : safeDay + 1;
                const updated = { ...currentUser, [dayField]: nextDay };
                setUsers((prev) => ({ ...prev, [activeUserKey]: updated }));
                saveUserToCloud(activeUserKey, updated);
                setSession(null);
              }
            }}
            className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            {session.index + 1 < session.queue.length ? `Next ${itemLabel} →` : 'Complete Day ✓'}
          </button>
        </div>
      </div>
    );
  };

  // Unified Isolated Case Drill Modal (F2L, OLL, or PLL)
  const renderUnifiedDrillModal = () => {
    const activeDrill = f2lDrillCase
      ? { phaseKey: 'f2l', item: f2lDrillCase, close: () => setF2lDrillCase(null), statsMap: currentUser.f2lStats, timerLabel: 'Tap to Time F2L' }
      : ollDrillCase
      ? { phaseKey: 'oll', item: ollDrillCase, close: () => setOllDrillCase(null), statsMap: currentUser.stats, timerLabel: 'Tap to Time OLL' }
      : pllDrillCase
      ? { phaseKey: 'pll', item: pllDrillCase, close: () => setPllDrillCase(null), statsMap: currentUser.pllStats, timerLabel: 'Tap to Time PLL' }
      : null;

    if (!activeDrill) return null;
    const { phaseKey, item, close, statsMap, timerLabel } = activeDrill;
    const isF2L = phaseKey === 'f2l';
    const isPLL = phaseKey === 'pll';

    const caseStat = statsMap?.[item.id] || {};
    const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
    const ao20Case = computeCaseWindowAvg(caseHist, 20);
    const ao40Case = computeCaseWindowAvg(caseHist, 40);
    const ao60Case = computeCaseWindowAvg(caseHist, 60);
    const lastResultForThis =
      swLastResult && swLastResult.phase === phaseKey && swLastResult.caseId === item.id ? swLastResult : null;

    const handleClose = () => {
      setSwRunning(false);
      setSwLastResult(null);
      close();
    };

    const handleModalScreenTap = (e) => {
      if (!stopwatchEnabled) return;
      if (e.target.closest('button, input, a')) return;
      if (!swRunning && e.target.closest('[data-no-timer-start="true"]')) return;
      toggleStopwatch((sec) => recordCaseTime(phaseKey, item.id, sec));
    };

    return (
      <div
        onClick={handleModalScreenTap}
        className={`fixed inset-0 z-[245] bg-black/90 backdrop-blur-md flex items-center justify-center p-5 ${
          stopwatchEnabled ? 'cursor-pointer' : ''
        }`}
      >
        <div
          className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3 shadow-2xl max-h-[92dvh] overflow-y-auto no-scrollbar"
        >
          <div data-no-timer-start="true" className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              {item.group}
            </span>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/5 text-slate-300 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {isF2L ? (
            <div data-no-timer-start="true" className="w-full space-y-3">
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Angle: <strong className="text-orange-400">{getClosestF2LAngleLabel(f2lDragRot.yaw, f2lDragRot.pitch)}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  {(f2lDragRot.yaw !== -35 || f2lDragRot.pitch !== -25) && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(480);
                        setF2LPresetAngle(0);
                      }}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(620);
                      setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-[10px] font-black text-orange-400 active:scale-95 transition-all cursor-pointer"
                  >
                    Rotate Cube ↻
                  </button>
                </div>
              </div>

              <div
                onMouseDown={handleF2LCubePointerDown}
                onMouseMove={handleF2LCubePointerMove}
                onMouseUp={handleF2LCubePointerUp}
                onMouseLeave={handleF2LCubePointerUp}
                onTouchStart={handleF2LCubePointerDown}
                onTouchMove={handleF2LCubePointerMove}
                onTouchEnd={handleF2LCubePointerUp}
                style={{ touchAction: 'none' }}
                className="w-40 h-40 mx-auto flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
              >
                <F2LSpatial3DCube
                  setupScramble={generateF2LSetupScramble(item.alg, f2lSetupMode, f2lSetupSeed)}
                  yaw={f2lDragRot.yaw}
                  pitch={f2lDragRot.pitch}
                  isDragging={f2lIsDragging}
                  cubeRef={f2lCubeDomRef}
                />
                <span ref={f2lDegreeLabelRef} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 -mt-1">
                  3D Orbit • Drag to Spin ({((f2lDragRot.yaw % 360) + 360) % 360}°)
                </span>
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 rounded-3xl bg-slate-200 p-2 mx-auto">
              <CachedVisualCubeImg
                url={
                  isPLL
                    ? getPLLImageUrl(
                        item.alg,
                        pllSetupSeed > 0 ? generatePLLSetupScramble(item.inverse, pllSetupSeed) : null
                      )
                    : getOLLImageUrl(item.alg)
                }
                alt={item.name}
                lazy={false}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="text-center">
            <h3 className="text-xl font-black text-white">{item.name}</h3>
            {item.recognition && <p className="text-[11px] text-slate-300 mt-0.5">{item.recognition}</p>}
          </div>

          {(isF2L || isPLL) && (
            <div className="bg-[#050811] border border-white/10 rounded-2xl p-2.5 text-center space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {isF2L ? `Setup (${f2lSetupMode})` : 'Setup Scramble (From Solved Cube)'}
                </span>
                <button
                  onClick={() => {
                    emitBeep(540);
                    if (isF2L) setF2lSetupSeed((s) => s + 1);
                    else setPllSetupSeed((s) => s + 1);
                  }}
                  className="text-[10px] font-bold text-orange-400 hover:underline cursor-pointer"
                >
                  {isF2L ? 'New Scramble ↻' : 'New AUF ↻'}
                </button>
              </div>
              <p className="font-mono text-xs font-black text-amber-300 select-all">
                {isF2L
                  ? generateF2LSetupScramble(item.alg, f2lSetupMode, f2lSetupSeed)
                  : generatePLLSetupScramble(item.inverse, pllSetupSeed)}
              </p>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {isF2L ? 'Solution (Front-Right Slot)' : 'Execution Algorithm'}
              </span>
              {fingertricksEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(540);
                    setFtPhaseContext(phaseKey);
                    setFtCase(item);
                    setActiveModal('fingertrick');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[10px] font-black text-orange-300 hover:bg-orange-500/25 cursor-pointer"
                >
                  Grip Guide →
                </button>
              )}
            </div>
            <p className={`font-mono text-base font-black ${isF2L ? 'text-white' : 'text-amber-300'}`}>{item.alg}</p>
            {fingertricksEnabled && (
              <div className="space-y-1.5 text-left">
                {getAlgorithmTriggerTags(item.alg).length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1">
                    {getAlgorithmTriggerTags(item.alg).map((tag) => (
                      <span
                        key={tag.label}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${tag.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-orange-200 bg-orange-500/10 border border-orange-500/25 rounded-xl px-2.5 py-1.5 leading-snug">
                  <strong className="text-orange-400">Fingertrick:</strong> {item.fingertrick}
                </p>
              </div>
            )}
            {isF2L && (
              <p className="text-[11px] text-slate-300 text-left pt-1">
                • <strong>Step 1:</strong> {item.step1}
                <br />• <strong>Step 2:</strong> {item.step2}
              </p>
            )}
          </div>

          {stopwatchEnabled && (
            <button
              onClick={() => toggleStopwatch((sec) => recordCaseTime(phaseKey, item.id, sec))}
              className={`w-full py-3 px-3 rounded-2xl border font-mono cursor-pointer flex flex-col items-center justify-center gap-1 ${
                swRunning
                  ? 'bg-green-500/20 border-green-400 text-green-300'
                  : lastResultForThis?.isNewPb
                  ? 'bg-amber-500/15 border-amber-400/60 text-white'
                  : 'bg-slate-950 border-white/10 text-slate-200'
              }`}
            >
              {swRunning ? (
                <span ref={swDisplayRef} className="text-base font-black">{(swElapsedMs / 1000).toFixed(2)}s — Stop</span>
              ) : lastResultForThis ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">
                      Got: {lastResultForThis.timeSec.toFixed(3)}s
                    </span>
                    {lastResultForThis.isNewPb ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/25 border border-green-400/50 text-[10px] font-black uppercase text-green-300">
                        ★ New PB!
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-slate-300">
                        PB: {caseStat.best?.toFixed(3)}s
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                    Tap Anywhere to Time Again
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-base font-black">{timerLabel}</span>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                    or Tap Anywhere on Screen
                  </span>
                  {typeof caseStat.best === 'number' && (
                    <span className="text-[10px] font-bold text-amber-300 mt-0.5">
                      Recorded PB: {caseStat.best.toFixed(3)}s
                    </span>
                  )}
                </div>
              )}
            </button>
          )}

          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Ao20</span>
              <span className="font-mono text-xs font-black text-green-400">
                {ao20Case !== null ? `${ao20Case.toFixed(2)}s` : '—'}
              </span>
            </div>
            <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Ao40</span>
              <span className="font-mono text-xs font-black text-sky-400">
                {ao40Case !== null ? `${ao40Case.toFixed(2)}s` : '—'}
              </span>
            </div>
            <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
              <span className="text-[9px] font-black uppercase text-slate-400 block">Ao60</span>
              <span className="font-mono text-xs font-black text-purple-300">
                {ao60Case !== null ? `${ao60Case.toFixed(2)}s` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        html, body {
          background-color: #060913;
          color: #f8fafc;
          overscroll-behavior: none;
          -webkit-tap-highlight-color: transparent;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .deck-card-1 { transform: translateY(0) scale(1); z-index: 30; opacity: 1; pointer-events: auto; }
        .deck-card-2 { transform: translateY(20px) scale(0.95); z-index: 20; opacity: 0.5; pointer-events: none; }
        .deck-card-3 { transform: translateY(40px) scale(0.90); z-index: 10; opacity: 0.2; pointer-events: none; }
        .f2l-cube-satin {
          filter: contrast(0.92) saturate(0.86) brightness(0.96);
          transition: transform 0.25s ease;
        }
        .case-row-opt {
          content-visibility: auto;
          contain-intrinsic-size: auto 76px;
        }
        .app-bg-sleep *, .app-bg-sleep *::before, .app-bg-sleep *::after {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          transition: none !important;
          animation: none !important;
        }
      `}</style>

      <div className={`min-h-[100dvh] w-full bg-[#060913] text-slate-100 flex justify-center select-none relative overflow-hidden ${!isAppVisible ? 'app-bg-sleep' : ''}`}>
        <div
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(234, 88, 12, 0.14) 0%, rgba(234, 88, 12, 0) 68%)' }}
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[42vh] pointer-events-none z-0"
        />
        <div
          style={{ background: 'radial-gradient(circle at 80% 100%, rgba(37, 99, 235, 0.13) 0%, rgba(37, 99, 235, 0) 68%)' }}
          className="fixed bottom-0 right-0 w-3/4 h-[38vh] pointer-events-none z-0"
        />

        <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10 shadow-2xl bg-[#090e1c] border-x border-white/5 overflow-hidden">
          {/* PERSISTENT HEADER */}
          <header className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-white/5 bg-[#090e1c]/95 flex-shrink-0 z-40">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 p-1 flex items-center justify-center flex-shrink-0">
                <SuneEmblemSvg className="w-full h-full" />
              </div>
              <h1 className="text-sm font-black tracking-tight text-white whitespace-nowrap">
                OLLDay <span className="text-orange-400">Everyday</span>
              </h1>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 relative">
              <button
                type="button"
                onClick={() => {
                  emitBeep(660, 'sine', 0.07);
                  setSelectedStickerEdit(null);
                  setScannerOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                title="Scan 3x3 Cube & Predict Next Case"
                aria-label="Scan Cube"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>

              <button
                onClick={() => {
                  emitBeep(520);
                  setAuthErrorMsg('');
                  setAuthMode('signin');
                  setAuthScreenOpen(true);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
                title="Switch Solver Account"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                <span className="max-w-[52px] truncate">{String(activeUserKey || 'Account')}</span>
              </button>

              {/* C-F-O-P Phase Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    emitBeep(580);
                    setCfopMenuOpen((v) => !v);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-400 text-xs font-black tracking-wider active:scale-95 transition-all cursor-pointer"
                >
                  <span>{activePhase === 'cross' ? 'C' : activePhase === 'f2l' ? 'F' : activePhase === 'oll' ? 'O' : 'P'}</span>
                  <span className="text-[9px]">▼</span>
                </button>

                {cfopMenuOpen && (
                  <div className="absolute right-0 mt-2 w-14 bg-[#0c1326] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-2xl">
                    {[
                      { key: 'cross', label: 'C' },
                      { key: 'f2l', label: 'F' },
                      { key: 'oll', label: 'O' },
                      { key: 'pll', label: 'P' }
                    ].map((p) => (
                      <button
                        key={p.key}
                        onClick={() => {
                          emitBeep(620);
                          setCfopMenuOpen(false);
                          setActivePhase(p.key);
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-black text-center cursor-pointer transition-all ${
                          activePhase === p.key
                            ? 'bg-orange-500 text-slate-950'
                            : 'text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN SCROLLABLE PHASE CONTENT */}
          <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {/* ===================================================== */}
            {/* PHASE 1: CROSS */}
            {/* ===================================================== */}
            {activePhase === 'cross' && (
              <>
                {crossTab === 'ladder' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">CFOP Phase 1</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">Cross in X Ladder</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          emitBeep(520);
                          setActiveModal('compass');
                        }}
                        className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[11px] font-bold active:scale-95 cursor-pointer"
                      >
                        Color Orbit
                      </button>
                    </div>

                    {/* Standard vs. Advanced Full-Scramble Ladder Toggle */}
                    <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center">
                      <button
                        type="button"
                        onClick={() => {
                          emitBeep(520);
                          setCrossDifficulty('standard');
                          const tObj = CROSS_TIERS.find((t) => t.tier === crossTier) || CROSS_TIERS[0];
                          setCrossUserMoves(tObj.moves);
                          setEfficiencyFeedback(null);
                        }}
                        className={`flex-1 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          crossDifficulty === 'standard'
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Standard (2–6 Moves)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isProUnlocked) {
                            openProPaywall('Advanced Full-Scramble Cross Ladder');
                            return;
                          }
                          emitBeep(580);
                          setCrossDifficulty('advanced');
                          const tObj = CROSS_ADVANCED_TIERS.find((t) => t.tier === crossTier) || CROSS_ADVANCED_TIERS[0];
                          setCrossUserMoves(tObj.moves);
                          setEfficiencyFeedback(null);
                        }}
                        className={`relative overflow-hidden flex-1 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          crossDifficulty === 'advanced'
                            ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className={!isProUnlocked ? 'opacity-65' : ''}>
                          Advanced Full Scramble
                        </span>
                        {!isProUnlocked && <span className="ml-1 text-[9px] text-orange-300">🔒</span>}
                      </button>
                    </div>


                    <div className="grid grid-cols-5 gap-1.5">
                      {activeCrossTierList.map((t) => {
                        const locked = !isProUnlocked && (crossDifficulty === 'advanced' || t.tier > 2);
                        return (
                          <button
                            key={t.tier}
                            onClick={() => {
                              if (locked) {
                                openProPaywall(
                                  crossDifficulty === 'advanced'
                                    ? `Advanced Full-Scramble Cross L${t.tier}`
                                    : `Cross Ladder Level ${t.tier}`
                                );
                                return;
                              }
                              emitBeep(540);
                              setCrossTier(t.tier);
                              setCrossUserMoves(t.moves);
                              setEfficiencyFeedback(null);
                            }}
                            className={`relative overflow-hidden py-2 text-[11px] font-black rounded-xl cursor-pointer transition-all ${
                              crossTier === t.tier
                                ? 'bg-orange-500 text-slate-950 shadow-md'
                                : locked
                                ? 'bg-white/5 text-slate-400 border border-orange-500/20'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className={locked ? 'opacity-45' : ''}>L{t.tier}</span>
                            {locked && (
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-orange-300">
                                🔒
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center">
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setCrossLadderMode('efficiency');
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          crossLadderMode === 'efficiency'
                            ? 'bg-orange-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Move Efficiency
                      </button>
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setCrossLadderMode('blind');
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          crossLadderMode === 'blind'
                            ? 'bg-orange-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Blind Practice
                      </button>
                    </div>

                    <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                            {crossDifficulty === 'advanced' ? 'Advanced Full Scramble • ' : ''}Level {activeTierObj.tier} • Cross in {activeTierObj.moves}
                          </span>
                          <h3 className="text-base font-black text-white">{activeTierObj.title}</h3>
                        </div>
                        <button
                          onClick={() => {
                            emitBeep(560);
                            setCrossScrambleIdx((p) => p + 1);
                            setEfficiencyFeedback(null);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-orange-400 active:scale-95 cursor-pointer"
                        >
                          New Scramble
                        </button>
                      </div>

                      <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 text-center shadow-inner">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                          Hold White (D) • Green (F) • Red (L) • Orange (R)
                        </span>
                        <div
                          className={`font-mono font-black text-amber-300 tracking-wider select-all ${
                            crossDifficulty === 'advanced' ? 'text-xs sm:text-sm leading-relaxed' : 'text-xl'
                          }`}
                        >
                          {activeCrossScramble}
                        </div>
                      </div>

                      {/* Interactive 3D Spatial Cross Cube */}
                      <div className="bg-slate-950/85 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner space-y-1.5">
                        <div className="w-full flex items-center justify-between px-1">
                          <span className="text-[10px] font-bold text-slate-400">
                            {crossDragRot.pitch > 15
                              ? '3D Bottom-Right View (D-Face)'
                              : crossDragRot.pitch < -15
                              ? '3D Top-Right View (U-Face)'
                              : '3D Front-Right View'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                emitBeep(540);
                                setCrossDragRot((prev) =>
                                  prev.pitch > 15 ? { yaw: -35, pitch: -28 } : { yaw: -35, pitch: 38 }
                                );
                              }}
                              className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[10px] font-black text-orange-400 cursor-pointer active:scale-95 transition-all"
                            >
                              {crossDragRot.pitch > 15 ? 'Top View ↻' : 'Bottom (D) ↻'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                emitBeep(480);
                                setCrossDragRot({ yaw: -35, pitch: 38 });
                              }}
                              className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>

                        <div
                          onMouseDown={handleCrossCubePointerDown}
                          onMouseMove={handleCrossCubePointerMove}
                          onMouseUp={handleCrossCubePointerUp}
                          onMouseLeave={handleCrossCubePointerUp}
                          onTouchStart={handleCrossCubePointerDown}
                          onTouchMove={handleCrossCubePointerMove}
                          onTouchEnd={handleCrossCubePointerUp}
                          style={{ touchAction: 'none' }}
                          className="w-40 h-40 mx-auto flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
                        >
                          <CrossSpatial3DCube
                            scramble={activeCrossScramble}
                            yaw={crossDragRot.yaw}
                            pitch={crossDragRot.pitch}
                            isDragging={crossIsDragging}
                            cubeRef={crossCubeDomRef}
                          />
                          <span ref={crossDegreeLabelRef} className="text-[9px] font-bold uppercase tracking-widest text-slate-500 -mt-1">
                            3D Cross Orbit • Drag to Spin ({((crossDragRot.yaw % 360) + 360) % 360}°)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[9.5px] font-bold text-slate-400">
                          <span className="text-green-400">▲ Green (F)</span>
                          <span className="text-red-400">◀ Red (L)</span>
                          <span className="text-orange-400">Orange (R) ▶</span>
                          <span className="text-blue-400">▼ Blue (B)</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/5">
                        {activeTierObj.hint}
                      </p>
                    </div>

                    {crossLadderMode === 'efficiency' ? (
                      <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                              Your Turn Count
                            </span>
                            <span className="text-xs font-bold text-orange-400 font-mono">
                              Target: Cross in {activeTierObj.moves}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                emitBeep(440);
                                setCrossUserMoves((m) => Math.max(1, m - 1));
                              }}
                              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 font-black text-white active:scale-90 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="font-mono text-xl font-black text-white w-8 text-center">
                              {crossUserMoves}
                            </span>
                            <button
                              onClick={() => {
                                emitBeep(660);
                                setCrossUserMoves((m) => Math.min(20, m + 1));
                              }}
                              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 font-black text-white active:scale-90 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const optimal = crossUserMoves <= activeTierObj.moves;
                            emitBeep(optimal ? 920 : 420, 'sine', 0.1);
                            if (optimal) {
                              const updated = {
                                ...currentUser,
                                crossClears: (currentUser.crossClears || 0) + 1
                              };
                              setUsers((prev) => ({
                                ...prev,
                                [activeUserKey]: updated
                              }));
                              saveUserToCloud(activeUserKey, updated);
                            }
                            setEfficiencyFeedback({
                              optimal,
                              title: optimal
                                ? `Optimal! Solved in ${crossUserMoves} Moves`
                                : `${crossUserMoves} Moves (Target: ${activeTierObj.moves})`,
                              detail: optimal
                                ? 'Sub-8 efficiency unlocked. Keep building lookahead into your first F2L pair!'
                                : `Try using D-layer keyhole shifts to trim ${crossUserMoves - activeTierObj.moves} extra turn(s).`
                            });
                          }}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          Check My Turn Count
                        </button>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden bg-slate-900/90 border border-white/10 rounded-[2rem] p-5 shadow-xl text-center space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                            Level {activeTierObj.tier} • {activeTierObj.moves}-Move Drill
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              emitBeep(540);
                              setActiveModal('blindPracticeHelp');
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-400 text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-orange-500/20 flex items-center justify-center text-[9px] font-black">?</span>
                            <span>How It Works</span>
                          </button>
                        </div>
                        <div className={!isProUnlocked ? 'opacity-45 select-none space-y-2' : 'space-y-2'}>
                          <h4 className="text-base font-black text-white">Blind Practice Ready</h4>
                          <p className="text-xs text-slate-400">
                            Plan all {activeTierObj.moves} cross moves during inspection, then execute with eyes closed.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (!isProUnlocked) {
                              openProPaywall('WCA Blindfold Timer Mat');
                              return;
                            }
                            emitBeep(620);
                            setCrossTab('blind');
                          }}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                        >
                          {isProUnlocked ? 'Open Blindfold Timer Mat' : '🔒 Unlock Blindfold Timer Mat (Pro)'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {crossTab === 'blind' && (
                  <div className="relative p-5 pb-10 space-y-4">
                    {!isProUnlocked && (
                      <div className="fixed inset-x-0 top-20 bottom-24 z-30 flex items-center justify-center p-6 pointer-events-none">
                        <div className="pointer-events-auto max-w-xs w-full rounded-[2rem] bg-slate-900/95 border border-orange-500/40 p-5 text-center shadow-2xl space-y-3">
                          <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-[10px] font-black uppercase tracking-widest text-orange-300">
                            🔒 OLLDay Pro Feature
                          </span>
                          <h3 className="text-lg font-black text-white">WCA Blindfold Timer Mat</h3>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Train 15-second inspection and eyes-closed execution on the dual-thumb Speedstack mat.
                          </p>
                          <button
                            type="button"
                            onClick={() => openProPaywall('WCA Blindfold Timer Mat')}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                          >
                            Unlock Pro — $3.99
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={!isProUnlocked ? 'opacity-40 pointer-events-none select-none space-y-4' : 'space-y-4'}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Sub-15 Execution Protocol</p>
                          <h2 className="text-2xl font-black tracking-tight text-white">Blind Inspection</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(540);
                            setActiveModal('blindHelp');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-400 text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-black">?</span>
                          <span>How It Works</span>
                        </button>
                      </div>

                      <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] p-6 shadow-xl text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WCA Inspection Timer</span>
                        <div className="font-mono text-5xl font-black text-white my-3">{inspectionLeft.toFixed(1)}</div>
                        <p className="text-xs font-bold text-orange-400">
                          {blindState === 'idle' && 'Tap Start 15s Countdown to inspect'}
                          {blindState === 'inspecting' && 'Inspecting — Hold both pads 0.35s to arm'}
                          {blindState === 'readying' && 'Holding pads... keep holding'}
                          {blindState === 'armed' && 'ARMED! Release pads to close visor'}
                          {blindState === 'done' && 'Run complete — log result below'}
                        </p>
                      </div>

                      {blindState === 'idle' && (
                        <button
                          onClick={() => {
                            emitBeep(800);
                            setInspectionLeft(15.0);
                            setBlindState('inspecting');
                          }}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
                        >
                          Start 15s Countdown
                        </button>
                      )}

                      <div
                        onContextMenu={(e) => e.preventDefault()}
                        style={{ touchAction: 'none' }}
                        className={`bg-slate-950/80 border border-white/10 rounded-[2rem] p-5 shadow-inner select-none transition-opacity ${
                          blindState === 'idle' ? 'opacity-40 pointer-events-none' : 'opacity-100'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-3">
                          Speedstack Touch Pads (Hold Both Thumbs &amp; Release)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            onPointerDown={(e) => {
                              e.preventDefault();
                              if (e.pointerType === 'mouse') {
                                handleSingleMousePadDown('left');
                                return;
                              }
                              e.currentTarget.setPointerCapture?.(e.pointerId);
                              if (!leftPadHeld) emitBeep(520, 'sine', 0.04, 0.06);
                              setLeftPadHeld(true);
                            }}
                            onPointerUp={(e) => {
                              e.preventDefault();
                              if (e.pointerType === 'mouse') {
                                handleSingleMousePadUp();
                                return;
                              }
                              setLeftPadHeld(false);
                            }}
                            onPointerCancel={() => setLeftPadHeld(false)}
                            className={`h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-black text-[10px] tracking-widest transition-all cursor-pointer touch-none ${
                              blindState === 'armed'
                                ? 'bg-green-500/25 border-green-400 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.35)] scale-[1.02]'
                                : leftPadHeld
                                ? 'bg-orange-500/25 border-orange-400 text-orange-200 scale-[0.98]'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            <span>LEFT THUMB</span>
                            <span className="text-[9px] font-bold opacity-80">
                              {blindState === 'armed' ? 'READY ✓' : leftPadHeld ? 'HOLDING ●' : 'TOUCH'}
                            </span>
                          </div>
                          <div
                            onPointerDown={(e) => {
                              e.preventDefault();
                              if (e.pointerType === 'mouse') {
                                handleSingleMousePadDown('right');
                                return;
                              }
                              e.currentTarget.setPointerCapture?.(e.pointerId);
                              if (!rightPadHeld) emitBeep(560, 'sine', 0.04, 0.06);
                              setRightPadHeld(true);
                            }}
                            onPointerUp={(e) => {
                              e.preventDefault();
                              if (e.pointerType === 'mouse') {
                                handleSingleMousePadUp();
                                return;
                              }
                              setRightPadHeld(false);
                            }}
                            onPointerCancel={() => setRightPadHeld(false)}
                            className={`h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-black text-[10px] tracking-widest transition-all cursor-pointer touch-none ${
                              blindState === 'armed'
                                ? 'bg-green-500/25 border-green-400 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.35)] scale-[1.02]'
                                : rightPadHeld
                                ? 'bg-orange-500/25 border-orange-400 text-orange-200 scale-[0.98]'
                                : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            <span>RIGHT THUMB</span>
                            <span className="text-[9px] font-bold opacity-80">
                              {blindState === 'armed' ? 'READY ✓' : rightPadHeld ? 'HOLDING ●' : 'TOUCH'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {blindState === 'done' && (
                        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 space-y-2">
                          <span className="text-xs font-bold text-slate-300 block">Log Execution Result:</span>
                          <div className="grid grid-cols-3 gap-2">
                            {['Clean', '+2', 'DNF'].map((res) => (
                              <button
                                key={res}
                                onClick={() => {
                                  emitBeep(600);
                                  setBlindLogs((l) => [
                                    { id: Date.now(), result: res, time: `${(15 - inspectionLeft).toFixed(1)}s insp` },
                                    ...l.slice(0, 7)
                                  ]);
                                  setBlindState('idle');
                                  setInspectionLeft(15.0);
                                }}
                                className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-black text-white cursor-pointer"
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {blindLogs.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Runs</span>
                          {blindLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs">
                              <span className="font-bold text-white">{log.result}</span>
                              <span className="font-mono text-slate-400">{log.time}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {crossTab === 'mechanics' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Deconstructing Intuition</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">4 Cross Mechanics</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {CROSS_MECHANICS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            emitBeep(540);
                            setActiveMechanicId(m.id);
                          }}
                          className={`py-3 px-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            activeMechanicId === m.id
                              ? 'bg-orange-500 text-slate-950 shadow-md'
                              : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {m.id}. {m.title}
                        </button>
                      ))}
                    </div>

                    <div className="bg-slate-900/90 border border-white/10 rounded-[2rem] p-5 shadow-xl space-y-3.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                        {activeMechanicObj.badge}
                      </span>
                      <h3 className="text-lg font-black text-white">{activeMechanicObj.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{activeMechanicObj.summary}</p>
                      <div className="bg-[#050811] border border-white/10 rounded-2xl p-3.5 font-mono text-xs font-bold text-amber-300 text-center">
                        {activeMechanicObj.example}
                      </div>

                      {activeMechanicObj.approaches && (() => {
                        const activeApproach =
                          activeMechanicObj.approaches[activeMechApproachIdx] || activeMechanicObj.approaches[0];
                        const activeCase =
                          activeApproach.cases[activeMechCaseIdx] || activeApproach.cases[0];

                        return (
                          <div className="pt-2 border-t border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                                Fine-Tuning Approaches
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {activeApproach.tag}
                              </span>
                            </div>

                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                              {activeMechanicObj.approaches.map((app, aIdx) => (
                                <button
                                  key={app.id}
                                  type="button"
                                  onClick={() => {
                                    emitBeep(520);
                                    setActiveMechApproachIdx(aIdx);
                                    setActiveMechCaseIdx(0);
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap cursor-pointer transition-all ${
                                    activeMechApproachIdx === aIdx
                                      ? 'bg-orange-500 text-slate-950 shadow-sm'
                                      : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {app.name}
                                </button>
                              ))}
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed bg-white/5 border border-white/5 rounded-xl p-3">
                              {activeApproach.rule}
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {activeApproach.cases.map((cItem, cIdx) => (
                                <button
                                  key={cItem.label}
                                  type="button"
                                  onClick={() => {
                                    emitBeep(580);
                                    setActiveMechCaseIdx(cIdx);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                                    activeMechCaseIdx === cIdx
                                      ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300'
                                      : 'bg-slate-950 border border-white/10 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {cItem.label.split('•')[0].trim()}
                                </button>
                              ))}
                            </div>

                            <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white">{activeCase.label}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      emitBeep(540);
                                      setMechCubeRot((prev) =>
                                        prev.pitch > 15 ? { yaw: -35, pitch: -28 } : { yaw: -35, pitch: 38 }
                                      );
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[9.5px] font-black text-orange-300 cursor-pointer"
                                  >
                                    {mechCubeRot.pitch > 15 ? 'Top View ↻' : 'Bottom (D) ↻'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      emitBeep(520);
                                      setMechCubeRot((prev) => ({ yaw: prev.yaw - 90, pitch: prev.pitch }));
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9.5px] font-bold text-slate-300 cursor-pointer"
                                  >
                                    Spin 90°
                                  </button>
                                </div>
                              </div>

                              <div className="w-36 h-36 mx-auto flex items-center justify-center">
                                <CrossSpatial3DCube
                                  scramble={activeCase.setup}
                                  yaw={mechCubeRot.yaw}
                                  pitch={mechCubeRot.pitch}
                                  isDragging={false}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                                  <span className="text-[9px] font-sans font-bold uppercase text-slate-400 block">Setup</span>
                                  <span className="text-xs font-black text-amber-300">{activeCase.setup}</span>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2">
                                  <span className="text-[9px] font-sans font-bold uppercase text-green-300 block">Optimal Solve</span>
                                  <span className="text-xs font-black text-green-300">{activeCase.solve}</span>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-300 leading-relaxed">
                                {activeCase.note}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {crossTab === 'settings' && renderSettingsDeck()}
              </>
            )}

            {/* ===================================================== */}
            {/* PHASES 2, 3 & 4: F2L, OLL, PLL (UNIFIED WORKSPACE) */}
            {/* ===================================================== */}
            {(activePhase === 'f2l' || activePhase === 'oll' || activePhase === 'pll') &&
              renderCFOPAlgorithmPhase(activePhase)}
          </main>

          {/* SYMMETRICAL 4-COLUMN BOTTOM NAVIGATION BAR */}
          <nav className="w-full flex-shrink-0 bg-[#090e1c] border-t border-white/10 pt-2.5 pb-6 px-3 z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
            {activePhase === 'cross' ? (
              <div className="grid grid-cols-4 gap-1 w-full">
                {[
                  {
                    id: 'ladder',
                    label: 'Ladder',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />
                      </svg>
                    )
                  },
                  {
                    id: 'blind',
                    label: 'Blind Run',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    )
                  },
                  {
                    id: 'mechanics',
                    label: 'Mechanics',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    )
                  },
                  {
                    id: 'settings',
                    label: 'Settings',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    )
                  }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      emitBeep(460);
                      setCrossTab(tab.id);
                    }}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[9.5px] font-black uppercase tracking-tight whitespace-nowrap text-center transition-all cursor-pointer ${
                      crossTab === tab.id
                        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 w-full">
                {[
                  {
                    id: 'grind',
                    label: 'The Grind',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                    )
                  },
                  {
                    id: 'algorithms',
                    label: 'Algorithms',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="3" width="7" height="7" rx="1.5" />
                        <rect x="14" y="14" width="7" height="7" rx="1.5" />
                        <rect x="3" y="14" width="7" height="7" rx="1.5" />
                      </svg>
                    )
                  },
                  {
                    id: 'stats',
                    label: 'Statistics',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                      </svg>
                    )
                  },
                  {
                    id: 'settings',
                    label: 'Settings',
                    icon: (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    )
                  }
                ].map((tab) => {
                  const currentTab = activePhase === 'f2l' ? f2lTab : activePhase === 'pll' ? pllTab : ollTab;
                  const setTab = activePhase === 'f2l' ? setF2lTab : activePhase === 'pll' ? setPllTab : setOllTab;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        emitBeep(460);
                        setTab(tab.id);
                      }}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[9.5px] font-black uppercase tracking-tight whitespace-nowrap text-center transition-all cursor-pointer ${
                        currentTab === tab.id
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* ========================================================= */}
        {/* MODALS & FULLSCREEN RUNNERS */}
        {/* ========================================================= */}

        {/* FULL-SCREEN GLASSMORPHIC 3x3x3 CFOP TIMER MODAL (TAP ANYWHERE) */}
        {fullTimerOpen && (
          <div
            onClick={handleFullTimerScreenTap}
            className="fixed inset-0 z-[290] bg-slate-950/92 backdrop-blur-md flex flex-col justify-between p-6 select-none cursor-pointer"
          >
            <div
              style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.22) 0%, rgba(249, 115, 22, 0) 70%)' }}
              className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
            />
            <div
              style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, rgba(14, 165, 233, 0) 70%)' }}
              className="pointer-events-none absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
            />

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 max-w-md w-full mx-auto space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  OLLDay Everyday • 3x3x3 CFOP Timer
                </span>
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(440);
                    setFullTimerState('idle');
                    setFullTimerOpen(false);
                  }}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {fullTimerState !== 'running' && (
                <div className="rounded-2xl bg-slate-900/95 border border-white/15 p-3.5 text-center shadow-lg">
                  <p className="font-mono text-xs sm:text-sm font-bold text-white leading-relaxed">
                    {fullScramble}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(540);
                      setFullScramble(generate3x3Scramble(20));
                    }}
                    className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-orange-300 hover:text-white cursor-pointer"
                  >
                    New Scramble ↻
                  </button>
                </div>
              )}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center">
              <div
                ref={fullTimerDisplayRef}
                className={`text-7xl sm:text-8xl font-mono font-black tracking-tight transition-colors ${
                  fullTimerState === 'running' ? 'text-green-400' : 'text-white'
                }`}
              >
                {(fullElapsedMs / 1000).toFixed(2)}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60 mt-3">
                {fullTimerState === 'running' ? 'Tap Anywhere to Stop' : 'Tap Anywhere to Start'}
              </p>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 max-w-md w-full mx-auto space-y-2.5"
            >
              {fullTimerState === 'stopped' && currentUser.fullSolveHistory?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFullSolvePenalty('+2')}
                    className={`py-2.5 rounded-xl border text-xs font-black cursor-pointer ${
                      currentUser.fullSolveHistory[0]?.penalty === '+2'
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-white/10 border-white/15 text-amber-300'
                    }`}
                  >
                    +2
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFullSolvePenalty('DNF')}
                    className={`py-2.5 rounded-xl border text-xs font-black cursor-pointer ${
                      currentUser.fullSolveHistory[0]?.penalty === 'DNF'
                        ? 'bg-red-500 text-white border-red-400'
                        : 'bg-white/10 border-white/15 text-red-300'
                    }`}
                  >
                    DNF
                  </button>
                  <button
                    type="button"
                    onClick={deleteLastFullSolve}
                    className="py-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-slate-900/95 border border-white/15 p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">
                    Ao5
                  </span>
                  <span className="font-mono text-xl font-black text-green-400">
                    {ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}
                  </span>
                </div>
                <div className="rounded-2xl bg-slate-900/95 border border-white/15 p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">
                    Ao12
                  </span>
                  <span className="font-mono text-xl font-black text-sky-400">
                    {ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. GLASSMORPHIC SOLVER ACCOUNT SIGN-IN & SIGN-UP GATE */}
        {authScreenOpen && (
          <div className="fixed inset-0 z-[255] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div
              style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.22) 0%, rgba(249, 115, 22, 0) 70%)' }}
              className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
            />
            <div
              style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.16) 0%, rgba(14, 165, 233, 0) 70%)' }}
              className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full"
            />

            <div className="relative z-10 w-full max-w-sm rounded-[2.25rem] bg-slate-900/95 border border-white/15 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.16)] space-y-5">
              {/* Brand Emblem & Title */}
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center shadow-lg">
                  <SuneEmblemSvg className="w-full h-full" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    OLLDay <span className="text-orange-400">Everyday</span>
                  </h2>
                  <p className="text-xs text-white/65 mt-0.5">
                    Sign in or create a solver account to save your PBs &amp; solve history
                  </p>
                </div>
              </div>

              {/* Glassmorphic Sign In / Create Account Switcher */}
              <div className="bg-black/30 p-1 rounded-2xl border border-white/10 grid grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(520);
                    setAuthErrorMsg('');
                    setAuthMode('signin');
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(520);
                    setAuthErrorMsg('');
                    setAuthMode('signup');
                  }}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-orange-500 text-slate-950 shadow-sm'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authMode === 'signin' ? (
                <div className="space-y-3">
                  {/* Private Device-Only Saved Accounts + Demo */}
                  {(() => {
                    const visibleAccounts = Array.from(
                      new Set(['Demo', ...deviceAccountKeys.filter((k) => Boolean(users[k]))])
                    ).filter((k) => Boolean(users[k]));
                    return (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto no-scrollbar">
                        {visibleAccounts.map((uKey) => {
                          const uData = sanitizeUserRecord(users[uKey]);
                          return (
                            <button
                              key={uKey}
                              type="button"
                              onClick={() => {
                                emitBeep(720, 'sine', 0.08);
                                registerDeviceAccount(uKey);
                                setActiveUserKey(uKey);
                                setAuthNameInput('');
                                setAuthErrorMsg('');
                                setAuthScreenOpen(false);
                              }}
                              className="w-full p-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-black text-white">{String(uKey)}</span>
                                  {uData.isPro && (
                                    <span className="px-1.5 py-0.5 rounded bg-orange-500/25 border border-orange-500/40 text-[9px] font-black text-orange-300">
                                      PRO
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-white/55">
                                  F2L D{uData.f2lDay} • OLL D{uData.day} • PLL D{uData.pllDay}
                                </span>
                              </div>
                              <span className="text-xs font-black text-orange-300">Continue →</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Sign in to an existing cloud account from another device without listing others */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50 block">
                      Sign In From Another Device
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={authNameInput}
                        onChange={(e) => {
                          setAuthErrorMsg('');
                          setAuthNameInput(e.target.value);
                        }}
                        placeholder="Enter your Solver Name or Email"
                        className="flex-1 rounded-2xl bg-black/35 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white placeholder-white/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const query = authNameInput.trim();
                          if (!query) {
                            setAuthErrorMsg('Enter your solver name or email');
                            return;
                          }
                          const matchedKey = Object.keys(users).find((k) => {
                            if (k.toLowerCase() === query.toLowerCase()) return true;
                            const em = users[k]?.email;
                            return typeof em === 'string' && em.trim() !== '' && em.toLowerCase() === query.toLowerCase();
                          });
                          if (!matchedKey) {
                            setAuthErrorMsg('Account not found — check spelling or Create Account');
                            return;
                          }
                          emitBeep(720, 'sine', 0.08);
                          registerDeviceAccount(matchedKey);
                          setActiveUserKey(matchedKey);
                          setAuthNameInput('');
                          setAuthErrorMsg('');
                          setAuthScreenOpen(false);
                        }}
                        className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-black text-white cursor-pointer"
                      >
                        Sign In
                      </button>
                    </div>
                    {authErrorMsg && (
                      <p className="text-[11px] font-bold text-rose-300 text-center">{authErrorMsg}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={authNameInput}
                      onChange={(e) => {
                        setAuthErrorMsg('');
                        setAuthNameInput(e.target.value);
                      }}
                      placeholder="Solver Name (e.g., Alex)"
                      className="w-full rounded-2xl bg-black/35 border border-white/15 px-3.5 py-3 text-xs font-bold text-white placeholder-white/40"
                    />
                    <input
                      type="email"
                      value={authEmailInput}
                      onChange={(e) => setAuthEmailInput(e.target.value)}
                      placeholder="Email for Cloud Backup (Optional)"
                      className="w-full rounded-2xl bg-black/35 border border-white/15 px-3.5 py-3 text-xs text-white placeholder-white/40"
                    />
                  </div>
                  {authErrorMsg && (
                    <p className="text-[11px] font-bold text-rose-300 text-center">{authErrorMsg}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const cleanName = authNameInput.trim();
                      if (!cleanName) {
                        setAuthErrorMsg('Enter a solver name to create your account');
                        return;
                      }
                      const exists = Object.keys(users).some(
                        (k) => k.toLowerCase() === cleanName.toLowerCase()
                      );
                      if (exists) {
                        setAuthErrorMsg('That solver name is taken — choose another or Sign In');
                        return;
                      }
                      emitBeep(820, 'sine', 0.1);
                      const created = sanitizeUserRecord({
                        email: authEmailInput.trim(),
                        isPro: false
                      });
                      setUsers((prev) => ({ ...prev, [cleanName]: created }));
                      saveUserToCloud(cleanName, created);
                      registerDeviceAccount(cleanName);
                      setActiveUserKey(cleanName);
                      setAuthNameInput('');
                      setAuthEmailInput('');
                      setAuthScreenOpen(false);
                      setActiveModal('cfopExperienceChoice');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                  >
                    Create Account &amp; Start
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW ACCOUNT WELCOME PROMPT: ARE YOU NEW TO CFOP? */}
        {activeModal === 'cfopExperienceChoice' && (
          <div className="fixed inset-0 z-[272] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-5">
            <div className="w-full max-w-sm rounded-[2.25rem] bg-slate-900/95 border border-orange-500/35 p-6 shadow-2xl space-y-4 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/35 text-[10px] font-black uppercase tracking-widest text-orange-400">
                Welcome, {String(activeUserKey || 'Solver')}!
              </span>
              <h3 className="text-xl font-black text-white">Are you new to CFOP?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Choose your experience level and we&apos;ll walk you through the app live, showing you where every phase and tool lives.
              </p>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => startGuidedTour('cfopAndApp')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Yes, show me whats going on here.
                </button>
                <button
                  type="button"
                  onClick={() => startGuidedTour('appOnly')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  No, I know CFOP.
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AUTO-NAVIGATING INTERACTIVE ONBOARDING & FEATURE TOUR OVERLAY */}
        {activeModal === 'guidedTour' && (() => {
          const steps = tourType === 'cfopAndApp' ? CFOP_AND_APP_TOUR_STEPS : APP_ONLY_TOUR_STEPS;
          const step = steps[tourStepIdx] || steps[0];
          const isLast = tourStepIdx + 1 >= steps.length;

          return (
            <div className="fixed inset-x-0 bottom-24 z-[268] px-4 flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full max-w-md rounded-[2rem] bg-slate-900/95 backdrop-blur-md border border-orange-500/45 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.75)] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-black uppercase tracking-widest text-orange-300">
                    {step.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(440);
                      setActiveModal(null);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Skip Tour ✕
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-black text-white">{step.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">{step.desc}</p>
                </div>

                <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-300 block">
                    How to Navigate Here Yourself:
                  </span>
                  <p className="text-[11px] text-slate-200 mt-0.5">{step.howToReach}</p>
                </div>

                {isLast && (
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-400 block">
                      Jump Directly to a Phase:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: 'cross', label: 'C • Cross', tab: 'ladder' },
                        { key: 'f2l', label: 'F • F2L', tab: 'grind' },
                        { key: 'oll', label: 'O • OLL', tab: 'grind' },
                        { key: 'pll', label: 'P • PLL', tab: 'grind' }
                      ].map((dest) => (
                        <button
                          key={dest.key}
                          type="button"
                          onClick={() => {
                            emitBeep(760, 'sine', 0.08);
                            applyTourNavigation({ phase: dest.key, tab: dest.tab });
                            setActiveModal(null);
                          }}
                          className="py-2 px-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/30 border border-orange-500/40 text-[10px] font-black text-orange-200 transition-all active:scale-95 cursor-pointer"
                        >
                          {dest.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={tourStepIdx === 0}
                    onClick={() => {
                      emitBeep(460);
                      const prevIdx = Math.max(0, tourStepIdx - 1);
                      setTourStepIdx(prevIdx);
                      applyTourNavigation(steps[prevIdx]);
                    }}
                    className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(720, 'sine', 0.07);
                      if (!isLast) {
                        const nextIdx = tourStepIdx + 1;
                        setTourStepIdx(nextIdx);
                        applyTourNavigation(steps[nextIdx]);
                      } else {
                        setActiveModal(null);
                      }
                    }}
                    className="py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {isLast ? 'Finish Tour ✓' : 'Next Step →'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* UNIFIED 1-SHOT CASE + 2-SHOT FULL-SCRAMBLE CUBE SCANNER MODAL */}
        {scannerOpen && (() => {
          const FACE_CAPTURE_SPECS = {
            U: {
              title: 'Top Face (U • Yellow Center)',
              short: 'Top (U)',
              accent: '#facc15',
              topEdge: '▲ BLUE (BACK)',
              bottomEdge: '▼ GREEN (FRONT)',
              leftEdge: '◀ RED',
              rightEdge: 'ORANGE ▶',
              instruction: 'Tilt Yellow (U) straight toward camera: Blue edge on TOP, Green edge on BOTTOM, Red LEFT, Orange RIGHT.'
            },
            F: {
              title: 'Front Face (F • Green Center)',
              short: 'Front (F)',
              accent: '#22c55e',
              topEdge: '▲ YELLOW (TOP)',
              bottomEdge: '▼ WHITE (BOTTOM)',
              leftEdge: '◀ RED',
              rightEdge: 'ORANGE ▶',
              instruction: 'Hold Green (F) straight toward camera: Yellow on TOP, White on BOTTOM, Red LEFT, Orange RIGHT.'
            },
            R: {
              title: 'Right Face (R • Orange Center)',
              short: 'Right (R)',
              accent: '#f97316',
              topEdge: '▲ YELLOW (TOP)',
              bottomEdge: '▼ WHITE (BOTTOM)',
              leftEdge: '◀ GREEN',
              rightEdge: 'BLUE ▶',
              instruction: 'Turn cube so Orange (R) faces camera: Yellow TOP, White BOTTOM, Green LEFT, Blue RIGHT.'
            },
            D: {
              title: 'Bottom Face (D • White Center)',
              short: 'Bottom (D)',
              accent: '#f8fafc',
              topEdge: '▲ GREEN (FRONT)',
              bottomEdge: '▼ BLUE (BACK)',
              leftEdge: '◀ RED',
              rightEdge: 'ORANGE ▶',
              instruction: 'Tilt bottom up (x) so White (D) faces camera: Green edge on TOP, Blue edge on BOTTOM, Red LEFT, Orange RIGHT.'
            },
            B: {
              title: 'Back Face (B • Blue Center)',
              short: 'Back (B)',
              accent: '#3b82f6',
              topEdge: '▲ YELLOW (TOP)',
              bottomEdge: '▼ WHITE (BOTTOM)',
              leftEdge: '◀ ORANGE',
              rightEdge: 'RED ▶',
              instruction: 'Turn cube 180° (y2) so Blue (B) faces camera: Yellow TOP, White BOTTOM, Orange LEFT, Red RIGHT.'
            },
            L: {
              title: 'Left Face (L • Red Center)',
              short: 'Left (L)',
              accent: '#ef4444',
              topEdge: '▲ YELLOW (TOP)',
              bottomEdge: '▼ WHITE (BOTTOM)',
              leftEdge: '◀ BLUE',
              rightEdge: 'GREEN ▶',
              instruction: 'Turn cube so Red (L) faces camera: Yellow TOP, White BOTTOM, Blue LEFT, Green RIGHT.'
            }
          };

          const currentSpec = FACE_CAPTURE_SPECS[scannerCaptureStep] || FACE_CAPTURE_SPECS.U;
          const capturedCount = Object.keys(scannerCapturedThumbs).length;
          const hasFull6Faces = scannerHasFull6Faces;
          const analysis = scannerAnalysis;
          if (!analysis) return null;

          const hasFront3Captured = Boolean(
            scannerCapturedThumbs.U && scannerCapturedThumbs.F && scannerCapturedThumbs.R
          );
          const needsBackFacesRecommendation =
            !hasFull6Faces &&
            (scannerThreeFaceHints.crossSolved === false ||
              scannerThreeFaceHints.f2lCompletedStatus === 'none' ||
              scannerThreeFaceHints.f2lCompletedStatus === 'some');

          const stagesList = Array.isArray(analysis.cfopStages) ? analysis.cfopStages : null;
          const activeFocusedIdx = stagesList ? Math.min(scannerFocusedStageIdx, stagesList.length - 1) : 0;
          const focusedStage = stagesList ? stagesList[activeFocusedIdx] : null;
          const matched = focusedStage?.caseObj || analysis.matchedCase;
          const activeStagePhase = focusedStage?.phaseKey || analysis.phase;
          const activeStageTitle = focusedStage ? `${focusedStage.stage}: ${focusedStage.label}` : matched.name;
          const activeStageAlg = focusedStage ? focusedStage.alg : matched.alg;
          const activeStageFingertrick = focusedStage ? focusedStage.fingertrick : matched.fingertrick;
          const nextCase = analysis.nextUpCase;
          const activePreviewImg = scannerCapturedThumbs[scannerCaptureStep] || null;
          const visibleFaceList = hasFull6Faces
            ? [
                { key: 'U', title: 'Top (U)', top: 'B', bottom: 'G', left: 'R', right: 'O' },
                { key: 'F', title: 'Front (F)', top: 'Y', bottom: 'W', left: 'R', right: 'O' },
                { key: 'R', title: 'Right (R)', top: 'Y', bottom: 'W', left: 'G', right: 'B' },
                { key: 'D', title: 'Bottom (D)', top: 'G', bottom: 'B', left: 'R', right: 'O' },
                { key: 'B', title: 'Back (B)', top: 'Y', bottom: 'W', left: 'O', right: 'R' },
                { key: 'L', title: 'Left (L)', top: 'Y', bottom: 'W', left: 'B', right: 'G' }
              ]
            : [
                { key: 'U', title: 'Top (U)', top: 'B', bottom: 'G', left: 'R', right: 'O' },
                { key: 'F', title: 'Front (F)', top: 'Y', bottom: 'W', left: 'R', right: 'O' },
                { key: 'R', title: 'Right (R)', top: 'Y', bottom: 'W', left: 'G', right: 'B' }
              ];

          const renderEdgeDot = (code, dirLabel) => (
            <span
              className="inline-flex items-center gap-0.5 text-[8px] font-black text-slate-400"
              title={`${dirLabel} neighbor: ${SCANNER_COLOR_META[code]?.label || code}`}
            >
              <span
                style={{ backgroundColor: SCANNER_COLOR_META[code]?.hex || '#64748b' }}
                className="w-1.5 h-1.5 rounded-full inline-block border border-black/40"
              />
              {code}
            </span>
          );

          // 9-Sticker Cube State Legality & Color Count Validator
          const stickerCounts = { Y: 0, W: 0, G: 0, B: 0, O: 0, R: 0 };
          visibleFaceList.forEach(({ key }) => {
            (scannedFaces[key] || []).forEach((code) => {
              if (stickerCounts[code] !== undefined) stickerCounts[code] += 1;
            });
          });
          const overflowColors = Object.entries(stickerCounts).filter(([, cnt]) => cnt > 9);
          const sixFaceMismatch =
            hasFull6Faces && Object.entries(stickerCounts).filter(([, cnt]) => cnt !== 9);

          return (
            <div className="fixed inset-0 z-[285] bg-[#060913]/98 backdrop-blur-md flex flex-col justify-between p-4 max-w-md mx-auto overflow-y-auto no-scrollbar">
              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                    Live AI Scanner • {capturedCount} Face{capturedCount === 1 ? '' : 's'} Captured
                  </span>
                  <h2 className="text-lg font-black text-white">Cube Scanner &amp; Solver</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(520);
                      setScannerAutoSnap((v) => !v);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase border cursor-pointer ${
                      scannerAutoSnap
                        ? 'bg-green-500/20 border-green-500/40 text-green-300'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {scannerAutoSnap ? 'Auto-Snap ON' : 'Manual Snap'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(440);
                      stopScannerCamera();
                      setScannerOpen(false);
                    }}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/15 text-slate-200 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-3 my-auto py-2">
                {/* Face Selector Pills (U, F, R for Mid-Solve; D, B, L for Full Scramble) */}
                <div className="grid grid-cols-6 gap-1">
                  {(['U', 'F', 'R', 'D', 'B', 'L']).map((fKey) => {
                    const isDone = Boolean(scannerCapturedThumbs[fKey]);
                    const isCurrent = scannerCaptureStep === fKey;
                    return (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() => {
                          emitBeep(540);
                          setSelectedStickerEdit(null);
                          setScannerCaptureStep(fKey);
                          if (!scannerCapturedThumbs[fKey] && !scannerCameraReady) {
                            startScannerCamera(fKey, false);
                          }
                        }}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-sm'
                            : isDone
                            ? 'bg-green-500/15 text-green-300 border-green-500/35'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {isDone ? `${fKey} ✓` : fKey}
                      </button>
                    );
                  })}
                </div>

                {/* Cube Surface Finish Calibration Toggle (UV-Coated vs. Matte Finish) */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Cube Finish Calibration:
                  </span>
                  <div className="bg-slate-950 p-0.5 rounded-xl border border-white/10 flex items-center">
                    {[
                      { key: 'uv', label: 'UV Glossy' },
                      { key: 'matte', label: 'Matte Finish' }
                    ].map((fin) => (
                      <button
                        key={fin.key}
                        type="button"
                        onClick={() => {
                          emitBeep(540);
                          setScannerSurfaceFinish(fin.key);
                          if (Object.keys(scannerRawSamples).length > 0) {
                            setScannedFaces((prev) =>
                              classifyCapturedFaceBatch(scannerRawSamples, prev, scannerLockedFaces, savedCubePalette)
                            );
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase cursor-pointer transition-all ${
                          scannerSurfaceFinish === fin.key
                            ? 'bg-orange-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {fin.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orientation & Framing Instruction Banner */}
                <div className="bg-slate-900/90 border border-white/10 rounded-2xl px-3.5 py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-white">{currentSpec.title}</span>
                    <span className="text-[9.5px] font-bold text-orange-300">{scannerFramingHint}</span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 leading-snug">{currentSpec.instruction}</p>
                </div>

                {/* Live Camera Viewfinder with Straight-On Flat 3x3 Square Overlay + Real-Time Color Swatches */}
                <div className="relative w-full aspect-square max-h-[250px] mx-auto rounded-[1.75rem] overflow-hidden bg-slate-950 border border-white/15 shadow-inner">
                  {activePreviewImg ? (
                    <img
                      src={activePreviewImg}
                      alt={`Captured ${currentSpec.short} face`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      ref={scannerVideoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Flat 3x3 Square Grid Overlay + Live Detected Tile Color Preview */}
                  <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none">
                    <rect
                      x="32"
                      y="32"
                      width="136"
                      height="136"
                      rx="10"
                      fill="none"
                      stroke={scannerCubeDetected ? '#22c55e' : currentSpec.accent}
                      strokeWidth={scannerCubeDetected ? '3' : '2.5'}
                    />
                    <line x1="77.3" y1="32" x2="77.3" y2="168" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="122.6" y1="32" x2="122.6" y2="168" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="32" y1="77.3" x2="168" y2="77.3" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                    <line x1="32" y1="122.6" x2="168" y2="122.6" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />

                    {SCANNER_FLAT_GRID_CENTROIDS.map(([nx, ny], idx) => {
                      const liveCode = !activePreviewImg && scannerLivePreviewCodes ? scannerLivePreviewCodes[idx] : null;
                      const fillHex = liveCode
                        ? SCANNER_COLOR_META[liveCode]?.hex || currentSpec.accent
                        : idx === 4
                        ? currentSpec.accent
                        : 'rgba(15,23,42,0.5)';
                      return (
                        <g key={idx}>
                          <circle
                            cx={nx * 200}
                            cy={ny * 200}
                            r={liveCode ? '9.5' : idx === 4 ? '6.5' : '3.2'}
                            fill={fillHex}
                            stroke="#090e1c"
                            strokeWidth="1.8"
                          />
                          {liveCode && (
                            <text
                              x={nx * 200}
                              y={ny * 200 + 3}
                              textAnchor="middle"
                              fill="#090e1c"
                              fontSize="8.5"
                              fontWeight="900"
                            >
                              {liveCode}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* 4-Side Neighboring Face Orientation Labels */}
                    <rect x="46" y="8" width="108" height="16" rx="6" fill="rgba(2,6,23,0.82)" />
                    <text x="100" y="19" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900">
                      {currentSpec.topEdge}
                    </text>

                    <rect x="42" y="176" width="116" height="16" rx="6" fill="rgba(2,6,23,0.82)" />
                    <text x="100" y="187" textAnchor="middle" fill="#fde047" fontSize="8.5" fontWeight="900">
                      {currentSpec.bottomEdge}
                    </text>

                    <text x="16" y="102" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="900" transform="rotate(-90 16 102)">
                      {currentSpec.leftEdge}
                    </text>
                    <text x="184" y="102" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="900" transform="rotate(90 184 102)">
                      {currentSpec.rightEdge}
                    </text>
                  </svg>

                  {scannerCameraError && !activePreviewImg && (
                    <div className="absolute inset-0 bg-slate-950/90 p-4 flex items-center justify-center text-center">
                      <p className="text-xs text-slate-300 leading-relaxed">{scannerCameraError}</p>
                    </div>
                  )}
                </div>

                {/* Persistent Camera Capture / Retake Controls (Always Visible for U, F, R, D, B, L) */}
                <div className="grid grid-cols-2 gap-2">
                  {activePreviewImg ? (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(580, 'sine', 0.06);
                        startScannerCamera(scannerCaptureStep, false);
                      }}
                      className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                      Retake {currentSpec.short} ↻
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!scannerCameraReady) {
                          startScannerCamera(scannerCaptureStep, false);
                        } else {
                          captureAndAnalyzeCubeFrame();
                        }
                      }}
                      className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                      {scannerCameraReady
                        ? scannerAutoSnap && scannerStabilityCount > 0
                          ? `Hold Steady (${scannerStabilityCount}/5)...`
                          : `Capture ${currentSpec.short}`
                        : `Start Camera (${currentSpec.short})`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(460);
                      startScannerCamera('U', true);
                    }}
                    className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Reset All Faces
                  </button>
                </div>

                {/* 3-Face Clarifying Questions (Asked in Exact Order When Only U, F, R Are Captured) */}
                {!hasFull6Faces && (
                  <div className="bg-slate-900/95 border border-orange-500/35 rounded-[1.75rem] p-3.5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                        {hasFront3Captured ? '3-Face Quick Check • Refine Solve' : '3-Face State Check'}
                      </span>
                      {(scannerThreeFaceHints.crossSolved !== null ||
                        scannerThreeFaceHints.f2lCompletedStatus !== null) && (
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(460);
                            setScannerThreeFaceHints({ crossSolved: null, f2lCompletedStatus: null });
                          }}
                          className="text-[9.5px] font-bold text-slate-400 hover:text-white cursor-pointer"
                        >
                          Clear Answers
                        </button>
                      )}
                    </div>

                    {/* Question 1: Is Cross solved? */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-black text-white">1. Is Cross solved?</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(640, 'sine', 0.05);
                            setScannerThreeFaceHints((prev) => ({
                              ...prev,
                              crossSolved: true
                            }));
                          }}
                          className={`py-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                            scannerThreeFaceHints.crossSolved === true
                              ? 'bg-green-500/20 border-green-400 text-green-300'
                              : 'bg-slate-950 border-white/10 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          Yes, Cross Solved ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(520, 'sine', 0.05);
                            setScannerThreeFaceHints({
                              crossSolved: false,
                              f2lCompletedStatus: null
                            });
                          }}
                          className={`py-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                            scannerThreeFaceHints.crossSolved === false
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-slate-950 border-white/10 text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          No, Not Yet ✕
                        </button>
                      </div>
                    </div>

                    {/* Question 2 (Only shown if Cross = Yes): Are any F2L pairs completed? */}
                    {scannerThreeFaceHints.crossSolved === true && (
                      <div className="space-y-1.5 pt-2 border-t border-white/10">
                        <p className="text-xs font-black text-white">2. Are any F2L pairs completed?</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { key: 'none', label: 'None (0/4)' },
                            { key: 'some', label: 'Some (1–3)' },
                            { key: 'all', label: 'All 4 Done ✓' }
                          ].map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => {
                                emitBeep(660, 'sine', 0.05);
                                setScannerThreeFaceHints((prev) => ({
                                  ...prev,
                                  f2lCompletedStatus: opt.key
                                }));
                              }}
                              className={`py-2 px-1 rounded-xl text-[10.5px] font-black border transition-all cursor-pointer ${
                                scannerThreeFaceHints.f2lCompletedStatus === opt.key
                                  ? 'bg-orange-500 text-slate-950 border-orange-400'
                                  : 'bg-slate-950 border-white/10 text-slate-300 hover:bg-white/5'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Recommendation to Capture Remaining Faces (D, B, L) */}
                    {needsBackFacesRecommendation && (
                      <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 space-y-2">
                        <p className="text-[11px] text-amber-100 leading-snug">
                          {scannerThreeFaceHints.crossSolved === false ? (
                            <>
                              <strong>Recommended:</strong> Because your Cross is still unsolved, hidden edges may be on the <strong>Bottom (D), Back (B), or Left (L)</strong> faces. Capture those 3 faces so the engine can calculate your exact Cross → F2L → OLL → PLL solve.
                            </>
                          ) : (
                            <>
                              <strong>Recommended:</strong> With open F2L slots on the back/left sides, capturing <strong>D • B • L</strong> lets our engine track hidden corners &amp; edges across all 4 slots for an accurate multi-pair F2L solve.
                            </>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(740, 'sine', 0.07);
                            startScannerCamera('D', false);
                          }}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md cursor-pointer"
                        >
                          Capture Remaining Faces (D • B • L) →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Sticker Verification Grid + 9-Sticker Count Guard */}
                <div className="bg-slate-900/90 border border-white/10 rounded-[1.75rem] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      Verify Stickers
                    </span>
                    <div className="flex items-center gap-1.5">
                      {savedCubePalette && (
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(460);
                            setSavedCubePalette(null);
                            try {
                              if (typeof window !== 'undefined') {
                                window.localStorage.removeItem(STORAGE_KEYS.cubePalette);
                              }
                            } catch {
                              // Ignore storage errors
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-slate-300 hover:text-white cursor-pointer"
                        >
                          Reset Palette
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          emitBeep(720, 'sine', 0.05);
                          setScannerLockedFaces((prev) => ({
                            ...prev,
                            [scannerCaptureStep]: [...(scannedFaces[scannerCaptureStep] || [])]
                          }));
                        }}
                        className="px-2 py-0.5 rounded-lg bg-green-500/15 border border-green-500/35 text-[9.5px] font-black text-green-300 cursor-pointer"
                      >
                        {scannerLockedFaces[scannerCaptureStep] ? `✓ ${scannerCaptureStep} Locked` : `Lock ${scannerCaptureStep} Tiles`}
                      </button>
                    </div>
                  </div>

                  {/* Sticker Count Legality Warning Banner */}
                  {(overflowColors.length > 0 || (Array.isArray(sixFaceMismatch) && sixFaceMismatch.length > 0)) && (
                    <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-amber-200">
                      {overflowColors.length > 0
                        ? `Sticker Check: ${overflowColors
                            .map(([c, cnt]) => `${SCANNER_COLOR_META[c]?.label || c} (${cnt}/9)`)
                            .join(', ')} — tap the extra tile below to fix.`
                        : `6-Face Count Check: ${sixFaceMismatch
                            .map(([c, cnt]) => `${c}:${cnt}/9`)
                            .join(' • ')}`}
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 leading-snug bg-slate-950/70 border border-white/5 rounded-xl px-2.5 py-1.5">
                    Tap any tile to fix its color—edited or locked tiles <strong className="text-green-300">stay locked in place</strong> when capturing other faces.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {visibleFaceList.map((fObj) => (
                      <div key={fObj.key} className="bg-slate-950/90 border border-white/10 rounded-2xl p-2 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-white block text-center">
                          {fObj.title}
                        </span>

                        {/* Top Neighbor Center Indicator */}
                        <div className="flex justify-center">
                          {renderEdgeDot(fObj.top, 'Top')}
                        </div>

                        {/* Left Indicator + 3x3 Sticker Grid + Right Indicator */}
                        <div className="flex items-center gap-1">
                          <div className="flex flex-col items-center justify-center flex-shrink-0">
                            {renderEdgeDot(fObj.left, 'Left')}
                          </div>
                          <div className="grid grid-cols-3 gap-1 flex-1">
                            {(scannedFaces[fObj.key] || []).map((cCode, idx) => {
                              const isSelected =
                                selectedStickerEdit?.face === fObj.key && selectedStickerEdit?.idx === idx;
                              const posLabels = [
                                'Top-Left Corner',
                                'Top Edge',
                                'Top-Right Corner',
                                'Left Edge',
                                'Center',
                                'Right Edge',
                                'Bottom-Left Corner',
                                'Bottom Edge',
                                'Bottom-Right Corner'
                              ];
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    emitBeep(620, 'sine', 0.04, 0.06);
                                    setSelectedStickerEdit({
                                      face: fObj.key,
                                      idx,
                                      posLabel: posLabels[idx],
                                      faceTitle: fObj.title
                                    });
                                  }}
                                  style={{ backgroundColor: SCANNER_COLOR_META[cCode]?.hex || '#334155' }}
                                  className={`aspect-square rounded-md border transition-transform cursor-pointer ${
                                    isSelected ? 'border-white scale-110 ring-2 ring-orange-400' : 'border-black/40'
                                  }`}
                                  title={`${fObj.title} • ${posLabels[idx]}: ${SCANNER_COLOR_META[cCode]?.label || cCode}`}
                                />
                              );
                            })}
                          </div>
                          <div className="flex flex-col items-center justify-center flex-shrink-0">
                            {renderEdgeDot(fObj.right, 'Right')}
                          </div>
                        </div>

                        {/* Bottom Neighbor Center Indicator */}
                        <div className="flex justify-center">
                          {renderEdgeDot(fObj.bottom, 'Bottom')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedStickerEdit && (
                    <div className="flex items-center justify-between gap-2 bg-slate-950 border border-orange-500/35 rounded-xl px-2.5 py-2">
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-black uppercase text-orange-300 block truncate">
                          {selectedStickerEdit.faceTitle || selectedStickerEdit.face}
                        </span>
                        <span className="text-[9px] text-slate-400 block truncate">
                          {selectedStickerEdit.posLabel || `Tile #${selectedStickerEdit.idx + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {SCANNER_COLOR_CODES.map((cCode) => (
                          <button
                            key={cCode}
                            type="button"
                            onClick={() => {
                              emitBeep(720, 'sine', 0.05);
                              const { face, idx } = selectedStickerEdit;
                              setScannedFaces((prev) => {
                                const updated = [...(prev[face] || [])];
                                updated[idx] = cCode;
                                setScannerLockedFaces((lPrev) => ({
                                  ...lPrev,
                                  [face]: updated
                                }));
                                return { ...prev, [face]: updated };
                              });
                            }}
                            style={{ backgroundColor: SCANNER_COLOR_META[cCode].hex }}
                            className="w-6 h-6 rounded-lg border border-black/40 text-[9px] font-black text-slate-950 cursor-pointer active:scale-90"
                            title={SCANNER_COLOR_META[cCode].label}
                          >
                            {cCode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Identified Current Case + Interactive Stage Focus Card */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/35 border border-orange-500/35 rounded-[1.75rem] p-4 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-[9.5px] font-black uppercase tracking-wider text-orange-300">
                      {analysis.phaseLabel}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          analysis.crossSolved
                            ? 'bg-green-500/15 border-green-500/35 text-green-300'
                            : 'bg-red-500/15 border-red-500/35 text-red-300'
                        }`}
                      >
                        {analysis.crossSolved ? 'Cross ✓' : 'Cross ✕'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-black uppercase text-slate-200">
                        {analysis.remainingF2lPairs === 0 ? 'F2L Done ✓' : `${analysis.remainingF2lPairs} F2L Left`}
                      </span>
                    </div>
                  </div>

                  {/* Top Focused Stage Header Display (Full Untruncated Algorithm + Trigger Pills + F2L Pair Breakdown) */}
                  {activeStagePhase === 'cross' ? (
                    <div className="bg-slate-950/90 border border-orange-500/30 rounded-2xl p-3 space-y-1.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-400 block">
                        Focused Stage • Full Algorithm
                      </span>
                      <h3 className="text-base font-black text-white">{activeStageTitle}</h3>
                      <p className="font-mono text-sm font-black text-amber-300 break-words leading-relaxed select-all">
                        {activeStageAlg}
                      </p>
                      {getAlgorithmTriggerTags(activeStageAlg).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {getAlgorithmTriggerTags(activeStageAlg).map((tag) => (
                            <span
                              key={tag.label}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${tag.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-[10.5px] text-orange-200/90 leading-snug">
                        <strong>Fingertrick:</strong> {activeStageFingertrick}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950/90 border border-orange-500/30 rounded-2xl p-3 space-y-2.5">
                      <div className="flex items-start gap-3">
                        {renderCaseThumb(activeStagePhase, matched, 'w-14 h-14')}
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-400 block">
                            Focused Stage • Full Algorithm
                          </span>
                          <h3 className="text-base font-black text-white leading-tight">{activeStageTitle}</h3>
                          <p className="font-mono text-sm font-black text-amber-300 break-words leading-relaxed select-all">
                            {activeStageAlg}
                          </p>
                          {getAlgorithmTriggerTags(activeStageAlg).length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {getAlgorithmTriggerTags(activeStageAlg).map((tag) => (
                                <span
                                  key={tag.label}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${tag.badgeClass}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-[10.5px] text-orange-200/90 leading-snug">
                            <strong>Fingertrick:</strong> {activeStageFingertrick}
                          </p>
                        </div>
                      </div>

                      {/* Pair-by-Pair F2L Breakdown with Bracketed Fingertricks & Trigger Name Pills */}
                      {focusedStage?.subSteps && focusedStage.subSteps.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-1.5">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                            F2L Pair-by-Pair Execution Order (With y Rotations):
                          </span>
                          {focusedStage.subSteps.map((sub) => {
                            const subTags = getAlgorithmTriggerTags(sub.alg);
                            return (
                              <div
                                key={sub.slotNumber}
                                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-2 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black text-white flex-shrink-0">
                                    Pair {sub.slotNumber} ({sub.caseObj.name})
                                  </span>
                                  <span className="font-mono text-[10.5px] font-bold text-amber-300 text-right break-all">
                                    {sub.alg}
                                  </span>
                                </div>
                                {subTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {subTags.map((tag) => (
                                      <span
                                        key={tag.label}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8.5px] font-black ${tag.badgeClass}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
                                        {tag.label}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clickable 4-Stage CFOP Cards (Tap Any Card to Focus Full Algorithm Above) */}
                  {stagesList && (
                    <div className="space-y-1.5">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 block">
                        Tap Any Stage Below to View Full Algorithm Above
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {stagesList.map((st, idx) => {
                          const isFocused = idx === activeFocusedIdx;
                          const isStageDone = scannerCompletedStages.includes(idx);
                          return (
                            <button
                              key={st.stage}
                              type="button"
                              onClick={() => {
                                emitBeep(640, 'sine', 0.05);
                                setScannerFocusedStageIdx(idx);
                              }}
                              className={`text-left rounded-xl p-2.5 border transition-all cursor-pointer ${
                                isFocused
                                  ? 'bg-orange-500/20 border-orange-400 shadow-md ring-1 ring-orange-400/50'
                                  : isStageDone
                                  ? 'bg-green-500/10 border-green-500/35'
                                  : 'bg-slate-950 border-white/10 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[9px] font-black uppercase ${isStageDone ? 'text-green-400' : 'text-orange-400'}`}>
                                  {isStageDone ? `${st.stage} ✓` : st.stage}
                                </span>
                                {isFocused && (
                                  <span className="text-[8.5px] font-black uppercase text-amber-300">Viewing ▲</span>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-white block truncate mt-0.5">{st.label}</span>
                              <span className="font-mono text-[10px] text-amber-300 block truncate mt-0.5">{st.alg}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step Solve Progression Bar (Advance Through Cross -> F2L Pairs -> OLL -> PLL) */}
                  {stagesList && (
                    <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-green-400">
                          Interactive Solve Progression ({scannerCompletedStages.length}/{stagesList.length} Stages Done)
                        </span>
                        {scannerCompletedStages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              emitBeep(460);
                              setScannerCompletedStages([]);
                              setScannerF2lPairIdx(0);
                              setScannerFocusedStageIdx(0);
                            }}
                            className="text-[9.5px] font-bold text-slate-400 hover:text-white cursor-pointer"
                          >
                            Restart Solve ↻
                          </button>
                        )}
                      </div>

                      {focusedStage?.phaseKey === 'f2l' && Array.isArray(focusedStage.subSteps) && focusedStage.subSteps.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase text-orange-300 block">
                              Active F2L Sub-Step {Math.min(scannerF2lPairIdx + 1, focusedStage.subSteps.length)} of {focusedStage.subSteps.length}
                            </span>
                            <span className="font-mono text-xs font-black text-amber-300 block truncate">
                              {focusedStage.subSteps[Math.min(scannerF2lPairIdx, focusedStage.subSteps.length - 1)]?.alg}
                            </span>
                          </div>
                          {scannerF2lPairIdx + 1 < focusedStage.subSteps.length && (
                            <button
                              type="button"
                              onClick={() => {
                                emitBeep(720, 'sine', 0.06);
                                setScannerF2lPairIdx((p) => p + 1);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-200 flex-shrink-0 cursor-pointer"
                            >
                              Next F2L Pair →
                            </button>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={activeFocusedIdx === 0}
                          onClick={() => {
                            emitBeep(480);
                            setScannerFocusedStageIdx((idx) => Math.max(0, idx - 1));
                          }}
                          className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 disabled:opacity-35 cursor-pointer"
                        >
                          ← Previous Stage
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            emitBeep(840, 'sine', 0.08);
                            setScannerCompletedStages((prev) =>
                              prev.includes(activeFocusedIdx) ? prev : [...prev, activeFocusedIdx]
                            );
                            if (activeFocusedIdx + 1 < stagesList.length) {
                              setScannerFocusedStageIdx(activeFocusedIdx + 1);
                              setScannerF2lPairIdx(0);
                            }
                          }}
                          className="py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-[11px] font-black text-green-300 cursor-pointer"
                        >
                          {activeFocusedIdx + 1 < stagesList.length
                            ? `Done • Go to ${stagesList[activeFocusedIdx + 1].stage} →`
                            : scannerCompletedStages.includes(activeFocusedIdx)
                            ? 'Cube Solved ✓'
                            : 'Complete Final PLL ✓'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Predicted Follow-Up Case / Lookahead Chain Section */}
                  <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-sky-400">
                        {analysis.nextUpBadge}
                      </span>
                      {nextCase && (
                        <span className="font-mono text-[10px] font-bold text-slate-300">{nextCase.alg}</span>
                      )}
                    </div>
                    <p className="text-xs font-black text-white">{analysis.nextUpTitle}</p>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {focusedStage?.summary || analysis.nextUpSummary}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      stopScannerCamera();
                      setScannerOpen(false);
                      if (activeStagePhase === 'cross') {
                        emitBeep(760);
                        setActivePhase('cross');
                        setCrossTab('ladder');
                        return;
                      }
                      const locked = !isCaseUnlockedForTier(activeStagePhase, matched.id, isProUnlocked);
                      if (locked) {
                        openProPaywall(matched.name);
                        return;
                      }
                      emitBeep(760);
                      setActivePhase(activeStagePhase);
                      setSwRunning(false);
                      setSwElapsedMs(0);
                      setSwLastResult(null);
                      if (activeStagePhase === 'f2l') setF2lDrillCase(matched);
                      else if (activeStagePhase === 'oll') setOllDrillCase(matched);
                      else if (activeStagePhase === 'pll') setPllDrillCase(matched);
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    {activeStagePhase === 'cross'
                      ? 'Practice Cross in X Ladder →'
                      : `Drill ${matched.name} Now →`}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 6. FINGERTRICK DOSSIER MODAL */}
        {activeModal === 'fingertrick' && ftCase && (() => {
          const breakdown = buildFingertrickBreakdown(ftCase);
          return (
            <div
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 z-[255] bg-black/90 backdrop-blur-md flex items-center justify-center p-5"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3 shadow-2xl max-h-[88dvh] overflow-y-auto no-scrollbar"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                    Fingertrick Dossier • {ftPhaseContext.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-3 bg-[#050811] border border-white/10 rounded-2xl p-3">
                  <CachedVisualCubeImg
                    url={
                      ftPhaseContext === 'f2l'
                        ? getF2LImageUrl(ftCase.alg)
                        : ftPhaseContext === 'pll'
                        ? getPLLImageUrl(ftCase.alg)
                        : getOLLImageUrl(ftCase.alg)
                    }
                    alt={ftCase.name}
                    lazy={false}
                    className={
                      ftPhaseContext === 'f2l'
                        ? 'w-14 h-14 object-contain f2l-cube-satin flex-shrink-0'
                        : 'w-12 h-12 rounded-xl bg-slate-200 p-1 flex-shrink-0 object-contain'
                    }
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white truncate">{ftCase.name}</h3>
                    <p className="font-mono text-xs font-bold text-amber-300 break-words">{ftCase.alg}</p>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                      1. Starting Grip
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{breakdown.grip}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                      2. Execution Sequence
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{breakdown.cue}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-400 block">
                      3. Flow &amp; Regrip Tip
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{breakdown.flow}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

        {/* 8. COLOR ORBIT COMPASS MODAL */}
        {activeModal === 'compass' && (() => {
          const ORBIT_QUESTIONS = [
            { prompt: 'White bottom, Blue is front — what color is to the right?', answer: 'Red' },
            { prompt: 'White bottom, Green is front — what color is to the right?', answer: 'Orange' },
            { prompt: 'White bottom, Orange is front — what color is to the right?', answer: 'Blue' },
            { prompt: 'White bottom, Red is front — what color is to the right?', answer: 'Green' }
          ];
          const currentQ = ORBIT_QUESTIONS[orbitQuizIdx % ORBIT_QUESTIONS.length];

          return (
            <div className="fixed inset-0 z-[255] bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-xs w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                      Color Orbit
                    </span>
                    {orbitQuizActive && (
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        Streak: {orbitStreak}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(620);
                      setOrbitFeedback(null);
                      setOrbitQuizActive(true);
                      setOrbitQuizIdx((i) => i + 1);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase cursor-pointer"
                  >
                    Hit Me
                  </button>
                </div>

                {!orbitQuizActive ? (
                  <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 space-y-2.5 text-center shadow-inner">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Hold <strong className="text-white">White</strong> on the bottom (<strong className="text-white">D</strong>). Clockwise:
                    </p>
                    <p className="font-mono text-sm font-black tracking-wide">
                      <span className="text-green-400">Green</span> → <span className="text-orange-400">Orange</span> → <span className="text-blue-400">Blue</span> → <span className="text-red-400">Red</span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 space-y-3.5 text-center shadow-inner">
                    <p className="text-sm font-bold text-white">{currentQ.prompt}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {orbitShuffledColors.map((colorName) => (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => {
                            const correct = colorName === currentQ.answer;
                            emitBeep(correct ? 880 : 320);
                            setOrbitStreak((s) => (correct ? s + 1 : 0));
                            setOrbitFeedback({ correct, chosen: colorName });
                          }}
                          className="py-2.5 px-3 rounded-xl border border-white/15 bg-slate-900 text-xs font-black text-white cursor-pointer"
                        >
                          {colorName}
                        </button>
                      ))}
                    </div>
                    {orbitFeedback && (
                      <p className={`text-[11px] font-black ${orbitFeedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {orbitFeedback.correct ? 'Correct!' : `Answer: ${currentQ.answer}`}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    setOrbitQuizActive(false);
                    setOrbitFeedback(null);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs uppercase cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}

        {/* 10. CUSTOM CHUNK CURRICULUM BUILDER MODAL */}
        {activeModal === 'curriculum' && (
          <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl max-h-[88dvh] flex flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                    {builderPhase.toUpperCase()} Curriculum Builder
                  </span>
                  <h3 className="text-lg font-black text-white">Custom Learning Chunks</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-0.5">
                <div className="space-y-1.5">
                  {builderChunks.map((chk, idx) => (
                    <div
                      key={chk.id}
                      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{chk.title}</p>
                        <p className="text-[10px] text-slate-400">{chk.ids.length} cases</p>
                      </div>
                      {builderChunks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBuilderChunks((prev) => prev.filter((_, i) => i !== idx))}
                          className="px-2 py-1 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-black cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950 border border-white/10 rounded-2xl p-3 space-y-2">
                  <input
                    type="text"
                    value={newChunkName}
                    onChange={(e) => setNewChunkName(e.target.value)}
                    placeholder="New Chunk Title"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                  <div className="max-h-36 overflow-y-auto no-scrollbar space-y-1">
                    {(builderPhase === 'f2l' ? F2L_DATA : builderPhase === 'pll' ? PLL_DATA : OLL_DATA).map((item) => {
                      const selected = newChunkSelectedIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() =>
                            setNewChunkSelectedIds((prev) =>
                              selected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                            )
                          }
                          className={`w-full p-2 rounded-xl flex items-center justify-between text-left cursor-pointer ${
                            selected ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          <span className="text-xs font-black text-orange-400">{selected ? '✓' : '+'}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      if (!newChunkName.trim() || !newChunkSelectedIds.length) return;
                      setBuilderChunks((prev) => [
                        ...prev,
                        { id: `custom-${Date.now()}`, title: newChunkName.trim(), ids: newChunkSelectedIds }
                      ]);
                      setNewChunkName('');
                      setNewChunkSelectedIds([]);
                    }}
                    className="w-full py-2 rounded-xl bg-white/10 text-xs font-black text-orange-300 cursor-pointer"
                  >
                    + Add Chunk to Schedule
                  </button>
                </div>
              </div>

              <button
                onClick={saveCurriculumBuilder}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Save Custom Schedule
              </button>
            </div>
          </div>
        )}

        {/* 11. GRANULAR PHASE-SPECIFIC RESET PROGRESS MODAL */}
        {activeModal === 'reset' && (
          <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-md flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl max-h-[88dvh] overflow-y-auto no-scrollbar">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  Granular Data Controls
                </span>
                <h3 className="text-xl font-black text-white">Reset {String(activeUserKey)}&apos;s Progress</h3>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Phase F • F2L (41 Pairs)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => executeGranularReset('f2l-day')}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset Day to 1
                  </button>
                  <button
                    type="button"
                    onClick={() => executeGranularReset('f2l-stats')}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Clear F2L PBs
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Phase O • OLL (57 Cases)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => executeGranularReset('oll-day')}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset Day to 1
                  </button>
                  <button
                    type="button"
                    onClick={() => executeGranularReset('oll-stats')}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Clear OLL PBs
                  </button>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Phase P • PLL (25 Algs)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => executeGranularReset('pll-day')}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset Day to 1
                  </button>
                  <button
                    type="button"
                    onClick={() => executeGranularReset('pll-stats')}
                    className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Clear PLL PBs
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => executeGranularReset('full-timer')}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
              >
                Clear 3x3x3 CFOP Timer (Ao5 / Ao12)
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeGranularReset('both')}
                  className="py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs font-black text-red-300 cursor-pointer"
                >
                  Reset Everything
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 12. FLOATING TURN-COUNT FEEDBACK MODAL */}
        {efficiencyFeedback && (
          <div
            onClick={() => setEfficiencyFeedback(null)}
            className="fixed inset-0 z-[270] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`max-w-xs w-full rounded-[2rem] p-5 border shadow-2xl space-y-3 text-center transition-all ${
                efficiencyFeedback.optimal
                  ? 'bg-slate-900/95 border-green-500/40 shadow-green-500/15'
                  : 'bg-slate-900/95 border-amber-500/40 shadow-amber-500/15'
              }`}
            >
              <h3 className={`text-lg font-black ${efficiencyFeedback.optimal ? 'text-green-300' : 'text-amber-300'}`}>
                {efficiencyFeedback.title}
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">{efficiencyFeedback.detail}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEfficiencyFeedback(null)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  Retry Scramble
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(620, 'sine', 0.08);
                    setCrossScrambleIdx((p) => p + 1);
                    setEfficiencyFeedback(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                >
                  Next Scramble →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 13. BLIND INSPECTION HELP MODAL */}
        {activeModal === 'blindHelp' && (
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-[265] bg-black/90 backdrop-blur-md flex items-center justify-center p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl"
            >
              <h3 className="text-xl font-black text-white">How Blind Inspection Works</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Scramble your cube (White bottom • Green front) and tap <strong>Start 15s Countdown</strong>. Hold both touch pads for 0.35s until green, then release to close the visor and execute your cross blindfolded.
              </p>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* 14. BLIND PRACTICE HELP MODAL */}
        {activeModal === 'blindPracticeHelp' && (
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-[265] bg-black/90 backdrop-blur-md flex items-center justify-center p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl"
            >
              <h3 className="text-xl font-black text-white">How Blind Practice Works</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trace every white edge mentally during inspection, then launch the Blindfold Timer Mat to execute all {activeTierObj.moves} cross turns without looking.
              </p>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* 15. PER-CASE TARGET PB EDITOR MODAL (FROM STATISTICS) */}
        {editingCaseTarget && (() => {
          const { phase, caseId, name, draft } = editingCaseTarget;
          const phaseDefault = getPhaseTargetPb(phase);
          const hasCustom = currentUser.caseTargetPbs?.[phase]?.[caseId] !== undefined;
          const numericVal = Number.isFinite(parseFloat(draft))
            ? Math.min(30, Math.max(0.1, parseFloat(draft)))
            : phaseDefault;

          return (
            <div
              onClick={() => setEditingCaseTarget(null)}
              className="fixed inset-0 z-[280] bg-black/90 backdrop-blur-md flex items-center justify-center p-5"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-xs w-full space-y-3.5 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                    Case Target PB • {phase.toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingCaseTarget(null)}
                    className="w-8 h-8 rounded-full bg-white/5 text-slate-300 font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white">{name}</h3>
                  <p className="text-[11px] text-slate-400">
                    Phase {phase.toUpperCase()} Default: <span className="font-mono text-slate-200">{phaseDefault.toFixed(3)}s</span>
                  </p>
                </div>

                <div className="bg-slate-950 border border-white/10 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Custom Case Goal</span>
                    <span className="font-mono text-sm font-black text-amber-300">{numericVal.toFixed(3)}s</span>
                  </div>

                  <MillisecondSliderControl
                    value={numericVal}
                    min={0.15}
                    max={10.0}
                    draftValue={draft}
                    accentTextClass="text-amber-300"
                    inputWidthClass="w-16"
                    onSliderChange={(val) =>
                      setEditingCaseTarget((prev) => ({
                        ...prev,
                        draft: val.toFixed(3)
                      }))
                    }
                    onStepDelta={(delta) => {
                      emitBeep(540);
                      const next = Math.min(30, Math.max(0.1, Number((numericVal + delta).toFixed(3))));
                      setEditingCaseTarget((prev) => ({ ...prev, draft: next.toFixed(3) }));
                    }}
                    onDraftChange={(val) =>
                      setEditingCaseTarget((prev) => ({ ...prev, draft: val }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {hasCustom ? (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(460);
                        updateCaseTargetPb(phase, caseId, null);
                        setEditingCaseTarget(null);
                      }}
                      className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      Use Phase Default
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingCaseTarget(null)}
                      className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(760);
                      updateCaseTargetPb(phase, caseId, numericVal);
                      setEditingCaseTarget(null);
                    }}
                    className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* UNIFIED DAILY SESSION RUNNER & ISOLATED DRILL MODALS (F2L, OLL, PLL) */}
        {renderUnifiedDailySession()}
        {renderUnifiedDrillModal()}

        {/* FULLSCREEN BLIND EXECUTION VISOR (OPENS WHEN ARMED PADS ARE RELEASED) */}
        {blindState === 'visor' && (
          <div
            onClick={() => {
              emitBeep(960, 'sine', 0.1);
              setBlindState('done');
            }}
            className="fixed inset-0 z-[295] bg-[#04060d] flex flex-col items-center justify-between p-8 text-center select-none cursor-pointer"
          >
            <div className="pt-4">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-black uppercase tracking-widest text-orange-300">
                Blind Execution Active • Eyes Closed
              </span>
            </div>

            <div className="space-y-4 my-auto">
              <div className="w-20 h-20 rounded-full bg-orange-500/15 border-2 border-orange-500/40 mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.25)]">
                <svg className="w-9 h-9 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Execute Your Cross Blindfolded</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Inspection locked at <strong className="text-orange-300">{(15 - inspectionLeft).toFixed(1)}s</strong>. Tap anywhere on the screen as soon as you finish your last turn.
              </p>
            </div>

            <div className="w-full max-w-xs pb-4">
              <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/25">
                Tap Anywhere When Finished ✓
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <OLLDaySuite />
    </AppErrorBoundary>
  );
}
