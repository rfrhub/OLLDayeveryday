import React, { useState, useEffect, useRef } from 'react';

// =========================================================================
// 0. DATASETS (57 OLL Cases + 41 F2L Cases + Fingertrick Dossiers)
// =========================================================================
const OLL_DATA = [
  { id: 1, chunk: 1, ollNo: 27, name: "Sune", group: "Oriented-Edges", alg: "R U R' U R U2' R'", setup: "R U2 R' U' R U' R'" },
  { id: 2, chunk: 1, ollNo: 26, name: "Anti-Sune", group: "Oriented-Edges", alg: "R U2 R' U' R U' R'", setup: "R U R' U R U2' R'" },
  { id: 3, chunk: 1, ollNo: 21, name: "Cross", group: "Oriented-Edges", alg: "(R U2 R') (U' R U R') (U' R U' R')", setup: "R U R' U R U' R' U R U2' R'" },
  { id: 4, chunk: 1, ollNo: 24, name: "Chameleon", group: "Oriented-Edges", alg: "(r U R' U') (r' F R F')", setup: "F R' F' r U R U' r'" },
  { id: 5, chunk: 1, ollNo: 25, name: "Bowtie", group: "Oriented-Edges", alg: "F' (r U R' U') r' F R", setup: "R' F' r U R U' r' F" },
  { id: 6, chunk: 1, ollNo: 22, name: "Bruno", group: "Oriented-Edges", alg: "R U2' R2' U' R2 U' R2' U2' R", setup: "R' U2 R2 U R2' U R2 U2 R'" },
  { id: 7, chunk: 1, ollNo: 23, name: "Headlights", group: "Oriented-Edges", alg: "R2 D (R' U2 R) D' (R' U2 R')", setup: "R U2 R' D R' U2 R D' R2" },
  { id: 8, chunk: 2, ollNo: 45, name: "T", group: "T-Shapes", alg: "F (R U R' U') F'", setup: "F U R U' R' F'" },
  { id: 9, chunk: 2, ollNo: 33, name: "OLL 33 (T-Shape)", group: "T-Shapes", alg: "(R U R' U') (R' F R F')", setup: "F R' F' R U R U' R'" },
  { id: 10, chunk: 2, ollNo: 6, name: "OLL 6 (Square)", group: "Squares", alg: "r U2 R' U' R U' r'", setup: "r U R' U R U2' r'" },
  { id: 11, chunk: 2, ollNo: 5, name: "OLL 5 (Square)", group: "Squares", alg: "r' U2' R U R' U r", setup: "r' U' R U' R' U2 r" },
  { id: 12, chunk: 2, ollNo: 28, name: "Arrow", group: "Solved Corners", alg: "(r U R' U') M (U R U' R')", setup: "R U R' U' M' U R U' r'" },
  { id: 13, chunk: 2, ollNo: 57, name: "H", group: "Solved Corners", alg: "(R U R' U') M' (U R U' r')", setup: "r U R' U' M U R U' R'" },
  { id: 14, chunk: 3, ollNo: 7, name: "OLL 7 (Lightning)", group: "Lightning Bolts", alg: "r U R' U R U2' r'", setup: "r U2 R' U' R U' r'" },
  { id: 15, chunk: 3, ollNo: 11, name: "OLL 11 (Lightning)", group: "Lightning Bolts", alg: "r' (R2 U R' U R U2 R') U M'", setup: "M U' R U2 R' U' R U' R2' r" },
  { id: 16, chunk: 3, ollNo: 39, name: "OLL 39 (Big Lightning)", group: "Lightning Bolts", alg: "R' F (R U R' U') F' U R", setup: "R' U' F U R U' R' F' R" },
  { id: 17, chunk: 3, ollNo: 8, name: "OLL 8 (Lightning)", group: "Lightning Bolts", alg: "r' U' R U' R' U2 r", setup: "r' U2' R U R' U r" },
  { id: 18, chunk: 3, ollNo: 12, name: "OLL 12 (Lightning)", group: "Lightning Bolts", alg: "M' (R' U' R U' R' U2 R) U' M", setup: "M' U R' U2 R U R' U R M" },
  { id: 19, chunk: 3, ollNo: 40, name: "OLL 40 (Big Lightning)", group: "Lightning Bolts", alg: "L F' (L' U' L U) F U' L'", setup: "L U F' U' L' U L F L'" },
  { id: 20, chunk: 4, ollNo: 44, name: "OLL 44 (P-Shape)", group: "P-Shapes", alg: "f (R U R' U') f'", setup: "f U R U' R' f'" },
  { id: 21, chunk: 4, ollNo: 43, name: "OLL 43 (P-Shape)", group: "P-Shapes", alg: "f' (L' U' L U) f", setup: "f' U' L' U L f" },
  { id: 22, chunk: 4, ollNo: 31, name: "OLL 31 (P-Shape)", group: "P-Shapes", alg: "R' U' F (U R U' R') F' R", setup: "R' F R U R' U' F' U R" },
  { id: 23, chunk: 4, ollNo: 32, name: "OLL 32 (P-Shape)", group: "P-Shapes", alg: "R U B' (U' R' U) R B R'", setup: "R B' R' U' R U B U' R'" },
  { id: 24, chunk: 4, ollNo: 46, name: "OLL 46 (C-Shape)", group: "C-Shapes", alg: "R' U' (R' F R F') U R", setup: "R' U' F R' F' R U R" },
  { id: 25, chunk: 4, ollNo: 34, name: "OLL 34 (C-Shape)", group: "C-Shapes", alg: "(R U R' U') B' (R' F R F') B", setup: "B' F R' F' R B U R U' R'" },
  { id: 26, chunk: 5, ollNo: 37, name: "OLL 37 (Fish)", group: "Fishes", alg: "F (R U' R' U') (R U R' F')", setup: "F R U' R' U R U R' F'" },
  { id: 27, chunk: 5, ollNo: 35, name: "OLL 35 (Fish)", group: "Fishes", alg: "(R U2') (R2' F R F') (R U2' R')", setup: "R U2 R' F R' F' R2 U2 R'" },
  { id: 28, chunk: 5, ollNo: 9, name: "OLL 9 (Fish)", group: "Fishes", alg: "(R U R' U') R' F (R2 U R' U') F'", setup: "F U R U' R2' F' R U R U' R'" },
  { id: 29, chunk: 5, ollNo: 10, name: "OLL 10 (Fish)", group: "Fishes", alg: "(R U R' U) (R' F R F') (R U2' R')", setup: "R U2 R' F R' F' R U' R U' R'" },
  { id: 30, chunk: 5, ollNo: 36, name: "OLL 36 (W-Shape)", group: "W-Shapes", alg: "(R U R' U) (R U' R' U') (R' F R F')", setup: "F R' F' R U R U R' U' R U' R'" },
  { id: 31, chunk: 5, ollNo: 38, name: "OLL 38 (W-Shape)", group: "W-Shapes", alg: "(R' U' R U') (R' U R U) l U' R' U x", setup: "x' U' R U l' U' R' U' R U R' U R" },
  { id: 32, chunk: 6, ollNo: 48, name: "OLL 48 (L-Shape)", group: "L-Shapes", alg: "F (R U R' U') (R U R' U') F'", setup: "F U R U' R' U R U' R' F'" },
  { id: 33, chunk: 6, ollNo: 47, name: "OLL 47 (L-Shape)", group: "L-Shapes", alg: "R' U' (R' F R F') (R' F R F') U R", setup: "R' U' F R' F' R F R' F' R U R" },
  { id: 34, chunk: 6, ollNo: 53, name: "OLL 53 (L-Shape)", group: "L-Shapes", alg: "(r' U' R U') (R' U R U') R' U2 r", setup: "r' U2' R U R' U' R U R' U r" },
  { id: 35, chunk: 6, ollNo: 54, name: "OLL 54 (L-Shape)", group: "L-Shapes", alg: "(r U R' U) (R U' R' U) R U2' r'", setup: "r U2 R' U' R U R' U' R U' r'" },
  { id: 36, chunk: 6, ollNo: 50, name: "OLL 50 (L-Shape)", group: "L-Shapes", alg: "r' U r2 U' r2' U' r2 U r'", setup: "r U' r2' U r2 U r2' U' r" },
  { id: 37, chunk: 6, ollNo: 49, name: "OLL 49 (L-Shape)", group: "L-Shapes", alg: "r U' r2' U r2 U r2' U' r", setup: "r' U r2 U' r2' U' r2 U r'" },
  { id: 38, chunk: 7, ollNo: 51, name: "OLL 51 (Line)", group: "Lines", alg: "f (R U R' U') (R U R' U') f'", setup: "f U R U' R' U R U' R' f'" },
  { id: 39, chunk: 7, ollNo: 52, name: "OLL 52 (Line)", group: "Lines", alg: "(R U R' U R U') y (R U' R') F'", setup: "F R U R' y' U R' U' R U' R'" },
  { id: 40, chunk: 7, ollNo: 56, name: "OLL 56 (Line)", group: "Lines", alg: "r U r' (U R U' R') (U R U' R') r U' r'", setup: "r U r' U R U' R' U R U' R' r U' r'" },
  { id: 41, chunk: 7, ollNo: 55, name: "OLL 55 (Line)", group: "Lines", alg: "R U2 R2 (U' R U' R') U2 F R F'", setup: "F R' F' U2 R U R' U R2 U2' R'" },
  { id: 42, chunk: 7, ollNo: 15, name: "OLL 15 (Knight Move)", group: "Knight Moves", alg: "(r' U' r) (R' U' R U) (r' U r)", setup: "r' U' r U' R' U R r' U r" },
  { id: 43, chunk: 7, ollNo: 13, name: "OLL 13 (Knight Move)", group: "Knight Moves", alg: "F U R U' R2' F' R U (R U' R')", setup: "R U R' U' R' F R2 U R' U' F'" },
  { id: 44, chunk: 8, ollNo: 16, name: "OLL 16 (Knight Move)", group: "Knight Moves", alg: "(r U r') (R U R' U') (r U' r')", setup: "r U r' U R U' R' r U' r'" },
  { id: 45, chunk: 8, ollNo: 14, name: "OLL 14 (Knight Move)", group: "Knight Moves", alg: "(R' F R) (U R' F' R) (F U' F')", setup: "F U F' R' F R U' R' F' R" },
  { id: 46, chunk: 8, ollNo: 41, name: "OLL 41 (Awkward)", group: "Awkward Shapes", alg: "(R U R' U R U2' R') F (R U R' U') F'", setup: "F U R U' R' F' R U2 R' U' R U' R'" },
  { id: 47, chunk: 8, ollNo: 42, name: "OLL 42 (Awkward)", group: "Awkward Shapes", alg: "(R' U' R U' R' U2 R) F (R U R' U') F'", setup: "F U R U' R' F' R' U2' R U R' U R" },
  { id: 48, chunk: 8, ollNo: 29, name: "OLL 29 (Awkward)", group: "Awkward Shapes", alg: "r2 D' (r U r') D r2 (U' r' U' r)", setup: "r' U r U r2' D' r U' r' D r2" },
  { id: 49, chunk: 8, ollNo: 30, name: "OLL 30 (Awkward)", group: "Awkward Shapes", alg: "F U (R U2 R' U') (R U2 R' U') F'", setup: "F U R U2' R' U R U2' R' U' F'" },
  { id: 50, chunk: 9, ollNo: 1, name: "OLL 1 (Dot)", group: "Dot-cases", alg: "(R U2') (R2' F R F') U2' (R' F R F')", setup: "F R' F' R U2 F R' F' R2 U2 R'" },
  { id: 51, chunk: 9, ollNo: 17, name: "OLL 17 (Dot)", group: "Dot-cases", alg: "(R U R' U) (R' F R F') U2' (R' F R F')", setup: "F R' F' R U2 F R' F' R U' R U' R'" },
  { id: 52, chunk: 9, ollNo: 19, name: "OLL 19 (Dot)", group: "Dot-cases", alg: "M U (R U R' U') M' (R' F R F')", setup: "F R' F' R M U R U' R' U' M'" },
  { id: 53, chunk: 9, ollNo: 3, name: "OLL 3 (Dot)", group: "Dot-cases", alg: "f (R U R' U') f' U' F (R U R' U') F'", setup: "F U R U' R' F' U f U R U' R' f'" },
  { id: 54, chunk: 9, ollNo: 2, name: "OLL 2 (Dot)", group: "Dot-cases", alg: "F (R U R' U') F' f (R U R' U') f'", setup: "f U R U' R' f' F U R U' R' F'" },
  { id: 55, chunk: 9, ollNo: 20, name: "OLL 20 (Dot)", group: "Dot-cases", alg: "M U (R U R' U') M2' (U R U' r')", setup: "r U R' U' M2 U R U' R' U' M'" },
  { id: 56, chunk: 9, ollNo: 18, name: "OLL 18 (Dot)", group: "Dot-cases", alg: "(r U R' U R U2 r') (r' U' R U' R' U2 r)", setup: "r' U2' R U R' U r r U2 R' U' R U' r'" },
  { id: 57, chunk: 9, ollNo: 4, name: "OLL 4 (Dot)", group: "Dot-cases", alg: "f (R U R' U') f' U F (R U R' U') F'", setup: "F U R U' R' F' U' f U R U' R' f'" }
];

// All 41 Standard F2L Cases
// Orientation: White on Bottom (D) • Orange in Front (F) • Front-Right Target Slot (Orange-Blue-White)
const F2L_DATA = [
  { id: 1, chunk: 1, f2lNo: 1, name: "F2L 1 (Right Insert)", group: "Basic Inserts", alg: "U (R U' R')", setup: "R U R' U'", step1: "Open the front-right slot with U so the corner clears.", step2: "Pair with the matching edge in back and drop straight in." },
  { id: 2, chunk: 1, f2lNo: 2, name: "F2L 2 (Left/Front Insert)", group: "Basic Inserts", alg: "y' U' (R' U R)", setup: "R' U' R U y", step1: "Rotate y' so the target slot moves to Front-Left.", step2: "Open the slot with U' and insert the joined pair cleanly." },
  { id: 3, chunk: 1, f2lNo: 3, name: "F2L 3 (Back-Left Pair)", group: "Basic Inserts", alg: "y' (R' U' R)", setup: "R' U R y", step1: "Rotate y' to bring the joined pair above the slot.", step2: "Drop the pre-paired block directly into the bottom slot." },
  { id: 4, chunk: 1, f2lNo: 4, name: "F2L 4 (Direct Right Drop)", group: "Basic Inserts", alg: "(R U R')", setup: "R U' R'", step1: "Corner and edge are already joined above Front-Right.", step2: "Execute a 3-move R U R' trigger to seat the pair." },

  { id: 5, chunk: 2, f2lNo: 5, name: "F2L 5 (Same Top • Split)", group: "Top: Same Color", alg: "(U' R U R') U2 (R U' R')", setup: "R U R' U2 R U' R' U", step1: "Hide the corner in back while shifting the edge across.", step2: "Bring the corner back up paired, then insert with R U' R'." },
  { id: 6, chunk: 2, f2lNo: 6, name: "F2L 6 (Same Top • Mirror)", group: "Top: Same Color", alg: "d (R' U' R) U2' (R' U R)", setup: "R' U' R U2 R' U R d'", step1: "Use d (wide U) to position the slot without an extra rotation.", step2: "Separate, pair the matching top stickers, and insert." },
  { id: 7, chunk: 2, f2lNo: 7, name: "F2L 7 (Far Edge • Right)", group: "Top: Same Color", alg: "(U' R U2' R') U2 (R U' R')", setup: "R U R' U2 R U2 R' U", step1: "Lift the corner and sweep the edge U2' into alignment.", step2: "Re-pair on the top layer and drop into Front-Right." },
  { id: 8, chunk: 2, f2lNo: 8, name: "F2L 8 (Far Edge • Mirror)", group: "Top: Same Color", alg: "d (R' U2 R) U2' (R' U R)", setup: "R' U' R U2 R' U2 R d'", step1: "Wide-turn d aligns the back-left slot for pairing.", step2: "Swing the edge U2 to join the corner and insert." },
  { id: 9, chunk: 2, f2lNo: 9, name: "F2L 9 (Adjacent • Back)", group: "Top: Same Color", alg: "d (R' U' R) U' (R' U' R)", setup: "R' U R U R' U R d'", step1: "Rotate top two layers (d) and tuck the corner down.", step2: "Slide the adjacent edge over and insert together." },
  { id: 10, chunk: 2, f2lNo: 10, name: "F2L 10 (Adjacent • Right)", group: "Top: Same Color", alg: "(U' R U R') U (R U R')", setup: "R U' R' U' R U' R' U", step1: "Hide corner in the Front-Right slot while moving edge.", step2: "Pop the corner back up joined and insert with R U R'." },

  { id: 11, chunk: 3, f2lNo: 11, name: "F2L 11 (Opposite • Split)", group: "Top: Opposite Colors", alg: "(U' R U2' R') U (F' U' F)", setup: "F' U F U' R U2 R' U", step1: "Lift corner and send edge across with U2' to pair.", step2: "Insert the newly formed pair cleanly via F' U' F." },
  { id: 12, chunk: 3, f2lNo: 12, name: "F2L 12 (Opposite • Sweep)", group: "Top: Opposite Colors", alg: "(R U' R') U2 (F' U' F)", setup: "F' U F U2 R U R'", step1: "Hide the corner in Front-Right while sweeping edge U2.", step2: "Pair opposite top stickers and insert via F' U' F." },
  { id: 13, chunk: 3, f2lNo: 13, name: "F2L 13 (Opposite • Rotated)", group: "Top: Opposite Colors", alg: "y' U (R' U R) U' (R' U' R)", setup: "R' U R U R' U' R U' y", step1: "Rotate y' to bring the target slot to Front-Left.", step2: "Separate the awkward pair and insert with R' U' R." },
  { id: 14, chunk: 3, f2lNo: 14, name: "F2L 14 (Opposite • Direct)", group: "Top: Opposite Colors", alg: "(U' R U' R') U (R U R')", setup: "R U' R' U' R U R' U", step1: "Tuck corner with U' R U' R' to clear the edge path.", step2: "Bring the pair together with U and drop with R U R'." },
  { id: 15, chunk: 3, f2lNo: 15, name: "F2L 15 (Connected • Flip)", group: "Top: Opposite Colors", alg: "(R U R') U2 (R U' R' U) (R U' R')", setup: "R U R' U' R U R' U2 R U' R'", step1: "Lift the connected pair and break it apart with U2.", step2: "Re-pair properly on the right side and insert." },
  { id: 16, chunk: 3, f2lNo: 16, name: "F2L 16 (Connected • Sledge)", group: "Top: Opposite Colors", alg: "(R U' R') U2 (F' U' F)", setup: "F' U F U2 R U R'", step1: "Split the misoriented pair by hiding the corner down.", step2: "Align the edge across and finish with F' U' F." },

  { id: 17, chunk: 4, f2lNo: 17, name: "F2L 17 (White Up • Right)", group: "Top: White Up", alg: "(R U2 R') U' (R U R')", setup: "R U' R' U R U2 R'", step1: "Place edge at back-left, then swing corner over it with R U2 R'.", step2: "The pair forms automatically—insert with R U R'." },
  { id: 18, chunk: 4, f2lNo: 18, name: "F2L 18 (White Up • Left)", group: "Top: White Up", alg: "y' (R' U2 R) U (R' U' R)", setup: "R' U R U' R' U2 R y", step1: "Rotate y' and match the edge over the back-right center.", step2: "Swing the white-up corner onto the edge and insert." },
  { id: 19, chunk: 4, f2lNo: 19, name: "F2L 19 (White Up • Far R)", group: "Top: White Up", alg: "U (R U2 R') U (R U' R')", setup: "R U R' U' R U2 R' U'", step1: "Offset U so the corner lands directly onto the edge.", step2: "Execute R U2 R' to pair, then U R U' R' to seat." },
  { id: 20, chunk: 4, f2lNo: 20, name: "F2L 20 (White Up • Far L)", group: "Top: White Up", alg: "y' U' (R' U2 R) U' (R' U R)", setup: "R' U' R U R' U2 R U y", step1: "Rotate y', offset U', and swing corner onto edge.", step2: "Finish with a smooth U' R' U R left-hand insert." },
  { id: 21, chunk: 4, f2lNo: 21, name: "F2L 21 (White Up • Double)", group: "Top: White Up", alg: "U2 (R U R' U) (R U' R')", setup: "R U R' U' R U' R' U2", step1: "U2 aligns the corner above the empty slot.", step2: "Lift, pair in one fluid motion, and drop into Front-Right." },
  { id: 22, chunk: 4, f2lNo: 22, name: "F2L 22 (White Up • Back)", group: "Top: White Up", alg: "F' L' U2 L F", setup: "F' L' U2 L F", step1: "Use F' to bring the slot up to meet the back edge.", step2: "U2 joins the pair cleanly before restoring F." },
  { id: 23, chunk: 4, f2lNo: 23, name: "F2L 23 (White Up • Stack)", group: "Top: White Up", alg: "U2 R2 U2 (R' U' R U') R2", setup: "R2 U R' U R U2 R2 U2", step1: "Double-turn R2 pairs the stacked pieces in the back.", step2: "U' aligns the block and R2 drops it straight home." },
  { id: 24, chunk: 4, f2lNo: 24, name: "F2L 24 (White Up • Sledge)", group: "Top: White Up", alg: "(F U R U' R' F') (R U' R')", setup: "R U R' F R U R' U' F'", step1: "F U R U' R' F' orients and pairs the pieces on top.", step2: "Finish immediately with R U' R' into Front-Right." },

  { id: 25, chunk: 5, f2lNo: 25, name: "F2L 25 (Corner In • Free)", group: "Corner in Bottom", alg: "U' (R' F R F') (R U R')", setup: "R U' R' F R' F' R U", step1: "Use a quick Sledgehammer (R' F R F') to free & pair.", step2: "Insert the newly joined pair with R U R'." },
  { id: 26, chunk: 5, f2lNo: 26, name: "F2L 26 (Corner In • Sexy)", group: "Corner in Bottom", alg: "U (R U' R') (F' U' F)", setup: "F' U F R U R' U'", step1: "Extract the solved corner while pairing with the top edge.", step2: "Drop the pair cleanly into the front via F' U' F." },
  { id: 27, chunk: 5, f2lNo: 27, name: "F2L 27 (Twist Right • 1)", group: "Corner in Bottom", alg: "(R U' R' U) (R U' R')", setup: "R U R' U' R U R'", step1: "Pop the twisted corner out with R U' R'.", step2: "Re-align with U and insert cleanly with R U' R'." },
  { id: 28, chunk: 5, f2lNo: 28, name: "F2L 28 (Twist Front • 1)", group: "Corner in Bottom", alg: "(R U R' U') (R U R')", setup: "R U' R' U R U' R'", step1: "Execute Sexy Move (R U R' U') to lift & pair.", step2: "Finish with R U R' to seat the corner flat." },
  { id: 29, chunk: 5, f2lNo: 29, name: "F2L 29 (Twist Front • 2)", group: "Corner in Bottom", alg: "(R' F R F') (R' F R F')", setup: "F R' F' R F R' F' R", step1: "First Sledgehammer extracts the twisted corner.", step2: "Second Sledgehammer pairs and seats it zero-regrip." },
  { id: 30, chunk: 5, f2lNo: 30, name: "F2L 30 (Twist Right • 2)", group: "Corner in Bottom", alg: "(R U R' U') (R U R')", setup: "R U' R' U R U' R'", step1: "Lift the corner out while holding the edge in place.", step2: "Drop the united pair straight back into Front-Right." },

  { id: 31, chunk: 6, f2lNo: 31, name: "F2L 31 (Edge In • Flip)", group: "Edge in Middle / Both In", alg: "(U' R' F R F') (R U' R')", setup: "R U R' F R' F' R U", step1: "Sledgehammer pops the trapped edge out and flips it.", step2: "Pair immediately with the top corner and insert." },
  { id: 32, chunk: 6, f2lNo: 32, name: "F2L 32 (Edge In • Triple)", group: "Edge in Middle / Both In", alg: "(R U R' U') (R U R' U') (R U R')", setup: "R U' R' U R U' R' U R U' R'", step1: "Two Sexy Moves cycle the trapped edge out cleanly.", step2: "Finish with R U R' into the Front-Right slot." },
  { id: 33, chunk: 6, f2lNo: 33, name: "F2L 33 (Edge In • Right)", group: "Edge in Middle / Both In", alg: "(U' R U' R') U2 (R U' R')", setup: "R U R' U2 R U R' U", step1: "Extract the middle-layer edge alongside the corner.", step2: "U2 aligns the pair for a fast R U' R' insertion." },
  { id: 34, chunk: 6, f2lNo: 34, name: "F2L 34 (Edge In • Left)", group: "Edge in Middle / Both In", alg: "(U R U R') U2 (R U R')", setup: "R U' R' U2 R U' R' U'", step1: "Bring the corner down to meet the trapped edge.", step2: "Swing U2 and insert together with R U R'." },
  { id: 35, chunk: 6, f2lNo: 35, name: "F2L 35 (Edge In • Sledge)", group: "Edge in Middle / Both In", alg: "(U' R U R') U (F' U' F)", setup: "F' U F U' R U' R' U", step1: "Lift the edge out while positioning the corner on top.", step2: "Insert the joined pair smoothly via F' U' F." },
  { id: 36, chunk: 6, f2lNo: 36, name: "F2L 36 (Edge In • Back)", group: "Edge in Middle / Both In", alg: "(U2 R' F R F') U2 (R U R')", setup: "R U' R' U2 F R' F' R U2", step1: "U2 sets up a Sledgehammer to free the flipped edge.", step2: "U2 realigns the pair for a crisp R U R' finish." },
  { id: 37, chunk: 6, f2lNo: 37, name: "F2L 37 (Triple Sexy)", group: "Edge in Middle / Both In", alg: "(R U' R') d (R' U2 R) U2' (R' U R)", setup: "R' U' R U2 R' U2 R d' R U R'", step1: "Extract both trapped pieces with R U' R' d.", step2: "Pair on the back-left with R' U2 R and insert." },
  { id: 38, chunk: 6, f2lNo: 38, name: "F2L 38 (Both In • Right)", group: "Edge in Middle / Both In", alg: "(R U' R' U') (R U R') U2 (R U' R')", setup: "R U R' U2 R U' R' U R U R'", step1: "Pull both pieces out of the slot together.", step2: "Separate with U2 and insert cleanly with R U' R'." },
  { id: 39, chunk: 6, f2lNo: 39, name: "F2L 39 (Both In • Front)", group: "Edge in Middle / Both In", alg: "(R U' R' U) (R U2' R') U (R U' R')", setup: "R U R' U' R U2 R' U' R U R'", step1: "Lift the trapped pair and swing the corner U2'.", step2: "Drop the united pair straight into Front-Right." },
  { id: 40, chunk: 6, f2lNo: 40, name: "F2L 40 (Both In • Flip R)", group: "Edge in Middle / Both In", alg: "(R U' R') F' L' U2 L F", setup: "F' L' U2 L F R U R'", step1: "Extract the corner with R U' R'.", step2: "Use F' L' U2 L F to flip the edge and insert." },
  { id: 41, chunk: 6, f2lNo: 41, name: "F2L 41 (Both In • Flip F)", group: "Edge in Middle / Both In", alg: "(R U R' U') (R U' R') U2 (F' U' F)", setup: "F' U F U2 R U R' U R U' R'", step1: "Sexy Move extracts both pieces cleanly to top.", step2: "U2 pairs them and F' U' F seats the slot." }
];

