import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom'; // Plus besoin de BrowserRouter ici
import { Home, ShoppingCart, Calendar, PiggyBank } from 'lucide-react';

// 1. AJOUTE CET IMPORT ICI
import { Analytics } from '@vercel/analytics/react';
import Dashboard from './pages/dashboard';
import Payement from './pages/payement'; // Assure-toi que l'import correspond au fichier

const NavLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  // Vérifie si le chemin commence par 'to' pour garder actif même dans les sous-pages
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link 
      to={to} 
      className={`
        flex flex-col items-center gap-1 transition-colors duration-200
        ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
      `}
    >
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      <span>{label}</span>
    </Link>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      
      <Analytics />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        
        {/* CORRECTION : J'ai mis "/menage" pour correspondre à ton Dashboard.jsx */}
        <Route path="/payement" element={<Payement />} />
        
        <Route path="/courses" element={<div className="p-10 text-center text-slate-400">Page Courses...</div>} />
        <Route path="/planning" element={<div className="p-10 text-center text-slate-400">Page Planning...</div>} />
        <Route path="/banque" element={<div className="p-10 text-center text-slate-400">Page Banque...</div>} />
        <Route path="/repas" element={<div className="p-10 text-center text-slate-400">Page Repas...</div>} />
      </Routes>

      {/* Barre de navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 py-3 px-6 flex justify-around items-center z-50 text-[10px] font-bold">
        <NavLink to="/" icon={Home} label="Accueil" />
        {/* Ajout du lien direct vers le ménage dans la barre du bas aussi */}
        <NavLink to="/payement" icon={PiggyBank} label="Payement" /> 
        <NavLink to="/courses" icon={ShoppingCart} label="Courses" />
        <NavLink to="/planning" icon={Calendar} label="Agenda" />
      </nav>
    </div>
  );
}