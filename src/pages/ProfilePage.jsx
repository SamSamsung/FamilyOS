import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { LogOut, User, Save, CheckCircle } from 'lucide-react';

export default function ProfilePage({ user }) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setNickname(snap.data().displayName || '');
      }
      setLoading(false);
    };
    fetchUserData();
  }, [user]);

  const handleUpdateNickname = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: nickname
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur mise à jour pseudo:", error);
    }
    setSaving(false);
  };

  const handleLogout = () => {
    auth.signOut();
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;

  return (
    <div className="p-6 max-w-md mx-auto space-y-8 pt-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-800">Mon Compte</h1>
        <p className="text-slate-500">{user.email}</p>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 space-y-8">
        {/* SECTION PSEUDO */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-2">
            Mon Pseudo
          </label>
          <div className="relative">
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Ton pseudo..."
            />
          </div>
          <button 
            onClick={handleUpdateNickname}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
              success 
              ? 'bg-emerald-500 text-white' 
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
            }`}
          >
            {success ? <CheckCircle size={20} /> : <Save size={20} />}
            {saving ? 'Enregistrement...' : success ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>

        <div className="h-px bg-slate-100 w-full"></div>

        {/* SECTION DÉCONNEXION */}
        <div className="space-y-4">
          <p className="text-center text-sm text-slate-400 font-medium">
            Besoin de quitter l'application ?
          </p>
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-white border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut size={20} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}