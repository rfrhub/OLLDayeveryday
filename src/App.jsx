import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera, EyeOff, Layers, Settings, Zap, Grid, BarChart3, AlignJustify,
  RotateCw, X, Lock, Check, ChevronUp, ChevronDown, GripVertical, Pencil, Delete, Star, Sparkles, ArrowRight, ArrowLeft
} from 'lucide-react';

// =========================================================================
// 1. FIREBASE, STORAGE & TIER HELPERS
// =========================================================================
function resolveFirebaseConfig() {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const p = typeof process !== 'undefined' && process.env ? process.env : {};
    const rawConfig =
      g.__firebase_config ||
      g.VITE_FIREBASE_CONFIG ||
      import.meta.env?.VITE_FIREBASE_CONFIG ||
      p.VITE_FIREBASE_CONFIG ||
      p.REACT_APP_FIREBASE_CONFIG ||
      null;
    if (rawConfig) {
      const parsed = typeof rawConfig === 'string' ? JSON.parse(rawConfig) : rawConfig;
      if (parsed?.apiKey) return parsed;
    }
    const apiKey = g.VITE_FIREBASE_API_KEY || import.meta.env?.VITE_FIREBASE_API_KEY || p.VITE_FIREBASE_API_KEY;
    const projectId = g.VITE_FIREBASE_PROJECT_ID || import.meta.env?.VITE_FIREBASE_PROJECT_ID || p.VITE_FIREBASE_PROJECT_ID;
    if (apiKey && projectId) {
      return {
        apiKey,
        authDomain: g.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || p.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
        projectId,
        storageBucket: g.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || p.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
        messagingSenderId: g.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || p.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: g.VITE_FIREBASE_APP_ID || import.meta.env?.VITE_FIREBASE_APP_ID || p.VITE_FIREBASE_APP_ID || ''
      };
    }
  } catch {}
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
      const appInstance = appMod.getApps().length > 0 ? appMod.getApp() : appMod.initializeApp(resolvedFirebaseConfig);
        let db;
        try {
          db = fsMod.initializeFirestore(appInstance, {
            localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() })
          });
        } catch {
          db = fsMod.getFirestore(appInstance);
        }
        return { auth: authMod.getAuth(appInstance), db, authMod, fsMod };
      } catch {
        firebaseSdkPromise = null;
        return null;
      }
    })();
  }
  return firebaseSdkPromise;
}

const rawAppId =
  (typeof globalThis !== 'undefined' && (globalThis.__app_id || globalThis.VITE_APP_ID) && String(globalThis.__app_id || globalThis.VITE_APP_ID)) ||
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

const storage = {
  getJson(key, fallback) {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  setJson(key, value) {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  getStr(key, fallback = '') {
    try {
      return (typeof window !== 'undefined' && window.localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  },
  setStr(key, value) {
    try {
      if (typeof window !== 'undefined') {
        if (value) window.localStorage.setItem(key, value);
        else window.localStorage.removeItem(key);
      }
    } catch {}
  }
};

const FREE_F2L_CASE_IDS = [1, 2, 3, 4];
const FREE_OLL_CASE_IDS = [27, 26, 21, 22, 23, 24, 25];
const FREE_PLL_CASE_IDS = [1, 2, 3, 4, 5, 6, 7];

function isCaseUnlockedForTraining(phase, caseId, isPro) {
  if (isPro) return true;
  if (phase === 'f2l') return FREE_F2L_CASE_IDS.includes(caseId);
  if (phase === 'oll') return FREE_OLL_CASE_IDS.includes(caseId);
  if (phase === 'pll') return FREE_PLL_CASE_IDS.includes(caseId);
  return true;
}

const SOLVED_54_STATE = [
  ...Array(9).fill('Y'), ...Array(9).fill('O'), ...Array(9).fill('G'),
  ...Array(9).fill('W'), ...Array(9).fill('R'), ...Array(9).fill('B')
];

// =========================================================================
// 2A. STATE-SIMULATING FULL CFOP SOLVER & ALGEBRAIC MOVE SIMPLIFIER
// =========================================================================
function simplifyMoveSequence(algStr = '', preserveParens = false) {
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

function formatAlgWithTriggerBrackets(algStr = '') {
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

const scannedFacesTo54Array = (u, f, r, d, b, l) => [...u, ...r, ...f, ...d, ...l, ...b];

const normalizeColorPattern = (stickers) => {
  const map = {};
  let idx = 0;
  return stickers.map((c) => (map[c] ??= String(idx++))).join('');
};

function buildOrientationTipForStage(phaseKey, caseObj, algStr = '', aufHint = '', slotInfo = null) {
  const cleanAlg = (algStr || '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const preAufMatch = (aufHint || '').match(/Pre-AUF:\s*(U2|U'|U)/i);
  const preAuf = preAufMatch ? preAufMatch[1] : '';
  const hasLeadingY = /^y2\b|^y'\b|^y\b/.test(cleanAlg);
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

function applyMovesTo54State(stateArr, movesStr) {
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

const OPTIMAL_CROSS_CACHE = new Map();
const CROSS_HTM_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'F', "F'", 'F2', 'R', "R'", 'R2', 'B', "B'", 'B2', 'L', "L'", 'L2'];
const OPPOSITE_FACE_MAP = { U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L' };
const CROSS_EDGE_SPECS = [
  { dIdx: 28, sideIdx: 25, centerCol: 'G' },
  { dIdx: 32, sideIdx: 16, centerCol: 'O' },
  { dIdx: 34, sideIdx: 52, centerCol: 'B' },
  { dIdx: 30, sideIdx: 43, centerCol: 'R' }
];

function encodeCrossEdgesKey(s) {
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

function crossHeuristicLowerBound(s) {
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

function solveExactCrossFrom54(startState) {
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

function isFrontRightF2LSolved54(s) {
  return s[29] === 'W' && s[26] === s[22] && s[23] === s[22] && s[15] === s[13] && s[12] === s[13];
}

function countSolvedF2LSlots54(s) {
  let rot = [...s];
  let count = 0;
  for (let i = 0; i < 4; i++) {
    if (isFrontRightF2LSolved54(rot)) count++;
    rot = applyMovesTo54State(rot, 'y');
  }
  return count;
}

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

function solveAllF2LPairsFrom54(postCrossState) {
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

function analyzeFull54Cube(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid) {
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

const TRIGGER_TAGS_CACHE = new Map();

function buildDynamicCustomFingertrickText(alg = '', fallbackText = '') {
  const normalized = (alg || '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return fallbackText;
  const cues = [];
  if (normalized.includes("R U R' U'")) cues.push("Sexy Move (R U R' U') in one wrist-and-index flow");
  if (normalized.includes("L' U' L U")) cues.push("Left Sexy (L' U' L U) with left index U' flick");
  if (!normalized.includes("R U R' U'") && normalized.includes("R U' R'")) cues.push("Inverse Sexy (R U' R') pushing U' with left index");
  if (normalized.includes("R' F R F'")) cues.push("Sledgehammer (R' F R F') lifting F' with right thumb");
  if (normalized.includes("F R' F' R")) cues.push("Hedgeslammer (F R' F' R) keeping right thumb on DF");
  if (/\bU2\b/.test(normalized)) cues.push("double-flick U2 (index → middle)");
  if (/\bM2?\b|\bM'/.test(normalized)) cues.push("flick M-slice from DB with left ring/middle");
  if (/\bD2?\b|\bD'/.test(normalized)) cues.push("push D/D' with bottom ring fingers");
  if (cues.length === 0) {
    return /\b[Ff]/.test(normalized)
      ? "Anchor right thumb on DF to flick F/F' smoothly without regripping."
      : "Keep thumbs on Front-Bottom (DF) and execute in regripless wrist bursts.";
  }
  const joined = cues.slice(0, 3).join('; ');
  return `${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
}

function getAlgorithmTriggerTags(alg = '') {
  if (TRIGGER_TAGS_CACHE.has(alg)) return TRIGGER_TAGS_CACHE.get(alg);
  const normalized = alg.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  const tags = [];
  if (normalized.includes("R U R' U'")) tags.push({ label: "Sexy Move (R U R' U')", badgeClass: FINGERTRICK_CODEX[0].badgeClass, dotClass: FINGERTRICK_CODEX[0].dotClass });
  if (normalized.includes("L' U' L U")) tags.push({ label: "Left Sexy (L' U' L U)", badgeClass: FINGERTRICK_CODEX[1].badgeClass, dotClass: FINGERTRICK_CODEX[1].dotClass });
  if (!normalized.includes("R U R' U'") && normalized.includes("R U' R'")) tags.push({ label: "Inverse Sexy (R U' R')", badgeClass: FINGERTRICK_CODEX[2].badgeClass, dotClass: FINGERTRICK_CODEX[2].dotClass });
  if (normalized.includes("R' F R F'")) tags.push({ label: "Sledgehammer (R' F R F')", badgeClass: FINGERTRICK_CODEX[3].badgeClass, dotClass: FINGERTRICK_CODEX[3].dotClass });
  if (normalized.includes("F R' F' R")) tags.push({ label: "Hedgeslammer (F R' F' R)", badgeClass: FINGERTRICK_CODEX[4].badgeClass, dotClass: FINGERTRICK_CODEX[4].dotClass });
  if (/\bM2?\b|\bM'/.test(normalized)) tags.push({ label: 'M-Slice Flick', badgeClass: FINGERTRICK_CODEX[6].badgeClass, dotClass: FINGERTRICK_CODEX[6].dotClass });
  if (/\bD2?\b|\bD'/.test(normalized)) tags.push({ label: 'Ring-Finger D', badgeClass: FINGERTRICK_CODEX[7].badgeClass, dotClass: FINGERTRICK_CODEX[7].dotClass });
  TRIGGER_TAGS_CACHE.set(alg, tags);
  return tags;
}

const F2L_VIEW_ANGLES = [
  { label: 'Front-Right (Target)', rot: 'y35x-25', yaw: -35, pitch: -25 },
  { label: 'Front-Left (Green/Red)', rot: 'y-35x-25', yaw: 35, pitch: -25 },
  { label: 'Back-Right (Orange/Blue)', rot: 'y135x-25', yaw: -135, pitch: -25 },
  { label: 'Back-Left (Blue/Red)', rot: 'y-135x-25', yaw: 135, pitch: -25 }
];

function getClosestF2LAngleLabel(yaw, pitch) {
  const normYaw = ((((yaw + 180) % 360) + 360) % 360) - 180;
  if (pitch > 20) return 'Bottom View';
  if (normYaw >= -90 && normYaw < 0) return 'Front-Right (Target)';
  if (normYaw >= 0 && normYaw < 90) return 'Front-Left (Green/Red)';
  if (normYaw < -90) return 'Back-Right (Orange/Blue)';
  return 'Back-Left (Blue/Red)';
}

const getF2LImageUrl = (alg, rot = 'y35x-25', setupScramble = null) => {
  const cleanCase = (alg || '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  const cleanSetup = (setupScramble || '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  const baseUrl = `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=f2l&bg=t&cc=080b12&co=100&fc=yyyyyyyyyooooooooogggggggggwwwwwwwwwrrrrrrrrrbbbbbbbbb&r=${rot}`;
  return cleanSetup ? `${baseUrl}&alg=${encodeURIComponent(cleanSetup)}` : `${baseUrl}&case=${encodeURIComponent(cleanCase)}`;
};

const getOLLImageUrl = (alg) => {
  const cleanCase = (alg || '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  return `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&view=plan&stage=oll&bg=t&cc=1e293b&case=${encodeURIComponent(cleanCase)}`;
};

const getPLLImageUrl = (alg, setupScramble = null) => {
  const cleanCase = (alg || '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  const cleanSetup = (setupScramble || '').replace(/[()]/g, '').replace(/\s+/g, ' ').trim();
  const baseUrl = 'https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&view=plan&stage=pll&bg=t&cc=1e293b';
  return cleanSetup ? `${baseUrl}&alg=${encodeURIComponent(cleanSetup)}` : `${baseUrl}&case=${encodeURIComponent(cleanCase)}`;
};

// Persistent IndexedDB + In-Memory VisualCube SVG Cache
const VISUALCUBE_SVG_CACHE = new Map();
const VISUALCUBE_INFLIGHT = new Map();
const VISUALCUBE_FETCH_QUEUE = [];
let visualCubeActiveFetches = 0;
let vcIdbPromise = null;

function openVisualCubeIdb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!vcIdbPromise) {
    vcIdbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open('ollday_vc_svg_db', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('svgs')) db.createObjectStore('svgs');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return vcIdbPromise;
}

async function readVisualCubeFromIdb(url) {
  const db = await openVisualCubeIdb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('svgs', 'readonly');
      const req = tx.objectStore('svgs').get(url);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeVisualCubeToIdb(url, dataUri) {
  const db = await openVisualCubeIdb();
  if (!db) return;
  try {
    const tx = db.transaction('svgs', 'readwrite');
    tx.objectStore('svgs').put(dataUri, url);
  } catch {}
}

function pumpVisualCubeQueue() {
  if (typeof document !== 'undefined' && document.hidden) return;
  while (visualCubeActiveFetches < 10 && VISUALCUBE_FETCH_QUEUE.length > 0) {
    const job = VISUALCUBE_FETCH_QUEUE.shift();
    if (!job) break;
    visualCubeActiveFetches++;
    fetch(job.url, { priority: job.highPriority ? 'high' : 'low' })
      .then((res) => (res.ok ? res.text() : null))
      .then((svgText) => {
        if (!svgText?.includes('<svg')) return null;
        const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}`;
        VISUALCUBE_SVG_CACHE.set(job.url, dataUri);
        writeVisualCubeToIdb(job.url, dataUri);
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

function enqueueVisualCubeFetch(url, highPriority = false) {
  if (!url) return Promise.resolve(null);
  if (VISUALCUBE_SVG_CACHE.has(url)) return Promise.resolve(VISUALCUBE_SVG_CACHE.get(url));
  if (VISUALCUBE_INFLIGHT.has(url)) return VISUALCUBE_INFLIGHT.get(url);
  const promise = (async () => {
    const idbHit = await readVisualCubeFromIdb(url);
    if (idbHit) {
      VISUALCUBE_SVG_CACHE.set(url, idbHit);
      VISUALCUBE_INFLIGHT.delete(url);
      return idbHit;
    }
    return new Promise((resolve) => {
      if (highPriority) VISUALCUBE_FETCH_QUEUE.unshift({ url, resolve, highPriority: true });
      else VISUALCUBE_FETCH_QUEUE.push({ url, resolve, highPriority: false });
      pumpVisualCubeQueue();
    });
  })();
  VISUALCUBE_INFLIGHT.set(url, promise);
  return promise;
}

let hasPrewarmedLibrary = false;
function prewarmVisualCubeLibrary(priorityUrls = []) {
  priorityUrls.filter(Boolean).forEach((url) => enqueueVisualCubeFetch(url, true));
  if (hasPrewarmedLibrary || typeof window === 'undefined') return;
  hasPrewarmedLibrary = true;
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) pumpVisualCubeQueue();
    });
  }
  const runIdlePrewarm = () => {
    const allUrls = [
      ...F2L_DATA.map((c) => getF2LImageUrl(c.alg)),
      ...OLL_DATA.map((c) => getOLLImageUrl(c.alg)),
      ...PLL_DATA.map((c) => getPLLImageUrl(c.alg))
    ];
    allUrls.forEach((url) => {
      if (!VISUALCUBE_SVG_CACHE.has(url)) enqueueVisualCubeFetch(url, false);
    });
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(runIdlePrewarm, { timeout: 1500 });
  else setTimeout(runIdlePrewarm, 300);
}

function CachedVisualCubeImg({ url, alt, className, lazy = true }) {
  const [src, setSrc] = useState(() => (url && VISUALCUBE_SVG_CACHE.get(url)) || url || '');

  useEffect(() => {
    let active = true;
    const cached = url ? VISUALCUBE_SVG_CACHE.get(url) : '';
    if (cached) {
      setSrc(cached);
      return undefined;
    }
    setSrc(url || '');
    if (!url) return undefined;
    enqueueVisualCubeFetch(url, !lazy).then((dataUri) => {
      if (active && dataUri) setSrc(dataUri);
    });
    return () => { active = false; };
  }, [url, lazy]);

  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : undefined}
      decoding="async"
      onError={() => {
        if (url && src !== url) setSrc(url);
      }}
      className={className}
    />
  );
}

function generatePLLSetupScramble(inverseAlg, variationSeed = 0) {
  if (variationSeed === 0) return inverseAlg;
  const aufOptions = ['', 'U', "U'", 'U2'];
  return `${aufOptions[variationSeed % 4]} ${inverseAlg} ${aufOptions[Math.floor(variationSeed / 2) % 4]}`.replace(/\s+/g, ' ').trim();
}

function generate3x3Scramble(length = 20) {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
  const axis = { U: 'UD', D: 'UD', L: 'LR', R: 'LR', F: 'FB', B: 'FB' };
  const mods = ['', "'", '2'];
  const seq = [];
  let prevFace = '';
  let prevAxis = '';
  while (seq.length < length) {
    const f = faces[Math.floor(Math.random() * 6)];
    if (f === prevFace || (axis[f] === prevAxis && seq.length >= 2 && axis[seq[seq.length - 2][0]] === axis[f])) continue;
    seq.push(`${f}${mods[Math.floor(Math.random() * 3)]}`);
    prevAxis = axis[f];
    prevFace = f;
  }
  return seq.join(' ');
}

function computeWcaAverage(history, windowSize) {
  if (!Array.isArray(history) || history.length < windowSize) return null;
  const recent = history.slice(0, windowSize);
  if (recent.filter((s) => s.penalty === 'DNF').length >= 2) return 'DNF';
  const values = recent
    .map((s) => (s.penalty === 'DNF' ? Infinity : Number(s.ms) + (s.penalty === '+2' ? 2000 : 0)))
    .sort((a, b) => a - b)
    .slice(1, windowSize - 1);
  return values.some((v) => !Number.isFinite(v)) ? 'DNF' : values.reduce((a, b) => a + b, 0) / values.length;
}

function computeCaseWindowAvg(timesSecList, windowSize) {
  if (!Array.isArray(timesSecList) || timesSecList.length < windowSize) return null;
  const recent = timesSecList.slice(0, windowSize).map(Number).filter(Number.isFinite);
  if (recent.length < windowSize) return null;
  const trimmed = recent.sort((a, b) => a - b).slice(1, windowSize - 1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

const formatMsTime = (ms, decimals = 2) => (ms == null || !Number.isFinite(Number(ms)) ? '—' : `${(Number(ms) / 1000).toFixed(decimals)}s`);

const SCANNER_COLOR_CODES = ['Y', 'W', 'G', 'B', 'O', 'R'];
const SCANNER_COLOR_META = {
  Y: { label: 'Yellow', hex: '#facc15', rgb: [250, 204, 21] },
  W: { label: 'White', hex: '#f8fafc', rgb: [248, 250, 252] },
  G: { label: 'Green', hex: '#22c55e', rgb: [34, 197, 94] },
  B: { label: 'Blue', hex: '#3b82f6', rgb: [59, 130, 246] },
  O: { label: 'Orange', hex: '#f97316', rgb: [249, 115, 22] },
  R: { label: 'Red', hex: '#ef4444', rgb: [239, 68, 68] }
};

function rgbToHsv(r, g, b) {
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

function rgbToLab(r, g, b) {
  const toLin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const [rl, gl, bl] = [toLin(r), toLin(g), toLin(b)];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f((rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047);
  const fy = f((rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000);
  const fz = f((rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function classifyStickerRgb(rgb, centerSamples) {
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

const SCANNER_FLAT_GRID_CENTROIDS = Array.from({ length: 9 }, (_, i) => [
  (32 + (136 / 3) * ((i % 3) + 0.5)) / 200,
  (32 + (136 / 3) * (Math.floor(i / 3) + 0.5)) / 200
]);

const SCANNER_SAMPLE_OFFSETS = [
  [0, 0], [-0.018, -0.018], [0.018, -0.018], [-0.018, 0.018],
  [0.018, 0.018], [0, -0.026], [0, 0.026], [-0.026, 0], [0.026, 0]
];

function classifyCapturedFaceBatch(rawFacesMap, fallbackFaces, lockedFaces = {}, savedPalette = null) {
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
      classifyStickerRgb(rgb, centerSamples)
    );
  });
  return nextFaces;
}

let CACHED_SIGNATURES = null;
function getCaseSignatures() {
  if (CACHED_SIGNATURES) return CACHED_SIGNATURES;
  const ollSigs = OLL_DATA.map((item) => {
    let curSt = applyMovesTo54State(SOLVED_54_STATE, invertAlgorithm(item.alg));
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
    let curSt = applyMovesTo54State(SOLVED_54_STATE, invertAlgorithm(item.alg));
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

function matchBestOllFromGrids(uGrid, fGrid, rGrid, bGrid = null, lGrid = null, topColor = 'Y') {
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

function matchBestPllFromGrids(fGrid, rGrid, bGrid = null, lGrid = null, full54State = null) {
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

function analyzeScanned3FaceCube(uGrid, fGrid, rGrid, fullMeta = null, userHints = null, full54State = null) {
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

const NOTATION_KEYPAD_GROUPS = [
  { label: 'Right & Up', moves: ['R', "R'", 'R2', 'U', "U'", 'U2'] },
  { label: 'Front & Left', moves: ['F', "F'", 'F2', 'L', "L'", 'L2'] },
  { label: 'Down & Back', moves: ['D', "D'", 'D2', 'B', "B'", 'B2'] },
  { label: 'Wide & Slice', moves: ['r', "r'", 'l', "l'", 'u', "u'", 'f', "f'", 'M', "M'", 'M2'] },
  { label: 'Rotations', moves: ['x', "x'", 'y', "y'", 'y2', 'z', "z'"] }
];

function sanitizeCustomAlgTokens(rawAlg = '') {
  return (rawAlg || '')
    .replace(/[()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((tok) => /^(?:[UDFBRLrlufMESxyz])(?:2|')?$/.test(tok))
    .join(' ');
}

const MAX_CUSTOM_ALGS_PER_CASE = 7;

function normalizeCaseCustomAlgs(rawEntry) {
  if (!rawEntry) return { list: [], activeId: null };
  if (typeof rawEntry === 'object' && !Array.isArray(rawEntry) && typeof rawEntry.alg === 'string') {
    const legacyId = 'custom-1';
    return {
      list: [
        {
          id: legacyId,
          label: 'Alt 1',
          alg: rawEntry.alg,
          rawAlg: rawEntry.rawAlg || rawEntry.alg,
          assignFingertricks: rawEntry.assignFingertricks !== false
        }
      ],
      activeId: rawEntry.useCustom === false ? null : legacyId
    };
  }
  const list = Array.isArray(rawEntry.list)
    ? rawEntry.list
        .filter((item) => item && typeof item.alg === 'string' && item.alg.trim())
        .slice(0, MAX_CUSTOM_ALGS_PER_CASE)
        .map((item, idx) => ({
          id: typeof item.id === 'string' ? item.id : `custom-${idx + 1}`,
          label: typeof item.label === 'string' && item.label.trim() ? item.label.trim() : `Alt ${idx + 1}`,
          alg: item.alg,
          rawAlg: item.rawAlg || item.alg,
          assignFingertricks: item.assignFingertricks !== false
        }))
    : [];
  const activeId = typeof rawEntry.activeId === 'string' && list.some((c) => c.id === rawEntry.activeId) ? rawEntry.activeId : null;
  return { list, activeId };
}

function resolveEffectiveCase(item, customAlgsMap, phaseKey) {
  if (!item) return item;
  const { list, activeId } = normalizeCaseCustomAlgs(customAlgsMap?.[phaseKey]?.[item.id]);
  if (list.length === 0) {
    return { ...item, defaultAlg: item.alg, customAlgList: [], activeCustomId: null, hasCustomAlg: false, usingCustomAlg: false, customEntry: null };
  }
  const activeIdx = activeId ? list.findIndex((c) => c.id === activeId) : -1;
  const activeEntry = activeIdx >= 0 ? list[activeIdx] : null;
  const usingCustom = Boolean(activeEntry);
  const customCode = usingCustom ? `C#${activeIdx + 1}` : '';
  const effectiveName = usingCustom ? `${item.name} • ${customCode}` : item.name;
  const effectiveAlg = usingCustom ? activeEntry.alg : item.alg;
  const effectiveFingertrick = usingCustom
    ? buildDynamicCustomFingertrickText(effectiveAlg, item.fingertrick)
    : item.fingertrick;
  return {
    ...item,
    baseName: item.name,
    name: effectiveName,
    customCode,
    defaultAlg: item.alg,
    alg: effectiveAlg,
    fingertrick: effectiveFingertrick,
    inverse: usingCustom ? invertAlgorithm(activeEntry.alg) : item.inverse,
    customAlgList: list,
    activeCustomId: activeEntry ? activeEntry.id : null,
    hasCustomAlg: true,
    usingCustomAlg: usingCustom,
    customEntry: activeEntry || list[0],
    showCustomTriggerPills: usingCustom ? activeEntry.assignFingertricks !== false : true
  };
}

function verifyFocusedStageState(stagePhase, scannedFaces, hasFull6Faces, currentCaseId = null) {
  const uGrid = scannedFaces.U || Array(9).fill('Y');
  const fGrid = scannedFaces.F || Array(9).fill('G');
  const rGrid = scannedFaces.R || Array(9).fill('O');
  const dGrid = scannedFaces.D || Array(9).fill('W');
  const bGrid = scannedFaces.B || Array(9).fill('B');
  const lGrid = scannedFaces.L || Array(9).fill('R');
  const initial54 = scannedFacesTo54Array(uGrid, fGrid, rGrid, dGrid, bGrid, lGrid);

  if (stagePhase === 'oll') {
    const yellowCount = uGrid.filter((c) => c === 'Y').length;
    const yellowEdges = [1, 3, 5, 7].filter((i) => uGrid[i] === 'Y').length;
    if (yellowCount === 9) {
      return {
        stagePhase: 'oll',
        status: 'verified',
        title: 'Top Layer Already Oriented (9/9 Yellow) ✓',
        detail: 'All top-layer corners and edges already face Yellow. Tap "4. PLL Finish" below to verify your PLL case.'
      };
    }
    if (yellowEdges % 2 !== 0) {
      return {
        stagePhase: 'oll',
        status: 'warning',
        title: `Sticker Check: ${yellowEdges} Yellow Edge${yellowEdges === 1 ? '' : 's'} on Top (U)`,
        detail: 'A legal 3x3 OLL always has 0, 2, or 4 yellow edges on U. Tap the misread edge tile on Top (U) above to fix it, then re-verify.'
      };
    }

    const { bestOll, preAuf } = matchBestOllFromGrids(uGrid, fGrid, rGrid, hasFull6Faces ? bGrid : null, hasFull6Faces ? lGrid : null, 'Y');
    const verifiedAlg = simplifyMoveSequence(`${preAuf} ${bestOll.alg}`, true);
    const aufHint = preAuf ? `Pre-AUF: ${preAuf} before executing` : 'Ready from current angle (No Pre-AUF)';
    const changed = currentCaseId !== null && currentCaseId !== bestOll.id;

    return {
      stagePhase: 'oll',
      status: changed ? 'updated' : 'verified',
      caseObj: bestOll,
      alg: verifiedAlg,
      aufHint,
      orientationTip: buildOrientationTipForStage('oll', bestOll, verifiedAlg, aufHint),
      title: changed ? `Updated to Exact Top-Layer Match: ${bestOll.name}` : `Top Layer Verified ✓ • ${bestOll.name}`,
      detail: `${yellowCount}/9 Yellow stickers on U (${yellowEdges} edges oriented) • ${preAuf ? `Turn ${preAuf} first, then execute.` : 'Aligned from current angle.'}`
    };
  }

  if (stagePhase === 'pll') {
    const yellowCount = uGrid.filter((c) => c === 'Y').length;
    if (yellowCount < 9) {
      return {
        stagePhase: 'pll',
        status: 'warning',
        title: `Top Face Not Solid Yellow (${yellowCount}/9)`,
        detail: 'Complete OLL first or tap any misread Yellow tiles on Top (U) above before verifying PLL.'
      };
    }

    const sideStickers = hasFull6Faces
      ? [...fGrid.slice(0, 3), ...rGrid.slice(0, 3), ...bGrid.slice(0, 3), ...lGrid.slice(0, 3)]
      : [...fGrid.slice(0, 3), ...rGrid.slice(0, 3)];
    const sideCounts = {};
    sideStickers.forEach((c) => { sideCounts[c] = (sideCounts[c] || 0) + 1; });
    const overMax = Object.entries(sideCounts).filter(([, cnt]) => cnt > 3);
    if (overMax.length > 0) {
      return {
        stagePhase: 'pll',
        status: 'warning',
        title: `Top Perimeter Color Check: ${overMax.map(([c, cnt]) => `${SCANNER_COLOR_META[c]?.label || c} (${cnt}/3)`).join(', ')}`,
        detail: 'Each side color can appear at most 3 times in the top-layer ring. Tap the extra tile on F/R/B/L above to fix it.'
      };
    }

    const alreadySolved = hasFull6Faces
      ? fGrid.slice(0, 3).every((c) => c === 'G') && rGrid.slice(0, 3).every((c) => c === 'O') && bGrid.slice(0, 3).every((c) => c === 'B') && lGrid.slice(0, 3).every((c) => c === 'R')
      : fGrid.slice(0, 3).every((c) => c === 'G') && rGrid.slice(0, 3).every((c) => c === 'O');

    if (alreadySolved) {
      const solvedCase = PLL_BY_ID.get(1) || PLL_DATA[0];
      return {
        stagePhase: 'pll',
        status: 'verified',
        caseObj: solvedCase,
        alg: 'Cube Solved ✓ (0 Moves Needed)',
        aufHint: 'Solved! All top-layer pieces match their centers.',
        orientationTip: buildOrientationTipForStage('pll', solvedCase, '', 'Solved!'),
        title: 'Top Layer Solved ✓ (No PLL Needed)',
        detail: 'All visible top-layer corners and edges already match their side centers.'
      };
    }

    const { bestPll, preAuf, postAuf, aufHint } = matchBestPllFromGrids(
      fGrid, rGrid, hasFull6Faces ? bGrid : null, hasFull6Faces ? lGrid : null, hasFull6Faces ? initial54 : null
    );
    const verifiedAlg = simplifyMoveSequence(`${preAuf} ${bestPll.alg} ${postAuf}`, true);
    const changed = currentCaseId !== null && currentCaseId !== bestPll.id;

    return {
      stagePhase: 'pll',
      status: changed ? 'updated' : 'verified',
      caseObj: bestPll,
      alg: verifiedAlg,
      aufHint,
      orientationTip: buildOrientationTipForStage('pll', bestPll, verifiedAlg, aufHint),
      title: changed ? `Updated to Exact Top-Layer Match: ${bestPll.name}` : `Top Layer Verified ✓ • ${bestPll.name}`,
      detail: `${hasFull6Faces ? '4-Side' : '2-Side'} perimeter pattern matched (${bestPll.group})${postAuf ? ` • Finish with ${postAuf} AUF.` : '.'}`
    };
  }

  if (stagePhase === 'f2l') {
    const crossInfo = inspectCrossOn54(initial54);
    if (hasFull6Faces) {
      const solvedSlots = countSolvedF2LSlots54(initial54);
      if (solvedSlots === 4) {
        return {
          stagePhase: 'f2l',
          status: 'verified',
          title: 'All 4 F2L Slots Verified Solved (4/4) ✓',
          detail: 'All first-two-layer corner-edge pairs are seated. Tap "3. OLL Target" below to verify your top layer.'
        };
      }
      const f2lSol = solveAllF2LPairsFrom54(initial54);
      const firstStep = f2lSol.steps[0];
      const firstCase = firstStep?.caseObj || F2L_BY_ID.get(4) || F2L_DATA[0];
      const changed = currentCaseId !== null && currentCaseId !== firstCase.id;
      return {
        stagePhase: 'f2l',
        status: changed ? 'updated' : 'verified',
        caseObj: firstCase,
        alg: f2lSol.combinedAlg,
        subSteps: f2lSol.steps,
        orientationTip: buildOrientationTipForStage('f2l', firstCase, f2lSol.combinedAlg, '', firstStep),
        title: `${solvedSlots}/4 F2L Slots Solved • Next: ${firstCase.name}`,
        detail: `${crossInfo.solvedCount === 4 ? 'Cross ✓ • ' : `Cross ${crossInfo.solvedCount}/4 • `}Verified ${f2lSol.steps.length} remaining pair${f2lSol.steps.length === 1 ? '' : 's'}: ${f2lSol.steps.map((s) => `${s.slotLabel} (${s.caseObj.name})`).join(' → ')}.`
      };
    }

    const res3 = analyzeScanned3FaceCube(uGrid, fGrid, rGrid, null, { crossSolved: true });
    if (res3.phase !== 'f2l') {
      return {
        stagePhase: 'f2l',
        status: 'verified',
        title: 'Visible F2L Slots Solved ✓',
        detail: 'Front-Right, Front-Left, and Back-Right F2L columns match their centers. Capture D•B•L to verify back-left slot.'
      };
    }
    const changed = currentCaseId !== null && currentCaseId !== res3.matchedCase.id;
    return {
      stagePhase: 'f2l',
      status: changed ? 'updated' : 'verified',
      caseObj: res3.matchedCase,
      alg: res3.matchedCase.alg,
      orientationTip: res3.orientationTip,
      title: changed ? `Updated Front-Right Pair: ${res3.matchedCase.name}` : `Front-Right Pair Verified ✓ • ${res3.matchedCase.name}`,
      detail: 'Checked UFR corner and UF/UR/FR edge colors for your Front-Right (Green/Orange) slot.'
    };
  }

  const crossInfo = inspectCrossOn54(initial54);
  if (crossInfo.solvedCount === 4) {
    return {
      stagePhase: 'cross',
      status: 'verified',
      alg: 'Cross Already Solved ✓',
      orientationTip: buildOrientationTipForStage('cross', null, ''),
      title: 'White Cross Verified Solved (4/4) ✓',
      detail: 'All 4 bottom white cross edges (DF, DR, DB, DL) are aligned with their centers. Tap "2. F2L Pairs" next.'
    };
  }
  const crossSol = solveExactCrossFrom54(initial54);
  const formattedCross = crossSol.moves ? formatAlgWithTriggerBrackets(crossSol.moves) : "F R' D' R F2";
  return {
    stagePhase: 'cross',
    status: 'verified',
    alg: formattedCross,
    orientationTip: buildOrientationTipForStage('cross', null, formattedCross),
    title: `Cross Checked: ${crossInfo.solvedCount}/4 Edges Solved`,
    detail: `Remaining edges: ${crossInfo.unsolvedNames.join(', ')}. ${hasFull6Faces ? '6-face state verified.' : 'Capture D•B•L if back/left white edges are hidden.'}`
  };
}

const simulateCrossCubeState = (scramble = '') => applyMovesTo54State(SOLVED_54_STATE, scramble);
const STICKER_HEX = { Y: '#facc15', W: '#f8fafc', G: '#22c55e', B: '#3b82f6', O: '#f97316', R: '#ef4444' };
const CUBE_HALF_PX = 48;
const CUBE_FACES_META = [
  { offset: 18, transform: `rotateY(0deg) translateZ(${CUBE_HALF_PX}px)`, shade: 0.04 },
  { offset: 45, transform: `rotateY(180deg) translateZ(${CUBE_HALF_PX}px)`, shade: 0.14 },
  { offset: 9, transform: `rotateY(90deg) translateZ(${CUBE_HALF_PX}px)`, shade: 0.12 },
  { offset: 36, transform: `rotateY(-90deg) translateZ(${CUBE_HALF_PX}px)`, shade: 0.12 },
  { offset: 0, transform: `rotateX(90deg) translateZ(${CUBE_HALF_PX}px)`, shade: 0 },
  { offset: 27, transform: `rotateX(-90deg) translateZ(${CUBE_HALF_PX}px)`, shade: 0.22 }
];

function ProLockOverlay({ label, onClick, interactive = false, size = 'sm' }) {
  const pillClass = size === 'xs'
    ? 'px-2.5 py-0.5 text-[9.5px]'
    : 'px-3 py-1 text-[10px] shadow-lg';
  const Wrapper = interactive ? 'button' : 'div';
  return (
    <Wrapper
      {...(interactive ? { type: 'button', onClick } : {})}
      className={`absolute inset-0 z-10 bg-black/78 flex items-center justify-center ${interactive ? 'cursor-pointer' : 'pointer-events-none'}`}
    >
      <span className={`${pillClass} rounded-full bg-[#1a110b]/95 border border-orange-400/45 font-black uppercase tracking-wider text-orange-200`}>
        <Lock className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" />{label}
      </span>
    </Wrapper>
  );
}
// Flip to true once your Apple Developer Program / Game Center & Apple Sign-In credentials are configured
const SHOW_GAME_CENTER_AUTH = false;

function SocialAuthButtons({ onGoogle, onGameCenter, isNativeIos, showGameCenter = SHOW_GAME_CENTER_AUTH }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onGoogle}
        className="w-full py-3 px-4 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 hover:border-orange-400/55 text-white font-black text-xs uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_rgba(0,0,0,0.35)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
      >
        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
          </svg>
        </span>
        <span>Continue with Google</span>
      </button>

      {showGameCenter && (
        <button
          type="button"
          onClick={onGameCenter}
          className="w-full py-3 px-4 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 hover:border-orange-400/55 text-white font-black text-xs uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_rgba(0,0,0,0.35)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-sky-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="8.5" cy="9" r="3.8" fillOpacity="0.95" />
              <circle cx="15.5" cy="8.5" r="3" fillOpacity="0.85" />
              <circle cx="10.5" cy="15.5" r="3.3" fillOpacity="0.9" />
              <circle cx="16.2" cy="14.8" r="2.4" fillOpacity="0.8" />
            </svg>
          </span>
          <span>{isNativeIos ? 'Continue with Game Center' : 'Game Center / Apple'}</span>
        </button>
      )}

      <div className="flex items-center gap-2 pt-0.5 text-[9.5px] font-black uppercase tracking-widest text-zinc-400">
        <span className="h-px flex-1 bg-white/15" />
        <span>or solver profile</span>
        <span className="h-px flex-1 bg-white/15" />
      </div>
    </div>
  );
}
function TriggerTagsList({ tags, centered = false, compact = false }) {
  if (!tags?.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${centered ? 'justify-center' : ''}`}>
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={`inline-flex items-center gap-1 rounded-full border font-black ${
            compact ? 'px-1.5 py-0.5 text-[8.5px]' : 'px-2 py-0.5 text-[9px]'
          } ${tag.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
          {tag.label}
        </span>
      ))}
    </div>
  );
}

function CustomAlgSwitcherPills({ item, onSelect, stopPropagation = false }) {
  if (!item?.hasCustomAlg || !onSelect) return null;
  return (
    <div
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className="bg-white/[0.04] p-0.5 rounded-xl inline-flex items-center flex-wrap gap-0.5"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase cursor-pointer transition-all ${!item.usingCustomAlg ? 'bg-white/[0.14] text-white' : 'text-zinc-400 hover:text-white'}`}
      >
        Ours
      </button>
      {(item.customAlgList || []).map((cAlt, idx) => (
        <button
          key={cAlt.id}
          type="button"
          onClick={() => onSelect(cAlt.id)}
          className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase cursor-pointer transition-all ${item.activeCustomId === cAlt.id ? 'bg-orange-500 text-slate-950' : 'text-zinc-400 hover:text-white'}`}
        >
          #{idx + 1}
        </button>
      ))}
    </div>
  );
}

function Spatial3DCube({ stickers, isStickerActive, isStickerMuted, yaw, pitch, isDragging, cubeRef }) {
  const half = CUBE_HALF_PX;
  const renderFace = ({ offset, transform, shade }) => (
    <div
      key={offset}
      style={{
        position: 'absolute', width: `${half * 2}px`, height: `${half * 2}px`, transform,
        backfaceVisibility: 'hidden', backgroundColor: '#070a12', borderRadius: '10px', padding: '4px',
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
        gap: '3.5px', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.08)'
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
              boxShadow: dimmed ? 'inset 0 1px 1px rgba(255,255,255,0.06)' : 'inset 0 1.5px 2px rgba(255,255,255,0.45), inset 0 -1.5px 2px rgba(0,0,0,0.28)',
              position: 'relative', overflow: 'hidden'
            }}
          >
            {shade > 0 && <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(2, 6, 23, ${shade})` }} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ width: '154px', height: '154px', perspective: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} className="pointer-events-none">
      <div
        style={{
          position: 'absolute', bottom: '8px', width: '92px', height: '20px', borderRadius: '9999px',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 72%)',
          transform: `scale(${isDragging ? 1.08 : 1})`, transition: isDragging ? 'none' : 'transform 0.2s ease'
        }}
      />
      <div
        ref={cubeRef}
        style={{
          width: `${half * 2}px`, height: `${half * 2}px`, position: 'relative', transformStyle: 'preserve-3d',
          willChange: isDragging ? 'transform' : 'auto',
          transform: `translateZ(-12px) rotateX(${pitch}deg) rotateY(${yaw}deg) scale(${isDragging ? 1.05 : 1})`,
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)'
        }}
      >
        {CUBE_FACES_META.map(renderFace)}
      </div>
    </div>
  );
}

const CROSS_EDGE_PAIRS = {
  '0_1': 46, '45_1': 1, '0_3': 37, '36_1': 3, '0_5': 10, '9_1': 5, '0_7': 19, '18_1': 7,
  '27_1': 25, '18_7': 28, '27_3': 43, '36_7': 30, '27_5': 16, '9_7': 32, '27_7': 52, '45_7': 34,
  '18_3': 41, '36_5': 21, '18_5': 12, '9_3': 23, '45_3': 14, '9_5': 48, '45_5': 39, '36_3': 50
};

const CUBIE_STICKER_GROUPS_54 = (() => {
  const groups = Array.from({ length: 54 }, (_, i) => [i]);
  const cubies = [
    [1, 46], [5, 10], [7, 19], [3, 37],
    [28, 25], [32, 16], [34, 52], [30, 43],
    [23, 12], [21, 41], [48, 14], [50, 39],
    [8, 20, 9], [6, 18, 38], [2, 11, 45], [0, 36, 47],
    [29, 26, 15], [27, 24, 44], [35, 17, 51], [33, 42, 53]
  ];
  cubies.forEach((group) => {
    group.forEach((stickerIdx) => {
      groups[stickerIdx] = group;
    });
  });
  return groups;
})();

const isCrossStickerActive = (stickers, offset, idx) => {
  if (idx === 4) return true;
  if (![1, 3, 5, 7].includes(idx)) return false;
  if (stickers[offset + idx] === 'W') return true;
  const partner = CROSS_EDGE_PAIRS[`${offset}_${idx}`];
  return partner !== undefined && stickers[partner] === 'W';
};

const isF2LStickerMuted = (stickers, offset, idx) => {
  if (idx === 4) return false;
  const group = CUBIE_STICKER_GROUPS_54[offset + idx];
  return group ? group.some((sIdx) => stickers[sIdx] === 'Y') : stickers[offset + idx] === 'Y';
};

function CrossSpatial3DCube({ scramble, yaw, pitch, isDragging, cubeRef }) {
  const stickers = useMemo(() => simulateCrossCubeState(scramble), [scramble]);
  return <Spatial3DCube stickers={stickers} isStickerActive={isCrossStickerActive} yaw={yaw} pitch={pitch} isDragging={isDragging} cubeRef={cubeRef} />;
}

function F2LSpatial3DCube({ setupScramble, yaw, pitch, isDragging, cubeRef }) {
  const stickers = useMemo(() => simulateCrossCubeState(setupScramble), [setupScramble]);
  return <Spatial3DCube stickers={stickers} isStickerMuted={isF2LStickerMuted} yaw={yaw} pitch={pitch} isDragging={isDragging} cubeRef={cubeRef} />;
}

const STREAK_FACE_ORDER = [
  { offset: 0, color: 'Y', yaw: -22, pitch: -54 },   // Tiles 1-9: Top (Yellow - tilted toward viewer)
  { offset: 18, color: 'G', yaw: -22, pitch: -16 },  // Tiles 10-18: Front (Green)
  { offset: 9, color: 'O', yaw: -112, pitch: -16 },  // Tiles 19-27: Right (Orange)
  { offset: 45, color: 'B', yaw: -202, pitch: -16 }, // Tiles 28-36: Back (Blue)
  { offset: 36, color: 'R', yaw: -292, pitch: -16 }, // Tiles 37-45: Left (Red)
  { offset: 27, color: 'W', yaw: -22, pitch: 66 }    // Tiles 46-54: Bottom (White - pitched up clearly toward viewer)
];

const MINI_STREAK_HALF = 16;
const MINI_STREAK_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MINI_STREAK_FACES = [
  { offset: 18, transform: `rotateY(0deg) translateZ(${MINI_STREAK_HALF}px)` },
  { offset: 45, transform: `rotateY(180deg) translateZ(${MINI_STREAK_HALF}px)` },
  { offset: 9, transform: `rotateY(90deg) translateZ(${MINI_STREAK_HALF}px)` },
  { offset: 36, transform: `rotateY(-90deg) translateZ(${MINI_STREAK_HALF}px)` },
  { offset: 0, transform: `rotateX(90deg) translateZ(${MINI_STREAK_HALF}px)` },
  { offset: 27, transform: `rotateX(-90deg) translateZ(${MINI_STREAK_HALF}px)` }
];

function Streak3DCube({ streakDays = 0, currentDay = 1, totalDays = 1, progressPct = 0, streakActive = true }) {
  const safeStreak = Math.max(0, Number(streakDays) || 0);
  const safeTotalDays = Math.max(1, Number(totalDays) || 1);
  const safeCurDay = Math.min(safeTotalDays, Math.max(1, Number(currentDay) || 1));

  // Strictly driven by day progression across all phases (F2L, OLL, PLL):
  // Day 1 starts at 0/54 (all black squares); every subsequent day fills tiles linearly through Yellow -> Green -> Orange -> Blue -> Red -> White
  const daysProgressed = Math.max(0, safeCurDay - 1);
  const displayStreakDays = Math.max(safeStreak, daysProgressed);
  const totalSteps = Math.max(1, safeTotalDays - 1);
  const rawFilledSquares = safeCurDay === 1
    ? 0
    : Math.min(54, Math.max(daysProgressed, Math.round((daysProgressed / totalSteps) * 54)));

  // 50% milestone = Matte Finish (rotates & pulse glows); 75%+ = UV Coated (pulsates, glows & rotates 2x faster than Matte)
  const dayMilestonePct = safeCurDay === 1 ? 0 : Math.round((daysProgressed / totalSteps) * 100);
  const isUvCoated = safeCurDay > 1 && dayMilestonePct >= 75;
  const isMatteFinish = safeCurDay > 1 && !isUvCoated && dayMilestonePct >= 50;
  const isSpinGlowActive = isMatteFinish || isUvCoated;
  // Continue filling the remaining tiles (including White tiles 46-54 on the final days) without prematurely snapping to 54
  const filledSquares = rawFilledSquares;

  // Automatically rotates to face whichever side of the cube is actively being populated
  const activeFaceIdx = filledSquares === 0 ? 0 : Math.min(5, Math.floor((filledSquares - 1) / 9));
  const activeFaceSpec = STREAK_FACE_ORDER[activeFaceIdx];
  const [manualSpinOffset, setManualSpinOffset] = useState(0);

  useEffect(() => {
    setManualSpinOffset(0);
  }, [activeFaceIdx, safeCurDay]);

  const withinFaceTile = filledSquares === 0 ? 0 : ((filledSquares - 1) % 9);
  const tileSweepYaw = filledSquares === 0 ? 0 : (withinFaceTile - 4) * 3;
  const targetYaw = activeFaceSpec.yaw - tileSweepYaw + manualSpinOffset;
  const targetPitch = activeFaceSpec.pitch;

  const badgeLabel = isUvCoated
    ? <>UV Coated • {filledSquares}/54 <Sparkles className="w-2.5 h-2.5 inline-block -mt-0.5" /></>
    : isMatteFinish
    ? <>Matte Finish • {filledSquares}/54 <Sparkles className="w-2.5 h-2.5 inline-block -mt-0.5" /></>
    : `Day ${safeCurDay} • ${filledSquares}/54`;

  // During UV Coated, tilt pitch dynamically in the spin animation so the bottom White face (tiles 46-54) is clearly visible as it populates!
  const cubeSpinClass = isUvCoated
    ? 'uv-streak-cube-spin'
    : isMatteFinish
    ? 'matte-streak-cube-spin'
    : '';
  const cubeGlowClass = isUvCoated
    ? 'uv-streak-glow-pulse'
    : isMatteFinish
    ? 'matte-streak-glow-pulse'
    : '';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setManualSpinOffset((prev) => prev - 90);
      }}
      title={
        isUvCoated
          ? `Day ${safeCurDay} (${displayStreakDays}d Streak) • UV Coated Mode Active`
          : isMatteFinish
          ? `Day ${safeCurDay} (${displayStreakDays}d Streak) • 50% Matte Finish Active`
          : `Day ${safeCurDay} • ${filledSquares}/54 squares colored • Tap to inspect sides`
      }
      className="relative inline-flex items-center gap-2 bg-transparent border-0 p-0 transition-transform cursor-pointer active:scale-95"
    >
      <div
        style={{ width: '36px', height: '36px', perspective: '180px' }}
        className={`relative flex items-center justify-center flex-shrink-0 ${cubeGlowClass}`}
      >
        <div
          className={cubeSpinClass}
          style={{
            width: `${MINI_STREAK_HALF * 2}px`,
            height: `${MINI_STREAK_HALF * 2}px`,
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: isSpinGlowActive ? undefined : `rotateX(${targetPitch}deg) rotateY(${targetYaw}deg)`,
            transition: isSpinGlowActive ? undefined : 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          {MINI_STREAK_FACES.map(({ offset, transform }) => {
            const faceOrderIdx = STREAK_FACE_ORDER.findIndex((f) => f.offset === offset);
            const faceColor = STREAK_FACE_ORDER[faceOrderIdx]?.color;
            const faceLitCount = Math.min(9, Math.max(0, filledSquares - faceOrderIdx * 9));
            return (
              <div
                key={offset}
                style={{
                  position: 'absolute',
                  width: `${MINI_STREAK_HALF * 2}px`,
                  height: `${MINI_STREAK_HALF * 2}px`,
                  transform,
                  backfaceVisibility: 'hidden',
                  backgroundColor: '#cbd5e1',
                  borderRadius: '4px',
                  padding: '1.5px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(3, 1fr)',
                  gap: '1.2px',
                  boxShadow: isUvCoated
                    ? 'inset 0 0 0 0.75px rgba(216, 180, 254, 0.85), 0 0 12px rgba(192, 132, 252, 0.45)'
                    : isMatteFinish
                    ? 'inset 0 0 0 0.75px rgba(251, 191, 36, 0.75), 0 0 8px rgba(251, 191, 36, 0.3)'
                    : 'inset 0 0 0 0.75px rgba(100, 116, 139, 0.35)'
                }}
              >
                {MINI_STREAK_SLOTS.map((idx) => {
                  const isLit = idx < faceLitCount;
                  const isLatestTile = !isUvCoated && faceOrderIdx === activeFaceIdx && idx === faceLitCount - 1;
                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: isLit ? STICKER_HEX[faceColor] : '#11131a',
                        borderRadius: '1.5px',
                        filter: isMatteFinish && isLit ? 'contrast(0.92) saturate(0.88)' : undefined,
                        boxShadow: isLatestTile
                          ? '0 0 4px rgba(255,255,255,0.95), inset 0 0.5px 1px rgba(255,255,255,0.75)'
                          : isLit && !isMatteFinish
                          ? 'inset 0 0.5px 1px rgba(255,255,255,0.55)'
                          : 'inset 0 0.5px 0.75px rgba(255, 255, 255, 0.06)'
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div className="leading-tight text-left">
        <span className={`font-mono text-[10.5px] font-black block ${isUvCoated ? 'text-purple-200' : isMatteFinish ? 'text-amber-200' : 'text-white'}`}>
          Day {safeCurDay} • {displayStreakDays}d
        </span>
        <span className={`text-[8.5px] font-bold uppercase tracking-wider block ${isUvCoated ? 'text-amber-300' : isMatteFinish ? 'text-zinc-200' : 'text-zinc-400'}`}>
          {badgeLabel}
        </span>
      </div>
    </button>
  );
}

function CaseWindowAvgGrid({ history, isLargeScreen = false }) {
  return (
    <div className={`w-full grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 ${isLargeScreen ? 'pt-3' : 'pt-2'}`}>
      {[
        { label: 'Ao20', val: computeCaseWindowAvg(history, 20), color: 'text-green-400' },
        { label: 'Ao40', val: computeCaseWindowAvg(history, 40), color: 'text-sky-400' },
        { label: 'Ao60', val: computeCaseWindowAvg(history, 60), color: 'text-purple-300' }
      ].map((w) => (
        <div key={w.label} className={`text-center ${isLargeScreen ? 'py-1.5 px-3' : 'py-1 px-2'}`}>
          <span className={`${isLargeScreen ? 'text-[10.5px]' : 'text-[8.5px]'} font-black uppercase text-zinc-400 block`}>{w.label}</span>
          <span className={`font-mono ${isLargeScreen ? 'text-sm' : 'text-[11px]'} font-black ${w.color}`}>{w.val !== null ? `${w.val.toFixed(2)}s` : '—'}</span>
        </div>
      ))}
    </div>
  );
}

function ModalShell({ onClose, zClass = 'z-[260]', maxWidth = 'max-w-sm', borderClass = 'border-white/10', backdropClass = 'bg-black/88', children }) {
  return (
    <div onClick={onClose} className={`fixed inset-0 ${zClass} ${backdropClass} flex items-center justify-center p-5`}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative liquid-glass-card liquid-rim-muted border ${borderClass} rounded-3xl p-5 ${maxWidth} w-full shadow-[0_14px_38px_rgba(0,0,0,0.42)] max-h-[90dvh] overflow-y-auto no-scrollbar`}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function UvModalShell({ onClose, zClass = 'z-[274]', maxWidth = 'max-w-md', className = 'p-5 sm:p-6 max-h-[88dvh] overflow-y-auto no-scrollbar space-y-4', children }) {
  return (
    <div onClick={onClose} className={`fixed inset-0 ${zClass} bg-black/88 flex items-center justify-center p-5`}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative liquid-glass-uv border border-white/25 rounded-3xl ${maxWidth} w-full shadow-[0_14px_38px_rgba(0,0,0,0.45)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

function AmbientGlows() {
  return null;
}

function OrbitRingBackdrop() {
  return (
    <>
      <svg viewBox="0 0 180 180" className="pointer-events-none absolute inset-0 w-full h-full">
        <circle cx="90" cy="90" r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 5" />
        <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(249,115,22,0.18)" strokeWidth="1.2" />
        <circle cx="90" cy="6" r="2.2" fill="rgba(251,146,60,0.65)" />
        <circle cx="174" cy="90" r="2" fill="rgba(255,255,255,0.22)" />
        <circle cx="90" cy="174" r="2" fill="rgba(255,255,255,0.22)" />
        <circle cx="6" cy="90" r="2" fill="rgba(255,255,255,0.22)" />
      </svg>
    </>
  );
}

function useCubeOrbit(initialRot, onTap) {
  const [rot, setRot] = useState(initialRot);
  const [isDragging, setIsDragging] = useState(false);
  const liveRef = useRef(initialRot);
  const dragRef = useRef(null);
  const domRef = useRef(null);
  const labelRef = useRef(null);
  const rafRef = useRef(0);

  const setOrbit = (next) => {
    const resolved = typeof next === 'function' ? next(liveRef.current) : next;
    liveRef.current = resolved;
    setRot(resolved);
  };

  useEffect(() => () => rafRef.current && cancelAnimationFrame(rafRef.current), []);

  const handlers = {
    onPointerDown: (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      dragRef.current = { lastX: e.clientX, lastY: e.clientY, moved: false };
      setIsDragging(true);
    },
    onPointerMove: (e) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragRef.current.moved = true;
      const yaw = Math.round(liveRef.current.yaw + dx * 1.15);
      const pitch = Math.max(-75, Math.min(75, Math.round(liveRef.current.pitch - dy * 0.95)));
      liveRef.current = { yaw, pitch };

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const { yaw: y, pitch: p } = liveRef.current;
          if (domRef.current) domRef.current.style.transform = `translateZ(-12px) rotateX(${p}deg) rotateY(${y}deg) scale(1.05)`;
          if (labelRef.current) labelRef.current.textContent = `3D Orbit • Drag to Spin (${((y % 360) + 360) % 360}°)`;
        });
      }
    },
    onPointerUp: () => {
      if (!dragRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      const wasTap = !dragRef.current.moved;
      dragRef.current = null;
      setIsDragging(false);
      if (wasTap && onTap) onTap(setOrbit);
      else setRot({ ...liveRef.current });
    }
  };

  return { rot, setOrbit, isDragging, domRef, labelRef, handlers };
}

function detectViewportDevice() {
  if (typeof window === 'undefined') {
    return { kind: 'mobile', isWideTwoPane: false, isTouchPrimary: true, width: 390 };
  }
  const width = window.innerWidth || document.documentElement?.clientWidth || 390;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || '' : '';
  const maxTouch = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  const isCoarsePointer = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : maxTouch > 0;

  const isIPad = /iPad/i.test(ua) || (platform === 'MacIntel' && maxTouch > 1);
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  const isGenericTablet = /Tablet|PlayBook|Silk|Kindle/i.test(ua);
  const isPhoneUA = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua);

  let kind = 'desktop';
  if (isPhoneUA) {
    kind = 'mobile';
  } else if (isIPad || isAndroidTablet || isGenericTablet || (isCoarsePointer && width >= 600 && width <= 1366)) {
    kind = 'tablet';
  } else if (isCoarsePointer || width < 768) {
    kind = 'mobile';
  }

  const isWideTwoPane =
    kind !== 'mobile' && (kind === 'desktop' ? width >= 768 : width >= 700);

  return {
    kind,
    isWideTwoPane,
    isTouchPrimary: isCoarsePointer || kind !== 'desktop',
    width
  };
}

function useViewportDevice() {
  const [device, setDevice] = useState(detectViewportDevice);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let rafId = 0;
    const handleResize = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const next = detectViewportDevice();
        setDevice((prev) =>
          prev.kind === next.kind &&
          prev.isWideTwoPane === next.isWideTwoPane &&
          prev.isTouchPrimary === next.isTouchPrimary
            ? prev
            : next
        );
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return device;
}

function F2LOrbitViewer({ item, f2lSetupMode, f2lSetupSeed, orbit, f2lViewIdx, setF2LPresetAngle, emitBeep, isLargeScreen = false }) {
  return (
    <div data-no-timer-start="true" className={`w-full ${isLargeScreen ? 'space-y-2' : 'space-y-0.5'}`}>
      <div className="w-full flex items-center justify-between gap-1">
        <span className={`${isLargeScreen ? 'text-xs' : 'text-[9px]'} font-black uppercase tracking-wider text-zinc-400 truncate`}>
          Angle: <strong className="text-orange-400">{getClosestF2LAngleLabel(orbit.rot.yaw, orbit.rot.pitch)}</strong>
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {(orbit.rot.yaw !== -35 || orbit.rot.pitch !== -25) && (
            <button
              type="button"
              onClick={() => { emitBeep(480); setF2LPresetAngle(0); }}
              className={`${isLargeScreen ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[9px]'} rounded-xl bg-transparent hover:bg-white/[0.08] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer`}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => { emitBeep(620); setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length); }}
            className={`${isLargeScreen ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[9px]'} rounded-xl bg-orange-500/12 hover:bg-orange-500/22 font-black text-orange-300 active:scale-95 transition-all cursor-pointer`}
          >
            Rotate <RotateCw className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
          </button>
        </div>
      </div>

      <div
        {...orbit.handlers}
        onPointerCancel={orbit.handlers.onPointerUp}
        style={{ touchAction: 'none' }}
        className={`relative ${isLargeScreen ? 'w-52 h-52' : 'w-24 h-24'} mx-auto flex items-center justify-center cursor-grab active:cursor-grabbing select-none`}
      >
        <OrbitRingBackdrop insetClass="inset-1" />
        <div style={{ transform: isLargeScreen ? 'scale(1.16)' : 'scale(0.62)' }}>
          <F2LSpatial3DCube
            setupScramble={generateF2LSetupScramble(item.alg, f2lSetupMode, f2lSetupSeed)}
            yaw={orbit.rot.yaw}
            pitch={orbit.rot.pitch}
            isDragging={orbit.isDragging}
            cubeRef={orbit.domRef}
          />
        </div>
      </div>
      <span ref={orbit.labelRef} className={`${isLargeScreen ? 'text-[10.5px]' : 'text-[8.5px]'} block text-center font-bold uppercase tracking-wider text-zinc-500`}>
        3D Orbit • Drag to Spin ({((orbit.rot.yaw % 360) + 360) % 360}°)
      </span>
    </div>
  );
}

function CasePracticeCard({
  phaseKey, item, f2lSetupMode, f2lSetupSeed, setF2lSetupSeed, pllSetupSeed, setPllSetupSeed,
  f2lOrbit, f2lViewIdx, setF2LPresetAngle, fingertricksEnabled, stopwatchEnabled,
  swRunning, swDisplayRef, timerLabel, showInlineGroup = false, isLargeScreen = false,
  lastResultForThis = null, recordedBest = null, onOpenGrip, onToggleCustomAlgSource, onOpenCustomAlgEditor, onToggleStopwatch, emitBeep, children
}) {
  const isF2L = phaseKey === 'f2l', isPLL = phaseKey === 'pll';
  const showTriggerPills = fingertricksEnabled && (!item.usingCustomAlg || item.showCustomTriggerPills !== false);
  const triggerTags = showTriggerPills ? getAlgorithmTriggerTags(item.alg) : [];

  const visualNode = isF2L ? (
    <F2LOrbitViewer item={item} f2lSetupMode={f2lSetupMode} f2lSetupSeed={f2lSetupSeed} orbit={f2lOrbit} f2lViewIdx={f2lViewIdx} setF2LPresetAngle={setF2LPresetAngle} emitBeep={emitBeep} isLargeScreen={isLargeScreen} />
  ) : (
    <div className={`relative ${isLargeScreen ? 'w-44 h-44' : 'w-24 h-24'} mx-auto flex items-center justify-center`}>
      <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full">
        <circle cx="70" cy="70" r="66" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
        <circle cx="70" cy="70" r="59" fill="none" stroke="rgba(249,115,22,0.22)" strokeWidth="1.2" />
        <circle cx="70" cy="4" r="2" fill="rgba(251,146,60,0.7)" />
      </svg>
      <div className={`${isLargeScreen ? 'w-32 h-32 p-2.5' : 'w-20 h-20 p-1.5'} rounded-2xl bg-zinc-200/95 shadow-[0_12px_28px_rgba(0,0,0,0.55)] ring-1 ring-white/25`}>
        <CachedVisualCubeImg
          url={isPLL ? getPLLImageUrl(item.alg, pllSetupSeed > 0 ? generatePLLSetupScramble(item.inverse, pllSetupSeed) : null) : getOLLImageUrl(item.alg)}
          alt={item.name} lazy={false} className="w-full h-full object-contain"
        />
      </div>
    </div>
  );

  const titleNode = (
    <div className="text-center w-full">
      <h3 className={`${isLargeScreen ? 'text-2xl lg:text-3xl leading-tight' : 'text-base leading-tight'} font-black text-white`}>{item.name}</h3>
      {item.recognition && <p className={`${isLargeScreen ? 'text-xs lg:text-sm mt-1' : 'text-[10px] mt-0.5 line-clamp-1'} text-zinc-400`}>{item.recognition}</p>}
    </div>
  );

  const setupNode = (isF2L || isPLL) && (
    <div className={`w-full border-t border-white/10 ${isLargeScreen ? 'pt-2.5 space-y-1' : 'pt-1.5 space-y-0.5'} text-center`}>
      <div className="flex items-center justify-between">
        <span className={`${isLargeScreen ? 'text-[10.5px]' : 'text-[8.5px]'} font-black uppercase tracking-wider text-zinc-400`}>
          {isF2L ? `Setup (${f2lSetupMode})` : 'Setup Scramble'}
        </span>
        <button onClick={() => { emitBeep(540); isF2L ? setF2lSetupSeed((s) => s + 1) : setPllSetupSeed((s) => s + 1); }} className={`${isLargeScreen ? 'text-xs' : 'text-[9.5px]'} font-bold text-orange-400 hover:underline cursor-pointer`}>
          {isF2L ? <>New Scramble <RotateCw className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></> : <>New AUF <RotateCw className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></>}
        </button>
      </div>
      <p className={`font-mono ${isLargeScreen ? 'text-sm lg:text-base' : 'text-[11px]'} font-black text-amber-300 select-all truncate`}>
        {isF2L ? generateF2LSetupScramble(item.alg, f2lSetupMode, f2lSetupSeed) : generatePLLSetupScramble(item.inverse, pllSetupSeed)}
      </p>
    </div>
  );

  const algNode = (
    <div className={`w-full ${isLargeScreen ? '' : 'border-t'} ${item.usingCustomAlg ? 'border-orange-500/40 bg-orange-500/[0.06] rounded-2xl p-3' : isLargeScreen ? '' : 'border-white/10 pt-2.5'} ${isLargeScreen ? 'space-y-2' : 'space-y-1.5'} text-center transition-all`}>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          <span className={`${isLargeScreen ? 'text-[10.5px]' : 'text-[8.5px]'} font-black uppercase tracking-wider text-zinc-400`}>
            {item.usingCustomAlg
              ? `Custom #${(item.customAlgList || []).findIndex((c) => c.id === item.activeCustomId) + 1}`
              : isF2L ? 'Solution (FR Slot)' : 'Algorithm'}
          </span>
          <CustomAlgSwitcherPills item={item} onSelect={onToggleCustomAlgSource} />
        </div>
        <div className="flex items-center gap-1">
          {onOpenCustomAlgEditor && (
            <button type="button" onClick={onOpenCustomAlgEditor} className={`${isLargeScreen ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[9px]'} rounded-xl bg-transparent hover:bg-white/[0.08] font-black text-zinc-300 hover:text-white transition-all cursor-pointer`}>
              {item.hasCustomAlg ? `Algs (${item.customAlgList.length}/7)` : '+ Alg'}
            </button>
          )}
          {fingertricksEnabled && (
            <button type="button" onClick={onOpenGrip} className={`${isLargeScreen ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[9px]'} rounded-xl bg-transparent hover:bg-orange-500/15 font-black text-orange-300 transition-all cursor-pointer`}>
              Grip <ArrowRight className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
            </button>
          )}
        </div>
      </div>
      <p className={`font-mono ${isLargeScreen ? 'text-xl lg:text-2xl py-0.5' : 'text-[13.5px] leading-snug'} font-black break-words ${isF2L ? 'text-white' : 'text-amber-300'}`}>{item.alg}</p>
      {item.hasCustomAlg && isLargeScreen && (
        <p className="text-[10px] font-mono text-zinc-400">
          {item.usingCustomAlg
            ? `Default: ${item.defaultAlg}`
            : `${item.customAlgList.length} Custom Alt${item.customAlgList.length === 1 ? '' : 's'} Saved`}
        </p>
      )}
      {fingertricksEnabled && (
        <div className={`${isLargeScreen ? 'space-y-1.5' : 'space-y-1.5 pt-0.5'} text-left`}>
          <TriggerTagsList tags={triggerTags} centered compact={!isLargeScreen} />
          {(!item.usingCustomAlg || item.showCustomTriggerPills !== false) && item.fingertrick && (
            <p className={`${isLargeScreen ? 'text-xs px-3.5 py-2' : 'text-[10px] px-2.5 py-1.5'} text-orange-200 bg-orange-500/10 border border-orange-500/25 rounded-xl leading-relaxed`}>
              <strong className="text-orange-400">Fingertrick:</strong> {item.fingertrick}
            </p>
          )}
        </div>
      )}
      {isF2L && (
        <p className={`${isLargeScreen ? 'text-xs pt-0.5' : 'text-[10px] pt-0.5 leading-relaxed'} text-zinc-300 text-left`}>
          • <strong>1:</strong> {item.step1} &nbsp;• <strong>2:</strong> {item.step2}
        </p>
      )}
    </div>
  );

  const stopwatchNode = stopwatchEnabled && (
    <button
      onClick={onToggleStopwatch}
      className={`w-full ${isLargeScreen ? 'py-3.5 px-4 rounded-2xl' : 'py-2.5 px-3.5 rounded-2xl'} border font-mono cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-all ${
        swRunning ? 'bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.25)]' : lastResultForThis?.isNewPb ? 'bg-amber-500/15 border-amber-400/60 text-white' : 'liquid-glass-well liquid-rim-muted border-white/10 text-zinc-200 hover:border-orange-500/35'
      }`}
    >
      {swRunning ? (
        <span ref={swDisplayRef} className={`font-timer ${isLargeScreen ? 'text-xl' : 'text-base'} font-black`}>0.00s — Stop</span>
      ) : lastResultForThis ? (
        <>
          <div className="flex items-center gap-2">
            <span className={`${isLargeScreen ? 'text-xl' : 'text-sm'} font-black text-white`}>Got: {lastResultForThis.timeSec.toFixed(3)}s</span>
            {lastResultForThis.isNewPb ? (
              <span className="px-2 py-0.5 rounded-full bg-green-500/25 border border-green-400/50 text-[10px] font-black uppercase text-green-300"><Star className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5 fill-current" />New PB!</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-zinc-300">PB: {recordedBest?.toFixed(3)}s</span>
            )}
          </div>
          <span className="text-[9.5px] font-sans font-bold uppercase tracking-wider text-zinc-400">
            {isLargeScreen ? 'Tap Anywhere or Press Space to Time Again' : 'Tap Anywhere to Time Again'}
          </span>
        </>
      ) : (
        <div className="flex flex-col items-center">
          <span className={`${isLargeScreen ? 'text-lg' : 'text-sm'} font-black`}>{timerLabel}</span>
          <span className="text-[9.5px] font-sans font-bold uppercase tracking-wider text-zinc-400">
            {isLargeScreen ? 'or Tap Anywhere / Press Spacebar' : 'or Tap Anywhere on Screen'}
            {!isLargeScreen && typeof recordedBest === 'number' ? ` • PB: ${recordedBest.toFixed(3)}s` : ''}
          </span>
          {isLargeScreen && !showInlineGroup && typeof recordedBest === 'number' && <span className="text-[11px] font-bold text-amber-300 mt-0.5">Recorded PB: {recordedBest.toFixed(3)}s</span>}
        </div>
      )}
    </button>
  );

  if (isLargeScreen) {
    return (
      <div className="w-full grid grid-cols-12 gap-5 lg:gap-6 items-center">
        <div className="col-span-5 flex flex-col items-center justify-center space-y-2.5 border-r border-white/10 pr-5">
          {visualNode}
          {titleNode}
          {setupNode}
        </div>
        <div className="col-span-7 flex flex-col justify-center space-y-3">
          {algNode}
          {stopwatchNode}
          {children}
        </div>
      </div>
    );
  }

  return (
    <>
      {visualNode}
      {titleNode}
      {setupNode}
      {algNode}
      {stopwatchNode}
      {children}
    </>
  );
}

function MillisecondSliderControl({ value, min, max, draftValue, onSliderChange, onStepDelta, onDraftChange, accentTextClass = 'text-amber-300', inputWidthClass = 'w-20' }) {
  const pct = Math.min(100, Math.max(0, ((Math.min(max, Math.max(min, value)) - min) / Math.max(0.001, max - min)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="relative h-7 rounded-xl bg-black/65 border border-white/10 px-2 flex items-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600/25 to-amber-500/35 border-r border-orange-400/60"
          style={{ width: `${pct}%` }}
        />
        <div className="pointer-events-none absolute inset-x-3 flex justify-between opacity-30">
          {Array.from({ length: 17 }).map((_, idx) => (
            <span key={idx} className={`w-px ${idx % 4 === 0 ? 'h-3 bg-white' : 'h-1.5 bg-zinc-400'}`} />
          ))}
        </div>
        <input
          type="range" min={min} max={max} step="0.001"
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          className="relative z-10 w-full accent-orange-500 cursor-pointer opacity-90"
        />
      </div>
      <div className="flex items-center gap-1">
        {[{ label: '-10ms', delta: -0.01 }, { label: '-1ms', delta: -0.001 }, { label: '+1ms', delta: 0.001 }, { label: '+10ms', delta: 0.01 }].map((btn) => (
          <button
            key={btn.label} type="button" onClick={() => onStepDelta(btn.delta)}
            className="flex-1 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] font-mono text-[9.5px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
        <input
          type="number" step="0.001" min="0.100" max="120.000" value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          className={`${inputWidthClass} rounded-xl bg-black/60 px-2 py-1 font-mono text-[10px] text-center ${accentTextClass}`}
        />
      </div>
    </div>
  );
}

const OLLDAY_LOGO_DATA_URI = 'data:image/png;base64,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';

function SuneEmblemSvg({ className = 'w-full h-full' }) {
  return (
    <img
      src={OLLDAY_LOGO_DATA_URI}
      alt="OLLDay Everyday Logo"
      draggable={false}
      className={`${className} object-contain select-none`}
    />
  );
}

function invertAlgorithm(alg) {
  const cleaned = alg.replace(/[()]/g, '').trim();
  if (!cleaned) return '';
  return cleaned.split(/\s+/).reverse().map((tok) => tok.endsWith('2') ? tok : tok.endsWith("'") ? tok.slice(0, -1) : `${tok}'`).join(' ');
}

function generateF2LSetupScramble(alg, mode = 'beginner', variationSeed = 0) {
  const baseInverse = invertAlgorithm(alg);
  const aufPrefix = ['', 'U ', "U' ", 'U2 '][variationSeed % 4];
  if (mode === 'beginner') return `${aufPrefix}${baseInverse}`.trim();
  const triggers = ["L' U' L U", "B U B' U'", "L' U L U'", "B U' B' U", "L' U2 L U2"];
  return `${triggers[variationSeed % triggers.length]} ${aufPrefix}${baseInverse}`.replace(/\s+/g, ' ').trim();
}

function shuffleCaseList(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSchedule(chunks, dataList, lookupMap = null) {
  const schedule = [];
  let dayCounter = 1;
  const learnedSoFar = [];
  const seenIds = new Set();
  const resolveById = (id) => (lookupMap ? lookupMap.get(id) : dataList.find((item) => item.id === id));
  (Array.isArray(chunks) ? chunks : []).forEach((chunk, idx) => {
    if (!chunk || !Array.isArray(chunk.ids)) return;
    const safeTitle = typeof chunk.title === 'string' ? chunk.title : `Chunk ${idx + 1}`;
    const cases = chunk.ids.map(resolveById).filter(Boolean);
    if (!cases.length) return;
    cases.forEach((c) => {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        learnedSoFar.push(c);
      }
    });
    // Day 1 of loop: Learn algorithms in dedicated chunk
    schedule.push({ day: dayCounter++, mode: 'Learn', chunkTitle: safeTitle, cases, randomize: false });
    // Day 2 & Day 3 of loop: Drill algorithms in random order
    schedule.push({ day: dayCounter++, mode: 'Drill • Random', chunkTitle: safeTitle, cases, randomize: true });
    schedule.push({ day: dayCounter++, mode: 'Drill • Random', chunkTitle: safeTitle, cases, randomize: true });
    // After every 2 loops (6 days), insert cumulative review day covering everything learned up to this point
    if (idx % 2 === 1) {
      schedule.push({
        day: dayCounter++,
        mode: 'Cumulative Review',
        chunkTitle: `All Learned So Far (${learnedSoFar.length} Cases)`,
        cases: [...learnedSoFar],
        randomize: true
      });
    }
  });
  return schedule;
}

// =========================================================================
// 2D. COMPLETE CFOP DATASETS, TOURS, FINGERTRICK CODEX & WCA NOTATION
// =========================================================================
const FINGERTRICK_CODEX = [
  { id: 'sexy', category: 'Core Triggers', name: 'Sexy Move', notation: "(R U R' U')", grip: 'Right thumb on Front-Bottom (DF), Right ring finger on Back-Right (BR).', execution: "Push R up with wrist, flick U with right index, pull R' down, and push U' with left index.", badgeClass: 'bg-orange-500/15 border-orange-500/35 text-orange-300', dotClass: 'bg-orange-400' },
  { id: 'left-sexy', category: 'Core Triggers', name: 'Left Sexy Move', notation: "(L' U' L U)", grip: 'Left thumb on Front-Bottom (DF), Left ring finger on Back-Left (BL).', execution: "Push L' up with left wrist, flick U' with left index, pull L down, and flick U with right index.", badgeClass: 'bg-sky-500/15 border-sky-500/35 text-sky-300', dotClass: 'bg-sky-400' },
  { id: 'inv-sexy', category: 'Core Triggers', name: 'Inverse Sexy', notation: "(R U' R')", grip: 'Right thumb on Front-Bottom (DF), Left index resting on Back-Left (UBL).', execution: "Push R up, push U' smoothly with left index without regripping, then pull R' straight down.", badgeClass: 'bg-amber-500/15 border-amber-500/35 text-amber-300', dotClass: 'bg-amber-400' },
  { id: 'sledge', category: 'F-Layer Triggers', name: 'Sledgehammer', notation: "(R' F R F')", grip: 'Right thumb on Front-Center or U-edge; Right index ready on Top-Right (UR).', execution: "Pull R' down, press F clockwise with right index/thumb, push R up, and flick F' up with right thumb.", badgeClass: 'bg-rose-500/15 border-rose-500/35 text-rose-300', dotClass: 'bg-rose-400' },
  { id: 'hedge', category: 'F-Layer Triggers', name: 'Hedgeslammer', notation: "(F R' F' R)", grip: 'Right thumb tucked on Front-Bottom (DF) so it can push F upward cleanly.', execution: "Push F clockwise with right index, pull R' down, flick F' up with right thumb, then lift R.", badgeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300', dotClass: 'bg-emerald-400' },
  { id: 'u2-double', category: 'Speed Flicks', name: 'U2 Double Flick', notation: '(U2)', grip: 'Left or Right index + middle fingers poised on the back-corner of the U-layer.', execution: 'Flick index finger immediately followed by middle finger in one rolling motion—never regrip for two single U turns.', badgeClass: 'bg-purple-500/15 border-purple-500/35 text-purple-300', dotClass: 'bg-purple-400' },
  { id: 'm-slice', category: 'Slice & Ring', name: 'M-Slice Ring Flick', notation: "(M2 / M')", grip: 'Thumbs on Front-Left/Right corners; Left ring & middle fingers behind DB.', execution: "Flick DB upward with left ring finger for M', or double-flick ring → middle finger for seamless M2.", badgeClass: 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300', dotClass: 'bg-cyan-400' },
  { id: 'd-ring', category: 'Slice & Ring', name: 'Ring-Finger D Push', notation: "(D / D')", grip: 'Ring fingers resting lightly along the bottom Back-Left and Back-Right edges.', execution: "Push Back-Left with left ring finger for D, or pull Back-Right with right ring finger for D'.", badgeClass: 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300', dotClass: 'bg-indigo-400' }
];

const WCA_NOTATION_GUIDE = [
  { section: 'Outer Faces', move: "U / U' / U2", desc: 'Top (Yellow) layer: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Outer Faces', move: "D / D' / D2", desc: 'Bottom (White) layer: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Outer Faces', move: "R / R' / R2", desc: 'Right (Orange) layer: Away from you, Toward you, or 180°' },
  { section: 'Outer Faces', move: "L / L' / L2", desc: 'Left (Red) layer: Toward you, Away from you, or 180°' },
  { section: 'Outer Faces', move: "F / F' / F2", desc: 'Front (Green) face: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Outer Faces', move: "B / B' / B2", desc: 'Back (Blue) face: Clockwise, Counter-Clockwise, or 180°' },
  { section: 'Wide Turns', move: "r / r' (Rw)", desc: "Turn Right two layers together (R + M')" },
  { section: 'Wide Turns', move: "l / l' (Lw)", desc: 'Turn Left two layers together (L + M)' },
  { section: 'Wide Turns', move: "u / u' (Uw)", desc: "Turn Top two layers together (U + E')" },
  { section: 'Wide Turns', move: "f / f' (Fw)", desc: 'Turn Front two layers together (F + S)' },
  { section: 'Slice Moves', move: "M / M' / M2", desc: 'Middle slice between L & R (follows L direction)' },
  { section: 'Slice Moves', move: "E / E' / E2", desc: 'Equatorial slice between U & D (follows D direction)' },
  { section: 'Slice Moves', move: "S / S' / S2", desc: 'Standing slice between F & B (follows F direction)' },
  { section: 'Rotations', move: "x / x'", desc: 'Rotate entire cube on R axis (U becomes B / F)' },
  { section: 'Rotations', move: "y / y'", desc: 'Rotate entire cube on U axis (F becomes L / R)' },
  { section: 'Rotations', move: "z / z'", desc: 'Rotate entire cube on F axis (U becomes R / L)' }
];

function buildFingertrickBreakdown(caseItem) {
  const alg = caseItem?.alg || '';
  return {
    grip: /\b[Ff]/.test(alg)
      ? "Home Grip with Right thumb slightly lower on DF so it can flick F' upward without regripping."
      : /\bM/.test(alg)
      ? 'Neutral Pincher Grip on UFL/UFR corners, freeing left ring & middle fingers for M-slice flicks.'
      : 'Standard Right-Thumb-On-Front Home Grip; keep wrists neutral before starting.',
    cue: caseItem?.fingertrick || 'Execute parenthesized triggers in single fluid wrist-and-index bursts.',
    flow: /\bD/.test(alg)
      ? "Use left/right ring fingers on the bottom back corners for D/D' so your thumbs never leave the front."
      : 'Use double-flick U2 (index → middle) and avoid regripping between triggers.'
  };
}

const CROSS_TIERS = [
  { tier: 1, moves: 2, title: '2-Move Direct Inserts', hint: 'Both white edges are one quarter-turn away from D. Insert in a single rhythmic flow.', scrambles: ['R2 F2', "F' R2", "L2 D' F2 D", "R' F' R F", 'U R2 F2'] },
  { tier: 2, moves: 3, title: '3-Move Adjacent Pairs', hint: 'Use a single D-layer shift so the second white edge drops directly into its aligned slot.', scrambles: ["F R' D'", "R' F D", "L F' D", "U' R2 F2", "B' R2 D"] },
  { tier: 3, moves: 4, title: '4-Move Keyhole & Flips', hint: 'Preserve already-placed white edges by rotating D instead of undoing solved pieces.', scrambles: ["R' F R D'", "F U' R2 F2", "L' B' D2 R2", "U R' F' R", "F2 U' R2 D"] },
  { tier: 4, moves: 5, title: '5-Move Multi-Edge Setup', hint: 'Solve bad (flipped) edges first while setting up good edges in the E-slice.', scrambles: ["R U' F R' D'", "F' U R' F2 D", "L U' F' L D2", "R2 U' F' R D", "B U' R2 F' D"] },
  { tier: 5, moves: 6, title: '6-Move Sub-8 Standard', hint: 'Plan all 4 edges during inspection and align the entire cross with a final D turn.', scrambles: ["R' U' F R2 D' F'", "F U' R' F' D2 R", "L' U F' L2 D R'", "R U2 F' R' D' F", "B' U R' B2 D' F2"] }
];

const CROSS_ADVANCED_TIERS = [
  { tier: 1, moves: 6, title: 'Full Scramble • 6-Move Cross', hint: 'Full 20-move WCA scramble with a clean 6-move solution. Trace all 4 white edges before turning.', scrambles: ["R U R' U' F2 D R2 U' B2 L2 D' F2 R U' B' L D2 F' U2 R", "F' U2 L2 B2 D R2 U' F2 U B2 R' D' L' B U' F R2 U' L2 B"] },
  { tier: 2, moves: 7, title: 'Full Scramble • 7-Move Cross', hint: "Solve relative to the color orbit (Green → Orange → Blue → Red), then finish with D/D'.", scrambles: ["L2 U' B2 D2 R2 F2 U' L2 B2 U R' F' D2 B U L' R D' F2 U", "B2 R2 D' L2 U B2 R2 U' F2 D' L B' R' U2 F' D' L' B2 R U'"] },
  { tier: 3, moves: 7, title: 'Full Scramble • Flipped Edge Trap', hint: 'Use one flipped white edge to kick another edge out of the bottom layer simultaneously.', scrambles: ["D2 F2 R2 U' B2 L2 D' R2 U' F2 R B' U' L' D2 F' R2 U' B L", "U2 R2 F2 D' L2 B2 U R2 D' F2 L' F U R D2 B R2 U' L' F"] },
  { tier: 4, moves: 8, title: 'Full Scramble • X-Cross Lookahead', hint: 'Track the White-Green-Orange corner while finishing your 8-move cross.', scrambles: ["R2 B2 D' F2 U L2 D' R2 U' B2 F' L' U2 R' D B' L2 F' U R", "F2 L2 U' R2 D B2 U' L2 D' F2 R' B U2 L D' F R2 B U' L'"] },
  { tier: 5, moves: 8, title: 'WCA Competition 8-Move Cap', hint: 'Every 3x3 scramble can be solved in ≤8 moves. Aim for zero pauses between Cross and Pair 1.', scrambles: ["U' F2 R2 D' B2 L2 U R2 D' F2 L' B' R U2 F' D' R2 B' U' L", "D' R2 B2 U' L2 F2 D' R2 U' B2 R F' L' U2 B D F2 R' U L'"] }
];

const CROSS_MECHANICS = [
  {
    id: 1, title: 'Relative Color Orbit', badge: 'Mechanic 1 • Zero Center Peeking',
    summary: 'Build the cross in the exact clockwise order Green → Orange → Blue → Red on D, then align all 4 edges at once with a single D turn.',
    example: "F' R' D' R F D'",
    approaches: [
      { id: 'opp', name: 'Opposite Pair First', tag: 'Blue + Green', rule: 'Place Blue opposite Green first so you never disturb solved adjacent edges.', cases: [{ label: 'Case A • Offset D', setup: 'R2 F2 D', solve: "D' F2 R2", note: 'Aligns both opposite edges in 3 turns.' }, { label: 'Case B • E-Slice Drop', setup: "R' F D", solve: "D' F' R", note: 'Drops FR into DR while kicking DF into place.' }] },
      { id: 'adj', name: 'Adjacent Chain', tag: 'Green → Orange', rule: 'Shift D by 90° so the second edge lands directly next to the first.', cases: [{ label: 'Case A • D-Shift', setup: "F R' D'", solve: "D R F'", note: 'Single D setup avoids extra U turns.' }] }
    ]
  },
  {
    id: 2, title: 'Good vs. Bad Edges', badge: 'Mechanic 2 • 1-Move Orientation',
    summary: 'An edge is "Good" if it can reach D using only R, L, U, D moves. A "Bad" edge requires one F or B quarter-turn to orient.',
    example: "F R' F' R",
    approaches: [{ id: 'flip', name: 'F-Turn Conversion', tag: 'Bad → Good', rule: "Use a single F or F' move to flip a bad edge while simultaneously placing an adjacent edge.", cases: [{ label: 'Case A • UF Flipped', setup: "F R' F' R", solve: "R' F R F'", note: 'Sledgehammer orients UF straight into DF.' }] }]
  },
  {
    id: 3, title: 'D-Layer Keyhole', badge: 'Mechanic 3 • Non-Destructive',
    summary: 'Never undo a solved cross edge to insert another. Rotate D to bring an empty slot underneath the incoming edge.',
    example: "D' R' D",
    approaches: [{ id: 'kh', name: 'Empty Slot Shift', tag: 'Preserve Cross', rule: 'Move D before R/L, insert, then restore D.', cases: [{ label: 'Case A • Right Keyhole', setup: "D' R D", solve: "D' R' D", note: 'Protects DF, DL, and DB while solving DR.' }] }]
  },
  {
    id: 4, title: '2-Edge Combo & X-Cross', badge: 'Mechanic 4 • Sub-10 Transition',
    summary: 'Pair a white cross edge with a bottom corner during the final 2–3 cross moves so you enter F2L with 1 pair already solved (X-Cross), or solve two cross edges simultaneously in one trigger.',
    example: "R' F R U' R' F' R",
    approaches: [
      { id: 'xcross', name: 'Free Pair Preservation', tag: 'X-Cross Setup', rule: "Spot an already-paired or 1-move corner-edge block in the U-layer, then use keyhole D/D' turns or wide/F inserts so the final cross edge drops in without breaking the pair.", cases: [{ label: 'Case A • U-Layer Preserve', setup: "R U' R' F2", solve: "F2 R U R'", note: 'Finishes DF without disturbing the formed Front-Right F2L pair.' }, { label: 'Case B • Keyhole D-Shift', setup: "R U R' D' F2 D", solve: "D' F2 D R U' R'", note: "Shifts D' to open an empty cross slot, inserts DF, and restores D while keeping the FR pair intact." }, { label: 'Case C • Back-Right Slot Save', setup: "R' U R F2", solve: "F2 R' U' R", note: 'Inserts DF cleanly while preserving an already-joined Back-Right pair.' }] },
      { id: 'block-build', name: '2x2x2 Pseudo-Block X-Cross', tag: 'Corner + 2 Edges', rule: 'Build a 2x2x2 block in Back-Left or Back-Right first (2 cross edges + 1 F2L pair), then finish the remaining 2 cross edges with R, U, and F moves.', cases: [{ label: 'Case A • Back-Left Block', setup: "F2 R2 U' R2 F2", solve: 'F2 R2 U R2 F2', note: 'Locks DL and DB with the DBL pair, leaving only DF and DR to drop in.' }, { label: 'Case B • E-Slice Edge Join', setup: "R U' R' U R2", solve: "R2 U' R U R'", note: 'Joins the FR middle edge with the DFR corner while simultaneously seating DR.' }, { label: 'Case C • Corner-First Drop', setup: "F' U' F R2", solve: "R2 F' U F", note: 'Seats DR with R2 and immediately pairs the Front-Right F2L block on the way down.' }] },
      { id: 'double-edge', name: '2-Edge Simultaneous Combo', tag: 'Dual Cross Insert', rule: 'When two white edges sit in the E-slice or U-layer one turn apart, align their relative orbit first so a single R/F or D2 sequence seats both edges together.', cases: [{ label: 'Case A • E-Slice Double Drop', setup: "F' R' D'", solve: 'D R F', note: 'R drops DR while F immediately sweeps DF into its adjacent orbit slot.' }, { label: 'Case B • Sledgehammer 2-Edge', setup: "R' F R F' D", solve: "D' F R' F' R", note: 'Hedgeslammer flips UF into DF while kicking FR into DR in 4 moves.' }, { label: 'Case C • Opposite U2 Double', setup: 'R2 L2 U2', solve: 'U2 L2 R2', note: 'Aligns both opposite top white edges over their centers for simultaneous 180° drops.' }] },
      { id: 'keyhole-xcross', name: 'Keyhole Corner-Edge Pair', tag: 'Advanced X-Cross', rule: 'Leave one cross slot open as a working keyhole to pair an F2L corner and edge in the middle layer before closing the final cross edge.', cases: [{ label: 'Case A • Open DF Keyhole', setup: "D R U' R' D' F2", solve: "F2 D R U R' D'", note: 'Uses the open DF slot to pair UFR + FR via D-rotation, then seals DF with F2.' }, { label: 'Case B • M-Slice Cross + Pair', setup: "M' U2 M R U R'", solve: "R U' R' M' U2 M", note: 'Inserts the FR pair while using M-slice freedom to align the final cross edge.' }] }
    ]
  }
];

const F2L_DATA = [
  { id: 1, group: 'Basic Inserts', name: 'F2L 1 (Right Insert)', alg: "(U R U' R')", fingertrick: "Push U with right index, lift R, push U' with left index, drop R'.", step1: 'Corner & edge are split with mismatched top colors.', step2: 'Pair and insert cleanly into Front-Right.' },
  { id: 2, group: 'Basic Inserts', name: 'F2L 2 (Front Insert)', alg: "(U' F' U F)", fingertrick: "Push U' with left index, pull F' up with right thumb, flick U, push F.", step1: 'White sticker faces Front with opposite edge on Left.', step2: 'Insert straight into Front-Right via F-layer.' },
  { id: 3, group: 'Basic Inserts', name: 'F2L 3 (Direct Front)', alg: "(F' U' F)", fingertrick: "Pull F' up with right thumb, push U' with left index, press F.", step1: 'Already-paired block sits above Front-Left.', step2: 'Drop directly into the Front-Right slot.' },
  { id: 4, group: 'Basic Inserts', name: 'F2L 4 (Direct Right)', alg: "(R U R')", fingertrick: "Lift R with wrist, flick U with right index, pull R' down.", step1: 'Already-paired block sits above Back-Right.', step2: 'Drop directly into the Front-Right slot.' },
  { id: 5, group: 'Corner in Top • Edge in Top', name: 'F2L 5 (Split Opposite)', alg: "(U' R U R') (U2 R U' R')", fingertrick: "Execute (U' R U R') smoothly, double-flick (U2), finish with (R U' R').", step1: 'White faces Right; edge is in UL with matching top color.', step2: 'Hide corner, pair edge, and insert.' },
  { id: 6, group: 'Corner in Top • Edge in Top', name: 'F2L 6 (Split Front)', alg: "(U F' U' F) (U2 F' U F)", fingertrick: "Use right thumb for F' and left index for U' without regripping.", step1: 'White faces Front; edge is in UB with matching top color.', step2: 'Mirror of F2L 5 into Front-Right.' },
  { id: 7, group: 'Corner in Top • Edge in Top', name: 'F2L 7 (Far Pair Right)', alg: "(U' R U2 R') (U2 R U' R')", fingertrick: 'Double-flick both U2 turns with index-middle roll.', step1: 'White faces Right; edge is opposite in UL.', step2: 'Bring edge to UF while hiding corner, then insert.' },
  { id: 8, group: 'Corner in Top • Edge in Top', name: 'F2L 8 (Far Pair Front)', alg: "(U F' U2 F) (U2 F' U F)", fingertrick: "Keep right thumb anchored on DF for clean F' lifts.", step1: 'White faces Front; edge is opposite in UB.', step2: 'Mirror of F2L 7.' },
  { id: 9, group: 'Corner in Top • Edge in Top', name: 'F2L 9 (Misaligned Right)', alg: "(U' R U' R') (U F' U' F)", fingertrick: "Transition from R' straight into F' with right thumb.", step1: 'White faces Right; edge is in UB with opposite top color.', step2: 'Separate and insert via Front.' },
  { id: 10, group: 'Corner in Top • Edge in Top', name: 'F2L 10 (Misaligned Front)', alg: "(U F' U F) (U' R U R')", fingertrick: 'Flow seamlessly from F into R without regrip.', step1: 'White faces Front; edge is in UL with opposite top color.', step2: 'Separate and insert via Right.' },
  { id: 11, group: 'Connected Pairs', name: 'F2L 11 (Wrongly Connected R)', alg: "(U' R U2 R') (U F' U' F)", fingertrick: "Double-flick U2, then drop R' directly into F'.", step1: 'Corner & edge touch in U with mismatched side colors.', step2: 'Split in back and insert through Front.' },
  { id: 12, group: 'Connected Pairs', name: 'F2L 12 (Wrongly Connected F)', alg: "(R U' R' U) (R U' R' U2) (R U' R')", fingertrick: "Three rhythmic (R U' R') inverse-sexy bursts.", step1: 'Connected pair with White facing Right.', step2: 'Cycle corner to re-pair and insert.' },
  { id: 13, group: 'Connected Pairs', name: 'F2L 13 (Connected Flip F)', alg: "(U F' U2 F) (U' R U R')", fingertrick: "Use right thumb F' and left index U' seamlessly.", step1: 'Connected pair with White facing Front.', step2: 'Split and insert through Right.' },
  { id: 14, group: 'Connected Pairs', name: 'F2L 14 (Connected Lift)', alg: "(U' R U' R') (U R U R')", fingertrick: "Back-to-back (U' R U' R') and (U R U R') triggers.", step1: 'Connected pair with matching top colors on Right.', step2: 'Unpair in back and re-insert.' },
  { id: 15, group: 'Connected Pairs', name: 'F2L 15 (Sledge Split)', alg: "(R' F R F') (U R U' R')", fingertrick: "Sledgehammer (R' F R F') directly into (U R U' R').", step1: 'Connected pair directly over Front-Right slot.', step2: 'Sledgehammer splits & pairs in one motion.' },
  { id: 16, group: 'Connected Pairs', name: 'F2L 16 (Hedge Split)', alg: "(R U' R' U2) (F' U' F)", fingertrick: "Inverse sexy + U2 double-flick into (F' U' F).", step1: 'Connected pair with flipped edge over slot.', step2: 'Kick edge out and insert via Front.' },
  { id: 17, group: 'Corner in Top • Edge in Top', name: 'F2L 17 (White Up • Match R)', alg: "(R U2 R') (U' R U R')", fingertrick: "Fast (R U2 R') double-flick followed by (U' R U R').", step1: 'White sticker faces Up; edge is aligned on Right.', step2: 'Pair on back-right and insert.' },
  { id: 18, group: 'Corner in Top • Edge in Top', name: 'F2L 18 (White Up • Match F)', alg: "(F' U2 F) (U F' U' F)", fingertrick: "Right thumb F' lift + U2 double-flick.", step1: 'White sticker faces Up; edge is aligned on Front.', step2: 'Pair on front-left and insert.' },
  { id: 19, group: 'Corner in Top • Edge in Top', name: 'F2L 19 (White Up • Opp R)', alg: "(U R U2 R') (U R U' R')", fingertrick: 'Keep right thumb on DF throughout.', step1: 'White faces Up; edge is in UB.', step2: 'Hide corner, sweep edge over, and insert.' },
  { id: 20, group: 'Corner in Top • Edge in Top', name: 'F2L 20 (White Up • Opp F)', alg: "(U' F' U2 F) (U' F' U F)", fingertrick: "Push U' with left index; flick U with right index.", step1: 'White faces Up; edge is in UL.', step2: 'Mirror of F2L 19.' },
  { id: 21, group: 'Corner in Top • Edge in Top', name: 'F2L 21 (White Up • Far R)', alg: "(U2 R U R') (U R U' R')", fingertrick: 'Lead with U2 double-flick into two smooth R triggers.', step1: 'White faces Up; edge is in UL.', step2: 'Align over back-right and insert.' },
  { id: 22, group: 'Corner in Top • Edge in Top', name: 'F2L 22 (White Up • Far F)', alg: "(U2 F' U' F) (U' F' U F)", fingertrick: 'Lead with U2 double-flick into F-layer triggers.', step1: 'White faces Up; edge is in UB.', step2: 'Mirror of F2L 21.' },
  { id: 23, group: 'Corner in Top • Edge in Top', name: 'F2L 23 (White Up • Adj R)', alg: "(U R U' R') (U' R U' R') (U R U' R')", fingertrick: "Three rapid (R U' R') pulses with index push-pulls.", step1: 'White faces Up; edge is in UF.', step2: 'Cycle pair in 3 fast triggers.' },
  { id: 24, group: 'Corner in Top • Edge in Top', name: 'F2L 24 (White Up • Adj F)', alg: "(F' U F) (U2 R U R')", fingertrick: "Quick front lift into U2 + (R U R').", step1: 'White faces Up; edge is in UR.', step2: 'Pair over back-right and drop in.' },
  { id: 25, group: 'Corner in Slot • Edge in Top', name: 'F2L 25 (Solved Corner • Edge R)', alg: "(U' F' U F) (U R U' R')", fingertrick: 'Front insert setup directly into Right insert.', step1: 'Bottom corner is solved; edge is in UR.', step2: 'Extract corner paired with edge and insert.' },
  { id: 26, group: 'Corner in Slot • Edge in Top', name: 'F2L 26 (Solved Corner • Edge F)', alg: "(U R U' R') (U' F' U F)", fingertrick: 'Right trigger directly into Front trigger.', step1: 'Bottom corner is solved; edge is in UF.', step2: 'Mirror of F2L 25.' },
  { id: 27, group: 'Corner in Slot • Edge in Top', name: 'F2L 27 (Twist R • Edge R)', alg: "(R U' R' U) (R U' R')", fingertrick: "Double (R U' R') inverse sexy without regrip.", step1: 'Corner in slot with White facing Right.', step2: 'Pop corner out paired and re-insert.' },
  { id: 28, group: 'Corner in Slot • Edge in Top', name: 'F2L 28 (Twist F • Edge R)', alg: "(R U R' U') (R U R')", fingertrick: "Sexy move (R U R' U') followed by (R U R').", step1: 'Corner in slot with White facing Front.', step2: 'Lift and insert in 7 moves.' },
  { id: 29, group: 'Corner in Slot • Edge in Top', name: 'F2L 29 (Twist F • Edge F)', alg: "(R' F R F') (R' F R F')", fingertrick: "Double Sledgehammer (R' F R F') x2.", step1: 'Corner in slot with White facing Front; edge in UF.', step2: 'Two rapid sledgehammers solve the slot.' },
  { id: 30, group: 'Corner in Slot • Edge in Top', name: 'F2L 30 (Twist R • Edge F)', alg: "(R U R' U') (R U R')", fingertrick: 'Keep right thumb anchored on DF.', step1: 'Corner in slot with White facing Right; edge in UF.', step2: 'Extract and insert cleanly.' },
  { id: 31, group: 'Corner in Top • Edge in Slot', name: 'F2L 31 (White Up • Edge Flipped)', alg: "(U' R' F R F') (R U' R')", fingertrick: 'Sledgehammer into inverse sexy.', step1: 'White faces Up; middle edge is flipped in slot.', step2: 'Flip edge out and pair simultaneously.' },
  { id: 32, group: 'Corner in Top • Edge in Slot', name: 'F2L 32 (White Up • Edge Solved)', alg: "(R U R' U') (R U R' U') (R U R')", fingertrick: "Triple Sexy Move (R U R' U') x2 + (R U R').", step1: 'White faces Up; middle edge is already solved.', step2: 'Pure sexy-move spam.' },
  { id: 33, group: 'Corner in Top • Edge in Slot', name: 'F2L 33 (White R • Edge Solved)', alg: "(U' R U' R') (U2 R U' R')", fingertrick: "Smooth (U' R U' R') into U2 double-flick.", step1: 'White faces Right; middle edge is solved.', step2: 'Extract edge paired with corner and insert.' },
  { id: 34, group: 'Corner in Top • Edge in Slot', name: 'F2L 34 (White F • Edge Solved)', alg: "(U R U R') (U2 R U R')", fingertrick: 'Symmetric right-hand trigger with U2 flick.', step1: 'White faces Front; middle edge is solved.', step2: 'Pair in back-right and insert.' },
  { id: 35, group: 'Corner in Top • Edge in Slot', name: 'F2L 35 (White R • Edge Flipped)', alg: "(U' R U R') (U F' U' F)", fingertrick: "Flow from R' into F' with right thumb.", step1: 'White faces Right; edge is flipped in slot.', step2: 'Pop edge out and insert via Front.' },
  { id: 36, group: 'Corner in Top • Edge in Slot', name: 'F2L 36 (White F • Edge Flipped)', alg: "(U F' U' F) (U' R U R')", fingertrick: 'Mirror of F2L 35.', step1: 'White faces Front; edge is flipped in slot.', step2: 'Pop edge out and insert via Right.' },
  { id: 37, group: 'Corner & Edge in Slot', name: 'F2L 37 (Both in Slot • Flipped Edge)', alg: "(R U' R') (U' R U R') (U2 R U' R')", fingertrick: "Extract with (R U' R'), then solve like F2L 5.", step1: 'Corner solved, edge flipped in Front-Right.', step2: 'Extract, pair, and insert without cube rotation.' },
  { id: 38, group: 'Corner & Edge in Slot', name: 'F2L 38 (Twist R • Solved Edge)', alg: "(R U' R' U') (R U R') (U2 R U' R')", fingertrick: 'Keep wrist loose across all 3 triggers.', step1: 'Corner twisted Right; edge solved in slot.', step2: 'Cycle corner orientation into slot.' },
  { id: 39, group: 'Corner & Edge in Slot', name: 'F2L 39 (Twist F • Solved Edge)', alg: "(R U R' U2) (R U' R' U) (R U R')", fingertrick: 'Single regripless right-hand flow.', step1: 'Corner twisted Front; edge solved in slot.', step2: 'Lift, pair, and insert.' },
  { id: 40, group: 'Corner & Edge in Slot', name: 'F2L 40 (Twist R • Flipped Edge)', alg: "(R U' R' U) (F' U' F) (U' R U R')", fingertrick: "Transition cleanly into (F' U' F).", step1: 'Both pieces trapped & misoriented in slot.', step2: 'Extract and insert via Right.' },
  { id: 41, group: 'Corner & Edge in Slot', name: 'F2L 41 (Twist F • Flipped Edge)', alg: "(R U R' U') (R U' R') (U2 F' U' F)", fingertrick: "Sexy move into inverse sexy + (F' U' F).", step1: 'Both pieces trapped & misoriented in slot.', step2: 'Extract and insert via Front.' }
];

const F2L_BY_ID = new Map(F2L_DATA.map((item) => [item.id, item]));
const F2L_GROUPS = Array.from(new Set(F2L_DATA.map((item) => item.group)));
const F2L_DEFAULT_CHUNKS = [
  { id: 'f2l-c1', title: 'Chunk 1 • Basic Inserts (1–4)', ids: [1, 2, 3, 4] },
  { id: 'f2l-c2', title: 'Chunk 2 • Split Top Pairs (5–10)', ids: [5, 6, 7, 8, 9, 10] },
  { id: 'f2l-c3', title: 'Chunk 3 • Connected Pairs (11–16)', ids: [11, 12, 13, 14, 15, 16] },
  { id: 'f2l-c4', title: 'Chunk 4 • White Facing Up (17–24)', ids: [17, 18, 19, 20, 21, 22, 23, 24] },
  { id: 'f2l-c5', title: 'Chunk 5 • Corner in Slot (25–30)', ids: [25, 26, 27, 28, 29, 30] },
  { id: 'f2l-c6', title: 'Chunk 6 • Edge in Slot (31–36)', ids: [31, 32, 33, 34, 35, 36] },
  { id: 'f2l-c7', title: 'Chunk 7 • Trapped Slot Cases (37–41)', ids: [37, 38, 39, 40, 41] }
];

const OLL_DATA = [
  { id: 27, group: 'All Edges Oriented', name: 'OLL 27 (Sune)', alg: "(R U R' U) (R U2 R')", fingertrick: "Lift R, flick U, drop R', push U with left index, lift R, U2 double-flick." },
  { id: 26, group: 'All Edges Oriented', name: 'OLL 26 (Antisune)', alg: "(R U2 R' U') (R U' R')", fingertrick: "Lift R, U2 double-flick, drop R', push U' with left index, finish (R U' R')." },
  { id: 21, group: 'All Edges Oriented', name: 'OLL 21 (H / Double Sune)', alg: "F (R U R' U') (R U R' U') (R U R' U') F'", fingertrick: "Triple Sexy Move (R U R' U') x3 bracketed by F and F'." },
  { id: 22, group: 'All Edges Oriented', name: 'OLL 22 (Pi / Bruno)', alg: "R U2 (R2 U' R2 U') R2 U2 R", fingertrick: "Double-flick U2 and push U' with left index so right wrist never regrips." },
  { id: 23, group: 'All Edges Oriented', name: 'OLL 23 (Headlights / U)', alg: "R2 D (R' U2 R) D' (R' U2 R')", fingertrick: "Push D with left ring finger; pull D' with right ring finger." },
  { id: 24, group: 'All Edges Oriented', name: 'OLL 24 (Chameleon / T)', alg: "(r U R' U') (r' F R F')", fingertrick: "Wide sexy move (r U R' U') into wide sledgehammer (r' F R F')." },
  { id: 25, group: 'All Edges Oriented', name: 'OLL 25 (Bowtie / L)', alg: "F' (r U R' U') (r' F R)", fingertrick: "Lift F' with right thumb, execute wide sexy, finish with (r' F R)." },
  { id: 33, group: 'T-Shapes & Squares', name: 'OLL 33 (T-Sexy)', alg: "(R U R' U') (R' F R F')", fingertrick: 'Sexy move directly into Sledgehammer—one of the fastest 8-movers.' },
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
  { id: 9, group: 'P-Shapes & Fish', name: 'OLL 9 (Kite)', alg: "(R U R' U') R' F R2 U R' U' F'", fingertrick: 'Sexy move into Sledgehammer-style R2 finish.' },
  { id: 10, group: 'P-Shapes & Fish', name: 'OLL 10 (Anti-Kite)', alg: "(R U R' U) (R' F R F') (R U2 R')", fingertrick: "Sledgehammer nested before (R U2 R')." },
  { id: 35, group: 'P-Shapes & Fish', name: 'OLL 35 (Fish Salad)', alg: "(R U2) (R2 F R F') (R U2 R')", fingertrick: 'Sledgehammer with R2 in the middle between two (R U2) bursts.' },
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
  { id: 56, group: 'T-Shapes & Squares', name: 'OLL 56 (Streetlights)', alg: "(r U r') (U R U' R') (U R U' R') (r U' r')", fingertrick: 'Wide r brackets around two inverse sexies.' },
  { id: 57, group: 'All Edges Oriented', name: 'OLL 57 (H-Cross)', alg: "(R U R' U') M' (U R U' r')", fingertrick: "Sexy move + left-ring M' + wide r' finish." },
  { id: 28, group: 'All Edges Oriented', name: 'OLL 28 (Stealth)', alg: "(r U R' U') M (U R U' R')", fingertrick: 'Sexy move + M slice + inverse sexy.' },
  { id: 29, group: 'Knight & Lightning', name: 'OLL 29 (Spotted Chameleon)', alg: "(R U R' U') (R U' R' F') U' (F R U R')", fingertrick: "Smooth F' thumb lift after R'." },
  { id: 30, group: 'Knight & Lightning', name: 'OLL 30 (Spotted Anti)', alg: "F (R' F R2 U' R' U') (R U R' F2)", fingertrick: 'Finish with double-flick F2.' },
  { id: 41, group: 'Knight & Lightning', name: 'OLL 41 (Awkward Sune)', alg: "(R U R' U) (R U2 R') F (R U R' U') F'", fingertrick: 'Sune + OLL 45 (F Sexy F\') combined.' },
  { id: 42, group: 'Knight & Lightning', name: 'OLL 42 (Awkward Antisune)', alg: "(R' U' R U') (R' U2 R) F (R U R' U') F'", fingertrick: 'Back-Antisune + OLL 45 combined.' },
  { id: 47, group: 'C-Shapes & W-Shapes', name: 'OLL 47 (Anti-Breakneck)', alg: "F' (L' U' L U) (L' U' L U) F", fingertrick: "Double Left Sexy (L' U' L U) x2 inside F' ... F." },
  { id: 48, group: 'C-Shapes & W-Shapes', name: 'OLL 48 (Breakneck)', alg: "F (R U R' U') (R U R' U') F'", fingertrick: "Double Sexy (R U R' U') x2 inside F ... F'." },
  { id: 49, group: 'C-Shapes & W-Shapes', name: 'OLL 49 (Right Back Squeezy)', alg: "r U' r2 U r2 U r2 U' r", fingertrick: 'Continuous wide-r rolling motion.' },
  { id: 50, group: 'C-Shapes & W-Shapes', name: 'OLL 50 (Right Front Squeezy)', alg: "r' U r2 U' r2 U' r2 U r'", fingertrick: "Mirror wide-r' rolling motion." },
  { id: 53, group: 'T-Shapes & Squares', name: 'OLL 53 (Frying Pan L)', alg: "(r' U' R U') (R' U R U') (R' U2 r)", fingertrick: "Keep wrist steady during R' U R U'." },
  { id: 54, group: 'T-Shapes & Squares', name: 'OLL 54 (Frying Pan R)', alg: "(r U R' U) (R U' R' U) (R U2 r')", fingertrick: 'Mirror of OLL 53.' },
  { id: 1, group: 'Dot Cases', name: 'OLL 1 (Runway)', alg: "(R U2) (R2 F R F') U2 (R' F R F')", fingertrick: 'Two Sledgehammers separated by U2 double-flick.' },
  { id: 2, group: 'Dot Cases', name: 'OLL 2 (Zamboni)', alg: "F (R U R' U') F' f (R U R' U') f'", fingertrick: 'OLL 45 + wide f OLL 45 back-to-back.' },
  { id: 3, group: 'Dot Cases', name: 'OLL 3 (Anti-Mouse)', alg: "f (R U R' U') f' U' F (R U R' U') F'", fingertrick: "Wide f trigger, U' push, standard F trigger." },
  { id: 4, group: 'Dot Cases', name: 'OLL 4 (Mouse)', alg: "f (R U R' U') f' U F (R U R' U') F'", fingertrick: 'Wide f trigger, U flick, standard F trigger.' },
  { id: 17, group: 'Dot Cases', name: 'OLL 17 (Slash)', alg: "(R U R' U) (R' F R F') U2 (R' F R F')", fingertrick: 'Sledgehammer + U2 + Sledgehammer.' },
  { id: 18, group: 'Dot Cases', name: 'OLL 18 (Crown)', alg: "(r U R' U) (R U2 r') (r' U' R U') (R' U2 r)", fingertrick: 'OLL 7 directly into OLL 8.' },
  { id: 19, group: 'Dot Cases', name: 'OLL 19 (Bunny)', alg: "r' R U (R U R' U') r (R2 F R F')", fingertrick: 'Sexy move into wide r and Sledgehammer.' },
  { id: 20, group: 'Dot Cases', name: 'OLL 20 (Checkers / X)', alg: "(r U R' U') M2 (U R U' R') U' M'", fingertrick: 'Double-flick M2 with left ring-middle fingers.' }
];

const OLL_BY_ID = new Map(OLL_DATA.map((item) => [item.id, item]));
const OLL_GROUPS = Array.from(new Set(OLL_DATA.map((item) => item.group)));
const OLL_DEFAULT_CHUNKS = [
  { id: 'oll-c1', title: 'Chunk 1 • 2-Look OLL Corners (21–27)', ids: [27, 26, 21, 22, 23, 24, 25] },
  { id: 'oll-c2', title: 'Chunk 2 • T, Square & Line (33, 45, 5, 6, 51, 52)', ids: [33, 45, 5, 6, 51, 52] },
  { id: 'oll-c3', title: 'Chunk 3 • P & C Shapes (31, 32, 43, 44, 34, 46)', ids: [31, 32, 43, 44, 34, 46] },
  { id: 'oll-c4', title: 'Chunk 4 • Fish & W Shapes (9, 10, 35, 37, 36, 38)', ids: [9, 10, 35, 37, 36, 38] },
  { id: 'oll-c5', title: 'Chunk 5 • Knight & Lightning (7, 8, 11–16, 39, 40)', ids: [7, 8, 11, 12, 13, 14, 15, 16, 39, 40] },
  { id: 'oll-c6', title: 'Chunk 6 • Squeezy, Awkward & Dots (1–4, 17–20)', ids: [1, 2, 3, 4, 17, 18, 19, 20, 47, 48] }
];

const PLL_DATA = [
  { id: 1, group: 'Edges Only (EPLL)', name: 'PLL Ua (Counter-Clockwise)', alg: "(R U' R U) (R U R U') R' U' R2", inverse: "R2 U R U R' U' R' U' R' U R'", recognition: 'Solved bar in back; 3 edges cycle counter-clockwise.', fingertrick: "Keep right thumb on DF and push U' with left index." },
  { id: 2, group: 'Edges Only (EPLL)', name: 'PLL Ub (Clockwise)', alg: "R2 U (R U R' U') R' U' (R' U R')", inverse: "R U' R U R U R U' R' U' R2", recognition: 'Solved bar in back; 3 edges cycle clockwise.', fingertrick: "Execute (R U R' U') cleanly before dropping R' U' R'." },
  { id: 3, group: 'Edges Only (EPLL)', name: 'PLL H (Opposite Edge Swap)', alg: "(M2 U M2) U2 (M2 U M2)", inverse: "M2 U' M2 U2 M2 U' M2", recognition: 'Opposite colors on all 4 middle edges; corners solved.', fingertrick: 'Ring-middle double flick for M2; index-middle flick for U2.' },
  { id: 4, group: 'Edges Only (EPLL)', name: 'PLL Z (Adjacent Edge Swap)', alg: "(M' U M2 U) (M2 U M') U2 M2", inverse: "M2 U2 M U' M2 U' M2 U' M", recognition: 'Two pairs of adjacent edges swap diagonally.', fingertrick: "Left ring finger drives M' and M2 without moving hands." },
  { id: 5, group: 'Corners Only (CPLL)', name: 'PLL Aa (Headlights Left)', alg: "x (R' U R') D2 (R U' R') D2 R2 x'", inverse: "x R2 D2 R U R' D2 R U' R x'", recognition: '2x2 solved block on Front-Left; headlights on Back.', fingertrick: 'Rotate x smoothly; double-flick D2 with left ring-middle.' },
  { id: 6, group: 'Corners Only (CPLL)', name: 'PLL Ab (Headlights Back)', alg: "x R2 D2 (R U R') D2 (R U' R) x'", inverse: "x R' U R' D2 R U' R' D2 R2 x'", recognition: '2x2 solved block on Back-Left; headlights on Right.', fingertrick: 'Keep thumbs anchored on corners during D2 double-flicks.' },
  { id: 7, group: 'Corners Only (CPLL)', name: 'PLL E (Double Corner Swap)', alg: "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x", inverse: "x' D R U R' D' R U' R' D R U' R' D' R U R' x", recognition: 'No headlights anywhere; all 4 edges solved.', fingertrick: "Alternate left-ring D and right-ring D' pushes in rhythm." },
  { id: 8, group: 'Adjacent Corner Swap', name: 'PLL T (Classic T-Perm)', alg: "(R U R' U') R' F R2 U' R' U' (R U R' F')", inverse: "F R U' R' U R U R2 F' R U R U' R'", recognition: 'Headlights on Left; two adjacent 2-sticker bars on Front & Back.', fingertrick: "Sexy move into R' F R2; lift final F' with right thumb." },
  { id: 9, group: 'Adjacent Corner Swap', name: 'PLL Jb (Right J-Perm)', alg: "(R U R' F') (R U R' U') R' F R2 U' R'", inverse: "R U R2 F' R U R U' R' F R U' R'", recognition: 'Solved 3-bar on Left; Front-Right 2-block swaps with Back-Right.', fingertrick: "One of the fastest PLLs—flow directly from F' into (R U R' U')." },
  { id: 10, group: 'Adjacent Corner Swap', name: 'PLL Ja (Left J-Perm)', alg: "(L' U' L F) (L' U' L U) L F' L2 U L", inverse: "L' U' L2 F L' U' L' U L F' L' U L", recognition: 'Solved 3-bar on Right; Front-Left 2-block swaps.', fingertrick: "Mirror of Jb using left-hand triggers and left-thumb F'." },
  { id: 11, group: 'Adjacent Corner Swap', name: 'PLL F (3-Bar Front)', alg: "(R' U' F') (R U R' U') R' F R2 U' R' U' (R U R' U) R", inverse: "R' U' R U' R' U R U R2 F' R U R U' R' F U R", recognition: 'Full solved 3-sticker bar on Front; no other headlights.', fingertrick: "Setup (R' U' F') straight into a full T-Perm." },
  { id: 12, group: 'Adjacent Corner Swap', name: 'PLL Ra (Headlights Front)', alg: "(R U' R' U') (R U R D) (R' U' R D') (R' U2 R')", inverse: "R U2 R D R' U R D' R' U' R' U R U R'", recognition: 'Headlights on Front; 2-block on Front-Right.', fingertrick: "Use ring fingers for D and D' without regripping." },
  { id: 13, group: 'Adjacent Corner Swap', name: 'PLL Rb (Headlights Back)', alg: "(R' U2 R U2) R' F (R U R' U') R' F' R2", inverse: "R2 F R U R U' R' F' R U2 R' U2 R", recognition: 'Headlights on Front; 2-block on Front-Left.', fingertrick: 'Double-flick both U2s; press F with right index.' },
  { id: 14, group: 'Diagonal Corner Swap', name: 'PLL Y (Diagonal Swap)', alg: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')", inverse: "F R' F' R U R U' R' F R U' R' U R U R' F'", recognition: 'Two 2-blocks meeting at Front-Left corner; no headlights.', fingertrick: 'OLL 37 + OLL 33 (Sexy + Sledgehammer) chained together.' },
  { id: 15, group: 'Diagonal Corner Swap', name: 'PLL V (2x2 Block)', alg: "(R' U R' U') y (R' F' R2 U') (R' U R' F) R F", inverse: "F' R' F' R U' R U R2 F R y' U R U' R", recognition: '2x2 solved block in Front-Left; no headlights.', fingertrick: "Rotate y smoothly into R' F' R2." },
  { id: 16, group: 'Diagonal Corner Swap', name: 'PLL Na (Right N-Perm)', alg: "(R U R' U) (R U R' F') (R U R' U') R' F R2 U' R' U2 (R U' R')", inverse: "R U R' U2 R U R2 F' R U R U' R' F R U' R' U' R U' R'", recognition: 'Four 2-blocks with Right side sticking out.', fingertrick: "Embeds a full Jb-Perm inside (R U R' U) ... U2 (R U' R')." },
  { id: 17, group: 'Diagonal Corner Swap', name: 'PLL Nb (Left N-Perm)', alg: "(R' U R U') (R' F' U' F) (R U R' F) R' F' (R U' R)", inverse: "R' U R F R F' R U' R' F' U F R U R' U' R", recognition: 'Four 2-blocks with Left side sticking out.', fingertrick: "Keep right thumb ready on DF for F' and F." },
  { id: 18, group: 'G-Permutations', name: 'PLL Ga (Headlights L • Bar F)', alg: "R2 U (R' U R' U') (R U' R2) (D U' R' U) R D'", inverse: "D R' U' R U D' R2 U R' U R U' R U' R2", recognition: 'Headlights on Left; 2-block on Front-Right.', fingertrick: "Simultaneous D + U' ring-and-index push." },
  { id: 19, group: 'G-Permutations', name: 'PLL Gb (Headlights L • Bar B)', alg: "(R' U' R U) D' R2 (U R' U R U') R U' R2 D", inverse: "D' R2 U R' U R' U' R U' R2 D U' R' U R", recognition: 'Headlights on Left; 2-block on Back-Right.', fingertrick: "Left ring D' on move 5; right ring D on final move." },
  { id: 20, group: 'G-Permutations', name: 'PLL Gc (Headlights L • Bar R)', alg: "R2 U' (R U' R U) (R' U R2) (D' U R U') R' D", inverse: "D' R U R' U' D R2 U' R U' R' U R' U R2", recognition: 'Headlights on Left; 2-block on Right-Back.', fingertrick: "Mirror of Ga with simultaneous D' + U." },
  { id: 21, group: 'G-Permutations', name: 'PLL Gd (Headlights L • Bar FL)', alg: "(R U R' U') D R2 (U' R U' R' U) R' U R2 D'", inverse: "D R2 U' R U' R U R' U R2 D' U R U' R'", recognition: 'Headlights on Left; 2-block on Front-Left.', fingertrick: "Sexy move into D R2; finish with right-ring D'." },
  { id: 22, group: 'Edges Only (EPLL)', name: 'Bonus • Ua (M-Slice)', alg: "M2 U (M U2 M') U M2", inverse: "M2 U' M U2 M' U' M2", recognition: 'Ultra-fast M-slice Ua variant.', fingertrick: 'Pure M2 / U / M / U2 without touching R or L.' },
  { id: 23, group: 'Edges Only (EPLL)', name: 'Bonus • Ub (M-Slice)', alg: "M2 U' (M U2 M') U' M2", inverse: "M2 U M U2 M' U M2", recognition: 'Ultra-fast M-slice Ub variant.', fingertrick: "Pure M2 / U' / M / U2 without touching R or L." },
  { id: 24, group: 'Adjacent Corner Swap', name: 'Bonus • Ja (Back-Right)', alg: "x R2 F (R F' R) U2 (r' U r) U2 x'", inverse: "x U2 r' U' r U2 R' F R' F' R2 x'", recognition: 'Rotationless-style Ja alternative.', fingertrick: "Fast wide (r' U r) U2 finish." },
  { id: 25, group: 'Diagonal Corner Swap', name: 'Bonus • Y (Alt Setup)', alg: "(R2 U' R2 U') (R2 U R' F') (R U R2 U') R' F R", inverse: "R' F' R U R2 U' R' F R U' R2 U R2 U R2", recognition: 'RUD-friendly Y-Perm alternative.', fingertrick: 'Avoids initial F turn.' }
];

const PLL_BY_ID = new Map(PLL_DATA.map((item) => [item.id, item]));
const PLL_GROUPS = Array.from(new Set(PLL_DATA.map((item) => item.group)));
const PHASE_REGISTRY = {
  f2l: { data: F2L_DATA, byId: F2L_BY_ID, groups: F2L_GROUPS, statField: 'f2lStats', dayField: 'f2lDay', chunkField: 'f2lCustomChunks', label: 'F2L' },
  oll: { data: OLL_DATA, byId: OLL_BY_ID, groups: OLL_GROUPS, statField: 'stats', dayField: 'day', chunkField: 'customChunks', label: 'OLL' },
  pll: { data: PLL_DATA, byId: PLL_BY_ID, groups: PLL_GROUPS, statField: 'pllStats', dayField: 'pllDay', chunkField: 'pllCustomChunks', label: 'PLL' }
};
const PLL_DEFAULT_CHUNKS = [
  { id: 'pll-c1', title: 'Chunk 1 • 2-Look PLL (1–7)', ids: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'pll-c2', title: 'Chunk 2 • T, J & F Perms (8–11)', ids: [8, 9, 10, 11] },
  { id: 'pll-c3', title: 'Chunk 3 • R, Y & V Perms (12–15)', ids: [12, 13, 14, 15] },
  { id: 'pll-c4', title: 'Chunk 4 • N & G Perms (16–21)', ids: [16, 17, 18, 19, 20, 21] }
];

// =========================================================================
// 3. CLOUD & LOCAL PERSISTENCE HOOK
// =========================================================================
const getLocalDateKey = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterdayDateKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
};

function computeActiveStreakDays(rawStreak, lastActiveDate) {
  const count = Number.isFinite(Number(rawStreak)) && Number(rawStreak) >= 0 ? Number(rawStreak) : 0;
  if (!lastActiveDate || count === 0) return 0;
  const today = getLocalDateKey();
  const yesterday = getYesterdayDateKey();
  return (lastActiveDate === today || lastActiveDate === yesterday) ? count : 0;
}

function advanceDailyStreakFields(u) {
  const today = getLocalDateKey();
  const yesterday = getYesterdayDateKey();
  const prevCount = computeActiveStreakDays(u.consecutiveStreakDays, u.lastActiveDate);
  if (u.lastActiveDate === today) {
    return { consecutiveStreakDays: Math.max(1, prevCount), lastActiveDate: today };
  }
  const nextCount = u.lastActiveDate === yesterday ? prevCount + 1 : 1;
  return { consecutiveStreakDays: nextCount, lastActiveDate: today };
}

const DEFAULT_USERS = {
  Demo: {
    day: 1, f2lDay: 1, pllDay: 1, crossDay: 1, stats: {}, f2lStats: {}, pllStats: {}, fullSolveHistory: [],
    customChunks: null, f2lCustomChunks: null, pllCustomChunks: null, crossClears: 0,
    consecutiveStreakDays: 0, lastActiveDate: '', isPro: true,
    email: '', fullSolveTargetPb: 15.0,
    phaseTargetPbs: { cross: 2.0, f2l: 2.5, oll: 2.0, pll: 2.0 },
    caseTargetPbs: { f2l: {}, oll: {}, pll: {} },
    customAlgs: { f2l: {}, oll: {}, pll: {} }
  }
};

function sanitizeUserRecord(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  return {
    day: Number.isFinite(Number(base.day)) && Number(base.day) >= 1 ? Number(base.day) : 1,
    f2lDay: Number.isFinite(Number(base.f2lDay)) && Number(base.f2lDay) >= 1 ? Number(base.f2lDay) : 1,
    pllDay: Number.isFinite(Number(base.pllDay)) && Number(base.pllDay) >= 1 ? Number(base.pllDay) : 1,
    crossDay: Number.isFinite(Number(base.crossDay)) && Number(base.crossDay) >= 1 ? Number(base.crossDay) : 1,
    consecutiveStreakDays: Number.isFinite(Number(base.consecutiveStreakDays)) && Number(base.consecutiveStreakDays) >= 0 ? Number(base.consecutiveStreakDays) : 0,
    lastActiveDate: typeof base.lastActiveDate === 'string' ? base.lastActiveDate : '',
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
    fullSolveTargetPb: Number.isFinite(Number(base.fullSolveTargetPb)) && Number(base.fullSolveTargetPb) > 0 ? Number(base.fullSolveTargetPb) : 15.0,
    phaseTargetPbs: { cross: 2.0, f2l: 2.5, oll: 2.0, pll: 2.0, ...(base.phaseTargetPbs && typeof base.phaseTargetPbs === 'object' ? base.phaseTargetPbs : {}) },
    caseTargetPbs: {
      f2l: base.caseTargetPbs?.f2l && typeof base.caseTargetPbs.f2l === 'object' ? base.caseTargetPbs.f2l : {},
      oll: base.caseTargetPbs?.oll && typeof base.caseTargetPbs.oll === 'object' ? base.caseTargetPbs.oll : {},
      pll: base.caseTargetPbs?.pll && typeof base.caseTargetPbs.pll === 'object' ? base.caseTargetPbs.pll : {}
    },
    customAlgs: {
      f2l: base.customAlgs?.f2l && typeof base.customAlgs.f2l === 'object' ? base.customAlgs.f2l : {},
      oll: base.customAlgs?.oll && typeof base.customAlgs.oll === 'object' ? base.customAlgs.oll : {},
      pll: base.customAlgs?.pll && typeof base.customAlgs.pll === 'object' ? base.customAlgs.pll : {}
    }
  };
}

function mergeDefaultUsersWithStored(storedMap) {
  const result = {};
  if (storedMap && typeof storedMap === 'object') {
    Object.entries(storedMap).forEach(([k, val]) => {
      if (val && typeof val === 'object' && !val.$$typeof && !val._deleted) result[k] = sanitizeUserRecord(val);
    });
  }
  return Object.keys(result).length === 0 ? { ...DEFAULT_USERS } : result;
}

function useSolverPersistence(users, setUsers, activeUserKey, isAppVisible = true) {
  const [cloudAuthUser, setCloudAuthUser] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('connecting');
  const latestUsersRef = useRef(users);
  latestUsersRef.current = users;
  const cloudAuthUserRef = useRef(cloudAuthUser);
  cloudAuthUserRef.current = cloudAuthUser;
 const pendingCloudSyncRef = useRef(new Map());
  const lastCloudWriteRef = useRef(new Map());
  const cloudSaveTimerRef = useRef(null);
  const localSaveTimerRef = useRef(null);

  const flushPendingPersistence = async () => {
    if (localSaveTimerRef.current) { clearTimeout(localSaveTimerRef.current); localSaveTimerRef.current = null; }
    storage.setJson(STORAGE_KEYS.users, latestUsersRef.current);
    if (cloudSaveTimerRef.current) { clearTimeout(cloudSaveTimerRef.current); cloudSaveTimerRef.current = null; }
    const uid = cloudAuthUserRef.current?.uid;
    if (pendingCloudSyncRef.current.size > 0 && resolvedFirebaseConfig && uid) {
      const batchEntries = Array.from(pendingCloudSyncRef.current.entries());
      pendingCloudSyncRef.current.clear();
      try {
        const svc = await getFirebaseServices();
        if (!svc) {
          batchEntries.forEach(([k, rec]) => { if (!pendingCloudSyncRef.current.has(k)) pendingCloudSyncRef.current.set(k, rec); });
          setCloudSyncStatus('local');
          return;
        }
        const writeTs = Date.now();
        await Promise.all(
          batchEntries.map(([uKey, record]) => {
            lastCloudWriteRef.current.set(uKey, writeTs);
            return svc.fsMod.setDoc(
              svc.fsMod.doc(svc.db, 'artifacts', appId, 'users', uid, 'solver_profiles', uKey),
              { ...sanitizeUserRecord(record), updatedAt: writeTs },
              { merge: true }
            );
          })
        );
        setCloudSyncStatus('synced');
      } catch {
        batchEntries.forEach(([k, rec]) => { if (!pendingCloudSyncRef.current.has(k)) pendingCloudSyncRef.current.set(k, rec); });
        setCloudSyncStatus('local');
      }
    }
  };

  const saveUserToCloud = (uKey, record) => {
    if (!uKey || uKey === 'Demo' || !resolvedFirebaseConfig || !cloudAuthUserRef.current?.uid) return;
    pendingCloudSyncRef.current.set(uKey, record);
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    cloudSaveTimerRef.current = setTimeout(flushPendingPersistence, 500);
  };

  const cancelPendingWriteFor = (uKey) => {
    pendingCloudSyncRef.current.delete(uKey);
    if (pendingCloudSyncRef.current.size === 0 && cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = null;
    }
  };

  useEffect(() => () => { flushPendingPersistence(); }, []);

  useEffect(() => {
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => { localSaveTimerRef.current = null; storage.setJson(STORAGE_KEYS.users, users); }, 350);
    return () => clearTimeout(localSaveTimerRef.current);
  }, [users]);

  useEffect(() => {
    if (!resolvedFirebaseConfig) { setCloudSyncStatus('local'); return; }
    let unsubAuth = null, cancelled = false;
    (async () => {
      const svc = await getFirebaseServices();
      if (!svc || cancelled) { setCloudSyncStatus('local'); return; }
      unsubAuth = svc.authMod.onAuthStateChanged(svc.auth, (fbUser) => {
        if (!cancelled) {
          setCloudAuthUser(fbUser || null);
          if (!fbUser) setCloudSyncStatus('local');
        }
      });
      if (!svc.auth.currentUser) {
        try {
          const g = typeof globalThis !== 'undefined' ? globalThis : {};
          if (g.__initial_auth_token) await svc.authMod.signInWithCustomToken(svc.auth, g.__initial_auth_token);
          else await svc.authMod.signInAnonymously(svc.auth);
        } catch {
          if (!cancelled) setCloudSyncStatus('local');
        }
      }
    })();
    return () => { cancelled = true; unsubAuth?.(); };
  }, []);

  useEffect(() => {
    const uid = cloudAuthUser?.uid;
    if (!resolvedFirebaseConfig || !uid || !activeUserKey || activeUserKey === 'Demo') {
      setCloudSyncStatus('local');
      return;
    }
    if (!isAppVisible) return;
    let cancelled = false;
    let unsubSnapshot = null;
    (async () => {
      try {
        const svc = await getFirebaseServices();
        if (!svc || cancelled) return;
        const docRef = svc.fsMod.doc(svc.db, 'artifacts', appId, 'users', uid, 'solver_profiles', activeUserKey);
        unsubSnapshot = svc.fsMod.onSnapshot(
          docRef,
          (docSnap) => {
            if (cancelled) return;
            setCloudSyncStatus('synced');
            if (!docSnap.exists()) {
              const localSeed = latestUsersRef.current?.[activeUserKey];
              if (localSeed) saveUserToCloud(activeUserKey, localSeed);
              return;
            }
            const data = docSnap.data();
            if (!data || typeof data !== 'object') return;
            if (data.updatedAt && data.updatedAt === lastCloudWriteRef.current.get(docSnap.id)) return;
            setUsers((prev) => ({
              ...prev,
              [docSnap.id]: sanitizeUserRecord({ ...(prev[docSnap.id] || {}), ...data })
            }));
          },
          () => {
            if (!cancelled) setCloudSyncStatus('local');
          }
        );
      } catch {
        if (!cancelled) setCloudSyncStatus('local');
      }
    })();
    return () => {
      cancelled = true;
      if (typeof unsubSnapshot === 'function') unsubSnapshot();
    };
  }, [cloudAuthUser?.uid, activeUserKey, isAppVisible, setUsers]);

  return { cloudAuthUser, cloudSyncStatus, saveUserToCloud, flushPendingPersistence, cancelPendingWriteFor };
}

// =========================================================================
// 4. MAIN APPLICATION COMPONENT & ERROR BOUNDARY
// =========================================================================
const APP_GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  html, body {
    background-color: #060e20;
    color: #f8fafc;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    letter-spacing: -0.01em;
    overscroll-behavior: none;
    -webkit-tap-highlight-color: transparent;
  }
  .bg-midnight-marble {
    background-color: #071127;
    background-image:
      radial-gradient(ellipse 95% 65% at 14% 12%, rgba(23, 56, 118, 0.78) 0%, rgba(14, 34, 76, 0.35) 46%, transparent 74%),
      radial-gradient(ellipse 75% 55% at 78% 18%, rgba(249, 115, 22, 0.26) 0%, rgba(234, 88, 12, 0.10) 44%, transparent 72%),
      radial-gradient(ellipse 85% 70% at 86% 24%, rgba(3, 6, 15, 0.86) 0%, rgba(5, 11, 24, 0.40) 48%, transparent 76%),
      radial-gradient(ellipse 105% 60% at 62% 52%, rgba(28, 66, 134, 0.68) 0%, rgba(13, 32, 72, 0.28) 44%, transparent 72%),
      radial-gradient(ellipse 70% 52% at 22% 56%, rgba(249, 115, 22, 0.22) 0%, rgba(251, 146, 60, 0.08) 45%, transparent 72%),
      radial-gradient(ellipse 80% 65% at 18% 72%, rgba(2, 5, 13, 0.84) 0%, rgba(6, 13, 29, 0.36) 50%, transparent 78%),
      radial-gradient(ellipse 80% 58% at 74% 84%, rgba(249, 115, 22, 0.24) 0%, rgba(234, 88, 12, 0.09) 44%, transparent 74%),
      radial-gradient(ellipse 95% 70% at 82% 88%, rgba(20, 50, 108, 0.72) 0%, rgba(10, 25, 58, 0.30) 48%, transparent 75%),
      linear-gradient(138deg, #0b1d42 0%, #050a16 24%, #112a5c 48%, #26140c 66%, #040812 80%, #0d234d 100%);
  }
  button, label, span, p, input, select, textarea, .font-sans {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .font-mono, code, pre {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    letter-spacing: -0.015em;
  }
  h1, h2, h3, h4, header h1, .font-timer {
    font-family: 'Chakra Petch', sans-serif !important;
    letter-spacing: -0.01em;
  }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .f2l-cube-satin { filter: contrast(0.94) saturate(0.9) brightness(0.98); transition: transform 0.25s ease; }
 .case-row-opt {
    content-visibility: auto;
    contain-intrinsic-size: auto 76px;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 17, 36, 0.78) 100%);
  }
  .app-bg-sleep *, .app-bg-sleep *::before, .app-bg-sleep *::after { transition: none !important; animation: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  .liquid-glass-card {
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.025) 48%, rgba(249, 115, 22, 0.05) 100%),
      rgba(10, 17, 36, 0.24);
    backdrop-filter: blur(20px) saturate(145%);
    -webkit-backdrop-filter: blur(20px) saturate(145%);
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
      inset 0 0 0 1px rgba(255, 255, 255, 0.08),
      0 12px 32px -10px rgba(0, 0, 0, 0.36);
    contain: paint;
  }
  .liquid-glass-well {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%),
      rgba(6, 11, 26, 0.34);
    backdrop-filter: blur(14px) saturate(135%);
    -webkit-backdrop-filter: blur(14px) saturate(135%);
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.09), inset 0 -1px 0 0 rgba(0, 0, 0, 0.28);
  }
  .liquid-tile-sheen {
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.03) 48%, rgba(249, 115, 22, 0.07) 100%),
      rgba(10, 18, 38, 0.34);
  }
  .liquid-glass-dock {
    background:
      linear-gradient(125deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 30%, rgba(168, 85, 247, 0.07) 54%, rgba(251, 146, 60, 0.11) 100%),
      rgba(8, 14, 30, 0.44);
    backdrop-filter: blur(22px) saturate(160%) contrast(106%);
    -webkit-backdrop-filter: blur(22px) saturate(160%) contrast(106%);
    box-shadow:
      inset 0 -1px 0 0 rgba(251, 146, 60, 0.22),
      0 20px 44px -8px rgba(0, 0, 0, 0.72);
    contain: layout paint;
    transform: translateZ(0);
  }
  @keyframes heroCubeFloat {
    0%, 100% { transform: translate3d(0, 0px, 0) rotate(-1.5deg); }
    50% { transform: translate3d(0, -7px, 0) rotate(1.5deg); }
  }
  .hero-cube-float {
    animation: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-cube-float { animation: none; }
  }
  @keyframes uvCardMaterializeUp {
    0% { opacity: 0; transform: translate3d(0, 36px, 0) scale(0.92); }
    100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes uvCardMaterializeDown {
    0% { opacity: 0; transform: translate3d(0, -36px, 0) scale(0.92); }
    100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  .uv-card-enter-up {
    animation: uvCardMaterializeUp 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .uv-card-enter-down {
    animation: uvCardMaterializeDown 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  @keyframes matteStreakSpin3D {
    0% { transform: rotateX(-22deg) rotateY(0deg); }
    100% { transform: rotateX(-22deg) rotateY(360deg); }
  }
  @keyframes uvStreakSpin3D {
    0% { transform: rotateX(56deg) rotateY(0deg); }
    50% { transform: rotateX(68deg) rotateY(180deg); }
    100% { transform: rotateX(56deg) rotateY(360deg); }
  }
  @keyframes streakAuraPulse {
    0%, 100% { opacity: 0.35; transform: scale(0.92); }
    50% { opacity: 0.95; transform: scale(1.08); }
  }
  .matte-streak-cube-spin {
    animation: matteStreakSpin3D 10s linear infinite;
    will-change: transform;
  }
  .uv-streak-cube-spin {
    animation: uvStreakSpin3D 5s linear infinite;
    will-change: transform;
  }
  .matte-streak-glow-pulse::before {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 9999px;
    pointer-events: none;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.55) 0%, rgba(245, 158, 11, 0) 72%);
    animation: streakAuraPulse 2.6s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .uv-streak-glow-pulse::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 9999px;
    pointer-events: none;
    background: radial-gradient(circle, rgba(216, 180, 254, 0.7) 0%, rgba(251, 146, 60, 0.38) 45%, rgba(0, 0, 0, 0) 74%);
    animation: streakAuraPulse 2.1s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .uv-streak-pill-glow::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.55),
      0 0 14px rgba(192, 132, 252, 0.45);
  }
  @media (prefers-reduced-motion: reduce) {
    .matte-streak-cube-spin,
    .uv-streak-cube-spin,
    .matte-streak-glow-pulse::before,
    .uv-streak-glow-pulse::before,
    .uv-streak-pill-glow::after {
      animation: none;
    }
  }
  .liquid-glass-uv {
    background:
      linear-gradient(132deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.035) 30%, rgba(168, 85, 247, 0.07) 54%, rgba(255, 255, 255, 0.03) 76%, rgba(251, 146, 60, 0.11) 100%),
      rgba(12, 19, 40, 0.28);
    backdrop-filter: blur(24px) saturate(155%);
    -webkit-backdrop-filter: blur(24px) saturate(155%);
    contain: paint;
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.38),
      inset 0 2px 10px 0 rgba(255, 255, 255, 0.09),
      inset 0 -1px 0 0 rgba(251, 146, 60, 0.28),
      0 14px 36px -10px rgba(0, 0, 0, 0.38);
  }
  .liquid-glass-uv-well {
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 48%, rgba(251, 146, 60, 0.05) 100%),
      rgba(7, 13, 28, 0.32);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.28);
  }
  .liquid-rim-muted {
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 12px 30px -12px rgba(0, 0, 0, 0.34);
  }
  .liquid-rim-amber {
    box-shadow: inset 0 1px 0 0 rgba(251, 146, 60, 0.38), inset 0 0 0 1px rgba(249, 115, 22, 0.22), 0 12px 30px -12px rgba(0, 0, 0, 0.36);
  }
  .custom-alg-card {
    background:
      linear-gradient(155deg, rgba(249, 115, 22, 0.24) 0%, rgba(251, 146, 60, 0.11) 48%, rgba(249, 115, 22, 0.05) 100%),
      rgba(16, 15, 28, 0.42);
    backdrop-filter: blur(20px) saturate(150%);
    -webkit-backdrop-filter: blur(20px) saturate(150%);
    border-color: rgba(249, 115, 22, 0.55) !important;
    box-shadow:
      inset 0 1px 0 0 rgba(251, 146, 60, 0.38),
      inset 0 0 0 1px rgba(249, 115, 22, 0.20),
      0 0 28px -4px rgba(249, 115, 22, 0.34),
      0 18px 44px -14px rgba(0, 0, 0, 0.65);
  }
  .liquid-pour-container {
    transform-origin: center bottom;
    border-radius: 9999px;
    transition:
      opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.48s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .liquid-pour-open {
    opacity: 1;
    transform: translate3d(-50%, 0, 0) scaleX(1) scaleY(1);
    pointer-events: auto;
  }
  .liquid-pour-closed {
    opacity: 0;
    transform: translate3d(-50%, 14px, 0) scaleX(0.32) scaleY(0.58);
    pointer-events: none;
  }
  .liquid-droplet-item {
    border-radius: 9999px;
    transition:
      transform 0.46s cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 0.28s ease-out,
      background-color 0.2s ease,
      color 0.2s ease;
  }
`;

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMessage: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true, errorMessage: error?.message ? String(error.message) : 'Unexpected rendering error' }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] w-full bg-midnight-marble text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xs w-full liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <span className="inline-block px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-[10px] font-black uppercase tracking-widest text-red-300">Recovery Mode</span>
            <h2 className="text-lg font-black text-white">Display Interrupted</h2>
            <p className="text-xs text-zinc-400 leading-relaxed break-words">{this.state.errorMessage}</p>
            <button type="button" onClick={() => this.setState({ hasError: false, errorMessage: '' })} className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer">
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
  const [isAppVisible, setIsAppVisible] = useState(() => (typeof document !== 'undefined' ? !document.hidden : true));
  const viewportDevice = useViewportDevice();
  const isTwoPane = viewportDevice.isWideTwoPane;

  const [users, setUsers] = useState(() => {
    const saved = storage.getJson(STORAGE_KEYS.users, null);
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? mergeDefaultUsersWithStored(saved) : { ...DEFAULT_USERS };
  });
  const [activeUserKey, setActiveUserKeyState] = useState(() => storage.getStr(STORAGE_KEYS.activeAccount, ''));
  const setActiveUserKey = (val) => {
    setActiveUserKeyState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      storage.setStr(STORAGE_KEYS.activeAccount, next);
      return next;
    });
  };
  const [pinnedHomePhase, setPinnedHomePhase] = useState(() => {
    const saved = storage.getStr(STORAGE_KEYS.pinnedHomePhase, '');
    return ['cross', 'f2l', 'oll', 'pll'].includes(saved) ? saved : '';
  });
  const [activePhase, setActivePhase] = useState(() => pinnedHomePhase || 'cross');
  const [cfopMenuOpen, setCfopMenuOpen] = useState(false);

  const [phaseTabs, setPhaseTabs] = useState({ cross: 'ladder', f2l: 'grind', oll: 'grind', pll: 'grind' });
  const setTabForPhase = (phase, tab) => setPhaseTabs((prev) => ({ ...prev, [phase]: tab }));

  const { cloudAuthUser, cloudSyncStatus, saveUserToCloud, flushPendingPersistence, cancelPendingWriteFor } =
    useSolverPersistence(users, setUsers, activeUserKey, isAppVisible);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(true);
  const [fingertricksEnabled, setFingertricksEnabled] = useState(true);
  const [pbDrafts, setPbDrafts] = useState({ full: null, phase: null });
  const [selectedTargetPhase, setSelectedTargetPhase] = useState('f2l');
  const [editingCaseTarget, setEditingCaseTarget] = useState(null);
  const [f2lSetupMode, setF2lSetupMode] = useState('beginner');
  const [f2lSetupSeed, setF2lSetupSeed] = useState(0);
  const [pllSetupSeed, setPllSetupSeed] = useState(0);


  const [notationFilter, setNotationFilter] = useState('All');
  const [dossierFilter, setDossierFilter] = useState('All');
  const [rightPaneTab, setRightPaneTab] = useState('notation');
  const [rightPaneSearch, setRightPaneSearch] = useState('');

  // Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerCameraReady, setScannerCameraReady] = useState(false);
  const [scannerCameraError, setScannerCameraError] = useState('');
  const [scannerCaptureStep, setScannerCaptureStep] = useState('U');
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
  const [scannerStageVerification, setScannerStageVerification] = useState(null);
  const [scannerSurfaceFinish, setScannerSurfaceFinish] = useState('uv');
  const [scannerThreeFaceHints, setScannerThreeFaceHints] = useState({ crossSolved: null, f2lCompletedStatus: null });
  const [savedCubePalette, setSavedCubePalette] = useState(() => storage.getJson(STORAGE_KEYS.cubePalette, null));
  const createBlankScannerFaces = () => ({
    U: [null, null, null, null, 'Y', null, null, null, null],
    F: [null, null, null, null, 'G', null, null, null, null],
    R: [null, null, null, null, 'O', null, null, null, null],
    D: [null, null, null, null, 'W', null, null, null, null],
    B: [null, null, null, null, 'B', null, null, null, null],
    L: [null, null, null, null, 'R', null, null, null, null]
  });

  const [scannedFaces, setScannedFaces] = useState(createBlankScannerFaces);
  const [selectedStickerEdit, setSelectedStickerEdit] = useState(null);
  const scannerVideoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const scannerCanvasRef = useRef(null);
  const scannerViewfinderRef = useRef(null);
  const [scannerViewfinderVisible, setScannerViewfinderVisible] = useState(true);
  const liveStableSignatureRef = useRef('');
  const liveStableStreakRef = useRef(0);
  const idleNoCubeStreakRef = useRef(0);

  // Audio Synthesizer (auto-suspends hardware audio thread after idle)
  const audioCtxRef = useRef(null);
  const audioSuspendTimerRef = useRef(null);
  const emitBeep = (freq = 640, type = 'sine', duration = 0.07, vol = 0.12) => {
    if (!audioEnabled || typeof window === 'undefined' || (typeof document !== 'undefined' && document.hidden)) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
      clearTimeout(audioSuspendTimerRef.current);
      audioSuspendTimerRef.current = setTimeout(() => {
        if (audioCtxRef.current?.state === 'running') audioCtxRef.current.suspend().catch(() => {});
      }, 1500);
    } catch {}
  };

  // Unified 3D Orbit Hooks
  const [f2lViewIdx, setF2lViewIdx] = useState(0);
  const crossOrbit = useCubeOrbit({ yaw: -35, pitch: 38 }, (setOrbit) => {
    emitBeep(620);
    setOrbit((prev) => ({ yaw: prev.yaw - 90, pitch: prev.pitch }));
  });
  const f2lOrbit = useCubeOrbit({ yaw: -35, pitch: -25 }, () => {
    emitBeep(620);
    setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length);
  });
  const setF2LPresetAngle = (idx) => {
    const preset = F2L_VIEW_ANGLES[idx % F2L_VIEW_ANGLES.length];
    setF2lViewIdx(idx % F2L_VIEW_ANGLES.length);
    f2lOrbit.setOrbit({ yaw: preset.yaw, pitch: preset.pitch });
  };

  // Scanner Camera, Visibility Observer & Sampling
  const stopScannerCamera = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }
    if (scannerCanvasRef.current) {
      scannerCanvasRef.current.width = 0;
      scannerCanvasRef.current.height = 0;
    }
    setScannerCameraReady(false);
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;
    idleNoCubeStreakRef.current = 0;
  };

  useEffect(() => {
    const el = scannerViewfinderRef.current;
    if (!scannerOpen || !el || typeof IntersectionObserver === 'undefined') return;
    setScannerViewfinderVisible(true);
    const obs = new IntersectionObserver(([entry]) => setScannerViewfinderVisible(entry.isIntersecting), { threshold: 0.25 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [scannerOpen]);

  const resetAllScannerFaces = (restartCamera = true) => {
    stopScannerCamera();
    setScannerCameraError('');
    setScannerCaptureStep('U');
    setScannerCapturedThumbs({});
    setScannerRawSamples({});
    setScannerLockedFaces({});
    setScannedFaces(createBlankScannerFaces());
    setSelectedStickerEdit(null);
    setScannerFocusedStageIdx(0);
    setScannerCompletedStages([]);
    setScannerF2lPairIdx(0);
    setScannerStageVerification(null);
    setScannerThreeFaceHints({ crossSolved: null, f2lCompletedStatus: null });
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    setScannerFramingHint('Line up the 9 stickers inside the square');
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;
    idleNoCubeStreakRef.current = 0;
    if (restartCamera) {
      startScannerCamera('U', false);
    }
  };

  const startScannerCamera = async (targetFace = 'U', resetAll = false) => {
    if (resetAll) {
      resetAllScannerFaces(true);
      return;
    }
    setScannerCameraError('');
    setScannerCaptureStep(targetFace);
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;
    idleNoCubeStreakRef.current = 0;
    setScannerCapturedThumbs((prev) => { const copy = { ...prev }; delete copy[targetFace]; return copy; });

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setScannerCameraError('Camera unavailable in this browser — tap any sticker below to set colors manually.');
      return;
    }
    try {
      const existingStream = scannerStreamRef.current;
      const hasLiveTrack = existingStream && existingStream.getVideoTracks().some((t) => t.readyState === 'live');
      if (hasLiveTrack) {
        if (scannerVideoRef.current && scannerVideoRef.current.srcObject !== existingStream) {
          scannerVideoRef.current.srcObject = existingStream;
        }
        await scannerVideoRef.current?.play().catch(() => {});
        setScannerCameraReady(true);
        setScannerFramingHint('Line up the 9 stickers inside the square');
        return;
      }

      stopScannerCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 480, max: 640 }, height: { ideal: 480, max: 640 }, frameRate: { ideal: 15, max: 24 } },
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

  useEffect(() => {
    if (!scannerOpen || !scannerCameraReady || scannerCapturedThumbs[scannerCaptureStep]) return;
    const video = scannerVideoRef.current;
    const stream = scannerStreamRef.current;
    if (video && stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [scannerOpen, scannerCameraReady, scannerCaptureStep, scannerCapturedThumbs]);

  const sampleVideoGridAntiGlare = () => {
    const video = scannerVideoRef.current;
    if (!video || video.readyState < 2) return null;
    const vw = video.videoWidth || 480, vh = video.videoHeight || 480;
    const rect = video.getBoundingClientRect();
    const displayAspect = (rect.width || 250) / (rect.height || 250);
    const videoAspect = vw / vh;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoAspect > displayAspect) { sw = Math.round(vh * displayAspect); sx = Math.round((vw - sw) / 2); }
    else if (videoAspect < displayAspect) { sh = Math.round(vw / displayAspect); sy = Math.round((vh - sh) / 2); }

    const canvas = scannerCanvasRef.current || document.createElement('canvas');
    scannerCanvasRef.current = canvas;
    const outW = 300, outH = Math.max(150, Math.round(outW / displayAspect));
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

    const frameBuf = ctx.getImageData(0, 0, outW, outH).data;
    const isMatte = scannerSurfaceFinish === 'matte';
    const readPatch = (nx, ny) => {
      const px = Math.max(4, Math.min(outW - 5, Math.round(nx * outW)));
      const py = Math.max(4, Math.min(outH - 5, Math.round(ny * outH)));
      let rSum = 0, gSum = 0, bSum = 0, validCount = 0;
      let rawR = 0, rawG = 0, rawB = 0;
      for (let oy = -3; oy <= 3; oy++) {
        const rowOff = (py + oy) * outW;
        for (let ox = -3; ox <= 3; ox++) {
          const idx = (rowOff + px + ox) * 4;
          const r = frameBuf[idx], g = frameBuf[idx + 1], b = frameBuf[idx + 2];
          rawR += r; rawG += g; rawB += b;
          const maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
          const minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
          const chroma = maxC - minC;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const isGlare = !isMatte && luma > 232 && chroma < 46;
          const isShadow = luma < 42;
          if (!isGlare && !isShadow) {
            rSum += r; gSum += g; bSum += b;
            validCount++;
          }
        }
      }
      if (validCount >= 8) {
        return [Math.round(rSum / validCount), Math.round(gSum / validCount), Math.round(bSum / validCount)];
      }
      return [Math.round(rawR / 49), Math.round(rawG / 49), Math.round(rawB / 49)];
    };

    let validStickerTiles = 0;
    const sampled9 = SCANNER_FLAT_GRID_CENTROIDS.map(([nx, ny]) => {
      const candidates = SCANNER_SAMPLE_OFFSETS.map(([dx, dy]) => {
        const [r, g, b] = readPatch(nx + dx, ny + dy);
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const glarePenalty = !isMatte && luma > 232 && chroma < 46 ? 85 : luma > 244 && chroma < 35 ? 70 : 0;
        const matteBoost = isMatte && chroma >= 28 && luma >= 55 && luma <= 225 ? 16 : 0;
        return { rgb: [r, g, b], chroma, luma, score: chroma * (isMatte ? 1.25 : 1.0) - glarePenalty + matteBoost + (luma > 42 && luma < 232 ? 15 : 0) };
      }).sort((a, b) => b.score - a.score);
      const best = candidates[0];
      if (best.chroma >= (isMatte ? 28 : 38) || (best.luma >= (isMatte ? 105 : 115) && best.chroma <= (isMatte ? 48 : 56))) validStickerTiles += 1;
      return best.rgb;
    });

    const expectedCenter = { U: 'Y', F: 'G', R: 'O', D: 'W', B: 'B', L: 'R' };
    const targetCenterCode = expectedCenter[scannerCaptureStep] || 'Y';
    const [cr, cg, cb] = sampled9[4];
    const centerChroma = Math.max(cr, cg, cb) - Math.min(cr, cg, cb);
    const centerLuma = (cr + cg + cb) / 3;
    const centerMatches = targetCenterCode === 'W'
      ? centerLuma >= (isMatte ? 102 : 112) && centerChroma <= (isMatte ? 54 : 62)
      : centerChroma >= (isMatte ? 32 : 42) && classifyStickerRgb(sampled9[4], savedCubePalette) === targetCenterCode;

    const cubeDetected = centerMatches && validStickerTiles >= 6;
    return {
      sampled9, canvas, cubeDetected,
      framingText: cubeDetected ? `${targetCenterCode} Center Locked ✓ (${validStickerTiles}/9 tiles)` : `Point ${targetCenterCode} center into the middle square`
    };
  };

  const captureAndAnalyzeCubeFrame = () => {
    const res = sampleVideoGridAntiGlare();
    if (!res) return;
    emitBeep(840, 'sine', 0.08);
    const { sampled9, canvas } = res;
    const expectedCenter = { U: 'Y', F: 'G', R: 'O', D: 'W', B: 'B', L: 'R' };
    const centerCode = expectedCenter[scannerCaptureStep];
    if (centerCode && sampled9[4]) {
      setSavedCubePalette((prev) => {
        const nextPal = { ...(prev || {}), [centerCode]: sampled9[4] };
        storage.setJson(STORAGE_KEYS.cubePalette, nextPal);
        return nextPal;
      });
    }
    const nextRaw = { ...scannerRawSamples, [scannerCaptureStep]: sampled9 };
    const nextThumbs = { ...scannerCapturedThumbs, [scannerCaptureStep]: canvas.toDataURL('image/jpeg', 0.82) };
    setScannerRawSamples(nextRaw);
    setScannerCapturedThumbs(nextThumbs);
    setScannedFaces((prev) => classifyCapturedFaceBatch(nextRaw, prev, scannerLockedFaces, savedCubePalette));
    setScannerCompletedStages([]);
    setScannerF2lPairIdx(0);
    setScannerStageVerification(null);
    setScannerLivePreviewCodes(null);
    setScannerStabilityCount(0);
    setScannerCubeDetected(false);
    liveStableSignatureRef.current = '';
    liveStableStreakRef.current = 0;
    idleNoCubeStreakRef.current = 0;

    const frontOrder = ['U', 'F', 'R'];
    const backOrder = ['D', 'B', 'L'];
    const activeGroup = frontOrder.includes(scannerCaptureStep) ? frontOrder : backOrder;
    const nextUnscannedInGroup = activeGroup.find((f) => !nextThumbs[f]);

    if (nextUnscannedInGroup) {
      setScannerCaptureStep(nextUnscannedInGroup);
      setScannerFramingHint('Line up the 9 stickers inside the square');
      const v = scannerVideoRef.current;
      const st = scannerStreamRef.current;
      if (v && st) {
        if (v.srcObject !== st) v.srcObject = st;
        if (v.paused) v.play().catch(() => {});
      }
    } else {
      stopScannerCamera();
    }
  };

  const scannerLiveRef = useRef({ scannerRawSamples, scannedFaces, scannerLockedFaces, savedCubePalette });
  scannerLiveRef.current = { scannerRawSamples, scannedFaces, scannerLockedFaces, savedCubePalette };
  const currentFaceAlreadyCaptured = Boolean(scannerCapturedThumbs[scannerCaptureStep]);

  useEffect(() => {
    if (!scannerOpen || !scannerCameraReady || !isAppVisible || !scannerViewfinderVisible || currentFaceAlreadyCaptured) return;
    const id = setInterval(() => {
      const res = sampleVideoGridAntiGlare();
      if (!res) return;
      setScannerFramingHint((prev) => (prev === res.framingText ? prev : res.framingText));
      setScannerCubeDetected((prev) => (prev === res.cubeDetected ? prev : res.cubeDetected));
      if (!res.cubeDetected) {
        setScannerLivePreviewCodes(null);
        liveStableSignatureRef.current = '';
        liveStableStreakRef.current = 0;
        setScannerStabilityCount(0);
        if (scannerAutoSnap) {
          idleNoCubeStreakRef.current += 1;
          if (idleNoCubeStreakRef.current >= 25) {
            idleNoCubeStreakRef.current = 0;
            setScannerAutoSnap(false);
          }
        }
        return;
      }
      idleNoCubeStreakRef.current = 0;
      const snap = scannerLiveRef.current;
      const codes = classifyCapturedFaceBatch({ ...snap.scannerRawSamples, [scannerCaptureStep]: res.sampled9 }, snap.scannedFaces, snap.scannerLockedFaces, snap.savedCubePalette)[scannerCaptureStep];
      if (!Array.isArray(codes) || codes.length !== 9) return;
      const sig = codes.join('');
      if (sig !== liveStableSignatureRef.current) setScannerLivePreviewCodes(codes);
      if (scannerAutoSnap) {
        liveStableStreakRef.current = sig === liveStableSignatureRef.current ? liveStableStreakRef.current + 1 : 1;
        liveStableSignatureRef.current = sig;
        const clampedStreak = Math.min(5, liveStableStreakRef.current);
        setScannerStabilityCount((prev) => (prev === clampedStreak ? prev : clampedStreak));
        if (liveStableStreakRef.current >= 5) { liveStableStreakRef.current = 0; captureAndAnalyzeCubeFrame(); }
      } else {
        liveStableSignatureRef.current = sig;
      }
    }, scannerAutoSnap ? 450 : 1100);
    return () => clearInterval(id);
  }, [scannerOpen, scannerCameraReady, isAppVisible, scannerViewfinderVisible, currentFaceAlreadyCaptured, scannerCaptureStep, scannerAutoSnap]);

  const scannerHasAnyInput = useMemo(() => {
    if (Object.keys(scannerCapturedThumbs).length > 0) return true;
    return ['U', 'F', 'R', 'D', 'B', 'L'].some((fKey) =>
      (scannedFaces[fKey] || []).some((c, idx) => idx !== 4 && Boolean(c))
    );
  }, [scannerCapturedThumbs, scannedFaces]);

  const scannerHasFull6Faces = useMemo(() => {
    const hasBackCapture = Boolean(scannerCapturedThumbs.D && scannerCapturedThumbs.B && scannerCapturedThumbs.L);
    const hasManualBackInput = ['D', 'B', 'L'].every((fKey) =>
      (scannedFaces[fKey] || []).every((c) => Boolean(c))
    );
    return hasBackCapture || hasManualBackInput;
  }, [scannerCapturedThumbs, scannedFaces]);

  const scannerAnalysis = useMemo(() => {
    if (!scannerOpen || !scannerHasAnyInput) return null;
    const fillFace = (faceKey, fallbackCenter) => {
      const raw = scannedFaces[faceKey] || [];
      return Array.from({ length: 9 }, (_, i) => (i === 4 ? fallbackCenter : raw[i] || fallbackCenter));
    };
    const uClean = fillFace('U', 'Y');
    const fClean = fillFace('F', 'G');
    const rClean = fillFace('R', 'O');
    if (scannerHasFull6Faces) {
      const dClean = fillFace('D', 'W');
      const bClean = fillFace('B', 'B');
      const lClean = fillFace('L', 'R');
      return analyzeFull54Cube(uClean, fClean, rClean, dClean, bClean, lClean);
    }
    return analyzeScanned3FaceCube(uClean, fClean, rClean, null, scannerThreeFaceHints);
  }, [scannerOpen, scannerHasAnyInput, scannerHasFull6Faces, scannedFaces, scannerThreeFaceHints]);

  // Timer, Cross, Curriculum & Modal States
  const [fullTimerOpen, setFullTimerOpen] = useState(false);
  const [fullScramble, setFullScramble] = useState(() => generate3x3Scramble(20));
  const [fullTimerState, setFullTimerState] = useState('idle');
  const fullStartRef = useRef(0);
  const fullFinalMsRef = useRef(0);

  const [crossDifficulty, setCrossDifficulty] = useState('standard');
  const [crossTier, setCrossTier] = useState(1);
  const [crossScrambleIdx, setCrossScrambleIdx] = useState(0);
  const [crossSolutionRevealed, setCrossSolutionRevealed] = useState(false);
  const [crossLadderMode, setCrossLadderMode] = useState('efficiency');
  const [crossUserMoves, setCrossUserMoves] = useState(2);
  const [efficiencyFeedback, setEfficiencyFeedback] = useState(null);
  const [activeMechanicId, setActiveMechanicId] = useState(1);
  const [activeMechApproachIdx, setActiveMechApproachIdx] = useState(0);
  const [activeMechCaseIdx, setActiveMechCaseIdx] = useState(0);
  const [mechCubeRot, setMechCubeRot] = useState({ yaw: -35, pitch: 38 });
  const [blindState, setBlindState] = useState('idle');
  const inspectionLeftRef = useRef(15.0);
  const inspectionDisplayRef = useRef(null);
  const [blindLogs, setBlindLogs] = useState([]);
  const [leftPadHeld, setLeftPadHeld] = useState(false);
  const [rightPadHeld, setRightPadHeld] = useState(false);

  const [orbitQuiz, setOrbitQuiz] = useState({ idx: 0, active: false, streak: 0, feedback: null });
  const padHoldTimeoutRef = useRef(null);

  const [libState, setLibState] = useState({
    f2l: { mode: 'groups', category: null },
    oll: { mode: 'groups', category: null },
    pll: { mode: 'groups', category: null }
  });

  const [draggedLineupIdx, setDraggedLineupIdx] = useState(null);
  const holdTimerRef = useRef(null);
  const preHoldStartYRef = useRef(null);

  const [activeModal, setActiveModal] = useState(null);
  const [ftCase, setFtCase] = useState(null);
  const [ftPhaseContext, setFtPhaseContext] = useState('f2l');
  const [builderPhase, setBuilderPhase] = useState('f2l');
  const [builderChunks, setBuilderChunks] = useState([]);
  const [builderMode, setBuilderMode] = useState('handpick');
  const [autoSplitSize, setAutoSplitSize] = useState(4);
  const [autoSplitSource, setAutoSplitSource] = useState('all');
  const [editingChunkId, setEditingChunkId] = useState(null);
  const [builderSearchQuery, setBuilderSearchQuery] = useState('');
  const [newChunkName, setNewChunkName] = useState('');
  const [newChunkSelectedIds, setNewChunkSelectedIds] = useState([]);

  const [authScreenOpen, setAuthScreenOpen] = useState(() => !storage.getStr(STORAGE_KEYS.activeAccount, ''));
  const [authMode, setAuthMode] = useState('landing');
  const [landingStepIdx, setLandingStepIdx] = useState(0);


  useEffect(() => {
    if (!authScreenOpen || authMode !== 'landing' || !isAppVisible) return undefined;
    const id = setInterval(() => {
      setLandingStepIdx((prev) => (prev + 1) % 4);
    }, 2400);
    return () => clearInterval(id);
  }, [authScreenOpen, authMode, isAppVisible]);
  const [authNameInput, setAuthNameInput] = useState('');
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState('');
  const [authInfoMsg, setAuthInfoMsg] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [deviceAccountKeys, setDeviceAccountKeys] = useState(() => {
    const parsed = storage.getJson(STORAGE_KEYS.deviceAccounts, []);
    const savedActive = storage.getStr(STORAGE_KEYS.activeAccount, '');
    const list = Array.isArray(parsed) ? parsed.filter((k) => typeof k === 'string') : [];
    if (savedActive && !list.includes(savedActive)) list.push(savedActive);
    return list;
  });

  const [proPaywallFeature, setProPaywallFeature] = useState('');
  const [proPurchaseToast, setProPurchaseToast] = useState('');
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);
  const [shareStatsFeedback, setShareStatsFeedback] = useState('');
  const [customAlgEditor, setCustomAlgEditor] = useState(null);
  const [managingCaseHistory, setManagingCaseHistory] = useState(null);
  const [fullHistoryExpanded, setFullHistoryExpanded] = useState(false);
  const [swRunning, setSwRunning] = useState(false);
  const [swLastResult, setSwLastResult] = useState(null);
  const swStartRef = useRef(0);
  const swDisplayRef = useRef(null);
  const fullTimerDisplayRef = useRef(null);

  const [activeSession, setActiveSession] = useState(null);
  const [activeDrill, setActiveDrill] = useState(null);
  const isNativeIosApp =
    typeof window !== 'undefined' &&
    window.Capacitor?.isNativePlatform?.() &&
    window.Capacitor?.getPlatform?.() === 'ios';

  const formatFirebaseAuthError = (err, fallbackMsg) => {
    const code = err?.code || '';
    if (code === 'auth/email-already-in-use') return 'That email is already registered — switch to Sign In below.';
    if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Incorrect email or password — check your credentials or tap Forgot Password.';
    }
    if (code === 'auth/too-many-requests') return 'Too many attempts — wait a moment and try again.';
    if (code === 'auth/operation-not-allowed') {
      return 'Enable Email/Password in Firebase Console → Authentication → Sign-in method.';
    }
    return err?.message || fallbackMsg;
  };

  const syncCloudProfileAfterOAuth = async (svc, fbUser, fallbackName = 'Solver', isNewSignUp = false) => {
    const rawName = (fbUser.displayName || fbUser.email?.split('@')[0] || fallbackName).trim();
    const displayName = rawName.replace(/[/\\#?]+/g, ' ').replace(/\s+/g, ' ').trim() || fallbackName;
    const colRef = svc.fsMod.collection(svc.db, 'artifacts', appId, 'users', fbUser.uid, 'solver_profiles');
    const snap = await svc.fsMod.getDocs(colRef);

    let chosenKey = displayName;
    if (!snap.empty) {
      const sortedDocs = [...snap.docs].sort((a, b) => (Number(b.data()?.updatedAt) || 0) - (Number(a.data()?.updatedAt) || 0));
      const matchedDoc =
        sortedDocs.find((d) => fbUser.email && d.data()?.email?.toLowerCase() === fbUser.email.toLowerCase()) ||
        sortedDocs.find((d) => d.id.toLowerCase() === displayName.toLowerCase()) ||
        sortedDocs[0];
      chosenKey = matchedDoc.id;
      const cloudRecord = sanitizeUserRecord({
        ...matchedDoc.data(),
        email: fbUser.email || matchedDoc.data().email || ''
      });
      setUsers((prev) => ({ ...prev, [chosenKey]: cloudRecord }));
    } else {
      const existingLocal = users[displayName] || (activeUserKey && activeUserKey !== 'Demo' ? users[activeUserKey] : null);
      const freshRecord = sanitizeUserRecord({
        ...(existingLocal || {}),
        email: fbUser.email || existingLocal?.email || '',
        isPro: Boolean(existingLocal?.isPro)
      });
      const writeTs = Date.now();
      lastCloudWriteRef.current.set(chosenKey, writeTs);
      setUsers((prev) => ({ ...prev, [chosenKey]: freshRecord }));
      await svc.fsMod.setDoc(
        svc.fsMod.doc(svc.db, 'artifacts', appId, 'users', fbUser.uid, 'solver_profiles', chosenKey),
        { ...freshRecord, updatedAt: writeTs },
        { merge: true }
      );
    }

    setCloudAuthUser(fbUser);
    setCloudSyncStatus('synced');
    registerDeviceAccount(chosenKey);
    setActiveUserKey(chosenKey);
    setAuthNameInput('');
    setAuthEmailInput('');
    setAuthPasswordInput('');
    setAuthInfoMsg('');
    setAuthScreenOpen(false);
    if (isNewSignUp) setActiveModal('cfopExperienceChoice');
  };

  const handleEmailPasswordSignUp = async () => {
    const cleanName = authNameInput.trim();
    const cleanEmail = authEmailInput.trim();
    const cleanPass = authPasswordInput;
    setAuthErrorMsg('');
    setAuthInfoMsg('');

    if (!cleanName) {
      setAuthErrorMsg('Enter a solver name to create your account');
      return;
    }

    // Local-only solver profile when no email is entered
    if (!cleanEmail) {
      if (Object.keys(users).some((k) => k.toLowerCase() === cleanName.toLowerCase())) {
        setAuthErrorMsg('That solver name is taken — choose another or Sign In');
        return;
      }
      emitBeep(820, 'sine', 0.1);
      const created = sanitizeUserRecord({ email: '', isPro: false });
      setUsers((prev) => ({ ...prev, [cleanName]: created }));
      saveUserToCloud(cleanName, created);
      registerDeviceAccount(cleanName);
      setActiveUserKey(cleanName);
      setAuthNameInput('');
      setAuthEmailInput('');
      setAuthPasswordInput('');
      setAuthScreenOpen(false);
      setActiveModal('cfopExperienceChoice');
      return;
    }

    if (cleanPass.length < 6) {
      setAuthErrorMsg('Enter a password (6+ characters) to sync across devices');
      return;
    }
    if (!resolvedFirebaseConfig) {
      setAuthErrorMsg('Cloud sync is not configured on this build.');
      return;
    }

    setAuthBusy(true);
    emitBeep(760, 'sine', 0.08);
    try {
      const svc = await getFirebaseServices();
      if (!svc) {
        setAuthErrorMsg('Unable to reach authentication service.');
        return;
      }
      const cred = await svc.authMod.createUserWithEmailAndPassword(svc.auth, cleanEmail, cleanPass);
      if (svc.authMod.updateProfile) {
        await svc.authMod.updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
      }
      await syncCloudProfileAfterOAuth(
        svc,
        { uid: cred.user.uid, email: cred.user.email || cleanEmail, displayName: cleanName },
        cleanName,
        true
      );
    } catch (err) {
      setAuthErrorMsg(formatFirebaseAuthError(err, 'Could not create cloud account — please try again.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailPasswordSignIn = async () => {
    const query = authEmailInput.trim() || authNameInput.trim();
    const cleanPass = authPasswordInput;
    setAuthErrorMsg('');
    setAuthInfoMsg('');

    if (!query) {
      setAuthErrorMsg('Enter your email and password (or a local solver name)');
      return;
    }

    // If no password entered and input doesn't look like an email, check local device profiles
    if (!cleanPass && !query.includes('@')) {
      const qLower = query.toLowerCase();
      const matchedKey = Object.keys(users).find(
        (k) => k.toLowerCase() === qLower || users[k]?.email?.trim().toLowerCase() === qLower
      );
      if (!matchedKey) {
        setAuthErrorMsg('Local profile not found — enter your Email & Password to sign in from cloud');
        return;
      }
      emitBeep(720, 'sine', 0.08);
      registerDeviceAccount(matchedKey);
      setActiveUserKey(matchedKey);
      setAuthNameInput('');
      setAuthEmailInput('');
      setAuthPasswordInput('');
      setAuthScreenOpen(false);
      return;
    }

    if (!query.includes('@')) {
      setAuthErrorMsg('Enter the email address registered with your cloud account');
      return;
    }
    if (!cleanPass) {
      setAuthErrorMsg('Enter your password to sign in');
      return;
    }
    if (!resolvedFirebaseConfig) {
      setAuthErrorMsg('Cloud sync is not configured on this build.');
      return;
    }

    setAuthBusy(true);
    emitBeep(720, 'sine', 0.08);
    try {
      const svc = await getFirebaseServices();
      if (!svc) {
        setAuthErrorMsg('Unable to reach authentication service.');
        return;
      }
      const cred = await svc.authMod.signInWithEmailAndPassword(svc.auth, query, cleanPass);
      await syncCloudProfileAfterOAuth(svc, cred.user, query.split('@')[0] || 'Solver', false);
    } catch (err) {
      setAuthErrorMsg(formatFirebaseAuthError(err, 'Email sign-in failed — please try again.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async () => {
    const email = (authEmailInput.trim() || authNameInput.trim());
    setAuthErrorMsg('');
    setAuthInfoMsg('');
    if (!email || !email.includes('@')) {
      setAuthErrorMsg('Enter your account email above first, then tap Forgot password');
      return;
    }
    if (!resolvedFirebaseConfig) {
      setAuthErrorMsg('Cloud sync is not configured on this build.');
      return;
    }
    setAuthBusy(true);
    emitBeep(620, 'sine', 0.07);
    try {
      const svc = await getFirebaseServices();
      if (!svc) {
        setAuthErrorMsg('Unable to reach authentication service.');
        return;
      }
      await svc.authMod.sendPasswordResetEmail(svc.auth, email);
      setAuthInfoMsg(`Password reset link sent to ${email}`);
    } catch (err) {
      setAuthErrorMsg(formatFirebaseAuthError(err, 'Unable to send reset email — verify the address.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    emitBeep(720, 'sine', 0.08);
    setAuthErrorMsg('');
    if (!resolvedFirebaseConfig) {
      setAuthErrorMsg('Cloud sync is not configured on this build.');
      return;
    }
    try {
      const svc = await getFirebaseServices();
      if (!svc) {
        setAuthErrorMsg('Unable to reach authentication service.');
        return;
      }
      const provider = new svc.authMod.GoogleAuthProvider();
      const cred = await svc.authMod.signInWithPopup(svc.auth, provider);
      await syncCloudProfileAfterOAuth(svc, cred.user, 'Google Solver');
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthErrorMsg(err?.message || 'Google sign-in failed — please try again.');
      }
    }
  };

  const handleGameCenterSignIn = async () => {
    emitBeep(760, 'sine', 0.08);
    setAuthErrorMsg('');
    if (!resolvedFirebaseConfig) {
      setAuthErrorMsg('Cloud sync is not configured on this build.');
      return;
    }
    try {
      const svc = await getFirebaseServices();
      if (!svc) {
        setAuthErrorMsg('Unable to reach authentication service.');
        return;
      }
      const gameCenterPlugin = typeof window !== 'undefined' ? window.Capacitor?.Plugins?.GameCenter : null;
      if (isNativeIosApp && gameCenterPlugin?.authenticate) {
        const gcPlayer = await gameCenterPlugin.authenticate();
        const gcName = (gcPlayer?.displayName || gcPlayer?.alias || 'Game Center Solver').trim();
        if (!svc.auth.currentUser) {
          await svc.authMod.signInAnonymously(svc.auth);
        }
        await syncCloudProfileAfterOAuth(svc, svc.auth.currentUser, gcName);
        return;
      }
      const appleProvider = new svc.authMod.OAuthProvider('apple.com');
      appleProvider.addScope('email');
      appleProvider.addScope('name');
      const cred = await svc.authMod.signInWithPopup(svc.auth, appleProvider);
      await syncCloudProfileAfterOAuth(svc, cred.user, 'Apple Solver');
    } catch (err) {
      if (err?.code === 'auth/operation-not-allowed') {
        setAuthErrorMsg('Game Center activates automatically in the iOS App Store build — use Google or a Solver Name on web.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthErrorMsg(err?.message || 'Game Center sign-in unavailable on this browser.');
      }
    }
  };
  const registerDeviceAccount = (uKey) => {
    if (!uKey || typeof uKey !== 'string') return;
    setDeviceAccountKeys((prev) => {
      const next = prev.includes(uKey) ? prev : [...prev, uKey];
      storage.setJson(STORAGE_KEYS.deviceAccounts, next);
      return next;
    });
  };

  const startGuidedTour = () => {
    emitBeep(720, 'sine', 0.08);
    setActiveModal('cfopExperienceChoice');
  };

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const enterBackgroundSleep = () => {
      setIsAppVisible(false);
      flushPendingPersistence();
      clearTimeout(padHoldTimeoutRef.current);
      clearTimeout(holdTimerRef.current);
      stopScannerCamera();
      clearTimeout(audioSuspendTimerRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      setLeftPadHeld(false); setRightPadHeld(false); setDraggedLineupIdx(null);
      setBlindState((prev) => (['inspecting', 'readying', 'armed'].includes(prev) ? 'idle' : prev));
      setSwRunning(false);
      setFullTimerState((prev) => (prev === 'running' ? 'idle' : prev));
    };
    const handleVis = () => (document.hidden ? enterBackgroundSleep() : setIsAppVisible(true));
    document.addEventListener('visibilitychange', handleVis, { passive: true });
    window.addEventListener('pagehide', enterBackgroundSleep, { passive: true });
    window.addEventListener('pageshow', handleVis, { passive: true });
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('pagehide', enterBackgroundSleep);
      window.removeEventListener('pageshow', handleVis);
      stopScannerCamera();
    };
  }, []);

  const spaceShortcutRef = useRef(null);
  spaceShortcutRef.current = () => {
    if (fullTimerOpen) {
      handleFullTimerScreenTap();
      return true;
    }
    if (!stopwatchEnabled) return false;
    if (activeDrill) {
      toggleStopwatch((sec) => recordCaseTime(activeDrill.phase, activeDrill.item.id, sec));
      return true;
    }
    const activeCaseId = activeSession?.queue[activeSession.index]?.id;
    if (activeCaseId !== undefined) {
      toggleStopwatch((sec) => recordCaseTime(activeSession.phase, activeCaseId, sec));
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (spaceShortcutRef.current?.()) e.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!swRunning || !isAppVisible) return;
    let rafId = 0, lastPaint = 0;
    const tick = (now) => {
      if (now - lastPaint >= 80) {
        lastPaint = now;
        if (swDisplayRef.current) swDisplayRef.current.textContent = `${((now - swStartRef.current) / 1000).toFixed(2)}s — Stop`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [swRunning, isAppVisible]);

  useEffect(() => {
    if (fullTimerState !== 'running' || !isAppVisible) return;
    let rafId = 0, lastPaint = 0;
    const tick = (now) => {
      if (now - lastPaint >= 80) {
        lastPaint = now;
        if (fullTimerDisplayRef.current) fullTimerDisplayRef.current.textContent = ((now - fullStartRef.current) / 1000).toFixed(2);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [fullTimerState, isAppVisible]);

  const resolvedUserKey = activeUserKey && users[activeUserKey] ? activeUserKey : 'Demo';
  const currentUser = useMemo(
    () => sanitizeUserRecord(users[resolvedUserKey] || DEFAULT_USERS.Demo),
    [users, resolvedUserKey]
  );
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
    return Number.isFinite(Number(custom)) && Number(custom) > 0 ? Number(custom) : getPhaseTargetPb(phase);
  };

  const { f2lMasteredCount, ollMasteredCount, pllMasteredCount } = useMemo(() => {
    const count = (list, stats, phase) =>
      list.filter((c) => typeof stats?.[c.id]?.best === 'number' && stats[c.id].best <= getEffectiveCaseTargetPb(phase, c.id)).length;
    return {
      f2lMasteredCount: count(F2L_DATA, currentUser.f2lStats, 'f2l'),
      ollMasteredCount: count(OLL_DATA, currentUser.stats, 'oll'),
      pllMasteredCount: count(PLL_DATA, currentUser.pllStats, 'pll')
    };
  }, [currentUser.f2lStats, currentUser.stats, currentUser.pllStats, currentUser.phaseTargetPbs, currentUser.caseTargetPbs]);

  const safeF2lDay = Math.min(Math.max(1, currentUser.f2lDay), Math.max(1, f2lSchedule.length));
  const safeOllDay = Math.min(Math.max(1, currentUser.day), Math.max(1, ollSchedule.length));
  const safePllDay = Math.min(Math.max(1, currentUser.pllDay), Math.max(1, pllSchedule.length));
  const currentF2lDayObj = f2lSchedule[safeF2lDay - 1] || { day: 1, mode: 'Learn', chunkTitle: 'Chunk 1', cases: F2L_DATA.slice(0, 4) };
  const currentOllDayObj = ollSchedule[safeOllDay - 1] || { day: 1, mode: 'Learn', chunkTitle: 'Chunk 1', cases: OLL_DATA.slice(0, 4) };
  const currentPllDayObj = pllSchedule[safePllDay - 1] || { day: 1, mode: 'Learn', chunkTitle: 'Chunk 1', cases: PLL_DATA.slice(0, 4) };

  const [lineupOverrides, setLineupOverrides] = useState({});
  const lineupOrders = useMemo(() => {
    const resolveOrder = (key, dayNum, chunksRef, dObj) => {
      const sig = `${dayNum}:${chunksRef?.length || 0}`;
      const ov = lineupOverrides[key];
      if (ov && ov.sig === sig) return ov.list;
      return dObj?.randomize ? shuffleCaseList(dObj.cases) : [...(dObj?.cases || [])];
    };
    return {
      f2l: resolveOrder('f2l', safeF2lDay, currentUser.f2lCustomChunks, currentF2lDayObj),
      oll: resolveOrder('oll', safeOllDay, currentUser.customChunks, currentOllDayObj),
      pll: resolveOrder('pll', safePllDay, currentUser.pllCustomChunks, currentPllDayObj)
    };
  }, [
    lineupOverrides,
    safeF2lDay, currentUser.f2lCustomChunks, currentF2lDayObj,
    safeOllDay, currentUser.customChunks, currentOllDayObj,
    safePllDay, currentUser.pllCustomChunks, currentPllDayObj
  ]);

  useEffect(() => {
    if (typeof document !== 'undefined' && !document.querySelector('link[data-ollday-fonts="true"]')) {
      const fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
      fontLink.setAttribute('data-ollday-fonts', 'true');
      document.head.appendChild(fontLink);
    }
    if (typeof document !== 'undefined' && !document.querySelector('link[href="https://visualcube.api.cubing.net"]')) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = 'https://visualcube.api.cubing.net';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
    const activePriorityUrls = [
      ...currentF2lDayObj.cases.map((c) => getF2LImageUrl(c.alg)),
      ...currentOllDayObj.cases.map((c) => getOLLImageUrl(c.alg)),
      ...currentPllDayObj.cases.map((c) => getPLLImageUrl(c.alg)),
      ...F2L_GROUPS.map((g) => getF2LImageUrl(F2L_DATA.find((c) => c.group === g)?.alg)),
      ...OLL_GROUPS.map((g) => getOLLImageUrl(OLL_DATA.find((c) => c.group === g)?.alg)),
      ...PLL_GROUPS.map((g) => getPLLImageUrl(PLL_DATA.find((c) => c.group === g)?.alg))
    ];
    prewarmVisualCubeLibrary(activePriorityUrls);
  }, [currentF2lDayObj, currentOllDayObj, currentPllDayObj]);

  const fullSolveTargetSec = Number.isFinite(Number(currentUser.fullSolveTargetPb)) ? Number(currentUser.fullSolveTargetPb) : 15.0;
  const targetPbInput = pbDrafts.full ?? fullSolveTargetSec.toFixed(3);
  const phaseTargetInput = pbDrafts.phase ?? getPhaseTargetPb(selectedTargetPhase).toFixed(3);

  const updateActiveUserRecord = (updaterFn) => {
    setUsers((prev) => {
      const current = sanitizeUserRecord(prev[resolvedUserKey]);
      const updated = sanitizeUserRecord(updaterFn(current));
      saveUserToCloud(resolvedUserKey, updated);
      return { ...prev, [resolvedUserKey]: updated };
    });
  };

  const updateFullSolveTargetPb = (sec) => {
    const clamped = Math.min(120, Math.max(1.0, Number(Number(sec).toFixed(3))));
    setPbDrafts((prev) => ({ ...prev, full: null }));
    updateActiveUserRecord((u) => ({ ...u, fullSolveTargetPb: clamped }));
  };

  const updatePhaseTargetPb = (phase, sec) => {
    const clamped = Math.min(30, Math.max(0.1, Number(Number(sec).toFixed(3))));
    setPbDrafts((prev) => ({ ...prev, phase: null }));
    updateActiveUserRecord((u) => ({ ...u, phaseTargetPbs: { ...u.phaseTargetPbs, [phase]: clamped } }));
  };

  const updateCaseTargetPb = (phase, caseId, secOrNull) => {
    updateActiveUserRecord((u) => {
      const phaseMap = { ...(u.caseTargetPbs?.[phase] || {}) };
      if (secOrNull === null) delete phaseMap[caseId];
      else phaseMap[caseId] = Math.min(30, Math.max(0.1, Number(Number(secOrNull).toFixed(3))));
      return { ...u, caseTargetPbs: { ...u.caseTargetPbs, [phase]: phaseMap } };
    });
  };

  const openCustomAlgEditor = (phaseKey, baseItem) => {
    if (!isProUnlocked) {
      openProPaywall('Custom Alternative Algorithms');
      return;
    }
    emitBeep(580, 'sine', 0.06);
    const { list, activeId } = normalizeCaseCustomAlgs(currentUser.customAlgs?.[phaseKey]?.[baseItem.id]);
    const initialEdit = activeId ? list.find((c) => c.id === activeId) : null;
    setCustomAlgEditor({
      phaseKey,
      caseId: baseItem.id,
      name: baseItem.name,
      defaultAlg: baseItem.alg,
      editingAltId: initialEdit ? initialEdit.id : null,
      draftAlg: initialEdit ? initialEdit.alg : '',
      assignFingertricks: initialEdit ? initialEdit.assignFingertricks !== false : true,
      makeActiveOnSave: true,
      keypadCategory: 'All',
      error: ''
    });
  };

  const saveCustomCaseAlg = (phaseKey, caseId, algStr, assignFingertricks = true, makeActive = true, editingAltId = null) => {
    const clean = sanitizeCustomAlgTokens(algStr);
    if (!clean) return false;
    const formatted = assignFingertricks ? formatAlgWithTriggerBrackets(clean) : clean;
    updateActiveUserRecord((u) => {
      const { list, activeId } = normalizeCaseCustomAlgs(u.customAlgs?.[phaseKey]?.[caseId]);
      let nextList = [...list];
      let targetId = editingAltId;

      if (editingAltId && nextList.some((c) => c.id === editingAltId)) {
        nextList = nextList.map((c) =>
          c.id === editingAltId ? { ...c, alg: formatted, rawAlg: clean, assignFingertricks } : c
        );
      } else {
        if (nextList.length >= MAX_CUSTOM_ALGS_PER_CASE) return u;
        targetId = `alt-${Date.now()}-${nextList.length + 1}`;
        nextList.push({
          id: targetId,
          label: `Alt ${nextList.length + 1}`,
          alg: formatted,
          rawAlg: clean,
          assignFingertricks
        });
      }

      const nextActiveId = makeActive ? targetId : activeId;
      const phaseMap = { ...(u.customAlgs?.[phaseKey] || {}), [caseId]: { list: nextList, activeId: nextActiveId } };
      return { ...u, customAlgs: { ...u.customAlgs, [phaseKey]: phaseMap } };
    });
    return true;
  };

  const selectCaseAlgSource = (phaseKey, caseId, activeAltIdOrNull) => {
    emitBeep(540, 'sine', 0.05);
    updateActiveUserRecord((u) => {
      const { list } = normalizeCaseCustomAlgs(u.customAlgs?.[phaseKey]?.[caseId]);
      if (list.length === 0) return u;
      const validId = activeAltIdOrNull && list.some((c) => c.id === activeAltIdOrNull) ? activeAltIdOrNull : null;
      const phaseMap = { ...(u.customAlgs?.[phaseKey] || {}), [caseId]: { list, activeId: validId } };
      return { ...u, customAlgs: { ...u.customAlgs, [phaseKey]: phaseMap } };
    });
  };

  const removeCustomCaseAlg = (phaseKey, caseId, altIdToRemove = null) => {
    emitBeep(420, 'sine', 0.06);
    updateActiveUserRecord((u) => {
      const phaseMap = { ...(u.customAlgs?.[phaseKey] || {}) };
      if (!altIdToRemove) {
        delete phaseMap[caseId];
      } else {
        const { list, activeId } = normalizeCaseCustomAlgs(phaseMap[caseId]);
        const filtered = list.filter((c) => c.id !== altIdToRemove);
        if (filtered.length === 0) {
          delete phaseMap[caseId];
        } else {
          const nextActive = activeId === altIdToRemove ? filtered[0].id : activeId;
          phaseMap[caseId] = { list: filtered, activeId: nextActive };
        }
      }
      return { ...u, customAlgs: { ...u.customAlgs, [phaseKey]: phaseMap } };
    });
  };

  const toggleStopwatch = (onCompleteSec) => {
    if (!swRunning) {
      emitBeep(820, 'sine', 0.06);
      swStartRef.current = performance.now();
      setSwRunning(true);
    } else {
      const finalMs = performance.now() - swStartRef.current;
      setSwRunning(false);
      emitBeep(960, 'sine', 0.09);
      onCompleteSec?.(Number((finalMs / 1000).toFixed(3)));
    }
  };

  const recordCaseTime = (phase, caseId, timeSec) => {
    const { statField } = PHASE_REGISTRY[phase] || PHASE_REGISTRY.oll;
    let isNewPb = false;
    updateActiveUserRecord((u) => {
      const existing = u[statField]?.[caseId] || {};
      const prevBest = typeof existing.best === 'number' ? existing.best : null;
      isNewPb = prevBest === null || timeSec < prevBest;
      return {
        ...u,
        ...advanceDailyStreakFields(u),
        [statField]: {
          ...u[statField],
          [caseId]: { best: isNewPb ? timeSec : prevBest, attempts: (existing.attempts || 0) + 1, history: [timeSec, ...(existing.history || [])].slice(0, 60) }
        }
      };
    });
    setSwLastResult({ phase, caseId, timeSec, isNewPb });
  };

  const deleteCaseTimeEntry = (phase, caseId, entryIdx) => {
    emitBeep(420, 'sine', 0.06);
    const { statField } = PHASE_REGISTRY[phase] || PHASE_REGISTRY.oll;
    updateActiveUserRecord((u) => {
      const existing = u[statField]?.[caseId];
      if (!existing) return u;
      const oldHist = Array.isArray(existing.history) ? existing.history : [];
      const nextHist = oldHist.filter((_, idx) => idx !== entryIdx);
      const nextPhaseStats = { ...(u[statField] || {}) };
      if (nextHist.length === 0) delete nextPhaseStats[caseId];
      else nextPhaseStats[caseId] = { best: Math.min(...nextHist), attempts: nextHist.length, history: nextHist };
      return { ...u, [statField]: nextPhaseStats };
    });
    setSwLastResult((prev) => (prev?.phase === phase && prev?.caseId === caseId ? null : prev));
  };

  const deleteFullSolveById = (solveId) => {
    emitBeep(400, 'sine', 0.06);
    updateActiveUserRecord((u) => ({ ...u, fullSolveHistory: (u.fullSolveHistory || []).filter((s) => s.id !== solveId) }));
  };

  const handleFullTimerScreenTap = () => {
    if (fullTimerState !== 'running') {
      emitBeep(820, 'sine', 0.07);
      fullStartRef.current = performance.now();
      fullFinalMsRef.current = 0;
      if (fullTimerDisplayRef.current) fullTimerDisplayRef.current.textContent = '0.00';
      setFullTimerState('running');
    } else {
      const finalMs = Math.round(performance.now() - fullStartRef.current);
      fullFinalMsRef.current = finalMs;
      if (fullTimerDisplayRef.current) fullTimerDisplayRef.current.textContent = (finalMs / 1000).toFixed(2);
      setFullTimerState('stopped');
      emitBeep(980, 'sine', 0.1);
      const newEntry = { id: Date.now(), ms: finalMs, penalty: null, scramble: fullScramble };
      updateActiveUserRecord((u) => ({ ...u, fullSolveHistory: [newEntry, ...(u.fullSolveHistory || [])].slice(0, 100) }));
      setFullScramble(generate3x3Scramble(20));
    }
  };

  const toggleFullSolvePenalty = (pen) => {
    emitBeep(560);
    updateActiveUserRecord((u) => {
      if (!u.fullSolveHistory?.length) return u;
      const [first, ...rest] = u.fullSolveHistory;
      return { ...u, fullSolveHistory: [{ ...first, penalty: first.penalty === pen ? null : pen }, ...rest] };
    });
  };

  const deleteLastFullSolve = () => {
    emitBeep(400);
    updateActiveUserRecord((u) => ({ ...u, fullSolveHistory: (u.fullSolveHistory || []).slice(1) }));
    fullFinalMsRef.current = 0;
    if (fullTimerDisplayRef.current) fullTimerDisplayRef.current.textContent = '0.00';
    setFullTimerState('idle');
  };

  const openFullTimerModal = () => {
    emitBeep(680);
    fullFinalMsRef.current = 0;
    setFullTimerState('idle');
    setFullTimerOpen(true);
  };

  const toastTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const openProPaywall = (featureLabel) => { emitBeep(460); setProPaywallFeature(featureLabel || ''); setProPurchaseToast(''); setActiveModal('proPaywall'); };
  const unlockLifetimePro = () => {
    emitBeep(920, 'sine', 0.12);
    updateActiveUserRecord((u) => ({ ...u, isPro: true }));
    setProPurchaseToast('OLLDay Pro Unlocked! All 123 cases active.');
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => { setActiveModal(null); setProPurchaseToast(''); }, 900);
  };

  const { ao5Full, ao12Full, bestFullPbMs } = useMemo(() => {
    const hist = currentUser.fullSolveHistory || [];
    const validMs = hist
      .filter((s) => s.penalty !== 'DNF')
      .map((s) => Number(s.ms) + (s.penalty === '+2' ? 2000 : 0))
      .filter(Number.isFinite);
    return {
      ao5Full: computeWcaAverage(hist, 5),
      ao12Full: computeWcaAverage(hist, 12),
      bestFullPbMs: validMs.length ? Math.min(...validMs) : null
    };
  }, [currentUser.fullSolveHistory]);

  const top5FastestAlgs = useMemo(() => {
    const entries = [];
    const collect = (phaseKey, phaseLabel, dataList, statsMap) => {
      dataList.forEach((rawItem) => {
        const best = statsMap?.[rawItem.id]?.best;
        if (typeof best === 'number' && Number.isFinite(best) && best > 0) {
          const item = resolveEffectiveCase(rawItem, currentUser.customAlgs, phaseKey);
          entries.push({
            key: `${phaseLabel}-${item.id}`,
            phase: phaseLabel,
            name: item.name,
            alg: item.alg,
            best
          });
        }
      });
    };
    collect('f2l', 'F2L', F2L_DATA, currentUser.f2lStats);
    collect('oll', 'OLL', OLL_DATA, currentUser.stats);
    collect('pll', 'PLL', PLL_DATA, currentUser.pllStats);
    return entries.sort((a, b) => a.best - b.best).slice(0, 5);
  }, [currentUser.f2lStats, currentUser.stats, currentUser.pllStats, currentUser.customAlgs]);

  const shareStatsSummaryImage = async () => {
    emitBeep(760, 'sine', 0.08);
    setShareStatsFeedback('Rendering image...');
    try {
      const dpr = 2;
      const w = 540;
      const h = 720;
      const canvas = document.createElement('canvas');
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.scale(dpr, dpr);

      const roundRect = (x, y, rw, rh, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + rw - r, y);
        ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
        ctx.lineTo(x + rw, y + rh - r);
        ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
        ctx.lineTo(x + r, y + rh);
        ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      ctx.fillStyle = '#050507';
      ctx.fillRect(0, 0, w, h);

      const topGlow = ctx.createRadialGradient(w * 0.5, 40, 10, w * 0.5, 40, 320);
      topGlow.addColorStop(0, 'rgba(249, 115, 22, 0.28)');
      topGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, w, h);

      roundRect(24, 24, w - 48, h - 48, 32);
      ctx.fillStyle = '#0e1018';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.stroke();

      ctx.fillStyle = '#fb923c';
      ctx.font = '800 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('OLLDAY EVERYDAY • CFOP TELEMETRY', 48, 66);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px system-ui, -apple-system, sans-serif';
      const solverTitle = String(activeUserKey || 'Solver');
      ctx.fillText(solverTitle.length > 18 ? `${solverTitle.slice(0, 18)}…` : solverTitle, 48, 100);

      const totalMastered = f2lMasteredCount + ollMasteredCount + pllMasteredCount;
      roundRect(w - 196, 52, 148, 34, 17);
      ctx.fillStyle = 'rgba(249, 115, 22, 0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fdba74';
      ctx.font = '800 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${totalMastered}/123 MASTERED`, w - 122, 73);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#94a3b8';
      ctx.font = '800 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('3x3x3 FULL SOLVE RECORDS', 48, 142);

      const wcaCards = [
        { label: 'BEST PB', val: formatMsTime(bestFullPbMs, 2), color: '#fcd34d' },
        { label: 'AO5', val: ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2), color: '#4ade80' },
        { label: 'AO12', val: ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2), color: '#38bdf8' }
      ];
      const boxW = (w - 96 - 24) / 3;
      wcaCards.forEach((card, idx) => {
        const bx = 48 + idx * (boxW + 12);
        roundRect(bx, 154, boxW, 84, 18);
        ctx.fillStyle = '#07080d';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(card.label, bx + boxW / 2, 180);

        ctx.fillStyle = card.color;
        ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(card.val, bx + boxW / 2, 216);
      });
      ctx.textAlign = 'left';

      ctx.fillStyle = '#94a3b8';
      ctx.font = '800 11px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOP 5 FASTEST ALGORITHM PBs', 48, 276);

      if (top5FastestAlgs.length === 0) {
        roundRect(48, 290, w - 96, 110, 20);
        ctx.fillStyle = '#07080d';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '700 14px system-ui, -apple-system, sans-serif';
        ctx.fillText('No algorithm PBs logged yet — drill any case to rank!', w / 2, 350);
        ctx.textAlign = 'left';
      } else {
        top5FastestAlgs.forEach((entry, idx) => {
          const ry = 290 + idx * 66;
          roundRect(48, ry, w - 96, 56, 16);
          ctx.fillStyle = idx === 0 ? 'rgba(249, 115, 22, 0.14)' : '#07080d';
          ctx.fill();
          ctx.strokeStyle = idx === 0 ? 'rgba(251, 146, 60, 0.45)' : 'rgba(255, 255, 255, 0.08)';
          ctx.stroke();

          roundRect(62, ry + 14, 28, 28, 9);
          ctx.fillStyle = idx === 0 ? '#f97316' : 'rgba(255,255,255,0.08)';
          ctx.fill();
          ctx.textAlign = 'center';
          ctx.fillStyle = idx === 0 ? '#090e1c' : '#cbd5e1';
          ctx.font = '900 12px ui-monospace, monospace';
          ctx.fillText(`#${idx + 1}`, 76, ry + 32);

          ctx.textAlign = 'left';
          ctx.fillStyle = '#fb923c';
          ctx.font = '900 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(entry.phase, 102, ry + 23);

          ctx.fillStyle = '#ffffff';
          ctx.font = '800 14px system-ui, -apple-system, sans-serif';
          const shortName = entry.name.length > 24 ? `${entry.name.slice(0, 24)}…` : entry.name;
          ctx.fillText(shortName, 134, ry + 23);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '600 11px ui-monospace, monospace';
          const shortAlg = entry.alg.length > 32 ? `${entry.alg.slice(0, 32)}…` : entry.alg;
          ctx.fillText(shortAlg, 102, ry + 42);

          ctx.textAlign = 'right';
          ctx.fillStyle = '#4ade80';
          ctx.font = '900 17px ui-monospace, monospace';
          ctx.fillText(`${entry.best.toFixed(3)}s`, w - 64, ry + 34);
          ctx.textAlign = 'left';
        });
      }

      ctx.fillStyle = '#475569';
      ctx.font = '700 11px system-ui, -apple-system, sans-serif';
      ctx.fillText(`F2L ${f2lMasteredCount}/41  •  OLL ${ollMasteredCount}/57  •  PLL ${pllMasteredCount}/25`, 48, h - 46);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fb923c';
      ctx.fillText('olldayeveryday.app', w - 48, h - 46);
      ctx.textAlign = 'left';

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) throw new Error('Blob generation failed');
      const fileName = `OLLDay-${solverTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}-Stats.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${solverTitle} — OLLDay Everyday Stats`,
          text: `My 3x3 PB: ${formatMsTime(bestFullPbMs, 2)} | Ao5: ${ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)} | Ao12: ${ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}`
        });
        setShareStatsFeedback('Shared ✓');
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        setShareStatsFeedback('Image downloaded ✓');
      }
    } catch {
      setShareStatsFeedback('Unable to export image on this browser.');
    }
  };

  useEffect(() => {
    if (!isAppVisible || !['inspecting', 'readying', 'armed'].includes(blindState)) return;
    let rafId = 0;
    let lastPaint = 0;
    let beeped7 = false;
    let beeped3 = false;
    const startRemaining = inspectionLeftRef.current > 0 ? inspectionLeftRef.current : 15.0;
    const startTs = performance.now();

    const tick = (now) => {
      const elapsedSec = (now - startTs) / 1000;
      const remaining = Math.max(0, Number((startRemaining - elapsedSec).toFixed(1)));
      inspectionLeftRef.current = remaining;

      if (now - lastPaint >= 95) {
        lastPaint = now;
        if (inspectionDisplayRef.current) inspectionDisplayRef.current.textContent = remaining.toFixed(1);
      }
      if (!beeped7 && remaining <= 7.0 && remaining > 6.8) { beeped7 = true; emitBeep(480, 'sine', 0.16); }
      if (!beeped3 && remaining <= 3.0 && remaining > 2.8) { beeped3 = true; emitBeep(560, 'sine', 0.16); }

      if (remaining <= 0) {
        emitBeep(210, 'sawtooth', 0.35);
        setBlindState('done');
        setBlindLogs((logs) => [{ id: Date.now(), result: 'DNF (+15s)', time: '0.0s' }, ...logs.slice(0, 7)]);
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [blindState, isAppVisible]);

  useEffect(() => {
    if (['idle', 'visor', 'done'].includes(blindState)) {
      clearTimeout(padHoldTimeoutRef.current);
      if (leftPadHeld) setLeftPadHeld(false);
      if (rightPadHeld) setRightPadHeld(false);
      return;
    }
    const bothHeld = leftPadHeld && rightPadHeld;
    if (bothHeld && blindState === 'inspecting') {
      setBlindState('readying');
      clearTimeout(padHoldTimeoutRef.current);
      padHoldTimeoutRef.current = setTimeout(() => { emitBeep(1020, 'sine', 0.08); setBlindState('armed'); }, 350);
    } else if (!bothHeld) {
      clearTimeout(padHoldTimeoutRef.current);
      if (blindState === 'armed') {
        setLeftPadHeld(false); setRightPadHeld(false);
        emitBeep(1240, 'triangle', 0.1);
        setBlindState('visor');
      } else if (blindState === 'readying') setBlindState('inspecting');
    }
  }, [leftPadHeld, rightPadHeld, blindState]);

  useEffect(() => {
    if (draggedLineupIdx === null) return;
    let dragRafId = 0, pendingPoint = null;

    const processDragMove = (clientX, clientY) => {
      pendingPoint = { x: clientX, y: clientY };
      if (dragRafId) return;
      dragRafId = requestAnimationFrame(() => {
        dragRafId = 0;
        if (!pendingPoint) return;
        const { x, y } = pendingPoint;
        pendingPoint = null;
        const row = document.elementFromPoint(x, y)?.closest('[data-lineup-idx]');
        if (row) {
          const targetIdx = Number(row.getAttribute('data-lineup-idx'));
          if (!Number.isNaN(targetIdx) && targetIdx !== draggedLineupIdx) {
            setLineupOverrides((prev) => {
              const updated = [...(lineupOrders[activePhase] || [])];
              const [moved] = updated.splice(draggedLineupIdx, 1);
              updated.splice(targetIdx, 0, moved);
              const dayNum = activePhase === 'f2l' ? safeF2lDay : activePhase === 'pll' ? safePllDay : safeOllDay;
              const chunksRef = activePhase === 'f2l' ? currentUser.f2lCustomChunks : activePhase === 'pll' ? currentUser.pllCustomChunks : currentUser.customChunks;
              return { ...prev, [activePhase]: { sig: `${dayNum}:${chunksRef?.length || 0}`, list: updated } };
            });
            setDraggedLineupIdx(targetIdx);
            emitBeep(640, 'sine', 0.04, 0.08);
          }
        }
      });
    };

    const handleWindowTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) processDragMove(touch.clientX, touch.clientY);
    };

    const handleWindowMouseMove = (e) => {
      processDragMove(e.clientX, e.clientY);
    };

    const handleWindowDragEnd = () => {
      if (dragRafId) cancelAnimationFrame(dragRafId);
      setDraggedLineupIdx(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowDragEnd, { passive: true });
    window.addEventListener('touchcancel', handleWindowDragEnd, { passive: true });
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('mouseup', handleWindowDragEnd, { passive: true });
    return () => {
      if (dragRafId) cancelAnimationFrame(dragRafId);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowDragEnd);
      window.removeEventListener('touchcancel', handleWindowDragEnd);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowDragEnd);
    };
  }, [draggedLineupIdx, activePhase]);

  const startLineupHold = (idx, clientY) => {
    preHoldStartYRef.current = clientY;
    clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => { emitBeep(780, 'sine', 0.06); setDraggedLineupIdx(idx); }, 220);
  };
  const handleLineupPreHoldMove = (clientY) => {
    if (draggedLineupIdx === null && preHoldStartYRef.current !== null && Math.abs(clientY - preHoldStartYRef.current) > 8) {
      clearTimeout(holdTimerRef.current);
      preHoldStartYRef.current = null;
    }
  };
  const cancelLineupHold = () => { clearTimeout(holdTimerRef.current); preHoldStartYRef.current = null; setDraggedLineupIdx(null); };

  const executeGranularReset = (scope) => {
    emitBeep(360, 'triangle', 0.12);
    updateActiveUserRecord((u) => {
      if (scope === 'both') return { ...sanitizeUserRecord(null), isPro: Boolean(u.isPro), email: u.email || '' };
      const next = { ...u };
      if (scope === 'f2l-day' || scope === 'f2l-all') next.f2lDay = 1;
      if (scope === 'f2l-stats' || scope === 'f2l-all') next.f2lStats = {};
      if (scope === 'f2l-chunks' || scope === 'f2l-all') next.f2lCustomChunks = null;
      if (scope === 'oll-day' || scope === 'oll-all') next.day = 1;
      if (scope === 'oll-stats' || scope === 'oll-all') next.stats = {};
      if (scope === 'oll-chunks' || scope === 'oll-all') next.customChunks = null;
      if (scope === 'pll-day' || scope === 'pll-all') next.pllDay = 1;
      if (scope === 'pll-stats' || scope === 'pll-all') next.pllStats = {};
      if (scope === 'pll-chunks' || scope === 'pll-all') next.pllCustomChunks = null;
      if (scope === 'full-timer') next.fullSolveHistory = [];
      return next;
    });
    setActiveModal(null);
  };

  const deleteCurrentSolverAccount = async () => {
    const keyToRemove = activeUserKey;
    if (!keyToRemove) return;
    emitBeep(320, 'triangle', 0.14);
    cancelPendingWriteFor(keyToRemove);
    setUsers((prev) => { const copy = { ...prev }; delete copy[keyToRemove]; return copy; });
    if (resolvedFirebaseConfig && cloudAuthUser?.uid) {
      try {
        const svc = await getFirebaseServices();
        await svc?.fsMod.deleteDoc(svc.fsMod.doc(svc.db, 'artifacts', appId, 'users', cloudAuthUser.uid, 'solver_profiles', keyToRemove));
      } catch {}
    }
    setDeleteAccountConfirm(false); setActiveModal(null);
    setDeviceAccountKeys((prev) => { const next = prev.filter((k) => k !== keyToRemove); storage.setJson(STORAGE_KEYS.deviceAccounts, next); return next; });
    setActiveUserKey(''); setAuthNameInput(''); setAuthEmailInput(''); setAuthErrorMsg(''); setAuthMode('signup'); setAuthScreenOpen(true);
  };

  const openCurriculumBuilder = (phase) => {
    setBuilderPhase(phase);
    const sourceChunks = phase === 'f2l' ? f2lChunks : phase === 'pll' ? pllChunks : ollChunks;
    setBuilderChunks(sourceChunks.map((c) => ({ ...c, ids: [...c.ids] })));
    setBuilderMode('handpick');
    setAutoSplitSize(4);
    setAutoSplitSource('all');
    setEditingChunkId(null);
    setBuilderSearchQuery('');
    setNewChunkName('');
    setNewChunkSelectedIds([]);
    setActiveModal('curriculum');
  };

  const applyAutoSplitChunks = (size, sourceMode) => {
    const { data: dataList, statField } = PHASE_REGISTRY[builderPhase] || PHASE_REGISTRY.oll;
    const statsMap = currentUser[statField];
    const filtered =
      sourceMode === 'unmastered'
        ? dataList.filter((item) => !(typeof statsMap?.[item.id]?.best === 'number' && statsMap[item.id].best <= getEffectiveCaseTargetPb(builderPhase, item.id)))
        : dataList;
    const pool = filtered.length > 0 ? filtered : dataList;
    const generated = [];
    for (let i = 0; i < pool.length; i += size) {
      const slice = pool.slice(i, i + size);
      generated.push({
        id: `auto-${builderPhase}-${Date.now()}-${generated.length}`,
        title: `Chunk ${generated.length + 1} • ${slice.length} ${builderPhase === 'f2l' ? 'Pairs' : 'Algs'} (#${slice[0]?.id}–#${slice[slice.length - 1]?.id})`,
        ids: slice.map((c) => c.id)
      });
    }
    emitBeep(720, 'sine', 0.08);
    setBuilderChunks(generated);
    setEditingChunkId(null);
    setNewChunkName('');
    setNewChunkSelectedIds([]);
  };

  const saveCurriculumBuilder = () => {
    if (!builderChunks.length) return;
    emitBeep(880, 'sine', 0.1);
    const { chunkField, dayField } = PHASE_REGISTRY[builderPhase] || PHASE_REGISTRY.oll;
    updateActiveUserRecord((u) => ({ ...u, [chunkField]: builderChunks, [dayField]: 1 }));
    setActiveModal(null);
  };

  const activeCrossTierList = crossDifficulty === 'advanced' ? CROSS_ADVANCED_TIERS : CROSS_TIERS;
  const activeTierObj = activeCrossTierList.find((t) => t.tier === crossTier) || activeCrossTierList[0];
  const activeCrossScramble = activeTierObj.scrambles[crossScrambleIdx % activeTierObj.scrambles.length];
  const activeCrossSolution = useMemo(() => {
    const crossOnly = solveExactCrossFrom54(simulateCrossCubeState(activeCrossScramble));
    return crossOnly.moves || (crossDifficulty === 'standard' ? invertAlgorithm(activeCrossScramble) : 'Cross Solved ✓');
  }, [activeCrossScramble, crossDifficulty]);
  const activeCrossMoveCount = activeCrossSolution === 'Cross Solved ✓' ? 0 : activeCrossSolution.split(/\s+/).filter(Boolean).length;
  const activeMechanicObj = CROSS_MECHANICS.find((m) => m.id === activeMechanicId) || CROSS_MECHANICS[0];

  const renderWcaTelemetryGrid = (cardClass = 'liquid-glass-well rounded-2xl') => (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Ao5', val: ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2), color: 'text-green-400' },
        { label: 'Ao12', val: ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2), color: 'text-sky-400' },
        { label: 'Best PB', val: formatMsTime(bestFullPbMs, 2), color: 'text-amber-300' }
      ].map((stat) => (
        <div key={stat.label} className={`${cardClass} border border-white/10 p-2.5 text-center`}>
          <span className="text-[9px] font-bold uppercase text-zinc-400 block">{stat.label}</span>
          <span className={`font-mono text-sm font-black ${stat.color}`}>{stat.val}</span>
        </div>
      ))}
    </div>
  );

  const renderFullSolveStatsBlock = () => {
    const fullHistory = currentUser.fullSolveHistory || [];
    const visibleSolves = fullHistoryExpanded ? fullHistory : fullHistory.slice(0, 5);
    return (
      <div className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white">Ao5 &amp; Ao12 Telemetry</h3>
          </div>
          <button
            type="button"
            onClick={openFullTimerModal}
            className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md shadow-orange-500/20 cursor-pointer"
          >
            Open Timer
          </button>
        </div>
        {renderWcaTelemetryGrid('liquid-glass-well rounded-2xl')}

        {fullHistory.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-400">
                Recent 3x3x3 Solves ({fullHistory.length})
              </span>
              {fullHistory.length > 5 && (
                <button
                  type="button"
                  onClick={() => { emitBeep(480); setFullHistoryExpanded((v) => !v); }}
                  className="text-[10px] font-bold text-orange-400 hover:underline cursor-pointer"
                >
                  {fullHistoryExpanded ? <>Show Less <ChevronUp className="w-3 h-3 inline-block -mt-0.5" /></> : <>View All ({fullHistory.length}) <ChevronDown className="w-3 h-3 inline-block -mt-0.5" /></>}
                </button>
              )}
            </div>
            <div className="max-h-44 overflow-y-auto no-scrollbar space-y-1 pr-0.5">
              {visibleSolves.map((solve, idx) => {
                const effMs = solve.penalty === 'DNF' ? null : Number(solve.ms) + (solve.penalty === '+2' ? 2000 : 0);
                const isBest = effMs !== null && bestFullPbMs !== null && effMs === bestFullPbMs;
                return (
                  <div
                    key={solve.id ?? idx}
                    className="liquid-glass-well border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[9.5px] font-bold text-zinc-500 w-5 flex-shrink-0">#{idx + 1}</span>
                      <span className={`font-mono text-xs font-black flex-shrink-0 ${solve.penalty === 'DNF' ? 'text-red-400' : isBest ? 'text-green-400' : 'text-white'}`}>
                        {solve.penalty === 'DNF' ? 'DNF' : `${(effMs / 1000).toFixed(2)}s${solve.penalty === '+2' ? '+' : ''}`}
                      </span>
                      {isBest && (
                        <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/35 text-[8.5px] font-black uppercase text-green-300 flex-shrink-0">
                          PB
                        </span>
                      )}
                      {solve.scramble && (
                        <span className="font-mono text-[9.5px] text-zinc-500 truncate">{solve.scramble}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFullSolveById(solve.id)}
                      className="px-2 py-0.5 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-[9.5px] font-black text-red-300 flex-shrink-0 cursor-pointer"
                      title="Delete Accidental Solve"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsDeck = () => {
    return (
      <div className="p-4 sm:p-5 pb-28 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Settings</h2>
          </div>
          <button
            type="button"
            onClick={() => { emitBeep(680, 'sine', 0.07); setShareStatsFeedback(''); setActiveModal('shareStats'); }}
            className="h-9 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-[10.5px] uppercase tracking-wider shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            Show My Stats
          </button>
        </div>

        {/* 1. PROFILE & PLAN */}
        <section className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
            <h3 className="text-base font-black text-white">Profile &amp; Plan</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase ${isProUnlocked ? 'bg-green-500/20 border border-green-400/45 text-green-300' : 'bg-orange-500/20 border border-orange-400/45 text-orange-300'}`}>
              {isProUnlocked ? 'Lifetime Pro' : 'Starter Tier'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-base font-black text-white block truncate">{String(activeUserKey || 'Solver')}</span>
            {currentUser.email && <p className="text-[11px] text-zinc-300 truncate">{currentUser.email}</p>}
            <p className="text-[11px] text-zinc-300/85 pt-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${cloudSyncStatus === 'synced' ? 'bg-green-400' : 'bg-amber-400'}`} />{cloudSyncStatus === 'synced' ? 'Cloud Synced' : 'Local Saved'} • F2L D{safeF2lDay} • OLL D{safeOllDay} • PLL D{safePllDay}
            </p>
          </div>

          {!isProUnlocked && (
            <button
              type="button"
              onClick={() => openProPaywall('Full 123-Case CFOP Suite')}
              className="w-full h-11 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_10px_24px_rgba(249,115,22,0.35)] flex items-center justify-center cursor-pointer"
            >
              Unlock Lifetime Pro — $5.99
            </button>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => { emitBeep(520); setAuthErrorMsg(''); setAuthMode('signin'); setAuthScreenOpen(true); }}
              className="h-10 px-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.14] text-[11px] font-black text-white flex items-center justify-center transition-all cursor-pointer"
            >
              Switch Account
            </button>
            <button
              type="button"
              onClick={() => { emitBeep(620); if (!isProUnlocked) openProPaywall('Restore Purchase'); }}
              className="h-10 px-3.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              Restore Purchase
            </button>
          </div>
        </section>

        {/* 2. HOME & ONBOARDING */}
        <section className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
          <div className="pb-2.5 border-b border-white/10">
            <h3 className="text-base font-black text-white">Home &amp; Onboarding</h3>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-black text-white block">Pinned Home Screen</span>
              <span className="text-[10px] text-zinc-400">Default phase on startup</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[{ key: 'cross', label: 'C' }, { key: 'f2l', label: 'F' }, { key: 'oll', label: 'O' }, { key: 'pll', label: 'P' }].map((item) => {
                const isPinned = (pinnedHomePhase || 'cross') === item.key;
                return (
                  <button
                    key={item.key} type="button"
                    onClick={() => { emitBeep(640); setPinnedHomePhase(item.key); storage.setStr(STORAGE_KEYS.pinnedHomePhase, item.key); }}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer ${isPinned ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30' : 'bg-black/50 text-zinc-300 hover:text-white'}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-white">Quick-Start Experience Picker</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 text-[9px] font-black uppercase text-orange-300">
                Route Me
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Jump straight to your skill level—either 2-move Cross foundations or F2L pair intuition.
            </p>
            <button
              type="button"
              onClick={startGuidedTour}
              className="w-full h-10 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_10px_24px_rgba(249,115,22,0.35)] flex items-center justify-center cursor-pointer"
            >
              Open Quick-Start Guide <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
            </button>
          </div>

          <div className="pt-2 border-t border-white/10 divide-y divide-white/10">
            <button
              type="button"
              onClick={() => { emitBeep(660, 'sine', 0.07); setActiveModal('newToCfop'); }}
              className="w-full py-2.5 text-left transition-all cursor-pointer flex items-center justify-between gap-3 hover:opacity-90"
            >
              <div>
                <span className="text-xs font-black text-amber-300 block">New to CFOP? Why It Matters</span>
                <span className="text-[10.5px] text-zinc-300 block mt-0.5">
                  Learn how Cross, F2L, OLL &amp; PLL drop solves under 15s and how OLLDay automates the path.
                </span>
              </div>
              <span className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/40 text-orange-300 font-black text-xs flex items-center justify-center flex-shrink-0">
                →
              </span>
            </button>

            <button
              type="button"
              onClick={() => { emitBeep(720, 'sine', 0.07); setActiveModal('appTutorial'); }}
              className="w-full py-2.5 text-left transition-all cursor-pointer flex items-center justify-between gap-3 hover:opacity-90"
            >
              <div>
                <span className="text-xs font-black text-purple-200 block">Interactive App Tutorial</span>
                <span className="text-[10.5px] text-zinc-300 block mt-0.5">
                  How Daily Sessions train muscle memory, plus getting the most out of Cross in X.
                </span>
              </div>
              <span className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 font-black text-xs flex items-center justify-center flex-shrink-0">
                →
              </span>
            </button>
          </div>
        </section>

        {/* 3. TARGET PBs & CHUNKS */}
        <section className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
          <div className="pb-2.5 border-b border-white/10">
            <h3 className="text-base font-black text-white">Target PBs &amp; Chunks</h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">3x3x3 Full-Solve Target PB</span>
              <span className="font-mono text-xs font-black text-orange-300">{fullSolveTargetSec.toFixed(3)}s</span>
            </div>
            <MillisecondSliderControl
              value={fullSolveTargetSec} min={3.0} max={60.0} draftValue={targetPbInput} accentTextClass="text-orange-300"
              onSliderChange={updateFullSolveTargetPb}
              onStepDelta={(d) => { emitBeep(540); updateFullSolveTargetPb(fullSolveTargetSec + d); }}
              onDraftChange={(val) => { setPbDrafts((prev) => ({ ...prev, full: val })); const p = parseFloat(val); if (Number.isFinite(p) && p >= 1 && p <= 120) updateFullSolveTargetPb(p); }}
            />
          </div>

          <div className="pt-3 border-t border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Phase Target PB</span>
                <span className="font-mono text-xs font-black text-amber-300">{getPhaseTargetPb(selectedTargetPhase).toFixed(3)}s</span>
              </div>
              <div className="flex items-center gap-1">
                {[{ key: 'cross', label: 'C' }, { key: 'f2l', label: 'F' }, { key: 'oll', label: 'O' }, { key: 'pll', label: 'P' }].map((ph) => (
                  <button
                    key={ph.key} type="button" onClick={() => { emitBeep(520); setSelectedTargetPhase(ph.key); }}
                    className={`w-6 h-6 rounded-xl text-[10px] font-black flex items-center justify-center cursor-pointer transition-all ${selectedTargetPhase === ph.key ? 'bg-orange-500 text-slate-950' : 'bg-black/50 text-zinc-300 hover:text-white'}`}
                  >
                    {ph.label}
                  </button>
                ))}
              </div>
            </div>
            <MillisecondSliderControl
              value={getPhaseTargetPb(selectedTargetPhase)} min={0.15} max={15.0} draftValue={phaseTargetInput} accentTextClass="text-amber-300"
              onSliderChange={(sec) => updatePhaseTargetPb(selectedTargetPhase, sec)}
              onStepDelta={(d) => { emitBeep(540); updatePhaseTargetPb(selectedTargetPhase, getPhaseTargetPb(selectedTargetPhase) + d); }}
              onDraftChange={(val) => { setPbDrafts((prev) => ({ ...prev, phase: val })); const p = parseFloat(val); if (Number.isFinite(p) && p >= 0.1 && p <= 30) updatePhaseTargetPb(selectedTargetPhase, p); }}
            />
          </div>

          <div className="relative overflow-hidden pt-3 border-t border-white/10 space-y-2">
            {!isProUnlocked && (
              <ProLockOverlay interactive label="Custom Chunks • Pro" onClick={() => openProPaywall('Custom Curriculum Chunk Builder')} />
            )}
            <div className={!isProUnlocked ? 'opacity-40 select-none space-y-2' : 'space-y-2'}>
              <span className="text-xs font-black text-white block">Custom Learning Chunks</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[{ key: 'f2l', label: 'F2L Chunks' }, { key: 'oll', label: 'OLL Chunks' }, { key: 'pll', label: 'PLL Chunks' }].map((b) => (
                  <button
                    key={b.key} type="button"
                    onClick={() => { if (!isProUnlocked) { openProPaywall('Custom Curriculum Chunk Builder'); return; } emitBeep(560); openCurriculumBuilder(b.key); }}
                    className="h-9 px-2.5 rounded-xl bg-black/50 text-[10px] font-black text-orange-300 hover:bg-white/[0.1] flex items-center justify-center cursor-pointer"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. WCA TIMER & REFERENCE */}
        <section className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
          <div className="pb-2.5 border-b border-white/10">
            <h3 className="text-base font-black text-white">WCA Timer &amp; Reference</h3>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Full-screen WCA 20-move scramble timer with +2 / DNF penalties and live <strong className="text-white">Ao5</strong> &amp; <strong className="text-white">Ao12</strong> session tracking.
            </p>
            {renderWcaTelemetryGrid('liquid-glass-well rounded-2xl')}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-zinc-300">Logged 3x3x3 Solves</span>
              <span className="font-mono font-black text-white">{currentUser.fullSolveHistory?.length || 0}</span>
            </div>
            <button
              type="button"
              onClick={openFullTimerModal}
              className="w-full h-11 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_10px_24px_rgba(249,115,22,0.35)] flex items-center justify-center cursor-pointer"
            >
              Launch Full-Screen 3x3x3 Timer
            </button>
          </div>

          {/* WCA Notation Key */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <span className="text-xs font-black text-white block">WCA Notation Key</span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {['All', 'Outer Faces', 'Wide Turns', 'Slice Moves', 'Rotations'].map((sec) => (
                <button
                  key={sec} type="button" onClick={() => { emitBeep(480); setNotationFilter(sec); }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${notationFilter === sec ? 'bg-orange-500 text-slate-950 shadow-sm' : 'bg-white/[0.08] text-zinc-300 hover:text-white'}`}
                >
                  {sec}
                </button>
              ))}
            </div>
            <div className="max-h-60 overflow-y-auto no-scrollbar divide-y divide-white/10 pr-0.5">
              {WCA_NOTATION_GUIDE.filter((n) => notationFilter === 'All' || n.section === notationFilter).map((item) => (
                <div key={item.move} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex-shrink-0">
                    <span className="font-mono text-sm font-black text-amber-300 block">{item.move}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{item.section}</span>
                  </div>
                  <span className="text-xs text-zinc-200 text-right leading-snug">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fingertrick Dossier */}
          <div className="pt-3 border-t border-white/10 space-y-2.5">
            <span className="text-xs font-black text-white block">Fingertrick Dossier</span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {['All', 'Core Triggers', 'F-Layer Triggers', 'Speed Flicks', 'Slice & Ring'].map((cat) => (
                <button
                  key={cat} type="button" onClick={() => { emitBeep(480); setDossierFilter(cat); }}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${dossierFilter === cat ? 'bg-orange-500 text-slate-950 shadow-sm' : 'bg-white/[0.08] text-zinc-300 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="max-h-64 overflow-y-auto no-scrollbar divide-y divide-white/10 pr-0.5">
              {FINGERTRICK_CODEX.filter((t) => dossierFilter === 'All' || t.category === dossierFilter).map((trig) => (
                <div key={trig.id} className="py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${trig.dotClass}`} />
                      <span className="text-xs font-black text-white">{trig.name}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-black ${trig.badgeClass}`}>{trig.notation}</span>
                  </div>
                  <p className="text-[11px] text-zinc-200 leading-snug"><strong className="text-orange-400">Grip:</strong> {trig.grip}</p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">{trig.execution}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. PREFERENCES */}
        <section className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-2.5">
          <div className="pb-2.5 border-b border-white/10">
            <h3 className="text-base font-black text-white">Preferences</h3>
          </div>
          <div className="divide-y divide-white/10">
            {[
              { title: 'Speedcube Stopwatch', sub: 'Record solve times & track case PBs', val: stopwatchEnabled, toggle: () => { emitBeep(620); setStopwatchEnabled((v) => !v); } },
              { title: 'Inline Fingertrick Highlights', sub: 'Show color-coded triggers & grip cues on cases', val: fingertricksEnabled, toggle: () => { emitBeep(620); setFingertricksEnabled((v) => !v); } },
              { title: 'Acoustic Audio & Beeps', sub: 'Inspection warnings & tactile feedback', val: audioEnabled, toggle: () => setAudioEnabled((v) => !v) }
            ].map((pref) => (
              <div key={pref.title} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-xs font-bold text-white">{pref.title}</p>
                  <p className="text-[10px] text-zinc-400">{pref.sub}</p>
                </div>
                <button type="button" onClick={pref.toggle} className={`w-11 h-6 rounded-full transition-colors p-0.5 flex-shrink-0 cursor-pointer ${pref.val ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]' : 'bg-zinc-800'}`}>
                  <div className={`w-5 h-5 rounded-2xl bg-white transition-transform ${pref.val ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 6. ACCOUNT DATA */}
        <section className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="pb-2.5 border-b border-white/10">
            <h3 className="text-base font-black text-white">Account Data</h3>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black text-white block">Granular Progress Reset</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Clear individual phase days, logged PB times, custom chunks, or full 3x3x3 timer history without losing your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { emitBeep(420); setActiveModal('reset'); }}
            className="w-full h-11 px-4 rounded-2xl bg-red-500/15 hover:bg-red-500/25 flex items-center justify-between text-xs font-black text-red-200 cursor-pointer"
          >
            <span>Manage Progress Reset</span>
            <span className="inline-flex items-center gap-1">Open <ArrowRight className="w-3.5 h-3.5" /></span>
          </button>

          {!deleteAccountConfirm ? (
            <button
              type="button"
              onClick={() => { emitBeep(380); setDeleteAccountConfirm(true); }}
              className="w-full h-10 px-4 rounded-2xl bg-white/[0.06] hover:bg-red-500/15 text-xs font-bold text-zinc-200 hover:text-red-200 flex items-center justify-center cursor-pointer"
            >
              Delete My Account &amp; Data
            </button>
          ) : (
            <div className="bg-red-950/65 border border-red-400/45 rounded-2xl p-3 space-y-2 text-center">
              <p className="text-[11px] font-bold text-red-200">Permanently delete &ldquo;{String(activeUserKey)}&rdquo; and all PB history?</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setDeleteAccountConfirm(false)} className="h-9 px-3 rounded-xl bg-white/15 text-xs font-bold text-white flex items-center justify-center cursor-pointer">Cancel</button>
                <button type="button" onClick={deleteCurrentSolverAccount} className="h-9 px-3 rounded-2xl bg-red-500 text-white text-xs font-black flex items-center justify-center cursor-pointer">Confirm Delete</button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderCaseThumb = (phaseKey, item, sizeClass = 'w-14 h-14') => {
    const isF2L = phaseKey === 'f2l';
    const url = isF2L ? getF2LImageUrl(item.alg) : phaseKey === 'pll' ? getPLLImageUrl(item.alg) : getOLLImageUrl(item.alg);
    return (
      <div className={`${sizeClass} ${isF2L ? '' : 'rounded-2xl bg-zinc-200/95 p-1.5 shadow-inner'} flex-shrink-0 flex items-center justify-center pointer-events-none`}>
        <CachedVisualCubeImg url={url} alt={item.name} className={`w-full h-full object-contain ${isF2L ? 'f2l-cube-satin' : ''}`} />
      </div>
    );
  };

  const renderCFOPAlgorithmPhase = (phaseKey) => {
    const isF2L = phaseKey === 'f2l', isPLL = phaseKey === 'pll';
    const tab = phaseTabs[phaseKey];
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
    const lineupOrder = lineupOrders[phaseKey] || [];
    const currentLib = libState[phaseKey] || { mode: 'groups', category: null };
    const setLibMode = (mode) => setLibState((prev) => ({ ...prev, [phaseKey]: { mode, category: null } }));
    const setSelectedCategory = (category) => setLibState((prev) => ({ ...prev, [phaseKey]: { ...prev[phaseKey], category } }));
    const openSession = (dObj, queue) => setActiveSession({ phase: phaseKey, dayObj: dObj, index: 0, queue });
    const openDrill = (item) => setActiveDrill({ phase: phaseKey, item });

    const meta = isF2L
      ? { subtitle: 'Hold White on Bottom • Green in Front • Target Slot: Front-Right (White–Green–Orange)', lineupLabel: "Today's Pair Lineup (Hold & Drag to Reorder)", libEyebrow: '41 Standard Pairs', libTitle: 'F2L Library', groupTabLabel: '6 Pair Groups', unitLabel: 'Pairs', statsTitle: 'F2L Statistics' }
      : isPLL
      ? { subtitle: `2-Side Headlight & Block Recognition • Phase Target PB: ${getPhaseTargetPb('pll').toFixed(3)}s`, lineupLabel: "Today's PLL Lineup (Hold & Drag to Reorder)", libEyebrow: '21 Standard + 4 Bonus Algs', libTitle: 'PLL Library', groupTabLabel: '5 Perm Groups', unitLabel: 'Algs', statsTitle: 'PLL Statistics' }
      : { subtitle: `Yellow Top Recognition • Phase Target PB: ${getPhaseTargetPb('oll').toFixed(3)}s`, lineupLabel: "Today's OLL Lineup (Hold & Drag to Reorder)", libEyebrow: '57 Last-Layer Cases', libTitle: 'OLL Library', groupTabLabel: 'Shape Groups', unitLabel: 'Cases', statsTitle: 'OLL Statistics' };

    if (tab === 'settings') return renderSettingsDeck();

    if (tab === 'grind') {
      const completedInLineup = lineupOrder.filter(
        (c) => typeof statsMap?.[c.id]?.best === 'number' && statsMap[c.id].best <= getEffectiveCaseTargetPb(phaseKey, c.id)
      ).length;
      const totalInLineup = Math.max(1, lineupOrder.length);
      const completionPct = Math.round((completedInLineup / totalInLineup) * 100);
      const dayRatioPct = Math.round(((safeDay - 1) / Math.max(1, scheduleList.length)) * 100);
      const phaseProgressPct = safeDay === 1 && masteredCount === 0
        ? 0
        : Math.max(dayRatioPct, Math.round((masteredCount / Math.max(1, dataList.length)) * 100));
      const activeStreak = computeActiveStreakDays(currentUser.consecutiveStreakDays, currentUser.lastActiveDate);
      const streakIntact = activeStreak > 0 || safeDay === 1;

      return (
        <div className="p-4 sm:p-5 pb-28 space-y-3.5">
          {/* Focused Phase Daily Session Card */}
          <div className="relative">
            <div className="liquid-glass-card liquid-rim-amber border border-orange-500/35 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-[0_20px_50px_rgba(249,115,22,0.16)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black text-orange-400 block">
                    Day {safeDay} <span className="text-zinc-500 font-bold">/ {scheduleList.length}</span>
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">
                    {masteredCount}/{dataList.length} {phaseKey.toUpperCase()} Mastered
                  </span>
                </div>
                <Streak3DCube
                  streakDays={activeStreak}
                  currentDay={safeDay}
                  totalDays={scheduleList.length}
                  progressPct={phaseProgressPct}
                  streakActive={streakIntact}
                />
              </div>

              <div>
                <h2 className="text-xl font-black text-white leading-tight">{dayObj.chunkTitle}</h2>
                <p className="text-xs text-zinc-400 mt-1">{meta.subtitle}</p>
              </div>

              {/* Daily Completion Bar */}
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                  <span className="text-zinc-300">{completedInLineup}/{lineupOrder.length} Cases Complete</span>
                  <span className="font-mono text-orange-400">{completionPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/70 overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${Math.max(6, completionPct)}%` }}
                  />
                </div>
              </div>

              {isF2L && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Setup Scramble Style</span>
                    <div className="bg-black/60 p-0.5 rounded-xl flex">
                      {['beginner', 'realistic'].map((modeKey) => (
                        <button
                          key={modeKey}
                          onClick={() => { emitBeep(520); setF2lSetupMode(modeKey); }}
                          className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase cursor-pointer transition-all ${f2lSetupMode === modeKey ? 'bg-orange-500 text-slate-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                        >
                          {modeKey}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {f2lSetupMode === 'beginner'
                      ? 'Start from a solved cube (White bottom, Green front): sets up only the Front-Right pair while keeping the other 3 slots solved.'
                      : 'Start from a solved cube (White bottom, Green front): keeps the White Cross solved while scrambling back/left slots like a real mid-solve.'}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => {
                    emitBeep(480);
                    updateActiveUserRecord((u) => {
                      const cur = Math.min(Math.max(1, Number(u[dayField]) || 1), Math.max(1, scheduleList.length));
                      return { ...u, [dayField]: Math.max(1, cur - 1) };
                    });
                  }}
                  disabled={safeDay <= 1}
                  className="px-3.5 py-3.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 inline-block mr-0.5 -mt-0.5" />Prev
                </button>
                <button
                  onClick={() => {
                    if (lineupOrder.some((c) => !isCaseUnlockedForTraining(phaseKey, c.id, isProUnlocked))) {
                      openProPaywall(`Day ${safeDay} ${phaseKey.toUpperCase()} Training`);
                      return;
                    }
                    emitBeep(720, 'sine', 0.08);
                    setSwRunning(false); setSwLastResult(null);
                    const sessionQueue = dayObj.randomize ? shuffleCaseList(lineupOrder) : [...lineupOrder];
                    openSession(dayObj, sessionQueue);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_10px_28px_rgba(249,115,22,0.35)] active:scale-95 transition-all cursor-pointer"
                >
                  Continue Today&apos;s Lesson <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                </button>
                <button
                  onClick={() => {
                    emitBeep(480);
                    updateActiveUserRecord((u) => {
                      const cur = Math.min(Math.max(1, Number(u[dayField]) || 1), Math.max(1, scheduleList.length));
                      return {
                        ...u,
                        ...advanceDailyStreakFields(u),
                        [dayField]: cur >= scheduleList.length ? 1 : cur + 1
                      };
                    });
                  }}
                  className="px-3.5 py-3.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  Next <ArrowRight className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{meta.lineupLabel}</span>
              <span className="text-[10px] font-bold text-orange-400">{lineupOrder.length} Cases</span>
            </div>
            <div className="space-y-2.5">
              {lineupOrder.map((rawItem, idx) => {
                const item = resolveEffectiveCase(rawItem, currentUser.customAlgs, phaseKey);
                const stat = statsMap?.[item.id];
                const locked = !isCaseUnlockedForTraining(phaseKey, item.id, isProUnlocked);
                return (
                  <div
                    key={item.id} data-lineup-idx={idx}
                    onContextMenu={(e) => e.preventDefault()}
                    onTouchStart={(e) => startLineupHold(idx, e.touches[0].clientY)}
                    onTouchMove={(e) => handleLineupPreHoldMove(e.touches[0].clientY)}
                    onTouchEnd={cancelLineupHold}
                    onMouseDown={(e) => e.button === 0 && startLineupHold(idx, e.clientY)}
                    onMouseMove={(e) => handleLineupPreHoldMove(e.clientY)}
                    onMouseUp={cancelLineupHold}
                    onClick={() => {
                      if (draggedLineupIdx !== null) return;
                      if (locked) { openProPaywall(item.name); return; }
                      emitBeep(600); setSwRunning(false); setSwLastResult(null); openDrill(rawItem);
                    }}
                    className={`case-row-opt relative overflow-hidden ${item.usingCustomAlg ? 'custom-alg-card' : 'liquid-glass-card liquid-rim-muted'} border rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      draggedLineupIdx === idx ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl' : locked ? 'border-orange-500/20' : item.usingCustomAlg ? 'hover:border-orange-400/75' : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {locked && <ProLockOverlay size="xs" label={`${item.name} • Pro`} />}
                    <div className={`flex items-center gap-3.5 min-w-0 ${locked ? 'opacity-40 select-none' : ''}`}>
                      {renderCaseThumb(phaseKey, rawItem, isF2L ? 'w-14 h-14' : 'w-12 h-12 rounded-xl')}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-white block truncate">{item.name}</span>
                        </div>
                        <p className="font-mono text-xs font-bold text-amber-300 truncate">{item.alg}</p>
                        {(item.step1 || item.recognition) && <p className="text-[10px] text-zinc-400 truncate mt-0.5">{item.step1 || item.recognition}</p>}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 flex-shrink-0 ${locked ? 'opacity-35' : ''}`}>
                      {stat?.best && <span className="px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 font-mono text-[10px] font-black text-green-300">{stat.best.toFixed(2)}s</span>}
                      <span className="w-7 h-7 rounded-xl bg-white/[0.04] flex items-center justify-center text-zinc-400"><GripVertical className="w-3.5 h-3.5" /></span>
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
        <div className="p-4 sm:p-5 pb-28 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">{meta.libTitle}</h2>
            </div>
            <button
              onClick={() => {
                if (!isProUnlocked) { openProPaywall('Custom Curriculum Chunk Builder'); return; }
                emitBeep(560); openCurriculumBuilder(phaseKey);
              }}
              className="px-3 py-1.5 rounded-2xl bg-transparent hover:bg-orange-500/15 text-orange-300 text-[11px] font-bold transition-all cursor-pointer"
            >
              {isProUnlocked ? '+ Edit Chunks' : <><Lock className="w-3 h-3 inline-block mr-1 -mt-0.5" />Edit Chunks</>}
            </button>
          </div>

          <div className="liquid-glass-well p-1 rounded-2xl flex">
            {[{ key: 'groups', label: meta.groupTabLabel }, { key: 'chunks', label: 'Curriculum Chunks' }].map((m) => (
              <button
                key={m.key}
                onClick={() => { emitBeep(480); setLibMode(m.key); }}
                className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${currentLib.mode === m.key ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {!currentLib.category ? (
            currentLib.mode === 'groups' ? (
              <div className="grid grid-cols-2 gap-3">
                {groupList.map((group) => {
                  const groupCases = dataList.filter((c) => c.group === group);
                  const hasProTrainingCases = !isProUnlocked && groupCases.some((c) => !isCaseUnlockedForTraining(phaseKey, c.id, false));
                  return (
                    <button
                      key={group}
                      onClick={() => { emitBeep(520); setSelectedCategory({ type: 'group', name: group }); }}
                      className="relative overflow-hidden liquid-glass-card liquid-tile-sheen liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center hover:border-orange-500/35 active:scale-95 transition-all cursor-pointer space-y-2.5"
                    >
                      {hasProTrainingCases && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/15 text-[8px] font-black uppercase text-zinc-300 z-10">
                          View Free
                        </span>
                      )}
                      <div>{renderCaseThumb(phaseKey, groupCases[0], isF2L ? 'w-24 h-24' : 'w-16 h-16')}</div>
                      <div><h3 className="text-xs font-black text-white leading-snug">{group}</h3><span className="text-[10px] font-bold text-orange-400">{groupCases.length} {meta.unitLabel}</span></div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2.5">
                {chunksList.map((chk) => {
                  const sampleCase = lookupMap.get(chk.ids[0]) || dataList[0];
                  const trainingLocked = !isProUnlocked && chk.ids.some((id) => !isCaseUnlockedForTraining(phaseKey, id, false));
                  return (
                    <button
                      key={chk.id}
                      onClick={() => { emitBeep(520); setSelectedCategory({ type: 'chunk', chunk: chk }); }}
                      className="relative overflow-hidden w-full liquid-glass-card liquid-rim-muted border border-white/10 rounded-2xl p-3.5 flex items-center gap-3.5 text-left hover:border-orange-500/35 cursor-pointer"
                    >
                      <div>{renderCaseThumb(phaseKey, sampleCase, isF2L ? 'w-20 h-20' : 'w-14 h-14')}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-black text-white truncate">{chk.title}</h3>
                          {trainingLocked && (
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-400/35 text-[8.5px] font-black text-orange-200 flex-shrink-0">
                              <Lock className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />Day Grind
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{chk.ids.length} {phaseKey.toUpperCase()} {meta.unitLabel} • Algs Visible</p>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-orange-400 font-black text-xs"><ArrowRight className="w-3.5 h-3.5" /></span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <button onClick={() => { emitBeep(460); setSelectedCategory(null); }} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-transparent hover:bg-white/[0.06] text-xs font-bold text-orange-400 transition-all cursor-pointer">
                <ArrowLeft className="w-3.5 h-3.5 inline-block -mt-0.5" />Back to All {currentLib.mode === 'groups' ? 'Groups' : 'Chunks'}
              </button>
              <h3 className="text-lg font-black text-white">{currentLib.category.type === 'group' ? currentLib.category.name : currentLib.category.chunk.title}</h3>
              <div className="space-y-2.5">
                {(currentLib.category.type === 'group'
                  ? dataList.filter((c) => c.group === currentLib.category.name)
                  : currentLib.category.chunk.ids.map((id) => lookupMap.get(id)).filter(Boolean)
                ).map((rawItem) => {
                  const item = resolveEffectiveCase(rawItem, currentUser.customAlgs, phaseKey);
                  const stat = statsMap?.[item.id];
                  const trainingLocked = !isCaseUnlockedForTraining(phaseKey, item.id, isProUnlocked);
                  const showItemTriggers = fingertricksEnabled && (!item.usingCustomAlg || item.showCustomTriggerPills !== false);
                  const itemTags = showItemTriggers ? getAlgorithmTriggerTags(item.alg) : [];
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (trainingLocked) { openProPaywall(`${item.name} • Day Training & Drills`); return; }
                        emitBeep(600); setSwRunning(false); setSwLastResult(null); openDrill(rawItem);
                      }}
                      className={`case-row-opt relative overflow-hidden ${item.usingCustomAlg ? 'custom-alg-card hover:border-orange-400/75' : 'liquid-glass-card liquid-rim-muted border-white/10 hover:border-white/20'} border rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {renderCaseThumb(phaseKey, rawItem, isF2L ? 'w-20 h-20' : 'w-14 h-14')}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-white truncate">{item.name}</span>
                            {stat?.best && <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-[10px] font-mono font-black text-green-300">{stat.best.toFixed(2)}s</span>}
                            <CustomAlgSwitcherPills
                              item={item}
                              stopPropagation
                              onSelect={(altId) => selectCaseAlgSource(phaseKey, item.id, altId)}
                            />
                          </div>
                          <p className="font-mono text-xs font-bold text-amber-300 mt-0.5">{item.alg}</p>
                          {item.hasCustomAlg && (
                            <p className="text-[9.5px] font-mono text-zinc-400 truncate">
                              {item.usingCustomAlg
                                ? `Ours: ${item.defaultAlg}`
                                : `${item.customAlgList.length} Custom Saved • Tap #1–#${item.customAlgList.length} to switch`}
                            </p>
                          )}
                          {item.recognition && <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{item.recognition}</p>}
                          {showItemTriggers && (
                            <div className="mt-1.5 space-y-1">
                              <TriggerTagsList tags={itemTags} />
                              {item.fingertrick && (
                                <p className="text-[10px] text-orange-200/90 bg-orange-500/10 border border-orange-500/20 rounded-xl px-2 py-0.5 leading-snug">
                                  <strong className="text-orange-400">Fingertrick:</strong> {item.fingertrick}
                                </p>
                              )}
                            </div>
                          )}
                          {item.step1 && <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">{item.step1}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {trainingLocked && (
                          <span className="px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-400/35 text-[9.5px] font-black text-orange-300">
                            <Lock className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />Day Training
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomAlgEditor(phaseKey, rawItem);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${
                            item.hasCustomAlg
                              ? 'bg-orange-500/15 text-orange-300 hover:bg-orange-500/25'
                              : 'bg-transparent text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          {isProUnlocked ? (item.hasCustomAlg ? `My Algs (${item.customAlgList.length}/7)` : '+ Custom') : <><Lock className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" />Custom</>}
                        </button>
                        {fingertricksEnabled && (
                          <button
                            onClick={(e) => { e.stopPropagation(); emitBeep(540); setFtPhaseContext(phaseKey); setFtCase(item); setActiveModal('fingertrick'); }}
                            className="px-2.5 py-1 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                          >
                            Grip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="p-4 sm:p-5 pb-28 space-y-3.5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">{meta.statsTitle}</h2>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Mastered', val: `${masteredCount}/${dataList.length}`, color: 'text-green-400' },
            { label: 'Current Day', val: safeDay, color: 'text-orange-400' },
            { label: 'Target PB', val: `${getPhaseTargetPb(phaseKey).toFixed(3)}s`, color: 'text-amber-300' }
          ].map((s) => (
            <div key={s.label} className="liquid-glass-card liquid-tile-sheen liquid-rim-muted border border-white/10 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-zinc-400 block">{s.label}</span>
              <span className={`font-mono text-xl font-black ${s.color}`}>{s.val}</span>
            </div>
          ))}
        </div>

        {renderFullSolveStatsBlock()}

        <div className="space-y-2.5">
          {dataList.map((rawItem) => {
            const item = resolveEffectiveCase(rawItem, currentUser.customAlgs, phaseKey);
            const stat = statsMap?.[item.id];
            const caseGoal = getEffectiveCaseTargetPb(phaseKey, item.id);
            const locked = !isCaseUnlockedForTraining(phaseKey, item.id, isProUnlocked);
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (locked) { openProPaywall(item.name); return; }
                  emitBeep(580); setSwRunning(false); setSwLastResult(null); openDrill(rawItem);
                }}
                className={`case-row-opt relative overflow-hidden ${item.usingCustomAlg ? 'custom-alg-card' : 'liquid-glass-card liquid-rim-muted'} border rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${locked ? 'border-orange-500/20' : item.usingCustomAlg ? 'hover:border-orange-400/75' : 'border-white/10 hover:border-white/20'}`}
              >
                {locked && <ProLockOverlay size="xs" label={`${item.name} • Pro`} />}
                <div className={`flex items-center gap-3 min-w-0 ${locked ? 'opacity-40 select-none' : ''}`}>
                  {renderCaseThumb(phaseKey, item, isF2L ? 'w-14 h-14' : 'w-11 h-11 rounded-xl')}
                  <div className="min-w-0">
                    <span className="text-xs font-black text-white block truncate">{item.name}</span>
                    <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (locked) { openProPaywall(item.name); return; }
                          emitBeep(560);
                          setEditingCaseTarget({ phase: phaseKey, caseId: item.id, name: item.name, draft: caseGoal.toFixed(3) });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/12 font-mono text-[9.5px] font-black text-amber-300 hover:bg-amber-500/22 transition-all cursor-pointer"
                        title="Set Case Target PB"
                      >
                        Goal: {caseGoal.toFixed(3)}s <Pencil className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5" />
                      </button>
                      {Array.isArray(stat?.history) && stat.history.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (locked) { openProPaywall(item.name); return; }
                            emitBeep(520);
                            setManagingCaseHistory({ phase: phaseKey, caseId: item.id, name: item.name });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] font-mono text-[9.5px] font-bold text-zinc-300 transition-all cursor-pointer"
                          title="Inspect or Delete Logged Times"
                        >
                          Times ({stat.history.length}) <Pencil className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`text-right flex-shrink-0 ${locked ? 'opacity-35' : ''}`}>
                  {stat?.best ? (
                    <>
                      <span className={`font-mono text-xs font-black block ${stat.best <= caseGoal ? 'text-green-400' : 'text-amber-300'}`}>PB: {stat.best.toFixed(3)}s</span>
                      <span className="text-[10px] text-zinc-400">{stat.attempts} runs</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-500">Unlogged</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Unique Cross in X Arc Telemetry Gauge (inspired by Circular Dial UI)
  const renderCrossArcGauge = () => {
    const targetMoves = activeCrossMoveCount || activeTierObj.moves;
    const progressRatio = Math.min(1, Math.max(0.12, targetMoves / Math.max(targetMoves, crossUserMoves)));
    const arcLength = 214;
    const strokeOffset = arcLength * (1 - progressRatio);
    return (
      <div className="flex flex-col items-center justify-center pt-1 pb-2 space-y-1.5">
        <div className="relative flex items-center justify-center w-52 h-28">
          <svg viewBox="0 0 180 102" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="crossArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            <path
              d="M 22 92 A 68 68 0 0 1 158 92"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M 22 92 A 68 68 0 0 1 158 92"
              fill="none"
              stroke="url(#crossArcGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeOffset}
              style={{ transition: 'stroke-dashoffset 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </svg>
          <div className="absolute bottom-1.5 flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Your Moves</span>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={() => { emitBeep(440); setCrossUserMoves((m) => Math.max(1, m - 1)); }}
                className="w-7 h-7 rounded-xl bg-transparent hover:bg-white/[0.08] font-black text-white text-sm flex items-center justify-center active:scale-90 cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-2xl font-black text-white w-8 text-center">{crossUserMoves}</span>
              <button
                type="button"
                onClick={() => { emitBeep(660); setCrossUserMoves((m) => Math.min(20, m + 1)); }}
                className="w-7 h-7 rounded-xl bg-transparent hover:bg-white/[0.08] font-black text-white text-sm flex items-center justify-center active:scale-90 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <span className="px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[9.5px] font-mono font-bold text-orange-400">
          Target ≤ {targetMoves} Turns • {currentUser.crossClears || 0} Clears
        </span>
      </div>
    );
  };

  // Tap-to-time handler and shared props for Daily Session & Isolated Drill overlays
  const handlePracticeTap = (phaseKey, itemId) => (e) => {
    if (!stopwatchEnabled || e.target.closest('button, input, a')) return;
    if (!swRunning && e.target.closest('[data-no-timer-start="true"]')) return;
    toggleStopwatch((sec) => recordCaseTime(phaseKey, itemId, sec));
  };

  const sharedPracticeProps = {
    f2lSetupMode, f2lSetupSeed, setF2lSetupSeed, pllSetupSeed, setPllSetupSeed,
    f2lOrbit, f2lViewIdx, setF2LPresetAngle, fingertricksEnabled, stopwatchEnabled,
    swRunning, swDisplayRef, isLargeScreen: isTwoPane, emitBeep
  };

  // Unified Daily Session Runner (Liquid Glass - Full-Viewport Fit on iPad, Tablet & Desktop)
  const renderUnifiedDailySession = () => {
    if (!activeSession) return null;
    const { phase: phaseKey, dayObj, index, queue } = activeSession;
    const rawItem = queue[index];
    if (!rawItem) return null;
    const { safeDay, scheduleLen, dayField, statsMap, itemLabel, timerLabel } = {
      f2l: { safeDay: safeF2lDay, scheduleLen: f2lSchedule.length, dayField: 'f2lDay', statsMap: currentUser.f2lStats, itemLabel: 'Pair', timerLabel: 'Tap to Time Case' },
      oll: { safeDay: safeOllDay, scheduleLen: ollSchedule.length, dayField: 'day', statsMap: currentUser.stats, itemLabel: 'Case', timerLabel: 'Tap to Time OLL' },
      pll: { safeDay: safePllDay, scheduleLen: pllSchedule.length, dayField: 'pllDay', statsMap: currentUser.pllStats, itemLabel: 'Alg', timerLabel: 'Tap to Time PLL' }
    }[phaseKey];
    const item = resolveEffectiveCase(rawItem, currentUser.customAlgs, phaseKey);
    const caseStat = statsMap?.[item.id] || {};
    const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
    const lastResultForThis = swLastResult?.phase === phaseKey && swLastResult?.caseId === item.id ? swLastResult : null;

    return (
      <div
        onClick={handlePracticeTap(phaseKey, item.id)}
        className={`fixed inset-0 z-[240] bg-[#040814]/94 flex justify-center overflow-hidden ${stopwatchEnabled ? 'cursor-pointer' : ''}`}
      >
        <div
          className={`relative z-10 w-full h-[100dvh] overflow-hidden flex flex-col justify-between ${
            isTwoPane
              ? 'max-w-none px-8 py-5'
              : 'max-w-md border-x border-white/10 px-3.5 py-2.5 shadow-2xl'
          }`}
        >
          <div data-no-timer-start="true" className={`w-full ${isTwoPane ? 'max-w-6xl mx-auto' : ''} flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-2.5">
              <span className={`${isTwoPane ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-0.5 text-[9.5px]'} rounded-full bg-orange-500/15 border border-orange-500/30 font-black uppercase tracking-wider text-orange-300`}>
                {dayObj.mode} • {itemLabel} {index + 1}/{queue.length}
              </span>
              {isTwoPane && (
                <span className="text-xs font-bold text-zinc-400">
                  Day {safeDay} • {dayObj.chunkTitle}
                </span>
              )}
            </div>
            <button onClick={() => { setSwRunning(false); setSwLastResult(null); setActiveSession(null); }} className={`${isTwoPane ? 'w-10 h-10 text-base' : 'w-8 h-8 text-xs'} rounded-2xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold cursor-pointer`}><X className="w-3.5 h-3.5 inline-block" /></button>
          </div>

          <div className={`w-full ${isTwoPane ? 'max-w-6xl mx-auto flex-1 min-h-0 flex items-center py-3' : 'my-auto'}`}>
            <div
              className={`${
                isTwoPane
                  ? 'w-full h-full max-h-[76dvh] rounded-[2.5rem] px-8 py-5 flex items-center justify-center'
                  : 'w-full rounded-3xl p-4 space-y-2.5 flex flex-col items-center'
              } liquid-glass-card liquid-rim-muted border border-white/15`}
            >
              <CasePracticeCard
                {...sharedPracticeProps}
                phaseKey={phaseKey}
                item={item}
                timerLabel={timerLabel}
                lastResultForThis={lastResultForThis}
                recordedBest={caseStat.best}
                showInlineGroup={phaseKey !== 'f2l'}
                onOpenGrip={() => { emitBeep(540); setFtPhaseContext(phaseKey); setFtCase(item); setActiveModal('fingertrick'); }}
                onToggleCustomAlgSource={(altId) => selectCaseAlgSource(phaseKey, item.id, altId)}
                onOpenCustomAlgEditor={() => openCustomAlgEditor(phaseKey, rawItem)}
                onToggleStopwatch={() => toggleStopwatch((sec) => recordCaseTime(phaseKey, item.id, sec))}
              >
                <CaseWindowAvgGrid history={caseHist} isLargeScreen={isTwoPane} />
              </CasePracticeCard>
            </div>
          </div>

          <div className={`w-full ${isTwoPane ? 'max-w-6xl mx-auto gap-4' : 'gap-2'} grid grid-cols-2 flex-shrink-0`}>
            <button
              onClick={() => { emitBeep(460); setSwRunning(false); setActiveSession((s) => ({ ...s, index: Math.max(0, s.index - 1) })); }}
              disabled={index === 0}
              className={`${isTwoPane ? 'py-3.5 text-sm' : 'py-2.5 text-xs'} rounded-2xl bg-white/[0.05] hover:bg-white/[0.12] font-bold text-zinc-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer`}
            >
              <ArrowLeft className="w-3.5 h-3.5 inline-block mr-0.5 -mt-0.5" />Previous
            </button>
            <button
              onClick={() => {
                emitBeep(760); setSwRunning(false);
                if (index + 1 < queue.length) setActiveSession((s) => ({ ...s, index: s.index + 1 }));
                else {
                  updateActiveUserRecord((u) => ({
                    ...u,
                    ...advanceDailyStreakFields(u),
                    [dayField]: safeDay >= scheduleLen ? 1 : safeDay + 1
                  }));
                  setActiveSession(null);
                }
              }}
              className={`${isTwoPane ? 'py-3.5 text-sm' : 'py-2.5 text-xs'} rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black uppercase tracking-wider shadow-[0_10px_28px_rgba(249,115,22,0.35)] cursor-pointer`}
            >
              {index + 1 < queue.length ? <>Next {itemLabel} <ArrowRight className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></> : <>Complete Day <Check className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Unified Isolated Case Drill Modal (Liquid Glass - Full-Viewport Fit on iPad, Tablet & Desktop)
  const renderUnifiedDrillModal = () => {
    if (!activeDrill) return null;
    const { phase: phaseKey, item: rawItem } = activeDrill;
    const { statsMap, timerLabel } = {
      f2l: { statsMap: currentUser.f2lStats, timerLabel: 'Tap to Time F2L' },
      oll: { statsMap: currentUser.stats, timerLabel: 'Tap to Time OLL' },
      pll: { statsMap: currentUser.pllStats, timerLabel: 'Tap to Time PLL' }
    }[phaseKey];
    const item = resolveEffectiveCase(rawItem, currentUser.customAlgs, phaseKey);
    const caseStat = statsMap?.[item.id] || {};
    const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
    const lastResultForThis = swLastResult?.phase === phaseKey && swLastResult?.caseId === item.id ? swLastResult : null;
    const closeDrill = () => { setSwRunning(false); setSwLastResult(null); setActiveDrill(null); };

    return (
      <div
        onClick={handlePracticeTap(phaseKey, item.id)}
        className={`fixed inset-0 z-[245] bg-[#040814]/94 overflow-hidden ${
          isTwoPane ? 'flex flex-col justify-between px-8 py-5' : 'flex items-center justify-center px-3.5 py-2.5'
        } ${stopwatchEnabled ? 'cursor-pointer' : ''}`}
      >
        {isTwoPane && (
          <div data-no-timer-start="true" className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between flex-shrink-0">
            <span className="px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-xs font-black uppercase tracking-widest text-orange-300">
              {phaseKey.toUpperCase()} Isolated Drill • {item.group}
            </span>
            <button onClick={closeDrill} className="w-10 h-10 rounded-2xl bg-transparent hover:bg-white/[0.08] text-zinc-300 text-base font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
          </div>
        )}

        <div className={`relative z-10 w-full ${isTwoPane ? 'max-w-6xl mx-auto flex-1 min-h-0 flex items-center py-3' : 'max-w-sm'}`}>
          <div
            className={`liquid-glass-card liquid-rim-muted border border-white/15 w-full ${
              isTwoPane
                ? 'h-full max-h-[76dvh] rounded-[2.5rem] px-8 py-5 flex items-center justify-center'
                : 'rounded-3xl p-4 space-y-2 overflow-hidden'
            }`}
          >
            {!isTwoPane && (
              <div data-no-timer-start="true" className="flex items-center justify-end">
                <button onClick={closeDrill} className="w-7 h-7 rounded-2xl bg-transparent hover:bg-white/[0.08] text-zinc-300 text-xs font-bold flex-shrink-0 cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
              </div>
            )}

            <CasePracticeCard
              {...sharedPracticeProps}
              phaseKey={phaseKey}
              item={item}
              timerLabel={timerLabel}
              lastResultForThis={lastResultForThis}
              recordedBest={caseStat.best}
              onOpenGrip={() => { emitBeep(540); setFtPhaseContext(phaseKey); setFtCase(item); setActiveModal('fingertrick'); }}
              onToggleCustomAlgSource={(altId) => selectCaseAlgSource(phaseKey, item.id, altId)}
              onOpenCustomAlgEditor={() => openCustomAlgEditor(phaseKey, rawItem)}
              onToggleStopwatch={() => toggleStopwatch((sec) => recordCaseTime(phaseKey, item.id, sec))}
            >
              <CaseWindowAvgGrid history={caseHist} isLargeScreen={isTwoPane} />
              {caseHist.length > 0 && (
                <div data-no-timer-start="true" className="w-full flex items-center justify-between gap-2">
                  <span className="text-[9.5px] font-bold text-zinc-400">
                    {caseHist.length} logged time{caseHist.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => { emitBeep(520); setManagingCaseHistory({ phase: phaseKey, caseId: item.id, name: item.name }); }}
                    className="px-2.5 py-0.5 rounded-xl bg-transparent hover:bg-white/[0.08] text-[9.5px] font-black text-zinc-300 hover:text-white cursor-pointer"
                  >
                    Manage / Delete ({caseHist.length})
                  </button>
                </div>
              )}
            </CasePracticeCard>
          </div>
        </div>

        {isTwoPane && (
          <div data-no-timer-start="true" className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
            <span>{viewportDevice.isTouchPrimary ? 'Tap anywhere outside controls to start/stop timer' : 'Click anywhere or press Spacebar to start/stop timer'}</span>
            <button
              type="button"
              onClick={closeDrill}
              className="px-4 py-2 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-black uppercase tracking-wider text-zinc-200 cursor-pointer"
            >
              Done Drilling
            </button>
          </div>
        )}
      </div>
    );
  };

  // Dedicated Right-Hand Reference Pane for iPad, Tablets & Desktop
  const renderTabletDesktopReferencePane = () => {
    if (!isTwoPane) return null;
    const activeContextCase = activeDrill?.item || activeSession?.queue[activeSession.index] || null;
    const activeContextTags = activeContextCase ? getAlgorithmTriggerTags(activeContextCase.alg) : [];
    const q = rightPaneSearch.trim().toLowerCase();

    const filteredNotation = WCA_NOTATION_GUIDE.filter((n) =>
      (notationFilter === 'All' || n.section === notationFilter) &&
      (!q || n.move.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q) || n.section.toLowerCase().includes(q))
    );

    const filteredDossier = FINGERTRICK_CODEX.filter((t) =>
      (dossierFilter === 'All' || t.category === dossierFilter) &&
      (!q || t.name.toLowerCase().includes(q) || t.notation.toLowerCase().includes(q) || t.grip.toLowerCase().includes(q) || t.execution.toLowerCase().includes(q))
    );

    return (
      <aside className="flex col-span-5 flex-col min-h-0 h-full bg-[#070f24]/75 border-l border-white/[0.09] p-5 pb-28 space-y-3.5 overflow-hidden">
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">Notation &amp; Mechanics</h2>
          </div>
        </div>

        <div className="liquid-glass-well p-1 rounded-xl grid grid-cols-2 flex-shrink-0">
          {[
            { key: 'notation', label: 'Notation Key' },
            { key: 'fingertricks', label: 'Fingertrick Dossier' }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { emitBeep(520); setRightPaneTab(tab.key); }}
              className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                rightPaneTab === tab.key ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-shrink-0">
          <input
            type="text"
            value={rightPaneSearch}
            onChange={(e) => setRightPaneSearch(e.target.value)}
            placeholder={rightPaneTab === 'notation' ? 'Filter moves (e.g., Rw, M2, U2, y)...' : 'Search triggers (e.g., Sexy, Sledge, M-slice)...'}
            className="w-full rounded-xl liquid-glass-well px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/40"
          />
          {rightPaneSearch && (
            <button
              type="button"
              onClick={() => setRightPaneSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {activeContextCase && (
          <div className="liquid-glass-card liquid-rim-amber border border-orange-500/35 rounded-2xl p-3.5 space-y-1.5 flex-shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-400">Active Case Triggers</span>
              <span className="text-[10px] font-bold text-white truncate">{activeContextCase.name}</span>
            </div>
            <p className="font-mono text-xs font-black text-amber-300">{activeContextCase.alg}</p>
            <TriggerTagsList tags={activeContextTags} />
          </div>
        )}

        {rightPaneTab === 'notation' ? (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 flex-shrink-0">
            {['All', 'Outer Faces', 'Wide Turns', 'Slice Moves', 'Rotations'].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => { emitBeep(480); setNotationFilter(sec); }}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${
                  notationFilter === sec ? 'bg-orange-500 text-slate-950' : 'bg-white/[0.05] text-zinc-400 hover:text-white'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 flex-shrink-0">
            {['All', 'Core Triggers', 'F-Layer Triggers', 'Speed Flicks', 'Slice & Ring'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { emitBeep(480); setDossierFilter(cat); }}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${
                  dossierFilter === cat ? 'bg-orange-500 text-slate-950' : 'bg-white/[0.05] text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
          {rightPaneTab === 'notation' ? (
            filteredNotation.length > 0 ? (
              filteredNotation.map((item) => (
                <div key={item.move} className="liquid-glass-card liquid-rim-muted rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-black text-amber-300 block">{item.move}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{item.section}</span>
                  </div>
                  <span className="text-xs text-zinc-300 text-right leading-snug">{item.desc}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-400 text-center py-6">No notation moves match &ldquo;{rightPaneSearch}&rdquo;.</p>
            )
          ) : filteredDossier.length > 0 ? (
            filteredDossier.map((trig) => {
              const isHighlighted = activeContextTags.some((t) => t.label.toLowerCase().includes(trig.name.toLowerCase()));
              return (
                <div
                  key={trig.id}
                  className={`liquid-glass-card border rounded-2xl p-3.5 space-y-1.5 transition-all ${
                    isHighlighted ? 'liquid-rim-amber border-orange-500/45 shadow-md' : 'liquid-rim-muted border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${trig.dotClass}`} />
                      <span className="text-xs font-black text-white">{trig.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] font-black ${trig.badgeClass}`}>{trig.notation}</span>
                  </div>
                  <p className="text-[10.5px] font-bold text-zinc-300"><span className="text-orange-400">Grip:</span> {trig.grip}</p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">{trig.execution}</p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-zinc-400 text-center py-6">No fingertricks match &ldquo;{rightPaneSearch}&rdquo;.</p>
          )}
        </div>

        <div className="liquid-glass-well rounded-xl px-4 py-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400 flex-shrink-0">
          <span>Hold <strong className="text-white">White (D)</strong> • <strong className="text-green-400">Green (F)</strong></span>
          <span className="font-mono text-[9.5px] text-orange-300">
            {viewportDevice.isTouchPrimary ? 'Touch & Drag • 2-Pane' : 'Spacebar: Timer'}
          </span>
        </div>
      </aside>
    );
  };

  return (
    <>
      <style>{APP_GLOBAL_CSS}</style>

      <div className={`min-h-[100dvh] w-full bg-midnight-marble text-slate-100 flex justify-center select-none relative overflow-hidden ${!isAppVisible ? 'app-bg-sleep' : ''}`}>
        <AmbientGlows
          topClass="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[44vh] z-0"
          topGradient="radial-gradient(circle at 50% 0%, rgba(249, 115, 22, 0.18) 0%, rgba(249, 115, 22, 0) 68%)"
          bottomClass="fixed bottom-0 right-0 w-3/4 h-[38vh] z-0"
          bottomGradient="radial-gradient(circle at 80% 100%, rgba(29, 78, 216, 0.18) 0%, rgba(29, 78, 216, 0) 68%)"
        />

        <div
          className={`w-full ${
            isTwoPane
              ? 'max-w-5xl lg:max-w-6xl h-[96dvh] my-auto rounded-[2.5rem] border border-white/[0.09] liquid-rim-muted shadow-[0_32px_90px_rgba(0,0,0,0.88)]'
              : 'max-w-md h-[100dvh] border-x border-white/[0.07] shadow-2xl'
          } flex flex-col relative z-10 bg-midnight-marble overflow-hidden`}
        >
          {/* PERSISTENT HEADER */}
          <header className={`px-4 ${isTwoPane ? 'px-6' : ''} pt-4 pb-3 flex items-center justify-between gap-2 border-b border-white/[0.09] bg-[#071127]/95 flex-shrink-0 z-40`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-white/[0.07] border border-white/15 p-0.5 flex items-center justify-center flex-shrink-0 shadow-inner">
                <SuneEmblemSvg className="w-full h-full" />
              </div>
              <h1 className={`${isTwoPane ? 'text-base' : 'text-sm'} font-black tracking-tight text-white whitespace-nowrap`}>
                OLLDay <span className="text-orange-400">Everyday</span>
              </h1>
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0 relative">
              <button
                type="button"
                onClick={() => { emitBeep(660, 'sine', 0.07); setSelectedStickerEdit(null); setScannerOpen(true); }}
                className="px-3 h-8 rounded-2xl bg-orange-500/12 hover:bg-orange-500/22 text-orange-300 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                title="Scan 3x3 Cube & Predict Next Case"
                aria-label="Scan Cube"
              >
                <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px] font-black whitespace-nowrap">Scan Cube</span>
              </button>

              <button
                onClick={() => { emitBeep(520); setAuthErrorMsg(''); setAuthMode('signin'); setAuthScreenOpen(true); }}
                className={`flex items-center gap-1.5 ${isTwoPane ? 'px-3.5' : 'px-2.5'} py-1 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] text-[11px] font-bold text-zinc-200 active:scale-95 transition-all cursor-pointer`}
                title="Switch Solver Account"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)] flex-shrink-0" />
                <span className={`${isTwoPane ? 'max-w-[110px]' : 'max-w-[60px]'} truncate`}>{String(activeUserKey || 'Account')}</span>
              </button>
            </div>
          </header>

          {/* RESPONSIVE WORKSPACE BODY */}
          <div className={`flex-1 min-h-0 ${isTwoPane ? 'grid grid-cols-12' : 'flex flex-col'} overflow-hidden`}>
            {/* LEFT PANE: MAIN DAY TRAINING & CROSS WORKSPACE */}
            <main className={`${isTwoPane ? 'col-span-7' : 'flex-1'} min-h-0 overflow-y-auto no-scrollbar`}>
              <div className={isTwoPane ? 'max-w-2xl mx-auto' : ''}>
                {activePhase === 'cross' && (
                  <>
                    {phaseTabs.cross === 'ladder' && (
                      <div className="p-4 sm:p-5 pb-28 space-y-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-2xl font-black tracking-tight text-white">Cross in X</h2>
                          </div>
                          <button type="button" onClick={() => { emitBeep(520); setActiveModal('compass'); }} className="h-9 px-3.5 rounded-2xl bg-orange-500/12 hover:bg-orange-500/22 text-orange-300 text-[11px] font-bold whitespace-nowrap flex-shrink-0 flex items-center justify-center active:scale-95 transition-all cursor-pointer">
                            Color Orbit
                          </button>
                        </div>

                        {/* Top Mode Switcher Pill */}
                        <div className="liquid-glass-well p-1 rounded-2xl flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              emitBeep(520); setCrossDifficulty('standard');
                              const tObj = CROSS_TIERS.find((t) => t.tier === crossTier) || CROSS_TIERS[0];
                              setCrossUserMoves(tObj.moves); setCrossSolutionRevealed(false); setEfficiencyFeedback(null);
                            }}
                            className={`flex-1 h-9 px-3 text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap rounded-xl flex items-center justify-center cursor-pointer transition-all ${crossDifficulty === 'standard' ? 'bg-white/[0.14] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                          >
                            Standard (2–6)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isProUnlocked) { openProPaywall('Advanced Full-Scramble Cross Ladder'); return; }
                              emitBeep(580); setCrossDifficulty('advanced');
                              const tObj = CROSS_ADVANCED_TIERS.find((t) => t.tier === crossTier) || CROSS_ADVANCED_TIERS[0];
                              setCrossUserMoves(tObj.moves); setCrossSolutionRevealed(false); setEfficiencyFeedback(null);
                            }}
                            className={`relative overflow-hidden flex-1 h-9 px-3 text-[10.5px] font-black uppercase tracking-wider whitespace-nowrap rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${crossDifficulty === 'advanced' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                          >
                            <span className={!isProUnlocked ? 'opacity-65' : ''}>
                              <span className="sm:hidden">Full Scramble</span>
                              <span className="hidden sm:inline">Advanced Full Scramble</span>
                            </span>
                            {!isProUnlocked && <Lock className="w-3 h-3 text-orange-300 flex-shrink-0" />}
                          </button>
                        </div>

                        {/* Hardware Level Selector Tiles */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {activeCrossTierList.map((t) => {
                            const locked = !isProUnlocked && (crossDifficulty === 'advanced' || t.tier > 2);
                            const isSelected = crossTier === t.tier;
                            return (
                              <button
                                key={t.tier}
                                onClick={() => {
                                  if (locked) { openProPaywall(crossDifficulty === 'advanced' ? `Advanced Full-Scramble Cross L${t.tier}` : `Cross Ladder Level ${t.tier}`); return; }
                                  emitBeep(540); setCrossTier(t.tier); setCrossUserMoves(t.moves); setCrossSolutionRevealed(false); setEfficiencyFeedback(null);
                                }}
                                className={`relative overflow-hidden h-10 text-[11px] font-black rounded-2xl border flex items-center justify-center cursor-pointer transition-all ${
                                  isSelected ? 'bg-gradient-to-b from-orange-500 to-amber-500 text-slate-950 border-orange-300 shadow-[0_6px_18px_rgba(249,115,22,0.35)]' : locked ? 'bg-white/[0.03] text-zinc-400 border-orange-500/20' : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-white'
                                }`}
                              >
                                <span className={locked ? 'opacity-45' : ''}>L{t.tier}</span>
                                {locked && <span className="absolute inset-0 flex items-center justify-center text-orange-300"><Lock className="w-3.5 h-3.5" /></span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Primary 3D Cross Orbit Stage Card */}
                        <div className="liquid-glass-card liquid-rim-amber border border-white/10 rounded-3xl p-4 sm:p-5 space-y-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 text-left">
                              <h3 className="text-base font-black text-white leading-snug">{activeTierObj.title}</h3>
                            </div>
                            <button
                              onClick={() => { emitBeep(560); setCrossScrambleIdx((p) => p + 1); setCrossSolutionRevealed(false); setEfficiencyFeedback(null); }}
                              className="h-9 px-3.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-orange-300 whitespace-nowrap flex-shrink-0 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                            >
                              New <RotateCw className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
                            </button>
                          </div>

                          <div className="pt-3 border-t border-white/10 text-center space-y-1">
                            <span className="text-[9.5px] font-medium uppercase tracking-wider text-zinc-400 block">Hold White (D) • Green (F) • Red (L) • Orange (R)</span>
                            <div className={`font-mono font-bold text-amber-300 tracking-wider select-all break-words ${crossDifficulty === 'advanced' ? 'text-xs sm:text-sm leading-relaxed' : 'text-xl'}`}>
                              {activeCrossScramble}
                            </div>
                          </div>

                          {/* 3D Cross Orbit Hardware Stage */}
                          <div className="liquid-glass-well border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center space-y-1.5">
                            <div className="w-full flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-zinc-400">
                                {crossOrbit.rot.pitch > 15 ? 'Bottom-Right (D-Face)' : crossOrbit.rot.pitch < -15 ? 'Top-Right (U-Face)' : 'Front-Right View'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => { emitBeep(540); crossOrbit.setOrbit((prev) => (prev.pitch > 15 ? { yaw: -35, pitch: -28 } : { yaw: -35, pitch: 38 })); }}
                                  className="px-2.5 py-0.5 rounded-xl bg-transparent hover:bg-orange-500/15 text-[10px] font-black text-orange-300 cursor-pointer active:scale-95 transition-all"
                                >
                                  {crossOrbit.rot.pitch > 15 ? <>Top View <RotateCw className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5" /></> : <>Bottom (D) <RotateCw className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5" /></>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { emitBeep(480); crossOrbit.setOrbit({ yaw: -35, pitch: 38 }); }}
                                  className="px-2.5 py-0.5 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>

                            <div
                              {...crossOrbit.handlers}
                              onPointerCancel={crossOrbit.handlers.onPointerUp}
                              style={{ touchAction: 'none' }}
                              className="relative w-44 h-44 mx-auto flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
                            >
                              <OrbitRingBackdrop insetClass="inset-2" />
                              <CrossSpatial3DCube scramble={activeCrossScramble} yaw={crossOrbit.rot.yaw} pitch={crossOrbit.rot.pitch} isDragging={crossOrbit.isDragging} cubeRef={crossOrbit.domRef} />
                              <span ref={crossOrbit.labelRef} className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 -mt-1">
                                3D Cross Orbit • Drag to Spin ({((crossOrbit.rot.yaw % 360) + 360) % 360}°)
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-[9.5px] font-bold text-zinc-400">
                              <span className="text-green-400">▲ Green (F)</span>
                              <span className="text-red-400">◀ Red (L)</span>
                              <span className="text-orange-400">Orange (R) ▶</span>
                              <span className="text-blue-400">▼ Blue (B)</span>
                            </div>
                          </div>

                          {/* Bento Tactical Split: Mode Toggle + Optimal Solution */}
                          <div className="grid grid-cols-2 gap-2">
                            {[{ key: 'efficiency', label: 'Move Efficiency', sub: 'Arc Counter' }, { key: 'blind', label: 'Blind Practice', sub: '15s Visor Mat' }].map((m) => (
                              <button
                                key={m.key}
                                onClick={() => { emitBeep(480); setCrossLadderMode(m.key); }}
                                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                                  crossLadderMode === m.key
                                    ? 'bg-orange-500/15 border-orange-400/50 shadow-[0_8px_20px_rgba(249,115,22,0.18)]'
                                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
                                }`}
                              >
                                <span className={`text-xs font-black block ${crossLadderMode === m.key ? 'text-orange-300' : 'text-white'}`}>{m.label}</span>
                                <span className="text-[10px] text-zinc-400 block mt-0.5">{m.sub}</span>
                              </button>
                            ))}
                          </div>

                          <p className="text-xs text-zinc-300 text-left leading-relaxed pt-2.5 border-t border-white/10">{activeTierObj.hint}</p>

                          <div className="pt-2.5 border-t border-white/10 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Optimal Solution
                              </span>
                              <button
                                type="button"
                                onClick={() => { emitBeep(580, 'sine', 0.06); setCrossSolutionRevealed((v) => !v); }}
                                className="h-8 px-3 rounded-xl bg-transparent hover:bg-orange-500/15 text-[10px] font-black uppercase tracking-wider text-orange-300 flex items-center justify-center cursor-pointer transition-all"
                              >
                                {crossSolutionRevealed ? <>Hide <ChevronUp className="w-3 h-3 inline-block -mt-0.5" /></> : <>Reveal <ChevronDown className="w-3 h-3 inline-block -mt-0.5" /></>}
                              </button>
                            </div>
                            {crossSolutionRevealed && (
                              <div className="pt-1.5 border-t border-white/10 text-center space-y-1">
                                <p className="font-mono text-sm font-black text-green-400 tracking-wider select-all">{activeCrossSolution}</p>
                                <span className="text-[9.5px] text-zinc-400 block">
                                  Guaranteed shortest HTM path solving all 4 White Cross edges on D
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {crossLadderMode === 'efficiency' ? (
                          <div className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 space-y-2">
                            {renderCrossArcGauge()}
                            <button
                              onClick={() => {
                                const targetCap = Math.min(8, activeCrossMoveCount || activeTierObj.moves);
                                const optimal = crossUserMoves <= targetCap;
                                emitBeep(optimal ? 920 : 420, 'sine', 0.1);
                                if (optimal) {
                                  updateActiveUserRecord((u) => ({
                                    ...u,
                                    ...advanceDailyStreakFields(u),
                                    crossClears: (u.crossClears || 0) + 1
                                  }));
                                }
                                setEfficiencyFeedback({
                                  optimal,
                                  title: optimal ? `Optimal! Solved in ${crossUserMoves} Moves` : `${crossUserMoves} Moves (Optimal: ${targetCap})`,
                                  detail: optimal ? 'Sub-8 efficiency unlocked. Keep building lookahead into your first F2L pair!' : `Try using D-layer keyhole shifts to trim ${crossUserMoves - targetCap} extra turn(s).`
                                });
                              }}
                              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                            >
                              Check My Turn Count
                            </button>
                          </div>
                        ) : (
                          <div className="relative overflow-hidden liquid-glass-card liquid-rim-muted border border-white/10 rounded-2xl p-4 sm:p-5 text-center space-y-2.5">
                            <div className="flex items-center justify-between">
                              <button type="button" onClick={() => { emitBeep(540); setActiveModal('blindPracticeHelp'); }} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[10px] font-bold active:scale-95 transition-all cursor-pointer">
                                <span className="w-3.5 h-3.5 rounded-2xl bg-orange-500/20 flex items-center justify-center text-[9px] font-black">?</span>
                                <span>How It Works</span>
                              </button>
                            </div>
                            <div className={!isProUnlocked ? 'opacity-45 select-none space-y-2' : 'space-y-2'}>
                              <h4 className="text-base font-black text-white">Blind Practice Ready</h4>
                              <p className="text-xs text-zinc-400">Plan all {activeTierObj.moves} cross moves during inspection, then execute with eyes closed.</p>
                            </div>
                            <button
                              onClick={() => {
                                if (!isProUnlocked) { openProPaywall('WCA Blindfold Timer Mat'); return; }
                                emitBeep(620); setTabForPhase('cross', 'blind');
                              }}
                              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                            >
                              {isProUnlocked ? 'Open Blindfold Timer Mat' : <><Lock className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />Unlock Blindfold Timer Mat (Pro)</>}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {phaseTabs.cross === 'blind' && (
                      <div className="relative p-4 sm:p-5 pb-28 space-y-3.5">
                        {!isProUnlocked && (
                          <div className="flex items-center justify-center p-2">
                            <div className="max-w-xs w-full rounded-2xl sm:rounded-3xl liquid-glass-card liquid-rim-amber border border-orange-500/40 p-5 text-center shadow-2xl space-y-3">
                              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-[10px] font-black uppercase tracking-widest text-orange-300"><Lock className="w-3 h-3 inline-block mr-1 -mt-0.5" />OLLDay Pro Feature</span>
                              <h3 className="text-lg font-black text-white">WCA Blindfold Timer Mat</h3>
                              <p className="text-xs text-zinc-300 leading-relaxed">Train 15-second inspection and eyes-closed execution on the dual-thumb Speedstack mat.</p>
                              <button type="button" onClick={() => openProPaywall('WCA Blindfold Timer Mat')} className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer">
                                Unlock Lifetime Pro — $5.99
                              </button>
                            </div>
                          </div>
                        )}

                        <div className={!isProUnlocked ? 'opacity-40 pointer-events-none select-none space-y-4' : 'space-y-4'}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-2xl font-black tracking-tight text-white">Blind Inspection</h2>
                            </div>
                            <button type="button" onClick={() => { emitBeep(540); setActiveModal('blindHelp'); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-[11px] font-bold active:scale-95 transition-all cursor-pointer">
                              <span className="w-4 h-4 rounded-2xl bg-orange-500/20 flex items-center justify-center text-[10px] font-black">?</span>
                              <span>How It Works</span>
                            </button>
                          </div>

                          <div className="liquid-glass-card liquid-rim-amber border border-white/10 rounded-3xl p-6 shadow-xl text-center">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">WCA Inspection Timer</span>
                            <div ref={inspectionDisplayRef} className="font-timer text-5xl font-black text-white my-3">{inspectionLeftRef.current.toFixed(1)}</div>
                            <p className="text-xs font-bold text-orange-400">
                              {blindState === 'idle' && 'Tap Start 15s Countdown to inspect'}
                              {blindState === 'inspecting' && 'Inspecting — Hold both pads 0.35s to arm'}
                              {blindState === 'readying' && 'Holding pads... keep holding'}
                              {blindState === 'armed' && 'ARMED! Release pads to close visor'}
                              {blindState === 'done' && 'Run complete — log result below'}
                            </p>
                          </div>

                          {blindState === 'idle' && (
                            <button onClick={() => { emitBeep(800); inspectionLeftRef.current = 15.0; if (inspectionDisplayRef.current) inspectionDisplayRef.current.textContent = '15.0'; setBlindState('inspecting'); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer">
                              Start 15s Countdown
                            </button>
                          )}

                          <div onContextMenu={(e) => e.preventDefault()} style={{ touchAction: 'none' }} className={`liquid-glass-well border border-white/10 rounded-3xl p-5 shadow-inner select-none transition-opacity ${blindState === 'idle' ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center mb-3">Speedstack Touch Pads (Hold Both Thumbs &amp; Release)</p>
                            <div className="grid grid-cols-2 gap-3">
                              {[{ side: 'left', label: 'LEFT THUMB', held: leftPadHeld, setHeld: setLeftPadHeld, freq: 520 }, { side: 'right', label: 'RIGHT THUMB', held: rightPadHeld, setHeld: setRightPadHeld, freq: 560 }].map((pad) => (
                                <div
                                  key={pad.side}
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    if (e.pointerType === 'mouse') { emitBeep(pad.freq, 'sine', 0.04, 0.06); setLeftPadHeld(true); setRightPadHeld(true); return; }
                                    e.currentTarget.setPointerCapture?.(e.pointerId);
                                    if (!pad.held) emitBeep(pad.freq, 'sine', 0.04, 0.06);
                                    pad.setHeld(true);
                                  }}
                                  onPointerUp={(e) => {
                                    e.preventDefault();
                                    if (e.pointerType === 'mouse') { setLeftPadHeld(false); setRightPadHeld(false); return; }
                                    pad.setHeld(false);
                                  }}
                                  onPointerCancel={() => pad.setHeld(false)}
                                  className={`h-28 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-black text-[10px] tracking-widest transition-all cursor-pointer touch-none ${
                                    blindState === 'armed' ? 'bg-green-500/25 border-green-400 text-green-300 shadow-[0_0_24px_rgba(34,197,94,0.35)] scale-[1.02]' :
                                    pad.held ? 'bg-orange-500/25 border-orange-400 text-orange-200 scale-[0.98]' : 'bg-white/[0.04] border-white/10 text-zinc-400'
                                  }`}
                                >
                                  <span>{pad.label}</span>
                                  <span className="text-[9px] font-bold opacity-80">{blindState === 'armed' ? <>READY <Check className="w-3 h-3 inline-block -mt-0.5" /></> : pad.held ? <>HOLDING <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 align-middle" /></> : 'TOUCH'}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {blindState === 'done' && (
                            <div className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-2xl p-4 space-y-2">
                              <span className="text-xs font-bold text-zinc-300 block">Log Execution Result:</span>
                              <div className="grid grid-cols-3 gap-2">
                                {['Clean', '+2', 'DNF'].map((res) => (
                                  <button
                                    key={res}
                                    onClick={() => {
                                      emitBeep(600);
                                      setBlindLogs((l) => [{ id: Date.now(), result: res, time: `${(15 - inspectionLeftRef.current).toFixed(1)}s insp` }, ...l.slice(0, 7)]);
                                      inspectionLeftRef.current = 15.0; if (inspectionDisplayRef.current) inspectionDisplayRef.current.textContent = '15.0'; setBlindState('idle');
                                    }}
                                    className="py-2.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-black text-white cursor-pointer"
                                  >
                                    {res}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {blindLogs.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Recent Runs</span>
                              {blindLogs.map((log) => (
                                <div key={log.id} className="flex items-center justify-between liquid-glass-well rounded-xl px-4 py-2 text-xs">
                                  <span className="font-bold text-white">{log.result}</span>
                                  <span className="font-mono text-zinc-400">{log.time}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {phaseTabs.cross === 'mechanics' && (
                      <div className="p-4 sm:p-5 pb-28 space-y-3.5">
                        <div>
                          <h2 className="text-2xl font-black tracking-tight text-white">4 Cross Mechanics</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {CROSS_MECHANICS.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { emitBeep(540); setActiveMechanicId(m.id); setActiveMechApproachIdx(0); setActiveMechCaseIdx(0); }}
                              className={`py-3 px-3 rounded-2xl text-xs font-black border cursor-pointer transition-all ${activeMechanicId === m.id ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 border-orange-300 shadow-md' : 'liquid-glass-card border-white/10 text-zinc-300 hover:border-white/20'}`}
                            >
                              {m.id}. {m.title}
                            </button>
                          ))}
                        </div>

                        <div className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
                          <h3 className="text-lg font-black text-white">{activeMechanicObj.title}</h3>
                          <p className="text-xs text-zinc-300 leading-relaxed">{activeMechanicObj.summary}</p>
                          <div className="liquid-glass-well border border-white/10 rounded-2xl p-3.5 font-mono text-xs font-bold text-amber-300 text-center">{activeMechanicObj.example}</div>

                          {activeMechanicObj.approaches && (() => {
                            const activeApproach = activeMechanicObj.approaches[activeMechApproachIdx] || activeMechanicObj.approaches[0];
                            const activeCase = activeApproach.cases[activeMechCaseIdx] || activeApproach.cases[0];
                            return (
                              <div className="pt-2 border-t border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-zinc-400">{activeApproach.tag}</span>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                                  {activeMechanicObj.approaches.map((app, aIdx) => (
                                    <button
                                      key={app.id} type="button"
                                      onClick={() => { emitBeep(520); setActiveMechApproachIdx(aIdx); setActiveMechCaseIdx(0); }}
                                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap cursor-pointer transition-all ${activeMechApproachIdx === aIdx ? 'bg-orange-500 text-slate-950 shadow-sm' : 'bg-white/[0.05] text-zinc-300 hover:text-white'}`}
                                    >
                                      {app.name}
                                    </button>
                                  ))}
                                </div>
                                <p className="text-[11px] text-zinc-300 leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3">{activeApproach.rule}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {activeApproach.cases.map((cItem, cIdx) => (
                                    <button
                                      key={cItem.label} type="button"
                                      onClick={() => { emitBeep(580); setActiveMechCaseIdx(cIdx); }}
                                      className={`px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer transition-all ${activeMechCaseIdx === cIdx ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300' : 'bg-transparent text-zinc-400 hover:text-white'}`}
                                    >
                                      {cItem.label.split('•')[0].trim()}
                                    </button>
                                  ))}
                                </div>
                                <div className="liquid-glass-well border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-white">{activeCase.label}</span>
                                    <div className="flex items-center gap-1">
                                      <button type="button" onClick={() => { emitBeep(540); setMechCubeRot((prev) => (prev.pitch > 15 ? { yaw: -35, pitch: -28 } : { yaw: -35, pitch: 38 })); }} className="px-2.5 py-0.5 rounded-xl bg-orange-500/15 text-[9.5px] font-black text-orange-300 cursor-pointer">
                                        {mechCubeRot.pitch > 15 ? <>Top View <RotateCw className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5" /></> : <>Bottom (D) <RotateCw className="w-2.5 h-2.5 inline-block ml-0.5 -mt-0.5" /></>}
                                      </button>
                                      <button type="button" onClick={() => { emitBeep(520); setMechCubeRot((prev) => ({ yaw: prev.yaw - 90, pitch: prev.pitch })); }} className="px-2.5 py-0.5 rounded-xl bg-white/[0.06] text-[9.5px] font-bold text-zinc-300 cursor-pointer">
                                        Spin 90°
                                      </button>
                                    </div>
                                  </div>
                                  <div className="w-36 h-36 mx-auto flex items-center justify-center">
                                    <CrossSpatial3DCube scramble={activeCase.setup} yaw={mechCubeRot.yaw} pitch={mechCubeRot.pitch} isDragging={false} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-center font-mono">
                                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-2"><span className="text-[9px] font-sans font-bold uppercase text-zinc-400 block">Setup</span><span className="text-xs font-black text-amber-300">{activeCase.setup}</span></div>
                                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2"><span className="text-[9px] font-sans font-bold uppercase text-green-300 block">Optimal Solve</span><span className="text-xs font-black text-green-300">{activeCase.solve}</span></div>
                                  </div>
                                  <p className="text-[11px] text-zinc-300 leading-relaxed">{activeCase.note}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {phaseTabs.cross === 'settings' && renderSettingsDeck()}
                  </>
                )}

                {['f2l', 'oll', 'pll'].includes(activePhase) && renderCFOPAlgorithmPhase(activePhase)}
              </div>
            </main>

            {/* RIGHT PANE: NOTATION KEY & FINGERTRICK DOSSIER (iPad, Tablet & Desktop) */}
            {renderTabletDesktopReferencePane()}
          </div>

          {/* SADDLE-NOTCHED LIQUID GLASS BOTTOM DOCK + ALL-ORANGE 3x3 LIQUID PHASE SWITCHER */}
          {(() => {
            const dw = isTwoPane ? 576 : Math.max(332, Math.min(420, (viewportDevice.width || 390) - 28));
            const dh = 68;
            const cx = dw / 2;
            const cradleHalfW = 31.5; // 26px half-switcher + 5.5px uniform side clearance
            const floorY = 41.5; // 36px switcher bottom + 5.5px uniform floor clearance (matches 5.5px side clearance)
            const lipW = 11, cornerR = 17, outerR = 20;

            const buildNotchSegments = (sx, sy, topY) => [
              `M ${sx(outerR)},${sy(topY)}`,
              `L ${sx(cx - cradleHalfW - lipW)},${sy(topY)}`,
              `C ${sx(cx - cradleHalfW - 3)},${sy(topY)} ${sx(cx - cradleHalfW)},${sy(topY + 4)} ${sx(cx - cradleHalfW)},${sy(12)}`,
              `L ${sx(cx - cradleHalfW)},${sy(floorY - cornerR)}`,
              `Q ${sx(cx - cradleHalfW)},${sy(floorY)} ${sx(cx - cradleHalfW + cornerR)},${sy(floorY)}`,
              `L ${sx(cx + cradleHalfW - cornerR)},${sy(floorY)}`,
              `Q ${sx(cx + cradleHalfW)},${sy(floorY)} ${sx(cx + cradleHalfW)},${sy(floorY - cornerR)}`,
              `L ${sx(cx + cradleHalfW)},${sy(12)}`,
              `C ${sx(cx + cradleHalfW)},${sy(topY + 4)} ${sx(cx + cradleHalfW + 3)},${sy(topY)} ${sx(cx + cradleHalfW + lipW)},${sy(topY)}`,
              `L ${sx(dw - outerR)},${sy(topY)}`
            ];

            const rimStrokePath = buildNotchSegments((x) => x, (y) => y, 0.75).join(' ');
            const nx = (x) => (x / dw).toFixed(4);
            const ny = (y) => (y / dh).toFixed(4);
            const normClipPath = [
              ...buildNotchSegments(nx, ny, 0),
              `Q ${nx(dw)},${ny(0)} ${nx(dw)},${ny(outerR)}`,
              `L ${nx(dw)},${ny(dh - outerR)}`,
              `Q ${nx(dw)},${ny(dh)} ${nx(dw - outerR)},${ny(dh)}`,
              `L ${nx(outerR)},${ny(dh)}`,
              `Q ${nx(0)},${ny(dh)} ${nx(0)},${ny(dh - outerR)}`,
              `L ${nx(0)},${ny(outerR)}`,
              `Q ${nx(0)},${ny(0)} ${nx(outerR)},${ny(0)} Z`
            ].join(' ');

            return (
              <nav className={`pointer-events-none absolute inset-x-0 bottom-0 z-40 pt-7 pb-4 ${isTwoPane ? 'px-6' : 'px-3.5'}`}>
                <div className={`pointer-events-auto relative ${isTwoPane ? 'max-w-xl mx-auto' : 'w-full'}`}>
                  {/* Liquid Pour Phase Expansion Pill (C • F • O • P) */}
                  <div
                    className={`liquid-pour-container absolute left-1/2 -top-16 z-30 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#091229]/75 border border-white/15 shadow-[0_18px_44px_rgba(0,0,0,0.85),0_0_24px_rgba(249,115,22,0.28)] ${
                      cfopMenuOpen ? 'backdrop-blur-2xl liquid-pour-open' : 'liquid-pour-closed'
                    }`}
                  >
                    {[
                      { key: 'cross', label: 'C', title: 'Cross' },
                      { key: 'f2l', label: 'F', title: 'F2L' },
                      { key: 'oll', label: 'O', title: 'OLL' },
                      { key: 'pll', label: 'P', title: 'PLL' }
                    ].map((p, idx) => {
                      const isActive = activePhase === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => {
                            emitBeep(640 + idx * 45, 'sine', 0.06);
                            setCfopMenuOpen(false);
                            setActivePhase(p.key);
                          }}
                          className={`liquid-droplet-item px-3.5 py-1.5 text-xs font-black tracking-wider cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? 'bg-gradient-to-r from-orange-500 to-amber-400 text-slate-950 shadow-[0_4px_14px_rgba(249,115,22,0.55)]'
                              : 'bg-transparent text-zinc-200 hover:bg-white/[0.1] hover:text-white'
                          }`}
                        >
                          <span>{p.label}</span>
                          <span className={`text-[9.5px] font-extrabold ${isActive ? 'text-slate-950' : 'text-zinc-200'}`}>{p.title}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Elevated All-Orange 3x3 Rubik's Cube Phase Switcher Seated Inside Saddle Notch */}
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(cfopMenuOpen ? 480 : 720, 'sine', 0.07);
                      setCfopMenuOpen((v) => !v);
                    }}
                    aria-label="Switch CFOP Phase"
                    title={`Active Phase: ${activePhase.toUpperCase()} — Tap to Switch C / F / O / P`}
                    className={`absolute left-1/2 -translate-x-1/2 -top-4 z-20 w-[52px] h-[52px] rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                      cfopMenuOpen
                        ? 'bg-gradient-to-b from-orange-500/40 to-[#16100c] border-orange-400 shadow-[0_0_28px_rgba(249,115,22,0.65)] scale-105'
                        : 'bg-gradient-to-b from-[#231812] to-[#0b0d15] border-orange-500/50 shadow-[0_8px_24px_rgba(249,115,22,0.4)] hover:border-orange-400'
                    }`}
                  >
                    <div className="grid grid-cols-3 gap-[2.5px] p-1">
                      {Array.from({ length: 9 }).map((_, sqIdx) => (
                        <span
                          key={sqIdx}
                          className={`w-[7px] h-[7px] rounded-[2px] ${
                            sqIdx === 4
                              ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]'
                              : 'bg-orange-500'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-300 leading-none">
                      {activePhase === 'cross' ? 'C' : activePhase === 'f2l' ? 'F' : activePhase === 'oll' ? 'O' : 'P'}
                    </span>
                  </button>

                  {/* SVG ClipPath for Exact Concentric Saddle-Notched Glass Bar */}
                  <svg width="0" height="0" className="absolute pointer-events-none">
                    <defs>
                      <clipPath id="olldaySaddleDockClip" clipPathUnits="objectBoundingBox">
                        <path d={normClipPath} />
                      </clipPath>
                    </defs>
                  </svg>

                  {/* High-Legibility Liquid Glass Saddle Dock */}
                  <div
                    style={{
                      clipPath: 'url(#olldaySaddleDockClip)',
                      WebkitClipPath: 'url(#olldaySaddleDockClip)'
                    }}
                    className="relative liquid-glass-dock rounded-[1.35rem] pt-2.5 pb-2.5 px-2 shadow-[0_20px_44px_rgba(0,0,0,0.85)]"
                  >
                    {/* Specular Glass Top & Notch Rim Stroke */}
                    <svg viewBox={`0 0 ${dw} ${dh}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 w-full h-full">
                      <path
                        d={rimStrokePath}
                        fill="none"
                        stroke="rgba(255,255,255,0.24)"
                        strokeWidth="1.25"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    <div className="grid grid-cols-5 items-center gap-1">
                      {(activePhase === 'cross'
                        ? [
                            { id: 'ladder', label: 'Ladder', Icon: AlignJustify },
                            { id: 'blind', label: 'Blind Run', Icon: EyeOff },
                            null,
                            { id: 'mechanics', label: 'Mechanics', Icon: Layers },
                            { id: 'settings', label: 'Settings', Icon: Settings }
                          ]
                        : [
                            { id: 'grind', label: 'The Grind', Icon: Zap },
                            { id: 'algorithms', label: 'Algorithms', Icon: Grid },
                            null,
                            { id: 'stats', label: 'Statistics', Icon: BarChart3 },
                            { id: 'settings', label: 'Settings', Icon: Settings }
                          ]
                      ).map((item, slotIdx) => {
                        if (!item) return <div key={`spacer-${slotIdx}`} className="w-full h-10 pointer-events-none" />;
                        const { id, label, Icon } = item;
                        const currentTab = phaseTabs[activePhase];
                        const isSelected = currentTab === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              emitBeep(460);
                              setCfopMenuOpen(false);
                              setTabForPhase(activePhase, id);
                            }}
                            className={`py-2 px-2 ${id === 'blind' ? 'rounded-xl md:rounded-full' : 'rounded-full'} flex flex-col items-center justify-center gap-0.5 text-[9.5px] font-black uppercase tracking-tight whitespace-nowrap transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-orange-500/22 text-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.24)]'
                                : 'text-zinc-300/85 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </nav>
            );
          })()}
        </div>

        {/* FULL-SCREEN 3x3x3 CFOP TIMER MODAL */}
        {fullTimerOpen && (
          <div onClick={handleFullTimerScreenTap} className="fixed inset-0 z-[290] bg-midnight-marble flex flex-col justify-between p-6 select-none cursor-pointer">
            <AmbientGlows
              topClass="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
              topGradient="radial-gradient(circle, rgba(249, 115, 22, 0.24) 0%, rgba(249, 115, 22, 0) 70%)"
              bottomClass="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full"
              bottomGradient="radial-gradient(circle, rgba(234, 88, 12, 0.16) 0%, rgba(234, 88, 12, 0) 70%)"
            />

            <div onClick={(e) => e.stopPropagation()} className="relative z-10 max-w-md w-full mx-auto space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">OLLDay Everyday • 3x3x3 CFOP Timer</span>
                <button type="button" onClick={() => { emitBeep(440); setFullTimerState('idle'); setFullTimerOpen(false); }} className="w-9 h-9 rounded-xl bg-transparent hover:bg-white/[0.08] text-white font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
              </div>
              {fullTimerState !== 'running' && (
                <div className="rounded-2xl liquid-glass-card liquid-rim-muted border border-white/15 p-3.5 text-center">
                  <p className="font-mono text-xs sm:text-sm font-bold text-white leading-relaxed">{fullScramble}</p>
                  <button type="button" onClick={() => { emitBeep(540); setFullScramble(generate3x3Scramble(20)); }} className="mt-1.5 text-[10px] font-black uppercase tracking-wider text-orange-300 hover:text-white cursor-pointer">New Scramble <RotateCw className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></button>
                </div>
              )}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center">
              <div ref={fullTimerDisplayRef} className={`font-timer text-7xl sm:text-8xl font-black tracking-tight transition-colors ${fullTimerState === 'running' ? 'text-green-400' : 'text-white'}`}>
                {(fullFinalMsRef.current / 1000).toFixed(2)}
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60 mt-3">{fullTimerState === 'running' ? 'Tap or Press Space to Stop' : 'Tap or Press Space to Start'}</p>
            </div>

            <div onClick={(e) => e.stopPropagation()} className="relative z-10 max-w-md w-full mx-auto space-y-2.5">
              {fullTimerState === 'stopped' && currentUser.fullSolveHistory?.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => toggleFullSolvePenalty('+2')} className={`py-2.5 rounded-2xl border text-xs font-black cursor-pointer ${currentUser.fullSolveHistory[0]?.penalty === '+2' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-white/[0.08] text-amber-300'}`}>+2</button>
                  <button type="button" onClick={() => toggleFullSolvePenalty('DNF')} className={`py-2.5 rounded-2xl border text-xs font-black cursor-pointer ${currentUser.fullSolveHistory[0]?.penalty === 'DNF' ? 'bg-red-500 text-white border-red-400' : 'bg-white/[0.08] text-red-300'}`}>DNF</button>
                  <button type="button" onClick={deleteLastFullSolve} className="py-2.5 rounded-2xl bg-white/[0.08] text-xs font-bold text-zinc-300 hover:text-white cursor-pointer">Delete</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl liquid-glass-card liquid-rim-muted border border-white/15 p-3.5 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">Ao5</span><span className="font-mono text-xl font-black text-green-400">{ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}</span></div>
                <div className="rounded-2xl liquid-glass-card liquid-rim-muted border border-white/15 p-3.5 text-center"><span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">Ao12</span><span className="font-mono text-xl font-black text-sky-400">{ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* LANDING HERO & ONBOARDING GATE */}
        {authScreenOpen && (() => {
          const HERO_CFOP_REEL = [
            {
              phase: 'C • CROSS',
              title: '8-Move White Cross',
              metric: '3D Orbit + Blind Mat',
              scramble: "R' F R D'",
              yaw: -35 + landingStepIdx * 90,
              pitch: 36,
              mode: 'cross'
            },
            {
              phase: 'F • F2L',
              title: '41 Pair Setups in 3D',
              metric: 'Isolated Slot Drills',
              scramble: "R U' R' U'",
              yaw: -35 + landingStepIdx * 90,
              pitch: -24,
              mode: 'f2l'
            },
            {
              phase: 'O • OLL',
              title: '57 One-Look Shapes (Sune)',
              metric: 'Inline Trigger Tags',
              scramble: "R U2 R' U' R U' R'",
              yaw: -35 + landingStepIdx * 90,
              pitch: -32,
              mode: 'full'
            },
            {
              phase: 'P • PLL',
              title: '25 Last-Layer Perms (T-Perm)',
              metric: 'Ao5 • Ao12 • PB Goals',
              scramble: "F R U' R' U R U R2 F' R U R U' R'",
              yaw: -35 + landingStepIdx * 90,
              pitch: -28,
              mode: 'full'
            }
          ];
          const activeReel = HERO_CFOP_REEL[landingStepIdx % HERO_CFOP_REEL.length];
          const savedAccountKeys = Array.from(new Set(['Demo', ...deviceAccountKeys.filter((k) => Boolean(users[k]))])).filter((k) => Boolean(users[k]));

          return (
            <div className="fixed inset-0 z-[255] bg-midnight-marble flex flex-col justify-between overflow-y-auto no-scrollbar">
              {/* Looping 3D CFOP Spatial Showcase Backdrop */}
              <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div
                  className="absolute -top-24 left-1/2 -translate-x-1/2 w-[540px] h-[540px] rounded-full opacity-90"
                  style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.28) 0%, rgba(168, 85, 247, 0.09) 45%, rgba(5, 5, 7, 0) 72%)' }}
                />
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[480px] h-[340px] rounded-full opacity-80"
                  style={{ background: 'radial-gradient(circle, rgba(234, 88, 12, 0.18) 0%, rgba(5, 5, 7, 0) 70%)' }}
                />
                {/* Subtle Architectural Grid Lines */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)',
                    backgroundSize: '44px 44px',
                    maskImage: 'radial-gradient(circle at 50% 35%, black 20%, transparent 78%)',
                    WebkitMaskImage: 'radial-gradient(circle at 50% 35%, black 20%, transparent 78%)'
                  }}
                />
              </div>

              {/* Minimal Landing Top Bar */}
              <div className="relative z-10 w-full max-w-md md:max-w-2xl mx-auto px-5 pt-5 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500/25 via-white/10 to-purple-500/15 border border-white/25 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.32)]">
                    <SuneEmblemSvg className="w-full h-full" />
                  </div>
                  <span className="text-sm font-black tracking-tight text-white">
                    OLLDay <span className="text-orange-400">Everyday</span>
                  </span>
                </div>

                {authMode === 'landing' ? (
                  <button
                    type="button"
                    onClick={() => { emitBeep(520); setAuthErrorMsg(''); setAuthMode('signin'); }}
                    className="px-3.5 py-1.5 rounded-xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-200 transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { emitBeep(460); setAuthErrorMsg(''); setAuthMode('landing'); }}
                    className="px-3.5 py-1.5 rounded-xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />Back
                  </button>
                )}
              </div>

              {/* Main Hero & Action Stage */}
              <div className="relative z-10 w-full max-w-md md:max-w-lg mx-auto px-5 my-auto py-4 flex flex-col items-center">
                {authMode === 'landing' && (
                  <div className="w-full flex flex-col items-center text-center space-y-5">
                    {/* Looping 3D Cube Showcase Stage (Simulates Live Video Reel) */}
                    <div className="relative w-full max-w-[310px] rounded-3xl liquid-glass-card liquid-rim-amber border border-orange-500/30 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.4)] overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[9.5px] font-black uppercase tracking-widest text-orange-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.9)]" />
                          {activeReel.phase}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-zinc-400">{activeReel.metric}</span>
                      </div>

                      <div className="relative h-36 flex items-center justify-center hero-cube-float">
                        <div
                          className="pointer-events-none absolute w-32 h-32 rounded-full"
                          style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.24) 0%, rgba(249, 115, 22, 0) 70%)' }}
                        />
                        {activeReel.mode === 'cross' ? (
                          <CrossSpatial3DCube scramble={activeReel.scramble} yaw={activeReel.yaw} pitch={activeReel.pitch} isDragging={false} />
                        ) : activeReel.mode === 'f2l' ? (
                          <F2LSpatial3DCube setupScramble={activeReel.scramble} yaw={activeReel.yaw} pitch={activeReel.pitch} isDragging={false} />
                        ) : (
                          <Spatial3DCube stickers={simulateCrossCubeState(activeReel.scramble)} yaw={activeReel.yaw} pitch={activeReel.pitch} isDragging={false} />
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/10">
                        <span className="text-xs font-black text-white">{activeReel.title}</span>
                        <div className="flex items-center gap-1">
                          {HERO_CFOP_REEL.map((item, idx) => (
                            <button
                              key={item.phase}
                              type="button"
                              aria-label={`Preview ${item.phase}`}
                              onClick={() => { emitBeep(520); setLandingStepIdx(idx); }}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                landingStepIdx === idx ? 'w-4 bg-orange-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Strong Headline & Value Proposition */}
                    <div className="space-y-2.5 px-1">
                      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-[1.08]">
                        Master CFOP in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">10 Minutes a Day.</span>
                      </h1>
                      <p className="text-xs sm:text-sm text-zinc-300/90 max-w-sm mx-auto leading-relaxed">
                        Interactive 3D Cross &amp; F2L drills, 123 bite-sized algorithms with inline fingertricks, and millisecond PB tracking.
                      </p>
                    </div>

                    {/* Single Prominent Sign-Up CTA */}
                    <div className="w-full max-w-xs space-y-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => { emitBeep(720, 'sine', 0.08); setAuthErrorMsg(''); setAuthMode('signup'); }}
                        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_34px_rgba(249,115,22,0.42)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Start Training Free <ArrowRight className="w-4 h-4 inline-block ml-1 -mt-0.5" />
                      </button>
                      <p className="text-[11px] text-zinc-400">
                        Already have a solver profile?{' '}
                        <button
                          type="button"
                          onClick={() => { emitBeep(520); setAuthErrorMsg(''); setAuthMode('signin'); }}
                          className="font-bold text-orange-300 hover:text-orange-200 underline underline-offset-2 cursor-pointer"
                        >
                          Sign in
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {authMode === 'signup' && (
                  <div className="w-full max-w-sm">
                    <div className="relative overflow-hidden rounded-3xl liquid-glass-uv border border-white/25 p-6 space-y-4">
                      <div className="text-center space-y-1">
                        <span className="inline-block px-3 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-[9.5px] font-black uppercase tracking-widest text-orange-300">
                          Free Solver Profile
                        </span>
                        <h2 className="text-xl font-black tracking-tight text-white">Create Your Account</h2>
                        <p className="text-xs text-zinc-300/80">Save your daily CFOP streak, custom algorithms, and PBs</p>
                      </div>

                      <SocialAuthButtons
                        onGoogle={handleGoogleSignIn}
                        onGameCenter={handleGameCenterSignIn}
                        isNativeIos={isNativeIosApp}
                      />

                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={authNameInput}
                          onChange={(e) => { setAuthErrorMsg(''); setAuthNameInput(e.target.value); }}
                          placeholder="Solver Name (e.g., Alex)"
                          className="w-full rounded-2xl liquid-glass-uv-well px-4 py-3 text-xs font-bold text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400/60"
                        />
                        <input
                          type="email"
                          value={authEmailInput}
                          onChange={(e) => { setAuthErrorMsg(''); setAuthEmailInput(e.target.value); }}
                          placeholder="Email for Cross-Device Sync (Optional)"
                          className="w-full rounded-2xl liquid-glass-uv-well px-4 py-3 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400/60"
                        />
                        <input
                          type="password"
                          value={authPasswordInput}
                          onChange={(e) => { setAuthErrorMsg(''); setAuthPasswordInput(e.target.value); }}
                          placeholder={authEmailInput.trim() ? 'Password (6+ characters)' : 'Password (Required if Email entered)'}
                          className="w-full rounded-2xl liquid-glass-uv-well px-4 py-3 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400/60"
                        />
                        <p className="text-[10px] text-zinc-300/75 px-1">
                          Add <strong className="text-white">Email + Password</strong> to sync across phone &amp; desktop, or leave blank for a device-only profile.
                        </p>
                      </div>

                      {authErrorMsg && <p className="text-[11px] font-bold text-rose-300 text-center">{authErrorMsg}</p>}

                      <button
                        type="button"
                        disabled={authBusy}
                        onClick={handleEmailPasswordSignUp}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_28px_rgba(249,115,22,0.32)] disabled:opacity-60 cursor-pointer"
                      >
                        {authBusy ? 'Creating Account…' : 'Create Account & Start'}
                      </button>

                      <p className="text-center text-[11px] text-zinc-400">
                        Already registered?{' '}
                        <button
                          type="button"
                          onClick={() => { emitBeep(520); setAuthErrorMsg(''); setAuthInfoMsg(''); setAuthPasswordInput(''); setAuthMode('signin'); }}
                          className="font-bold text-orange-300 hover:underline cursor-pointer"
                        >
                          Sign In
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {authMode === 'signin' && (
                  <div className="w-full max-w-sm">
                    <div className="relative overflow-hidden rounded-3xl liquid-glass-uv border border-white/25 p-6 space-y-4">
                      <div className="text-center space-y-1">
                        <h2 className="text-xl font-black tracking-tight text-white">Welcome Back</h2>
                        <p className="text-xs text-zinc-300/80">Choose a saved profile on this device or sign in</p>
                      </div>

                      <SocialAuthButtons
                        onGoogle={handleGoogleSignIn}
                        onGameCenter={handleGameCenterSignIn}
                        isNativeIos={isNativeIosApp}
                      />

                      <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                        {savedAccountKeys.map((uKey) => {
                          const uData = sanitizeUserRecord(users[uKey]);
                          return (
                            <button
                              key={uKey} type="button"
                              onClick={() => { emitBeep(720, 'sine', 0.08); registerDeviceAccount(uKey); setActiveUserKey(uKey); setAuthNameInput(''); setAuthEmailInput(''); setAuthPasswordInput(''); setAuthErrorMsg(''); setAuthInfoMsg(''); setAuthScreenOpen(false); }}
                              className="w-full p-3.5 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/15 hover:border-orange-400/50 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer"
                            >
                              <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-black text-white">{String(uKey)}</span>
                                  {uData.isPro && <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-[9px] font-black text-orange-300">PRO</span>}
                                </div>
                                <span className="text-[10px] text-zinc-300/80">F2L D{uData.f2lDay} • OLL D{uData.day} • PLL D{uData.pllDay}</span>
                              </div>
                              <span className="text-xs font-black text-orange-300 inline-flex items-center gap-1">Continue <ArrowRight className="w-3.5 h-3.5" /></span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-white/15 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300/80">Sign In With Email &amp; Password</span>
                          <button
                            type="button"
                            disabled={authBusy}
                            onClick={handlePasswordReset}
                            className="text-[10px] font-bold text-orange-300 hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <input
                          type="email"
                          value={authEmailInput}
                          onChange={(e) => { setAuthErrorMsg(''); setAuthInfoMsg(''); setAuthEmailInput(e.target.value); }}
                          placeholder="Email (or local Solver Name)"
                          className="w-full rounded-2xl liquid-glass-uv-well px-4 py-2.5 text-xs font-bold text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400/60"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="password"
                            value={authPasswordInput}
                            onChange={(e) => { setAuthErrorMsg(''); setAuthInfoMsg(''); setAuthPasswordInput(e.target.value); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleEmailPasswordSignIn(); }}
                            placeholder="Password"
                            className="flex-1 rounded-2xl liquid-glass-uv-well px-4 py-2.5 text-xs font-bold text-white placeholder-zinc-400 focus:outline-none focus:border-orange-400/60"
                          />
                          <button
                            type="button"
                            disabled={authBusy}
                            onClick={handleEmailPasswordSignIn}
                            className="px-4 py-2.5 rounded-2xl bg-white/[0.12] hover:bg-white/[0.2] text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] disabled:opacity-60 cursor-pointer"
                          >
                            {authBusy ? '…' : 'Sign In'}
                          </button>
                        </div>
                        {authErrorMsg && <p className="text-[11px] font-bold text-rose-300 text-center">{authErrorMsg}</p>}
                        {authInfoMsg && <p className="text-[11px] font-bold text-green-300 text-center">{authInfoMsg}</p>}
                      </div>

                      <p className="text-center text-[11px] text-zinc-400">
                        New to OLLDay?{' '}
                        <button
                          type="button"
                          onClick={() => { emitBeep(520); setAuthErrorMsg(''); setAuthInfoMsg(''); setAuthPasswordInput(''); setAuthMode('signup'); }}
                          className="font-bold text-orange-300 hover:underline cursor-pointer"
                        >
                          Create Account
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Minimal Social Proof / Feature Strip Footer */}
              <div className="relative z-10 w-full max-w-md mx-auto px-5 pb-5 pt-2 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span>123 CFOP Cases</span>
                <span>•</span>
                <span>AI Cube Scanner</span>
                <span>•</span>
                <span>WCA Timer</span>
              </div>
            </div>
          );
        })()}

        {/* CONSOLIDATED QUICK-START MODAL */}
        {(activeModal === 'cfopExperienceChoice' || activeModal === 'guidedTour') && (
          <UvModalShell onClose={() => { emitBeep(440); setActiveModal(null); }} zClass="z-[272]" maxWidth="max-w-sm" className="p-6 space-y-4 text-center">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-[10px] font-black uppercase tracking-widest text-orange-300">
                  Quick-Start • {String(activeUserKey || 'Solver')}
                </span>
                <button
                  type="button"
                  onClick={() => { emitBeep(440); setActiveModal(null); }}
                  className="px-3 py-1 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-bold text-zinc-200 cursor-pointer"
                >
                  Skip <X className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
                </button>
              </div>

              <div className="relative h-32 flex items-center justify-center hero-cube-float">
                <div
                  className="pointer-events-none absolute w-28 h-28 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(249, 115, 22, 0.28) 0%, rgba(249, 115, 22, 0) 70%)' }}
                />
                <CrossSpatial3DCube scramble="R' F R D'" yaw={-35} pitch={34} isDragging={false} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">Where Is Your CFOP Level?</h3>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Pick your starting stage—we&apos;ll route you directly to the right training deck.
                </p>
              </div>

              <div className="space-y-2 pt-1 text-left">
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(760, 'sine', 0.08);
                    setActivePhase('cross');
                    setTabForPhase('cross', 'ladder');
                    setCrossTier(1);
                    setActiveModal(null);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 shadow-lg shadow-orange-500/25 cursor-pointer transition-all"
                >
                  <span className="text-xs font-black uppercase tracking-wider block">1. Brand New to 3×3 (Cross) <ArrowRight className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></span>
                  <span className="text-[10.5px] font-bold opacity-85 block mt-0.5">
                    Start at Cross in X (Level 1) to build your white cross intuition first.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    emitBeep(680, 'sine', 0.08);
                    setActivePhase('f2l');
                    setTabForPhase('f2l', 'grind');
                    setActiveModal(null);
                  }}
                  className="w-full p-3.5 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 text-white cursor-pointer transition-all"
                >
                  <span className="text-xs font-black uppercase tracking-wider block">2. Know Layer-by-Layer (F2L) <ArrowRight className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></span>
                  <span className="text-[10.5px] text-zinc-200 block mt-0.5">
                    Jump into F2L Day 1 Guided Lesson to pair corners &amp; edges fast.
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(700, 'sine', 0.08);
                      setActivePhase('oll');
                      setTabForPhase('oll', 'grind');
                      setActiveModal(null);
                    }}
                    className="p-3.5 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 text-white cursor-pointer transition-all"
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 block">3. OLL <ArrowRight className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></span>
                    <span className="text-[10px] text-zinc-200 block mt-0.5 leading-snug">
                      Know F2L; train 57 yellow top shapes.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(720, 'sine', 0.08);
                      setActivePhase('pll');
                      setTabForPhase('pll', 'grind');
                      setActiveModal(null);
                    }}
                    className="p-3.5 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 text-white cursor-pointer transition-all"
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-orange-300 block">4. PLL <ArrowRight className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></span>
                    <span className="text-[10px] text-zinc-200 block mt-0.5 leading-snug">
                      Know OLL; finish with 21+ perms.
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => { emitBeep(640); setActiveModal('newToCfop'); }}
                  className="py-2 px-3 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-black uppercase tracking-wider text-amber-300 cursor-pointer"
                >
                  Why CFOP? <ArrowRight className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { emitBeep(640); setActiveModal('appTutorial'); }}
                  className="py-2 px-3 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-black uppercase tracking-wider text-purple-200 cursor-pointer"
                >
                  App Tutorial <ArrowRight className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
                </button>
              </div>
          </UvModalShell>
        )}

        {/* NEW TO CFOP — UV-COATED LIQUID GLASS OVERLAY */}
        {activeModal === 'newToCfop' && (
          <UvModalShell onClose={() => { emitBeep(440); setActiveModal(null); }}>
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/45 text-[10px] font-black uppercase tracking-widest text-orange-200">
                  CFOP Blueprint • Sub-15 Architecture
                </span>
                <button
                  type="button"
                  onClick={() => { emitBeep(440); setActiveModal(null); }}
                  className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-white leading-tight">Why CFOP Is the Gold Standard of Speedcubing</h3>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Beginner layer-by-layer methods take <strong className="text-white">100–130 moves</strong> because they solve one piece at a time. <strong className="text-amber-300">CFOP</strong> compresses the entire solve into <strong className="text-white">~55 ergonomic moves</strong> across 4 streamlined stages—the exact system used to set world records.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { badge: 'C', title: 'Cross (≤8 Moves)', desc: 'Solve all 4 white bottom edges simultaneously during inspection without peeking at the bottom.' },
                  { badge: 'F', title: 'F2L — First Two Layers (41 Cases)', desc: 'Pair bottom corners with middle-layer edges simultaneously, cutting solve steps in half.' },
                  { badge: 'O', title: 'OLL — Orient Last Layer (57 Cases)', desc: 'Turn the entire top face solid yellow in a single 1-look algorithm burst.' },
                  { badge: 'P', title: 'PLL — Permute Last Layer (21+ Cases)', desc: 'Swap all top corners and edges into their solved homes in one final trigger sequence.' }
                ].map((stage) => (
                  <div key={stage.badge} className="liquid-glass-uv-well border border-white/15 rounded-2xl p-3 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {stage.badge}
                    </span>
                    <div>
                      <span className="text-xs font-black text-white block">{stage.title}</span>
                      <p className="text-[11px] text-zinc-200/90 leading-snug mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="liquid-glass-uv-well border border-orange-400/35 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-300 block">
                  How OLLDay Makes All 123 Cases Effortless
                </span>
                <p className="text-[11px] text-zinc-200 leading-relaxed">
                  Instead of overwhelming you with 123 raw algorithms, OLLDay splits CFOP into <strong className="text-white">4–8 case micro-chunks</strong>, maps <strong className="text-amber-300">3D interactive setups</strong> so you never misread an angle, highlights <strong className="text-orange-300">inline fingertrick triggers</strong>, and verifies your real cube anytime with the <strong className="text-white">AI Camera Scanner</strong>.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { emitBeep(640); setActiveModal('appTutorial'); }}
                  className="py-3 px-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-[11px] font-black text-white cursor-pointer"
                >
                  Next: App Tutorial <ArrowRight className="w-3 h-3 inline-block ml-0.5 -mt-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(760, 'sine', 0.08);
                    setActivePhase('cross');
                    setTabForPhase('cross', 'ladder');
                    setCrossTier(1);
                    setActiveModal(null);
                  }}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Start Cross L1 <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                </button>
              </div>
          </UvModalShell>
        )}

        {/* APP TUTORIAL — UV-COATED LIQUID GLASS OVERLAY */}
        {activeModal === 'appTutorial' && (
          <UvModalShell onClose={() => { emitBeep(440); setActiveModal(null); }}>
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/45 text-[10px] font-black uppercase tracking-widest text-purple-200">
                  App Tutorial • Mastery System
                </span>
                <button
                  type="button"
                  onClick={() => { emitBeep(440); setActiveModal(null); }}
                  className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-white font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white leading-tight">How OLLDay Trains Muscle Memory</h3>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  Every tool in OLLDay is engineered around short, focused daily reps that lock recognition and execution into reflex.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="liquid-glass-uv-well border border-white/15 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-orange-300 block">
                    1. The 4-Day Daily Session Loop (The Grind)
                  </span>
                  <p className="text-[11px] text-zinc-200 leading-relaxed">
                    <strong className="text-white">Day 1 (Learn):</strong> Introduces a small chunk in order with 3D previews and grip cues. <strong className="text-white">Days 2 &amp; 3 (Random Drill):</strong> Shuffles those cases to build instant recognition. Every 2 chunks triggers a <strong className="text-amber-300">Cumulative Review Day</strong> so older algorithms never fade.
                  </p>
                </div>

                <div className="liquid-glass-uv-well border border-white/15 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                    2. Getting the Most Out of Cross in X
                  </span>
                  <p className="text-[11px] text-zinc-200 leading-relaxed">
                    Start in <strong className="text-white">Move Efficiency</strong> to solve 2–6 move scrambles without peeking at the bottom—drag the 3D cube to verify your white edges, then log your turn count to beat the target cap. Once comfortable, switch to <strong className="text-orange-300">Blind Practice</strong> (15s WCA inspection + dual-thumb Speedstack pads) and study the <strong className="text-white">4 Cross Mechanics</strong> (Color Orbit, Good/Bad Edges, Keyhole &amp; X-Cross).
                  </p>
                </div>

                <div className="liquid-glass-uv-well border border-white/15 rounded-2xl p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 block">
                    3. Tap-to-Time PBs, Cube Scanner &amp; Phase Cube
                  </span>
                  <p className="text-[11px] text-zinc-200 leading-relaxed">
                    Tap anywhere during a drill (or press <strong className="text-white">Spacebar</strong>) to record millisecond case PBs toward your custom goal. Use <strong className="text-orange-300">Scan Cube</strong> in the header to get a live 4-stage solve roadmap from any scramble, and tap the <strong className="text-white">Orange 3×3 Cube</strong> on the bottom dock to switch between <strong className="text-amber-300">C • F • O • P</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { emitBeep(640); setActiveModal('newToCfop'); }}
                  className="py-3 px-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-[11px] font-black text-white cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />New to CFOP
                </button>
                <button
                  type="button"
                  onClick={() => { emitBeep(760, 'sine', 0.08); setActiveModal(null); }}
                  className="py-3 px-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Got It, Let&apos;s Train <Check className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                </button>
              </div>
          </UvModalShell>
        )}

        {/* CUBE SCANNER MODAL */}
        {scannerOpen && (() => {
          const FACE_CAPTURE_SPECS = {
            U: { title: 'Top Face (U • Yellow Center)', short: 'Top (U)', accent: '#facc15', topEdge: '▲ BLUE (BACK)', bottomEdge: '▼ GREEN (FRONT)', leftEdge: '◀ RED', rightEdge: 'ORANGE ▶', instruction: 'Tilt Yellow (U) straight toward camera: Blue edge on TOP, Green edge on BOTTOM, Red LEFT, Orange RIGHT.' },
            F: { title: 'Front Face (F • Green Center)', short: 'Front (F)', accent: '#22c55e', topEdge: '▲ YELLOW (TOP)', bottomEdge: '▼ WHITE (BOTTOM)', leftEdge: '◀ RED', rightEdge: 'ORANGE ▶', instruction: 'Hold Green (F) straight toward camera: Yellow on TOP, White on BOTTOM, Red LEFT, Orange RIGHT.' },
            R: { title: 'Right Face (R • Orange Center)', short: 'Right (R)', accent: '#f97316', topEdge: '▲ YELLOW (TOP)', bottomEdge: '▼ WHITE (BOTTOM)', leftEdge: '◀ GREEN', rightEdge: 'BLUE ▶', instruction: 'Turn cube so Orange (R) faces camera: Yellow TOP, White BOTTOM, Green LEFT, Blue RIGHT.' },
            D: { title: 'Bottom Face (D • White Center)', short: 'Bottom (D)', accent: '#f8fafc', topEdge: '▲ GREEN (FRONT)', bottomEdge: '▼ BLUE (BACK)', leftEdge: '◀ RED', rightEdge: 'ORANGE ▶', instruction: 'Tilt bottom up (x) so White (D) faces camera: Green edge on TOP, Blue edge on BOTTOM, Red LEFT, Orange RIGHT.' },
            B: { title: 'Back Face (B • Blue Center)', short: 'Back (B)', accent: '#3b82f6', topEdge: '▲ YELLOW (TOP)', bottomEdge: '▼ WHITE (BOTTOM)', leftEdge: '◀ ORANGE', rightEdge: 'RED ▶', instruction: 'Turn cube 180° (y2) so Blue (B) faces camera: Yellow TOP, White BOTTOM, Orange LEFT, Red RIGHT.' },
            L: { title: 'Left Face (L • Red Center)', short: 'Left (L)', accent: '#ef4444', topEdge: '▲ YELLOW (TOP)', bottomEdge: '▼ WHITE (BOTTOM)', leftEdge: '◀ BLUE', rightEdge: 'GREEN ▶', instruction: 'Turn cube so Red (L) faces camera: Yellow TOP, White BOTTOM, Blue LEFT, Green RIGHT.' }
          };
          const currentSpec = FACE_CAPTURE_SPECS[scannerCaptureStep] || FACE_CAPTURE_SPECS.U;
          const capturedCount = Object.keys(scannerCapturedThumbs).length;
          const analysis = scannerAnalysis;

          const hasFront3Captured = Boolean(scannerCapturedThumbs.U && scannerCapturedThumbs.F && scannerCapturedThumbs.R);
          const needsBackFacesRecommendation = !scannerHasFull6Faces && (scannerThreeFaceHints.crossSolved === false || ['none', 'some'].includes(scannerThreeFaceHints.f2lCompletedStatus));
          const stagesList = analysis && Array.isArray(analysis.cfopStages) ? analysis.cfopStages : null;
          const activeFocusedIdx = stagesList ? Math.min(scannerFocusedStageIdx, stagesList.length - 1) : 0;
          const focusedStage = stagesList ? stagesList[activeFocusedIdx] : null;
          const baseMatched = focusedStage?.caseObj || analysis?.matchedCase || null;
          const activeStagePhase = focusedStage?.phaseKey || analysis?.phase || 'cross';
          const activeVerification = scannerStageVerification?.stagePhase === activeStagePhase ? scannerStageVerification : null;
          const matched = activeVerification?.caseObj || baseMatched;
          const activeStageTitle = matched
            ? (activeVerification?.caseObj
                ? (focusedStage ? `${focusedStage.stage}: ${activeVerification.caseObj.name}` : activeVerification.caseObj.name)
                : (focusedStage ? `${focusedStage.stage}: ${focusedStage.label}` : matched.name))
            : '';
          const activeStageAlg = activeVerification?.alg || (focusedStage ? focusedStage.alg : matched?.alg || '');
          const activeStageFingertrick = activeVerification?.caseObj?.fingertrick || (focusedStage ? focusedStage.fingertrick : matched?.fingertrick || '');
          const activeStageOrientationTip = activeVerification?.orientationTip || focusedStage?.orientationTip || analysis?.orientationTip || (matched ? buildOrientationTipForStage(activeStagePhase, matched, activeStageAlg, analysis?.aufHint) : '');
          const activeStageTags = activeStageAlg ? getAlgorithmTriggerTags(activeStageAlg) : [];
          const activeSubSteps = activeVerification?.subSteps || focusedStage?.subSteps;
          const nextCase = analysis?.nextUpCase || null;
          const activePreviewImg = scannerCapturedThumbs[scannerCaptureStep] || null;
          const visibleFaceList = scannerHasFull6Faces
            ? [{ key: 'U', title: 'Top (U)', top: 'B', bottom: 'G', left: 'R', right: 'O' }, { key: 'F', title: 'Front (F)', top: 'Y', bottom: 'W', left: 'R', right: 'O' }, { key: 'R', title: 'Right (R)', top: 'Y', bottom: 'W', left: 'G', right: 'B' }, { key: 'D', title: 'Bottom (D)', top: 'G', bottom: 'B', left: 'R', right: 'O' }, { key: 'B', title: 'Back (B)', top: 'Y', bottom: 'W', left: 'O', right: 'R' }, { key: 'L', title: 'Left (L)', top: 'Y', bottom: 'W', left: 'B', right: 'G' }]
            : [{ key: 'U', title: 'Top (U)', top: 'B', bottom: 'G', left: 'R', right: 'O' }, { key: 'F', title: 'Front (F)', top: 'Y', bottom: 'W', left: 'R', right: 'O' }, { key: 'R', title: 'Right (R)', top: 'Y', bottom: 'W', left: 'G', right: 'B' }];

          const renderEdgeDot = (code, dirLabel) => (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-zinc-400" title={`${dirLabel} neighbor: ${SCANNER_COLOR_META[code]?.label || code}`}>
              <span style={{ backgroundColor: SCANNER_COLOR_META[code]?.hex || '#64748b' }} className="w-1.5 h-1.5 rounded-full inline-block border border-black/40" />
              {code}
            </span>
          );

          const stickerCounts = { Y: 0, W: 0, G: 0, B: 0, O: 0, R: 0 };
          visibleFaceList.forEach(({ key }) => (scannedFaces[key] || []).forEach((code) => { if (stickerCounts[code] !== undefined) stickerCounts[code] += 1; }));
          const overflowColors = Object.entries(stickerCounts).filter(([, cnt]) => cnt > 9);
          const sixFaceMismatch = scannerHasFull6Faces && Object.entries(stickerCounts).filter(([, cnt]) => cnt !== 9);
          const posLabels = ['Top-Left Corner', 'Top Edge', 'Top-Right Corner', 'Left Edge', 'Center', 'Right Edge', 'Bottom-Left Corner', 'Bottom Edge', 'Bottom-Right Corner'];

          return (
            <div className="fixed inset-0 z-[285] bg-midnight-marble flex justify-center overflow-hidden">
              <div className="w-full max-w-md md:max-w-3xl h-[100dvh] bg-midnight-marble border-x border-white/10 shadow-2xl flex flex-col">
                <div className="px-4 pt-4 pb-3 border-b border-white/[0.08] bg-[#071127]/95 flex items-center justify-between flex-shrink-0">
                  <div>
                    <h2 className="text-lg font-black text-white">Cube Scanner &amp; Solver</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => { emitBeep(520); setScannerAutoSnap((v) => !v); }} className={`px-3 py-1 rounded-xl text-[9.5px] font-black uppercase cursor-pointer ${scannerAutoSnap ? 'bg-green-500/20 text-green-300' : 'bg-white/[0.06] text-zinc-400'}`}>
                      {scannerAutoSnap ? 'Auto-Snap ON' : 'Manual Snap'}
                    </button>
                    <button type="button" onClick={() => { emitBeep(440); stopScannerCamera(); setScannerOpen(false); }} className="w-9 h-9 rounded-xl bg-white/[0.08] text-zinc-200 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 space-y-3">
                  <div className="grid grid-cols-6 gap-1">
                    {(['U', 'F', 'R', 'D', 'B', 'L']).map((fKey) => {
                      const isDone = Boolean(scannerCapturedThumbs[fKey]);
                      const isCurrent = scannerCaptureStep === fKey;
                      return (
                        <button
                          key={fKey} type="button"
                          onClick={() => {
                            emitBeep(540);
                            setSelectedStickerEdit(null);
                            setScannerCaptureStep(fKey);
                            setScannerLivePreviewCodes(null);
                            setScannerStabilityCount(0);
                            setScannerCubeDetected(false);
                            liveStableSignatureRef.current = '';
                            liveStableStreakRef.current = 0;
                            if (!scannerCapturedThumbs[fKey]) startScannerCamera(fKey, false);
                          }}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase border transition-all cursor-pointer ${isCurrent ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-sm' : isDone ? 'bg-green-500/15 text-green-300 border-green-500/35' : 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1]'}`}
                        >
                          {isDone ? <>{fKey} <Check className="w-2.5 h-2.5 inline-block -mt-0.5" /></> : fKey}
                        </button>
                      );
                    })}
                  </div>

                  <div className="liquid-glass-card liquid-rim-muted rounded-2xl px-3.5 py-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Cube Finish</span>
                      <div className="bg-white/[0.05] p-0.5 rounded-xl flex items-center">
                        {[{ key: 'uv', label: 'UV Glossy' }, { key: 'matte', label: 'Matte Finish' }].map((fin) => (
                          <button
                            key={fin.key} type="button"
                            onClick={() => {
                              emitBeep(540); setScannerSurfaceFinish(fin.key);
                              if (Object.keys(scannerRawSamples).length > 0) setScannedFaces((prev) => classifyCapturedFaceBatch(scannerRawSamples, prev, scannerLockedFaces, savedCubePalette));
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[9.5px] font-black uppercase cursor-pointer transition-all ${scannerSurfaceFinish === fin.key ? 'bg-orange-500 text-slate-950' : 'text-zinc-400 hover:text-white'}`}
                          >
                            {fin.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-white">{currentSpec.title}</span>
                        <span className="text-[9.5px] font-bold text-orange-300">{scannerFramingHint}</span>
                      </div>
                      <p className="text-[10.5px] text-zinc-300 leading-snug">{currentSpec.instruction}</p>
                    </div>
                  </div>

                  <div ref={scannerViewfinderRef} className="relative w-[260px] h-[260px] shrink-0 mx-auto rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-white/15 shadow-[0_18px_40px_rgba(0,0,0,0.8)]">
                    <video
                      ref={scannerVideoRef}
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${activePreviewImg ? 'hidden' : 'block'}`}
                    />
                    {activePreviewImg && (
                      <img
                        key={`${scannerCaptureStep}-${capturedCount}`}
                        src={activePreviewImg}
                        alt=""
                        onError={() => {
                          setScannerCapturedThumbs((prev) => {
                            const copy = { ...prev };
                            delete copy[scannerCaptureStep];
                            return copy;
                          });
                        }}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none">
                      <rect x="32" y="32" width="136" height="136" rx="12" fill="none" stroke={scannerCubeDetected ? '#22c55e' : currentSpec.accent} strokeWidth={scannerCubeDetected ? '3' : '2.5'} />
                      <line x1="77.3" y1="32" x2="77.3" y2="168" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                      <line x1="122.6" y1="32" x2="122.6" y2="168" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                      <line x1="32" y1="77.3" x2="168" y2="77.3" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                      <line x1="32" y1="122.6" x2="168" y2="122.6" stroke={currentSpec.accent} strokeWidth="1.5" strokeDasharray="4 3" />
                      {SCANNER_FLAT_GRID_CENTROIDS.map(([nx, ny], idx) => {
                        const liveCode = !activePreviewImg && scannerLivePreviewCodes ? scannerLivePreviewCodes[idx] : null;
                        const fillHex = liveCode ? SCANNER_COLOR_META[liveCode]?.hex || currentSpec.accent : idx === 4 ? currentSpec.accent : 'rgba(15,23,42,0.5)';
                        return (
                          <g key={idx}>
                            <circle cx={nx * 200} cy={ny * 200} r={liveCode ? '9.5' : idx === 4 ? '6.5' : '3.2'} fill={fillHex} stroke="#090e1c" strokeWidth="1.8" />
                            {liveCode && <text x={nx * 200} y={ny * 200 + 3} textAnchor="middle" fill="#090e1c" fontSize="8.5" fontWeight="900">{liveCode}</text>}
                          </g>
                        );
                      })}
                      <rect x="46" y="8" width="108" height="16" rx="8" fill="rgba(5,5,7,0.84)" />
                      <text x="100" y="19" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900">{currentSpec.topEdge}</text>
                      <rect x="42" y="176" width="116" height="16" rx="8" fill="rgba(5,5,7,0.84)" />
                      <text x="100" y="187" textAnchor="middle" fill="#fde047" fontSize="8.5" fontWeight="900">{currentSpec.bottomEdge}</text>
                      <text x="16" y="102" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="900" transform="rotate(-90 16 102)">{currentSpec.leftEdge}</text>
                      <text x="184" y="102" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="900" transform="rotate(90 184 102)">{currentSpec.rightEdge}</text>
                    </svg>

                    {scannerCameraError && !activePreviewImg && (
                      <div className="absolute inset-0 bg-black/90 p-4 flex items-center justify-center text-center">
                        <p className="text-xs text-zinc-300 leading-relaxed">{scannerCameraError}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activePreviewImg) { emitBeep(580, 'sine', 0.06); startScannerCamera(scannerCaptureStep, false); }
                        else if (!scannerCameraReady) startScannerCamera(scannerCaptureStep, false);
                        else captureAndAnalyzeCubeFrame();
                      }}
                      className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                      {activePreviewImg ? <>Retake {currentSpec.short} <RotateCw className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /></> : scannerCameraReady ? (scannerAutoSnap && scannerStabilityCount > 0 ? `Hold Steady (${scannerStabilityCount}/5)...` : `Capture ${currentSpec.short}`) : `Start Camera (${currentSpec.short})`}
                    </button>
                    <button type="button" onClick={() => { emitBeep(460); resetAllScannerFaces(true); }} className="py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 cursor-pointer">
                      Reset All Faces
                    </button>
                  </div>

                  {!scannerHasFull6Faces && (
                    <div className="liquid-glass-card liquid-rim-amber border border-orange-500/35 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">{hasFront3Captured ? '3-Face Quick Check • Refine Solve' : '3-Face State Check'}</span>
                        {(scannerThreeFaceHints.crossSolved !== null || scannerThreeFaceHints.f2lCompletedStatus !== null) && (
                          <button type="button" onClick={() => { emitBeep(460); setScannerThreeFaceHints({ crossSolved: null, f2lCompletedStatus: null }); }} className="text-[9.5px] font-bold text-zinc-400 hover:text-white cursor-pointer">Clear Answers</button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-black text-white">1. Is Cross solved?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => { emitBeep(640, 'sine', 0.05); setScannerThreeFaceHints((prev) => ({ ...prev, crossSolved: true })); }} className={`py-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${scannerThreeFaceHints.crossSolved === true ? 'bg-green-500/20 border-green-400 text-green-300' : 'liquid-glass-well text-zinc-300 hover:bg-white/[0.06]'}`}>Yes, Cross Solved <Check className="w-3.5 h-3.5 inline-block ml-0.5 -mt-0.5" /></button>
                          <button type="button" onClick={() => { emitBeep(520, 'sine', 0.05); setScannerThreeFaceHints({ crossSolved: false, f2lCompletedStatus: null }); }} className={`py-2 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${scannerThreeFaceHints.crossSolved === false ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'liquid-glass-well text-zinc-300 hover:bg-white/[0.06]'}`}>No, Not Yet <X className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></button>
                        </div>
                      </div>
                      {scannerThreeFaceHints.crossSolved === true && (
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                          <p className="text-xs font-black text-white">2. Are any F2L pairs completed?</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[{ key: 'none', label: 'None (0/4)' }, { key: 'some', label: 'Some (1–3)' }, { key: 'all', label: <>All 4 Done <Check className="w-3 h-3 inline-block -mt-0.5" /></> }].map((opt) => (
                              <button key={opt.key} type="button" onClick={() => { emitBeep(660, 'sine', 0.05); setScannerThreeFaceHints((prev) => ({ ...prev, f2lCompletedStatus: opt.key })); }} className={`py-2 px-1 rounded-xl text-[10.5px] font-black border transition-all cursor-pointer ${scannerThreeFaceHints.f2lCompletedStatus === opt.key ? 'bg-orange-500 text-slate-950 border-orange-400' : 'liquid-glass-well text-zinc-300 hover:bg-white/[0.06]'}`}>{opt.label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      {needsBackFacesRecommendation && (
                        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 space-y-2">
                          <p className="text-[11px] text-amber-100 leading-snug">
                            {scannerThreeFaceHints.crossSolved === false ? (
                              <><strong>Recommended:</strong> Because your Cross is still unsolved, hidden edges may be on the <strong>Bottom (D), Back (B), or Left (L)</strong> faces. Capture those 3 faces so the engine can calculate your exact Cross → F2L → OLL → PLL solve.</>
                            ) : (
                              <><strong>Recommended:</strong> With open F2L slots on the back/left sides, capturing <strong>D • B • L</strong> lets our engine track hidden corners &amp; edges across all 4 slots for an accurate multi-pair F2L solve.</>
                            )}
                          </p>
                          <button type="button" onClick={() => { emitBeep(740, 'sine', 0.07); startScannerCamera('D', false); }} className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md cursor-pointer">
                            Capture Remaining Faces (D • B • L) <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Verify Stickers</span>
                      <div className="flex items-center gap-1.5">
                        {savedCubePalette && (
                          <button type="button" onClick={() => { emitBeep(460); setSavedCubePalette(null); storage.setStr(STORAGE_KEYS.cubePalette, ''); }} className="px-2.5 py-0.5 rounded-xl bg-white/[0.06] text-[9px] font-bold text-zinc-300 hover:text-white cursor-pointer">Reset Palette</button>
                        )}
                        <button type="button" onClick={() => { emitBeep(720, 'sine', 0.05); setScannerLockedFaces((prev) => ({ ...prev, [scannerCaptureStep]: [...(scannedFaces[scannerCaptureStep] || [])] })); }} className="px-2.5 py-0.5 rounded-xl bg-green-500/15 text-[9.5px] font-black text-green-300 cursor-pointer">
                          {scannerLockedFaces[scannerCaptureStep] ? <><Check className="w-3 h-3 inline-block mr-0.5 -mt-0.5" />{scannerCaptureStep} Locked</> : `Lock ${scannerCaptureStep} Tiles`}
                        </button>
                      </div>
                    </div>

                    {(overflowColors.length > 0 || (Array.isArray(sixFaceMismatch) && sixFaceMismatch.length > 0)) && (
                      <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-amber-200">
                        {overflowColors.length > 0
                          ? `Sticker Check: ${overflowColors.map(([c, cnt]) => `${SCANNER_COLOR_META[c]?.label || c} (${cnt}/9)`).join(', ')} — tap the extra tile below to fix.`
                          : `6-Face Count Check: ${sixFaceMismatch.map(([c, cnt]) => `${c}:${cnt}/9`).join(' • ')}`}
                      </div>
                    )}

                    <p className="text-[10px] text-zinc-400 leading-snug pt-2 border-t border-white/10">
                      Tap any tile to fix its color—edited or locked tiles <strong className="text-green-300">stay locked in place</strong> when capturing other faces.
                    </p>

                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      {visibleFaceList.map((fObj) => (
                        <div key={fObj.key} className="p-1.5 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-white block text-center">{fObj.title}</span>
                          <div className="flex justify-center">{renderEdgeDot(fObj.top, 'Top')}</div>
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col items-center justify-center flex-shrink-0">{renderEdgeDot(fObj.left, 'Left')}</div>
                            <div className="grid grid-cols-3 gap-1 flex-1">
                              {(scannedFaces[fObj.key] || []).map((cCode, idx) => {
                                const isSelected = selectedStickerEdit?.face === fObj.key && selectedStickerEdit?.idx === idx;
                                return (
                                  <button
                                    key={idx} type="button"
                                    onClick={() => { emitBeep(620, 'sine', 0.04, 0.06); setSelectedStickerEdit({ face: fObj.key, idx, posLabel: posLabels[idx], faceTitle: fObj.title }); }}
                                    style={{ backgroundColor: cCode && SCANNER_COLOR_META[cCode] ? SCANNER_COLOR_META[cCode].hex : 'rgba(15, 23, 42, 0.72)' }}
                                    className={`aspect-square rounded-xl border transition-transform cursor-pointer flex items-center justify-center ${isSelected ? 'border-white scale-110 ring-2 ring-orange-400' : cCode ? 'border-black/40' : 'border-dashed border-white/20'}`}
                                    title={`${fObj.title} • ${posLabels[idx]}: ${cCode && SCANNER_COLOR_META[cCode] ? SCANNER_COLOR_META[cCode].label : 'Unscanned — tap to set'}`}
                                  >
                                    {!cCode && <span className="text-[8px] font-black text-zinc-500">?</span>}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex flex-col items-center justify-center flex-shrink-0">{renderEdgeDot(fObj.right, 'Right')}</div>
                          </div>
                          <div className="flex justify-center">{renderEdgeDot(fObj.bottom, 'Bottom')}</div>
                        </div>
                      ))}
                    </div>

                    {selectedStickerEdit && (
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                        <div className="min-w-0">
                          <span className="text-[9.5px] font-black uppercase text-orange-300 block truncate">{selectedStickerEdit.faceTitle || selectedStickerEdit.face}</span>
                          <span className="text-[9px] text-zinc-400 block truncate">{selectedStickerEdit.posLabel || `Tile #${selectedStickerEdit.idx + 1}`}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {SCANNER_COLOR_CODES.map((cCode) => (
                            <button
                              key={cCode} type="button"
                              onClick={() => {
                                emitBeep(720, 'sine', 0.05);
                                const { face, idx } = selectedStickerEdit;
                                setScannerStageVerification(null);
                                setScannedFaces((prev) => {
                                  const updated = [...(prev[face] || [])]; updated[idx] = cCode;
                                  setScannerLockedFaces((lPrev) => ({ ...lPrev, [face]: updated }));
                                  return { ...prev, [face]: updated };
                                });
                              }}
                              style={{ backgroundColor: SCANNER_COLOR_META[cCode].hex }}
                              className="w-6 h-6 rounded-full border border-black/40 text-[9px] font-black text-slate-950 cursor-pointer active:scale-90"
                              title={SCANNER_COLOR_META[cCode].label}
                            >
                              {cCode}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analysis Card */}
                  {!analysis ? (
                    <div className="liquid-glass-card liquid-rim-muted border border-white/10 rounded-3xl p-4 sm:p-5 text-center space-y-1.5 shadow-xl">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                        Ready to Scan • Solver Cleared
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Capture <strong className="text-white">U • F • R</strong> (or tap any sticker tile above) to identify your cube state and generate orientation &amp; algorithm steps.
                      </p>
                    </div>
                  ) : (
                  <div className="liquid-glass-card liquid-rim-amber border border-orange-500/35 rounded-3xl p-4 sm:p-5 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-[9.5px] font-black uppercase tracking-wider text-orange-300">{analysis.phaseLabel}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${analysis.crossSolved ? 'bg-green-500/15 border-green-500/35 text-green-300' : 'bg-red-500/15 border-red-500/35 text-red-300'}`}>{analysis.crossSolved ? <>Cross <Check className="w-2.5 h-2.5 inline-block -mt-0.5" /></> : <>Cross <X className="w-2.5 h-2.5 inline-block -mt-0.5" /></>}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/15 text-[9px] font-black uppercase text-zinc-200">{analysis.remainingF2lPairs === 0 ? <>F2L Done <Check className="w-2.5 h-2.5 inline-block -mt-0.5" /></> : `${analysis.remainingF2lPairs} F2L Left`}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-orange-400">Focused Stage • Full Algorithm</span>
                        <button
                          type="button"
                          onClick={() => {
                            const result = verifyFocusedStageState(activeStagePhase, scannedFaces, scannerHasFull6Faces, matched?.id ?? null);
                            emitBeep(result.status === 'warning' ? 420 : 780, 'sine', 0.07);
                            setScannerStageVerification(result);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border text-[9.5px] font-black uppercase tracking-wider text-sky-300 active:scale-95 transition-all cursor-pointer"
                        >
                          {activeStagePhase === 'oll'
                            ? <>Verify Top Layer (OLL) <Check className="w-3 h-3 inline-block -mt-0.5" /></>
                            : activeStagePhase === 'pll'
                            ? <>Verify Top Layer (PLL) <Check className="w-3 h-3 inline-block -mt-0.5" /></>
                            : activeStagePhase === 'f2l'
                            ? <>Verify F2L State <Check className="w-3 h-3 inline-block -mt-0.5" /></>
                            : <>Verify Cross State <Check className="w-3 h-3 inline-block -mt-0.5" /></>}
                        </button>
                      </div>

                      {activeVerification && (
                        <div
                          className={`rounded-xl px-2.5 py-2 border space-y-0.5 ${
                            activeVerification.status === 'warning'
                              ? 'bg-amber-500/15 border-amber-400/45 text-amber-100'
                              : activeVerification.status === 'updated'
                              ? 'bg-sky-500/15 border-sky-400/45 text-sky-100'
                              : 'bg-green-500/15 border-green-400/45 text-green-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black">{activeVerification.title}</span>
                            <button
                              type="button"
                              onClick={() => setScannerStageVerification(null)}
                              className="text-[9px] font-bold opacity-75 hover:opacity-100 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-[10px] opacity-90 leading-snug">{activeVerification.detail}</p>
                        </div>
                      )}

                      <div className={activeStagePhase === 'cross' ? 'space-y-1.5' : 'flex items-start gap-3'}>
                        {activeStagePhase !== 'cross' && renderCaseThumb(activeStagePhase, matched, 'w-14 h-14')}
                        <div className={activeStagePhase === 'cross' ? 'space-y-1.5' : 'min-w-0 flex-1 space-y-1'}>
                          <h3 className={`text-base font-black text-white ${activeStagePhase === 'cross' ? '' : 'leading-tight'}`}>{activeStageTitle}</h3>
                          <p className="font-mono text-sm font-black text-amber-300 break-words leading-relaxed select-all">{activeStageAlg}</p>
                          <p className="text-[10.5px] text-sky-200 bg-sky-500/10 border border-sky-500/25 rounded-xl px-2.5 py-1.5 leading-snug">
                            <strong className="text-sky-300">Cube Hold &amp; Orientation:</strong> {activeStageOrientationTip}
                          </p>
                          <div className="pt-0.5">
                            <TriggerTagsList tags={activeStageTags} />
                          </div>
                          <p className="text-[10.5px] text-orange-200/90 leading-snug"><strong>Fingertrick:</strong> {activeStageFingertrick}</p>
                        </div>
                      </div>

                      {activeStagePhase !== 'cross' && activeSubSteps?.length > 0 && (
                        <div className="pt-2.5 border-t border-white/10 space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">F2L Pair-by-Pair Execution Order (With y Rotations):</span>
                          {activeSubSteps.map((sub, sIdx) => {
                            const subTags = getAlgorithmTriggerTags(sub.alg);
                            return (
                              <div key={sub.slotNumber} className={`${sIdx > 0 ? 'pt-2 border-t border-white/10' : ''} space-y-1`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black text-white flex-shrink-0">Pair {sub.slotNumber} ({sub.caseObj.name})</span>
                                  <span className="font-mono text-[10.5px] font-bold text-amber-300 text-right break-all">{sub.alg}</span>
                                </div>
                                <p className="text-[9.5px] text-sky-200/90 leading-snug">
                                  <strong className="text-sky-300">Hold:</strong> White Bottom (D) • <strong className="text-white">{sub.frontColor}</strong> Front (F) • <strong className="text-white">{sub.rightColor}</strong> Right (R){sub.preU ? ` • Pre-turn ${sub.preU}` : ''}
                                </p>
                                <TriggerTagsList tags={subTags} compact />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {stagesList && (
                      <>
                        <div className="pt-3 border-t border-white/10 space-y-1.5">
                          <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-400 block">Tap Any Stage Below to View Full Algorithm Above</span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {stagesList.map((st, idx) => {
                              const isFocused = idx === activeFocusedIdx;
                              const isStageDone = scannerCompletedStages.includes(idx);
                              return (
                                <button
                                  key={st.stage} type="button"
                                  onClick={() => { emitBeep(640, 'sine', 0.05); setScannerFocusedStageIdx(idx); setScannerStageVerification(null); }}
                                  className={`text-left rounded-2xl p-2.5 border transition-all cursor-pointer ${isFocused ? 'bg-orange-500/20 border-orange-400 shadow-md ring-1 ring-orange-400/50' : isStageDone ? 'bg-green-500/10 border-green-500/35' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-[9px] font-black uppercase ${isStageDone ? 'text-green-400' : 'text-orange-400'}`}>{isStageDone ? <>{st.stage} <Check className="w-2.5 h-2.5 inline-block -mt-0.5" /></> : st.stage}</span>
                                    {isFocused && <span className="text-[8.5px] font-black uppercase text-amber-300">Viewing <ChevronUp className="w-2.5 h-2.5 inline-block -mt-0.5" /></span>}
                                  </div>
                                  <span className="text-[11px] font-bold text-white block truncate mt-0.5">{st.label}</span>
                                  <span className="font-mono text-[10px] text-amber-300 block truncate mt-0.5">{st.alg}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] font-black uppercase tracking-wider text-green-400">Interactive Solve Progression ({scannerCompletedStages.length}/{stagesList.length} Stages Done)</span>
                            {scannerCompletedStages.length > 0 && (
                              <button type="button" onClick={() => { emitBeep(460); setScannerCompletedStages([]); setScannerF2lPairIdx(0); setScannerFocusedStageIdx(0); setScannerStageVerification(null); }} className="text-[9.5px] font-bold text-zinc-400 hover:text-white cursor-pointer">Restart Solve <RotateCw className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></button>
                            )}
                          </div>
                          {focusedStage?.phaseKey === 'f2l' && focusedStage.subSteps?.length > 0 && (
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[9px] font-black uppercase text-orange-300 block">Active F2L Sub-Step {Math.min(scannerF2lPairIdx + 1, focusedStage.subSteps.length)} of {focusedStage.subSteps.length}</span>
                                <span className="font-mono text-xs font-black text-amber-300 block truncate">{focusedStage.subSteps[Math.min(scannerF2lPairIdx, focusedStage.subSteps.length - 1)]?.alg}</span>
                              </div>
                              {scannerF2lPairIdx + 1 < focusedStage.subSteps.length && (
                                <button type="button" onClick={() => { emitBeep(720, 'sine', 0.06); setScannerF2lPairIdx((p) => p + 1); }} className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-[10px] font-black text-amber-200 flex-shrink-0 cursor-pointer">Next F2L Pair <ArrowRight className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></button>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" disabled={activeFocusedIdx === 0} onClick={() => { emitBeep(480); setScannerFocusedStageIdx((idx) => Math.max(0, idx - 1)); setScannerStageVerification(null); }} className="py-2 rounded-xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-300 disabled:opacity-35 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5 inline-block mr-0.5 -mt-0.5" />Previous Stage</button>
                            <button
                              type="button"
                              onClick={() => {
                                emitBeep(840, 'sine', 0.08);
                                setScannerCompletedStages((prev) => (prev.includes(activeFocusedIdx) ? prev : [...prev, activeFocusedIdx]));
                                setScannerStageVerification(null);
                                if (activeFocusedIdx + 1 < stagesList.length) { setScannerFocusedStageIdx(activeFocusedIdx + 1); setScannerF2lPairIdx(0); }
                              }}
                              className="py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border text-[11px] font-black text-green-300 cursor-pointer"
                            >
                              {activeFocusedIdx + 1 < stagesList.length ? <>Done • Go to {stagesList[activeFocusedIdx + 1].stage} <ArrowRight className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></> : scannerCompletedStages.includes(activeFocusedIdx) ? <>Cube Solved <Check className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></> : <>Complete Final PLL <Check className="w-3 h-3 inline-block ml-0.5 -mt-0.5" /></>}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="pt-3 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black uppercase tracking-wider text-sky-400">{analysis.nextUpBadge}</span>
                        {nextCase && <span className="font-mono text-[10px] font-bold text-zinc-300">{nextCase.alg}</span>}
                      </div>
                      <p className="text-xs font-black text-white">{analysis.nextUpTitle}</p>
                      <p className="text-[11px] text-zinc-300 leading-snug">{focusedStage?.summary || analysis.nextUpSummary}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        stopScannerCamera(); setScannerOpen(false);
                        if (activeStagePhase === 'cross') { emitBeep(760); setActivePhase('cross'); setTabForPhase('cross', 'ladder'); return; }
                        if (!isCaseUnlockedForTraining(activeStagePhase, matched.id, isProUnlocked)) { openProPaywall(matched.name); return; }
                        emitBeep(760); setActivePhase(activeStagePhase); setSwRunning(false); setSwLastResult(null);
                        setActiveDrill({ phase: activeStagePhase, item: matched });
                      }}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                      {activeStagePhase === 'cross' ? <>Practice Cross in X <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /></> : <>Drill {matched.name} Now <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /></>}
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* CUSTOM ALTERNATIVE ALGORITHMS & NOTATION PICKER MODAL (PRO, UP TO 7 PER CASE) */}
        {customAlgEditor && (() => {
          const { phaseKey, caseId, name, defaultAlg, editingAltId, draftAlg, assignFingertricks, makeActiveOnSave, keypadCategory, error } = customAlgEditor;
          const { list: savedAlts, activeId: currentActiveAltId } = normalizeCaseCustomAlgs(currentUser.customAlgs?.[phaseKey]?.[caseId]);
          const atLimit = !editingAltId && savedAlts.length >= MAX_CUSTOM_ALGS_PER_CASE;
          const cleanPreview = sanitizeCustomAlgTokens(draftAlg);
          const bracketedPreview = cleanPreview ? formatAlgWithTriggerBrackets(cleanPreview) : '';
          const detectedTags = cleanPreview ? getAlgorithmTriggerTags(cleanPreview) : [];
          const filteredNotationGroups = keypadCategory === 'All'
            ? NOTATION_KEYPAD_GROUPS
            : NOTATION_KEYPAD_GROUPS.filter((g) => g.label === keypadCategory);

          const appendMoveToken = (tok) => {
            emitBeep(620, 'sine', 0.04);
            setCustomAlgEditor((prev) => {
              const trimmed = prev.draftAlg.trim();
              return { ...prev, error: '', draftAlg: trimmed ? `${trimmed} ${tok}` : tok };
            });
          };

          const backspaceMoveToken = () => {
            emitBeep(460, 'sine', 0.04);
            setCustomAlgEditor((prev) => {
              const parts = prev.draftAlg.trim().split(/\s+/).filter(Boolean);
              parts.pop();
              return { ...prev, error: '', draftAlg: parts.join(' ') };
            });
          };

          return (
            <ModalShell onClose={() => setCustomAlgEditor(null)} zClass="z-[282]" maxWidth="max-w-md" borderClass="border-orange-500/40">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-white">{name}</h3>
                  </div>
                  <button type="button" onClick={() => setCustomAlgEditor(null)} className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
                </div>

                <div className="liquid-glass-well border border-white/10 rounded-2xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-zinc-400">
                      Saved Algorithms (Tap to Set Active)
                    </span>
                    {editingAltId && savedAlts.length < MAX_CUSTOM_ALGS_PER_CASE && (
                      <button
                        type="button"
                        onClick={() => {
                          emitBeep(540);
                          setCustomAlgEditor((prev) => ({
                            ...prev,
                            editingAltId: null,
                            draftAlg: '',
                            assignFingertricks: true,
                            makeActiveOnSave: true,
                            error: ''
                          }));
                        }}
                        className="text-[10px] font-black text-orange-400 hover:underline cursor-pointer"
                      >
                        + Add Another ({savedAlts.length}/{MAX_CUSTOM_ALGS_PER_CASE})
                      </button>
                    )}
                  </div>

                  <div
                    onClick={() => selectCaseAlgSource(phaseKey, caseId, null)}
                    className={`rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      !currentActiveAltId ? 'bg-white/[0.1] border-white/30' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-white/15 text-white">Ours</span>
                        <span className="font-mono text-xs font-bold text-zinc-200 truncate">{defaultAlg}</span>
                      </div>
                    </div>
                    <span className={`text-[9.5px] font-black uppercase flex-shrink-0 ${!currentActiveAltId ? 'text-green-400' : 'text-zinc-500'}`}>
                      {!currentActiveAltId ? <>Active <Check className="w-2.5 h-2.5 inline-block -mt-0.5" /></> : 'Use'}
                    </span>
                  </div>

                  {savedAlts.length > 0 && (
                    <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1.5 pt-0.5">
                      {savedAlts.map((alt, idx) => {
                        const isSelectedActive = currentActiveAltId === alt.id;
                        const isCurrentlyEditing = editingAltId === alt.id;
                        return (
                          <div
                            key={alt.id}
                            onClick={() => selectCaseAlgSource(phaseKey, caseId, alt.id)}
                            className={`rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                              isCurrentlyEditing
                                ? 'bg-orange-500/20 border-orange-400'
                                : isSelectedActive
                                ? 'bg-orange-500/10 border-orange-500/40'
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isSelectedActive ? 'bg-orange-500 text-slate-950' : 'bg-white/10 text-orange-300'}`}>
                                  #{idx + 1}
                                </span>
                                <span className="font-mono text-xs font-bold text-amber-300 truncate">{alt.alg}</span>
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 flex-shrink-0">
                              <span className={`text-[9px] font-black uppercase px-1 ${isSelectedActive ? 'text-green-400' : 'text-zinc-500'}`}>
                                {isSelectedActive ? <>Active <Check className="w-2.5 h-2.5 inline-block -mt-0.5" /></> : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  emitBeep(540);
                                  setCustomAlgEditor((prev) => ({
                                    ...prev,
                                    editingAltId: alt.id,
                                    draftAlg: alt.alg,
                                    assignFingertricks: alt.assignFingertricks !== false,
                                    makeActiveOnSave: true,
                                    error: ''
                                  }));
                                }}
                                className="px-2 py-0.5 rounded-xl bg-white/10 hover:bg-white/20 text-[9.5px] font-black text-zinc-200 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  removeCustomCaseAlg(phaseKey, caseId, alt.id);
                                  if (editingAltId === alt.id) {
                                    setCustomAlgEditor((prev) => ({ ...prev, editingAltId: null, draftAlg: '', error: '' }));
                                  }
                                }}
                                className="px-2 py-0.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-[9.5px] font-black text-red-300 cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {atLimit ? (
                  <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 text-center space-y-1">
                    <p className="text-xs font-black text-amber-200">Maximum 7 Custom Algorithms Reached</p>
                    <p className="text-[11px] text-zinc-300">Tap <strong>Edit</strong> or <strong><X className="w-3 h-3 inline-block -mt-0.5" /></strong> on one of your saved algorithms above to modify or free up a slot.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
                          {editingAltId
                            ? `Editing Custom #${savedAlts.findIndex((c) => c.id === editingAltId) + 1}`
                            : `Add New Custom Algorithm (#${savedAlts.length + 1} of ${MAX_CUSTOM_ALGS_PER_CASE})`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={backspaceMoveToken}
                            disabled={!draftAlg.trim()}
                            className="px-2.5 py-0.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12]  text-[10px] font-bold text-zinc-300 disabled:opacity-35 cursor-pointer"
                          >
                            <Delete className="w-3 h-3 inline-block mr-1 -mt-0.5" />Undo
                          </button>
                          <button
                            type="button"
                            onClick={() => { emitBeep(420); setCustomAlgEditor((prev) => ({ ...prev, draftAlg: '', error: '' })); }}
                            disabled={!draftAlg.trim()}
                            className="px-2.5 py-0.5 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-bold text-zinc-300 disabled:opacity-35 cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={draftAlg}
                        onChange={(e) => setCustomAlgEditor((prev) => ({ ...prev, draftAlg: e.target.value, error: '' }))}
                        placeholder="Tap moves below or type e.g. R U R' U R U2 R'"
                        className="w-full rounded-2xl liquid-glass-well border px-4 py-2.5 font-mono text-sm font-black text-amber-300 placeholder-zinc-600 focus:outline-none focus:border-orange-400"
                      />
                      {error && <p className="text-[11px] font-bold text-rose-300">{error}</p>}
                    </div>

                    <div className="liquid-glass-well border border-white/10 rounded-2xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pb-0.5">
                        {['All', ...NOTATION_KEYPAD_GROUPS.map((g) => g.label)].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => { emitBeep(480); setCustomAlgEditor((prev) => ({ ...prev, keypadCategory: cat })); }}
                            className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase whitespace-nowrap cursor-pointer transition-all ${
                              keypadCategory === cat ? 'bg-orange-500 text-slate-950' : 'bg-white/[0.05] text-zinc-400 hover:text-white'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-32 overflow-y-auto no-scrollbar space-y-2 pr-0.5">
                        {filteredNotationGroups.map((grp) => (
                          <div key={grp.label} className="space-y-1">
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-zinc-500 block">{grp.label}</span>
                            <div className="grid grid-cols-6 gap-1">
                              {grp.moves.map((mv) => (
                                <button
                                  key={mv}
                                  type="button"
                                  onClick={() => appendMoveToken(mv)}
                                  className="py-1.5 rounded-xl bg-white/[0.05] hover:bg-orange-500/20 border border-white/10 hover:border-orange-400/40 font-mono text-xs font-black text-white active:scale-95 transition-all cursor-pointer"
                                >
                                  {mv}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {cleanPreview && (
                      <div className="bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/35 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-orange-300">
                            {detectedTags.length > 0
                              ? `Detected ${detectedTags.length} Fingertrick Trigger${detectedTags.length === 1 ? '' : 's'}!`
                              : 'Algorithm Formatted'}
                          </span>
                          <span className="text-[9.5px] font-mono text-zinc-400">
                            {cleanPreview.split(/\s+/).length} moves
                          </span>
                        </div>

                        {detectedTags.length > 0 && <TriggerTagsList tags={detectedTags} />}

                        {assignFingertricks && (
                          <p className="text-[10.5px] text-orange-200 bg-orange-500/10 border border-orange-500/25 rounded-xl px-2.5 py-1.5 leading-snug">
                            <strong className="text-orange-400">Fingertrick Help:</strong> {buildDynamicCustomFingertrickText(cleanPreview)}
                          </p>
                        )}

                        <div className="liquid-glass-well border border-white/10 rounded-xl px-2.5 py-2 space-y-0.5">
                          <span className="text-[9px] font-bold uppercase text-zinc-400 block">
                            {assignFingertricks ? 'Preview With Trigger Brackets:' : 'Preview Without Brackets:'}
                          </span>
                          <p className="font-mono text-xs font-black text-amber-300 break-words">
                            {assignFingertricks ? bracketedPreview : cleanPreview}
                          </p>
                        </div>

                        <label className="flex items-center justify-between gap-2 liquid-glass-well rounded-xl px-3.5 py-2 cursor-pointer">
                          <span className="text-[11px] font-bold text-zinc-200">
                            Assign fingertrick pills &amp; trigger brackets
                          </span>
                          <input
                            type="checkbox"
                            checked={assignFingertricks}
                            onChange={(e) => { emitBeep(560); setCustomAlgEditor((prev) => ({ ...prev, assignFingertricks: e.target.checked })); }}
                            className="w-4 h-4 accent-orange-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setCustomAlgEditor(null)}
                        className="flex-1 py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!cleanPreview) {
                            setCustomAlgEditor((prev) => ({ ...prev, error: 'Enter at least one valid WCA move (e.g., R U R\' U\').' }));
                            return;
                          }
                          emitBeep(820, 'sine', 0.09);
                          saveCustomCaseAlg(phaseKey, caseId, cleanPreview, assignFingertricks, makeActiveOnSave, editingAltId);
                          setCustomAlgEditor((prev) => ({
                            ...prev,
                            editingAltId: null,
                            draftAlg: '',
                            assignFingertricks: true,
                            error: ''
                          }));
                        }}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                      >
                        {editingAltId ? 'Update Algorithm' : `+ Save Custom #${savedAlts.length + 1}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </ModalShell>
          );
        })()}

        {/* COLOR ORBIT COMPASS MODAL */}
        {activeModal === 'compass' && (() => {
          const ORBIT_QUESTIONS = [
            { prompt: 'White bottom, Blue is front — what color is to the right?', answer: 'Red' },
            { prompt: 'White bottom, Green is front — what color is to the right?', answer: 'Orange' },
            { prompt: 'White bottom, Orange is front — what color is to the right?', answer: 'Blue' },
            { prompt: 'White bottom, Red is front — what color is to the right?', answer: 'Green' }
          ];
          const currentQ = ORBIT_QUESTIONS[orbitQuiz.idx % 4];
          return (
            <ModalShell onClose={() => { setActiveModal(null); setOrbitQuiz((q) => ({ ...q, active: false, feedback: null })); }} zClass="z-[255]" maxWidth="max-w-xs" backdropClass="bg-black/85">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">Color Orbit</span>
                    {orbitQuiz.active && <span className="font-mono text-[10px] font-bold text-zinc-400">Streak: {orbitQuiz.streak}</span>}
                  </div>
                  <button type="button" onClick={() => { emitBeep(620); setOrbitQuiz((q) => ({ ...q, active: true, feedback: null, idx: q.idx + 1 })); }} className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase cursor-pointer">Hit Me</button>
                </div>
                {!orbitQuiz.active ? (
                  <div className="liquid-glass-well border border-white/10 rounded-2xl p-4 space-y-2.5 text-center">
                    <p className="text-xs text-zinc-300 leading-relaxed">Hold <strong className="text-white">White</strong> on the bottom (<strong className="text-white">D</strong>). Clockwise:</p>
                    <p className="font-mono text-sm font-black tracking-wide"><span className="text-green-400">Green</span> <ArrowRight className="w-3.5 h-3.5 inline-block text-zinc-400 -mt-0.5" /> <span className="text-orange-400">Orange</span> <ArrowRight className="w-3.5 h-3.5 inline-block text-zinc-400 -mt-0.5" /> <span className="text-blue-400">Blue</span> <ArrowRight className="w-3.5 h-3.5 inline-block text-zinc-400 -mt-0.5" /> <span className="text-red-400">Red</span></p>
                  </div>
                ) : (
                  <div className="liquid-glass-well border border-white/10 rounded-2xl p-4 space-y-3.5 text-center">
                    <p className="text-sm font-bold text-white">{currentQ.prompt}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['Green', 'Red', 'Orange', 'Blue'].map((colorName) => (
                        <button
                          key={colorName} type="button"
                          onClick={() => { const correct = colorName === currentQ.answer; emitBeep(correct ? 880 : 320); setOrbitQuiz((q) => ({ ...q, streak: correct ? q.streak + 1 : 0, feedback: { correct, chosen: colorName } })); }}
                          className="py-2.5 px-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-black text-white cursor-pointer"
                        >
                          {colorName}
                        </button>
                      ))}
                    </div>
                    {orbitQuiz.feedback && <p className={`text-[11px] font-black ${orbitQuiz.feedback.correct ? 'text-green-400' : 'text-red-400'}`}>{orbitQuiz.feedback.correct ? 'Correct!' : `Answer: ${currentQ.answer}`}</p>}
                  </div>
                )}
                <button type="button" onClick={() => { setActiveModal(null); setOrbitQuiz((q) => ({ ...q, active: false, feedback: null })); }} className="w-full py-2.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold text-xs uppercase cursor-pointer">Close</button>
              </div>
            </ModalShell>
          );
        })()}

        {/* CURRICULUM BUILDER MODAL */}
        {activeModal === 'curriculum' && (() => {
          const { data: phaseDataList, byId: phaseLookupMap } = PHASE_REGISTRY[builderPhase] || PHASE_REGISTRY.oll;
          const defaultChunksForPhase = builderPhase === 'f2l' ? F2L_DEFAULT_CHUNKS : builderPhase === 'pll' ? PLL_DEFAULT_CHUNKS : OLL_DEFAULT_CHUNKS;
          const clearChunkDraft = () => { setEditingChunkId(null); setNewChunkName(''); setNewChunkSelectedIds([]); };
          const assignedIdsSet = new Set(builderChunks.filter((c) => c.id !== editingChunkId).flatMap((c) => c.ids));
          const q = builderSearchQuery.trim().toLowerCase();
          const filteredCases = q
            ? phaseDataList.filter((item) => item.name.toLowerCase().includes(q) || item.group.toLowerCase().includes(q) || item.alg.toLowerCase().includes(q))
            : phaseDataList;

          return (
            <ModalShell onClose={() => setActiveModal(null)}>
              <div className="space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">Build Custom Chunks</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(460);
                        setBuilderChunks(defaultChunksForPhase.map((c) => ({ ...c, ids: [...c.ids] })));
                        clearChunkDraft();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-transparent hover:bg-white/[0.08] text-[10px] font-bold text-zinc-300 cursor-pointer"
                    >
                      Reset Default
                    </button>
                    <button type="button" onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
                  </div>
                </div>

                <div className="liquid-glass-well p-1 rounded-xl grid grid-cols-2">
                  {[
                    { key: 'handpick', label: 'Hand-Pick Cases' },
                    { key: 'autosplit', label: 'Auto-Split (3–7)' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => { emitBeep(520); setBuilderMode(tab.key); }}
                      className={`py-2 text-[10.5px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                        builderMode === tab.key ? 'bg-orange-500 text-slate-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-[55dvh] overflow-y-auto no-scrollbar space-y-3 pr-0.5">
                  {builderMode === 'autosplit' ? (
                    <div className="liquid-glass-well border border-orange-500/30 rounded-2xl p-3.5 space-y-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">1. Algorithms Per Chunk (3–7)</span>
                        <p className="text-[11px] text-zinc-300 leading-snug">
                          Automatically divides your {builderPhase.toUpperCase()} algorithms into balanced daily chunks of your chosen size.
                        </p>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[3, 4, 5, 6, 7].map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => { emitBeep(560); setAutoSplitSize(sz); }}
                            className={`py-2.5 rounded-2xl font-mono text-xs font-black transition-all cursor-pointer ${
                              autoSplitSize === sz ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md' : 'bg-white/[0.05] border-white/10 text-zinc-300 hover:bg-white/[0.1]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">2. Which Algorithms to Include</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { key: 'all', label: `All ${phaseDataList.length} Cases` },
                            { key: 'unmastered', label: 'Unmastered Only' }
                          ].map((src) => (
                            <button
                              key={src.key}
                              type="button"
                              onClick={() => { emitBeep(520); setAutoSplitSource(src.key); }}
                              className={`py-2 px-2 rounded-xl text-[10.5px] font-black transition-all cursor-pointer ${
                                autoSplitSource === src.key ? 'bg-white/[0.14] border-orange-400/50 text-white' : 'bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {src.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAutoSplitChunks(autoSplitSize, autoSplitSource)}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 cursor-pointer"
                      >
                        Generate Chunks of {autoSplitSize} <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="liquid-glass-well border border-white/10 rounded-2xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                          {editingChunkId ? 'Editing Selected Chunk' : 'Hand-Pick New Chunk'}
                        </span>
                        <span className="font-mono text-[10px] font-black text-amber-300">{newChunkSelectedIds.length} picked</span>
                      </div>
                      <input
                        type="text"
                        value={newChunkName}
                        onChange={(e) => setNewChunkName(e.target.value)}
                        placeholder={`Chunk Title (e.g., My ${builderPhase.toUpperCase()} Set)`}
                        className="w-full bg-white/[0.05] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500"
                      />
                      <input
                        type="text"
                        value={builderSearchQuery}
                        onChange={(e) => setBuilderSearchQuery(e.target.value)}
                        placeholder="Filter by case name, group, or alg..."
                        className="w-full bg-white/[0.05] rounded-xl px-3.5 py-1.5 text-[11px] text-white placeholder-zinc-500"
                      />
                      <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                        {filteredCases.map((item) => {
                          const selected = newChunkSelectedIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                emitBeep(selected ? 480 : 680, 'sine', 0.04);
                                setNewChunkSelectedIds((prev) => (selected ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
                              }}
                              className={`w-full p-2 rounded-2xl flex items-center justify-between gap-2 text-left border transition-all cursor-pointer ${
                                selected ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/[0.04] border-transparent hover:bg-white/[0.08]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {renderCaseThumb(builderPhase, item, 'w-8 h-8 rounded-xl')}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-white truncate">{item.name}</span>
                                    {assignedIdsSet.has(item.id) && !selected && (
                                      <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[8.5px] font-bold text-zinc-400 flex-shrink-0">In Chunk</span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[10px] text-amber-300 block truncate">{item.alg}</span>
                                </div>
                              </div>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${selected ? 'bg-orange-500 text-slate-950' : 'bg-white/10 text-orange-400'}`}>
                                {selected ? <Check className="w-3.5 h-3.5" /> : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {editingChunkId && (
                          <button
                            type="button"
                            onClick={clearChunkDraft}
                            className="px-3 py-2 rounded-2xl bg-white/[0.05] text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!newChunkSelectedIds.length}
                          onClick={() => {
                            if (!newChunkSelectedIds.length) return;
                            emitBeep(780, 'sine', 0.07);
                            const autoLabel =
                              newChunkName.trim() ||
                              `Chunk ${editingChunkId ? builderChunks.findIndex((c) => c.id === editingChunkId) + 1 : builderChunks.length + 1} • ${newChunkSelectedIds.length} Cases`;
                            if (editingChunkId) {
                              setBuilderChunks((prev) => prev.map((c) => (c.id === editingChunkId ? { ...c, title: autoLabel, ids: [...newChunkSelectedIds] } : c)));
                              setEditingChunkId(null);
                            } else {
                              setBuilderChunks((prev) => [...prev, { id: `custom-${Date.now()}`, title: autoLabel, ids: [...newChunkSelectedIds] }]);
                            }
                            clearChunkDraft();
                          }}
                          className="flex-1 py-2.5 rounded-2xl bg-orange-500/20 hover:bg-orange-500/30 border text-xs font-black text-orange-300 disabled:opacity-35 cursor-pointer"
                        >
                          {editingChunkId ? `Update Chunk (${newChunkSelectedIds.length})` : `+ Add Chunk (${newChunkSelectedIds.length} Selected)`}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Schedule Chunks ({builderChunks.length})</span>
                      <span className="text-[10px] font-bold text-zinc-400">{builderChunks.reduce((sum, c) => sum + c.ids.length, 0)} total cases</span>
                    </div>
                    {builderChunks.map((chk, idx) => (
                      <div
                        key={chk.id}
                        className={`border rounded-2xl px-3 py-2 flex items-center justify-between gap-2 transition-all ${
                          editingChunkId === chk.id ? 'bg-orange-500/15 border-orange-500/45' : 'bg-white/[0.04] border-white/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">{chk.title}</p>
                          <p className="text-[10px] text-zinc-400">
                            {chk.ids.length} {builderPhase === 'f2l' ? 'pairs' : 'algs'} •{' '}
                            {chk.ids.map((id) => phaseLookupMap.get(id)?.name?.split('(')[0]?.trim()).filter(Boolean).slice(0, 4).join(', ')}
                            {chk.ids.length > 4 ? ` +${chk.ids.length - 4}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              emitBeep(560);
                              setBuilderMode('handpick');
                              setEditingChunkId(chk.id);
                              setNewChunkName(chk.title);
                              setNewChunkSelectedIds([...chk.ids]);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-orange-300 text-[10px] font-black cursor-pointer"
                          >
                            Edit
                          </button>
                          {builderChunks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                emitBeep(420);
                                if (editingChunkId === chk.id) clearChunkDraft();
                                setBuilderChunks((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="px-2 py-1 rounded-xl bg-red-500/15 text-red-300 text-[10px] font-black cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={saveCurriculumBuilder}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Save {builderPhase.toUpperCase()} Schedule ({builderChunks.length} Chunks)
                </button>
              </div>
            </ModalShell>
          );
        })()}

        {/* GRANULAR RESET MODAL */}
        {activeModal === 'reset' && (
          <ModalShell onClose={() => setActiveModal(null)}>
            <div className="space-y-3.5">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Granular Data Controls</span>
                <h3 className="text-xl font-black text-white">Reset {String(activeUserKey)}&apos;s Progress</h3>
              </div>
              {[
                { label: 'Phase F • F2L (41 Pairs)', dayScope: 'f2l-day', statsScope: 'f2l-stats', clearText: 'Clear F2L PBs' },
                { label: 'Phase O • OLL (57 Cases)', dayScope: 'oll-day', statsScope: 'oll-stats', clearText: 'Clear OLL PBs' },
                { label: 'Phase P • PLL (25 Algs)', dayScope: 'pll-day', statsScope: 'pll-stats', clearText: 'Clear PLL PBs' }
              ].map((ph) => (
                <div key={ph.label} className="liquid-glass-well border border-white/10 rounded-2xl p-3.5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">{ph.label}</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => executeGranularReset(ph.dayScope)} className="py-2 rounded-xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-200 cursor-pointer">Reset Day to 1</button>
                    <button type="button" onClick={() => executeGranularReset(ph.statsScope)} className="py-2 rounded-xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-200 cursor-pointer">{ph.clearText}</button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => executeGranularReset('full-timer')} className="w-full py-2.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-200 cursor-pointer">Clear 3x3x3 CFOP Timer (Ao5 / Ao12)</button>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={() => setActiveModal(null)} className="py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 cursor-pointer">Cancel</button>
                <button type="button" onClick={() => executeGranularReset('both')} className="py-3 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-xs font-black text-red-300 cursor-pointer">Reset Everything</button>
              </div>
            </div>
          </ModalShell>
        )}

        {/* TURN-COUNT FEEDBACK MODAL */}
        {efficiencyFeedback && (
          <ModalShell onClose={() => setEfficiencyFeedback(null)} zClass="z-[270]" maxWidth="max-w-xs" borderClass={efficiencyFeedback.optimal ? 'border-green-500/40' : 'border-amber-500/40'}>
            <div className="space-y-3 text-center">
              <h3 className={`text-lg font-black ${efficiencyFeedback.optimal ? 'text-green-300' : 'text-amber-300'}`}>{efficiencyFeedback.title}</h3>
              <p className="text-xs text-zinc-200 leading-relaxed">{efficiencyFeedback.detail}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={() => setEfficiencyFeedback(null)} className="py-2.5 px-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-zinc-200 font-bold text-xs cursor-pointer">Retry Scramble</button>
                <button type="button" onClick={() => { emitBeep(620, 'sine', 0.08); setCrossScrambleIdx((p) => p + 1); setCrossSolutionRevealed(false); setEfficiencyFeedback(null); }} className="py-2.5 px-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs cursor-pointer">Next Scramble <ArrowRight className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /></button>
              </div>
            </div>
          </ModalShell>
        )}

        {/* BLIND HELP MODALS */}
        {(activeModal === 'blindHelp' || activeModal === 'blindPracticeHelp') && (
          <ModalShell onClose={() => setActiveModal(null)} zClass="z-[265]">
            <div className="space-y-3.5">
              <h3 className="text-xl font-black text-white">{activeModal === 'blindHelp' ? 'How Blind Inspection Works' : 'How Blind Practice Works'}</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeModal === 'blindHelp'
                  ? <>Scramble your cube (White bottom • Green front) and tap <strong>Start 15s Countdown</strong>. Hold both touch pads for 0.35s until green, then release to close the visor and execute your cross blindfolded.</>
                  : <>Trace every white edge mentally during inspection, then launch the Blindfold Timer Mat to execute all {activeTierObj.moves} cross turns without looking.</>}
              </p>
              <button type="button" onClick={() => setActiveModal(null)} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer">Got It</button>
            </div>
          </ModalShell>
        )}

        {/* PER-CASE TARGET PB EDITOR MODAL */}
        {editingCaseTarget && (() => {
          const { phase, caseId, name, draft } = editingCaseTarget;
          const phaseDefault = getPhaseTargetPb(phase);
          const hasCustom = currentUser.caseTargetPbs?.[phase]?.[caseId] !== undefined;
          const numericVal = Number.isFinite(parseFloat(draft)) ? Math.min(30, Math.max(0.1, parseFloat(draft))) : phaseDefault;
          return (
            <ModalShell onClose={() => setEditingCaseTarget(null)} zClass="z-[280]" maxWidth="max-w-xs">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setEditingCaseTarget(null)} className="w-8 h-8 rounded-xl bg-white/[0.06] text-zinc-300 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{name}</h3>
                  <p className="text-[11px] text-zinc-400">Phase {phase.toUpperCase()} Default: <span className="font-mono text-zinc-200">{phaseDefault.toFixed(3)}s</span></p>
                </div>
                <div className="liquid-glass-well border border-white/10 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Custom Case Goal</span>
                    <span className="font-mono text-sm font-black text-amber-300">{numericVal.toFixed(3)}s</span>
                  </div>
                  <MillisecondSliderControl
                    value={numericVal} min={0.15} max={10.0} draftValue={draft} accentTextClass="text-amber-300" inputWidthClass="w-16"
                    onSliderChange={(val) => setEditingCaseTarget((prev) => ({ ...prev, draft: val.toFixed(3) }))}
                    onStepDelta={(d) => { emitBeep(540); const next = Math.min(30, Math.max(0.1, Number((numericVal + d).toFixed(3)))); setEditingCaseTarget((prev) => ({ ...prev, draft: next.toFixed(3) })); }}
                    onDraftChange={(val) => setEditingCaseTarget((prev) => ({ ...prev, draft: val }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {hasCustom ? (
                    <button type="button" onClick={() => { emitBeep(460); updateCaseTargetPb(phase, caseId, null); setEditingCaseTarget(null); }} className="py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 cursor-pointer">Use Phase Default</button>
                  ) : (
                    <button type="button" onClick={() => setEditingCaseTarget(null)} className="py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 cursor-pointer">Cancel</button>
                  )}
                  <button type="button" onClick={() => { emitBeep(760); updateCaseTargetPb(phase, caseId, numericVal); setEditingCaseTarget(null); }} className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer">Save Goal</button>
                </div>
              </div>
            </ModalShell>
          );
        })()}

        {/* FINGERTRICK DOSSIER MODAL */}
        {activeModal === 'fingertrick' && ftCase && (() => {
          const breakdown = buildFingertrickBreakdown(ftCase);
          return (
            <ModalShell onClose={() => setActiveModal(null)} zClass="z-[255]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
                </div>
                <div className="flex items-center gap-3 liquid-glass-well border border-white/10 rounded-2xl p-3">
                  <CachedVisualCubeImg
                    url={ftPhaseContext === 'f2l' ? getF2LImageUrl(ftCase.alg) : ftPhaseContext === 'pll' ? getPLLImageUrl(ftCase.alg) : getOLLImageUrl(ftCase.alg)}
                    alt={ftCase.name} lazy={false}
                    className={ftPhaseContext === 'f2l' ? 'w-14 h-14 object-contain f2l-cube-satin flex-shrink-0' : 'w-12 h-12 rounded-xl bg-zinc-200/95 p-1 flex-shrink-0 object-contain'}
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white truncate">{ftCase.name}</h3>
                    <p className="font-mono text-xs font-bold text-amber-300 break-words">{ftCase.alg}</p>
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  {[
                    { title: '1. Starting Grip', color: 'text-orange-400', body: breakdown.grip },
                    { title: '2. Execution Sequence', color: 'text-amber-300', body: breakdown.cue },
                    { title: '3. Flow & Regrip Tip', color: 'text-green-400', body: breakdown.flow }
                  ].map((s) => (
                    <div key={s.title} className="liquid-glass-well border border-white/10 rounded-2xl p-3 space-y-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${s.color} block`}>{s.title}</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setActiveModal(null)} className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer">Close</button>
              </div>
            </ModalShell>
          );
        })()}

        {/* PER-CASE LOGGED TIMES MANAGER MODAL */}
        {managingCaseHistory && (() => {
          const { phase, caseId, name } = managingCaseHistory;
          const statField = phase === 'f2l' ? 'f2lStats' : phase === 'pll' ? 'pllStats' : 'stats';
          const caseStat = currentUser[statField]?.[caseId] || {};
          const timesList = Array.isArray(caseStat.history) ? caseStat.history : [];
          const currentBest = typeof caseStat.best === 'number' ? caseStat.best : null;
          return (
            <ModalShell onClose={() => setManagingCaseHistory(null)} zClass="z-[284]" maxWidth="max-w-xs">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">{name}</h3>
                  </div>
                  <button type="button" onClick={() => setManagingCaseHistory(null)} className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
                </div>

                {timesList.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="liquid-glass-well border border-white/10 rounded-xl p-2">
                      <span className="text-[8.5px] font-bold uppercase text-zinc-400 block">Best PB</span>
                      <span className="font-mono text-xs font-black text-green-400">{currentBest !== null ? `${currentBest.toFixed(3)}s` : '—'}</span>
                    </div>
                    <div className="liquid-glass-well border border-white/10 rounded-xl p-2">
                      <span className="text-[8.5px] font-bold uppercase text-zinc-400 block">Ao20</span>
                      <span className="font-mono text-xs font-black text-sky-400">{computeCaseWindowAvg(timesList, 20) !== null ? `${computeCaseWindowAvg(timesList, 20).toFixed(2)}s` : '—'}</span>
                    </div>
                    <div className="liquid-glass-well border border-white/10 rounded-xl p-2">
                      <span className="text-[8.5px] font-bold uppercase text-zinc-400 block">Runs</span>
                      <span className="font-mono text-xs font-black text-amber-300">{timesList.length}</span>
                    </div>
                  </div>
                )}

                {timesList.length === 0 ? (
                  <div className="liquid-glass-well border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-xs text-zinc-400">All logged times for this case have been cleared.</p>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5">
                    {timesList.map((sec, idx) => {
                      const isPbRow = currentBest !== null && Number(sec) === currentBest;
                      return (
                        <div
                          key={`${idx}-${sec}`}
                          className={`rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 ${
                            isPbRow ? 'bg-green-500/10 border-green-500/35' : 'liquid-glass-well border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-zinc-500">#{idx + 1}</span>
                            <span className={`font-mono text-xs font-black ${isPbRow ? 'text-green-400' : 'text-white'}`}>
                              {Number(sec).toFixed(3)}s
                            </span>
                            {isPbRow && (
                              <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-[8.5px] font-black uppercase text-green-300">
                                PB
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteCaseTimeEntry(phase, caseId, idx)}
                            className="px-2.5 py-0.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-[10px] font-black text-red-300 cursor-pointer"
                            title="Delete This Time"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button type="button" onClick={() => setManagingCaseHistory(null)} className="w-full py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-black text-white uppercase tracking-wider cursor-pointer">
                  Done
                </button>
              </div>
            </ModalShell>
          );
        })()}

        {/* PRO PAYWALL MODAL */}
        {activeModal === 'proPaywall' && (
          <ModalShell onClose={() => setActiveModal(null)} zClass="z-[275]" maxWidth="max-w-xs" borderClass="border-orange-500/40">
            <div className="space-y-4 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/40 text-[10px] font-black uppercase tracking-widest text-orange-300">OLLDay Pro • Lifetime Access</span>
              <h3 className="text-xl font-black text-white">Unlock Full Day Training</h3>
              {proPaywallFeature && <p className="text-xs font-bold text-amber-300">{proPaywallFeature}</p>}
              <p className="text-xs text-zinc-300 leading-relaxed">All 123 algorithms are free to view in your library! Upgrade to Pro to train every F2L, OLL, and PLL case in Day Grind sessions, isolated drills, Advanced Full-Scramble Cross Ladder, Blindfold Mat, Custom Algs, and Custom Chunk Builder.</p>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-zinc-400">One-Time Purchase • Yours Forever • No Subscription</span>
              {proPurchaseToast ? (
                <p className="text-xs font-black text-green-400 py-2">{proPurchaseToast}</p>
              ) : (
                <div className="space-y-2 pt-1">
                  <button type="button" onClick={unlockLifetimePro} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer">Unlock Lifetime Pro — $5.99</button>
                  <button type="button" onClick={() => setActiveModal(null)} className="w-full py-2.5 rounded-2xl bg-white/[0.06] text-xs font-bold text-zinc-400 hover:text-white cursor-pointer">Maybe Later</button>
                </div>
              )}
            </div>
          </ModalShell>
        )}

        {/* SHAREABLE STATS SUMMARY MODAL */}
        {activeModal === 'shareStats' && (
          <ModalShell onClose={() => setActiveModal(null)} zClass="z-[278]" maxWidth="max-w-sm" borderClass="border-orange-500/40">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Solver Snapshot</span>
                <button type="button" onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-xl bg-transparent hover:bg-white/[0.08] text-zinc-300 font-bold cursor-pointer"><X className="w-3.5 h-3.5 inline-block" /></button>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-2xl bg-white/[0.08] border border-white/15 p-0.5 flex items-center justify-center flex-shrink-0">
                      <SuneEmblemSvg className="w-full h-full" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate">{String(activeUserKey || 'Solver')}</h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/35 text-[9.5px] font-black text-orange-300 flex-shrink-0">
                    {f2lMasteredCount + ollMasteredCount + pllMasteredCount}/123 Mastered
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 block">3x3x3 Full-Solve Records</span>
                  <div className="grid grid-cols-3 divide-x divide-white/10">
                    {[
                      { label: 'Best PB', val: formatMsTime(bestFullPbMs, 2), color: 'text-amber-300' },
                      { label: 'Ao5', val: ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2), color: 'text-green-400' },
                      { label: 'Ao12', val: ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2), color: 'text-sky-400' }
                    ].map((st) => (
                      <div key={st.label} className="px-2 py-1 text-center">
                        <span className="text-[9px] font-bold uppercase text-zinc-400 block">{st.label}</span>
                        <span className={`font-mono text-sm font-black ${st.color}`}>{st.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2">
                  <span className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 block">Top 5 Fastest Algorithm PBs</span>
                  {top5FastestAlgs.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-2 text-center">No algorithm PBs logged yet. Time any F2L, OLL, or PLL case to build your Top 5!</p>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {top5FastestAlgs.map((entry, idx) => (
                        <div
                          key={entry.key}
                          className={`py-2 flex items-center justify-between gap-2 ${
                            idx === 0 ? 'bg-orange-500/10 rounded-xl px-2.5 -mx-1' : 'px-1'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 rounded-full font-mono text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                              idx === 0 ? 'bg-orange-500 text-slate-950' : 'bg-white/10 text-zinc-300'
                            }`}>
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase text-orange-400">{entry.phase}</span>
                                <span className="text-xs font-black text-white truncate">{entry.name}</span>
                              </div>
                              <span className="font-mono text-[10px] text-zinc-400 block truncate">{entry.alg}</span>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-black text-green-400 flex-shrink-0">{entry.best.toFixed(3)}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[9.5px] font-bold text-zinc-400">
                  <span>F2L {f2lMasteredCount}/41 • OLL {ollMasteredCount}/57 • PLL {pllMasteredCount}/25</span>
                  <span className="text-orange-400 font-black">OLLDay</span>
                </div>
              </div>

              {shareStatsFeedback && (
                <p className="text-center text-xs font-black text-green-400">{shareStatsFeedback}</p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-3 rounded-2xl bg-transparent hover:bg-white/[0.08] text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={shareStatsSummaryImage}
                  className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Share Image ↗
                </button>
              </div>
            </div>
          </ModalShell>
        )}

        {renderUnifiedDailySession()}
        {renderUnifiedDrillModal()}

        {/* FULLSCREEN BLIND EXECUTION VISOR */}
        {blindState === 'visor' && (
          <div onClick={() => { emitBeep(960, 'sine', 0.1); setBlindState('done'); }} className="fixed inset-0 z-[295] bg-[#040508] flex flex-col items-center justify-between p-8 text-center select-none cursor-pointer">
            <div className="pt-4"><span className="px-3.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-black uppercase tracking-widest text-orange-300">Blind Execution Active • Eyes Closed</span></div>
            <div className="space-y-4 my-auto">
              <div className="w-20 h-20 rounded-full bg-orange-500/15 border-2 border-orange-500/40 mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.25)]">
                <EyeOff className="w-9 h-9 text-orange-400" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">Execute Your Cross Blindfolded</h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">Inspection locked at <strong className="text-orange-300">{(15 - inspectionLeftRef.current).toFixed(1)}s</strong>. Tap anywhere on the screen as soon as you finish your last turn.</p>
            </div>
            <div className="w-full max-w-xs pb-4"><div className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/25">Tap Anywhere When Finished <Check className="w-3.5 h-3.5 inline-block ml-1 -mt-0.5" /></div></div>
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
