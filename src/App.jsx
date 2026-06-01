import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, PiggyBank, LogIn, Sparkles, Users, User, ChefHat } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from './firebase'; // AJOUT : on importe 'db'
import { doc, setDoc } from 'firebase/firestore'; // AJOUT : fonctions firestore
import logo from './assets/full-logo.png';


import TrackerPage from './pages/TrackerPage';
import ProfilePage from './pages/ProfilePage';
import FamilyPage from './pages/FamilyPage';
import Dashboard from './pages/dashboard';
import Services from './pages/services';
import Recipes from './pages/recipes';

// --- COMPOSANT LOGIN ---
const LoginScreen = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erreur de connexion", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col items-center space-y-8">
        <img src={logo} alt="Logo" className="h-32 w-auto object-contain mix-blend-multiply" />
        <div>
          <h2 className="text-2xl font-black text-slate-800">MyFamilyOS</h2>
          <p className="text-slate-500 mt-2 font-medium">L'intendance familiale simplifiée.</p>
        </div>
        <button 
          onClick={handleLogin}
          className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
        >
          <LogIn size={20} />
          Continuer avec Google
        </button>
      </div>
    </div>
  );
};

// --- NAVIGATION DU BAS ---
const NavLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={`flex flex-col items-center gap-1 transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span>{label}</span>
    </Link>
  );
};

// --- APP PRINCIPALE ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On passe la fonction en 'async' pour pouvoir utiliser 'await setDoc'
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // AJOUT : On crée/met à jour le profil dans la collection 'users' à la racine
        try {
          const userRef = doc(db, 'users', u.uid);
          await setDoc(userRef, {
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            lastSeen: new Date()
          }, { merge: true }); // Crucial : merge garde le familyId intact s'il existe
          
          setUser(u);
        } catch (error) {
          console.error("Erreur Firestore lors du login:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="fixed top-6 right-6 z-50 flex gap-3">
        <Link 
          to="/famille" 
          className="bg-white p-3 rounded-full shadow-md text-slate-600 hover:text-indigo-600 hover:shadow-lg transition-all flex items-center justify-center border border-slate-100"
        >
          <Users size={22} />
        </Link>
        <Link 
          to="/profil" 
          className="bg-white p-3 rounded-full shadow-md text-slate-600 hover:text-indigo-600 hover:shadow-lg transition-all flex items-center justify-center border border-slate-100"
        >
          <User size={22} />
        </Link>
      </div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/services" element={<Services />} />
        <Route path="/famille" element={<FamilyPage user={user} />} />
        <Route path="/profil" element={<ProfilePage user={user} />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/courses" element={<div className="p-10 text-center text-slate-400">Page Courses...</div>} />
        <Route path="/planning" element={<div className="p-10 text-center text-slate-400">Page Planning...</div>} />
        <Route path="/tracker" element={<TrackerPage user={user} />} />
      </Routes>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 py-3 px-6 flex justify-around items-center z-50 text-[10px] font-bold">
        <NavLink to="/" icon={Home} label="Accueil" />
        <NavLink to="/services" icon={Sparkles} label="Services" />
        <NavLink to="/courses" icon={ShoppingCart} label="Courses" />
        <NavLink to="/planning" icon={Calendar} label="Agenda" />
        <NavLink to="/recipes" icon={ChefHat} label="Recipes" />
      </nav>
    </div>
  );
}