const DEFAULT_CHUNKS = [
  { id: 1, title: "Chunk 1: Oriented-Edges", caseIds: [1, 2, 3, 4, 5, 6, 7] },
  { id: 2, title: "Chunk 2: T-Shapes & Squares", caseIds: [8, 9, 10, 11, 12, 13] },
  { id: 3, title: "Chunk 3: Lightning Bolts", caseIds: [14, 15, 16, 17, 18, 19] },
  { id: 4, title: "Chunk 4: P-Shapes & C-Shapes", caseIds: [20, 21, 22, 23, 24, 25] },
  { id: 5, title: "Chunk 5: Fishes & W-Shapes", caseIds: [26, 27, 28, 29, 30, 31] },
  { id: 6, title: "Chunk 6: L-Shapes", caseIds: [32, 33, 34, 35, 36, 37] },
  { id: 7, title: "Chunk 7: Lines & Knights", caseIds: [38, 39, 40, 41, 42, 43] },
  { id: 8, title: "Chunk 8: Knights & Awkward", caseIds: [44, 45, 46, 47, 48, 49] },
  { id: 9, title: "Chunk 9: Dot-cases", caseIds: [50, 51, 52, 53, 54, 55, 56, 57] }
];

const F2L_DEFAULT_CHUNKS = [
  { id: 101, title: "Chunk 1: Basic Inserts", caseIds: [1, 2, 3, 4] },
  { id: 102, title: "Chunk 2: Top Same Color", caseIds: [5, 6, 7, 8, 9, 10] },
  { id: 103, title: "Chunk 3: Top Opposite Colors", caseIds: [11, 12, 13, 14, 15, 16] },
  { id: 104, title: "Chunk 4: Top White Facing Up", caseIds: [17, 18, 19, 20, 21, 22, 23, 24] },
  { id: 105, title: "Chunk 5: Corner in Bottom", caseIds: [25, 26, 27, 28, 29, 30] },
  { id: 106, title: "Chunk 6: Edge / Both Trapped", caseIds: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41] }
];

const FINGERTRICK_GUIDES = {
  1: {
    grip: "Standard Home Grip",
    regrips: "0 Regrips",
    triggers: [
      { moves: "R U R'", label: "Sune Opener", tip: "Right wrist turns R up, right index flicks U forward, right wrist pulls R' down. Keep your right thumb anchored on the front face." },
      { moves: "U", label: "Setup Flick", tip: "Use your right index finger (or left index push) without lifting your right hand off the R layer." },
      { moves: "R U2' R'", label: "Double-Flick Finisher", tip: "Right wrist turns R up, execute a crisp left-hand U2' double flick (index then middle), then pull R' down." }
    ],
    coachNote: "Do not regrip between the U turns! Let your index finger spring back quickly so the entire 7-move algorithm flows as one continuous reflex."
  },
  default: {
    grip: "Right Thumb on Front (F)",
    regrips: "0–1 Regrips",
    triggers: [
      { moves: "R U R' U'", label: "Sexy Move Trigger", tip: "Turn R with wrist, flick U with right index, pull R' down, and push U' with left index finger." },
      { moves: "R' F R F'", label: "Sledgehammer", tip: "Pull R' down, push F with right index or thumb, turn R up, and flick F' with left index." }
    ],
    coachNote: "Group moves into 4-move triggers rather than individual turns. Keep your elbows relaxed and minimize regrips."
  }
};

const F2L_FINGERTRICK_GUIDES = {
  default: {
    grip: "Right Thumb on Front (Orange)",
    regrips: "0 Regrips (Rotate y/y' cleanly)",
    triggers: [
      { moves: "R U' R'", label: "Right Hedge Insert", tip: "Lift R with wrist, push U' with left index finger without regripping, and pull R' straight down." },
      { moves: "y' R' U R", label: "Rotated Left Insert", tip: "Regrip whole cube y' (turn cube CCW on U axis), pull R' down, flick U with right index, and lift R." }
    ],
    coachNote: "Keep White glued to the bottom face during every y / y' rotation so you never lose your cross reference."
  }
};

const NOTATION_TABS = {
  SINGLE: [
    { move: "U", desc: "Top layer clockwise" },
    { move: "U'", desc: "Top layer counter-clockwise" },
    { move: "U2", desc: "Top layer 180 degrees" },
    { move: "R / R'", desc: "Right layer up / down" },
    { move: "F / F'", desc: "Front layer clockwise / CCW" }
  ],
  SLICE: [
    { move: "M'", desc: "Middle slice upwards (follows R)" },
    { move: "M", desc: "Middle slice downwards (follows L)" },
    { move: "M2", desc: "Middle slice 180 degrees" }
  ],
  WHOLE: [
    { move: "x / x'", desc: "Rotate whole cube on R axis" },
    { move: "y / y'", desc: "Rotate whole cube on U axis" },
    { move: "z / z'", desc: "Rotate whole cube on F axis" }
  ],
  WIDE: [
    { move: "r / r'", desc: "Right 2 layers together" },
    { move: "f / f'", desc: "Front 2 layers together" },
    { move: "d / d'", desc: "Bottom 2 layers together" }
  ]
};

const CROSS_SCRAMBLES = {
  1: ["U L2", "F2 D'", "R' D2", "L D'", "U' R2", "B2 D"],
  2: ["U R2 F'", "L' U2 B", "F R' D'", "U2 L F2", "B' U R2", "R U' F2"],
  3: ["R U' F2 D'", "L' B U2 R", "F' U2 L' D", "B R' U2 F'", "U R' F' D2", "L U B2 D'"],
  4: ["R' F U2 L' D", "F U' R2 B D'", "L B' U2 R' F", "U2 F' R L' D2", "B' L U' F2 R", "R U2 B' L' D"],
  5: ["F R' U2 L B' D", "R' U' F2 L' B D2", "L F' U2 R' B' D'", "U' B R' F2 L D2", "B' R U' F' L2 D", "R L' F2 U' B' D2"]
};

const MECHANICS_LIST = [
  { id: 1, title: "The Free Drop", step: "1 Turn", desc: "When a white edge sits in the top layer with its white sticker facing outward, align its side color with its center and drop it straight down with a 180-degree face turn (F2, R2, L2, or B2).", tip: "Always check for free drops first during your 15-second inspection." },
  { id: 2, title: "The Flipped Edge", step: "3 Moves", desc: "When a white edge is seated on the bottom layer with white facing outward (a bad edge), bring it to the middle slice (F or R'), move it into an open slot on D (D' or D), and restore the disturbed edge.", tip: "Look for bright white side stickers on the D-layer—they are high-priority fixes." },
  { id: 3, title: "Keyhole / D-Offset", step: "D' -> Drop -> D", desc: "Instead of aligning the top layer to a rigid bottom cross, rotate the entire D-layer (D or D') to bring the open target slot underneath a ready edge, drop it in, then realign D at the end.", tip: "Rotating D is much faster than performing extra U and F turns." },
  { id: 4, title: "Cross Preservation", step: "Setup & Restore", desc: "Before inserting a tricky edge that would knock out an already-solved cross piece, either offset the D-layer out of the way or immediately follow the insertion with a single restoring turn.", tip: "Never break a solved edge without a planned 1-move restoration." }
];

const AUF_VARIATIONS = [
  { pre: "", post: "" },
  { pre: "U ", post: "" },
  { pre: "U' ", post: "" },
  { pre: "U2 ", post: "" },
  { pre: "", post: " U" },
  { pre: "", post: " U'" },
  { pre: "", post: " U2" },
  { pre: "U ", post: " U'" },
  { pre: "U' ", post: " U" },
  { pre: "U2 ", post: " U" }
];

const F2L_REALISTIC_JUNK = [
  "L' U' L U",
  "L' U L U'",
  "B U B' U'",
  "L' U2 L U2",
  "L' U' L U B U' B'",
  "B U2 B' U2"
];

const STORAGE_KEY = 'ollday_users_v2';
const FIRESTORE_URL = (typeof window !== 'undefined' && window.__VITE_FIRESTORE_URL) || 'https://firestore.googleapis.com/v1/projects/olldayeveryday/databases/(default)/documents/app_data/family_sync?key=AIzaSyBFWgmB1DgBDrfTWCMLSNS6ovS2XeMjAcU';

const defaultUsers = {
  "1678": { pin: "1678", name: "Me", role: "admin", day: 1, f2lDay: 1, stats: {}, f2lStats: {}, targetGoal: 2.50, timerEnabled: true, fingertricksEnabled: true, chunkSize: 7, customChunks: DEFAULT_CHUNKS, f2lCustomChunks: F2L_DEFAULT_CHUNKS, hasSeenOnboarding: false },
  "8995": { pin: "8995", name: "Dad", role: "user", day: 1, f2lDay: 1, stats: {}, f2lStats: {}, targetGoal: 4.00, timerEnabled: true, fingertricksEnabled: true, chunkSize: 5, customChunks: DEFAULT_CHUNKS, f2lCustomChunks: F2L_DEFAULT_CHUNKS, hasSeenOnboarding: false },
  "0713": { pin: "0713", name: "Ephraim", role: "user", day: 1, f2lDay: 1, stats: {}, f2lStats: {}, targetGoal: 3.50, timerEnabled: true, fingertricksEnabled: true, chunkSize: 5, customChunks: DEFAULT_CHUNKS, f2lCustomChunks: F2L_DEFAULT_CHUNKS, hasSeenOnboarding: false },
  "0494": { pin: "0494", name: "Victor", role: "user", day: 1, f2lDay: 1, stats: {}, f2lStats: {}, targetGoal: 3.50, timerEnabled: true, fingertricksEnabled: true, chunkSize: 3, customChunks: DEFAULT_CHUNKS, f2lCustomChunks: F2L_DEFAULT_CHUNKS, hasSeenOnboarding: false }
};

function generateSchedule(chunks, phaseLabel = "OLL", allCases = OLL_DATA) {
  const fallback = phaseLabel === "F2L" ? F2L_DEFAULT_CHUNKS : DEFAULT_CHUNKS;
  const list = chunks && chunks.length > 0 ? chunks : fallback;
  const schedule = [];
  list.forEach((chk, idx) => {
    schedule.push({ mode: 'learn', title: `Learn: ${chk.title}`, desc: phaseLabel === "F2L" ? "Follow the 2-step intuitive breakdown until pairing and insertion feel effortless." : "Time to acquire fresh muscle memory. Drill each trigger until the pattern snaps naturally.", caseIds: chk.caseIds, chunkIdx: idx });
    schedule.push({ mode: 'drill', title: `Drill: ${chk.title}`, desc: "Speed execution and recognition drills. Aim below your target execution goal.", caseIds: chk.caseIds, chunkIdx: idx });
    schedule.push({ mode: 'review', title: `Refine: ${chk.title}`, desc: "Mixed-order recognition and clean fingertrick flow.", caseIds: chk.caseIds, chunkIdx: idx });
    if ((idx + 1) % 2 === 0) {
      const prev = list[idx - 1];
      schedule.push({ mode: 'review', title: `Cumulative Review: Chunks ${idx} & ${idx + 1}`, desc: "Mixed recognition across both recent chunks.", caseIds: [...prev.caseIds, ...chk.caseIds], chunkIdx: idx });
    }
  });
  schedule.push({ mode: 'review', title: `Grand Finale: All ${allCases.length} ${phaseLabel} Cases`, desc: `Full ${phaseLabel} mastery gauntlet across every category.`, caseIds: allCases.map((c) => c.id), chunkIdx: 0 });
  return schedule;
}

