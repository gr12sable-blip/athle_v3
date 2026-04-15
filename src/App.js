import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
import {
  Trash2,
  LogOut,
  Plus,
  Check,
  XCircle,
  Ban,
  History,
  Calendar,
  Edit3,
  Users,
  UserMinus,
  HelpCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Activity,
  Bandage,
  Flame,
  X,
} from "lucide-react";

// ==========================================
// 1. INJECTION DU DESIGN (Rouge SGS)
// ==========================================
if (typeof document !== "undefined") {
  const script = document.createElement("script");
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
  appId: "1:794846952754:web:23fac2106a95a68bacab2b",
};

const CLUB_ID = "dream-team-athle-official-v1";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("planning");
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [commentsData, setCommentsData] = useState({});
  const [globalStatuses, setGlobalStatuses] = useState({});

  const [currentUserProfile, setCurrentUserProfile] = useState(() => {
    const saved = localStorage.getItem("sgs_user_profile");
    return saved ? JSON.parse(saved) : null;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [newAthleteName, setNewAthleteName] = useState("");
  const [editingSession, setEditingSession] = useState(null);
  const [editingAthlete, setEditingAthlete] = useState(null);

  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState({
    type: "blessure",
    text: "",
  });

  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error("Erreur Auth:", err));
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (
      !loading &&
      !currentUserProfile &&
      view !== "admin" &&
      athletes.length > 0
    ) {
      setView("profiles");
    }
  }, [loading, currentUserProfile, view, athletes.length]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubSessions = onSnapshot(
      collection(db, "artifacts", CLUB_ID, "public", "data", "sessions"),
      (snap) => {
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );

    const unsubMembers = onSnapshot(
      collection(db, "artifacts", CLUB_ID, "public", "data", "members"),
      (snap) => {
        setAthletes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubAttendance = onSnapshot(
      collection(db, "artifacts", CLUB_ID, "public", "data", "attendance"),
      (snap) => {
        const attMap = {};
        snap.docs.forEach((d) => {
          attMap[d.id] = d.data();
        });
        setAttendanceData(attMap);
      }
    );

    const unsubComments = onSnapshot(
      collection(db, "artifacts", CLUB_ID, "public", "data", "comments"),
      (snap) => {
        const commMap = {};
        snap.docs.forEach((d) => {
          commMap[d.id] = d.data();
        });
        setCommentsData(commMap);
      }
    );

    const unsubStatuses = onSnapshot(
      collection(db, "artifacts", CLUB_ID, "public", "data", "statuses"),
      (snap) => {
        const statMap = {};
        snap.docs.forEach((d) => {
          statMap[d.id] = d.data();
        });
        setGlobalStatuses(statMap);
      }
    );

    return () => {
      unsubSessions();
      unsubMembers();
      unsubAttendance();
      unsubComments();
      unsubStatuses();
    };
  }, [user]);

  const saveProfile = (athlete) => {
    setCurrentUserProfile(athlete);
    localStorage.setItem("sgs_user_profile", JSON.stringify(athlete));
    setView("planning");
  };

  const saveComment = async (sessId, text) => {
    if (!currentUserProfile) return;
    const ref = doc(
      db,
      "artifacts",
      CLUB_ID,
      "public",
      "data",
      "comments",
      String(sessId)
    );
    if (!text || !text.trim()) {
      await setDoc(
        ref,
        { [currentUserProfile.id]: deleteField() },
        { merge: true }
      );
    } else {
      await setDoc(
        ref,
        { [currentUserProfile.id]: text.trim() },
        { merge: true }
      );
    }
  };

  const handleImport = async () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split("\n");
    for (const [i, line] of lines.entries()) {
      const [date, time, type, location, desc] = line
        .split(/[;,]/)
        .map((p) => p?.trim());
      if (!date) continue;
      const id = `sess_${date.replace(/[^0-9]/g, "")}_${Date.now()}_${i}`;
      await setDoc(
        doc(db, "artifacts", CLUB_ID, "public", "data", "sessions", id),
        {
          date,
          time: time || "18:30",
          type: type || "Entraînement",
          location: location || "Stade",
          description: desc || "",
          isCancelled: false,
        }
      );
    }
    setCsvInput("");
    alert("Séances publiées !");
  };

  const updateSession = async () => {
    if (!editingSession) return;
    await setDoc(
      doc(
        db,
        "artifacts",
        CLUB_ID,
        "public",
        "data",
        "sessions",
        editingSession.id
      ),
      editingSession,
      { merge: true }
    );
    setEditingSession(null);
  };

  const updateAthlete = async () => {
    if (!editingAthlete || !editingAthlete.name.trim()) return;
    await setDoc(
      doc(
        db,
        "artifacts",
        CLUB_ID,
        "public",
        "data",
        "members",
        editingAthlete.id
      ),
      { name: editingAthlete.name },
      { merge: true }
    );
    setEditingAthlete(null);
  };

  const addAthlete = async () => {
    if (!newAthleteName.trim()) return;
    await setDoc(
      doc(
        db,
        "artifacts",
        CLUB_ID,
        "public",
        "data",
        "members",
        `ath_${Date.now()}`
      ),
      { name: newAthleteName }
    );
    setNewAthleteName("");
  };

  const deleteAthlete = async (id) => {
    if (window.confirm("Supprimer ce membre ?"))
      await deleteDoc(
        doc(db, "artifacts", CLUB_ID, "public", "data", "members", id)
      );
  };

  const saveAttendance = async (sessId, status) => {
    if (!currentUserProfile) return;
    const currentStatus = attendanceData[sessId]?.[currentUserProfile.id];
    const newStatus = currentStatus === status ? deleteField() : status;
    await setDoc(
      doc(
        db,
        "artifacts",
        CLUB_ID,
        "public",
        "data",
        "attendance",
        String(sessId)
      ),
      { [currentUserProfile.id]: newStatus },
      { merge: true }
    );
  };

  const saveGlobalStatus = async () => {
    if (!currentUserProfile) return;
    const ref = doc(
      db,
      "artifacts",
      CLUB_ID,
      "public",
      "data",
      "statuses",
      currentUserProfile.id
    );
    await setDoc(ref, {
      type: statusInput.type,
      text: statusInput.text.trim() || "",
      updatedAt: Date.now(),
    });
    setEditingStatus(false);
  };

  const removeGlobalStatus = async () => {
    if (!currentUserProfile) return;
    await deleteDoc(
      doc(
        db,
        "artifacts",
        CLUB_ID,
        "public",
        "data",
        "statuses",
        currentUserProfile.id
      )
    );
    setEditingStatus(false);
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr.replace(/-/g, "/"));
      return date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    } catch {
      return dateStr;
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = sessions
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastSessions = sessions
    .filter((s) => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeStatuses = Object.entries(globalStatuses)
    .filter(([id, data]) => athletes.find((a) => a.id === id))
    .map(([id, data]) => ({
      id,
      name: athletes.find((a) => a.id === id).name,
      ...data,
    }));

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-red-600 animate-pulse">
        SGS ATHLÉ CHARGEMENT...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans text-slate-900">
      <header className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg text-white font-black italic shadow-md text-xs">
              SGS
            </div>
            <h1 className="font-black italic tracking-tighter uppercase text-sm">
              ATHLÉ
            </h1>
          </div>
          <nav className="flex bg-slate-100 p-1 rounded-xl text-[10px] font-black">
            <button
              onClick={() => setView("planning")}
              className={`px-4 py-2 rounded-lg transition-all ${
                view === "planning"
                  ? "bg-white shadow-sm text-red-600"
                  : "text-slate-400"
              }`}
            >
              PLANNING
            </button>
            <button
              onClick={() => setView("admin")}
              className={`px-4 py-2 rounded-lg transition-all ${
                view === "admin"
                  ? "bg-white shadow-sm text-red-600"
                  : "text-slate-400"
              }`}
            >
              COACH
            </button>
          </nav>
        </div>

        {activeStatuses.length > 0 && (
          <div className="bg-slate-900 border-t border-slate-800 p-3 overflow-x-auto whitespace-nowrap flex gap-3 hide-scrollbar shadow-inner">
            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 mr-2 tracking-widest">
              <Activity size={12} /> Actu Groupe
            </div>
            {activeStatuses.map((s) => (
              <div
                key={s.id}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border
                ${
                  s.type === "blessure"
                    ? "bg-red-950/50 text-red-400 border-red-900/50"
                    : "bg-indigo-950/50 text-indigo-300 border-indigo-900/50"
                }
              `}
              >
                {s.type === "blessure" ? (
                  <Bandage size={12} />
                ) : (
                  <Flame size={12} />
                )}
                <span>
                  {s.name}
                  {s.text && (
                    <span className="font-medium normal-case text-slate-300">
                      {" "}
                      : {s.text}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-xl mx-auto p-4 pt-6">
        {view === "planning" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-[10px] font-black uppercase text-red-600 mb-4 flex items-center gap-2">
                <Calendar size={14} /> Prochaines séances
              </h2>
              {upcomingSessions.length === 0 && (
                <p className="text-sm text-slate-400 italic">
                  Aucune séance prévue.
                </p>
              )}
              <div className="space-y-4">
                {upcomingSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    s={s}
                    athletes={athletes}
                    attendanceData={attendanceData}
                    commentsData={commentsData}
                    currentUserProfile={currentUserProfile}
                    saveAttendance={saveAttendance}
                    saveComment={saveComment}
                    formatDate={formatDate}
                    isAdminAuthenticated={isAdminAuthenticated}
                    setEditingSession={setEditingSession}
                  />
                ))}
              </div>
            </section>

            {pastSessions.length > 0 && (
              <section className="mt-8 border-t pt-8">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <h2 className="text-[10px] font-black uppercase flex items-center gap-2">
                    <History size={14} /> Historique des séances (
                    {pastSessions.length})
                  </h2>
                  {showHistory ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {showHistory && (
                  <div className="space-y-4 mt-4 opacity-70 grayscale-[0.3] animate-in slide-in-from-top-4 duration-300">
                    {pastSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        s={s}
                        athletes={athletes}
                        attendanceData={attendanceData}
                        commentsData={commentsData}
                        currentUserProfile={currentUserProfile}
                        saveAttendance={saveAttendance}
                        saveComment={saveComment}
                        formatDate={formatDate}
                        isAdminAuthenticated={isAdminAuthenticated}
                        setEditingSession={setEditingSession}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {view === "profiles" && (
          <div className="max-w-md mx-auto text-center py-10">
            <h2 className="text-3xl font-black italic mb-2 uppercase text-red-600">
              Bienvenue
            </h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10">
              Qui se connecte ?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {athletes
                .filter((a) => a.name)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => saveProfile(a)}
                    className="bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-red-600 font-bold shadow-sm transition-all text-sm uppercase italic"
                  >
                    {a.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {view === "admin" && (
          <div className="space-y-6">
            {!isAdminAuthenticated ? (
              <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center border mt-10">
                <h3 className="font-black text-sm uppercase mb-6">
                  Accès Entraîneur
                </h3>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  className="w-full p-4 rounded-xl bg-slate-50 border-0 text-center font-bold mb-4 outline-none focus:ring-2 ring-red-600"
                  onChange={(e) =>
                    e.target.value === "Coach" && setIsAdminAuthenticated(true)
                  }
                />
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-red-600 tracking-widest">
                    Importer Séances (CSV)
                  </h3>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="w-full h-24 p-4 bg-slate-50 rounded-xl text-[10px] mb-4 border-0 outline-none font-mono"
                    placeholder="2026-02-12;18:30;Seuil;Stade;Détails..."
                  />
                  <button
                    onClick={handleImport}
                    className="w-full py-4 bg-red-600 text-white rounded-xl font-black uppercase text-[10px]"
                  >
                    Publier le planning
                  </button>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-red-600 tracking-widest flex items-center gap-2">
                    <BarChart2 size={14} /> Bilan des Présences
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {athletes
                      .filter((a) => a.name)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((a) => {
                        let present = 0,
                          absent = 0,
                          noRep = 0;
                        sessions
                          .filter((s) => !s.isCancelled)
                          .forEach((s) => {
                            const status = attendanceData[s.id]?.[a.id];
                            if (status === "present") present++;
                            else if (status === "absent") absent++;
                            else noRep++;
                          });
                        return (
                          <div
                            key={a.id}
                            className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
                          >
                            <span className="text-[10px] font-black uppercase italic truncate max-w-[120px]">
                              {a.name}
                            </span>
                            <div className="flex gap-1 text-[9px] font-bold">
                              <span className="bg-green-100 text-green-700 px-2 py-1.5 rounded-lg flex items-center gap-1">
                                <Check size={10} /> {present}
                              </span>
                              <span className="bg-red-100 text-red-700 px-2 py-1.5 rounded-lg flex items-center gap-1">
                                <XCircle size={10} /> {absent}
                              </span>
                              <span className="bg-slate-200 text-slate-500 px-2 py-1.5 rounded-lg flex items-center gap-1">
                                <HelpCircle size={10} /> {noRep}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-red-600 tracking-widest">
                    Gestion Groupe
                  </h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      className="flex-grow p-3 bg-slate-50 rounded-xl text-sm font-bold border-0 outline-none"
                      placeholder="Prénom Nom"
                    />
                    <button
                      onClick={addAthlete}
                      className="bg-red-600 text-white p-3 rounded-xl"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {athletes
                      .filter((a) => a.name)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg text-[10px] font-black uppercase italic"
                        >
                          <span className="truncate">{a.name}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingAthlete(a)}
                              className="text-slate-300 hover:text-blue-500 p-1"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => deleteAthlete(a.id)}
                              className="text-slate-300 hover:text-red-600 p-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <button
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="w-full text-slate-300 font-black text-[10px] uppercase py-4"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALES SÉANCE / ATHLÈTE */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-black uppercase text-red-600 text-xs tracking-widest text-center mb-4">
              Modifier la séance
            </h3>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">
                Date
              </label>
              <input
                type="date"
                value={editingSession.date}
                onChange={(e) =>
                  setEditingSession({ ...editingSession, date: e.target.value })
                }
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">
                  Heure
                </label>
                <input
                  type="text"
                  value={editingSession.time}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      time: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">
                  Lieu
                </label>
                <input
                  type="text"
                  value={editingSession.location}
                  onChange={(e) =>
                    setEditingSession({
                      ...editingSession,
                      location: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">
                Type
              </label>
              <input
                type="text"
                value={editingSession.type}
                onChange={(e) =>
                  setEditingSession({ ...editingSession, type: e.target.value })
                }
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">
                Description
              </label>
              <textarea
                value={editingSession.description}
                onChange={(e) =>
                  setEditingSession({
                    ...editingSession,
                    description: e.target.value,
                  })
                }
                className="w-full p-3 bg-slate-50 rounded-xl text-sm h-24 italic"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={updateSession}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[10px]"
              >
                Enregistrer
              </button>
              <button
                onClick={() => setEditingSession(null)}
                className="flex-1 bg-slate-100 py-3 rounded-xl font-black uppercase text-[10px] text-slate-500"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAthlete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-black uppercase text-red-600 text-xs tracking-widest text-center mb-4">
              Corriger le nom
            </h3>
            <div className="space-y-1">
              <input
                type="text"
                value={editingAthlete.name}
                onChange={(e) =>
                  setEditingAthlete({ ...editingAthlete, name: e.target.value })
                }
                className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 text-sm text-center"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={updateAthlete}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[10px]"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => setEditingAthlete(null)}
                className="flex-1 bg-slate-100 py-3 rounded-xl font-black uppercase text-[10px] text-slate-500"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {editingStatus && currentUserProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-black uppercase text-red-600 text-xs tracking-widest text-center mb-4">
              Mon Statut Actuel
            </h3>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() =>
                  setStatusInput({ ...statusInput, type: "blessure" })
                }
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  statusInput.type === "blessure"
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-slate-100 text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Bandage size={20} />{" "}
                <span className="text-[10px] font-black uppercase">
                  A l'infirmerie
                </span>
              </button>
              <button
                onClick={() =>
                  setStatusInput({ ...statusInput, type: "prepa" })
                }
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  statusInput.type === "prepa"
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                    : "border-slate-100 text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Flame size={20} />{" "}
                <span className="text-[10px] font-black uppercase">
                  En prépa
                </span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">
                Précision (Facultatif)
              </label>
              <input
                type="text"
                value={statusInput.text}
                onChange={(e) =>
                  setStatusInput({ ...statusInput, text: e.target.value })
                }
                placeholder="ex: Entorse, Marathon de Paris..."
                className="w-full p-3 bg-slate-50 rounded-xl font-bold border-0 outline-none text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={saveGlobalStatus}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px]"
              >
                Valider
              </button>
              <button
                onClick={() => setEditingStatus(false)}
                className="bg-slate-100 p-3 rounded-xl text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            {globalStatuses[currentUserProfile.id] && (
              <button
                onClick={removeGlobalStatus}
                className="w-full mt-2 py-3 rounded-xl font-black uppercase text-[10px] text-red-500 bg-red-50"
              >
                Je suis de retour / En forme
              </button>
            )}
          </div>
        </div>
      )}

      {currentUserProfile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-4 shadow-2xl z-40 border border-white/10 w-max max-w-[90vw]">
          <span className="text-[10px] font-black uppercase italic tracking-wider truncate">
            {currentUserProfile.name}
          </span>
          <div className="w-px h-4 bg-white/20"></div>
          <button
            onClick={() => {
              const current = globalStatuses[currentUserProfile.id];
              setStatusInput(
                current
                  ? { type: current.type, text: current.text }
                  : { type: "blessure", text: "" }
              );
              setEditingStatus(true);
            }}
            className="text-[10px] font-bold text-slate-300 hover:text-white uppercase flex items-center gap-1"
          >
            <Activity size={12} /> Mon Statut
          </button>
          <div className="w-px h-4 bg-white/20"></div>
          <button
            onClick={() => {
              localStorage.removeItem("sgs_user_profile");
              setCurrentUserProfile(null);
              setView("profiles");
            }}
            className="text-white/30 hover:text-white transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  s,
  athletes,
  attendanceData,
  commentsData,
  currentUserProfile,
  saveAttendance,
  saveComment,
  formatDate,
  isAdminAuthenticated,
  setEditingSession,
}) {
  const validAthletes = athletes.filter((ath) => ath.name);
  const attendants = validAthletes.filter(
    (ath) => attendanceData[s.id]?.[ath.id] === "present"
  );
  const absentees = validAthletes.filter(
    (ath) => attendanceData[s.id]?.[ath.id] === "absent"
  );
  const myStatus = currentUserProfile
    ? attendanceData[s.id]?.[currentUserProfile.id]
    : null;
  const isCancelled = s.isCancelled === true;

  const isSpecial = /course|compétition|trail|événement|marathon|cross/i.test(
    s.type || ""
  );

  const sessionComments = commentsData[s.id] || {};
  const commenters = Object.keys(sessionComments).filter(
    (id) => sessionComments[id]
  );
  const [localComment, setLocalComment] = useState("");

  useEffect(() => {
    if (currentUserProfile)
      setLocalComment(commentsData[s.id]?.[currentUserProfile.id] || "");
  }, [commentsData, s.id, currentUserProfile]);

  // LOGIQUE DES COULEURS (AVEC GRIS SI PAS DE REPONSE)
  let cardStyle = "bg-white border-slate-300 shadow-inner"; // Par défaut (Gris si pas de réponse)
  if (isCancelled) {
    cardStyle = "bg-slate-100 border-slate-300 opacity-80";
  } else if (isSpecial) {
    cardStyle = "bg-amber-50 border-amber-400 ring-2 ring-amber-100/50";
  } else if (myStatus === "present") {
    cardStyle = "bg-white border-green-500 ring-4 ring-green-50";
  } else if (myStatus === "absent") {
    cardStyle = "bg-white border-red-500 ring-4 ring-red-50";
  } else {
    // Cas où l'athlète n'a pas répondu et c'est un entraînement normal
    cardStyle = "bg-slate-50 border-slate-300 shadow-sm opacity-90";
  }

  return (
    <div
      className={`relative p-6 rounded-[2.5rem] border-l-[8px] transition-all mb-4 overflow-hidden ${cardStyle}`}
    >
      {isCancelled && (
        <div className="absolute top-0 right-0 bg-slate-800 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">
          Annulé
        </div>
      )}

      {/* Badge "A Répondre" si pas de réponse */}
      {!isCancelled && !myStatus && (
        <div className="absolute top-0 right-0 bg-slate-400 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10 animate-pulse">
          À valider
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 pr-2">
          <span
            className={`text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block mb-2
            ${
              isCancelled
                ? "bg-slate-300 text-slate-600"
                : isSpecial
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-600"
            }
          `}
          >
            {s.type}
          </span>
          <h3
            className={`text-xl font-black leading-tight capitalize ${
              isCancelled ? "line-through text-slate-500" : "text-slate-900"
            }`}
          >
            {formatDate(s.date)}
          </h3>
        </div>
        <div className="bg-slate-100 px-3 py-1.5 rounded-2xl text-[12px] font-black text-slate-700">
          {s.time}
        </div>
      </div>

      <p className="text-slate-500 text-[11px] font-bold mb-4 uppercase mt-1">
        📍 {s.location}
      </p>

      {!isCancelled && (
        <div
          className={`p-4 rounded-3xl text-sm font-medium mb-5 border italic
            ${
              isSpecial
                ? "bg-white/50 border-amber-200 text-amber-900"
                : "bg-slate-50 border-slate-100 text-slate-700"
            }
        `}
        >
          {s.description || "Pas de détails."}
        </div>
      )}

      {!isCancelled && (
        <div className="space-y-4 mb-5 border-t border-slate-100 pt-4">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex gap-4">
              <span className="text-green-600 flex items-center gap-1">
                <Check size={12} /> {attendants.length} Présents
              </span>
              <span className="text-red-500 flex items-center gap-1">
                <XCircle size={12} /> {absentees.length} Absents
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              <Users size={12} className="text-green-600" /> Ils viennent :
            </div>
            <div className="flex flex-wrap gap-1">
              {attendants.map((a) => (
                <span
                  key={a.id}
                  className="text-[8px] bg-green-50 text-green-700 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-tight border border-green-100"
                >
                  {a.name}
                </span>
              ))}
              {attendants.length === 0 && (
                <span className="text-[8px] text-slate-400 italic">
                  Personne encore.
                </span>
              )}
            </div>
          </div>

          {absentees.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 mt-3">
                <UserMinus size={12} className="text-red-400" /> Absents :
              </div>
              <div className="flex flex-wrap gap-1">
                {absentees.map((a) => (
                  <span
                    key={a.id}
                    className="text-[8px] bg-red-50 text-red-500 px-2.5 py-1.5 rounded-lg font-black uppercase tracking-tight border border-red-100"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {commenters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <MessageSquare size={12} /> Notes :
              </div>
              {commenters.map((athId) => {
                const athName =
                  athletes.find((a) => a.id === athId)?.name || "Athlète";
                return (
                  <div
                    key={athId}
                    className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[10px]"
                  >
                    <span className="font-black italic uppercase text-slate-700">
                      {athName} :{" "}
                    </span>
                    <span className="font-medium text-slate-600">
                      {sessionComments[athId]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {currentUserProfile && !isCancelled ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => saveAttendance(s.id, "present")}
              className={`py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${
                myStatus === "present"
                  ? "bg-green-600 text-white shadow-lg shadow-green-200"
                  : "bg-white border-2 border-slate-100 text-slate-400 hover:bg-green-50 hover:text-green-600"
              }`}
            >
              <Check size={14} /> Je viens
            </button>
            <button
              onClick={() => saveAttendance(s.id, "absent")}
              className={`py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${
                myStatus === "absent"
                  ? "bg-red-600 text-white shadow-lg shadow-red-200"
                  : "bg-white border-2 border-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <XCircle size={14} /> Absent
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={localComment}
              onChange={(e) => setLocalComment(e.target.value)}
              placeholder="Précision (facultatif)..."
              className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
            />
            <button
              onClick={() => saveComment(s.id, localComment)}
              className="bg-slate-100 text-slate-500 px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200"
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        isCancelled && (
          <div className="text-center py-2 text-[10px] font-black uppercase text-slate-400 italic bg-slate-200/50 rounded-xl">
            Séance annulée
          </div>
        )
      )}
    </div>
  );
}
