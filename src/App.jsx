import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera, EyeOff, Layers, Settings, Zap, Grid, BarChart3, AlignJustify,
  RotateCw, X, Lock, Check, ChevronUp, ChevronDown, GripVertical, Pencil, Delete, Star, Sparkles, ArrowRight, ArrowLeft
} from 'lucide-react';
import './styles.css';
import {
  SCANNER_COLOR_CODES, SCANNER_COLOR_META, STICKER_HEX, CUBE_HALF_PX, CUBE_FACES_META, SOLVED_54_STATE,
  OLLDAY_LOGO_DATA_URI, SuneEmblemSvg, FINGERTRICK_CODEX, WCA_NOTATION_GUIDE, CROSS_TIERS, CROSS_ADVANCED_TIERS,
  CROSS_MECHANICS, F2L_DATA, F2L_BY_ID, F2L_GROUPS, F2L_DEFAULT_CHUNKS, OLL_DATA, OLL_BY_ID, OLL_GROUPS,
  OLL_DEFAULT_CHUNKS, PLL_DATA, PLL_BY_ID, PLL_GROUPS, PHASE_REGISTRY, PLL_DEFAULT_CHUNKS
} from './utils/constants';
import {
  simplifyMoveSequence, formatAlgWithTriggerBrackets, scannedFacesTo54Array, normalizeColorPattern,
  buildOrientationTipForStage, applyMovesTo54State, inspectCrossOn54, encodeCrossEdgesKey,
  crossHeuristicLowerBound, solveExactCrossFrom54, isFrontRightF2LSolved54, countSolvedF2LSlots54,
  matchBestF2LForFrontRight54, solveAllF2LPairsFrom54, invertAlgorithm, getCaseSignatures,
  matchBestOllFromGrids, matchBestPllFromGrids, analyzeFull54Cube, analyzeScanned3FaceCube,
  rgbToHsv, rgbToLab, classifyStickerRgb, classifyCapturedFaceBatch, SCANNER_FLAT_GRID_CENTROIDS, SCANNER_SAMPLE_OFFSETS
} from './utils/solverUtils';
import { ProLockOverlay, ModalShell, UvModalShell, AmbientGlows, OrbitRingBackdrop, TriggerTagsList, CustomAlgSwitcherPills, SocialAuthButtons, MillisecondSliderControl, CaseWindowAvgGrid } from './components/components';
import { ProLockOverlay, ModalShell, UvModalShell, AmbientGlows, OrbitRingBackdrop, TriggerTagsList, CustomAlgSwitcherPills, SocialAuthButtons, MillisecondSliderControl, CaseWindowAvgGrid } from './components';

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
            ignoreUndefinedProperties: true,
            localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() })
          });
        } catch {
          db = fsMod.getFirestore(appInstance);
        }
        const auth = authMod.getAuth(appInstance);
        if (authMod.setPersistence && authMod.browserLocalPersistence) {
          await authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {});
        }
        return { auth, db, authMod, fsMod };
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

// =========================================================================
// 2. VISUALCUBE, TELEMETRY, TRIGGER & SCRAMBLE UTILITIES
// =========================================================================
const MINI_STREAK_HALF = 12;
const MINI_STREAK_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const STREAK_FACE_ORDER = [
  { offset: 0, color: 'Y', yaw: -25, pitch: -55 },
  { offset: 18, color: 'G', yaw: -20, pitch: -18 },
  { offset: 9, color: 'O', yaw: -110, pitch: -18 },
  { offset: 45, color: 'B', yaw: -200, pitch: -18 },
  { offset: 36, color: 'R', yaw: 70, pitch: -18 },
  { offset: 27, color: 'W', yaw: -25, pitch: 55 }
];

const F2L_VIEW_ANGLES = [
  { label: 'Front-Right (FR)', yaw: -35, pitch: -25 },
  { label: 'Front-Left (FL)', yaw: 35, pitch: -25 },
  { label: 'Back-Left (BL)', yaw: 145, pitch: -25 },
  { label: 'Back-Right (BR)', yaw: -145, pitch: -25 },
  { label: 'Top Overview (U)', yaw: -35, pitch: -62 }
];

function getClosestF2LAngleLabel(yaw, pitch) {
  const normYaw = ((yaw % 360) + 360) % 360;
  let best = F2L_VIEW_ANGLES[0];
  let bestDist = Infinity;
  F2L_VIEW_ANGLES.forEach((a) => {
    const aNorm = ((a.yaw % 360) + 360) % 360;
    const dYaw = Math.min(Math.abs(normYaw - aNorm), 360 - Math.abs(normYaw - aNorm));
    const dist = dYaw + Math.abs(pitch - a.pitch);
    if (dist < bestDist) {
      bestDist = dist;
      best = a;
    }
  });
  return best.label;
}

const getF2LImageUrl = (alg = '') =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=150&stage=f2l&bg=t&sch=yrbwog&case=${encodeURIComponent(String(alg).replace(/[()]/g, ''))}`;

const getOLLImageUrl = (alg = '') =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=150&view=plan&stage=oll&bg=t&sch=yrbwog&case=${encodeURIComponent(String(alg).replace(/[()]/g, ''))}`;

