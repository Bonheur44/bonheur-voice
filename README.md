# Vocal Training — Tenor

Application web de routine vocale personnalisée et progressive pour un ténor de chorale. Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Web Audio API. Aucune dépendance audio externe ; les données restent dans le navigateur (localStorage) avec un adaptateur prêt pour Supabase.

## Démarrer

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
npm run build && npm start
```

Tests :

```bash
npm test             # Vitest : générateur de séance, progression, notes, données musicales
npm run test:e2e     # Playwright (mobile Pixel 7 + desktop) : parcours complet, outils, réglages, responsive, console
```

Les tests Playwright démarrent `next start` sur le port 3100 ; lancez `npm run build` avant.

## Ce que fait l'application

- **Onboarding** : zone confortable réglée au piano virtuel (l'étiquette « ténor » ne fixe pas la tessiture), durée préférée.
- **Dashboard** : séance du jour, série, temps total, niveau, compétences, recommandation, derniers exercices.
- **Séance** : générée selon la durée (10/15/20/30/45 min), le niveau, les scores par compétence et les ressentis récents. Structure fixe : respiration → échauffement → blocs de travail → retour au calme.
- **Lecteur d'exercice** : objectif, pourquoi, consignes, points d'attention, erreurs fréquentes, sécurité → timer, répétitions, pause, précédent/suivant, widget interactif → ressenti (😣 😕 🙂 😄 🔥) → bilan.
- **Interactif (Web Audio)** : guide respiratoire, métronome, bourdon, piano, « Trouve la note » (micro), note droite / stabilité (micro), intervalles, comparaison de hauteurs, gammes/arpèges/sirènes bornés à la zone confortable, apprentissage de mélodie note par note / phrase par phrase, **mode chorale** SATB synthétique avec mixage par voix et protocole en 5 étapes.
- **Progression** : radar et barres par compétence, minutes par semaine, activité sur 28 jours, ressenti, objectifs, seuils de niveau. **Historique** détaillé par séance.
- **Réglages** : durée, tessiture, niveau manuel, volume, export/import JSON, réinitialisation.

## Limites honnêtes

- La détection de hauteur (autocorrélation sur le micro) est un **repère approximatif** : voix seule, tenue, pièce calme ; erreurs d'octave possibles ; inutilisable sur les consonnes et les attaques. L'interface n'affiche que « trop bas / correct / trop haut » (±25 cents) et une stabilité indicative.
- Les voix du mode chorale sont synthétiques.
- Les scores de compétence sont un modèle de progression fondé sur la pratique et le ressenti déclaré, pas une mesure de la voix.
- L'application n'est pas un diagnostic médical : arrêter en cas de douleur, de raclement ou de fatigue vocale.

## Architecture

Voir `docs/01-ANALYSE.md` (profil → compétences → progression) et `docs/02-ARCHITECTURE.md` (stack, modèle de données, génération, UX). Arborescence :

```text
app/            pages (dashboard, onboarding, routine, routine/play, exercises, progression, history, tools, settings)
components/     ui, layout, dashboard, routine, exercises, audio (widgets), charts (SVG maison)
lib/            types, skills, utils, audio (engine, notes, pitch-detector, metronome, transpose),
                routine/generator, progression, storage (adaptateur), store (Zustand + persist)
data/           exercises/* (54 exercices, 9 catégories), music/* (mélodies, choral SATB)
tests/          unit (Vitest), e2e (Playwright)
docs/
```

## Brancher un backend plus tard

`lib/storage/index.ts` expose un adaptateur `StorageAdapter` (getItem/setItem/removeItem). Implémenter la même interface avec Supabase (table `app_data` par utilisateur, JSON) et la passer au middleware `persist` dans `lib/store/index.ts`. Le modèle de données (`lib/types.ts`) est déjà sérialisable en JSON.
