# Étapes 2 & 3 — Architecture technique, modèle de données, UX

## 1. Stack

- Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4.
- Comptes et base de données : Supabase (authentification par mot de passe et Google, Postgres avec Row Level Security). Voir §8.
- État global : Zustand + middleware `persist` (localStorage), utilisé comme cache hors ligne par utilisateur ; la base fait référence entre appareils.
- Audio : Web Audio API native (oscillateurs + enveloppes, métronome planifié, détection de hauteur par autocorrélation sur le micro). Aucune dépendance audio externe.
- Tests : Vitest (générateur de séance, progression, notes/fréquences) et Playwright (parcours utilisateur, console, responsive).

## 2. Arborescence

```text
app/
  layout.tsx                 # shell, navigation, providers
  page.tsx                   # Dashboard
  onboarding/                # premier lancement : tessiture confortable + durée
  routine/                   # séance du jour (aperçu + sélecteur de durée)
  routine/play/              # lecteur d'exercices (timer, répétitions, feedback)
  exercises/                 # bibliothèque par catégorie
  exercises/[id]/            # fiche exercice + essai libre
  progression/               # graphiques compétences
  history/                   # séances passées
  tools/[tool]/              # piano, métronome, accordeur, mode chorale, gammes
  settings/
components/
  ui/            # Button, Card, ProgressBar, Badge, Slider…
  layout/        # AppShell, navigation
  dashboard/     # cartes du tableau de bord
  routine/       # plan de séance, sélecteur de durée
  exercises/     # fiche, lecteur, timer, ressenti
  audio/         # Piano, Metronome, PitchMatch, SustainMeter, ChoirMode, IntervalTrainer,
                 # MelodyLearner, BreathingGuide, ScalePlayer
  charts/        # graphiques SVG maison
lib/
  types.ts                   # types partagés
  exercises/                 # accès au catalogue
  routine/generator.ts       # génération de séance
  progression/               # scores, niveaux, séries, recommandations
  audio/                     # engine, notes, pitch-detector, voices
  storage/                   # adaptateur local + interface pour un backend
  store/                     # Zustand store
data/
  exercises/*.ts             # catalogue par catégorie
  music/                     # lignes SATB, mélodies de ténor
docs/
```

## 3. Modèle de données

```ts
type SkillId = 'breathing'|'warmup'|'pitch'|'stability'|'articulation'|'registers'|'melody'|'choir'|'musicality';

interface Exercise {
  id: string; name: string; category: SkillId;
  objective: string; why: string;               // le « pourquoi »
  instructions: string[]; focusPoints: string[];
  commonMistakes: string[]; safetyNotes: string[];
  duration: number;            // secondes, durée de référence
  minDuration?: number; maxDuration?: number;   // bornes d'adaptation
  repetitions?: number;
  difficulty: 1|2|3|4|5;       // 1 = très accessible
  level: 1|2|3|4;              // niveau à partir duquel l'exercice est proposé
  prerequisites?: string[];    // ids d'exercices
  interactive?: InteractiveSpec; // widget audio associé
  tags?: string[];
}

interface SessionExercise { exerciseId; plannedDuration; actualDuration?; feedback?: 1..5; completed; skipped }
interface Session { id; date; plannedDuration; level; exercises: SessionExercise[]; startedAt?; completedAt?; totalDuration }
interface SkillState { score: 0..100; feedbackHistory: (1..5)[] }   // 10 derniers retours
interface UserProfile { voiceType: 'tenor'; lowNote: midi; highNote: midi; preferredDuration; level; manualLevel?; onboarded }
```

## 4. Génération d'une séance

Entrées : durée disponible, niveau, scores, historique des retours, date (graine).

1. **Structure fixe** : Respiration → Échauffement → blocs de travail → Retour au calme.
2. **Budget temps** : respiration ~15 %, échauffement ~18 %, retour au calme ~8 %, le reste réparti entre les compétences éligibles au niveau courant.
3. **Poids d'une compétence** = poids de base du niveau × (1 + (100 − score)/100) : une compétence faible reçoit plus de temps. Une compétence marquée « très facile » de façon répétée reçoit un peu moins de temps ; une compétence « très difficile » garde son temps mais reçoit des exercices plus faciles.
4. **Difficulté cible par compétence** : moyenne des 5 derniers retours. Moyenne ≤ 2 → cible −1 ; ≥ 4,2 → +1, bornée par le niveau.
5. **Choix des exercices** : parmi les exercices de la compétence dont `level ≤ niveau` et difficulté proche de la cible, on préfère ceux non réalisés récemment ; tirage pseudo-aléatoire avec graine = date, donc la séance du jour est stable tant qu'on ne la régénère pas.
6. **Ajustement des durées** : chaque exercice est étiré/compressé dans ses bornes pour remplir le budget ; en dessous de 15 min, on limite le nombre de blocs.

