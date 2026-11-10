import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Home, BookOpen, Clock, Settings, BarChart2, 
  ChevronRight, ChevronLeft, Play, Square, RotateCcw, 
  Eye, EyeOff, CheckCircle2, Target
} from 'lucide-react';

// --- CUSTOM ISOMETRIC SVG LOGO ---
const SuneCubeLogo = ({ className = "w-32 h-32" }) => {
  const s = 22; 
  const cos30 = 0.866;
  const sin30 = 0.5;

  // Mathematically maps a 3D point (i,j,k) to a 2D isometric grid
  const project = (i, j, k) => {
    const x = 100 - i * s * cos30 + j * s * cos30;
    const y = 35 + i * s * sin30 + j * s * sin30 + k * s;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  };

  const pad = 0.12; // Inset padding for the colored sticker inside the plastic border

  const Tile = ({ p1, p2, p3, p4, sp1, sp2, sp3, sp4, color }) => (
    <g>
      {/* Black plastic base */}
      <polygon points={`${p1} ${p2} ${p3} ${p4}`} fill="#000000" stroke="#000000" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Colored sticker */}
      <polygon points={`${sp1} ${sp2} ${sp3} ${sp4}`} fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </g>
  );

  const TopTile = ({ i, j, color }) => (
    <Tile
      p1={project(i, j, 0)} p2={project(i+1, j, 0)} p3={project(i+1, j+1, 0)} p4={project(i, j+1, 0)}
      sp1={project(i+pad, j+pad, 0)} sp2={project(i+1-pad, j+pad, 0)} sp3={project(i+1-pad, j+1-pad, 0)} sp4={project(i+pad, j+1-pad, 0)}
      color={color}
    />
  );

  const LeftTile = ({ j, k, color }) => (
    <Tile
      p1={project(3, j, k)} p2={project(3, j+1, k)} p3={project(3, j+1, k+1)} p4={project(3, j, k+1)}
      sp1={project(3, j+pad, k+pad)} sp2={project(3, j+1-pad, k+pad)} sp3={project(3, j+1-pad, k+1-pad)} sp4={project(3, j+pad, k+1-pad)}
      color={color}
    />
  );

  const RightTile = ({ i, k, color }) => (
    <Tile
      p1={project(i, 3, k)} p2={project(i+1, 3, k)} p3={project(i+1, 3, k+1)} p4={project(i, 3, k+1)}
      sp1={project(i+pad, 3, k+pad)} sp2={project(i+1-pad, 3, k+pad)} sp3={project(i+1-pad, 3, k+1-pad)} sp4={project(i+pad, 3, k+1-pad)}
      color={color}
    />
  );

  const getTopColor = (i, j) => {
    // Sune Pattern (Cross + Bottom Left Corner)
    const isOrange = (i===1 && j===1) || (i===0 && j===1) || (i===1 && j===0) || (i===1 && j===2) || (i===2 && j===1) || (i===2 && j===0);
    return isOrange ? "#ea580c" : "#18181b"; 
  };

  const stickerDark = "#18181b"; // Zinc-900

  return (
    <svg viewBox="0 0 200 200" className={className} style={{ filter: 'drop-shadow(0 15px 15px rgba(0,0,0,0.6))' }}>
      {/* Bottom and Middle Layers */}
      <g>
        {[1, 2].map(k => [0, 1, 2].map(j => <LeftTile key={`l-${j}-${k}`} j={j} k={k} color={stickerDark} />))}
        {[1, 2].map(k => [0, 1, 2].map(i => <RightTile key={`r-${i}-${k}`} i={i} k={k} color={stickerDark} />))}
      </g>

      {/* Top of Middle Layer (prevents seeing through the hollow cube when twisted) */}
      <polygon points={`${project(0,0,1)} ${project(3,0,1)} ${project(3,3,1)} ${project(0,3,1)}`} fill="#000000" />

      {/* Top Layer - Twisted dynamically by rotating SVG group */}
      <g style={{ transform: 'rotate(-18deg)', transformOrigin: '100px 68px' }}>
        {/* Inner black base to hide gaps */}
        <polygon points={`${project(3,0,0)} ${project(3,3,0)} ${project(3,3,1)} ${project(3,0,1)}`} fill="#000" />
        <polygon points={`${project(0,3,0)} ${project(3,3,0)} ${project(3,3,1)} ${project(0,3,1)}`} fill="#000" />

        {[0, 1, 2].map(j => <LeftTile key={`lt-${j}`} j={j} k={0} color={stickerDark} />)}
        {[0, 1, 2].map(i => <RightTile key={`rt-${i}`} i={i} k={0} color={stickerDark} />)}
        
        {/* Map Top tiles descending so overlapping z-indexes layer perfectly */}
        {[2, 1, 0].map(i => [2, 1, 0].map(j => <TopTile key={`t-${i}-${j}`} i={i} j={j} color={getTopColor(i, j)} />))}
      </g>
    </svg>
  );
};


