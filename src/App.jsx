import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';

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

    // Also support individual VITE_FIREBASE_* environment variables
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
const firebaseApp = resolvedFirebaseConfig
  ? getApps().length > 0
    ? getApp()
    : initializeApp(resolvedFirebaseConfig)
  : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;

const appId =
  (typeof globalThis !== 'undefined' &&
    (globalThis.__app_id || globalThis.VITE_APP_ID) &&
    String(globalThis.__app_id || globalThis.VITE_APP_ID)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_APP_ID || process.env.REACT_APP_APP_ID)) ||
  'ollday-everyday';

const STORAGE_KEYS = {
  users: `ollday_users_${appId}`,
  masterPin: `ollday_master_pin_${appId}`
};

// =========================================================================
// 1. COMPLETE DATASETS (CROSS, F2L 41 CASES, OLL 57 CASES)
// =========================================================================

const CROSS_TIERS = [
  {
    tier: 1,
    moves: 2,
    title: 'The Free Drop',
    scrambles: ["U L2", "F2 D'", "R2 U'", "B2 D"],
    hint: 'Align the white edge directly over its matching center on U, then turn that face 180°.'
  },
  {
    tier: 2,
    moves: 3,
    title: 'Single Setup & Drop',
    scrambles: ["R' U F2", "L U' B2", "F U R2", "B U' L2"],
    hint: 'One U-layer alignment sets up a clean 2-move drop without disturbing solved edges.'
  },
  {
    tier: 3,
    moves: 4,
    title: 'Flipped Edge & Keyhole',
    scrambles: ["F R' D' R", "R' F D F'", "L' B D' B'", "B L' D L"],
    hint: 'Use an open D-layer slot (keyhole) to insert an edge cleanly before adjusting D.'
  },
  {
    tier: 4,
    moves: 5,
    title: 'Opposite & Adjacent Pairs',
    scrambles: ["R' F R U' F2", "L F' L' U F2", "F R' F' U R2", "B L' B' U L2"],
    hint: 'Solve two adjacent cross edges relative to each other first, then align D in a single turn.'
  },
  {
    tier: 5,
    moves: 6,
    title: 'Full Sub-8 Inspection',
    scrambles: ["R U' F' D R2 U", "L' U F D' L2 U'", "F' U R' D F2 U", "B U' L D' B2 U'"],
    hint: 'Plan all 4 cross edges during 15-second inspection before touching the cube.'
  }
];

const CROSS_MECHANICS = [
  {
    id: 1,
    title: 'The Free Drop',
    badge: 'Mechanic 1 • Foundation',
    summary: 'When a white edge sits in the U layer with White facing up, match its side sticker to its center and turn that face 180° (F2, R2, B2, L2).',
    example: "Setup: F2  →  Solve: F2"
  },
  {
    id: 2,
    title: 'Flipped Edge Insert',
    badge: 'Mechanic 2 • Orientation',
    summary: 'When White faces outward on the front face (e.g., UF position), move it to the side slot (F or F\') and drop it down with R\' or L.',
    example: "Setup: F' R' F  →  Solve: F' R F"
  },
  {
    id: 3,
    title: 'Keyhole D-Shift',
    badge: 'Mechanic 3 • Efficiency',
    summary: 'Instead of restoring a disturbed cross piece immediately, shift the D layer (D / D\') to place the target slot underneath, insert, then align D.',
    example: "Setup: R' D' R D  →  Solve: D' R' D R"
  },
  {
    id: 4,
    title: 'Edge Preservation',
    badge: 'Mechanic 4 • Lookahead',
    summary: 'When inserting a middle-layer edge, check if another white edge sits in the adjacent slot so one turn solves both simultaneously.',
    example: "Setup: U R' F' R  →  Solve: R' F R U'"
  }
];

const F2L_DATA = [
  // Group 1: Basic Inserts (1-4)
  { id: 1, name: 'F2L 1', group: 'Basic Inserts', alg: "U (R U' R')", step1: 'Position paired corner-edge over FR slot', step2: 'Insert with right-hand sexy inverse (R U\' R\')', fingertrick: 'Right index U push, wrist R, index U\', R\'' },
  { id: 2, name: 'F2L 2', group: 'Basic Inserts', alg: "U' (F' U F)", step1: 'Align connected pair over the front-right slot', step2: 'Insert into FR cleanly using F\' U F', fingertrick: 'Left index U\', left index F\', right index U, thumb F' },
  { id: 3, name: 'F2L 3', group: 'Basic Inserts', alg: "(F' U' F)", step1: 'Connected pair sits above the front-right slot', step2: 'Drop straight into FR slot with F\' U\' F', fingertrick: 'Left index F\', left index U\', thumb F' },
  { id: 4, name: 'F2L 4', group: 'Basic Inserts', alg: "(R U R')", step1: 'Connected pair is already aligned above FR', step2: 'Direct 3-move insert (R U R\')', fingertrick: 'Regripless R U R\' trigger' },

  // Group 2: Top Layer — Same Color (5-10)
  { id: 5, name: 'F2L 5', group: 'Top Layer: Same Color', alg: "(U' R U R') U2 (R U' R')", step1: 'Hide corner in back-right while separating edge', step2: 'Re-align pair over FR and insert', fingertrick: 'Left index U\', R U R\', double-flick U2, R U\' R\'' },
  { id: 6, name: 'F2L 6', group: 'Top Layer: Same Color', alg: "(U F' U' F) U2' (F' U F)", step1: 'Hide corner with U F\' U\' F while moving edge across', step2: 'U2\' to pair up and insert into FR with F\' U F', fingertrick: 'Index U, F\' U\' F, left double-flick U2\', F\' U F' },
  { id: 7, name: 'F2L 7', group: 'Top Layer: Same Color', alg: "(U' R U2' R') U2 (R U' R')", step1: 'Swing edge to back with U2\' while corner hides', step2: 'Bring pair over FR and insert', fingertrick: 'U\' R, left U2\' double-flick, R\', U2, R U\' R\'' },
  { id: 8, name: 'F2L 8', group: 'Top Layer: Same Color', alg: "(U F' U2 F) U2' (F' U F)", step1: 'Separate adjacent matching stickers with U F\' U2 F', step2: 'Pair with U2\' and insert into FR via F\' U F', fingertrick: 'U F\' U2 F, left U2\' double-flick, F\' U F' },
  { id: 9, name: 'F2L 9', group: 'Top Layer: Same Color', alg: "U' R U' R' U F' U' F", step1: 'Break apart bad connection in U layer', step2: 'Insert formed pair directly into FR with F\' U\' F', fingertrick: 'U\' R U\' R\' U, left index F\', U\' F' },
  { id: 10, name: 'F2L 10', group: 'Top Layer: Same Color', alg: "U' R U R' U R U R'", step1: 'Lift and separate matching top stickers', step2: 'Connect over FR and insert with R U R\'', fingertrick: 'Regripless right-hand flow throughout' },

  // Group 3: Top Layer — Opposite Colors (11-16)
  { id: 11, name: 'F2L 11', group: 'Top Layer: Opposite Colors', alg: "U' R U2' R' U F' U' F", step1: 'Hide corner and kick edge across top layer', step2: 'Catch the pair and insert with F\' U\' F', fingertrick: 'U\' R U2\' R\' U, left index F\', U\' F' },
  { id: 12, name: 'F2L 12', group: 'Top Layer: Opposite Colors', alg: "R' U2 R2 U R2' U R", step1: 'Use wide R2 swing to pair without cube rotation', step2: 'Complete rotationless insert into FR', fingertrick: 'Thumb-down R\', U2, R2 U R2\' U R' },
  { id: 13, name: 'F2L 13', group: 'Top Layer: Opposite Colors', alg: "U F' U F U' F' U' F", step1: 'Setup opposite-top edge using U F\' U F', step2: 'Pair and insert cleanly with U\' F\' U\' F', fingertrick: 'Index U, F\' U F, left U\', F\' U\' F' },
  { id: 14, name: 'F2L 14', group: 'Top Layer: Opposite Colors', alg: "U' R U' R' U R U R'", step1: 'Create 3-move setup with U\' R U\' R\'', step2: 'Align with U and insert via R U R\'', fingertrick: 'Fast index pushes on U\' and U' },
  { id: 15, name: 'F2L 15', group: 'Top Layer: Opposite Colors', alg: "R U R' U2 R U' R' U R U' R'", step1: 'Split connected opposite pair with R U R\' U2', step2: 'Pair and insert cleanly into FR', fingertrick: 'Continuous right-wrist rhythm' },
  { id: 16, name: 'F2L 16', group: 'Top Layer: Opposite Colors', alg: "R U' R' U2 F' U' F", step1: 'Separate pair over FR with R U\' R\' U2', step2: 'Drop connected pair into FR using F\' U\' F', fingertrick: 'R U\' R\' U2, left index F\', U\' F' },

  // Group 4: Top Layer — White Facing Up (17-24)
  { id: 17, name: 'F2L 17', group: 'Top Layer: White Up', alg: "R U2 R' U' R U R'", step1: 'Align edge with matching center, hide corner with R U2 R\'', step2: 'Bring corner back over edge and insert', fingertrick: 'R, U2 double-flick, R\' U\' R U R\'' },
  { id: 18, name: 'F2L 18', group: 'Top Layer: White Up', alg: "F' U2 F U F' U' F", step1: 'Swing white-up corner over matching edge with F\' U2 F', step2: 'Pair with U and insert via F\' U\' F', fingertrick: 'Left index F\', U2, thumb F, U F\' U\' F' },
  { id: 19, name: 'F2L 19', group: 'Top Layer: White Up', alg: "U R U2 R' U R U' R'", step1: 'Position white-up corner at FR, swing with U R U2 R\'', step2: 'Pair and insert with U R U\' R\'', fingertrick: 'Index U, R U2 R\', U R U\' R\'' },
  { id: 20, name: 'F2L 20', group: 'Top Layer: White Up', alg: "U' F' U2 F U' F' U F", step1: 'Setup white-up corner with U\' F\' U2 F', step2: 'Connect edge with U\' and insert via F\' U F', fingertrick: 'Left U\' pushes, F\' U2 F, U\' F\' U F' },
  { id: 21, name: 'F2L 21', group: 'Top Layer: White Up', alg: "U2 R U R' U R U' R'", step1: 'U2 aligns edge to center, R U R\' pairs them', step2: 'U R U\' R\' inserts into FR', fingertrick: 'Double-flick U2, two smooth R triggers' },
  { id: 22, name: 'F2L 22', group: 'Top Layer: White Up', alg: "U2 F' U' F U' F' U F", step1: 'U2 sets up front-edge alignment', step2: 'Pair with F\' U\' F and insert via U\' F\' U F', fingertrick: 'U2 double-flick, F\' U\' F U\' F\' U F' },
  { id: 23, name: 'F2L 23', group: 'Top Layer: White Up', alg: "U R U' R' U' R U' R' U R U' R'", step1: 'Extract and orient white-up corner with U R U\' R\'', step2: 'Pair and insert in two smooth triggers', fingertrick: 'Rhythm: (U R U\' R\') U\' (R U\' R\') U (R U\' R\')' },
  { id: 24, name: 'F2L 24', group: 'Top Layer: White Up', alg: "F U R U' R' F' R U' R'", step1: 'Sledge-style F setup pairs corner and edge in U', step2: 'Insert formed pair with R U\' R\'', fingertrick: 'Right thumb F, U R U\' R\', thumb F\', R U\' R\'' },

  // Group 5: Corner in Bottom Slot (25-30)
  { id: 25, name: 'F2L 25', group: 'Corner in Bottom', alg: "U' R' F R F' R U R'", step1: 'Use sledgehammer (R\' F R F\') to twist trapped corner', step2: 'Insert paired block with R U R\'', fingertrick: 'U\', R\' F R F\', R U R\'' },
  { id: 26, name: 'F2L 26', group: 'Corner in Bottom', alg: "U R U' R' F R' F' R", step1: 'Pair edge with corner using U R U\' R\'', step2: 'Insert cleanly with sledgehammer (F R\' F\' R)', fingertrick: 'U R U\' R\', index F, R\' F\' R' },
  { id: 27, name: 'F2L 27', group: 'Corner in Bottom', alg: "R U' R' U R U' R'", step1: 'Pop trapped corner out to U layer with R U\' R\'', step2: 'Align with U and re-insert via R U\' R\'', fingertrick: 'Double sexy-inverse trigger' },
  { id: 28, name: 'F2L 28', group: 'Corner in Bottom', alg: "R U R' U' F R' F' R", step1: 'Lift corner with sexy move (R U R\' U\')', step2: 'Sledgehammer inserts without cube rotation', fingertrick: 'R U R\' U\' into F R\' F\' R' },
  { id: 29, name: 'F2L 29', group: 'Corner in Bottom', alg: "R' F R F' R' F R F'", step1: 'Double sledgehammer twists corner while preserving edge', step2: 'Second sledge drops pair directly into FR', fingertrick: 'Two crisp R\' F R F\' triggers' },
  { id: 30, name: 'F2L 30', group: 'Corner in Bottom', alg: "R U R' U' R U R'", step1: 'Pop white-right corner up with R U R\' U\'', step2: 'Direct insert with R U R\'', fingertrick: 'Fast regripless right-hand burst' },

  // Group 6: Edge in Middle / Both in Bottom (31-41)
  { id: 31, name: 'F2L 31', group: 'Edge in Middle / Both Bottom', alg: "U' R' F R F' R U' R'", step1: 'Sledgehammer flips trapped middle-layer edge', step2: 'Insert formed pair with R U\' R\'', fingertrick: 'U\' R\' F R F\' R U\' R\'' },
  { id: 32, name: 'F2L 32', group: 'Edge in Middle / Both Bottom', alg: "R U R' U' R U R' U' R U R'", step1: 'Triple sexy move cycles trapped edge and corner', step2: 'Third trigger locks pair into FR', fingertrick: '3x (R U R\' U\') without final U\'' },
  { id: 33, name: 'F2L 33', group: 'Edge in Middle / Both Bottom', alg: "U' R U' R' U2 R U' R'", step1: 'Extract trapped edge while setting corner in U', step2: 'U2 pairs them for R U\' R\' insert', fingertrick: 'U\' R U\' R\', U2 double-flick, R U\' R\'' },
  { id: 34, name: 'F2L 34', group: 'Edge in Middle / Both Bottom', alg: "U R U R' U2 R U R'", step1: 'Lift trapped edge with U R U R\'', step2: 'U2 brings corner over for R U R\' insert', fingertrick: 'U R U R\', U2, R U R\'' },
  { id: 35, name: 'F2L 35', group: 'Edge in Middle / Both Bottom', alg: "U' R U R' U F' U' F", step1: 'Extract edge to top with U\' R U R\'', step2: 'Front-slot insert via U F\' U\' F', fingertrick: 'U\' R U R\' U, left index F\', U\' F' },
  { id: 36, name: 'F2L 36', group: 'Edge in Middle / Both Bottom', alg: "U2 R' F R F' U2 R U R'", step1: 'U2 + sledgehammer extracts flipped edge cleanly', step2: 'U2 + R U R\' drops solved pair into FR', fingertrick: 'U2, R\' F R F\', U2, R U R\'' },
  { id: 37, name: 'F2L 37', group: 'Edge in Middle / Both Bottom', alg: "R2 U2 F R2 F' U2 R' U R'", step1: 'Classic flipped-in-slot algorithm using R2 U2 F R2 F\'', step2: 'Finish with U2 R\' U R\' into FR', fingertrick: 'R2 U2, thumb F, R2, index F\', U2 R\' U R\'' },
  { id: 38, name: 'F2L 38', group: 'Edge in Middle / Both Bottom', alg: "R U R' U' R U2 R' U' R U R'", step1: 'Pop twisted pair out with R U R\' U\'', step2: 'Re-pair with R U2 R\' U\' and insert', fingertrick: 'Smooth continuous right-hand triggers' },
  { id: 39, name: 'F2L 39', group: 'Edge in Middle / Both Bottom', alg: "R U' R' U' R U R' U2 R U' R'", step1: 'Separate twisted bottom pair with R U\' R\' U\'', step2: 'Pair via R U R\' U2 and insert', fingertrick: 'Keep right thumb anchored on front' },
  { id: 40, name: 'F2L 40', group: 'Edge in Middle / Both Bottom', alg: "R U' R' U F' U2 F U2' F' U F", step1: 'Extract corner with R U\' R\' U without rotating', step2: 'Pair over front with F\' U2 F U2\' and insert via F\' U F', fingertrick: 'R U\' R\' U, F\' U2 F U2\' F\' U F' },
  { id: 41, name: 'F2L 41', group: 'Edge in Middle / Both Bottom', alg: "R U R' U' R U' R' U2 F' U' F", step1: 'Lift twisted pair with R U R\' U\' R U\' R\'', step2: 'U2 + F\' U\' F drops pair straight into FR', fingertrick: 'R U R\' U\' R U\' R\', U2, F\' U\' F' }
];

const F2L_GROUPS = [
  'Basic Inserts',
  'Top Layer: Same Color',
  'Top Layer: Opposite Colors',
  'Top Layer: White Up',
  'Corner in Bottom',
  'Edge in Middle / Both Bottom'
];

const F2L_DEFAULT_CHUNKS = [
  { id: 'f2l-c1', title: 'Chunk 1: Basic Inserts', ids: [1, 2, 3, 4] },
  { id: 'f2l-c2', title: 'Chunk 2: Same Color (Part A)', ids: [5, 6, 7] },
  { id: 'f2l-c3', title: 'Chunk 3: Same Color (Part B)', ids: [8, 9, 10] },
  { id: 'f2l-c4', title: 'Chunk 4: Opposite Colors (Part A)', ids: [11, 12, 13] },
  { id: 'f2l-c5', title: 'Chunk 5: Opposite Colors (Part B)', ids: [14, 15, 16] },
  { id: 'f2l-c6', title: 'Chunk 6: White Facing Up (Part A)', ids: [17, 18, 19, 20] },
  { id: 'f2l-c7', title: 'Chunk 7: White Facing Up (Part B)', ids: [21, 22, 23, 24] },
  { id: 'f2l-c8', title: 'Chunk 8: Corner in Bottom', ids: [25, 26, 27, 28, 29, 30] },
  { id: 'f2l-c9', title: 'Chunk 9: Edge Trapped (Part A)', ids: [31, 32, 33, 34, 35, 36] },
  { id: 'f2l-c10', title: 'Chunk 10: Both Trapped (Part B)', ids: [37, 38, 39, 40, 41] }
];

