# Étape 1 — Analyse du profil vocal et conception de la progression

> Profil : ténor, 22 ans, moins d'un an de chorale. Ce document transforme les difficultés décrites en compétences mesurables, priorisées et ordonnées.

## 1. Lecture du profil : une chaîne de causes

Les difficultés décrites ne sont pas indépendantes. Elles forment une chaîne classique chez un choriste débutant :

```
Souffle instable ──► Note qui tremble (vibrato subi) ──► Justesse fluctuante
      │                        │
      │                        └──► Difficulté à « chanter » (voix parlée, pas de ligne)
      │
      └──► Phrases coupées ──► Pas de legato ──► Sensation de parler sur des hauteurs

Oreille peu entraînée ──► Mémorisation lente des chants ──► Perte de sa ligne en polyphonie
```

Conséquences pour le programme :

1. **La respiration et le soutien sont la fondation** : sans débit d'air stable, la note ne peut pas être stable, donc pas juste, donc difficile à tenir en chœur.
2. **Le « vibrato subi » est traité comme un problème de coordination souffle/larynx**, pas comme un défaut à supprimer par la crispation. On travaille le son droit à volume modéré, sur des durées courtes qui augmentent progressivement.
3. **La sensation de « parler »** vient surtout de voyelles trop courtes et de consonnes qui interrompent l'air. On travaille d'abord la tenue des voyelles et le legato sur une seule voyelle, puis on réintroduit les consonnes.
4. **L'indépendance chorale est une compétence de fin de parcours** : elle exige justesse, mémoire mélodique et stabilité. On la prépare dès le niveau 2 par de l'écoute (repérer la ligne de ténor), avant de la chanter contre d'autres voix au niveau 3.

## 2. Compétences retenues (8 compétences + échauffement)

| Id | Compétence | Difficultés couvertes | Priorité | Dépend de |
|---|---|---|---|---|
| `breathing` | Respiration & soutien | Souffle instable, débit, quand respirer | **P0** | — |
| `stability` | Stabilité vocale | Vibrato subi, tenue de note, coordination souffle/voix | **P0** | breathing |
| `pitch` | Justesse & oreille | Reproduire une note, trop haut / trop bas, intervalles | **P0** | stability (partiel) |
| `articulation` | Articulation & ouverture | Ouverture intérieure/extérieure, diction | **P1** | — |
| `registers` | Registres | Poitrine, mixte, tête, transitions sans forcer | **P1** | breathing, stability |
| `musicality` | Musicalité & legato | « Parler au lieu de chanter », résonance, phrasé | **P1** | breathing, articulation |
| `melody` | Mémoire mélodique & ligne de ténor | Assimilation lente des chants, mémoire rythmique | **P1** | pitch |
| `choir` | Indépendance chorale | Trouver et tenir sa ligne malgré S/A/B | **P2** | pitch, melody, stability |
| `warmup` | Échauffement / retour au calme | Sécurité vocale (présent dans chaque séance) | systématique | — |

Ces compétences ne sont pas toutes de même nature, et l'application ne les traite plus de la même façon.

- **Justesse** et **stabilité** se *mesurent* : le micro donne un écart à la note demandée et une dérive
  pendant la tenue. Elles reçoivent une valeur de 0 à 100, recalculée à chaque affichage depuis les
  observations. Elle **monte et descend**, et vaut « données insuffisantes » tant qu'il y a moins de six
  mesures exploitables.
- **Les sept autres** ne se mesurent pas. Elles ne reçoivent donc aucune note : l'application affiche ce qui
  a été pratiqué (exercices terminés, temps passé, dernière séance) et le ressenti déclaré, étiqueté comme tel.

> Historique : jusqu'à la refonte, chaque compétence portait un « score » de 0 à 100 partant d'une constante,
> augmenté à chaque exercice terminé en fonction du ressenti déclaré. Il ne pouvait pas baisser, ne consultait
> jamais le micro, et s'affichait en pourcentage à côté du profil vocal — donnant à un compteur de pratique
> l'apparence d'une mesure de la voix. Voir `docs/06-COMPETENCES-MESUREES.md`.

## 3. Objectifs mesurables par compétence

Les mesures « micro » sont approximatives (détection de hauteur dans le navigateur) et servent de repère, jamais de verdict.

