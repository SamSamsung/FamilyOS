import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Calendar, PiggyBank } from 'lucide-react';

// Import des pages
import Dashboard from './pages/Dashboard';
import Menage from './pages/Payement';

// Composant pour les boutons de navigation (change de couleur si actif)
const NavLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
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
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 pb-24">
        
        {/* LE CONTENU CHANGE ICI SELON L'URL */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/menage" element={<Menage />} />
          
          {/* Pages "En construction" pour l'instant */}
          <Route path="/courses" element={<div className="p-10 text-center text-slate-400">Page Courses en construction...</div>} />
          <Route path="/planning" element={<div className="p-10 text-center text-slate-400">Page Planning en construction...</div>} />
          <Route path="/banque" element={<div className="p-10 text-center text-slate-400">Page Banque en construction...</div>} />
          <Route path="/repas" element={<div className="p-10 text-center text-slate-400">Page Repas en construction...</div>} />
        </Routes>

        {/* BARRE DE NAVIGATION (Fixe en bas) */}
        <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 py-3 px-6 flex justify-around items-center z-50 text-[10px] font-bold">
          <NavLink to="/" icon={Home} label="Accueil" />
          <NavLink to="/courses" icon={ShoppingCart} label="Courses" />
          <NavLink to="/planning" icon={Calendar} label="Agenda" />
          <NavLink to="/banque" icon={PiggyBank} label="Banque" />
        </nav>
      </div>
    </BrowserRouter>
  );
}