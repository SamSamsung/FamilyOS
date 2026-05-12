import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Euro, Clock, Settings, Trash2, CheckCircle, X, Sparkles 
} from 'lucide-react';
import { doc, setDoc, onSnapshot, query, collection, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Tes composants UI d'origine
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm";
  const variants = {
    primary: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

export default function Services() {
  const user = auth.currentUser;
  const [familyId, setFamilyId] = useState(null);
  const [entries, setEntries] = useState({});
  const [hourlyRate, setHourlyRate] = useState(15);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [editHours, setEditHours] = useState(0);

  // 1. Récupération du familyId (Nécessaire pour le nouveau système)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setFamilyId(snap.data().familyId);
      }
    });
    return () => unsub();
  }, [user]);

  // 2. Chargement des données via familyId
  useEffect(() => {
    if (!familyId) return;

    const q = query(collection(db, 'families', familyId, 'housekeeping_entries'));
    const unsubEntries = onSnapshot(q, (snapshot) => {
      const data = {};
      snapshot.forEach(doc => { data[doc.id] = doc.data().hours; });
      setEntries(data);
    });

    const unsubSettings = onSnapshot(doc(db, 'families', familyId, 'settings', 'config'), (docSnap) => {
      if (docSnap.exists()) setHourlyRate(docSnap.data().hourlyRate);
    });

    return () => { unsubEntries(); unsubSettings(); };
  }, [familyId]);

  // Logique métier d'origine
  const formatHoursFriendly = (h) => {
    const mins = h * 60;
    if (mins < 60) return `${mins}min`;
    const fullHours = Math.floor(h);
    const remainingMins = Math.round((h - fullHours) * 60);
    return remainingMins > 0 ? `${fullHours}h${remainingMins}` : `${fullHours}h`;
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  }, [currentDate]);

  const monthTotalHours = useMemo(() => {
    return Object.entries(entries).reduce((acc, [date, hours]) => {
      const entryDate = new Date(date);
      if (entryDate.getMonth() === currentDate.getMonth() && entryDate.getFullYear() === currentDate.getFullYear()) {
        return acc + hours;
      }
      return acc;
    }, 0);
  }, [entries, currentDate]);

  const saveEntry = async () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const docRef = doc(db, 'families', familyId, 'housekeeping_entries', dateStr);
    
    if (editHours > 0) {
      await setDoc(docRef, { hours: editHours, updatedBy: user.uid, updatedAt: new Date() });
    } else {
      await deleteDoc(docRef);
    }
    setSelectedDate(null);
  };

  // Affichage si l'utilisateur n'est pas encore lié à une famille
  if (!familyId) return (
    <div className="p-10 text-center space-y-4 pt-40">
      <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-4">
        <Sparkles size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Famille requise</h2>
      <p className="text-slate-500">Créez ou rejoignez une famille dans l'onglet "Ma Famille" pour commencer.</p>
    </div>
  );

  return (
    <div className="p-6 max-w-md mx-auto space-y-6 pt-10 pb-32">
      {/* Ton Header d'origine */}
      <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest mb-1">Ménage • {currentDate.toLocaleDateString('fr-FR', {month: 'long'})}</p>
          <h2 className="text-4xl font-black mb-6">{(monthTotalHours * hourlyRate).toFixed(2)}€</h2>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-indigo-300"/>
              <span className="font-bold text-sm">{formatHoursFriendly(monthTotalHours)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Euro size={16} className="text-indigo-300"/>
              <span className="font-bold text-sm">{hourlyRate}€/h</span>
            </div>
          </div>
        </div>
        <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
      </div>

      {/* Sélecteur de mois */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-black text-slate-800 capitalize">
          {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100"><ChevronRight size={20}/></button>
        </div>
      </div>

      {/* Calendrier */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map(date => {
          const dateStr = date.toISOString().split('T')[0];
          const hours = entries[dateStr] || 0;
          return (
            <button
              key={dateStr}
              onClick={() => { setSelectedDate(date); setEditHours(hours); }}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${
                hours > 0 ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100 hover:border-indigo-200'
              }`}
            >
              <span className="text-[10px] font-black">{date.getDate()}</span>
              {hours > 0 && <span className="text-[10px] font-bold">{formatHoursFriendly(hours)}</span>}
            </button>
          );
        })}
      </div>

      {/* Modal Edition d'origine */}
      {selectedDate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white w-full rounded-t-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">{selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</h3>
              <button onClick={() => setSelectedDate(null)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20}/></button>
            </div>
            
            <div className="flex flex-col items-center mb-8 bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">DURÉE DU SERVICE</span>
              <div className="flex items-center gap-8">
                <button onClick={() => setEditHours(h => Math.max(0, h - 0.25))} className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400">-</button>
                <div className="w-24 text-center text-4xl font-black text-slate-800">{formatHoursFriendly(editHours)}</div>
                <button onClick={() => setEditHours(h => h + 0.25)} className="w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg flex items-center justify-center text-2xl font-bold">+</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="secondary" onClick={() => setSelectedDate(null)}>Annuler</Button>
              <Button onClick={saveEntry}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}