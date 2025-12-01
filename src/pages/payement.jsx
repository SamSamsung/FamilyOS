import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Euro, 
  Clock, 
  Settings, 
  Trash2,
  User,
  CheckCircle,
  X
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query,
  deleteDoc
} from 'firebase/firestore';

// --- CONFIGURATION FIREBASE ---
// Note pour le déploiement Vercel : Remplacez les lignes ci-dessous par votre propre configuration
// const firebaseConfig = { apiKey: "...", authDomain: "...", ... };
const firebaseConfig = {
  apiKey: "AIzaSyDUzGiP6fCvUYdEhs8eCEjo8bzXR_FYU5c",
  authDomain: "payement-par.firebaseapp.com",
  projectId: "payement-par",
  storageBucket: "payement-par.firebasestorage.app",
  messagingSenderId: "187755197414",
  appId: "1:187755197414:web:ed7d1576d4c205eb9c1c27",
  measurementId: "G-4XSBPF2DXK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- COMPOSANTS UI ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm";
  const variants = {
    primary: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    ghost: "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

// --- LOGIQUE PRINCIPALE ---

export default function Payement() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // État de l'application - Démarrage Janvier 2026
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); 
  const [entries, setEntries] = useState({});
  const [hourlyRate, setHourlyRate] = useState(10); // 10€ par défaut
  const [selectedDate, setSelectedDate] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editHours, setEditHours] = useState(0);

  // 1. Authentification
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Chargement des données
  useEffect(() => {
    if (!user) return;

    // Charger les entrées d'heures
    const qEntries = query(collection(db, 'artifacts', appId, 'users', user.uid, 'housekeeping_entries'));
    const unsubEntries = onSnapshot(qEntries, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data().hours;
      });
      setEntries(data);
    }, (err) => console.error("Firestore Error:", err));

    // Charger les paramètres
    const docSettings = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config');
    const unsubSettings = onSnapshot(docSettings, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.hourlyRate) setHourlyRate(data.hourlyRate);
      }
    });

    return () => {
      unsubEntries();
      unsubSettings();
    };
  }, [user]);

  // --- ACTIONS ---

  const saveEntry = async () => {
    if (!selectedDate || !user) return;
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    const dateKey = localDate.toISOString().split('T')[0];
    
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'housekeeping_entries', dateKey);

    try {
      if (editHours > 0) {
        await setDoc(docRef, { hours: editHours, date: dateKey });
      } else {
        await deleteDoc(docRef);
      }
      setSelectedDate(null);
    } catch (e) {
      console.error("Save error", e);
    }
  };

  const saveRate = async (newRate) => {
    if (!user) return;
    setHourlyRate(newRate);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'config'), { 
        hourlyRate: newRate 
      }, { merge: true });
    } catch (e) {
      console.error("Settings save error", e);
    }
  };

  // --- CALCULS ---

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    // Ajuster pour que Lundi soit 0 (standard français)
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1; 
    return { days, firstDay: firstDayAdjusted };
  };

  const { days: totalDays, firstDay } = getDaysInMonth(currentDate);

  const monthEntries = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let totalHours = 0;
    
    Object.keys(entries).forEach(key => {
      const [y, m, d] = key.split('-').map(Number);
      if (y === year && m === month + 1) {
        totalHours += entries[key];
      }
    });
    
    return totalHours;
  }, [entries, currentDate]);

  const monthTotal = monthEntries * hourlyRate;

  // --- NAVIGATION ---

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // --- HELPERS AFFICHAGE ---
  
  // Fonction pour formater joliment l'heure (ex: 1.5 -> 1h30, 1.25 -> 1h15)
  const formatHoursFriendly = (val) => {
    if (val === 0) return "0h";
    const hours = Math.floor(val);
    const minutes = (val - hours) * 60;
    
    // Cas pile (1h, 2h)
    if (minutes === 0) return `${hours}h`;
    
    // Cas demi ou quart
    return `${hours}h${Math.round(minutes)}`;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-indigo-200 rounded-full"></div>
        <div className="text-indigo-400 font-medium">Chargement...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800 select-none">
      
      {/* HEADER SIMPLIFIÉ */}
      <header className="bg-white px-6 py-4 sticky top-0 z-10 border-b border-slate-100">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2.5 rounded-full text-indigo-600">
              <User size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-900">Agenda Ménage</h1>
              <p className="text-xs text-slate-500 font-medium">Année {currentDate.getFullYear()}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2.5 rounded-full transition-all duration-200 ${isSettingsOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
          >
            <Settings size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* REGLAGE TAUX HORAIRE */}
        {isSettingsOpen && (
          <div className="max-w-md mx-auto mt-4 p-5 bg-white rounded-2xl shadow-lg border border-slate-100 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center mb-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Tarif Horaire</label>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400"><X size={18}/></button>
            </div>
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl">
              <button onClick={() => saveRate(Math.max(0, hourlyRate - 1))} className="w-12 h-12 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-xl text-slate-600 active:scale-95 transition">-</button>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-800">{hourlyRate} €</span>
                <span className="text-xs text-slate-400 font-medium">de l'heure</span>
              </div>
              <button onClick={() => saveRate(hourlyRate + 1)} className="w-12 h-12 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-xl text-slate-600 active:scale-95 transition">+</button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* CARTE RESUME DU MOIS */}
        <Card className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white border-none shadow-indigo-200 shadow-xl relative overflow-hidden">
          {/* Cercles déco arrière plan */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-xl"></div>
          
          <div className="p-6 relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">À régler fin de mois</p>
                <h2 className="text-5xl font-black tracking-tight">{monthTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €</h2>
              </div>
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner">
                <Euro size={28} className="text-white" />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-indigo-900/30 py-2 px-3 rounded-lg backdrop-blur-sm border border-white/10">
                <Clock size={16} className="text-indigo-200" />
                <span className="font-bold">{formatHoursFriendly(monthEntries)}</span>
              </div>
              {hourlyRate !== 10 && (
                <div className="text-xs font-medium text-indigo-200 bg-indigo-900/30 py-2 px-3 rounded-lg border border-white/10">
                  Base: {hourlyRate}€/h
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* NAVIGATION MOIS */}
        <div className="flex items-center justify-between bg-white px-2 py-3 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={prevMonth} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700 transition">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-black text-slate-800 capitalize leading-none">
              {monthNames[currentDate.getMonth()]}
            </h2>
            <span className="text-xs font-bold text-slate-400">{currentDate.getFullYear()}</span>
          </div>
          <button onClick={nextMonth} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-700 transition">
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* CALENDRIER */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 mb-3">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] uppercase font-bold text-slate-400 py-1">
                {d}
              </div>
            ))}
          </div>
          
          {/* Grille des jours */}
          <div className="grid grid-cols-7 gap-2">
            {/* Cases vides début de mois */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Jours */}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
              const currentDayStr = String(day).padStart(2, '0');
              const dateKey = `${currentDate.getFullYear()}-${currentMonthStr}-${currentDayStr}`;
              
              const hours = entries[dateKey] || 0;
              const hasHours = hours > 0;
              
              const todayObj = new Date();
              const isToday = todayObj.getDate() === day && 
                             todayObj.getMonth() === currentDate.getMonth() && 
                             todayObj.getFullYear() === currentDate.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
                    setSelectedDate(d);
                    setEditHours(hours);
                  }}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200
                    ${hasHours 
                      ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700 shadow-sm' 
                      : 'bg-white border border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'}
                    ${isToday ? 'ring-2 ring-offset-2 ring-indigo-400 z-10' : ''}
                  `}
                >
                  <span className={`text-sm font-bold ${hasHours ? 'mb-[-2px]' : ''}`}>{day}</span>
                  {hasHours && (
                    <span className="text-[10px] font-extrabold bg-indigo-100 px-1.5 rounded-md text-indigo-800">
                       {/* MODIFICATION ICI: Affichage friendly (ex: 1h30) au lieu de décimal */}
                       {formatHoursFriendly(hours)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* MODAL EDITION */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
          {/* Backdrop avec flou */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto transition-opacity"
            onClick={() => setSelectedDate(null)}
          />

          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-10 duration-300 relative">
            
            {/* Barre de poignée pour mobile */}
            <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={() => setSelectedDate(null)}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black capitalize text-slate-800 leading-none">
                    {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                  </h3>
                  <p className="text-slate-500 font-medium mt-1">
                    {selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center mb-8 bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Durée de la prestation</span>
                
                <div className="flex items-center gap-6">
                  {/* BOUTON MOINS (0.25) */}
                  <button 
                    onClick={() => setEditHours(h => Math.max(0, h - 0.25))}
                    className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center text-3xl text-slate-400 hover:border-indigo-500 hover:text-indigo-500 active:scale-90 transition shadow-sm"
                  >
                    -
                  </button>
                  
                  {/* AFFICHAGE HEURE CENTRAL */}
                  <div className="w-28 text-center flex flex-col items-center justify-center">
                    {/* MODIFICATION ICI : Grand affichage en "1h30" */}
                    <span className="text-4xl font-black text-slate-800 tracking-tight">
                       {formatHoursFriendly(editHours)}
                    </span>
                    {/* Petit affichage en décimal dessous */}
                    <span className="text-xs text-slate-400 font-bold mt-1">
                       {editHours > 0 ? `(${editHours})` : ''}
                    </span>
                  </div>

                  {/* BOUTON PLUS (0.25) */}
                  <button 
                    onClick={() => setEditHours(h => h + 0.25)}
                    className="w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 flex items-center justify-center text-3xl hover:bg-indigo-700 active:scale-90 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={() => setSelectedDate(null)}>
                  Annuler
                </Button>
                <Button onClick={saveEntry} variant={editHours === 0 ? 'danger' : 'primary'}>
                  {editHours === 0 ? 'Effacer' : 'Valider'}
                  {editHours > 0 ? <CheckCircle size={18} /> : <Trash2 size={18} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
