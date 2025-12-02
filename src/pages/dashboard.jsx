import React from 'react';
import Card from '../components/Card';
import { Sparkles, ShoppingCart, Calendar, PiggyBank, ChefHat } from 'lucide-react';
import logo from '../assets/full-logo.png';


export default function Dashboard() {
  return (
    <div className="p-6 max-w-md mx-auto space-y-8">
      
      {/* En-tête avec date */}
      <header>
        <img src={logo} alt="MyFamilyOS - Simplified Family Management" className="h-16" />
        <p className="text-slate-500 font-medium">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
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
