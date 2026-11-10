import React, { useState, useEffect, useMemo } from 'react';
import { Target, Layers, Settings, Eye, Dumbbell, BookOpenCheck, ChevronRight, ChevronLeft, X } from 'lucide-react';

// --- DATA MODEL ---
// 57 Cases chunked into 9 groups to perfectly fit the 31-day cycle
const OLL_DATA = [
  // Chunk 1: Oriented-Edges (7)
  { id: 1, chunk: 1, name: "Sune", group: "Oriented-Edges", alg: "R U R' U R U2' R'" },
  { id: 2, chunk: 1, name: "Anti-Sune", group: "Oriented-Edges", alg: "R U2 R' U' R U' R'" },
  { id: 3, chunk: 1, name: "Cross", group: "Oriented-Edges", alg: "(R U2 R') (U' R U R') (U' R U' R')" },
  { id: 4, chunk: 1, name: "Chameleon", group: "Oriented-Edges", alg: "(r U R' U') (r' F R F')" },
  { id: 5, chunk: 1, name: "Bowtie", group: "Oriented-Edges", alg: "F' (r U R' U') r' F R" },
  { id: 6, chunk: 1, name: "Bruno", group: "Oriented-Edges", alg: "R U2' R2' U' R2 U' R2' U2' R" },
  { id: 7, chunk: 1, name: "Headlights", group: "Oriented-Edges", alg: "R2 D (R' U2 R) D' (R' U2 R')" },
  
  // Chunk 2: T-shapes (2), Squares (2), Solved Corners (2) = 6
  { id: 8, chunk: 2, name: "T", group: "T-Shapes", alg: "F (R U R' U') F'" },
  { id: 9, chunk: 2, name: "Key", group: "T-Shapes", alg: "(R U R' U') (R' F R F')" },
  { id: 10, chunk: 2, name: "Righty-Square", group: "Squares", alg: "r U2 R' U' R U' r'" },
  { id: 11, chunk: 2, name: "Lefty-Square", group: "Squares", alg: "r' U2' R U R' U r" },
  { id: 12, chunk: 2, name: "Arrow", group: "Solved Corners", alg: "(r U R' U') M (U R U' R')" },
  { id: 13, chunk: 2, name: "H", group: "Solved Corners", alg: "(R U R' U') M' (U R U' r')" },

  // Chunk 3: Lightning Bolts (6)
  { id: 14, chunk: 3, name: "Lightning", group: "Lightning Bolts", alg: "r U R' U R U2' r'" },
  { id: 15, chunk: 3, name: "Downstairs", group: "Lightning Bolts", alg: "r' (R2 U R' U R U2 R') U M'" },
  { id: 16, chunk: 3, name: "Big Lightning", group: "Lightning Bolts", alg: "R' F (R U R' U') F' U R" },
  { id: 17, chunk: 3, name: "Reverse Lightning", group: "Lightning Bolts", alg: "r' U' R U' R' U2 r" },
  { id: 18, chunk: 3, name: "Upstairs", group: "Lightning Bolts", alg: "M' (R' U' R U' R' U2 R) U' M" },
  { id: 19, chunk: 3, name: "Lefty Big Lightning", group: "Lightning Bolts", alg: "L F' (L' U' L U) F U' L'" },

  // Chunk 4: P-shapes (4), C-shapes (2) = 6
  { id: 20, chunk: 4, name: "P", group: "P-Shapes", alg: "f (R U R' U') f'" },
  { id: 21, chunk: 4, name: "Inverse P", group: "P-Shapes", alg: "f' (L' U' L U) f" },
  { id: 22, chunk: 4, name: "Couch", group: "P-Shapes", alg: "R' U' F (U R U' R') F' R" },
  { id: 23, chunk: 4, name: "Anti-Couch", group: "P-Shapes", alg: "R U B' (U' R' U) R B R'" },
  { id: 24, chunk: 4, name: "Seein' Headlights", group: "C-Shapes", alg: "R' U' (R' F R F') U R" },
  { id: 25, chunk: 4, name: "City", group: "C-Shapes", alg: "(R U R' U') B' (R' F R F') B" },

  // Chunk 5: Fishes (4), W-Shapes (2) = 6
  { id: 26, chunk: 5, name: "Mounted Fish", group: "Fishes", alg: "F (R U' R' U') (R U R' F')" },
  { id: 27, chunk: 5, name: "Fish Salad", group: "Fishes", alg: "(R U2') (R2' F R F') (R U2' R')" },
  { id: 28, chunk: 5, name: "Kite", group: "Fishes", alg: "(R U R' U') R' F (R2 U R' U') F'" },
  { id: 29, chunk: 5, name: "Anti-Kite", group: "Fishes", alg: "(R U R' U) (R' F R F') (R U2' R')" },
  { id: 30, chunk: 5, name: "Mario", group: "W-Shapes", alg: "(R U R' U) (R U' R' U') (R' F R F')" },
  { id: 31, chunk: 5, name: "Wario", group: "W-Shapes", alg: "(R' U' R U') (R' U R U) l U' R' U x" },

  // Chunk 6: L-shapes (6)
  { id: 32, chunk: 6, name: "Breakneck", group: "L-Shapes", alg: "F (R U R' U') (R U R' U') F'" },
  { id: 33, chunk: 6, name: "Anti-Breakneck", group: "L-Shapes", alg: "R' U' (R' F R F') (R' F R F') U R" },
  { id: 34, chunk: 6, name: "Frying Pan", group: "L-Shapes", alg: "(r' U' R U') (R' U R U') R' U2 r" },
  { id: 35, chunk: 6, name: "Anti-Frying Pan", group: "L-Shapes", alg: "(r U R' U) (R U' R' U) R U2' r'" },
  { id: 36, chunk: 6, name: "Front Squeezy", group: "L-Shapes", alg: "r' U r2 U' r2' U' r2 U r'" },
  { id: 37, chunk: 6, name: "Back Squeezy", group: "L-Shapes", alg: "r U' r2' U r2 U r2' U' r" },

  // Chunk 7: Lines (4), Knight Moves (2) = 6
  { id: 38, chunk: 7, name: "Ant", group: "Lines", alg: "f (R U R' U') (R U R' U') f'" },
  { id: 39, chunk: 7, name: "Rice Cooker", group: "Lines", alg: "(R U R' U R U') y (R U' R') F'" },
  { id: 40, chunk: 7, name: "Streetlights", group: "Lines", alg: "r U r' (U R U' R') (U R U' R') r U' r'" },
  { id: 41, chunk: 7, name: "Highway", group: "Lines", alg: "R U2 R2 (U' R U' R') U2 F R F'" },
  { id: 42, chunk: 7, name: "Squeegee", group: "Knight Moves", alg: "(r' U' r) (R' U' R U) (r' U r)" },
  { id: 43, chunk: 7, name: "Gun", group: "Knight Moves", alg: "F U R U' R2' F' R U (R U' R')" },

  // Chunk 8: Knight Moves (2), Awkward Shapes (4) = 6
  { id: 44, chunk: 8, name: "Anti-Squeegee", group: "Knight Moves", alg: "(r U r') (R U R' U') (r U' r')" },
  { id: 45, chunk: 8, name: "Anti-Gun", group: "Knight Moves", alg: "(R' F R) (U R' F' R) (F U' F')" },
  { id: 46, chunk: 8, name: "Poodle", group: "Awkward Shapes", alg: "(R U R' U R U2' R') F (R U R' U') F'" },
  { id: 47, chunk: 8, name: "Anti-Poodle", group: "Awkward Shapes", alg: "(R' U' R U' R' U2 R) F (R U R' U') F'" },
  { id: 48, chunk: 8, name: "WTF", group: "Awkward Shapes", alg: "r2 D' (r U r') D r2 (U' r' U' r)" },
  { id: 49, chunk: 8, name: "Anti-WTF", group: "Awkward Shapes", alg: "F U (R U2 R' U') (R U2 R' U') F'" },

  // Chunk 9: Dot-cases (8)
  { id: 50, chunk: 9, name: "Blank", group: "Dot-cases", alg: "(R U2') (R2' F R F') U2' (R' F R F')" },
  { id: 51, chunk: 9, name: "Slash", group: "Dot-cases", alg: "(R U R' U) (R' F R F') U2' (R' F R F')" },
  { id: 52, chunk: 9, name: "Bunny", group: "Dot-cases", alg: "M U (R U R' U') M' (R' F R F')" },
  { id: 53, chunk: 9, name: "Anti-Nazi", group: "Dot-cases", alg: "f (R U R' U') f' U' F (R U R' U') F'" },
  { id: 54, chunk: 9, name: "Zamboni", group: "Dot-cases", alg: "F (R U R' U') F' f (R U R' U') f'" },
  { id: 55, chunk: 9, name: "Super Lip", group: "Dot-cases", alg: "M U (R U R' U') M2' (U R U' r')" },
  { id: 56, chunk: 9, name: "Crown", group: "Dot-cases", alg: "(r U R' U R U2 r') (r' U' R U' R' U2 r)" },
  { id: 57, chunk: 9, name: "Nazi", group: "Dot-cases", alg: "f (R U R' U') f' U F (R U R' U') F'" }
];