const OLL_DATA = [
  { id: 27, name: 'OLL 27 (Sune)', group: 'All Edges Oriented', alg: "R U R' U R U2 R'", fingertrick: 'Right index U, double-flick U2' },
  { id: 26, name: 'OLL 26 (Antisune)', group: 'All Edges Oriented', alg: "R U2 R' U' R U' R'", fingertrick: 'Start with R, double-flick U2, left index U\'' },
  { id: 21, name: 'OLL 21 (Cross H)', group: 'All Edges Oriented', alg: "R U2 R' U' R U R' U' R U' R'", fingertrick: 'Continuous right-wrist rhythm with index pushes' },
  { id: 22, name: 'OLL 22 (Cross Pi)', group: 'All Edges Oriented', alg: "R U2 R2 U' R2 U' R2 U2 R", fingertrick: 'Keep thumb anchored; roll R2 turns smoothly' },
  { id: 23, name: 'OLL 23 (Headlights)', group: 'All Edges Oriented', alg: "R2 D R' U2 R D' R' U2 R'", fingertrick: 'Left ring finger D, right ring finger D\'' },
  { id: 24, name: 'OLL 24 (Chameleon)', group: 'All Edges Oriented', alg: "r U R' U' r' F R F'", fingertrick: 'Wide r with right hand, thumb F, index F\'' },
  { id: 25, name: 'OLL 25 (Bowtie)', group: 'All Edges Oriented', alg: "F' r U R' U' r' F R", fingertrick: 'Left index F\', wide r, right thumb F' },

  { id: 45, name: 'OLL 45 (T-Shape)', group: 'T-Shapes', alg: "F (R U R' U') F'", fingertrick: 'Right thumb F, sexy move, right index F\'' },
  { id: 33, name: 'OLL 33 (Key T)', group: 'T-Shapes', alg: "(R U R' U') (R' F R F')", fingertrick: 'Sexy move directly into sledgehammer' },

  { id: 31, name: 'OLL 31 (Couch)', group: 'P-Shapes', alg: "R' U' F U R U' R' F' R", fingertrick: 'Thumb-down R\', left index U\', thumb F' },
  { id: 32, name: 'OLL 32 (Anti-Couch)', group: 'P-Shapes', alg: "S R U R' U' R' F R f'", fingertrick: 'Index S push, sexy move, wide f\'' },
  { id: 43, name: 'OLL 43 (P-Shape L)', group: 'P-Shapes', alg: "f' (L' U' L U) f", fingertrick: 'Left-hand wide f\' into left sexy move' },
  { id: 44, name: 'OLL 44 (P-Shape R)', group: 'P-Shapes', alg: "f (R U R' U') f'", fingertrick: 'Wide f with thumb, sexy move, index f\'' },

  { id: 36, name: 'OLL 36 (W-Shape L)', group: 'W-Shapes', alg: "L' U' L U' L' U L U L F' L' F", fingertrick: 'Left-hand flow ending with left thumb F\'' },
  { id: 38, name: 'OLL 38 (W-Shape R)', group: 'W-Shapes', alg: "R U R' U R U' R' U' R' F R F'", fingertrick: 'Right-hand flow ending with sledgehammer' },

  { id: 5, name: 'OLL 5 (Square L)', group: 'Squares', alg: "r' U2 R U R' U r", fingertrick: 'Wide r\' down, U2 double-flick, wide r up' },
  { id: 6, name: 'OLL 6 (Square R)', group: 'Squares', alg: "r U2 R' U' R U' r'", fingertrick: 'Wide r up, U2 double-flick, wide r\' down' },

  { id: 34, name: 'OLL 34 (City C)', group: 'C-Shapes', alg: "R U R2 U' R' F R U R U' F'", fingertrick: 'Roll R2 cleanly into thumb F' },
  { id: 46, name: 'OLL 46 (Seein\' Headlights)', group: 'C-Shapes', alg: "R' U' R' F R F' U R", fingertrick: 'Thumb-down R\', sledgehammer, U R' },

  { id: 7, name: 'OLL 7 (Lightning L)', group: 'Lightning Bolts', alg: "r U R' U R U2 r'", fingertrick: 'Wide Sune variant' },
  { id: 8, name: 'OLL 8 (Lightning R)', group: 'Lightning Bolts', alg: "r' U' R U' R' U2 r", fingertrick: 'Left-thumb wide Antisune variant' },
  { id: 11, name: 'OLL 11 (Downstairs)', group: 'Lightning Bolts', alg: "r U R' U R' F R F' R U2 r'", fingertrick: 'Combine wide setup with sledgehammer' },
  { id: 12, name: 'OLL 12 (Upstairs)', group: 'Lightning Bolts', alg: "M' R' U' R U' R' U2 R U' R r'", fingertrick: 'Ring-finger M\' slice into Antisune' },
  { id: 39, name: 'OLL 39 (Big Lightning L)', group: 'Lightning Bolts', alg: "L F' L' U' L U F U' L'", fingertrick: 'Left-hand F\' push, U\' L U, thumb F' },
  { id: 40, name: 'OLL 40 (Big Lightning R)', group: 'Lightning Bolts', alg: "R' F R U R' U' F' U R", fingertrick: 'Right-hand F push, U R\' U\', index F\'' },

  { id: 9, name: 'OLL 9 (Kite)', group: 'Fish Shapes', alg: "R U R' U' R' F R2 U R' U' F'", fingertrick: 'Sexy move into R\' F R2 flow' },
  { id: 10, name: 'OLL 10 (Anti-Kite)', group: 'Fish Shapes', alg: "R U R' U R' F R F' R U2 R'", fingertrick: 'Sune interrupted by sledgehammer' },
  { id: 35, name: 'OLL 35 (Fish Salad)', group: 'Fish Shapes', alg: "R U2 R2 F R F' R U2 R'", fingertrick: 'R U2 R2 into sledgehammer and U2 R\'' },
  { id: 37, name: 'OLL 37 (Mounted Fish)', group: 'Fish Shapes', alg: "F R' F' R U R U' R'", fingertrick: 'Sledgehammer directly into inverse sexy' },

  { id: 28, name: 'OLL 28 (Stealth)', group: 'Corners Oriented', alg: "r U R' U' r' R U R U' R'", fingertrick: 'Wide sexy into M-slice sexy' },
  { id: 57, name: 'OLL 57 (H-Corners)', group: 'Corners Oriented', alg: "R U R' U' M' U R U' r'", fingertrick: 'Sexy move, ring-finger M\', finish with r\'' },

  { id: 13, name: 'OLL 13 (Gun L)', group: 'Knight Move', alg: "F U R U' R2 F' R U R U' R'", fingertrick: 'Thumb F, U R U\', roll R2' },
  { id: 14, name: 'OLL 14 (Gun R)', group: 'Knight Move', alg: "R' F R U R' F' R F U' F'", fingertrick: 'Sledgehammer variation with F U\' F\'' },
  { id: 15, name: 'OLL 15 (Squeegee L)', group: 'Knight Move', alg: "l' U' l L' U' L U l' U l", fingertrick: 'Left-hand wide triggers' },
  { id: 16, name: 'OLL 16 (Squeegee R)', group: 'Knight Move', alg: "r U r' R U R' U' r U' r'", fingertrick: 'Right-hand wide triggers' },

  { id: 29, name: 'OLL 29 (Spotted Chameleon)', group: 'Awkward Shapes', alg: "R U R' U' R U' R' F' U' F R U R'", fingertrick: 'Keep right hand regripless through F\' U\' F' },
  { id: 30, name: 'OLL 30 (Anti-Spotted)', group: 'Awkward Shapes', alg: "F R' F R2 U' R' U' R U R' F2", fingertrick: 'Thumb F, R\' F, roll R2' },
  { id: 41, name: 'OLL 41 (Awkward L)', group: 'Awkward Shapes', alg: "R U R' U R U2 R' F R U R' U' F'", fingertrick: 'Sune directly into F-sexy-F\'' },
  { id: 42, name: 'OLL 42 (Awkward R)', group: 'Awkward Shapes', alg: "R' U' R U' R' U2 R F R U R' U' F'", fingertrick: 'Back-Antisune directly into F-sexy-F\'' },

  { id: 47, name: 'OLL 47 (Anti-Breakneck)', group: 'L-Shapes', alg: "R' U' R' F R F' R' F R F' U R", fingertrick: 'Double sledgehammer framed by R\' U\' and U R' },
  { id: 48, name: 'OLL 48 (Breakneck)', group: 'L-Shapes', alg: "F (R U R' U') (R U R' U') F'", fingertrick: 'Thumb F, double sexy move, index F\'' },
  { id: 49, name: 'OLL 49 (Right Back Squeezy)', group: 'L-Shapes', alg: "r U' r2 U r2 U r2 U' r", fingertrick: 'Continuous wide r2 rolling' },
  { id: 50, name: 'OLL 50 (Right Front Squeezy)', group: 'L-Shapes', alg: "r' U r2 U' r2 U' r2 U r'", fingertrick: 'Thumb-down wide r\'2 rolling' },
  { id: 51, name: 'OLL 51 (Bottlecap)', group: 'L-Shapes', alg: "f (R U R' U') (R U R' U') f'", fingertrick: 'Wide f, double sexy move, wide f\'' },
  { id: 52, name: 'OLL 52 (Rice Cooker)', group: 'L-Shapes', alg: "R U R' U R U' B U' B' R'", fingertrick: 'Finish B turns with right ring/pinky' },
  { id: 53, name: 'OLL 53 (Frying Pan L)', group: 'L-Shapes', alg: "l' U2 L U L' U' L U L' U l", fingertrick: 'Wide l\' setup into double left-trigger' },
  { id: 54, name: 'OLL 54 (Frying Pan R)', group: 'L-Shapes', alg: "r U2 R' U' R U R' U' R U' r'", fingertrick: 'Wide r setup into double right-trigger' },

  { id: 55, name: 'OLL 55 (Highway)', group: 'I-Shapes', alg: "R' F R U R U' R2 F' R2 U' R' U R U R'", fingertrick: 'Flowing R2 transitions without regrip' },
  { id: 56, name: 'OLL 56 (Streetlights)', group: 'I-Shapes', alg: "r' U' r U' R' U R U' R' U R r' U r", fingertrick: 'Wide r\' framing two alternating triggers' },

  { id: 1, name: 'OLL 1 (Runway)', group: 'Dot Cases', alg: "R U2 R2 F R F' U2 R' F R F'", fingertrick: 'Two sledgehammers separated by U2' },
  { id: 2, name: 'OLL 2 (Zamboni)', group: 'Dot Cases', alg: "F (R U R' U') F' f (R U R' U') f'", fingertrick: 'F-sexy-F\' followed immediately by wide f-sexy-f\'' },
  { id: 3, name: 'OLL 3 (Anti-Nazi L)', group: 'Dot Cases', alg: "f (R U R' U') f' U' F (R U R' U') F'", fingertrick: 'Wide f trigger, U\', standard F trigger' },
  { id: 4, name: 'OLL 4 (Anti-Nazi R)', group: 'Dot Cases', alg: "f (R U R' U') f' U F (R U R' U') F'", fingertrick: 'Wide f trigger, U, standard F trigger' },
  { id: 17, name: 'OLL 17 (Slash)', group: 'Dot Cases', alg: "F R' F' R2 r' U R U' R' U' M'", fingertrick: 'Sledgehammer into wide r\' and ring-finger M\'' },
  { id: 18, name: 'OLL 18 (Crown)', group: 'Dot Cases', alg: "r U R' U R U2 r2 U' R U' R' U2 r", fingertrick: 'Wide Sune directly into wide Antisune' },
  { id: 19, name: 'OLL 19 (Bunny)', group: 'Dot Cases', alg: "r' R U R U R' U' M' R' F R F'", fingertrick: 'M-slice setup into sledgehammer' },
  { id: 20, name: 'OLL 20 (X-Checkers)', group: 'Dot Cases', alg: "r U R' U' M2 U R U' R' U' M'", fingertrick: 'Double M2 flick with left ring + middle fingers' }
];

const OLL_GROUPS = [
  'All Edges Oriented',
  'T-Shapes',
  'P-Shapes',
  'W-Shapes',
  'Squares',
  'C-Shapes',
  'Lightning Bolts',
  'Fish Shapes',
  'Corners Oriented',
  'Knight Move',
  'Awkward Shapes',
  'L-Shapes',
  'I-Shapes',
  'Dot Cases'
];

const OLL_DEFAULT_CHUNKS = [
  { id: 'oll-c1', title: 'Chunk 1: 2-Look Corners (Part 1)', ids: [27, 26, 21, 22] },
  { id: 'oll-c2', title: 'Chunk 2: 2-Look Corners (Part 2)', ids: [23, 24, 25] },
  { id: 'oll-c3', title: 'Chunk 3: T & P Shapes', ids: [45, 33, 31, 32, 43, 44] },
  { id: 'oll-c4', title: 'Chunk 4: W, Squares & C Shapes', ids: [36, 38, 5, 6, 34, 46] },
  { id: 'oll-c5', title: 'Chunk 5: Lightning Bolts', ids: [7, 8, 11, 12, 39, 40] },
  { id: 'oll-c6', title: 'Chunk 6: Fish & Corners Oriented', ids: [9, 10, 35, 37, 28, 57] },
  { id: 'oll-c7', title: 'Chunk 7: Knight & Awkward Shapes', ids: [13, 14, 15, 16, 29, 30, 41, 42] },
  { id: 'oll-c8', title: 'Chunk 8: L-Shapes (Part 1)', ids: [47, 48, 49, 50] },
  { id: 'oll-c9', title: 'Chunk 9: L-Shapes (Part 2) & I-Shapes', ids: [51, 52, 53, 54, 55, 56] },
  { id: 'oll-c10', title: 'Chunk 10: Dot Cases (Part 1)', ids: [1, 2, 3, 4] },
  { id: 'oll-c11', title: 'Chunk 11: Dot Cases (Part 2)', ids: [17, 18, 19, 20] }
];

const PLL_DATA = [
  {
    id: 1,
    name: 'PLL Ua',
    group: 'Edges Only (EPLL)',
    alg: "(R U R' U R') U' R2 U' (R' U R' U R)",
    inverse: "R' U' R U' R U R2 U R U' R U' R'",
    recognition: 'Solved bar in Back; 3 edges cycle counter-clockwise.',
    fingertrick: 'Keep right thumb on front; push all U turns with right index finger.',
    segments: [
      { moves: "(R U R' U R')", cue: 'Right wrist up/down while right index pushes U' },
      { moves: "U' R2 U'", cue: 'Left index flicks U\', roll R2 smoothly, left index U\'' },
      { moves: "(R' U R' U R)", cue: 'Thumb-down R\' pulls with right index U pushes' }
    ]
  },
  {
    id: 2,
    name: 'PLL Ub',
    group: 'Edges Only (EPLL)',
    alg: "(R' U) (R' U') (R' U') (R' U) R U R2",
    inverse: "R2 U' R' U' R U R U R U' R",
    recognition: 'Solved bar in Back; 3 edges cycle clockwise.',
    fingertrick: 'Start thumb-up on R\'; alternate right index U and left index U\' without regripping.',
    segments: [
      { moves: "(R' U)", cue: 'Thumb-up R\' down, right index U push' },
      { moves: "(R' U') (R' U')", cue: 'Two crisp R\' pulls paired with left index U\' flicks' },
      { moves: "(R' U) R U R2", cue: 'Right index U, wrist R, index U, roll R2 finish' }
    ]
  },
  {
    id: 3,
    name: 'PLL H',
    group: 'Edges Only (EPLL)',
    alg: "M2 (U') M2 (U2) M2 (U') M2",
    inverse: "M2 U M2 U2 M2 U M2",
    recognition: 'All corners solved; opposite edge pairs swap.',
    fingertrick: 'Support outer layers with thumbs; flick M2 with left ring → middle finger.',
    segments: [
      { moves: "M2 (U')", cue: 'Left ring + middle finger M2 double-flick, left index U\'' },
      { moves: "M2 (U2)", cue: 'Left M2 double-flick, left index + middle U2 double-flick' },
      { moves: "M2 (U') M2", cue: 'Final M2, left index U\', M2 lock' }
    ]
  },
  {
    id: 4,
    name: 'PLL Z',
    group: 'Edges Only (EPLL)',
    alg: "M' U' (M2 U') (M2 U') M' U2 M2",
    inverse: "M2 U2 M U M2 U M2 U M",
    recognition: 'All corners solved; adjacent edge pairs swap (FR-UF & BL-UB).',
    fingertrick: 'Use left ring finger for single M\' pulls and ring + middle for M2.',
    segments: [
      { moves: "M' U'", cue: 'Left ring finger pulls DB up (M\'), left index flicks U\'' },
      { moves: "(M2 U') (M2 U')", cue: 'Two M2 double-flicks separated by left index U\'' },
      { moves: "M' U2 M2", cue: 'Left ring M\', left U2 double-flick, M2 finish' }
    ]
  },
  {
    id: 5,
    name: 'PLL Aa',
    group: 'Corners Only (CPLL)',
    alg: "x (R' U R') D2 (R U' R') D2 R2 x'",
    inverse: "x R2 D2 R U R' D2 R U' R x'",
    recognition: '2x2 block in Back-Left; headlights on Back.',
    fingertrick: 'Tilt x upward so D2 sits under your left ring + middle fingers on the back-bottom.',
    segments: [
      { moves: "x (R' U R')", cue: 'Tilt x up; thumb-up R\', right index U, R\'' },
      { moves: "D2 (R U' R')", cue: 'Left ring + middle D2 double-flick; R, left index U\', R\'' },
      { moves: "D2 R2 x'", cue: 'Left D2 double-flick, roll R2 up, tilt x\' back' }
    ]
  },
  {
    id: 6,
    name: 'PLL Ab',
    group: 'Corners Only (CPLL)',
    alg: "x R2 D2 (R U R') D2 (R U' R) x'",
    inverse: "x R' U R' D2 R U' R' D2 R2 x'",
    recognition: '2x2 block in Front-Left; headlights on Right.',
    fingertrick: 'Tilt x upward, start immediately with R2, and keep left thumb anchored during D2.',
    segments: [
      { moves: "x R2 D2", cue: 'Tilt x up, roll R2 down, left ring + middle D2' },
      { moves: "(R U R') D2", cue: 'Right-hand R U R\', second left D2 double-flick' },
      { moves: "(R U' R) x'", cue: 'Wrist R, left index U\', wrist R, tilt x\' back' }
    ]
  },
  {
    id: 7,
    name: 'PLL E',
    group: 'Corners Only (CPLL)',
    alg: "x' (R U' R' D) (R U R' D') (R U R' D) (R U' R' D') x",
    inverse: "x' D R U R' D' R U' R' D R U' R' D' R U R' x",
    recognition: 'No headlights anywhere; diagonal corner swaps.',
    fingertrick: 'Tilt x\' downward; push D with left ring finger and pull D\' with right ring finger.',
    segments: [
      { moves: "x' (R U' R' D)", cue: 'Tilt x\' down; R, left index U\', R\', left ring D push' },
      { moves: "(R U R' D')", cue: 'Sexy R U R\', right ring finger D\' pull' },
      { moves: "(R U R' D) (R U' R' D') x", cue: 'Repeat alternating D / D\' ring-finger rhythm, tilt x' }
    ]
  },
  {
    id: 8,
    name: 'PLL T',
    group: 'Adjacent Swap',
    alg: "(R U R' U') (R' F R2 U') R' U' (R U R' F')",
    inverse: "F R U' R' U R U R2 F' R U R U' R'",
    recognition: 'Headlights on Left; two 1x1x2 blocks on Front-Left and Back-Left.',
    fingertrick: 'Flow straight from Sexy Move into thumb-down R\' and right-thumb F without regripping.',
    segments: [
      { moves: "(R U R' U')", cue: 'Standard Sexy Move — right wrist + right/left index' },
      { moves: "(R' F R2 U')", cue: 'R\' down, right thumb pushes F, roll R2, left index U\'' },
      { moves: "R' U' (R U R' F')", cue: 'R\', left index U\', R U R\', right index pulls F\'' }
    ]
  },
  {
    id: 9,
    name: 'PLL F',
    group: 'Adjacent Swap',
    alg: "(R' U' F') (R U R' U') (R' F R2 U') (R' U' R U) (R' U R)",
    inverse: "R' U' R U' R' U R U R2 F' R U R U' R' F U R",
    recognition: 'Full 1x1x3 solved bar on Left; no headlights on other sides.',
    fingertrick: 'Start thumb-up for R\' U\' F\', then execute a T-Perm ending with R\' U R.',
    segments: [
      { moves: "(R' U' F')", cue: 'Thumb-up R\', left index U\', left index flicks F\'' },
      { moves: "(R U R' U') (R' F R2 U')", cue: 'Sexy Move into thumb F and R2 roll (T-Perm core)' },
      { moves: "(R' U' R U) (R' U R)", cue: 'Inverse Sexy + right index U pushes to finish' }
    ]
  },
  {
    id: 10,
    name: 'PLL Ja',
    group: 'Adjacent Swap',
    alg: "(R' U L' U2) (R U' R' U2) R L",
    inverse: "L' R' U2 R U R' U2 L U' R",
    recognition: 'Solved 1x1x3 bar on Left; 1x1x2 block on Front-Right.',
    fingertrick: 'Use left index + middle for both U2 double-flicks; finish R and L simultaneously.',
    segments: [
      { moves: "(R' U L' U2)", cue: 'Thumb-up R\', right index U, left wrist L\', left U2' },
      { moves: "(R U' R' U2)", cue: 'Wrist R, left index U\', R\', left U2 double-flick' },
      { moves: "R L", cue: 'Turn right side up (R) and left side down (L) together' }
    ]
  },
  {
    id: 11,
    name: 'PLL Jb',
    group: 'Adjacent Swap',
    alg: "(R U R' F') (R U R' U') R' F R2 U' R'",
    inverse: "R U R2 F' R U R U' R' F R U' R'",
    recognition: 'Solved 1x1x3 bar on Left; 1x1x2 block on Front-Left.',
    fingertrick: 'Completely regripless—flick F\' with right index after R U R\'.',
    segments: [
      { moves: "(R U R' F')", cue: 'R U R\' trigger, right index pulls F\' down' },
      { moves: "(R U R' U')", cue: 'Standard Sexy Move with right thumb still on front' },
      { moves: "R' F R2 U' R'", cue: 'R\', right thumb F push, roll R2, left index U\', R\'' }
    ]
  },
  {
    id: 12,
    name: 'PLL Ra',
    group: 'Adjacent Swap',
    alg: "(R U' R' U') (R U R) D (R' U' R) D' (R' U2 R')",
    inverse: "R U2 R D R' U R D' R' U' R' U R U R'",
    recognition: 'Headlights on Left; 1x1x2 block in Front-Right.',
    fingertrick: 'Push D with left ring finger and pull D\' with right ring finger while keeping thumbs front.',
    segments: [
      { moves: "(R U' R' U')", cue: 'R, left index U\', R\', left index U\'' },
      { moves: "(R U R) D", cue: 'R U R upward flow, left ring finger pushes D' },
      { moves: "(R' U' R) D' (R' U2 R')", cue: 'R\' U\' R, right ring D\', R\', U2 double-flick, R\'' }
    ]
  },
  {
    id: 13,
    name: 'PLL Rb',
    group: 'Adjacent Swap',
    alg: "(R' U2 R U2') R' F (R U R' U') R' F' R2",
    inverse: "R2 F R U R U' R' F' R U2 R' U2 R",
    recognition: 'Headlights on Back; 1x1x2 block on Front-Right.',
    fingertrick: 'Start thumb-up for R\'; use right thumb for F and right index for F\'.',
    segments: [
      { moves: "(R' U2 R U2')", cue: 'Thumb-up R\', right U2, wrist R, left U2\'' },
      { moves: "R' F (R U R' U')", cue: 'R\', right thumb pushes F into Sexy Move' },
      { moves: "R' F' R2", cue: 'R\' down, right index pulls F\', roll R2 finish' }
    ]
  },
  {
    id: 14,
    name: 'PLL Y',
    group: 'Diagonal Swap',
    alg: "F (R U' R' U') (R U R' F') (R U R' U') (R' F R F')",
    inverse: "F R' F' R U R U' R' F R U' R' U R U R' F'",
    recognition: 'Two 1x1x2 blocks meeting at Front-Left; no headlights.',
    fingertrick: 'Push opening F with right thumb; flow into Sexy Move + Sledgehammer at the end.',
    segments: [
      { moves: "F (R U' R' U')", cue: 'Right thumb F push; R, left index U\', R\', left index U\'' },
      { moves: "(R U R' F')", cue: 'R U R\', right index pulls F\' down' },
      { moves: "(R U R' U') (R' F R F')", cue: 'Sexy Move directly into Sledgehammer finish' }
    ]
  },
  {
    id: 15,
    name: 'PLL V',
    group: 'Diagonal Swap',
    alg: "(R' U R' U') y (R' F' R2 U') (R' U R' F) R F",
    inverse: "F' R' F' R U' R U R2 F R y' U R U' R",
    recognition: '2x2 solved block in Front-Left; no headlights anywhere.',
    fingertrick: 'Start thumb-up R\'; rotate y smoothly during U\' so R2 F flows without a pause.',
    segments: [
      { moves: "(R' U R' U') y", cue: 'Thumb-up R\', index U, R\', left U\' while rotating y' },
      { moves: "(R' F' R2 U')", cue: 'R\', left index F\', roll R2, left index U\'' },
      { moves: "(R' U R' F) R F", cue: 'R\' U R\', right thumb F, wrist R, thumb F' }
    ]
  },
  {
    id: 16,
    name: 'PLL Na',
    group: 'Diagonal Swap',
    alg: "(R U R' U) (R U R' F') (R U R' U') R' F (R2 U' R') (U2 R U' R')",
    inverse: "R U R' U2 R U R2 F' R U R U' R' F R U' R' U' R U' R'",
    recognition: '1x1x2 blocks on Right of every face (clockwise pinwheel).',
    fingertrick: 'Think of this as (R U R\' U) + full Jb-Perm + (U2 R U\' R\') — zero regrips needed.',
    segments: [
      { moves: "(R U R' U)", cue: '4-move setup trigger with right index U pushes' },
      { moves: "(R U R' F') (R U R' U') R' F R2 U' R'", cue: 'Full Jb-Perm execution in the middle' },
      { moves: "(U2 R U' R')", cue: 'Left U2 double-flick into Inverse Sexy finish' }
    ]
  },
  {
    id: 17,
    name: 'PLL Nb',
    group: 'Diagonal Swap',
    alg: "(R' U R U') (R' F' U' F) (R U R' F) R' F' (R U' R)",
    inverse: "R' U R' F R F' R U' R' F' U F R U R' U' R",
    recognition: '1x1x2 blocks on Left of every face (counter-clockwise pinwheel).',
    fingertrick: 'Start thumb-up; use left index for F\' and right thumb for F so right hand stays planted.',
    segments: [
      { moves: "(R' U R U')", cue: 'Thumb-up R\', right index U, wrist R, left index U\'' },
      { moves: "(R' F' U' F)", cue: 'R\', left index F\', left index U\', right thumb F' },
      { moves: "(R U R' F) R' F' (R U' R)", cue: 'R U R\', thumb F, R\', index F\', R U\' R' }
    ]
  },
  {
    id: 18,
    name: 'PLL Ga',
    group: 'G-Perms',
    alg: "R2 U (R' U R' U') (R U' R2) D U' (R' U R D')",
    inverse: "D R' U' R U D' R2 U R' U R U' R U' R2",
    recognition: 'Headlights on Left; 1x1x2 block on Front-Right.',
    fingertrick: 'Execute D and U\' simultaneously using left ring (D) + left index (U\').',
    segments: [
      { moves: "R2 U (R' U R' U')", cue: 'Roll R2, right index U, R\' U R\' U\' rhythm' },
      { moves: "(R U' R2) D U'", cue: 'R U\' R2, then simultaneous left-ring D + left-index U\'' },
      { moves: "(R' U R D')", cue: 'R\' U R, finish with right ring finger D\' pull' }
    ]
  },
  {
    id: 19,
    name: 'PLL Gb',
    group: 'G-Perms',
    alg: "D (R' U' R U) D' (R2 U R' U) (R U' R U') R2'",
    inverse: "R2 U R' U R' U' R U' R2 D U' R' U R D'",
    recognition: 'Headlights on Left; 1x1x2 block on Back-Right.',
    fingertrick: 'Push opening D with left ring finger and pull D\' with right ring finger before rolling R2.',
    segments: [
      { moves: "D (R' U' R U) D'", cue: 'Left ring D, Inverse Sexy (R\' U\' R U), right ring D\'' },
      { moves: "(R2 U R' U)", cue: 'Roll R2, right index U, R\', right index U' },
      { moves: "(R U' R U') R2'", cue: 'R, left index U\', R, left index U\', roll R2\' finish' }
    ]
  },
  {
    id: 20,
    name: 'PLL Gc',
    group: 'G-Perms',
    alg: "R2' F2 (R U2 R U2') R' F (R U R' U') R' F R2",
    inverse: "R2 F' R U R U' R' F' R U2 R' U2 R' F2 R2",
    recognition: 'Headlights on Left; 1x1x2 block on Back-Left.',
    fingertrick: 'Rotationless R2\' F2 variant — use right thumb F into Sexy Move on the back half.',
    segments: [
      { moves: "R2' F2 (R U2 R U2')", cue: 'Roll R2\', double-flick F2, R U2 R U2\'' },
      { moves: "R' F (R U R' U')", cue: 'R\' down, right thumb F push into Sexy Move' },
      { moves: "R' F R2", cue: 'R\', right thumb F push, roll R2 finish' }
    ]
  },
  {
    id: 21,
    name: 'PLL Gd',
    group: 'G-Perms',
    alg: "(R U R' U') D (R2 U' R U') (R' U R' U) R2 D'",
    inverse: "D R2 U' R U' R U R' U R2 D' U R U' R'",
    recognition: 'Headlights on Left; 1x1x2 block on Front-Left.',
    fingertrick: 'Sexy Move into left-ring D push; finish with right-ring D\' pull after R2.',
    segments: [
      { moves: "(R U R' U') D", cue: 'Sexy Move followed immediately by left ring D push' },
      { moves: "(R2 U' R U')", cue: 'Roll R2, left index U\', wrist R, left index U\'' },
      { moves: "(R' U R' U) R2 D'", cue: 'R\' U R\' U, roll R2, right ring finger D\' finish' }
    ]
  },
  {
    id: 22,
    name: 'PLL H (Left-Hand M)',
    group: 'Edges Only (EPLL)',
    alg: "M2 (U) M2 (U2) M2 (U) M2",
    inverse: "M2 U' M2 U2 M2 U' M2",
    recognition: 'H-Perm variant using right-index U pushes.',
    fingertrick: 'Left ring + middle M2 flicks paired with right index U and right U2 double-flick.',
    segments: [
      { moves: "M2 (U) M2", cue: 'Left M2 double-flick, right index U push, M2' },
      { moves: "(U2) M2", cue: 'Right index + middle U2 double-flick, left M2' },
      { moves: "(U) M2", cue: 'Right index U push, final left M2 lock' }
    ]
  },
  {
    id: 23,
    name: 'PLL Z (Left-Hand M)',
    group: 'Edges Only (EPLL)',
    alg: "y M' U (M2 U) (M2 U) M' U2 M2",
    inverse: "M2 U2 M U' M2 U' M2 U' M y'",
    recognition: 'Z-Perm variant for swaps on Front-Left & Back-Right.',
    fingertrick: 'Rotate y, then alternate left-ring M\' / M2 pulls with right-index U pushes.',
    segments: [
      { moves: "y M' U", cue: 'Rotate y, left ring pulls M\', right index pushes U' },
      { moves: "(M2 U) (M2 U)", cue: 'Two left M2 double-flicks paired with right index U' },
      { moves: "M' U2 M2", cue: 'Left ring M\', right U2 double-flick, M2 finish' }
    ]
  },
  {
    id: 24,
    name: 'PLL Ja (Wide Finish)',
    group: 'Adjacent Swap',
    alg: "(R' U L' U2) (R U' R' U2) R r",
    inverse: "r' R' U2 R U R' U2 L U' R",
    recognition: 'Ja-Perm ending with ergonomic R r instead of R L.',
    fingertrick: 'Replace the awkward R L finish with right-hand R followed by wide r upward.',
    segments: [
      { moves: "(R' U L' U2)", cue: 'Thumb-up R\', right index U, left wrist L\', left U2' },
      { moves: "(R U' R' U2)", cue: 'Wrist R, left index U\', R\', left U2 double-flick' },
      { moves: "R r", cue: 'Outer R up, then wide double-layer r up with right hand' }
    ]
  },
  {
    id: 25,
    name: 'PLL Jb (Left-Handed)',
    group: 'Adjacent Swap',
    alg: "y' (L' U' L F) (L' U' L U) L F' L2' U L",
    inverse: "L' U' L2 F L' U' L' U L F' L' U L y",
    recognition: 'Mirror Jb-Perm when 1x1x3 bar is on Right.',
    fingertrick: 'Exact left-hand mirror of Jb—use left thumb for F\' and left index for F.',
    segments: [
      { moves: "y' (L' U' L F)", cue: 'Rotate y\'; left L\' U\' L trigger, left index flicks F' },
      { moves: "(L' U' L U)", cue: 'Left-Hand Sexy Move with left thumb on front' },
      { moves: "L F' L2' U L", cue: 'L, left thumb F\', roll L2\', right index U, L' }
    ]
  }
];

