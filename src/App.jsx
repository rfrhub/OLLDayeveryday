import React, { useState, useEffect, useRef } from 'react';

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
    title: 'Two-Pair Synergy',
    scrambles: ["R U' F2 D' R'", "L' U B2 D L", "F' U R2 D F", "B U' L2 D' B'"],
    hint: 'Insert the first edge so its turn naturally brings the second edge into drop position.'
  },
  {
    tier: 5,
    moves: 6,
    title: 'Sub-8 Master Cross',
    scrambles: ["R2 F' U' L2 D R", "L2 B U R2 D' L'", "F2 R U' B2 D F", "B2 L' U F2 D' B'"],
    hint: 'Solve relative to the color orbit (Blue-Orange-Green-Red) first, then align D at the end.'
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

const WCA_NOTATION_GUIDE = [
  { move: 'R / R\'', desc: 'Right face clockwise / counter-clockwise' },
  { move: 'U / U\'', desc: 'Top (Up) face clockwise / counter-clockwise' },
  { move: 'F / F\'', desc: 'Front face clockwise / counter-clockwise' },
  { move: 'L / L\'', desc: 'Left face clockwise / counter-clockwise' },
  { move: 'D / D\'', desc: 'Bottom (Down) face clockwise / counter-clockwise' },
  { move: 'r / f', desc: 'Wide double-layer turn (outer + middle slice)' },
  { move: 'M / M\'', desc: 'Middle slice between L and R (follows L)' },
  { move: 'X2', desc: '180° half-turn (e.g., U2, R2, F2)' }
];

// =========================================================================
// 2. VISUALCUBE RENDERERS & F2L SETUP SCRAMBLE GENERATOR
// =========================================================================

// 54-sticker U, R, F, D, L, B mapping: Yellow Top (U), Orange Right (R), Green Front (F), White Bottom (D), Red Left (L), Blue Back (B)
const F2L_VIEW_ANGLES = [
  { id: 'fr', label: 'Front-Right (Target)', rot: 'y-35x-25' },
  { id: 'fl', label: 'Front-Left (Green/Red)', rot: 'y35x-25' },
  { id: 'br', label: 'Back-Right (Orange/Blue)', rot: 'y-135x-25' },
  { id: 'bl', label: 'Back-Left (Blue/Red)', rot: 'y135x-25' }
];

const getF2LImageUrl = (alg, rot = 'y-35x-25', setupScramble = null) => {
  const baseUrl = `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=f2l&bg=t&cc=080b12&co=100&fc=yyyyyyyyyooooooooogggggggggwwwwwwwwwrrrrrrrrrbbbbbbbbb&r=${rot}`;
  return setupScramble
    ? `${baseUrl}&alg=${encodeURIComponent(setupScramble)}`
    : `${baseUrl}&case=${encodeURIComponent(alg)}`;
};

const getOLLImageUrl = (alg) =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&view=plan&stage=oll&bg=t&cc=1e293b&case=${encodeURIComponent(alg)}`;

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
  chunks.forEach((chunk, idx) => {
    const cases = chunk.ids
      .map((id) => dataList.find((item) => item.id === id))
      .filter(Boolean);
    if (!cases.length) return;

    schedule.push({
      day: dayCounter++,
      mode: 'Learn',
      chunkTitle: chunk.title,
      cases
    });
    schedule.push({
      day: dayCounter++,
      mode: 'Drill',
      chunkTitle: chunk.title,
      cases
    });

    if (idx > 0 && idx % 2 === 1) {
      const prevCases = chunks[idx - 1].ids
        .map((id) => dataList.find((item) => item.id === id))
        .filter(Boolean);
      schedule.push({
        day: dayCounter++,
        mode: 'Refine',
        chunkTitle: `${chunks[idx - 1].title} + ${chunk.title}`,
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
    stats: {},
    f2lStats: {},
    customChunks: null,
    f2lCustomChunks: null,
    crossClears: 0
  },
  Dad: {
    day: 1,
    f2lDay: 1,
    stats: {},
    f2lStats: {},
    customChunks: null,
    f2lCustomChunks: null,
    crossClears: 0
  },
  Ephraim: {
    day: 1,
    f2lDay: 1,
    stats: {},
    f2lStats: {},
    customChunks: null,
    f2lCustomChunks: null,
    crossClears: 0
  },
  Victor: {
    day: 1,
    f2lDay: 1,
    stats: {},
    f2lStats: {},
    customChunks: null,
    f2lCustomChunks: null,
    crossClears: 0
  }
};

export default function App() {
  // Persistent User & App Settings
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('ollday_users_v3');
      return saved ? { ...DEFAULT_USERS, ...JSON.parse(saved) } : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });
  const [activeUserKey, setActiveUserKey] = useState(() => {
    try {
      return localStorage.getItem('ollday_active_user') || 'Me';
    } catch {
      return 'Me';
    }
  });

  const [activePhase, setActivePhase] = useState('f2l'); // 'cross' | 'f2l' | 'oll'
  const [cfopMenuOpen, setCfopMenuOpen] = useState(false);

  // Sub-tabs per phase
  const [crossTab, setCrossTab] = useState('ladder'); // 'ladder' | 'blind' | 'mechanics' | 'settings'
  const [f2lTab, setF2lTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [ollTab, setOllTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'

  // Global Preferences
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(true);
  const [fingertricksEnabled, setFingertricksEnabled] = useState(true);
  const [targetGoalSec, setTargetGoalSec] = useState(2.5);
  const [f2lSetupMode, setF2lSetupMode] = useState('beginner'); // 'beginner' | 'realistic'
  const [f2lSetupSeed, setF2lSetupSeed] = useState(0);

  // Settings 3D Card Deck State
  const [settingsDeckIdx, setSettingsDeckIdx] = useState(0);
  const deckTouchStartRef = useRef(null);

  // Cross Phase State
  const [crossTier, setCrossTier] = useState(1);
  const [crossScrambleIdx, setCrossScrambleIdx] = useState(0);
  const [crossLadderMode, setCrossLadderMode] = useState('efficiency'); // 'efficiency' | 'blind'
  const [crossUserMoves, setCrossUserMoves] = useState(2);
  const [efficiencyFeedback, setEfficiencyFeedback] = useState(null);
  const [activeMechanicId, setActiveMechanicId] = useState(1);

  // Blind Inspection Timer State
  const [blindState, setBlindState] = useState('idle'); // 'idle' | 'inspecting' | 'readying' | 'armed' | 'visor' | 'done'
  const [inspectionLeft, setInspectionLeft] = useState(15.0);
  const [blindLogs, setBlindLogs] = useState([]);
  const padHoldTimeoutRef = useRef(null);

  // F2L & OLL Library / Lineup State
  const [f2lLibMode, setF2lLibMode] = useState('groups'); // 'groups' | 'chunks'
  const [f2lSelectedCategory, setF2lSelectedCategory] = useState(null);
  const [f2lLineupOrder, setF2lLineupOrder] = useState([]);

  const [ollLibMode, setOllLibMode] = useState('groups'); // 'groups' | 'chunks'
  const [ollSelectedCategory, setOllSelectedCategory] = useState(null);
  const [ollLineupOrder, setOllLineupOrder] = useState([]);

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

  // Session & Drill Runners (F2L & OLL)
  const [f2lSession, setF2lSession] = useState(null); // { dayObj, index, queue }
  const [f2lDrillCase, setF2lDrillCase] = useState(null);
  const [f2lViewIdx, setF2lViewIdx] = useState(0);
  const [ollSession, setOllSession] = useState(null);
  const [ollDrillCase, setOllDrillCase] = useState(null);

  // Stopwatch State inside Session / Drill
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const swStartRef = useRef(0);

  // Sync user state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ollday_users_v3', JSON.stringify(users));
      localStorage.setItem('ollday_active_user', activeUserKey);
    } catch {
      // Ignore storage quota errors
    }
  }, [users, activeUserKey]);

  const currentUser = users[activeUserKey] || DEFAULT_USERS.Me;
  const f2lChunks = currentUser.f2lCustomChunks || F2L_DEFAULT_CHUNKS;
  const ollChunks = currentUser.customChunks || OLL_DEFAULT_CHUNKS;

  const f2lSchedule = buildSchedule(f2lChunks, F2L_DATA);
  const ollSchedule = buildSchedule(ollChunks, OLL_DATA);

  const safeF2lDay = Math.min(Math.max(1, currentUser.f2lDay || 1), f2lSchedule.length || 1);
  const safeOllDay = Math.min(Math.max(1, currentUser.day || 1), ollSchedule.length || 1);

  const currentF2lDayObj = f2lSchedule[safeF2lDay - 1] || f2lSchedule[0];
  const currentOllDayObj = ollSchedule[safeOllDay - 1] || ollSchedule[0];

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
      const statField = phase === 'f2l' ? 'f2lStats' : 'stats';
      const existing = u[statField]?.[caseId] || { attempts: 0, best: null, last: null };
      const best = existing.best === null ? timeSec : Math.min(existing.best, timeSec);
      return {
        ...prev,
        [activeUserKey]: {
          ...u,
          [statField]: {
            ...(u[statField] || {}),
            [caseId]: {
              attempts: existing.attempts + 1,
              best,
              last: timeSec
            }
          }
        }
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
      if (scope === 'both') {
        return {
          ...prev,
          [activeUserKey]: { ...DEFAULT_USERS.Me }
        };
      }
      return { ...prev, [activeUserKey]: u };
    });
    setActiveModal(null);
  };

  // Curriculum Builder Helpers
  const openCurriculumBuilder = (phase) => {
    setBuilderPhase(phase);
    const sourceChunks = phase === 'f2l' ? f2lChunks : ollChunks;
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
      return {
        ...prev,
        [activeUserKey]: {
          ...u,
          ...(builderPhase === 'f2l'
            ? { f2lCustomChunks: builderChunks, f2lDay: 1 }
            : { customChunks: builderChunks, day: 1 })
        }
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

  const activeF2LSessionCase = f2lSession?.queue?.[f2lSession.index] || null;
  const activeOLLSessionCase = ollSession?.queue?.[ollSession.index] || null;

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
        setSettingsDeckIdx((p) => (p + 1) % 3);
      } else {
        setSettingsDeckIdx((p) => (p + 2) % 3);
      }
    }
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
          {[0, 1, 2].map((idx) => (
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
        className="relative h-[430px] w-full mt-2"
      >
        {/* Card 1: Hardware & Training Preferences */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3.5 ${
            settingsDeckIdx === 0 ? 'deck-card-1' : settingsDeckIdx === 1 ? 'deck-card-3' : 'deck-card-2'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 1 of 3 • Preferences</span>
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
                <p className="text-[10px] text-slate-400">Show ergonomic grip cues on every card</p>
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
                <span className="text-xs font-bold text-white">Target Mastery Goal</span>
                <span className="font-mono text-xs font-black text-orange-400">{targetGoalSec.toFixed(1)}s</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.5, 2.0, 2.5, 3.5].map((goal) => (
                  <button
                    key={goal}
                    onClick={() => {
                      emitBeep(640);
                      setTargetGoalSec(goal);
                    }}
                    className={`py-1.5 rounded-xl text-[11px] font-black cursor-pointer ${
                      targetGoalSec === goal
                        ? 'bg-orange-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {goal.toFixed(1)}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: WCA Notation Reference */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out flex flex-col ${
            settingsDeckIdx === 1 ? 'deck-card-1' : settingsDeckIdx === 2 ? 'deck-card-3' : 'deck-card-2'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 2 of 3 • Notation</span>
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
          <h3 className="text-lg font-black text-white mb-2">WCA Move Notation</h3>
          <div data-scrollable="true" className="max-h-[310px] overflow-y-auto no-scrollbar space-y-2 pr-1">
            {WCA_NOTATION_GUIDE.map((item) => (
              <div key={item.move} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <span className="font-mono text-xs font-black text-amber-300">{item.move}</span>
                <span className="text-[11px] text-slate-300 text-right max-w-[195px]">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Guides, Curriculum & Reset */}
        <div
          className={`absolute inset-x-0 top-0 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl transition-all duration-500 ease-out space-y-3 ${
            settingsDeckIdx === 2 ? 'deck-card-1' : settingsDeckIdx === 0 ? 'deck-card-3' : 'deck-card-2'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Card 3 of 3 • Roadmap & Data</span>
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
          <h3 className="text-lg font-black text-white">Guides & Curriculum</h3>

          <button
            onClick={() => {
              emitBeep(600);
              setOnboardingSlide(0);
              setActiveModal('onboarding');
            }}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-orange-600/20 to-amber-500/20 border border-orange-500/35 text-left flex items-center justify-between hover:bg-orange-500/25 cursor-pointer"
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
              openCurriculumBuilder(activePhase === 'oll' ? 'oll' : 'f2l');
            }}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs font-black text-white">Custom Chunk Curriculum Builder</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Build your own F2L or OLL learning groups</p>
            </div>
            <span className="text-slate-400 font-black text-sm">→</span>
          </button>

          <button
            onClick={() => {
              emitBeep(400);
              setActiveModal('reset');
            }}
            className="w-full p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-left flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs font-black text-red-300">Reset Progress ({activeUserKey})</p>
              <p className="text-[10px] text-red-300/75 mt-0.5">Granular F2L, OLL, stats, or full profile reset</p>
            </div>
            <span className="text-red-400 font-black text-sm">↺</span>
          </button>
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
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => {
                  emitBeep(520);
                  setActiveModal('profile');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="max-w-[64px] truncate">{activeUserKey}</span>
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
                  <span>{activePhase === 'cross' ? 'C' : activePhase === 'f2l' ? 'F' : 'O'}</span>
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
                          if (p.key === 'pll') {
                            setActiveModal('preview');
                          } else {
                            setActivePhase(p.key);
                          }
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
                        Blindfold Run
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
                        <h4 className="text-base font-black text-white">Blindfold Execution Ready</h4>
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
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Sub-15 Execution Protocol</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Blind Inspection</h2>
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
                          className={`h-24 rounded-2xl border-2 flex items-center justify-center font-black text-xs transition-colors ${
                            blindState === 'armed'
                              ? 'bg-green-500/20 border-green-400 text-green-300'
                              : blindState === 'readying'
                              ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          LEFT PAD
                        </div>
                        <div
                          className={`h-24 rounded-2xl border-2 flex items-center justify-center font-black text-xs transition-colors ${
                            blindState === 'armed'
                              ? 'bg-green-500/20 border-green-400 text-green-300'
                              : blindState === 'readying'
                              ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          RIGHT PAD
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
                            setUsers((prev) => ({
                              ...prev,
                              [activeUserKey]: {
                                ...currentUser,
                                f2lDay: safeF2lDay >= f2lSchedule.length ? 1 : safeF2lDay + 1
                              }
                            }));
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
                            setUsers((prev) => ({
                              ...prev,
                              [activeUserKey]: {
                                ...currentUser,
                                day: safeOllDay >= ollSchedule.length ? 1 : safeOllDay + 1
                              }
                            }));
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
                  const currentTab = activePhase === 'f2l' ? f2lTab : ollTab;
                  const setTab = activePhase === 'f2l' ? setF2lTab : setOllTab;
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
                    setUsers((prev) => ({
                      ...prev,
                      [activeUserKey]: {
                        ...currentUser,
                        f2lDay: safeF2lDay >= f2lSchedule.length ? 1 : safeF2lDay + 1
                      }
                    }));
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
                <p className="text-[9px] text-slate-500">Start from solved cube (White bottom • Green front)</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center space-y-1">
                <p className="font-mono text-base font-black text-white">{f2lDrillCase.alg}</p>
                <p className="text-[11px] text-slate-300">{f2lDrillCase.step1} → {f2lDrillCase.step2}</p>
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
                  {swRunning ? `${(swElapsedMs / 1000).toFixed(2)}s — Stop` : 'Tap to Time Pair'}
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

            <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-6 flex flex-col items-center space-y-4 shadow-2xl my-auto">
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
              <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-3.5 text-center">
                <p className="font-mono text-lg font-black text-amber-300">{activeOLLSessionCase.alg}</p>
                {fingertricksEnabled && (
                  <p className="text-[11px] text-slate-400 mt-1.5">{activeOLLSessionCase.fingertrick}</p>
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
                    setUsers((prev) => ({
                      ...prev,
                      [activeUserKey]: {
                        ...currentUser,
                        day: safeOllDay >= ollSchedule.length ? 1 : safeOllDay + 1
                      }
                    }));
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
              <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 text-center">
                <p className="font-mono text-base font-black text-amber-300">{ollDrillCase.alg}</p>
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

        {/* 6. FINGERTRICK DOSSIER MODAL */}
        {activeModal === 'fingertrick' && ftCase && (
          <div className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-4 flex items-center gap-4">
                <div
                  className={`w-24 h-24 flex-shrink-0 flex items-center justify-center ${
                    ftPhaseContext === 'f2l' ? '' : 'bg-slate-200 rounded-2xl p-1.5'
                  }`}
                >
                  <img
                    src={ftPhaseContext === 'f2l' ? getF2LImageUrl(ftCase.alg) : getOLLImageUrl(ftCase.alg)}
                    alt={ftCase.name}
                    className={`w-full h-full object-contain ${ftPhaseContext === 'f2l' ? 'f2l-cube-satin' : ''}`}
                  />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                    Fingertrick Dossier
                  </span>
                  <h3 className="text-lg font-black text-white">{ftCase.name}</h3>
                  <p className="font-mono text-xs font-bold text-amber-300 mt-1">{ftCase.alg}</p>
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed bg-white/5 border border-white/10 rounded-2xl p-3.5">
                {ftCase.fingertrick}
              </p>
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* 7. FAMILY PROFILE SWITCHER MODAL */}
        {activeModal === 'profile' && (
          <div className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full space-y-4 shadow-2xl">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Family Profiles</span>
                <h3 className="text-xl font-black text-white">Switch Cuber</h3>
              </div>
              <div className="space-y-2">
                {Object.keys(users).map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      emitBeep(640);
                      setActiveUserKey(name);
                      setActiveModal(null);
                    }}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      activeUserKey === name
                        ? 'bg-orange-500/20 border-orange-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-black text-sm">{name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      F2L D{users[name]?.f2lDay || 1} • OLL D{users[name]?.day || 1}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* 8. COLOR ORBIT COMPASS MODAL */}
        {activeModal === 'compass' && (
          <div className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">WCA Color Scheme</span>
              <h3 className="text-xl font-black text-white">Cross Color Orbit</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                With <strong>White on Bottom</strong> and <strong>Green in Front</strong>:
                <br />
                <strong>Orange</strong> is Right • <strong>Blue</strong> is Back • <strong>Red</strong> is Left.
                <br />
                Mnemonic: <em>&ldquo;Boy&rdquo; (Blue-Orange-Yellow) clockwise around top-front-right!</em>
              </p>
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* 9. 5-SLIDE CFOP BEGINNER'S GUIDE & 4-PHASE LAUNCHER */}
        {activeModal === 'onboarding' && (
          <div className="fixed inset-0 z-[265] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-sm w-full space-y-4 shadow-2xl">
              {(() => {
                const slides = [
                  {
                    badge: 'Step 1 of 5 • Overview',
                    title: 'What is CFOP?',
                    body: 'CFOP is the world-record speedcubing method used by top cubers: Cross → F2L → OLL → PLL.'
                  },
                  {
                    badge: 'Step 2 of 5 • C (Cross)',
                    title: '1. The White Cross',
                    body: 'Solve all 4 white edge pieces on the bottom layer in 8 moves or fewer while matching side centers.'
                  },
                  {
                    badge: 'Step 3 of 5 • F (F2L)',
                    title: '2. First Two Layers (F2L)',
                    body: 'Pair each bottom corner with its middle-layer edge and insert all 4 slots simultaneously.'
                  },
                  {
                    badge: 'Step 4 of 5 • O (OLL)',
                    title: '3. Orient Last Layer (OLL)',
                    body: 'Turn the entire top face solid Yellow in a single algorithm (57 cases).'
                  },
                  {
                    badge: 'Step 5 of 5 • P (PLL) & Launch',
                    title: '4. Permute Last Layer & Jump In!',
                    body: 'Swap the final top pieces into place (21 PLL cases) to finish the cube. Pick any phase below to begin:'
                  }
                ];
                const s = slides[onboardingSlide];
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">{s.badge}</span>
                      <button
                        onClick={() => setActiveModal(null)}
                        className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <h3 className="text-xl font-black text-white">{s.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{s.body}</p>

                    {onboardingSlide === 4 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {[
                          { key: 'cross', label: 'C • Cross' },
                          { key: 'f2l', label: 'F • F2L' },
                          { key: 'oll', label: 'O • OLL' },
                          { key: 'pll', label: 'P • PLL' }
                        ].map((ph) => (
                          <button
                            key={ph.key}
                            onClick={() => {
                              emitBeep(680);
                              if (ph.key === 'pll') {
                                setActiveModal('preview');
                              } else {
                                setActivePhase(ph.key);
                                setActiveModal(null);
                              }
                            }}
                            className="py-2.5 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-xs font-black text-white cursor-pointer"
                          >
                            {ph.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setOnboardingSlide((i) => Math.max(0, i - 1))}
                        disabled={onboardingSlide === 0}
                        className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-300 disabled:opacity-30 cursor-pointer"
                      >
                        ← Back
                      </button>
                      {onboardingSlide < 4 ? (
                        <button
                          onClick={() => setOnboardingSlide((i) => i + 1)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
                        >
                          Next →
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveModal(null)}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase cursor-pointer"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* 10. CUSTOM CURRICULUM BUILDER MODAL */}
        {activeModal === 'curriculum' && (
          <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-sm w-full max-h-[85dvh] flex flex-col space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white">
                  {builderPhase === 'f2l' ? 'F2L' : 'OLL'} Chunk Builder
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                {builderChunks.map((chk, idx) => (
                  <div key={chk.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white">{chk.title}</p>
                      <p className="text-[10px] text-slate-400">{chk.ids.length} Cases</p>
                    </div>
                    {builderChunks.length > 1 && (
                      <button
                        onClick={() => setBuilderChunks((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-xs font-bold text-red-400 px-2 py-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}

                {/* Create New Chunk */}
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-3 space-y-2">
                  <input
                    type="text"
                    value={newChunkName}
                    onChange={(e) => setNewChunkName(e.target.value)}
                    placeholder="New Chunk Title (e.g., My Favorites)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500"
                  />
                  <div className="max-h-36 overflow-y-auto no-scrollbar space-y-1">
                    {(builderPhase === 'f2l' ? F2L_DATA : OLL_DATA).map((item) => {
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
                              src={builderPhase === 'f2l' ? getF2LImageUrl(item.alg) : getOLLImageUrl(item.alg)}
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

              {/* Global Wipe */}
              <div className="space-y-1.5 pt-0.5">
                <button
                  onClick={() => executeGranularReset('both')}
                  className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-xs cursor-pointer"
                >
                  Reset Everything (Full Profile Wipe)
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
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
      </div>
    </>
  );
}