// --- UTILS ---
// Uses HTTPS VisualCube API. bg=t ensures transparent background, removed pzl=3 for default OLL look
const getImageUrl = (alg) => {
  const sanitized = alg.replace(/[()]/g, '').trim();
  return `https://visualcube.api.cubing.net/visualcube.php?fmt=svg&stage=oll&view=plan&bg=t&case=${encodeURIComponent(sanitized)}`;
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

const getScheduleForDay = (day) => {
  if (day < 1) day = 1;
  if (day > 31) day = 31;
  
  const cycleDay = ((day - 1) % 7) + 1; 
  const week = Math.ceil(day / 7); 
  const baseChunkIndex = (week - 1) * 2; 

  let type = '';
  let chunksToUse = [];

  if (cycleDay === 1) {
    type = 'Learn';
    chunksToUse = [baseChunkIndex + 1];
  } else if (cycleDay === 2 || cycleDay === 3) {
    type = 'Practice';
    chunksToUse = [baseChunkIndex + 1];
  } else if (cycleDay === 4) {
    type = 'Learn';
    chunksToUse = [baseChunkIndex + 2];
  } else if (cycleDay === 5 || cycleDay === 6) {
    type = 'Practice';
    chunksToUse = [baseChunkIndex + 2];
  } else if (cycleDay === 7) {
    type = 'Review';
    chunksToUse = Array.from({ length: baseChunkIndex + 2 }, (_, i) => i + 1);
  }

  // Handle Day 29, 30, 31 
  if (day === 29) { type = 'Learn'; chunksToUse = [9]; }
  if (day === 30 || day === 31) { type = 'Practice'; chunksToUse = [9]; }

  const validChunks = chunksToUse.filter(c => c >= 1 && c <= 9);
  if (validChunks.length === 0) return { type: 'Complete', chunks: [1, 2, 3, 4, 5, 6, 7, 8, 9] };

  return { type, chunks: validChunks };
};

// --- SHARED COMPONENTS ---
const GlassCard = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl transition-all ${onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-slate-800/60' : ''} ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', onClick, className = '' }) => {
  const base = "w-full rounded-2xl py-4 font-bold text-lg transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg";
  const variants = {
    primary: "bg-orange-500 hover:bg-orange-400 text-slate-950 shadow-orange-500/20",
    secondary: "bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10",
  };
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

// --- MAIN APP ---
export default function App() {
  const [currentDay, setCurrentDay] = useState(1);
  const [activeTab, setActiveTab] = useState('grind');
  const [sessionState, setSessionState] = useState(null); 

  useEffect(() => {
    const saved = localStorage.getItem('oll_current_day');
    if (saved) setCurrentDay(parseInt(saved, 10));
  }, []);

  const updateDay = (newDay) => {
    if (newDay >= 1 && newDay <= 31) {
      setCurrentDay(newDay);
      localStorage.setItem('oll_current_day', newDay);
    }
  };

  const schedule = useMemo(() => getScheduleForDay(currentDay), [currentDay]);
  const todaysAlgs = useMemo(() => OLL_DATA.filter(alg => schedule.chunks.includes(alg.chunk)), [schedule]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500/30 overflow-hidden flex justify-center">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-orange-500/5 blur-[120px] rounded-b-full pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-3/4 h-[50vh] bg-blue-500/5 blur-[100px] rounded-t-full pointer-events-none z-0" />

      {/* Main Container */}
      <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10 shadow-2xl bg-slate-950/40 backdrop-blur-2xl">
        
        <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {!sessionState && activeTab === 'grind' && (
            <GrindView currentDay={currentDay} updateDay={updateDay} schedule={schedule} onStart={() => setSessionState(schedule.type.toLowerCase())} />
          )}
          {!sessionState && activeTab === 'algorithms' && <AlgorithmsView />}
          {!sessionState && activeTab === 'settings' && <SettingsView />}
          
          {sessionState === 'learn' && (
            <LearnSession algs={todaysAlgs} onClose={() => setSessionState(null)} onComplete={() => { updateDay(currentDay + 1); setSessionState(null); }} />
          )}
          {(sessionState === 'practice' || sessionState === 'review') && (
            <PracticeSession algs={todaysAlgs} mode={sessionState} onClose={() => setSessionState(null)} onComplete={() => { updateDay(currentDay + 1); setSessionState(null); }} />
          )}
        </main>

        {!sessionState && (
          <nav className="absolute bottom-0 left-0 w-full bg-slate-950/80 backdrop-blur-3xl border-t border-white/5 pb-8 pt-3 px-6 z-50 rounded-t-[2.5rem]">
            <div className="flex justify-around items-center">
              <TabIcon icon={Target} label="The Grind" active={activeTab === 'grind'} onClick={() => setActiveTab('grind')} />
              <TabIcon icon={Layers} label="Algorithms" active={activeTab === 'algorithms'} onClick={() => setActiveTab('algorithms')} />
              <TabIcon icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

const TabIcon = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 p-2 w-24 transition-all ${active ? 'text-orange-500 scale-105' : 'text-slate-500 hover:text-slate-300 active:scale-95'}`}>
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

// --- VIEWS ---

const GrindView = ({ currentDay, updateDay, schedule, onStart }) => {
  const isReview = schedule.type === 'Review';
  const isLearn = schedule.type === 'Learn';
  const algCount = OLL_DATA.filter(alg => schedule.chunks.includes(alg.chunk)).length;

  return (
    <div className="p-6 pt-12 flex flex-col min-h-full">
      <div className="mb-6">
        <p className="text-orange-500 font-bold uppercase tracking-widest text-xs mb-1">OLL Trainer</p>
        <h1 className="text-4xl font-black tracking-tight">The Grind</h1>
      </div>

      <GlassCard className="flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden mb-6 p-8">
        <div className={`absolute -top-20 -right-20 w-64 h-64 blur-3xl opacity-20 rounded-full pointer-events-none transition-colors duration-1000
          ${isLearn ? 'bg-blue-500' : isReview ? 'bg-purple-500' : 'bg-orange-500'}`} 
        />
        
        <div className="flex items-center justify-between w-full mb-8 z-10">
          <button onClick={() => updateDay(currentDay - 1)} disabled={currentDay === 1} className="p-3 bg-white/5 rounded-full disabled:opacity-30 active:scale-90 transition-transform">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col items-center">
             <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Focus</div>
             <h2 className="text-5xl font-black text-white tracking-tighter">Day {currentDay}</h2>
          </div>
          <button onClick={() => updateDay(currentDay + 1)} disabled={currentDay === 31} className="p-3 bg-white/5 rounded-full disabled:opacity-30 active:scale-90 transition-transform">
            <ChevronRight size={24} />
          </button>
        </div>
        
        <div className={`z-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-6 font-bold text-sm border
          ${isLearn ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : isReview ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
          {isLearn ? <BookOpenCheck size={18}/> : isReview ? <Eye size={18}/> : <Dumbbell size={18}/>}
          {schedule.type} Mode • {algCount} Cases
        </div>

        <p className="z-10 text-slate-300 text-lg leading-relaxed mb-8">
          {isLearn && "Time to learn a new set of patterns. Memorize the triggers and execution."}
          {schedule.type === 'Practice' && "Drill the cases you've learned. Focus on recall speed and execution fluidity."}
          {isReview && "Massive review! Test your cumulative knowledge of everything learned so far."}
        </p>

        <Button onClick={onStart} className="z-10 mt-auto">
          Start Session
          <ChevronRight size={20} />
        </Button>
      </GlassCard>

      <div className="flex items-center justify-between bg-slate-900 border border-white/5 p-5 rounded-[2rem]">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400">31-Day Challenge</div>
          <div className="text-xl font-bold text-white mt-1">{Math.round((currentDay / 31) * 100)}% Complete</div>
        </div>
        <div className="w-14 h-14 relative">
          <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 36 36">
            <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
            <path className="text-orange-500" strokeDasharray={`${(currentDay/31)*100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

const AlgorithmsView = () => {
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Group the algorithms
  const groups = useMemo(() => {
    const map = new Map();
    OLL_DATA.forEach(alg => {
      if (!map.has(alg.group)) map.set(alg.group, []);
      map.get(alg.group).push(alg);
    });
    return Array.from(map.entries());
  }, []);

  if (selectedGroup) {
    const algs = groups.find(g => g[0] === selectedGroup)[1];
    return (
      <div className="p-6 pt-12 flex flex-col h-full animate-in fade-in slide-in-from-right-4">
        <button 
          onClick={() => setSelectedGroup(null)} 
          className="mb-6 flex items-center gap-2 text-orange-500 font-bold active:scale-95 transition-transform px-5 py-2.5 bg-orange-500/10 rounded-full border border-orange-500/20 w-max"
        >
          <ChevronLeft size={20} /> Back to Groups
        </button>
        
        <h2 className="text-3xl font-black mb-6 tracking-tight text-white">{selectedGroup}</h2>
        
        <div className="flex flex-col gap-4 pb-12">
          {algs.map(alg => (
            <GlassCard key={alg.id} className="flex flex-col p-5 !rounded-[1.5rem]">
               <div className="flex items-center gap-5">
                 <div className="bg-slate-200 rounded-[1rem] p-2 flex-shrink-0 w-20 h-20 flex items-center justify-center shadow-inner">
                   <img src={getImageUrl(alg.alg)} alt={alg.name} className="w-full h-full object-contain" />
                 </div>
                 <div className="flex flex-col flex-1">
                    <h3 className="text-xl font-black text-white pr-2 mb-1">{alg.name}</h3>
                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Case #{alg.id}</span>
                 </div>
               </div>
               <div className="mt-4 bg-slate-950/80 rounded-xl p-4 border border-white/5 shadow-inner text-center">
                  <span className="text-orange-400 font-mono text-lg font-bold tracking-wider">{alg.alg}</span>
               </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-12 flex flex-col h-full animate-in fade-in">
      <h1 className="text-4xl font-black mb-8 tracking-tight">Algorithms</h1>
      
      <div className="grid grid-cols-2 gap-5 pb-12">
        {groups.map(([name, algs]) => (
          <GlassCard key={name} onClick={() => setSelectedGroup(name)} className="flex flex-col items-center justify-center p-6 aspect-square text-center">
             <div className="bg-slate-200 rounded-[1.25rem] p-2 w-20 h-20 mb-4 shadow-inner">
                 <img src={getImageUrl(algs[0].alg)} alt={name} className="w-full h-full object-contain" />
             </div>
             <span className="font-black text-slate-100 text-lg leading-tight mb-1">{name}</span>
             <span className="text-xs text-orange-400 font-bold uppercase tracking-widest">{algs.length} Cases</span>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

const SettingsView = () => (
  <div className="p-6 pt-12 flex flex-col items-center justify-center h-full text-center">
    <h1 className="text-4xl font-black mb-4">Settings</h1>
    <p className="text-slate-400">Settings and progress resets will be available in a future update.</p>
  </div>
);

// --- SESSION SCREENS ---

const LearnSession = ({ algs, onClose, onComplete }) => {
  const [index, setIndex] = useState(0);
  const currentAlg = algs[index];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col backdrop-blur-3xl p-6 pt-12 animate-in slide-in-from-bottom-full">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors active:scale-90">
          <X size={24} />
        </button>
        <div className="font-bold text-sm tracking-widest uppercase text-slate-500">
          {index + 1} / {algs.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-12 w-full">
        <div className="text-center mb-8">
          <span className="text-orange-500 font-bold uppercase tracking-widest text-xs px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20">{currentAlg.group}</span>
          <h2 className="text-4xl font-black mt-4 tracking-tight">{currentAlg.name}</h2>
        </div>

        <div className="bg-slate-900 border border-white/5 w-full max-w-sm rounded-[2.5rem] p-8 flex flex-col items-center shadow-2xl mb-8 relative">
           {/* Soft white background to ensure black outlines are visible */}
           <div className="w-48 h-48 bg-slate-200 rounded-3xl mb-8 flex items-center justify-center p-3 shadow-inner">
              <img src={getImageUrl(currentAlg.alg)} alt="Cube state" className="w-full h-full drop-shadow-md" />
           </div>
           
           <div className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 text-center shadow-inner">
             <div className="font-mono text-2xl text-orange-400 font-bold tracking-wider leading-relaxed">
               {currentAlg.alg}
             </div>
           </div>
        </div>
      </div>

      <div className="mt-auto">
        {index < algs.length - 1 ? (
          <Button onClick={() => setIndex(i => i + 1)}>Learn Next Case</Button>
        ) : (
          <Button onClick={onComplete} variant="primary">Finish Learning</Button>
        )}
      </div>
    </div>
  );
};

const PracticeSession = ({ algs, mode, onClose, onComplete }) => {
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scramble, setScramble] = useState('');

  useEffect(() => {
    const shuffled = [...algs].sort(() => 0.5 - Math.random());
    setQueue(shuffled);
    if(shuffled.length > 0) setScramble(reverseAlg(shuffled[0].alg));
  }, [algs]);

  const handleNext = () => {
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setShowAnswer(false);
      setScramble(reverseAlg(queue[nextIndex].alg));
    } else {
      onComplete();
    }
  };

  if (queue.length === 0) return null;
  const currentAlg = queue[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-6 pt-12 animate-in slide-in-from-bottom-full">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onClose} className="p-3 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors active:scale-90">
          <X size={24} />
        </button>
        <div className="font-bold flex items-center gap-2 text-xs tracking-widest uppercase text-slate-500">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          {mode === 'review' ? 'Review' : 'Drill'} • {currentIndex + 1} / {queue.length}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pb-12 w-full max-w-sm mx-auto">
        
        {/* Scramble Instruction */}
        <div className="w-full bg-slate-900 border border-white/5 rounded-[2rem] p-6 mb-8 text-center shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500 opacity-50" />
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Setup Scramble</div>
          <div className="font-mono text-xl text-slate-200 tracking-wider font-bold leading-relaxed">
            {scramble}
          </div>
        </div>

        {/* Dynamic Answer Area / Pattern Image Display */}
        <div className="w-full flex flex-col items-center flex-1 justify-center min-h-[200px]">
          {showAnswer ? (
            <div className="w-full text-center animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
               <div className="bg-slate-200 rounded-3xl p-4 inline-block shadow-[0_0_40px_rgba(0,0,0,0.5)] mb-6 border-4 border-slate-800 relative">
                   <img src={getImageUrl(currentAlg.alg)} alt="Cube Pattern" className="w-40 h-40 drop-shadow-md" />
               </div>
               <h3 className="text-3xl font-black mb-4 text-white">{currentAlg.name}</h3>
               <div className="bg-slate-900 border border-white/5 py-3 px-5 rounded-2xl inline-block shadow-inner">
                 <span className="font-mono text-xl text-orange-400 font-bold tracking-wider">{currentAlg.alg}</span>
               </div>
            </div>
          ) : (
             <div className="w-full flex flex-col items-center justify-center opacity-80 h-full">
                <div className="bg-slate-800 text-orange-500 border border-white/10 text-sm font-bold px-6 py-2.5 rounded-full tracking-widest uppercase shadow-xl mb-4">
                    {currentAlg.group}
                </div>
                <p className="text-slate-400 font-medium tracking-wide">Ready to reveal...</p>
             </div>
          )}
        </div>

      </div>

      <div className="mt-auto max-w-sm mx-auto w-full pt-4">
        {!showAnswer ? (
          <Button onClick={() => setShowAnswer(true)} variant="secondary" className="text-orange-500 font-black tracking-wide border-orange-500/30 bg-orange-500/5 py-5">
            <Eye size={20} /> Reveal Case & Algorithm
          </Button>
        ) : (
          <Button onClick={handleNext} variant="primary" className="py-5 text-xl">
             {currentIndex < queue.length - 1 ? 'Next Case' : 'Complete Session'}
          </Button>
        )}
      </div>
    </div>
  );
};