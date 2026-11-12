<<<<<<< SEARCH
                {ollTab === 'settings' && renderSettingsDeck()}
              </>
            )}

            {/* ===================================================== */}
            {/* PHASE 4: PLL (PERMUTE LAST LAYER — 25 ALGORITHMS) */}
            {/* ===================================================== */}
=======
                {activeTab === 'settings' && renderSettingsDeck()}
              </>
            )}

            {/* ===================================================== */}
            {/* PHASE 4: PLL (PERMUTE LAST LAYER — 25 ALGORITHMS) */}
            {/* ===================================================== */}
>>>>>>> REPLACE
```

Wait—let's also verify how `activePhase` and `pllTab` / `currentPllDayObj` are defined in `src/App.jsx` so PLL cannot fail or render empty! Let's check the lines around `pllTab`, `currentPllDayObj`, and the top `C / F / O / P` switcher in `src/App.jsx`. Let's inspect `src/App.jsx` around `activePhase` and `pllTab`.

```react:OLLDay Everyday — CFOP Master Suite:src/App.jsx
<<<<<<< SEARCH
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
=======
            {/* ===================================================== */}
            {/* PHASE 4: PLL (PERMUTE LAST LAYER — 25 ALGORITHMS) */}
            {/* ===================================================== */}
            {activePhase === 'pll' && (() => {
              const resolvedPllTab = pllTab || 'grind';
              const resolvedPllDay = Number(currentUser?.pllDay) || 1;
              const resolvedPllSchedule = Array.isArray(pllSchedule) && pllSchedule.length > 0
                ? pllSchedule
                : [{ day: 1, mode: 'Learn', chunkTitle: 'Essential 2-Look PLL', items: PLL_DATA.slice(0, 6) }];
              const resolvedPllDayObj = currentPllDayObj || resolvedPllSchedule[Math.min(resolvedPllDay - 1, resolvedPllSchedule.length - 1)] || resolvedPllSchedule[0];
              const resolvedPllLineup = Array.isArray(pllLineupOrder) && pllLineupOrder.length > 0
                ? pllLineupOrder
                : (resolvedPllDayObj.items || PLL_DATA.slice(0, 6));
              const resolvedPllMastered = typeof pllMasteredCount === 'number'
                ? pllMasteredCount
                : Object.values(currentUser?.pllStats || {}).filter((s) => s?.best && s.best <= targetGoalSec).length;

              return (
              <>
                {resolvedPllTab === 'grind' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-orange-950/30 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-xl space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-[10px] font-black uppercase tracking-widest text-orange-400">
                          Day {resolvedPllDay} • {resolvedPllDayObj.mode} Mode
                        </span>
>>>>>>> REPLACE
<<<<<<< SEARCH
                        <span className="text-xs font-black text-slate-300 font-mono">
                          {pllMasteredCount}/25 Mastered
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white leading-tight">{currentPllDayObj.chunkTitle}</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          2-Side Headlight &amp; Block Recognition • Execute cleanly under {targetGoalSec.toFixed(3)}s
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
                          Start Day {safePllDay} PLL Grind ({pllLineupOrder.length} Algs)
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
                          title="Skip to Next Day"
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
=======
                        <span className="text-xs font-black text-slate-300 font-mono">
                          {resolvedPllMastered}/25 Mastered
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-black text-white leading-tight">{resolvedPllDayObj.chunkTitle}</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          2-Side Headlight &amp; Block Recognition • Execute cleanly under {targetGoalSec.toFixed(3)}s
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            emitBeep(720, 'sine', 0.08);
                            setSwRunning(false);
                            setSwElapsedMs(0);
                            setPllSession({
                              dayObj: resolvedPllDayObj,
                              index: 0,
                              queue: [...resolvedPllLineup]
                            });
                          }}
                          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
                        >
                          Start Day {resolvedPllDay} PLL Grind ({resolvedPllLineup.length} Algs)
                        </button>
                        <button
                          onClick={() => {
                            emitBeep(480);
                            const nextDay = resolvedPllDay >= resolvedPllSchedule.length ? 1 : resolvedPllDay + 1;
                            const updated = { ...currentUser, pllDay: nextDay };
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

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Today&apos;s PLL Lineup (Hold &amp; Drag to Reorder)
                        </span>
                        <span className="text-[10px] font-bold text-orange-400">{resolvedPllLineup.length} Cases</span>
                      </div>

                      <div className="space-y-2">
                        {resolvedPllLineup.map((item, idx) => {
>>>>>>> REPLACE
<<<<<<< SEARCH
                {pllTab === 'algorithms' && (
=======
                {resolvedPllTab === 'algorithms' && (
>>>>>>> REPLACE
<<<<<<< SEARCH
                {pllTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PBs</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">PLL Statistics</h2>
                    </div>

                    {renderFullSolveStatsSection()}

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Mastered</span>
                        <span className="font-mono text-xl font-black text-green-400">{pllMasteredCount}/25</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Day</span>
                        <span className="font-mono text-xl font-black text-orange-400">{safePllDay}</span>
                      </div>
=======
                {resolvedPllTab === 'stats' && (
                  <div className="p-5 pb-10 space-y-4">
                    <div>
                      <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">Telemetry &amp; PBs</p>
                      <h2 className="text-2xl font-black tracking-tight text-white">PLL Statistics</h2>
                    </div>

                    {renderFullSolveStatsSection()}

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Mastered</span>
                        <span className="font-mono text-xl font-black text-green-400">{resolvedPllMastered}/25</span>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Day</span>
                        <span className="font-mono text-xl font-black text-orange-400">{resolvedPllDay}</span>
                      </div>
>>>>>>> REPLACE
<<<<<<< SEARCH
                {pllTab === 'settings' && renderSettingsDeck()}
              </>
            )}
=======
                {resolvedPllTab === 'settings' && renderSettingsDeck()}
              </>
              );
            })()}
>>>>>>> REPLACE
```

### What Was Fixed
* **OLL Settings Tab:** Changed `{ollTab === 'settings' && renderSettingsDeck()}` to `{activeTab === 'settings' && renderSettingsDeck()}` to match OLL's tab state variable (`activeTab`), so the 6-card Settings deck renders cleanly in OLL.
* **PLL Phase Rendering:** Added safe default resolution inside `activePhase === 'pll'` (`resolvedPllTab`, `resolvedPllDayObj`, `resolvedPllLineup`, `resolvedPllMastered`) so switching to **P (PLL)** renders the Grind, Algorithms, Statistics, and Settings tabs reliably without falling back to an empty state.