// --- OLL DATA & SCHEDULE MAPPING ---
// 57 Cases divided into 9 chunks for a 32 day cycle.
const OLL_DATA = [
  // Chunk 1: Easy Algs (T, Squares)
  { id: 1, name: "T (PB-Breaker)", alg: "F (R U R' U') F'", group: "T-Shapes", chunk: 1, scramble: "F U R U' R' F'" },
  { id: 2, name: "T (Secondary)", alg: "F (sexy) F'", group: "T-Shapes", chunk: 1, scramble: "F U R U' R' F'" },
  { id: 3, name: "Righty-Square", alg: "r U2 R' U' R U' r'", group: "Squares", chunk: 1, scramble: "r U R' U R U2 r'" },
  { id: 4, name: "Lefty-Square", alg: "r' U2 R U R' U r", group: "Squares", chunk: 1, scramble: "r' U' R U' R' U2 r" },
  { id: 5, name: "Key", alg: "(R U R' U') (R' F R F')", group: "Squares", chunk: 1, scramble: "F R' F' R U R U' R'" },
  // Chunk 2: Oriented Edges (Cross)
  { id: 6, name: "Sune", alg: "R U R' U R U2 R'", group: "Oriented-Edges", chunk: 2, scramble: "R U2 R' U' R U' R'" },
  { id: 7, name: "Anti-Sune", alg: "R U2 R' U' R U' R'", group: "Oriented-Edges", chunk: 2, scramble: "R U R' U R U2 R'" },
  { id: 8, name: "Cross", alg: "(R U2 R') (U' R U R') (U' R U' R')", group: "Oriented-Edges", chunk: 2, scramble: "R U R' U R U' R' U R U2 R'" },
  { id: 9, name: "Chameleon", alg: "(r U R' U') (r' F R F')", group: "Oriented-Edges", chunk: 2, scramble: "F R' F' r U R U' r'" },
  { id: 10, name: "Bowtie", alg: "F' (r U R' U') r' F R", group: "Oriented-Edges", chunk: 2, scramble: "R' F' r U R U' r' F" },
  // Chunk 3: Solved Corners & P-Shapes
  { id: 11, name: "Arrow", alg: "(r U R' U') M (U R U' R')", group: "Solved Corners", chunk: 3, scramble: "R U R' U' M' U R U' r'" },
  { id: 12, name: "H", alg: "(R U R' U') M' (U R U' r')", group: "Solved Corners", chunk: 3, scramble: "r U R' U' M U R U' R'" },
  { id: 13, name: "P", alg: "f (R U R' U') f'", group: "P-shapes", chunk: 3, scramble: "f U R U' R' f'" },
  { id: 14, name: "Inverse P", alg: "f' (L' U' L U) f", group: "P-shapes", chunk: 3, scramble: "f' U' L' U L f" },
  { id: 15, name: "Couch", alg: "R' U' F (U R U' R') F' R", group: "P-shapes", chunk: 3, scramble: "R' F R U R' U' F' U R" },
  { id: 16, name: "Anti-Couch", alg: "R U B' (U' R' U) R B R'", group: "P-shapes", chunk: 3, scramble: "R B' R' U' R U B U' R'" },
  // Chunk 4: Lightnings
  { id: 17, name: "Lightning", alg: "r U R' U R U2 r'", group: "Lightning", chunk: 4, scramble: "r U2 R' U' R U' r'" },
  { id: 18, name: "Reverse Lightning", alg: "r' U' R U' R' U2 r", group: "Lightning", chunk: 4, scramble: "r' U2 R U R' U r" },
  { id: 19, name: "Downstairs", alg: "r' (R2 U R' U R U2 R') U M'", group: "Lightning", chunk: 4, scramble: "M U' R U2 R' U' R U' R2 r" },
  { id: 20, name: "Upstairs", alg: "M' (R' U' R U' R' U2 R) U' M", group: "Lightning", chunk: 4, scramble: "M' U R' U2 R U R' U R M" },
  { id: 21, name: "Big Lightning", alg: "R' F (R U R' U') F' U R", group: "Lightning", chunk: 4, scramble: "R' U' F U R U' R' F' R" },
  { id: 22, name: "Lefty Big Lightning", alg: "L F' (L' U' L U) F U' L'", group: "Lightning", chunk: 4, scramble: "L U F' U' L' U L F L'" },
  // Chunk 5: C-Shapes & Fishes
  { id: 23, name: "Seein' Headlights", alg: "R' U' (R' F R F') U R", group: "C-shapes", chunk: 5, scramble: "R' U' F R' F' R U R" },
  { id: 24, name: "City", alg: "(R U R' U') B' (R' F R F') B", group: "C-shapes", chunk: 5, scramble: "B' F R' F' R B U R U' R'" },
  { id: 25, name: "Mounted Fish", alg: "F (R U' R' U') (R U R' F')", group: "Fishes", chunk: 5, scramble: "F R U' R' U R U R' F'" },
  { id: 26, name: "Kite", alg: "(R U R' U') R' F (R2 U R' U') F'", group: "Fishes", chunk: 5, scramble: "F U R U' R2 F' R U R U' R'" },
  { id: 27, name: "Fish Salad", alg: "(R U2 R2') F R F' (R U2 R')", group: "Fishes", chunk: 5, scramble: "R U2 R' F R' F' R2 U2 R'" },
  { id: 28, name: "Anti-Kite", alg: "(R U R' U) (R' F R F') (R U2 R')", group: "Fishes", chunk: 5, scramble: "R U2 R' F R' F' R U' R U' R'" },
  // Chunk 6: L-Shapes
  { id: 29, name: "Breakneck", alg: "F (R U R' U') (R U R' U') F'", group: "L-shapes", chunk: 6, scramble: "F U R U' R' U R U' R' F'" },
  { id: 30, name: "Anti-Breakneck", alg: "R' U' (R' F R F') (R' F R F') U R", group: "L-shapes", chunk: 6, scramble: "R' U' F R' F' R F R' F' R U R" },
  { id: 31, name: "Frying Pan", alg: "(r' U' R U') (R' U R U') R' U2 r", group: "L-shapes", chunk: 6, scramble: "r' U2 R U R' U' R U R' U r" },
  { id: 32, name: "Anti-Frying Pan", alg: "(r U R' U) (R U' R' U) R U2 r'", group: "L-shapes", chunk: 6, scramble: "r U2 R' U' R U R' U' R U' r'" },
  { id: 33, name: "Front Squeezy", alg: "r' U r2 U' r2 U' r2 U r'", group: "L-shapes", chunk: 6, scramble: "r U' r2 U r2 U r2 U' r" },
  { id: 34, name: "Back Squeezy", alg: "r U' r2 U r2 U r2 U' r", group: "L-shapes", chunk: 6, scramble: "r' U r2 U' r2 U' r2 U r'" },
  // Chunk 7: W & Lines
  { id: 35, name: "Mario", alg: "(R U R' U) (R U' R' U') (R' F R F')", group: "W-Shapes", chunk: 7, scramble: "F R' F' R U R U' R' U' R U' R'" },
  { id: 36, name: "Wario", alg: "(R' U' R U') (R' U R U) l U' R' U x", group: "W-Shapes", chunk: 7, scramble: "x' U' R U l' U' R' U' R U R' U R" },
  { id: 37, name: "Ant", alg: "f (R U R' U') (R U R' U') f'", group: "Lines", chunk: 7, scramble: "f U R U' R' U R U' R' f'" },
  { id: 38, name: "Streetlights", alg: "r U r' (U R U' R') (U R U' R') r U' r'", group: "Lines", chunk: 7, scramble: "r U r' R U R' U' R U R' U' r U' r'" },
  { id: 39, name: "Rice Cooker", alg: "(R U R' U R U') y (R U' R') F'", group: "Lines", chunk: 7, scramble: "F R U R' y' U R' U' R U' R'" },
  { id: 40, name: "Highway", alg: "R U2 R2 (U' R U' R') U2 F R F'", group: "Lines", chunk: 7, scramble: "F R' F' U2 R U R' U R2 U2 R'" },
  // Chunk 8: Knight Moves & Awkward
  { id: 41, name: "Squeegee", alg: "(r' U' r) (R' U' R U) (r' U r)", group: "Knight Moves", chunk: 8, scramble: "r' U' r U' R' U R r' U r" },
  { id: 42, name: "Anti-Squeegee", alg: "(r U r') (R U R' U') (r U' r')", group: "Knight Moves", chunk: 8, scramble: "r U r' U R U' R' r U' r'" },
  { id: 43, name: "Gun", alg: "F U R U' R2 F' R U (R U' R')", group: "Knight Moves", chunk: 8, scramble: "R U R' U' R' F R2 U R' U' F'" },
  { id: 44, name: "Anti-Gun", alg: "(R' F R) (U R' F' R) (F U' F')", group: "Knight Moves", chunk: 8, scramble: "F U F' R' F R U' R' F' R" },
  { id: 45, name: "Poodle", alg: "(R U R' U R U2 R') F (R U R' U') F'", group: "Awkward Shapes", chunk: 8, scramble: "F U R U' R' F' R U2 R' U' R U' R'" },
  { id: 46, name: "Anti-Poodle", alg: "(R' U' R U' R' U2 R) F (R U R' U') F'", group: "Awkward Shapes", chunk: 8, scramble: "F U R U' R' F' R' U2 R U R' U R" },
  { id: 47, name: "WTF", alg: "r2 D' (r U r') D r2 (U' r' U' r)", group: "Awkward Shapes", chunk: 8, scramble: "r' U r U r2 D' r U' r' D r2" },
  { id: 48, name: "Anti-WTF", alg: "F U (R U2 R' U') (R U2 R' U') F'", group: "Awkward Shapes", chunk: 8, scramble: "F U R U2 R' U R U2 R' U' F'" },
  // Chunk 9: Dot-cases
  { id: 49, name: "Blank", alg: "(R U2 R2') F R F' U2 (R' F R F')", group: "Dot-cases", chunk: 9, scramble: "F R' F' R U2 F R' F' R2 U2 R'" },
  { id: 50, name: "Slash", alg: "(R U R' U) (R' F R F') U2 (R' F R F')", group: "Dot-cases", chunk: 9, scramble: "F R' F' R U2 F R' F' R U' R U' R'" },
  { id: 51, name: "Bunny", alg: "M U (R U R' U') M' (R' F R F')", group: "Dot-cases", chunk: 9, scramble: "F R' F' R M U R U' R' U' M'" },
  { id: 52, name: "Anti-Nazi", alg: "f (R U R' U') f' U' F (R U R' U') F'", group: "Dot-cases", chunk: 9, scramble: "F U R U' R' F' U f U R U' R' f'" },
  { id: 53, name: "Zamboni", alg: "F (R U R' U') F' f (R U R' U') f'", group: "Dot-cases", chunk: 9, scramble: "f U R U' R' f' F U R U' R' F'" },
  { id: 54, name: "X (Super Lip)", alg: "M U (R U R' U') M2 (U R U' r')", group: "Dot-cases", chunk: 9, scramble: "r U R' U' M2 U R U' R' U' M'" },
  { id: 55, name: "Crown", alg: "(r U R' U R U2 r') (r' U' R U' R' U2 r)", group: "Dot-cases", chunk: 9, scramble: "r' U2 R U R' U r r U2 R' U' R U' r'" },
  { id: 56, name: "Nazi", alg: "f (R U R' U') f' U F (R U R' U') F'", group: "Dot-cases", chunk: 9, scramble: "F U R U' R' F' U' f U R U' R' f'" }
];

