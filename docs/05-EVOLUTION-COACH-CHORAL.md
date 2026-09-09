# Étape 7 — De l'application ténor au coach vocal choral

Ce document remplace l'hypothèse « l'utilisateur est un ténor » par « l'utilisateur a une voix,
que l'application observe progressivement ». Il décrit l'existant, ce qui change, et dans quel ordre.

## 1. État des lieux

### Ce qui est déjà générique et ne bouge pas

| Module | Pourquoi il tient |
|---|---|
| `lib/audio/engine.ts`, `timbres.ts`, `metronome.ts` | Ne manipulent que des numéros MIDI et des rôles sonores. |
| `lib/audio/notes.ts` | Conversions MIDI ↔ Hz ↔ noms. Seule `DEFAULT_TENOR_RANGE` était spécifique. |
| `lib/audio/transpose.ts` | `fitShift` recentre déjà n'importe quelle ligne dans `[low, high]`. |
| `components/audio/*` | `ScalePlayer`, `Piano`, `PitchMatch`, `SustainMeter`, `DroneWidget`, `IntervalTrainer` lisent tous `useRange()`. Ils s'adaptent déjà à la voix de l'utilisateur, quelle qu'elle soit. |
| `lib/routine/generator.ts`, `lib/progression/`, `lib/skills.ts` | Raisonnent en compétences et en niveaux, jamais en pupitre. |
| `lib/sync/`, `lib/supabase/`, `proxy.ts`, comptes | Indexés par utilisateur, indifférents à la voix. |

**Conséquence importante** : l'infrastructure de transposition existe déjà. Elle est simplement
alimentée par deux nombres saisis à la main pendant l'onboarding. Il ne s'agit donc pas de la
construire, mais de la **nourrir avec des mesures**.

### Ce qui manquait vraiment

Il n'existait aucune couche d'observation. `PitchMatch` calcule une médiane d'écart en cents et un
verdict par tentative, puis les jette dans un état de composant. `SustainMeter` fait de même. Les
seules données vocales persistées étaient `lowNote` / `highNote`, réglées au piano une fois pour
toutes, et neuf scores de compétence dérivés d'émojis de ressenti — c'est-à-dire du déclaratif.

L'application disposait donc d'un instrument de mesure sans mémoire.

### Ce qui était réellement verrouillé sur le ténor

1. `UserProfile.voiceType: "tenor"` — un type littéral, propagé jusqu'au schéma SQL.
2. `DEFAULT_TENOR_RANGE` comme valeur par défaut du profil et de l'onboarding.
3. `ChoirMode` : `fitShift(piece.parts.T, …)` en dur, `initialTenorVolume`, libellés d'étapes.
4. `InteractiveSpec` variante `choir` : `voices?: Array<"S" | "A" | "B">` — « les autres voix »,
   avec le ténor exclu par construction du type lui-même.
5. `data/exercises/choir.ts` et `melody.ts` : la pédagogie est écrite pour une voix intérieure
   masquée par la soprano. Le raisonnement est juste, mais il est écrit en dur pour le ténor.
6. `data/music/melodies.ts` : `TENOR_LINE_PHRASE_*`, en registre absolu (MIDI 55–64).
7. `lib/audio/pitch-detector.ts` : `minLag = sampleRate / 1000` plafonne la détection à **1000 Hz**,
   sous le Do6 d'une soprano (1046 Hz). C'était un bug latent, invisible tant que l'utilisateur
   était ténor.
8. `Piano` bornée à MIDI 36–84 : trop étroit pour une basse grave comme pour une soprano aiguë.

## 2. Principe directeur

Deux informations distinctes, jamais confondues :

```text
profile.declaredPart   ← ce que l'utilisateur dit chanter (contexte, modifiable, jamais une preuve)
vocalAnalysis          ← ce que les observations indiquent (dérivé, recalculé, jamais figé)
```

Le pupitre déclaré sert uniquement à **amorcer** : choisir la note de départ du test d'étendue et la
ligne SATB travaillée. Il n'entre dans aucun calcul de profil vocal.

## 3. La boucle

```text
micro → PitchFrame            (lib/audio/pitch-detector.ts, inchangé sauf le plafond)
      → VocalObservation      une tentative sur une note : hauteur produite, dispersion, tenue, confort
      → NoteEvidence          agrégat pondéré par la fraîcheur, une entrée par demi-ton
      → VocalAnalysis         étendue / fiable / confortable / centrale / transitions / estimations
      → profile.lowNote/high  zone de travail effective, proposée à l'utilisateur, jamais imposée
      → widgets existants     transposent déjà à partir de cette zone
      → nouvelles observations
```

**Seules les observations sont persistées.** Tout le reste est une fonction pure recalculée à
l'affichage. Trois conséquences :

- le profil évolue par construction (§11 du cahier des charges) : rien de périmé n'est stocké ;
- l'application peut toujours répondre « données insuffisantes » (§22), puisque la quantité de
  preuves est une propriété de l'analyse et non un drapeau à maintenir ;
- toute la logique est testable sous Vitest, sans navigateur ni micro.

## 4. Modèle de données

```ts
interface VocalObservation {
  id: string;
  targetMidi: number;          // ce qu'on a demandé
  detectedMidi: number | null; // ce qui a été produit, en MIDI continu ; null = rien de fiable
  spreadCents: number;         // dispersion pendant la tenue → stabilité
  heldSeconds: number;
  clarity: number;             // 0–1, confiance du détecteur
  comfort?: "easy" | "ok" | "strained" | "impossible";  // déclaré, facultatif
  source: "range-test" | "pitch-test" | "sustain" | "exercise";
  at: string;
}
```

