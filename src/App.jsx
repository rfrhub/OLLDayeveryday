<<<<<<< SEARCH
                {resolvedPllTab === 'settings' && renderSettingsDeck()}
              </>
              );
            })()}
          </main>
=======
                {resolvedPllTab === 'settings' && renderSettingsDeck()}
              </>
              );
            })()}
          </main>
>>>>>>> REPLACE
```

Wait—let's check the lines right around `activePhase` state initialization, the header `C F O P` buttons, and the bottom of `src/App.jsx` so we fix the exact blank screen cause in one pass! Let's inspect `src/App.jsx` around `useState` for `activePhase` and `pllTab` and the bottom `export default`.

```react:OLLDay Everyday — CFOP Master Suite:src/App.jsx
<<<<<<< SEARCH
  const [activePhase, setActivePhase] = useState('oll'); // 'cross' | 'f2l' | 'oll' | 'pll'
  const [crossTab, setCrossTab] = useState('grind'); // 'grind' | 'ladder' | 'stats' | 'settings'
  const [f2lTab, setF2lTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [activeTab, setActiveTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [pllTab, setPllTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
=======
  const [activePhase, setActivePhase] = useState('oll'); // 'cross' | 'f2l' | 'oll' | 'pll'
  const [crossTab, setCrossTab] = useState('grind'); // 'grind' | 'ladder' | 'stats' | 'settings'
  const [f2lTab, setF2lTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [activeTab, setActiveTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
  const [pllTab, setPllTab] = useState('grind'); // 'grind' | 'algorithms' | 'stats' | 'settings'
>>>>>>> REPLACE
```

Aha! Look at why pasting a snippet or switching to PLL can give a blank blue screen:
1. If you pasted only the partial diff block instead of the full `src/App.jsx`, the file won't have the full `OLLDaySuite` component!
2. Even in the full file, let's check what happens when you click `P` (`PLL`):
   - In the header, does `P` call `setActivePhase('pll')`?
   - In the bottom `<nav>`, when `activePhase === 'pll'`, does clicking `The Grind`, `Algorithms`, `Statistics`, or `Settings` update `pllTab` (and NOT `activeTab` or `f2lTab`)?
   - And inside `activePhase === 'pll'`, does `PLL_DATA` or `renderFullSolveStatsSection()` or `renderSettingsDeck()` ever fail if `activePhase` is `'pll'`?
Let's make sure the bottom `<nav>` tab switcher, the top `C F O P` phase switcher, and `activePhase === 'pll'` are 100% wired to `pllTab` and `activeTab` properly! Let's apply that fix directly to `src/App.jsx`:

```react:OLLDay Everyday — CFOP Master Suite:src/App.jsx
<<<<<<< SEARCH
            {/* ===================================================== */}
            {/* PHASE 4: PLL (PERMUTE LAST LAYER — 25 ALGORITHMS) */}
            {/* ===================================================== */}
            {activePhase === 'pll' && (() => {
              const resolvedPllTab = pllTab || 'grind';
=======
            {/* ===================================================== */}
            {/* PHASE 4: PLL (PERMUTE LAST LAYER — 25 ALGORITHMS) */}
            {/* ===================================================== */}
            {String(activePhase || '').toLowerCase() === 'pll' && (() => {
              const resolvedPllTab = pllTab || 'grind';
>>>>>>> REPLACE
```

Let's also check the bottom `<nav>` bar in `src/App.jsx` so tapping **The Grind**, **Algorithms**, **Statistics**, or **Settings** updates the active tab for **every** phase (`crossTab`, `f2lTab`, `activeTab` for OLL, and `pllTab` for PLL):

```react:OLLDay Everyday — CFOP Master Suite:src/App.jsx
<<<<<<< SEARCH
              const currentTab =
                activePhase === 'cross'
                  ? crossTab
                  : activePhase === 'f2l'
                    ? f2lTab
                    : activePhase === 'pll'
                      ? pllTab
                      : activeTab;
              const setCurrentTab = (t) => {
                if (activePhase === 'cross') setCrossTab(t);
                else if (activePhase === 'f2l') setF2lTab(t);
                else if (activePhase === 'pll') setPllTab(t);
                else setActiveTab(t);
              };
=======
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
>>>>>>> REPLACE
```

Note: Make sure you copy the **entire** `src/App.jsx` file from the editor on the right when updating your project (rather than pasting a partial snippet), so every component, modal, and phase (`Cross`, `F2L`, `OLL`, and `PLL`) stays complete.