const getPLLImageUrl = (alg = '', customSetup = null) =>
  customSetup
    ? `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=150&view=plan&stage=pll&bg=t&sch=yrbwog&alg=${encodeURIComponent(String(customSetup).replace(/[()]/g, ''))}`
    : `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=150&view=plan&stage=pll&bg=t&sch=yrbwog&case=${encodeURIComponent(String(alg).replace(/[()]/g, ''))}`;

const prewarmedVisualCubeUrls = new Set();
function prewarmVisualCubeLibrary(urls = []) {
  if (typeof Image === 'undefined') return;
  urls.filter(Boolean).forEach((url) => {
    if (prewarmedVisualCubeUrls.has(url)) return;
    prewarmedVisualCubeUrls.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  });
}

function CachedVisualCubeImg({ url, alt = '', lazy = true, className = '' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [url]);
  if (!url || failed) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-slate-800/80 text-[9px] font-black uppercase text-zinc-400 ${className}`}>
        3x3
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

function generate3x3Scramble(length = 20) {
  const faces = ['U', 'D', 'F', 'B', 'R', 'L'];
  const axis = { U: 0, D: 0, F: 1, B: 1, R: 2, L: 2 };
  const mods = ['', "'", '2'];
  const seq = [];
  let prevFace = '';
  let prevPrevFace = '';
  while (seq.length < length) {
    const f = faces[Math.floor(Math.random() * faces.length)];
    if (f === prevFace) continue;
    if (prevPrevFace && axis[f] === axis[prevFace] && f === prevPrevFace) continue;
    const m = mods[Math.floor(Math.random() * mods.length)];
    seq.push(`${f}${m}`);
    prevPrevFace = prevFace;
    prevFace = f;
  }
  return seq.join(' ');
}

function generatePLLSetupScramble(inverseAlg = '', seed = 0) {
  const preAuf = ['', 'U', "U'", 'U2'][seed % 4];
  const postAuf = ['', "U'", 'U', 'U2'][Math.floor(seed / 4) % 4];
  return simplifyMoveSequence(`${preAuf} ${inverseAlg} ${postAuf}`, true);
}

function computeWcaAverage(history = [], size = 5) {
  if (!Array.isArray(history) || history.length < size) return null;
  const slice = history.slice(0, size);
  const dnfCount = slice.filter((s) => s?.penalty === 'DNF').length;
  if (dnfCount >= 2) return 'DNF';
  const times = slice
    .map((s) => (s?.penalty === 'DNF' ? Infinity : Number(s.ms) + (s.penalty === '+2' ? 2000 : 0)))
    .sort((a, b) => a - b);
  const trimmed = times.slice(1, size - 1);
  if (trimmed.some((v) => !Number.isFinite(v))) return 'DNF';
  return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
}

function formatMsTime(ms, decimals = 2) {
  if (ms === 'DNF') return 'DNF';
  if (ms === null || ms === undefined || !Number.isFinite(Number(ms))) return '—';
  return `${(Number(ms) / 1000).toFixed(decimals)}s`;
}

function computeCaseWindowAvg(history = [], size = 5) {
  if (!Array.isArray(history) || history.length < size) return null;
  const slice = history.slice(0, size).map(Number).filter(Number.isFinite);
  if (slice.length < size) return null;
  if (size >= 5) {
    const sorted = [...slice].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, size - 1);
    return trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
  }
  return slice.reduce((sum, v) => sum + v, 0) / slice.length;
}

const TRIGGER_PATTERNS = [
  { id: 'sexy', label: 'Sexy Move', notation: "R U R' U'", pattern: "R U R' U'", badgeClass: 'bg-orange-500/20 border-orange-400/40 text-orange-200' },
  { id: 'inv-sexy', label: 'Inverse Sexy', notation: "U R U' R'", pattern: "U R U' R'", badgeClass: 'bg-amber-500/20 border-amber-400/40 text-amber-200' },
  { id: 'sledge', label: 'Sledgehammer', notation: "R' F R F'", pattern: "R' F R F'", badgeClass: 'bg-rose-500/20 border-rose-400/40 text-rose-200' },
  { id: 'hedge', label: 'Hedgeslammer', notation: "F R' F' R", pattern: "F R' F' R", badgeClass: 'bg-pink-500/20 border-pink-400/40 text-pink-200' },
  { id: 'left-sexy', label: 'Left Sexy', notation: "L' U' L U", pattern: "L' U' L U", badgeClass: 'bg-sky-500/20 border-sky-400/40 text-sky-200' },
  { id: 'sune', label: 'Sune Flow', notation: "R U R' U R U2 R'", pattern: "R U R' U R U2 R'", badgeClass: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' },
  { id: 'u2-flick', label: 'U2 Double Flick', notation: 'U2', pattern: 'U2', badgeClass: 'bg-purple-500/20 border-purple-400/40 text-purple-200' },
  { id: 'm-slice', label: 'M-Slice Flick', notation: "M' / M2", pattern: 'M', badgeClass: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200' }
];

function getAlgorithmTriggerTags(alg = '') {
  const cleaned = String(alg).replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  return TRIGGER_PATTERNS.filter((t) =>
    t.id === 'm-slice' ? /\bM['2]?\b/.test(cleaned) : cleaned.includes(t.pattern)
  );
}

function buildDynamicCustomFingertrickText(alg = '', fallback = '') {
  const tags = getAlgorithmTriggerTags(alg);
  if (!tags.length) {
    return fallback || 'Keep right thumb anchored on Front (F) and flick U / U\' with index fingers without regripping.';
  }
  const names = tags.map((t) => `${t.label} (${t.notation})`).join(' + ');
  return `Chain ${names} in one continuous wrist-index flow without lifting your right thumb off F.`;
}

function buildFingertrickBreakdown(caseObj = {}) {
  return {
    grip: caseObj.grip || 'Home grip: Right thumb on Front (F) center, left thumb on Front-Left, index fingers resting on UBR / UBL.',
    cue: caseObj.fingertrick || buildDynamicCustomFingertrickText(caseObj.alg),
    flow: 'Execute bracketed triggers in a single burst; use left/right index double-flicks for U2 and avoid mid-algorithm regrips.'
  };
}

// =========================================================================
// 2A. STATE-SIMULATING FULL CFOP SOLVER & ALGEBRAIC MOVE SIMPLIFIER
// =========================================================================
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

// Flip to true once your Apple Developer Program / Game Center & Apple Sign-In credentials are configured
const SHOW_GAME_CENTER_AUTH = false;

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

function mergePhaseStatsMaps(localStats = {}, cloudStats = {}) {
  const merged = {};
  const allIds = new Set([...Object.keys(localStats || {}), ...Object.keys(cloudStats || {})]);
  allIds.forEach((idKey) => {
    const l = localStats?.[idKey];
    const c = cloudStats?.[idKey];
    if (!l && !c) return;
    if (!l) { merged[idKey] = { ...c }; return; }
    if (!c) { merged[idKey] = { ...l }; return; }
    const lHist = Array.isArray(l.history) ? l.history.map(Number).filter(Number.isFinite) : [];
    const cHist = Array.isArray(c.history) ? c.history.map(Number).filter(Number.isFinite) : [];
    let combinedHist = lHist;
    if (lHist.length === 0) combinedHist = cHist;
    else if (cHist.length === 0) combinedHist = lHist;
    else if (lHist.length >= cHist.length && lHist.slice(0, cHist.length).every((v, i) => v === cHist[i])) combinedHist = lHist;
    else if (cHist.length > lHist.length && cHist.slice(0, lHist.length).every((v, i) => v === lHist[i])) combinedHist = cHist;
    else combinedHist = [...lHist, ...cHist].slice(0, 60);

    const bestCandidates = [l.best, c.best, ...combinedHist].map(Number).filter((n) => Number.isFinite(n) && n > 0);
    const entry = {
      attempts: Math.max(Number(l.attempts) || 0, Number(c.attempts) || 0, combinedHist.length),
      history: combinedHist.slice(0, 60)
    };
    if (bestCandidates.length) entry.best = Math.min(...bestCandidates);
    merged[idKey] = entry;
  });
  return merged;
}

function mergeCustomAlgsMaps(localAlgs = {}, cloudAlgs = {}) {
  const result = { f2l: {}, oll: {}, pll: {} };
  ['f2l', 'oll', 'pll'].forEach((phaseKey) => {
    const allCaseIds = new Set([
      ...Object.keys(localAlgs?.[phaseKey] || {}),
      ...Object.keys(cloudAlgs?.[phaseKey] || {})
    ]);
    allCaseIds.forEach((cid) => {
      const lNorm = normalizeCaseCustomAlgs(localAlgs?.[phaseKey]?.[cid]);
      const cNorm = normalizeCaseCustomAlgs(cloudAlgs?.[phaseKey]?.[cid]);
      const byId = new Map();
      [...cNorm.list, ...lNorm.list].forEach((entry) => {
        if (entry?.id && !byId.has(entry.id)) byId.set(entry.id, entry);
      });
      const list = Array.from(byId.values()).slice(0, MAX_CUSTOM_ALGS_PER_CASE);
      if (list.length > 0) {
        const activeId = (lNorm.activeId && list.some((x) => x.id === lNorm.activeId))
          ? lNorm.activeId
          : (cNorm.activeId && list.some((x) => x.id === cNorm.activeId))
          ? cNorm.activeId
          : null;
        result[phaseKey][cid] = { list, activeId };
      }
    });
  });
  return result;
}

function mergeSolverUserRecords(localRaw, cloudRaw) {
  const l = sanitizeUserRecord(localRaw);
  const c = sanitizeUserRecord(cloudRaw);
  const solveMap = new Map();
  [...(c.fullSolveHistory || []), ...(l.fullSolveHistory || [])].forEach((s) => {
    if (s && s.id != null) solveMap.set(s.id, s);
  });
  const mergedFullSolves = Array.from(solveMap.values())
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0))
    .slice(0, 100);

  return sanitizeUserRecord({
    day: Math.max(l.day, c.day),
    f2lDay: Math.max(l.f2lDay, c.f2lDay),
    pllDay: Math.max(l.pllDay, c.pllDay),
    crossDay: Math.max(l.crossDay, c.crossDay),
    consecutiveStreakDays: Math.max(l.consecutiveStreakDays, c.consecutiveStreakDays),
    lastActiveDate: (l.lastActiveDate || '') >= (c.lastActiveDate || '') ? l.lastActiveDate : c.lastActiveDate,
    stats: mergePhaseStatsMaps(l.stats, c.stats),
    f2lStats: mergePhaseStatsMaps(l.f2lStats, c.f2lStats),
    pllStats: mergePhaseStatsMaps(l.pllStats, c.pllStats),
    fullSolveHistory: mergedFullSolves,
    customChunks: l.customChunks || c.customChunks,
    f2lCustomChunks: l.f2lCustomChunks || c.f2lCustomChunks,
    pllCustomChunks: l.pllCustomChunks || c.pllCustomChunks,
    crossClears: Math.max(l.crossClears, c.crossClears),
    isPro: Boolean(l.isPro || c.isPro),
    email: c.email || l.email || '',
    fullSolveTargetPb: l.fullSolveTargetPb !== 15.0 ? l.fullSolveTargetPb : c.fullSolveTargetPb,
    phaseTargetPbs: { ...c.phaseTargetPbs, ...l.phaseTargetPbs },
    caseTargetPbs: {
      f2l: { ...(c.caseTargetPbs?.f2l || {}), ...(l.caseTargetPbs?.f2l || {}) },
      oll: { ...(c.caseTargetPbs?.oll || {}), ...(l.caseTargetPbs?.oll || {}) },
      pll: { ...(c.caseTargetPbs?.pll || {}), ...(l.caseTargetPbs?.pll || {}) }
    },
    customAlgs: mergeCustomAlgsMaps(l.customAlgs, c.customAlgs)
  });
}

function stripUndefinedDeep(val) {
  if (Array.isArray(val)) return val.map(stripUndefinedDeep).filter((v) => v !== undefined);
  if (val && typeof val === 'object') {
    const clean = {};
    Object.entries(val).forEach(([k, v]) => {
      if (v !== undefined) clean[k] = stripUndefinedDeep(v);
    });
    return clean;
  }
  return val;
}

let preferredCloudNamespace = 'artifacts'; // 'artifacts' | 'users'

function getCloudProfileDocRef(svc, uid, docId, ns = preferredCloudNamespace) {
  return ns === 'users'
    ? svc.fsMod.doc(svc.db, 'users', uid, 'solver_profiles', docId)
    : svc.fsMod.doc(svc.db, 'artifacts', appId, 'users', uid, 'solver_profiles', docId);
}

function getCloudProfilesColRef(svc, uid, ns = preferredCloudNamespace) {
  return ns === 'users'
    ? svc.fsMod.collection(svc.db, 'users', uid, 'solver_profiles')
    : svc.fsMod.collection(svc.db, 'artifacts', appId, 'users', uid, 'solver_profiles');
}

async function writeCloudDocWithFallback(svc, uid, docId, payload) {
  const cleanPayload = stripUndefinedDeep(payload);
  try {
    await svc.fsMod.setDoc(getCloudProfileDocRef(svc, uid, docId, preferredCloudNamespace), cleanPayload, { merge: true });
    return { ok: true, ns: preferredCloudNamespace };
  } catch (err) {
    if (err?.code === 'permission-denied') {
      const altNs = preferredCloudNamespace === 'artifacts' ? 'users' : 'artifacts';
      try {
        await svc.fsMod.setDoc(getCloudProfileDocRef(svc, uid, docId, altNs), cleanPayload, { merge: true });
        preferredCloudNamespace = altNs;
        return { ok: true, ns: altNs };
      } catch (err2) {
        return { ok: false, error: err2 };
      }
    }
    return { ok: false, error: err };
  }
}

async function readCloudProfilesWithFallback(svc, uid) {
  try {
    const snap = await svc.fsMod.getDocs(getCloudProfilesColRef(svc, uid, preferredCloudNamespace));
    return { docs: snap.docs, ns: preferredCloudNamespace };
  } catch (err) {
    if (err?.code === 'permission-denied') {
      const altNs = preferredCloudNamespace === 'artifacts' ? 'users' : 'artifacts';
      const snapAlt = await svc.fsMod.getDocs(getCloudProfilesColRef(svc, uid, altNs));
      preferredCloudNamespace = altNs;
      return { docs: snapAlt.docs, ns: altNs };
    }
    throw err;
  }
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
  const [cloudSyncError, setCloudSyncError] = useState('');
  const latestUsersRef = useRef(users);
  latestUsersRef.current = users;
  const cloudAuthUserRef = useRef(cloudAuthUser);
  cloudAuthUserRef.current = cloudAuthUser;
  const pendingCloudSyncRef = useRef(new Map());
  const lastCloudWriteRef = useRef(new Map());
  const failedWriteCountRef = useRef(0);
  const autoPushedSigRef = useRef('');
  const isFlushingRef = useRef(false);
  const cloudSaveTimerRef = useRef(null);
  const localSaveTimerRef = useRef(null);

  const flushPendingPersistence = async () => {
    if (localSaveTimerRef.current) { clearTimeout(localSaveTimerRef.current); localSaveTimerRef.current = null; }
    storage.setJson(STORAGE_KEYS.users, latestUsersRef.current);
    if (cloudSaveTimerRef.current) { clearTimeout(cloudSaveTimerRef.current); cloudSaveTimerRef.current = null; }
    if (isFlushingRef.current) return;

    const svc = resolvedFirebaseConfig ? await getFirebaseServices() : null;
    const activeFbUser = svc?.auth?.currentUser || cloudAuthUserRef.current;
    const uid = activeFbUser?.uid;
    if (pendingCloudSyncRef.current.size > 0 && resolvedFirebaseConfig && uid && svc) {
      isFlushingRef.current = true;
      const batchEntries = Array.from(pendingCloudSyncRef.current.entries());
      pendingCloudSyncRef.current.clear();
      try {
        const writeTs = Date.now();
        const profileResults = await Promise.all(
          batchEntries.map(async ([uKey, record]) => {
            let finalRec = sanitizeUserRecord(record);
            try {
              const snap = await svc.fsMod.getDoc(getCloudProfileDocRef(svc, uid, uKey, preferredCloudNamespace)).catch(() => null);
              if (snap && snap.exists()) {
                finalRec = mergeSolverUserRecords(finalRec, snap.data());
              }
            } catch {}
            lastCloudWriteRef.current.set(uKey, writeTs);
            return writeCloudDocWithFallback(svc, uid, uKey, {
              ...finalRec,
              email: finalRec.email || activeFbUser?.email || '',
              updatedAt: writeTs
            });
          })
        );
        if (batchEntries.some(([, rec]) => Boolean(rec?.isPro))) {
          await writeCloudDocWithFallback(svc, uid, '_entitlements', {
            isPro: true,
            email: activeFbUser?.email || '',
            updatedAt: writeTs
          });
        }
        const allOk = profileResults.every((r) => r.ok);
        if (allOk) {
          failedWriteCountRef.current = 0;
          setCloudSyncError('');
          setCloudSyncStatus('synced');
        } else {
          failedWriteCountRef.current += 1;
          const firstErr = profileResults.find((r) => !r.ok)?.error;
          setCloudSyncError(firstErr?.code || 'sync-failed');
          setCloudSyncStatus('local');
          if (failedWriteCountRef.current < 3) {
            batchEntries.forEach(([k, rec]) => {
              if (!pendingCloudSyncRef.current.has(k)) pendingCloudSyncRef.current.set(k, rec);
            });
          }
        }
      } catch (err) {
        failedWriteCountRef.current += 1;
        setCloudSyncError(err?.code || 'sync-failed');
        setCloudSyncStatus('local');
      } finally {
        isFlushingRef.current = false;
      }
    }
  };

  const saveUserToCloud = (uKey, record) => {
    if (!uKey || uKey === 'Demo' || !resolvedFirebaseConfig) return;
    pendingCloudSyncRef.current.set(uKey, record);
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    const backoffMs = failedWriteCountRef.current > 0 ? Math.min(8000, 1000 * Math.pow(2, failedWriteCountRef.current)) : 500;
    cloudSaveTimerRef.current = setTimeout(flushPendingPersistence, backoffMs);
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
          if (!fbUser) {
            setCloudSyncStatus('local');
          } else if (pendingCloudSyncRef.current.size > 0) {
            flushPendingPersistence();
          }
        }
      });
      if (typeof svc.auth.authStateReady === 'function') {
        await svc.auth.authStateReady().catch(() => {});
      }
      if (cancelled) return;
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
    let unsubEntitlementSnapshot = null;
    autoPushedSigRef.current = '';

    (async () => {
      try {
        const svc = await getFirebaseServices();
        if (!svc || cancelled) return;

        // Verify readable namespace once before attaching listeners so rules mismatch never loops
        const probe = await readCloudProfilesWithFallback(svc, uid).catch(() => null);
        if (cancelled) return;
        const activeNs = probe?.ns || preferredCloudNamespace;
        const entRef = getCloudProfileDocRef(svc, uid, '_entitlements', activeNs);
        const docRef = getCloudProfileDocRef(svc, uid, activeUserKey, activeNs);

        unsubEntitlementSnapshot = svc.fsMod.onSnapshot(
          entRef,
          (entSnap) => {
            if (cancelled || !entSnap.exists()) return;
            if (entSnap.data()?.isPro) {
              setUsers((prev) => {
                const cur = prev[activeUserKey];
                if (!cur || cur.isPro) return prev;
                const upgraded = sanitizeUserRecord({ ...cur, isPro: true });
                storage.setJson(STORAGE_KEYS.users, { ...prev, [activeUserKey]: upgraded });
                return { ...prev, [activeUserKey]: upgraded };
              });
            }
          },
          () => {}
        );

        unsubSnapshot = svc.fsMod.onSnapshot(
          docRef,
          (docSnap) => {
            if (cancelled) return;
            if (failedWriteCountRef.current === 0) {
              setCloudSyncStatus('synced');
            }
            const localRec = latestUsersRef.current?.[activeUserKey];
            if (!docSnap.exists()) {
              const seedSig = `seed:${uid}:${activeUserKey}`;
              if (localRec && autoPushedSigRef.current !== seedSig && failedWriteCountRef.current < 3) {
                autoPushedSigRef.current = seedSig;
                saveUserToCloud(activeUserKey, localRec);
              }
              return;
            }
            const data = docSnap.data();
            if (!data || typeof data !== 'object') return;
            if (data.updatedAt && data.updatedAt === lastCloudWriteRef.current.get(docSnap.id)) return;
            const merged = mergeSolverUserRecords(localRec, data);
            setUsers((prev) => {
              const nextUsers = { ...prev, [docSnap.id]: merged };
              storage.setJson(STORAGE_KEYS.users, nextUsers);
              return nextUsers;
            });
            const localAhead =
              (merged.isPro && !data.isPro) ||
              merged.day > (Number(data.day) || 1) ||
              merged.f2lDay > (Number(data.f2lDay) || 1) ||
              merged.pllDay > (Number(data.pllDay) || 1) ||
              merged.crossClears > (Number(data.crossClears) || 0) ||
              merged.fullSolveHistory.length > (Array.isArray(data.fullSolveHistory) ? data.fullSolveHistory.length : 0) ||
              Object.keys(merged.stats).length > Object.keys(data.stats || {}).length ||
              Object.keys(merged.f2lStats).length > Object.keys(data.f2lStats || {}).length ||
              Object.keys(merged.pllStats).length > Object.keys(data.pllStats || {}).length;
            const pushSig = `push:${uid}:${docSnap.id}:${merged.isPro}:${merged.day}:${merged.f2lDay}:${merged.pllDay}:${merged.fullSolveHistory.length}:${Object.keys(merged.stats).length}:${Object.keys(merged.f2lStats).length}:${Object.keys(merged.pllStats).length}`;
            if (localAhead && autoPushedSigRef.current !== pushSig && failedWriteCountRef.current === 0) {
              autoPushedSigRef.current = pushSig;
              saveUserToCloud(docSnap.id, merged);
            }
          },
          (err) => {
            if (!cancelled) {
              setCloudSyncError(err?.code || 'listener-error');
              setCloudSyncStatus('local');
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          setCloudSyncError(err?.code || 'init-error');
          setCloudSyncStatus('local');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (typeof unsubSnapshot === 'function') unsubSnapshot();
      if (typeof unsubEntitlementSnapshot === 'function') unsubEntitlementSnapshot();
    };
  }, [cloudAuthUser?.uid, activeUserKey, isAppVisible]);

  return { cloudAuthUser, setCloudAuthUser, cloudSyncStatus, setCloudSyncStatus, cloudSyncError, lastCloudWriteRef, saveUserToCloud, flushPendingPersistence, cancelPendingWriteFor };
}

// =========================================================================
// 4. MAIN APPLICATION COMPONENT & ERROR BOUNDARY
// =========================================================================
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

  const { cloudAuthUser, setCloudAuthUser, cloudSyncStatus, setCloudSyncStatus, cloudSyncError, lastCloudWriteRef, saveUserToCloud, flushPendingPersistence, cancelPendingWriteFor } =
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
    setScannedFaces((prev) => classifyCapturedFaceBatch(nextRaw, prev, scannerLockedFaces, savedCubePalette, SCANNER_COLOR_CODES, SCANNER_COLOR_META));
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
      const codes = classifyCapturedFaceBatch({ ...snap.scannerRawSamples, [scannerCaptureStep]: res.sampled9 }, snap.scannedFaces, snap.scannerLockedFaces, snap.savedCubePalette, SCANNER_COLOR_CODES, SCANNER_COLOR_META)[scannerCaptureStep];
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
    const { docs: allCloudDocs } = await readCloudProfilesWithFallback(svc, fbUser.uid);

    const diskUsers = storage.getJson(STORAGE_KEYS.users, {});
    const mergedSourceUsers = { ...(diskUsers && typeof diskUsers === 'object' ? diskUsers : {}), ...users };
    const emailLower = (fbUser.email || '').trim().toLowerCase();
    const nonDemoLocalEntries = Object.entries(mergedSourceUsers).filter(([k]) => k !== 'Demo');
    const emailMatchedLocal = emailLower
      ? nonDemoLocalEntries.find(([, u]) => u?.email?.trim().toLowerCase() === emailLower)?.[1]
      : null;
    const activeLocal = activeUserKey && activeUserKey !== 'Demo' ? mergedSourceUsers[activeUserKey] : null;
    const namedLocal = mergedSourceUsers[displayName] || null;
    let combinedLocal = sanitizeUserRecord({});
    [emailMatchedLocal, activeLocal, namedLocal].filter(Boolean).forEach((rec) => {
      combinedLocal = mergeSolverUserRecords(combinedLocal, rec);
    });

    const localAnyNonDemoPro = nonDemoLocalEntries.some(([, u]) => Boolean(u?.isPro));
    const cloudAnyDocHasPro = allCloudDocs.some((d) => Boolean(d.data()?.isPro));
    const resolvedPro = Boolean(cloudAnyDocHasPro || combinedLocal.isPro || localAnyNonDemoPro);

    const profileDocs = allCloudDocs.filter((d) => d.id !== '_entitlements');
    let chosenKey = displayName;
    const writeTs = Date.now();
    let finalSyncedRecord;

    if (profileDocs.length > 0) {
      const sortedDocs = [...profileDocs].sort((a, b) => (Number(b.data()?.updatedAt) || 0) - (Number(a.data()?.updatedAt) || 0));
      const matchedDoc =
        sortedDocs.find((d) => emailLower && d.data()?.email?.toLowerCase() === emailLower) ||
        sortedDocs.find((d) => d.id.toLowerCase() === displayName.toLowerCase()) ||
        sortedDocs[0];
      chosenKey = matchedDoc.id;
      const localForChosen = mergeSolverUserRecords(combinedLocal, mergedSourceUsers[chosenKey] || {});
      finalSyncedRecord = mergeSolverUserRecords(localForChosen, {
        ...matchedDoc.data(),
        email: fbUser.email || matchedDoc.data().email || '',
        isPro: resolvedPro
      });
      finalSyncedRecord = sanitizeUserRecord({
        ...finalSyncedRecord,
        email: fbUser.email || finalSyncedRecord.email || '',
        isPro: resolvedPro
      });
    } else {
      finalSyncedRecord = sanitizeUserRecord({
        ...combinedLocal,
        email: fbUser.email || combinedLocal.email || '',
        isPro: resolvedPro
      });
    }

    lastCloudWriteRef.current.set(chosenKey, writeTs);
    setUsers((prev) => {
      const nextUsers = { ...prev, [chosenKey]: finalSyncedRecord };
      storage.setJson(STORAGE_KEYS.users, nextUsers);
      return nextUsers;
    });

    const primaryRes = await writeCloudDocWithFallback(svc, fbUser.uid, chosenKey, {
      ...finalSyncedRecord,
      updatedAt: writeTs
    });
    if (resolvedPro) {
      await writeCloudDocWithFallback(svc, fbUser.uid, '_entitlements', {
        isPro: true,
        email: fbUser.email || '',
        updatedAt: writeTs
      });
    }

    setCloudAuthUser(fbUser);
    setCloudSyncStatus(primaryRes.ok ? 'synced' : 'local');
    registerDeviceAccount(chosenKey);
    setActiveUserKey(chosenKey);
    setAuthNameInput('');
    setAuthEmailInput('');
    setAuthPasswordInput('');
    setAuthInfoMsg('');
    setAuthScreenOpen(false);
    if (isNewSignUp) setActiveModal('cfopExperienceChoice');
    return { chosenKey, record: finalSyncedRecord, syncedToCloud: primaryRes.ok };
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

  useEffect(() => {
    if (!resolvedFirebaseConfig) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const svc = await getFirebaseServices();
        if (!svc || cancelled || !svc.authMod.getRedirectResult) return;
        const redirectCred = await svc.authMod.getRedirectResult(svc.auth);
        if (!cancelled && redirectCred?.user) {
          await syncCloudProfileAfterOAuth(svc, redirectCred.user, 'Google Solver');
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleGoogleSignIn = async () => {
    emitBeep(720, 'sine', 0.08);
    setAuthErrorMsg('');
    setAuthBusy(true);
    if (!resolvedFirebaseConfig) {
      setAuthBusy(false);
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
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const cred = await svc.authMod.signInWithPopup(svc.auth, provider);
        await syncCloudProfileAfterOAuth(svc, cred.user, 'Google Solver');
      } catch (popupErr) {
        if (popupErr?.code === 'auth/operation-not-supported-in-this-environment') {
          await svc.authMod.signInWithRedirect(svc.auth, provider);
          return;
        }
        if (popupErr?.code === 'auth/popup-blocked') {
          setAuthErrorMsg('Popup blocked by Safari — allow pop-ups in Safari Settings or tap Continue with Google again.');
          return;
        }
        throw popupErr;
      }
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthErrorMsg(err?.message || 'Google sign-in failed — please try again.');
      }
    } finally {
      setAuthBusy(false);
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

  const [restoreStatusToast, setRestoreStatusToast] = useState('');
  const openProPaywall = (featureLabel) => { emitBeep(460); setProPaywallFeature(featureLabel || ''); setProPurchaseToast(''); setActiveModal('proPaywall'); };
  const unlockLifetimePro = async () => {
    emitBeep(920, 'sine', 0.12);
    const svc = resolvedFirebaseConfig ? await getFirebaseServices() : null;
    if (svc && typeof svc.auth.authStateReady === 'function') {
      await svc.auth.authStateReady().catch(() => {});
    }
    const fbUser = svc?.auth?.currentUser || cloudAuthUser;
    const isSignedIntoCloud = Boolean(fbUser && !fbUser.isAnonymous);
    const updatedRecord = sanitizeUserRecord({
      ...currentUser,
      isPro: true,
      email: currentUser.email || fbUser?.email || ''
    });
    const emailLower = (updatedRecord.email || '').trim().toLowerCase();

    setUsers((prev) => {
      const nextUsers = { ...prev };
      Object.keys(nextUsers).forEach((k) => {
        if (k === resolvedUserKey || (emailLower && nextUsers[k]?.email?.trim().toLowerCase() === emailLower)) {
          nextUsers[k] = sanitizeUserRecord({ ...nextUsers[k], isPro: true, email: nextUsers[k]?.email || emailLower });
        }
      });
      nextUsers[resolvedUserKey] = updatedRecord;
      storage.setJson(STORAGE_KEYS.users, nextUsers);
      return nextUsers;
    });

    if (svc && fbUser?.uid) {
      try {
        const writeTs = Date.now();
        const targetProfileKey = resolvedUserKey && resolvedUserKey !== 'Demo'
          ? resolvedUserKey
          : ((fbUser.displayName || fbUser.email?.split('@')[0] || 'Solver').replace(/[/\\#?]+/g, ' ').trim() || 'Solver');
        if (targetProfileKey !== resolvedUserKey) {
          registerDeviceAccount(targetProfileKey);
          setActiveUserKey(targetProfileKey);
          setUsers((prev) => {
            const nextUsers = { ...prev, [targetProfileKey]: updatedRecord };
            storage.setJson(STORAGE_KEYS.users, nextUsers);
            return nextUsers;
          });
        }
        lastCloudWriteRef.current.set(targetProfileKey, writeTs);
        const [profRes, entRes] = await Promise.all([
          writeCloudDocWithFallback(svc, fbUser.uid, targetProfileKey, { ...updatedRecord, updatedAt: writeTs }),
          writeCloudDocWithFallback(svc, fbUser.uid, '_entitlements', { isPro: true, email: fbUser.email || emailLower, updatedAt: writeTs })
        ]);
        const savedOk = profRes.ok || entRes.ok;
        if (savedOk) {
          setCloudSyncStatus('synced');
          setProPurchaseToast(
            isSignedIntoCloud
              ? `Pro Unlocked & Synced to ${fbUser.email || 'Gmail'} ✓`
              : 'Pro Unlocked! Sign in with Gmail to sync across devices.'
          );
        } else {
          const errCode = profRes.error?.code || entRes.error?.code || 'blocked';
          setProPurchaseToast(`Pro Unlocked locally (Cloud error: ${errCode}).`);
        }
      } catch {
        setProPurchaseToast('Pro Unlocked on this device!');
      }
    } else {
      setProPurchaseToast('Pro Unlocked on this device! Sign in with Gmail to sync.');
    }

    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => { setActiveModal(null); setProPurchaseToast(''); }, 1200);
  };

  const restoreCloudPurchase = async () => {
    emitBeep(620, 'sine', 0.08);
    if (!resolvedFirebaseConfig) {
      if (isProUnlocked) {
        setRestoreStatusToast('Lifetime Pro is active on this device ✓');
        setTimeout(() => setRestoreStatusToast(''), 2500);
      } else {
        openProPaywall('Restore Purchase');
      }
      return;
    }
    setRestoreStatusToast('Syncing with Gmail cloud account...');
    try {
      const svc = await getFirebaseServices();
      if (!svc) {
        setRestoreStatusToast('');
        openProPaywall('Restore Purchase');
        return;
      }
      if (typeof svc.auth.authStateReady === 'function') {
        await svc.auth.authStateReady().catch(() => {});
      }
      const fbUser = svc.auth.currentUser || cloudAuthUser;
      if (!fbUser || fbUser.isAnonymous) {
        setRestoreStatusToast('');
        setAuthErrorMsg('Sign in with your Gmail account to sync progress & restore Pro.');
        setAuthMode('signin');
        setAuthScreenOpen(true);
        return;
      }
      const syncRes = await syncCloudProfileAfterOAuth(svc, fbUser, resolvedUserKey || 'Solver', false);
      if (syncRes?.record?.isPro) {
        setRestoreStatusToast(`Synced & Pro Active (${fbUser.email || 'Gmail'}) ✓`);
        setTimeout(() => setRestoreStatusToast(''), 3500);
      } else {
        setRestoreStatusToast(`Synced ${fbUser.email || 'Gmail'} — Pro not yet saved from mobile.`);
        setTimeout(() => setRestoreStatusToast(''), 4000);
      }
    } catch (err) {
      setRestoreStatusToast(`Cloud sync error: ${err?.code || 'check connection'}`);
      setTimeout(() => setRestoreStatusToast(''), 3500);
    }
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
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${cloudSyncStatus === 'synced' && cloudAuthUser && !cloudAuthUser.isAnonymous ? 'bg-green-400' : 'bg-amber-400'}`} />
              {cloudSyncStatus === 'synced' && cloudAuthUser && !cloudAuthUser.isAnonymous
                ? `Cloud Synced (${cloudAuthUser.email || 'Gmail'})`
                : cloudAuthUser && !cloudAuthUser.isAnonymous
                ? `Local Saved${cloudSyncError ? ` (${cloudSyncError})` : ' • Tap Sync & Restore'}`
                : 'Local Only • Sign in with Gmail to Sync'} • F2L D{safeF2lDay} • OLL D{safeOllDay} • PLL D{safePllDay}
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
              onClick={restoreCloudPurchase}
              className="h-10 px-3.5 rounded-2xl bg-transparent hover:bg-white/[0.08] text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              Sync &amp; Restore
            </button>
          </div>
          {restoreStatusToast && (
            <p className="text-[11px] font-bold text-amber-300 text-center pt-1">{restoreStatusToast}</p>
          )}
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
        className={`fixed inset-0 z-[240] bg-[#040814]/94 backdrop-blur-md flex justify-center overflow-hidden ${stopwatchEnabled ? 'cursor-pointer' : ''}`}
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
        className={`fixed inset-0 z-[245] bg-[#040814]/94 backdrop-blur-md overflow-hidden ${
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
                              if (Object.keys(scannerRawSamples).length > 0) setScannedFaces((prev) => classifyCapturedFaceBatch(scannerRawSamples, prev, scannerLockedFaces, savedCubePalette, SCANNER_COLOR_CODES, SCANNER_COLOR_META));
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
            <ModalShell onClose={() => { setActiveModal(null); setOrbitQuiz((q) => ({ ...q, active: false, feedback: null })); }} zClass="z-[255]" maxWidth="max-w-xs" >
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
