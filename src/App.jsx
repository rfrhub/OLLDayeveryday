import React, { useEffect } from 'react';

// =========================================================================
// 0. DATASET (57 OLL Cases)
// =========================================================================
const OLL_DATA = [
  { id: 1, chunk: 1, ollNo: 27, name: "Sune", group: "Oriented-Edges", alg: "R U R' U R U2' R'" },
  { id: 2, chunk: 1, ollNo: 26, name: "Anti-Sune", group: "Oriented-Edges", alg: "R U2 R' U' R U' R'" },
  { id: 3, chunk: 1, ollNo: 21, name: "Cross", group: "Oriented-Edges", alg: "(R U2 R') (U' R U R') (U' R U' R')" },
  { id: 4, chunk: 1, ollNo: 24, name: "Chameleon", group: "Oriented-Edges", alg: "(r U R' U') (r' F R F')" },
  { id: 5, chunk: 1, ollNo: 25, name: "Bowtie", group: "Oriented-Edges", alg: "F' (r U R' U') r' F R" },
  { id: 6, chunk: 1, ollNo: 22, name: "Bruno", group: "Oriented-Edges", alg: "R U2' R2' U' R2 U' R2' U2' R" },
  { id: 7, chunk: 1, ollNo: 23, name: "Headlights", group: "Oriented-Edges", alg: "R2 D (R' U2 R) D' (R' U2 R')" },
  { id: 8, chunk: 2, ollNo: 45, name: "T", group: "T-Shapes", alg: "F (R U R' U') F'" },
  { id: 9, chunk: 2, ollNo: 33, name: "OLL 33 (T-Shape)", group: "T-Shapes", alg: "(R U R' U') (R' F R F')" },
  { id: 10, chunk: 2, ollNo: 6, name: "OLL 6 (Square)", group: "Squares", alg: "r U2 R' U' R U' r'" },
  { id: 11, chunk: 2, ollNo: 5, name: "OLL 5 (Square)", group: "Squares", alg: "r' U2' R U R' U r" },
  { id: 12, chunk: 2, ollNo: 28, name: "Arrow", group: "Solved Corners", alg: "(r U R' U') M (U R U' R')" },
  { id: 13, chunk: 2, ollNo: 57, name: "H", group: "Solved Corners", alg: "(R U R' U') M' (U R U' r')" },
  { id: 14, chunk: 3, ollNo: 7, name: "OLL 7 (Lightning)", group: "Lightning Bolts", alg: "r U R' U R U2' r'" },
  { id: 15, chunk: 3, ollNo: 11, name: "OLL 11 (Lightning)", group: "Lightning Bolts", alg: "r' (R2 U R' U R U2 R') U M'" },
  { id: 16, chunk: 3, ollNo: 39, name: "OLL 39 (Big Lightning)", group: "Lightning Bolts", alg: "R' F (R U R' U') F' U R" },
  { id: 17, chunk: 3, ollNo: 8, name: "OLL 8 (Lightning)", group: "Lightning Bolts", alg: "r' U' R U' R' U2 r" },
  { id: 18, chunk: 3, ollNo: 12, name: "OLL 12 (Lightning)", group: "Lightning Bolts", alg: "M' (R' U' R U' R' U2 R) U' M" },
  { id: 19, chunk: 3, ollNo: 40, name: "OLL 40 (Big Lightning)", group: "Lightning Bolts", alg: "L F' (L' U' L U) F U' L'" },
  { id: 20, chunk: 4, ollNo: 44, name: "OLL 44 (P-Shape)", group: "P-Shapes", alg: "f (R U R' U') f'" },
  { id: 21, chunk: 4, ollNo: 43, name: "OLL 43 (P-Shape)", group: "P-Shapes", alg: "f' (L' U' L U) f" },
  { id: 22, chunk: 4, ollNo: 31, name: "OLL 31 (P-Shape)", group: "P-Shapes", alg: "R' U' F (U R U' R') F' R" },
  { id: 23, chunk: 4, ollNo: 32, name: "OLL 32 (P-Shape)", group: "P-Shapes", alg: "R U B' (U' R' U) R B R'" },
  { id: 24, chunk: 4, ollNo: 46, name: "OLL 46 (C-Shape)", group: "C-Shapes", alg: "R' U' (R' F R F') U R" },
  { id: 25, chunk: 4, ollNo: 34, name: "OLL 34 (C-Shape)", group: "C-Shapes", alg: "(R U R' U') B' (R' F R F') B" },
  { id: 26, chunk: 5, ollNo: 37, name: "OLL 37 (Fish)", group: "Fishes", alg: "F (R U' R' U') (R U R' F')" },
  { id: 27, chunk: 5, ollNo: 35, name: "OLL 35 (Fish)", group: "Fishes", alg: "(R U2') (R2' F R F') (R U2' R')" },
  { id: 28, chunk: 5, ollNo: 9, name: "OLL 9 (Fish)", group: "Fishes", alg: "(R U R' U') R' F (R2 U R' U') F'" },
  { id: 29, chunk: 5, ollNo: 10, name: "OLL 10 (Fish)", group: "Fishes", alg: "(R U R' U) (R' F R F') (R U2' R')" },
  { id: 30, chunk: 5, ollNo: 36, name: "OLL 36 (W-Shape)", group: "W-Shapes", alg: "(R U R' U) (R U' R' U') (R' F R F')" },
  { id: 31, chunk: 5, ollNo: 38, name: "OLL 38 (W-Shape)", group: "W-Shapes", alg: "(R' U' R U') (R' U R U) l U' R' U x" },
  { id: 32, chunk: 6, ollNo: 48, name: "OLL 48 (L-Shape)", group: "L-Shapes", alg: "F (R U R' U') (R U R' U') F'" },
  { id: 33, chunk: 6, ollNo: 47, name: "OLL 47 (L-Shape)", group: "L-Shapes", alg: "R' U' (R' F R F') (R' F R F') U R" },
  { id: 34, chunk: 6, ollNo: 53, name: "OLL 53 (L-Shape)", group: "L-Shapes", alg: "(r' U' R U') (R' U R U') R' U2 r" },
  { id: 35, chunk: 6, ollNo: 54, name: "OLL 54 (L-Shape)", group: "L-Shapes", alg: "(r U R' U) (R U' R' U) R U2' r'" },
  { id: 36, chunk: 6, ollNo: 50, name: "OLL 50 (L-Shape)", group: "L-Shapes", alg: "r' U r2 U' r2' U' r2 U r'" },
  { id: 37, chunk: 6, ollNo: 49, name: "OLL 49 (L-Shape)", group: "L-Shapes", alg: "r U' r2' U r2 U r2' U' r" },
  { id: 38, chunk: 7, ollNo: 51, name: "OLL 51 (Line)", group: "Lines", alg: "f (R U R' U') (R U R' U') f'" },
  { id: 39, chunk: 7, ollNo: 52, name: "OLL 52 (Line)", group: "Lines", alg: "(R U R' U R U') y (R U' R') F'" },
  { id: 40, chunk: 7, ollNo: 56, name: "OLL 56 (Line)", group: "Lines", alg: "r U r' (U R U' R') (U R U' R') r U' r'" },
  { id: 41, chunk: 7, ollNo: 55, name: "OLL 55 (Line)", group: "Lines", alg: "R U2 R2 (U' R U' R') U2 F R F'" },
  { id: 42, chunk: 7, ollNo: 15, name: "OLL 15 (Knight Move)", group: "Knight Moves", alg: "(r' U' r) (R' U' R U) (r' U r)" },
  { id: 43, chunk: 7, ollNo: 13, name: "OLL 13 (Knight Move)", group: "Knight Moves", alg: "F U R U' R2' F' R U (R U' R')" },
  { id: 44, chunk: 8, ollNo: 16, name: "OLL 16 (Knight Move)", group: "Knight Moves", alg: "(r U r') (R U R' U') (r U' r')" },
  { id: 45, chunk: 8, ollNo: 14, name: "OLL 14 (Knight Move)", group: "Knight Moves", alg: "(R' F R) (U R' F' R) (F U' F')" },
  { id: 46, chunk: 8, ollNo: 41, name: "OLL 41 (Awkward)", group: "Awkward Shapes", alg: "(R U R' U R U2' R') F (R U R' U') F'" },
  { id: 47, chunk: 8, ollNo: 42, name: "OLL 42 (Awkward)", group: "Awkward Shapes", alg: "(R' U' R U' R' U2 R) F (R U R' U') F'" },
  { id: 48, chunk: 8, ollNo: 29, name: "OLL 29 (Awkward)", group: "Awkward Shapes", alg: "r2 D' (r U r') D r2 (U' r' U' r)" },
  { id: 49, chunk: 8, ollNo: 30, name: "OLL 30 (Awkward)", group: "Awkward Shapes", alg: "F U (R U2 R' U') (R U2 R' U') F'" },
  { id: 50, chunk: 9, ollNo: 1, name: "OLL 1 (Dot)", group: "Dot-cases", alg: "(R U2') (R2' F R F') U2' (R' F R F')" },
  { id: 51, chunk: 9, ollNo: 17, name: "OLL 17 (Dot)", group: "Dot-cases", alg: "(R U R' U) (R' F R F') U2' (R' F R F')" },
  { id: 52, chunk: 9, ollNo: 19, name: "OLL 19 (Dot)", group: "Dot-cases", alg: "M U (R U R' U') M' (R' F R F')" },
  { id: 53, chunk: 9, ollNo: 3, name: "OLL 3 (Dot)", group: "Dot-cases", alg: "f (R U R' U') f' U' F (R U R' U') F'" },
  { id: 54, chunk: 9, ollNo: 2, name: "OLL 2 (Dot)", group: "Dot-cases", alg: "F (R U R' U') F' f (R U R' U') f'" },
  { id: 55, chunk: 9, ollNo: 20, name: "OLL 20 (Dot)", group: "Dot-cases", alg: "M U (R U R' U') M2' (U R U' r')" },
  { id: 56, chunk: 9, ollNo: 18, name: "OLL 18 (Dot)", group: "Dot-cases", alg: "(r U R' U R U2 r') (r' U' R U' R' U2 r)" },
  { id: 57, chunk: 9, ollNo: 4, name: "OLL 4 (Dot)", group: "Dot-cases", alg: "f (R U R' U') f' U F (R U R' U') F'" }
];

