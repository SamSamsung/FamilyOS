import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Link as LinkIcon, Plus, Trash2, ExternalLink, TrendingUp, Sparkles } from 'lucide-react';

export default function TrackerPage({ user }) {
  const [url, setUrl] = useState('');
  const [trackers, setTrackers] = useState([]);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Récupérer le familyId de l'utilisateur
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setFamilyId(snap.data().familyId);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // 2. Écouter les produits suivis par la famille
  useEffect(() => {
    if (!familyId) return;

    const q = query(collection(db, 'price_trackers'), where('familyId', '==', familyId));
    const unsub = onSnapshot(q, (snap) => {
      const docs = [];
      snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
      setTrackers(docs);
    });
    return () => unsub();
  }, [familyId]);

  const handleAddTracker = async (e) => {
    e.preventDefault();
    if (!url.trim() || !familyId) return;

    try {
      await addDoc(collection(db, 'price_trackers'), {
        url: url.trim(),
        familyId: familyId,
        addedBy: user.uid,
        createdAt: serverTimestamp(),
        currentPrice: null, // Sera rempli par le bot plus tard
        lowestPrice: null,
        priceHistory: []
      });
      setUrl('');
    } catch (error) {
      console.error("Erreur ajout tracker:", error);
    }
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'price_trackers', id));
  };

  if (!familyId && !loading) return <div className="p-10 text-center pt-40 text-slate-400">Rejoignez une famille pour utiliser le bot...</div>;

  return (
    <div className="p-6 max-w-md mx-auto space-y-8 pt-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-800 flex items-center justify-center gap-3">
          <TrendingUp className="text-rose-500" size={32} /> Bot Prix
        </h1>
        <p className="text-slate-500 font-medium">Collez un lien, on surveille le prix.</p>
      </div>

      {/* FORMULAIRE D'AJOUT */}
      <form onSubmit={handleAddTracker} className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50 space-y-4">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Lien du produit</label>
          <div className="relative">
            <input 
              type="url" 
              placeholder="https://www.amazon.fr/..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-rose-500 outline-none transition-all pr-12"
              required
            />
            <LinkIcon className="absolute right-4 top-4 text-slate-300" size={20} />
          </div>
        </div>
        <button 
          type="submit"
          className="w-full py-4 bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-100 hover:bg-rose-600 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={20} /> Suivre ce produit
        </button>
      </form>

      {/* LISTE DES PRODUITS */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Produits suivis ({trackers.length})</h2>
        {trackers.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center text-slate-400">
            Aucun produit en surveillance.
          </div>
        ) : (
          trackers.map(tracker => (
            <div key={tracker.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-slate-400 truncate mb-1">{tracker.url}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Sparkles size={12} /> En attente du bot...
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={tracker.url} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors">
                  <ExternalLink size={18} />
                </a>
                <button onClick={() => handleDelete(tracker.id)} className="p-3 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-100 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}