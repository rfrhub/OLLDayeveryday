import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Target, Layers, BarChart3, Settings, Eye, EyeOff, 
  Dumbbell, BookOpenCheck, ChevronRight, ChevronLeft, 
  X, Play, RotateCcw, Award, CheckCircle2, Trophy, 
  Timer, Compass, Info, Flame, Sparkles, Lock, 
  UserPlus, Users, ShieldAlert
} from 'lucide-react';

// --- DATA MODEL: ALL 57 OLL CASES (9 CHUNKS FOR 32-DAY PROGRAM) ---
const OLL_DATA = [
  // Chunk 1: Oriented-Edges (7 cases)
  { id: 1, chunk: 1, name: "Sune", group: "Oriented-Edges", alg: "R U R' U R U2' R'" },
  { id: 2, chunk: 1, name: "Anti-Sune", group: "Oriented-Edges", alg: "R U2 R' U' R U' R'" },
  { id: 3, chunk: 1, name: "Cross", group: "Oriented-Edges", alg: "(R U2 R') (U' R U R') (U' R U' R')" },
  { id: 4, chunk: 1, name: "Chameleon", group: "Oriented-Edges", alg: "(r U R' U') (r' F R F')" },
  { id: 5, chunk: 1, name: "Bowtie", group: "Oriented-Edges", alg: "F' (r U R' U') r' F R" },
  { id: 6, chunk: 1, name: "Bruno", group: "Oriented-Edges", alg: "R U2' R2' U' R2 U' R2' U2' R" },
  { id: 7, chunk: 1, name: "Headlights", group: "Oriented-Edges", alg: "R2 D (R' U2 R) D' (R' U2 R')" },
  
  // Chunk 2: T-Shapes (2), Squares (2), Solved Corners (2) = 6 cases
  { id: 8, chunk: 2, name: "T", group: "T-Shapes", alg: "F (R U R' U') F'" },
  { id: 9, chunk: 2, name: "Key", group: "T-Shapes", alg: "(R U R' U') (R' F R F')" },
  { id: 10, chunk: 2, name: "Righty-Square", group: "Squares", alg: "r U2 R' U' R U' r'" },
  { id: 11, chunk: 2, name: "Lefty-Square", group: "Squares", alg: "r' U2' R U R' U r" },
  { id: 12, chunk: 2, name: "Arrow", group: "Solved Corners", alg: "(r U R' U') M (U R U' R')" },
  { id: 13, chunk: 2, name: "H", group: "Solved Corners", alg: "(R U R' U') M' (U R U' r')" },

  // Chunk 3: Lightning Bolts (6 cases)
  { id: 14, chunk: 3, name: "Lightning", group: "Lightning Bolts", alg: "r U R' U R U2' r'" },
  { id: 15, chunk: 3, name: "Downstairs", group: "Lightning Bolts", alg: "r' (R2 U R' U R U2 R') U M'" },
  { id: 16, chunk: 3, name: "Big Lightning", group: "Lightning Bolts", alg: "R' F (R U R' U') F' U R" },
  { id: 17, chunk: 3, name: "Reverse Lightning", group: "Lightning Bolts", alg: "r' U' R U' R' U2 r" },
  { id: 18, chunk: 3, name: "Upstairs", group: "Lightning Bolts", alg: "M' (R' U' R U' R' U2 R) U' M" },
  { id: 19, chunk: 3, name: "Lefty Big Lightning", group: "Lightning Bolts", alg: "L F' (L' U' L U) F U' L'" },

  // Chunk 4: P-Shapes (4), C-Shapes (2) = 6 cases
  { id: 20, chunk: 4, name: "P", group: "P-Shapes", alg: "f (R U R' U') f'" },
  { id: 21, chunk: 4, name: "Inverse P", group: "P-Shapes", alg: "f' (L' U' L U) f" },
  { id: 22, chunk: 4, name: "Couch", group: "P-Shapes", alg: "R' U' F (U R U' R') F' R" },
  { id: 23, chunk: 4, name: "Anti-Couch", group: "P-Shapes", alg: "R U B' (U' R' U) R B R'" },
  { id: 24, chunk: 4, name: "Seein' Headlights", group: "C-Shapes", alg: "R' U' (R' F R F') U R" },
  { id: 25, chunk: 4, name: "City", group: "C-Shapes", alg: "(R U R' U') B' (R' F R F') B" },

  // Chunk 5: Fishes (4), W-Shapes (2) = 6 cases
  { id: 26, chunk: 5, name: "Mounted Fish", group: "Fishes", alg: "F (R U' R' U') (R U R' F')" },
  { id: 27, chunk: 5, name: "Fish Salad", group: "Fishes", alg: "(R U2') (R2' F R F') (R U2' R')" },
  { id: 28, chunk: 5, name: "Kite", group: "Fishes", alg: "(R U R' U') R' F (R2 U R' U') F'" },
  { id: 29, chunk: 5, name: "Anti-Kite", group: "Fishes", alg: "(R U R' U) (R' F R F') (R U2' R')" },
  { id: 30, chunk: 5, name: "Mario", group: "W-Shapes", alg: "(R U R' U) (R U' R' U') (R' F R F')" },
  { id: 31, chunk: 5, name: "Wario", group: "W-Shapes", alg: "(R' U' R U') (R' U R U) l U' R' U x" },

  // Chunk 6: L-Shapes (6 cases)
  { id: 32, chunk: 6, name: "Breakneck", group: "L-Shapes", alg: "F (R U R' U') (R U R' U') F'" },
  { id: 33, chunk: 6, name: "Anti-Breakneck", group: "L-Shapes", alg: "R' U' (R' F R F') (R' F R F') U R" },
  { id: 34, chunk: 6, name: "Frying Pan", group: "L-Shapes", alg: "(r' U' R U') (R' U R U') R' U2 r" },
  { id: 35, chunk: 6, name: "Anti-Frying Pan", group: "L-Shapes", alg: "(r U R' U) (R U' R' U) R U2' r'" },
  { id: 36, chunk: 6, name: "Front Squeezy", group: "L-Shapes", alg: "r' U r2 U' r2' U' r2 U r'" },
  { id: 37, chunk: 6, name: "Back Squeezy", group: "L-Shapes", alg: "r U' r2' U r2 U r2' U' r" },

  // Chunk 7: Lines (4), Knight Moves (2) = 6 cases
  { id: 38, chunk: 7, name: "Ant", group: "Lines", alg: "f (R U R' U') (R U R' U') f'" },
  { id: 39, chunk: 7, name: "Rice Cooker", group: "Lines", alg: "(R U R' U R U') y (R U' R') F'" },
  { id: 40, chunk: 7, name: "Streetlights", group: "Lines", alg: "r U r' (U R U' R') (U R U' R') r U' r'" },
  { id: 41, chunk: 7, name: "Highway", group: "Lines", alg: "R U2 R2 (U' R U' R') U2 F R F'" },
  { id: 42, chunk: 7, name: "Squeegee", group: "Knight Moves", alg: "(r' U' r) (R' U' R U) (r' U r)" },
  { id: 43, chunk: 7, name: "Gun", group: "Knight Moves", alg: "F U R U' R2' F' R U (R U' R')" },

  // Chunk 8: Knight Moves (2), Awkward Shapes (4) = 6 cases
  { id: 44, chunk: 8, name: "Anti-Squeegee", group: "Knight Moves", alg: "(r U r') (R U R' U') (r U' r')" },
  { id: 45, chunk: 8, name: "Anti-Gun", group: "Knight Moves", alg: "(R' F R) (U R' F' R) (F U' F')" },
  { id: 46, chunk: 8, name: "Poodle", group: "Awkward Shapes", alg: "(R U R' U R U2' R') F (R U R' U') F'" },
  { id: 47, chunk: 8, name: "Anti-Poodle", group: "Awkward Shapes", alg: "(R' U' R U' R' U2 R) F (R U R' U') F'" },
  { id: 48, chunk: 8, name: "WTF", group: "Awkward Shapes", alg: "r2 D' (r U r') D r2 (U' r' U' r)" },
  { id: 49, chunk: 8, name: "Anti-WTF", group: "Awkward Shapes", alg: "F U (R U2 R' U') (R U2 R' U') F'" },

  // Chunk 9: Dot-cases (8 cases)
  { id: 50, chunk: 9, name: "Blank", group: "Dot-cases", alg: "(R U2') (R2' F R F') U2' (R' F R F')" },
  { id: 51, chunk: 9, name: "Slash", group: "Dot-cases", alg: "(R U R' U) (R' F R F') U2' (R' F R F')" },
  { id: 52, chunk: 9, name: "Bunny", group: "Dot-cases", alg: "M U (R U R' U') M' (R' F R F')" },
  { id: 53, chunk: 9, name: "Anti-Nazi", group: "Dot-cases", alg: "f (R U R' U') f' U' F (R U R' U') F'" },
  { id: 54, chunk: 9, name: "Zamboni", group: "Dot-cases", alg: "F (R U R' U') F' f (R U R' U') f'" },
  { id: 55, chunk: 9, name: "Super Lip", group: "Dot-cases", alg: "M U (R U R' U') M2' (U R U' r')" },
  { id: 56, chunk: 9, name: "Crown", group: "Dot-cases", alg: "(r U R' U R U2 r') (r' U' R U' R' U2 r)" },
  { id: 57, chunk: 9, name: "Nazi", group: "Dot-cases", alg: "f (R U R' U') f' U F (R U R' U') F'" }
];

