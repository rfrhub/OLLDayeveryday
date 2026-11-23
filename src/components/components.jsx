import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { CUBE_HALF_PX, CUBE_FACES_META, STICKER_HEX, SCANNER_COLOR_META } from '../utils/constants';
import { simulateCrossCubeState } from './solverUtils'; // wait, simulateCrossCubeState is not exported from solverUtils, it's defined in App.jsx

export function ProLockOverlay({ label, onClick, interactive = false, size = 'sm' }) {
  const pillClass = size === 'xs'
    ? 'px-2.5 py-0.5 text-[9.5px]'
    : 'px-3 py-1 text-[10px] shadow-lg';
  const Wrapper = interactive ? 'button' : 'div';
  return (
    <Wrapper
      {...(interactive ? { type: 'button', onClick } : {})}
      className={`absolute inset-0 z-10 bg-black/78 flex items-center justify-center ${interactive ? 'cursor-pointer' : 'pointer-events-none'}`}
    >
      <span className={`${pillClass} rounded-full bg-[#1a110b]/95 border border-orange-400/45 font-black uppercase tracking-wider text-orange-200`}>
        <Lock className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" />{label}
      </span>
    </Wrapper>
  );
}

export function ModalShell({ onClose, zClass = 'z-[260]', maxWidth = 'max-w-sm', borderClass = 'border-white/10', backdropClass = 'bg-[#040814]/94 backdrop-blur-md', children }) {
  return (
    <div onClick={onClose} className={`fixed inset-0 ${zClass} ${backdropClass} flex items-center justify-center p-5`}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative liquid-glass-card liquid-rim-muted border ${borderClass} rounded-3xl p-5 ${maxWidth} w-full shadow-[0_14px_38px_rgba(0,0,0,0.42)] max-h-[90dvh] overflow-y-auto no-scrollbar`}
      >
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export function UvModalShell({ onClose, zClass = 'z-[274]', maxWidth = 'max-w-md', className = 'p-5 sm:p-6 max-h-[88dvh] overflow-y-auto no-scrollbar space-y-4', children }) {
  return (
    <div onClick={onClose} className={`fixed inset-0 ${zClass} bg-[#040814]/94 backdrop-blur-md flex items-center justify-center p-5`}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative liquid-glass-uv border border-white/25 rounded-3xl ${maxWidth} w-full shadow-[0_14px_38px_rgba(0,0,0,0.45)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function AmbientGlows() {
  return null;
}

export function OrbitRingBackdrop({ insetClass = "inset-0" }) {
  return (
    <>
      <svg viewBox="0 0 180 180" className={`pointer-events-none absolute ${insetClass} w-full h-full`}>
        <circle cx="90" cy="90" r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 5" />
        <circle cx="90" cy="90" r="76" fill="none" stroke="rgba(249,115,22,0.18)" strokeWidth="1.2" />
        <circle cx="90" cy="6" r="2.2" fill="rgba(251,146,60,0.65)" />
        <circle cx="174" cy="90" r="2" fill="rgba(255,255,255,0.22)" />
        <circle cx="90" cy="174" r="2" fill="rgba(255,255,255,0.22)" />
        <circle cx="6" cy="90" r="2" fill="rgba(255,255,255,0.22)" />
      </svg>
    </>
  );
}

export function TriggerTagsList({ tags, centered = false, compact = false }) {
  if (!tags?.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${centered ? 'justify-center' : ''}`}>
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={`inline-flex items-center gap-1 rounded-full border font-black ${
            compact ? 'px-1.5 py-0.5 text-[8.5px]' : 'px-2 py-0.5 text-[9px]'
          } ${tag.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tag.dotClass}`} />
          {tag.label}
        </span>
      ))}
    </div>
  );
}

export function CustomAlgSwitcherPills({ item, onSelect, stopPropagation = false }) {
  if (!item?.hasCustomAlg || !onSelect) return null;
  return (
    <div
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className="bg-white/[0.04] p-0.5 rounded-xl inline-flex items-center flex-wrap gap-0.5"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase cursor-pointer transition-all ${!item.usingCustomAlg ? 'bg-white/[0.14] text-white' : 'text-zinc-400 hover:text-white'}`}
      >
        Ours
      </button>
      {(item.customAlgList || []).map((cAlt, idx) => (
        <button
          key={cAlt.id}
          type="button"
          onClick={() => onSelect(cAlt.id)}
          className={`px-2 py-0.5 rounded-lg text-[8.5px] font-black uppercase cursor-pointer transition-all ${item.activeCustomId === cAlt.id ? 'bg-orange-500 text-slate-950' : 'text-zinc-400 hover:text-white'}`}
        >
          #{idx + 1}
        </button>
      ))}
    </div>
  );
}

import { STREAK_FACE_ORDER, MINI_STREAK_HALF, MINI_STREAK_SLOTS, MINI_STREAK_FACES } from './constants';
// Note: We need to move the streak constants too!

export function SocialAuthButtons({ onGoogle, onGameCenter, isNativeIos, showGameCenter = false }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onGoogle}
        className="w-full py-3 px-4 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 hover:border-orange-400/55 text-white font-black text-xs uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_rgba(0,0,0,0.35)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
      >
        <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
          </svg>
        </span>
        <span>Continue with Google</span>
      </button>

      {showGameCenter && (
        <button
          type="button"
          onClick={onGameCenter}
          className="w-full py-3 px-4 rounded-2xl liquid-glass-uv-well hover:bg-white/[0.12] border border-white/20 hover:border-orange-400/55 text-white font-black text-xs uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_20px_rgba(0,0,0,0.35)] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-sky-500 flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="8.5" cy="9" r="3.8" fillOpacity="0.95" />
              <circle cx="15.5" cy="8.5" r="3" fillOpacity="0.85" />
              <circle cx="10.5" cy="15.5" r="3.3" fillOpacity="0.9" />
              <circle cx="16.2" cy="14.8" r="2.4" fillOpacity="0.8" />
            </svg>
          </span>
          <span>{isNativeIos ? 'Continue with Game Center' : 'Game Center / Apple'}</span>
        </button>
      )}

      <div className="flex items-center gap-2 pt-0.5 text-[9.5px] font-black uppercase tracking-widest text-zinc-400">
        <span className="h-px flex-1 bg-white/15" />
        <span>or solver profile</span>
        <span className="h-px flex-1 bg-white/15" />
      </div>
    </div>
  );
}

