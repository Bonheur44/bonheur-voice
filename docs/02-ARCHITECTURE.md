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
  vocal/                     # observations → bandes → estimation de pupitre
  assessment/                # machine à états du test d'étendue, catalogue des tests
  exercises/personalize.ts   # résolution des rôles {{me}}, {{attractor}}, {{support}}
  exercises/                 # accès au catalogue
  routine/generator.ts       # génération de séance
  progression/               # mesure, pratique, niveaux, séries, recommandations
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
interface SkillState { feedbackHistory: (1..5)[]; exercisesDone }  // 10 derniers retours ; pas de score
interface UserProfile {
  declaredPart: VoicePart | 'unknown';   // déclaré, jamais déduit
  choirLine: 'S'|'A'|'T'|'B';            // ligne travaillée, réglable à part
  lowNote: midi; highNote: midi;         // zone de travail effective
  rangeFromAssessment?: boolean;
  preferredDuration; level; manualLevel?; onboarded;
}
interface VocalObservation { targetMidi; detectedMidi|null; spreadCents; heldSeconds; clarity; comfort?; source; at }
```

## 4. Génération d'une séance

Entrées : durée disponible, niveau, scores, historique des retours, date (graine).

1. **Structure fixe** : Respiration → Échauffement → blocs de travail → Retour au calme.
2. **Budget temps** : respiration ~15 %, échauffement ~18 %, retour au calme ~8 %, le reste réparti entre les compétences éligibles au niveau courant.
3. **Poids d'une compétence** = poids de base du niveau × (1 + (100 − position)/100). La *position* vient de la mesure pour la justesse et la stabilité, du nombre d'exercices faits pour les autres (`standingOf`) : une compétence faible reçoit plus de temps. Une compétence marquée « très facile » de façon répétée reçoit un peu moins de temps ; une compétence « très difficile » garde son temps mais reçoit des exercices plus faciles.
4. **Difficulté cible par compétence** : moyenne des 5 derniers retours. Moyenne ≤ 2 → cible −1 ; ≥ 4,2 → +1, bornée par le niveau.
5. **Choix des exercices** : parmi les exercices de la compétence dont `level ≤ niveau` et difficulté proche de la cible, on préfère ceux non réalisés récemment ; tirage pseudo-aléatoire avec graine = date, donc la séance du jour est stable tant qu'on ne la régénère pas.
6. **Ajustement des durées** : chaque exercice est étiré/compressé dans ses bornes pour remplir le budget ; en dessous de 15 min, on limite le nombre de blocs.

## 5. Progression

- **Compétences mesurées** (`lib/progression/measured.ts`) : justesse et stabilité, recalculées depuis les
  observations comme le profil vocal, jamais stockées. Justesse = écart absolu moyen à la note demandée, ramené
  sur 0–100 entre 5 cents (inaudible, 100) et 60 cents (autre note, 0) ; stabilité = dérive moyenne pendant la
  tenue, sur la même courbe que `stabilityFromSpread`. Moyennes pondérées par la fraîcheur, tolérance d'octave,
  `null` sous six mesures exploitables. La tendance compare à la valeur d'il y a trois semaines, calculée sur les
  seules observations qui existaient alors ; en dessous de 4 points d'écart, c'est du bruit de mesure.
- **Pratique** (`lib/progression/practice.ts`) : exercices terminés, temps passé et date de dernière séance par
  compétence, dérivés des séances terminées. Un décompte, qui ne fait que monter, et qui est présenté comme tel.
- **Il n'y a plus de score par compétence.** Le ressenti déclaré ne fait plus rien monter : il sert seulement à
  régler la difficulté cible et à alimenter les recommandations.
- **Niveau** : déblocage automatique selon les seuils du document d'analyse — mesures *et* pratique. Il ne
  redescend pas de lui-même (`Math.max(profile.level, computeLevel(…))`) ; l'utilisateur peut forcer un niveau.
- **Série** : jours consécutifs avec au moins une séance terminée (la série survit si la dernière séance date d'hier).
- **Recommandations** : règles simples (recul ou progrès mesuré, absence de mesure, compétence mesurée la plus faible, retour « très difficile » répété, retour « très facile » répété, niveau proche du déblocage, inactivité). Un recul mesuré est annoncé aussi franchement qu'un progrès.

## 5 bis. Profil vocal

```text
micro → PitchFrame → VocalObservation → NoteEvidence → VocalAnalysis → zone de travail → exercices
                                    └────────────→ MeasuredSkills → compétences mesurées, niveau, dosage