export default function App() {

  // We scope the core UI controller variables identically to the original spec
  let appBooted = false;
  
  const $id = (id) => document.getElementById(id);

  const safeStorage = {
    get(key, fallback) {
      if (typeof window === 'undefined') return fallback;
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, val) {
      if (typeof window === 'undefined') return;
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
  };

  const STORAGE_KEY = 'ollday_users_v2';
  
  const defaultUsers = {
    "1678": { pin: "1678", name: "Me", role: "admin", day: 1, stats: {}, targetGoal: 2.50, timerEnabled: true, fingertricksEnabled: true, chunkSize: 7, customChunks: [], hasSeenOnboarding: false },
    "8995": { pin: "8995", name: "Dad", role: "user", day: 1, stats: {}, targetGoal: 4.00, timerEnabled: true, fingertricksEnabled: true, chunkSize: 5, customChunks: [], hasSeenOnboarding: false },
    "0713": { pin: "0713", name: "Ephraim", role: "user", day: 1, stats: {}, targetGoal: 3.50, timerEnabled: true, fingertricksEnabled: true, chunkSize: 5, customChunks: [], hasSeenOnboarding: false },
    "0494": { pin: "0494", name: "Victor", role: "user", day: 1, stats: {}, targetGoal: 3.50, timerEnabled: true, fingertricksEnabled: true, chunkSize: 3, customChunks: [], hasSeenOnboarding: false }
  };

  let users = safeStorage.get(STORAGE_KEY, defaultUsers);
  let currentUser = users["1678"]; 
  let currentPinInput = "";

  async function syncToCloud() {
    if(!$id('cloudStatusLabel')) return;
    $id('cloudStatusLabel').innerText = 'Syncing...';
    $id('cloudStatusDot').classList.replace('bg-green-500', 'bg-amber-400');
    $id('cloudStatusDot').classList.add('animate-pulse');
    setTimeout(() => {
      if($id('cloudStatusLabel')) $id('cloudStatusLabel').innerText = 'Synced';
      if($id('cloudStatusDot')) {
        $id('cloudStatusDot').classList.replace('bg-amber-400', 'bg-green-500');
        $id('cloudStatusDot').classList.remove('animate-pulse');
      }
    }, 600);
  }

  function persistState() {
    safeStorage.set(STORAGE_KEY, users);
    syncToCloud();
  }

  function applyUserUI() {
    if($id('headerUserName')) $id('headerUserName').innerText = currentUser.name;
    if($id('ollDayHeader')) $id('ollDayHeader').innerText = `Day ${currentUser.day || 1}`;
    if($id('targetGoalDisplay')) $id('targetGoalDisplay').innerText = (currentUser.targetGoal).toFixed(2) + 's';
    if($id('statGoalDisplay')) $id('statGoalDisplay').innerText = (currentUser.targetGoal).toFixed(2) + 's';
    renderCrossDiagram(); 
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      if (index < currentPinInput.length) {
        dot.classList.replace('border-white/20', 'bg-orange-500');
        dot.classList.replace('border-2', 'border-0');
      } else {
        dot.classList.replace('bg-orange-500', 'border-white/20');
        dot.classList.add('border-2');
        dot.classList.remove('border-0');
      }
    });
  }

  function pressProfileKey(num) {
    if (currentPinInput.length < 4) currentPinInput += num;
    updatePinDots();
    if (currentPinInput.length === 4) validatePin();
  }

  function deleteProfileKey() {
    currentPinInput = currentPinInput.slice(0, -1);
    updatePinDots();
    $id('profilePinError').classList.add('hidden');
  }

  function validatePin() {
    if (users[currentPinInput]) {
      currentUser = users[currentPinInput];
      applyUserUI();
      currentPinInput = "";
      updatePinDots();
      $id('profilePinError').classList.add('hidden');
      closeProfileSwitchModal();
      emitBeep(800, 'sine', 0.1);
    } else {
      $id('profilePinError').classList.remove('hidden');
      emitBeep(200, 'square', 0.1);
      setTimeout(() => { currentPinInput = ""; updatePinDots(); }, 800);
    }
  }

  let audioCtx = null;
  let isAudioEnabled = true;

  function emitBeep(freq = 540, type = 'sine', duration = 0.08, vol = 0.18) {
    if (!isAudioEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  function toggleAudio() {
    isAudioEnabled = !isAudioEnabled;
    const el = $id('audioToggleText');
    if (isAudioEnabled) {
      el.innerText = 'ON';
      el.className = 'text-green-400 font-mono font-bold text-sm';
      emitBeep(800, 'sine', 0.1);
    } else {
      el.innerText = 'OFF';
      el.className = 'text-slate-500 font-mono font-bold text-sm';
    }
  }

  function adjustTargetGoal(delta) {
    currentUser.targetGoal = Math.max(0.5, currentUser.targetGoal + delta);
    persistState();
    applyUserUI();
    emitBeep(600, 'triangle', 0.05);
  }

  let diagramView = 'scrambled';
  function setDiagramView(view) {
    diagramView = view;
    if (view === 'scrambled') {
      $id('btnViewScrambled').className = "px-2 py-1 text-[9px] font-black rounded bg-orange-500 text-slate-950 transition-all";
      $id('btnViewSolved').className = "px-2 py-1 text-[9px] font-black rounded text-slate-400 hover:text-white transition-all";
    } else {
      $id('btnViewSolved').className = "px-2 py-1 text-[9px] font-black rounded bg-orange-500 text-slate-950 transition-all";
      $id('btnViewScrambled').className = "px-2 py-1 text-[9px] font-black rounded text-slate-400 hover:text-white transition-all";
    }
    renderCrossDiagram();
    emitBeep();
  }

  function renderCrossDiagram() {
    const container = $id('crossDiagramContainer');
    if (!container) return;
    
    const isSolved = (diagramView === 'solved');
    const cW = '#f8fafc', cG = '#22c55e', cB = '#3b82f6', cR = '#ef4444', cO = '#f97316', cDark = '#090a14';

    const fEdge = isSolved ? { dFill: cW, outFill: cG } : { dFill: cW, outFill: cG };
    const bEdge = isSolved ? { dFill: cW, outFill: cB } : { dFill: cB, outFill: '#ffffff' }; 
    const lEdge = isSolved ? { dFill: cW, outFill: cR } : { dFill: cR, outFill: '#ffffff' }; 
    const rEdge = isSolved ? { dFill: cW, outFill: cO } : { dFill: cW, outFill: cO }; 

    container.innerHTML = `
      <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-xl">
        <rect x="40" y="40" width="20" height="20" rx="3" fill="${cW}" stroke="${cDark}" stroke-width="1.5" />
        <rect x="40" y="18" width="20" height="20" rx="3" fill="${bEdge.dFill}" stroke="${cDark}" stroke-width="1.5" />
        <rect x="42" y="10" width="16" height="6" rx="2" fill="${bEdge.outFill}" stroke="${cDark}" stroke-width="1" />
        <rect x="40" y="62" width="20" height="20" rx="3" fill="${fEdge.dFill}" stroke="${cDark}" stroke-width="1.5" />
        <rect x="42" y="84" width="16" height="6" rx="2" fill="${fEdge.outFill}" stroke="${cDark}" stroke-width="1" />
        <rect x="18" y="40" width="20" height="20" rx="3" fill="${lEdge.dFill}" stroke="${cDark}" stroke-width="1.5" />
        <rect x="10" y="42" width="6" height="16" rx="2" fill="${lEdge.outFill}" stroke="${cDark}" stroke-width="1" />
        <rect x="62" y="40" width="20" height="20" rx="3" fill="${rEdge.dFill}" stroke="${cDark}" stroke-width="1.5" />
        <rect x="84" y="42" width="6" height="16" rx="2" fill="${rEdge.outFill}" stroke="${cDark}" stroke-width="1" />
      </svg>
    `;
  }

  let currentPhase = 'oll';
  let currentOLLTab = 'settings';
  let currentCrossTab = 'ladder';

  function renderBottomNav() {
    const nav = $id('bottomNavBar');
    if(!nav) return;
    nav.className = "w-full flex-shrink-0 bg-[#090e1c] border-t border-white/10 pt-2.5 pb-6 px-4 z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]";

    if (currentPhase === 'oll') {
      const tabs = [
        { id: 'grind', label: 'Grind', svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
        { id: 'algorithms', label: 'Algorithms', svg: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>' },
        { id: 'stats', label: 'Stats', svg: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>' },
        { id: 'settings', label: 'Settings', svg: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>' }
      ];

      let html = '<div class="flex items-center justify-between w-full max-w-[360px] mx-auto">';
      tabs.forEach(tab => {
        const isActive = currentOLLTab === tab.id;
        const btnClass = isActive ? "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-orange-500 scale-105" : "flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all text-slate-400 hover:text-slate-200 active:scale-95";
        const iconWrapperClass = isActive ? "p-2 rounded-xl bg-orange-500/15" : "p-2 rounded-xl bg-transparent";
        const strokeWidth = isActive ? "2.5" : "2";
        const labelClass = isActive ? "text-[10px] font-black uppercase tracking-wider text-orange-500" : "text-[10px] font-black uppercase tracking-wider text-slate-400";
        html += `<button onclick="window.switchOLLTab('${tab.id}')" class="${btnClass}"><div class="${iconWrapperClass}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${tab.svg}</svg></div><span class="${labelClass}">${tab.label}</span></button>`;
      });
      nav.innerHTML = html + '</div>';
    } else if (currentPhase === 'cross') {
       nav.innerHTML = `<div class="flex items-center justify-around w-full max-w-[360px] mx-auto"><button onclick="window.switchCrossTab('ladder')" class="text-[10px] font-black uppercase tracking-wider ${currentCrossTab==='ladder'?'text-orange-500':'text-slate-400 hover:text-slate-200'}">Ladder</button><button onclick="window.switchCrossTab('blind')" class="text-[10px] font-black uppercase tracking-wider ${currentCrossTab==='blind'?'text-orange-500':'text-slate-400 hover:text-slate-200'}">Blind</button></div>`;
    }
  }

  function toggleCFOPDropdown(e) { 
    if (e) e.preventDefault();
    $id('cfopDropdownMenu').classList.toggle('hidden'); 
    emitBeep(400);
  }

  function selectPhaseFromDropdown(phase) {
    $id('cfopDropdownMenu').classList.add('hidden');
    currentPhase = phase;
    $id('phasePillLetter').innerText = phase.toUpperCase();
    
    const titles = { 'cross': 'Phase 1 • Cross', 'f2l': 'Phase 2 • F2L', 'oll': 'Phase 3 • OLL', 'pll': 'Phase 4 • PLL' };
    $id('headerSubtitleText').innerText = titles[phase] || titles['oll'];

    ['Cross', 'F2L', 'OLL'].forEach(p => {
       if($id('phaseContainer' + p)) $id('phaseContainer' + p).className = 'phase-view phase-right flex flex-col';
    });

    if (phase === 'cross') {
      if($id('phaseContainerCross')) $id('phaseContainerCross').className = 'phase-view phase-active flex flex-col';
    } else if (phase === 'f2l') {
      if($id('phaseContainerF2L')) $id('phaseContainerF2L').className = 'phase-view phase-active flex flex-col';
    } else if (phase === 'oll') {
      if($id('phaseContainerOLL')) $id('phaseContainerOLL').className = 'phase-view phase-active flex flex-col';
    }
    
    emitBeep(600, 'sine', 0.1);
    renderBottomNav();
  }

  function switchOLLTab(tabId) {
    currentOLLTab = tabId;
    emitBeep(450);
    ['tabContentOLLGrind', 'tabContentOLLAlgorithms', 'tabContentOLLStats', 'tabContentOLLSettings'].forEach(t => {
      if ($id(t)) $id(t).classList.add('hidden');
    });
    if ($id('tabContentOLL' + tabId.charAt(0).toUpperCase() + tabId.slice(1))) {
      $id('tabContentOLL' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.remove('hidden');
    }
    renderBottomNav();
  }

  function switchCrossTab(tabId) {
    currentCrossTab = tabId;
    emitBeep(450);
    ['tabContentLadder', 'tabContentBlind', 'tabContentMechanics', 'tabContentCrossSettings'].forEach(t => {
      if ($id(t)) $id(t).classList.add('hidden');
    });
    if ($id('tabContent' + tabId.charAt(0).toUpperCase() + tabId.slice(1))) {
      $id('tabContent' + tabId.charAt(0).toUpperCase() + tabId.slice(1)).classList.remove('hidden');
    }
    renderBottomNav();
  }

  // Bind global functions to window so inline strings work inside renderBottomNav
  if (typeof window !== 'undefined') {
    window.switchOLLTab = switchOLLTab;
    window.switchCrossTab = switchCrossTab;
  }

  let userMoves = 2;
  function setLadderMode(mode) {
    emitBeep();
    if (mode === 'efficiency') {
      $id('btnLadderModeEfficiency').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-orange-500 text-slate-950 shadow-md cursor-pointer transition-all";
      $id('btnLadderModeBlind').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all";
      $id('ladderEfficiencyPanel').classList.remove('hidden');
      $id('ladderBlindPanel').classList.add('hidden');
    } else {
      $id('btnLadderModeBlind').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-orange-500 text-slate-950 shadow-md cursor-pointer transition-all";
      $id('btnLadderModeEfficiency').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all";
      $id('ladderBlindPanel').classList.remove('hidden');
      $id('ladderEfficiencyPanel').classList.add('hidden');
    }
  }

  function adjustUserMoves(delta) {
    userMoves = Math.max(1, Math.min(20, userMoves + delta));
    $id('userMovesCount').innerText = userMoves;
    emitBeep(800, 'triangle', 0.05);
  }

  function nextScrambleInTier() {
    emitBeep(400);
    const mockScrambles = ["U L2", "F2 D'", "R' D2 R", "L D' L'"];
    $id('crossScrambleDisplay').innerText = mockScrambles[Math.floor(Math.random() * mockScrambles.length)];
  }

  function setCrossTier(tier) {
     emitBeep(500);
     const buttons = $id('crossTierSelector').querySelectorAll('button');
     buttons.forEach(b => b.className = "py-2 text-[10px] font-black rounded-xl bg-white/5 text-slate-400 hover:text-white");
     buttons[tier-1].className = "py-2 text-[10px] font-black rounded-xl bg-orange-500 text-slate-950 shadow-md";
     $id('crossTierBadge').innerText = `Level ${tier} • Cross in ${tier + 1}`;
     userMoves = tier + 1;
     $id('userMovesCount').innerText = userMoves;
     nextScrambleInTier();
  }

  let wcaTimer = null;
  let inspectionTime = 15;
  let blindState = 'idle';
  let padHoldTimer = null;

  function startWCAInspection() {
    if (blindState !== 'idle') return;
    emitBeep(800, 'sine', 0.1);
    $id('btnStartInspection').classList.add('hidden');
    $id('speedstackArea').classList.remove('pointer-events-none', 'opacity-50');
    $id('wcaTimerStatus').innerText = "Inspecting (Hold pads/space to arm)";
    $id('wcaTimerStatus').className = "text-xs font-bold text-amber-400";
    
    inspectionTime = 15;
    blindState = 'inspecting';
    $id('wcaTimerDisplay').innerText = inspectionTime.toFixed(1);

    wcaTimer = setInterval(() => {
      inspectionTime -= 0.1;
      if (inspectionTime <= 0) {
        clearInterval(wcaTimer);
        $id('wcaTimerDisplay').innerText = "0.0";
        emitBeep(200, 'sawtooth', 0.5); 
        $id('wcaTimerStatus').innerText = "DNF (+15s exceeded)";
        $id('wcaTimerStatus').className = "text-xs font-bold text-red-500";
        resetBlindTrainer();
      } else {
        $id('wcaTimerDisplay').innerText = inspectionTime.toFixed(1);
        if (Math.abs(inspectionTime - 8.0) < 0.05) emitBeep(440, 'sine', 0.2);
        if (Math.abs(inspectionTime - 3.0) < 0.05) emitBeep(440, 'sine', 0.2);
      }
    }, 100);
  }

  function resetBlindTrainer() {
    blindState = 'idle';
    clearInterval(wcaTimer);
    clearTimeout(padHoldTimer);
    $id('padLeft').className = "flex-1 h-24 rounded-2xl border-2 border-white/10 bg-white/5 flex items-center justify-center transition-colors";
    $id('padRight').className = "flex-1 h-24 rounded-2xl border-2 border-white/10 bg-white/5 flex items-center justify-center transition-colors";
    $id('btnStartInspection').classList.remove('hidden');
    $id('speedstackArea').classList.add('pointer-events-none', 'opacity-50');
  }

  function handleVisorClick() {
    if (blindState === 'active') {
      $id('blindfoldVisorOverlay').classList.add('hidden');
      $id('blindResultPanel').classList.remove('hidden');
      $id('wcaTimerStatus').innerText = `Finished (Inspection: ${(15 - inspectionTime).toFixed(2)}s)`;
      $id('wcaTimerStatus').className = "text-xs font-bold text-green-400";
    }
  }

  function logBlindResult() {
    emitBeep(500, 'sine', 0.1);
    $id('wcaTimerDisplay').innerText = "15.0";
    $id('wcaTimerStatus').innerText = "Ready to inspect";
    $id('wcaTimerStatus').className = "text-xs font-bold text-orange-400";
    $id('blindResultPanel').classList.add('hidden');
    resetBlindTrainer();
  }

  function changeOLLDay(delta) {
    let d = (currentUser.day || 1) + delta;
    currentUser.day = Math.max(1, Math.min(32, d));
    persistState();
    applyUserUI();
    emitBeep(700, 'square', 0.05);
  }

  function startActiveOLLSession() {
    emitBeep(900, 'sine', 0.1);
    $id('ollSessionModal').classList.remove('hidden');
  }

  function setOLLLibraryMode(mode) {
    emitBeep();
    if (mode === 'standard') {
      $id('btnLibStandard').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-orange-500 text-slate-950 shadow-md cursor-pointer transition-all";
      $id('btnLibCustom').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all";
    } else {
      $id('btnLibCustom').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-orange-500 text-slate-950 shadow-md cursor-pointer transition-all";
      $id('btnLibStandard').className = "flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all";
    }
  }

  let currentSettingsCard = 1;
  function nextSettingsCard() {
    emitBeep(600);
    if (currentSettingsCard >= 3) {
      currentSettingsCard = 1;
      $id(`settingsCard1`).className = `deck-card deck-card-1 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between`;
      $id(`settingsCard2`).className = `deck-card deck-card-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between`;
      $id(`settingsCard3`).className = `deck-card deck-card-3 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between`;
      return;
    }
    
    const activeCard = $id(`settingsCard${currentSettingsCard}`);
    const nextCard = $id(`settingsCard${currentSettingsCard + 1}`);
    const thirdCard = $id(`settingsCard${currentSettingsCard + 2}`);

    activeCard.className = `deck-card deck-card-hidden bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between`;
    if(nextCard) nextCard.className = `deck-card deck-card-1 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between`;
    if(thirdCard) thirdCard.className = `deck-card deck-card-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between`;
    
    currentSettingsCard++;
  }

  function executeGranularReset(type) {
    if (type === 'schedule' || type === 'both') { currentUser.day = 1; }
    if (type === 'stats' || type === 'both') { currentUser.stats = {}; }
    persistState();
    applyUserUI();
    closeResetModal();
    emitBeep(1200, 'triangle', 0.15);
  }

  function openProfileSwitchModal() { $id('profileSwitchModal').classList.remove('hidden'); currentPinInput = ""; updatePinDots(); }
  function closeProfileSwitchModal() { $id('profileSwitchModal').classList.add('hidden'); }
  function openCurriculumModal() { $id('curriculumBuilderModal').classList.remove('hidden'); }
  function closeCurriculumModal() { $id('curriculumBuilderModal').classList.add('hidden'); }
  function closeOLLSessionModal() { $id('ollSessionModal').classList.add('hidden'); }
  function closeIsolatedDrillModal() { $id('isolatedDrillModal').classList.add('hidden'); }
  function openResetModal() { $id('resetProgressModal').classList.remove('hidden'); }
  function closeResetModal() { $id('resetProgressModal').classList.add('hidden'); }
  function closeCompassModal() { $id('colorOrbitModal').classList.add('hidden'); }

  useEffect(() => {
    // Click outside listener for dropdown
    const handleOutsideClick = (e) => {
      const btn = $id('cfopDropdownContainer');
      const menu = $id('cfopDropdownMenu');
      if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
      }
    };
    document.addEventListener('click', handleOutsideClick);

    // Boot up
    setTimeout(() => {
      appBooted = true;
      applyUserUI();
      syncToCloud();
      switchOLLTab('settings');
      renderBottomNav();
    }, 500);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <>
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
          background-color: #060913 !important;
          color-scheme: dark;
          -webkit-tap-highlight-color: transparent;
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .phase-view {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s ease;
          will-change: transform, opacity;
        }
        .phase-active {
          transform: translateX(0%);
          opacity: 1;
          pointer-events: auto;
          z-index: 20;
        }
        .phase-left {
          transform: translateX(-100%);
          opacity: 0;
          pointer-events: none;
          z-index: 10;
        }
        .phase-right {
          transform: translateX(100%);
          opacity: 0;
          pointer-events: none;
          z-index: 10;
        }

        @keyframes pulse-visor {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.04); opacity: 1; }
        }
        .animate-pulse-visor {
          animation: pulse-visor 2.6s infinite ease-in-out;
        }

        .pad-active {
          background-color: rgba(34, 197, 94, 0.2) !important;
          border-color: rgba(34, 197, 94, 0.5) !important;
          color: #4ade80 !important;
        }

        .deck-card {
          position: absolute;
          width: 100%;
          height: 100%;
          transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .deck-card-1 { transform: translateY(0) scale(1); z-index: 30; opacity: 1; pointer-events: auto; }
        .deck-card-2 { transform: translateY(24px) scale(0.95); z-index: 20; opacity: 0.55; pointer-events: none; }
        .deck-card-3 { transform: translateY(48px) scale(0.90); z-index: 10; opacity: 0.25; pointer-events: none; }
        .deck-card-hidden { transform: translateY(-100%) opacity: 0; z-index: 0; pointer-events: none; }
      `}</style>

      <div className="bg-[#060913] text-slate-100 font-sans selection:bg-orange-500/30 flex justify-center select-none overscroll-none min-h-screen">
        
        {/* Ambient Background Lighting */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[42vh] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none z-0"></div>
        <div className="fixed bottom-0 right-0 w-3/4 h-[38vh] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none z-0"></div>

        {/* Global Self-Healing Guardrail Banner */}
        <div id="globalErrorBanner" className="hidden fixed top-3 left-1/2 -translate-x-1/2 z-[500] max-w-sm w-[92%] bg-red-950/95 border border-red-500/50 text-red-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl text-xs flex items-center justify-between gap-3">
          <span id="globalErrorText" className="font-medium leading-snug">Recovered from a minor state issue.</span>
          <button onClick={dismissGlobalError} className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-200 font-bold uppercase tracking-wider text-[10px] cursor-pointer">Dismiss</button>
        </div>

        {/* Main iPhone Application Viewport Shell */}
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative z-10 shadow-2xl bg-[#090e1c] border-x border-white/5 overflow-hidden">

          {/* SHARED PERSISTENT HEADER */}
          <header className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5 bg-[#090e1c]/90 backdrop-blur-xl flex-shrink-0 z-40">
            <div className="flex items-center gap-2.5 min-w-0">
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
                  <span id="headerSubtitleText" className="text-[10px] text-orange-400 font-bold truncate">Phase 3 • OLL</span>
                  <span className="text-slate-600 text-[10px]">•</span>
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                    <span id="cloudStatusDot" className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span id="cloudStatusLabel" className="text-slate-400">Syncing</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 relative">
              <button onClick={openProfileSwitchModal} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 active:scale-95 transition-all cursor-pointer">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                <span id="headerUserName" className="max-w-[64px] truncate">Me</span>
              </button>
              <div className="relative" id="cfopDropdownContainer">
                <button id="phasePillBtn" onClick={toggleCFOPDropdown} onPointerDown={toggleCFOPDropdown} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/35 text-orange-400 text-xs font-black tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm">
                  <span id="phasePillLetter">O</span>
                  <svg className="w-3 h-3 opacity-80 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                <div id="cfopDropdownMenu" className="hidden absolute right-0 mt-2 w-14 bg-[#0c1326] border border-white/15 rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 backdrop-blur-2xl">
                  <button onClick={() => selectPhaseFromDropdown('cross')} className="w-full py-2 rounded-xl text-xs font-black text-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer transition-all">C</button>
                  <button onClick={() => selectPhaseFromDropdown('f2l')} className="w-full py-2 rounded-xl text-xs font-black text-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer transition-all">F</button>
                  <button onClick={() => selectPhaseFromDropdown('oll')} className="w-full py-2 rounded-xl text-xs font-black text-center bg-orange-500 text-slate-950 cursor-pointer transition-all">O</button>
                  <button onClick={() => selectPhaseFromDropdown('pll')} className="w-full py-2 rounded-xl text-xs font-black text-center text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer transition-all">P</button>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 relative overflow-hidden">
            {/* CROSS */}
            <div id="phaseContainerCross" className="phase-view phase-left flex flex-col">
              <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
                <div id="tabContentLadder" className="p-5 pb-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">CFOP Phase 1</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Cross in X Ladder</h2>
                    </div>
                  </div>
                  <div id="crossTierSelector" className="grid grid-cols-5 gap-1.5">
                     <button onClick={() => setCrossTier(1)} className="py-2 text-[10px] font-black rounded-xl bg-orange-500 text-slate-950 shadow-md">1</button>
                     <button onClick={() => setCrossTier(2)} className="py-2 text-[10px] font-black rounded-xl bg-white/5 text-slate-400 hover:text-white">2</button>
                     <button onClick={() => setCrossTier(3)} className="py-2 text-[10px] font-black rounded-xl bg-white/5 text-slate-400 hover:text-white">3</button>
                     <button onClick={() => setCrossTier(4)} className="py-2 text-[10px] font-black rounded-xl bg-white/5 text-slate-400 hover:text-white">4</button>
                     <button onClick={() => setCrossTier(5)} className="py-2 text-[10px] font-black rounded-xl bg-white/5 text-slate-400 hover:text-white">5</button>
                  </div>
                  <div className="bg-slate-950/90 p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
                    <button id="btnLadderModeEfficiency" onClick={() => setLadderMode('efficiency')} className="flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-orange-500 text-slate-950 shadow-md cursor-pointer transition-all">Move Efficiency</button>
                    <button id="btnLadderModeBlind" onClick={() => setLadderMode('blind')} className="flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all">Blindfold Run</button>
                  </div>
                  <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span id="crossTierBadge" className="text-[10px] font-black uppercase tracking-widest text-orange-400">Level 1 • Cross in 2</span>
                        <h3 id="crossTierTitle" className="text-base font-black text-white">The Free Drop</h3>
                      </div>
                      <button onClick={nextScrambleInTier} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-orange-400 active:scale-95 cursor-pointer">
                        New Scramble
                      </button>
                    </div>
                    <div className="bg-[#050811] border border-white/10 rounded-2xl p-3 text-center shadow-inner">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Hold White (D) • Green (F) • Red (L) • Orange (R)</span>
                      <div id="crossScrambleDisplay" className="font-mono text-lg font-black text-amber-300 tracking-wider select-all">U L2</div>
                    </div>
                    <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[140px] shadow-inner space-y-3">
                      <div className="flex w-full items-center justify-between px-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">D-Face Cross Map</span>
                        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-white/5">
                          <button id="btnViewScrambled" onClick={() => setDiagramView('scrambled')} className="px-2 py-1 text-[9px] font-black rounded bg-orange-500 text-slate-950">Scramble</button>
                          <button id="btnViewSolved" onClick={() => setDiagramView('solved')} className="px-2 py-1 text-[9px] font-black rounded text-slate-400 hover:text-white">Target</button>
                        </div>
                      </div>
                      <div id="crossDiagramContainer" className="w-32 h-32 flex items-center justify-center relative"></div>
                      <div id="pieceChecklistContainer" className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-white/5">
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> WB: UF (Flipped)</div>
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> WO: DR (Solved)</div>
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> WG: LB</div>
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> WR: U (Flipped)</div>
                      </div>
                    </div>
                  </div>
                  <div id="ladderBlindPanel" className="hidden bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-5 shadow-xl text-center space-y-3">
                    <h4 className="text-base font-black text-white">Blindfold Execution Ready</h4>
                    <button onClick={() => switchCrossTab('blind')} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 border border-orange-400/30 active:scale-95 cursor-pointer mt-2">Open Blindfold Timer Mat</button>
                  </div>
                </div>
                <div id="tabContentBlind" className="hidden p-5 pb-10 space-y-4">
                   <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Sub-15 Execution Protocol</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Blind Inspection</h2>
                    </div>
                  </div>
                  <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-xl text-center flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">WCA Inspection Timer</span>
                    <div id="wcaTimerDisplay" className="font-mono text-5xl font-black text-white my-3">15.0</div>
                    <p id="wcaTimerStatus" className="text-xs font-bold text-orange-400">Ready to inspect</p>
                  </div>
                  <button id="btnStartInspection" onClick={startWCAInspection} className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-100 font-bold border border-white/10 active:scale-95 transition-all cursor-pointer">
                    Start 15s Countdown
                  </button>
                  <div id="speedstackArea" className="bg-slate-950/80 border border-white/10 rounded-[2rem] p-5 shadow-inner select-none pointer-events-none opacity-50 transition-all duration-300">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-3">Speedstack Pads / Spacebar</p>
                    <div className="flex items-center justify-between gap-3">
                      <div id="padLeft" className="flex-1 h-24 rounded-2xl border-2 border-white/10 bg-white/5 flex items-center justify-center transition-colors"><span className="text-xs font-bold text-slate-500">LEFT</span></div>
                      <div id="padRight" className="flex-1 h-24 rounded-2xl border-2 border-white/10 bg-white/5 flex items-center justify-center transition-colors"><span className="text-xs font-bold text-slate-500">RIGHT</span></div>
                    </div>
                  </div>
                  <div id="blindResultPanel" className="hidden bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-xl">
                     <span className="text-xs font-bold text-slate-300 block mb-2">Log Execution Result:</span>
                     <div className="grid grid-cols-3 gap-2">
                       <button onClick={logBlindResult} className="py-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold rounded-xl">Clean</button>
                       <button onClick={logBlindResult} className="py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl">+2</button>
                       <button onClick={logBlindResult} className="py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl">DNF</button>
                     </div>
                  </div>
                </div>
                <div id="tabContentMechanics" className="hidden p-5 pb-10 space-y-4"></div>
                <div id="tabContentCrossSettings" className="hidden p-5 h-full"></div>
              </main>
            </div>

            {/* F2L */}
            <div id="phaseContainerF2L" className="phase-view phase-left flex flex-col">
              <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative p-5">
                <h2 className="text-2xl font-black tracking-tight text-white">F2L Coming Soon</h2>
              </main>
            </div>

            {/* OLL */}
            <div id="phaseContainerOLL" className="phase-view phase-active flex flex-col">
              <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar relative">
                <div id="tabContentOLLGrind" className="p-5 pb-10 flex flex-col min-h-full justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Training Hub</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Daily Grind</h2>
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between items-center text-center relative overflow-hidden">
                    <div className="flex items-center justify-between w-full z-10">
                      <button onClick={() => changeOLLDay(-1)} className="p-2.5 bg-white/5 rounded-full border border-white/10 text-white active:scale-90 cursor-pointer"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
                      <div><h3 id="ollDayHeader" className="text-3xl font-black text-white tracking-tight">Day 1</h3></div>
                      <button onClick={() => changeOLLDay(1)} className="p-2.5 bg-white/5 rounded-full border border-white/10 text-white active:scale-90 cursor-pointer"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
                    </div>
                    <div className="z-10 space-y-2 px-1 my-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider">Learn Phase</span>
                      <h4 id="ollScheduleTitle" className="text-lg font-black text-white">Chunk 1: Standard Edges</h4>
                    </div>
                    <button onClick={startActiveOLLSession} className="z-10 w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 text-slate-950 font-black text-sm active:scale-95 cursor-pointer mt-3">Start Day 1 Session</button>
                  </div>
                </div>
                
                <div id="tabContentOLLAlgorithms" className="hidden p-5 pb-10 space-y-4">
                  <div>
                    <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Algorithm Hub</p>
                    <h2 className="text-2xl font-black tracking-tight text-white">57 OLL Cases</h2>
                  </div>
                  <div className="bg-slate-950/80 p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
                    <button id="btnLibStandard" onClick={() => setOLLLibraryMode('standard')} className="flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl bg-orange-500 text-slate-950 shadow-md cursor-pointer transition-all">Standard Library</button>
                    <button id="btnLibCustom" onClick={() => setOLLLibraryMode('custom')} className="flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl text-slate-400 hover:text-white cursor-pointer transition-all">My Custom Chunks</button>
                  </div>
                </div>

                <div id="tabContentOLLStats" className="hidden p-5 pb-10 space-y-4">
                  <div>
                    <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Performance Metrics</p>
                    <h2 className="text-2xl font-black tracking-tight text-white">Statistics</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                     <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Target</span>
                       <span id="statGoalDisplay" className="font-mono text-base font-black text-amber-300">2.50s</span>
                     </div>
                     <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Best PR</span>
                       <span className="font-mono text-base font-black text-white">--</span>
                     </div>
                     <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 text-center">
                       <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Delta</span>
                       <span id="statDeltaDisplay" className="font-mono text-base font-black text-slate-500">--</span>
                     </div>
                  </div>
                </div>

                <div id="tabContentOLLSettings" className="hidden p-5 h-full relative overflow-hidden min-h-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Control Center</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">Settings Deck</h2>
                    </div>
                  </div>
                  <div className="relative w-full h-[320px]">
                    <div id="settingsCard1" className="deck-card deck-card-1 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white mb-1">Pace & Environment</h3>
                        <div className="flex items-center justify-between mt-4 mb-3 bg-[#050811] rounded-xl p-2.5 border border-white/5">
                          <span className="text-xs font-bold text-slate-300 pl-1">Target Goal</span>
                          <div className="flex items-center gap-3">
                            <button onClick={() => adjustTargetGoal(-0.25)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black cursor-pointer">-</button>
                            <span id="targetGoalDisplay" className="text-orange-400 font-mono font-black text-sm w-12 text-center">2.50s</span>
                            <button onClick={() => adjustTargetGoal(0.25)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black cursor-pointer">+</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-3 bg-[#050811] rounded-xl p-3 border border-white/5">
                          <span className="text-xs font-bold text-slate-300">Audio Engine</span>
                          <button onClick={toggleAudio} className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer active:scale-95 transition-all">
                            <span id="audioToggleText" className="text-green-400 font-mono font-bold text-sm">ON</span>
                          </button>
                        </div>
                      </div>
                      <button onClick={nextSettingsCard} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs border border-white/10 transition-all cursor-pointer">View Notation Key ➔</button>
                    </div>

                    <div id="settingsCard2" className="deck-card deck-card-2 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white mb-1">Notation Key</h3>
                        <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-300 font-mono">
                          <div className="bg-[#050811] p-2 rounded-lg border border-white/5">R: Right Up</div>
                          <div className="bg-[#050811] p-2 rounded-lg border border-white/5">R': Right Down</div>
                          <div className="bg-[#050811] p-2 rounded-lg border border-white/5">U: Up Left</div>
                          <div className="bg-[#050811] p-2 rounded-lg border border-white/5">U': Up Right</div>
                        </div>
                      </div>
                      <button onClick={nextSettingsCard} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs border border-white/10 transition-all cursor-pointer">Profiles & Security ➔</button>
                    </div>

                    <div id="settingsCard3" className="deck-card deck-card-3 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-6 shadow-2xl flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-black text-white mb-1">Profiles & Security</h3>
                        <p className="text-xs text-slate-400 mb-4">Manage users and reset progress.</p>
                      </div>
                      <button onClick={openResetModal} className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black text-sm border border-red-500/30 active:scale-95 transition-all cursor-pointer">Reset My Progress</button>
                    </div>
                  </div>
                </div>
              </main>
            </div>

          </div>

          <nav id="bottomNavBar" className="w-full flex-shrink-0 bg-[#090e1c] border-t border-white/10 pt-2.5 pb-6 px-4 z-40 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]"></nav>
        </div>

        {/* MODALS */}
        <div id="blindfoldVisorOverlay" onClick={handleVisorClick} className="fixed inset-0 z-[300] bg-[#03050c]/98 backdrop-blur-3xl hidden flex flex-col items-center justify-center p-6 text-center cursor-pointer">
          <div className="space-y-4">
            <div className="w-24 h-24 rounded-full bg-orange-500/15 border-2 border-orange-500/40 flex items-center justify-center text-orange-400 shadow-2xl shadow-orange-500/20 animate-pulse-visor mx-auto">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">EYES CLOSED</h2>
            <p className="text-sm font-bold text-orange-400">EXECUTE!</p>
          </div>
        </div>

        <div id="profileSwitchModal" className="fixed inset-0 z-[260] bg-black/85 backdrop-blur-2xl hidden flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Family Profiles</span>
              <button onClick={closeProfileSwitchModal} className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">✕</button>
            </div>
            <h3 className="text-xl font-black text-white">Enter 4-Digit PIN</h3>
            <div className="flex justify-center gap-3 py-2" id="profilePinDots">
              <span className="pin-dot w-3.5 h-3.5 rounded-full border-2 border-white/20"></span>
              <span className="pin-dot w-3.5 h-3.5 rounded-full border-2 border-white/20"></span>
              <span className="pin-dot w-3.5 h-3.5 rounded-full border-2 border-white/20"></span>
              <span className="pin-dot w-3.5 h-3.5 rounded-full border-2 border-white/20"></span>
            </div>
            <p id="profilePinError" className="hidden text-xs font-bold text-red-400">Invalid PIN</p>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button onClick={() => pressProfileKey('1')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">1</button>
              <button onClick={() => pressProfileKey('2')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">2</button>
              <button onClick={() => pressProfileKey('3')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">3</button>
              <button onClick={() => pressProfileKey('4')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">4</button>
              <button onClick={() => pressProfileKey('5')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">5</button>
              <button onClick={() => pressProfileKey('6')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">6</button>
              <button onClick={() => pressProfileKey('7')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">7</button>
              <button onClick={() => pressProfileKey('8')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">8</button>
              <button onClick={() => pressProfileKey('9')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">9</button>
              <div></div>
              <button onClick={() => pressProfileKey('0')} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-semibold text-2xl text-white cursor-pointer active:scale-95">0</button>
              <button onClick={deleteProfileKey} className="h-16 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs text-slate-400 cursor-pointer active:scale-95">DEL</button>
            </div>
          </div>
        </div>
        
        <div id="resetProgressModal" className="fixed inset-0 z-[265] bg-black/85 backdrop-blur-xl hidden flex items-center justify-center p-5">
          <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-xl font-black text-white">Reset Options</h3>
            <div className="space-y-2">
              <button onClick={() => executeGranularReset('schedule')} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 font-bold text-xs cursor-pointer">Reset Schedule (Day 1)</button>
              <button onClick={() => executeGranularReset('stats')} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-orange-300 font-bold text-xs cursor-pointer">Reset Statistics Times</button>
              <button onClick={() => executeGranularReset('both')} className="w-full py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-black text-xs cursor-pointer">Reset Both (Full Wipe)</button>
              <button onClick={closeResetModal} className="w-full py-2.5 rounded-xl text-slate-400 font-bold text-xs cursor-pointer mt-2">Cancel</button>
            </div>
          </div>
        </div>
        
        <div id="colorOrbitModal" className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-2xl hidden p-5">
          <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 text-center"><button onClick={closeCompassModal} className="px-4 py-2 bg-white/10 text-white rounded-xl">Close</button></div>
        </div>
        <div id="curriculumBuilderModal" className="fixed inset-0 z-[255] bg-black/85 backdrop-blur-2xl hidden p-5">
          <div className="bg-slate-900 border border-white/10 rounded-[2.25rem] p-6 text-center"><button onClick={closeCurriculumModal} className="px-4 py-2 bg-white/10 text-white rounded-xl">Close</button></div>
        </div>
        <div id="ollSessionModal" className="fixed inset-0 z-[240] bg-[#070b16] hidden p-5">
          <button onClick={closeOLLSessionModal} className="px-4 py-2 bg-white/10 text-white rounded-xl">Close</button>
        </div>
        <div id="isolatedDrillModal" className="fixed inset-0 z-[245] bg-[#060913]/95 backdrop-blur-2xl hidden p-5">
          <button onClick={closeIsolatedDrillModal} className="px-4 py-2 bg-white/10 text-white rounded-xl">Close</button>
        </div>

      </div>
    </>
  );
}