// --- NOTATION KEY REPOSITORY ---
const NOTATION_GROUPS = [
  {
    title: "Single Face Moves",
    description: "Turning an outer face 90° or 180°",
    moves: [
      { move: "U", desc: "Top layer clockwise" },
      { move: "U'", desc: "Top layer counter-clockwise" },
      { move: "U2", desc: "Top layer 180 degrees" },
      { move: "D", desc: "Bottom layer clockwise" },
      { move: "D'", desc: "Bottom layer counter-clockwise" },
      { move: "D2", desc: "Bottom layer 180 degrees" },
      { move: "R", desc: "Right layer clockwise" },
      { move: "R'", desc: "Right layer counter-clockwise" },
      { move: "R2", desc: "Right layer 180 degrees" },
      { move: "L", desc: "Left layer clockwise" },
      { move: "L'", desc: "Left layer counter-clockwise" },
      { move: "L2", desc: "Left layer 180 degrees" },
      { move: "F", desc: "Front layer clockwise" },
      { move: "F'", desc: "Front layer counter-clockwise" },
      { move: "F2", desc: "Front layer 180 degrees" },
      { move: "B", desc: "Back layer clockwise" },
      { move: "B'", desc: "Back layer counter-clockwise" },
      { move: "B2", desc: "Back layer 180 degrees" }
    ]
  },
  {
    title: "Slice Moves",
    description: "Turning inner layers between outer faces",
    moves: [
      { move: "M", desc: "Middle layer between L/R (turns down, follows L)" },
      { move: "M'", desc: "Middle layer turns up (follows R)" },
      { move: "M2", desc: "Middle layer 180 degrees" },
      { move: "E", desc: "Equator layer between U/D (turns right, follows D)" },
      { move: "E'", desc: "Equator layer turns left (follows U)" },
      { move: "E2", desc: "Equator layer 180 degrees" },
      { move: "S", desc: "Standing layer between F/B (turns clockwise, follows F)" },
      { move: "S'", desc: "Standing layer counter-clockwise (follows B)" },
      { move: "S2", desc: "Standing layer 180 degrees" }
    ]
  },
  {
    title: "Whole Cube Rotations",
    description: "Reorienting the entire cube in 3D space",
    moves: [
      { move: "x", desc: "Rotate full cube up (look at bottom face, follows R)" },
      { move: "x'", desc: "Rotate full cube down (look at top face, follows R')" },
      { move: "x2", desc: "Rotate full cube 180° vertically" },
      { move: "y", desc: "Rotate full cube clockwise horizontally (follows U)" },
      { move: "y'", desc: "Rotate full cube counter-clockwise horizontally (follows U')" },
      { move: "y2", desc: "Rotate full cube 180° horizontally" },
      { move: "z", desc: "Tilt full cube clockwise (follows F)" },
      { move: "z'", desc: "Tilt full cube counter-clockwise (follows F')" },
      { move: "z2", desc: "Tilt full cube 180°" }
    ]
  },
  {
    title: "Wide Moves",
    description: "Turning an outer face along with its adjacent slice",
    moves: [
      { move: "Rw / r", desc: "Right side + Middle layer clockwise" },
      { move: "Rw' / r'", desc: "Right side + Middle layer counter-clockwise" },
      { move: "Uw / u", desc: "Top side + Middle layer clockwise" },
      { move: "Uw' / u'", desc: "Top side + Middle layer counter-clockwise" },
      { move: "Fw / f", desc: "Front side + Middle layer clockwise" },
      { move: "Fw' / f'", desc: "Front side + Middle layer counter-clockwise" },
      { move: "Lw / l", desc: "Left side + Middle layer clockwise" },
      { move: "Lw' / l'", desc: "Left side + Middle layer counter-clockwise" },
      { move: "Dw / d", desc: "Bottom side + Middle layer clockwise" },
      { move: "Dw' / d'", desc: "Bottom side + Middle layer counter-clockwise" },
      { move: "Bw / b", desc: "Back side + Middle layer clockwise" },
      { move: "Bw' / b'", desc: "Back side + Middle layer counter-clockwise" }
    ]
  }
];

// --- APP HELPERS ---
const getImageUrl = (alg) => {
  const sanitized = alg.replace(/[()]/g, '').trim();
  return `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&pzl=3&stage=oll&view=plan&bg=t&case=${encodeURIComponent(sanitized)}`;
};