```

Seules les observations sont persistées ; tout le reste est recalculé par des fonctions pures. Le pupitre déclaré
(`profile.declaredPart`) sert à amorcer le test et à choisir la ligne travaillée, et n'entre dans aucun calcul.

- **Sources d'observation** : le test d'étendue, « Trouve la note » et « Note droite » produisent tous trois des
  observations, par le même chemin (`lib/vocal/capture.ts`), pour qu'elles soient comparables. Une tentative ne
  compte que si elle tient une demi-seconde au-dessus du seuil de clarté.

- **Pondération** : demi-vie de 60 jours, plancher à 0,12, oubli au-delà d'un an, 400 observations conservées.
- **Indexation** : l'étendue et le confort sont indexés sur la note *produite*, la justesse sur la note *cible*, avec
  tolérance d'octave. Chanter à l'octave est un choix de registre, pas une faute.
- **Bandes** : explorée ⊇ fiable ⊇ confortable ⊇ centrale, construites par grappes contiguës pour qu'une erreur
  d'octave isolée n'élargisse pas l'étendue.
- **Estimation** : recouvrement de Jaccard avec la tessiture de travail de chaque pupitre (0,55), proximité des
  centres (0,30), compatibilité de l'étendue (0,15) ; normalisation au carré sur les sept pupitres. Une
  `dataConfidence` séparée mesure la quantité de preuves, et rien n'est publié en dessous du seuil.
- **Test d'étendue** (`lib/assessment/rangeTest.ts`) : machine à états pure. Centre, puis grave, puis aigu, deux
  demi-tons par pas ; au premier échec on affine d'un demi-ton, au second on change de direction ; une gêne déclarée
  arrête la direction sans rien reproposer au-delà ; une phase de vérification redemande les bords et le centre.

## 6. Audio & limites

- Synthèse : oscillateurs avec enveloppe et filtre ; timbres distincts par voix (S/A/T/B) pour le mode chorale.
- **Timbres choisissables** (`lib/audio/timbres.ts`) : un rôle sonore (`piano`, `drone`, `click`, `S`, `A`, `T`, `B`) est demandé par l'appelant, et le moteur le résout au moment de jouer selon les préférences de l'appareil. Les points d'appel n'ont pas eu à changer. `resolveTimbre` est une fonction pure, donc testable sans navigateur. Le clic du métronome reste fixe, et le bourdon suit l'instrument choisi mais toujours tenu et sans vibrato, puisqu'il sert de référence de hauteur. Les préférences vivent dans `lib/audio/preferences.ts`, en localStorage et hors du compte.
- Enveloppe : attaque, chute et niveau de tenue, ce qui distingue un piano qui s'éteint d'un orgue qui tient. Le vibrato module le désaccord en cents plutôt que la fréquence en hertz, pour rester constant sur toute la tessiture.
- Détection de hauteur : autocorrélation normalisée sur 2048 échantillons avec seuil de clarté, sur 60–1200 Hz
  (Si1 d'une basse au Ré6 d'une soprano ; le plafond précédent, à 1000 Hz, coupait sous le Do6). Fiable pour une voix seule, tenue, dans une pièce calme ; imprécise sur les attaques, les consonnes, les bruits de fond, et parfois trompée d'une octave. L'interface affiche uniquement « trop bas / correct / trop haut » (±25 cents) et une stabilité indicative.
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

`/assessment` réunit la batterie d'évaluation, dont seul le test d'étendue est implémenté ; les sept autres sont
déclarés « bientôt » plutôt que masqués, pour ne pas laisser croire qu'ils mesurent déjà quelque chose.

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

**Tables** : `profiles`, `skills`, `sessions`, `achievements`, `observations`, toutes indexées par `user_id`, toutes protégées par une politique `auth.uid() = user_id` en lecture comme en écriture. Un déclencheur crée le profil à l'inscription. Une fonction `delete_account()` en `security definer` permet à chacun de supprimer son propre compte sans exposer de clé de service au navigateur.

**Écriture** : l'instantané complet est réécrit à chaque changement, après deux secondes de regroupement. Le volume est de l'ordre de quelques dizaines de lignes, ce qui rend le suivi d'un différentiel inutilement risqué. Une empreinte du contenu évite les envois redondants.

**Fusion** : fonctions pures dans `lib/sync/merge.ts`, testées unitairement. Horodatage le plus récent gagnant, avec trois exceptions : l'onboarding ne se défait jamais, les séances sont réunies par identifiant plutôt qu'écrasées, et un objectif conserve sa première date d'obtention. Les horodatages viennent des appareils, ce qui suffit pour départager les modifications d'une même personne.

**Observations** : table en ajout seul. Une tentative appartient à un instant précis et n'est jamais corrigée, donc
la fusion est une union par identifiant, sans arbitrage — ce qui permet à deux appareils d'enrichir le même profil
sans que l'un efface le travail de l'autre.

**Séances non démarrées** : un plan généré mais jamais commencé n'est pas envoyé. Il se régénère à l'identique et éviter de le synchroniser supprime un trafic inutile à chaque ouverture.
