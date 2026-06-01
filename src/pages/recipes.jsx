import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, ChefHat, Clock, Users, ChevronLeft, Edit3, Trash2, X, Image as ImageIcon 
} from 'lucide-react';
import { doc, setDoc, onSnapshot, query, collection, deleteDoc, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function Recipes() {
  const user = auth.currentUser;
  const [familyId, setFamilyId] = useState(null);
  const [userName, setUserName] = useState('');
  
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // États de navigation
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    prepTime: '30 min',
    servings: '4',
    ingredients: '',
    instructions: ''
  });

  // 1. Récupération du profil utilisateur (familyId + nom)
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setFamilyId(snap.data().familyId);
        setUserName(snap.data().displayName || 'Un membre');
      }
    });
    return () => unsub();
  }, [user]);

  // 2. Écoute des recettes de la famille
  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'families', familyId, 'recipes'));
    const unsub = onSnapshot(q, (snapshot) => {
      const rec = [];
      snapshot.forEach(doc => {
        rec.push({ id: doc.id, ...doc.data() });
      });
      // Tri de la plus récente à la plus ancienne
      rec.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setRecipes(rec);
    });
    return () => unsub();
  }, [familyId]);

  // Filtrage par recherche
  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return recipes;
    return recipes.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [recipes, searchQuery]);

  // Gestion du formulaire
  const handleSave = async () => {
    if (!formData.title.trim() || !familyId) return;

    const recipeData = {
      ...formData,
      creatorId: user.uid,
      creatorName: userName,
      updatedAt: new Date()
    };

    try {
      if (formData.id) {
        // Mise à jour
        await setDoc(doc(db, 'families', familyId, 'recipes', formData.id), recipeData, { merge: true });
      } else {
        // Création
        recipeData.createdAt = new Date();
        await addDoc(collection(db, 'families', familyId, 'recipes'), recipeData);
      }
      setIsEditing(false);
      setViewingRecipe(null);
      resetForm();
    } catch (error) {
      console.error("Erreur de sauvegarde:", error);
    }
  };

  const handleDelete = async (recipeId) => {
    if (!window.confirm("Supprimer cette recette définitivement ?")) return;
    try {
      await deleteDoc(doc(db, 'families', familyId, 'recipes', recipeId));
      setViewingRecipe(null);
    } catch (error) {
      console.error("Erreur de suppression:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '', imageUrl: '', prepTime: '30 min', servings: '4', ingredients: '', instructions: ''
    });
  };

  const openEdit = (recipe = null) => {
    if (recipe) {
      setFormData(recipe);
    } else {
      resetForm();
    }
    setIsEditing(true);
  };

  if (!familyId) return <div className="p-10 text-center pt-40 text-slate-400">Veuillez rejoindre une famille...</div>;

  return (
    <div className="p-6 max-w-md mx-auto space-y-6 pt-8 pb-32">
      
      {/* HEADER & RECHERCHE */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-800">Recettes</h1>
            <p className="text-slate-500 font-medium">Les secrets de famille 👨‍🍳</p>
          </div>
          <button 
            onClick={() => openEdit()}
            className="w-12 h-12 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Chercher un plat..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-4 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
          />
        </div>
      </div>

      {/* LISTE DES RECETTES (Cartes horizontales) */}
      <div className="space-y-4">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <ChefHat size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Aucune recette trouvée</p>
          </div>
        ) : (
          filteredRecipes.map(recipe => (
            <div 
              key={recipe.id}
              onClick={() => setViewingRecipe(recipe)}
              className="bg-white p-3 rounded-[1.5rem] shadow-sm border border-slate-100 flex gap-4 items-center active:scale-95 transition-transform cursor-pointer"
            >
              {/* Image rectangulaire / carrée */}
              <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-slate-300" />
                )}
              </div>
              
              {/* Infos */}
              <div className="flex-1 pr-2">
                <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{recipe.title}</h3>
                <div className="flex flex-col gap-1 text-xs font-medium text-slate-500">
                  <div className="flex items-center gap-1">
                    <ChefHat size={14} className="text-indigo-500"/>
                    <span>Par {recipe.creatorName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock size={12}/> {recipe.prepTime}</span>
                    <span className="flex items-center gap-1"><Users size={12}/> {recipe.servings} pers.</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL : AFFICHAGE PLEIN ÉCRAN */}
      {viewingRecipe && !isEditing && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto animate-in slide-in-from-bottom-10 flex flex-col">
          {/* Header Image */}
          <div className="relative h-72 bg-slate-100 flex-shrink-0">
            {viewingRecipe.imageUrl ? (
              <img src={viewingRecipe.imageUrl} alt={viewingRecipe.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><ImageIcon size={64} className="text-slate-300"/></div>
            )}
            
            {/* Boutons d'action superposés */}
            <div className="absolute top-6 w-full px-6 flex justify-between items-center">
              <button onClick={() => setViewingRecipe(null)} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-slate-700">
                <ChevronLeft size={24} />
              </button>
              
              {/* Seul le créateur peut modifier/supprimer */}
              {viewingRecipe.creatorId === user.uid && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(viewingRecipe)} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-slate-700">
                    <Edit3 size={20} />
                  </button>
                  <button onClick={() => handleDelete(viewingRecipe.id)} className="w-12 h-12 bg-red-500/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg text-white">
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contenu */}
          <div className="px-6 py-8 flex-1 -mt-8 bg-white rounded-t-[2.5rem] relative">
            <h1 className="text-3xl font-black text-slate-800 mb-6 leading-tight">{viewingRecipe.title}</h1>
            
            <div className="flex gap-4 mb-8">
              <div className="flex-1 bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center text-slate-700">
                <Clock size={20} className="text-indigo-500 mb-1"/>
                <span className="font-bold text-sm">{viewingRecipe.prepTime}</span>
              </div>
              <div className="flex-1 bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center text-slate-700">
                <Users size={20} className="text-indigo-500 mb-1"/>
                <span className="font-bold text-sm">{viewingRecipe.servings} pers.</span>
              </div>
            </div>

            <div className="space-y-8 pb-10">
              <section>
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  Ingrédients
                </h3>
                <ul className="space-y-3">
                  {viewingRecipe.ingredients.split('\n').filter(i => i.trim()).map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-slate-600 font-medium">
                      <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                      {ing}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                  Préparation
                </h3>
                <div className="space-y-4">
                  {viewingRecipe.instructions.split('\n').filter(i => i.trim()).map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black flex-shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-slate-600 font-medium pt-1 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL : CRÉATION / ÉDITION (Template) */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
          <div className="bg-white sticky top-0 px-6 py-4 flex justify-between items-center shadow-sm z-10 border-b border-slate-100">
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-700">
              <X size={28} />
            </button>
            <h2 className="font-black text-lg">{formData.id ? 'Modifier' : 'Nouvelle recette'}</h2>
            <button onClick={handleSave} className="text-indigo-600 font-black">
              Enregistrer
            </button>
          </div>

          <div className="p-6 space-y-6 max-w-md mx-auto pb-20">
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Nom du plat</label>
              <input 
                type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl font-bold text-slate-800 outline-none focus:border-indigo-500"
                placeholder="Ex: Le tiramisu de Mamie"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Lien de l'image (URL)</label>
              <input 
                type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-sm outline-none focus:border-indigo-500"
                placeholder="https://..."
              />
              {formData.imageUrl && (
                <div className="mt-2 h-32 rounded-xl overflow-hidden bg-slate-100">
                  <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Aperçu" onError={(e) => e.target.style.display='none'} />
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Temps</label>
                <input 
                  type="text" value={formData.prepTime} onChange={e => setFormData({...formData, prepTime: e.target.value})}
                  className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-center font-bold outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Personnes</label>
                <input 
                  type="text" value={formData.servings} onChange={e => setFormData({...formData, servings: e.target.value})}
                  className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-center font-bold outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Ingrédients (1 par ligne)</label>
              <textarea 
                value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl min-h-[120px] font-medium text-sm outline-none focus:border-indigo-500 resize-none"
                placeholder="250g de mascarpone&#10;3 oeufs&#10;100g de sucre..."
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">Étapes (1 par ligne)</label>
              <textarea 
                value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})}
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl min-h-[200px] font-medium text-sm outline-none focus:border-indigo-500 resize-none"
                placeholder="Séparer les blancs des jaunes...&#10;Mélanger le sucre et les jaunes...&#10;Monter les blancs en neige..."
              />
            </div>

            <button onClick={handleSave} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
              Sauvegarder la recette
            </button>
          </div>
        </div>
      )}
    </div>
  );
}