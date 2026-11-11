import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- INLINE SVG ICON WRAPPER & ICONS (ZERO EXTERNAL NPM CONFLICTS) ---
const IconWrapper = ({ children, size = 20, className = "", strokeWidth = 2, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

const Target = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </IconWrapper>
);

const Layers = (props) => (
  <IconWrapper {...props}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.9a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
  </IconWrapper>
);

const BarChart3 = (props) => (
  <IconWrapper {...props}>
    <line x1="12" x2="12" y1="20" y2="10" />
    <line x1="18" x2="18" y1="20" y2="4" />
    <line x1="6" x2="6" y1="20" y2="16" />
  </IconWrapper>
);

const Settings = (props) => (
  <IconWrapper {...props}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </IconWrapper>
);

const Eye = (props) => (
  <IconWrapper {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </IconWrapper>
);

const EyeOff = (props) => (
  <IconWrapper {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </IconWrapper>
);

const Dumbbell = (props) => (
  <IconWrapper {...props}>
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1-1" />
    <path d="m3 3 1 1" />
    <path d="m18 22 4-4" />
    <path d="m2 6 4-4" />
    <path d="m3 10 7-7" />
    <path d="m14 21 7-7" />
  </IconWrapper>
);

const BookOpenCheck = (props) => (
  <IconWrapper {...props}>
    <path d="M8 3H2v15h7c1.7 0 3 1.3 3 3V7c0-2.2-1.8-4-4-4Z" />
    <path d="m16 12 2 2 4-4" />
    <path d="M22 6V3h-6c-2.2 0-4 1.8-4 4v14c0-1.7 1.3-3 3-3h7v-2" />
  </IconWrapper>
);

const ChevronRight = (props) => (
  <IconWrapper {...props}>
    <path d="m9 18 6-6-6-6" />
  </IconWrapper>
);

const ChevronLeft = (props) => (
  <IconWrapper {...props}>
    <path d="m15 18-6-6 6-6" />
  </IconWrapper>
);

const ChevronUp = (props) => (
  <IconWrapper {...props}>
    <path d="m18 15-6-6-6 6" />
  </IconWrapper>
);

const ChevronDown = (props) => (
  <IconWrapper {...props}>
    <path d="m6 9 6 6 6-6" />
  </IconWrapper>
);

const X = (props) => (
  <IconWrapper {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </IconWrapper>
);

const RotateCcw = (props) => (
  <IconWrapper {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </IconWrapper>
);

const CheckCircle2 = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </IconWrapper>
);

const Trophy = (props) => (
  <IconWrapper {...props}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </IconWrapper>
);

const Timer = (props) => (
  <IconWrapper {...props}>
    <line x1="10" x2="14" y1="2" y2="2" />
    <line x1="12" x2="15" y1="14" y2="11" />
    <circle cx="12" cy="14" r="8" />
  </IconWrapper>
);

const Compass = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </IconWrapper>
);

const Lock = (props) => (
  <IconWrapper {...props}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconWrapper>
);

const UserPlus = (props) => (
  <IconWrapper {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </IconWrapper>
);

const Users = (props) => (
  <IconWrapper {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconWrapper>
);

const ShieldAlert = (props) => (
  <IconWrapper {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </IconWrapper>
);

const Zap = (props) => (
  <IconWrapper {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </IconWrapper>
);

const Key = (props) => (
  <IconWrapper {...props}>
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 3-9.5 9.5" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </IconWrapper>
);

const Trash2 = (props) => (
  <IconWrapper {...props}>
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </IconWrapper>
);

const Copy = (props) => (
  <IconWrapper {...props}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </IconWrapper>
);

const ArrowDownToLine = (props) => (
  <IconWrapper {...props}>
    <path d="M12 17V3" />
    <path d="m6 11 6 6 6-6" />
    <path d="M19 21H5" />
  </IconWrapper>
);

const Cloud = (props) => (
  <IconWrapper {...props}>
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </IconWrapper>
);

const HelpCircle = (props) => (
  <IconWrapper {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" x2="12.01" y1="17" y2="17" />
  </IconWrapper>
);

const Sparkles = (props) => (
  <IconWrapper {...props}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </IconWrapper>
);

const Check = (props) => (
  <IconWrapper {...props}>
    <polyline points="20 6 9 17 4 12" />
  </IconWrapper>
);

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
  const base = "w-full rounded-2xl py-4 font-bold text-base transition-all active:scale-95 flex justify-center items-center gap-2 shadow-lg disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
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

  // Global physical keyboard listener with input focus exclusion
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto animate-in fade-in select-none">
      {!hideClose && (
        <button onClick={onClose} className="absolute top-6 left-6 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white cursor-pointer">
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
            className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-2xl font-semibold text-white flex items-center justify-center border border-white/5 cursor-pointer"
          >
            {num}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-2xl font-semibold text-white flex items-center justify-center border border-white/5 cursor-pointer"
        >
          0
        </button>
        <button 
          onClick={handleDelete}
          className="h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-90 transition-all text-xl font-semibold text-slate-400 flex items-center justify-center border border-white/5 cursor-pointer"
        >
          <BackspaceIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// --- AUTHENTICATION SCREEN (CLEAN KEYPAD) ---
const AuthScreen = ({ users, onLogin, onOpenAdmin }) => {
  const [error, setError] = useState('');

  const handleLogin = (enteredPin) => {
    const cleanPin = String(enteredPin).trim();
    const userFound = users[cleanPin] || Object.values(users).find(u => String(u.pin).trim() === cleanPin);
    if (userFound) {
      onLogin(userFound.pin);
    } else {
      setError('Invalid PIN');
      setTimeout(() => setError(''), 1000);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#060913] flex flex-col items-center justify-center relative overflow-hidden p-6 z-50">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <button 
        onClick={onOpenAdmin}
        className="absolute top-6 right-6 p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5 active:scale-95 z-20"
        title="Admin Settings"
      >
        <ShieldAlert size={20} />
      </button>

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

// --- ADMIN MODAL (ROBUST STRING PIN INPUT WITH LEADING ZERO PRESERVATION) ---
const AdminModal = ({ users, cloudStatus = 'synced', onClose, onAddUser, onDeleteUser, onUpdateUserPin, onImportData }) => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [addError, setAddError] = useState('');

  const [confirmDeletePin, setConfirmDeletePin] = useState(null);
  const [editingPinUser, setEditingPinUser] = useState(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinEditError, setPinEditError] = useState('');

  const [copyStatus, setCopyStatus] = useState('');
  const [showSyncCodeModal, setShowSyncCodeModal] = useState(false);
  const [syncCodeString, setSyncCodeString] = useState('');

  const [showImportForm, setShowImportForm] = useState(false);
  const [importString, setImportString] = useState('');
  const [importError, setImportError] = useState('');

  const handleAuth = (pin) => {
    const adminUser = Object.values(users).find(u => u.role === 'admin') || users['1678'];
    const validAdminPin = adminUser ? String(adminUser.pin).trim() : '1678';
    if (String(pin).trim() === validAdminPin || String(pin).trim() === '1678') {
      setIsAuthed(true);
    } else {
      setError('Admin PIN Required');
      setTimeout(() => setError(''), 1000);
    }
  };

  const handleCreateUser = () => {
    const cleanPin = String(newPin).trim();
    if (!newName.trim() || cleanPin.length !== 4) {
      setAddError('Enter a valid name and exactly 4 digits');
      return;
    }
    const pinExists = Object.values(users).some(u => String(u.pin).trim() === cleanPin);
    if (pinExists) {
      setAddError('PIN already taken!');
      return;
    }
    onAddUser(newName.trim(), cleanPin);
    setShowAddForm(false);
    setNewName('');
    setNewPin('');
    setAddError('');
  };

  const handleSaveEditedPin = () => {
    const cleanNew = String(newPinInput).trim();
    if (cleanNew.length !== 4) {
      setPinEditError('PIN must be 4 digits');
      return;
    }
    const pinExists = Object.values(users).some(u => String(u.pin).trim() === cleanNew && String(u.pin).trim() !== String(editingPinUser.pin).trim());
    if (pinExists) {
      setPinEditError('PIN is already taken by another user');
      return;
    }
    onUpdateUserPin(editingPinUser.pin, cleanNew);
    setEditingPinUser(null);
    setNewPinInput('');
    setPinEditError('');
  };

  const handleCopySyncData = async () => {
    const syncData = JSON.stringify(users);
    setSyncCodeString(syncData);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(syncData);
        setCopyStatus('Sync Code Copied to Clipboard! ✓');
        setTimeout(() => setCopyStatus(''), 3000);
        return;
      }
    } catch (e) {
      console.warn("Direct clipboard copy blocked, falling back to modal:", e);
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = syncData;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopyStatus('Sync Code Copied to Clipboard! ✓');
        setTimeout(() => setCopyStatus(''), 3000);
        return;
      }
    } catch (err) {
      console.warn("execCommand copy blocked:", err);
    }

    setShowSyncCodeModal(true);
  };

  const handleImportSyncData = () => {
    if (!importString.trim()) {
      setImportError('Please paste your Sync Code string');
      return;
    }
    try {
      const parsed = JSON.parse(importString.trim());
      if (typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
        setImportError('Invalid sync code format');
        return;
      }
      onImportData(parsed);
      setShowImportForm(false);
      setImportString('');
      setImportError('');
      setCopyStatus('Data Imported Successfully! ✓');
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (e) {
      setImportError('Invalid JSON format. Check copied code.');
    }
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-2xl font-black text-white">Admin Panel</h2>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  cloudStatus === 'synced'
                    ? 'bg-green-500/15 border-green-500/30 text-green-300'
                    : cloudStatus === 'connecting'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-slate-800 border-white/10 text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'synced' ? 'bg-green-400 animate-pulse' : cloudStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-slate-400'}`} />
                  {cloudStatus === 'synced' ? 'Live Cloud' : cloudStatus === 'connecting' ? 'Connecting' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400">olldayeveryday • Real-time family database</p>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {copyStatus && (
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-3 mb-4 text-center text-xs font-bold text-green-300 animate-in fade-in">
              {copyStatus}
            </div>
          )}

          {editingPinUser && (
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 mb-6 shadow-xl animate-in fade-in">
              <h4 className="text-sm font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <Key size={16} /> Edit PIN for {editingPinUser.name}
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Current PIN: <span className="font-mono text-white font-bold">{editingPinUser.pin}</span>
              </p>
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">New 4-Digit PIN</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={newPinInput} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 4) setNewPinInput(val);
                  }} 
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEditedPin();
                  }}
                  placeholder="E.g. 0494" 
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-lg tracking-widest focus:outline-none focus:border-amber-500" 
                  autoFocus
                />
              </div>
              {pinEditError && <p className="text-xs text-red-400 font-bold mb-3">{pinEditError}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setEditingPinUser(null); setPinEditError(''); }} className="py-2.5 text-xs flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveEditedPin} className="py-2.5 text-xs flex-1">
                  Save PIN
                </Button>
              </div>
            </div>
          )}

          {confirmDeletePin && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 text-center animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 mx-auto mb-2 flex items-center justify-center">
                <Trash2 size={20} />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Delete profile for {users[confirmDeletePin]?.name}?
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                This will permanently erase their solve times and day progress.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setConfirmDeletePin(null)} className="py-2 text-xs flex-1">
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => { onDeleteUser(confirmDeletePin); setConfirmDeletePin(null); }} className="py-2 text-xs flex-1">
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}

          {!showAddForm && !showImportForm ? (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Profiles</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{Object.keys(users).length} Users</span>
                </div>

                {Object.values(users).map(u => {
                  const isMaster = String(u.pin).trim() === '1678';
                  return (
                    <div key={u.pin} className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
                          {(u.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2 text-sm">
                            {u.name}
                            {u.role === 'admin' && <ShieldAlert size={14} className="text-amber-500" />}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tracking-widest">
                            PIN: <span className="text-orange-400 font-bold">{u.pin}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 mr-1 font-mono">Day {u.day || 1}</span>
                        <button 
                          onClick={() => { setEditingPinUser(u); setNewPinInput(u.pin); setPinEditError(''); }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 active:scale-95 transition-all cursor-pointer"
                          title="Change PIN"
                        >
                          <Key size={15} />
                        </button>
                        {!isMaster && (
                          <button 
                            onClick={() => setConfirmDeletePin(u.pin)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 active:scale-95 transition-all cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 mb-6">
                <Button onClick={() => setShowAddForm(true)} variant="secondary" className="border-dashed border-white/20 text-orange-400 py-3 text-xs">
                  <UserPlus size={16} /> Add New User
                </Button>
              </div>

              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Device Backup & Transfer</span>
                  <Cloud size={14} className="text-orange-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Automatic real-time sync is active via Firestore REST. You can also manually copy or import your database anytime below:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={handleCopySyncData} className="py-2.5 text-xs">
                    <Copy size={14} /> Copy Sync Code
                  </Button>
                  <Button variant="secondary" onClick={() => setShowImportForm(true)} className="py-2.5 text-xs">
                    <ArrowDownToLine size={14} /> Import Code
                  </Button>
                </div>
              </div>
            </>
          ) : showAddForm ? (
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
                    placeholder="E.g. Ephraim" 
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">4-Digit PIN</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={newPin} 
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 4) setNewPin(val);
                    }} 
                    placeholder="E.g. 0713" 
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
          ) : (
            <div className="bg-slate-900/80 border border-white/10 rounded-[2rem] p-6 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <ArrowDownToLine size={20} className="text-orange-500"/> Import Data
              </h3>
              <p className="text-xs text-slate-400 mb-4">Paste the sync code string copied from another device to restore all user profiles.</p>
              <textarea 
                value={importString}
                onChange={e => setImportString(e.target.value)}
                placeholder='Paste {"1678": {...}}'
                className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-orange-500 mb-3"
              />
              {importError && <p className="text-xs text-red-400 font-bold mb-3">{importError}</p>}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setShowImportForm(false); setImportError(''); }} className="py-3 flex-1 text-sm">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleImportSyncData} className="py-3 flex-1 text-sm">
                  Apply Import
                </Button>
              </div>
            </div>
          )}

          {showSyncCodeModal && (
            <div className="fixed inset-0 z-[250] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-base font-bold text-white">Your Sync Code</h4>
                  <button onClick={() => setShowSyncCodeModal(false)} className="p-1.5 bg-white/5 rounded-full text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">Select and copy this entire code string to paste onto your other device:</p>
                <textarea 
                  readOnly 
                  value={syncCodeString}
                  onClick={e => e.target.select()}
                  className="w-full h-36 bg-black/60 border border-white/10 rounded-xl p-3 text-orange-300 font-mono text-xs mb-4 select-all"
                />
                <Button variant="primary" onClick={() => setShowSyncCodeModal(false)} className="py-3 text-sm">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
    title: "Slice Moves (Middle Layers)",
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
    title: "Wide Moves (Two Layers)",
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

// --- CURATED FINGERTRICK DATABASE ---
const FINGERTRICK_DATABASE = {
  1: {
    grip: "Standard Home Grip (Right thumb on front center, middle & ring fingers on back)",
    regrips: "0 Regrips",
    triggers: [
      { moves: "R U R'", label: "Sune Opener", tip: "Right wrist turns R up, right index flicks U forward, right wrist pulls R' down. Keep your right thumb anchored on the front face." },
      { moves: "U", label: "Setup Flick", tip: "Right index flicks U again smoothly without shifting your hand position." },
      { moves: "R U2' R'", label: "Double-Flick Finisher", tip: "Right wrist turns R up, then execute U2' as an index-then-middle double flick with your right hand. Finish with R' wrist pull." }
    ],
    proTip: "Do not regrip between the U turns! Let your index finger spring back quickly so the entire 7-move algorithm flows as one continuous reflex."
  },
  2: {
    grip: "Standard Home Grip",
    regrips: "0 Regrips",
    triggers: [
      { moves: "R U2", label: "Double Flick Opener", tip: "Right wrist turns R up, right index followed by right middle finger double-flicks U2." },
      { moves: "R' U'", label: "Push Transition", tip: "Right wrist pulls R' down, right index pushes U' from behind." },
      { moves: "R U' R'", label: "Sune Finisher", tip: "Right wrist turns R up, right index pushes U' again, right wrist pulls R' down." }
    ],
    proTip: "Use your right index finger to push U' from the back corner so your hand never has to change grip."
  },
  3: {
    grip: "Standard Home Grip",
    regrips: "0 Regrips",
    triggers: [
      { moves: "(R U2 R')", label: "Double Flick Pair", tip: "Wrist R, index-then-middle double flick U2, wrist R'." },
      { moves: "(U' R U R')", label: "Reverse Sexy Insert", tip: "Index push U', wrist R, index flick U, wrist R'." },
      { moves: "(U' R U' R')", label: "Closing Insert", tip: "Index push U', wrist R, index push U', wrist R'." }
    ],
    proTip: "Treat this as three 4-move F2L pairs chained together. Maintain an even, rhythmic turning speed."
  },
  4: {
    grip: "Wide Home Grip (Right thumb spans two layers)",
    regrips: "0 Regrips",
    triggers: [
      { moves: "(r U R' U')", label: "Fat Sexy Move", tip: "Turn wide r with right thumb and middle, index flicks U, outer R' down, index push U'." },
      { moves: "(r' F R F')", label: "Fat Sledgehammer", tip: "Wide r' down, index push F, outer R up, thumb push F'." }
    ],
    proTip: "Because r turns two layers, stabilize the left block with your left hand while your right hand glides through the wide triggers."
  },
  5: {
    grip: "Home Grip with Left Hand Support",
    regrips: "0 Regrips",
    triggers: [
      { moves: "F'", label: "Index Pinch F'", tip: "Right index finger pinches F' counter-clockwise from the top-right corner." },
      { moves: "(r U R' U')", label: "Fat Sexy Move", tip: "Right thumb & middle lift wide r, index flicks U, outer R' down, index push U'." },
      { moves: "r' F R", label: "Recovery Trigger", tip: "Wide r' down, thumb push F up, right wrist R up to finish." }
    ],
    proTip: "The opening F' is done with a quick pinch so your right hand is already in position for the wide r lift."
  },
  8: {
    grip: "Home Grip (No pre-turn regrip)",
    regrips: "0 Regrips",
    triggers: [
      { moves: "F", label: "Thumb Push F", tip: "Push the front face clockwise from the bottom-right corner with your right thumb (or left index flicking down)." },
      { moves: "(R U R' U')", label: "Sexy Move", tip: "The classic 4-move trigger: R wrist up, U index flick, R' wrist down, U' index push." },
      { moves: "F'", label: "Index Pinch F'", tip: "Right index finger reaches to the top-right corner of F and pinches upward/counter-clockwise to close." }
    ],
    proTip: "The index finger pinch for F' is what makes this a sub-0.7s PB breaker. Never take your right hand off the cube to turn F' with your thumb."
  },
  9: {
    grip: "Standard Home Grip",
    regrips: "0 Regrips",
    triggers: [
      { moves: "(R U R' U')", label: "Sexy Move", tip: "R wrist up, index flick U, R' wrist down, index push U'." },
      { moves: "(R' F R F')", label: "Sledgehammer", tip: "R' wrist down, right index pushes F down, right wrist pulls R up, right thumb pushes F' up." }
    ],
    proTip: "Flow the ending of Sexy Move directly into the Sledgehammer — the R' move is already prepared by your wrist angle."
  },
  20: {
    grip: "Standard Home Grip",
    regrips: "0 Regrips",
    triggers: [
      { moves: "f", label: "Wide Thumb Push f", tip: "Right thumb pushes both front layers clockwise." },
      { moves: "(R U R' U')", label: "Sexy Move", tip: "Standard 4-move trigger executed from standard home grip." },
      { moves: "f'", label: "Wide Pinch f'", tip: "Right index finger pinches both front layers counter-clockwise from the top." }
    ],
    proTip: "Make sure your index finger catches both the F and S slices together on the f' pinch so the middle slice doesn't drag."
  }
};

const describeFallbackTrigger = (chunk) => {
  const c = chunk.trim();
  if (c.includes("R U R' U'")) return { moves: c, label: "Sexy Move", tip: "R wrist up, index flick U, R' wrist down, index push U'." };
  if (c.includes("R' F R F'")) return { moves: c, label: "Sledgehammer", tip: "R' wrist down, index push F, R wrist up, thumb push F'." };
  if (c.includes("r U R' U'")) return { moves: c, label: "Fat Sexy Move", tip: "Wide r lift with thumb and middle, index flick U, R' down, index push U'." };
  if (c.includes("r' F R F'")) return { moves: c, label: "Fat Sledgehammer", tip: "Wide r' down, index push F, outer R up, thumb push F'." };
  if (c.includes("U2")) return { moves: c, label: "Double Flick U2", tip: "Right index flick followed immediately by right middle finger flick." };
  if (c === "F") return { moves: c, label: "Thumb Push F", tip: "Right thumb pushes front layer clockwise from bottom right." };
  if (c === "F'") return { moves: c, label: "Index Pinch F'", tip: "Right index finger pinches front layer counter-clockwise from top right." };
  if (c === "f") return { moves: c, label: "Wide Push f", tip: "Right thumb pushes two front layers clockwise." };
  if (c === "f'") return { moves: c, label: "Wide Pinch f'", tip: "Right index finger pinches two front layers counter-clockwise." };
  if (c.includes("M")) return { moves: c, label: "Slice Trigger", tip: "Left or right ring finger operates the inner M slice from bottom-back." };
  return { moves: c, label: "Trigger Segment", tip: `Execute ${c} smoothly with index flicks and light wrist turns.` };
};

const getFingertrickData = (caseItem) => {
  if (!caseItem) return null;
  if (FINGERTRICK_DATABASE[caseItem.id]) {
    return FINGERTRICK_DATABASE[caseItem.id];
  }

  const alg = caseItem.alg || "";
  const parenMatches = alg.match(/\([^\)]+\)/g);
  let triggers = [];

  if (parenMatches && parenMatches.length > 0) {
    let remaining = alg;
    parenMatches.forEach(paren => {
      const idx = remaining.indexOf(paren);
      if (idx > 0) {
        const lead = remaining.slice(0, idx).trim();
        if (lead) triggers.push(describeFallbackTrigger(lead));
      }
      triggers.push(describeFallbackTrigger(paren));
      remaining = remaining.slice(idx + paren.length).trim();
    });
    if (remaining) triggers.push(describeFallbackTrigger(remaining));
  } else {
    const parts = alg.split(' ').filter(Boolean);
    const chunkSize = Math.max(2, Math.ceil(parts.length / 3));
    for (let i = 0; i < parts.length; i += chunkSize) {
      const chunk = parts.slice(i, i + chunkSize).join(' ');
      triggers.push(describeFallbackTrigger(chunk));
    }
  }

  let grip = "Standard Home Grip (Thumbs on front center, middle & ring on back)";
  if (alg.includes("r") || alg.includes("l")) grip = "Wide Home Grip (Thumb spans two layers for wide turns)";
  else if (alg.startsWith("L") || alg.startsWith("f'")) grip = "Lefty Home Grip (Dominant left-hand lead)";
  else if (alg.includes("M")) grip = "Middle Slice Grip (Ring finger rested on bottom-back M slice)";

  return {
    grip,
    regrips: alg.includes("y") || alg.includes("x") ? "1 Regrip (Cube Rotation)" : "0 Regrips (High TPS Flow)",
    triggers: triggers.filter(Boolean),
    proTip: "Keep finger movements light and close to the cube. Minimize wrist travel by flicking U moves with your index finger."
  };
};

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

// --- CUSTOM SUNE CUBE LOGO ---
const SuneCubeLogo = ({ className = "w-10 h-10" }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className={`${className} flex-shrink-0 flex items-center justify-center relative`}>
      {!imgError ? (
        <img
          src="/OLLDayEveryday.svg"
          alt="Sune Logo"
          className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(234,88,12,0.35)]"
          onError={() => setImgError(true)}
        />
      ) : (
        <svg
          viewBox="0 0 1000 1000"
          className="w-full h-full drop-shadow-[0_4px_10px_rgba(234,88,12,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M214 310 L295 258 L524 168 L806 416 L726 558 L592 660 L515 688 L214 550 Z"
            fill="#090a14"
            stroke="#090a14"
            strokeWidth="32"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
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
      )}
    </div>
  );
};

// --- REAL-TIME CLOUD DATABASE (FIRESTORE REST API) ---
// ZERO npm dependencies, ZERO external imports, ZERO Rollup build errors on Vercel
const FIREBASE_PROJECT_ID = "olldayeveryday";
const FIREBASE_API_KEY = "AIzaSyBFWgmB1DgBDrfTWCMLSNS6ovS2XeMjAcU";
const FIRESTORE_ENDPOINT = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/app_data/family_sync?key=${FIREBASE_API_KEY}`;

// --- APP ROOT COMPONENT ---
export default function App() {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('ollday_users_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (e) {}

    const base = {
      "1678": { pin: "1678", name: "Me", role: "admin", day: 1, stats: {}, targetGoal: 2.5, timerEnabled: true, fingertricksEnabled: true },
      "8995": { pin: "8995", name: "Dad", role: "user", day: 1, stats: {}, targetGoal: 4.0, timerEnabled: true, fingertricksEnabled: true },
      "0713": { pin: "0713", name: "Ephraim", role: "user", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true, fingertricksEnabled: true },
      "0494": { pin: "0494", name: "Victor", role: "user", day: 1, stats: {}, targetGoal: 3.5, timerEnabled: true, fingertricksEnabled: true },
    };

    try {
      localStorage.setItem('ollday_users_v2', JSON.stringify(base));
    } catch (e) {}
    return base;
  });

  const [activePin, setActivePin] = useState(null);
  const [activeTab, setActiveTab] = useState('grind');
  const [sessionState, setSessionState] = useState(null);
  const [drillCase, setDrillCase] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [fingertrickModalCase, setFingertrickModalCase] = useState(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('connecting');

  // Push updates to Firestore REST endpoint
  const saveToCloud = async (dataToSync) => {
    try {
      const payload = {
        fields: {
          usersPayload: { stringValue: JSON.stringify(dataToSync) },
          updatedAt: { integerValue: String(Date.now()) }
        }
      };
      await fetch(FIRESTORE_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn("Cloud push notice:", err);
    }
  };

  // Sync with Firestore REST API on mount, on interval, and when app is foregrounded
  useEffect(() => {
    let isMounted = true;

    const pullFromCloud = async () => {
      try {
        const res = await fetch(FIRESTORE_ENDPOINT);
        if (!res.ok) {
          if (res.status === 404) {
            saveToCloud(users);
            if (isMounted) setCloudStatus('synced');
          } else {
            if (isMounted) setCloudStatus('offline');
          }
          return;
        }

        const json = await res.json();
        const rawPayload = json.fields?.usersPayload?.stringValue;
        if (rawPayload) {
          const cloudUsers = JSON.parse(rawPayload);
          if (cloudUsers && typeof cloudUsers === 'object' && Object.keys(cloudUsers).length > 0) {
            if (isMounted) {
              setUsers(cloudUsers);
              try {
                localStorage.setItem('ollday_users_v2', JSON.stringify(cloudUsers));
              } catch (e) {}
              setCloudStatus('synced');
            }
          }
        }
      } catch (err) {
        console.warn("Cloud fetch notice:", err);
        if (isMounted) setCloudStatus('offline');
      }
    };

    pullFromCloud();

    const pollTimer = setInterval(pullFromCloud, 10000);
    const handleFocus = () => pullFromCloud();
    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') pullFromCloud();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Cross-tab real-time sync listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'ollday_users_v2' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            setUsers(parsed);
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = (pin) => {
    const cleanPin = String(pin).trim();
    setActivePin(cleanPin);
  };

  const handleAddUser = (name, pin) => {
    const cleanPin = String(pin).trim();
    const newUser = { 
      pin: cleanPin, 
      name: name.trim(), 
      role: "user", 
      day: 1, 
      stats: {}, 
      targetGoal: 3.5, 
      timerEnabled: true, 
      fingertricksEnabled: true 
    };

    setUsers(prevUsers => {
      const nextUsers = { ...prevUsers, [cleanPin]: newUser };
      try { 
        localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); 
      } catch (e) {}
      saveToCloud(nextUsers);
      return nextUsers;
    });
  };

  const handleDeleteUser = (pinToDelete) => {
    const clean = String(pinToDelete).trim();
    if (clean === '1678') return;
    setUsers(prevUsers => {
      const nextUsers = { ...prevUsers };
      delete nextUsers[clean];
      Object.keys(nextUsers).forEach(key => {
        if (String(nextUsers[key]?.pin).trim() === clean) {
          delete nextUsers[key];
        }
      });
      try { 
        localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); 
      } catch (e) {}
      saveToCloud(nextUsers);
      return nextUsers;
    });

    if (activePin === clean) {
      setActivePin(null);
      setSessionState(null);
    }
  };

  const handleUpdateUserPin = (oldPin, newPin) => {
    const cleanOld = String(oldPin).trim();
    const cleanNew = String(newPin).trim();

    setUsers(prevUsers => {
      const targetKey = Object.keys(prevUsers).find(k => 
        String(k).trim() === cleanOld || String(prevUsers[k]?.pin).trim() === cleanOld
      );

      if (!targetKey) {
        return prevUsers;
      }

      const targetUser = prevUsers[targetKey];
      const updatedProfile = { ...targetUser, pin: cleanNew };
      const nextUsers = { ...prevUsers };
      delete nextUsers[targetKey];
      delete nextUsers[cleanOld];
      nextUsers[cleanNew] = updatedProfile;

      try { 
        localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); 
      } catch (e) {}
      saveToCloud(nextUsers);
      return nextUsers;
    });

    if (activePin === cleanOld) {
      setActivePin(cleanNew);
    }
  };

  const handleImportData = (importedUsers) => {
    if (!importedUsers || typeof importedUsers !== 'object') return;
    setUsers(importedUsers);
    try {
      localStorage.setItem('ollday_users_v2', JSON.stringify(importedUsers));
    } catch (e) {}
    saveToCloud(importedUsers);
  };

  if (!activePin || !users[activePin]) {
    return (
      <>
        <AuthScreen 
          users={users} 
          onLogin={handleLogin} 
          onOpenAdmin={() => setShowAdminModal(true)} 
        />
        {showAdminModal && (
          <AdminModal 
            users={users} 
            cloudStatus={cloudStatus}
            onClose={() => setShowAdminModal(false)} 
            onAddUser={handleAddUser} 
            onDeleteUser={handleDeleteUser}
            onUpdateUserPin={handleUpdateUserPin}
            onImportData={handleImportData}
          />
        )}
      </>
    );
  }

  const currentUser = users[activePin] || Object.values(users).find(u => String(u.pin).trim() === activePin) || {
    pin: activePin,
    name: "User",
    role: "user",
    day: 1,
    stats: {},
    targetGoal: 3.5,
    timerEnabled: true,
    fingertricksEnabled: true
  };

  // CFOP Onboarding prompt
  useEffect(() => {
    if (currentUser && currentUser.hasSeenOnboarding === undefined) {
      setShowOnboardingModal(true);
    }
  }, [activePin]);

  const updateCurrentUser = (updates) => {
    const targetKey = Object.keys(users).find(k => 
      String(k).trim() === activePin || String(users[k]?.pin).trim() === activePin
    ) || activePin;
    const current = users[targetKey] || currentUser || {};
    const nextUser = { ...current, ...updates };

    setUsers(prevUsers => {
      const nextUsers = { ...prevUsers, [targetKey]: nextUser };
      try { localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); } catch (e) {}
      saveToCloud(nextUsers);
      return nextUsers;
    });
  };

  const updateDay = (day) => { 
    if (day >= 1 && day <= 32) {
      const targetKey = Object.keys(users).find(k => 
        String(k).trim() === activePin || String(users[k]?.pin).trim() === activePin
      ) || activePin;
      const current = users[targetKey] || currentUser || {};
      const nextUser = { ...current, day };

      setUsers(prevUsers => {
        const nextUsers = { ...prevUsers, [targetKey]: nextUser };
        try { localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); } catch (e) {}
        saveToCloud(nextUsers);
        return nextUsers;
      });
    }
  };

  const handleRecordTime = (caseId, timeInSeconds) => {
    const targetKey = Object.keys(users).find(k => 
      String(k).trim() === activePin || String(users[k]?.pin).trim() === activePin
    ) || activePin;
    const current = users[targetKey] || currentUser || {};
    const userStats = current.stats || {};
    const existingStats = userStats[caseId] || [];
    const nextStats = { ...userStats, [caseId]: [...existingStats, timeInSeconds] };
    const nextUser = { ...current, stats: nextStats };

    setUsers(prevUsers => {
      const nextUsers = { ...prevUsers, [targetKey]: nextUser };
      try { localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); } catch (e) {}
      saveToCloud(nextUsers);
      return nextUsers;
    });
  };

  const handleResetProgress = () => { 
    const targetKey = Object.keys(users).find(k => 
      String(k).trim() === activePin || String(users[k]?.pin).trim() === activePin
    ) || activePin;
    const current = users[targetKey] || currentUser || {};
    const nextUser = { ...current, day: 1, stats: {} };

    setUsers(prevUsers => {
      const nextUsers = { ...prevUsers, [targetKey]: nextUser };
      try { localStorage.setItem('ollday_users_v2', JSON.stringify(nextUsers)); } catch (e) {}
      saveToCloud(nextUsers);
      return nextUsers;
    });

    setShowResetModal(false); 
  };

  const currentDay = currentUser.day || 1;
  const schedule = getScheduleForDay(currentDay);
  const todaysAlgs = OLL_DATA.filter(alg => schedule.chunks.includes(alg.chunk));
  const isFingertricksOn = currentUser.fingertricksEnabled !== false;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#060913] text-slate-100 font-sans selection:bg-orange-500/30 overflow-hidden flex justify-center select-none touch-none overscroll-none">
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
          background-color: #060913 !important;
          color-scheme: dark;
        }
      `}</style>

      {/* iOS Ambient Lighting Gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[45vh] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-3/4 h-[40vh] bg-blue-600/10 blur-[110px] rounded-full pointer-events-none z-0" />

      {/* Main iPhone Application Viewport Shell */}
      <div className="w-full max-w-md h-full flex flex-col relative z-10 shadow-2xl bg-[#090e1c] backdrop-blur-3xl border-x border-white/5 overflow-hidden">
        
        {/* Fixed Header */}
        <header className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/5 bg-[#090e1c]/40 backdrop-blur-md select-none flex-shrink-0 touch-none overscroll-none">
          <div className="flex items-center gap-3">
            <SuneCubeLogo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                OLLDay <span className="text-orange-500">Everyday</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">Daily OLL Training</span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-orange-400 font-bold">
                  Day {currentDay}
                </span>
                <span className="text-slate-600">•</span>
                <div 
                  className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" 
                  title={cloudStatus === 'synced' ? 'Real-Time Cloud Synced' : cloudStatus === 'connecting' ? 'Connecting to Cloud...' : 'Offline Mode (Local Storage)'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'synced' ? 'bg-green-400 animate-pulse' : cloudStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`} />
                  <span className={cloudStatus === 'synced' ? 'text-green-400/90' : cloudStatus === 'connecting' ? 'text-amber-400/90' : 'text-slate-500'}>
                    {cloudStatus === 'synced' ? 'Cloud' : cloudStatus === 'connecting' ? 'Syncing' : 'Local'}
                  </span>
                </div>
              </div>
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

        {/* Viewport Content */}
        <main className={`flex-1 min-h-0 relative select-none overscroll-none ${activeTab === 'settings' ? 'overflow-hidden touch-none' : 'overflow-y-auto touch-pan-y no-scrollbar'}`}>
          {!sessionState && activeTab === 'grind' && (
            <GrindView 
              currentDay={currentDay} 
              updateDay={updateDay} 
              schedule={schedule} 
              onStart={() => setSessionState(schedule.type.toLowerCase())} 
            />
          )}

          {!sessionState && activeTab === 'algorithms' && (
            <AlgorithmsView 
              onSelectCase={(c) => setDrillCase(c)} 
              onOpenFingertrick={isFingertricksOn ? (c) => setFingertrickModalCase(c) : null}
            />
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
              setFingertricksEnabled={(val) => updateCurrentUser({ fingertricksEnabled: val })}
              setTargetGoal={(val) => updateCurrentUser({ targetGoal: val })} 
              onRequestReset={() => setShowResetModal(true)} 
              onOpenAdmin={() => setShowAdminModal(true)} 
              onLockApp={() => setActivePin(null)}
              onOpenOnboarding={() => setShowOnboardingModal(true)}
            />
          )}

          {sessionState === 'learn' && (
            <LearnSession 
              algs={todaysAlgs} 
              onClose={() => setSessionState(null)} 
              onComplete={() => { updateDay(currentDay + 1); setSessionState(null); }} 
              onOpenFingertrick={isFingertricksOn ? (c) => setFingertrickModalCase(c) : null}
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
              onOpenFingertrick={isFingertricksOn ? (c) => setFingertrickModalCase(c) : null}
            />
          )}

          {drillCase && (
            <IsolatedDrillModal 
              caseData={drillCase} 
              timerEnabled={currentUser.timerEnabled !== false} 
              solveTimes={(currentUser.stats && currentUser.stats[drillCase.id]) || []} 
              onRecordTime={(t) => handleRecordTime(drillCase.id, t)} 
              onClose={() => setDrillCase(null)} 
              onOpenFingertrick={isFingertricksOn ? (c) => setFingertrickModalCase(c) : null}
            />
          )}

          {fingertrickModalCase && (
            <FingertrickDossierModal 
              caseData={fingertrickModalCase} 
              onClose={() => setFingertrickModalCase(null)} 
            />
          )}

          {showOnboardingModal && (
            <OnboardingModal 
              onClose={() => {
                updateCurrentUser({ hasSeenOnboarding: true });
                setShowOnboardingModal(false);
              }}
            />
          )}

          {showAdminModal && (
            <AdminModal 
              users={users} 
              cloudStatus={cloudStatus}
              onClose={() => setShowAdminModal(false)} 
              onAddUser={handleAddUser} 
              onDeleteUser={handleDeleteUser}
              onUpdateUserPin={handleUpdateUserPin}
              onImportData={handleImportData}
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

        {/* Dedicated Bottom Navigation Bar */}
        {!sessionState && !drillCase && (
          <nav className="w-full flex-shrink-0 bg-[#090e1c] border-t border-white/10 pt-2.5 pb-6 px-4 z-40 select-none touch-none overscroll-none shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
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
    className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all select-none touch-none ${
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
    <div className="p-6 pt-6 pb-8 flex flex-col min-h-full">
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
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full disabled:opacity-20 active:scale-90 transition-transform border border-white/5 cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Phase</span>
            <h3 className="text-4xl font-black text-white tracking-tighter mt-0.5">Day {currentDay}</h3>
          </div>

          <button 
            onClick={() => updateDay(currentDay + 1)} 
            disabled={currentDay === 32} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full disabled:opacity-20 active:scale-90 transition-transform border border-white/5 cursor-pointer"
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

      <div className="flex items-center justify-between bg-slate-900/60 border border-white/10 p-5 rounded-[2rem] shadow-xl flex-shrink-0">
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
const AlgorithmsView = ({ onSelectCase, onOpenFingertrick }) => {
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
      <div className="p-6 pt-6 pb-12 animate-in fade-in slide-in-from-right-4 min-h-full">
        <button 
          onClick={() => setSelectedGroup(null)} 
          className="mb-5 flex items-center gap-2 text-orange-400 font-bold active:scale-95 transition-transform px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/20 text-xs uppercase tracking-wider cursor-pointer"
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Tap to drill</span>
                    {onOpenFingertrick && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFingertrick(alg);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 text-orange-400 text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                      >
                        <Zap size={10} className="text-amber-400" />
                        <span>Fingertricks</span>
                      </button>
                    )}
                  </div>
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
    <div className="p-6 pt-6 pb-12 animate-in fade-in min-h-full">
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
    <div className="p-6 pt-6 pb-12 animate-in fade-in min-h-full">
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

// --- TAB 4: SETTINGS (3D STACKED FLOATING CARDS) ---
const SettingsView = ({ 
  currentUser, 
  setTimerEnabled, 
  setFingertricksEnabled, 
  setTargetGoal, 
  onRequestReset, 
  onOpenAdmin, 
  onLockApp,
  onOpenOnboarding
}) => {
  const [activeCard, setActiveCard] = useState(0); // 0: Preferences, 1: Notation, 2: Security & Guide
  const [activeNotation, setActiveNotation] = useState(0);
  const userGoal = (currentUser && currentUser.targetGoal) || 3.5;
  const isTimerOn = currentUser && currentUser.timerEnabled !== false;
  const isFingertricksOn = currentUser && currentUser.fingertricksEnabled !== false;

  const isNavigatingRef = useRef(false);
  const wheelActiveRef = useRef(false);
  const wheelTimerRef = useRef(null);

  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const mouseStartY = useRef(0);

  const navigateCard = (direction) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    setActiveCard(prev => {
      if (direction === 'up') return Math.min(2, prev + 1);
      if (direction === 'down') return Math.max(0, prev - 1);
      return prev;
    });

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 450);
  };

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diffY) > 40 && Math.abs(diffY) > Math.abs(diffX) * 1.2) {
      if (diffY > 0) navigateCard('up');
      else navigateCard('down');
    }
  };

  const handleMouseDown = (e) => { mouseStartY.current = e.clientY; };
  const handleMouseUp = (e) => {
    const diffY = mouseStartY.current - e.clientY;
    if (Math.abs(diffY) > 40) {
      if (diffY > 0) navigateCard('up');
      else navigateCard('down');
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    clearTimeout(wheelTimerRef.current);
    wheelTimerRef.current = setTimeout(() => {
      wheelActiveRef.current = false;
    }, 200);

    if (wheelActiveRef.current) return;
    if (Math.abs(e.deltaY) > 25) {
      wheelActiveRef.current = true;
      if (e.deltaY > 0) navigateCard('up');
      else navigateCard('down');
    }
  };

  const getCardStyle = (index) => {
    const diff = index - activeCard;
    if (diff < 0) {
      return {
        transform: `translateY(-140px) scale(0.85)`,
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 0
      };
    } else if (diff === 0) {
      return {
        transform: `translateY(0px) scale(1)`,
        opacity: 1,
        pointerEvents: 'auto',
        zIndex: 30
      };
    } else if (diff === 1) {
      return {
        transform: `translateY(24px) scale(0.95)`,
        opacity: 0.55,
        pointerEvents: 'none',
        zIndex: 20
      };
    } else {
      return {
        transform: `translateY(48px) scale(0.90)`,
        opacity: 0.25,
        pointerEvents: 'none',
        zIndex: 10
      };
    }
  };

  return (
    <div 
      className="p-6 pt-5 pb-6 flex flex-col h-full justify-between select-none touch-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="flex-shrink-0 z-40 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-500 font-black uppercase tracking-widest text-[11px] mb-0.5">Control Center</p>
            <h2 className="text-2xl font-black tracking-tight text-white">Settings</h2>
          </div>
          <button 
            onClick={onLockApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold active:scale-95 transition-all cursor-pointer"
          >
            <Lock size={12} className="text-orange-400" />
            <span>Lock App</span>
          </button>
        </div>
      </div>

      <div className="relative w-full flex-1 min-h-0 my-auto flex items-center justify-center">
        {/* CARD 0: PREFERENCES */}
        <div 
          style={getCardStyle(0)}
          className="absolute inset-x-0 w-full h-[370px] max-h-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between transition-all duration-500 ease-out"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                Card 1 of 3
              </span>
              <Timer size={16} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-1">Training Preferences</h3>
            <p className="text-xs text-slate-400 mb-3">Configure stopwatch, fingertricks, and targets</p>
            
            <div className="space-y-2.5 border-t border-white/5 pt-2.5">
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-xs font-bold text-white block">Speedcube Stopwatch</span>
                  <span className="text-[10px] text-slate-400">Track execution times</span>
                </div>
                <button 
                  onClick={() => setTimerEnabled(!isTimerOn)} 
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${isTimerOn ? 'bg-orange-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isTimerOn ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Fingertrick Guides</span>
                  <span className="text-[10px] text-slate-400">Pills & speed execution tips</span>
                </div>
                <button 
                  onClick={() => setFingertricksEnabled(!isFingertricksOn)} 
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${isFingertricksOn ? 'bg-orange-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isFingertricksOn ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">Target Execution Goal</span>
                  <span className="text-[10px] text-slate-400">Benchmark time (seconds)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setTargetGoal(Math.max(1, +(userGoal - 0.25).toFixed(2)))} 
                    className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-300 active:scale-90 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-black text-orange-400 w-10 text-center">{userGoal.toFixed(2)}s</span>
                  <button 
                    onClick={() => setTargetGoal(+(userGoal + 0.25).toFixed(2))} 
                    className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-slate-300 active:scale-90 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-500 font-bold tracking-wider uppercase pt-1">
            Swipe Up for Notation Key ↑
          </div>
        </div>

        {/* CARD 1: NOTATION KEY */}
        <div 
          style={getCardStyle(1)}
          className="absolute inset-x-0 w-full h-[370px] max-h-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between transition-all duration-500 ease-out"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                Card 2 of 3
              </span>
              <Compass size={16} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-0.5">Algorithm Notation Key</h3>
            <p className="text-[11px] text-slate-400 mb-2">WCA notation cheatsheet</p>

            <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar mb-2">
              {NOTATION_GROUPS.map((grp, idx) => (
                <button 
                  key={grp.title} 
                  onClick={() => setActiveNotation(idx)} 
                  className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap transition-all border cursor-pointer ${
                    activeNotation === idx 
                      ? 'bg-orange-500 text-slate-950 border-orange-400 shadow-md' 
                      : 'bg-white/5 text-slate-400 border-white/10'
                  }`}
                >
                  {grp.title.split(' ')[0]}
                </button>
              ))}
            </div>

            <div 
              className="bg-slate-950/80 rounded-2xl p-3 border border-white/5 overflow-y-auto max-h-[145px] no-scrollbar touch-pan-y"
              onWheel={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="text-[11px] font-bold text-white mb-0.5">{NOTATION_GROUPS[activeNotation].title}</div>
              <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                {NOTATION_GROUPS[activeNotation].moves.map(m => (
                  <div key={m.move} className="flex items-center gap-2 p-1.5 bg-slate-900/60 rounded-lg border border-white/5">
                    <span className="font-mono text-[10px] font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 w-12 text-center">{m.move}</span>
                    <span className="text-[10px] text-slate-200 truncate">{m.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-500 font-bold tracking-wider uppercase pt-1">
            Swipe Up for Security & Guide ↑
          </div>
        </div>

        {/* CARD 2: SECURITY, CFOP GUIDE & DANGER */}
        <div 
          style={getCardStyle(2)}
          className="absolute inset-x-0 w-full h-[370px] max-h-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.25rem] p-5 shadow-2xl flex flex-col justify-between transition-all duration-500 ease-out"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                Card 3 of 3
              </span>
              <ShieldAlert size={16} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-0.5">Profiles & Security</h3>
            <p className="text-xs text-slate-400 mb-3">Manage accounts, reset progress, or guide</p>

            <div className="space-y-2 border-t border-white/5 pt-2">
              <Button 
                variant="secondary" 
                onClick={onOpenOnboarding} 
                className="py-2.5 text-xs font-bold border-white/10 bg-white/5 text-amber-300 hover:text-amber-200"
              >
                <HelpCircle size={15} /> New to CFOP? Beginner Guide
              </Button>

              <Button 
                variant="secondary" 
                onClick={onOpenAdmin} 
                className="py-2.5 text-xs font-bold border-dashed border-white/20 text-orange-400"
              >
                <Users size={15} /> Admin User Management
              </Button>

              <Button 
                variant="danger" 
                onClick={onRequestReset} 
                className="py-2.5 text-xs font-bold"
              >
                <RotateCcw size={15} /> Reset My Progress
              </Button>
            </div>
          </div>
          <div className="text-center text-[10px] text-slate-500 font-bold tracking-wider uppercase pt-1">
            Swipe Down to Return ↓
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 flex-shrink-0 z-40">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            onClick={() => setActiveCard(idx)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              activeCard === idx ? 'w-6 bg-orange-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// --- SESSION SCREEN 1: LEARN ---
const LearnSession = ({ algs, onClose, onComplete, onOpenFingertrick }) => {
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
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90 cursor-pointer">
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
          <div className="w-44 h-44 bg-slate-200 rounded-3xl mb-4 flex items-center justify-center p-3 shadow-inner">
            <img src={getImageUrl(currentAlg.alg)} alt={currentAlg.name} className="w-full h-full object-contain" />
          </div>

          <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-4 text-center shadow-inner">
            <div className="font-mono text-xl text-orange-400 font-bold tracking-wider leading-relaxed">{currentAlg.alg}</div>
          </div>

          {onOpenFingertrick && (
            <button 
              onClick={() => onOpenFingertrick(currentAlg)}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <Zap size={13} className="text-amber-400" />
              <span>Fingertrick Guide</span>
            </button>
          )}

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
          className="p-4 bg-white/5 rounded-2xl disabled:opacity-20 active:scale-95 border border-white/10 cursor-pointer"
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

// --- SESSION SCREEN 2: PRACTICE ---
const PracticeSession = ({ algs, mode, timerEnabled, solveTimes, onRecordTime, onClose, onComplete, onOpenFingertrick }) => {
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
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90 cursor-pointer">
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
              
              {onOpenFingertrick && (
                <button 
                  onClick={() => onOpenFingertrick(currentAlg)}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Zap size={12} className="text-amber-400" />
                  <span>Fingertrick Guide</span>
                </button>
              )}
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
const IsolatedDrillModal = ({ caseData, timerEnabled, solveTimes = [], onRecordTime, onClose, onOpenFingertrick }) => {
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
        <button onClick={onClose} className="p-2.5 bg-white/5 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90 cursor-pointer">
          <X size={20} />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
          Isolated Drill
        </span>
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
            <div className="w-full flex flex-col items-center">
              <div className="font-mono text-sm font-bold text-orange-400 bg-slate-950/80 p-3 rounded-xl border border-white/5 w-full">
                {caseData.alg}
              </div>
              {onOpenFingertrick && (
                <button 
                  onClick={() => onOpenFingertrick(caseData)}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
                >
                  <Zap size={12} className="text-amber-400" />
                  <span>Fingertrick Guide</span>
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => setShowAlg(true)} className="text-xs text-orange-400 font-bold py-2 px-4 bg-orange-500/10 rounded-full border border-orange-500/20 cursor-pointer">
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

// --- OPTION A: FLOATING FINGERTRICK DOSSIER MODAL ---
const FingertrickDossierModal = ({ caseData, onClose }) => {
  const data = useMemo(() => getFingertrickData(caseData), [caseData]);
  const [activeTriggerIdx, setActiveTriggerIdx] = useState(0);

  if (!data) return null;
  const activeTrigger = data.triggers[activeTriggerIdx] || data.triggers[0];

  return (
    <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-2xl flex flex-col p-6 pt-7 animate-in fade-in overflow-y-auto">
      <div className="flex justify-between items-center mb-4 max-w-sm mx-auto w-full">
        <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white border border-white/5 active:scale-90 transition-all cursor-pointer">
          <X size={20} />
        </button>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-wider">
          <Zap size={14} className="text-amber-400" />
          <span>Fingertrick Dossier</span>
        </div>
        <div className="w-8" />
      </div>

      <div className="flex-1 flex flex-col items-center max-w-sm mx-auto w-full space-y-4">
        <div className="text-center w-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">Case #{caseData.id} • {caseData.group}</span>
          <h3 className="text-2xl font-black text-white mt-0.5">{caseData.name}</h3>
        </div>

        <div className="w-full bg-[#050811] border border-white/10 rounded-2xl p-3.5 text-center shadow-inner">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Full Sequence</span>
          <div className="font-mono text-base font-bold text-orange-300 tracking-wide">{caseData.alg}</div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 w-full">
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Starting Grip</span>
            <span className="text-xs font-bold text-white leading-tight block">{data.grip.split('(')[0]}</span>
          </div>
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3 text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Regrip Efficiency</span>
            <span className="text-xs font-bold text-green-400 font-mono leading-tight block">{data.regrips}</span>
          </div>
        </div>

        <div className="w-full bg-slate-900/80 border border-white/10 rounded-3xl p-4 shadow-xl text-center">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Interactive Trigger Breakdown</span>
            <span className="text-[10px] text-slate-500 font-medium">Tap pill to inspect</span>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {data.triggers.map((trig, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTriggerIdx(idx)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all active:scale-95 border flex items-center gap-1.5 cursor-pointer ${
                  activeTriggerIdx === idx
                    ? 'bg-orange-500/25 border-orange-400 text-orange-300 shadow-md shadow-orange-500/20 scale-105'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                }`}
              >
                <span>{trig.moves}</span>
                {trig.label && <span className="text-[9px] font-sans opacity-70 font-normal">• {trig.label}</span>}
              </button>
            ))}
          </div>

          {activeTrigger && (
            <div className="bg-slate-950 border border-orange-500/25 rounded-2xl p-3.5 text-left shadow-inner transition-all animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-sm font-black text-orange-400">{activeTrigger.moves}</span>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  {activeTrigger.label}
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {activeTrigger.tip}
              </p>
            </div>
          )}
        </div>

        <div className="w-full bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3.5 text-left shadow-sm">
          <div className="flex items-center gap-1.5 text-orange-400 text-[11px] font-black uppercase tracking-wider mb-1">
            <span>⚡</span>
            <span>Speedcoach Execution Note</span>
          </div>
          <p className="text-xs text-orange-200/90 leading-relaxed">
            {data.proTip}
          </p>
        </div>
      </div>

      <div className="mt-4 max-w-sm mx-auto w-full pt-2">
        <Button variant="primary" onClick={onClose} className="py-3.5 text-sm">
          <span>Got It, Back to Practice</span>
          <CheckCircle2 size={18} />
        </Button>
      </div>
    </div>
  );
};

// --- NEW USER ONBOARDING MODAL ---
const OnboardingModal = ({ onClose }) => {
  const [step, setStep] = useState('inquiry'); // 'inquiry' | 'course'
  const [coursePage, setCoursePage] = useState(0);

  const courseSteps = [
    {
      title: "The CFOP Framework",
      badge: "The 4 Pillars of Speedcubing",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong className="text-white">CFOP</strong> (Cross, F2L, OLL, PLL) is the world's most dominant speedcubing method, used in 99% of world records:
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-orange-400 font-bold block mb-0.5">1. Cross (C)</span>
              Solve 4 white edges on the bottom.
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-orange-400 font-bold block mb-0.5">2. F2L (F)</span>
              Solve the first two layers simultaneously.
            </div>
            <div className="bg-orange-500/20 p-2.5 rounded-xl border border-orange-400/40">
              <span className="text-orange-300 font-bold block mb-0.5">3. OLL (O) ★</span>
              Orient all top yellow pieces in 1 alg!
            </div>
            <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
              <span className="text-orange-400 font-bold block mb-0.5">4. PLL (P)</span>
              Permute (slide) the last layer into place.
            </div>
          </div>
        </div>
      )
    },
    {
      title: "What is OLL & Why Learn It?",
      badge: "Orientation of the Last Layer",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            In beginner methods, turning the top face yellow takes <strong className="text-white">2 to 4 separate algorithms</strong> (edge cross, then multiple Sunes), wasting 4–8 seconds.
          </p>
          <div className="bg-slate-950 p-3 rounded-xl border border-orange-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-400">Beginner (2-Look)</span>
              <span className="text-red-400 font-mono">~5.5s</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-orange-400 font-bold">Full 1-Look OLL</span>
              <span className="text-green-400 font-mono">0.8s - 1.5s</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            By mastering all 57 patterns, whichever yellow shape appears on top, you solve it in <strong className="text-white">one fluid reflex</strong>.
          </p>
        </div>
      )
    },
    {
      title: "How OLLDay Everyday Trains You",
      badge: "The 32-Day Science",
      content: (
        <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Most cubers fail learning OLL because 57 algorithms at once is overwhelming. We fix this with:
          </p>
          <ul className="space-y-2 text-[11px] text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-bold">1.</span>
              <span><strong>Micro-Chunking:</strong> Only 6 to 7 cases at a time over 32 days.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-bold">2.</span>
              <span><strong>40 + 20 Muscle Memory Rule:</strong> Drill 40 times to learn, 20 times to solidify into permanent reflex.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 font-bold">3.</span>
              <span><strong>0-Regrip Fingertricks:</strong> Learn modern speedcubing finger motions (push/pinch) from day one.</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: "Ready to Begin Day 1!",
      badge: "Your Training Launchpad",
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed text-center py-2">
          <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 mx-auto flex items-center justify-center border border-orange-500/30">
            <Sparkles size={28} />
          </div>
          <h4 className="text-base font-black text-white">Day 1 Starts with Sune & Anti-Sune</h4>
          <p className="text-xs text-slate-400">
            You'll learn the 7 Oriented-Edge cases first. Take your physical cube, follow the setup scramble, and let muscle memory take over!
          </p>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-[210] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in">
      {step === 'inquiry' ? (
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full text-center shadow-2xl relative">
          <div className="w-16 h-16 rounded-3xl bg-orange-500/15 border border-orange-500/25 text-orange-400 mx-auto mb-4 flex items-center justify-center">
            <Compass size={32} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-1">Welcome Cuber</span>
          <h3 className="text-2xl font-black text-white mb-2">Are you new to CFOP?</h3>
          <p className="text-xs text-slate-300 mb-6 leading-relaxed">
            If you're just getting started or transitioning from beginner methods, we can give you a quick crash course on OLL and how this app accelerates your times!
          </p>

          <div className="flex flex-col gap-2.5">
            <Button variant="primary" onClick={() => setStep('course')} className="py-3.5 text-sm">
              <span>Yes, teach me!</span>
              <Sparkles size={16} />
            </Button>
            <Button variant="secondary" onClick={onClose} className="py-3.5 text-xs text-slate-400">
              No, I know CFOP (Jump in)
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl flex flex-col justify-between min-h-[440px]">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                {courseSteps[coursePage].badge}
              </span>
              <span className="text-xs font-mono text-slate-400">{coursePage + 1}/{courseSteps.length}</span>
            </div>

            <h3 className="text-xl font-black text-white mb-3">{courseSteps[coursePage].title}</h3>

            <div className="min-h-[200px]">
              {courseSteps[coursePage].content}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
            {coursePage > 0 ? (
              <Button variant="secondary" onClick={() => setCoursePage(p => p - 1)} className="py-3 text-xs flex-1">
                Back
              </Button>
            ) : null}

            {coursePage < courseSteps.length - 1 ? (
              <Button variant="primary" onClick={() => setCoursePage(p => p + 1)} className="py-3 text-xs flex-1">
                <span>Continue</span>
                <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" onClick={onClose} className="py-3 text-xs flex-1">
                <span>Start Training!</span>
                <Check size={16} />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
