import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  BookOpen,
  BarChart2,
  Settings,
  CheckCircle,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Timer,
  Sparkles,
  Award,
  Shield,
  Users,
  X,
  RefreshCw,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Flame,
  Zap,
  Compass,
  Layers,
  Grid,
  Cpu
} from 'lucide-react';

// ============================================================================
// 1. CLOUD & LOCAL STORAGE CONFIGURATION
// ============================================================================
const STORAGE_KEYS = {
  users: 'ollday_cfop_users_v4',
  masterPin: 'ollday_cfop_master_pin_v4'
};

const DEFAULT_MASTER_PIN = '1678';

const DEFAULT_USERS = {
  Me: {
    pin: '1678',
    isAdmin: true,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 2.5,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  Victor: {
    pin: '0495',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.0,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  Dad: {
    pin: '8994',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.5,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  Raul: {
    pin: '1505',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.0,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  Ephraim: {
    pin: '0713',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.0,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  'Discord Test': {
    pin: '8725',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.0,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  Jared: {
    pin: '0006',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.0,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  },
  Friends: {
    pin: '0007',
    isAdmin: false,
    day: 1,
    f2lDay: 1,
    pllDay: 1,
    targetGoalSec: 3.0,
    chunkSize: 4,
    stats: {},
    f2lStats: {},
    pllStats: {},
    fullSolveHistory: [],
    customChunks: [],
    f2lCustomChunks: [],
    pllCustomChunks: []
  }
};

function resolveFirebaseConfig() {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const p = typeof process !== 'undefined' && process.env ? process.env : {};
    const raw = g.__firebase_config || p.VITE_FIREBASE_CONFIG || p.REACT_APP_FIREBASE_CONFIG;
    if (raw) {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    }
    const apiKey = p.VITE_FIREBASE_API_KEY || p.REACT_APP_FIREBASE_API_KEY;
    const projectId = p.VITE_FIREBASE_PROJECT_ID || p.REACT_APP_FIREBASE_PROJECT_ID;
    const appId = p.VITE_FIREBASE_APP_ID || p.REACT_APP_FIREBASE_APP_ID;
    if (apiKey && projectId) {
      return {
        apiKey,
        authDomain: p.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
        projectId,
        appId: appId || '1:000000000000:web:olldaycfop'
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function resolveAppId() {
  try {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    const p = typeof process !== 'undefined' && process.env ? process.env : {};
    const rawId = g.__app_id || p.VITE_APP_ID || 'ollday-cfop-suite';
    return String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_');
  } catch {
    return 'ollday-cfop-suite';
  }
}

function cleanStatMap(rawMap) {
  if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return {};
  const out = {};
  Object.entries(rawMap).forEach(([k, v]) => {
    if (typeof k !== 'string') return;
    if (v && typeof v === 'object' && !v.$$typeof) {
      out[k] = {
        reps: Number(v.reps) || 0,
        bestMs: v.bestMs != null && Number.isFinite(Number(v.bestMs)) ? Number(v.bestMs) : null,
        lastMs: v.lastMs != null && Number.isFinite(Number(v.lastMs)) ? Number(v.lastMs) : null,
        mastered: Boolean(v.mastered)
      };
    }
  });
  return out;
}

function cleanSolveHistory(rawArr) {
  if (!Array.isArray(rawArr)) return [];
  return rawArr
    .filter((item) => item && typeof item === 'object' && !item.$$typeof && Number.isFinite(Number(item.ms)))
    .slice(0, 100)
    .map((item, idx) => ({
      id: String(item.id || `solve-${idx}-${Date.now()}`),
      ms: Number(item.ms),
      scramble: String(item.scramble || ''),
      penalty: item.penalty === '+2' || item.penalty === 'DNF' ? item.penalty : null,
      timestamp: Number(item.timestamp) || Date.now()
    }));
}

function sanitizeUserRecord(raw, fallbackKey = 'Me') {
  const base = DEFAULT_USERS[fallbackKey] || DEFAULT_USERS.Friends;
  if (!raw || typeof raw !== 'object' || raw.$$typeof) {
    return { ...base };
  }
  const cleanPin = String(raw.pin ?? base.pin ?? '')
    .replace(/\D/g, '')
    .slice(0, 4);
  return {
    pin: cleanPin.length === 4 ? cleanPin : base.pin,
    isAdmin: fallbackKey === 'Me' ? true : Boolean(raw.isAdmin),
    day: Math.max(1, Number(raw.day) || 1),
    f2lDay: Math.max(1, Number(raw.f2lDay) || 1),
    pllDay: Math.max(1, Number(raw.pllDay) || 1),
    targetGoalSec: Math.min(15, Math.max(0.25, Number(raw.targetGoalSec) || base.targetGoalSec || 2.5)),
    chunkSize: Math.min(8, Math.max(2, Number(raw.chunkSize) || 4)),
    stats: cleanStatMap(raw.stats),
    f2lStats: cleanStatMap(raw.f2lStats),
    pllStats: cleanStatMap(raw.pllStats),
    fullSolveHistory: cleanSolveHistory(raw.fullSolveHistory),
    customChunks: Array.isArray(raw.customChunks) ? raw.customChunks.filter((c) => c && typeof c === 'object' && !c.$$typeof) : [],
    f2lCustomChunks: Array.isArray(raw.f2lCustomChunks) ? raw.f2lCustomChunks.filter((c) => c && typeof c === 'object' && !c.$$typeof) : [],
    pllCustomChunks: Array.isArray(raw.pllCustomChunks) ? raw.pllCustomChunks.filter((c) => c && typeof c === 'object' && !c.$$typeof) : []
  };
}

function mergeDefaultUsersWithStored(storedObj) {
  const merged = {};
  Object.keys(DEFAULT_USERS).forEach((k) => {
    merged[k] = sanitizeUserRecord(storedObj?.[k], k);
  });
  if (storedObj && typeof storedObj === 'object') {
    Object.keys(storedObj).forEach((k) => {
      if (!merged[k] && typeof k === 'string' && k.trim()) {
        merged[k] = sanitizeUserRecord(storedObj[k], k);
      }
    });
  }
  return merged;
}

// ============================================================================
// 2. CFOP CURRICULUM DATA (CROSS, F2L 41, OLL 57, PLL 25)
// ============================================================================
const CROSS_TIERS = [
  { tier: 1, name: 'Tier 1: 2-Move Cross', moves: 2, desc: 'Instant pattern recognition & clean D-layer alignment.' },
  { tier: 2, name: 'Tier 2: 3-Move Cross', moves: 3, desc: 'Two-piece pairing with single setup turn.' },
  { tier: 3, name: 'Tier 3: 4-Move Cross', moves: 4, desc: 'Multi-edge insertion while preserving solved cross pieces.' },
  { tier: 4, name: 'Tier 4: 5-Move Cross', moves: 5, desc: 'Full inspection planning of 3+ edges before first turn.' },
  { tier: 5, name: 'Tier 5: 6-Move Cross', moves: 6, desc: 'Standard competition-length cross solution.' },
  { tier: 6, name: 'Tier 6: 7-Move Cross', moves: 7, desc: 'Complex flipped-edge cases solved blindfolded.' },
  { tier: 7, name: 'Tier 7: 8-Move Grandmaster Cross', moves: 8, desc: 'Worst-case 8-move cross + first F2L pair tracking.' }
];

const F2L_DATA = Array.from({ length: 41 }, (_, idx) => {
  const num = idx + 1;
  const groups = [
    'Basic Inserts',
    'Corner in Top, Edge in Top',
    'Corner in Bottom',
    'Edge in Middle Slot',
    'Both in Slot'
  ];
  const group =
    num <= 4
      ? groups[0]
      : num <= 24
        ? groups[1]
        : num <= 30
          ? groups[2]
          : num <= 36
            ? groups[3]
            : groups[4];
  const sampleAlgs = [
    "U R U' R'",
    "y' U' R' U R",
    "R U R'",
    "y' R' U' R",
    "U' R U R' U2 R U' R'",
    "U R U' R' U' F' U F",
    "U' R U2 R' U2 R U' R'",
    "R U2 R' U' R U R'",
    "U' R U' R' U R U R'",
    "U R U R' U2 R U R'",
    "U' R U2 R' U F' U' F",
    "R U' R' U R U' R' U2 R U' R'",
    "y' U R' U' R U2 R' U R",
    "U' R U' R' U' R U R'",
    "R U R' U2 R U' R' U R U' R'",
    "R U' R' U2 F' U' F",
    "R U2 R' U' R U R'",
    "y' R' U2 R U R' U' R",
    "U R U2 R' U R U' R'",
    "y' U' R' U2 R U' R' U R",
    "U2 R U R' U R U' R'",
    "y' U2 R' U' R U' R' U R",
    "U R U' R' U' R U' R' U R U' R'",
    "y' U' R' U R U R' U R U' R' U R",
    "R' F' R U R U' R' F",
    "U R U' R' F' U' F",
    "R U' R' U R U' R'",
    "R U R' U' F R' F' R",
    "R' F R F' U R U' R'",
    "R U R' U' R U R'",
    "U' R' F R F' R U' R'",
    "R U R' U' R U R' U' R U R'",
    "U' R U' R' U2 R U' R'",
    "U R U R' U2 R U R'",
    "U' R U R' U F' U' F",
    "U2 R' F R F' U2 R U R'",
    "R U' R' d R' U2 R U2 R' U R",
    "R U' R' U' R U R' U2 R U' R'",
    "R U' R' U R U2 R' U R U' R'",
    "r U' r' U2 r U r' R U R'",
    "R U' R' F' L' U2 L F"
  ];
  return {
    id: `F2L-${num}`,
    num,
    name: `F2L #${num}`,
    group,
    alg: sampleAlgs[idx % sampleAlgs.length],
    setup: `R U R' U' F' U F U${num % 2 === 0 ? "'" : '2'}`
  };
});

const OLL_DATA = Array.from({ length: 57 }, (_, idx) => {
  const num = idx + 1;
  const groups = [
    'Dot Cases',
    'All Edges Oriented (OCLL)',
    'T-Shapes',
    'Squares',
    'C-Shapes',
    'W-Shapes',
    'P-Shapes',
    'I-Shapes',
    'Fish Shapes',
    'Knight Move',
    'Awkward Shapes',
    'Lightning Bolts'
  ];
  const group = groups[idx % groups.length];
  const sampleAlgs = [
    "R U2 R2 F R F' U2 R' F R F'",
    "F R U R' U' F' f R U R' U' f'",
    "f R U R' U' f' U' F R U R' U' F'",
    "f R U R' U' f' U F R U R' U' F'",
    "r' U2 R U R' U r",
    "r U2 R' U' R U' r'",
    "r U R' U R U2 r'",
    "r' U' R U' R' U2 r",
    "R U R' U' R' F R2 U R' U' F'",
    "R U R' U R' F R F' R U2 R'",
    "r U R' U R' F R F' R U2 r'",
    "M' R' U' R U' R' U2 R U' R r'",
    "F U R U' R2 F' R U R U' R'",
    "R' F R U R' F' R F U' F'",
    "l' U' l L' U' L U l' U l",
    "r U r' R U R' U' r U' r'",
    "F R' F' R2 r' U R U' R' U' M'",
    "r U R' U R U2 r2 U' R U' R' U2 r",
    "r' R U R U R' U' M' R' F R F'",
    "r U R' U' M2 U R U' R' U' M'",
    "R U2 R' U' R U R' U' R U' R'",
    "R U2 R2 U' R2 U' R2 U2 R",
    "R2 D' R U2 R' D R U2 R",
    "r U R' U' r' F R F'",
    "F' r U R' U' r' F R",
    "R U2 R' U' R U' R'",
    "R U R' U R U2 R'"
  ];
  return {
    id: `OLL-${num}`,
    num,
    name: `OLL #${num}`,
    group,
    alg: sampleAlgs[idx % sampleAlgs.length]
  };
});

const PLL_DATA = [
  { id: 'PLL-1', num: 1, name: 'Ua Perm', group: 'Edges Only', alg: "R U' R U R U R U' R' U' R2" },
  { id: 'PLL-2', num: 2, name: 'Ub Perm', group: 'Edges Only', alg: "R2 U R U R' U' R' U' R' U R'" },
  { id: 'PLL-3', num: 3, name: 'H Perm', group: 'Edges Only', alg: "M2 U M2 U2 M2 U M2" },
  { id: 'PLL-4', num: 4, name: 'Z Perm', group: 'Edges Only', alg: "M' U M2 U M2 U M' U2 M2" },
  { id: 'PLL-5', num: 5, name: 'Aa Perm', group: 'Corners Only', alg: "x R' U R' D2 R U' R' D2 R2 x'" },
  { id: 'PLL-6', num: 6, name: 'Ab Perm', group: 'Corners Only', alg: "x R2 D2 R U R' D2 R U' R x'" },
  { id: 'PLL-7', num: 7, name: 'E Perm', group: 'Corners Only', alg: "x' R U' R' D R U R' D' R U R' D R U' R' D' x" },
  { id: 'PLL-8', num: 8, name: 'T Perm', group: 'Adjacent Swap', alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
  { id: 'PLL-9', num: 9, name: 'Jb Perm', group: 'Adjacent Swap', alg: "R U R' F' R U R' U' R' F R2 U' R'" },
  { id: 'PLL-10', num: 10, name: 'Ja Perm', group: 'Adjacent Swap', alg: "x R2 F R F' R U2 r' U r U2 x'" },
  { id: 'PLL-11', num: 11, name: 'Ra Perm', group: 'Adjacent Swap', alg: "R U' R' U' R U R D R' U' R D' R' U2 R'" },
  { id: 'PLL-12', num: 12, name: 'Rb Perm', group: 'Adjacent Swap', alg: "R' U2 R U2 R' F R U R' U' R' F' R2" },
  { id: 'PLL-13', num: 13, name: 'F Perm', group: 'Adjacent Swap', alg: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R" },
  { id: 'PLL-14', num: 14, name: 'Y Perm', group: 'Diagonal Swap', alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'" },
  { id: 'PLL-15', num: 15, name: 'V Perm', group: 'Diagonal Swap', alg: "R' U R' U' y R' F' R2 U' R' U R' F R F" },
  { id: 'PLL-16', num: 16, name: 'Na Perm', group: 'Diagonal Swap', alg: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'" },
  { id: 'PLL-17', num: 17, name: 'Nb Perm', group: 'Diagonal Swap', alg: "R' U R U' R' F' U' F R U R' F R' F' R U' R" },
  { id: 'PLL-18', num: 18, name: 'Ga Perm', group: 'G Perms', alg: "R2 U R' U R' U' R U' R2 D U' R' U R D'" },
  { id: 'PLL-19', num: 19, name: 'Gb Perm', group: 'G Perms', alg: "R' U' R U D' R2 U R' U R U' R U' R2 D" },
  { id: 'PLL-20', num: 20, name: 'Gc Perm', group: 'G Perms', alg: "R2 U' R U' R U R' U R2 D' U R U' R' D" },
  { id: 'PLL-21', num: 21, name: 'Gd Perm', group: 'G Perms', alg: "R U R' U' D R2 U' R U' R' U R' U R2 D'" },
  { id: 'PLL-22', num: 22, name: 'Lefty Ua', group: 'Two-Hand / OH Alt', alg: "L' U L' U' L' U' L' U L U L2" },
  { id: 'PLL-23', num: 23, name: 'Lefty Ub', group: 'Two-Hand / OH Alt', alg: "L2 U' L' U' L U L U L U' L" },
  { id: 'PLL-24', num: 24, name: 'RUS Ua', group: 'Two-Hand / OH Alt', alg: "R2 U' S' U2 S U' R2" },
  { id: 'PLL-25', num: 25, name: 'RUS Ub', group: 'Two-Hand / OH Alt', alg: "R2 U S' U2 S U R2" }
];

// ============================================================================
// 3. SCRAMBLE & WCA AVERAGE UTILITIES
// ============================================================================
function generate3x3Scramble(length = 20) {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
  const axisMap = { U: 0, D: 0, L: 1, R: 1, F: 2, B: 2 };
  const modifiers = ['', "'", '2'];
  const seq = [];
  let lastFace = '';
  let secondLastFace = '';
  while (seq.length < length) {
    const f = faces[Math.floor(Math.random() * faces.length)];
    if (f === lastFace) continue;
    if (secondLastFace && axisMap[f] === axisMap[lastFace] && f === secondLastFace) continue;
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    seq.push(`${f}${mod}`);
    secondLastFace = lastFace;
    lastFace = f;
  }
  return seq.join(' ');
}

function generateCrossScramble(movesCount = 5) {
  return generate3x3Scramble(Math.max(2, Math.min(8, Number(movesCount) || 5)));
}

function formatMs(ms, decimals = 2) {
  if (ms == null || !Number.isFinite(Number(ms))) return '—';
  const sec = Number(ms) / 1000;
  return `${sec.toFixed(decimals)}s`;
}

function computeWcaAverage(solves, size) {
  if (!Array.isArray(solves) || solves.length < size) return null;
  const slice = solves.slice(0, size);
  const effectiveValues = slice.map((s) => {
    if (s.penalty === 'DNF') return Infinity;
    return Number(s.ms) + (s.penalty === '+2' ? 2000 : 0);
  });
  const dnfCount = effectiveValues.filter((v) => !Number.isFinite(v)).length;
  if (dnfCount >= 2) return 'DNF';
  const sorted = [...effectiveValues].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, size - 1);
  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  return sum / (size - 2);
}

function buildSchedule(customChunks, dataList, chunkSize = 4) {
  const safeSize = Math.max(2, Number(chunkSize) || 4);
  const days = [];
  for (let i = 0; i < dataList.length; i += safeSize) {
    const slice = dataList.slice(i, i + safeSize);
    const dayNum = days.length + 1;
    const custom = Array.isArray(customChunks) ? customChunks.find((c) => Number(c.day) === dayNum) : null;
    days.push({
      day: dayNum,
      title: String(custom?.title || `${slice[0]?.group || 'Core'} • Set ${dayNum}`),
      items: slice
    });
  }
  return days;
}

// ============================================================================
// 4. INTERACTIVE 3D SPATIAL F2L CUBE COMPONENT (1:1 FINGER VELOCITY SPIN)
// ============================================================================
function F2LSpatial3DCube({ caseItem, setupSeed = 0 }) {
  const [rotX, setRotX] = useState(-26);
  const [rotY, setRotY] = useState(-38);
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setRotX(-26);
    setRotY(-38 + (setupSeed % 4) * 90);
  }, [caseItem?.id, setupSeed]);

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    lastPosRef.current = { x: clientX, y: clientY };
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = clientX - lastPosRef.current.x;
    const dy = clientY - lastPosRef.current.y;
    lastPosRef.current = { x: clientX, y: clientY };
    // Direct 1:1 angular velocity mapping so slow drags crawl and fast drags spin rapidly
    setRotY((prev) => prev + dx * 0.85);
    setRotX((prev) => Math.max(-85, Math.min(85, prev - dy * 0.75)));
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const caseNum = Number(caseItem?.num) || 1;
  // Color palette for solved bottom two layers + dynamic F2L slot target
  const colors = {
    U: '#facc15', // Yellow top
    D: '#f8fafc', // White bottom
    F: '#22c55e', // Green front
    B: '#3b82f6', // Blue back
    R: '#ef4444', // Red right
    L: '#f97316', // Orange left
    X: '#334155'  // Masked top-layer non-F2L sticker
  };

  const getStickers = (face) => {
    if (face === 'D') return Array(9).fill(colors.D);
    if (face === 'U') {
      const arr = Array(9).fill(colors.X);
      arr[4] = colors.U;
      const targetCornerIdx = [8, 6, 2, 0][(caseNum + setupSeed) % 4];
      arr[targetCornerIdx] = caseNum % 2 === 0 ? colors.F : colors.U;
      return arr;
    }
    if (face === 'F') {
      return [
        colors.X,
        caseNum % 3 === 0 ? colors.F : colors.X,
        colors.R,
        colors.F,
        colors.F,
        colors.X,
        colors.F,
        colors.F,
        colors.F
      ];
    }
    if (face === 'R') {
      return [
        colors.U,
        colors.X,
        colors.X,
        colors.X,
        colors.R,
        colors.R,
        colors.R,
        colors.R,
        colors.R
      ];
    }
    if (face === 'B') {
      return [colors.X, colors.X, colors.X, colors.B, colors.B, colors.B, colors.B, colors.B, colors.B];
    }
    return [colors.X, colors.X, colors.X, colors.L, colors.L, colors.L, colors.L, colors.L, colors.L];
  };

  const size = 136;
  const half = size / 2;

  const faces = [
    { key: 'F', transform: `translateZ(${half}px)`, shade: 'brightness(1.02)' },
    { key: 'B', transform: `rotateY(180deg) translateZ(${half}px)`, shade: 'brightness(0.82)' },
    { key: 'R', transform: `rotateY(90deg) translateZ(${half}px)`, shade: 'brightness(0.92)' },
    { key: 'L', transform: `rotateY(-90deg) translateZ(${half}px)`, shade: 'brightness(0.86)' },
    { key: 'U', transform: `rotateX(90deg) translateZ(${half}px)`, shade: 'brightness(1.08)' },
    { key: 'D', transform: `rotateX(-90deg) translateZ(${half}px)`, shade: 'brightness(0.76)' }
  ];

  return (
    <div
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className="relative flex flex-col items-center justify-center w-full h-56 select-none cursor-grab active:cursor-grabbing touch-none overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 border border-slate-800/80"
    >
      {/* Ambient 3D Stage Glow */}
      <div className="pointer-events-none absolute w-44 h-44 rounded-full bg-indigo-500/15 blur-2xl" />

      {/* 3D Perspective Viewport */}
      <div style={{ perspective: '680px' }} className="flex items-center justify-center w-44 h-44">
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`
          }}
          className="relative"
        >
          {faces.map((f) => (
            <div
              key={f.key}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                transform: f.transform,
                filter: f.shade,
                backfaceVisibility: 'visible'
              }}
              className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1.5 p-1.5 bg-slate-950 rounded-xl border border-slate-800 shadow-inner"
            >
              {getStickers(f.key).map((hex, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: hex }}
                  className="rounded-md shadow-[inset_0_1px_2px_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.65)]"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Grounded Floor Shadow */}
      <div
        style={{
          transform: `scaleX(${1 + Math.abs(Math.sin((rotY * Math.PI) / 180)) * 0.14})`
        }}
        className="w-28 h-3 rounded-full bg-black/75 blur-md mt-1"
      />

      <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Drag finger to spin in 3D space</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRotX(-26);
            setRotY(-38);
          }}
          className="px-2 py-0.5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-medium"
        >
          Reset View
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 5. ERROR BOUNDARY GUARDRAIL
// ============================================================================
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, errorMsg: String(err?.message || 'Unexpected render error') };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-rose-400 mb-2">CFOP Suite Recovery</h2>
            <p className="text-sm text-slate-400 mb-4">{this.state.errorMsg}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMsg: '' })}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm"
            >
              Reload Interface
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// 6. MAIN APPLICATION SUITE
// ============================================================================
function OLLDaySuite() {
  // --- User Accounts & Cloud State ---
  const [users, setUsers] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.users);
      if (saved) return mergeDefaultUsersWithStored(JSON.parse(saved));
    } catch {
      // Ignore storage errors
    }
    return mergeDefaultUsersWithStored(null);
  });
  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
    try {
      window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
    } catch {
      // Ignore quota errors
    }
  }, [users]);

  const [masterAdminPin, setMasterAdminPin] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEYS.masterPin) || DEFAULT_MASTER_PIN;
    } catch {
      return DEFAULT_MASTER_PIN;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.masterPin, masterAdminPin);
    } catch {
      // Ignore
    }
  }, [masterAdminPin]);

  const [activeUserKey, setActiveUserKey] = useState('Me');
  const [startupPinLocked, setStartupPinLocked] = useState(true);
  const [pinEntryInput, setPinEntryInput] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');
  const [pinShake, setPinShake] = useState(false);

  // Cloud Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState('local'); // 'local' | 'connecting' | 'synced'
  const dbRef = useRef(null);
  const firestoreModRef = useRef(null);
  const appId = useMemo(() => resolveAppId(), []);

  useEffect(() => {
    let unsubProfiles = null;
    let unsubConfig = null;
    let cancelled = false;

    const initCloud = async () => {
      const cfg = resolveFirebaseConfig();
      if (!cfg) {
        setCloudSyncStatus('local');
        return;
      }
      setCloudSyncStatus('connecting');
      try {
        const appMod = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js');
        const authMod = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js');
        const fsMod = await import(/* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js');
        if (cancelled) return;

        const fbApp = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
        const auth = authMod.getAuth(fbApp);
        const db = fsMod.getFirestore(fbApp);
        dbRef.current = db;
        firestoreModRef.current = fsMod;

        const g = typeof globalThis !== 'undefined' ? globalThis : {};
        if (g.__initial_auth_token) {
          await authMod.signInWithCustomToken(auth, g.__initial_auth_token);
        } else if (!auth.currentUser) {
          await authMod.signInAnonymously(auth);
        }
        if (cancelled) return;

        const profilesCol = fsMod.collection(db, 'artifacts', appId, 'public', 'data', 'solver_profiles');
        const configDoc = fsMod.doc(db, 'artifacts', appId, 'public', 'data', 'suite_config', 'global');

        unsubProfiles = fsMod.onSnapshot(
          profilesCol,
          (snap) => {
            if (snap.empty) {
              Object.entries(usersRef.current).forEach(([k, val]) => {
                fsMod.setDoc(fsMod.doc(profilesCol, k), sanitizeUserRecord(val, k), { merge: true }).catch(() => {});
              });
            } else {
              const incoming = {};
              snap.forEach((d) => {
                incoming[d.id] = sanitizeUserRecord(d.data(), d.id);
              });
              setUsers((prev) => mergeDefaultUsersWithStored({ ...prev, ...incoming }));
            }
            setCloudSyncStatus('synced');
          },
          () => setCloudSyncStatus('local')
        );

        unsubConfig = fsMod.onSnapshot(
          configDoc,
          (snap) => {
            if (snap.exists() && snap.data()?.masterAdminPin) {
              setMasterAdminPin(String(snap.data().masterAdminPin));
            }
          },
          () => {}
        );
      } catch {
        if (!cancelled) setCloudSyncStatus('local');
      }
    };

    initCloud();
    return () => {
      cancelled = true;
      try {
        if (unsubProfiles) unsubProfiles();
        if (unsubConfig) unsubConfig();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [appId]);

  const saveUserRecord = (uKey, updatedRecord) => {
    const clean = sanitizeUserRecord(updatedRecord, uKey);
    setUsers((prev) => {
      const next = { ...prev, [uKey]: clean };
      usersRef.current = next;
      return next;
    });
    if (dbRef.current && firestoreModRef.current) {
      const { doc, setDoc } = firestoreModRef.current;
      setDoc(doc(dbRef.current, 'artifacts', appId, 'public', 'data', 'solver_profiles', uKey), clean, {
        merge: true
      }).catch(() => {});
    }
  };

  const deleteUserRecord = (uKey) => {
    if (uKey === 'Me') return;
    setUsers((prev) => {
      const next = { ...prev };
      delete next[uKey];
      usersRef.current = next;
      return next;
    });
    if (dbRef.current && firestoreModRef.current) {
      const { doc, deleteDoc } = firestoreModRef.current;
      deleteDoc(doc(dbRef.current, 'artifacts', appId, 'public', 'data', 'solver_profiles', uKey)).catch(() => {});
    }
  };

  const currentUser = useMemo(
    () => sanitizeUserRecord(users[activeUserKey], activeUserKey),
    [users, activeUserKey]
  );

  // --- Navigation & Tab State ---
  const [activePhase, setActivePhase] = useState('oll'); // 'cross' | 'f2l' | 'oll' | 'pll'
  const [crossTab, setCrossTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [f2lTab, setF2lTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [activeTab, setActiveTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings' (OLL)
  const [pllTab, setPllTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'

  // --- Settings Deck Carousel State ---
  const [settingsCardIdx, setSettingsCardIdx] = useState(0);
  const [showOwnPin, setShowOwnPin] = useState(false);
  const [ownPinDraft, setOwnPinDraft] = useState('');
  const [ownPinFeedback, setOwnPinFeedback] = useState('');
  const [targetPbDraft, setTargetPbDraft] = useState('');

  // Admin Panel State (Inside Card 6 of Settings)
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPinAttempt, setAdminPinAttempt] = useState('');
  const [adminStatusMsg, setAdminStatusMsg] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [editUserPins, setEditUserPins] = useState({});

  useEffect(() => {
    setTargetPbDraft(Number(currentUser.targetGoalSec || 2.5).toFixed(3));
    setOwnPinDraft('');
    setOwnPinFeedback('');
  }, [activeUserKey, currentUser.targetGoalSec]);

  // --- Cross Trainer State ---
  const [selectedCrossTier, setSelectedCrossTier] = useState(3);
  const [crossScramble, setCrossScramble] = useState(() => generateCrossScramble(4));
  const [crossTimerRunning, setCrossTimerRunning] = useState(false);
  const [crossElapsedMs, setCrossElapsedMs] = useState(0);
  const [crossBlindMode, setCrossBlindMode] = useState(false);
  const [crossHideScramble, setCrossHideScramble] = useState(false);
  const [crossHistory, setCrossHistory] = useState([]);
  const crossStartRef = useRef(0);

  useEffect(() => {
    if (!crossTimerRunning) return;
    const id = setInterval(() => {
      setCrossElapsedMs(performance.now() - crossStartRef.current);
    }, 16);
    return () => clearInterval(id);
  }, [crossTimerRunning]);

  // --- Full-Screen 3x3x3 CFOP Timer State (Ao5 & Ao12) ---
  const [fullTimerOpen, setFullTimerOpen] = useState(false);
  const [fullScramble, setFullScramble] = useState(() => generate3x3Scramble(20));
  const [fullTimerState, setFullTimerState] = useState('idle'); // 'idle' | 'running' | 'stopped'
  const [fullElapsedMs, setFullElapsedMs] = useState(0);
  const fullStartRef = useRef(0);

  useEffect(() => {
    if (fullTimerState !== 'running') return;
    const id = setInterval(() => {
      setFullElapsedMs(performance.now() - fullStartRef.current);
    }, 16);
    return () => clearInterval(id);
  }, [fullTimerState]);

  const handleFullScreenTap = () => {
    if (fullTimerState === 'running') {
      const finalMs = Math.max(10, Math.round(performance.now() - fullStartRef.current));
      setFullElapsedMs(finalMs);
      setFullTimerState('stopped');
      const newEntry = {
        id: `cfop-${Date.now()}`,
        ms: finalMs,
        scramble: fullScramble,
        penalty: null,
        timestamp: Date.now()
      };
      const nextHistory = [newEntry, ...(currentUser.fullSolveHistory || [])].slice(0, 100);
      saveUserRecord(activeUserKey, { ...currentUser, fullSolveHistory: nextHistory });
      setFullScramble(generate3x3Scramble(20));
    } else {
      fullStartRef.current = performance.now();
      setFullElapsedMs(0);
      setFullTimerState('running');
    }
  };

  const applyPenaltyToLastFullSolve = (penaltyType) => {
    const hist = [...(currentUser.fullSolveHistory || [])];
    if (!hist.length) return;
    hist[0] = {
      ...hist[0],
      penalty: hist[0].penalty === penaltyType ? null : penaltyType
    };
    saveUserRecord(activeUserKey, { ...currentUser, fullSolveHistory: hist });
  };

  const deleteLastFullSolve = () => {
    const hist = [...(currentUser.fullSolveHistory || [])];
    if (!hist.length) return;
    hist.shift();
    saveUserRecord(activeUserKey, { ...currentUser, fullSolveHistory: hist });
    setFullElapsedMs(0);
    setFullTimerState('idle');
  };

  // --- Active Algorithm Drill Modal (F2L / OLL / PLL) ---
  const [drillModal, setDrillModal] = useState(null); // { phase: 'f2l'|'oll'|'pll', items: [...], index: 0 }
  const [drillTimerRunning, setDrillTimerRunning] = useState(false);
  const [drillElapsedMs, setDrillElapsedMs] = useState(0);
  const [f2lSetupSeed, setF2lSetupSeed] = useState(0);
  const drillStartRef = useRef(0);

  useEffect(() => {
    if (!drillTimerRunning) return;
    const id = setInterval(() => {
      setDrillElapsedMs(performance.now() - drillStartRef.current);
    }, 16);
    return () => clearInterval(id);
  }, [drillTimerRunning]);

  const recordDrillSolve = (phase, itemId, ms) => {
    const statKey = phase === 'f2l' ? 'f2lStats' : phase === 'pll' ? 'pllStats' : 'stats';
    const existingMap = { ...(currentUser[statKey] || {}) };
    const prev = existingMap[itemId] || { reps: 0, bestMs: null, lastMs: null, mastered: false };
    const bestMs = prev.bestMs == null ? ms : Math.min(prev.bestMs, ms);
    const goalMs = (Number(currentUser.targetGoalSec) || 2.5) * 1000;
    existingMap[itemId] = {
      reps: prev.reps + 1,
      bestMs,
      lastMs: ms,
      mastered: bestMs <= goalMs || prev.reps + 1 >= 5
    };
    saveUserRecord(activeUserKey, { ...currentUser, [statKey]: existingMap });
  };

  // --- Granular Reset Modal ---
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargets, setResetTargets] = useState({
    cross: false,
    f2l: false,
    oll: false,
    pll: false,
    fullTimer: false
  });

  const handleConfirmReset = () => {
    const next = { ...currentUser };
    if (resetTargets.cross) setCrossHistory([]);
    if (resetTargets.f2l) {
      next.f2lStats = {};
      next.f2lDay = 1;
    }
    if (resetTargets.oll) {
      next.stats = {};
      next.day = 1;
    }
    if (resetTargets.pll) {
      next.pllStats = {};
      next.pllDay = 1;
    }
    if (resetTargets.fullTimer) {
      next.fullSolveHistory = [];
    }
    saveUserRecord(activeUserKey, next);
    setResetModalOpen(false);
    setResetTargets({ cross: false, f2l: false, oll: false, pll: false, fullTimer: false });
  };

  // --- Schedules & Computed Telemetry ---
  const f2lSchedule = useMemo(
    () => buildSchedule(currentUser.f2lCustomChunks, F2L_DATA, currentUser.chunkSize),
    [currentUser.f2lCustomChunks, currentUser.chunkSize]
  );
  const ollSchedule = useMemo(
    () => buildSchedule(currentUser.customChunks, OLL_DATA, currentUser.chunkSize),
    [currentUser.customChunks, currentUser.chunkSize]
  );
  const pllSchedule = useMemo(
    () => buildSchedule(currentUser.pllCustomChunks, PLL_DATA, currentUser.chunkSize),
    [currentUser.pllCustomChunks, currentUser.chunkSize]
  );

  const safeF2lDay = Math.min(f2lSchedule.length, Math.max(1, Number(currentUser.f2lDay) || 1));
  const safeOllDay = Math.min(ollSchedule.length, Math.max(1, Number(currentUser.day) || 1));
  const safePllDay = Math.min(pllSchedule.length, Math.max(1, Number(currentUser.pllDay) || 1));

  const currentF2lDayObj = f2lSchedule[safeF2lDay - 1] || f2lSchedule[0];
  const currentOllDayObj = ollSchedule[safeOllDay - 1] || ollSchedule[0];
  const currentPllDayObj = pllSchedule[safePllDay - 1] || pllSchedule[0];

  const ao5Full = useMemo(() => computeWcaAverage(currentUser.fullSolveHistory, 5), [currentUser.fullSolveHistory]);
  const ao12Full = useMemo(() => computeWcaAverage(currentUser.fullSolveHistory, 12), [currentUser.fullSolveHistory]);
  const bestFullSingle = useMemo(() => {
    const valid = (currentUser.fullSolveHistory || [])
      .filter((s) => s.penalty !== 'DNF')
      .map((s) => Number(s.ms) + (s.penalty === '+2' ? 2000 : 0));
    return valid.length ? Math.min(...valid) : null;
  }, [currentUser.fullSolveHistory]);

  // --- PIN Keypad Entry Handler ---
  const handleKeypadPress = (key) => {
    if (key === 'Clear') {
      setPinEntryInput('');
      setPinErrorMsg('');
      return;
    }
    if (key === '⌫') {
      setPinEntryInput((prev) => prev.slice(0, -1));
      setPinErrorMsg('');
      return;
    }
    if (pinEntryInput.length >= 4) return;
    const nextVal = `${pinEntryInput}${key}`;
    setPinEntryInput(nextVal);
    setPinErrorMsg('');

    if (nextVal.length === 4) {
      const matchedEntry = Object.entries(usersRef.current).find(
        ([, uData]) => String(uData?.pin || '').trim() === nextVal
      );
      if (matchedEntry) {
        const [matchedUserKey] = matchedEntry;
        setActiveUserKey(matchedUserKey);
        setStartupPinLocked(false);
        setPinEntryInput('');
        setPinErrorMsg('');
        setAdminUnlocked(false);
        setAdminPinAttempt('');
      } else {
        setPinShake(true);
        setPinErrorMsg('Incorrect Passcode');
        setTimeout(() => {
          setPinShake(false);
          setPinEntryInput('');
        }, 450);
      }
    }
  };

  // ==========================================================================
  // 7. iOS GLASSMORPHIC LOCK SCREEN GATE
  // ==========================================================================
  if (startupPinLocked) {
    const keypadButtons = [
      { digit: '1', letters: '' },
      { digit: '2', letters: 'ABC' },
      { digit: '3', letters: 'DEF' },
      { digit: '4', letters: 'GHI' },
      { digit: '5', letters: 'JKL' },
      { digit: '6', letters: 'MNO' },
      { digit: '7', letters: 'PQRS' },
      { digit: '8', letters: 'TUV' },
      { digit: '9', letters: 'WXYZ' },
      { digit: 'Clear', letters: '' },
      { digit: '0', letters: '+' },
      { digit: '⌫', letters: '' }
    ];

    return (
      <div className="min-h-screen w-full relative overflow-hidden bg-slate-950 text-white flex flex-col items-center justify-between py-12 px-6 select-none">
        {/* Ambient iOS Lock Screen Mesh Gradient */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 w-96 h-96 rounded-full bg-violet-600/25 blur-3xl" />

        {/* Top Lock Header */}
        <div className="relative z-10 flex flex-col items-center mt-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] mb-4">
            <Lock className="w-5 h-5 text-white/90" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white/95">Enter Passcode</h1>
          <p className="text-xs text-white/60 mt-1">OLLDay CFOP Master Suite</p>

          {/* 4 Passcode Dots */}
          <div className={`flex items-center gap-4 mt-6 ${pinShake ? 'animate-bounce' : ''}`}>
            {[0, 1, 2, 3].map((idx) => {
              const filled = pinEntryInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border transition-all duration-150 ${
                    filled
                      ? 'bg-white border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.85)]'
                      : 'bg-white/10 border-white/45'
                  }`}
                />
              );
            })}
          </div>

          <div className="h-5 mt-3 flex items-center justify-center">
            {pinErrorMsg ? (
              <span className="text-xs font-medium text-rose-300">{String(pinErrorMsg)}</span>
            ) : (
              <span className="text-[11px] text-white/45">
                {cloudSyncStatus === 'synced' ? '● Cloud Synced' : '● Ready'}
              </span>
            )}
          </div>
        </div>

        {/* Circular Frosted Glass Keypad */}
        <div className="relative z-10 grid grid-cols-3 gap-x-6 gap-y-4 max-w-xs w-full place-items-center my-auto">
          {keypadButtons.map((btn) => {
            const isAction = btn.digit === 'Clear' || btn.digit === '⌫';
            if (isAction) {
              return (
                <button
                  key={btn.digit}
                  type="button"
                  onClick={() => handleKeypadPress(btn.digit)}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-sm font-medium text-white/75 hover:text-white active:scale-95 transition"
                >
                  {btn.digit}
                </button>
              );
            }
            return (
              <button
                key={btn.digit}
                type="button"
                onClick={() => handleKeypadPress(btn.digit)}
                className="w-20 h-20 rounded-full bg-white/12 hover:bg-white/20 active:bg-white/35 backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_8px_24px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center active:scale-95 transition-all duration-100"
              >
                <span className="text-3xl font-light leading-none text-white">{btn.digit}</span>
                <span className="text-[9px] font-semibold tracking-[0.22em] text-white/60 mt-1 h-3">
                  {btn.letters}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative z-10 text-[11px] text-white/40">
          Private Solver Session • Each profile is isolated
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 8. SHARED FULL-SOLVE 3x3x3 TELEMETRY SECTION (ALL PHASES STATS)
  // ==========================================================================
  const renderFullSolveStatsSection = () => (
    <section className="mt-6 rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
            Global 3x3x3 CFOP Session
          </span>
          <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            <Timer className="w-4 h-4 text-indigo-400" />
            Full 3x3x3 CFOP Telemetry
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            setFullTimerState('idle');
            setFullElapsedMs(0);
            setFullTimerOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow"
        >
          Open Timer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Ao5</div>
          <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
            {ao5Full === 'DNF' ? 'DNF' : formatMs(ao5Full, 2)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Ao12</div>
          <div className="text-lg font-mono font-bold text-sky-400 mt-0.5">
            {ao12Full === 'DNF' ? 'DNF' : formatMs(ao12Full, 2)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Best PB</div>
          <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">
            {formatMs(bestFullSingle, 2)}
          </div>
        </div>
      </div>

      {currentUser.fullSolveHistory?.length > 0 ? (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {currentUser.fullSolveHistory.slice(0, 12).map((s, i) => {
            const adj = s.penalty === 'DNF' ? 'DNF' : formatMs(Number(s.ms) + (s.penalty === '+2' ? 2000 : 0), 2);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/70"
              >
                <span className="text-slate-400 font-mono">#{currentUser.fullSolveHistory.length - i}</span>
                <span className="font-mono font-bold text-slate-100">
                  {adj} {s.penalty === '+2' ? '(+2)' : ''}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{s.scramble}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-slate-500 text-center py-3">
          No 3x3x3 full solves logged yet. Launch the Full-Screen Timer to record Ao5 & Ao12.
        </p>
      )}
    </section>
  );

  // ==========================================================================
  // 9. SETTINGS 6-CARD DECK (SHARED ACROSS ALL PHASES)
  // ==========================================================================
  const renderSettingsDeck = () => {
    const totalCards = 6;
    const targetSecNum = Number(currentUser.targetGoalSec) || 2.5;

    const commitTargetPb = (val) => {
      const parsed = parseFloat(val);
      if (!Number.isFinite(parsed)) return;
      const clamped = Math.min(15, Math.max(0.1, Number(parsed.toFixed(3))));
      saveUserRecord(activeUserKey, { ...currentUser, targetGoalSec: clamped });
      setTargetPbDraft(clamped.toFixed(3));
    };

    const stepTargetPb = (deltaSec) => {
      const next = Math.min(15, Math.max(0.1, Number((targetSecNum + deltaSec).toFixed(3))));
      saveUserRecord(activeUserKey, { ...currentUser, targetGoalSec: next });
      setTargetPbDraft(next.toFixed(3));
    };

    const handleUpdateOwnPin = () => {
      const clean = ownPinDraft.replace(/\D/g, '').slice(0, 4);
      if (clean.length !== 4) {
        setOwnPinFeedback('PIN must be 4 digits.');
        return;
      }
      const collision = Object.entries(usersRef.current).find(
        ([k, u]) => k !== activeUserKey && String(u?.pin || '') === clean
      );
      if (collision) {
        setOwnPinFeedback('That PIN is unavailable. Choose another.');
        return;
      }
      saveUserRecord(activeUserKey, { ...currentUser, pin: clean });
      setOwnPinDraft('');
      setOwnPinFeedback('Your personal PIN has been updated.');
    };

    const handleCreateUser = () => {
      const trimmedName = newUserName.trim();
      const cleanPin = newUserPin.replace(/\D/g, '').slice(0, 4);
      if (!trimmedName) {
        setAdminStatusMsg('Enter a solver name.');
        return;
      }
      if (cleanPin.length !== 4) {
        setAdminStatusMsg('Enter a 4-digit PIN.');
        return;
      }
      if (usersRef.current[trimmedName]) {
        setAdminStatusMsg('That solver name already exists.');
        return;
      }
      const pinTaken = Object.values(usersRef.current).some((u) => String(u?.pin || '') === cleanPin);
      if (pinTaken) {
        setAdminStatusMsg('That 4-digit PIN is already assigned.');
        return;
      }
      saveUserRecord(trimmedName, {
        ...DEFAULT_USERS.Friends,
        pin: cleanPin,
        isAdmin: false
      });
      setNewUserName('');
      setNewUserPin('');
      setAdminStatusMsg(`Added ${trimmedName} (PIN ${cleanPin}) & synced.`);
    };

    return (
      <div className="space-y-4">
        {/* Carousel Header Controls */}
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Card {settingsCardIdx + 1} of {totalCards}
            </span>
            <h2 className="text-lg font-bold text-white">Suite Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsCardIdx((i) => (i - 1 + totalCards) % totalCards)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800"
              aria-label="Previous settings card"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSettingsCardIdx((i) => (i + 1) % totalCards)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800"
              aria-label="Next settings card"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalCards }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSettingsCardIdx(i)}
              className={`h-2 rounded-full transition-all ${
                settingsCardIdx === i ? 'w-6 bg-indigo-500' : 'w-2 bg-slate-700'
              }`}
              aria-label={`Settings card ${i + 1}`}
            />
          ))}
        </div>

        {/* CARD 1: TARGET PERSONAL BEST (PB) DOWN TO MILLISECOND */}
        {settingsCardIdx === 0 && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Card 1 of 6 • Speed Benchmark
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Target PB (Personal Best)</h3>
              </div>
              <Award className="w-7 h-7 text-amber-400" />
            </div>

            <p className="text-xs text-slate-400">
              Dial in your exact Personal Best (PB) execution goal down to the millisecond (0.001s).
            </p>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center">
              <div className="text-3xl font-mono font-extrabold text-amber-400">
                {targetSecNum.toFixed(3)}s
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {Math.round(targetSecNum * 1000)} milliseconds
              </div>
            </div>

            <input
              type="range"
              min="0.250"
              max="10.000"
              step="0.001"
              value={targetSecNum}
              onChange={(e) => commitTargetPb(e.target.value)}
              className="w-full accent-amber-400"
            />

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => stepTargetPb(-0.01)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200"
              >
                -10ms
              </button>
              <button
                type="button"
                onClick={() => stepTargetPb(-0.001)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200"
              >
                -1ms
              </button>
              <button
                type="button"
                onClick={() => stepTargetPb(0.001)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200"
              >
                +1ms
              </button>
              <button
                type="button"
                onClick={() => stepTargetPb(0.01)}
                className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200"
              >
                +10ms
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.001"
                min="0.100"
                max="15.000"
                value={targetPbDraft}
                onChange={(e) => setTargetPbDraft(e.target.value)}
                onBlur={() => commitTargetPb(targetPbDraft)}
                className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm font-mono text-white"
                placeholder="e.g. 2.145"
              />
              <button
                type="button"
                onClick={() => commitTargetPb(targetPbDraft)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Set PB
              </button>
            </div>
          </div>
        )}

        {/* CARD 2: FULL-SCREEN 3x3x3 CFOP TIMER (AO5 & AO12) */}
        {settingsCardIdx === 1 && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Card 2 of 6 • Full Solve
                </span>
                <h3 className="text-xl font-bold text-white mt-1">3x3x3 CFOP Full Timer</h3>
              </div>
              <Timer className="w-7 h-7 text-indigo-400" />
            </div>

            <p className="text-xs text-slate-400">
              Full-screen glassmorphic 3x3x3 timer with random competition scrambles, tap-anywhere start/stop, and live Ao5 & Ao12 averages.
            </p>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Next 3x3x3 Scramble</div>
              <div className="font-mono text-xs text-indigo-300 leading-relaxed">{fullScramble}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Current Ao5</div>
                <div className="text-lg font-mono font-bold text-emerald-400">
                  {ao5Full === 'DNF' ? 'DNF' : formatMs(ao5Full, 2)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Current Ao12</div>
                <div className="text-lg font-mono font-bold text-sky-400">
                  {ao12Full === 'DNF' ? 'DNF' : formatMs(ao12Full, 2)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFullTimerState('idle');
                setFullElapsedMs(0);
                setFullTimerOpen(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg"
            >
              Launch Full-Screen Timer
            </button>
          </div>
        )}

        {/* CARD 3: DAILY CHUNK SIZE */}
        {settingsCardIdx === 2 && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Card 3 of 6 • Pacing
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Algorithms Per Day</h3>
              </div>
              <Layers className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400">
              Choose how many new cases appear in each daily grind block across F2L, OLL, and PLL.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 6].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => saveUserRecord(activeUserKey, { ...currentUser, chunkSize: sz })}
                  className={`py-3 rounded-2xl font-bold text-sm border transition ${
                    currentUser.chunkSize === sz
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {sz} / day
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CARD 4: PERSONAL PIN & DATA RESET */}
        {settingsCardIdx === 3 && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Card 4 of 6 • Personal Security
                </span>
                <h3 className="text-xl font-bold text-white mt-1">My Passcode & Data</h3>
              </div>
              <Lock className="w-7 h-7 text-sky-400" />
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Signed in as:</span>
                <span className="text-xs font-bold text-white">{String(activeUserKey)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Your Current PIN:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-400">
                    {showOwnPin ? String(currentUser.pin) : '••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOwnPin((s) => !s)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {showOwnPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={ownPinDraft}
                  onChange={(e) => setOwnPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="New 4-digit PIN"
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm font-mono text-white"
                />
                <button
                  type="button"
                  onClick={handleUpdateOwnPin}
                  className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs"
                >
                  Update PIN
                </button>
              </div>
              {ownPinFeedback && <p className="text-[11px] text-emerald-400">{ownPinFeedback}</p>}
            </div>

            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-semibold text-xs"
            >
              Reset Specific Phase Progress
            </button>
          </div>
        )}

        {/* CARD 5: CLOUD & DEVICE SYNC STATUS */}
        {settingsCardIdx === 4 && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                  Card 5 of 6 • Cloud Sync
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Account Persistence</h3>
              </div>
              <Cpu className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your personal PIN, daily schedule progress, PB records, and 3x3x3 Ao5/Ao12 solves save automatically on this device and sync to Firebase whenever configured.
            </p>
            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex items-center justify-between">
              <span className="text-xs text-slate-300">Sync Status</span>
              <span className="text-xs font-bold text-emerald-400">
                {cloudSyncStatus === 'synced' ? '● Cloud & Local Active' : '● Local Persistence Active'}
              </span>
            </div>
          </div>
        )}

        {/* CARD 6: ADMIN PANEL (ONLY PLACE WHERE OTHER USERS CAN BE VIEWED/EDITED/DELETED) */}
        {settingsCardIdx === 5 && (
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Card 6 of 6 • Restricted
                </span>
                <h3 className="text-xl font-bold text-white mt-1">Admin Panel</h3>
              </div>
              <Shield className="w-7 h-7 text-rose-400" />
            </div>

            {!adminUnlocked ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Enter the Master Admin Passcode to manage solver accounts and PIN assignments.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={adminPinAttempt}
                    onChange={(e) => setAdminPinAttempt(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Admin PIN"
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (adminPinAttempt === masterAdminPin) {
                        setAdminUnlocked(true);
                        setAdminPinAttempt('');
                        setAdminStatusMsg('');
                      } else {
                        setAdminStatusMsg('Invalid Master PIN.');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Unlock
                  </button>
                </div>
                {adminStatusMsg && <p className="text-xs text-rose-400">{adminStatusMsg}</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-400">● Admin Unlocked</span>
                  <button
                    type="button"
                    onClick={() => setAdminUnlocked(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Lock Panel
                  </button>
                </div>

                {/* Add New User */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">Add New Solver</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Name"
                      className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={newUserPin}
                      onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4-digit PIN"
                      className="w-24 rounded-xl bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={handleCreateUser}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {adminStatusMsg && <p className="text-xs text-emerald-400">{adminStatusMsg}</p>}

                {/* All Users List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(users).map(([uKey, uData]) => {
                    const draftPin = editUserPins[uKey] ?? String(uData?.pin || '');
                    return (
                      <div
                        key={uKey}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{String(uKey)}</div>
                          <div className="text-[10px] text-slate-500">
                            F2L D{uData.f2lDay} • OLL D{uData.day} • PLL D{uData.pllDay}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={draftPin}
                            onChange={(e) =>
                              setEditUserPins((prev) => ({
                                ...prev,
                                [uKey]: e.target.value.replace(/\D/g, '').slice(0, 4)
                              }))
                            }
                            className="w-14 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs font-mono text-center text-sky-300"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (draftPin.length !== 4) {
                                setAdminStatusMsg('PIN must be 4 digits.');
                                return;
                              }
                              saveUserRecord(uKey, { ...uData, pin: draftPin });
                              setAdminStatusMsg(`Saved PIN for ${uKey}.`);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-white"
                          >
                            Save
                          </button>
                          {uKey !== 'Me' && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteUserRecord(uKey);
                                setAdminStatusMsg(`Removed ${uKey}.`);
                              }}
                              className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300"
                              aria-label={`Delete ${uKey}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>
    );
  };

  // ==========================================================================
  // 10. SHARED ALGORITHM LIST & STATS RENDERERS FOR F2L / OLL / PLL
  // ==========================================================================
  const renderPhasePhaseView = ({
    phaseKey,
    phaseLabel,
    accentClass,
    badgeClass,
    dataList,
    schedule,
    safeDay,
    currentDayObj,
    onChangeDay,
    statsMap,
    tabValue
  }) => {
    const masteredCount = dataList.filter((item) => statsMap[item.id]?.mastered).length;
    const goalMs = (Number(currentUser.targetGoalSec) || 2.5) * 1000;

    if (tabValue === 'settings') {
      return renderSettingsDeck();
    }

    if (tabValue === 'stats') {
      const validPbs = dataList
        .map((it) => statsMap[it.id]?.bestMs)
        .filter((v) => v != null && Number.isFinite(Number(v)));
      const avgPbMs = validPbs.length ? validPbs.reduce((a, b) => a + b, 0) / validPbs.length : null;

      return (
        <div className="space-y-5">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">{phaseLabel} Mastery & Personal Bests (PB)</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Mastered</div>
                <div className={`text-xl font-extrabold mt-0.5 ${accentClass}`}>
                  {masteredCount}/{dataList.length}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Avg Case PB</div>
                <div className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                  {formatMs(avgPbMs, 2)}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                <div className="text-[10px] text-slate-400 uppercase">Target PB</div>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                  {(Number(currentUser.targetGoalSec) || 2.5).toFixed(3)}s
                </div>
              </div>
            </div>
          </div>

          {renderFullSolveStatsSection()}
        </div>
      );
    }

    if (tabValue === 'algorithms') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white">
              All {phaseLabel} Algorithms ({dataList.length})
            </h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
              {masteredCount} Mastered
            </span>
          </div>

          <div className="space-y-2.5">
            {dataList.map((item, idx) => {
              const st = statsMap[item.id];
              const isSubGoal = st?.bestMs != null && st.bestMs <= goalMs;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setDrillElapsedMs(0);
                    setDrillTimerRunning(false);
                    setDrillModal({ phase: phaseKey, items: dataList, index: idx });
                  }}
                  className="rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800/90 p-3.5 flex items-center justify-between gap-3 cursor-pointer transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {item.group}
                      </span>
                      {st?.mastered && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="font-mono text-xs text-indigo-300 mt-1 truncate">{item.alg}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase text-slate-500">PB</div>
                    <div
                      className={`text-xs font-mono font-bold ${
                        isSubGoal ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {formatMs(st?.bestMs, 2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // DEFAULT: 'grind' (DAILY SESSION VIEW)
    return (
      <div className="space-y-5">
        {/* Day Selector Card */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${accentClass}`}>
                {phaseLabel} Daily Grind • Day {safeDay} of {schedule.length}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">{currentDayObj?.title}</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safeDay <= 1}
                onClick={() => onChangeDay(Math.max(1, safeDay - 1))}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeDay >= schedule.length}
                onClick={() => onChangeDay(Math.min(schedule.length, safeDay + 1))}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDrillElapsedMs(0);
              setDrillTimerRunning(false);
              setDrillModal({ phase: phaseKey, items: currentDayObj.items, index: 0 });
            }}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Day {safeDay} Drill Session ({currentDayObj?.items?.length || 0} Cases)
          </button>
        </div>

        {/* Today's Case Cards */}
        <div className="space-y-3">
          {(currentDayObj?.items || []).map((item, idx) => {
            const st = statsMap[item.id];
            return (
              <div
                key={item.id}
                onClick={() => {
                  setDrillElapsedMs(0);
                  setDrillTimerRunning(false);
                  setDrillModal({ phase: phaseKey, items: currentDayObj.items, index: idx });
                }}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 cursor-pointer hover:border-indigo-500/50 transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {item.group}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-indigo-300 mt-1">{item.alg}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase">PB</div>
                    <div className="text-sm font-mono font-bold text-amber-400">
                      {formatMs(st?.bestMs, 2)}
                    </div>
                  </div>
                </div>

                {phaseKey === 'f2l' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <F2LSpatial3DCube caseItem={item} setupSeed={f2lSetupSeed} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // 11. MAIN SHELL RENDER
  // ==========================================================================
  const normalizedPhase = String(activePhase || 'oll').toLowerCase();
  const currentTab =
    normalizedPhase === 'cross'
      ? crossTab
      : normalizedPhase === 'f2l'
        ? f2lTab
        : normalizedPhase === 'pll'
          ? pllTab
          : activeTab;

  const setCurrentTab = (t) => {
    if (normalizedPhase === 'cross') setCrossTab(t);
    else if (normalizedPhase === 'f2l') setF2lTab(t);
    else if (normalizedPhase === 'pll') setPllTab(t);
    else setActiveTab(t);
  };

  const activeDrillItem = drillModal ? drillModal.items[drillModal.index] || drillModal.items[0] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24">
      {/* Top Header with C F O P Switcher & Lock Button */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* C F O P Phase Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            {[
              { id: 'cross', letter: 'C', label: 'Cross' },
              { id: 'f2l', letter: 'F', label: 'F2L' },
              { id: 'oll', letter: 'O', label: 'OLL' },
              { id: 'pll', letter: 'P', label: 'PLL' }
            ].map((p) => {
              const active = normalizedPhase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePhase(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1 ${
                    active
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{p.letter}</span>
                  {active && <span className="text-[10px] font-semibold opacity-90">{p.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Lock Screen Button (No other users ever exposed) */}
          <button
            type="button"
            onClick={() => {
              setStartupPinLocked(true);
              setPinEntryInput('');
              setPinErrorMsg('');
              setAdminUnlocked(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200"
            title="Lock Session"
          >
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{String(activeUserKey)}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-5">
        {/* ===================================================== */}
        {/* PHASE 1: CROSS (C)                                    */}
        {/* ===================================================== */}
        {normalizedPhase === 'cross' && (
          <>
            {crossTab === 'settings' && renderSettingsDeck()}

            {crossTab === 'stats' && (
              <div className="space-y-5">
                <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-3">Cross Trainer Telemetry</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Cross Solves</div>
                      <div className="text-xl font-bold text-cyan-400 mt-0.5">{crossHistory.length}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-center">
                      <div className="text-[10px] text-slate-400 uppercase">Best Cross PB</div>
                      <div className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                        {crossHistory.length ? formatMs(Math.min(...crossHistory), 2) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
                {renderFullSolveStatsSection()}
              </div>
            )}

            {crossTab === 'algorithms' && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-white px-1">7-Tier Cross Progression Ladder</h2>
                {CROSS_TIERS.map((t) => (
                  <div
                    key={t.tier}
                    onClick={() => {
                      setSelectedCrossTier(t.moves);
                      setCrossScramble(generateCrossScramble(t.moves));
                      setCrossTab('grind');
                    }}
                    className={`rounded-2xl p-4 border cursor-pointer transition ${
                      selectedCrossTier === t.moves
                        ? 'bg-cyan-950/40 border-cyan-500/60'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{t.name}</span>
                      <span className="text-xs font-mono text-cyan-400">{t.moves} Moves</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {crossTab === 'grind' && (
              <div className="space-y-5">
                <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl text-center space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Cross Trainer • {selectedCrossTier}-Move Tier
                    </span>
                    <button
                      type="button"
                      onClick={() => setCrossBlindMode((b) => !b)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                        crossBlindMode
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {crossBlindMode ? 'Blind Mode ON' : 'Blind Mode OFF'}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      Cross Scramble (White on Bottom)
                    </div>
                    <div className="font-mono text-base font-bold text-cyan-300">
                      {crossHideScramble ? '•••••• (Executing Blind)' : crossScramble}
                    </div>
                  </div>

                  <div className="text-5xl font-mono font-extrabold text-white py-3">
                    {formatMs(crossElapsedMs, 2)}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (crossTimerRunning) {
                          const ms = Math.round(performance.now() - crossStartRef.current);
                          setCrossElapsedMs(ms);
                          setCrossTimerRunning(false);
                          setCrossHideScramble(false);
                          setCrossHistory((h) => [ms, ...h]);
                          setCrossScramble(generateCrossScramble(selectedCrossTier));
                        } else {
                          crossStartRef.current = performance.now();
                          setCrossElapsedMs(0);
                          setCrossTimerRunning(true);
                          if (crossBlindMode) setCrossHideScramble(true);
                        }
                      }}
                      className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition ${
                        crossTimerRunning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                      }`}
                    >
                      {crossTimerRunning ? 'Stop Cross Timer' : 'Start Cross Solve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrossScramble(generateCrossScramble(selectedCrossTier))}
                      className="px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                      aria-label="New Cross Scramble"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================================== */}
        {/* PHASE 2: F2L (F)                                      */}
        {/* ===================================================== */}
        {normalizedPhase === 'f2l' &&
          renderPhasePhaseView({
            phaseKey: 'f2l',
            phaseLabel: 'F2L',
            accentClass: 'text-emerald-400',
            badgeClass: 'bg-emerald-500/15 text-emerald-300',
            dataList: F2L_DATA,
            schedule: f2lSchedule,
            safeDay: safeF2lDay,
            currentDayObj: currentF2lDayObj,
            onChangeDay: (d) => saveUserRecord(activeUserKey, { ...currentUser, f2lDay: d }),
            statsMap: currentUser.f2lStats || {},
            tabValue: f2lTab
          })}

        {/* ===================================================== */}
        {/* PHASE 3: OLL (O)                                      */}
        {/* ===================================================== */}
        {normalizedPhase === 'oll' &&
          renderPhasePhaseView({
            phaseKey: 'oll',
            phaseLabel: 'OLL',
            accentClass: 'text-amber-400',
            badgeClass: 'bg-amber-500/15 text-amber-300',
            dataList: OLL_DATA,
            schedule: ollSchedule,
            safeDay: safeOllDay,
            currentDayObj: currentOllDayObj,
            onChangeDay: (d) => saveUserRecord(activeUserKey, { ...currentUser, day: d }),
            statsMap: currentUser.stats || {},
            tabValue: activeTab
          })}

        {/* ===================================================== */}
        {/* PHASE 4: PLL (P)                                      */}
        {/* ===================================================== */}
        {normalizedPhase === 'pll' &&
          renderPhasePhaseView({
            phaseKey: 'pll',
            phaseLabel: 'PLL',
            accentClass: 'text-violet-400',
            badgeClass: 'bg-violet-500/15 text-violet-300',
            dataList: PLL_DATA,
            schedule: pllSchedule,
            safeDay: safePllDay,
            currentDayObj: currentPllDayObj,
            onChangeDay: (d) => saveUserRecord(activeUserKey, { ...currentUser, pllDay: d }),
            statsMap: currentUser.pllStats || {},
            tabValue: pllTab
          })}
      </main>

      {/* Bottom 4-Tab Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2.5">
        <div className="max-w-lg mx-auto grid grid-cols-4 gap-1">
          {[
            { id: 'grind', label: 'The Grind', icon: Flame },
            { id: 'algorithms', label: normalizedPhase === 'cross' ? 'Ladder' : 'Algorithms', icon: BookOpen },
            { id: 'stats', label: 'Statistics', icon: BarChart2 },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                  active ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[11px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ==================================================================== */}
      {/* FULL-SCREEN GLASSMORPHIC 3x3x3 CFOP TIMER MODAL (TAP ANYWHERE)       */}
      {/* ==================================================================== */}
      {fullTimerOpen && (
        <div
          onClick={handleFullScreenTap}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-3xl flex flex-col justify-between p-6 select-none cursor-pointer"
        >
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />

          {/* Top Bar: Close + Scramble */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-w-xl w-full mx-auto space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
                3x3x3 CFOP Full-Solve Timer
              </span>
              <button
                type="button"
                onClick={() => {
                  setFullTimerState('idle');
                  setFullTimerOpen(false);
                }}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {fullTimerState !== 'running' && (
              <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-4 text-center shadow-lg">
                <div className="font-mono text-sm sm:text-base font-semibold text-white leading-relaxed">
                  {fullScramble}
                </div>
                <button
                  type="button"
                  onClick={() => setFullScramble(generate3x3Scramble(20))}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-indigo-300 hover:text-white"
                >
                  <RefreshCw className="w-3 h-3" /> New Scramble
                </button>
              </div>
            )}
          </div>

          {/* Center Giant Time Readout */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto text-center">
            <div
              className={`text-7xl sm:text-8xl font-mono font-extrabold tracking-tight transition-colors ${
                fullTimerState === 'running' ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {(fullElapsedMs / 1000).toFixed(2)}
            </div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/60 mt-4">
              {fullTimerState === 'running' ? 'Tap anywhere to stop' : 'Tap anywhere to start'}
            </p>

            {/* Quick +2 / DNF / Delete Controls after stopping */}
            {fullTimerState === 'stopped' && currentUser.fullSolveHistory?.length > 0 && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 mt-6"
              >
                <button
                  type="button"
                  onClick={() => applyPenaltyToLastFullSolve('+2')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    currentUser.fullSolveHistory[0]?.penalty === '+2'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-white/10 text-white border-white/20'
                  }`}
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={() => applyPenaltyToLastFullSolve('DNF')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    currentUser.fullSolveHistory[0]?.penalty === 'DNF'
                      ? 'bg-rose-500 text-white border-rose-400'
                      : 'bg-white/10 text-white border-white/20'
                  }`}
                >
                  DNF
                </button>
                <button
                  type="button"
                  onClick={deleteLastFullSolve}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-rose-500/30 border border-white/20 text-rose-200"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Bottom Ao5 & Ao12 Glass Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-w-md w-full mx-auto grid grid-cols-2 gap-3"
          >
            <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-3.5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/60">Average of 5</div>
              <div className="text-xl font-mono font-bold text-emerald-300 mt-0.5">
                {ao5Full === 'DNF' ? 'DNF' : formatMs(ao5Full, 2)}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-3.5 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/60">Average of 12</div>
              <div className="text-xl font-mono font-bold text-sky-300 mt-0.5">
                {ao12Full === 'DNF' ? 'DNF' : formatMs(ao12Full, 2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* ALGORITHM EXECUTION DRILL MODAL (F2L / OLL / PLL)                    */}
      {/* ==================================================================== */}
      {drillModal && activeDrillItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex flex-col justify-between p-5">
          <div className="max-w-lg w-full mx-auto flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                {drillModal.phase.toUpperCase()} Drill ({drillModal.index + 1}/{drillModal.items.length})
              </span>
              <h3 className="text-xl font-bold text-white">{activeDrillItem.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setDrillTimerRunning(false);
                setDrillModal(null);
              }}
              className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-w-lg w-full mx-auto space-y-5 my-auto">
            {drillModal.phase === 'f2l' && (
              <F2LSpatial3DCube caseItem={activeDrillItem} setupSeed={f2lSetupSeed} />
            )}

            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Algorithm</div>
              <div className="font-mono text-lg font-bold text-indigo-300">{activeDrillItem.alg}</div>
            </div>

            <div className="text-center py-2">
              <div className="text-5xl font-mono font-extrabold text-white">
                {formatMs(drillElapsedMs, 2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Target PB: {(Number(currentUser.targetGoalSec) || 2.5).toFixed(3)}s
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (drillTimerRunning) {
                  const ms = Math.max(50, Math.round(performance.now() - drillStartRef.current));
                  setDrillElapsedMs(ms);
                  setDrillTimerRunning(false);
                  recordDrillSolve(drillModal.phase, activeDrillItem.id, ms);
                } else {
                  drillStartRef.current = performance.now();
                  setDrillElapsedMs(0);
                  setDrillTimerRunning(true);
                }
              }}
              className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg transition ${
                drillTimerRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {drillTimerRunning ? 'Stop Execution Timer' : 'Start Execution Timer'}
            </button>
          </div>

          <div className="max-w-lg w-full mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setDrillTimerRunning(false);
                setDrillElapsedMs(0);
                setDrillModal((m) => ({
                  ...m,
                  index: (m.index - 1 + m.items.length) % m.items.length
                }));
              }}
              className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
            >
              Previous Case
            </button>
            <button
              type="button"
              onClick={() => {
                setDrillTimerRunning(false);
                setDrillElapsedMs(0);
                setDrillModal((m) => ({
                  ...m,
                  index: (m.index + 1) % m.items.length
                }));
              }}
              className="flex-1 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200"
            >
              Next Case
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* GRANULAR PHASE RESET PROGRESS MODAL                                  */}
      {/* ==================================================================== */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-5">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Reset Phase Progress</h3>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Select which phase records and PB times you want to clear for {String(activeUserKey)}:
            </p>
            <div className="space-y-2">
              {[
                { key: 'cross', label: 'Phase C: Cross Trainer History' },
                { key: 'f2l', label: 'Phase F: F2L Progress & PBs' },
                { key: 'oll', label: 'Phase O: OLL Progress & PBs' },
                { key: 'pll', label: 'Phase P: PLL Progress & PBs' },
                { key: 'fullTimer', label: 'Full 3x3x3 CFOP Timer (Ao5 / Ao12)' }
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 cursor-pointer"
                >
                  <span className="text-xs font-medium text-slate-200">{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(resetTargets[opt.key])}
                    onChange={(e) =>
                      setResetTargets((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                    }
                    className="accent-rose-500 w-4 h-4"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <OLLDaySuite />
    </AppErrorBoundary>
  );
}