// Group algorithms for the Algorithms Tab
const GROUPS = [...new Set(OLL_DATA.map(c => c.group))];

const getScheduleForDay = (day) => {
  if (day === 32) return { mode: 'review', cases: OLL_DATA }; // Final Exam Day
  
  // 1-31 cycle
  const cycleIndex = Math.floor((day - 1) / 3); 
  const dayInCycle = (day - 1) % 3; // 0=Learn, 1=Practice, 2=Practice
  
  if (cycleIndex >= 10) return { mode: 'review', cases: OLL_DATA }; // Catchall
  
  const isReviewCycle = (cycleIndex > 0 && cycleIndex % 2 === 1 && dayInCycle === 2);
  
  if (isReviewCycle) {
    const maxChunk = Math.ceil((cycleIndex + 1) / 2);
    const reviewCases = OLL_DATA.filter(c => c.chunk <= maxChunk);
    return { mode: 'review', cases: reviewCases };
  }

  const currentChunk = Math.min(Math.floor(cycleIndex) + 1, 9);
  const chunkCases = OLL_DATA.filter(c => c.chunk === currentChunk);
  
  return {
    mode: dayInCycle === 0 ? 'learn' : 'practice',
    cases: chunkCases
  };
};


// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentTab, setCurrentTab] = useState('grind');
  const [currentDay, setCurrentDay] = useState(1);
  const [stats, setStats] = useState({});
  const [targetGoal, setTargetGoal] = useState(3.5);
  
  // Load local state
  useEffect(() => {
    const savedDay = localStorage.getItem('ollDay');
    if (savedDay) setCurrentDay(parseInt(savedDay, 10));
    
    const savedStats = localStorage.getItem('ollStats');
    if (savedStats) setStats(JSON.parse(savedStats));
    
    const savedGoal = localStorage.getItem('ollGoal');
    if (savedGoal) setTargetGoal(parseFloat(savedGoal));
  }, []);

  const saveStats = (newStats) => {
    setStats(newStats);
    localStorage.setItem('ollStats', JSON.stringify(newStats));
  };

  const advanceDay = () => {
    const next = currentDay < 32 ? currentDay + 1 : 32;
    setCurrentDay(next);
    localStorage.setItem('ollDay', next.toString());
  };

  const resetProgress = () => {
    if(window.confirm("Are you sure you want to reset all progress to Day 1?")) {
      setCurrentDay(1);
      localStorage.setItem('ollDay', '1');
      setStats({});
      localStorage.setItem('ollStats', JSON.stringify({}));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SuneCubeLogo className="w-10 h-10" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent tracking-tight">
            OLLDay Everyday
          </h1>
        </div>
        {currentTab === 'grind' && (
          <div className="flex items-center gap-2 text-sm font-semibold px-3 py-1 bg-slate-800/50 rounded-full text-orange-400 border border-orange-500/20">
            Day {currentDay}/32
          </div>
        )}
      </header>

      {/* CONTENT AREA */}
      <main className="pt-24 px-4 max-w-lg mx-auto">
        {currentTab === 'grind' && <GrindTab day={currentDay} onAdvance={advanceDay} stats={stats} saveStats={saveStats} />}
        {currentTab === 'algos' && <AlgorithmsTab stats={stats} saveStats={saveStats} />}
        {currentTab === 'stats' && <StatsTab stats={stats} targetGoal={targetGoal} setTargetGoal={setTargetGoal} />}
        {currentTab === 'settings' && <SettingsTab resetProgress={resetProgress} />}
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50 z-40 pb-safe">
        <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-4">
          <NavItem icon={<Home />} label="The Grind" active={currentTab === 'grind'} onClick={() => setCurrentTab('grind')} />
          <NavItem icon={<BookOpen />} label="Algorithms" active={currentTab === 'algos'} onClick={() => setCurrentTab('algos')} />
          <NavItem icon={<BarChart2 />} label="Statistics" active={currentTab === 'stats'} onClick={() => setCurrentTab('stats')} />
          <NavItem icon={<Settings />} label="Settings" active={currentTab === 'settings'} onClick={() => setCurrentTab('settings')} />
        </div>
      </nav>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all active:scale-95 ${active ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
  >
    {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
    <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
  </button>
);


// --- TABS ---

function GrindTab({ day, onAdvance, stats, saveStats }) {
  const schedule = getScheduleForDay(day);

  if (schedule.mode === 'learn') {
    return <LearnSession cases={schedule.cases} onComplete={onAdvance} />;
  }

  return (
    <PracticeSession 
      cases={schedule.cases} 
      onComplete={onAdvance} 
      title={schedule.mode === 'review' ? (day === 32 ? "The Final Exam" : "Review Session") : "Practice Session"} 
      stats={stats}
      saveStats={saveStats}
    />
  );
}


function LearnSession({ cases, onComplete }) {
  const [idx, setIdx] = useState(0);
  const currentCase = cases[idx];

  const handleNext = () => {
    if (idx < cases.length - 1) setIdx(idx + 1);
  };
  const handlePrev = () => {
    if (idx > 0) setIdx(idx - 1);
  };

  // Swipe detection for carousel feel
  const touchStartX = useRef(null);
  const handleTouchStart = (e) => touchStartX.current = e.touches[0].clientX;
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 40) handleNext();
    if (diff < -40) handlePrev();
    touchStartX.current = null;
  };

  return (
    <div className="flex flex-col h-[75vh]" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Learn New Cases</h2>
        <span className="text-sm font-medium text-slate-400">{idx + 1} of {cases.length}</span>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-6 text-orange-200 text-sm leading-relaxed font-medium shadow-inner">
        <span className="font-bold text-orange-400">Pro Tip: </span> 
        Practice each Algorithm at least 40 times to commit to memory, then 20 more times to solidify!
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <button onClick={handlePrev} disabled={idx === 0} className="absolute left-0 p-2 z-10 text-slate-500 disabled:opacity-0 active:scale-90 transition-transform"><ChevronLeft size={36}/></button>
        <button onClick={handleNext} disabled={idx === cases.length - 1} className="absolute right-0 p-2 z-10 text-slate-500 disabled:opacity-0 active:scale-90 transition-transform"><ChevronRight size={36}/></button>

        {/* Outer wrapper forces React to remount/re-animate the image seamlessly when idx changes */}
        <div key={idx} className="animate-in fade-in zoom-in-95 slide-in-from-right-4 duration-300 flex flex-col items-center w-full">
          <div className="bg-slate-200 p-4 rounded-3xl shadow-xl shadow-black/50 mb-8 border border-slate-300">
            <img 
              src={`https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=250&stage=oll&case=${encodeURIComponent(currentCase.alg)}&bg=t`} 
              alt={currentCase.name}
              className="w-48 h-48 object-contain drop-shadow-md mix-blend-multiply"
            />
          </div>
          
          <h3 className="text-3xl font-bold text-white mb-2 tracking-tight text-center">{currentCase.name}</h3>
          <p className="text-orange-400 font-medium mb-6 text-center">{currentCase.group}</p>
          
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 w-full max-w-sm backdrop-blur-md">
            <p className="text-center font-mono text-xl tracking-wider text-slate-100">{currentCase.alg}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-6">
        {cases.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === idx ? 'w-8 bg-orange-500' : 'w-2 bg-slate-800'}`} />
        ))}
      </div>

      {idx === cases.length - 1 && (
        <button 
          onClick={onComplete}
          className="w-full py-4 animate-in fade-in slide-in-from-bottom-2 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all"
        >
          Finish Learning Session
        </button>
      )}
    </div>
  );
}


function PracticeSession({ cases, onComplete, title, stats, saveStats }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [revealed, setRevealed] = useState(false);
  
  // Timer State
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const shuffled = [...cases].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setCurrent(shuffled[0]);
  }, [cases]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const handleNext = () => {
    const nextQueue = queue.slice(1);
    setQueue(nextQueue);
    setCurrent(nextQueue[0] || null);
    setRevealed(false);
    setTime(0);
    setIsRunning(false);
    clearInterval(timerRef.current);
  };

  const toggleTimer = () => {
    if (isRunning) {
      clearInterval(timerRef.current);
      setIsRunning(false);
      // Save solve stat
      if (time > 0 && current) {
        const cId = current.id;
        const newStats = { ...stats };
        if(!newStats[cId]) newStats[cId] = [];
        newStats[cId].push(time);
        saveStats(newStats);
      }
    } else {
      setTime(0);
      const startTime = Date.now();
      setIsRunning(true);
      timerRef.current = setInterval(() => {
        setTime(Date.now() - startTime);
      }, 10);
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = ms / 1000;
    return totalSeconds.toFixed(2);
  };

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6 border border-green-500/30 shadow-lg shadow-green-500/20">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
        <p className="text-slate-400 mb-8">Great job grinding today.</p>
        <button 
          onClick={onComplete}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const caseStats = stats[current.id] || [];
  const avg = caseStats.length > 0 ? (caseStats.reduce((a,b)=>a+b,0)/caseStats.length) : 0;

  return (
    <div className="flex flex-col h-[75vh]">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-sm font-medium text-slate-400">{cases.length - queue.length + 1} of {cases.length}</span>
      </div>

      <div className="flex-1 flex flex-col items-center">
        
        {/* Scramble Display */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 text-center shadow-inner">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-semibold">Setup Scramble</p>
          <p className="font-mono text-lg text-slate-200">{current.scramble}</p>
        </div>

        {/* Dynamic Interactive Area */}
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          
          {revealed ? (
            <div className="animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center w-full">
              <div className="bg-slate-200 p-4 rounded-3xl shadow-lg shadow-black/50 mb-6 border border-slate-300">
                <img 
                  src={`https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=200&stage=oll&case=${encodeURIComponent(current.alg)}&bg=t`} 
                  alt={current.name}
                  className="w-32 h-32 object-contain mix-blend-multiply"
                />
              </div>
              <h3 className="text-2xl font-bold mb-1 text-center">{current.name}</h3>
              <p className="text-orange-400 font-medium mb-4 text-center">{current.group}</p>
              <div className="bg-slate-800 rounded-xl py-3 px-6 w-full text-center border border-slate-700 shadow-inner">
                <p className="font-mono text-lg text-slate-100">{current.alg}</p>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in duration-200 flex flex-col items-center">
              <div className="w-32 h-32 bg-slate-900 rounded-3xl border-2 border-dashed border-slate-700 flex items-center justify-center mb-6">
                <span className="text-4xl text-slate-700">?</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-500 mb-1 text-center">Guess the Case</h3>
              <p className="text-slate-600 font-medium text-center">{current.group}</p>
            </div>
          )}

          {/* Reveal Toggle button */}
          <button 
            onClick={() => setRevealed(!revealed)}
            className="absolute top-0 right-0 p-3 bg-slate-800/50 rounded-full text-slate-400 hover:text-white active:scale-90 transition-all border border-slate-700"
          >
            {revealed ? <EyeOff size={20}/> : <Eye size={20}/>}
          </button>
        </div>

        {/* Timer Module */}
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 shadow-xl flex flex-col items-center justify-center">
          <div className="flex justify-between w-full text-xs text-slate-500 font-semibold mb-2">
            <span>Attempts: {caseStats.length}</span>
            <span>Avg: {avg > 0 ? formatTime(avg) : '--'}s</span>
          </div>
          <div 
            onClick={toggleTimer}
            className={`font-mono text-5xl font-bold tracking-tighter cursor-pointer transition-colors ${isRunning ? 'text-orange-500' : 'text-white'}`}
          >
            {formatTime(time)}
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">{isRunning ? 'Tap to Stop' : 'Tap to Start Timer'}</p>
        </div>

        <button 
          onClick={handleNext}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-lg border border-slate-700 shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Next Case <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}


function AlgorithmsTab({ stats, saveStats }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [drillCase, setDrillCase] = useState(null);

  if (drillCase) {
    return (
      <div className="animate-in slide-in-from-right-4 duration-300 pb-36">
        <button 
          onClick={() => setDrillCase(null)}
          className="flex items-center gap-1 text-orange-500 font-semibold mb-6 active:opacity-50"
        >
          <ChevronLeft size={20} /> Back to {selectedGroup}
        </button>
        <PracticeSession 
          cases={[drillCase]} 
          onComplete={() => setDrillCase(null)} 
          title="Isolated Drill"
          stats={stats}
          saveStats={saveStats}
        />
      </div>
    );
  }

  if (selectedGroup) {
    const groupCases = OLL_DATA.filter(c => c.group === selectedGroup);
    return (
      <div className="animate-in slide-in-from-right-4 duration-300 pb-36">
        <button 
          onClick={() => setSelectedGroup(null)}
          className="flex items-center gap-1 text-orange-500 font-semibold mb-6 active:opacity-50"
        >
          <ChevronLeft size={20} /> Back to Groups
        </button>
        
        <h2 className="text-3xl font-bold mb-6">{selectedGroup}</h2>
        <div className="space-y-4">
          {groupCases.map(c => (
            <div 
              key={c.id} 
              onClick={() => setDrillCase(c)}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition-colors active:scale-95 shadow-md"
            >
              <div className="bg-slate-200 p-2 rounded-xl border border-slate-300 shrink-0">
                <img 
                  src={`https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=100&stage=oll&case=${encodeURIComponent(c.alg)}&bg=t`} 
                  alt={c.name}
                  className="w-12 h-12 object-contain mix-blend-multiply"
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="font-bold text-lg truncate text-slate-100">{c.name}</h4>
                <p className="text-slate-400 font-mono text-sm truncate">{c.alg}</p>
              </div>
              <ChevronRight className="text-slate-600" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-36 animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-6">Algorithm Library</h2>
      <div className="grid grid-cols-2 gap-4">
        {GROUPS.map(group => {
          const repCase = OLL_DATA.find(c => c.group === group);
          return (
            <div 
              key={group}
              onClick={() => setSelectedGroup(group)}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-800 active:scale-95 transition-all shadow-lg"
            >
              <div className="bg-slate-200 p-3 rounded-2xl border border-slate-300 mb-3 w-full flex justify-center shadow-inner">
                <img 
                  src={`https://visualcube.api.cubing.net/visualcube.php?fmt=svg&size=120&stage=oll&case=${encodeURIComponent(repCase.alg)}&bg=t`} 
                  alt={group}
                  className="w-16 h-16 object-contain mix-blend-multiply"
                />
              </div>
              <span className="font-bold text-sm text-slate-200">{group}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function StatsTab({ stats, targetGoal, setTargetGoal }) {
  const casesWithStats = OLL_DATA.filter(c => stats[c.id] && stats[c.id].length > 0);
  
  const calcAvg = (times) => times.reduce((a,b)=>a+b,0) / times.length;
  const calcBest = (times) => Math.min(...times);

  return (
    <div className="pb-36 animate-in fade-in">
      <h2 className="text-2xl font-bold mb-6">Performance Metrics</h2>

      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl mb-8 shadow-lg">
        <div className="flex items-center gap-3 mb-4 text-orange-400">
          <Target size={24} />
          <h3 className="font-bold text-lg text-white">Target Goal</h3>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            step="0.1"
            value={targetGoal} 
            onChange={(e) => setTargetGoal(parseFloat(e.target.value) || 0)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 w-24 text-center font-mono font-bold text-xl text-white outline-none focus:border-orange-500 transition-colors"
          />
          <span className="text-slate-400 font-medium">seconds</span>
        </div>
      </div>

      <div className="space-y-4">
        {casesWithStats.length === 0 ? (
          <div className="text-center text-slate-500 py-10 border-2 border-dashed border-slate-800 rounded-3xl">
            No solves recorded yet.<br/>Go grind some cases!
          </div>
        ) : (
          casesWithStats.map(c => {
            const times = stats[c.id];
            const avg = calcAvg(times) / 1000;
            const best = calcBest(times) / 1000;
            const diff = (best - targetGoal).toFixed(2);
            const isMet = best <= targetGoal;

            return (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-100">{c.name}</h4>
                    <p className="text-xs text-slate-500">{c.group}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-bold ${isMet ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isMet ? 'Goal Met' : `+${diff}s`}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 border border-slate-800 p-2 rounded-xl shadow-inner">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Avg</p>
                    <p className="font-mono font-semibold text-slate-200">{avg.toFixed(2)}s</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Best</p>
                    <p className="font-mono font-semibold text-orange-400">{best.toFixed(2)}s</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Count</p>
                    <p className="font-mono font-semibold text-slate-200">{times.length}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


function SettingsTab({ resetProgress }) {
  return (
    <div className="pb-36 animate-in fade-in">
      <h2 className="text-2xl font-bold mb-6">Settings & Reference</h2>

      <div className="mb-8">
        <button 
          onClick={resetProgress}
          className="w-full py-4 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-500 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] shadow-lg"
        >
          Reset All Progress (Back to Day 1)
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
        <h3 className="font-bold text-xl mb-4 text-orange-400 border-b border-slate-800 pb-2">Notation Key</h3>
        
        <NotationSection title="Single Face Moves" notations={[
          { move: "U", desc: "Top layer clockwise" },
          { move: "U'", desc: "Top layer counter-clockwise" },
          { move: "U2", desc: "Top layer 180 degrees" },
          { move: "D", desc: "Bottom layer clockwise" },
          { move: "D'", desc: "Bottom layer counter-clockwise" },
          { move: "R", desc: "Right layer clockwise" },
          { move: "R'", desc: "Right layer counter-clockwise" },
          { move: "L", desc: "Left layer clockwise" },
          { move: "L'", desc: "Left layer counter-clockwise" },
          { move: "F", desc: "Front layer clockwise" },
          { move: "F'", desc: "Front layer counter-clockwise" },
          { move: "B", desc: "Back layer clockwise" },
          { move: "B'", desc: "Back layer counter-clockwise" }
        ]} />

        <NotationSection title="Slice Moves" notations={[
          { move: "M", desc: "Middle layer (turns down, follows L)" },
          { move: "M'", desc: "Middle layer (turns up, follows R)" },
          { move: "M2", desc: "Middle layer 180 degrees" },
          { move: "E", desc: "Equator layer (turns right, follows D)" },
          { move: "S", desc: "Standing layer (turns clockwise, follows F)" }
        ]} />

        <NotationSection title="Whole Cube Rotations" notations={[
          { move: "x", desc: "Rotate full cube up (follows R)" },
          { move: "x'", desc: "Rotate full cube down (follows R')" },
          { move: "y", desc: "Rotate full cube horizontal (follows U)" },
          { move: "y'", desc: "Rotate full cube horizontal (follows U')" },
          { move: "z", desc: "Tilt full cube clockwise (follows F)" }
        ]} />

        <NotationSection title="Wide Moves" notations={[
          { move: "r / Rw", desc: "Right side + Middle layer clockwise" },
          { move: "r' / Rw'", desc: "Right side + Middle layer counter-clockwise" },
          { move: "f / Fw", desc: "Front side + Middle layer clockwise" },
          { move: "f' / Fw'", desc: "Front side + Middle layer counter-clockwise" }
        ]} />
      </div>
    </div>
  );
}

const NotationSection = ({ title, notations }) => (
  <div className="mb-6 last:mb-0">
    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">{title}</h4>
    <div className="grid gap-2">
      {notations.map((item, idx) => (
        <div key={idx} className="flex gap-3 text-sm">
          <span className="font-mono font-bold text-orange-400 w-12 shrink-0">{item.move}</span>
          <span className="text-slate-400">{item.desc}</span>
        </div>
      ))}
    </div>
  </div>
);
