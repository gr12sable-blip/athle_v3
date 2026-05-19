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
  Trophy,
  Timer,
  Share2,
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
  const [recordsData, setRecordsData] = useState({});

  const [currentUserProfile, setCurrentUserProfile] = useState(() => {
    const saved = localStorage.getItem("sgs_user_profile");
    return saved ? JSON.parse(saved) : null;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [csvInput, setCsvInput] = useState("");
  const [newAthleteName, setNewAthleteName] = useState("");
  const [editingSession, setEditingSession] = useState(null);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [editingPR, setEditingPR] = useState(null);

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

    const unsubRecords = onSnapshot(
      collection(db, "artifacts", CLUB_ID, "public", "data", "records"),
      (snap) => {
        const recMap = {};
        snap.docs.forEach((d) => {
          recMap[d.id] = d.data();
        });
        setRecordsData(recMap);
      }
    );

    return () => {
      unsubSessions();
      unsubMembers();
      unsubAttendance();
      unsubComments();
      unsubStatuses();
      unsubRecords();
    };
  }, [user]);

  useEffect(() => {
    if (currentUserProfile && globalStatuses[currentUserProfile.id]) {
      setStatusInput({
        type: globalStatuses[currentUserProfile.id].type || "blessure",
        text: globalStatuses[currentUserProfile.id].text || "",
      });
    } else {
      setStatusInput({ type: "blessure", text: "" });
    }
  }, [editingStatus, globalStatuses, currentUserProfile]);

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

  const toggleCancelSession = async (s) => {
    await setDoc(
      doc(db, "artifacts", CLUB_ID, "public", "data", "sessions", s.id),
      { isCancelled: !s.isCancelled },
      { merge: true }
    );
  };

  const deleteSession = async (id) => {
    if (window.confirm("Supprimer définitivement cette séance ?")) {
      await deleteDoc(
        doc(db, "artifacts", CLUB_ID, "public", "data", "sessions", id)
      );
    }
  };

  const savePR = async () => {
    if (!currentUserProfile || !editingPR) return;
    await setDoc(
      doc(
        db,
        "artifacts",
        CLUB_ID,
        "public",
        "data",
        "records",
        currentUserProfile.id
      ),
      editingPR
    );
    setEditingPR(null);
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
    .filter(([id]) => athletes.find((a) => a.id === id))
    .map(([id, data]) => ({
      id,
      name: athletes.find((a) => a.id === id).name,
      ...data,
    }));

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-red-600 animate-pulse uppercase">
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
          <nav className="flex bg-slate-100 p-1 rounded-xl text-[9px] font-black">
            <button
              onClick={() => setView("planning")}
              className={`px-3 py-2 rounded-lg transition-all ${
                view === "planning"
                  ? "bg-white shadow-sm text-red-600"
                  : "text-slate-400"
              }`}
            >
              PLANNING
            </button>
            <button
              onClick={() => setView("records")}
              className={`px-3 py-2 rounded-lg transition-all ${
                view === "records"
                  ? "bg-white shadow-sm text-amber-600"
                  : "text-slate-400"
              }`}
            >
              RECORDS
            </button>
            <button
              onClick={() => setView("admin")}
              className={`px-3 py-2 rounded-lg transition-all ${
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
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border ${
                  s.type === "blessure"
                    ? "bg-red-950/50 text-red-400 border-red-900/50"
                    : "bg-indigo-950/50 text-indigo-300 border-indigo-900/50"
                }`}
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
                    toggleCancelSession={toggleCancelSession}
                    deleteSession={deleteSession}
                  />
                ))}
              </div>
            </section>

            {pastSessions.length > 0 && (
              <section className="mt-8 border-t pt-8">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500"
                >
                  <h2 className="text-[10px] font-black uppercase flex items-center gap-2">
                    <History size={14} /> Historique ({pastSessions.length})
                  </h2>
                  {showHistory ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {showHistory && (
                  <div className="space-y-4 mt-4 opacity-70 grayscale-[0.3]">
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
                        toggleCancelSession={toggleCancelSession}
                        deleteSession={deleteSession}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {view === "records" && (
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] shadow-sm border border-amber-100 overflow-hidden">
              <div className="bg-amber-500 p-6 text-white">
                <h2 className="font-black italic uppercase text-xl flex items-center gap-2">
                  <Trophy size={24} /> Hall of Fame
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  Records Personnels du Groupe
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-4 text-[9px] font-black uppercase text-slate-400">
                        Athlète
                      </th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-center">
                        5 km
                      </th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-center">
                        10 km
                      </th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-center">
                        Semi
                      </th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-400 text-center">
                        Marathon
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {athletes
                      .filter((a) => a.name)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((ath) => (
                        <tr
                          key={ath.id}
                          className={`border-b border-slate-50 hover:bg-slate-50/50 ${
                            currentUserProfile?.id === ath.id
                              ? "bg-amber-50/50"
                              : ""
                          }`}
                        >
                          <td className="p-4 font-black italic text-[11px] uppercase text-red-600">
                            {ath.name}
                          </td>
                          <PRCell data={recordsData[ath.id]?.fiveK} />
                          <PRCell data={recordsData[ath.id]?.tenK} />
                          <PRCell data={recordsData[ath.id]?.half} />
                          <PRCell data={recordsData[ath.id]?.marathon} />
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            {currentUserProfile && (
              <button
                onClick={() =>
                  setEditingPR(recordsData[currentUserProfile.id] || {})
                }
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2"
              >
                <Timer size={16} /> Mettre à jour mes chronos
              </button>
            )}
          </div>
        )}

        {view === "profiles" && (
          <div className="max-w-md mx-auto text-center py-10">
            <h2 className="text-3xl font-black italic mb-2 uppercase text-red-600">
              Bienvenue
            </h2>
            <div className="grid grid-cols-2 gap-3 mt-10">
              {athletes
                .filter((a) => a.name)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((a) => (
                  <button
                    key={a.id}
                    onClick={() => saveProfile(a)}
                    className="bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-red-600 font-bold shadow-sm text-sm uppercase italic"
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
                  className="w-full p-4 rounded-xl bg-slate-50 border-0 text-center font-bold outline-none focus:ring-2 ring-red-600"
                  onChange={(e) =>
                    e.target.value === "Coach" && setIsAdminAuthenticated(true)
                  }
                />
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-red-100">
                  <h3 className="font-black text-[10px] uppercase mb-4 text-red-600">
                    Importer Séances (CSV)
                  </h3>
                  <textarea
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    className="w-full h-24 p-4 bg-slate-50 rounded-xl text-[10px] mb-4 outline-none font-mono"
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
                  <h3 className="font-black text-[10px] uppercase mb-4 text-red-600">
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
                </div>
                <button
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="w-full text-slate-300 font-black text-[10px] uppercase py-4 tracking-widest"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODALE ÉDITION STATUT */}
      {editingStatus && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-black uppercase text-slate-900 text-xs text-center mb-2">
              Mon Statut Actuel
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() =>
                  setStatusInput({ ...statusInput, type: "blessure" })
                }
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all ${
                  statusInput.type === "blessure"
                    ? "bg-red-600 text-white shadow"
                    : "text-slate-400"
                }`}
              >
                <Bandage size={12} /> Blessé
              </button>
              <button
                onClick={() =>
                  setStatusInput({ ...statusInput, type: "forme" })
                }
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all ${
                  statusInput.type === "forme"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400"
                }`}
              >
                <Flame size={12} /> En Forme
              </button>
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase ml-2">
                Précisions (Optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex: Mollet contracté, Reprise..."
                value={statusInput.text}
                onChange={(e) =>
                  setStatusInput({ ...statusInput, text: e.target.value })
                }
                className="w-full p-3 bg-slate-50 border-0 rounded-xl font-bold text-xs outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveGlobalStatus}
                className="flex-grow bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px]"
              >
                Valider
              </button>
              {globalStatuses[currentUserProfile?.id] && (
                <button
                  onClick={removeGlobalStatus}
                  className="bg-red-100 text-red-600 px-3 rounded-xl font-black uppercase text-[10px]"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setEditingStatus(false)}
                className="p-3 bg-slate-100 rounded-xl text-slate-500"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PR RECORDS */}
      {editingPR && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm p-6 rounded-[2rem] space-y-4 shadow-2xl animate-in zoom-in duration-200">
            <h3 className="font-black uppercase text-amber-600 text-xs text-center mb-4">
              Mes Records Personnels
            </h3>
            <div className="space-y-4">
              {["fiveK", "tenK", "half", "marathon"].map((dist) => (
                <div
                  key={dist}
                  className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl"
                >
                  <div className="col-span-2 text-[8px] font-black uppercase text-slate-400 mb-1">
                    {dist === "fiveK"
                      ? "5 KM"
                      : dist === "tenK"
                      ? "10 KM"
                      : dist === "half"
                      ? "SEMI"
                      : "MARATHON"}
                  </div>
                  <input
                    type="text"
                    placeholder="Temps (ex: 41:20)"
                    value={editingPR[dist]?.time || ""}
                    onChange={(e) =>
                      setEditingPR({
                        ...editingPR,
                        [dist]: {
                          ...(editingPR[dist] || {}),
                          time: e.target.value,
                        },
                      })
                    }
                    className="p-2 rounded-lg border-0 font-bold text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Date (Année)"
                    value={editingPR[dist]?.date || ""}
                    onChange={(e) =>
                      setEditingPR({
                        ...editingPR,
                        [dist]: {
                          ...(editingPR[dist] || {}),
                          date: e.target.value,
                        },
                      })
                    }
                    className="p-2 rounded-lg border-0 font-bold text-xs outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={savePR}
                className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black uppercase text-[10px]"
              >
                Sauvegarder
              </button>
              <button
                onClick={() => setEditingPR(null)}
                className="p-3 bg-slate-100 rounded-xl text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE ÉDITION SÉANCE */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-[2rem] space-y-4 shadow-2xl">
            <h3 className="font-black uppercase text-red-600 text-xs text-center mb-4">
              Modifier la séance
            </h3>
            <input
              type="date"
              value={editingSession.date}
              onChange={(e) =>
                setEditingSession({ ...editingSession, date: e.target.value })
              }
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
            />
            <input
              type="text"
              value={editingSession.type}
              onChange={(e) =>
                setEditingSession({ ...editingSession, type: e.target.value })
              }
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm"
              placeholder="Type (Course, Événement...)"
            />
            <textarea
              value={editingSession.description}
              onChange={(e) =>
                setEditingSession({
                  ...editingSession,
                  description: e.target.value,
                })
              }
              className="w-full p-3 bg-slate-50 rounded-xl text-sm h-24 italic"
              placeholder="Description"
            />
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

      {/* BARRE DE STATUT BAS */}
      {currentUserProfile && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-4 shadow-2xl z-40 border border-white/10 w-max max-w-[90vw]">
          <span className="text-[10px] font-black uppercase italic tracking-wider truncate">
            {currentUserProfile.name}
          </span>
          <button
            onClick={() => setEditingStatus(true)}
            className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1"
          >
            <Activity size={12} /> Statut
          </button>
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

// COMPOSANTS INTERNES
function PRCell({ data }) {
  return (
    <td className="p-4 text-center">
      <div className="flex flex-col">
        <span className="font-mono text-[11px] font-black text-slate-700 leading-none">
          {data?.time || "-"}
        </span>
        {data?.date && (
          <span className="text-[7px] font-bold text-slate-400 mt-1 uppercase">
            {data.date}
          </span>
        )}
      </div>
    </td>
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
  toggleCancelSession,
  deleteSession,
}) {
  const validAthletes = athletes.filter((ath) => ath.name);
  const attendants = validAthletes.filter(
    (ath) => attendanceData[s.id]?.[ath.id] === "present"
  );
  const absentees = validAthletes.filter(
    (ath) => attendanceData[s.id]?.[ath.id] === "absent"
  );
  const noReply = validAthletes.filter(
    (ath) => !attendanceData[s.id]?.[ath.id]
  );
  const myStatus = currentUserProfile
    ? attendanceData[s.id]?.[currentUserProfile.id]
    : null;
  const isCancelled = s.isCancelled === true;

  const typeLower = (s.type || "").toLowerCase();
  const isRace = /course|marathon|trail|cross|compétition/i.test(typeLower);
  const isEvent = /événement|evenement/i.test(typeLower);

  let cardStyle = "bg-white border-slate-300";
  if (isCancelled) cardStyle = "bg-slate-100 border-slate-300 opacity-80";
  else if (isRace)
    cardStyle = "bg-amber-50 border-amber-500 ring-4 ring-amber-100/50";
  else if (isEvent)
    cardStyle = "bg-purple-50 border-purple-500 ring-4 ring-purple-100/50";
  else if (myStatus === "present")
    cardStyle = "bg-white border-green-500 ring-4 ring-green-50";
  else if (myStatus === "absent")
    cardStyle = "bg-white border-red-500 ring-4 ring-red-50";

  // ==========================================
  // GÉNÉRATION MESSAGE WHATSAPP
  // ==========================================
  const APP_URL = "https://athle-v3.vercel.app/"; // ← remplace par ton URL Firebase

  const shareOnWhatsApp = () => {
    const presentNames = attendants.map((a) => a.name).join(", ") || "\u2014";
    const absentNames = absentees.map((a) => a.name).join(", ") || "\u2014";
    const noReplyNames = noReply.map((a) => a.name).join(", ") || "\u2014";

    const e = {
      run: "\uD83C\uDFC3",
      clock: "\uD83D\uDD61",
      pin: "\uD83D\uDCCD",
      muscle: "\uD83D\uDCAA",
      check: "\u2705",
      cross: "\u274C",
      question: "\u2753",
      point: "\uD83D\uDC49",
    };

    const text = `${e.run} *SGS ATHL\u00C9 \u2014 ${s.type} ${formatDate(
      s.date
    )}*
${e.clock} ${s.time} | ${e.pin} ${s.location}
${s.description ? `${e.muscle} ${s.description}\n` : ""}
${e.check} Pr\u00E9sents (${attendants.length}) : ${presentNames}
${e.cross} Absents (${absentees.length}) : ${absentNames}
${e.question} Sans r\u00E9ponse (${noReply.length}) : ${noReplyNames}

${e.point} R\u00E9pondez ici : ${APP_URL}`;

    const link = document.createElement("a");
    link.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`relative p-6 rounded-[2.5rem] border-l-[8px] transition-all mb-4 overflow-hidden shadow-sm ${cardStyle}`}
    >
      {isAdminAuthenticated && (
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          <button
            onClick={() => setEditingSession(s)}
            className="p-2 bg-white/90 shadow-sm rounded-full text-blue-600"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() => toggleCancelSession(s)}
            className="p-2 bg-white/90 shadow-sm rounded-full text-amber-600"
          >
            <Ban size={12} />
          </button>
          <button
            onClick={() => deleteSession(s.id)}
            className="p-2 bg-white/90 shadow-sm rounded-full text-red-600"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-2 pr-10">
        <div className="flex-1">
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg inline-block mb-2 ${
              isCancelled
                ? "bg-slate-300"
                : isRace
                ? "bg-amber-200"
                : isEvent
                ? "bg-purple-200"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {s.type}
          </span>
          <h3
            className={`text-xl font-black leading-tight capitalize ${
              isCancelled ? "line-through text-slate-500" : ""
            }`}
          >
            {formatDate(s.date)}
          </h3>
        </div>
        <div className="bg-slate-100 px-3 py-1 rounded-xl text-[11px] font-black text-slate-700">
          {s.time}
        </div>
      </div>

      <p className="text-slate-400 text-[10px] font-black uppercase mb-4 tracking-tighter italic">
        📍 {s.location}
      </p>
      {!isCancelled && (
        <div className="p-4 rounded-2xl bg-white/50 border border-white shadow-inner text-sm font-medium mb-5 italic text-slate-700">
          {s.description || "Pas de détails."}
        </div>
      )}

      <div className="space-y-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-[9px] font-black uppercase text-slate-400">
            <span className="text-green-600 flex items-center gap-1">
              <Check size={10} /> {attendants.length} Présents
            </span>
            <span className="text-red-500 flex items-center gap-1">
              <XCircle size={10} /> {absentees.length} Absents
            </span>
          </div>
          {/* BOUTON WHATSAPP */}
          {!isCancelled && (
            <button
              onClick={shareOnWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] text-white rounded-xl text-[9px] font-black uppercase tracking-wide shadow-sm active:scale-95 transition-transform"
            >
              <Share2 size={11} />
              WhatsApp
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {attendants.map((a) => (
            <span
              key={a.id}
              className="text-[8px] bg-green-50 text-green-700 px-2 py-1 rounded font-black uppercase border border-green-100 italic"
            >
              {a.name}
            </span>
          ))}
        </div>

        {absentees.length > 0 && (
          <div className="pt-2">
            <div className="text-[8px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
              <UserMinus size={10} /> Ils ne seront pas là :
            </div>
            <div className="flex flex-wrap gap-1">
              {absentees.map((a) => (
                <span
                  key={a.id}
                  className="text-[8px] bg-red-50 text-red-500 px-2 py-1 rounded font-black uppercase border border-red-100 italic"
                >
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {currentUserProfile && !isCancelled && (
        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
          <button
            onClick={() => saveAttendance(s.id, "present")}
            className={`py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 ${
              myStatus === "present"
                ? "bg-green-600 text-white"
                : "bg-white border text-slate-400"
            }`}
          >
            <Check size={14} /> Je viens
          </button>
          <button
            onClick={() => saveAttendance(s.id, "absent")}
            className={`py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 ${
              myStatus === "absent"
                ? "bg-red-600 text-white"
                : "bg-white border text-slate-400"
            }`}
          >
            <XCircle size={14} /> Absent
          </button>
        </div>
      )}
    </div>
  );
}