## 5. Progression

- **Gain de score** par exercice terminé : `base × facteurDifficulté × facteurRessenti` avec ressenti 1→0.6, 2→0.85, 3→1, 4→1.05, 5→0.9 (un exercice trop facile apprend peu). Rendement décroissant au-dessus de 70.
- **Niveau** : déblocage automatique selon les seuils du document d'analyse ; l'utilisateur peut forcer un niveau.
- **Série** : jours consécutifs avec au moins une séance terminée (la série survit si la dernière séance date d'hier).
- **Recommandations** : règles simples (compétence la plus faible, retour « très difficile » répété, retour « très facile » répété, niveau proche du déblocage, inactivité).

## 6. Audio & limites

- Synthèse : oscillateurs avec enveloppe et filtre ; timbres distincts par voix (S/A/T/B) pour le mode chorale.
- Détection de hauteur : autocorrélation normalisée sur 2048 échantillons avec seuil de clarté. Fiable pour une voix seule, tenue, dans une pièce calme ; imprécise sur les attaques, les consonnes, les bruits de fond, et parfois trompée d'une octave. L'interface affiche uniquement « trop bas / correct / trop haut » (±25 cents) et une stabilité indicative.
- Tout est présenté comme un repère pédagogique approximatif, jamais comme une mesure.

## 7. Parcours utilisateur (UX)

1. **Premier lancement** → onboarding (présentation, tessiture confortable au piano, durée préférée) → dashboard.
2. **Dashboard** : « Séance du jour » (durée, aperçu, Commencer), série, temps total, compétences, recommandation, derniers exercices.
3. **Séance** : liste des exercices, sélecteur de durée (10/15/20/30/45), régénération.
4. **Lecteur** : écran de présentation (objectif, pourquoi, instructions, points d'attention, erreurs, sécurité) → ▶ Commencer → timer + widget interactif + répétitions + pause/précédent/suivant → ressenti → suivant → bilan de séance.
5. **Progression** : compétences (barres + radar), séances par semaine, temps, ressenti moyen.
6. **Historique** : séances passées avec détail des exercices et ressentis.
7. **Outils** : piano, métronome, accordeur, mode chorale, gammes/tonalités, hors séance.
8. **Réglages** : durée, tessiture, niveau, export/import/réinitialisation.

Navigation mobile : barre inférieure 5 onglets (Accueil, Séance, Exercices, Progrès, Outils). Desktop : barre latérale.

La racine `/` est une page de présentation publique ; le tableau de bord vit sur `/dashboard`. Un visiteur non connecté est redirigé vers `/login` par `proxy.ts`, et un visiteur connecté qui ouvre `/` arrive directement sur son tableau de bord.

## 8. Comptes et synchronisation

Ajouté après la première version, quand l'application a été ouverte à d'autres membres du pupitre.

```text
Navigateur
 ├─ Store Zustand ── persist → localStorage, clé « …:v1:<userId> »  (cache hors ligne)
 └─ SyncService ──── @supabase/supabase-js ──► Supabase
                                               ├─ Auth (mot de passe, Google)
                                               └─ Postgres + Row Level Security
Serveur Next
 ├─ app/auth/callback/route.ts  échange du code OAuth et des liens envoyés par courriel
 └─ proxy.ts                    rafraîchit la session, protège les pages
```

**Tables** : `profiles`, `skills`, `sessions`, `achievements`, toutes indexées par `user_id`, toutes protégées par une politique `auth.uid() = user_id` en lecture comme en écriture. Un déclencheur crée le profil à l'inscription. Une fonction `delete_account()` en `security definer` permet à chacun de supprimer son propre compte sans exposer de clé de service au navigateur.

**Écriture** : l'instantané complet est réécrit à chaque changement, après deux secondes de regroupement. Le volume est de l'ordre de quelques dizaines de lignes, ce qui rend le suivi d'un différentiel inutilement risqué. Une empreinte du contenu évite les envois redondants.

**Fusion** : fonctions pures dans `lib/sync/merge.ts`, testées unitairement. Horodatage le plus récent gagnant, avec trois exceptions : l'onboarding ne se défait jamais, les séances sont réunies par identifiant plutôt qu'écrasées, et un objectif conserve sa première date d'obtention. Les horodatages viennent des appareils, ce qui suffit pour départager les modifications d'une même personne.

**Séances non démarrées** : un plan généré mais jamais commencé n'est pas envoyé. Il se régénère à l'identique et éviter de le synchroniser supprime un trafic inutile à chaque ouverture.