Choix de conception : on stocke la **hauteur produite**, pas l'écart à la cible. L'écart s'en déduit,
mais l'inverse est faux. Si l'application demande Do3 et que l'utilisateur chante Do4, l'octave est
une donnée, pas une erreur à masquer.

Deux lectures distinctes des mêmes observations :

- **étendue et confort** : indexés sur la note *réellement produite* ;
- **justesse** : indexée sur la note *cible*, avec tolérance d'octave (`foldCents`, déjà utilisé).

## 5. Les bandes

| Bande | Règle |
|---|---|
| Explorée | ≥ 1 tentative produite et détectée proprement, non déclarée « impossible ». |
| Fiable | ≥ 2 tentatives, justesse ≥ 0,6 et stabilité ≥ 0,4 (ou une tentative franchement bonne). |
| Confortable | Fiable, confort déclaré ≥ neutre, qualité ≥ 0,55. |
| Centrale | Noyau de la bande confortable : qualité ≥ 80 % du sommet observé. |
| Transitions | Minima locaux de qualité entourés de deux zones meilleures, signalés seulement si la bande fiable couvre ≥ 9 demi-tons. |

Les bandes sont construites par grappes : une note isolée à sept demi-tons du reste ne prolonge pas
l'étendue, elle forme sa propre grappe et la plus fournie l'emporte. C'est ce qui empêche une erreur
d'octave isolée de doubler l'étendue affichée.

## 6. Estimation du pupitre

Table de référence en tessiture de travail (et non en extrêmes), sept pupitres. Score par
comparaison de la bande confortable observée à celle du pupitre :

```text
score = 0,55 × recouvrement(confortable, tessiture)      (indice de Jaccard sur les demi-tons)
      + 0,30 × proximité des centres
      + 0,15 × part de l'étendue explorée tenant dans l'étendue du pupitre
```

Puis normalisation sur les sept pupitres. Deux garde-fous :

- une `dataConfidence` séparée (`insufficient` / `low` / `moderate` / `good`) mesure **combien on
  sait**, indépendamment du classement. Sous le seuil, aucune estimation n'est publiée.
- si les deux premiers scores sont à moins de 6 points, la réponse est « plusieurs pupitres
  compatibles » et non un gagnant.

Le contre-ténor est estimé mais accompagné d'une réserve explicite : la hauteur seule ne le distingue
pas d'un alto. C'est une limite du procédé, pas une information à inventer.

## 7. Arborescence

Le cahier des charges propose une réorganisation complète en `lib/coaching/routineGenerator/`, etc.
J'adopte la **séparation** demandée — détection → analyse → profil → décision → exercice —, mais je
ne renomme pas les modules qui fonctionnent déjà et qui occupent la bonne case : `lib/routine/`
*est* le moteur de routine, `lib/progression/` *est* le moteur de progression. Renommer coûterait une
centaine d'imports pour zéro gain.

```text
lib/
  audio/          inchangé (détection, synthèse, timbres, notes, transposition)
  vocal/          NOUVEAU — analyse
    types.ts        VocalObservation, NoteEvidence, Band, VocalAnalysis
    voiceParts.ts   référentiel des sept pupitres
    observations.ts observations → NoteEvidence (pondération par fraîcheur)
    rangeAnalysis.ts NoteEvidence → bandes et zones de transition
    estimation.ts   bandes → estimations de pupitre + confiance
    profile.ts      assemblage et formulations prudentes
  assessment/     NOUVEAU — évaluations
    types.ts        catalogue des tests et statut de chacun
    rangeTest.ts    machine à états pure du test d'étendue
  routine/        = moteur de routine
  progression/    = moteur de progression
```

## 8. Ordre d'exécution

1. **Socle vocal** — `lib/vocal/`, `lib/assessment/rangeTest.ts`, tests unitaires. Aucune UI.
2. **Modèle** — `declaredPart` et `choirLine` remplacent `voiceType` ; `observations` entre dans
   `AppData`, dans le store, dans la synchronisation et dans le schéma SQL (migration `0002`).
3. **Test d'étendue** — `/assessment` et `/assessment/range`, écran de résultat, proposition de mise
   à jour de la zone de travail.
4. **Généralisation chorale** — `ChoirMode` paramétré par la ligne travaillée, `InteractiveSpec`
   exprimé en rôles (`support`, `attractor`) plutôt qu'en lettres SATB fixes.
5. **Onboarding et dashboard** — trois questions (§26), accueil sans mention de pupitre (§27).
6. **Suite** — les sept autres évaluations (§15) réutilisent la même chaîne d'observations ;
   l'import de chants (§20) réutilise `ChoralePiece`, déjà indexé par voix.

## 9. Sécurité et honnêteté

- Le test s'arrête sur « Je suis inconfortable », sans insister ni proposer de reprendre plus haut.
- Aucune note extrême n'est présentée comme un objectif, et il n'y a ni record ni comparaison.
- La détection reste un repère : sous le seuil de clarté, l'observation est écartée plutôt
  qu'enregistrée avec une valeur douteuse.
- Le vocabulaire affiché est « profil vocal estimé », jamais « tessiture » au sens médical.