const reverseAlg = (alg) => {
  const moves = alg.replace(/[()]/g, '').split(' ').filter(Boolean);
  const invertMove = (m) => {
    if (m.includes("'")) return m.replace("'", "");
    if (m.includes("2")) return m;
    return m + "'";
  };
  return moves.reverse().map(invertMove).join(' ');
};

const getScheduleForDay = (day = 1) => {
  let target = day;
  if (target < 1) target = 1;
  if (target > 32) target = 32;

  if (target === 29) return { type: 'Learn', chunks: [9], title: 'Final Set: Dot Cases' };
  if (target === 30) return { type: 'Practice', chunks: [9], title: 'Drill: Dot Cases' };
  if (target === 31) return { type: 'Practice', chunks: [9], title: 'Refine: Dot Cases' };
  if (target === 32) return { type: 'Review', chunks: [1, 2, 3, 4, 5, 6, 7, 8, 9], title: 'Grand Finale: Full 57 OLL Review' };

  const week = Math.ceil(target / 7);
  const cycleDay = ((target - 1) % 7) + 1;
  const baseChunkIndex = (week - 1) * 2;

  if (cycleDay === 1) return { type: 'Learn', chunks: [baseChunkIndex + 1], title: `Learn Chunk ${baseChunkIndex + 1}` };
  if (cycleDay === 2 || cycleDay === 3) return { type: 'Practice', chunks: [baseChunkIndex + 1], title: `Drill Chunk ${baseChunkIndex + 1}` };
  if (cycleDay === 4) return { type: 'Learn', chunks: [baseChunkIndex + 2], title: `Learn Chunk ${baseChunkIndex + 2}` };
  if (cycleDay === 5 || cycleDay === 6) return { type: 'Practice', chunks: [baseChunkIndex + 2], title: `Drill Chunk ${baseChunkIndex + 2}` };
  if (cycleDay === 7) {
    const reviewChunks = Array.from({ length: baseChunkIndex + 2 }, (_, i) => i + 1);
    return { type: 'Review', chunks: reviewChunks, title: `Review: Chunks 1–${baseChunkIndex + 2}` };
  }
  return { type: 'Learn', chunks: [1], title: 'Learn Chunk 1' };
};

// --- CUSTOM SUNE ISOMETRIC CUBE LOGO SVG ---
const SuneCubeLogo = ({ className = "w-10 h-10" }) => (
  <svg 
    viewBox="0 0 200 200" 
    className={`${className} flex-shrink-0 drop-shadow-[0_8px_16px_rgba(234,88,12,0.35)]`} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="100" cy="180" rx="65" ry="14" fill="#030712" fillOpacity="0.6" />
    <g stroke="#000000" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M100 24 L160 58 L160 120 L100 86 Z" fill="#090d16" />
      <path d="M100 24 L40 58 L40 120 L100 86 Z" fill="#0d1424" />
      <path d="M100 24 L138 3 L182 32 L144 54 Z" fill="#18181b" />
      <path d="M182 32 L182 82 L144 104 L144 54 Z" fill="#090d16" />
      <polygon points="108,12 136,2 152,14 124,24" fill="#ea580c" />
      <polygon points="142,20 170,10 180,24 152,34" fill="#f97316" />
      <polygon points="152,38 180,28 180,50 152,60" fill="#c2410c" />
      <polygon points="152,66 180,56 180,78 152,88" fill="#ea580c" />

      <path d="M100 86 L164 122 L164 168 L100 132 Z" fill="#0a0f1d" />
      <path d="M100 86 L36 122 L36 168 L100 132 Z" fill="#111827" />

      <polygon points="44,66 60,56 78,66 62,76" fill="#1e293b" />
      <polygon points="64,78 80,68 98,78 82,88" fill="#0f172a" />
      <polygon points="44,92 60,82 78,92 62,102" fill="#1e293b" />
      <polygon points="64,104 80,94 98,104 82,114" fill="#0f172a" />
      <polygon points="44,118 60,108 78,118 62,128" fill="#1e293b" />
      <polygon points="64,130 80,120 98,130 82,140" fill="#0f172a" />

      <polygon points="100,56 120,44 140,56 120,68" fill="#f97316" />
      <polygon points="120,42 140,30 160,42 140,54" fill="#ea580c" />
      <polygon points="80,44 100,32 120,44 100,56" fill="#f97316" />
      <polygon points="120,70 140,58 160,70 140,82" fill="#c2410c" />
      <polygon points="80,70 100,58 120,70 100,82" fill="#f97316" />
      <polygon points="100,30 120,18 140,30 120,42" fill="#fb923c" />

      <polygon points="60,34 78,24 88,30 70,40" fill="#f97316" />
      <polygon points="160,72 170,66 170,82 160,88" fill="#ea580c" />
      <polygon points="98,84 100,86 100,104 98,102" fill="#ea580c" />
    </g>
  </svg>
);

// Native Fail-Safe Backspace Icon
const BackspaceIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </svg>
);

