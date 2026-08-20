# MyFamilyOS — Contexte technique pour une IA

Document à copier-coller (ou à référencer) quand on demande à une IA d'ajouter
une nouvelle fonctionnalité ("module") au site.

---

## 1. Ce qu'est le produit

MyFamilyOS est une **PWA-like mobile-first** (React) d'intendance familiale.
Un utilisateur se connecte avec Google, rejoint ou crée une **famille**, et
toutes les données sont partagées entre les membres de cette famille.

Langue de l'interface : **français**. Le ton est familier ("Les secrets de
famille 👨‍🍳"). Les commentaires de code sont en français.

## 2. Stack

| Élément | Choix |
|---|---|
| Build | Vite 7 (alias `rolldown-vite`), `npm run dev` / `build` / `lint` |
| UI | React 19, JSX **sans TypeScript** |
| Routing | react-router-dom v7, `BrowserRouter` dans `src/main.jsx` |
| Style | Tailwind CSS v4 via `@tailwindcss/postcss` (`src/index.css` = `@import "tailwindcss";`) |
| Icônes | `lucide-react` (uniquement — pas d'autre lib d'icônes) |
| Backend | Firebase Web SDK v12 : Auth (Google popup) + Firestore |
| Hébergement | Vercel (`vercel.json` réécrit tout vers `/index.html` pour le routing SPA) |
| Analytics | `@vercel/analytics` (installé, pas encore branché) |
| Batch | `scraper.mjs` — script Node autonome (Puppeteer + Cheerio + firebase-admin) |

Pas de state manager (Redux/Zustand), pas de react-query, pas de lib de forms,
pas de tests. Tout l'état est local (`useState`) + abonnements Firestore temps réel.

## 3. Arborescence

```
index.html
src/
  main.jsx           # BrowserRouter + StrictMode
  App.jsx            # Auth gate, layout, routes, barre de nav du bas
  firebase.js        # init Firebase, exporte { auth, db, googleProvider }
  index.css          # import tailwind
  components/Card.jsx  # tuile du dashboard (title, icon, to, color, description)
  pages/
    dashboard.jsx    # accueil : logo + grille de <Card>
    services.jsx     # suivi des heures de ménage (calendrier + taux horaire)
    recipes.jsx      # recettes familiales (CRUD + recherche)
    TrackerPage.jsx  # suivi de prix (saisie d'URL, alimenté par scraper.mjs)
    FamilyPage.jsx   # créer/rejoindre une famille, valider les demandes
    ProfilePage.jsx  # pseudo + déconnexion
    courses.jsx      # VIDE (0 ligne)
    planning.jsx     # VIDE (0 ligne)
    banque.jsx       # VIDE (0 ligne)
scraper.mjs          # bot prix, lancé manuellement en Node
```

## 4. Modèle de données Firestore

```
users/{uid}
  displayName, email, photoURL, lastSeen, familyId?

families/{familyId}
  name, adminId, members: uid[], pendingRequests: uid[], createdAt

families/{familyId}/settings/config
  hourlyRate: number

families/{familyId}/housekeeping_entries/{YYYY-MM-DD}
  hours: number, updatedBy: uid, updatedAt

families/{familyId}/recipes/{autoId}
  title, imageUrl, prepTime, servings, ingredients, instructions,
  creatorId, creatorName, createdAt, updatedAt

price_trackers/{autoId}          ← collection RACINE, pas sous families/
  url, familyId, addedBy, createdAt,
  currentPrice, lowestPrice, priceHistory[], lastChecked
```

**Convention à suivre pour un nouveau module :** créer une sous-collection sous
`families/{familyId}/<module>`. `price_trackers` est l'exception historique
(collection racine filtrée par `where('familyId','==',familyId)`) — ne pas la
reproduire.

## 5. Patterns de code à reproduire

### 5.1 Squelette d'une page module

Chaque page module fait exactement la même chose :

```jsx
import React, { useState, useEffect } from 'react';
import { doc, collection, query, onSnapshot, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function MonModule() {
  const user = auth.currentUser;
  const [familyId, setFamilyId] = useState(null);
  const [items, setItems] = useState([]);

  // 1. Récupérer le familyId depuis users/{uid}
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) setFamilyId(snap.data().familyId);
    });
    return () => unsub();
  }, [user]);

  // 2. Écouter la sous-collection de la famille
  useEffect(() => {
    if (!familyId) return;
    const q = query(collection(db, 'families', familyId, 'mon_module'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [familyId]);

  if (!familyId)
    return <div className="p-10 text-center pt-40 text-slate-400">Veuillez rejoindre une famille...</div>;

  return <div className="p-6 max-w-md mx-auto space-y-6 pt-10">{/* ... */}</div>;
}
```

Deux façons d'obtenir l'utilisateur cohabitent : `auth.currentUser`
(services/recipes) et la prop `user` passée par `App.jsx` (FamilyPage,
ProfilePage, TrackerPage). **Préférer la prop `user`** — `auth.currentUser`
peut être `null` au premier rendu.

