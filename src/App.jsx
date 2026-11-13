import React, { useState, useEffect, useRef } from 'react';

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
  pinnedHomePhase: `ollday_pinned_home_phase_${appId}`
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
// 1. COMPLETE DATASETS (CROSS, F2L 41 CASES, OLL 57 CASES, PLL 25 ALGS)
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
  { id: 1, name: 'F2L 1', group: 'Basic Inserts', alg: "U (R U' R')", step1: 'Position paired corner-edge over FR slot', step2: 'Insert with right-hand sexy inverse (R U\' R\')', fingertrick: 'Right index U push, wrist R, index U\', R\'' },
  { id: 2, name: 'F2L 2', group: 'Basic Inserts', alg: "U' (F' U F)", step1: 'Align connected pair over the front-right slot', step2: 'Insert into FR cleanly using F\' U F', fingertrick: 'Left index U\', left index F\', right index U, thumb F' },
  { id: 3, name: 'F2L 3', group: 'Basic Inserts', alg: "(F' U' F)", step1: 'Connected pair sits above the front-right slot', step2: 'Drop straight into FR slot with F\' U\' F', fingertrick: 'Left index F\', left index U\', thumb F' },
  { id: 4, name: 'F2L 4', group: 'Basic Inserts', alg: "(R U R')", step1: 'Connected pair is already aligned above FR', step2: 'Direct 3-move insert (R U R\')', fingertrick: 'Regripless R U R\' trigger' },
  { id: 5, name: 'F2L 5', group: 'Top Layer: Same Color', alg: "(U' R U R') U2 (R U' R')", step1: 'Hide corner in back-right while separating edge', step2: 'Re-align pair over FR and insert', fingertrick: 'Left index U\', R U R\', double-flick U2, R U\' R\'' },
  { id: 6, name: 'F2L 6', group: 'Top Layer: Same Color', alg: "(U F' U' F) U2' (F' U F)", step1: 'Hide corner with U F\' U\' F while moving edge across', step2: 'U2\' to pair up and insert into FR with F\' U F', fingertrick: 'Index U, F\' U\' F, left double-flick U2\', F\' U F' },
  { id: 7, name: 'F2L 7', group: 'Top Layer: Same Color', alg: "(U' R U2' R') U2 (R U' R')", step1: 'Swing edge to back with U2\' while corner hides', step2: 'Bring pair over FR and insert', fingertrick: 'U\' R, left U2\' double-flick, R\', U2, R U\' R\'' },
  { id: 8, name: 'F2L 8', group: 'Top Layer: Same Color', alg: "(U F' U2 F) U2' (F' U F)", step1: 'Separate adjacent matching stickers with U F\' U2 F', step2: 'Pair with U2\' and insert into FR via F\' U F', fingertrick: 'U F\' U2 F, left U2\' double-flick, F\' U F' },
  { id: 9, name: 'F2L 9', group: 'Top Layer: Same Color', alg: "U' R U' R' U F' U' F", step1: 'Break apart bad connection in U layer', step2: 'Insert formed pair directly into FR with F\' U\' F', fingertrick: 'U\' R U\' R\' U, left index F\', U\' F' },
  { id: 10, name: 'F2L 10', group: 'Top Layer: Same Color', alg: "U' R U R' U R U R'", step1: 'Lift and separate matching top stickers', step2: 'Connect over FR and insert with R U R\'', fingertrick: 'Regripless right-hand flow throughout' },
  { id: 11, name: 'F2L 11', group: 'Top Layer: Opposite Colors', alg: "U' R U2' R' U F' U' F", step1: 'Hide corner and kick edge across top layer', step2: 'Catch the pair and insert with F\' U\' F', fingertrick: 'U\' R U2\' R\' U, left index F\', U\' F' },
  { id: 12, name: 'F2L 12', group: 'Top Layer: Opposite Colors', alg: "R' U2 R2 U R2' U R", step1: 'Use wide R2 swing to pair without cube rotation', step2: 'Complete rotationless insert into FR', fingertrick: 'Thumb-down R\', U2, R2 U R2\' U R' },
  { id: 13, name: 'F2L 13', group: 'Top Layer: Opposite Colors', alg: "U F' U F U' F' U' F", step1: 'Setup opposite-top edge using U F\' U F', step2: 'Pair and insert cleanly with U\' F\' U\' F', fingertrick: 'Index U, F\' U F, left U\', F\' U\' F' },
  { id: 14, name: 'F2L 14', group: 'Top Layer: Opposite Colors', alg: "U' R U' R' U R U R'", step1: 'Create 3-move setup with U\' R U\' R\'', step2: 'Align with U and insert via R U R\'', fingertrick: 'Fast index pushes on U\' and U' },
  { id: 15, name: 'F2L 15', group: 'Top Layer: Opposite Colors', alg: "R U R' U2 R U' R' U R U' R'", step1: 'Split connected opposite pair with R U R\' U2', step2: 'Pair and insert cleanly into FR', fingertrick: 'Continuous right-wrist rhythm' },
  { id: 16, name: 'F2L 16', group: 'Top Layer: Opposite Colors', alg: "R U' R' U2 F' U' F", step1: 'Separate pair over FR with R U\' R\' U2', step2: 'Drop connected pair into FR using F\' U\' F', fingertrick: 'R U\' R\' U2, left index F\', U\' F' },
  { id: 17, name: 'F2L 17', group: 'Top Layer: White Up', alg: "R U2 R' U' R U R'", step1: 'Align edge with matching center, hide corner with R U2 R\'', step2: 'Bring corner back over edge and insert', fingertrick: 'R, U2 double-flick, R\' U\' R U R\'' },
  { id: 18, name: 'F2L 18', group: 'Top Layer: White Up', alg: "F' U2 F U F' U' F", step1: 'Swing white-up corner over matching edge with F\' U2 F', step2: 'Pair with U and insert via F\' U\' F', fingertrick: 'Left index F\', U2, thumb F, U F\' U\' F' },
  { id: 19, name: 'F2L 19', group: 'Top Layer: White Up', alg: "U R U2 R' U R U' R'", step1: 'Position white-up corner at FR, swing with U R U2 R\'', step2: 'Pair and insert with U R U\' R\'', fingertrick: 'Index U, R U2 R\', U R U\' R\'' },
  { id: 20, name: 'F2L 20', group: 'Top Layer: White Up', alg: "U' F' U2 F U' F' U F", step1: 'Setup white-up corner with U\' F\' U2 F', step2: 'Connect edge with U\' and insert via F\' U F', fingertrick: 'Left U\' pushes, F\' U2 F, U\' F\' U F' },
  { id: 21, name: 'F2L 21', group: 'Top Layer: White Up', alg: "U2 R U R' U R U' R'", step1: 'U2 aligns edge to center, R U R\' pairs them', step2: 'U R U\' R\' inserts into FR', fingertrick: 'Double-flick U2, two smooth R triggers' },
  { id: 22, name: 'F2L 22', group: 'Top Layer: White Up', alg: "U2 F' U' F U' F' U F", step1: 'U2 sets up front-edge alignment', step2: 'Pair with F\' U\' F and insert via U\' F\' U F', fingertrick: 'U2 double-flick, F\' U\' F U\' F\' U F' },
  { id: 23, name: 'F2L 23', group: 'Top Layer: White Up', alg: "U R U' R' U' R U' R' U R U' R'", step1: 'Extract and orient white-up corner with U R U\' R\'', step2: 'Pair and insert in two smooth triggers', fingertrick: 'Rhythm: (U R U\' R\') U\' (R U\' R\') U (R U\' R\')' },
  { id: 24, name: 'F2L 24', group: 'Top Layer: White Up', alg: "F U R U' R' F' R U' R'", step1: 'Sledge-style F setup pairs corner and edge in U', step2: 'Insert formed pair with R U\' R\'', fingertrick: 'Right thumb F, U R U\' R\', thumb F\', R U\' R\'' },
  { id: 25, name: 'F2L 25', group: 'Corner in Bottom', alg: "U' R' F R F' R U R'", step1: 'Use sledgehammer (R\' F R F\') to twist trapped corner', step2: 'Insert paired block with R U R\'', fingertrick: 'U\', R\' F R F\', R U R\'' },
  { id: 26, name: 'F2L 26', group: 'Corner in Bottom', alg: "U R U' R' F R' F' R", step1: 'Pair edge with corner using U R U\' R\'', step2: 'Insert cleanly with sledgehammer (F R\' F\' R)', fingertrick: 'U R U\' R\', index F, R\' F\' R' },
  { id: 27, name: 'F2L 27', group: 'Corner in Bottom', alg: "R U' R' U R U' R'", step1: 'Pop trapped corner out to U layer with R U\' R\'', step2: 'Align with U and re-insert via R U\' R\'', fingertrick: 'Double sexy-inverse trigger' },
  { id: 28, name: 'F2L 28', group: 'Corner in Bottom', alg: "R U R' U' F R' F' R", step1: 'Lift corner with sexy move (R U R\' U\')', step2: 'Sledgehammer inserts without cube rotation', fingertrick: 'R U R\' U\' into F R\' F\' R' },
  { id: 29, name: 'F2L 29', group: 'Corner in Bottom', alg: "R' F R F' R' F R F'", step1: 'Double sledgehammer twists corner while preserving edge', step2: 'Second sledge drops pair directly into FR', fingertrick: 'Two crisp R\' F R F\' triggers' },
  { id: 30, name: 'F2L 30', group: 'Corner in Bottom', alg: "R U R' U' R U R'", step1: 'Pop white-right corner up with R U R\' U\'', step2: 'Direct insert with R U R\'', fingertrick: 'Fast regripless right-hand burst' },
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
  { section: 'Outer Faces', move: "R / R'", desc: 'Right face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "U / U'", desc: 'Top (Up) face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "F / F'", desc: 'Front face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "L / L'", desc: 'Left face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "D / D'", desc: 'Bottom (Down) face clockwise / counter-clockwise' },
  { section: 'Outer Faces', move: "B / B'", desc: 'Back face clockwise / counter-clockwise' },
  { section: 'Wide Turns', move: "r / r'", desc: 'Wide Right double-layer turn (R + M\')' },
  { section: 'Wide Turns', move: "u / u'", desc: 'Wide Top double-layer turn (U + E\')' },
  { section: 'Wide Turns', move: "f / f'", desc: 'Wide Front double-layer turn (F + S)' },
  { section: 'Wide Turns', move: "l / l'", desc: 'Wide Left double-layer turn (L + M)' },
  { section: 'Slice Moves', move: "M / M'", desc: 'Middle slice between L & R (follows L direction)' },
  { section: 'Slice Moves', move: "S / S'", desc: 'Standing slice between F & B (follows F direction)' },
  { section: 'Slice Moves', move: "E / E'", desc: 'Equatorial slice between U & D (follows D direction)' },
  { section: 'Rotations', move: "x / x'", desc: 'Rotate entire cube on R axis (upward / downward)' },
  { section: 'Rotations', move: "y / y'", desc: 'Rotate entire cube on U axis (left / right)' },
  { section: 'Rotations', move: "z / z'", desc: 'Rotate entire cube on F axis (clockwise / counter)' },
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
// 2B. LIVE 3x3 CUBE SIMULATOR FOR CROSS 180° BOTTOM-VIEW SVG DIAGRAM
// =========================================================================
function simulateCrossCubeState(scramble = '') {
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

// =========================================================================
// 2C. TRUE 3D SPATIAL F2L CUBE SIMULATOR & VOLUMETRIC 3D RENDERER
// =========================================================================
function simulateF2LCubeState(setupScramble = '') {
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

  const tokens = setupScramble.replace(/[()]/g, '').trim().split(/\s+/).filter(Boolean);
  tokens.forEach((tok) => {
    const face = tok[0];
    const mod = tok.slice(1);
    const reps = mod === '2' ? 2 : mod === "'" ? 3 : 1;
    for (let i = 0; i < reps; i++) {
      if (face === 'r') {
        turnOnce('R');
        cycle4(1, 49, 28, 19);
        cycle4(4, 46, 31, 22);
        cycle4(7, 43, 34, 25);
      } else {
        turnOnce(face);
      }
    }
  });

  return s;
}

function F2LSpatial3DCube({ setupScramble, yaw, pitch, isDragging }) {
  const stickers = simulateF2LCubeState(setupScramble);
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
        const isTopYellow = offset === 0 && code === 'Y';
        const isTopSideYellow = offset !== 0 && idx < 3 && code === 'Y';
        const muted = isTopYellow || isTopSideYellow;
        return (
          <div
            key={idx}
            style={{
              backgroundColor: muted ? '#334155' : STICKER_HEX[code] || '#334155',
              borderRadius: '4.5px',
              boxShadow: muted
                ? 'inset 0 1px 1px rgba(255,255,255,0.08)'
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
        style={{
          width: `${half * 2}px`,
          height: `${half * 2}px`,
          position: 'relative',
          transformStyle: 'preserve-3d',
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

  // Settings 3D Card Deck State (6 Cards)
  const [settingsDeckIdx, setSettingsDeckIdx] = useState(0);
  const [notationFilter, setNotationFilter] = useState('All');
  const [dossierFilter, setDossierFilter] = useState('All');
  const deckTouchStartRef = useRef(null);

  // Full-Screen Glassmorphic 3x3x3 CFOP Timer State (Ao5 & Ao12)
  const [fullTimerOpen, setFullTimerOpen] = useState(false);
  const [fullScramble, setFullScramble] = useState(() => generate3x3Scramble(20));
  const [fullTimerState, setFullTimerState] = useState('idle'); // 'idle' | 'running' | 'stopped'
  const [fullElapsedMs, setFullElapsedMs] = useState(0);
  const fullStartRef = useRef(0);

  // Cross Phase State
  const [crossTier, setCrossTier] = useState(1);
  const [crossScrambleIdx, setCrossScrambleIdx] = useState(0);
  const [crossLadderMode, setCrossLadderMode] = useState('efficiency');
  const [crossBottomView, setCrossBottomView] = useState(true);
  const [crossUserMoves, setCrossUserMoves] = useState(2);
  const [efficiencyFeedback, setEfficiencyFeedback] = useState(null);
  const [activeMechanicId, setActiveMechanicId] = useState(1);

  // Blind Inspection Trainer State
  const [blindState, setBlindState] = useState('idle');
  const [inspectionLeft, setInspectionLeft] = useState(15.0);
  const [blindLogs, setBlindLogs] = useState([]);

  // Color Orbit Flash Card Game State
  const [orbitQuizIdx, setOrbitQuizIdx] = useState(0);
  const [orbitQuizActive, setOrbitQuizActive] = useState(false);
  const [orbitShuffledColors, setOrbitShuffledColors] = useState(['Green', 'Red', 'Orange', 'Blue']);
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
  const [onboardingSlide, setOnboardingSlide] = useState(0);
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
  const [proPaywallFeature, setProPaywallFeature] = useState('');
  const [proPurchaseToast, setProPurchaseToast] = useState('');
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(false);

  // Session & Drill Runners (F2L, OLL & PLL)
  const [f2lSession, setF2lSession] = useState(null);
  const [f2lDrillCase, setF2lDrillCase] = useState(null);
  const [f2lViewIdx, setF2lViewIdx] = useState(0);
  const [f2lDragRot, setF2lDragRot] = useState({ yaw: -35, pitch: -25 });
  const [f2lIsDragging, setF2lIsDragging] = useState(false);
  const f2lDragStartRef = useRef(null);
  const [ollSession, setOllSession] = useState(null);
  const [ollDrillCase, setOllDrillCase] = useState(null);
  const [pllSession, setPllSession] = useState(null);
  const [pllDrillCase, setPllDrillCase] = useState(null);
  // Stopwatch State inside Session / Drill (DOM ref avoids 120fps React tree re-renders while ticking)
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const [swLastResult, setSwLastResult] = useState(null); // { phase, caseId, timeSec, isNewPb, prevPb }
  const swStartRef = useRef(0);
  const swDisplayRef = useRef(null);
  const fullTimerDisplayRef = useRef(null);

  // 1. Authenticate Cloud Session First
  useEffect(() => {
    if (!resolvedFirebaseConfig) {
      setCloudSyncStatus('offline');
      return;
    }
    let active = true;
    let unsubscribe = () => {};

    const initAuth = async () => {
      try {
        const svc = await getFirebaseServices();
        if (!svc || !active) {
          if (active) setCloudSyncStatus('offline');
          return;
        }
        const { auth, authMod } = svc;
        unsubscribe = authMod.onAuthStateChanged(auth, (u) => {
          if (active && u) setCloudAuthUser(u);
        });
        const initialToken =
          typeof globalThis !== 'undefined' ? globalThis.__initial_auth_token : null;
        if (initialToken) {
          await authMod.signInWithCustomToken(auth, initialToken);
        } else if (!auth.currentUser) {
          await authMod.signInAnonymously(auth);
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
      fullSolveHistory: [],
      customChunks: null,
      f2lCustomChunks: null,
      pllCustomChunks: null,
      crossClears: 0,
      isPro: false,
      email: '',
      fullSolveTargetPb: 15.0,
      phaseTargetPbs: { cross: 2.0, f2l: 2.5, oll: 2.0, pll: 2.0 },
      caseTargetPbs: { f2l: {}, oll: {}, pll: {} }
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
            last: typeof v.last === 'number' ? v.last : null,
            history: Array.isArray(v.history)
              ? v.history.map((n) => Number(n)).filter((n) => Number.isFinite(n)).slice(0, 60)
              : typeof v.last === 'number'
              ? [v.last]
              : []
          };
        }
      });
      return out;
    };
    const cleanNumMap = (m) => {
      if (!m || typeof m !== 'object' || m.$$typeof) return {};
      const out = {};
      Object.entries(m).forEach(([k, v]) => {
        const num = Number(v);
        if (Number.isFinite(num) && num > 0) out[k] = Number(num.toFixed(3));
      });
      return out;
    };
    const rawPhases = raw.phaseTargetPbs && typeof raw.phaseTargetPbs === 'object' ? raw.phaseTargetPbs : {};
    const rawCases = raw.caseTargetPbs && typeof raw.caseTargetPbs === 'object' ? raw.caseTargetPbs : {};
    return {
      day: typeof raw.day === 'number' ? raw.day : 1,
      f2lDay: typeof raw.f2lDay === 'number' ? raw.f2lDay : 1,
      pllDay: typeof raw.pllDay === 'number' ? raw.pllDay : 1,
      stats: cleanStatMap(raw.stats),
      f2lStats: cleanStatMap(raw.f2lStats),
      pllStats: cleanStatMap(raw.pllStats),
      fullSolveHistory: Array.isArray(raw.fullSolveHistory)
        ? raw.fullSolveHistory.filter((s) => s && typeof s.ms === 'number')
        : [],
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
      isPro: Boolean(raw.isPro),
      email: typeof raw.email === 'string' ? raw.email : '',
      fullSolveTargetPb:
        typeof raw.fullSolveTargetPb === 'number' && Number.isFinite(raw.fullSolveTargetPb)
          ? Number(raw.fullSolveTargetPb.toFixed(3))
          : 15.0,
      phaseTargetPbs: {
        cross: Number.isFinite(Number(rawPhases.cross)) ? Number(Number(rawPhases.cross).toFixed(3)) : 2.0,
        f2l: Number.isFinite(Number(rawPhases.f2l)) ? Number(Number(rawPhases.f2l).toFixed(3)) : 2.5,
        oll: Number.isFinite(Number(rawPhases.oll)) ? Number(Number(rawPhases.oll).toFixed(3)) : 2.0,
        pll: Number.isFinite(Number(rawPhases.pll)) ? Number(Number(rawPhases.pll).toFixed(3)) : 2.0
      },
      caseTargetPbs: {
        f2l: cleanNumMap(rawCases.f2l),
        oll: cleanNumMap(rawCases.oll),
        pll: cleanNumMap(rawCases.pll)
      }
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

  // 2. Real-Time Cloud Sync for Solver Accounts & Progress
  useEffect(() => {
    if (!resolvedFirebaseConfig || !cloudAuthUser) return;
    let active = true;
    let unsubProfiles = () => {};

    const subscribeCloud = async () => {
      try {
        const svc = await getFirebaseServices();
        if (!svc || !active) {
          if (active) setCloudSyncStatus('offline');
          return;
        }
        const { db, fsMod } = svc;
        const profilesCol = fsMod.collection(db, 'artifacts', appId, 'public', 'data', 'solver_profiles');

        unsubProfiles = fsMod.onSnapshot(
          profilesCol,
          (snapshot) => {
            setCloudSyncStatus('synced');
            if (snapshot.empty) {
              Object.entries(usersRef.current || DEFAULT_USERS).forEach(([uKey, uVal]) => {
                const cleanVal = sanitizeUserRecord(uVal);
                fsMod.setDoc(fsMod.doc(db, 'artifacts', appId, 'public', 'data', 'solver_profiles', uKey), {
                  ...cleanVal,
                  name: uKey
                }).catch(() => {});
              });
              return;
            }
            const remoteRaw = {};
            snapshot.forEach((docSnap) => {
              const id = String(docSnap.id);
              const data = docSnap.data();
              if (data && typeof data === 'object' && !data.$$typeof) {
                remoteRaw[id] = data;
              }
            });

            setUsers((prev) => {
              const merged = mergeDefaultUsersWithStored(prev);
              Object.entries(remoteRaw).forEach(([id, data]) => {
                if (data._deleted) {
                  delete merged[id];
                } else {
                  merged[id] = sanitizeUserRecord(data);
                }
              });
              return Object.keys(merged).length > 0 ? merged : prev;
            });
          },
          () => {
            setCloudSyncStatus('offline');
          }
        );
      } catch {
        if (active) setCloudSyncStatus('offline');
      }
    };

    subscribeCloud();
    return () => {
      active = false;
      try {
        unsubProfiles();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [cloudAuthUser]);

  const saveUserToCloud = async (uKey, uData) => {
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
    if (!resolvedFirebaseConfig || !cloudAuthUser) return;
    const svc = await getFirebaseServices();
    if (!svc) return;
    svc.fsMod.setDoc(
      svc.fsMod.doc(svc.db, 'artifacts', appId, 'public', 'data', 'solver_profiles', uKey),
      { ...cleanData, name: String(uKey), updatedAt: Date.now() },
      { merge: true }
    ).catch(() => {});
  };

  const currentUser = sanitizeUserRecord(users[activeUserKey] || DEFAULT_USERS.Demo);
  const isProUnlocked = Boolean(currentUser.isPro);

  // Sync Target PB controls with active solver account
  const fullSolveTargetSec = currentUser.fullSolveTargetPb ?? targetGoalSec;
  const getPhaseTargetPb = (phase) =>
    currentUser.phaseTargetPbs?.[phase] ?? (phase === 'f2l' ? 2.5 : 2.0);
  const getEffectiveCaseTargetPb = (phase, caseId) => {
    const custom = currentUser.caseTargetPbs?.[phase]?.[caseId];
    return typeof custom === 'number' && Number.isFinite(custom) ? custom : getPhaseTargetPb(phase);
  };

  useEffect(() => {
    setTargetGoalSec(fullSolveTargetSec);
    setTargetPbInput(fullSolveTargetSec.toFixed(3));
  }, [activeUserKey, fullSolveTargetSec]);

  useEffect(() => {
    const pVal = getPhaseTargetPb(selectedTargetPhase);
    setPhaseTargetInput(pVal.toFixed(3));
  }, [activeUserKey, selectedTargetPhase, currentUser.phaseTargetPbs]);

  const updateFullSolveTargetPb = (nextSec) => {
    const clamped = Math.min(120, Math.max(1.0, Number(nextSec.toFixed(3))));
    setTargetGoalSec(clamped);
    setTargetPbInput(clamped.toFixed(3));
    const updatedUser = { ...currentUser, fullSolveTargetPb: clamped };
    setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
    saveUserToCloud(activeUserKey, updatedUser);
  };

  const updatePhaseTargetPb = (phase, nextSec) => {
    const clamped = Math.min(30, Math.max(0.1, Number(nextSec.toFixed(3))));
    if (phase === selectedTargetPhase) {
      setPhaseTargetInput(clamped.toFixed(3));
    }
    const updatedUser = {
      ...currentUser,
      phaseTargetPbs: {
        ...currentUser.phaseTargetPbs,
        [phase]: clamped
      }
    };
    setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
    saveUserToCloud(activeUserKey, updatedUser);
  };

  const updateCaseTargetPb = (phase, caseId, nextSecOrNull) => {
    const nextPhaseMap = { ...(currentUser.caseTargetPbs?.[phase] || {}) };
    if (nextSecOrNull === null || nextSecOrNull === undefined || nextSecOrNull === '') {
      delete nextPhaseMap[caseId];
    } else {
      const clamped = Math.min(30, Math.max(0.1, Number(Number(nextSecOrNull).toFixed(3))));
      nextPhaseMap[caseId] = clamped;
    }
    const updatedUser = {
      ...currentUser,
      caseTargetPbs: {
        ...currentUser.caseTargetPbs,
        [phase]: nextPhaseMap
      }
    };
    setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
    saveUserToCloud(activeUserKey, updatedUser);
  };

  const openProPaywall = (featureLabel = 'Full CFOP Curriculum') => {
    emitBeep(460);
    setProPurchaseToast('');
    setProPaywallFeature(featureLabel);
    setActiveModal('proPaywall');
  };

  const unlockLifetimePro = () => {
    emitBeep(880, 'sine', 0.12);
    const updatedUser = { ...currentUser, isPro: true };
    setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
    saveUserToCloud(activeUserKey, updatedUser);
    setProPurchaseToast('Lifetime Pro Unlocked! All 123 CFOP cases & tools are active.');
    setTimeout(() => {
      setActiveModal(null);
      setProPurchaseToast('');
    }, 900);
  };

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

  useEffect(() => {
    if (currentF2lDayObj?.cases) setF2lLineupOrder(currentF2lDayObj.cases);
  }, [safeF2lDay, activeUserKey, currentUser.f2lCustomChunks]);

  useEffect(() => {
    if (currentOllDayObj?.cases) setOllLineupOrder(currentOllDayObj.cases);
  }, [safeOllDay, activeUserKey, currentUser.customChunks]);

  useEffect(() => {
    if (currentPllDayObj?.cases) setPllLineupOrder(currentPllDayObj.cases);
  }, [safePllDay, activeUserKey, currentUser.pllCustomChunks]);

  // Audio Synthesizer
  const audioCtxRef = useRef(null);
  const emitBeep = (freq = 540, type = 'sine', duration = 0.07, vol = 0.14) => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
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
      // Ignore audio errors on restricted devices
    }
  };

  // Stopwatch Ticker (Updates DOM textContent directly at 60-120fps without re-rendering the app)
  useEffect(() => {
    if (!swRunning) return;
    let raf;
    const tick = () => {
      const elapsedSec = ((performance.now() - swStartRef.current) / 1000).toFixed(2);
      if (swDisplayRef.current) {
        swDisplayRef.current.textContent = `${elapsedSec}s — Stop`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [swRunning]);

  // Full-Screen 3x3x3 CFOP Timer Ticker (Updates DOM textContent directly to keep phone cool)
  useEffect(() => {
    if (fullTimerState !== 'running') return;
    let raf;
    const tick = () => {
      const elapsedSec = ((performance.now() - fullStartRef.current) / 1000).toFixed(2);
      if (fullTimerDisplayRef.current) {
        fullTimerDisplayRef.current.textContent = elapsedSec;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fullTimerState]);

  // Background Power-Save Lifecycle: suspend AudioContext & pause active clocks when app goes to background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          audioCtxRef.current.suspend().catch(() => {});
        }
        setSwRunning(false);
        setFullTimerState((prev) => (prev === 'running' ? 'idle' : prev));
        setBlindState((prev) =>
          prev === 'inspecting' || prev === 'readying' || prev === 'armed' ? 'idle' : prev
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleFullTimerScreenTap = () => {
    if (fullTimerState === 'running') {
      emitBeep(960, 'triangle', 0.09);
      const finalMs = Math.max(10, Math.round(performance.now() - fullStartRef.current));
      setFullElapsedMs(finalMs);
      setFullTimerState('stopped');
      const newSolve = {
        id: `cfop-${Date.now()}`,
        ms: finalMs,
        scramble: fullScramble,
        penalty: null,
        timestamp: Date.now()
      };
      const updatedUser = {
        ...currentUser,
        fullSolveHistory: [newSolve, ...(currentUser.fullSolveHistory || [])].slice(0, 100)
      };
      setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
      saveUserToCloud(activeUserKey, updatedUser);
      setFullScramble(generate3x3Scramble(20));
    } else {
      emitBeep(720, 'sine', 0.06);
      fullStartRef.current = performance.now();
      setFullElapsedMs(0);
      setFullTimerState('running');
    }
  };

  const toggleFullSolvePenalty = (penaltyType) => {
    const hist = [...(currentUser.fullSolveHistory || [])];
    if (!hist.length) return;
    emitBeep(560);
    hist[0] = {
      ...hist[0],
      penalty: hist[0].penalty === penaltyType ? null : penaltyType
    };
    const updatedUser = { ...currentUser, fullSolveHistory: hist };
    setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
    saveUserToCloud(activeUserKey, updatedUser);
  };

  const deleteLastFullSolve = () => {
    const hist = [...(currentUser.fullSolveHistory || [])];
    if (!hist.length) return;
    emitBeep(400);
    hist.shift();
    const updatedUser = { ...currentUser, fullSolveHistory: hist };
    setUsers((prev) => ({ ...prev, [activeUserKey]: updatedUser }));
    saveUserToCloud(activeUserKey, updatedUser);
    setFullElapsedMs(0);
    setFullTimerState('idle');
  };

  const ao5Full = computeWcaAverage(currentUser.fullSolveHistory, 5);
  const ao12Full = computeWcaAverage(currentUser.fullSolveHistory, 12);
  const bestFullPbMs = (() => {
    const valid = (currentUser.fullSolveHistory || [])
      .filter((s) => s.penalty !== 'DNF')
      .map((s) => Number(s.ms) + (s.penalty === '+2' ? 2000 : 0));
    return valid.length ? Math.min(...valid) : null;
  })();

  const toggleStopwatch = (onStopRecord) => {
    if (!swRunning) {
      emitBeep(720, 'sine', 0.06);
      swStartRef.current = performance.now();
      setSwElapsedMs(0);
      setSwRunning(true);
    } else {
      emitBeep(960, 'triangle', 0.09);
      const finalSec = Number(((performance.now() - swStartRef.current) / 1000).toFixed(3));
      setSwElapsedMs(finalSec * 1000);
      setSwRunning(false);
      if (onStopRecord && finalSec > 0.15) {
        onStopRecord(finalSec);
      }
    }
  };

  const recordCaseTime = (phase, caseId, timeSec) => {
    const uSnapshot = usersRef.current[activeUserKey] || DEFAULT_USERS.Demo;
    const statFieldSnapshot = phase === 'f2l' ? 'f2lStats' : phase === 'pll' ? 'pllStats' : 'stats';
    const existingSnapshot = uSnapshot[statFieldSnapshot]?.[caseId] || { attempts: 0, best: null, last: null, history: [] };
    const isNewPb = existingSnapshot.best === null || timeSec < existingSnapshot.best;
    setSwLastResult({
      phase,
      caseId,
      timeSec,
      isNewPb,
      prevPb: existingSnapshot.best
    });

    setUsers((prev) => {
      const u = prev[activeUserKey] || DEFAULT_USERS.Demo;
      const statField = phase === 'f2l' ? 'f2lStats' : phase === 'pll' ? 'pllStats' : 'stats';
      const existing = u[statField]?.[caseId] || { attempts: 0, best: null, last: null, history: [] };
      const best = existing.best === null ? timeSec : Math.min(existing.best, timeSec);
      const nextHistory = [timeSec, ...(Array.isArray(existing.history) ? existing.history : [])].slice(0, 60);
      const updatedUser = {
        ...u,
        [statField]: {
          ...(u[statField] || {}),
          [caseId]: {
            attempts: existing.attempts + 1,
            best,
            last: timeSec,
            history: nextHistory
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

  // Progress Metrics (Evaluated against each case's effective Target PB)
  const f2lMasteredCount = F2L_DATA.filter((item) => {
    const best = currentUser.f2lStats?.[item.id]?.best;
    return best !== null && best !== undefined && best <= getEffectiveCaseTargetPb('f2l', item.id);
  }).length;
  const ollMasteredCount = OLL_DATA.filter((item) => {
    const best = currentUser.stats?.[item.id]?.best;
    return best !== null && best !== undefined && best <= getEffectiveCaseTargetPb('oll', item.id);
  }).length;
  const pllMasteredCount = PLL_DATA.filter((item) => {
    const best = currentUser.pllStats?.[item.id]?.best;
    return best !== null && best !== undefined && best <= getEffectiveCaseTargetPb('pll', item.id);
  }).length;

  const activeF2LSessionCase = f2lSession?.queue?.[f2lSession.index] || null;
  const activeOLLSessionCase = ollSession?.queue?.[ollSession.index] || null;
  const activePLLSessionCase = pllSession?.queue?.[pllSession.index] || null;

  const setF2LPresetAngle = (nextIdx) => {
    const preset = F2L_VIEW_ANGLES[nextIdx % F2L_VIEW_ANGLES.length];
    setF2lViewIdx(nextIdx % F2L_VIEW_ANGLES.length);
    setF2lDragRot({ yaw: preset.yaw, pitch: preset.pitch });
  };

  const handleF2LCubePointerDown = (e) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    f2lDragStartRef.current = {
      lastX: clientX,
      lastY: clientY,
      moved: false
    };
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

    setF2lDragRot((prev) => {
      const nextYaw = Math.round(prev.yaw + deltaX * 1.15);
      const nextPitch = Math.max(-75, Math.min(75, Math.round(prev.pitch - deltaY * 0.95)));
      return { yaw: nextYaw, pitch: nextPitch };
    });
  };

  const handleF2LCubePointerUp = () => {
    if (!f2lDragStartRef.current) return;
    const wasTap = !f2lDragStartRef.current.moved;
    f2lDragStartRef.current = null;
    setF2lIsDragging(false);
    if (wasTap) {
      emitBeep(620);
      setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length);
    }
  };

  // Settings Deck Touch Swipe Handlers (6 Cards)
  const totalDeckCards = 6;
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
            emitBeep(620);
            setFullTimerState('idle');
            setFullElapsedMs(0);
            setFullTimerOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider cursor-pointer active:scale-95"
        >
          Open Timer
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5 text-center">
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Ao5</span>
          <span className="font-mono text-base font-black text-green-400">
            {ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}
          </span>
        </div>
        <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5 text-center">
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Ao12</span>
          <span className="font-mono text-base font-black text-sky-400">
            {ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}
          </span>
        </div>
        <div className="bg-slate-950/90 border border-white/10 rounded-xl p-2.5 text-center">
          <span className="text-[9px] font-bold uppercase text-slate-400 block">Best PB</span>
          <span
            className={`font-mono text-base font-black ${
              bestFullPbMs !== null && bestFullPbMs / 1000 <= fullSolveTargetSec
                ? 'text-green-400'
                : 'text-amber-300'
            }`}
          >
            {formatMsTime(bestFullPbMs, 2)}
          </span>
        </div>
      </div>

      {currentUser.fullSolveHistory?.length > 0 ? (
        <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
          {currentUser.fullSolveHistory.slice(0, 12).map((s, idx) => {
            const adj =
              s.penalty === 'DNF'
                ? 'DNF'
                : formatMsTime(Number(s.ms) + (s.penalty === '+2' ? 2000 : 0), 2);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-1.5 text-[11px]"
              >
                <span className="font-mono text-slate-400">
                  #{currentUser.fullSolveHistory.length - idx}
                </span>
                <span className="font-mono font-black text-white">
                  {adj} {s.penalty === '+2' ? '(+2)' : ''}
                </span>
                <span className="font-mono text-[9.5px] text-slate-500 truncate max-w-[140px]">
                  {s.scramble}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 text-center py-1">
          No 3x3x3 full solves logged yet. Launch the Full-Screen Timer to track Ao5 &amp; Ao12.
        </p>
      )}
    </div>
  );

  // Reusable Settings 6-Card Deck Renderer
  const renderSettingsDeck = () => (
    <div className="p-5 pb-10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Control Center</p>
          <h2 className="text-2xl font-black tracking-tight text-white">Settings</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
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
        className="relative h-[515px] w-full mt-2"
      >
        {/* Card 1: Hardware & Millisecond Target PB Preferences */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-2.5 ${getDeckCardClass(0)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 1 of 6 • Preferences</span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(1);
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

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-white">Pinned Home Phase</p>
                <p className="text-[10px] text-slate-400">Default phase on launch (defaults to C)</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                {[
                  { key: 'cross', label: 'C' },
                  { key: 'f2l', label: 'F' },
                  { key: 'oll', label: 'O' },
                  { key: 'pll', label: 'P' }
                ].map((ph) => {
                  const isActiveHome = (pinnedHomePhase || 'cross') === ph.key;
                  return (
                    <button
                      key={ph.key}
                      type="button"
                      onClick={() => {
                        emitBeep(620);
                        const nextPin = ph.key === 'cross' ? '' : ph.key;
                        setPinnedHomePhase(nextPin);
                        try {
                          if (typeof window !== 'undefined') {
                            if (nextPin) {
                              window.localStorage.setItem(STORAGE_KEYS.pinnedHomePhase, nextPin);
                            } else {
                              window.localStorage.removeItem(STORAGE_KEYS.pinnedHomePhase);
                            }
                          }
                        } catch {
                          // Ignore storage errors
                        }
                      }}
                      className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        isActiveHome
                          ? 'bg-orange-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {ph.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3x3x3 Full Solve Target PB (Millisecond Precision) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">3x3x3 Full Solve Target PB</span>
                  <span className="text-[9.5px] text-slate-400">Full CFOP solve goal</span>
                </div>
                <span className="font-mono text-xs font-black text-orange-400">{fullSolveTargetSec.toFixed(3)}s</span>
              </div>
              <input
                type="range"
                min="3.000"
                max="60.000"
                step="0.001"
                value={Math.min(60, Math.max(3, fullSolveTargetSec))}
                onChange={(e) => updateFullSolveTargetPb(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: '-100ms', delta: -0.1 },
                  { label: '-10ms', delta: -0.01 },
                  { label: '+10ms', delta: 0.01 },
                  { label: '+100ms', delta: 0.1 }
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => {
                      emitBeep(540);
                      updateFullSolveTargetPb(fullSolveTargetSec + btn.delta);
                    }}
                    className="py-1 rounded-lg bg-slate-950 border border-white/10 font-mono text-[9.5px] font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
                <input
                  type="number"
                  step="0.001"
                  min="1.000"
                  max="120.000"
                  value={targetPbInput}
                  onChange={(e) => setTargetPbInput(e.target.value)}
                  onBlur={() => {
                    const p = parseFloat(targetPbInput);
                    if (Number.isFinite(p)) {
                      updateFullSolveTargetPb(p);
                    } else {
                      setTargetPbInput(fullSolveTargetSec.toFixed(3));
                    }
                  }}
                  className="rounded-lg bg-slate-950 border border-white/15 px-1.5 py-1 font-mono text-[10px] text-center text-amber-300"
                />
              </div>
            </div>

            {/* Phase Target PB Selector (C / F / O / P) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-white block">Phase Target PB</span>
                  <span className="text-[9.5px] text-slate-400">Default goal for each CFOP phase</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
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
                        emitBeep(540);
                        setSelectedTargetPhase(ph.key);
                      }}
                      className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        selectedTargetPhase === ph.key
                          ? 'bg-orange-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {ph.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-slate-400">
                  {selectedTargetPhase === 'cross'
                    ? 'Phase C (Cross)'
                    : selectedTargetPhase === 'f2l'
                    ? 'Phase F (F2L)'
                    : selectedTargetPhase === 'oll'
                    ? 'Phase O (OLL)'
                    : 'Phase P (PLL)'}{' '}
                  Goal
                </span>
                <span className="font-mono text-xs font-black text-amber-300">
                  {getPhaseTargetPb(selectedTargetPhase).toFixed(3)}s
                </span>
              </div>

              <input
                type="range"
                min="0.250"
                max="10.000"
                step="0.001"
                value={Math.min(10, Math.max(0.25, getPhaseTargetPb(selectedTargetPhase)))}
                onChange={(e) => updatePhaseTargetPb(selectedTargetPhase, Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />

              <div className="grid grid-cols-5 gap-1">
                {[
                  { label: '-10ms', delta: -0.01 },
                  { label: '-1ms', delta: -0.001 },
                  { label: '+1ms', delta: 0.001 },
                  { label: '+10ms', delta: 0.01 }
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => {
                      emitBeep(540);
                      updatePhaseTargetPb(selectedTargetPhase, getPhaseTargetPb(selectedTargetPhase) + btn.delta);
                    }}
                    className="py-1 rounded-lg bg-slate-950 border border-white/10 font-mono text-[9.5px] font-bold text-slate-300 hover:text-white cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
                <input
                  type="number"
                  step="0.001"
                  min="0.100"
                  max="30.000"
                  value={phaseTargetInput}
                  onChange={(e) => setPhaseTargetInput(e.target.value)}
                  onBlur={() => {
                    const p = parseFloat(phaseTargetInput);
                    if (Number.isFinite(p)) {
                      updatePhaseTargetPb(selectedTargetPhase, p);
                    } else {
                      setPhaseTargetInput(getPhaseTargetPb(selectedTargetPhase).toFixed(3));
                    }
                  }}
                  className="rounded-lg bg-slate-950 border border-white/15 px-1.5 py-1 font-mono text-[10px] text-center text-amber-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Full-Screen 3x3x3 CFOP Timer (Ao5 & Ao12) */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3.5 ${getDeckCardClass(1)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 2 of 6 • Full 3x3x3</span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(2);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Notation →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">3x3x3 CFOP Full Timer</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Full-screen glassmorphic 3x3x3 timer with random competition scrambles, tap-anywhere start/stop, and live Ao5 &amp; Ao12 tracking.
          </p>

          <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Next 3x3x3 Scramble
            </span>
            <p className="font-mono text-xs font-bold text-amber-300 leading-relaxed">
              {fullScramble}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Current Ao5</span>
              <span className="font-mono text-lg font-black text-green-400">
                {ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 block">Current Ao12</span>
              <span className="font-mono text-lg font-black text-sky-400">
                {ao12Full === 'DNF' ? 'DNF' : formatMsTime(ao12Full, 2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              emitBeep(720);
              setFullTimerState('idle');
              setFullElapsedMs(0);
              setFullTimerOpen(true);
            }}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
          >
            Launch Full-Screen Timer
          </button>
        </div>

        {/* Card 3: Notation Key */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col ${getDeckCardClass(2)}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Card 3 of 6 • Reference
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
          <h3 className="text-lg font-black text-white mb-2">Notation Key</h3>

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

          <div data-scrollable="true" className="h-[310px] overflow-y-auto no-scrollbar space-y-1.5 pr-1">
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

        {/* Card 4: All-Inclusive Color-Coded Fingertricks Dossier */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col ${getDeckCardClass(3)}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
              Card 4 of 6 • Mechanics Codex
            </span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(4);
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

          <div data-scrollable="true" className="h-[310px] overflow-y-auto no-scrollbar space-y-2 pr-1">
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

        {/* Card 5: Membership, Guides & Account Data */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-2.5 ${getDeckCardClass(4)}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 5 of 6 • Membership &amp; Guides</span>
            <button
              onClick={() => {
                emitBeep(520);
                setSettingsDeckIdx(5);
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Account →
            </button>
          </div>
          <h3 className="text-lg font-black text-white">Pro Access &amp; Guides</h3>

          {/* Lifetime Pro Status Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-white block">
                  {isProUnlocked ? 'OLLDay Pro • Lifetime Active' : 'Starter Plan (Free Tier)'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isProUnlocked
                    ? 'All 41 F2L, 57 OLL, 25 PLL & Blind Mat unlocked'
                    : 'Includes 3x3 Timer, Cross L1–L2 & 2-Look OLL/PLL'}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                  isProUnlocked
                    ? 'bg-green-500/20 text-green-300 border border-green-500/35'
                    : 'bg-orange-500/20 text-orange-300 border border-orange-500/35'
                }`}
              >
                {isProUnlocked ? 'PRO ✓' : 'FREE'}
              </span>
            </div>
            {!isProUnlocked && (
              <button
                type="button"
                onClick={() => openProPaywall('All 123 CFOP Cases & Custom Chunks')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-[11px] uppercase tracking-wider cursor-pointer"
              >
                Unlock Lifetime Pro — $3.99
              </button>
            )}
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
              emitBeep(420);
              setActiveModal('reset');
            }}
            className="w-full p-3 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/30 text-left flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs font-black text-red-300">Granular Reset Progress</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Reset F2L, OLL, PLL, or 3x3 Timer stats</p>
            </div>
            <span className="text-red-400 font-black text-sm">↺</span>
          </button>
        </div>

        {/* Card 6: Solver Account & Store Compliance Controls */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col justify-between ${getDeckCardClass(5)}`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                Card 6 of 6 • Solver Account
              </span>
              <button
                onClick={() => {
                  emitBeep(520);
                  setSettingsDeckIdx(0);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Preferences →
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

          {/* Apple App Store Mandatory Self-Service Account Deletion */}
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
        @keyframes iosShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .ios-pin-shake {
          animation: iosShake 0.34s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .ios-glass-key {
          background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06) 70%);
          backdrop-filter: blur(28px) saturate(165%);
          -webkit-backdrop-filter: blur(28px) saturate(165%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 8px 20px rgba(0, 0, 0, 0.35);
          transition: transform 0.12s cubic-bezier(0.22, 1, 0.36, 1), background 0.15s ease, box-shadow 0.15s ease;
        }
        .ios-glass-key:hover {
          background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.11) 70%);
          border-color: rgba(255, 255, 255, 0.28);
        }
        .ios-glass-key:active {
          transform: scale(0.91);
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.24) 85%);
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.45), 0 0 24px rgba(255, 255, 255, 0.18);
        }
      `}</style>

      <div className="min-h-[100dvh] w-full bg-[#060913] text-slate-100 flex justify-center select-none relative overflow-hidden">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[40vh] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
        <div className="fixed bottom-0 right-0 w-3/4 h-[35vh] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none z-0" />

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
                  setAuthErrorMsg('');
                  setAuthMode('signin');
                  setAuthScreenOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
                title="Switch Solver Account"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="max-w-[82px] truncate">{String(activeUserKey || 'Account')}</span>
                <span className="text-[9px] uppercase tracking-wider text-orange-400 font-black ml-0.5">Account</span>
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

                    <div className="grid grid-cols-5 gap-1.5">
                      {CROSS_TIERS.map((t) => {
                        const locked = !isProUnlocked && t.tier > 2;
                        return (
                          <button
                            key={t.tier}
                            onClick={() => {
                              if (locked) {
                                openProPaywall(`Cross Ladder Level ${t.tier}`);
                                return;
                              }
                              emitBeep(540);
                              setCrossTier(t.tier);
                              setCrossUserMoves(t.moves);
                              setEfficiencyFeedback(null);
                            }}
                            className={`py-2 text-[11px] font-black rounded-xl cursor-pointer transition-all ${
                              crossTier === t.tier
                                ? 'bg-orange-500 text-slate-950 shadow-md'
                                : locked
                                ? 'bg-white/5 text-slate-500 border border-white/5'
                                : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                          >
                            L{t.tier}{locked ? ' 🔒' : ''}
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

                      {(() => {
                        const cube = simulateCrossCubeState(activeCrossScramble);
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
                            if (!isProUnlocked) {
                              openProPaywall('WCA Blindfold Timer Mat');
                              return;
                            }
                            emitBeep(620);
                            setCrossTab('blind');
                          }}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
                        >
                          {isProUnlocked ? 'Open Blindfold Timer Mat' : 'Unlock Blindfold Timer Mat (Pro)'}
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
                            const hasLocked = f2lLineupOrder.some((c) => !isCaseUnlockedForTier('f2l', c.id, isProUnlocked));
                            if (hasLocked) {
                              openProPaywall(`Day ${safeF2lDay} F2L Pairs`);
                              return;
                            }
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
                        >
                          Next →
                        </button>
                      </div>
                    </div>

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
                          const locked = !isCaseUnlockedForTier('f2l', item.id, isProUnlocked);
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
                                setF2lDrillCase(item);
                              }}
                              className={`bg-slate-900/70 backdrop-blur-xl border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                draggedLineupIdx === idx
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                                  : locked
                                  ? 'border-white/5 opacity-75 hover:opacity-100'
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
                                    {locked && (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                        PRO
                                      </span>
                                    )}
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
                                <span className="text-slate-500 text-xs font-bold px-1">{locked ? '🔒' : '⋮⋮'}</span>
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
                          if (!isProUnlocked) {
                            openProPaywall('Custom Curriculum Chunk Builder');
                            return;
                          }
                          emitBeep(560);
                          openCurriculumBuilder('f2l');
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
                            const locked = !isCaseUnlockedForTier('f2l', item.id, isProUnlocked);
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
                                  setF2lDrillCase(item);
                                }}
                                className={`bg-slate-900/70 border rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 cursor-pointer ${
                                  locked ? 'border-white/5 opacity-75' : 'border-white/10 hover:bg-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center">
                                    <img
                                      src={getF2LImageUrl(item.alg)}
                                      alt={item.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-contain f2l-cube-satin"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-black text-white">{item.name}</span>
                                      {locked && (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                          PRO
                                        </span>
                                      )}
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
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PBs</p>
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
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target PB</span>
                        <span className="font-mono text-xl font-black text-amber-300">{getPhaseTargetPb('f2l').toFixed(3)}s</span>
                      </div>
                    </div>

                    {renderFullSolveStatsBlock()}

                    <div className="space-y-2">
                      {F2L_DATA.map((item) => {
                        const stat = currentUser.f2lStats?.[item.id];
                        const caseGoal = getEffectiveCaseTargetPb('f2l', item.id);
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
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-contain f2l-cube-satin"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block">{item.name}</span>
                                <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    emitBeep(560);
                                    setEditingCaseTarget({
                                      phase: 'f2l',
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
                            <div className="text-right flex-shrink-0">
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
                          Yellow Top Recognition • Phase Target PB: {getPhaseTargetPb('oll').toFixed(3)}s
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const hasLocked = ollLineupOrder.some((c) => !isCaseUnlockedForTier('oll', c.id, isProUnlocked));
                            if (hasLocked) {
                              openProPaywall(`Day ${safeOllDay} OLL Cases`);
                              return;
                            }
                            emitBeep(720, 'sine', 0.08);
                            setSwRunning(false);
                            setSwElapsedMs(0);
                            setSwLastResult(null);
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
                          const locked = !isCaseUnlockedForTier('oll', item.id, isProUnlocked);
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
                                setOllDrillCase(item);
                              }}
                              className={`bg-slate-900/70 border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                draggedLineupIdx === idx
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                                  : locked
                                  ? 'border-white/5 opacity-75 hover:opacity-100'
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-white block truncate">{item.name}</span>
                                    {locked && (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                        PRO
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-xs font-bold text-amber-300 truncate">{item.alg}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {stat?.best && (
                                  <span className="px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/30 font-mono text-[10px] font-black text-green-300">
                                    {stat.best.toFixed(2)}s
                                  </span>
                                )}
                                <span className="text-slate-500 text-xs font-bold px-1">{locked ? '🔒' : '⋮⋮'}</span>
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
                          if (!isProUnlocked) {
                            openProPaywall('Custom Curriculum Chunk Builder');
                            return;
                          }
                          emitBeep(560);
                          openCurriculumBuilder('oll');
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
                            const locked = !isCaseUnlockedForTier('oll', item.id, isProUnlocked);
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
                                  setOllDrillCase(item);
                                }}
                                className={`bg-slate-900/70 border rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 cursor-pointer ${
                                  locked ? 'border-white/5 opacity-75' : 'border-white/10 hover:bg-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0">
                                    <img
                                      src={getOLLImageUrl(item.alg)}
                                      alt={item.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-black text-white truncate">{item.name}</span>
                                      {locked && (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                          PRO
                                        </span>
                                      )}
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
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PBs</p>
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
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target PB</span>
                        <span className="font-mono text-xl font-black text-amber-300">{getPhaseTargetPb('oll').toFixed(3)}s</span>
                      </div>
                    </div>

                    {renderFullSolveStatsBlock()}

                    <div className="space-y-2">
                      {OLL_DATA.map((item) => {
                        const stat = currentUser.stats?.[item.id];
                        const caseGoal = getEffectiveCaseTargetPb('oll', item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              emitBeep(580);
                              setSwRunning(false);
                              setSwElapsedMs(0);
                              setSwLastResult(null);
                              setOllDrillCase(item);
                            }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-200 p-1 flex-shrink-0">
                                <img
                                  src={getOLLImageUrl(item.alg)}
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block truncate">{item.name}</span>
                                <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    emitBeep(560);
                                    setEditingCaseTarget({
                                      phase: 'oll',
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
                            <div className="text-right flex-shrink-0">
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
                          2-Side Headlight &amp; Block Recognition • Phase Target PB: {getPhaseTargetPb('pll').toFixed(3)}s
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const hasLocked = pllLineupOrder.some((c) => !isCaseUnlockedForTier('pll', c.id, isProUnlocked));
                            if (hasLocked) {
                              openProPaywall(`Day ${safePllDay} PLL Algorithms`);
                              return;
                            }
                            emitBeep(720, 'sine', 0.08);
                            setSwRunning(false);
                            setSwElapsedMs(0);
                            setSwLastResult(null);
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
                          const locked = !isCaseUnlockedForTier('pll', item.id, isProUnlocked);
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
                                setPllDrillCase(item);
                              }}
                              className={`bg-slate-900/70 border rounded-2xl p-3 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                                draggedLineupIdx === idx
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-xl'
                                  : locked
                                  ? 'border-white/5 opacity-75 hover:opacity-100'
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
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-black text-white block truncate">{item.name}</span>
                                    {locked && (
                                      <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                        PRO
                                      </span>
                                    )}
                                  </div>
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
                                <span className="text-slate-500 text-xs font-bold px-1">{locked ? '🔒' : '⋮⋮'}</span>
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
                          if (!isProUnlocked) {
                            openProPaywall('Custom Curriculum Chunk Builder');
                            return;
                          }
                          emitBeep(560);
                          openCurriculumBuilder('pll');
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
                            const locked = !isCaseUnlockedForTier('pll', item.id, isProUnlocked);
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
                                  setPllDrillCase(item);
                                }}
                                className={`bg-slate-900/70 border rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 cursor-pointer ${
                                  locked ? 'border-white/5 opacity-75' : 'border-white/10 hover:bg-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0">
                                    <img
                                      src={getPLLImageUrl(item.alg)}
                                      alt={item.name}
                                      loading="lazy"
                                      decoding="async"
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-sm font-black text-white truncate">{item.name}</span>
                                      {locked && (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-[9px] font-black text-orange-300">
                                          PRO
                                        </span>
                                      )}
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
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PBs</p>
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
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target PB</span>
                        <span className="font-mono text-xl font-black text-amber-300">{getPhaseTargetPb('pll').toFixed(3)}s</span>
                      </div>
                    </div>

                    {renderFullSolveStatsBlock()}

                    <div className="space-y-2">
                      {PLL_DATA.map((item) => {
                        const stat = currentUser.pllStats?.[item.id];
                        const caseGoal = getEffectiveCaseTargetPb('pll', item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              emitBeep(580);
                              setSwRunning(false);
                              setSwElapsedMs(0);
                              setSwLastResult(null);
                              setPllDrillCase(item);
                            }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-200 p-1 flex-shrink-0">
                                <img
                                  src={getPLLImageUrl(item.alg)}
                                  alt={item.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-white block truncate">{item.name}</span>
                                <span className="font-mono text-[11px] text-amber-300 truncate block">{item.alg}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    emitBeep(560);
                                    setEditingCaseTarget({
                                      phase: 'pll',
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
                            <div className="text-right flex-shrink-0">
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

        {/* FULL-SCREEN GLASSMORPHIC 3x3x3 CFOP TIMER MODAL (TAP ANYWHERE) */}
        {fullTimerOpen && (
          <div
            onClick={handleFullTimerScreenTap}
            className="fixed inset-0 z-[290] bg-slate-950/80 backdrop-blur-3xl flex flex-col justify-between p-6 select-none cursor-pointer"
          >
            <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-orange-500/20 blur-[110px]" />
            <div className="pointer-events-none absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-sky-500/15 blur-[110px]" />

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
                <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-3.5 text-center shadow-lg">
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
                <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-3 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">
                    Ao5
                  </span>
                  <span className="font-mono text-xl font-black text-green-400">
                    {ao5Full === 'DNF' ? 'DNF' : formatMsTime(ao5Full, 2)}
                  </span>
                </div>
                <div className="rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/15 p-3 text-center">
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
          <div className="fixed inset-0 z-[255] bg-slate-950/65 backdrop-blur-3xl flex flex-col items-center justify-center p-6 overflow-y-auto">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-orange-500/20 blur-[110px]" />
            <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-sky-500/15 blur-[110px]" />

            <div className="relative z-10 w-full max-w-sm rounded-[2.25rem] bg-white/[0.08] backdrop-blur-2xl border border-white/15 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] space-y-5">
              {/* Brand Emblem & Title */}
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 1000 1000" className="w-full h-full" fill="none">
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
                  <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
                    {Object.keys(users).map((uKey) => {
                      const uData = sanitizeUserRecord(users[uKey]);
                      return (
                        <button
                          key={uKey}
                          type="button"
                          onClick={() => {
                            emitBeep(720, 'sine', 0.08);
                            setActiveUserKey(uKey);
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
                      if (users[cleanName]) {
                        setAuthErrorMsg('That solver name already exists — switch to Sign In');
                        return;
                      }
                      emitBeep(820, 'sine', 0.1);
                      const created = sanitizeUserRecord({
                        email: authEmailInput.trim(),
                        isPro: false
                      });
                      setUsers((prev) => ({ ...prev, [cleanName]: created }));
                      saveUserToCloud(cleanName, created);
                      setActiveUserKey(cleanName);
                      setAuthNameInput('');
                      setAuthEmailInput('');
                      setAuthScreenOpen(false);
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

        {/* LIFETIME PRO UNLOCK ($3.99) GLASSMORPHIC PAYWALL MODAL */}
        {activeModal === 'proPaywall' && (
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-[275] bg-slate-950/75 backdrop-blur-3xl flex items-center justify-center p-5"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-[2.25rem] bg-white/[0.08] backdrop-blur-2xl border border-white/15 p-6 shadow-2xl space-y-4 text-center"
            >
              <span className="inline-block px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-black uppercase tracking-widest text-orange-300">
                One-Time Lifetime Unlock • $3.99
              </span>
              <h3 className="text-2xl font-black text-white">OLLDay Pro</h3>
              {proPaywallFeature && (
                <p className="text-xs font-bold text-amber-300">
                  Unlock {proPaywallFeature} + the complete CFOP suite
                </p>
              )}

              <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 text-left space-y-2 text-xs text-slate-200">
                <p>✓ All <strong>41 F2L Pairs</strong> with Interactive 3D Spatial Cube</p>
                <p>✓ All <strong>57 OLL Cases</strong> &amp; <strong>25 PLL Algorithms</strong></p>
                <p>✓ Cross Ladder <strong>L3–L5</strong> &amp; <strong>WCA Blindfold Timer Mat</strong></p>
                <p>✓ <strong>Custom Curriculum Chunk Builder</strong> &amp; Cloud Sync</p>
              </div>

              {proPurchaseToast && (
                <p className="text-xs font-black text-green-300">{proPurchaseToast}</p>
              )}

              <button
                type="button"
                onClick={unlockLifetimePro}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer"
              >
                Upgrade to Lifetime Pro — $3.99
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={unlockLifetimePro}
                  className="py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-bold text-slate-200 cursor-pointer"
                >
                  Restore Purchase
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold text-slate-400 cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BLINDFOLD VISOR OVERLAY */}
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
                className="w-44 h-44 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none relative"
              >
                <F2LSpatial3DCube
                  setupScramble={generateF2LSetupScramble(activeF2LSessionCase.alg, f2lSetupMode, f2lSetupSeed)}
                  yaw={f2lDragRot.yaw}
                  pitch={f2lDragRot.pitch}
                  isDragging={f2lIsDragging}
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 -mt-1">
                  3D Orbit • Drag to Spin ({((f2lDragRot.yaw % 360) + 360) % 360}°)
                </span>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {activeF2LSessionCase.group}
                </span>
                <h3 className="text-2xl font-black text-white">{activeF2LSessionCase.name}</h3>
              </div>

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
              </div>

              <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 space-y-1.5 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                  Solution (Target: Front-Right Slot)
                </span>
                <p className="font-mono text-base font-black text-white">{activeF2LSessionCase.alg}</p>
                {f2lSession.dayObj.mode === 'Learn' && (
                  <div className="text-[11px] text-slate-300 pt-1 border-t border-white/10 space-y-0.5 text-left">
                    <p>• <strong className="text-orange-300">Step 1:</strong> {activeF2LSessionCase.step1}</p>
                    <p>• <strong className="text-orange-300">Step 2:</strong> {activeF2LSessionCase.step2}</p>
                  </div>
                )}
              </div>

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
                  {swRunning ? (
                    <span ref={swDisplayRef}>{(swElapsedMs / 1000).toFixed(2)}s — Stop</span>
                  ) : swElapsedMs > 0 ? (
                    `Last: ${(swElapsedMs / 1000).toFixed(2)}s — Tap to Retry`
                  ) : (
                    'Tap to Time Execution'
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
                  {getClosestF2LAngleLabel(f2lDragRot.yaw, f2lDragRot.pitch)}
                </span>
                <div className="flex items-center gap-1.5">
                  {(f2lDragRot.yaw !== -35 || f2lDragRot.pitch !== -25) && (
                    <button
                      type="button"
                      onClick={() => {
                        emitBeep(480);
                        setF2LPresetAngle(0);
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
                      setF2LPresetAngle((f2lViewIdx + 1) % F2L_VIEW_ANGLES.length);
                    }}
                    className="px-2.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-[10px] font-black text-orange-400 cursor-pointer"
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
                className="w-44 h-44 mx-auto flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none relative"
              >
                <F2LSpatial3DCube
                  setupScramble={generateF2LSetupScramble(f2lDrillCase.alg, f2lSetupMode, f2lSetupSeed)}
                  yaw={f2lDragRot.yaw}
                  pitch={f2lDragRot.pitch}
                  isDragging={f2lIsDragging}
                />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 -mt-1">
                  3D Orbit • Drag to Spin ({((f2lDragRot.yaw % 360) + 360) % 360}°)
                </span>
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
                  {swRunning ? (
                    <span ref={swDisplayRef}>{(swElapsedMs / 1000).toFixed(2)}s — Stop</span>
                  ) : (
                    'Tap to Time Case'
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. OLL DAILY SESSION RUNNER */}
        {ollSession && activeOLLSessionCase && (() => {
          const caseStat = currentUser.stats?.[activeOLLSessionCase.id] || {};
          const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
          const ao5Case = computeCaseWindowAvg(caseHist, 5);
          const ao20Case = computeCaseWindowAvg(caseHist, 20);
          const ao40Case = computeCaseWindowAvg(caseHist, 40);
          const lastResultForThis =
            swLastResult && swLastResult.phase === 'oll' && swLastResult.caseId === activeOLLSessionCase.id
              ? swLastResult
              : null;

          return (
            <div className="fixed inset-0 z-[240] bg-[#060913]/98 backdrop-blur-2xl flex flex-col justify-between p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {ollSession.dayObj.mode} • Case {ollSession.index + 1}/{ollSession.queue.length}
                </span>
                <button
                  onClick={() => {
                    setSwRunning(false);
                    setSwLastResult(null);
                    setOllSession(null);
                  }}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center space-y-3 shadow-2xl my-auto">
                <div className="w-28 h-28 rounded-3xl bg-slate-200 p-2 flex items-center justify-center">
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

                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1.5">
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
                  {fingertricksEnabled && (
                    <p className="text-[11px] text-slate-400">{activeOLLSessionCase.fingertrick}</p>
                  )}
                </div>

                {stopwatchEnabled && (
                  <div className="w-full space-y-2">
                    <button
                      onClick={() =>
                        toggleStopwatch((sec) => recordCaseTime('oll', activeOLLSessionCase.id, sec))
                      }
                      className={`w-full py-3.5 px-3 rounded-2xl border font-mono transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        swRunning
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : lastResultForThis?.isNewPb
                          ? 'bg-amber-500/15 border-amber-400/60 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-200'
                      }`}
                    >
                      {swRunning ? (
                        <span ref={swDisplayRef} className="text-lg font-black">{(swElapsedMs / 1000).toFixed(2)}s — Stop</span>
                      ) : lastResultForThis ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">
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
                            Tap to Time Again
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-base font-black">Tap to Time OLL</span>
                          {typeof caseStat.best === 'number' && (
                            <span className="text-[10px] font-bold text-amber-300">
                              Recorded PB: {caseStat.best.toFixed(3)}s
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao5</span>
                        <span className="font-mono text-xs font-black text-green-400">
                          {ao5Case !== null ? `${ao5Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao20</span>
                        <span className="font-mono text-xs font-black text-sky-400">
                          {ao20Case !== null ? `${ao20Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao40</span>
                        <span className="font-mono text-xs font-black text-purple-300">
                          {ao40Case !== null ? `${ao40Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    emitBeep(460);
                    setSwRunning(false);
                    setSwElapsedMs(0);
                    setSwLastResult(null);
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
                    setSwLastResult(null);
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
          );
        })()}

        {/* 5. ISOLATED OLL DRILL MODAL */}
        {ollDrillCase && (() => {
          const caseStat = currentUser.stats?.[ollDrillCase.id] || {};
          const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
          const ao5Case = computeCaseWindowAvg(caseHist, 5);
          const ao20Case = computeCaseWindowAvg(caseHist, 20);
          const ao40Case = computeCaseWindowAvg(caseHist, 40);
          const lastResultForThis =
            swLastResult && swLastResult.phase === 'oll' && swLastResult.caseId === ollDrillCase.id
              ? swLastResult
              : null;

          return (
            <div className="fixed inset-0 z-[245] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                    {ollDrillCase.group}
                  </span>
                  <button
                    onClick={() => {
                      setSwRunning(false);
                      setSwLastResult(null);
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
                  <p className="font-mono text-base font-black text-amber-300">{ollDrillCase.alg}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{ollDrillCase.fingertrick}</p>
                </div>
                {stopwatchEnabled && (
                  <div className="space-y-2">
                    <button
                      onClick={() => toggleStopwatch((sec) => recordCaseTime('oll', ollDrillCase.id, sec))}
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
                            Tap to Time Again
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-base font-black">Tap to Time OLL</span>
                          {typeof caseStat.best === 'number' && (
                            <span className="text-[10px] font-bold text-amber-300">
                              Recorded PB: {caseStat.best.toFixed(3)}s
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao5</span>
                        <span className="font-mono text-xs font-black text-green-400">
                          {ao5Case !== null ? `${ao5Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao20</span>
                        <span className="font-mono text-xs font-black text-sky-400">
                          {ao20Case !== null ? `${ao20Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao40</span>
                        <span className="font-mono text-xs font-black text-purple-300">
                          {ao40Case !== null ? `${ao40Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 5B. PLL DAILY SESSION RUNNER */}
        {pllSession && activePLLSessionCase && (() => {
          const caseStat = currentUser.pllStats?.[activePLLSessionCase.id] || {};
          const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
          const ao5Case = computeCaseWindowAvg(caseHist, 5);
          const ao20Case = computeCaseWindowAvg(caseHist, 20);
          const ao40Case = computeCaseWindowAvg(caseHist, 40);
          const lastResultForThis =
            swLastResult && swLastResult.phase === 'pll' && swLastResult.caseId === activePLLSessionCase.id
              ? swLastResult
              : null;

          return (
            <div className="fixed inset-0 z-[240] bg-[#060913]/98 backdrop-blur-2xl flex flex-col justify-between p-5 max-w-md mx-auto">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                  {pllSession.dayObj.mode} • Case {pllSession.index + 1}/{pllSession.queue.length}
                </span>
                <button
                  onClick={() => {
                    setSwRunning(false);
                    setSwLastResult(null);
                    setPllSession(null);
                  }}
                  className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex flex-col items-center space-y-3 shadow-2xl my-auto">
                <div className="w-28 h-28 rounded-3xl bg-slate-200 p-2 flex items-center justify-center">
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

                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Execution Algorithm
                  </span>
                  <p className="font-mono text-base font-black text-amber-300">{activePLLSessionCase.alg}</p>
                  {fingertricksEnabled && (
                    <p className="text-[11px] text-slate-400 mt-1">{activePLLSessionCase.fingertrick}</p>
                  )}
                </div>

                {stopwatchEnabled && (
                  <div className="w-full space-y-2">
                    <button
                      onClick={() =>
                        toggleStopwatch((sec) => recordCaseTime('pll', activePLLSessionCase.id, sec))
                      }
                      className={`w-full py-3.5 px-3 rounded-2xl border font-mono cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        swRunning
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : lastResultForThis?.isNewPb
                          ? 'bg-amber-500/15 border-amber-400/60 text-white'
                          : 'bg-slate-950 border-white/10 text-slate-200'
                      }`}
                    >
                      {swRunning ? (
                        <span ref={swDisplayRef} className="text-lg font-black">{(swElapsedMs / 1000).toFixed(2)}s — Stop</span>
                      ) : lastResultForThis ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-white">
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
                            Tap to Time Again
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-base font-black">Tap to Time PLL</span>
                          {typeof caseStat.best === 'number' && (
                            <span className="text-[10px] font-bold text-amber-300">
                              Recorded PB: {caseStat.best.toFixed(3)}s
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao5</span>
                        <span className="font-mono text-xs font-black text-green-400">
                          {ao5Case !== null ? `${ao5Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao20</span>
                        <span className="font-mono text-xs font-black text-sky-400">
                          {ao20Case !== null ? `${ao20Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao40</span>
                        <span className="font-mono text-xs font-black text-purple-300">
                          {ao40Case !== null ? `${ao40Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    emitBeep(460);
                    setSwRunning(false);
                    setSwElapsedMs(0);
                    setSwLastResult(null);
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
                    setSwLastResult(null);
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
          );
        })()}

        {/* 5C. ISOLATED PLL DRILL MODAL */}
        {pllDrillCase && (() => {
          const caseStat = currentUser.pllStats?.[pllDrillCase.id] || {};
          const caseHist = Array.isArray(caseStat.history) ? caseStat.history : [];
          const ao5Case = computeCaseWindowAvg(caseHist, 5);
          const ao20Case = computeCaseWindowAvg(caseHist, 20);
          const ao40Case = computeCaseWindowAvg(caseHist, 40);
          const lastResultForThis =
            swLastResult && swLastResult.phase === 'pll' && swLastResult.caseId === pllDrillCase.id
              ? swLastResult
              : null;

          return (
            <div className="fixed inset-0 z-[245] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-3.5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                    {pllDrillCase.group}
                  </span>
                  <button
                    onClick={() => {
                      setSwRunning(false);
                      setSwLastResult(null);
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
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                  <p className="font-mono text-base font-black text-amber-300">{pllDrillCase.alg}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{pllDrillCase.fingertrick}</p>
                </div>
                {stopwatchEnabled && (
                  <div className="space-y-2">
                    <button
                      onClick={() => toggleStopwatch((sec) => recordCaseTime('pll', pllDrillCase.id, sec))}
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
                            Tap to Time Again
                          </span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-base font-black">Tap to Time PLL</span>
                          {typeof caseStat.best === 'number' && (
                            <span className="text-[10px] font-bold text-amber-300">
                              Recorded PB: {caseStat.best.toFixed(3)}s
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao5</span>
                        <span className="font-mono text-xs font-black text-green-400">
                          {ao5Case !== null ? `${ao5Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao20</span>
                        <span className="font-mono text-xs font-black text-sky-400">
                          {ao20Case !== null ? `${ao20Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                      <div className="bg-slate-950/90 border border-white/10 rounded-xl py-1.5 px-2 text-center">
                        <span className="text-[9px] font-black uppercase text-slate-400 block">Ao40</span>
                        <span className="font-mono text-xs font-black text-purple-300">
                          {ao40Case !== null ? `${ao40Case.toFixed(2)}s` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
            <div className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
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

        {/* 9. BEGINNER'S GUIDE MODAL */}
        {activeModal === 'onboarding' && (() => {
          const ONBOARDING_SLIDES = [
            {
              badge: 'Step 1 of 4 • C (Cross)',
              title: 'Solve the White Cross on Bottom',
              desc: 'Hold White on the bottom (D) and Green in front (F). Solve all 4 white edges in 6 moves or fewer.'
            },
            {
              badge: 'Step 2 of 4 • F (F2L)',
              title: 'First Two Layers (41 Pairs)',
              desc: 'Pair each bottom corner with its matching middle-layer edge and insert them together into the Front-Right slot.'
            },
            {
              badge: 'Step 3 of 4 • O (OLL)',
              title: 'Orient Last Layer (57 Cases)',
              desc: 'Make the entire top face solid Yellow in a single algorithm.'
            },
            {
              badge: 'Step 4 of 4 • P (PLL)',
              title: 'Permute Last Layer (25 Algs)',
              desc: 'Swap the final top-layer corners and edges into place to complete the solve.'
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
          <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
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
            className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5"
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
            className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5"
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
              className="fixed inset-0 z-[280] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5"
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

                  <input
                    type="range"
                    min="0.150"
                    max="10.000"
                    step="0.001"
                    value={Math.min(10, Math.max(0.15, numericVal))}
                    onChange={(e) =>
                      setEditingCaseTarget((prev) => ({
                        ...prev,
                        draft: Number(e.target.value).toFixed(3)
                      }))
                    }
                    className="w-full accent-orange-500 cursor-pointer"
                  />

                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: '-10ms', delta: -0.01 },
                      { label: '-1ms', delta: -0.001 },
                      { label: '+1ms', delta: 0.001 },
                      { label: '+10ms', delta: 0.01 }
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          emitBeep(540);
                          const next = Math.min(30, Math.max(0.1, Number((numericVal + btn.delta).toFixed(3))));
                          setEditingCaseTarget((prev) => ({ ...prev, draft: next.toFixed(3) }));
                        }}
                        className="py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-[9.5px] font-bold text-slate-300 hover:text-white cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                    <input
                      type="number"
                      step="0.001"
                      min="0.100"
                      max="30.000"
                      value={draft}
                      onChange={(e) =>
                        setEditingCaseTarget((prev) => ({ ...prev, draft: e.target.value }))
                      }
                      className="rounded-lg bg-white/5 border border-white/15 px-1.5 py-1 font-mono text-[10px] text-center text-amber-300"
                    />
                  </div>
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
