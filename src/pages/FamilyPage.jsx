import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  doc, getDoc, updateDoc, arrayUnion, collection, addDoc, onSnapshot 
} from 'firebase/firestore';
import { Users, UserPlus, Check, X, Shield, Share2 } from 'lucide-react';

export default function FamilyPage({ user }) {
  const [userData, setUserData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [namesMap, setNamesMap] = useState({}); // Pour stocker UID -> displayName
  const [loading, setLoading] = useState(true);
  
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinFamilyId, setJoinFamilyId] = useState('');

  // 1. Écouter le profil utilisateur et la famille
  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        setUserData(uData);
        
        if (uData.familyId) {
          const familyRef = doc(db, 'families', uData.familyId);
          onSnapshot(familyRef, (fSnap) => {
            if (fSnap.exists()) {
              setFamilyData({ id: fSnap.id, ...fSnap.data() });
            }
          });
        } else {
          setFamilyData(null);
        }
      }
      setLoading(false);
    });

    return () => unsubUser();
  }, [user]);

  // 2. Charger les pseudos des membres et des demandes en attente
  useEffect(() => {
    if (!familyData) return;
    
    const allUids = [...familyData.members, ...(familyData.pendingRequests || [])];
    
    allUids.forEach(async (uid) => {
      // On ne recharge que si on n'a pas déjà le nom en mémoire
      if (!namesMap[uid]) {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setNamesMap(prev => ({ 
            ...prev, 
            [uid]: userSnap.data().displayName || "Utilisateur sans nom" 
          }));
        }
      }
    });
  }, [familyData]);

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;
    try {
      const familyRef = await addDoc(collection(db, 'families'), {
        name: newFamilyName,
        adminId: user.uid,
        members: [user.uid],
        pendingRequests: [],
        createdAt: new Date()
      });

      await updateDoc(doc(db, 'users', user.uid), { 
        familyId: familyRef.id 
      });
    } catch (error) {
      console.error("Erreur creation:", error);
    }
  };

  const handleJoinRequest = async () => {
    if (!joinFamilyId.trim()) return;
    try {
      const familyRef = doc(db, 'families', joinFamilyId);
      const snap = await getDoc(familyRef);
      if (!snap.exists()) {
        alert("ID de famille introuvable.");
        return;
      }
      await updateDoc(familyRef, {
        pendingRequests: arrayUnion(user.uid)
      });
      alert("Demande envoyée !");
      setJoinFamilyId('');
    } catch (error) {
      alert("Erreur lors de l'envoi.");
    }
  };

  const handleAcceptMember = async (pendingUid) => {
    try {
      const familyRef = doc(db, 'families', userData.familyId);
      await updateDoc(familyRef, {
        members: arrayUnion(pendingUid),
        pendingRequests: familyData.pendingRequests.filter(id => id !== pendingUid)
      });
      await updateDoc(doc(db, 'users', pendingUid), { 
        familyId: userData.familyId 
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectMember = async (pendingUid) => {
    try {
      const familyRef = doc(db, 'families', userData.familyId);
      await updateDoc(familyRef, {
        pendingRequests: familyData.pendingRequests.filter(id => id !== pendingUid)
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="p-6 max-w-md mx-auto space-y-8 pt-20">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-slate-800">Ma Famille</h1>
        <p className="text-slate-500">Gérez votre foyer et les membres</p>
      </div>

      {userData?.familyId && familyData ? (
        <div className="space-y-6 pb-20">
          {/* CARTE INFO FAMILLE */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                <Users size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">{familyData.name}</h2>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Famille</p>
                <p className="font-mono text-sm font-bold text-slate-700">{familyData.id}</p>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(familyData.id);
                  alert("ID copié !");
                }}
                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* LISTE DES MEMBRES */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50">
            <h3 className="font-bold text-slate-800 mb-4 ml-2">Membres</h3>
            <div className="space-y-3">
              {familyData.members.map(uid => (
                <div key={uid} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <Shield size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">
                      {namesMap[uid] || "Chargement..."}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      {uid === familyData.adminId ? "Administrateur" : "Membre"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DEMANDES EN ATTENTE */}
          {familyData.adminId === user.uid && familyData.pendingRequests?.length > 0 && (
            <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 shadow-xl shadow-amber-100/20">
              <h3 className="font-bold text-amber-800 mb-4 ml-2">Demandes en attente</h3>
              <div className="space-y-3">
                {familyData.pendingRequests.map(uid => (
                  <div key={uid} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        {namesMap[uid] || "Chargement..."}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{uid.substring(0, 8)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAcceptMember(uid)}
                        className="p-2 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-100 active:scale-90 transition-all"
                      >
                        <Check size={18} />
                      </button>
                      <button 
                        onClick={() => handleRejectMember(uid)}
                        className="p-2 bg-slate-100 text-slate-400 rounded-xl active:scale-90 transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ... reste de ton code pour créer/rejoindre ... */
        <div className="space-y-6">
          {/* Bloc Créer */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50">
            <h2 className="text-lg font-bold mb-4 ml-2">Créer un foyer</h2>
            <input 
              type="text" 
              placeholder="Nom de la famille" 
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
            <button 
              onClick={handleCreateFamily}
              className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Créer maintenant
            </button>
          </div>

          {/* Bloc Rejoindre */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50">
            <h2 className="text-lg font-bold mb-4 ml-2">Rejoindre un foyer</h2>
            <input 
              type="text" 
              placeholder="Code de la famille" 
              value={joinFamilyId}
              onChange={(e) => setJoinFamilyId(e.target.value)}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
            />
            <button 
              onClick={handleJoinRequest}
              className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all"
            >
              Envoyer la demande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}