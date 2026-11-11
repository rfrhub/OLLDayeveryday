// ... existing code ...
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

const BackspaceIcon = ({ className = "w-6 h-6" }) => (
// ... existing code ...
// --- ADMIN MODAL (ROBUST STRING PIN INPUT WITH LEADING ZERO PRESERVATION) ---
const AdminModal = ({ users, cloudStatus = 'synced', onClose, onAddUser, onDeleteUser, onUpdateUserPin, onImportData }) => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [error, setError] = useState('');
// ... existing code ...
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
// ... existing code ...
// --- CUSTOM SUNE CUBE LOGO ---
const SuneCubeLogo = ({ className = "w-10 h-10" }) => {
  const [imgError, setImgError] = useState(false);
// ... existing code ...
      )}
    </div>
  );
};

// --- REAL-TIME CLOUD DATABASE CONFIGURATION (olldayeveryday) ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBFWgmB1DgBDrfTWCMLSNS6ovS2XeMjAcU",
  authDomain: "olldayeveryday.firebaseapp.com",
  projectId: "olldayeveryday",
  storageBucket: "olldayeveryday.firebasestorage.app",
  messagingSenderId: "332068670798",
  appId: "1:332068670798:web:7b4bfdedd359f36ba5e21f",
  measurementId: "G-H51KQ0DHWD"
};

// Dynamic runtime Firebase handles (prevents Rollup build failures on Vercel)
let cloudDbInstance = null;
let cloudDocRef = null;
let cloudSetDocFn = null;

// --- APP ROOT COMPONENT ---
export default function App() {
  const [users, setUsers] = useState(() => {
// ... existing code ...
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [fingertrickModalCase, setFingertrickModalCase] = useState(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('connecting'); // 'connecting' | 'synced' | 'offline'

  // Ref to prevent echo loops when remote cloud data arrives
  const isRemoteUpdateRef = useRef(false);

  // Sync to Cloud helper
  const saveToCloud = async (dataToSync) => {
    if (!cloudDocRef || !cloudSetDocFn) return;
    try {
      await cloudSetDocFn(cloudDocRef, { users: dataToSync, updatedAt: Date.now() }, { merge: true });
    } catch (e) {
      console.warn("Cloud push warning:", e);
    }
  };

  // Real-Time Firebase Connection via Dynamic ESM Loader (ZERO Vercel build errors)
  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    async function initCloudSync() {
      try {
        const { initializeApp, getApps, getApp } = await import(
          /* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'
        );
        const { getAuth, signInAnonymously } = await import(
          /* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'
        );
        const { getFirestore, doc, onSnapshot, setDoc } = await import(
          /* @vite-ignore */ 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
        );

        if (!isMounted) return;

        const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        const db = getFirestore(app);
        cloudDbInstance = db;
        cloudSetDocFn = setDoc;

        // Try anonymous auth if enabled, but don't crash if test mode is used without auth provider
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          // Test mode allows unauthenticated reads/writes
        }

        const appId = FIREBASE_CONFIG.projectId || 'olldayeveryday';
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'sync', 'family_profiles');
        cloudDocRef = docRef;

        // Initial fetch & real-time snapshot listener
        unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (!isMounted) return;
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.users && typeof data.users === 'object' && Object.keys(data.users).length > 0) {
              isRemoteUpdateRef.current = true;
              setUsers(data.users);
              try {
                localStorage.setItem('ollday_users_v2', JSON.stringify(data.users));
              } catch (e) {}
              setCloudStatus('synced');
            }
          } else {
            // First time setup on empty database: Upload initial local profiles
            setDoc(docRef, { users, updatedAt: Date.now() }, { merge: true });
            setCloudStatus('synced');
          }
        }, (err) => {
          console.warn("Firestore sync listener warning:", err);
          if (isMounted) setCloudStatus('offline');
        });

      } catch (err) {
        console.warn("Firebase loader warning:", err);
        if (isMounted) setCloudStatus('offline');
      }
    }

    initCloudSync();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Cross-tab real-time sync listener (updates immediately if another tab changes users)
  useEffect(() => {
// ... existing code ...
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
    if (clean === '1678') return; // Master admin protected
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
    let updatedProfile = null;

    setUsers(prevUsers => {
      const targetKey = Object.keys(prevUsers).find(k => 
        String(k).trim() === cleanOld || String(prevUsers[k]?.pin).trim() === cleanOld
      );

      if (!targetKey) {
        return prevUsers;
      }

      const targetUser = prevUsers[targetKey];
      updatedProfile = { ...targetUser, pin: cleanNew };
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
// ... existing code ...
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
// ... existing code ...
        {/* Fixed Header (Touch & Overscroll Locked) */}
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
// ... existing code ...
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
// ... existing code ...
