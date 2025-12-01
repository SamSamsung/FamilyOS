import React from 'react';
import { Link } from 'react-router-dom';

const Card = ({ title, icon: Icon, to, color, description }) => {
  // Configuration des couleurs dynamiques
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:border-blue-200 hover:shadow-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 hover:border-indigo-200 hover:shadow-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 hover:border-emerald-200 hover:shadow-emerald-100",
    amber: "bg-amber-50 text-amber-600 hover:border-amber-200 hover:shadow-amber-100",
    rose: "bg-rose-50 text-rose-600 hover:border-rose-200 hover:shadow-rose-100",
  };

  const themeClass = colorClasses[color] || colorClasses.blue;

  return (
    <Link 
      to={to} 
      className={`
        flex flex-col items-center justify-center p-6 rounded-3xl border border-transparent transition-all duration-300
        ${themeClass} shadow-sm hover:scale-[1.02] active:scale-95
      `}
    >
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-3">
        <Icon size={32} strokeWidth={2} />
      </div>
      <h3 className="font-bold text-lg text-slate-800">{title}</h3>
      {description && <p className="text-xs font-medium opacity-70 mt-1 text-center">{description}</p>}
    </Link>
  );
};

export default Card;