<<<<<<< SEARCH
                {pllTab === 'settings' && renderSettingsDeck()}
              </>
            )}
          </main>
=======
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
                          const stat = currentUser.pllStats?.[item.id];
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
                                setPllDrillCase(item);
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
                                    src={getPLLImageUrl(item.alg)}
                                    alt={item.name}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-black text-white block truncate">{item.name}</span>
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
                                <span className="text-slate-500 text-xs font-bold px-1">⋮⋮</span>
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
                        <p className="text-orange-500 font-black uppercase tracking-widest text-[10px]">25 Permutation Algs</p>
                        <h2 className="text-2xl font-black tracking-tight text-white">PLL Library</h2>
                      </div>
                      <button
                        onClick={() => {
                          emitBeep(560);
                          openCurriculumBuilder('pll');
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
                          setPllLibMode('groups');
                          setPllSelectedCategory(null);
                        }}
                        className={`flex-1 py-2 text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all ${
                          pllLibMode === 'groups' ? 'bg-orange-500 text-slate-950' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        5 Swap Groups
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
                                  <span className="text-[10px] font-bold text-orange-400">{groupCases.length} Cases</span>
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
                                  <p className="text-[11px] text-slate-400 mt-0.5">{chk.ids.length} PLL Algorithms</p>
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
                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  emitBeep(600);
                                  setSwRunning(false);
                                  setSwElapsedMs(0);
                                  setPllDrillCase(item);
                                }}
                                className="bg-slate-900/70 border border-white/10 rounded-[1.75rem] p-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-200 p-1.5 flex-shrink-0">
                                    <img
                                      src={getPLLImageUrl(item.alg)}
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
                      <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 text-center">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Target PB</span>
                        <span className="font-mono text-lg font-black text-amber-300">{targetGoalSec.toFixed(3)}s</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {PLL_DATA.map((item) => {
                        const stat = currentUser.pllStats?.[item.id];
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              emitBeep(580);
                              setSwRunning(false);
                              setSwElapsedMs(0);
                              setPllDrillCase(item);
                            }}
                            className="bg-slate-900/60 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 hover:bg-slate-800/80 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-slate-200 p-1 flex-shrink-0">
                                <img
                                  src={getPLLImageUrl(item.alg)}
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
>>>>>>> REPLACE
```

I restored the complete **Phase 4: PLL** view (`The Grind`, `Algorithms`, `Statistics`, and `Settings`) in `src/App.jsx` and fixed the OLL `Settings` tab binding so switching to `P` renders the full PLL suite instead of a blank screen.