// --- REUSABLE UI TOKENS ---
const GlassCard = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl transition-all ${
      onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-slate-800/70 hover:border-orange-500/30' : ''
    } ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', onClick, className = '', disabled = false }) => {
  const base = "w-full rounded-2xl py-4 font-bold text-base transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg disabled:opacity-40 disabled:pointer-events-none";
  const variants = {
    primary: "bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black shadow-orange-500/25 border border-orange-400/30",
    secondary: "bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10 shadow-black/40",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- PIN PAD COMPONENT ---
const PinPad = ({ title, subtitle, onComplete, errorMsg, hideClose, onClose, clearOnComplete = true }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(errorMsg || '');

  useEffect(() => { setError(errorMsg || ''); }, [errorMsg]);

  const handlePress = (num) => {
    setError('');
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        onComplete(newPin);
        if (clearOnComplete) setTimeout(() => setPin(''), 300);
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto animate-in fade-in">
      {!hideClose && (
        <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-white/5 rounded-full text-slate-400">
          <X size={20} />
        </button>
      )}
      
      <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-6 shadow-xl shadow-orange-500/10">
        <Lock size={32} />
      </div>
      
      <h2 className="text-2xl font-black text-white mb-2">{title}</h2>
      <p className="text-sm text-slate-400 mb-8 text-center">{subtitle}</p>

      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
            pin.length > i 
              ? (error ? 'bg-red-500 border-red-500' : 'bg-orange-500 border-orange-500')
              : 'bg-transparent border-white/20'
          }`} />
        ))}
      </div>
      {error && <p className="text-red-400 text-xs font-bold mb-4 -mt-4 uppercase tracking-widest">{error}</p>}

      <div className="grid grid-cols-3 gap-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handlePress(num.toString())}
            className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-2xl font-semibold text-white flex items-center justify-center border border-white/5"
          >
            {num}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-2xl font-semibold text-white flex items-center justify-center border border-white/5"
        >
          0
        </button>
        <button 
          onClick={handleDelete}
          className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-xl font-semibold text-slate-400 flex items-center justify-center border border-white/5"
        >
          <BackspaceIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// --- AUTHENTICATION SCREEN ---
const AuthScreen = ({ users, onLogin }) => {
  const [error, setError] = useState('');

  const handleLogin = (enteredPin) => {
    if (users[enteredPin]) {
      onLogin(enteredPin);
    } else {
      setError('Invalid PIN');
      setTimeout(() => setError(''), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col items-center justify-center relative overflow-hidden p-6">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="z-10 w-full">
        <PinPad 
          title="Welcome Back" 
          subtitle="Enter your 4-digit PIN to access your training profile."
          onComplete={handleLogin}
          errorMsg={error}
          hideClose
        />
      </div>
    </div>
  );
};

// --- ADMIN MODAL ---
const AdminModal = ({ users, onClose, onAddUser }) => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [addError, setAddError] = useState('');

  const handleAuth = (pin) => {
    if (pin === '1678') {
      setIsAuthed(true);
    } else {
      setError('Admin PIN Required');
      setTimeout(() => setError(''), 1000);
    }
  };

  const handleCreateUser = () => {
    if (!newName.trim() || newPin.length !== 4) {
      setAddError('Enter a valid name and 4-digit PIN');
      return;
    }
    if (users[newPin]) {
      setAddError('PIN already exists!');
      return;
    }
    onAddUser(newName.trim(), newPin);
    setShowAddForm(false);
    setNewName('');
    setNewPin('');
    setAddError('');
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#060913]/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto">
      {!isAuthed ? (
        <div className="flex-1 flex flex-col justify-center">
          <PinPad 
            title="Admin Access" 
            subtitle="Enter the master PIN to manage users." 
            onComplete={handleAuth} 
            errorMsg={error} 
            onClose={onClose} 
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-8 w-full max-w-sm mx-auto pt-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">Manage profiles & access</p>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400">
              <X size={20} />
            </button>
          </div>

          {!showAddForm ? (
            <>
              <div className="space-y-3 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Active Profiles</h3>
                {Object.values(users).map(u => (
                  <div key={u.pin} className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
                        {(u.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {u.name}
                          {u.role === 'admin' && <ShieldAlert size={14} className="text-amber-500" />}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tracking-widest">PIN: {u.pin}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-300">Day {u.day || 1}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={() => setShowAddForm(true)} variant="secondary" className="border-dashed border-white/20 text-orange-400">
                <UserPlus size={18} /> Add New User
              </Button>
            </>
          ) : (
            <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-6 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-orange-500"/> New Profile
              </h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">First Name</label>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    placeholder="E.g. Alex" 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">4-Digit PIN</label>
                  <input 
                    type="number" 
                    value={newPin} 
                    onChange={e => { if(e.target.value.length <= 4) setNewPin(e.target.value); }} 
                    placeholder="E.g. 5555" 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg tracking-widest focus:outline-none focus:border-orange-500 transition-colors" 
                  />
                </div>
                {addError && <p className="text-xs text-red-400 font-bold">{addError}</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => {setShowAddForm(false); setAddError('');}} className="py-3 flex-1 text-sm">Cancel</Button>
                <Button variant="primary" onClick={handleCreateUser} className="py-3 flex-1 text-sm">Save User</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- APP ROOT COMPONENT (HANDLES MULTI-USER STATE) ---
export default function App() {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('ollday_users_v2');
      return saved ? JSON.parse(saved) : {
        "1678": { pin: "1678", name: "Me", role: "admin", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true },
        "8995": { pin: "8995", name: "Dad", role: "user", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true }
      };
    } catch (e) {
      return {
        "1678": { pin: "1678", name: "Me", role: "admin", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true },
        "8995": { pin: "8995", name: "Dad", role: "user", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true }
      };
    }
  });

  const [activePin, setActivePin] = useState(() => {
    try {
      return localStorage.getItem('ollday_active_pin');
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('grind');
  const [sessionState, setSessionState] = useState(null); 
  const [drillCase, setDrillCase] = useState(null); 
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleLogin = (pin) => { 
    setActivePin(pin); 
    try { localStorage.setItem('ollday_active_pin', pin); } catch (e) {}
  };

  const handleLogout = () => { 
    setActivePin(null); 
    try { localStorage.removeItem('ollday_active_pin'); } catch (e) {}
    setSessionState(null); 
    setActiveTab('grind'); 
  };

  const handleAddUser = (name, pin) => {
    const nextUsers = { 
      ...users, 
      [pin]: { pin, name, role: "user", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true } 
    };
    setUsers(nextUsers);
    try { localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); } catch (e) {}
  };

  if (!activePin || !users[activePin]) {
    return <AuthScreen users={users} onLogin={handleLogin} />;
  }

  const currentUser = users[activePin] || {
    pin: activePin,
    name: "User",
    role: "user",
    day: 1,
    stats: {},
    targetGoal: 3.5,
    timerEnabled: true
  };

  const updateCurrentUser = (updates) => {
    const nextUsers = { ...users, [activePin]: { ...currentUser, ...updates } };
    setUsers(nextUsers);
    try { localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); } catch (e) {}
  };

  const updateDay = (day) => { 
    if (day >= 1 && day <= 32) updateCurrentUser({ day }); 
  };

  const handleRecordTime = (caseId, timeInSeconds) => {
    const userStats = currentUser.stats || {};
    const existingStats = userStats[caseId] || [];
    updateCurrentUser({ stats: { ...userStats, [caseId]: [...existingStats, timeInSeconds] } });
  };

  const handleResetProgress = () => { 
    updateCurrentUser({ day: 1, stats: {} }); 
    setShowResetModal(false); 
  };

  const currentDay = currentUser.day || 1;
  const schedule = getScheduleForDay(currentDay);
  const todaysAlgs = OLL_DATA.filter(alg => schedule.chunks.includes(alg.chunk));

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-orange-500/30 overflow-hidden flex justify-center">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[45vh] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-3/4 h-[40vh] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10 shadow-2xl bg-[#090e1c]/70 backdrop-blur-3xl border-x border-white/5">
        <header className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/5 bg-[#090e1c]/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <SuneCubeLogo className="w-10 h-10" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">32-Day Master</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                OLLDay <span className="text-orange-500">Everyday</span>
              </h1>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              {currentUser.name}
            </div>
            <span className="text-sm font-black text-orange-400 font-mono">{Math.round((currentDay / 32) * 100)}%</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto no-scrollbar relative">
          {!sessionState && activeTab === 'grind' && (
            <GrindView 
              currentDay={currentDay} 
              updateDay={updateDay} 
              schedule={schedule} 
              onStart={() => setSessionState(schedule.type.toLowerCase())} 
            />
          )}

          {!sessionState && activeTab === 'algorithms' && (
            <AlgorithmsView onSelectCase={(c) => setDrillCase(c)} />
          )}

          {!sessionState && activeTab === 'stats' && (
            <StatisticsView 
              solveTimes={currentUser.stats || {}} 
              targetGoal={currentUser.targetGoal || 3.5} 
              onSelectCase={(c) => setDrillCase(c)} 
            />
          )}

          {!sessionState && activeTab === 'settings' && (
            <SettingsView 
              currentUser={currentUser} 
              setTimerEnabled={(val) => updateCurrentUser({ timerEnabled: val })} 
              setTargetGoal={(val) => updateCurrentUser({ targetGoal: val })} 
              onRequestReset={() => setShowResetModal(true)} 
              onOpenAdmin={() => setShowAdminModal(true)} 
            />
          )}

          {sessionState === 'learn' && (
            <LearnSession 
              algs={todaysAlgs} 
              onClose={() => setSessionState(null)} 
              onComplete={() => { updateDay(currentDay + 1); setSessionState(null); }} 
            />
          )}

          {(sessionState === 'practice' || sessionState === 'review') && (
            <PracticeSession 
              algs={todaysAlgs} 
              mode={sessionState} 
              timerEnabled={currentUser.timerEnabled !== false} 
              solveTimes={currentUser.stats || {}} 
              onRecordTime={handleRecordTime} 
              onClose={() => setSessionState(null)} 
              onComplete={() => { updateDay(currentDay + 1); setSessionState(null); }} 
            />
          )}

          {drillCase && (
            <IsolatedDrillModal 
              caseData={drillCase} 
              timerEnabled={currentUser.timerEnabled !== false} 
              solveTimes={(currentUser.stats && currentUser.stats[drillCase.id]) || []} 
              onRecordTime={(t) => handleRecordTime(drillCase.id, t)} 
              onClose={() => setDrillCase(null)} 
            />
          )}

          {showAdminModal && (
            <AdminModal 
              users={users} 
              onClose={() => setShowAdminModal(false)} 
              onAddUser={handleAddUser} 
            />
          )}

          {showResetModal && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 max-w-xs w-full text-center shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 mx-auto mb-4 flex items-center justify-center border border-red-500/20">
                  <RotateCcw size={24} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Reset Progress?</h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  This will reset your schedule back to Day 1 and wipe your recorded solve times. This cannot be undone.
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="danger" onClick={handleResetProgress} className="py-3 text-sm">
                    Yes, Reset
                  </Button>
                  <Button variant="secondary" onClick={() => setShowResetModal(false)} className="py-3 text-sm">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {!sessionState && !drillCase && (
          <nav className="absolute bottom-0 left-0 w-full bg-[#090e1c]/90 backdrop-blur-3xl border-t border-white/10 pb-7 pt-2.5 px-4 z-40 rounded-t-[2.5rem]">
            <div className="flex justify-around items-center max-w-sm mx-auto">
              <TabIcon icon={Target} label="The Grind" active={activeTab === 'grind'} onClick={() => setActiveTab('grind')} />
              <TabIcon icon={Layers} label="Algorithms" active={activeTab === 'algorithms'} onClick={() => setActiveTab('algorithms')} />
              <TabIcon icon={BarChart3} label="Statistics" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
              <TabIcon icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

const TabIcon = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
      active ? 'text-orange-500 scale-105' : 'text-slate-400 hover:text-slate-200 active:scale-95'
    }`}
  >
    <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-orange-500/15' : 'bg-transparent'}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

// --- TAB 1: THE GRIND ---
const GrindView = ({ currentDay, updateDay, schedule, onStart }) => {
  const isReview = schedule.type === 'Review';
  const isLearn = schedule.type === 'Learn';
  const isFinale = currentDay === 32;
  const algCount = OLL_DATA.filter(alg => schedule.chunks.includes(alg.chunk)).length;

  return (
    <div className="p-6 pt-6 pb-32 flex flex-col min-h-full">
      <div className="mb-4">
        <p className="text-orange-500 font-black uppercase tracking-widest text-xs mb-1">Training Hub</p>
        <h2 className="text-3xl font-black tracking-tight text-white">Daily Grind</h2>
      </div>

      <GlassCard className="flex-1 flex flex-col justify-between items-center text-center relative overflow-hidden mb-5 p-7">
        <div className={`absolute -top-24 -right-24 w-72 h-72 blur-3xl opacity-25 rounded-full pointer-events-none transition-colors duration-700 ${
          isFinale ? 'bg-amber-400' : isLearn ? 'bg-blue-500' : isReview ? 'bg-purple-500' : 'bg-orange-500'
        }`} />

        <div className="flex items-center justify-between w-full mb-6 z-10">
          <button 
            onClick={() => updateDay(currentDay - 1)} 
            disabled={currentDay === 1} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full disabled:opacity-20 active:scale-90 transition-transform border border-white/5"
          >
            <ChevronLeft size={22} />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Phase</span>
            <h3 className="text-4xl font-black text-white tracking-tighter mt-0.5">Day {currentDay} <span className="text-xs font-normal text-slate-400">/ 32</span></h3>
          </div>

          <button 
            onClick={() => updateDay(currentDay + 1)} 
            disabled={currentDay === 32} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full disabled:opacity-20 active:scale-90 transition-transform border border-white/5"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        <div className={`z-10 inline-flex items-center gap-2 px-5 py-2 rounded-full mb-4 font-black text-xs uppercase tracking-wider border shadow-md ${
          isFinale 
            ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-amber-500/20 animate-pulse'
            : isLearn 
            ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' 
            : isReview 
            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' 
            : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
        }`}>
          {isFinale ? <Trophy size={16}/> : isLearn ? <BookOpenCheck size={16}/> : isReview ? <Eye size={16}/> : <Dumbbell size={16}/>}
          {schedule.type} Mode • {algCount} Cases
        </div>

        <div className="z-10 px-2 mb-6">
          <h4 className="text-lg font-bold text-white mb-2">{schedule.title}</h4>
          <p className="text-slate-300 text-sm leading-relaxed">
            {isFinale && "The Grand Finale! Test your lightning execution across all 57 full OLL algorithms learned over the past month."}
            {isLearn && !isFinale && "Time to acquire fresh muscle memory. Drill each trigger until the pattern snaps naturally."}
            {schedule.type === 'Practice' && !isFinale && "Scramble from memory, identify visual headlights/bars, and fluidly execute."}
            {isReview && !isFinale && "Cumulative checkpoint! Solidify all previous chunks into permanent reflex."}
          </p>
        </div>

        <Button onClick={onStart} className="z-10 mt-auto py-4 text-slate-950 font-black">
          <span>Start Day {currentDay} Session</span>
          <ChevronRight size={20} />
        </Button>
      </GlassCard>

      <div className="flex items-center justify-between bg-slate-900/60 border border-white/10 p-5 rounded-[2rem] shadow-xl">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Program Journey</div>
          <div className="text-xl font-black text-white mt-1">
            {currentDay === 32 ? 'Final Milestone Reached! 🎉' : `${32 - currentDay} Days Remaining`}
          </div>
        </div>
        <div className="w-14 h-14 relative flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
            <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            <path className="text-orange-500 transition-all duration-700" strokeDasharray={`${(currentDay/32)*100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-black text-orange-400">
            {Math.round((currentDay/32)*100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TAB 2: ALGORITHMS ---
const AlgorithmsView = ({ onSelectCase }) => {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const groups = useMemo(() => {
    const map = new Map();
    OLL_DATA.forEach(alg => {
      if (!map.has(alg.group)) map.set(alg.group, []);
      map.get(alg.group).push(alg);
    });
    return Array.from(map.entries());
  }, []);

  if (selectedGroup) {
    const algs = groups.find(g => g[0] === selectedGroup)?.[1] || [];
    return (
      <div className="p-6 pt-6 pb-36 animate-in fade-in slide-in-from-right-4 min-h-full">
        <button 
          onClick={() => setSelectedGroup(null)} 
          className="mb-5 flex items-center gap-2 text-orange-400 font-bold active:scale-95 transition-transform px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 text-xs uppercase tracking-wider"
        >
          <ChevronLeft size={16} /> Back to Groups
        </button>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-white">{selectedGroup}</h3>
          <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">{algs.length} Cases</span>
        </div>
        <div className="flex flex-col gap-4">
          {algs.map(alg => (
            <GlassCard 
              key={alg.id} 
              onClick={() => onSelectCase(alg)} 
              className="flex flex-col p-4 !rounded-[1.75rem] active:scale-[0.98] transition-all hover:border-orange-500/40"
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-200 rounded-2xl p-2 w-20 h-20 flex-shrink-0 flex items-center justify-center shadow-inner">
                  <img src={getImageUrl(alg.alg)} alt={alg.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-white truncate">{alg.name}</h4>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">#{alg.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Tap to launch isolated drill</p>
                </div>
                <ChevronRight size={18} className="text-slate-500" />
              </div>
              <div className="mt-3 bg-slate-950/80 rounded-xl py-2.5 px-3 border border-white/5 text-center">
                <span className="text-orange-400 font-mono text-sm font-bold tracking-wide break-words">{alg.alg}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-6 pb-36 animate-in fade-in min-h-full">
      <div className="mb-6">
        <p className="text-orange-500 font-black uppercase tracking-widest text-xs mb-1">Knowledge Base</p>
        <h2 className="text-3xl font-black tracking-tight text-white">Algorithms</h2>
        <p className="text-xs text-slate-400 mt-1">Tap any category to explore, or tap a case for instant isolated practice.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {groups.map(([name, algs]) => (
          <GlassCard 
            key={name} 
            onClick={() => setSelectedGroup(name)} 
            className="flex flex-col items-center justify-center p-5 text-center group hover:border-orange-500/40"
          >
            <div className="bg-slate-200 rounded-2xl p-2 w-16 h-16 mb-3 shadow-inner flex items-center justify-center group-hover:scale-105 transition-transform">
              <img src={getImageUrl(algs[0].alg)} alt={name} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-100 text-sm leading-tight mb-1">{name}</span>
            <span className="text-[10px] text-orange-400 font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">{algs.length} Cases</span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

// --- TAB 3: STATISTICS ---
const StatisticsView = ({ solveTimes = {}, targetGoal = 3.5, onSelectCase }) => {
  const statsList = useMemo(() => {
    return OLL_DATA.map(item => {
      const times = (solveTimes && solveTimes[item.id]) || [];
      const best = times.length > 0 ? Math.min(...times) : null;
      const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
      const goal = targetGoal || 3.5;
      return { 
        ...item, 
        solvesCount: times.length, 
        best, 
        avg, 
        diff: best !== null ? (best - goal).toFixed(2) : null 
      };
    });
  }, [solveTimes, targetGoal]);

  const totalSolves = useMemo(() => {
    return Object.values(solveTimes || {}).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
  }, [solveTimes]);

  const globalBest = useMemo(() => {
    const all = Object.values(solveTimes || {}).flat();
    return all.length > 0 ? Math.min(...all).toFixed(2) : '--';
  }, [solveTimes]);

  return (
    <div className="p-6 pt-6 pb-36 animate-in fade-in min-h-full">
      <div className="mb-5">
        <p className="text-orange-500 font-black uppercase tracking-widest text-xs mb-1">Performance</p>
        <h2 className="text-3xl font-black tracking-tight text-white">Statistics</h2>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <GlassCard className="p-3.5 !rounded-2xl text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Goal</span>
          <span className="text-xl font-black text-amber-400 font-mono">{(targetGoal || 3.5).toFixed(1)}s</span>
        </GlassCard>
        <GlassCard className="p-3.5 !rounded-2xl text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Runs</span>
          <span className="text-xl font-black text-white font-mono">{totalSolves}</span>
        </GlassCard>
        <GlassCard className="p-3.5 !rounded-2xl text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">All-Time PR</span>
          <span className="text-xl font-black text-orange-400 font-mono">{globalBest}s</span>
        </GlassCard>
      </div>
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Case Breakdown (Tap to Drill)</h3>
      <div className="flex flex-col gap-3">
        {statsList.map(item => {
          const isGoalBeat = item.best !== null && item.best <= (targetGoal || 3.5);
          return (
            <GlassCard key={item.id} onClick={() => onSelectCase(item)} className="p-4 !rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-slate-200 rounded-xl p-1.5 w-12 h-12 flex-shrink-0 flex items-center justify-center">
                  <img src={getImageUrl(item.alg)} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{item.name}</h4>
                  <span className="text-[10px] text-slate-400 block">{item.group} • #{item.id}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                {item.best !== null ? (
                  <div>
                    <div className="font-mono text-sm font-black text-white">{item.best.toFixed(2)}s</div>
                    <div className={`text-[10px] font-bold font-mono ${isGoalBeat ? 'text-green-400' : 'text-orange-400'}`}>
                      {item.diff > 0 ? `+${item.diff}s` : `${item.diff}s`}
                    </div>
                  </div>
                ) : <span className="text-xs text-slate-500 font-mono italic">No runs</span>}
                <ChevronRight size={16} className="text-slate-600" />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

// --- TAB 4: SETTINGS ---
const SettingsView = ({ currentUser, setTimerEnabled, setTargetGoal, onRequestReset, onOpenAdmin }) => {
  const [activeNotation, setActiveNotation] = useState(0);
  const userGoal = (currentUser && currentUser.targetGoal) || 3.5;
  const isTimerOn = currentUser && currentUser.timerEnabled !== false;

  return (
    <div className="p-6 pt-6 pb-36 animate-in fade-in min-h-full">
      <div className="mb-6">
        <p className="text-orange-500 font-black uppercase tracking-widest text-xs mb-1">Preferences</p>
        <h2 className="text-3xl font-black tracking-tight text-white">Settings</h2>
      </div>

      <GlassCard className="p-5 mb-6 !rounded-[1.75rem]">
        <h3 className="text-sm font-black uppercase tracking-wider text-orange-400 mb-4 flex items-center gap-2">
          <Timer size={16} /> Training Preferences
        </h3>
        <div className="flex items-center justify-between py-2 border-b border-white/5">
          <div>
            <span className="text-sm font-bold text-white block">Speedcube Stopwatch</span>
            <span className="text-xs text-slate-400">Track execution times in Practice</span>
          </div>
          <button 
            onClick={() => setTimerEnabled(!isTimerOn)} 
            className={`w-12 h-7 rounded-full p-1 transition-colors ${isTimerOn ? 'bg-orange-500' : 'bg-slate-800'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isTimerOn ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div>
            <span className="text-sm font-bold text-white block">Target Execution Goal</span>
            <span className="text-xs text-slate-400">Target benchmark time (seconds)</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTargetGoal(Math.max(1, +(userGoal - 0.25).toFixed(2)))} 
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-300 active:scale-90"
            >
              -
            </button>
            <span className="font-mono text-sm font-black text-orange-400 w-12 text-center">{userGoal.toFixed(2)}s</span>
            <button 
              onClick={() => setTargetGoal(+(userGoal + 0.25).toFixed(2))} 
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-300 active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 mb-6 !rounded-[1.75rem]">
        <h3 className="text-sm font-black uppercase tracking-wider text-orange-400 mb-3 flex items-center gap-2">
          <Compass size={16} /> Algorithm Notation Key
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
          {NOTATION_GROUPS.map((grp, idx) => (
            <button 
              key={grp.title} 
              onClick={() => setActiveNotation(idx)} 
              className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full whitespace-nowrap transition-all border ${activeNotation === idx ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md' : 'bg-white/5 text-slate-400 border-white/10'}`}
            >
              {grp.title.split(' ')[0]}
            </button>
          ))}
        </div>
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-white/5">
          <div className="text-xs font-bold text-white mb-1">{NOTATION_GROUPS[activeNotation].title}</div>
          <div className="text-[11px] text-slate-400 mb-3">{NOTATION_GROUPS[activeNotation].description}</div>
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto no-scrollbar">
            {NOTATION_GROUPS[activeNotation].moves.map(m => (
              <div key={m.move} className="flex items-center gap-3 p-2 bg-slate-900/60 rounded-xl border border-white/5">
                <span className="font-mono text-xs font-black text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20 w-16 text-center">{m.move}</span>
                <span className="text-xs text-slate-200">{m.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="danger" onClick={onRequestReset} className="py-4 text-xs font-black px-2 shadow-none">
          <RotateCcw size={16} /> Reset My Progress
        </Button>
        <Button variant="secondary" onClick={onOpenAdmin} className="py-4 text-xs font-black px-2 shadow-none border-dashed border-white/20">
          <Users size={16} /> Admin Panel
        </Button>
      </div>
    </div>
  );
};

// --- LEARN SESSION ---
const LearnSession = ({ algs, onClose, onComplete }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = e => touchStartX.current = e.changedTouches[0].screenX;
  const handleTouchEnd = e => {
    touchEndX.current = e.changedTouches[0].screenX;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 45 && index < algs.length - 1) setIndex(p => p + 1);
    else if (diff < -45 && index > 0) setIndex(p => p - 1);
  };
  const currentAlg = algs[index] || algs[0];

  return (
    <div 
      className="fixed inset-0 z-[100] bg-[#070b16] flex flex-col p-6 pt-8 animate-in slide-in-from-bottom-full overflow-hidden" 
      onTouchStart={handleTouchStart} 
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90">
          <X size={20} />
        </button>
        <div className="flex items-center gap-1.5">
          {algs.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-orange-500' : 'w-2 bg-slate-800'}`} />
          ))}
        </div>
        <div className="font-mono text-xs font-bold text-slate-400">{index + 1}/{algs.length}</div>
      </div>
      <div className="bg-orange-500/10 border border-orange-500/25 rounded-2xl p-3.5 mb-4 text-center">
        <p className="text-xs font-bold text-orange-300 leading-snug">
          💡 <span className="text-orange-400 font-black">Pro Tip:</span> Practice each Algorithm at least <span className="underline">40 times</span> to commit to memory then <span className="underline">20 more times</span> to solidify!
        </p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative w-full">
        <div className="text-center mb-3">
          <span className="text-orange-400 font-black uppercase tracking-widest text-[11px] px-3.5 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">
            {currentAlg.group}
          </span>
          <h2 className="text-3xl font-black mt-2 text-white tracking-tight">{currentAlg.name}</h2>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mt-0.5">OLL Case #{currentAlg.id}</span>
        </div>
        <div className="bg-slate-900/80 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-6 flex flex-col items-center shadow-2xl relative">
          <div className="w-44 h-44 bg-slate-200 rounded-3xl mb-5 flex items-center justify-center p-3 shadow-inner">
            <img src={getImageUrl(currentAlg.alg)} alt={currentAlg.name} className="w-full h-full object-contain" />
          </div>
          <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-4 text-center shadow-inner">
            <div className="font-mono text-xl text-orange-400 font-bold tracking-wider leading-relaxed">{currentAlg.alg}</div>
          </div>
          <div className="flex items-center justify-between w-full mt-4 text-[11px] text-slate-400 px-2 font-medium">
            <span>← Swipe for previous</span>
            <span>Swipe for next →</span>
          </div>
        </div>
      </div>
      <div className="mt-auto pt-4 flex gap-3 max-w-sm mx-auto w-full">
        <button 
          onClick={() => setIndex(p => Math.max(0, p - 1))} 
          disabled={index === 0} 
          className="p-4 bg-white/5 rounded-2xl disabled:opacity-20 active:scale-95 border border-white/10"
        >
          <ChevronLeft size={22} />
        </button>
        {index < algs.length - 1 ? (
          <Button onClick={() => setIndex(p => p + 1)}>
            <span>Next Pattern</span>
            <ChevronRight size={18} />
          </Button>
        ) : (
          <Button onClick={onComplete} variant="primary">
            <span>Complete Day Training</span>
            <CheckCircle2 size={18} />
          </Button>
        )}
      </div>
    </div>
  );
};

// --- PRACTICE SESSION ---
const PracticeSession = ({ algs, mode, timerEnabled, solveTimes, onRecordTime, onClose, onComplete }) => {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [scramble, setScramble] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    const shuffled = [...algs].sort(() => 0.5 - Math.random());
    setQueue(shuffled);
    if (shuffled.length > 0) setScramble(reverseAlg(shuffled[0].alg));
  }, [algs]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const toggleTimer = () => {
    if (!timerRunning) {
      startTimeRef.current = performance.now() - elapsedTime;
      timerRef.current = setInterval(() => setElapsedTime(performance.now() - startTimeRef.current), 10);
      setTimerRunning(true);
    } else {
      clearInterval(timerRef.current);
      setTimerRunning(false);
      const recorded = +(elapsedTime / 1000).toFixed(2);
      if (queue[currentIndex]) onRecordTime(queue[currentIndex].id, recorded);
    }
  };

  const handleNextCase = () => {
    if (timerRunning) { clearInterval(timerRef.current); setTimerRunning(false); }
    setElapsedTime(0);
    setShowDetails(false);
    if (currentIndex < queue.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setScramble(reverseAlg(queue[nextIdx].alg));
    } else onComplete();
  };

  if (queue.length === 0) return null;
  const currentAlg = queue[currentIndex];
  const caseRuns = (solveTimes && solveTimes[currentAlg.id]) || [];
  const caseAvg = caseRuns.length > 0 ? (caseRuns.reduce((a, b) => a + b, 0) / caseRuns.length).toFixed(2) : null;
  const formattedTime = (elapsedTime / 1000).toFixed(2);

  return (
    <div className="fixed inset-0 z-[100] bg-[#070b16] flex flex-col p-6 pt-8 animate-in slide-in-from-bottom-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90">
          <X size={20} />
        </button>
        <div className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          {mode === 'review' ? 'Review Session' : 'Drill Session'} • {currentIndex + 1}/{queue.length}
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="w-full bg-slate-900/90 border border-white/10 rounded-[2rem] p-5 mb-5 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">1. Apply Setup Scramble</span>
          <div className="font-mono text-lg text-slate-100 font-bold tracking-wider leading-relaxed select-all">{scramble}</div>
        </div>
        {timerEnabled && (
          <div 
            onClick={toggleTimer} 
            className={`w-full rounded-[2rem] p-5 mb-5 text-center cursor-pointer transition-all border shadow-2xl ${timerRunning ? 'bg-orange-500/20 border-orange-400/60 shadow-orange-500/20 scale-[1.02]' : 'bg-slate-900/60 border-white/10 hover:border-orange-500/30'}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 text-slate-400">
              {timerRunning ? 'Tap to Stop Timer' : 'Tap to Start Timer'}
            </span>
            <div className={`font-mono text-5xl font-black tracking-tight ${timerRunning ? 'text-orange-400' : 'text-white'}`}>{formattedTime}s</div>
            {caseRuns.length > 0 && (
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                Case Avg: <span className="text-orange-400 font-bold">{caseAvg}s</span> • Solves: {caseRuns.length}
              </div>
            )}
          </div>
        )}
        <div className="w-full flex flex-col items-center min-h-[220px] justify-center">
          {showDetails ? (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-200 rounded-3xl p-3 shadow-2xl mb-4 border-2 border-slate-700">
                <img src={getImageUrl(currentAlg.alg)} alt={currentAlg.name} className="w-32 h-32 object-contain" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">{currentAlg.name}</h3>
              <div className="bg-[#050811] border border-white/10 py-2.5 px-4 rounded-xl text-center shadow-inner max-w-full">
                <span className="font-mono text-base text-orange-400 font-bold tracking-wider">{currentAlg.alg}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="bg-slate-800/80 text-orange-400 border border-white/10 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl inline-block mb-3">
                {currentAlg.group}
              </div>
              <p className="text-xs text-slate-400 font-medium">Solve the cube, then reveal to verify!</p>
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto pt-4 flex flex-col gap-2.5 max-w-sm mx-auto w-full">
        <Button variant="secondary" onClick={() => setShowDetails(!showDetails)} className="border-orange-500/30 bg-orange-500/10 text-orange-400 font-bold">
          {showDetails ? <EyeOff size={18} /> : <Eye size={18} />}
          <span>{showDetails ? 'Hide Solution' : 'Reveal Solution'}</span>
        </Button>
        <Button onClick={handleNextCase} variant="primary">
          <span>{currentIndex < queue.length - 1 ? 'Next Scramble' : 'Finish Session'}</span>
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
};

// --- ISOLATED DRILL MODAL ---
const IsolatedDrillModal = ({ caseData, timerEnabled, solveTimes = [], onRecordTime, onClose }) => {
  const [showAlg, setShowAlg] = useState(false);
  const [scramble, setScramble] = useState(reverseAlg(caseData.alg));
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const toggleTimer = () => {
    if (!timerRunning) {
      startTimeRef.current = performance.now() - elapsedTime;
      timerRef.current = setInterval(() => setElapsedTime(performance.now() - startTimeRef.current), 10);
      setTimerRunning(true);
    } else {
      clearInterval(timerRef.current);
      setTimerRunning(false);
      onRecordTime(+(elapsedTime / 1000).toFixed(2));
    }
  };

  const handleNewDrill = () => {
    if (timerRunning) { clearInterval(timerRef.current); setTimerRunning(false); }
    setElapsedTime(0);
    setShowAlg(false);
    setScramble(reverseAlg(caseData.alg));
  };

  const runs = Array.isArray(solveTimes) ? solveTimes : [];
  const bestTime = runs.length > 0 ? Math.min(...runs).toFixed(2) : '--';
  const avgTime = runs.length > 0 ? (runs.reduce((a,b)=>a+b,0) / runs.length).toFixed(2) : '--';

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex flex-col p-6 pt-8 animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90">
          <X size={20} />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">Isolated Drill</span>
        <div className="w-8" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full text-center">
        <h3 className="text-2xl font-black text-white mb-1">{caseData.name}</h3>
        <span className="text-xs text-slate-400 uppercase tracking-widest mb-4">{caseData.group} • #{caseData.id}</span>
        <div className="w-full bg-slate-900/90 border border-white/10 rounded-2xl p-4 mb-4 text-center shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Scramble to form case:</span>
          <div className="font-mono text-sm text-slate-200 font-bold">{scramble}</div>
        </div>
        {timerEnabled && (
          <div 
            onClick={toggleTimer} 
            className={`w-full rounded-[2rem] p-4 mb-4 text-center cursor-pointer transition-all border ${timerRunning ? 'bg-orange-500/20 border-orange-400/60' : 'bg-slate-900/60 border-white/10'}`}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
              {timerRunning ? 'Tap to Stop' : 'Tap to Time Solve'}
            </span>
            <div className="font-mono text-4xl font-black text-white">{(elapsedTime / 1000).toFixed(2)}s</div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Best: <span className="text-orange-400 font-bold">{bestTime}s</span> • Avg: {avgTime}s ({runs.length} runs)
            </div>
          </div>
        )}
        <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
          <div className="bg-slate-200 rounded-2xl p-2 w-28 h-28 mb-3 flex items-center justify-center shadow-inner">
            <img src={getImageUrl(caseData.alg)} alt={caseData.name} className="w-full h-full object-contain" />
          </div>
          {showAlg ? (
            <div className="font-mono text-sm font-bold text-orange-400 bg-slate-950/80 p-3 rounded-xl border border-white/5 w-full">
              {caseData.alg}
            </div>
          ) : (
            <button onClick={() => setShowAlg(true)} className="text-xs text-orange-400 font-bold py-2 px-4 bg-orange-500/10 rounded-full border border-orange-500/20">
              Show Algorithm
            </button>
          )}
        </div>
      </div>
      <div className="mt-auto pt-4 flex gap-3 max-w-sm mx-auto w-full">
        <Button variant="secondary" onClick={handleNewDrill}>
          <RotateCcw size={18} />
          <span>New Run</span>
        </Button>
        <Button variant="primary" onClick={onClose}>
          <span>Done</span>
        </Button>
      </div>
    </div>
  );
};