const PLL_GROUPS = [
  'Edges Only (EPLL)',
  'Corners Only (CPLL)',
  'Adjacent Swap',
  'Diagonal Swap',
  'G-Perms'
];

const PLL_DEFAULT_CHUNKS = [
  { id: 'pll-c1', title: 'Chunk 1: 2-Look Edges (EPLL)', ids: [1, 2, 3, 4] },
  { id: 'pll-c2', title: 'Chunk 2: 2-Look Corners (CPLL)', ids: [5, 6, 7] },
  { id: 'pll-c3', title: 'Chunk 3: Essential Adjacent (T, J, F)', ids: [8, 11, 10, 9] },
  { id: 'pll-c4', title: 'Chunk 4: R-Perms (Ra, Rb)', ids: [12, 13] },
  { id: 'pll-c5', title: 'Chunk 5: Diagonal Swaps (Y, V, N)', ids: [14, 15, 16, 17] },
  { id: 'pll-c6', title: 'Chunk 6: G-Perms (Ga–Gd)', ids: [18, 19, 20, 21] },
  { id: 'pll-c7', title: 'Chunk 7: Bonus Left & Wide Variants', ids: [22, 23, 24, 25] }
];

const WCA_NOTATION_GUIDE = [
  // Outer Faces
  { section: 'Outer Faces', move: "R / R'", desc: 'Right face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "U / U'", desc: 'Top (Up) face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "F / F'", desc: 'Front face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "L / L'", desc: 'Left face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "D / D'", desc: 'Bottom (Down) face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "B / B'", desc: 'Back face clockwise / counter-clockwise' },
  // Wide Turns
  { section: 'Wide Turns', move: "r / r'", desc: 'Wide Right double-layer turn (R + M\')' },
  { section: 'Wide Turns', move: "u / u'", desc: 'Wide Top double-layer turn (U + E\')' },
  { section: 'Wide Turns', move: "f / f'", desc: 'Wide Front double-layer turn (F + S)' },
  { section: 'Wide Turns', move: "l / l'", desc: 'Wide Left double-layer turn (L + M)' },
  // Slice Moves
  { section: 'Slice Moves', move: "M / M'", desc: 'Middle slice between L & R (follows L direction)' },
  { section: 'Slice Moves', move: "S / S'", desc: 'Standing slice between F & B (follows F direction)' },
  { section: 'Slice Moves', move: "E / E'", desc: 'Equatorial slice between U & D (follows D direction)' },
  // Rotations
  { section: 'Rotations', move: "x / x'", desc: 'Rotate entire cube on R axis (upward / downward)' },
  { section: 'Rotations', move: "y / y'", desc: 'Rotate entire cube on U axis (left / right)' },
  { section: 'Rotations', move: "z / z'", desc: 'Rotate entire cube on F axis (clockwise / counter)' },
  // Modifiers
  { section: 'Modifiers', move: 'X2', desc: '180° half-turn on any face, slice, or axis (U2, R2, M2)' },
  { section: 'Modifiers', move: '( ... )', desc: 'Fingertrick trigger grouping (e.g., Sexy Move, Sledgehammer)' }
];

const FINGERTRICK_CODEX = [
  {
    id: 'sexy',
    name: 'Sexy Move',
    notation: "(R U R' U')",
    category: 'Core Triggers',
    badgeClass: 'bg-orange-500/20 border-orange-500/45 text-orange-300',
    dotClass: 'bg-orange-400',
    finger: 'Right Wrist + Right/Left Index',
    grip: 'Home Grip (right thumb on Front-Right)',
    execution: 'Lift R with right wrist, push U with right index finger, pull R\' down, flick U\' with left index finger—zero regrips.'
  },
  {
    id: 'left-sexy',
    name: 'Left Sexy Move',
    notation: "(L' U' L U)",
    category: 'Core Triggers',
    badgeClass: 'bg-amber-500/20 border-amber-500/45 text-amber-300',
    dotClass: 'bg-amber-400',
    finger: 'Left Wrist + Left/Right Index',
    grip: 'Home Grip (left thumb on Front-Left)',
    execution: 'Lift L\' with left wrist, flick U\' with left index finger, pull L down, push U with right index finger.'
  },
  {
    id: 'inv-sexy',
    name: 'Inverse Sexy',
    notation: "(R U' R' U)",
    category: 'Core Triggers',
    badgeClass: 'bg-yellow-500/20 border-yellow-500/45 text-yellow-300',
    dotClass: 'bg-yellow-400',
    finger: 'Right Wrist + Left Index U\'',
    grip: 'Home Grip (thumbs anchored on front)',
    execution: 'Lift R upward, immediately flick U\' with left index finger, pull R\' down, push U with right index finger.'
  },
  {
    id: 'sledge',
    name: 'Sledgehammer',
    notation: "(R' F R F')",
    category: 'F-Layer Triggers',
    badgeClass: 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300',
    dotClass: 'bg-emerald-400',
    finger: 'Right Thumb F + Right Index F\'',
    grip: 'Home Grip (right thumb poised at Front-Bottom-Right)',
    execution: 'Pull R\' down, push F clockwise upward with right thumb, lift R, pull F\' counter-clockwise with right index.'
  },
  {
    id: 'hedge',
    name: 'Hedgeslammer',
    notation: "(F R' F' R)",
    category: 'F-Layer Triggers',
    badgeClass: 'bg-teal-500/20 border-teal-500/45 text-teal-300',
    dotClass: 'bg-teal-400',
    finger: 'Right Thumb F + Right Index F\'',
    grip: 'Home Grip',
    execution: 'Exact inverse of Sledgehammer: push F with right thumb, pull R\', flick F\' with right index, lift R.'
  },
  {
    id: 'double-flick',
    name: 'U2 / D2 Double-Flick',
    notation: 'U2 / D2',
    category: 'Speed Flicks',
    badgeClass: 'bg-sky-500/20 border-sky-500/45 text-sky-300',
    dotClass: 'bg-sky-400',
    finger: 'Index + Middle Finger Tap',
    grip: 'Anchor opposite thumb firmly',
    execution: 'Tap U2 with index followed immediately by middle finger (no wrist reset). Use left ring + middle finger for D2.'
  },
  {
    id: 'm-slice',
    name: 'M / M2 Slice Flick',
    notation: "M' / M2",
    category: 'Slice & Ring',
    badgeClass: 'bg-purple-500/20 border-purple-500/45 text-purple-300',
    dotClass: 'bg-purple-400',
    finger: 'Left Ring → Middle Finger',
    grip: 'Pinch front/back corners with both thumbs',
    execution: 'Pull DB up toward UB using left ring finger for M\'; follow instantly with left middle finger for M2.'
  },
  {
    id: 'ring-d',
    name: 'Ring-Finger D / D\'',
    notation: "D / D'",
    category: 'Slice & Ring',
    badgeClass: 'bg-rose-500/20 border-rose-500/45 text-rose-300',
    dotClass: 'bg-rose-400',
    finger: 'Left Ring (D) / Right Ring (D\')',
    grip: 'Home Grip (keep thumbs on front)',
    execution: 'Push D counter-clockwise from behind using left ring finger; pull D\' clockwise using right ring finger.'
  }
];

function classifySegmentStyle(moves = '') {
  const norm = moves.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (norm.includes("R U R' U'")) return FINGERTRICK_CODEX[0];
  if (norm.includes("L' U' L U")) return FINGERTRICK_CODEX[1];
  if (norm.includes("R U' R'")) return FINGERTRICK_CODEX[2];
  if (norm.includes("R' F R F'")) return FINGERTRICK_CODEX[3];
  if (norm.includes("F R' F' R")) return FINGERTRICK_CODEX[4];
  if (/\bM2?\b|\bM'/.test(norm)) return FINGERTRICK_CODEX[6];
  if (/\bD2?\b|\bD'/.test(norm)) return FINGERTRICK_CODEX[7];
  if (/U2|F2|R2/.test(norm)) return FINGERTRICK_CODEX[5];
  return FINGERTRICK_CODEX[0];
}

function buildFingertrickBreakdown(item) {
  const alg = item?.alg || '';
  const raw = item?.fingertrick || '';
  const recognition = item?.recognition || '';
  const segments = item?.segments || [];
  const firstToken = alg.replace(/[()]/g, '').trim().split(/\s+/)[0] || '';

  // 1. Determine Starting Grip from opening move
  let grip = 'Home Grip — right thumb on Front-Right, left thumb on Front-Left.';
  if (/^R'/.test(firstToken)) {
    grip = 'Thumb-Up Grip — place right thumb on Top-Right (UR) so R\' pulls down effortlessly.';
  } else if (/^R2/.test(firstToken)) {
    grip = 'Thumb-Top or Home Grip — anchor left hand firmly to roll R2 cleanly.';
  } else if (/^F\b/.test(firstToken) || /^f\b/.test(firstToken)) {
    grip = 'Home Grip — use right thumb push on Front-Bottom (FD) to start F / f.';
  } else if (/^F'/.test(firstToken) || /^f'/.test(firstToken)) {
    grip = 'Home Grip — flick F\' / f\' with left index finger on Front-Top-Left.';
  } else if (/^M/.test(firstToken) || /\bM2?\b/.test(alg)) {
    grip = 'M-Slice Grip — support front/back corners with thumbs; use left ring + middle fingers on DB.';
  } else if (/^D/.test(firstToken)) {
    grip = 'Home Grip — keep left ring finger poised on Back-Bottom-Left for D push.';
  } else if (/^x\b/.test(firstToken)) {
    grip = 'Pre-tilt x upward with both wrists so D2 becomes a back-bottom double-flick.';
  } else if (/^x'/.test(firstToken)) {
    grip = 'Pre-tilt x\' downward so bottom D / D\' turns stay in ring-finger reach.';
  } else if (/^y/.test(firstToken)) {
    grip = 'Rotate entire cube on U axis first, then lock straight into Home Grip.';
  }

  // 2. Detect Named Speedcube Triggers & Key Finger Mechanics
  const triggers = [];
  const normalized = alg.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalized.includes("R U R' U'")) triggers.push({ codex: FINGERTRICK_CODEX[0], detail: "Sexy Move (R U R' U') — right wrist + index push/pull" });
  if (normalized.includes("L' U' L U")) triggers.push({ codex: FINGERTRICK_CODEX[1], detail: "Left Sexy Move (L' U' L U) — left wrist + right index U push" });
  if (normalized.includes("R U' R'")) triggers.push({ codex: FINGERTRICK_CODEX[2], detail: "Inverse Sexy (R U' R') — left index U' flick between R turns" });
  if (normalized.includes("R' F R F'")) triggers.push({ codex: FINGERTRICK_CODEX[3], detail: "Sledgehammer (R' F R F') — right thumb F push, right index F' pull" });
  if (normalized.includes("F R' F' R")) triggers.push({ codex: FINGERTRICK_CODEX[4], detail: "Hedgeslammer (F R' F' R) — right thumb F, right index F'" });
  if (/U2/.test(normalized)) triggers.push({ codex: FINGERTRICK_CODEX[5], detail: 'U2 Double-Flick — index + middle finger tap (no wrist reset)' });
  if (/D2/.test(normalized)) triggers.push({ codex: FINGERTRICK_CODEX[5], detail: 'D2 Double-Flick — left ring + middle finger back-bottom tap' });
  if (/M2/.test(normalized)) triggers.push({ codex: FINGERTRICK_CODEX[6], detail: 'M2 Double-Flick — left ring followed immediately by middle finger' });

  // 3. Flow / Regrip Cue
  const hasRegripWarning =
    triggers.length === 0
      ? 'Keep both thumbs anchored on the front face; avoid letting go with your left hand.'
      : 'Execute regripless—let your left index handle U\' pushes while your right wrist flows.';

  return {
    grip,
    cue: raw,
    recognition,
    segments,
    triggers,
    flow: hasRegripWarning
  };
}

function getAlgorithmTriggerTags(alg = '') {
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
  return tags;
}

const F2L_VIEW_ANGLES = [
  { label: 'Front-Right (Target)', rot: 'y-35x-25' },
  { label: 'Front-Left (Green/Red)', rot: 'y35x-25' },
  { label: 'Back-Right (Orange/Blue)', rot: 'y-135x-25' },
  { label: 'Back-Left (Blue/Red)', rot: 'y135x-25' }
];

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

const getCrossImageUrl = (scramble) =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=cross&bg=t&cc=080b12&co=100&fc=yyyyyyyyyooooooooogggggggggwwwwwwwwwrrrrrrrrrbbbbbbbbb&r=y-35x25&alg=${encodeURIComponent(scramble)}`;

function generatePLLSetupScramble(inverseAlg, variationSeed = 0) {
  if (variationSeed === 0) return inverseAlg;
  const aufOptions = ['', 'U', "U'", 'U2'];
  const preAuf = aufOptions[variationSeed % aufOptions.length];
  const postAuf = aufOptions[Math.floor(variationSeed / 2) % aufOptions.length];
  return `${preAuf} ${inverseAlg} ${postAuf}`.replace(/\s+/g, ' ').trim();
}

// =========================================================================
// 2B. LIVE 3x3 CUBE SIMULATOR FOR CROSS 180° BOTTOM-VIEW SVG DIAGRAM
// =========================================================================
function simulateCrossCubeState(scramble = '') {
  // Faces: U(0..8 Yellow), R(9..17 Orange), F(18..26 Green), D(27..35 White), L(36..44 Red), B(45..53 Blue)
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

  const cycle4 = (a, b, c, d) => {
    const tmp = s[d];
    s[d] = s[c];
    s[c] = s[b];
    s[b] = s[a];
    s[a] = tmp;
  };

  const turnOnce = (face) => {
    if (face === 'U') {
      rotCW(0);
      cycle4(18, 36, 45, 9);
      cycle4(19, 37, 46, 10);
      cycle4(20, 38, 47, 11);
    } else if (face === 'D') {
      rotCW(27);
      cycle4(24, 15, 51, 42);
      cycle4(25, 16, 52, 43);
      cycle4(26, 17, 53, 44);
    } else if (face === 'R') {
      rotCW(9);
      cycle4(2, 51, 29, 20);
      cycle4(5, 48, 32, 23);
      cycle4(8, 45, 35, 26);
    } else if (face === 'L') {
      rotCW(36);
      cycle4(0, 18, 27, 53);
      cycle4(3, 21, 30, 50);
      cycle4(6, 24, 33, 47);
    } else if (face === 'F') {
      rotCW(18);
      cycle4(6, 9, 29, 44);
      cycle4(7, 12, 28, 41);
      cycle4(8, 15, 27, 38);
    } else if (face === 'B') {
      rotCW(45);
      cycle4(2, 36, 33, 17);
      cycle4(1, 39, 34, 14);
      cycle4(0, 42, 35, 11);
    }
  };

  const tokens = scramble.trim().split(/\s+/).filter(Boolean);
  tokens.forEach((tok) => {
    const face = tok[0];
    const mod = tok.slice(1);
    const reps = mod === '2' ? 2 : mod === "'" ? 3 : 1;
    for (let i = 0; i < reps; i++) turnOnce(face);
  });

  return s;
}

const STICKER_HEX = {
  W: '#f8fafc',
  Y: '#facc15',
  G: '#22c55e',
  B: '#3b82f6',
  O: '#f97316',
  R: '#ef4444'
};

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

  // Realistic mid-solve background triggers that preserve White Cross and FR slot
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

function buildSchedule(chunks, dataList) {
  const schedule = [];
  let dayCounter = 1;
  (Array.isArray(chunks) ? chunks : []).forEach((chunk, idx) => {
    if (!chunk || !Array.isArray(chunk.ids)) return;
    const safeTitle = typeof chunk.title === 'string' ? chunk.title : `Chunk ${idx + 1}`;
    const cases = chunk.ids
      .map((id) => dataList.find((item) => item.id === id))
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
        .map((id) => dataList.find((item) => item.id === id))
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
// 3. MAIN APPLICATION COMPONENT
// =========================================================================

const DEFAULT_USERS = {
  Me: {
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
    pin: '',
    isAdmin: true
  },
  Dad: {
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
    pin: '',
    isAdmin: false
  },
  Ephraim: {
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
    pin: '',
    isAdmin: false
  },
  Victor: {
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
    pin: '',
    isAdmin: false
  }
};

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
  // Cloud Auth & Sync State
  const [cloudAuthUser, setCloudAuthUser] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('connecting'); // 'connecting' | 'synced' | 'offline'

  // Persistent User & App Settings (Local Storage Cache + Cloud Firestore Sync)
  const [users, setUsers] = useState(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.users) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...DEFAULT_USERS, ...parsed };
        }
      }
    } catch {
      // Fallback to defaults if storage unavailable
    }
    return { ...DEFAULT_USERS };
  });
  const [activeUserKey, setActiveUserKey] = useState('Me');
  const [activePhase, setActivePhase] = useState('f2l'); // 'cross' | 'f2l' | 'oll' | 'pll'
  const [cfopMenuOpen, setCfopMenuOpen] = useState(false);

  // Sub-tabs per phase
  const [crossTab, setCrossTab] = useState('ladder'); // 'ladder' | 'blind' | 'mechanics' | 'settings'
  const [f2lTab, setF2lTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [ollTab, setOllTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [pllTab, setPllTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'

  // Global Preferences
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(true);
  const [fingertricksEnabled, setFingertricksEnabled] = useState(true);
  const [targetGoalSec, setTargetGoalSec] = useState(2.5);
  const [f2lSetupMode, setF2lSetupMode] = useState('beginner'); // 'beginner' | 'realistic'
  const [f2lSetupSeed, setF2lSetupSeed] = useState(0);
  const [pllSetupSeed, setPllSetupSeed] = useState(0);
  // Settings 3D Card Deck State
  const [settingsDeckIdx, setSettingsDeckIdx] = useState(0);
  const [notationFilter, setNotationFilter] = useState('All');
  const [dossierFilter, setDossierFilter] = useState('All');
  const deckTouchStartRef = useRef(null);

  // Cross Phase State
  const [crossTier, setCrossTier] = useState(1);
  const [crossScrambleIdx, setCrossScrambleIdx] = useState(0);
  const [crossLadderMode, setCrossLadderMode] = useState('efficiency'); // 'efficiency' | 'blind'
  const [crossBottomView, setCrossBottomView] = useState(true);
  const [crossUserMoves, setCrossUserMoves] = useState(2);
  const [efficiencyFeedback, setEfficiencyFeedback] = useState(null);
  const [activeMechanicId, setActiveMechanicId] = useState(1);

  // Blind Inspection Trainer State
  const [blindState, setBlindState] = useState('idle'); // 'idle' | 'inspecting' | 'readying' | 'armed' | 'visor' | 'done'
  const [inspectionLeft, setInspectionLeft] = useState(15.0);
  const [blindLogs, setBlindLogs] = useState([]);

  // Color Orbit Flash Card Game State
  const [orbitQuizIdx, setOrbitQuizIdx] = useState(0);
  const [orbitQuizActive, setOrbitQuizActive] = useState(false);
  const [orbitShuffledColors, setOrbitShuffledColors] = useState(['Green', 'Red', 'Orange', 'Blue']);
  const [orbitStreak, setOrbitStreak] = useState(0);
  const [orbitFeedback, setOrbitFeedback] = useState(null); // { correct: boolean, chosen: string }
  const padHoldTimeoutRef = useRef(null);

  // F2L & OLL Library / Lineup State
  const [f2lLibMode, setF2lLibMode] = useState('groups'); // 'groups' | 'chunks'
  const [f2lSelectedCategory, setF2lSelectedCategory] = useState(null);
  const [f2lLineupOrder, setF2lLineupOrder] = useState([]);

  const [ollLibMode, setOllLibMode] = useState('groups'); // 'groups' | 'chunks'
  const [ollSelectedCategory, setOllSelectedCategory] = useState(null);
  const [ollLineupOrder, setOllLineupOrder] = useState([]);

  const [pllLibMode, setPllLibMode] = useState('groups'); // 'groups' | 'chunks'
  const [pllSelectedCategory, setPllSelectedCategory] = useState(null);
  const [pllLineupOrder, setPllLineupOrder] = useState([]);

  // Mobile Touch Drag-and-Drop Lineup Reorder State
  const [draggedLineupIdx, setDraggedLineupIdx] = useState(null);
  const holdTimerRef = useRef(null);
  const preHoldStartYRef = useRef(null);

  // Active Modals & Session Runners
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'compass' | 'onboarding' | 'reset' | 'curriculum' | 'fingertrick' | 'preview'
  const [onboardingSlide, setOnboardingSlide] = useState(0);
  const [ftCase, setFtCase] = useState(null);
  const [ftPhaseContext, setFtPhaseContext] = useState('f2l');
  const [builderPhase, setBuilderPhase] = useState('f2l');
  const [builderChunks, setBuilderChunks] = useState([]);
  const [newChunkName, setNewChunkName] = useState('');
  const [newChunkSelectedIds, setNewChunkSelectedIds] = useState([]);

  // PIN Code & Admin Panel State
  const [pendingUserSwitch, setPendingUserSwitch] = useState(null);
  const [startupPinLocked, setStartupPinLocked] = useState(true);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [creatingPinForUser, setCreatingPinForUser] = useState(null);
  const [pinEntryInput, setPinEntryInput] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');
  const [myPinDraft, setMyPinDraft] = useState('');
  const [adminMasterPin, setAdminMasterPin] = useState(() => {
    try {
      const savedPin = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEYS.masterPin) : null;
      if (savedPin && /^\d{4}$/.test(savedPin) && savedPin !== '0000') return savedPin;
    } catch {
      // Ignore storage error
    }
    return '1678';
  });
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminGateInput, setAdminGateInput] = useState('');
  const [adminGateError, setAdminGateError] = useState('');
  const [adminNewUserName, setAdminNewUserName] = useState('');
  const [adminNewUserPin, setAdminNewUserPin] = useState('');
  const [adminStatusMsg, setAdminStatusMsg] = useState('');

  // Session & Drill Runners (F2L, OLL & PLL)
  const [f2lSession, setF2lSession] = useState(null); // { dayObj, index, queue }
  const [f2lDrillCase, setF2lDrillCase] = useState(null);
  const [f2lViewIdx, setF2lViewIdx] = useState(0);
  const [ollSession, setOllSession] = useState(null);
  const [ollDrillCase, setOllDrillCase] = useState(null);
  const [pllSession, setPllSession] = useState(null);
  const [pllDrillCase, setPllDrillCase] = useState(null);

  // Stopwatch State inside Session / Drill
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const swStartRef = useRef(0);

  // 1. Authenticate Cloud Session First
  useEffect(() => {
    if (!auth) {
      setCloudSyncStatus('offline');
      return;
    }
    let active = true;
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        unsubscribe = onAuthStateChanged(auth, (u) => {
          if (active && u) setCloudAuthUser(u);
        });
        const initialToken =
          typeof globalThis !== 'undefined' ? globalThis.__initial_auth_token : null;
        if (initialToken) {
          await signInWithCustomToken(auth, initialToken);
        } else if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch {
        if (active) setCloudSyncStatus('offline');
      }
    };

    initAuth();
    return () => {
      active = false;
      try {
        unsubscribe();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Sanitize user records so corrupted/non-primitive fields never crash React rendering
  const sanitizeUserRecord = (raw) => {
    const base = {
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
      pin: '',
      isAdmin: false
    };
    if (!raw || typeof raw !== 'object' || raw.$$typeof) return base;
    const cleanStatMap = (m) => {
      if (!m || typeof m !== 'object' || m.$$typeof) return {};
      const out = {};
      Object.entries(m).forEach(([k, v]) => {
        if (v && typeof v === 'object' && !v.$$typeof) {
          out[k] = {
            attempts: typeof v.attempts === 'number' ? v.attempts : 0,
            best: typeof v.best === 'number' ? v.best : null,
            last: typeof v.last === 'number' ? v.last : null
          };
        }
      });
      return out;
    };
    return {
      day: typeof raw.day === 'number' ? raw.day : 1,
      f2lDay: typeof raw.f2lDay === 'number' ? raw.f2lDay : 1,
      pllDay: typeof raw.pllDay === 'number' ? raw.pllDay : 1,
      stats: cleanStatMap(raw.stats),
      f2lStats: cleanStatMap(raw.f2lStats),
      pllStats: cleanStatMap(raw.pllStats),
      customChunks: Array.isArray(raw.customChunks)
        ? raw.customChunks.filter((c) => c && typeof c.title === 'string' && Array.isArray(c.ids))
        : null,
      f2lCustomChunks: Array.isArray(raw.f2lCustomChunks)
        ? raw.f2lCustomChunks.filter((c) => c && typeof c.title === 'string' && Array.isArray(c.ids))
        : null,
      pllCustomChunks: Array.isArray(raw.pllCustomChunks)
        ? raw.pllCustomChunks.filter((c) => c && typeof c.title === 'string' && Array.isArray(c.ids))
        : null,
      crossClears: typeof raw.crossClears === 'number' ? raw.crossClears : 0,
      pin: typeof raw.pin === 'string' || typeof raw.pin === 'number' ? String(raw.pin).replace(/\D/g, '').slice(0, 4) : '',
      isAdmin: Boolean(raw.isAdmin)
    };
  };

  const usersRef = useRef(users);
  useEffect(() => {
    usersRef.current = users;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
      }
    } catch {
      // Ignore quota/private-mode storage errors
    }
  }, [users]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && /^\d{4}$/.test(adminMasterPin)) {
        window.localStorage.setItem(STORAGE_KEYS.masterPin, adminMasterPin);
      }
    } catch {
      // Ignore storage errors
    }
  }, [adminMasterPin]);

  // 2. Real-Time Cloud Sync for Solver Profiles, PINs, Admin Settings & Progress
  useEffect(() => {
    if (!db || !cloudAuthUser) return;
    let unsubProfiles = () => {};
    let unsubConfig = () => {};
    try {
      const profilesCol = collection(db, 'artifacts', appId, 'public', 'data', 'solver_profiles');
      const configDoc = doc(db, 'artifacts', appId, 'public', 'data', 'suite_config', 'global');

      unsubProfiles = onSnapshot(
        profilesCol,
        (snapshot) => {
          setCloudSyncStatus('synced');
          if (snapshot.empty) {
            // Seed current profiles to cloud on first ever boot
            Object.entries(usersRef.current || DEFAULT_USERS).forEach(([uKey, uVal]) => {
              const cleanVal = sanitizeUserRecord(uVal);
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'solver_profiles', uKey), {
                ...cleanVal,
                name: uKey
              }).catch(() => {});
            });
            return;
          }
          setUsers((prev) => {
            const merged = { ...prev };
            snapshot.forEach((docSnap) => {
              const id = String(docSnap.id);
              const data = docSnap.data();
              if (data && typeof data === 'object' && !data.$$typeof) {
                if (data._deleted) {
                  delete merged[id];
                } else {
                  merged[id] = sanitizeUserRecord(data);
                }
              }
            });
            return Object.keys(merged).length > 0 ? merged : prev;
          });
        },
        () => {
          setCloudSyncStatus('offline');
        }
      );

      unsubConfig = onSnapshot(
        configDoc,
        (docSnap) => {
          if (docSnap.exists()) {
            const cfg = docSnap.data();
            if (cfg?.adminMasterPin && typeof cfg.adminMasterPin === 'string' && cfg.adminMasterPin !== '0000') {
              setAdminMasterPin(cfg.adminMasterPin);
            }
          } else {
            setDoc(configDoc, { adminMasterPin: '1678' }, { merge: true }).catch(() => {});
          }
        },
        () => {}
      );
    } catch {
      setCloudSyncStatus('offline');
    }

    return () => {
      try {
        unsubProfiles();
        unsubConfig();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [cloudAuthUser]);

  // Helper to push individual user updates to Cloud + Local Cache
  const saveUserToCloud = (uKey, uData) => {
    if (typeof uKey !== 'string') return;
    const cleanData = sanitizeUserRecord(uData);
    const nextUsers = { ...usersRef.current, [uKey]: cleanData };
    usersRef.current = nextUsers;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(nextUsers));
      }
    } catch {
      // Ignore storage errors
    }
    if (!db || !cloudAuthUser) return;
    setDoc(
      doc(db, 'artifacts', appId, 'public', 'data', 'solver_profiles', uKey),
      { ...cleanData, name: String(uKey), updatedAt: Date.now() },
      { merge: true }
    ).catch(() => {});
  };

  const currentUser = sanitizeUserRecord(users[activeUserKey] || DEFAULT_USERS.Me);
  const f2lChunks = currentUser.f2lCustomChunks || F2L_DEFAULT_CHUNKS;
  const ollChunks = currentUser.customChunks || OLL_DEFAULT_CHUNKS;
  const pllChunks = currentUser.pllCustomChunks || PLL_DEFAULT_CHUNKS;

  const f2lSchedule = buildSchedule(f2lChunks, F2L_DATA);
  const ollSchedule = buildSchedule(ollChunks, OLL_DATA);
  const pllSchedule = buildSchedule(pllChunks, PLL_DATA);

  const safeF2lDay = Math.min(Math.max(1, currentUser.f2lDay || 1), f2lSchedule.length || 1);
  const safeOllDay = Math.min(Math.max(1, currentUser.day || 1), ollSchedule.length || 1);
  const safePllDay = Math.min(Math.max(1, currentUser.pllDay || 1), pllSchedule.length || 1);

  const currentF2lDayObj = f2lSchedule[safeF2lDay - 1] || f2lSchedule[0];
  const currentOllDayObj = ollSchedule[safeOllDay - 1] || ollSchedule[0];
  const currentPllDayObj = pllSchedule[safePllDay - 1] || pllSchedule[0];

  // Keep daily lineup arrays synced with current day cases
  useEffect(() => {
    if (currentF2lDayObj?.cases) {
      setF2lLineupOrder(currentF2lDayObj.cases);
    }
  }, [safeF2lDay, activeUserKey, currentUser.f2lCustomChunks]);

  useEffect(() => {
    if (currentOllDayObj?.cases) {
      setOllLineupOrder(currentOllDayObj.cases);
    }
  }, [safeOllDay, activeUserKey, currentUser.customChunks]);

  useEffect(() => {
    if (currentPllDayObj?.cases) {
      setPllLineupOrder(currentPllDayObj.cases);
    }
  }, [safePllDay, activeUserKey, currentUser.pllCustomChunks]);

  // Audio Synthesizer
  const audioCtxRef = useRef(null);
  const emitBeep = (freq = 540, type = 'sine', duration = 0.07, vol = 0.14) => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
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
      // Ignore audio block
    }
  };

  // Stopwatch Ticker
  useEffect(() => {
    if (!swRunning) return;
    let raf;
    const tick = () => {
      setSwElapsedMs(performance.now() - swStartRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [swRunning]);

  const toggleStopwatch = (onStopRecord) => {
    if (!swRunning) {
      emitBeep(720, 'sine', 0.06);
      swStartRef.current = performance.now();
      setSwElapsedMs(0);
      setSwRunning(true);
    } else {
      emitBeep(960, 'triangle', 0.09);
      const finalSec = Number(((performance.now() - swStartRef.current) / 1000).toFixed(2));
      setSwRunning(false);
      if (onStopRecord && finalSec > 0.15) {
        onStopRecord(finalSec);
      }
    }
  };

  const recordCaseTime = (phase, caseId, timeSec) => {
    setUsers((prev) => {
      const u = prev[activeUserKey] || DEFAULT_USERS.Me;
      const statField = phase === 'f2l' ? 'f2lStats' : phase === 'pll' ? 'pllStats' : 'stats';
      const existing = u[statField]?.[caseId] || { attempts: 0, best: null, last: null };
      const best = existing.best === null ? timeSec : Math.min(existing.best, timeSec);
      const updatedUser = {
        ...u,
        [statField]: {
          ...(u[statField] || {}),
          [caseId]: {
            attempts: existing.attempts + 1,
            best,
            last: timeSec
          }
        }
      };
      saveUserToCloud(activeUserKey, updatedUser);
      return {
        ...prev,
        [activeUserKey]: updatedUser
      };
    });
  };

  // WCA Blind Inspection Countdown Effect
  useEffect(() => {
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
  }, [blindState]);

  const handleBlindPadDown = () => {
    if (blindState !== 'inspecting') return;
    setBlindState('readying');
    padHoldTimeoutRef.current = setTimeout(() => {
      emitBeep(1020, 'sine', 0.08);
      setBlindState('armed');
    }, 350);
  };

  const handleBlindPadUp = () => {
    if (padHoldTimeoutRef.current) clearTimeout(padHoldTimeoutRef.current);
    if (blindState === 'armed') {
      emitBeep(1240, 'triangle', 0.1);
      setBlindState('visor');
    } else if (blindState === 'readying') {
      setBlindState('inspecting');
    }
  };

  // Non-passive mobile touch scroll lock during active lineup drag-and-drop
  useEffect(() => {
    if (draggedLineupIdx === null) return;

    const handleWindowTouchMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
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
    };

    const handleWindowTouchEnd = () => {
      setDraggedLineupIdx(null);
    };

    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);
    return () => {
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
      const u = { ...(prev[activeUserKey] || DEFAULT_USERS.Me) };
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
      if (scope === 'both') {
        const fresh = { ...DEFAULT_USERS.Me, isAdmin: Boolean(u.isAdmin), pin: u.pin || '' };
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
      const u = prev[activeUserKey] || DEFAULT_USERS.Me;
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
  const activeTierObj = CROSS_TIERS.find((t) => t.tier === crossTier) || CROSS_TIERS[0];
  const activeCrossScramble = activeTierObj.scrambles[crossScrambleIdx % activeTierObj.scrambles.length];
  const activeMechanicObj = CROSS_MECHANICS.find((m) => m.id === activeMechanicId) || CROSS_MECHANICS[0];

  // Progress Metrics
  const f2lMasteredCount = Object.values(currentUser.f2lStats || {}).filter(
    (s) => s.best !== null && s.best <= targetGoalSec
  ).length;
  const ollMasteredCount = Object.values(currentUser.stats || {}).filter(
    (s) => s.best !== null && s.best <= targetGoalSec
  ).length;
  const pllMasteredCount = Object.values(currentUser.pllStats || {}).filter(
    (s) => s.best !== null && s.best <= targetGoalSec
  ).length;

  const activeF2LSessionCase = f2lSession?.queue?.[f2lSession.index] || null;
  const activeOLLSessionCase = ollSession?.queue?.[ollSession.index] || null;
  const activePLLSessionCase = pllSession?.queue?.[pllSession.index] || null;

  // Settings Deck Touch Swipe Handlers
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
        setSettingsDeckIdx((p) => (p + 1) % 5);
      } else {
        setSettingsDeckIdx((p) => (p + 4) % 5);
      }
    }
  };

  const getDeckCardClass = (cardIdx) => {
    const rel = (cardIdx - settingsDeckIdx + 5) % 5;
    if (rel === 0) return 'deck-card-1';
    if (rel === 1) return 'deck-card-2';
    return 'deck-card-3';
  };

  // Reusable Settings Deck Renderer
  const renderSettingsDeck = () => (
    <div className="p-5 pb-10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Control Center</p>
          <h2 className="text-2xl font-black tracking-tight text-white">Settings</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4].map((idx) => (
            <button
              key={idx}
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(idx);
              }}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                settingsDeckIdx === idx ? 'w-6 bg-orange-500' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Stacked 3D Deck Container */}
      <div
        onTouchStart={handleDeckTouchStart}
        onTouchEnd={handleDeckTouchEnd}
        className="relative h-[455px] w-full mt-2"
      >
        {/* Card 1: Hardware & Training Preferences */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3.5 ${getDeckCardClass(0)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 1 of 5 • Preferences</span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(1);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Next Card →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Speedcubing Suite</h3>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
              <div>
                <p className="text-xs font-bold text-white">Speedcube Stopwatch</p>
                <p className="text-[10px] text-slate-400">Record solve times & track case PRs</p>
              </div>
              <button
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

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
              <div>
                <p className="text-xs font-bold text-white">Fingertrick Execution Dossiers</p>
                <p className="text-[10px] text-slate-400">Show color-coded grip cues on every card</p>
              </div>
              <button
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

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-3">
              <div>
                <p className="text-xs font-bold text-white">Synthesized Sound Cues</p>
                <p className="text-[10px] text-slate-400">Inspection warnings & timer chimes</p>
              </div>
              <button
                onClick={() => setAudioEnabled((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                  audioEnabled ? 'bg-orange-500' : 'bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${audioEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Target PR Goal</span>
                <span className="font-mono text-xs font-black text-orange-400">{targetGoalSec.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={targetGoalSec}
                onChange={(e) => setTargetGoalSec(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Notation Key */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col ${getDeckCardClass(1)}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Card 2 of 5 • Reference
            </span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(2);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Next Card →
            </button>
          </div>
          <h3 className="text-lg font-black text-white mb-2">Notation Key</h3>

          {/* Section Filter Pills */}
          <div data-scrollable="true" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-1 flex-shrink-0">
            {['All', 'Outer Faces', 'Wide Turns', 'Slice Moves', 'Rotations', 'Modifiers'].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  emitBeep(540);
                  setNotationFilter(sec);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap cursor-pointer transition-all ${
                  notationFilter === sec
                    ? 'bg-orange-500 text-slate-950 shadow-sm'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          <div data-scrollable="true" className="h-[295px] overflow-y-auto no-scrollbar space-y-1.5 pr-1">
            {WCA_NOTATION_GUIDE.filter((item) => notationFilter === 'All' || item.section === notationFilter).map((item) => (
              <div key={item.move} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <div className="flex flex-col flex-shrink-0">
                  <span className="font-mono text-xs font-black text-amber-300">{item.move}</span>
                  {notationFilter === 'All' && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.section}</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-300 text-right max-w-[190px] leading-snug">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: All-Inclusive Color-Coded Fingertricks Dossier */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col ${getDeckCardClass(2)}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Card 3 of 5 • Mechanics Codex
            </span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(3);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Next Card →
            </button>
          </div>
          <h3 className="text-lg font-black text-white mb-2">Fingertricks Dossier</h3>

          <div data-scrollable="true" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-1 flex-shrink-0">
            {['All', 'Core Triggers', 'F-Layer Triggers', 'Speed Flicks', 'Slice & Ring'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  emitBeep(540);
                  setDossierFilter(cat);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap cursor-pointer transition-all ${
                  dossierFilter === cat
                    ? 'bg-orange-500 text-slate-950 shadow-sm'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div data-scrollable="true" className="h-[295px] overflow-y-auto no-scrollbar space-y-2 pr-1">
            {FINGERTRICK_CODEX.filter((entry) => dossierFilter === 'All' || entry.category === dossierFilter).map((entry) => (
              <div key={entry.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${entry.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${entry.dotClass}`} />
                    {entry.name}
                  </span>
                  <span className="font-mono text-[11px] font-black text-amber-300">{entry.notation}</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400">
                  <strong className="text-slate-200">Finger:</strong> {entry.finger} &nbsp;•&nbsp; <strong className="text-slate-200">Grip:</strong> {entry.grip}
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">{entry.execution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Card 4: Guides, PIN Security & Reset */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-2.5 ${getDeckCardClass(3)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 4 of 5 • Roadmap &amp; PIN</span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(4);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Admin Panel →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Guides, PIN &amp; Data</h3>

          {/* Personal 4-Digit Profile PIN Setter */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white">Profile PIN Lock ({activeUserKey})</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                currentUser.pin ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-slate-800 text-slate-400'
              }`}>
                {currentUser.pin ? 'PIN Active' : 'Unlocked'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={myPinDraft}
                onChange={(e) => setMyPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder={currentUser.pin ? 'New 4-digit PIN' : 'Set 4-digit PIN'}
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => {
                  const cleanPin = myPinDraft.replace(/\D/g, '').slice(0, 4);
                  if (cleanPin.length !== 4) return;
                  emitBeep(760);
                  const updated = { ...currentUser, pin: cleanPin };
                  setUsers((prev) => ({
                    ...prev,
                    [activeUserKey]: updated
                  }));
                  saveUserToCloud(activeUserKey, updated);
                  setMyPinDraft('');
                }}
                className="px-3 py-2 rounded-xl bg-orange-500 text-slate-950 font-black text-[11px] uppercase cursor-pointer"
              >
                Save
              </button>
              {currentUser.pin && (
                <button
                  type="button"
                  onClick={() => {
                    emitBeep(420);
                    const updated = { ...currentUser, pin: '' };
                    setUsers((prev) => ({
                      ...prev,
                      [activeUserKey]: updated
                    }));
                    saveUserToCloud(activeUserKey, updated);
                    setMyPinDraft('');
                  }}
                  className="px-2.5 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-black text-[11px] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              emitBeep(600);
              setOnboardingSlide(0);
              setActiveModal('onboarding');
            }}
            className="w-full p-3 rounded-2xl bg-gradient-to-r from-orange-600/20 to-amber-500/20 border border-orange-500/35 text-left flex items-center justify-between hover:bg-orange-500/25 cursor-pointer"
          >
            <div>
              <p className="text-xs font-black text-orange-300">New to CFOP? Beginner&apos;s Guide</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Interactive walkthrough of C → F → O → P</p>
            </div>
            <span className="text-orange-400 font-black text-sm">→</span>
          </button>

          <button
            onClick={() => {
              emitBeep(600);
              openCurriculumBuilder(activePhase === 'oll' ? 'oll' : activePhase === 'pll' ? 'pll' : 'f2l');
            }}
            className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs font-black text-white">Custom Chunk Curriculum Builder</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Build your own F2L, OLL, or PLL learning groups</p>
            </div>
            <span className="text-slate-400 font-black text-sm">→</span>
          </button>

          <button
            onClick={() => {
              emitBeep(400);
              setActiveModal('reset');
            }}
            className="w-full p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs font-black text-red-300">Reset Progress ({activeUserKey})</p>
              <p className="text-[10px] text-red-300/75 mt-0.5">Granular F2L, OLL, PLL, stats, or full profile reset</p>
            </div>
            <span className="text-red-400 font-black text-sm">↺</span>
          </button>
        </div>

        {/* Card 5: Admin Panel (User PINs, Profiles & Day Overrides) */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col ${getDeckCardClass(4)}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Card 5 of 5 • System Control
            </span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(0);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Back to Card 1 →
            </button>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">Admin Panel</h3>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                cloudSyncStatus === 'synced'
                  ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {cloudSyncStatus === 'synced' ? 'Cloud Synced' : 'Local Mode'}
              </span>
            </div>
            {adminUnlocked && (
              <button
                type="button"
                onClick={() => {
                  emitBeep(440);
                  setAdminUnlocked(false);
                  setAdminGateInput('');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
              >
                Lock Admin
              </button>
            )}
          </div>

          {!adminUnlocked ? (
            <div className="flex-1 flex flex-col justify-center space-y-3">
              <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-4 space-y-3 text-center">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-400">
                  Restricted Access
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter the 4-digit <strong className="text-white">Admin Master PIN</strong> to manage family profiles, reset user PIN codes, or adjust phase days.
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={adminGateInput}
                  onChange={(e) => {
                    setAdminGateError('');
                    setAdminGateInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  placeholder="••••"
                  className="w-36 mx-auto block text-center tracking-[0.5em] font-mono text-lg font-black bg-white/5 border border-white/15 rounded-xl py-2.5 text-white placeholder-slate-600"
                />
                {adminGateError && (
                  <p className="text-[11px] font-bold text-red-400">{adminGateError}</p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (adminGateInput === adminMasterPin) {
                      emitBeep(880, 'sine', 0.1);
                      setAdminUnlocked(true);
                      setAdminGateInput('');
                      setAdminGateError('');
                    } else {
                      emitBeep(260, 'sawtooth', 0.14);
                      setAdminGateError('Incorrect Admin Master PIN');
                    }
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Unlock Admin Panel
                </button>
              </div>
            </div>
          ) : (
            <div data-scrollable="true" className="h-[345px] overflow-y-auto no-scrollbar space-y-3 pr-1">
              {adminStatusMsg && (
                <div className="bg-green-500/15 border border-green-500/35 rounded-xl px-3 py-1.5 text-[11px] font-bold text-green-300 text-center">
                  {adminStatusMsg}
                </div>
              )}

              {/* Master Admin PIN Config */}
              <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                    Admin Master PIN
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">••••</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="New 4-digit Master PIN"
                    id="adminMasterPinField"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('adminMasterPinField');
                      const val = (el?.value || '').replace(/\D/g, '').slice(0, 4);
                      if (val.length === 4) {
                        emitBeep(760);
                        setAdminMasterPin(val);
                        if (db && cloudAuthUser) {
                          setDoc(
                            doc(db, 'artifacts', appId, 'public', 'data', 'suite_config', 'global'),
                            { adminMasterPin: val, updatedAt: Date.now() },
                            { merge: true }
                          ).catch(() => {});
                        }
                        if (el) el.value = '';
                        setAdminStatusMsg('Master PIN synced to cloud');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-[10px] uppercase cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Add New Solver Profile */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Add Solver Profile
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  <input
                    type="text"
                    value={adminNewUserName}
                    onChange={(e) => setAdminNewUserName(e.target.value)}
                    placeholder="Name"
                    className="col-span-3 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={adminNewUserPin}
                    onChange={(e) => setAdminNewUserPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="PIN (req)"
                    className="col-span-2 bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white placeholder-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cleanName = adminNewUserName.trim();
                    const cleanPin = adminNewUserPin.replace(/\D/g, '').slice(0, 4);
                    if (!cleanName) {
                      setAdminStatusMsg('Enter a solver name');
                      return;
                    }
                    if (users[cleanName]) {
                      setAdminStatusMsg(`"${cleanName}" already exists`);
                      return;
                    }
                    if (cleanPin.length !== 4) {
                      setAdminStatusMsg('Enter a 4-digit PIN so user can sign in');
                      return;
                    }
                    emitBeep(780);
                    const newProfile = sanitizeUserRecord({
                      ...DEFAULT_USERS.Me,
                      isAdmin: false,
                      pin: cleanPin
                    });
                    setUsers((prev) => ({
                      ...prev,
                      [cleanName]: newProfile
                    }));
                    saveUserToCloud(cleanName, newProfile);
                    setAdminNewUserName('');
                    setAdminNewUserPin('');
                    setAdminStatusMsg(`Created "${cleanName}" (PIN: ${cleanPin})`);
                  }}
                  className="w-full py-2 rounded-xl bg-orange-500 text-slate-950 font-black text-[11px] uppercase cursor-pointer"
                >
                  + Create &amp; Sync Profile
                </button>
              </div>

              {/* Manage All Users & PIN Codes */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                  Solver Accounts &amp; PIN Codes ({Object.keys(users).length})
                </span>
                {Object.keys(users).map((uKey) => {
                  const safeKey = String(uKey);
                  const uData = sanitizeUserRecord(users[uKey]);
                  return (
                    <div key={safeKey} className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-white">{safeKey}</span>
                          <span className="text-[10px] text-slate-400 block">
                            F2L D{Number(uData.f2lDay) || 1} • OLL D{Number(uData.day) || 1} • PLL D{Number(uData.pllDay) || 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-black ${
                            uData.pin ? 'bg-orange-500/20 text-orange-300 border border-orange-500/35' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {uData.pin ? `PIN: ${String(uData.pin)}` : 'No PIN'}
                          </span>
                          {safeKey !== 'Me' && safeKey !== activeUserKey && (
                            <button
                              type="button"
                              onClick={() => {
                                emitBeep(380);
                                setUsers((prev) => {
                                  const copy = { ...prev };
                                  delete copy[safeKey];
                                  return copy;
                                });
                                if (db && cloudAuthUser) {
                                  setDoc(
                                    doc(db, 'artifacts', appId, 'public', 'data', 'solver_profiles', safeKey),
                                    { _deleted: true, updatedAt: Date.now() },
                                    { merge: true }
                                  ).catch(() => {});
                                }
                                setAdminStatusMsg(`Removed "${safeKey}"`);
                              }}
                              className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 text-[10px] font-black cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Quick PIN Assign / Reset Row */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          id={`admin-pin-${safeKey}`}
                          placeholder="Set 4-digit PIN"
                          className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white placeholder-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById(`admin-pin-${safeKey}`);
                            const digits = (inputEl?.value || '').replace(/\D/g, '').slice(0, 4);
                            if (digits.length === 4) {
                              emitBeep(720);
                              const updated = { ...uData, pin: digits };
                              setUsers((prev) => ({
                                ...prev,
                                [safeKey]: updated
                              }));
                              saveUserToCloud(safeKey, updated);
                              if (inputEl) inputEl.value = '';
                              setAdminStatusMsg(`PIN synced for ${safeKey}`);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-black text-amber-300 cursor-pointer"
                        >
                          Set PIN
                        </button>
                        {uData.pin && (
                          <button
                            type="button"
                            onClick={() => {
                              emitBeep(440);
                              const updated = { ...uData, pin: '' };
                              setUsers((prev) => ({
                                ...prev,
                                [safeKey]: updated
                              }));
                              saveUserToCloud(safeKey, updated);
                              setAdminStatusMsg(`Cleared PIN for ${safeKey}`);
                            }}
                            className="px-2 py-1 rounded-lg bg-red-500/15 text-[10px] font-black text-red-300 cursor-pointer"
                          >
                            Clear
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
      </div>
    </div>
  );

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
          filter: contrast(0.92) saturate(0.86) brightness(0.96) drop-shadow(0 12px 18px rgba(0, 0, 0, 0.52));
          transition: transform 0.25s ease, filter 0.25s ease;
        }
      `}</style>

      <div className="min-h-[100dvh] w-full bg-[#060913] text-slate-100 flex justify-center select-none relative overflow-hidden">
        {/* Ambient Background Glows */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[40vh] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
        <div className="fixed bottom-0 right-0 w-3/4 h-[35vh] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none z-0" />

        {/* Mobile App Viewport Shell */}
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10 shadow-2xl bg-[#090e1c] border-x border-white/5 overflow-hidden">
          {/* PERSISTENT HEADER */}
          <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5 bg-[#090e1c]/90 backdrop-blur-xl flex-shrink-0 z-40">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Sune Emblem */}
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-[0_4px_10px_rgba(234,88,12,0.35)]" fill="none">
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
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-black tracking-tight text-white leading-none truncate">
                  OLLDay <span className="text-orange-500">Everyday</span>
                </h1>
                <p className="text-[10px] text-orange-400 font-bold mt-1 truncate">
                  {activePhase === 'cross' && 'Phase 1 • Cross'}
                  {activePhase === 'f2l' && `Phase 2 • F2L (Day ${safeF2lDay}/${f2lSchedule.length})`}
                  {activePhase === 'oll' && `Phase 3 • OLL (Day ${safeOllDay}/${ollSchedule.length})`}
                  {activePhase === 'pll' && `Phase 4 • PLL (Day ${safePllDay}/${pllSchedule.length})`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => {
                  emitBeep(520);
                  if (activeUserKey === 'Me') {
                    setActiveModal('profile');
                  } else {
                    setPinEntryInput('');
                    setPinErrorMsg('');
                    setPendingUserSwitch(null);
                    setIsAdminSession(false);
                    setStartupPinLocked(true);
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
                title={activeUserKey === 'Me' ? 'Switch Solver (Me Only)' : 'Lock & Return to PIN Screen'}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="max-w-[64px] truncate">{String(activeUserKey)}</span>
                {activeUserKey !== 'Me' && (
                  <span className="text-[9px] uppercase tracking-wider text-orange-400 font-black ml-0.5">Lock</span>
                )}
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

                    {/* Tier Selector */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {CROSS_TIERS.map((t) => (
                        <button
                          key={t.tier}
                          onClick={() => {
                            emitBeep(540);
                            setCrossTier(t.tier);
                            setCrossUserMoves(t.moves);
                            setEfficiencyFeedback(null);
                          }}
                          className={`py-2 text-[11px] font-black rounded-xl cursor-pointer transition-all ${
                            crossTier === t.tier
                              ? 'bg-orange-500 text-slate-950 shadow-md'
                              : 'bg-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          L{t.tier}
                        </button>
                      ))}
                    </div>

                    {/* Mode Toggle */}
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

                    {/* Scramble Card */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                            Level {activeTierObj.tier} • Cross in {activeTierObj.moves}
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
                        <div className="font-mono text-xl font-black text-amber-300 tracking-wider select-all">
                          {activeCrossScramble}
                        </div>
                      </div>

                      {/* 180° Bottom Verification Diagram (Interactive SVG) */}
                      {(() => {
                        const cube = simulateCrossCubeState(activeCrossScramble);
                        // Bottom D-face (tilted 180° so White D is facing viewer, Green F is Top/Front, Orange R is Right, Red L is Left, Blue B is Bottom)
                        // D indices: 27(DF-L), 28(DF), 29(DF-R), 30(DL), 31(D center), 32(DR), 33(DB-L), 34(DB), 35(DB-R)
                        const dGrid = [
                          [cube[27], cube[28], cube[29]],
                          [cube[30], cube[31], cube[32]],
                          [cube[33], cube[34], cube[35]]
                        ];
                        const uGrid = [
                          [cube[0], cube[1], cube[2]],
                          [cube[3], cube[4], cube[5]],
                          [cube[6], cube[7], cube[8]]
                        ];
                        const grid = crossBottomView ? dGrid : uGrid;
                        // Surrounding side-layer edge/corner strips for Bottom View vs Top View
                        const topStrip = crossBottomView ? [cube[24], cube[25], cube[26]] : [cube[47], cube[46], cube[45]];
                        const bottomStrip = crossBottomView ? [cube[51], cube[52], cube[53]] : [cube[18], cube[19], cube[20]];
                        const leftStrip = crossBottomView ? [cube[42], cube[43], cube[44]] : [cube[36], cube[37], cube[38]];
                        const rightStrip = crossBottomView ? [cube[17], cube[16], cube[15]] : [cube[11], cube[10], cube[9]];

                        return (
                          <div className="bg-slate-950/85 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner space-y-2">
                            <div className="w-full flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-slate-400">
                                {crossBottomView ? '180° Bottom Verification Diagram (D-Face)' : 'Top Overview Diagram (U-Face)'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  emitBeep(540);
                                  setCrossBottomView((v) => !v);
                                }}
                                className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[10px] font-black text-orange-400 cursor-pointer active:scale-95 transition-all"
                              >
                                {crossBottomView ? 'Show Top ↻' : 'Flip 180° ↻'}
                              </button>
                            </div>

                            <svg viewBox="0 0 180 180" className="w-36 h-36 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]">
                              {/* Top Edge Strip (Green F in Bottom View / Blue B in Top View) */}
                              {topStrip.map((c, idx) => (
                                <rect
                                  key={`t-${idx}`}
                                  x={45 + idx * 31}
                                  y={16}
                                  width={27}
                                  height={11}
                                  rx={3}
                                  fill={STICKER_HEX[c] || '#334155'}
                                  stroke="#090e1c"
                                  strokeWidth="1.5"
                                />
                              ))}
                              {/* Bottom Edge Strip (Blue B in Bottom View / Green F in Top View) */}
                              {bottomStrip.map((c, idx) => (
                                <rect
                                  key={`b-${idx}`}
                                  x={45 + idx * 31}
                                  y={153}
                                  width={27}
                                  height={11}
                                  rx={3}
                                  fill={STICKER_HEX[c] || '#334155'}
                                  stroke="#090e1c"
                                  strokeWidth="1.5"
                                />
                              ))}
                              {/* Left Edge Strip (Red L) */}
                              {leftStrip.map((c, idx) => (
                                <rect
                                  key={`l-${idx}`}
                                  x={16}
                                  y={45 + idx * 31}
                                  width={11}
                                  height={27}
                                  rx={3}
                                  fill={STICKER_HEX[c] || '#334155'}
                                  stroke="#090e1c"
                                  strokeWidth="1.5"
                                />
                              ))}
                              {/* Right Edge Strip (Orange R) */}
                              {rightStrip.map((c, idx) => (
                                <rect
                                  key={`r-${idx}`}
                                  x={153}
                                  y={45 + idx * 31}
                                  width={11}
                                  height={27}
                                  rx={3}
                                  fill={STICKER_HEX[c] || '#334155'}
                                  stroke="#090e1c"
                                  strokeWidth="1.5"
                                />
                              ))}

                              {/* Center 3x3 Face */}
                              <rect x="38" y="38" width="104" height="104" rx="12" fill="#090a14" stroke="#1e293b" strokeWidth="2" />
                              {grid.map((row, rIdx) =>
                                row.map((c, cIdx) => (
                                  <rect
                                    key={`cell-${rIdx}-${cIdx}`}
                                    x={45 + cIdx * 31}
                                    y={45 + rIdx * 31}
                                    width={27}
                                    height={27}
                                    rx={5}
                                    fill={STICKER_HEX[c] || '#334155'}
                                    stroke="#090a14"
                                    strokeWidth="1.5"
                                  />
                                ))
                              )}
                            </svg>

                            <div className="flex items-center gap-3 text-[9.5px] font-bold text-slate-400">
                              <span className="text-green-400">▲ Green (F)</span>
                              <span className="text-red-400">◀ Red (L)</span>
                              <span className="text-orange-400">Orange (R) ▶</span>
                              <span className="text-blue-400">▼ Blue (B)</span>
                            </div>
                          </div>
                        );
                      })()}

                      <p className="text-xs text-slate-300 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/5">
                        {activeTierObj.hint}
                      </p>
                    </div>

                    {crossLadderMode === 'efficiency' ? (
                      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3">
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
                              setUsers((prev) => ({
                                ...prev,
                                [activeUserKey]: {
                                  ...currentUser,
                                  crossClears: (currentUser.crossClears || 0) + 1
                                }
                              }));
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
                      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-xl text-center space-y-3">
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
                            title="How Blind Practice Works"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-orange-500/20 flex items-center justify-center text-[9px] font-black">?</span>
                            <span>How It Works</span>
                          </button>
                        </div>
                        <h4 className="text-base font-black text-white">Blind Practice Ready</h4>
                        <p className="text-xs text-slate-400">
                          Plan all {activeTierObj.moves} cross moves during inspection, then execute with eyes closed.
                        </p>
                        <button
                          onClick={() => {
                            emitBeep(620);
                            setCrossTab('blind');
                          }}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                        >
                          Open Blindfold Timer Mat
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {crossTab === 'blind' && (
                  <div className="p-5 pb-10 space-y-4">
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
                        title="How Blind Inspection Works"
                      >
                        <span className="w-4 h-4 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-black">?</span>
                        <span>How It Works</span>
                      </button>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-xl text-center">
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

                    {/* Dual Speedstack Touch Pads */}
                    <div
                      onMouseDown={handleBlindPadDown}
                      onMouseUp={handleBlindPadUp}
                      onTouchStart={handleBlindPadDown}
                      onTouchEnd={handleBlindPadUp}
                      className={`bg-slate-950/80 border border-white/10 rounded-[2rem] p-5 shadow-inner transition-opacity ${
                        blindState === 'idle' ? 'opacity-40 pointer-events-none' : 'opacity-100 cursor-pointer'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-3">
                        Speedstack Touch Pads (Hold &amp; Release)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-black text-[10px] tracking-widest transition-all ${
                            blindState === 'armed'
                              ? 'bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.25)] scale-[1.02]'
                              : blindState === 'readying'
                              ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          <svg className="w-8 h-8 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                            <path d="M2 12a10 10 0 0 1 18-6" />
                            <path d="M2 16h.01" />
                            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                          </svg>
                          <span>LEFT THUMB</span>
                        </div>
                        <div
                          className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-black text-[10px] tracking-widest transition-all ${
                            blindState === 'armed'
                              ? 'bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.25)] scale-[1.02]'
                              : blindState === 'readying'
                              ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          <svg className="w-8 h-8 opacity-90 -scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                            <path d="M2 12a10 10 0 0 1 18-6" />
                            <path d="M2 16h.01" />
                            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                            <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                            <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
                          </svg>
                          <span>RIGHT THUMB</span>
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

                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-xl space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                        {activeMechanicObj.badge}
                      </span>
                      <h3 className="text-lg font-black text-white">{activeMechanicObj.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{activeMechanicObj.summary}</p>
                      <div className="bg-[#050811] border border-white/10 rounded-2xl p-3.5 font-mono text-xs font-bold text-amber-300 text-center">
                        {activeMechanicObj.example}
                      </div>
                    </div>
                  </div>
                )}

                {crossTab === 'settings' && renderSettingsDeck()}
              </>
            )}

            {/* ===================================================== */}
            {/* PHASE 2: F2L (FIRST TWO LAYERS — 41 CASES) */}
            {/* ===================================================== */}
            {activePhase === 'f2l' && (
              <>
                {f2lTab === 'grind' && (
                  <div className="p-5 pb-10 space-y-4">
                    {/* Hero Day Banner */}
                    <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/30 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                          Day {safeF2lDay} • {currentF2lDayObj.mode} Mode
                        </span>
                        <span className="text-xs font-black text-slate-300 font-mono">
                          {f2lMasteredCount}/41 Mastered
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white leading-tight">{currentF2lDayObj.chunkTitle}</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Hold White on Bottom • Green in Front • Target Slot: Front-Right (White–Green–Orange)
                        </p>
                      </div>

                      {/* Beginner vs. Realistic Setup Scramble Toggle + Starting-State Help Text */}
                      <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Setup Scramble Style
                          </span>
                          <div className="bg-slate-900 p-0.5 rounded-xl border border-white/10 flex">
                            <button
                              onClick={() => {
                                emitBeep(520);
                                setF2lSetupMode('beginner');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all ${
                                f2lSetupMode === 'beginner'
                                  ? 'bg-orange-500 text-slate-950'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Beginner
                            </button>
                            <button
                              onClick={() => {
                                emitBeep(520);
                                setF2lSetupMode('realistic');
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase cursor-pointer transition-all ${
                                f2lSetupMode === 'realistic'
                                  ? 'bg-orange-500 text-slate-950'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Realistic
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {f2lSetupMode === 'beginner'
                            ? 'Start from a solved cube (White bottom, Green front): sets up only the Front-Right pair while keeping the other 3 slots solved.'
                            : 'Start from a solved cube (White bottom, Green front): keeps the White Cross solved while scrambling back/left slots like a real mid-solve.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            emitBeep(720, 'sine', 0.08);
                            setSwRunning(false);
                            setSwElapsedMs(0);
                            setF2lSession({
                              dayObj: currentF2lDayObj,
                              index: 0,
                              queue: [...f2lLineupOrder]
                            });
                          }}
                          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          Start Day {safeF2lDay} F2L Grind ({f2lLineupOrder.length} Pairs)
                        </button>
                        <button
                          onClick={() => {
                            emitBeep(480);
                            const nextDay = safeF2lDay >= f2lSchedule.length ? 1 : safeF2lDay + 1;
                            const updated = { ...currentUser, f2lDay: nextDay };
                            setUsers((prev) => ({
                              ...prev,
                              [activeUserKey]: updated
                            }));
                            saveUserToCloud(activeUserKey, updated);
                          }}
                          className="px-3.5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                          title="Skip to Next Day"
                        >
                          Next →
                        </button>
                      </div>
                    </div>

                    {/* Hold-to-Reorder Today's F2L Lineup */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Today&apos;s Pair Lineup (Hold &amp; Drag to Reorder)
                        </span>
                        <span className="text-[10px] font-bold text-orange-400">{f2lLineupOrder.length} Cases</span>
                      </div>

                      <div className="space-y-2">
                        {f2lLineupOrder.map((item, idx) => {
                          const stat = currentUser.f2lStats?.[item.id];
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
                                emitBeep(600);
                                setSwRunning(false);
                                setSwElapsedMs(0);
                                setF2lDrillCase(item);
                              }}
                              className={`bg-slate-900/70 backdrop-blur-xl border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                draggedLineupIdx === idx
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                                  : 'border-white/10 hover:bg-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center pointer-events-none">
                                  <img
                                    src={getF2LImageUrl(item.alg)}
                                    alt={item.name}
                                    className="w-full h-full object-contain f2l-cube-satin"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-white">{item.name}</span>
                                  </div>
                                  <p className="font-mono text-xs font-bold text-amber-300 truncate">{item.alg}</p>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.step1}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
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
                )}

                {f2lTab === 'algorithms' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">41 Standard Pairs</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">F2L Library</h2>
                      </div>
                      <button
                        onClick={() => {
                          emitBeep(560);
                          openCurriculumBuilder('f2l');
                        }}
                        className="px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold cursor-pointer"
                      >
                        + Edit Chunks
                      </button>
                    </div>

                    {/* View Toggle: 6 Pair Groups vs Curriculum Chunks */}
                    <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex">
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setF2lLibMode('groups');
                          setF2lSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          f2lLibMode === 'groups' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        6 Pair Groups
                      </button>
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setF2lLibMode('chunks');
                          setF2lSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          f2lLibMode === 'chunks' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Curriculum Chunks
                      </button>
                    </div>

                    {!f2lSelectedCategory ? (
                      f2lLibMode === 'groups' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {F2L_GROUPS.map((group) => {
                            const groupCases = F2L_DATA.filter((c) => c.group === group);
                            const sampleCase = groupCases[0];
                            return (
                              <button
                                key={group}
                                onClick={() => {
                                  emitBeep(520);
                                  setF2lSelectedCategory({ type: 'group', name: group });
                                }}
                                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex flex-col items-center text-center hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer space-y-2.5"
                              >
                                <div className="w-24 h-24 flex items-center justify-center">
                                  <img
                                    src={getF2LImageUrl(sampleCase.alg)}
                                    alt={group}
                                    className="w-full h-full object-contain f2l-cube-satin"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-xs font-black text-white leading-snug">{group}</h3>
                                  <span className="text-[10px] font-bold text-orange-400">{groupCases.length} Pairs</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {f2lChunks.map((chk) => {
                            const sampleCase = F2L_DATA.find((c) => c.id === chk.ids[0]) || F2L_DATA[0];
                            return (
                              <button
                                key={chk.id}
                                onClick={() => {
                                  emitBeep(520);
                                  setF2lSelectedCategory({ type: 'chunk', chunk: chk });
                                }}
                                className="w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] p-3.5 flex items-center gap-3.5 text-left hover:bg-slate-800/80 active:scale-98 transition-all cursor-pointer"
                              >
                                <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                  <img
                                    src={getF2LImageUrl(sampleCase.alg)}
                                    alt={chk.title}
                                    className="w-full h-full object-contain f2l-cube-satin"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-black text-white truncate">{chk.title}</h3>
                                  <p className="text-[11px] text-slate-400 mt-0.5">{chk.ids.length} F2L Pairs</p>
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
                            setF2lSelectedCategory(null);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 hover:text-orange-300 cursor-pointer"
                        >
                          ← Back to All {f2lLibMode === 'groups' ? 'Groups' : 'Chunks'}
                        </button>

                        <h3 className="text-lg font-black text-white">
                          {f2lSelectedCategory.type === 'group'
                            ? f2lSelectedCategory.name
                            : f2lSelectedCategory.chunk.title}
                        </h3>

                        <div className="space-y-2.5">
                          {(f2lSelectedCategory.type === 'group'
                            ? F2L_DATA.filter((c) => c.group === f2lSelectedCategory.name)
                            : f2lSelectedCategory.chunk.ids
                                .map((id) => F2L_DATA.find((c) => c.id === id))
                                .filter(Boolean)
                          ).map((item) => {
                            const stat = currentUser.f2lStats?.[item.id];
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  emitBeep(600);
                                  setSwRunning(false);
                                  setSwElapsedMs(0);
                                  setF2lDrillCase(item);
                                }}
                                className="bg-slate-900/70 border border-white/10 rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                    <img
                                      src={getF2LImageUrl(item.alg)}
                                      alt={item.name}
                                      className="w-full h-full object-contain f2l-cube-satin"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-black text-white">{item.name}</span>
                                      {stat?.best && (
                                        <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-[10px] font-mono font-black text-green-300">
                                          {stat.best.toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-amber-300 mt-0.5">{item.alg}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.step1}</p>
                                  </div>
                                </div>
                                {fingertricksEnabled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      emitBeep(540);
                                      setFtPhaseContext('f2l');
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
                )}

                {f2lTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PRs</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">F2L Statistics</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Mastered</span>
                        <span className="font-mono text-xl font-black text-green-400">{f2lMasteredCount}/41</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Day</span>
                        <span className="font-mono text-xl font-black text-orange-400">{safeF2lDay}</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Goal</span>
                        <span className="font-mono text-xl font-black text-amber-300">{targetGoalSec.toFixed(1)}s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {F2L_DATA.map((item) => {
                        const stat = currentUser.f2lStats?.[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              emitBeep(580);
                              setSwRunning(false);
                              setSwElapsedMs(0);
                              setF2lDrillCase(item);
                            }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                                <img
                                  src={getF2LImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain f2l-cube-satin"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block">{item.name}</span>
                                <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {stat?.best ? (
                                <>
                                  <span
                                    className={`font-mono text-xs font-black block ${
                                      stat.best <= targetGoalSec ? 'text-green-400' : 'text-amber-300'
                                    }`}
                                  >
                                    PR: {stat.best.toFixed(2)}s
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
                )}

                {f2lTab === 'settings' && renderSettingsDeck()}
              </>
            )}

            {/* ===================================================== */}
            {/* PHASE 3: OLL (ORIENT LAST LAYER — 57 CASES) */}
            {/* ===================================================== */}
            {activePhase === 'oll' && (
              <>
                {ollTab === 'grind' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/30 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                          Day {safeOllDay} • {currentOllDayObj.mode} Mode
                        </span>
                        <span className="text-xs font-black text-slate-300 font-mono">
                          {ollMasteredCount}/57 Mastered
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white leading-tight">{currentOllDayObj.chunkTitle}</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Yellow Top Recognition • Execute cleanly under {targetGoalSec.toFixed(1)}s
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            emitBeep(720, 'sine', 0.08);
                            setSwRunning(false);
                            setSwElapsedMs(0);
                            setOllSession({
                              dayObj: currentOllDayObj,
                              index: 0,
                              queue: [...ollLineupOrder]
                            });
                          }}
                          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          Start Day {safeOllDay} OLL Grind ({ollLineupOrder.length} Cases)
                        </button>
                        <button
                          onClick={() => {
                            emitBeep(480);
                            const nextDay = safeOllDay >= ollSchedule.length ? 1 : safeOllDay + 1;
                            const updated = { ...currentUser, day: nextDay };
                            setUsers((prev) => ({
                              ...prev,
                              [activeUserKey]: updated
                            }));
                            saveUserToCloud(activeUserKey, updated);
                          }}
                          className="px-3.5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Today&apos;s OLL Lineup (Hold &amp; Drag to Reorder)
                        </span>
                        <span className="text-[10px] font-bold text-orange-400">{ollLineupOrder.length} Cases</span>
                      </div>

                      <div className="space-y-2">
                        {ollLineupOrder.map((item, idx) => {
                          const stat = currentUser.stats?.[item.id];
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
                                emitBeep(600);
                                setSwRunning(false);
                                setSwElapsedMs(0);
                                setOllDrillCase(item);
                              }}
                              className={`bg-slate-900/70 border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                draggedLineupIdx === idx
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                                  : 'border-white/10 hover:bg-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-slate-200 p-1 flex-shrink-0 flex items-center justify-center pointer-events-none">
                                  <img
                                    src={getOLLImageUrl(item.alg)}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-black text-white block truncate">{item.name}</span>
                                  <p className="font-mono text-xs font-bold text-amber-300 truncate">{item.alg}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
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
                )}

                {ollTab === 'algorithms' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">57 Last-Layer Cases</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">OLL Library</h2>
                      </div>
                      <button
                        onClick={() => {
                          emitBeep(560);
                          openCurriculumBuilder('oll');
                        }}
                        className="px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold cursor-pointer"
                      >
                        + Edit Chunks
                      </button>
                    </div>

                    <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex">
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setOllLibMode('groups');
                          setOllSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          ollLibMode === 'groups' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Shape Groups
                      </button>
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setOllLibMode('chunks');
                          setOllSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          ollLibMode === 'chunks' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Curriculum Chunks
                      </button>
                    </div>

                    {!ollSelectedCategory ? (
                      ollLibMode === 'groups' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {OLL_GROUPS.map((group) => {
                            const groupCases = OLL_DATA.filter((c) => c.group === group);
                            const sampleCase = groupCases[0];
                            return (
                              <button
                                key={group}
                                onClick={() => {
                                  emitBeep(520);
                                  setOllSelectedCategory({ type: 'group', name: group });
                                }}
                                className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-4 shadow-xl flex flex-col items-center text-center hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer space-y-2.5"
                              >
                                <div className="w-16 h-16 rounded-2xl bg-slate-200 p-1.5 flex items-center justify-center">
                                  <img
                                    src={getOLLImageUrl(sampleCase.alg)}
                                    alt={group}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-xs font-black text-white leading-snug">{group}</h3>
                                  <span className="text-[10px] font-bold text-orange-400">{groupCases.length} Cases</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {ollChunks.map((chk) => {
                            const sampleCase = OLL_DATA.find((c) => c.id === chk.ids[0]) || OLL_DATA[0];
                            return (
                              <button
                                key={chk.id}
                                onClick={() => {
                                  emitBeep(520);
                                  setOllSelectedCategory({ type: 'chunk', chunk: chk });
                                }}
                                className="w-full bg-slate-900/60 border border-white/10 rounded-[1.75rem] p-3.5 flex items-center gap-3.5 text-left hover:bg-slate-800/80 cursor-pointer"
                              >
                                <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0 flex items-center justify-center">
                                  <img
                                    src={getOLLImageUrl(sampleCase.alg)}
                                    alt={chk.title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-black text-white truncate">{chk.title}</h3>
                                  <p className="text-[11px] text-slate-400 mt-0.5">{chk.ids.length} OLL Cases</p>
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
                            setOllSelectedCategory(null);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 cursor-pointer"
                        >
                          ← Back to All {ollLibMode === 'groups' ? 'Groups' : 'Chunks'}
                        </button>
                        <h3 className="text-lg font-black text-white">
                          {ollSelectedCategory.type === 'group'
                            ? ollSelectedCategory.name
                            : ollSelectedCategory.chunk.title}
                        </h3>
                        <div className="space-y-2.5">
                          {(ollSelectedCategory.type === 'group'
                            ? OLL_DATA.filter((c) => c.group === ollSelectedCategory.name)
                            : ollSelectedCategory.chunk.ids
                                .map((id) => OLL_DATA.find((c) => c.id === id))
                                .filter(Boolean)
                          ).map((item) => {
                            const stat = currentUser.stats?.[item.id];
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  emitBeep(600);
                                  setSwRunning(false);
                                  setSwElapsedMs(0);
                                  setOllDrillCase(item);
                                }}
                                className="bg-slate-900/70 border border-white/10 rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0">
                                    <img
                                      src={getOLLImageUrl(item.alg)}
                                      alt={item.name}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-black text-white truncate">{item.name}</span>
                                      {stat?.best && (
                                        <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-[10px] font-mono font-black text-green-300">
                                          {stat.best.toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-amber-300 mt-0.5">{item.alg}</p>
                                  </div>
                                </div>
                                {fingertricksEnabled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      emitBeep(540);
                                      setFtPhaseContext('oll');
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
                )}

                {ollTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PRs</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">OLL Statistics</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Mastered</span>
                        <span className="font-mono text-xl font-black text-green-400">{ollMasteredCount}/57</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Day</span>
                        <span className="font-mono text-xl font-black text-orange-400">{safeOllDay}</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Goal</span>
                        <span className="font-mono text-xl font-black text-amber-300">{targetGoalSec.toFixed(1)}s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {OLL_DATA.map((item) => {
                        const stat = currentUser.stats?.[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              emitBeep(580);
                              setSwRunning(false);
                              setSwElapsedMs(0);
                              setOllDrillCase(item);
                            }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-200 p-1 flex-shrink-0">
                                <img
                                  src={getOLLImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block truncate">{item.name}</span>
                                <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {stat?.best ? (
                                <>
                                  <span
                                    className={`font-mono text-xs font-black block ${
                                      stat.best <= targetGoalSec ? 'text-green-400' : 'text-amber-300'
                                    }`}
                                  >
                                    PR: {stat.best.toFixed(2)}s
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
                )}

                {ollTab === 'settings' && renderSettingsDeck()}
              </>
            )}

            {/* ===================================================== */}
            {/* PHASE 4: PLL (PERMUTE LAST LAYER — 25 ALGORITHMS) */}
            {/* ===================================================== */}
            {activePhase === 'pll' && (
              <>
                {pllTab === 'grind' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/30 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                          Day {safePllDay} • {currentPllDayObj.mode} Mode
                        </span>
                        <span className="text-xs font-black text-slate-300 font-mono">
                          {pllMasteredCount}/{PLL_DATA.length} Mastered
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white leading-tight">{currentPllDayObj.chunkTitle}</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          2-Side Headlight &amp; Block Recognition • Execute under {targetGoalSec.toFixed(1)}s
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            emitBeep(720, 'sine', 0.08);
                            setSwRunning(false);
                            setSwElapsedMs(0);
                            setPllSession({
                              dayObj: currentPllDayObj,
                              index: 0,
                              queue: [...pllLineupOrder]
                            });
                          }}
                          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          Start Day {safePllDay} PLL Grind ({pllLineupOrder.length} Cases)
                        </button>
                        <button
                          onClick={() => {
                            emitBeep(480);
                            const nextDay = safePllDay >= pllSchedule.length ? 1 : safePllDay + 1;
                            const updated = { ...currentUser, pllDay: nextDay };
                            setUsers((prev) => ({
                              ...prev,
                              [activeUserKey]: updated
                            }));
                            saveUserToCloud(activeUserKey, updated);
                          }}
                          className="px-3.5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Today&apos;s PLL Lineup (Hold &amp; Drag to Reorder)
                        </span>
                        <span className="text-[10px] font-bold text-orange-400">{pllLineupOrder.length} Cases</span>
                      </div>

                      <div className="space-y-2">
                        {pllLineupOrder.map((item, idx) => {
                          const stat = currentUser.pllStats?.[item.id];
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
                                emitBeep(600);
                                setSwRunning(false);
                                setSwElapsedMs(0);
                                setPllDrillCase(item);
                              }}
                              className={`bg-slate-900/70 border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                draggedLineupIdx === idx
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                                  : 'border-white/10 hover:bg-slate-800/80'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-slate-200 p-1 flex-shrink-0 flex items-center justify-center pointer-events-none">
                                  <img
                                    src={getPLLImageUrl(item.alg)}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-black text-white block truncate">{item.name}</span>
                                  <p className="font-mono text-xs font-bold text-amber-300 truncate">{item.alg}</p>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.recognition}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
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
                )}

                {pllTab === 'algorithms' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">21 Standard + 4 Bonus Algs</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">PLL Library</h2>
                      </div>
                      <button
                        onClick={() => {
                          emitBeep(560);
                          openCurriculumBuilder('pll');
                        }}
                        className="px-3 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold cursor-pointer"
                      >
                        + Edit Chunks
                      </button>
                    </div>

                    <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex">
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setPllLibMode('groups');
                          setPllSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          pllLibMode === 'groups' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        5 Perm Groups
                      </button>
                      <button
                        onClick={() => {
                          emitBeep(480);
                          setPllLibMode('chunks');
                          setPllSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          pllLibMode === 'chunks' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Curriculum Chunks
                      </button>
                    </div>

                    {!pllSelectedCategory ? (
                      pllLibMode === 'groups' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {PLL_GROUPS.map((group) => {
                            const groupCases = PLL_DATA.filter((c) => c.group === group);
                            const sampleCase = groupCases[0];
                            return (
                              <button
                                key={group}
                                onClick={() => {
                                  emitBeep(520);
                                  setPllSelectedCategory({ type: 'group', name: group });
                                }}
                                className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-4 shadow-xl flex flex-col items-center text-center hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer space-y-2.5"
                              >
                                <div className="w-16 h-16 rounded-2xl bg-slate-200 p-1.5 flex items-center justify-center">
                                  <img
                                    src={getPLLImageUrl(sampleCase.alg)}
                                    alt={group}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div>
                                  <h3 className="text-xs font-black text-white leading-snug">{group}</h3>
                                  <span className="text-[10px] font-bold text-orange-400">{groupCases.length} Algs</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {pllChunks.map((chk) => {
                            const sampleCase = PLL_DATA.find((c) => c.id === chk.ids[0]) || PLL_DATA[0];
                            return (
                              <button
                                key={chk.id}
                                onClick={() => {
                                  emitBeep(520);
                                  setPllSelectedCategory({ type: 'chunk', chunk: chk });
                                }}
                                className="w-full bg-slate-900/60 border border-white/10 rounded-[1.75rem] p-3.5 flex items-center gap-3.5 text-left hover:bg-slate-800/80 cursor-pointer"
                              >
                                <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0 flex items-center justify-center">
                                  <img
                                    src={getPLLImageUrl(sampleCase.alg)}
                                    alt={chk.title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-black text-white truncate">{chk.title}</h3>
                                  <p className="text-[11px] text-slate-400 mt-0.5">{chk.ids.length} PLL Cases</p>
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
                            setPllSelectedCategory(null);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 cursor-pointer"
                        >
                          ← Back to All {pllLibMode === 'groups' ? 'Groups' : 'Chunks'}
                        </button>
                        <h3 className="text-lg font-black text-white">
                          {pllSelectedCategory.type === 'group'
                            ? pllSelectedCategory.name
                            : pllSelectedCategory.chunk.title}
                        </h3>
                        <div className="space-y-2.5">
                          {(pllSelectedCategory.type === 'group'
                            ? PLL_DATA.filter((c) => c.group === pllSelectedCategory.name)
                            : pllSelectedCategory.chunk.ids
                                .map((id) => PLL_DATA.find((c) => c.id === id))
                                .filter(Boolean)
                          ).map((item) => {
                            const stat = currentUser.pllStats?.[item.id];
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  emitBeep(600);
                                  setSwRunning(false);
                                  setSwElapsedMs(0);
                                  setPllDrillCase(item);
                                }}
                                className="bg-slate-900/70 border border-white/10 rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0">
                                    <img
                                      src={getPLLImageUrl(item.alg)}
                                      alt={item.name}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-black text-white truncate">{item.name}</span>
                                      {stat?.best && (
                                        <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-[10px] font-mono font-black text-green-300">
                                          {stat.best.toFixed(2)}s
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-amber-300 mt-0.5">{item.alg}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.recognition}</p>
                                  </div>
                                </div>
                                {fingertricksEnabled && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      emitBeep(540);
                                      setFtPhaseContext('pll');
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
                )}

                {pllTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PRs</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">PLL Statistics</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Mastered</span>
                        <span className="font-mono text-xl font-black text-green-400">{pllMasteredCount}/{PLL_DATA.length}</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Day</span>
                        <span className="font-mono text-xl font-black text-orange-400">{safePllDay}</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Goal</span>
                        <span className="font-mono text-xl font-black text-amber-300">{targetGoalSec.toFixed(1)}s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {PLL_DATA.map((item) => {
                        const stat = currentUser.pllStats?.[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              emitBeep(580);
                              setSwRunning(false);
                              setSwElapsedMs(0);
                              setPllDrillCase(item);
                            }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-200 p-1 flex-shrink-0">
                                <img
                                  src={getPLLImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block truncate">{item.name}</span>
                                <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {stat?.best ? (
                                <>
                                  <span
                                    className={`font-mono text-xs font-black block ${
                                      stat.best <= targetGoalSec ? 'text-green-400' : 'text-amber-300'
                                    }`}
                                  >
                                    PR: {stat.best.toFixed(2)}s
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
                )}

                {pllTab === 'settings' && renderSettingsDeck()}
              </>
            )}
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

        {/* 1. BLINDFOLD VISOR OVERLAY */}
        {blindState === 'visor' && (
          <div
            onClick={() => {
              emitBeep(900);
              setBlindState('done');
            }}
            className="fixed inset-0 z-[300] bg-[#03050c]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center cursor-pointer"
          >
            <div className="space-y-4">
              <div className="w-24 h-24 rounded-full bg-orange-500/15 border-2 border-orange-500/40 flex items-center justify-center text-orange-400 shadow-2xl shadow-orange-500/20 mx-auto text-3xl font-black">
                ●
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">EYES CLOSED</h2>
              <p className="text-sm font-bold text-orange-400">EXECUTE YOUR CROSS!</p>
            </div>
            <div className="absolute bottom-10 w-full max-w-xs mx-auto">
              <div className="w-full py-4 rounded-2xl bg-white/10 border border-white/15 text-white font-black text-sm">
                Tap Anywhere When Finished
              </div>
            </div>
          </div>
        )}

        {/* 2. F2L DAILY SESSION RUNNER */}
        {f2lSession && activeF2LSessionCase && (
          <div className="fixed inset-0 z-[240] bg-[#060913]/98 backdrop-blur-2xl flex flex-col justify-between p-5 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                {f2lSession.dayObj.mode} • Pair {f2lSession.index + 1}/{f2lSession.queue.length}
              </span>
              <button
                onClick={() => {
                  setSwRunning(false);
                  setF2lSession(null);
                }}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center space-y-3 shadow-2xl my-auto">
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Angle: <strong className="text-orange-400">{F2L_VIEW_ANGLES[f2lViewIdx].label}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  {f2lViewIdx !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(480);
                        setF2lViewIdx(0);
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
                      setF2lViewIdx((prev) => (prev + 1) % F2L_VIEW_ANGLES.length);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-[10px] font-black text-orange-400 active:scale-95 transition-all cursor-pointer"
                  >
                    Rotate Cube ↻
                  </button>
                </div>
              </div>

              <div
                onClick={() => {
                  emitBeep(620);
                  setF2lViewIdx((prev) => (prev + 1) % F2L_VIEW_ANGLES.length);
                }}
                title="Tap cube to rotate camera angle"
                className="w-36 h-36 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <img
                  src={getF2LImageUrl(
                    activeF2LSessionCase.alg,
                    F2L_VIEW_ANGLES[f2lViewIdx].rot,
                    f2lSetupMode === 'realistic'
                      ? generateF2LSetupScramble(activeF2LSessionCase.alg, 'realistic', f2lSetupSeed)
                      : null
                  )}
                  alt={activeF2LSessionCase.name}
                  className="w-full h-full object-contain f2l-cube-satin"
                />
              </div>

              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {activeF2LSessionCase.group}
                </span>
                <h3 className="text-2xl font-black text-white">{activeF2LSessionCase.name}</h3>
              </div>

              {/* Setup Scramble Box */}
              <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-3 text-center space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Setup Scramble ({f2lSetupMode})
                  </span>
                  <button
                    onClick={() => {
                      emitBeep(540);
                      setF2lSetupSeed((s) => s + 1);
                    }}
                    className="text-[10px] font-bold text-orange-400 hover:underline cursor-pointer"
                  >
                    New Scramble ↻
                  </button>
                </div>
                <p className="font-mono text-sm font-black text-amber-300 select-all">
                  {generateF2LSetupScramble(activeF2LSessionCase.alg, f2lSetupMode, f2lSetupSeed)}
                </p>
                <p className="text-[9px] text-slate-500">Start from solved cube (White bottom • Green front)</p>
              </div>

              {/* Solution & Intuitive Steps */}
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                  Solution (Target: Front-Right Slot)
                </span>
                <p className="font-mono text-base font-black text-white">{activeF2LSessionCase.alg}</p>
                {getAlgorithmTriggerTags(activeF2LSessionCase.alg).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    {getAlgorithmTriggerTags(activeF2LSessionCase.alg).map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotClass}`} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                {f2lSession.dayObj.mode === 'Learn' && (
                  <div className="text-[11px] text-slate-300 pt-1 border-t border-white/10 space-y-0.5 text-left">
                    <p>• <strong className="text-orange-300">Step 1:</strong> {activeF2LSessionCase.step1}</p>
                    <p>• <strong className="text-orange-300">Step 2:</strong> {activeF2LSessionCase.step2}</p>
                  </div>
                )}
              </div>

              {/* Stopwatch */}
              {stopwatchEnabled && (
                <button
                  onClick={() =>
                    toggleStopwatch((sec) => recordCaseTime('f2l', activeF2LSessionCase.id, sec))
                  }
                  className={`w-full py-3 rounded-2xl border font-mono text-lg font-black transition-all cursor-pointer ${
                    swRunning
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : 'bg-slate-950 border-white/10 text-slate-200 hover:border-orange-500/40'
                  }`}
                >
                  {swRunning
                    ? `${(swElapsedMs / 1000).toFixed(2)}s — Tap to Stop`
                    : swElapsedMs > 0
                    ? `Last: ${(swElapsedMs / 1000).toFixed(2)}s — Tap to Retry`
                    : 'Tap to Time Execution'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  emitBeep(460);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  setF2lSession((s) => ({ ...s, index: Math.max(0, s.index - 1) }));
                }}
                disabled={f2lSession.index === 0}
                className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  emitBeep(760);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  if (f2lSession.index + 1 < f2lSession.queue.length) {
                    setF2lSession((s) => ({ ...s, index: s.index + 1 }));
                  } else {
                    const nextDay = safeF2lDay >= f2lSchedule.length ? 1 : safeF2lDay + 1;
                    const updated = { ...currentUser, f2lDay: nextDay };
                    setUsers((prev) => ({
                      ...prev,
                      [activeUserKey]: updated
                    }));
                    saveUserToCloud(activeUserKey, updated);
                    setF2lSession(null);
                  }
                }}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                {f2lSession.index + 1 < f2lSession.queue.length ? 'Next Pair →' : 'Complete Day ✓'}
              </button>
            </div>
          </div>
        )}

        {/* 3. ISOLATED F2L DRILL MODAL */}
        {f2lDrillCase && (
          <div className="fixed inset-0 z-[245] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {f2lDrillCase.group}
                </span>
                <button
                  onClick={() => {
                    setSwRunning(false);
                    setF2lDrillCase(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                <span className="text-[10px] font-bold text-slate-300">
                  {F2L_VIEW_ANGLES[f2lViewIdx].label}
                </span>
                <div className="flex items-center gap-1.5">
                  {f2lViewIdx !== 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(480);
                        setF2lViewIdx(0);
                      }}
                      className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(620);
                      setF2lViewIdx((prev) => (prev + 1) % F2L_VIEW_ANGLES.length);
                    }}
                    className="px-2.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-[10px] font-black text-orange-400 cursor-pointer"
                  >
                    Rotate Cube ↻
                  </button>
                </div>
              </div>

              <div
                onClick={() => {
                  emitBeep(620);
                  setF2lViewIdx((prev) => (prev + 1) % F2L_VIEW_ANGLES.length);
                }}
                title="Tap cube to rotate camera angle"
                className="w-36 h-36 mx-auto flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <img
                  src={getF2LImageUrl(
                    f2lDrillCase.alg,
                    F2L_VIEW_ANGLES[f2lViewIdx].rot,
                    f2lSetupMode === 'realistic'
                      ? generateF2LSetupScramble(f2lDrillCase.alg, 'realistic', f2lSetupSeed)
                      : null
                  )}
                  alt={f2lDrillCase.name}
                  className="w-full h-full object-contain f2l-cube-satin"
                />
              </div>

              <h3 className="text-xl font-black text-white text-center">{f2lDrillCase.name}</h3>

              <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 text-center space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    Setup Scramble ({f2lSetupMode})
                  </span>
                  <button
                    onClick={() => {
                      emitBeep(540);
                      setF2lSetupSeed((s) => s + 1);
                    }}
                    className="text-[10px] font-bold text-orange-400 cursor-pointer"
                  >
                    New Scramble ↻
                  </button>
                </div>
                <p className="font-mono text-xs font-black text-amber-300 select-all">
                  {generateF2LSetupScramble(f2lDrillCase.alg, f2lSetupMode, f2lSetupSeed)}
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1">
                <span className="text-[9px] font-black uppercase text-slate-400 block">
                  Solution (Front-Right Slot)
                </span>
                <p className="font-mono text-base font-black text-white">{f2lDrillCase.alg}</p>
                {getAlgorithmTriggerTags(f2lDrillCase.alg).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                    {getAlgorithmTriggerTags(f2lDrillCase.alg).map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotClass}`} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-300 text-left pt-1">
                  • <strong>Step 1:</strong> {f2lDrillCase.step1}
                  <br />• <strong>Step 2:</strong> {f2lDrillCase.step2}
                </p>
              </div>

              {stopwatchEnabled && (
                <button
                  onClick={() => toggleStopwatch((sec) => recordCaseTime('f2l', f2lDrillCase.id, sec))}
                  className={`w-full py-3 rounded-2xl border font-mono text-base font-black cursor-pointer ${
                    swRunning
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : 'bg-slate-950 border-white/10 text-slate-200'
                  }`}
                >
                  {swRunning ? `${(swElapsedMs / 1000).toFixed(2)}s — Stop` : 'Tap to Time Case'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. OLL DAILY SESSION RUNNER */}
        {ollSession && activeOLLSessionCase && (
          <div className="fixed inset-0 z-[240] bg-[#060913]/98 backdrop-blur-2xl flex flex-col justify-between p-5 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                {ollSession.dayObj.mode} • Case {ollSession.index + 1}/{ollSession.queue.length}
              </span>
              <button
                onClick={() => {
                  setSwRunning(false);
                  setOllSession(null);
                }}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center space-y-3.5 shadow-2xl my-auto">
              <div className="w-32 h-32 rounded-3xl bg-slate-200 p-2.5 flex items-center justify-center">
                <img
                  src={getOLLImageUrl(activeOLLSessionCase.alg)}
                  alt={activeOLLSessionCase.name}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {activeOLLSessionCase.group}
                </span>
                <h3 className="text-2xl font-black text-white">{activeOLLSessionCase.name}</h3>
              </div>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Execution Algorithm
                  </span>
                  {fingertricksEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(540);
                        setFtPhaseContext('oll');
                        setFtCase(activeOLLSessionCase);
                        setActiveModal('fingertrick');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[10px] font-black text-orange-300 hover:bg-orange-500/25 cursor-pointer"
                    >
                      Grip Guide →
                    </button>
                  )}
                </div>
                <p className="font-mono text-base font-black text-amber-300">{activeOLLSessionCase.alg}</p>
                {getAlgorithmTriggerTags(activeOLLSessionCase.alg).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {getAlgorithmTriggerTags(activeOLLSessionCase.alg).map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotClass}`} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                {fingertricksEnabled && (
                  <p className="text-[11px] text-slate-400">{activeOLLSessionCase.fingertrick}</p>
                )}
              </div>

              {stopwatchEnabled && (
                <button
                  onClick={() =>
                    toggleStopwatch((sec) => recordCaseTime('oll', activeOLLSessionCase.id, sec))
                  }
                  className={`w-full py-3.5 rounded-2xl border font-mono text-lg font-black cursor-pointer ${
                    swRunning
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : 'bg-slate-950 border-white/10 text-slate-200'
                  }`}
                >
                  {swRunning ? `${(swElapsedMs / 1000).toFixed(2)}s — Stop` : 'Tap to Time OLL'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  emitBeep(460);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  setOllSession((s) => ({ ...s, index: Math.max(0, s.index - 1) }));
                }}
                disabled={ollSession.index === 0}
                className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  emitBeep(760);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  if (ollSession.index + 1 < ollSession.queue.length) {
                    setOllSession((s) => ({ ...s, index: s.index + 1 }));
                  } else {
                    const nextDay = safeOllDay >= ollSchedule.length ? 1 : safeOllDay + 1;
                    const updated = { ...currentUser, day: nextDay };
                    setUsers((prev) => ({
                      ...prev,
                      [activeUserKey]: updated
                    }));
                    saveUserToCloud(activeUserKey, updated);
                    setOllSession(null);
                  }
                }}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                {ollSession.index + 1 < ollSession.queue.length ? 'Next Case →' : 'Complete Day ✓'}
              </button>
            </div>
          </div>
        )}

        {/* 5. ISOLATED OLL DRILL MODAL */}
        {ollDrillCase && (
          <div className="fixed inset-0 z-[245] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {ollDrillCase.group}
                </span>
                <button
                  onClick={() => {
                    setSwRunning(false);
                    setOllDrillCase(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="w-28 h-28 rounded-3xl bg-slate-200 p-2 mx-auto">
                <img
                  src={getOLLImageUrl(ollDrillCase.alg)}
                  alt={ollDrillCase.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-xl font-black text-white text-center">{ollDrillCase.name}</h3>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Execution Algorithm
                  </span>
                  {fingertricksEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(540);
                        setFtPhaseContext('oll');
                        setFtCase(ollDrillCase);
                        setActiveModal('fingertrick');
                      }}
                      className="px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[10px] font-black text-orange-300 hover:bg-orange-500/25 cursor-pointer"
                    >
                      Grip Guide →
                    </button>
                  )}
                </div>
                <p className="font-mono text-base font-black text-amber-300">{ollDrillCase.alg}</p>
                {getAlgorithmTriggerTags(ollDrillCase.alg).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {getAlgorithmTriggerTags(ollDrillCase.alg).map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotClass}`} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">{ollDrillCase.fingertrick}</p>
              </div>
              {stopwatchEnabled && (
                <button
                  onClick={() => toggleStopwatch((sec) => recordCaseTime('oll', ollDrillCase.id, sec))}
                  className={`w-full py-3 rounded-2xl border font-mono text-base font-black cursor-pointer ${
                    swRunning
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : 'bg-slate-950 border-white/10 text-slate-200'
                  }`}
                >
                  {swRunning ? `${(swElapsedMs / 1000).toFixed(2)}s — Stop` : 'Tap to Time OLL'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5B. PLL DAILY SESSION RUNNER */}
        {pllSession && activePLLSessionCase && (
          <div className="fixed inset-0 z-[240] bg-[#060913]/98 backdrop-blur-2xl flex flex-col justify-between p-5 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                {pllSession.dayObj.mode} • Case {pllSession.index + 1}/{pllSession.queue.length}
              </span>
              <button
                onClick={() => {
                  setSwRunning(false);
                  setPllSession(null);
                }}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center space-y-3.5 shadow-2xl my-auto">
              <div className="w-32 h-32 rounded-3xl bg-slate-200 p-2.5 flex items-center justify-center">
                <img
                  src={getPLLImageUrl(
                    activePLLSessionCase.alg,
                    pllSetupSeed > 0 ? generatePLLSetupScramble(activePLLSessionCase.inverse, pllSetupSeed) : null
                  )}
                  alt={activePLLSessionCase.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {activePLLSessionCase.group}
                </span>
                <h3 className="text-2xl font-black text-white">{activePLLSessionCase.name}</h3>
                <p className="text-[11px] text-slate-300 mt-1">{activePLLSessionCase.recognition}</p>
              </div>

              <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-3 text-center space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {pllSetupSeed === 0 ? 'Standard Setup' : 'AUF Varied Setup'}
                  </span>
                  <div className="flex items-center gap-2">
                    {pllSetupSeed > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          emitBeep(460);
                          setPllSetupSeed(0);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(540);
                        setPllSetupSeed((s) => s + 1);
                      }}
                      className="text-[10px] font-bold text-orange-400 hover:underline cursor-pointer"
                    >
                      New Scramble ↻
                    </button>
                  </div>
                </div>
                <p className="font-mono text-xs font-black text-slate-300 select-all">
                  {generatePLLSetupScramble(activePLLSessionCase.inverse, pllSetupSeed)}
                </p>
              </div>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Execution Algorithm
                </span>
                <p className="font-mono text-base font-black text-amber-300">{activePLLSessionCase.alg}</p>
                {getAlgorithmTriggerTags(activePLLSessionCase.alg).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    {getAlgorithmTriggerTags(activePLLSessionCase.alg).map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotClass}`} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                {fingertricksEnabled && (
                  <p className="text-[11px] text-slate-400 mt-1.5">{activePLLSessionCase.fingertrick}</p>
                )}
              </div>

              {stopwatchEnabled && (
                <button
                  onClick={() =>
                    toggleStopwatch((sec) => recordCaseTime('pll', activePLLSessionCase.id, sec))
                  }
                  className={`w-full py-3.5 rounded-2xl border font-mono text-lg font-black cursor-pointer ${
                    swRunning
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : 'bg-slate-950 border-white/10 text-slate-200'
                  }`}
                >
                  {swRunning ? `${(swElapsedMs / 1000).toFixed(2)}s — Stop` : 'Tap to Time PLL'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  emitBeep(460);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  setPllSession((s) => ({ ...s, index: Math.max(0, s.index - 1) }));
                }}
                disabled={pllSession.index === 0}
                className="py-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
              >
                ← Previous
              </button>
              <button
                onClick={() => {
                  emitBeep(760);
                  setSwRunning(false);
                  setSwElapsedMs(0);
                  if (pllSession.index + 1 < pllSession.queue.length) {
                    setPllSession((s) => ({ ...s, index: s.index + 1 }));
                  } else {
                    const nextDay = safePllDay >= pllSchedule.length ? 1 : safePllDay + 1;
                    const updated = { ...currentUser, pllDay: nextDay };
                    setUsers((prev) => ({
                      ...prev,
                      [activeUserKey]: updated
                    }));
                    saveUserToCloud(activeUserKey, updated);
                    setPllSession(null);
                  }
                }}
                className="py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                {pllSession.index + 1 < pllSession.queue.length ? 'Next Case →' : 'Complete Day ✓'}
              </button>
            </div>
          </div>
        )}

        {/* 5C. ISOLATED PLL DRILL MODAL */}
        {pllDrillCase && (
          <div className="fixed inset-0 z-[245] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {pllDrillCase.group}
                </span>
                <button
                  onClick={() => {
                    setSwRunning(false);
                    setPllDrillCase(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="w-28 h-28 rounded-3xl bg-slate-200 p-2 mx-auto">
                <img
                  src={getPLLImageUrl(
                    pllDrillCase.alg,
                    pllSetupSeed > 0 ? generatePLLSetupScramble(pllDrillCase.inverse, pllSetupSeed) : null
                  )}
                  alt={pllDrillCase.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white">{pllDrillCase.name}</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">{pllDrillCase.recognition}</p>
              </div>
              <div className="bg-[#050811] border border-white/10 rounded-2xl p-2.5 text-center space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {pllSetupSeed === 0 ? 'Standard Setup' : 'AUF Varied Setup'}
                  </span>
                  <div className="flex items-center gap-2">
                    {pllSetupSeed > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          emitBeep(460);
                          setPllSetupSeed(0);
                        }}
                        className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(540);
                        setPllSetupSeed((s) => s + 1);
                      }}
                      className="text-[10px] font-bold text-orange-400 hover:underline cursor-pointer"
                    >
                      New Scramble ↻
                    </button>
                  </div>
                </div>
                <p className="font-mono text-xs font-bold text-slate-300 select-all">
                  {generatePLLSetupScramble(pllDrillCase.inverse, pllSetupSeed)}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                <p className="font-mono text-base font-black text-amber-300">{pllDrillCase.alg}</p>
                {getAlgorithmTriggerTags(pllDrillCase.alg).length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    {getAlgorithmTriggerTags(pllDrillCase.alg).map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotClass}`} />
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">{pllDrillCase.fingertrick}</p>
              </div>
              {stopwatchEnabled && (
                <button
                  onClick={() => toggleStopwatch((sec) => recordCaseTime('pll', pllDrillCase.id, sec))}
                  className={`w-full py-3 rounded-2xl border font-mono text-base font-black cursor-pointer ${
                    swRunning
                      ? 'bg-green-500/20 border-green-400 text-green-300'
                      : 'bg-slate-950 border-white/10 text-slate-200'
                  }`}
                >
                  {swRunning ? `${(swElapsedMs / 1000).toFixed(2)}s — Stop` : 'Tap to Time PLL'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6. FINGERTRICK DOSSIER MODAL */}
        {activeModal === 'fingertrick' && ftCase && (() => {
          const breakdown = buildFingertrickBreakdown(ftCase);
          return (
            <div
              onClick={() => setActiveModal(null)}
              className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5"
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
                  <img
                    src={
                      ftPhaseContext === 'f2l'
                        ? getF2LImageUrl(ftCase.alg)
                        : ftPhaseContext === 'pll'
                        ? getPLLImageUrl(ftCase.alg)
                        : getOLLImageUrl(ftCase.alg)
                    }
                    alt={ftCase.name}
                    className={
                      ftPhaseContext === 'f2l'
                        ? 'w-14 h-14 object-contain f2l-cube-satin flex-shrink-0'
                        : 'w-12 h-12 rounded-xl bg-slate-200 p-1 flex-shrink-0'
                    }
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-white truncate">{ftCase.name}</h3>
                    <p className="font-mono text-xs font-bold text-amber-300 break-words">{ftCase.alg}</p>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  {breakdown.recognition && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                        Recognition &amp; Alignment
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">{breakdown.recognition}</p>
                    </div>
                  )}

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
                    {breakdown.triggers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {breakdown.triggers.map((t) => (
                          <span
                            key={t.detail}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${t.codex.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${t.codex.dotClass}`} />
                            {t.codex.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {breakdown.segments.length > 0 && (
                      <div className="pt-1.5 border-t border-white/10 space-y-1.5">
                        {breakdown.segments.map((seg, idx) => {
                          const style = classifySegmentStyle(seg.moves);
                          return (
                            <div key={idx} className="flex items-start gap-2 text-[10.5px]">
                              <span className={`px-2 py-0.5 rounded-md border font-mono font-black flex-shrink-0 ${style.badgeClass}`}>
                                {seg.moves}
                              </span>
                              <span className="text-slate-300 pt-0.5">— {seg.cue}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
        {/* 7. FAMILY PROFILE SWITCHER MODAL ("Me" ONLY + DIRECT KEYPAD LANDING GATE) */}
        {((activeModal === 'profile' && activeUserKey === 'Me') || startupPinLocked) && (() => {
          const targetLockUser = pendingUserSwitch;
          const showKeypad = startupPinLocked || Boolean(targetLockUser);
          return (
          <div className="fixed inset-0 z-[255] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-xs w-full space-y-3 shadow-2xl">
              {!showKeypad ? (
                <>
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                      Me • Profile Switcher
                    </span>
                    <h3 className="text-xl font-black text-white">Switch Profile</h3>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                    {Object.keys(users).map((uKey) => {
                      const safeKey = String(uKey);
                      const uData = sanitizeUserRecord(users[uKey]);
                      const isCurrent = safeKey === activeUserKey;
                      const hasPin = Boolean(uData.pin);
                      return (
                        <button
                          key={safeKey}
                          onClick={() => {
                            if (isCurrent) {
                              setActiveModal(null);
                              return;
                            }
                            emitBeep(540);
                            setActiveUserKey(safeKey);
                            setIsAdminSession(safeKey === 'Me');
                            setActiveModal(null);
                          }}
                          className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-orange-500/15 border-orange-500/40 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black">{safeKey}</span>
                              {hasPin && (
                                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                  PIN
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              F2L D{Number(uData.f2lDay) || 1} • OLL D{Number(uData.day) || 1} • PLL D{Number(uData.pllDay) || 1}
                            </span>
                          </div>
                          {isCurrent ? (
                            <span className="text-xs font-black text-orange-400">Active ✓</span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">
                              Switch →
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setPendingUserSwitch(null);
                      setCreatingPinForUser(null);
                      setActiveModal(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      emitBeep(420);
                      setIsAdminSession(false);
                      setAdminUnlocked(false);
                      setPinEntryInput('');
                      setActiveModal(null);
                      setStartupPinLocked(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-black text-red-300 cursor-pointer"
                  >
                    Lock &amp; Sign Out
                  </button>
                </>
              ) : (
                /* Direct 4-Digit PIN Keypad Gate */
                <div className="space-y-3.5 text-center">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                      {startupPinLocked ? 'OLLDay Everyday' : 'Protected Profile'}
                    </span>
                    <h3 className="text-xl font-black text-white">
                      {startupPinLocked ? 'Enter PIN' : `Enter PIN for ${targetLockUser}`}
                    </h3>
                  </div>

                  {/* 4 PIN Dot Indicators */}
                  <div className="flex items-center justify-center gap-3 py-1">
                    {[0, 1, 2, 3].map((idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full border transition-all ${
                          pinEntryInput.length > idx
                            ? 'bg-orange-500 border-orange-400 scale-110'
                            : 'bg-slate-950 border-white/20'
                        }`}
                      />
                    ))}
                  </div>

                  {startupPinLocked && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {cloudSyncStatus === 'synced' ? '● Cloud Accounts Ready' : '○ Connecting Cloud...'}
                    </p>
                  )}

                  {pinErrorMsg && (
                    <p className="text-[11px] font-bold text-red-400">{String(pinErrorMsg)}</p>
                  )}

                  {/* Tactile Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setPinErrorMsg('');
                          if (key === 'Clear') {
                            emitBeep(420);
                            setPinEntryInput('');
                            return;
                          }
                          if (key === '⌫') {
                            emitBeep(460);
                            setPinEntryInput((p) => p.slice(0, -1));
                            return;
                          }
                          if (pinEntryInput.length >= 4) return;
                          const nextVal = pinEntryInput + key;
                          setPinEntryInput(nextVal);
                          if (nextVal.length === 4) {
                            const latestUsers = usersRef.current || users;
                            if (startupPinLocked) {
                              if (nextVal === adminMasterPin) {
                                emitBeep(880, 'sine', 0.1);
                                setActiveUserKey('Me');
                                setIsAdminSession(true);
                                setStartupPinLocked(false);
                                setPendingUserSwitch(null);
                                setPinEntryInput('');
                                setActiveModal(null);
                                return;
                              }
                              const matchedUser = Object.keys(latestUsers).find((uKey) => {
                                const storedPin = String(latestUsers[uKey]?.pin || '').replace(/\D/g, '');
                                return storedPin.length === 4 && storedPin === nextVal;
                              });
                              if (matchedUser) {
                                emitBeep(880, 'sine', 0.1);
                                setActiveUserKey(matchedUser);
                                setIsAdminSession(matchedUser === 'Me');
                                setStartupPinLocked(false);
                                setPendingUserSwitch(null);
                                setPinEntryInput('');
                                setActiveModal(null);
                              } else {
                                emitBeep(260, 'sawtooth', 0.14);
                                setPinErrorMsg('Invalid PIN');
                                setPinEntryInput('');
                              }
                            } else {
                              const targetPin = String(latestUsers[targetLockUser]?.pin || '').replace(/\D/g, '');
                              if ((targetPin.length === 4 && nextVal === targetPin) || nextVal === adminMasterPin) {
                                emitBeep(880, 'sine', 0.1);
                                setActiveUserKey(targetLockUser);
                                setIsAdminSession(targetLockUser === 'Me');
                                setPendingUserSwitch(null);
                                setPinEntryInput('');
                                setActiveModal(null);
                              } else {
                                emitBeep(260, 'sawtooth', 0.14);
                                setPinErrorMsg('Incorrect PIN — try again');
                                setPinEntryInput('');
                              }
                            }
                          } else {
                            emitBeep(600, 'sine', 0.04);
                          }
                        }}
                        className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-sm font-black text-white active:scale-95 transition-all cursor-pointer"
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  {!startupPinLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingUserSwitch(null);
                        setCreatingPinForUser(null);
                        setPinEntryInput('');
                        setPinErrorMsg('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 cursor-pointer"
                    >
                      ← Back to Profiles
                    </button>
                  )}
                </div>
              )}
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
            { prompt: 'White bottom, Red is front — what color is to the right?', answer: 'Green' },
            { prompt: 'White bottom, Blue is front — what color is to the left?', answer: 'Orange' },
            { prompt: 'White bottom, Green is front — what color is to the left?', answer: 'Red' },
            { prompt: 'White bottom, Orange is front — what color is opposite?', answer: 'Red' },
            { prompt: 'White bottom, Green is front — what color is opposite?', answer: 'Blue' }
          ];
          const COLOR_STYLES = {
            Green: 'text-green-400 border-green-500/30 hover:bg-green-500/15',
            Red: 'text-red-400 border-red-500/30 hover:bg-red-500/15',
            Orange: 'text-orange-400 border-orange-500/30 hover:bg-orange-500/15',
            Blue: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/15'
          };
          const currentQ = ORBIT_QUESTIONS[orbitQuizIdx % ORBIT_QUESTIONS.length];

          const triggerHitMe = () => {
            emitBeep(620);
            const shuffled = ['Green', 'Red', 'Orange', 'Blue']
              .map((val) => ({ val, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ val }) => val);
            setOrbitShuffledColors(shuffled);
            setOrbitFeedback(null);
            setOrbitQuizActive(true);
            setOrbitQuizIdx((i) => i + 1 + Math.floor(Math.random() * (ORBIT_QUESTIONS.length - 1)));
          };

          return (
            <div className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-xs w-full space-y-4 shadow-2xl">
                {/* Top Header with Hit Me in Top Right */}
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
                    onClick={triggerHitMe}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    Hit Me
                  </button>
                </div>

                {/* Orientation Reference Text (Hidden once Hit Me is pressed) */}
                {!orbitQuizActive ? (
                  <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 space-y-2.5 text-center shadow-inner">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Hold <strong className="text-white">White</strong> on the bottom (<strong className="text-white">D</strong>). Going clockwise around the sides:
                    </p>
                    <p className="font-mono text-sm font-black tracking-wide">
                      <span className="text-green-400">Green</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-orange-400">Orange</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-blue-400">Blue</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-red-400">Red</span>
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-white/10">
                      Opposites: <span className="text-green-400 font-bold">Green</span> ↔ <span className="text-blue-400 font-bold">Blue</span> &nbsp;•&nbsp; <span className="text-orange-400 font-bold">Orange</span> ↔ <span className="text-red-400 font-bold">Red</span>
                    </p>
                  </div>
                ) : (
                  /* Center Drill Question + Randomly Shuffled Color Buttons */
                  <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 space-y-3.5 text-center shadow-inner">
                    <p className="text-sm font-bold text-white leading-snug min-h-[2.75rem] flex items-center justify-center">
                      {currentQ.prompt}
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {orbitShuffledColors.map((colorName) => {
                        const isPicked = orbitFeedback?.chosen === colorName;
                        const isRight = colorName === currentQ.answer;
                        let btnStyle = `bg-slate-900/90 ${COLOR_STYLES[colorName]}`;
                        if (orbitFeedback) {
                          if (isRight) btnStyle = 'bg-green-500/20 border-green-400 text-green-300';
                          else if (isPicked) btnStyle = 'bg-red-500/20 border-red-400 text-red-300';
                        }
                        return (
                          <button
                            key={colorName}
                            type="button"
                            onClick={() => {
                              if (orbitFeedback) return;
                              const correct = colorName === currentQ.answer;
                              emitBeep(correct ? 880 : 320, 'sine', 0.1);
                              setOrbitStreak((s) => (correct ? s + 1 : 0));
                              setOrbitFeedback({ correct, chosen: colorName });
                            }}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${btnStyle}`}
                          >
                            {colorName}
                          </button>
                        );
                      })}
                    </div>

                    {orbitFeedback && (
                      <p className={`text-[11px] font-black ${orbitFeedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                        {orbitFeedback.correct
                          ? 'Correct!'
                          : `Answer: ${currentQ.answer}`}
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

        {/* 9. BEGINNER'S GUIDE MODAL */}
        {activeModal === 'onboarding' && (() => {
          const ONBOARDING_SLIDES = [
            {
              badge: 'Step 1 of 4 • C (Cross)',
              title: 'Solve the White Cross on Bottom',
              desc: 'Hold White on the bottom (D) and Green in front (F). Use the Cross in X Ladder to solve all 4 white edges in 6 moves or fewer while matching side center colors.'
            },
            {
              badge: 'Step 2 of 4 • F (F2L)',
              title: 'First Two Layers (41 Pairs)',
              desc: 'Pair each bottom corner with its matching middle-layer edge and insert them together into the Front-Right slot—cutting your move count in half.'
            },
            {
              badge: 'Step 3 of 4 • O (OLL)',
              title: 'Orient Last Layer (57 Cases)',
              desc: 'Make the entire top face solid Yellow in a single algorithm using 2-Look corners first, then mastering all 57 top-layer patterns.'
            },
            {
              badge: 'Step 4 of 4 • P (PLL)',
              title: 'Permute Last Layer (25 Algs)',
              desc: 'Swap the final top-layer corners and edges into place using 2-side headlight & block recognition to complete the solve.'
            }
          ];
          const slide = ONBOARDING_SLIDES[onboardingSlide] || ONBOARDING_SLIDES[0];

          return (
            <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
                <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {slide.badge}
                </span>
                <h3 className="text-xl font-black text-white">{slide.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{slide.desc}</p>

                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {ONBOARDING_SLIDES.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        onboardingSlide === idx ? 'w-5 bg-orange-500' : 'w-1.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      emitBeep(620);
                      if (onboardingSlide + 1 < ONBOARDING_SLIDES.length) {
                        setOnboardingSlide((s) => s + 1);
                      } else {
                        setActiveModal(null);
                      }
                    }}
                    className="py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
                  >
                    {onboardingSlide + 1 < ONBOARDING_SLIDES.length ? 'Next →' : 'Start Training'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 10. CUSTOM CHUNK CURRICULUM BUILDER MODAL */}
        {activeModal === 'curriculum' && (
          <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                    Active Schedule Chunks ({builderChunks.length})
                  </span>
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
                    placeholder="New Chunk Title (e.g., My Favorites)"
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
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={
                                builderPhase === 'f2l'
                                  ? getF2LImageUrl(item.alg)
                                  : builderPhase === 'pll'
                                  ? getPLLImageUrl(item.alg)
                                  : getOLLImageUrl(item.alg)
                              }
                              alt={item.name}
                              className={
                                builderPhase === 'f2l'
                                  ? 'w-10 h-10 object-contain f2l-cube-satin'
                                  : 'w-8 h-8 bg-slate-200 rounded-lg p-0.5'
                              }
                            />
                            <span className="text-xs font-bold text-white truncate">{item.name}</span>
                          </div>
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
          <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl max-h-[88dvh] overflow-y-auto no-scrollbar">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  Granular Data Controls
                </span>
                <h3 className="text-xl font-black text-white">Reset {activeUserKey}&apos;s Progress</h3>
              </div>

              {/* Phase F (F2L) Reset Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Phase F • F2L (41 Pairs)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => executeGranularReset('f2l-day')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset F2L Day (Day 1)
                  </button>
                  <button
                    onClick={() => executeGranularReset('f2l-stats')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset F2L PRs &amp; Stats
                  </button>
                  <button
                    onClick={() => executeGranularReset('f2l-chunks')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Default F2L Chunks
                  </button>
                  <button
                    onClick={() => executeGranularReset('f2l-all')}
                    className="py-2 px-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-[11px] font-black text-red-300 cursor-pointer"
                  >
                    Reset All F2L
                  </button>
                </div>
              </div>

              {/* Phase O (OLL) Reset Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Phase O • OLL (57 Cases)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => executeGranularReset('oll-day')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset OLL Day (Day 1)
                  </button>
                  <button
                    onClick={() => executeGranularReset('oll-stats')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset OLL PRs &amp; Stats
                  </button>
                  <button
                    onClick={() => executeGranularReset('oll-chunks')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Default OLL Chunks
                  </button>
                  <button
                    onClick={() => executeGranularReset('oll-all')}
                    className="py-2 px-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-[11px] font-black text-red-300 cursor-pointer"
                  >
                    Reset All OLL
                  </button>
                </div>
              </div>

              {/* Phase P (PLL) Reset Card */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                  Phase P • PLL (25 Algs)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => executeGranularReset('pll-day')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset PLL Day (Day 1)
                  </button>
                  <button
                    onClick={() => executeGranularReset('pll-stats')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Reset PLL PRs &amp; Stats
                  </button>
                  <button
                    onClick={() => executeGranularReset('pll-chunks')}
                    className="py-2 px-2 rounded-xl bg-slate-950 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-200 cursor-pointer"
                  >
                    Default PLL Chunks
                  </button>
                  <button
                    onClick={() => executeGranularReset('pll-all')}
                    className="py-2 px-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-[11px] font-black text-red-300 cursor-pointer"
                  >
                    Reset All PLL
                  </button>
                </div>
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
              <div className="flex items-center justify-between">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    efficiencyFeedback.optimal
                      ? 'bg-green-500/15 border border-green-500/35 text-green-300'
                      : 'bg-amber-500/15 border border-amber-500/35 text-amber-300'
                  }`}
                >
                  {efficiencyFeedback.optimal ? 'Optimal Cross' : 'Move Review'}
                </span>
                <button
                  type="button"
                  onClick={() => setEfficiencyFeedback(null)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <h3 className={`text-lg font-black ${efficiencyFeedback.optimal ? 'text-green-300' : 'text-amber-300'}`}>
                {efficiencyFeedback.title}
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">{efficiencyFeedback.detail}</p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEfficiencyFeedback(null)}
                  className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs cursor-pointer active:scale-95 transition-all"
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
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs cursor-pointer active:scale-95 transition-all"
                >
                  Next Scramble →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 13. PLL ROADMAP MODAL */}
        {activeModal === 'preview' && (
          <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                CFOP Final Step
              </span>
              <h3 className="text-xl font-black text-white">Permute Last Layer (PLL)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                All 21 PLL algorithms (T-Perm, J-Perm, U-Perm, A-Perm, and G-Perms) are queued for Phase 4 right after you master Cross, F2L, and OLL.
              </p>
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* 14. BLIND INSPECTION HELP MODAL */}
        {activeModal === 'blindHelp' && (
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                  WCA Protocol Guide
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">How Blind Inspection Works</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Train sub-15 cross planning so you can track your first F2L pair during inspection.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                    1. 15-Second WCA Countdown
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Scramble your cube (White bottom • Green front) and tap <strong>Start 15s Countdown</strong>. Audio chimes warn you at <strong>8s</strong> and <strong>12s</strong> elapsed (7.0s &amp; 3.0s left). Going over 15s logs an automatic <strong>DNF</strong>.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                    2. Arm Speedstack Touch Pads
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Once all 4 cross moves are planned in your head, press and hold the <strong>Touch Pads</strong> for <strong>0.35s</strong> until both pads turn <strong>Green (ARMED)</strong>.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400 block">
                    3. Close Eyes &amp; Execute
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Release the pads to launch the fullscreen <strong>Eyes Closed Visor</strong>, execute your entire cross blindfolded, tap anywhere when done, and log <strong>Clean</strong>, <strong>+2</strong>, or <strong>DNF</strong>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  emitBeep(620);
                  setActiveModal(null);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* 15. BLIND PRACTICE HELP MODAL */}
        {activeModal === 'blindPracticeHelp' && (
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                  Ladder Drill Guide
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">How Blind Practice Works</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Build muscle memory by visualizing short cross solutions before turning a single layer.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">
                    1. Pick Your Ladder Level (L1–L5)
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Start at <strong>L1 (2 moves)</strong> and work up to <strong>L5 (6 moves)</strong>. Apply the scramble with <strong>White on Bottom</strong> and <strong>Green in Front</strong>.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                    2. Trace Every Edge Mentally
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Without turning the cube, trace where each white edge moves and confirm the exact {activeTierObj.moves}-move sequence in your head.
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400 block">
                    3. Launch the Timer Mat
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tap <strong>Open Blindfold Timer Mat</strong> to practice executing that planned cross under a 15-second WCA inspection clock with eyes closed.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  emitBeep(620);
                  setActiveModal(null);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Got It
              </button>
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
