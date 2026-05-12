import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';

export default function FamilyPage({ user }) {
  const [userData, setUserData] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // États pour les formulaires
  const [newFamilyName, setNewFamilyName] = useState('');
  const [joinFamilyId, setJoinFamilyId] = useState('');

  // Charger les données de l'utilisateur et de sa famille
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // 1. On récupère le profil de l'utilisateur
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const uData = userSnap.data();
        setUserData(uData);
        
        // 2. Si l'utilisateur a une famille, on récupère les infos de la famille
        if (uData.familyId) {
          const familyRef = doc(db, 'families', uData.familyId);
          const familySnap = await getDoc(familyRef);
          if (familySnap.exists()) {
            setFamilyData({ id: familySnap.id, ...familySnap.data() });
          }
        }
      } else {
        // Initialiser le document utilisateur s'il n'existe pas encore
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          familyId: null
        });
        setUserData({ displayName: user.displayName, email: user.email, familyId: null });
      }
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Fonction pour CRÉER une nouvelle famille
  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) return;
    
    try {
      // Créer le document dans la collection 'families'
      const familyRef = await addDoc(collection(db, 'families'), {
        name: newFamilyName,
        adminId: user.uid,
        members: [user.uid], // Le créateur est le premier membre
        pendingRequests: []
      });

      // Mettre à jour l'utilisateur avec l'ID de sa nouvelle famille
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { familyId: familyRef.id });

      // Mettre à jour l'état local pour re-rendre l'interface
      setUserData({ ...userData, familyId: familyRef.id });
      setFamilyData({ name: newFamilyName, adminId: user.uid, members: [user.uid], pendingRequests: [] });
    } catch (error) {
      console.error("Erreur lors de la création :", error);
    }
  };

  // Fonction pour DEMANDER À REJOINDRE une famille
  const handleJoinRequest = async () => {
    if (!joinFamilyId.trim()) return;
    
    try {
      const familyRef = doc(db, 'families', joinFamilyId);
      // On ajoute l'UID de l'utilisateur dans le tableau 'pendingRequests' de la famille
      await updateDoc(familyRef, {
        pendingRequests: arrayUnion(user.uid)
      });
      alert("Demande envoyée à l'administrateur de la famille !");
      setJoinFamilyId('');
    } catch (error) {
      console.error("Erreur lors de la demande :", error);
      alert("Erreur. Vérifiez l'ID de la famille.");
    }
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;

  return (
    <div className="p-6 max-w-md mx-auto space-y-8 pt-20">
      <h1 className="text-3xl font-black text-slate-800 text-center mb-8">Espace Famille</h1>

      {/* CAS 1 : L'UTILISATEUR A DÉJÀ UNE FAMILLE */}
      {userData?.familyId && familyData ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-xl font-bold text-indigo-600">{familyData.name}</h2>
          <p className="text-sm text-slate-500">ID de la famille (à partager) : <span className="font-mono bg-slate-100 p-1 rounded">{familyData.id}</span></p>
          
          <div className="pt-4">
            <h3 className="font-bold text-slate-700 mb-2">Membres ({familyData.members.length})</h3>
            {/* Ici on afficherait idéalement les noms des membres en faisant une requête sur la table users avec les IDs */}
            <ul className="text-sm text-slate-600 space-y-1">
              {familyData.members.map(uid => (
                <li key={uid}>{uid === user.uid ? "Moi" : uid}</li>
              ))}
            </ul>
          </div>

          {/* Affichage des demandes en attente si l'utilisateur est l'admin */}
          {familyData.adminId === user.uid && familyData.pendingRequests?.length > 0 && (
            <div className="pt-4 border-t border-slate-100 mt-4">
              <h3 className="font-bold text-amber-600 mb-2">Demandes en attente</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                {familyData.pendingRequests.map(uid => (
                  <li key={uid} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <span className="truncate w-32">{uid}</span>
                    <button className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold">Accepter</button>
                    {/* Pour "Accepter", il faut une fonction qui retire l'UID de pendingRequests, l'ajoute à members, et met à jour le familyId de l'utilisateur concerné */}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        
        /* CAS 2 : L'UTILISATEUR N'A PAS DE FAMILLE */
        <div className="space-y-8">
          
          {/* Créer une famille */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Créer une nouvelle famille</h2>
            <input 
              type="text" 
              placeholder="Nom de la famille" 
              value={newFamilyName}
              onChange={(e) => setNewFamilyName(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              onClick={handleCreateFamily}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Créer la famille
            </button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">OU</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Rejoindre une famille */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Rejoindre une famille existante</h2>
            <input 
              type="text" 
              placeholder="ID de la famille" 
              value={joinFamilyId}
              onChange={(e) => setJoinFamilyId(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
            />
            <button 
              onClick={handleJoinRequest}
              className="w-full py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Envoyer une demande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}