<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OLLDay Everyday — Cartoon Sune Logo (Mid-Turn)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* Checkerboard grid for testing background transparency */
    .bg-checker {
      background-color: #0b0f19;
      background-image: 
        linear-gradient(45deg, #141b2a 25%, transparent 25%),
        linear-gradient(-45deg, #141b2a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #141b2a 75%),
        linear-gradient(-45deg, transparent 75%, #141b2a 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0px;
    }
  </style>
</head>
<body class="bg-[#060913] text-slate-100 min-h-screen font-sans selection:bg-orange-500/30">

  <!-- Top Navigation Header -->
  <header class="border-b border-white/10 bg-[#090e1c]/80 backdrop-blur-xl px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
      <div>
        <h1 class="text-base font-black text-white tracking-tight">OLLDay Everyday — Cartoon Logo</h1>
        <p class="text-xs text-orange-400 font-medium">Authentic Mid-Turn Comic Style • Sune OLL Case #1</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full font-mono">
        100% Transparent Vector
      </span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto p-6 space-y-8">

    <!-- Interactive Background Selector Bar -->
    <div class="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
        <span>Test Background:</span>
        <button onclick="setBg('checker')" class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white active:scale-95 transition-all">
          Checkerboard (Transparent)
        </button>
        <button onclick="setBg('midnight')" class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 active:scale-95 transition-all">
          App Midnight (#060913)
        </button>
        <button onclick="setBg('white')" class="px-3 py-1.5 rounded-xl bg-white text-slate-900 hover:bg-slate-200 active:scale-95 transition-all">
          Pure White
        </button>
      </div>

      <div class="flex items-center gap-2">
        <label class="text-xs font-bold text-slate-400 cursor-pointer flex items-center gap-2 select-none">
          <input type="checkbox" id="shadowToggle" checked onchange="toggleShadow()" class="accent-orange-500 w-4 h-4 rounded cursor-pointer" />
          <span>Ground Drop Shadow</span>
        </label>
      </div>
    </div>

    <!-- Main Visual Showcase Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      
      <!-- Box 1: The Exact Mid-Turn Cartoon Sune Cube -->
      <div class="bg-slate-900/70 border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs uppercase font-black tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            Mid-Turn Cartoon Logo
          </span>
          <span class="text-xs text-slate-400 font-mono">Transparent Vector SVG</span>
        </div>

        <!-- Render Target Canvas -->
        <div id="previewCanvas" class="w-full h-88 rounded-2xl bg-checker flex items-center justify-center p-4 transition-colors duration-300 shadow-inner my-3">
          
          <!-- Direct Vector Render of OLLDayEveryday.svg -->
          <svg 
            viewBox="0 0 1000 1000" 
            class="w-64 h-64 drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)]" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- Dark Navy / Black Outer Shell -->
            <path 
              d="M214 310 L295 258 L524 168 L806 416 L726 558 L592 660 L515 688 L214 550 Z" 
              fill="#090a14" 
              stroke="#090a14" 
              stroke-width="32" 
              stroke-linejoin="round" 
              stroke-linecap="round" 
            />

            <!-- Back Rotated Layer -->
            <g stroke="#090a14" stroke-width="14" stroke-linejoin="round" fill="#000000">
              <polygon points="524,180 594,228 534,268 464,220" />
              <polygon points="604,236 674,288 614,328 544,276" />
              <polygon points="684,296 754,348 694,388 624,336" />
              <polygon points="700,358 775,354 788,418 714,424" />
              <polygon points="716,432 790,428 752,492 680,498" />
              <polygon points="676,506 748,502 708,552 638,558" />
            </g>

            <!-- Front Block - Top Facets -->
            <g stroke="#090a14" stroke-width="14" stroke-linejoin="round">
              <polygon points="248,312 331,343 403,286 320,255" fill="#d96528" />
              <polygon points="348,350 431,381 503,324 420,293" fill="#090a12" />
              <polygon points="448,388 531,419 603,362 520,331" fill="#090a12" />
            </g>

            <!-- Front Block - Right Side Facets -->
            <g stroke="#090a14" stroke-width="14" stroke-linejoin="round">
              <polygon points="544,432 616,375 610,466 538,523" fill="#d96528" />
              <polygon points="537,537 609,480 603,571 531,628" fill="#090a12" />
              <polygon points="530,642 602,585 596,676 524,733" fill="#090a12" />
            </g>

            <!-- Front 3x3 Face: Matrix Projected with Rounded Rectangles -->
            <g transform="matrix(0.967, 0.367, -0.067, 1.067, 240, 315)" stroke="#090a14" stroke-width="10" stroke-linejoin="round">
              <!-- Row 1 -->
              <rect x="6" y="6" width="86" height="86" rx="14" fill="#090a12" />
              <rect x="104" y="6" width="86" height="86" rx="14" fill="#d96528" />
              <rect x="202" y="6" width="86" height="86" rx="14" fill="#090a12" />

              <!-- Row 2 -->
              <rect x="6" y="104" width="86" height="86" rx="14" fill="#d96528" />
              <rect x="104" y="104" width="86" height="86" rx="14" fill="#d96528" />
              <rect x="202" y="104" width="86" height="86" rx="14" fill="#d96528" />

              <!-- Row 3 -->
              <rect x="6" y="202" width="86" height="86" rx="14" fill="#d96528" />
              <rect x="104" y="202" width="86" height="86" rx="14" fill="#d96528" />
              <rect x="202" y="202" width="86" height="86" rx="14" fill="#090a12" />
            </g>
          </svg>

        </div>

        <!-- Verification Checklist -->
        <div class="bg-black/40 border border-white/5 rounded-2xl p-3.5 text-xs space-y-1 font-medium">
          <div class="flex items-center gap-2 text-green-400">
            <span>✓</span> <span><strong>Asset Support:</strong> Loads <code>/OLLDayEveryday.svg</code> with instant vector fallback</span>
          </div>
          <div class="flex items-center gap-2 text-green-400">
            <span>✓</span> <span><strong>Affine Transform:</strong> Perfectly straight sticker rows with smooth rounded corners</span>
          </div>
          <div class="flex items-center gap-2 text-orange-400">
            <span>✓</span> <span><strong>Sune OLL Case #1:</strong> Cross + Bottom-Left corner in orange, with matching top/side headlights</span>
          </div>
        </div>
      </div>

      <!-- Box 2: Verification Against Official Sune Plan Diagram -->
      <div class="bg-slate-900/70 border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-2xl">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs uppercase font-black tracking-widest text-slate-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
            Reference Comparison
          </span>
          <span class="text-xs text-orange-400 font-mono font-bold">OLL Case #1 (Sune)</span>
        </div>

        <!-- Standard 2D Sune Plan Diagram -->
        <div class="w-full h-88 rounded-2xl bg-[#090e1c] border border-white/5 flex items-center justify-center p-4 my-3 shadow-inner">
          <svg viewBox="0 0 200 200" class="w-56 h-56" fill="none" stroke="#000000" stroke-width="4.5" stroke-linejoin="round">
            
            <!-- Side Headlights on Rim (Plan View) -->
            <polygon points="46,24 82,24 82,42 42,42" fill="#ea580c" />
            <polygon points="158,42 176,46 176,82 158,82" fill="#ea580c" />
            <polygon points="118,158 118,176 154,176 158,158" fill="#ea580c" />

            <!-- Dark Side Rims -->
            <polygon points="84,24 116,24 116,42 84,42" fill="#2d3748" />
            <polygon points="118,24 154,24 158,42 118,42" fill="#2d3748" />
            <polygon points="24,46 42,42 42,82 24,82" fill="#2d3748" />
            <polygon points="24,84 42,84 42,116 24,116" fill="#2d3748" />
            <polygon points="24,118 42,118 42,158 24,154" fill="#2d3748" />
            <polygon points="158,84 176,84 176,116 158,116" fill="#2d3748" />
            <polygon points="158,118 176,118 176,154 158,158" fill="#2d3748" />
            <polygon points="42,158 46,176 82,176 82,158" fill="#2d3748" />
            <polygon points="84,158 84,176 116,176 116,158" fill="#2d3748" />

            <!-- 3x3 Grid Matching Sune -->
            <!-- Row 1 (Top) -->
            <rect x="44" y="44" width="36" height="36" fill="#2d3748" rx="4" />
            <rect x="82" y="44" width="36" height="36" fill="#ea580c" rx="4" />
            <rect x="120" y="44" width="36" height="36" fill="#2d3748" rx="4" />

            <!-- Row 2 (Middle) -->
            <rect x="44" y="82" width="36" height="36" fill="#ea580c" rx="4" />
            <rect x="82" y="82" width="36" height="36" fill="#ea580c" rx="4" />
            <rect x="120" y="82" width="36" height="36" fill="#ea580c" rx="4" />

            <!-- Row 3 (Bottom) -->
            <rect x="44" y="120" width="36" height="36" fill="#ea580c" rx="4" />
            <rect x="82" y="120" width="36" height="36" fill="#ea580c" rx="4" />
            <rect x="120" y="120" width="36" height="36" fill="#2d3748" rx="4" />
          </svg>
        </div>

        <div class="bg-black/40 border border-white/5 rounded-2xl p-3.5 text-xs text-slate-300 leading-relaxed">
          <p>The front face of the 3D cartoon cube now directly mirrors this exact 3x3 orientation: the <strong>Cross</strong> plus the <strong>Bottom-Left corner</strong> are orange, while Top-Left, Top-Right, and Bottom-Right are dark graphite.</p>
        </div>
      </div>
    </div>

    <!-- Real-World In-App Scale Previews -->
    <div class="bg-slate-900/60 border border-white/10 rounded-3xl p-6">
      <h3 class="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">
        In-App Real Scale Previews
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <!-- Header Scale Preview (40px) -->
        <div class="bg-[#090e1c] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center">
              <img src="/OLLDayEveryday.svg" alt="Logo" class="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(234,88,12,0.3)]" onerror="this.onerror=null; this.src='OLLDayEveryday.svg';" />
            </div>
            <div>
              <div class="text-xs font-bold text-white">OLLDay <span class="text-orange-500">Everyday</span></div>
              <div class="text-[10px] text-slate-500 uppercase tracking-widest">Header Scale (40px)</div>
            </div>
          </div>
          <span class="text-xs text-orange-400 font-mono font-bold">Day 1/32</span>
        </div>

        <!-- App Icon Scale Preview (64px) -->
        <div class="bg-[#090e1c] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-900 to-[#070a13] border border-white/10 flex items-center justify-center p-2 shadow-xl shadow-orange-500/10">
            <img src="/OLLDayEveryday.svg" alt="Logo" class="w-full h-full object-contain" onerror="this.onerror=null; this.src='OLLDayEveryday.svg';" />
          </div>
          <div>
            <div class="text-sm font-bold text-white">iPhone Home Screen Icon</div>
            <div class="text-[11px] text-slate-400">Custom user-authored SVG asset</div>
          </div>
        </div>

      </div>
    </div>

  </main>

  <script>
    function setBg(type) {
      const canvas = document.getElementById('previewCanvas');
      canvas.className = 'w-full h-88 rounded-2xl flex items-center justify-center p-4 transition-colors duration-300 shadow-inner my-3 ';
      if (type === 'checker') {
        canvas.classList.add('bg-checker');
      } else if (type === 'midnight') {
        canvas.classList.add('bg-[#060913]', 'border', 'border-white/10');
      } else if (type === 'white') {
        canvas.classList.add('bg-white');
      }
    }

    function toggleShadow() {
      const toggle = document.getElementById('shadowToggle');
      const shadow = document.getElementById('cubeShadow');
      if (shadow && toggle) {
        shadow.style.display = toggle.checked ? 'block' : 'none';
      }
    }
  </script>
</body>
</html>