| Compétence | Objectif niveau 1 | Objectif niveau 2 | Objectif niveau 3–4 |
|---|---|---|---|
| Respiration | « sss » régulier 20 s sans à-coups | 30 s ; expiration dosée sur 4 puis 8 temps | Respiration planifiée sur une phrase entière de chant |
| Stabilité | Tenir une note droite 5 s à volume moyen | 8–10 s, ±20 cents (indicatif micro) | Note droite puis vibrato volontaire léger, sur toute la tessiture confortable |
| Justesse | Reproduire une note jouée (±25 cents) 6/10 | 8/10 ; reconnaître 2de, 3ce, 4te, 5te, 8ve | Intervalles complets, reproduire une phrase de 5 notes après 2 écoutes |
| Articulation | 5 voyelles sur une note sans bouger la hauteur | Consonnes explosives sans couper l'air | Texte chanté articulé et legato à la fois |
| Registres | Identifier poitrine / tête sur des sirènes douces | Sirène sur une octave sans cassure audible | Passage mixte confortable dans la zone Ré3–Sol4 (à adapter) |
| Musicalité | Legato sur 3 notes, une seule voyelle | Phrase de 8 notes en legato avec texte | Phrasé (crescendo / decrescendo) et résonance stable |
| Mémoire mélodique | Phrase de 4 notes après 3 écoutes | Phrase de 8 notes après 3 écoutes ; rythme reproduit | Ligne de ténor complète (16 mesures) mémorisée en 3 séances |
| Indépendance | Repérer la ligne de ténor dans un accord à 4 voix (écoute) | Tenir sa ligne avec 1 autre voix, ligne de ténor à 50 % | Tenir sa ligne avec S/A/B, ligne de ténor à 0 % |

## 4. Progression en 4 niveaux (adaptée)

La progression proposée est conservée, avec deux ajustements pédagogiques :

- **Le legato et la tenue de voyelle apparaissent dès le niveau 1** (dose légère), parce que la sensation de « parler » est un point de douleur central et que le legato sur une voyelle est l'exercice le plus direct pour la tenue de note.
- **L'écoute polyphonique apparaît dès le niveau 2** (sans chanter) : on apprend à *entendre* sa ligne avant de devoir la *tenir*.

| Niveau | Nom | Compétences dominantes | Dose légère | Déblocage |
|---|---|---|---|---|
| 1 | Fondations | breathing, stability, pitch, articulation | musicality (legato simple) | départ |
| 2 | Coordination | registers, musicality, melody, pitch | choir (écoute seule), stability | stabilité **mesurée** ≥ 40, justesse **mesurée** ≥ 40, 6 exercices de respiration, ≥ 8 séances |
| 3 | Indépendance | melody, choir, registers, musicality | breathing, pitch | justesse mesurée ≥ 50, 6 exercices de registres, de musicalité et de mémoire, ≥ 20 séances |
| 4 | Choriste autonome | choir (polyphonie, tonalités), melody, musicality | toutes (entretien) | justesse mesurée ≥ 60, stabilité mesurée ≥ 55, 8 exercices choraux, 10 de mémoire, ≥ 35 séances |

Un seuil mesuré exige une mesure : sans micro, on ne franchit pas un palier de justesse, même après cent séances.
C'est le prix pour que le niveau veuille dire quelque chose. Les critères non mesurables sont exprimés en
**nombre d'exercices terminés**, ce qui est une quantité de pratique et s'annonce comme telle.

Le niveau ne redescend pas quand une compétence mesurée recule : c'est une position dans le parcours, pas une
note. Il peut être ajusté manuellement dans les réglages (l'application n'a pas de vue absolue sur la voix réelle).

## 5. Point de départ

Aucun. Les compétences mesurées affichent « données insuffisantes » jusqu'aux premières mesures ; les autres
affichent « pas encore travaillée ». Les scores de départ estimés d'après le profil ont été supprimés : ils
présentaient une opinion écrite dans le code comme un résultat, et l'écart initial entre deux barres ne reposait
sur aucune observation.

## 6. Principes de sécurité vocale intégrés

- Chaque séance commence par respiration + échauffement et se termine par un retour au calme.
- Les exercices de registres sont limités à la zone confortable définie dans les réglages (par défaut Do3–Sol4, mais **la tessiture réelle n'est pas déduite de l'étiquette « ténor »** : elle se règle au piano virtuel lors de l'onboarding).
- Les hauteurs générées ne dépassent jamais la zone de confort ; le volume demandé est toujours « moyen » ou « doux ».
- Rappels intégrés : arrêter en cas de douleur, de raclement ou de fatigue ; l'application n'est pas un diagnostic médical.