export function MillisecondSliderControl({ value, min, max, draftValue, onSliderChange, onStepDelta, onDraftChange, accentTextClass = 'text-amber-300', inputWidthClass = 'w-20' }) {
  const pct = Math.min(100, Math.max(0, ((Math.min(max, Math.max(min, value)) - min) / Math.max(0.001, max - min)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="relative h-7 rounded-xl bg-black/65 border border-white/10 px-2 flex items-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-orange-600/25 to-amber-500/35 border-r border-orange-400/60"
          style={{ width: `${pct}%` }}
        />
        <div className="pointer-events-none absolute inset-x-3 flex justify-between opacity-30">
          {Array.from({ length: 17 }).map((_, idx) => (
            <span key={idx} className={`w-px ${idx % 4 === 0 ? 'h-3 bg-white' : 'h-1.5 bg-zinc-400'}`} />
          ))}
        </div>
        <input
          type="range" min={min} max={max} step="0.001"
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onSliderChange(parseFloat(e.target.value))}
          className="relative z-10 w-full accent-orange-500 cursor-pointer opacity-90"
        />
      </div>
      <div className="flex items-center gap-1">
        {[{ label: '-10ms', delta: -0.01 }, { label: '-1ms', delta: -0.001 }, { label: '+1ms', delta: 0.001 }, { label: '+10ms', delta: 0.01 }].map((btn) => (
          <button
            key={btn.label} type="button" onClick={() => onStepDelta(btn.delta)}
            className="flex-1 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] font-mono text-[9.5px] font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {btn.label}
          </button>
        ))}
        <input
          type="number" step="0.001" min="0.100" max="120.000" value={draftValue}
          onChange={(e) => onDraftChange(e.target.value)}
          className={`${inputWidthClass} rounded-xl bg-black/60 px-2 py-1 font-mono text-[10px] text-center ${accentTextClass}`}
        />
      </div>
    </div>
  );
}

export function computeCaseWindowAvg(timesSecList, windowSize) {
  if (!Array.isArray(timesSecList) || timesSecList.length < windowSize) return null;
  const recent = timesSecList.slice(0, windowSize).map(Number).filter(Number.isFinite);
  if (recent.length < windowSize) return null;
  const trimmed = recent.sort((a, b) => a - b).slice(1, windowSize - 1);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}

export function CaseWindowAvgGrid({ history, isLargeScreen = false }) {
  return (
    <div className={`w-full grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 ${isLargeScreen ? 'pt-3' : 'pt-2'}`}>
      {[
        { label: 'Ao20', val: computeCaseWindowAvg(history, 20), color: 'text-green-400' },
        { label: 'Ao40', val: computeCaseWindowAvg(history, 40), color: 'text-sky-400' },
        { label: 'Ao60', val: computeCaseWindowAvg(history, 60), color: 'text-purple-300' }
      ].map((w) => (
        <div key={w.label} className={`text-center ${isLargeScreen ? 'py-1.5 px-3' : 'py-1 px-2'}`}>
          <span className={`${isLargeScreen ? 'text-[10.5px]' : 'text-[8.5px]'} font-black uppercase text-zinc-400 block`}>{w.label}</span>
          <span className={`font-mono ${isLargeScreen ? 'text-sm' : 'text-[11px]'} font-black ${w.color}`}>{w.val !== null ? `${w.val.toFixed(2)}s` : '—'}</span>
        </div>
      ))}
    </div>
  );
}
