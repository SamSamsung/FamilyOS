import React from 'react';
import Card from '../components/Card';
import { Sparkles, ShoppingCart, Calendar, PiggyBank, ChefHat } from 'lucide-react';
import logo from '../assets/full-logo.png';


export default function Dashboard() {
  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      {/* NOUVEAU HEADER CENTRÉ ET ESTHÉTIQUE */}
      <header className="flex flex-col items-center justify-center pt-8 pb-4">
        
        {/* Le Logo : Plus grand et centré */}
        <div className="mb-2">
           <img 
             src={logo} 
             alt="MyFamilyOS" 
             // mix-blend-multiply permet de "fondre" le fond de l'image avec la page si besoin
             className="h-40 w-auto object-contain mix-blend-multiply drop-shadow-sm transform hover:scale-105 transition-transform duration-300" 
           />
        </div>

        {/* La date : Plus discrète et élégante en dessous */}
        <div className="relative">
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          {/* Petit trait déco en dessous */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-200 rounded-full"></div>
        </div>

      </header>

      {/* Grille des applications */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Module Ménage */}
        <Card 
          title="Services" 
          to="/services" 
          icon={Sparkles} 
          color="indigo" 
          description="Suivi & Heures"
        />

        {/* Module Courses (À venir) */}
        <Card 
          title="Courses" 
          to="/courses" 
          icon={ShoppingCart} 
          color="emerald"
          description="Liste commune"
        />

        {/* Module Planning (À venir) */}
        <Card 
          title="Planning" 
          to="/planning" 
          icon={Calendar} 
          color="blue"
          description="Agenda partagé"
        />

        {/* Module Banque (À venir) */}
        <Card 
          title="Banque" 
          to="/banque" 
          icon={PiggyBank} 
          color="amber"
          description="Argent de poche"
        />

        {/* Module Repas (À venir) */}
        <Card 
          title="Menus" 
          to="/repas" 
          icon={ChefHat} 
          color="rose"
          description="Idées repas"
          className="col-span-2" // Prend toute la largeur
        />

      </div>
    </div>
  );
}