### 5.2 Branchement d'un nouveau module (3 fichiers à toucher)

1. `src/pages/monModule.jsx` — la page.
2. `src/App.jsx` — `import` + `<Route path="/mon-module" element={<MonModule user={user} />} />`.
3. `src/pages/dashboard.jsx` — une `<Card title=… to="/mon-module" icon={…} color=… description=… />`.
4. Optionnel : `src/App.jsx`, `<NavLink>` dans la `<nav>` du bas (5 entrées max, elle est déjà pleine).

### 5.3 Charte graphique (classes Tailwind réellement utilisées)

- Conteneur de page : `p-6 max-w-md mx-auto space-y-6 pt-10` (ou `pt-20` quand
  les boutons flottants Famille/Profil sont visibles en haut à droite).
- Fond global : `bg-slate-50`, padding bas `pb-24` pour la nav fixe.
- Cartes : `bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50`.
- Accent principal : `indigo-600`. Accents secondaires : `emerald` (courses),
  `blue` (planning), `amber` (banque), `rose` (menus / bot prix).
- Titres : `text-3xl font-black text-slate-800`.
- Sur-titres : `text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]`.
- Boutons pleins : `py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all`.
- Inputs : `w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium`.
- Modales : `fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6`,
  panneau `bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl`.
- État vide : `bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center text-slate-400`.
- Loader : `animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600`.

Design **mobile-first** : tout est contraint à `max-w-md`, il n'y a aucun
breakpoint desktop (`md:`, `lg:`) dans le code actuel.

## 6. Ce qui est déjà prévu mais pas fait

- `src/pages/courses.jsx`, `planning.jsx`, `banque.jsx` sont des **fichiers vides**.
  Les routes `/courses` et `/planning` rendent un placeholder inline dans `App.jsx`,
  et la Card "Banque" pointe vers `/banque` — **route inexistante → page blanche**.
- Le Bot Prix affiche « En attente du bot… » : l'UI ne lit jamais `currentPrice`,
  `lowestPrice` ni `priceHistory`, alors que `scraper.mjs` les écrit.
- `scraper.mjs` n'est pas planifié (pas de cron / GitHub Action) : il faut le
  lancer à la main.

## 7. Contraintes / pièges connus

- **Pas de règles de sécurité Firestore versionnées** dans le repo. Toute
  nouvelle collection doit être couverte côté console Firebase, sinon elle est
  soit ouverte à tous, soit bloquée.
- `new Date().toISOString().split('T')[0]` est utilisé comme clé de jour dans
  `services.jsx` — c'est de l'**UTC**, donc décalé pour un fuseau `Europe/Paris`
  en soirée. Reproduire ce bug volontairement serait une erreur : préférer un
  formatage local.
- `setCurrentDate(new Date(currentDate.setMonth(...)))` mute l'objet Date
  existant (services.jsx) — fonctionne par accident, ne pas copier.
- `App.css` est un reste du template Vite (`#root { max-width:1280px; padding:2rem }`)
  et **n'est importé nulle part** — ne pas l'importer, il casserait la mise en page.
- `.DS_Store`, `node_modules/` (≈37 000 fichiers) et `serviceAccountKey.json`
  sont **versionnés** : il n'y a pas de `.gitignore`.
- Aucun test, aucune CI. `npm run lint` (ESLint 9 + react-hooks) est la seule
  vérification disponible.

## 8. Sécurité — à traiter avant toute mise en ligne publique

Deux secrets réels sont committés dans l'historique git :

1. `serviceAccountKey.json` — **clé privée du compte de service Firebase Admin**
   (`firebase-adminsdk-fbsvc@payement-par.iam.gserviceaccount.com`). Elle donne
   un accès total à la base, en contournant les règles de sécurité.
2. `scraper.mjs` — **cookies de session personnels** Amazon et Fnac en dur
   (`session-token`, `_abck`, `datadome`…), c'est-à-dire des sessions
   authentifiées réutilisables.

Action recommandée : révoquer/régénérer la clé de service dans la console GCP,
invalider ces sessions e-commerce, ajouter un `.gitignore`, déplacer ces valeurs
dans des variables d'environnement. La config Firebase Web de `src/firebase.js`
(apiKey `AIza…`) n'est en revanche **pas** un secret — elle est publique par
conception, la protection vient des règles Firestore.

## 9. Prompt type à donner à une IA

> Contexte : voir `docs/AI_CONTEXT.md` du dépôt MyFamilyOS.
> Ajoute un module « Liste de courses » :
> - page `src/pages/courses.jsx` (le fichier existe, il est vide),
> - collection `families/{familyId}/shopping_items` avec les champs
>   `{ label, quantity, checked, addedBy, addedByName, createdAt }`,
> - ajout/cochage/suppression en temps réel via `onSnapshot`,
> - route `/courses` dans `App.jsx` (remplacer le placeholder inline),
> - respecter la charte de la section 5.3 et l'accent `emerald`,
> - JSX uniquement, pas de nouvelle dépendance, textes en français.