const getF2LImageUrl = (alg) =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=f2l&bg=t&fc=yyyyyybbbbboooooowwwwwwggggggrrrrrr&r=y-35x-25&case=${encodeURIComponent(alg)}`;

const getOLLImageUrl = (alg) =>
  `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=oll&view=plan&bg=t&case=${encodeURIComponent(alg)}`;

export default function App() {
  // =========================================================================
  // 1. PERSISTENT PROFILE & CLOUD SYNC STATE
  // =========================================================================
  const [users, setUsers] = useState(() => {
    if (typeof window === 'undefined') return defaultUsers;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultUsers;
    } catch {
      return defaultUsers;
    }
  });
  const [activePin, setActivePin] = useState("1678");
  const currentUser = users[activePin] || users["1678"];
  const [syncStatus, setSyncStatus] = useState('synced');
  const [toastMsg, setToastMsg] = useState(null);

  // Navigation & View States
  const [currentPhase, setCurrentPhase] = useState('f2l');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cross Phase States
  const [crossTab, setCrossTab] = useState('ladder');
  const [crossTier, setCrossTier] = useState(1);
  const [crossMode, setCrossMode] = useState('efficiency');
  const [crossScrambleIdx, setCrossScrambleIdx] = useState(0);
  const [diagramView, setDiagramView] = useState('scrambled');
  const [userMoves, setUserMoves] = useState(2);
  const [efficiencyFeedback, setEfficiencyFeedback] = useState(null);
  const [optimalCrossCount, setOptimalCrossCount] = useState(0);
  const [activeMechanic, setActiveMechanic] = useState(1);

  // WCA Blind Inspection States
  const [blindState, setBlindState] = useState('idle');
  const [inspectionTime, setInspectionTime] = useState(15.0);
  const [blindExecTime, setBlindExecTime] = useState(0.0);
  const [blindRuns, setBlindRuns] = useState({ clean: 0, total: 0 });
  const [showBlindGuide, setShowBlindGuide] = useState(true);
  const [showEyesClosedGuide, setShowEyesClosedGuide] = useState(true);
  const [eyesClosedStreak, setEyesClosedStreak] = useState(0);
  const [leftPadHeld, setLeftPadHeld] = useState(false);
  const [rightPadHeld, setRightPadHeld] = useState(false);
  const wcaIntervalRef = useRef(null);
  const execIntervalRef = useRef(null);
  const padHoldTimeoutRef = useRef(null);

  // F2L Phase States
  const [f2lTab, setF2lTab] = useState('grind');
  const [f2lLibraryMode, setF2lLibraryMode] = useState('standard');
  const [f2lSelectedCategory, setF2lSelectedCategory] = useState(null);
  const [f2lScrambleStyle, setF2lScrambleStyle] = useState('beginner');
  const [f2lSessionIdx, setF2lSessionIdx] = useState(0);
  const [f2lSessionShowAlg, setF2lSessionShowAlg] = useState(false);
  const [f2lSessionAufIdx, setF2lSessionAufIdx] = useState(0);
  const [f2lDrillCase, setF2lDrillCase] = useState(F2L_DATA[0]);
  const [f2lShowDrillAlg, setF2lShowDrillAlg] = useState(false);
  const [f2lDrillAufIdx, setF2lDrillAufIdx] = useState(0);
  const [inlineF2lSessionFtOpen, setInlineF2lSessionFtOpen] = useState(false);
  const [inlineF2lDrillFtOpen, setInlineF2lDrillFtOpen] = useState(false);

  // OLL Phase States
  const [ollTab, setOllTab] = useState('grind');
  const [ollLibraryMode, setOllLibraryMode] = useState('standard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [sessionShowAlg, setSessionShowAlg] = useState(false);
  const [sessionAufIdx, setSessionAufIdx] = useState(0);
  const [drillCase, setDrillCase] = useState(OLL_DATA[0]);
  const [showDrillAlg, setShowDrillAlg] = useState(false);
  const [drillAufIdx, setDrillAufIdx] = useState(0);

  // Stopwatch State (Shared across OLL & F2L)
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const stopwatchRef = useRef(null);

  // Fingertrick Dossier State
  const [ftCase, setFtCase] = useState(OLL_DATA[0]);
  const [ftPhaseContext, setFtPhaseContext] = useState('oll');
  const [ftTriggerIdx, setFtTriggerIdx] = useState(0);
  const [ftReturnModal, setFtReturnModal] = useState(null);
  const [inlineSessionFtOpen, setInlineSessionFtOpen] = useState(false);
  const [inlineDrillFtOpen, setInlineDrillFtOpen] = useState(false);

  // Curriculum Builder State
  const [builderPhase, setBuilderPhase] = useState('oll');
  const [draftChunks, setDraftChunks] = useState(DEFAULT_CHUNKS);
  const [selectedBuilderChunkIdx, setSelectedBuilderChunkIdx] = useState(0);
  const [movingCaseId, setMovingCaseId] = useState(null);

  // Day Lineup Press-and-Hold Drag Reordering State
  const [draggedLineupIdx, setDraggedLineupIdx] = useState(null);
  const [lineupPressIdx, setLineupPressIdx] = useState(null);
  const [dragLineupPhase, setDragLineupPhase] = useState('oll');
  const lineupHoldTimerRef = useRef(null);
  const lineupItemRefs = useRef([]);
  const f2lLineupItemRefs = useRef([]);
  const lineupDidDragRef = useRef(false);
  const lineupTouchStartYRef = useRef(null);
  const draggedLineupIdxRef = useRef(null);
  draggedLineupIdxRef.current = draggedLineupIdx;

  // Settings Deck & Touch Swipe State
  const [settingsCard, setSettingsCard] = useState(1);
  const [deckDragOffset, setDeckDragOffset] = useState(0);
  const deckTouchStartRef = useRef(null);
  const [notationCategory, setNotationCategory] = useState('SINGLE');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [onboardStep, setOnboardStep] = useState(0);
  const [compassQuizIdx, setCompassQuizIdx] = useState(0);
  const [compassQuizRevealed, setCompassQuizRevealed] = useState(false);
  const [compassHitMeActive, setCompassHitMeActive] = useState(false);
  const [compassColorOrder, setCompassColorOrder] = useState(['Blue', 'Orange', 'Green', 'Red']);
  const [compassSelectedAnswer, setCompassSelectedAnswer] = useState(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPin, setNewUserPin] = useState("");

  // Audio Synthesizer
  const audioCtxRef = useRef(null);
  const emitBeep = (freq = 540, type = 'sine', duration = 0.08, vol = 0.18) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
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
    } catch {}
  };

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  // Persistence & Firestore Sync
  const saveUsersState = (updatedUsers) => {
    setUsers(updatedUsers);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUsers));
    } catch {}
    setSyncStatus('syncing');
    fetch(FIRESTORE_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { payload: { stringValue: JSON.stringify(updatedUsers) } } })
    })
      .then(() => setSyncStatus('synced'))
      .catch(() => setSyncStatus('synced'));
  };

  const updateCurrentUser = (patch) => {
    const updated = {
      ...users,
      [activePin]: { ...currentUser, ...patch }
    };
    saveUsersState(updated);
  };

  // Dynamic Scramble Formatters (OLL + F2L Beginner vs. Realistic)
  const buildSetupScramble = (baseSetup, aufIndex) => {
    const variation = AUF_VARIATIONS[aufIndex % AUF_VARIATIONS.length];
    return `${variation.pre}${baseSetup}${variation.post}`.trim();
  };

  const buildF2LSetupScramble = (baseSetup, variationIdx, style) => {
    if (style === 'beginner') {
      const aufOnly = ["", "U", "U'", "U2"];
      const pre = variationIdx === 0 ? "" : aufOnly[variationIdx % aufOnly.length];
      return `${pre ? pre + ' ' : ''}${baseSetup}`.trim();
    }
    const junk = F2L_REALISTIC_JUNK[variationIdx % F2L_REALISTIC_JUNK.length];
    const auf = ["", "U ", "U' ", "U2 "][variationIdx % 4];
    return `${junk} ${auf}${baseSetup}`.trim();
  };

  const cycleDrillScramble = () => {
    emitBeep(560, 'triangle', 0.06);
    setDrillAufIdx((prev) => {
      const next = (prev + 1) % AUF_VARIATIONS.length;
      return next === 0 ? 1 : next;
    });
  };

  const cycleSessionScramble = () => {
    emitBeep(560, 'triangle', 0.06);
    setSessionAufIdx((prev) => {
      const next = (prev + 1) % AUF_VARIATIONS.length;
      return next === 0 ? 1 : next;
    });
  };

  const cycleF2LDrillScramble = () => {
    emitBeep(560, 'triangle', 0.06);
    setF2lDrillAufIdx((prev) => prev + 1);
  };

  const cycleF2LSessionScramble = () => {
    emitBeep(560, 'triangle', 0.06);
    setF2lSessionAufIdx((prev) => prev + 1);
  };

  // Derived OLL Schedule & Progress
  const userChunks = currentUser.customChunks && currentUser.customChunks.length > 0 ? currentUser.customChunks : DEFAULT_CHUNKS;
  const schedule = generateSchedule(userChunks, "OLL", OLL_DATA);
  const totalDays = schedule.length;
  const currentDay = Math.max(1, Math.min(totalDays, currentUser.day || 1));
  const currentDayPlan = schedule[currentDay - 1] || schedule[0];
  const progressPct = Math.round((currentDay / totalDays) * 100);

  // Derived F2L Schedule & Progress
  const userF2LChunks = currentUser.f2lCustomChunks && currentUser.f2lCustomChunks.length > 0 ? currentUser.f2lCustomChunks : F2L_DEFAULT_CHUNKS;
  const f2lSchedule = generateSchedule(userF2LChunks, "F2L", F2L_DATA);
  const totalF2LDays = f2lSchedule.length;
  const currentF2LDay = Math.max(1, Math.min(totalF2LDays, currentUser.f2lDay || 1));
  const currentF2LDayPlan = f2lSchedule[currentF2LDay - 1] || f2lSchedule[0];
  const f2lProgressPct = Math.round((currentF2LDay / totalF2LDays) * 100);

  const isTimerEnabled = currentUser.timerEnabled !== false;
  const isFingertricksEnabled = currentUser.fingertricksEnabled !== false;

  // Outside click listener for C-F-O-P dropdown
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  // Phase Switcher
  const selectPhase = (phase) => {
    setIsDropdownOpen(false);
    if (phase === 'pll') {
      emitBeep(520);
      setActiveModal('preview');
      return;
    }
    emitBeep(620, 'sine', 0.09);
    setCurrentPhase(phase);
  };

  const getPhaseClass = (phase) => {
    const order = { cross: 0, f2l: 1, oll: 2 };
    if (currentPhase === phase) return 'phase-view phase-active flex flex-col';
    return order[phase] < order[currentPhase]
      ? 'phase-view phase-left flex flex-col'
      : 'phase-view phase-right flex flex-col';
  };

  // PIN Pad Logic
  const handlePinKey = (digit) => {
    if (pinInput.length >= 4) return;
    emitBeep(560, 'sine', 0.05);
    const next = pinInput + digit;
    setPinInput(next);
    setPinError(false);
    if (next.length === 4) {
      if (users[next]) {
        setActivePin(next);
        setPinInput("");
        setActiveModal(null);
        emitBeep(880, 'sine', 0.12);
        triggerToast(`Switched profile to ${users[next].name}`);
      } else {
        setPinError(true);
        emitBeep(220, 'square', 0.14);
        setTimeout(() => { setPinInput(""); setPinError(false); }, 650);
      }
    }
  };

  // WCA Blind Inspection Handlers
  const startWCAInspection = () => {
    emitBeep(800, 'sine', 0.1);
    setInspectionTime(15.0);
    setBlindState('inspecting');
    clearInterval(wcaIntervalRef.current);
    wcaIntervalRef.current = setInterval(() => {
      setInspectionTime((prev) => {
        const next = +(prev - 0.1).toFixed(1);
        if (Math.abs(next - 7.0) < 0.05) emitBeep(440, 'sine', 0.18);
        if (Math.abs(next - 3.0) < 0.05) emitBeep(440, 'sine', 0.18);
        if (next <= 0) {
          clearInterval(wcaIntervalRef.current);
          emitBeep(200, 'sawtooth', 0.45);
          setBlindState('dnf');
          return 0.0;
        }
        return next;
      });
    }, 100);
  };

  const beginPadHold = () => {
    if (blindState !== 'inspecting') return;
    setBlindState('readying');
    padHoldTimeoutRef.current = setTimeout(() => {
      emitBeep(1040, 'sine', 0.1);
      setBlindState('armed');
    }, 350);
  };

  const releasePadHold = () => {
    clearTimeout(padHoldTimeoutRef.current);
    setLeftPadHeld(false);
    setRightPadHeld(false);
    if (blindState === 'readying') {
      setBlindState('inspecting');
    } else if (blindState === 'armed') {
      clearInterval(wcaIntervalRef.current);
      emitBeep(1200, 'square', 0.1);
      setBlindExecTime(0.0);
      setBlindState('active');
      setActiveModal('visor');
      const start = performance.now();
      clearInterval(execIntervalRef.current);
      execIntervalRef.current = setInterval(() => {
        setBlindExecTime(+((performance.now() - start) / 1000).toFixed(2));
      }, 30);
    }
  };

  const handlePadTouchStart = (side) => {
    if (blindState !== 'inspecting' && blindState !== 'readying' && blindState !== 'armed') return;
    const nextLeft = side === 'left' ? true : leftPadHeld;
    const nextRight = side === 'right' ? true : rightPadHeld;
    setLeftPadHeld(nextLeft);
    setRightPadHeld(nextRight);
    if (nextLeft && nextRight && blindState === 'inspecting') {
      beginPadHold();
    }
  };

  const handlePadTouchEnd = (side) => {
    if (side === 'left') setLeftPadHeld(false);
    if (side === 'right') setRightPadHeld(false);
    if (blindState === 'readying' || blindState === 'armed') {
      releasePadHold();
    }
  };

  const stopBlindVisor = () => {
    clearInterval(execIntervalRef.current);
    emitBeep(720, 'sine', 0.1);
    setActiveModal(null);
    setBlindState('finished');
  };

  const logBlindOutcome = (outcome) => {
    emitBeep(620, 'sine', 0.08);
    setBlindRuns((prev) => ({
      clean: prev.clean + (outcome === 'Clean' ? 1 : 0),
      total: prev.total + 1
    }));
    setBlindState('idle');
    setInspectionTime(15.0);
    triggerToast(`Logged Cross Run: ${outcome}`);
  };

  // Spacebar support for Blind Inspection
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && currentPhase === 'cross' && crossTab === 'blind') {
        e.preventDefault();
        if (activeModal === 'visor') {
          stopBlindVisor();
        } else {
          setLeftPadHeld(true);
          setRightPadHeld(true);
          beginPadHold();
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space' && currentPhase === 'cross' && crossTab === 'blind') {
        e.preventDefault();
        releasePadHold();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  });

  // Stopwatch & Record Saving (Supports both OLL & F2L)
  const toggleStopwatch = (caseId, phase = 'oll') => {
    if (!isTimerEnabled) return;
    if (timerRunning) {
      clearInterval(stopwatchRef.current);
      setTimerRunning(false);
      emitBeep(760, 'sine', 0.1);
      const recorded = +timerElapsed.toFixed(2);
      if (recorded > 0.15) {
        const statsKey = phase === 'f2l' ? 'f2lStats' : 'stats';
        const currentStatsMap = currentUser[statsKey] || {};
        const prevCaseStat = currentStatsMap[caseId] || { times: [], best: null };
        const nextTimes = [...prevCaseStat.times, recorded];
        const nextBest = prevCaseStat.best === null ? recorded : Math.min(prevCaseStat.best, recorded);
        updateCurrentUser({
          [statsKey]: {
            ...currentStatsMap,
            [caseId]: { times: nextTimes, best: nextBest }
          }
        });
        triggerToast(`Recorded ${recorded.toFixed(2)}s!`);
      }
    } else {
      emitBeep(980, 'sine', 0.08);
      setTimerElapsed(0);
      setTimerRunning(true);
      const start = performance.now();
      clearInterval(stopwatchRef.current);
      stopwatchRef.current = setInterval(() => {
        setTimerElapsed((performance.now() - start) / 1000);
      }, 30);
    }
  };

  // Day Navigation & Helpers
  const changeOLLDay = (delta) => {
    const nextDay = Math.max(1, Math.min(totalDays, currentDay + delta));
    updateCurrentUser({ day: nextDay });
    emitBeep(680, 'square', 0.05);
  };

  const changeF2LDay = (delta) => {
    const nextDay = Math.max(1, Math.min(totalF2LDays, currentF2LDay + delta));
    updateCurrentUser({ f2lDay: nextDay });
    emitBeep(680, 'square', 0.05);
  };

  const adjustTargetGoal = (delta) => {
    const nextGoal = Math.max(0.5, +(currentUser.targetGoal + delta).toFixed(2));
    updateCurrentUser({ targetGoal: nextGoal });
    emitBeep(620, 'triangle', 0.05);
  };

  const openFingertrickDossier = (caseObj, returnModalName, phaseContext = 'oll') => {
    emitBeep(660, 'sine', 0.08);
    setFtCase(caseObj);
    setFtPhaseContext(phaseContext);
    setFtTriggerIdx(0);
    setFtReturnModal(returnModalName);
    setActiveModal('fingertrick');
  };

  const renderInlineFingertrickPanel = (caseObj, onClose, phaseContext = 'oll') => {
    const dossier = phaseContext === 'f2l'
      ? F2L_FINGERTRICK_GUIDES.default
      : (FINGERTRICK_GUIDES[caseObj.id] || FINGERTRICK_GUIDES.default);
    const activeTrig = dossier.triggers[ftTriggerIdx % dossier.triggers.length];
    return (
      <div className="w-full bg-[#050811] border border-orange-500/35 rounded-2xl p-3.5 text-left space-y-2.5 shadow-inner">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1">
            <span>⚡</span>
            <span>Fingertrick Dossier</span>
          </span>
          <button
            type="button"
            onClick={() => { emitBeep(480); onClose(); }}
            className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-300 cursor-pointer"
          >
            Hide Guide
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Starting Grip</span>
            <span className="text-[11px] font-black text-white leading-tight block mt-0.5">{dossier.grip}</span>
          </div>
          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block">Regrip Efficiency</span>
            <span className="text-[11px] font-black text-green-400 leading-tight block mt-0.5">{dossier.regrips}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Trigger Breakdown</span>
            <span className="text-[9px] text-slate-500">Tap pill to inspect</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dossier.triggers.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => { emitBeep(560); setFtTriggerIdx(idx); }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  ftTriggerIdx % dossier.triggers.length === idx
                    ? 'bg-orange-500/20 border border-orange-500 text-orange-300'
                    : 'bg-white/5 border border-white/10 text-slate-300'
                }`}
              >
                {t.moves} • <span className="font-sans text-[9px] opacity-80">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-black text-orange-400">{activeTrig.moves}</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-[8px] font-black uppercase text-amber-300">{activeTrig.label}</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">{activeTrig.tip}</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 space-y-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 block">⚡ Speedcoach Execution Note</span>
          <p className="text-[11px] text-slate-200 leading-snug">{dossier.coachNote}</p>
        </div>
      </div>
    );
  };

  // Rotation Caution Helper for F2L
  const hasYRotation = (alg) => /\by['2]?\b/.test(alg);

  const renderF2LRotationCaution = (alg) => {
    if (!hasYRotation(alg)) return null;
    const isYPrime = /\by'/.test(alg);
    return (
      <div className="w-full bg-amber-500/10 border border-amber-500/35 rounded-xl p-2.5 text-left flex items-start gap-2.5">
        <span className="text-amber-400 text-sm leading-none mt-0.5">⚠️</span>
        <div className="space-y-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-300 block">
            Cube Rotation Caution ({isYPrime ? "y'" : "y"})
          </span>
          <p className="text-[10.5px] text-slate-200 leading-snug">
            {isYPrime
              ? "Rotate the ENTIRE cube counter-clockwise (like a U' turn) so Green moves to Front while keeping White glued on Bottom."
              : "Rotate the ENTIRE cube clockwise (like a U turn) so Blue moves to Front while keeping White glued on Bottom."}
          </p>
        </div>
      </div>
    );
  };

  // Curriculum Builder Handlers (Supports both OLL & F2L)
  const openCurriculumArchitect = (targetPhase = 'oll') => {
    emitBeep(540);
    setBuilderPhase(targetPhase);
    const sourceChunks = targetPhase === 'f2l' ? userF2LChunks : userChunks;
    setDraftChunks(JSON.parse(JSON.stringify(sourceChunks)));
    setSelectedBuilderChunkIdx(0);
    setMovingCaseId(null);
    setActiveModal('curriculum');
  };

  const applyCurriculumPreset = (preset) => {
    emitBeep(640);
    const sourceData = builderPhase === 'f2l' ? F2L_DATA : OLL_DATA;
    const defaultSet = builderPhase === 'f2l' ? F2L_DEFAULT_CHUNKS : DEFAULT_CHUNKS;
    if (preset === 'default') {
      setDraftChunks(defaultSet);
    } else if (preset === 'casual') {
      const built = [];
      for (let i = 0; i < sourceData.length; i += 3) {
        const slice = sourceData.slice(i, i + 3);
        built.push({ id: built.length + 1, title: `Chunk ${built.length + 1}: Casual Trio`, caseIds: slice.map((c) => c.id) });
      }
      setDraftChunks(built);
    } else if (preset === 'shape') {
      const groups = Array.from(new Set(sourceData.map((c) => c.group)));
      setDraftChunks(groups.map((g, idx) => ({
        id: idx + 1,
        title: `Chunk ${idx + 1}: ${g}`,
        caseIds: sourceData.filter((c) => c.group === g).map((c) => c.id)
      })));
    }
    setSelectedBuilderChunkIdx(0);
  };

  const shiftBuilderChunk = (dir) => {
    const target = selectedBuilderChunkIdx + dir;
    if (target < 0 || target >= draftChunks.length) return;
    emitBeep(520);
    const copy = [...draftChunks];
    const [moved] = copy.splice(selectedBuilderChunkIdx, 1);
    copy.splice(target, 0, moved);
    setDraftChunks(copy);
    setSelectedBuilderChunkIdx(target);
  };

  const addBuilderChunk = () => {
    emitBeep(600);
    const nextNum = draftChunks.length + 1;
    setDraftChunks([...draftChunks, { id: Date.now(), title: `Chunk ${nextNum}: Custom Group`, caseIds: [] }]);
    setSelectedBuilderChunkIdx(draftChunks.length);
  };

  const removeBuilderChunk = () => {
    if (draftChunks.length <= 1) return;
    emitBeep(360);
    const removed = draftChunks[selectedBuilderChunkIdx];
    const remaining = draftChunks.filter((_, idx) => idx !== selectedBuilderChunkIdx);
    remaining[0] = { ...remaining[0], caseIds: [...remaining[0].caseIds, ...removed.caseIds] };
    setDraftChunks(remaining);
    setSelectedBuilderChunkIdx(0);
  };

  const moveCaseToChunk = (caseId, targetChunkIdx) => {
    emitBeep(680);
    const updated = draftChunks.map((chk, idx) => {
      const filtered = chk.caseIds.filter((id) => id !== caseId);
      return idx === targetChunkIdx ? { ...chk, caseIds: [...filtered, caseId] } : { ...chk, caseIds: filtered };
    });
    setDraftChunks(updated);
    setMovingCaseId(null);
  };

  const saveCustomCurriculum = () => {
    const defaultSet = builderPhase === 'f2l' ? F2L_DEFAULT_CHUNKS : DEFAULT_CHUNKS;
    const cleaned = draftChunks.filter((c) => c.caseIds.length > 0);
    if (builderPhase === 'f2l') {
      updateCurrentUser({ f2lCustomChunks: cleaned.length > 0 ? cleaned : defaultSet, f2lDay: 1 });
    } else {
      updateCurrentUser({ customChunks: cleaned.length > 0 ? cleaned : defaultSet, day: 1 });
    }
    setActiveModal(null);
    emitBeep(960, 'sine', 0.12);
    triggerToast(`Custom ${builderPhase.toUpperCase()} Curriculum Saved!`);
  };

  // Day Lineup Press-and-Hold Drag Reorder Handlers (OLL & F2L)
  const reorderDayLineup = (fromIdx, toIdx, phaseType = dragLineupPhase) => {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return;
    const plan = phaseType === 'f2l' ? currentF2LDayPlan : currentDayPlan;
    const chunksList = phaseType === 'f2l' ? userF2LChunks : userChunks;
    const totalD = phaseType === 'f2l' ? totalF2LDays : totalDays;
    const currD = phaseType === 'f2l' ? currentF2LDay : currentDay;
    const patchKey = phaseType === 'f2l' ? 'f2lCustomChunks' : 'customChunks';

    const currentIds = [...plan.caseIds];
    const [movedId] = currentIds.splice(fromIdx, 1);
    currentIds.splice(toIdx, 0, movedId);

    const isGrandFinale = currD === totalD && plan.title.startsWith('Grand Finale');
    const isCumulative = plan.title.startsWith('Cumulative Review');

    if (isGrandFinale) {
      const updatedChunks = chunksList.map((chk) => ({
        ...chk,
        caseIds: [...chk.caseIds].sort((a, b) => currentIds.indexOf(a) - currentIds.indexOf(b))
      }));
      updateCurrentUser({ [patchKey]: updatedChunks });
    } else if (isCumulative) {
      const cIdx = plan.chunkIdx;
      const prevChunk = chunksList[cIdx - 1];
      const currChunk = chunksList[cIdx];
      if (prevChunk && currChunk) {
        const prevSet = new Set(prevChunk.caseIds);
        const currSet = new Set(currChunk.caseIds);
        const updatedChunks = chunksList.map((chk, idx) => {
          if (idx === cIdx - 1) return { ...chk, caseIds: currentIds.filter((id) => prevSet.has(id)) };
          if (idx === cIdx) return { ...chk, caseIds: currentIds.filter((id) => currSet.has(id)) };
          return chk;
        });
        updateCurrentUser({ [patchKey]: updatedChunks });
      }
    } else {
      const targetChunkIdx = plan.chunkIdx;
      const updatedChunks = chunksList.map((chk, idx) =>
        idx === targetChunkIdx ? { ...chk, caseIds: currentIds } : chk
      );
      updateCurrentUser({ [patchKey]: updatedChunks });
    }
    emitBeep(720, 'triangle', 0.05);
  };

  const handleLineupPointerDown = (idx, clientY = null, phaseType = 'oll') => {
    lineupDidDragRef.current = false;
    lineupTouchStartYRef.current = clientY;
    setDragLineupPhase(phaseType);
    setLineupPressIdx(idx);
    clearTimeout(lineupHoldTimerRef.current);
    lineupHoldTimerRef.current = setTimeout(() => {
      lineupDidDragRef.current = true;
      setDraggedLineupIdx(idx);
      emitBeep(880, 'sine', 0.08);
    }, 220);
  };

  const handleLineupPreHoldMove = (clientY) => {
    if (draggedLineupIdxRef.current !== null || lineupTouchStartYRef.current === null) return;
    if (Math.abs(clientY - lineupTouchStartYRef.current) > 8) {
      clearTimeout(lineupHoldTimerRef.current);
      setLineupPressIdx(null);
      lineupTouchStartYRef.current = null;
    }
  };

  const updateLineupDragPosition = (clientY) => {
    const activeIdx = draggedLineupIdxRef.current;
    if (activeIdx === null) return;
    const refsArray = dragLineupPhase === 'f2l' ? f2lLineupItemRefs.current : lineupItemRefs.current;
    for (let i = 0; i < refsArray.length; i++) {
      const el = refsArray[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom && i !== activeIdx) {
        reorderDayLineup(activeIdx, i, dragLineupPhase);
        draggedLineupIdxRef.current = i;
        setDraggedLineupIdx(i);
        setLineupPressIdx(i);
        break;
      }
    }
  };

  const handleLineupPointerMove = (e) => {
    if (draggedLineupIdxRef.current === null) {
      handleLineupPreHoldMove(e.clientY);
      return;
    }
    if (e.cancelable) e.preventDefault();
    updateLineupDragPosition(e.clientY);
  };

  const handleLineupPointerUp = () => {
    clearTimeout(lineupHoldTimerRef.current);
    lineupTouchStartYRef.current = null;
    if (draggedLineupIdxRef.current !== null) {
      triggerToast('Day lineup order updated!');
    }
    draggedLineupIdxRef.current = null;
    setDraggedLineupIdx(null);
    setLineupPressIdx(null);
  };

  useEffect(() => {
    if (draggedLineupIdx === null) return;
    const onWindowTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches && e.touches[0]) {
        updateLineupDragPosition(e.touches[0].clientY);
      }
    };
    const onWindowTouchEnd = () => {
      handleLineupPointerUp();
    };
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd);
    window.addEventListener('touchcancel', onWindowTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
    };
  });

  // Granular Reset & Admin User Creation
  const executeGranularReset = (mode) => {
    if (mode === 'f2l_schedule') updateCurrentUser({ f2lDay: 1 });
    if (mode === 'f2l_stats') updateCurrentUser({ f2lStats: {} });
    if (mode === 'f2l_chunks') updateCurrentUser({ f2lCustomChunks: F2L_DEFAULT_CHUNKS, f2lDay: 1 });
    if (mode === 'f2l_all') updateCurrentUser({ f2lDay: 1, f2lStats: {}, f2lCustomChunks: F2L_DEFAULT_CHUNKS });
    if (mode === 'oll_schedule') updateCurrentUser({ day: 1 });
    if (mode === 'oll_stats') updateCurrentUser({ stats: {} });
    if (mode === 'oll_chunks') updateCurrentUser({ customChunks: DEFAULT_CHUNKS, day: 1 });
    if (mode === 'oll_all') updateCurrentUser({ day: 1, stats: {}, customChunks: DEFAULT_CHUNKS });
    if (mode === 'both') updateCurrentUser({ day: 1, f2lDay: 1, stats: {}, f2lStats: {}, customChunks: DEFAULT_CHUNKS, f2lCustomChunks: F2L_DEFAULT_CHUNKS });
    setActiveModal(null);
    emitBeep(900, 'triangle', 0.12);
    const labelMap = {
      f2l_schedule: 'F2L Day 1 Schedule',
      f2l_stats: 'F2L Statistics & PRs',
      f2l_chunks: 'F2L Default Chunks',
      f2l_all: 'All F2L Progress',
      oll_schedule: 'OLL Day 1 Schedule',
      oll_stats: 'OLL Statistics & PRs',
      oll_chunks: 'OLL Default Chunks',
      oll_all: 'All OLL Progress',
      both: 'Full Account Wipe'
    };
    triggerToast(`Reset: ${labelMap[mode] || mode.toUpperCase()}`);
  };

  const handleAddFamilyUser = () => {
    if (!newUserName.trim() || !/^\d{4}$/.test(newUserPin) || users[newUserPin]) {
      triggerToast('Enter a unique 4-digit PIN and name.');
      return;
    }
    const updated = {
      ...users,
      [newUserPin]: {
        pin: newUserPin,
        name: newUserName.trim(),
        role: 'user',
        day: 1,
        f2lDay: 1,
        stats: {},
        f2lStats: {},
        targetGoal: 3.5,
        timerEnabled: true,
        fingertricksEnabled: true,
        chunkSize: 5,
        customChunks: DEFAULT_CHUNKS,
        f2lCustomChunks: F2L_DEFAULT_CHUNKS,
        hasSeenOnboarding: false
      }
    };
    saveUsersState(updated);
    setNewUserName("");
    setNewUserPin("");
    emitBeep(880, 'sine', 0.1);
    triggerToast(`Added profile: ${newUserName.trim()}`);
  };

  // 3D Settings Deck Class & Mobile Touch Swipe Handlers
  const getDeckClass = (cardNum) => {
    const pos = ((cardNum - settingsCard + 3) % 3) + 1;
    return `deck-card deck-card-${pos}`;
  };

  const handleDeckTouchStart = (e) => {
    if (e.target.closest('[data-scrollable="true"]')) {
      deckTouchStartRef.current = null;
      return;
    }
    const touch = e.touches[0];
    deckTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setDeckDragOffset(0);
  };

  const handleDeckTouchMove = (e) => {
    if (!deckTouchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - deckTouchStartRef.current.x;
    const dy = touch.clientY - deckTouchStartRef.current.y;
    const primaryDelta = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    setDeckDragOffset(Math.max(-90, Math.min(90, primaryDelta)));
  };

  const handleDeckTouchEnd = (e) => {
    if (!deckTouchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - deckTouchStartRef.current.x;
    const dy = touch.clientY - deckTouchStartRef.current.y;
    deckTouchStartRef.current = null;
    setDeckDragOffset(0);

    const threshold = 42;
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > threshold) {
      emitBeep(580, 'sine', 0.07);
      if (dx < 0) {
        setSettingsCard((prev) => (prev % 3) + 1);
      } else {
        setSettingsCard((prev) => ((prev + 1) % 3) + 1);
      }
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
      emitBeep(580, 'sine', 0.07);
      if (dy < 0) {
        setSettingsCard((prev) => (prev % 3) + 1);
      } else {
        setSettingsCard((prev) => ((prev + 1) % 3) + 1);
      }
    }
  };

  // =========================================================================
  // 8. INTRINSIC PIECE-IDENTITY CROSS 2D DIAGRAM (FULL 3x3 BOTTOM FACE)
  // =========================================================================
  const activeScramble = (CROSS_SCRAMBLES[crossTier] || CROSS_SCRAMBLES[1])[crossScrambleIdx % 6];

  const renderCrossSVG = () => {
    const cW = '#f8fafc';
    const cG = '#22c55e';
    const cB = '#3b82f6';
    const cR = '#ef4444';
    const cO = '#f97316';
    const cCorner = '#1e293b';
    const cDark = '#090a14';

    const isTarget = diagramView === 'solved';
    const fEdge = { dFill: cW, outFill: cG };
    const bEdge = isTarget ? { dFill: cW, outFill: cB } : { dFill: cB, outFill: '#ffffff' };
    const lEdge = isTarget ? { dFill: cW, outFill: cR } : { dFill: cR, outFill: '#ffffff' };
    const rEdge = { dFill: cW, outFill: cO };

    return (
      <svg viewBox="0 0 116 116" className="w-full h-full drop-shadow-xl">
        <rect x="20" y="20" width="76" height="76" rx="8" fill={cDark} />
        <rect x="24" y="10" width="20" height="7" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />
        <rect x="48" y="10" width="20" height="7" rx="2" fill={bEdge.outFill} stroke={cDark} strokeWidth="1.2" />
        <rect x="72" y="10" width="20" height="7" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />

        <rect x="24" y="99" width="20" height="7" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />
        <rect x="48" y="99" width="20" height="7" rx="2" fill={fEdge.outFill} stroke={cDark} strokeWidth="1.2" />
        <rect x="72" y="99" width="20" height="7" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />

        <rect x="10" y="24" width="7" height="20" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />
        <rect x="10" y="48" width="7" height="20" rx="2" fill={lEdge.outFill} stroke={cDark} strokeWidth="1.2" />
        <rect x="10" y="72" width="7" height="20" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />

        <rect x="99" y="24" width="7" height="20" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />
        <rect x="99" y="48" width="7" height="20" rx="2" fill={rEdge.outFill} stroke={cDark} strokeWidth="1.2" />
        <rect x="99" y="72" width="7" height="20" rx="2" fill={cCorner} stroke={cDark} strokeWidth="1.2" />

        <rect x="24" y="24" width="20" height="20" rx="3.5" fill={cCorner} stroke={cDark} strokeWidth="1.5" />
        <rect x="48" y="24" width="20" height="20" rx="3.5" fill={bEdge.dFill} stroke={cDark} strokeWidth="1.5" />
        <rect x="72" y="24" width="20" height="20" rx="3.5" fill={cCorner} stroke={cDark} strokeWidth="1.5" />

        <rect x="24" y="48" width="20" height="20" rx="3.5" fill={lEdge.dFill} stroke={cDark} strokeWidth="1.5" />
        <rect x="48" y="48" width="20" height="20" rx="3.5" fill={cW} stroke={cDark} strokeWidth="1.5" />
        <rect x="72" y="48" width="20" height="20" rx="3.5" fill={rEdge.dFill} stroke={cDark} strokeWidth="1.5" />

        <rect x="24" y="72" width="20" height="20" rx="3.5" fill={cCorner} stroke={cDark} strokeWidth="1.5" />
        <rect x="48" y="72" width="20" height="20" rx="3.5" fill={fEdge.dFill} stroke={cDark} strokeWidth="1.5" />
        <rect x="72" y="72" width="20" height="20" rx="3.5" fill={cCorner} stroke={cDark} strokeWidth="1.5" />
      </svg>
    );
  };

  // Derived OLL Data
  const ollGroups = Array.from(new Set(OLL_DATA.map((c) => c.group)));
  const sessionCases = currentDayPlan.caseIds.map((id) => OLL_DATA.find((c) => c.id === id)).filter(Boolean);
  const activeSessionCase = sessionCases[sessionIdx % sessionCases.length] || OLL_DATA[0];

  const allStatsEntries = Object.values(currentUser.stats || {});
  const totalRecordedRuns = allStatsEntries.reduce((acc, s) => acc + (s.times?.length || 0), 0);
  const allBests = allStatsEntries.map((s) => s.best).filter((b) => typeof b === 'number');
  const allTimeBestPR = allBests.length > 0 ? Math.min(...allBests) : null;

  // Derived F2L Data
  const f2lGroups = Array.from(new Set(F2L_DATA.map((c) => c.group)));
  const f2lSessionCases = currentF2LDayPlan.caseIds.map((id) => F2L_DATA.find((c) => c.id === id)).filter(Boolean);
  const activeF2LSessionCase = f2lSessionCases[f2lSessionIdx % f2lSessionCases.length] || F2L_DATA[0];

  const allF2LStatsEntries = Object.values(currentUser.f2lStats || {});
  const totalF2LRecordedRuns = allF2LStatsEntries.reduce((acc, s) => acc + (s.times?.length || 0), 0);
  const allF2LBests = allF2LStatsEntries.map((s) => s.best).filter((b) => typeof b === 'number');
  const allTimeF2LBestPR = allF2LBests.length > 0 ? Math.min(...allF2LBests) : null;

  const COMPASS_QUIZZES = [
    { q: "With White on bottom and Green facing you, which color belongs on your Right side?", a: "Orange" },
    { q: "With White on bottom and Blue facing you, which color is at the Back?", a: "Green" },
    { q: "With White on bottom and Red facing you, which color belongs on your Right side?", a: "Green" }
  ];

  // =========================================================================
  // 9. SHARED 3D STACKED SETTINGS DECK RENDERER
  // =========================================================================
  const renderSettingsDeck = (phaseContext = 'oll') => (
    <div className="p-5 h-full flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Control Center</p>
          <h2 className="text-2xl font-black tracking-tight text-white">Settings</h2>
        </div>
        <button
          onClick={() => { setActiveModal('profile'); setPinInput(""); setPinError(false); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold active:scale-95 transition-all cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>Lock App</span>
        </button>
      </div>

      <div
        onTouchStart={handleDeckTouchStart}
        onTouchMove={handleDeckTouchMove}
        onTouchEnd={handleDeckTouchEnd}
        style={{
          transform: deckDragOffset !== 0 ? `translateX(${deckDragOffset * 0.28}px) rotate(${deckDragOffset * 0.03}deg)` : 'none',
          transition: deckDragOffset === 0 ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
        className="relative w-full flex-1 min-h-[395px] max-h-[440px] my-auto touch-pan-y"
      >
        {/* Card 1: Pace & Environment */}
        <div className={`${getDeckClass(1)} bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-3 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">Card 1 of 3</span>
              <span className="text-[10px] font-mono text-slate-400">
                {phaseContext === 'f2l' ? `${totalF2LDays}d F2L Plan` : `${totalDays}d OLL Plan`}
              </span>
            </div>
            <h3 className="text-base font-black text-white text-center">Pace & Training Tools</h3>

            <div className="flex items-center justify-between bg-[#050811] rounded-2xl px-3 py-2 border border-white/10">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Target Execution Goal</span>
                <span className="text-[9px] text-slate-400">0.25s precision stepper</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => adjustTargetGoal(-0.25)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black cursor-pointer">-</button>
                <span className="text-orange-400 font-mono font-black text-xs w-11 text-center">{currentUser.targetGoal.toFixed(2)}s</span>
                <button onClick={() => adjustTargetGoal(0.25)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black cursor-pointer">+</button>
              </div>
            </div>

            <button
              onClick={() => openCurriculumArchitect(phaseContext === 'f2l' ? 'f2l' : 'oll')}
              className="w-full py-2 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-300 font-bold text-xs cursor-pointer transition-all"
            >
              Organize {phaseContext === 'f2l' ? 'F2L' : 'OLL'} Cases & Order
            </button>

            <div className="flex items-center justify-between bg-[#050811] rounded-2xl px-3 py-2 border border-white/10">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Speedcube Stopwatch</span>
                <span className="text-[9px] text-slate-400">In-app solve timer pad</span>
              </div>
              <button
                onClick={() => { updateCurrentUser({ timerEnabled: !isTimerEnabled }); emitBeep(720, 'sine', 0.08); }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                <span className={isTimerEnabled ? "text-green-400 font-mono font-black text-xs" : "text-slate-500 font-mono font-black text-xs"}>
                  {isTimerEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#050811] rounded-2xl px-3 py-2 border border-white/10">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Fingertrick Guides</span>
                <span className="text-[9px] text-slate-400">Grip & trigger breakdowns</span>
              </div>
              <button
                onClick={() => { updateCurrentUser({ fingertricksEnabled: !isFingertricksEnabled }); emitBeep(720, 'sine', 0.08); }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                <span className={isFingertricksEnabled ? "text-green-400 font-mono font-black text-xs" : "text-slate-500 font-mono font-black text-xs"}>
                  {isFingertricksEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#050811] rounded-2xl px-3 py-2 border border-white/10">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Audio Synthesizer</span>
                <span className="text-[9px] text-slate-400">Tactile clicks & WCA tones</span>
              </div>
              <button
                onClick={() => { setAudioEnabled((prev) => !prev); emitBeep(760, 'sine', 0.08); }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer active:scale-95 transition-all"
              >
                <span className={audioEnabled ? "text-green-400 font-mono font-black text-xs" : "text-slate-500 font-mono font-black text-xs"}>
                  {audioEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          <button onClick={() => { emitBeep(600); setSettingsCard(2); }} className="w-full py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-400 cursor-pointer">
            Swipe / Tap for Notation Key →
          </button>
        </div>

        {/* Card 2: Algorithm Notation Key */}
        <div className={`${getDeckClass(2)} bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">Card 2 of 3</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-white">Algorithm Notation Key</h3>
              <p className="text-[11px] text-slate-400">WCA notation cheatsheet</p>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {['SINGLE', 'SLICE', 'WHOLE', 'WIDE'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => { emitBeep(520); setNotationCategory(cat); }}
                  className={`py-2 rounded-full text-[10px] font-black tracking-wider cursor-pointer transition-all ${notationCategory === cat ? 'bg-orange-500 text-slate-950 shadow-md' : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div data-scrollable="true" className="bg-[#050811] border border-white/10 rounded-2xl p-3 space-y-2 max-h-[185px] overflow-y-auto no-scrollbar">
              {NOTATION_TABS[notationCategory].map((row) => (
                <div key={row.move} className="flex items-center gap-3 bg-slate-900/80 border border-white/5 rounded-xl p-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 font-mono text-[11px] font-black text-orange-400 min-w-[54px] text-center">{row.move}</span>
                  <span className="text-xs font-medium text-slate-200">{row.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => { emitBeep(600); setSettingsCard(3); }} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-400 cursor-pointer">
            Swipe / Tap for Security & Guide →
          </button>
        </div>

        {/* Card 3: Profiles & Security */}
        <div className={`${getDeckClass(3)} bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">Card 3 of 3</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-white">Profiles & Security</h3>
              <p className="text-xs text-slate-400">Manage accounts, reset progress, or guide</p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => { emitBeep(540); setOnboardStep(0); setActiveModal('onboarding'); }}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                <span>New to CFOP? Beginner Guide</span>
              </button>

              <button
                onClick={() => { emitBeep(540); setActiveModal('admin'); }}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Admin User Management</span>
              </button>

              <button
                onClick={() => { emitBeep(); setActiveModal('reset'); }}
                className="w-full py-3.5 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                <span>Reset My Progress</span>
              </button>
            </div>
          </div>

          <button onClick={() => { emitBeep(600); setSettingsCard(1); }} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-400 cursor-pointer">
            Return to Card 1 ↓
          </button>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-2 pt-2">
        {[1, 2, 3].map((dot) => (
          <button
            key={dot}
            onClick={() => { emitBeep(500); setSettingsCard(dot); }}
            className={`h-2 rounded-full transition-all cursor-pointer ${settingsCard === dot ? 'w-6 bg-orange-500' : 'w-2 bg-slate-700'}`}
          />
        ))}
      </div>
    </div>
  );

  // =========================================================================
  // 10. MAIN RENDER
  // =========================================================================
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; overscroll-behavior: none; background-color: #060913 !important; color-scheme: dark; -webkit-tap-highlight-color: transparent; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .phase-view { position: absolute; inset: 0; width: 100%; height: 100%; transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s ease; will-change: transform, opacity; }
        .phase-active { transform: translateX(0%); opacity: 1; pointer-events: auto; z-index: 20; }
        .phase-left { transform: translateX(-100%); opacity: 0; pointer-events: none; z-index: 10; }
        .phase-right { transform: translateX(100%); opacity: 0; pointer-events: none; z-index: 10; }
        @keyframes pulse-visor { 0%, 100% { transform: scale(1); opacity: 0.92; } 50% { transform: scale(1.05); opacity: 1; } }
        .animate-pulse-visor { animation: pulse-visor 2.4s infinite ease-in-out; }
        .deck-card { position: absolute; inset: 0; width: 100%; height: 100%; transition: all 0.45s cubic-bezier(0.25, 1, 0.5, 1); }
        .deck-card-1 { transform: translateY(0) scale(1); z-index: 30; opacity: 1; pointer-events: auto; }
        .deck-card-2 { transform: translateY(20px) scale(0.95); z-index: 20; opacity: 0.5; pointer-events: none; }
        .deck-card-3 { transform: translateY(40px) scale(0.90); z-index: 10; opacity: 0.2; pointer-events: none; }
      `}</style>

      <div className="bg-[#060913] text-slate-100 font-sans selection:bg-orange-500/30 flex justify-center select-none overscroll-none min-h-screen">
        {/* Ambient Lighting */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[42vh] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none z-0"></div>
        <div className="fixed bottom-0 right-0 w-3/4 h-[38vh] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none z-0"></div>

        {/* Non-Intrusive Toast Banner */}
        {toastMsg && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[450] bg-slate-900/95 border border-orange-500/40 text-orange-300 px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-xl text-xs font-bold tracking-wide">
            {toastMsg}
          </div>
        )}

        {/* Locked Mobile iOS Shell */}
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10 shadow-2xl bg-[#090e1c] border-x border-white/5 overflow-hidden">

          {/* PERSISTENT HEADER */}
          <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5 bg-[#090e1c]/90 backdrop-blur-xl flex-shrink-0 z-40">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Custom 3D Sune Cube SVG Logo */}
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center relative">
                <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-[0_4px_10px_rgba(234,88,12,0.35)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M214 310 L295 258 L524 168 L806 416 L726 558 L592 660 L515 688 L214 550 Z" fill="#090a14" stroke="#090a14" strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" />
                  <g stroke="#090a14" strokeWidth="14" strokeLinejoin="round" fill="#000000">
                    <polygon points="524,180 594,228 534,268 464,220" />
                    <polygon points="604,236 674,288 614,328 544,276" />
                    <polygon points="684,296 754,348 694,388 624,336" />
                    <polygon points="700,358 775,354 788,418 714,424" />
                    <polygon points="716,432 790,428 752,492 680,498" />
                    <polygon points="676,506 748,502 708,552 638,558" />
                  </g>
                  <g stroke="#090a14" strokeWidth="14" strokeLinejoin="round">
                    <polygon points="248,312 331,343 403,286 320,255" fill="#d96528" />
                    <polygon points="348,350 431,381 503,324 420,293" fill="#090a12" />
                    <polygon points="448,388 531,419 603,362 520,331" fill="#090a12" />
                  </g>
                  <g stroke="#090a14" strokeWidth="14" strokeLinejoin="round">
                    <polygon points="544,432 616,375 610,466 538,523" fill="#d96528" />
                    <polygon points="537,537 609,480 603,571 531,628" fill="#090a12" />
                    <polygon points="530,642 602,585 596,676 524,733" fill="#090a12" />
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
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-400 font-bold truncate">
                    {currentPhase === 'cross'
                      ? 'Step 1 • White Cross'
                      : currentPhase === 'f2l'
                        ? `Daily F2L Training • Day ${currentF2LDay}`
                        : `Daily OLL Training • Day ${currentDay}`}
                  </span>
                  <span className="text-slate-600 text-[10px]">•</span>
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                    <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : syncStatus === 'synced' ? 'bg-green-400' : 'bg-red-500'}`}></span>
                    <span className="text-green-400">{syncStatus === 'syncing' ? 'SYNC' : 'CLOUD'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button
                onClick={() => { setActiveModal('profile'); setPinInput(""); setPinError(false); }}
                className="flex flex-col items-end px-2 py-1 rounded-xl hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  <span>{currentUser.name}</span>
                </span>
                <span className="font-mono text-[11px] font-black text-orange-400 leading-tight">
                  {currentPhase === 'f2l' ? `${f2lProgressPct}%` : `${progressPct}%`}
                </span>
              </button>

              {/* C-F-O-P Dropdown Pill */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onPointerDown={() => { setIsDropdownOpen((prev) => !prev); emitBeep(420); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-400 text-xs font-black tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <span>{currentPhase === 'cross' ? 'C' : currentPhase === 'f2l' ? 'F' : 'O'}</span>
                  <svg className="w-3 h-3 opacity-80 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-14 bg-[#0c1326] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-2xl">
                    <button onClick={() => selectPhase('cross')} className={`w-full py-2 rounded-xl text-xs font-black text-center transition-all cursor-pointer ${currentPhase === 'cross' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>C</button>
                    <button onClick={() => selectPhase('f2l')} className={`w-full py-2 rounded-xl text-xs font-black text-center transition-all cursor-pointer ${currentPhase === 'f2l' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>F</button>
                    <button onClick={() => selectPhase('oll')} className={`w-full py-2 rounded-xl text-xs font-black text-center transition-all cursor-pointer ${currentPhase === 'oll' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}>O</button>
                    <button onClick={() => selectPhase('pll')} className={`w-full py-2 rounded-xl text-xs font-black text-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer transition-all`}>P</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* SLIDING PHASE STAGE */}
          <div className="flex-1 min-h-0 relative overflow-hidden">

            {/* ========================================================= */}
            {/* PHASE 1: CROSS                                            */}
            {/* ========================================================= */}
            <div className={getPhaseClass('cross')}>
              <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
                {crossTab === 'ladder' && (
                  <div className="p-4 h-full flex flex-col justify-between gap-2.5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[9px]">CFOP Step 1 • Bottom Cross</p>
                        <h2 className="text-xl font-black tracking-tight text-white leading-none">Cross in X</h2>
                      </div>
                      <button
                        onClick={() => {
                          emitBeep(520);
                          setCompassQuizRevealed(false);
                          setCompassHitMeActive(false);
                          setCompassColorOrder(['Blue', 'Orange', 'Green', 'Red']);
                          setCompassSelectedAnswer(null);
                          setActiveModal('compass');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[11px] font-bold active:scale-95 cursor-pointer"
                      >
                        <span>Color Orbit</span>
                      </button>
                    </div>

                    {/* Tier Selector (1 to 5) */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((tier) => (
                        <button
                          key={tier}
                          onClick={() => {
                            emitBeep(500);
                            setCrossTier(tier);
                            setUserMoves(tier + 1);
                            setEfficiencyFeedback(null);
                            setCrossScrambleIdx((prev) => prev + 1);
                          }}
                          className={`py-1.5 text-[10px] font-black rounded-xl transition-all cursor-pointer ${crossTier === tier ? 'bg-orange-500 text-slate-950 shadow-md' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                          {tier + 1} Moves
                        </button>
                      ))}
                    </div>

                    {/* Mode Toggle */}
                    <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
                      <button
                        onClick={() => { emitBeep(); setCrossMode('efficiency'); }}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${crossMode === 'efficiency' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        Move Count
                      </button>
                      <button
                        onClick={() => { emitBeep(); setCrossMode('blind'); }}
                        className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${crossMode === 'blind' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        Eyes-Closed Drill
                      </button>
                    </div>

                    {/* Compact Scramble & Side-by-Side 2D Bottom Face Card */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] p-3.5 shadow-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">
                            Difficulty {crossTier} • {crossTier + 1} Moves
                          </span>
                          <h3 className="text-sm font-black text-white">
                            {crossTier === 1 ? 'Single-Move Drop-Ins' : crossTier === 2 ? 'Two-Piece Alignment' : crossTier === 3 ? 'Three-Edge Sequencing' : crossTier === 4 ? 'Full 4-Edge Bottom Cross' : 'Advanced Multi-Piece Cross'}
                          </h3>
                        </div>
                        <button
                          onClick={() => { emitBeep(440); setCrossScrambleIdx((p) => p + 1); setEfficiencyFeedback(null); }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-orange-400 active:scale-95 cursor-pointer"
                        >
                          New Scramble
                        </button>
                      </div>

                      <div className="bg-[#050811] border border-white/10 rounded-xl py-2 px-3 text-center shadow-inner">
                        <span className="text-[9px] font-semibold text-slate-400 block mb-0.5">White on Bottom • Green Facing You</span>
                        <div className="font-mono text-base font-black text-amber-300 tracking-wider select-all">{activeScramble}</div>
                      </div>

                      {/* Side-by-Side Full 3x3 Bottom Face Diagram + Legend */}
                      <div className="bg-slate-950/80 border border-white/10 rounded-xl p-2.5 flex items-center gap-3 shadow-inner">
                        <div className="w-24 h-24 flex-shrink-0">
                          {renderCrossSVG()}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Bottom Face</span>
                            <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/10">
                              <button onClick={() => setDiagramView('scrambled')} className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${diagramView === 'scrambled' ? 'bg-orange-500 text-slate-950' : 'text-slate-400'}`}>Start</button>
                              <button onClick={() => setDiagramView('solved')} className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer ${diagramView === 'solved' ? 'bg-green-500 text-slate-950' : 'text-slate-400'}`}>Goal</button>
                            </div>
                          </div>
                          <div className="text-[10px] leading-snug space-y-0.5">
                            <div className="text-green-400 font-semibold">• Front & Right: Ready</div>
                            <div className={diagramView === 'solved' ? 'text-green-400 font-semibold' : 'text-amber-300 font-semibold'}>
                              • Back & Left: {diagramView === 'solved' ? 'Matched!' : 'Flipped'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline Mode Switcher: Move Count OR Eyes-Closed Drill */}
                    {crossMode === 'efficiency' ? (
                      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] p-3.5 shadow-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Turns You Used</span>
                            <span className="text-[11px] font-bold text-orange-400">Goal: {crossTier + 1} Turns or Less</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setUserMoves((m) => Math.max(1, m - 1)); setEfficiencyFeedback(null); emitBeep(760, 'triangle', 0.05); }} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 font-black text-white active:scale-90 cursor-pointer">-</button>
                            <span className="font-mono text-lg font-black text-white w-7 text-center">{userMoves}</span>
                            <button onClick={() => { setUserMoves((m) => Math.min(20, m + 1)); setEfficiencyFeedback(null); emitBeep(760, 'triangle', 0.05); }} className="w-7 h-7 rounded-full bg-white/5 border border-white/10 font-black text-white active:scale-90 cursor-pointer">+</button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const target = crossTier + 1;
                            const diff = userMoves - target;
                            if (diff <= 0) {
                              emitBeep(960, 'sine', 0.12);
                              setOptimalCrossCount((c) => c + 1);
                              setEfficiencyFeedback({
                                optimal: true,
                                title: `Optimal! (${userMoves}/${target} turns)`,
                                detail: 'Clean efficiency! Ready for the next scramble.'
                              });
                            } else {
                              emitBeep(420, 'triangle', 0.12);
                              setEfficiencyFeedback({
                                optimal: false,
                                title: `${diff} Extra Turn${diff === 1 ? '' : 's'} (${userMoves} vs ${target})`,
                                detail: 'Tip: Rotate D / D\' to align open slots before dropping edges.'
                              });
                            }
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 border border-orange-400/30 active:scale-95 transition-all cursor-pointer"
                        >
                          Check My Turn Count
                        </button>
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] p-3.5 shadow-xl space-y-2.5 relative">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">Eyes-Closed Memory</span>
                            <button
                              onClick={() => { emitBeep(520); setShowEyesClosedGuide((prev) => !prev); }}
                              className="w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/35 text-orange-400 font-black text-[10px] flex items-center justify-center cursor-pointer"
                              title="How Eyes-Closed Drill Works"
                            >
                              ?
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                              Streak: {eyesClosedStreak}
                            </span>
                            <button
                              onClick={() => { emitBeep(520); setCrossTab('blind'); }}
                              className="text-[10px] font-black text-orange-400 hover:underline cursor-pointer"
                            >
                              15s Timer →
                            </button>
                          </div>
                        </div>

                        {showEyesClosedGuide ? (
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2.5 text-left space-y-1.5">
                            <p className="text-[10px] text-slate-200 leading-snug">
                              <strong>1.</strong> Scramble your physical 3x3 above. <strong>2.</strong> Plan all {crossTier + 1} moves with no timer. <strong>3.</strong> Close your eyes, solve the cross, then open to verify!
                            </p>
                            <button
                              onClick={() => { emitBeep(640); setShowEyesClosedGuide(false); }}
                              className="text-[10px] font-black text-orange-400 underline cursor-pointer"
                            >
                              Dismiss tip
                            </button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 leading-snug">
                            Plan the {crossTier + 1}-move cross on your physical cube, close your eyes, and execute from memory.
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              emitBeep(960, 'sine', 0.12);
                              setEyesClosedStreak((s) => s + 1);
                              setCrossScrambleIdx((p) => p + 1);
                              triggerToast('Clean Eyes-Closed Cross! Next scramble loaded.');
                            }}
                            className="py-2.5 px-2 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/35 text-green-300 font-black text-[11px] cursor-pointer active:scale-95 transition-all"
                          >
                            Nailed It (Eyes Closed)
                          </button>
                          <button
                            onClick={() => {
                              emitBeep(360, 'triangle', 0.12);
                              setEyesClosedStreak(0);
                              triggerToast('Reset cube & trace the moves one piece at a time.');
                            }}
                            className="py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-[11px] cursor-pointer active:scale-95 transition-all"
                          >
                            Missed — Retry
                          </button>
                        </div>
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
                      <div className="flex items-center gap-2">
                        {!showBlindGuide && (
                          <button
                            onClick={() => { emitBeep(520); setShowBlindGuide(true); }}
                            className="w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/35 text-orange-400 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                            title="How Blind Run Works"
                          >
                            ?
                          </button>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                          {blindRuns.clean}/{blindRuns.total} Clean
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.75rem] p-3.5 shadow-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                          Scramble Your Cube • {crossTier + 1} Moves
                        </span>
                        <button
                          onClick={() => { emitBeep(440); setCrossScrambleIdx((p) => p + 1); }}
                          className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-orange-400 active:scale-95 cursor-pointer"
                        >
                          New Scramble
                        </button>
                      </div>
                      <div className="bg-[#050811] border border-white/10 rounded-xl py-2 px-3 text-center shadow-inner">
                        <div className="font-mono text-base font-black text-amber-300 tracking-wider select-all">{activeScramble}</div>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">Hold White on Bottom • Green Facing You</p>
                    </div>

                    {showBlindGuide && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-[1.75rem] p-4 space-y-2.5 shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">How Blind Run Works</span>
                          <span className="text-[10px] font-semibold text-slate-400">Physical 3x3 Required</span>
                        </div>
                        <p className="text-[11px] text-slate-200 leading-relaxed">
                          Training your cross eyes-closed forces you to plan every move during inspection so your eyes can later look ahead to F2L pairs:
                        </p>
                        <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                          <li>Apply the scramble above to your physical 3x3 cube.</li>
                          <li>Tap <strong>Start 15s Inspection</strong> and trace the cross in your head.</li>
                          <li>Rest both thumbs on the fingerprint targets below until green, lift to start, and solve with your eyes closed!</li>
                        </ol>
                        <button
                          onClick={() => { emitBeep(640); setShowBlindGuide(false); }}
                          className="w-full py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 font-black text-[11px] cursor-pointer transition-all"
                        >
                          Got It, Dismiss Guide
                        </button>
                      </div>
                    )}

                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-xl text-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WCA Inspection Timer</span>
                      <div className={`font-mono text-5xl font-black my-2 ${blindState === 'dnf' ? 'text-red-500' : inspectionTime <= 3 && blindState === 'inspecting' ? 'text-amber-400' : 'text-white'}`}>
                        {inspectionTime.toFixed(1)}s
                      </div>
                      <p className="text-xs font-bold text-orange-400">
                        {blindState === 'idle' && 'Ready to inspect'}
                        {blindState === 'inspecting' && 'Inspecting — Rest both thumbs on the mat to arm'}
                        {blindState === 'readying' && 'Hold steady (0.35s)...'}
                        {blindState === 'armed' && 'ARMED (Green) — Lift both thumbs to start!'}
                        {blindState === 'dnf' && 'DNF (+15s inspection exceeded)'}
                        {blindState === 'finished' && `Finished in ${blindExecTime.toFixed(2)}s`}
                      </p>
                    </div>

                    {(blindState === 'idle' || blindState === 'dnf') && (
                      <button
                        onClick={startWCAInspection}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 cursor-pointer active:scale-95"
                      >
                        Start 15s Inspection
                      </button>
                    )}

                    <div
                      className={`bg-slate-950/80 border border-white/10 rounded-[2rem] p-4 shadow-inner transition-all touch-none ${blindState === 'inspecting' || blindState === 'readying' || blindState === 'armed' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}
                    >
                      <div className="flex items-center justify-between mb-2.5 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">2-Thumb Timer Mat</span>
                        <span className="text-[9px] font-bold text-orange-400">
                          {blindState === 'armed'
                            ? 'Both Thumbs Ready — Lift to Start!'
                            : leftPadHeld || rightPadHeld
                              ? 'Place Other Thumb...'
                              : 'Rest Both Thumbs Below'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onPointerDown={(e) => { e.preventDefault(); handlePadTouchStart('left'); }}
                          onPointerUp={() => handlePadTouchEnd('left')}
                          onPointerCancel={() => handlePadTouchEnd('left')}
                          className={`flex-1 h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all select-none cursor-pointer ${
                            blindState === 'armed'
                              ? 'bg-green-500/20 border-green-400 text-green-300 scale-[0.98] shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                              : leftPadHeld
                                ? 'bg-orange-500/20 border-orange-400 text-orange-300 scale-[0.98]'
                                : 'border-dashed border-white/20 bg-white/5 text-slate-400 hover:border-orange-500/40'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                            blindState === 'armed' ? 'border-green-400 bg-green-500/20' : leftPadHeld ? 'border-orange-400 bg-orange-500/20' : 'border-white/15 bg-slate-900/80'
                          }`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                              <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                              <path d="M2 12a10 10 0 0 1 18-6"/>
                              <path d="M2 16h.01"/>
                              <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
                              <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
                              <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
                            </svg>
                          </div>
                          <span className="text-[10px] font-black tracking-wider uppercase">Left Thumb</span>
                        </button>

                        <button
                          type="button"
                          onPointerDown={(e) => { e.preventDefault(); handlePadTouchStart('right'); }}
                          onPointerUp={() => handlePadTouchEnd('right')}
                          onPointerCancel={() => handlePadTouchEnd('right')}
                          className={`flex-1 h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all select-none cursor-pointer ${
                            blindState === 'armed'
                              ? 'bg-green-500/20 border-green-400 text-green-300 scale-[0.98] shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                              : rightPadHeld
                                ? 'bg-orange-500/20 border-orange-400 text-orange-300 scale-[0.98]'
                                : 'border-dashed border-white/20 bg-white/5 text-slate-400 hover:border-orange-500/40'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                            blindState === 'armed' ? 'border-green-400 bg-green-500/20' : rightPadHeld ? 'border-orange-400 bg-orange-500/20' : 'border-white/15 bg-slate-900/80'
                          }`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                              <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                              <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
                              <path d="M2 12a10 10 0 0 1 18-6"/>
                              <path d="M2 16h.01"/>
                              <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                              <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
                              <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
                              <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
                            </svg>
                          </div>
                          <span className="text-[10px] font-black tracking-wider uppercase">Right Thumb</span>
                        </button>
                      </div>
                    </div>

                    {blindState === 'finished' && (
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-xl space-y-2.5">
                        <span className="text-xs font-bold text-slate-300 block text-center">Open your eyes — how did the cross turn out?</span>
                        <div className="grid grid-cols-3 gap-2">
                          <button onClick={() => logBlindOutcome('Clean')} className="py-2.5 bg-green-500/15 border border-green-500/35 text-green-400 text-xs font-black rounded-xl cursor-pointer">Clean</button>
                          <button onClick={() => logBlindOutcome('+2')} className="py-2.5 bg-amber-500/15 border border-amber-500/35 text-amber-400 text-xs font-black rounded-xl cursor-pointer">+2</button>
                          <button onClick={() => logBlindOutcome('DNF')} className="py-2.5 bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-black rounded-xl cursor-pointer">DNF</button>
                        </div>
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
                      {MECHANICS_LIST.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { emitBeep(520); setActiveMechanic(m.id); }}
                          className={`py-3 px-3 rounded-2xl text-xs transition-all cursor-pointer text-left ${activeMechanic === m.id ? 'bg-orange-500 text-slate-950 font-black shadow-md' : 'bg-white/5 border border-white/10 text-slate-300 font-bold hover:bg-white/10'}`}
                        >
                          {m.id}. {m.title}
                        </button>
                      ))}
                    </div>

                    {(() => {
                      const currentMech = MECHANICS_LIST.find((m) => m.id === activeMechanic) || MECHANICS_LIST[0];
                      return (
                        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Mechanic {currentMech.id} • {currentMech.step}</span>
                              <h3 className="text-lg font-black text-white">{currentMech.title}</h3>
                            </div>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{currentMech.desc}</p>
                          <div className="bg-[#050811] border border-white/10 rounded-2xl p-3.5 text-left shadow-inner">
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-1">Speed Coach Note</span>
                            <p className="text-xs text-slate-300">{currentMech.tip}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {crossTab === 'settings' && renderSettingsDeck('oll')}
              </main>
            </div>

            {/* ========================================================= */}
            {/* PHASE 2: F2L (FIRST TWO LAYERS — 41 CASES)                */}
            {/* ========================================================= */}
            <div className={getPhaseClass('f2l')}>
              <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative">

                {/* F2L TAB 1: THE GRIND */}
                {f2lTab === 'grind' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">CFOP Step 2 • Front-Right Slot</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">F2L Daily Grind</h2>
                      </div>
                      <button
                        onClick={() => openCurriculumArchitect('f2l')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 text-xs font-bold active:scale-95 cursor-pointer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>
                        <span>Curriculum</span>
                      </button>
                    </div>

                    {/* Reference Orientation & Beginner/Realistic Scramble Toggle */}
                    <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">Hold Cube Orientation</span>
                          <span className="text-[11px] font-bold text-slate-200">White Bottom • Orange Front</span>
                        </div>
                        <div className="bg-slate-950 p-1 rounded-xl border border-white/10 flex items-center">
                          <button
                            onClick={() => { emitBeep(500); setF2lScrambleStyle('beginner'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${f2lScrambleStyle === 'beginner' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                          >
                            Beginner
                          </button>
                          <button
                            onClick={() => { emitBeep(500); setF2lScrambleStyle('realistic'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${f2lScrambleStyle === 'realistic' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                          >
                            Realistic
                          </button>
                        </div>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-snug border-t border-white/5 pt-2">
                        {f2lScrambleStyle === 'beginner'
                          ? 'Start from a solved cube: sets up only the Front-Right target pair while keeping the White Cross and other 3 slots solved.'
                          : 'Start from a solved cube: keeps the White Cross intact, scrambles the back/left slots like a real solve, and sets the Front-Right target pair.'}
                      </p>
                    </div>

                    {/* Active Phase Card */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between items-center text-center relative overflow-hidden space-y-4">
                      <div className="flex items-center justify-between w-full z-10">
                        <button onClick={() => changeF2LDay(-1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white active:scale-90 cursor-pointer">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Phase</span>
                          <h3 className="text-3xl font-black text-white tracking-tight mt-0.5">Day {currentF2LDay}</h3>
                        </div>
                        <button onClick={() => changeF2LDay(1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white active:scale-90 cursor-pointer">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                      </div>

                      <div className="z-10 space-y-2 px-1">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          <span>{currentF2LDayPlan.mode.toUpperCase()} MODE • {f2lSessionCases.length} PAIRS</span>
                        </span>
                        <h4 className="text-lg font-black text-white leading-snug">{currentF2LDayPlan.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">{currentF2LDayPlan.desc}</p>
                      </div>

                      <button
                        onClick={() => { emitBeep(880, 'sine', 0.1); setF2lSessionIdx(0); setF2lSessionShowAlg(false); setF2lSessionAufIdx(0); setTimerElapsed(0); setInlineF2lSessionFtOpen(false); setActiveModal('f2lSession'); }}
                        className="z-10 w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-sm active:scale-95 cursor-pointer shadow-lg shadow-orange-500/25 border border-orange-400/30 flex items-center justify-center gap-2"
                      >
                        <span>Start Day {currentF2LDay} Session</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    </div>

                    {/* Day Lineup (Hold & Drag to Reorder) */}
                    <div
                      onPointerMove={handleLineupPointerMove}
                      onPointerUp={handleLineupPointerUp}
                      onPointerCancel={handleLineupPointerUp}
                      onTouchMove={(e) => {
                        if (draggedLineupIdx === null && e.touches && e.touches[0]) {
                          handleLineupPreHoldMove(e.touches[0].clientY);
                        }
                      }}
                      onTouchEnd={handleLineupPointerUp}
                      onTouchCancel={handleLineupPointerUp}
                      className={`bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-2.5 ${draggedLineupIdx !== null && dragLineupPhase === 'f2l' ? 'touch-none select-none overflow-hidden' : ''}`}
                    >
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Day {currentF2LDay} Lineup</span>
                          <span className="text-[9px] font-semibold text-slate-500">
                            {draggedLineupIdx !== null && dragLineupPhase === 'f2l' ? 'Drag up or down to place...' : 'Hold & drag to reorder'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{f2lSessionCases.length} Pairs</span>
                      </div>

                      <div className="space-y-2">
                        {f2lSessionCases.map((item, idx) => {
                          const isBeingDragged = draggedLineupIdx === idx && dragLineupPhase === 'f2l';
                          const isPressing = lineupPressIdx === idx && draggedLineupIdx === null && dragLineupPhase === 'f2l';
                          return (
                            <div
                              key={item.id}
                              ref={(el) => { f2lLineupItemRefs.current[idx] = el; }}
                              onContextMenu={(e) => e.preventDefault()}
                              onPointerDown={(e) => {
                                if (e.pointerType === 'touch') return;
                                handleLineupPointerDown(idx, e.clientY, 'f2l');
                              }}
                              onTouchStart={(e) => {
                                const y = e.touches && e.touches[0] ? e.touches[0].clientY : null;
                                handleLineupPointerDown(idx, y, 'f2l');
                              }}
                              onClick={() => {
                                if (lineupDidDragRef.current) {
                                  lineupDidDragRef.current = false;
                                  return;
                                }
                                emitBeep(600);
                                setF2lDrillCase(item);
                                setF2lShowDrillAlg(false);
                                setF2lDrillAufIdx(0);
                                setTimerElapsed(0);
                                setInlineF2lDrillFtOpen(false);
                                setActiveModal('f2lDrill');
                              }}
                              className={`bg-[#050811] border rounded-2xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all select-none ${
                                isBeingDragged
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-2xl shadow-orange-500/20 z-20 relative'
                                  : isPressing
                                    ? 'border-orange-500/50 scale-[0.99]'
                                    : 'border-white/10 hover:border-orange-500/40'
                              }`}
                            >
                              <div className={`pl-0.5 flex flex-col items-center justify-center ${isBeingDragged ? 'text-orange-400' : 'text-slate-600'}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="9" cy="6" r="1.8" />
                                  <circle cx="15" cy="6" r="1.8" />
                                  <circle cx="9" cy="12" r="1.8" />
                                  <circle cx="15" cy="12" r="1.8" />
                                  <circle cx="9" cy="18" r="1.8" />
                                  <circle cx="15" cy="18" r="1.8" />
                                </svg>
                              </div>

                              <div className="w-11 h-11 flex-shrink-0 bg-slate-200 rounded-xl p-1 flex items-center justify-center shadow-inner pointer-events-none">
                                <img
                                  src={getF2LImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0 pointer-events-none">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-white truncate">{item.name}</span>
                                  {hasYRotation(item.alg) && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[8px] font-black text-amber-300">ROT</span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-orange-400/90 block truncate mt-0.5">{item.alg}</span>
                              </div>
                              <span className={`text-xs font-mono font-bold pr-1 pointer-events-none ${isBeingDragged ? 'text-orange-400' : 'text-slate-500'}`}>
                                #{idx + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Personalized F2L Journey Card */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">F2L Mastery Plan</span>
                        <div className="text-lg font-black text-white mt-0.5">{Math.max(0, totalF2LDays - currentF2LDay)} Days Remaining</div>
                        <span className="text-[11px] font-bold text-orange-400">{totalF2LDays} Total Days Plan</span>
                      </div>
                      <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                        <span className="font-mono text-xs font-black text-orange-400">{f2lProgressPct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* F2L TAB 2: ALGORITHMS LIBRARY */}
                {f2lTab === 'algorithms' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">F2L Pair Hub</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">F2L Cases (41)</h2>
                      <p className="text-xs text-slate-400 mt-1">White on Bottom • Orange in Front • Front-Right target slot.</p>
                    </div>

                    <div className="bg-slate-950/80 p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
                      <button onClick={() => { emitBeep(); setF2lLibraryMode('standard'); setF2lSelectedCategory(null); }} className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${f2lLibraryMode === 'standard' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>6 Pair Groups</button>
                      <button onClick={() => { emitBeep(); setF2lLibraryMode('custom'); setF2lSelectedCategory(null); }} className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${f2lLibraryMode === 'custom' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>My Custom Chunks</button>
                    </div>

                    {!f2lSelectedCategory ? (
                      f2lLibraryMode === 'standard' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {f2lGroups.map((group) => {
                            const casesInGroup = F2L_DATA.filter((c) => c.group === group);
                            const sampleCase = casesInGroup[0] || F2L_DATA[0];
                            return (
                              <button
                                key={group}
                                onClick={() => { emitBeep(520); setF2lSelectedCategory({ type: 'group', name: group }); }}
                                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex flex-col items-center text-center hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer space-y-2.5"
                              >
                                <div className="w-20 h-20 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                                  <img
                                    src={getF2LImageUrl(sampleCase.alg)}
                                    alt={group}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <h4 className="text-xs font-black text-white leading-tight">{group}</h4>
                                <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider text-orange-400">
                                  {casesInGroup.length} Pairs
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-300">{userF2LChunks.length} Active F2L Chunks</span>
                            <button onClick={() => openCurriculumArchitect('f2l')} className="text-xs font-black text-orange-400 hover:underline cursor-pointer">
                              Edit Curriculum
                            </button>
                          </div>

                          {userF2LChunks.map((chk, idx) => {
                            const casesInChunk = chk.caseIds.map((id) => F2L_DATA.find((c) => c.id === id)).filter(Boolean);
                            const sampleCase = casesInChunk[0] || F2L_DATA[0];
                            const solvedCount = casesInChunk.filter((c) => (currentUser.f2lStats?.[c.id]?.best || 999) <= currentUser.targetGoal).length;
                            return (
                              <div
                                key={chk.id}
                                onClick={() => { emitBeep(520); setF2lSelectedCategory({ type: 'chunk', chunk: chk, index: idx }); }}
                                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex items-center justify-between gap-3 cursor-pointer hover:border-orange-500/40 active:scale-[0.98] transition-all"
                              >
                                <div className="w-16 h-16 flex-shrink-0 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                                  <img
                                    src={getF2LImageUrl(sampleCase.alg)}
                                    alt={chk.title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-black text-white leading-snug">{chk.title}</h4>
                                  <span className="text-[11px] text-slate-400 block mt-1">{casesInChunk.length} pairs • {solvedCount}/{casesInChunk.length} sub-goal</span>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex flex-col items-center justify-center flex-shrink-0">
                                  <span className="text-[8px] font-bold uppercase text-orange-300">Chunk</span>
                                  <span className="font-mono text-xs font-black text-orange-400">{idx + 1}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => { emitBeep(440); setF2lSelectedCategory(null); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider text-orange-400 cursor-pointer"
                          >
                            <span>‹ Back to Categories</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-white">
                            {f2lSelectedCategory.type === 'group' ? f2lSelectedCategory.name : f2lSelectedCategory.chunk.title}
                          </h3>
                          <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black text-orange-400">
                            {f2lSelectedCategory.type === 'group'
                              ? F2L_DATA.filter((c) => c.group === f2lSelectedCategory.name).length
                              : f2lSelectedCategory.chunk.caseIds.length} Cases
                          </span>
                        </div>

                        {(f2lSelectedCategory.type === 'group'
                          ? F2L_DATA.filter((c) => c.group === f2lSelectedCategory.name)
                          : f2lSelectedCategory.chunk.caseIds.map((id) => F2L_DATA.find((c) => c.id === id)).filter(Boolean)
                        ).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => { emitBeep(600); setF2lDrillCase(item); setF2lShowDrillAlg(false); setF2lDrillAufIdx(0); setTimerElapsed(0); setInlineF2lDrillFtOpen(false); setActiveModal('f2lDrill'); }}
                            className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-2.5 cursor-pointer hover:border-orange-500/40 active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-16 h-16 flex-shrink-0 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                                <img
                                  src={getF2LImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-sm font-black text-white truncate">{item.name}</h4>
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-slate-400">#{item.f2lNo}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  {hasYRotation(item.alg) && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-[9px] font-black text-amber-300">
                                      ⚠️ Rotation
                                    </span>
                                  )}
                                  {isFingertricksEnabled && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openFingertrickDossier(item, null, 'f2l'); }}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[10px] font-bold text-amber-300 cursor-pointer"
                                    >
                                      <span>⚡ Fingertricks</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 text-center font-mono text-xs font-black text-orange-400">
                              {item.alg}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* F2L TAB 3: STATISTICS */}
                {f2lTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="text-center">
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">F2L Performance</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">F2L Statistics</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Goal</span>
                        <span className="font-mono text-base font-black text-amber-300">{currentUser.targetGoal.toFixed(1)}s</span>
                      </div>
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Total Runs</span>
                        <span className="font-mono text-base font-black text-white">{totalF2LRecordedRuns}</span>
                      </div>
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">All-Time PR</span>
                        <span className="font-mono text-base font-black text-orange-400">
                          {allTimeF2LBestPR !== null ? `${allTimeF2LBestPR.toFixed(2)}s` : '--s'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pt-1">41 F2L Pairs (Tap to Drill)</p>

                    <div className="space-y-2.5">
                      {F2L_DATA.map((item) => {
                        const caseStat = currentUser.f2lStats?.[item.id];
                        const best = caseStat?.best ?? null;
                        const delta = best !== null ? +(best - currentUser.targetGoal).toFixed(2) : null;
                        return (
                          <div
                            key={item.id}
                            onClick={() => { emitBeep(560); setF2lDrillCase(item); setF2lShowDrillAlg(false); setF2lDrillAufIdx(0); setTimerElapsed(0); setInlineF2lDrillFtOpen(false); setActiveModal('f2lDrill'); }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/70 transition-all"
                          >
                            <div className="w-12 h-12 flex-shrink-0 bg-slate-200 rounded-xl p-1 flex items-center justify-center shadow-inner">
                              <img
                                src={getF2LImageUrl(item.alg)}
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-black text-white block truncate">{item.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.group} • #{item.f2lNo}</span>
                            </div>
                            <div className="text-right font-mono flex items-center gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-400 block">{best !== null ? `${best.toFixed(2)}s` : 'No runs'}</span>
                                {delta !== null && (
                                  <span className={`text-[10px] font-bold ${best <= currentUser.targetGoal ? 'text-green-400' : 'text-orange-400'}`}>
                                    {delta <= 0 ? `${delta.toFixed(2)}s` : `+${delta.toFixed(2)}s`}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-xs">›</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* F2L TAB 4: SHARED SETTINGS DECK */}
                {f2lTab === 'settings' && renderSettingsDeck('f2l')}
              </main>
            </div>

            {/* ========================================================= */}
            {/* PHASE 3: OLL                                              */}
            {/* ========================================================= */}
            <div className={getPhaseClass('oll')}>
              <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative">

                {/* TAB 1: THE GRIND */}
                {ollTab === 'grind' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Training Hub</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">Daily Grind</h2>
                      </div>
                      <button
                        onClick={() => openCurriculumArchitect('oll')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 text-xs font-bold active:scale-95 cursor-pointer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>
                        <span>Curriculum</span>
                      </button>
                    </div>

                    {/* Active Phase Card */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between items-center text-center relative overflow-hidden space-y-4">
                      <div className="flex items-center justify-between w-full z-10">
                        <button onClick={() => changeOLLDay(-1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white active:scale-90 cursor-pointer">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Phase</span>
                          <h3 className="text-3xl font-black text-white tracking-tight mt-0.5">Day {currentDay}</h3>
                        </div>
                        <button onClick={() => changeOLLDay(1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-white active:scale-90 cursor-pointer">
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                      </div>

                      <div className="z-10 space-y-2 px-1">
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-wider">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                          <span>{currentDayPlan.mode.toUpperCase()} MODE • {sessionCases.length} CASES</span>
                        </span>
                        <h4 className="text-lg font-black text-white leading-snug">{currentDayPlan.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-[260px] mx-auto">{currentDayPlan.desc}</p>
                      </div>

                      <button
                        onClick={() => { emitBeep(880, 'sine', 0.1); setSessionIdx(0); setSessionShowAlg(false); setSessionAufIdx(0); setTimerElapsed(0); setInlineSessionFtOpen(false); setActiveModal('session'); }}
                        className="z-10 w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-sm active:scale-95 cursor-pointer shadow-lg shadow-orange-500/25 border border-orange-400/30 flex items-center justify-center gap-2"
                      >
                        <span>Start Day {currentDay} Session</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    </div>

                    {/* Today's Scheduled Cases List */}
                    <div
                      onPointerMove={handleLineupPointerMove}
                      onPointerUp={handleLineupPointerUp}
                      onPointerCancel={handleLineupPointerUp}
                      onTouchMove={(e) => {
                        if (draggedLineupIdx === null && e.touches && e.touches[0]) {
                          handleLineupPreHoldMove(e.touches[0].clientY);
                        }
                      }}
                      onTouchEnd={handleLineupPointerUp}
                      onTouchCancel={handleLineupPointerUp}
                      className={`bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-2.5 ${draggedLineupIdx !== null && dragLineupPhase === 'oll' ? 'touch-none select-none overflow-hidden' : ''}`}
                    >
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Day {currentDay} Lineup</span>
                          <span className="text-[9px] font-semibold text-slate-500">
                            {draggedLineupIdx !== null && dragLineupPhase === 'oll' ? 'Drag up or down to place...' : 'Hold & drag to reorder'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{sessionCases.length} Cases</span>
                      </div>

                      <div className="space-y-2">
                        {sessionCases.map((item, idx) => {
                          const isBeingDragged = draggedLineupIdx === idx && dragLineupPhase === 'oll';
                          const isPressing = lineupPressIdx === idx && draggedLineupIdx === null && dragLineupPhase === 'oll';
                          return (
                            <div
                              key={item.id}
                              ref={(el) => { lineupItemRefs.current[idx] = el; }}
                              onContextMenu={(e) => e.preventDefault()}
                              onPointerDown={(e) => {
                                if (e.pointerType === 'touch') return;
                                handleLineupPointerDown(idx, e.clientY, 'oll');
                              }}
                              onTouchStart={(e) => {
                                const y = e.touches && e.touches[0] ? e.touches[0].clientY : null;
                                handleLineupPointerDown(idx, y, 'oll');
                              }}
                              onClick={() => {
                                if (lineupDidDragRef.current) {
                                  lineupDidDragRef.current = false;
                                  return;
                                }
                                emitBeep(600);
                                setDrillCase(item);
                                setShowDrillAlg(false);
                                setDrillAufIdx(0);
                                setTimerElapsed(0);
                                setInlineDrillFtOpen(false);
                                setActiveModal('drill');
                              }}
                              className={`bg-[#050811] border rounded-2xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all select-none ${
                                isBeingDragged
                                  ? 'border-orange-500 bg-orange-500/15 scale-[1.02] shadow-2xl shadow-orange-500/20 z-20 relative'
                                  : isPressing
                                    ? 'border-orange-500/50 scale-[0.99]'
                                    : 'border-white/10 hover:border-orange-500/40'
                              }`}
                            >
                              <div className={`pl-0.5 flex flex-col items-center justify-center ${isBeingDragged ? 'text-orange-400' : 'text-slate-600'}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="9" cy="6" r="1.8" />
                                  <circle cx="15" cy="6" r="1.8" />
                                  <circle cx="9" cy="12" r="1.8" />
                                  <circle cx="15" cy="12" r="1.8" />
                                  <circle cx="9" cy="18" r="1.8" />
                                  <circle cx="15" cy="18" r="1.8" />
                                </svg>
                              </div>

                              <div className="w-11 h-11 flex-shrink-0 bg-slate-200 rounded-xl p-1 flex items-center justify-center shadow-inner pointer-events-none">
                                <img
                                  src={getOLLImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex-1 min-w-0 pointer-events-none">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-white truncate">{item.name}</span>
                                  <span className="text-[9px] font-mono text-slate-400">#{item.ollNo}</span>
                                </div>
                                <span className="font-mono text-[10px] text-orange-400/90 block truncate mt-0.5">{item.alg}</span>
                              </div>
                              <span className={`text-xs font-mono font-bold pr-1 pointer-events-none ${isBeingDragged ? 'text-orange-400' : 'text-slate-500'}`}>
                                #{idx + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Personalized Journey Card */}
                    <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Personalized Journey</span>
                        <div className="text-lg font-black text-white mt-0.5">{Math.max(0, totalDays - currentDay)} Days Remaining</div>
                        <span className="text-[11px] font-bold text-orange-400">{totalDays} Total Days Plan</span>
                      </div>
                      <div className="w-14 h-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                        <span className="font-mono text-xs font-black text-orange-400">{progressPct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ALGORITHMS LIBRARY */}
                {ollTab === 'algorithms' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Algorithm Hub</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Algorithms</h2>
                      <p className="text-xs text-slate-400 mt-1">Explore by classic shape categories or view your custom curriculum chunks.</p>
                    </div>

                    <div className="bg-slate-950/80 p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
                      <button onClick={() => { emitBeep(); setOllLibraryMode('standard'); setSelectedCategory(null); }} className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${ollLibraryMode === 'standard' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>Standard Library</button>
                      <button onClick={() => { emitBeep(); setOllLibraryMode('custom'); setSelectedCategory(null); }} className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${ollLibraryMode === 'custom' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}>My Custom Chunks</button>
                    </div>

                    {!selectedCategory ? (
                      ollLibraryMode === 'standard' ? (
                        <div className="grid grid-cols-2 gap-3">
                          {ollGroups.map((group) => {
                            const casesInGroup = OLL_DATA.filter((c) => c.group === group);
                            const sampleCase = casesInGroup[0] || OLL_DATA[0];
                            return (
                              <button
                                key={group}
                                onClick={() => { emitBeep(520); setSelectedCategory({ type: 'group', name: group }); }}
                                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex flex-col items-center text-center hover:bg-slate-800/80 active:scale-95 transition-all cursor-pointer space-y-2.5"
                              >
                                <div className="w-20 h-20 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                                  <img
                                    src={getOLLImageUrl(sampleCase.alg)}
                                    alt={group}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <h4 className="text-sm font-black text-white">{group}</h4>
                                <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider text-orange-400">
                                  {casesInGroup.length} Cases
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-300">{userChunks.length} Active Chunks feeding your program</span>
                            <button onClick={() => openCurriculumArchitect('oll')} className="text-xs font-black text-orange-400 hover:underline cursor-pointer">
                              Edit Curriculum
                            </button>
                          </div>

                          {userChunks.map((chk, idx) => {
                            const casesInChunk = chk.caseIds.map((id) => OLL_DATA.find((c) => c.id === id)).filter(Boolean);
                            const sampleCase = casesInChunk[0] || OLL_DATA[0];
                            const solvedCount = casesInChunk.filter((c) => (currentUser.stats?.[c.id]?.best || 999) <= currentUser.targetGoal).length;
                            return (
                              <div
                                key={chk.id}
                                onClick={() => { emitBeep(520); setSelectedCategory({ type: 'chunk', chunk: chk, index: idx }); }}
                                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl flex items-center justify-between gap-3 cursor-pointer hover:border-orange-500/40 active:scale-[0.98] transition-all"
                              >
                                <div className="w-16 h-16 flex-shrink-0 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                                  <img
                                    src={getOLLImageUrl(sampleCase.alg)}
                                    alt={chk.title}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-black text-white leading-snug">{chk.title}</h4>
                                  <span className="text-[11px] text-slate-400 block mt-1">{casesInChunk.length} algorithms • {solvedCount}/{casesInChunk.length} sub-goal</span>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex flex-col items-center justify-center flex-shrink-0">
                                  <span className="text-[8px] font-bold uppercase text-orange-300">Chunk</span>
                                  <span className="font-mono text-xs font-black text-orange-400">{idx + 1}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => { emitBeep(440); setSelectedCategory(null); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider text-orange-400 cursor-pointer"
                          >
                            <span>‹ Back to Categories</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-white">
                            {selectedCategory.type === 'group' ? selectedCategory.name : selectedCategory.chunk.title}
                          </h3>
                          <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black text-orange-400">
                            {selectedCategory.type === 'group'
                              ? OLL_DATA.filter((c) => c.group === selectedCategory.name).length
                              : selectedCategory.chunk.caseIds.length} Cases
                          </span>
                        </div>

                        {(selectedCategory.type === 'group'
                          ? OLL_DATA.filter((c) => c.group === selectedCategory.name)
                          : selectedCategory.chunk.caseIds.map((id) => OLL_DATA.find((c) => c.id === id)).filter(Boolean)
                        ).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => { emitBeep(600); setDrillCase(item); setShowDrillAlg(false); setDrillAufIdx(0); setTimerElapsed(0); setInlineDrillFtOpen(false); setActiveModal('drill'); }}
                            className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3 cursor-pointer hover:border-orange-500/40 active:scale-[0.98] transition-all"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-16 h-16 flex-shrink-0 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                                <img
                                  src={getOLLImageUrl(item.alg)}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-base font-black text-white truncate">{item.name}</h4>
                                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-slate-400">#{item.id}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[10px] font-mono text-slate-400">WCA OLL #{item.ollNo}</span>
                                  {isFingertricksEnabled && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openFingertrickDossier(item, null, 'oll'); }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/35 text-[10px] font-bold text-amber-300 cursor-pointer"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                      <span>Fingertricks</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="bg-[#050811] border border-white/10 rounded-xl p-2.5 text-center font-mono text-xs font-black text-orange-400">
                              {item.alg}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: STATISTICS */}
                {ollTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="text-center">
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Performance</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Statistics</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Goal</span>
                        <span className="font-mono text-base font-black text-amber-300">{currentUser.targetGoal.toFixed(1)}s</span>
                      </div>
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Total Runs</span>
                        <span className="font-mono text-base font-black text-white">{totalRecordedRuns}</span>
                      </div>
                      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">All-Time PR</span>
                        <span className="font-mono text-base font-black text-orange-400">
                          {allTimeBestPR !== null ? `${allTimeBestPR.toFixed(2)}s` : '--s'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center pt-1">Case Breakdown (Tap to Drill)</p>

                    <div className="space-y-2.5">
                      {OLL_DATA.map((item) => {
                        const caseStat = currentUser.stats?.[item.id];
                        const best = caseStat?.best ?? null;
                        const delta = best !== null ? +(best - currentUser.targetGoal).toFixed(2) : null;
                        return (
                          <div
                            key={item.id}
                            onClick={() => { emitBeep(560); setDrillCase(item); setShowDrillAlg(false); setDrillAufIdx(0); setTimerElapsed(0); setInlineDrillFtOpen(false); setActiveModal('drill'); }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/70 transition-all"
                          >
                            <div className="w-12 h-12 flex-shrink-0 bg-slate-200 rounded-xl p-1 flex items-center justify-center shadow-inner">
                              <img
                                src={getOLLImageUrl(item.alg)}
                                alt={item.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-black text-white block truncate">{item.name}</span>
                              <span className="text-[10px] font-mono text-slate-400">{item.group} • #{item.id}</span>
                            </div>
                            <div className="text-right font-mono flex items-center gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-400 block">{best !== null ? `${best.toFixed(2)}s` : 'No runs'}</span>
                                {delta !== null && (
                                  <span className={`text-[10px] font-bold ${best <= currentUser.targetGoal ? 'text-green-400' : 'text-orange-400'}`}>
                                    {delta <= 0 ? `${delta.toFixed(2)}s` : `+${delta.toFixed(2)}s`}
                                  </span>
                                )}
                              </div>
                              <span className="text-slate-500 text-xs">›</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 4: SHARED SETTINGS DECK */}
                {ollTab === 'settings' && renderSettingsDeck('oll')}
              </main>
            </div>
          </div>

          {/* FIXED SYMMETRICAL 4-COLUMN BOTTOM NAVIGATION BAR */}
          <nav className="w-full flex-shrink-0 bg-[#090e1c] border-t border-white/10 pt-2.5 pb-6 px-3 z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
            {currentPhase === 'cross' && (
              <div className="grid grid-cols-4 gap-1 w-full">
                {[
                  { id: 'ladder', label: 'Practice', svg: <><path d="M8 3v18"/><path d="M16 3v18"/><path d="M8 7h8"/><path d="M8 12h8"/><path d="M8 17h8"/></> },
                  { id: 'blind', label: 'Blind Run', svg: <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></> },
                  { id: 'mechanics', label: 'Mechanics', svg: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></> },
                  { id: 'settings', label: 'Settings', svg: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></> }
                ].map((tab) => {
                  const isActive = crossTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { emitBeep(460); setCrossTab(tab.id); }}
                      className={`w-full flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all cursor-pointer ${isActive ? 'text-orange-500 scale-105' : 'text-slate-400 hover:text-slate-200 active:scale-95'}`}
                    >
                      <div className={isActive ? "p-2 rounded-xl bg-orange-500/15" : "p-2 rounded-xl bg-transparent"}>
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                          {tab.svg}
                        </svg>
                      </div>
                      <span className={`text-[9.5px] font-black uppercase tracking-tight whitespace-nowrap ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentPhase === 'f2l' && (
              <div className="grid grid-cols-4 gap-1 w-full">
                {[
                  { id: 'grind', label: 'The Grind', svg: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
                  { id: 'algorithms', label: 'Algorithms', svg: <><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></> },
                  { id: 'stats', label: 'Statistics', svg: <><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></> },
                  { id: 'settings', label: 'Settings', svg: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></> }
                ].map((tab) => {
                  const isActive = f2lTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { emitBeep(460); setF2lTab(tab.id); }}
                      className={`w-full flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all cursor-pointer ${isActive ? 'text-orange-500 scale-105' : 'text-slate-400 hover:text-slate-200 active:scale-95'}`}
                    >
                      <div className={isActive ? "p-2 rounded-xl bg-orange-500/15" : "p-2 rounded-xl bg-transparent"}>
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                          {tab.svg}
                        </svg>
                      </div>
                      <span className={`text-[9.5px] font-black uppercase tracking-tight whitespace-nowrap ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentPhase === 'oll' && (
              <div className="grid grid-cols-4 gap-1 w-full">
                {[
                  { id: 'grind', label: 'The Grind', svg: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></> },
                  { id: 'algorithms', label: 'Algorithms', svg: <><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/></> },
                  { id: 'stats', label: 'Statistics', svg: <><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></> },
                  { id: 'settings', label: 'Settings', svg: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></> }
                ].map((tab) => {
                  const isActive = ollTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { emitBeep(460); setOllTab(tab.id); }}
                      className={`w-full flex flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition-all cursor-pointer ${isActive ? 'text-orange-500 scale-105' : 'text-slate-400 hover:text-slate-200 active:scale-95'}`}
                    >
                      <div className={isActive ? "p-2 rounded-xl bg-orange-500/15" : "p-2 rounded-xl bg-transparent"}>
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
                          {tab.svg}
                        </svg>
                      </div>
                      <span className={`text-[9.5px] font-black uppercase tracking-tight whitespace-nowrap ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* ========================================================= */}
        {/* MODALS & OVERLAYS                                         */}
        {/* ========================================================= */}

        {/* 1. BLINDFOLD VISOR OVERLAY */}
        {activeModal === 'visor' && (
          <div onClick={stopBlindVisor} className="fixed inset-0 z-[300] bg-[#03050c]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-center cursor-pointer">
            <div className="space-y-4">
              <div className="w-24 h-24 rounded-full bg-orange-500/15 border-2 border-orange-500/40 flex items-center justify-center text-orange-400 shadow-2xl shadow-orange-500/20 animate-pulse-visor mx-auto">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">EYES CLOSED</h2>
              <p className="text-sm font-bold text-orange-400">EXECUTE!</p>
              <div className="font-mono text-2xl font-black text-slate-300">{blindExecTime.toFixed(2)}s</div>
            </div>
            <div className="absolute bottom-10 w-full max-w-xs mx-auto px-4">
              <div className="w-full py-4 rounded-2xl bg-white/10 border border-white/15 text-white font-black text-sm">
                Tap Anywhere or Press Spacebar to Stop
              </div>
            </div>
          </div>
        )}

        {/* 2. FAMILY PIN SWITCHER MODAL */}
        {activeModal === 'profile' && (
          <div className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Family Profiles</span>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">X</button>
              </div>
              <h3 className="text-xl font-black text-white">Enter 4-Digit PIN</h3>
              <div className="flex justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((idx) => (
                  <span key={idx} className={`w-3.5 h-3.5 rounded-full transition-colors ${pinError ? 'bg-red-500' : idx < pinInput.length ? 'bg-orange-500' : 'border-2 border-white/20'}`}></span>
                ))}
              </div>
              {pinError && <p className="text-xs font-bold text-red-400">Invalid PIN</p>}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button key={digit} onClick={() => handlePinKey(digit)} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">
                    {digit}
                  </button>
                ))}
                <div></div>
                <button onClick={() => handlePinKey('0')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">0</button>
                <button onClick={() => setPinInput((p) => p.slice(0, -1))} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs text-slate-400 cursor-pointer active:scale-95">DEL</button>
              </div>
            </div>
          </div>
        )}

        {/* 3. COLOR ORBIT COMPASS MODAL */}
        {activeModal === 'compass' && (() => {
          const activeQuiz = COMPASS_QUIZZES[compassQuizIdx % COMPASS_QUIZZES.length];
          const colorStyles = {
            Blue: 'bg-blue-500/15 border-blue-500/40 text-blue-400 hover:bg-blue-500/25',
            Orange: 'bg-orange-500/15 border-orange-500/40 text-orange-400 hover:bg-orange-500/25',
            Green: 'bg-green-500/15 border-green-500/40 text-green-400 hover:bg-green-500/25',
            Red: 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
          };

          const triggerHitMe = () => {
            emitBeep(720, 'triangle', 0.08);
            const shuffled = [...compassColorOrder];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            if (shuffled.join(',') === compassColorOrder.join(',')) {
              shuffled.reverse();
            }
            setCompassColorOrder(shuffled);
            setCompassHitMeActive(true);
            setCompassSelectedAnswer(null);
            setCompassQuizRevealed(false);
          };

          const handleSelectCompassColor = (color) => {
            setCompassSelectedAnswer(color);
            setCompassQuizRevealed(true);
            if (color === activeQuiz.a) {
              emitBeep(960, 'sine', 0.12);
            } else {
              emitBeep(240, 'square', 0.14);
            }
          };

          return (
            <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">White Bottom Color Order</span>
                  <button
                    onClick={triggerHitMe}
                    className="px-3 py-1 rounded-full bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    Hit Me
                  </button>
                </div>

                <h3 className="text-xl font-black text-white">Color Orbit Compass</h3>

                <div className="space-y-2.5">
                  {!compassHitMeActive && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Going clockwise around the White bottom center:
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {compassColorOrder.map((color, idx) => {
                      const isPicked = compassSelectedAnswer === color;
                      const isCorrect = color === activeQuiz.a;
                      let ringClass = '';
                      if (compassSelectedAnswer) {
                        if (isPicked && isCorrect) ringClass = 'ring-2 ring-green-400 scale-105';
                        else if (isPicked && !isCorrect) ringClass = 'ring-2 ring-red-400 opacity-80';
                        else if (isCorrect) ringClass = 'ring-2 ring-green-400/70';
                      }

                      return (
                        <React.Fragment key={color}>
                          <button
                            onClick={() => handleSelectCompassColor(color)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all active:scale-95 cursor-pointer ${colorStyles[color]} ${ringClass}`}
                          >
                            {color}
                          </button>
                          {!compassHitMeActive && idx < compassColorOrder.length - 1 && (
                            <span className="text-slate-500 text-xs font-bold">→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-950 border border-white/10 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Mental Map Flashcard</span>
                    <span className="text-[9px] font-semibold text-slate-500">Tap a color above</span>
                  </div>
                  <p className="text-xs font-bold text-white">{activeQuiz.q}</p>
                  {compassQuizRevealed ? (
                    <p className={`text-xs font-black ${compassSelectedAnswer === activeQuiz.a ? 'text-green-400' : compassSelectedAnswer ? 'text-red-400' : 'text-green-400'}`}>
                      {compassSelectedAnswer === activeQuiz.a
                        ? `Correct! ${activeQuiz.a}`
                        : compassSelectedAnswer
                          ? `Not quite (${compassSelectedAnswer}) — Answer: ${activeQuiz.a}`
                          : activeQuiz.a}
                    </p>
                  ) : (
                    <button onClick={() => { emitBeep(640); setCompassQuizRevealed(true); }} className="text-xs font-bold text-orange-400 underline cursor-pointer">Reveal Answer</button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      emitBeep(500);
                      setCompassQuizIdx((p) => p + 1);
                      setCompassQuizRevealed(false);
                      setCompassSelectedAnswer(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs cursor-pointer"
                  >
                    Next Drill
                  </button>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4A. DAILY F2L SESSION RUNNER MODAL */}
        {activeModal === 'f2lSession' && (() => {
          const isLearnMode = currentF2LDayPlan.mode === 'learn';
          const sessionSetupScramble = buildF2LSetupScramble(activeF2LSessionCase.setup, f2lSessionAufIdx, f2lScrambleStyle);
          return (
            <div className="fixed inset-0 z-[260] bg-[#060913]/95 backdrop-blur-3xl flex justify-center overflow-hidden">
              <div className="w-full max-w-md h-[100dvh] bg-[#090e1c] border-x border-white/5 shadow-2xl flex flex-col justify-between px-4 pt-4 pb-6 overflow-y-auto no-scrollbar gap-2.5">
                <div className="flex items-center justify-between gap-2.5 flex-shrink-0">
                  <button
                    onClick={() => { setTimerRunning(false); clearInterval(stopwatchRef.current); setInlineF2lSessionFtOpen(false); setActiveModal(null); }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  >
                    ✕
                  </button>
                  <div className="flex-1 flex items-center gap-1">
                    {f2lSessionCases.map((c, idx) => (
                      <div key={c.id} className={`h-1.5 flex-1 rounded-full transition-all ${idx === (f2lSessionIdx % f2lSessionCases.length) ? 'bg-orange-500' : idx < (f2lSessionIdx % f2lSessionCases.length) ? 'bg-orange-500/40' : 'bg-slate-800'}`}></div>
                    ))}
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-400">
                    {(f2lSessionIdx % f2lSessionCases.length) + 1}/{f2lSessionCases.length}
                  </span>
                </div>

                {/* Orientation & Beginner/Realistic Pill Bar */}
                <div className="flex items-center justify-between bg-slate-900/70 border border-white/10 rounded-xl px-3 py-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-300">White Bottom • Orange Front</span>
                  <button
                    onClick={() => { emitBeep(500); setF2lScrambleStyle((s) => s === 'beginner' ? 'realistic' : 'beginner'); }}
                    className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/35 text-[9px] font-black uppercase text-orange-400 cursor-pointer"
                  >
                    {f2lScrambleStyle === 'beginner' ? 'Beginner Setup' : 'Realistic Setup'}
                  </button>
                </div>

                {/* Header Metadata */}
                <div className="text-center space-y-0.5 flex-shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-400">
                    {activeF2LSessionCase.group}
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight leading-tight">{activeF2LSessionCase.name}</h3>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                    Target Slot: Front-Right (Orange-Blue-White)
                  </p>
                </div>

                {/* Center F2L Card */}
                <div className="bg-slate-900/75 border border-white/10 rounded-[1.75rem] p-4 flex flex-col items-center space-y-3 shadow-xl my-auto">
                  <div className="w-24 h-24 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                    <img
                      src={getF2LImageUrl(activeF2LSessionCase.alg)}
                      alt={activeF2LSessionCase.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Setup Scramble Always Available with New Scramble Button */}
                  <div className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        Setup Scramble ({f2lScrambleStyle})
                      </span>
                      <button
                        onClick={cycleF2LSessionScramble}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-orange-400 cursor-pointer active:scale-95"
                      >
                        New Scramble
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-amber-300 text-center tracking-wide">{sessionSetupScramble}</div>
                    <p className="text-[9.5px] text-slate-400 text-center leading-snug">
                      {f2lScrambleStyle === 'beginner'
                        ? 'Start from a solved cube (White Bottom • Orange Front). Other 3 slots stay solved.'
                        : 'Start from a solved cube (White Bottom • Orange Front). Scrambles back/left slots + sets Front-Right pair.'}
                    </p>
                  </div>

                  {/* 2-Step Intuitive Breakdown (Shown in Learn Mode) */}
                  {isLearnMode && (
                    <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl p-2.5 text-left space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 block">Intuitive 2-Step Breakdown</span>
                      <p className="text-[11px] text-slate-200 leading-snug"><strong>1.</strong> {activeF2LSessionCase.step1}</p>
                      <p className="text-[11px] text-slate-200 leading-snug"><strong>2.</strong> {activeF2LSessionCase.step2}</p>
                    </div>
                  )}

                  {/* Solution Algorithm */}
                  {isLearnMode || f2lSessionShowAlg ? (
                    <div className="w-full bg-[#050811] border border-white/10 rounded-xl py-2.5 px-3 text-center font-mono text-sm font-black text-orange-400 tracking-wider">
                      {activeF2LSessionCase.alg}
                    </div>
                  ) : (
                    <button onClick={() => setF2lSessionShowAlg(true)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer active:scale-95 transition-all">
                      Reveal Solution Algorithm
                    </button>
                  )}

                  {/* Rotation Caution Notice */}
                  {renderF2LRotationCaution(activeF2LSessionCase.alg)}

                  {/* Inline Fingertrick Guide */}
                  {isFingertricksEnabled && (
                    !inlineF2lSessionFtOpen ? (
                      <button
                        onClick={() => { emitBeep(660, 'sine', 0.08); setFtTriggerIdx(0); setInlineF2lSessionFtOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[11px] font-bold text-amber-300 cursor-pointer active:scale-95 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>Fingertrick Guide</span>
                      </button>
                    ) : (
                      renderInlineFingertrickPanel(activeF2LSessionCase, () => setInlineF2lSessionFtOpen(false), 'f2l')
                    )
                  )}

                  {/* Speedcube Stopwatch */}
                  {isTimerEnabled && (
                    <button
                      onClick={() => toggleStopwatch(activeF2LSessionCase.id, 'f2l')}
                      className={`w-full py-3 rounded-2xl border-2 font-mono text-xl font-black transition-all cursor-pointer active:scale-[0.99] ${timerRunning ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-slate-950 border-white/15 text-white'}`}
                    >
                      {timerRunning ? `${timerElapsed.toFixed(2)}s (TAP TO STOP)` : `${timerElapsed > 0 ? timerElapsed.toFixed(2) + 's' : 'TAP TO TIME'}`}
                    </button>
                  )}
                </div>

                {/* Bottom Navigation */}
                <div className="flex gap-2 flex-shrink-0 pt-1">
                  <button
                    onClick={() => { setF2lSessionIdx((p) => (p - 1 + f2lSessionCases.length) % f2lSessionCases.length); setF2lSessionShowAlg(false); setF2lSessionAufIdx(0); setTimerElapsed(0); setFtTriggerIdx(0); }}
                    className="w-12 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black text-base cursor-pointer flex items-center justify-center active:scale-95 transition-all"
                  >
                    ‹
                  </button>
                  {(f2lSessionIdx % f2lSessionCases.length) < f2lSessionCases.length - 1 ? (
                    <button
                      onClick={() => { setF2lSessionIdx((p) => p + 1); setF2lSessionShowAlg(false); setF2lSessionAufIdx(0); setTimerElapsed(0); setFtTriggerIdx(0); emitBeep(600); }}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <span>Next Pair</span>
                      <span>›</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setInlineF2lSessionFtOpen(false); setActiveModal(null); changeF2LDay(1); triggerToast(`F2L Day ${currentF2LDay} Complete!`); }}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                    >
                      Complete Day {currentF2LDay}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 4B. ISOLATED F2L DRILL MODAL */}
        {activeModal === 'f2lDrill' && (() => {
          const drillSetupScramble = buildF2LSetupScramble(f2lDrillCase.setup, f2lDrillAufIdx, f2lScrambleStyle);
          return (
            <div className="fixed inset-0 z-[260] bg-[#060913]/95 backdrop-blur-3xl flex justify-center overflow-hidden">
              <div className="w-full max-w-md h-[100dvh] bg-[#090e1c] border-x border-white/5 shadow-2xl flex flex-col justify-between px-4 pt-4 pb-6 overflow-y-auto no-scrollbar gap-2.5">
                <div className="flex items-center justify-between flex-shrink-0">
                  <button onClick={() => { setTimerRunning(false); clearInterval(stopwatchRef.current); setInlineF2lDrillFtOpen(false); setActiveModal(null); }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer active:scale-95">✕</button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">F2L Pair Drill • #{f2lDrillCase.f2lNo}</span>
                  <button
                    onClick={() => { emitBeep(500); setF2lScrambleStyle((s) => s === 'beginner' ? 'realistic' : 'beginner'); }}
                    className="px-2 py-1 rounded-lg bg-orange-500/15 border border-orange-500/35 text-[9px] font-black uppercase text-orange-400 cursor-pointer"
                  >
                    {f2lScrambleStyle}
                  </button>
                </div>

                <div className="bg-slate-900/75 border border-white/10 rounded-[1.75rem] p-4 text-center space-y-3 my-auto shadow-xl">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-400">{f2lDrillCase.group}</span>
                  <h3 className="text-xl font-black text-white leading-tight">{f2lDrillCase.name}</h3>
                  <p className="text-[10px] text-slate-400">White Bottom • Orange Front • Front-Right Slot</p>

                  <div className="w-24 h-24 mx-auto bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                    <img src={getF2LImageUrl(f2lDrillCase.alg)} alt={f2lDrillCase.name} className="w-full h-full object-contain" />
                  </div>

                  <div className="bg-[#050811] border border-white/10 rounded-xl px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Setup Scramble ({f2lScrambleStyle})</span>
                      <button
                        onClick={cycleF2LDrillScramble}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-orange-400 cursor-pointer active:scale-95"
                      >
                        New Scramble
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-amber-300">{drillSetupScramble}</div>
                    <p className="text-[9.5px] text-slate-400 text-center leading-snug">
                      {f2lScrambleStyle === 'beginner'
                        ? 'Start from a solved cube (White Bottom • Orange Front). Other 3 slots stay solved.'
                        : 'Start from a solved cube (White Bottom • Orange Front). Scrambles back/left slots + sets Front-Right pair.'}
                    </p>
                  </div>

                  <div className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl p-2.5 text-left space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 block">Intuitive 2-Step Breakdown</span>
                    <p className="text-[11px] text-slate-200 leading-snug"><strong>1.</strong> {f2lDrillCase.step1}</p>
                    <p className="text-[11px] text-slate-200 leading-snug"><strong>2.</strong> {f2lDrillCase.step2}</p>
                  </div>

                  {f2lShowDrillAlg ? (
                    <div className="bg-[#050811] border border-white/10 rounded-xl py-2.5 px-3 font-mono text-sm font-black text-orange-400">{f2lDrillCase.alg}</div>
                  ) : (
                    <button onClick={() => setF2lShowDrillAlg(true)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer">Reveal Algorithm</button>
                  )}

                  {renderF2LRotationCaution(f2lDrillCase.alg)}

                  {isFingertricksEnabled && (
                    !inlineF2lDrillFtOpen ? (
                      <button
                        onClick={() => { emitBeep(660, 'sine', 0.08); setFtTriggerIdx(0); setInlineF2lDrillFtOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[11px] font-bold text-amber-300 cursor-pointer active:scale-95 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>Fingertrick Guide</span>
                      </button>
                    ) : (
                      renderInlineFingertrickPanel(f2lDrillCase, () => setInlineF2lDrillFtOpen(false), 'f2l')
                    )
                  )}

                  {isTimerEnabled && (
                    <button
                      onClick={() => toggleStopwatch(f2lDrillCase.id, 'f2l')}
                      className={`w-full py-3 rounded-2xl border-2 font-mono text-xl font-black transition-all cursor-pointer ${timerRunning ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-slate-950 border-white/15 text-white'}`}
                    >
                      {timerRunning ? `${timerElapsed.toFixed(2)}s (STOP)` : `${timerElapsed > 0 ? timerElapsed.toFixed(2) + 's' : 'TAP TO TIME'}`}
                    </button>
                  )}
                </div>

                <button onClick={() => { setInlineF2lDrillFtOpen(false); setActiveModal(null); }} className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold text-xs cursor-pointer flex-shrink-0">Done Drilling</button>
              </div>
            </div>
          );
        })()}

        {/* 4C. DAILY OLL SESSION RUNNER MODAL */}
        {activeModal === 'session' && (() => {
          const isLearnMode = currentDayPlan.mode === 'learn';
          const sessionSetupScramble = buildSetupScramble(activeSessionCase.setup, sessionAufIdx);
          return (
            <div className="fixed inset-0 z-[260] bg-[#060913]/95 backdrop-blur-3xl flex justify-center overflow-hidden">
              <div className="w-full max-w-md h-[100dvh] bg-[#090e1c] border-x border-white/5 shadow-2xl flex flex-col justify-between px-4 pt-4 pb-6 overflow-y-auto no-scrollbar gap-2.5">
                <div className="flex items-center justify-between gap-2.5 flex-shrink-0">
                  <button
                    onClick={() => { setTimerRunning(false); clearInterval(stopwatchRef.current); setInlineSessionFtOpen(false); setActiveModal(null); }}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  >
                    ✕
                  </button>
                  <div className="flex-1 flex items-center gap-1">
                    {sessionCases.map((c, idx) => (
                      <div key={c.id} className={`h-1.5 flex-1 rounded-full transition-all ${idx === (sessionIdx % sessionCases.length) ? 'bg-orange-500' : idx < (sessionIdx % sessionCases.length) ? 'bg-orange-500/40' : 'bg-slate-800'}`}></div>
                    ))}
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-400">
                    {(sessionIdx % sessionCases.length) + 1}/{sessionCases.length}
                  </span>
                </div>

                <div className="text-center space-y-0.5 flex-shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-400">
                    {activeSessionCase.group}
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight leading-tight">{activeSessionCase.name}</h3>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
                    WCA OLL #{activeSessionCase.ollNo} • {currentDayPlan.mode}
                  </p>
                </div>

                <div className="bg-slate-900/75 border border-white/10 rounded-[1.75rem] p-4 flex flex-col items-center space-y-3 shadow-xl my-auto">
                  <div className="w-24 h-24 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                    <img
                      src={getOLLImageUrl(activeSessionCase.alg)}
                      alt={activeSessionCase.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {!isLearnMode && (
                    <div className="w-full bg-[#050811] border border-white/10 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Setup Scramble</span>
                        <button
                          onClick={cycleSessionScramble}
                          className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-orange-400 cursor-pointer active:scale-95"
                        >
                          New Scramble
                        </button>
                      </div>
                      <div className="font-mono text-xs font-bold text-amber-300 text-center tracking-wide">{sessionSetupScramble}</div>
                    </div>
                  )}

                  {isLearnMode || sessionShowAlg ? (
                    <div className="w-full bg-[#050811] border border-white/10 rounded-xl py-2.5 px-3 text-center font-mono text-sm font-black text-orange-400 tracking-wider">
                      {activeSessionCase.alg}
                    </div>
                  ) : (
                    <button onClick={() => setSessionShowAlg(true)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer active:scale-95 transition-all">
                      Reveal Solution Algorithm
                    </button>
                  )}

                  {isFingertricksEnabled && (
                    !inlineSessionFtOpen ? (
                      <button
                        onClick={() => { emitBeep(660, 'sine', 0.08); setFtTriggerIdx(0); setInlineSessionFtOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[11px] font-bold text-amber-300 cursor-pointer active:scale-95 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>Fingertrick Guide</span>
                      </button>
                    ) : (
                      renderInlineFingertrickPanel(activeSessionCase, () => setInlineSessionFtOpen(false), 'oll')
                    )
                  )}

                  {!isLearnMode && isTimerEnabled && (
                    <button
                      onClick={() => toggleStopwatch(activeSessionCase.id, 'oll')}
                      className={`w-full py-3 rounded-2xl border-2 font-mono text-xl font-black transition-all cursor-pointer active:scale-[0.99] ${timerRunning ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-slate-950 border-white/15 text-white'}`}
                    >
                      {timerRunning ? `${timerElapsed.toFixed(2)}s (TAP TO STOP)` : `${timerElapsed > 0 ? timerElapsed.toFixed(2) + 's' : 'TAP TO TIME'}`}
                    </button>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0 pt-1">
                  <button
                    onClick={() => { setSessionIdx((p) => (p - 1 + sessionCases.length) % sessionCases.length); setSessionShowAlg(false); setSessionAufIdx(0); setTimerElapsed(0); setFtTriggerIdx(0); }}
                    className="w-12 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black text-base cursor-pointer flex items-center justify-center active:scale-95 transition-all"
                  >
                    ‹
                  </button>
                  {(sessionIdx % sessionCases.length) < sessionCases.length - 1 ? (
                    <button
                      onClick={() => { setSessionIdx((p) => p + 1); setSessionShowAlg(false); setSessionAufIdx(0); setTimerElapsed(0); setFtTriggerIdx(0); emitBeep(600); }}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <span>Next Pattern</span>
                      <span>›</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => { setInlineSessionFtOpen(false); setActiveModal(null); changeOLLDay(1); triggerToast(`Day ${currentDay} Complete!`); }}
                      className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-green-500/20 active:scale-95 transition-all"
                    >
                      Complete Day {currentDay}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5. ISOLATED OLL DRILL MODAL */}
        {activeModal === 'drill' && (() => {
          const drillSetupScramble = buildSetupScramble(drillCase.setup, drillAufIdx);
          return (
            <div className="fixed inset-0 z-[260] bg-[#060913]/95 backdrop-blur-3xl flex justify-center overflow-hidden">
              <div className="w-full max-w-md h-[100dvh] bg-[#090e1c] border-x border-white/5 shadow-2xl flex flex-col justify-between px-4 pt-4 pb-6 overflow-y-auto no-scrollbar gap-2.5">
                <div className="flex items-center justify-between flex-shrink-0">
                  <button onClick={() => { setTimerRunning(false); clearInterval(stopwatchRef.current); setInlineDrillFtOpen(false); setActiveModal(null); }} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer active:scale-95">✕</button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Isolated Drill • #{drillCase.id}</span>
                  <div className="w-8"></div>
                </div>

                <div className="bg-slate-900/75 border border-white/10 rounded-[1.75rem] p-4 text-center space-y-3 my-auto shadow-xl">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-[9px] font-black uppercase tracking-widest text-orange-400">{drillCase.group}</span>
                  <h3 className="text-2xl font-black text-white leading-tight">{drillCase.name}</h3>
                  <div className="w-24 h-24 mx-auto bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center shadow-inner">
                    <img src={getOLLImageUrl(drillCase.alg)} alt={drillCase.name} className="w-full h-full object-contain" />
                  </div>

                  <div className="bg-[#050811] border border-white/10 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Setup Scramble</span>
                      <button
                        onClick={cycleDrillScramble}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-orange-400 cursor-pointer active:scale-95"
                      >
                        New Scramble
                      </button>
                    </div>
                    <div className="font-mono text-xs font-bold text-amber-300">{drillSetupScramble}</div>
                  </div>

                  {showDrillAlg ? (
                    <div className="bg-[#050811] border border-white/10 rounded-xl py-2.5 px-3 font-mono text-sm font-black text-orange-400">{drillCase.alg}</div>
                  ) : (
                    <button onClick={() => setShowDrillAlg(true)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 cursor-pointer">Reveal Algorithm</button>
                  )}

                  {isFingertricksEnabled && (
                    !inlineDrillFtOpen ? (
                      <button
                        onClick={() => { emitBeep(660, 'sine', 0.08); setFtTriggerIdx(0); setInlineDrillFtOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/35 text-[11px] font-bold text-amber-300 cursor-pointer active:scale-95 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                        <span>Fingertrick Guide</span>
                      </button>
                    ) : (
                      renderInlineFingertrickPanel(drillCase, () => setInlineDrillFtOpen(false), 'oll')
                    )
                  )}

                  {isTimerEnabled && (
                    <button
                      onClick={() => toggleStopwatch(drillCase.id, 'oll')}
                      className={`w-full py-3 rounded-2xl border-2 font-mono text-xl font-black transition-all cursor-pointer ${timerRunning ? 'bg-green-500/20 border-green-500 text-green-300' : 'bg-slate-950 border-white/15 text-white'}`}
                    >
                      {timerRunning ? `${timerElapsed.toFixed(2)}s (STOP)` : `${timerElapsed > 0 ? timerElapsed.toFixed(2) + 's' : 'TAP TO TIME'}`}
                    </button>
                  )}
                </div>

                <button onClick={() => { setInlineDrillFtOpen(false); setActiveModal(null); }} className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold text-xs cursor-pointer flex-shrink-0">Done Drilling</button>
              </div>
            </div>
          );
        })()}

        {/* 6. INTERACTIVE FINGERTRICK DOSSIER MODAL */}
        {activeModal === 'fingertrick' && (() => {
          const dossier = ftPhaseContext === 'f2l'
            ? F2L_FINGERTRICK_GUIDES.default
            : (FINGERTRICK_GUIDES[ftCase.id] || FINGERTRICK_GUIDES.default);
          const activeTrig = dossier.triggers[ftTriggerIdx % dossier.triggers.length];
          return (
            <div className="fixed inset-0 z-[270] bg-[#060913]/95 backdrop-blur-3xl flex flex-col justify-between p-5 overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between max-w-md w-full mx-auto">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Fingertrick Guide</span>
                  <h3 className="text-xl font-black text-white">{ftCase.name} (#{ftCase.id})</h3>
                </div>
                <button
                  onClick={() => setActiveModal(ftReturnModal)}
                  className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="max-w-md w-full mx-auto space-y-4 my-4">
                <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-5 flex items-center gap-4">
                  <div className="w-20 h-20 flex-shrink-0 bg-slate-200 rounded-2xl p-1.5 flex items-center justify-center">
                    <img
                      src={ftPhaseContext === 'f2l' ? getF2LImageUrl(ftCase.alg) : getOLLImageUrl(ftCase.alg)}
                      alt={ftCase.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="font-mono text-sm font-black text-orange-400">{ftCase.alg}</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-300">Grip: {dossier.grip}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-[10px] font-bold text-green-300">{dossier.regrips}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 px-1">Trigger Breakdown (Tap Pill)</span>
                  <div className="flex flex-wrap gap-2">
                    {dossier.triggers.map((t, idx) => (
                      <button
                        key={idx}
                        onClick={() => { emitBeep(560); setFtTriggerIdx(idx); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${ftTriggerIdx % dossier.triggers.length === idx ? 'bg-orange-500/20 border border-orange-500 text-orange-300' : 'bg-white/5 border border-white/10 text-slate-300'}`}
                      >
                        {t.moves}
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-1.5">
                    <span className="text-xs font-black text-amber-300">{activeTrig.label} ({activeTrig.moves})</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{activeTrig.tip}</p>
                  </div>
                </div>

                <div className="bg-[#050811] border border-orange-500/30 rounded-2xl p-4 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Speedcoach Note</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{dossier.coachNote}</p>
                </div>
              </div>

              <div className="max-w-md w-full mx-auto">
                <button
                  onClick={() => setActiveModal(ftReturnModal)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Back to Practice
                </button>
              </div>
            </div>
          );
        })()}

        {/* 7. CURRICULUM ARCHITECT MODAL (OLL & F2L) */}
        {activeModal === 'curriculum' && (() => {
          const sourceData = builderPhase === 'f2l' ? F2L_DATA : OLL_DATA;
          const activeBuilderChunk = draftChunks[selectedBuilderChunkIdx] || draftChunks[0];
          const casesInBuilderChunk = activeBuilderChunk.caseIds.map((id) => sourceData.find((c) => c.id === id)).filter(Boolean);
          const previewDays = generateSchedule(draftChunks, builderPhase.toUpperCase(), sourceData).length;
          return (
            <div className="fixed inset-0 z-[270] bg-[#060913]/95 backdrop-blur-3xl flex flex-col justify-between p-5 overflow-y-auto no-scrollbar">
              <div className="max-w-md w-full mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                      {builderPhase.toUpperCase()} Curriculum Architect
                    </span>
                    <h3 className="text-xl font-black text-white">Organize {builderPhase.toUpperCase()} Cases</h3>
                  </div>
                  <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/10 text-white text-xs cursor-pointer">✕</button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button onClick={() => applyCurriculumPreset('default')} className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer">
                    {builderPhase === 'f2l' ? 'Standard 6' : 'Standard 9'}
                  </button>
                  <button onClick={() => applyCurriculumPreset('casual')} className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer">Casual 3/Chunk</button>
                  <button onClick={() => applyCurriculumPreset('shape')} className="py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 cursor-pointer">By Group</button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {draftChunks.map((chk, idx) => (
                    <button
                      key={chk.id}
                      onClick={() => { emitBeep(500); setSelectedBuilderChunkIdx(idx); setMovingCaseId(null); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap cursor-pointer ${selectedBuilderChunkIdx === idx ? 'bg-orange-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}
                    >
                      Chunk {idx + 1} ({chk.caseIds.length})
                    </button>
                  ))}
                  <button onClick={addBuilderChunk} className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 text-[11px] font-black whitespace-nowrap cursor-pointer">+ Chunk</button>
                </div>

                <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={activeBuilderChunk.title}
                      onChange={(e) => {
                        const copy = [...draftChunks];
                        copy[selectedBuilderChunkIdx] = { ...activeBuilderChunk, title: e.target.value };
                        setDraftChunks(copy);
                      }}
                      className="flex-1 bg-[#050811] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-orange-500"
                    />
                    <button onClick={() => shiftBuilderChunk(-1)} className="w-7 h-7 rounded-lg bg-white/5 text-xs font-black text-white cursor-pointer">↑</button>
                    <button onClick={() => shiftBuilderChunk(1)} className="w-7 h-7 rounded-lg bg-white/5 text-xs font-black text-white cursor-pointer">↓</button>
                    {draftChunks.length > 1 && (
                      <button onClick={removeBuilderChunk} className="w-7 h-7 rounded-lg bg-red-500/20 text-xs font-black text-red-400 cursor-pointer">🗑</button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto no-scrollbar">
                    {casesInBuilderChunk.map((item) => (
                      <div key={item.id} className="bg-[#050811] border border-white/5 rounded-xl p-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={builderPhase === 'f2l' ? getF2LImageUrl(item.alg) : getOLLImageUrl(item.alg)}
                            alt={item.name}
                            className="w-8 h-8 bg-slate-200 rounded-lg p-0.5"
                          />
                          <span className="text-xs font-bold text-white truncate">{item.name}</span>
                        </div>
                        {movingCaseId === item.id ? (
                          <div className="flex gap-1 flex-wrap justify-end">
                            {draftChunks.map((_, tIdx) => tIdx !== selectedBuilderChunkIdx && (
                              <button key={tIdx} onClick={() => moveCaseToChunk(item.id, tIdx)} className="px-2 py-1 rounded bg-orange-500 text-slate-950 font-black text-[10px] cursor-pointer">
                                → C{tIdx + 1}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button onClick={() => setMovingCaseId(item.id)} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-orange-400 cursor-pointer">
                            Move
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="max-w-md w-full mx-auto pt-3">
                <button onClick={saveCustomCurriculum} className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg">
                  Save Custom Curriculum ({previewDays} Days)
                </button>
              </div>
            </div>
          );
        })()}

        {/* 8. COMPLETE 4-PHASE CFOP BEGINNER'S GUIDE MODAL */}
        {activeModal === 'onboarding' && (() => {
          const slides = [
            {
              tag: "Step 1 of 5 • Overview",
              title: "How CFOP Works",
              body: "CFOP is the world-record speedcubing method broken into 4 sequential phases: Cross (C), First Two Layers (F), Orient Last Layer (O), and Permute Last Layer (P). Switch phases anytime using the top-right C-F-O-P selector."
            },
            {
              tag: "Step 2 of 5 • Phase C",
              title: "Phase 1: The White Cross",
              body: "Build a white plus sign on the bottom face while matching each edge's side color to its center. Use Cross in X to solve in fewer turns, then train Eyes-Closed & 15s Blind Inspection so your hands run on autopilot."
            },
            {
              tag: "Step 3 of 5 • Phase F",
              title: "Phase 2: First Two Layers (F2L)",
              body: "Hold White on Bottom and Orange in Front. Pair each bottom white corner with its matching middle-layer edge and insert them together into the Front-Right slot—switching between Beginner and Realistic setups as you improve."
            },
            {
              tag: "Step 4 of 5 • Phase O",
              title: "Phase 3: Orient Last Layer (OLL)",
              body: "Turn the entire top face solid Yellow in a single algorithm. Master small daily chunks across Learn, Drill, and Refine days using zero-regrip Fingertrick triggers."
            },
            {
              tag: "Step 5 of 5 • Phase P & Launch",
              title: "Phase 4: Permute Last Layer (PLL)",
              body: "Once the top face is solid Yellow, PLL swaps the final top-layer corners and edges into their solved positions without disturbing anything below. Choose where you want to jump in right now:"
            }
          ];
          const slide = slides[onboardStep % slides.length];
          const isFinalSlide = onboardStep === slides.length - 1;

          const launchFromGuide = (targetPhase) => {
            emitBeep(880, 'sine', 0.12);
            updateCurrentUser({ hasSeenOnboarding: true });
            setActiveModal(null);
            selectPhase(targetPhase);
          };

          return (
            <div className="fixed inset-0 z-[275] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
              <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/15 px-3 py-1 rounded-full border border-orange-500/30">
                    {slide.tag}
                  </span>
                  <button
                    onClick={() => { updateCurrentUser({ hasSeenOnboarding: true }); setActiveModal(null); }}
                    className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white text-xs flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <h3 className="text-xl font-black text-white">{slide.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{slide.body}</p>

                {isFinalSlide && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => launchFromGuide('cross')}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-left transition-all cursor-pointer"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">Phase C</span>
                      <span className="text-xs font-black text-white">White Cross</span>
                    </button>
                    <button
                      onClick={() => launchFromGuide('f2l')}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-left transition-all cursor-pointer"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">Phase F</span>
                      <span className="text-xs font-black text-white">F2L Pairs</span>
                    </button>
                    <button
                      onClick={() => launchFromGuide('oll')}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-left transition-all cursor-pointer"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">Phase O</span>
                      <span className="text-xs font-black text-white">OLL Cases</span>
                    </button>
                    <button
                      onClick={() => launchFromGuide('pll')}
                      className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 text-left transition-all cursor-pointer"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">Phase P</span>
                      <span className="text-xs font-black text-white">PLL Roadmap</span>
                    </button>
                  </div>
                )}

                <div className="flex justify-center gap-1.5">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { emitBeep(500); setOnboardStep(idx); }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${onboardStep === idx ? 'w-5 bg-orange-500' : 'w-1.5 bg-slate-700'}`}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {onboardStep > 0 && (
                    <button
                      onClick={() => { emitBeep(480); setOnboardStep((p) => p - 1); }}
                      className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      ‹ Back
                    </button>
                  )}
                  {!isFinalSlide ? (
                    <button
                      onClick={() => { emitBeep(560); setOnboardStep((p) => p + 1); }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      Next Step →
                    </button>
                  ) : (
                    <button
                      onClick={() => { updateCurrentUser({ hasSeenOnboarding: true }); setActiveModal(null); }}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
                    >
                      Stay Here
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 9. ADMIN USER MANAGEMENT MODAL */}
        {activeModal === 'admin' && (
          <div className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Family Profiles</span>
                  <h3 className="text-lg font-black text-white">User Management</h3>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white cursor-pointer">X</button>
              </div>

              <div className="space-y-2">
                {Object.values(users).map((u) => (
                  <div key={u.pin} className="bg-[#050811] border border-white/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white block">{u.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">F2L D{u.f2lDay || 1} • OLL D{u.day || 1}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 font-mono text-xs font-black text-orange-400">
                      PIN: {u.pin}
                    </span>
                  </div>
                ))}
              </div>

              {currentUser.role === 'admin' && (
                <div className="bg-slate-950 border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block">Add Family Profile</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="4-Digit PIN"
                      value={newUserPin}
                      onChange={(e) => setNewUserPin(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button onClick={handleAddFamilyUser} className="w-full py-2.5 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold text-xs cursor-pointer">
                    + Add Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 10. GRANULAR RESET MODAL */}
        {activeModal === 'reset' && (
          <div className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-xl flex items-center justify-center p-5">
            <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-5 max-w-xs w-full space-y-3.5 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block">Granular Control</span>
                  <h3 className="text-lg font-black text-white">Reset Progress</h3>
                </div>
                <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white text-xs flex items-center justify-center cursor-pointer">✕</button>
              </div>
              <p className="text-[11px] text-slate-400 text-left">Select an individual phase track or full wipe for <strong className="text-slate-200">{currentUser.name}</strong>:</p>

              {/* Phase F: F2L Options */}
              <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 space-y-1.5 text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block px-1">Phase F • First Two Layers (F2L)</span>
                <button onClick={() => executeGranularReset('f2l_schedule')} className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-amber-300 font-bold text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Reset F2L Schedule Only</span>
                  <span className="text-[10px] font-mono text-slate-400">Day 1</span>
                </button>
                <button onClick={() => executeGranularReset('f2l_stats')} className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-orange-300 font-bold text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Reset F2L Statistics & PRs</span>
                  <span className="text-[10px] font-mono text-slate-400">Clear</span>
                </button>
                <button onClick={() => executeGranularReset('f2l_chunks')} className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 font-bold text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Restore Default F2L Chunks</span>
                  <span className="text-[10px] font-mono text-slate-400">6 Chunks</span>
                </button>
                <button onClick={() => executeGranularReset('f2l_all')} className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 font-black text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Reset All F2L Progress</span>
                  <span className="text-[10px] font-mono">F2L Wipe</span>
                </button>
              </div>

              {/* Phase O: OLL Options */}
              <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 space-y-1.5 text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block px-1">Phase O • Orient Last Layer (OLL)</span>
                <button onClick={() => executeGranularReset('oll_schedule')} className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-amber-300 font-bold text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Reset OLL Schedule Only</span>
                  <span className="text-[10px] font-mono text-slate-400">Day 1</span>
                </button>
                <button onClick={() => executeGranularReset('oll_stats')} className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-orange-300 font-bold text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Reset OLL Statistics & PRs</span>
                  <span className="text-[10px] font-mono text-slate-400">Clear</span>
                </button>
                <button onClick={() => executeGranularReset('oll_chunks')} className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 font-bold text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Restore Default OLL Chunks</span>
                  <span className="text-[10px] font-mono text-slate-400">9 Chunks</span>
                </button>
                <button onClick={() => executeGranularReset('oll_all')} className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 font-black text-xs text-left flex items-center justify-between cursor-pointer">
                  <span>Reset All OLL Progress</span>
                  <span className="text-[10px] font-mono">OLL Wipe</span>
                </button>
              </div>

              {/* Global Wipe */}
              <div className="space-y-1.5 pt-0.5">
                <button onClick={() => executeGranularReset('both')} className="w-full py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-black text-xs cursor-pointer">
                  Reset Everything (Full Profile Wipe)
                </button>
                <button onClick={() => setActiveModal(null)} className="w-full py-2 rounded-xl text-slate-400 hover:text-white font-bold text-xs cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
