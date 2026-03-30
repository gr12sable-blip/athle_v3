import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  deleteDoc, deleteField 
} from 'firebase/firestore';
import { 
  Trash2, LogOut, Plus, 
  Check, XCircle, Ban, History, Calendar, Edit3, Users, UserMinus, HelpCircle, BarChart2
} from 'lucide-react';

// ==========================================
// 1. INJECTION DU DESIGN (Rouge SGS)
// ==========================================
if (typeof document !== 'undefined') {
  const script = document.createElement('script');
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

// ==========================================
// 2. CONFIGURATION FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCeSX-JBBOH38_KDBJ9b0CVDeEzRgPqIYA",
  authDomain: "athle-8ab39.firebaseapp.com",
  projectId: "athle-8ab39",
  storageBucket: "athle-8ab39.firebasestorage.app",
  messagingSenderId: "794846952754",
  appId: "1:794846952754:web:23fac2106a95a68bacab2b"
};

const CLUB_ID = "dream-team-athle-official-v1";

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('planning');
  const [loading, setLoading] = useState(true);
  
  // Données
  const [sessions, setSessions] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  
  // Profil Utilisateur
  const [currentUserProfile, setCurrentUserProfile] = useState(() => {
    const saved = localStorage.getItem('sgs_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [newAthleteName, setNewAthleteName] = useState("");
  
  // États de modification
  const [editingSession, setEditingSession] = useState(null);
  const [editingAthlete, setEditingAthlete] = useState(null);

  // --- Connexion ---
  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Erreur Auth:", err));
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // --- Invit au démarrage ---
  useEffect(() => {
    if (!loading && !currentUserProfile && view !== 'admin' && athletes.length > 0) {
      setView('profiles');
    }
  }, [loading, currentUserProfile, view, athletes.length]);

  // --- Synchronisation Firestore ---
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubSessions = onSnapshot(collection(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions'), (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubMembers = onSnapshot(collection(db, 'artifacts', CLUB_ID, 'public', 'data', 'members'), (snap) => {
      setAthletes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubAttendance = onSnapshot(collection(db, 'artifacts', CLUB_ID, 'public', 'data', 'attendance'), (snap) => {
      const attMap = {};
      snap.docs.forEach(d => { attMap[d.id] = d.data(); });
      setAttendanceData(attMap);
    });

    return () => { unsubSessions(); unsubMembers(); unsubAttendance(); };
  }, [user]);

  // --- Actions ---
  const saveProfile = (athlete) => {
    setCurrentUserProfile(athlete);
    localStorage.setItem('sgs_user_profile', JSON.stringify(athlete));
    setView('planning');
  };

  const handleImport = async () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split('\n');
    for (const [i, line] of lines.entries()) {
      const [date, time, type, location, desc] = line.split(/[;,]/).map(p => p?.trim());
      if (!date) continue;
      const id = `sess_${date.replace(/[^0-9]/g, '')}_${Date.now()}_${i}`;
      await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions', id), {
        date, time: time || "18:30", type: type || "Entraînement", location: location || "Stade", description: desc || "", isCancelled: false
      });
    }
    setCsvInput("");
    alert("Séances publiées !");
  };

  const updateSession = async () => {
    if (!editingSession) return;
    await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions', editingSession.id), editingSession, { merge: true });
    setEditingSession(null);
  };

  const updateAthlete = async () => {
    if (!editingAthlete || !editingAthlete.name.trim()) return;
    await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'members', editingAthlete.id), 
        { name: editingAthlete.name }, 
        { merge: true }
    );
    setEditingAthlete(null);
  };

  const deleteSession = async (id) => {
    if (window.confirm("Supprimer définitivement cette séance ?")) {
      await deleteDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions', id));
    }
  };

  const toggleCancelSession = async (id, currentStatus) => {
    await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'sessions', id), { isCancelled: !currentStatus }, { merge: true });
  };

  const addAthlete = async () => {
    if (!newAthleteName.trim()) return;
    const id = `ath_${Date.now()}`;
    await setDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'members', id), { name: newAthleteName });
    setNewAthleteName("");
  };

  const deleteAthlete = async (id) => {
    if (window.confirm("Supprimer ce membre ?")) {
      await deleteDoc(doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'members', id));
    }
  };

  // Annulation au double-clic
  const saveAttendance = async (sessId, status) => {
    if (!currentUserProfile) return;
    const currentStatus = attendanceData[sessId]?.[currentUserProfile.id];
    const newStatus = currentStatus === status ? deleteField() : status;
    const ref = doc(db, 'artifacts', CLUB_ID, 'public', 'data', 'attendance', String(sessId));
    await setDoc(ref, { [currentUserProfile.id]: newStatus }, { merge: true });
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr.replace(/-/g, '/'));
      return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch { return dateStr; }
  };

  // --- Tri ---
  const today = new Date().toISOString().split('T')[0];
  const upcomingSessions = sessions.filter(s => s.date >= today).sort((a,b) => a.date.localeCompare(b.date));
  const pastSessions = sessions.filter(s => s.date < today).sort((a,b) => b.date.localeCompare(a.date));

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-red-600 animate-pulse">SGS ATHLÉ CHARGEMENT...</div>;

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-24 font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-red-600 p-2 rounded-lg text-white font-black italic shadow-md text-xs">SGS</div>
          <h1 className="font-black italic tracking-tighter uppercase text-sm">ATHLÉ</h1>
        </div>
        <nav className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-black">
          <button onClick={() => setView('planning')} className={`px-4 py-2 rounded-lg transition-all ${view === 'planning' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400'}`}>PLANNING</button>
          <button onClick={() => setView('admin')} className={`px-4 py-2 rounded-lg transition-all ${view === 'admin' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400'}`}>COACH</button>
        </nav>
      </header>

      <main className="max-w-xl mx-auto p-4 pt-6">
        {/* VUE PLANNING */}
        {view === 'planning' && (
          <div className="space-y-8">
            <section>
              <h2 className="text-[10px] font-black uppercase text-red-600 mb-4 flex items-center gap-2">
                <Calendar size={14}/> Prochaines séances
              </h2>
              {upcomingSessions.length === 0 && <p className="text-sm text-slate-400 italic">Aucune séance prévue.</p>}
              <div className="space-y-4">
                {upcomingSessions.map(s => 
                  <SessionCard key={s.id} s={s} athletes={athletes} attendanceData={attendanceData} currentUserProfile={currentUserProfile} saveAttendance={saveAttendance} formatDate={formatDate} isAdminAuthenticated={isAdminAuthenticated} setEditingSession={setEditingSession} />
                )}
              </div>
            </section>

            {pastSessions.length > 0 && (
              <section className="opacity-60 grayscale-[0.5]">
                <h2 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2 mt-8 border-t pt-8">
                  <History size={14}/> Historique
                </h2>
                <div className="space-y-4">
                  {pastSessions.map(s => 
                    <SessionCard key={s.id} s={s} athletes={athletes} attendanceData={attendanceData} currentUserProfile={currentUserProfile} saveAttendance={saveAttendance} formatDate={formatDate} isAdminAuthenticated={isAdminAuthenticated} setEditingSession={setEditingSession} />
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* VUE PROFILS */}
        {view === 'profiles' && (
          <div className="max-w-md mx-auto text-center py-10">
            <h2 className="text-3xl font-black italic mb-2 uppercase text-red-600">Bienvenue</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10">Qui se connecte ?</p>
            <div className="grid grid-cols-2 gap-3">
              {athletes.filter(a => a.name).sort((a,b) => a.name.localeCompare(b.name)).map(a => (
                <button key={a.id} onClick={() => saveProfile(a)} className="bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-red-600 font-bold shadow-sm transition-all text-sm uppercase italic">{a.name}</button>
              ))}
            </div>
            <p className="mt-8 text-[9px] text-slate-400">Tu ne trouves pas ton nom ? Demande au coach.</p>
          </div>
        )}

        {/* VUE COACH */}
        {view === 'admin' && (
          <div className="space-y-6">
            {!isAdminAuthenticated ? (
              <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center border mt-10">
                <h3 className="font-black text-sm uppercase mb-6">Accès Entraîneur</h3>
                <input type="password" placeholder="Mot de passe" className="w-full p-4 rounded-xl bg-slate-50 border-0 text-center font-bold mb-4 outline-none focus:ring-2 ring-red-600" 
                       onChange={(e) => e.target.value === "Coach" && setIsAdminAuthenticated(true)} />
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                {/* Importer */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                    <h3 className="font-black text-[10px] uppercase mb-4 text-red-600 tracking-widest">Importer Séances (CSV)</h3>
                    <textarea value={csvInput} onChange={e => setCsvInput(e.target.value)} 
                              className="w-full h-24 p-4 bg-slate-50 rounded-xl text-[10px] mb-4 border-0 outline-none font-mono"
                              placeholder="2026-02-12;18:30;Seuil;Stade;Détails..."/>
                    <button onClick={handleImport} className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px]">Publier le planning</button>
                </div>

                {/* --- NOUVEAU : BILAN DES PRÉSENCES --- */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                    <h3 className="font-black text-[10px] uppercase mb-4 text-red-600 tracking-widest flex items-center gap-2">
                        <BarChart2 size={14}/> Bilan des Présences
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {athletes.filter(a => a.name).sort((a,b) => a.name.localeCompare(b.name)).map(a => {
                            let present = 0, absent = 0, noRep = 0;
                            sessions.filter(s => !s.isCancelled).forEach(s => {
                                const status = attendanceData[s.id]?.[a.id];
                                if (status === 'present') present++;
                                else if (status === 'absent') absent++;
                                else noRep++;
                            });
                            return (
                                <div key={a.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-black uppercase italic truncate max-w-[120px]">{a.name}</span>
                                    <div className="flex gap-1 text-[9px] font-bold">
                                        <span className="bg-green-100 text-green-700 px-2 py-1.5 rounded-lg flex items-center gap-1" title="Présent(e)"><Check size={10}/> {present}</span>
                                        <span className="bg-red-100 text-red-700 px-2 py-1.5 rounded-lg flex items-center gap-1" title="Absent(e)"><XCircle size={10}/> {absent}</span>
                                        <span className="bg-slate-200 text-slate-500 px-2 py-1.5 rounded-lg flex items-center gap-1" title="Non répondu"><HelpCircle size={10}/> {noRep}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Gérer les séances (Vue Liste condensée) */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                    <h3 className="font-black text-[10px] uppercase mb-4 tracking-widest text-slate-400">Gérer les séances (Liste)</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {[...upcomingSessions, ...pastSessions].map(s => (
                            <div key={s.id} className={`flex justify-between items-center p-3 rounded-xl border ${s.isCancelled ? 'bg-slate-100 border-slate-200' : 'bg-white border-slate-100'}`}>
                                <div className="flex-1">
                                  <span className={`text-[10px] font-bold block ${s.isCancelled ? 'line-through text-slate-400' : ''}`}>{s.date}</span>
                                  <span className="text-[9px] uppercase text-slate-400">{s.type}</span>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => setEditingSession(s)} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><Edit3 size={14}/></button>
                                  <button onClick={() => toggleCancelSession(s.id, s.isCancelled)} className={`p-2 rounded-lg ${s.isCancelled ? 'text-green-600 bg-green-50' : 'text-orange-500 bg-orange-50'}`}>{s.isCancelled ? <Check size={14}/> : <Ban size={14}/>}</button>
                                  <button onClick={() => deleteSession(s.id)} className="text-red-500 bg-red-50 p-2 rounded-lg"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Membres */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                    <h3 className="font-black text-[10px] uppercase mb-4 text-red-600 tracking-widest">Gestion Groupe</h3>
                    <div className="flex gap-2 mb-4">
                        <input value={newAthleteName} onChange={e => setNewAthleteName(e.target.value)} 
                               className="flex-grow p-3 bg-slate-50 rounded-xl text-sm font-bold border-0 outline-none" placeholder="Prénom Nom"/>
                        <button onClick={addAthlete} className="bg-red-600 text-white p-3 rounded-xl"><Plus size={20}/></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {athletes.filter(a => a.name).sort((a,b) => a.name.localeCompare(b.name)).map(a => (
                            <div key={a.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-[10px] font-black uppercase italic">
                                <span className="truncate">{a.name}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setEditingAthlete(a)} className="text-slate-300 hover:text-blue-500 p-1"><Edit3 size={12}/></button>
                                    <button onClick={() => deleteAthlete(a.id)} className="text-slate-300 hover:text-red-600 p-1"><Trash2 size={12}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <button onClick={() => setIsAdminAuthenticated(false)} className="w-full text-slate-300 font-black text-[10px] uppercase py-4">Déconnexion</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL SÉANCE */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-black uppercase text-red-600 text-xs tracking-widest text-center mb-4">Modifier la séance</h3>
            <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Date</label>
                <input type="date" value={editingSession.date} onChange={e => setEditingSession({...editingSession, date: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 outline-none text-sm"/>
            </div>
            <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Heure</label>
                    <input type="text" value={editingSession.time} onChange={e => setEditingSession({...editingSession, time: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 outline-none text-sm"/>
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Lieu</label>
                    <input type="text" value={editingSession.location} onChange={e => setEditingSession({...editingSession, location: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 outline-none text-sm"/>
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Type</label>
                <input type="text" value={editingSession.type} onChange={e => setEditingSession({...editingSession, type: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 outline-none text-sm"/>
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Description</label>
                <textarea value={editingSession.description} onChange={e => setEditingSession({...editingSession, description: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-sm h-24 border-0 outline-none italic"/>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={updateSession} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[10px]">Enregistrer</button>
              <button onClick={() => setEditingSession(null)} className="flex-1 bg-slate-100 py-3 rounded-xl font-black uppercase text-[10px] text-slate-500">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ATHLÈTE */}
      {editingAthlete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-black uppercase text-red-600 text-xs tracking-widest text-center mb-4">Corriger le nom</h3>
            <div className="space-y-1">
                <input type="text" value={editingAthlete.name} onChange={e => setEditingAthlete({...editingAthlete, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 outline-none text-sm text-center"/>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={updateAthlete} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[10px]">Sauvegarder</button>
              <button onClick={() => setEditingAthlete(null)} className="flex-1 bg-slate-100 py-3 rounded-xl font-black uppercase text-[10px] text-slate-500">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* BARRE PROFIL EN BAS */}
      {currentUserProfile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-4 shadow-2xl z-40 border border-white/10">
          <span className="text-[10px] font-black uppercase italic tracking-wider">{currentUserProfile.name}</span>
          <button onClick={() => { localStorage.removeItem('sgs_user_profile'); setCurrentUserProfile(null); setView('profiles'); }} className="text-white/30 hover:text-white transition-colors"><LogOut size={14}/></button>
        </div>
      )}
    </div>
  );
}

// COMPOSANT CARTE SÉANCE
function SessionCard({ s, athletes, attendanceData, currentUserProfile, saveAttendance, formatDate, isAdminAuthenticated, setEditingSession }) {
  const validAthletes = athletes.filter(ath => ath.name);
  const totalAthletes = validAthletes.length;
  
  const attendants = validAthletes.filter(ath => attendanceData[s.id]?.[ath.id] === 'present');
  const absentees = validAthletes.filter(ath => attendanceData[s.id]?.[ath.id] === 'absent');
  
  const noResponseCount = totalAthletes - attendants.length - absentees.length;

  const myStatus = currentUserProfile ? attendanceData[s.id]?.[currentUserProfile.id] : null;
  const isCancelled = s.isCancelled === true; 
  
  const needsResponse = currentUserProfile && !myStatus && !isCancelled;
  const typeStr = (s.type || '').toLowerCase();
  const isSpecialEvent = typeStr.includes('course') || typeStr.includes('événement') || typeStr.includes('evenement') || typeStr.includes('compét');

  return (
    <div className={`relative p-6 rounded-[2.5rem] border-l-[8px] transition-all mb-4 overflow-hidden
      ${isCancelled ? 'bg-slate-100 border-slate-300 grayscale opacity-80' : 
        needsResponse ? 'bg-slate-200 border-slate-400 opacity-90' : 
        isSpecialEvent ? 'bg-gradient-to-br from-amber-50 to-white border-amber-500 shadow-md' : 
        'bg-white border-red-600 shadow-sm'}
      ${myStatus === 'present' && !isCancelled ? '!border-green-500 ring-2 ring-green-100' : ''}
      ${myStatus === 'absent' && !isCancelled ? '!border-red-400' : ''}
    `}>
      
      {isCancelled && (
        <div className="absolute top-0 right-0 bg-slate-800 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">
          Annulé
        </div>
      )}

      <div className="flex justify-between items-start mb-2 relative z-0">
        <div>
          <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block mb-2
            ${isCancelled || needsResponse ? 'bg-slate-300 text-slate-600' : 
              isSpecialEvent ? 'bg-amber-100 text-amber-700' : 
              'bg-red-50 text-red-600'}
          `}>
            {s.type}
          </span>
          <h3 className={`text-xl font-black leading-tight capitalize ${isCancelled ? 'line-through decoration-red-600 decoration-2 text-slate-500' : 'text-slate-900'}`}>
            {formatDate(s.date)}
          </h3>
        </div>
        
        {/* --- NOUVEAU : BOUTON D'ÉDITION POUR LE COACH --- */}
        <div className="flex items-center gap-2">
          {isAdminAuthenticated && (
            <button onClick={() => setEditingSession(s)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors shadow-sm">
              <Edit3 size={14}/>
            </button>
          )}
          <div className="bg-slate-100 px-3 py-1.5 rounded-2xl text-[10px] font-black text-slate-700">{s.time}</div>
        </div>
      </div>

      <p className="text-slate-500 text-[11px] font-bold mb-4 uppercase flex items-center gap-1 mt-1">📍 {s.location}</p>
      
      {!isCancelled && (
        <div className={`p-4 rounded-3xl text-sm font-medium mb-5 border italic
          ${needsResponse ? 'bg-slate-100 border-slate-300 text-slate-500' : 
            isSpecialEvent ? 'bg-amber-50/50 border-amber-100 text-amber-900' : 
            'bg-slate-50 border-slate-100 text-slate-700'}
        `}>
          {s.description || "Pas de détails."}
        </div>
      )}

      {/* --- STATUT DES PRÉSENCES --- */}
      {!isCancelled && (
        <div className={`space-y-4 mb-5 border-t pt-4 
          ${needsResponse ? 'border-slate-300' : isSpecialEvent ? 'border-amber-100' : 'border-slate-100'}`}>
            
            {/* COMPTEURS GLOBAUX */}
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex gap-4">
                    <span className="text-green-600 flex items-center gap-1"><Check size={12}/> {attendants.length} Présent(s)</span>
                    <span className="text-red-500 flex items-center gap-1"><XCircle size={12}/> {absentees.length} Absent(s)</span>
                </div>
                <span className="flex items-center gap-1 text-slate-400"><HelpCircle size={12}/> {noResponseCount} Non rep.</span>
            </div>

            {/* LISTE DES PRÉSENTS */}
            <div>
                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    <Users size={12} className={needsResponse ? 'text-slate-400' : 'text-green-600'}/> Ils viennent :
                </div>
                <div className="flex flex-wrap gap-1 min-h-[10px]">
                    {attendants.length > 0 ? (
                        attendants.map(a => <span key={a.id} className="text-[8px] bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-tight border border-green-100">{a.name}</span>)
                    ) : (
                        <span className="text-[8px] text-slate-400 italic font-bold">Personne n'a encore confirmé.</span>
                    )}
                </div>
            </div>

            {/* LISTE DES ABSENTS */}
            {absentees.length > 0 && (
                <div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-3">
                        <UserMinus size={12} className={needsResponse ? 'text-slate-400' : 'text-red-400'}/> Ils ne viennent pas :
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {absentees.map(a => <span key={a.id} className="text-[8px] bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-tight border border-red-100">{a.name}</span>)}
                    </div>
                </div>
            )}
        </div>
      )}

      {currentUserProfile && !isCancelled ? (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={() => saveAttendance(s.id, 'present')} 
            className={`py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 
            ${myStatus === 'present' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-white border-2 border-slate-100 text-slate-400 hover:bg-green-50 hover:border-green-100 hover:text-green-600'}`}>
            <Check size={14}/> Je viens
          </button>
          <button onClick={() => saveAttendance(s.id, 'absent')} 
            className={`py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95
            ${myStatus === 'absent' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white border-2 border-slate-100 text-slate-400 hover:bg-red-50 hover:border-red-100 hover:text-red-600'}`}>
            <XCircle size={14}/> Absent
          </button>
        </div>
      ) : isCancelled && (
        <div className="text-center py-2 text-[10px] font-black uppercase text-slate-400 italic bg-slate-200/50 rounded-xl">
          Pas d'entraînement
        </div>
      )}
    </div>
  );
}