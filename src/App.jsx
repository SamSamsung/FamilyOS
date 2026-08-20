import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, PiggyBank, LogIn, Sparkles, Users, User, ChefHat } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
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
// Codes d'erreur qui signifient "la popup n'a pas pu s'ouvrir" : dans ce cas
// seulement, on retente en redirection (Zen, Firefox strict, Safari, in-app...).
const POPUP_UNAVAILABLE = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
];

// Erreurs que l'utilisateur provoque lui-même : on ne l'embête pas avec.
const USER_CANCELLED = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

const LoginScreen = ({ initialError }) => {
  // undefined = on n'a rien tenté depuis, on affiche l'erreur venue de la redirection.
  const [ownError, setOwnError] = useState(undefined);
  const [pending, setPending] = useState(false);
  const error = ownError === undefined ? initialError : ownError;

  const handleLogin = async () => {
    setOwnError(null);
    setPending(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return; // onAuthStateChanged prend le relais
    } catch (err) {
      console.error("Erreur de connexion (popup)", err);

      if (USER_CANCELLED.includes(err.code)) {
        setPending(false);
        return;
      }

      if (POPUP_UNAVAILABLE.includes(err.code)) {
        try {
          // On marque la tentative pour pouvoir détecter un retour "vide".
          sessionStorage.setItem('authRedirectPending', '1');
          await signInWithRedirect(auth, googleProvider);
          return; // la page part sur Google
        } catch (redirectErr) {
          console.error("Erreur de connexion (redirect)", redirectErr);
          sessionStorage.removeItem('authRedirectPending');
          setOwnError(`${redirectErr.code || 'erreur'} — ${redirectErr.message}`);
          setPending(false);
          return;
        }
      }

      setOwnError(`${err.code || 'erreur'} — ${err.message}`);
      setPending(false);
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
        <div className="w-full space-y-4">
          <button 
            onClick={handleLogin}
            disabled={pending}
            className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm disabled:opacity-60"
          >
            <LogIn size={20} />
            {pending ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-left space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Connexion impossible</p>
              <p className="text-xs font-medium break-words">{error}</p>
              <p className="text-xs text-red-400 font-medium">
                Si ton navigateur bloque les cookies tiers (Zen, Firefox strict, Safari),
                désactive la protection renforcée pour ce site puis réessaie.
              </p>
            </div>
          )}
        </div>
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
  const [authError, setAuthError] = useState(null);

  // Retour d'une connexion par redirection : on récupère le résultat pour
  // pouvoir afficher une vraie erreur au lieu de reboucler sur l'écran de login.
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (!sessionStorage.getItem('authRedirectPending')) return;
        sessionStorage.removeItem('authRedirectPending');
        if (!result) {
          setAuthError(
            "La redirection est revenue sans session. Ton navigateur bloque le stockage tiers " +
            "utilisé par Firebase : désactive la protection renforcée pour ce site, ou utilise " +
            "un autre navigateur en attendant."
          );
        }
      })
      .catch((err) => {
        console.error("Erreur au retour de redirection", err);
        sessionStorage.removeItem('authRedirectPending');
        setAuthError(`${err.code || 'erreur'} — ${err.message}`);
      });
  }, []);

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
    return <LoginScreen initialError={authError} />;
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