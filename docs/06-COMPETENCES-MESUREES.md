# Étape 6 — Des scores déclaratifs aux compétences mesurées

> Le tableau de bord affichait huit compétences notées de 0 à 100. Aucune ne mesurait la voix, aucune ne pouvait
> baisser, et elles s'affichaient en pourcentage à quelques centimètres d'un profil vocal qui, lui, pesait ses mots.
> Ce document explique ce qui n'allait pas et ce qui remplace ce système.

## 1. Le mécanisme précédent

Chaque exercice terminé ajoutait des points à une seule compétence, celle de sa catégorie :

```text
gain = 3 × difficulté(0,8→1,4) × ressenti(0,6→1,05) × durée(0,4→1,2) × rendement décroissant
```

Le point de départ était une constante par compétence (justesse 30, stabilité 25, indépendance chorale 15…),
identique pour tout le monde.

## 2. Pourquoi c'était biaisé

Ce ne sont pas des coefficients mal réglés : le système mesurait la mauvaise chose.

**L'instrument était tenu par la personne mesurée.** Le seul signal de qualité était l'émoji tapé après l'exercice.
L'utilisateur savait que la barre montait et voulait qu'elle monte. Le barème punissait même l'honnêteté : `😣 = 0,6`
contre `🙂 = 1,0`, soit 40 % de gain en moins pour avoir signalé une difficulté — exactement là où l'information
aurait été la plus utile.

**L'émoji ne disait pas ce qu'on croyait.** Il décrit un confort ressenti, pas une justesse. Le cas d'école du
débutant — chanter une quinte en dessous sans s'en apercevoir — est parfaitement confortable, donc plein tarif. Le
système récompensait le fait de ne pas remarquer.

**Ça ne descendait jamais.** Un nombre qui ne fait que monter est un compteur de pratique déguisé en niveau de
maîtrise. Deux voix identiques donnaient deux scores différents selon l'assiduité ; trente exercices chantés faux
débloquaient le niveau 3. L'abandon d'un exercice, signal le plus franc qu'il était hors de portée, ne laissait
aucune trace.

**Une boucle aplanissait tout.** Le générateur donnait à une compétence faible jusqu'au double de temps ; plus de
temps donnait plus de gain ; rien ne redescendait. Les barres convergeaient donc mécaniquement les unes vers les
autres, et l'auraient fait quelle que soit la voix. Le graphique décrivait sa propre boucle de rétroaction.

**Les points de départ étaient une opinion.** L'écart initial entre « Respiration 30 » et « Indépendance chorale 15 »
ne reposait sur aucune observation, mais se lisait comme un résultat.

**Deux standards de rigueur sur un écran.** La carte de profil vocal distinguait le fiable de l'incertain et savait
dire « données insuffisantes ». Les huit barres affirmaient huit nombres avec un signe `%`, sans confiance, sans
réserve, et sans qu'aucun micro soit intervenu.

## 3. Le principe retenu

Séparer les deux natures au lieu de les mélanger sous un même chiffre.

| | Mesuré | Pratiqué |
|---|---|---|
| Quoi | justesse, stabilité | les sept autres compétences |
| Source | observations du micro | séances terminées |
| Valeur | 0–100 recalculée à chaque affichage | décompte d'exercices, temps, dernière séance |
| Sens | monte **et descend** | ne fait que monter, et c'est assumé |
| Sans données | « données insuffisantes » | « pas encore travaillée » |

Le ressenti déclaré ne disparaît pas : il reste affiché, étiqueté comme déclaratif, et continue de régler la
difficulté cible. Il ne fait simplement plus monter aucun chiffre.

## 4. Comment la mesure est calculée

`lib/progression/measured.ts`, fonctions pures, rien de stocké — même règle que le profil vocal.

- **Justesse** = écart absolu moyen à la note demandée, avec tolérance d'octave, ramené sur 0–100 : 100 à 5 cents
  (l'oreille n'entend plus de différence), 0 à 60 cents (c'est une autre note).
- **Stabilité** = dérive moyenne pendant la tenue, sur la même courbe que le profil vocal : 100 à 8 cents, 0 à 60.
- **Pondération par la fraîcheur** : demi-vie de 60 jours, comme les observations. Une mauvaise séance d'il y a deux
  mois pèse moitié moins qu'une d'aujourd'hui, ce qui fait que la valeur suit la voix d'aujourd'hui.
- **Seuil** : moins de six mesures exploitables, aucun chiffre. Une observation ne compte que si une hauteur a été
  produite, tenue une demi-seconde, au-dessus du seuil de clarté.
- **Tendance** : comparaison avec la valeur d'il y a trois semaines, calculée sur les seules observations qui
  existaient alors — la valeur réellement affichée à l'époque, pas une reconstruction. En dessous de 4 points,
  l'écart est du bruit de mesure et s'affiche « stable ».
- **Historique hebdomadaire** : chaque semaine n'est évaluée que sur ses propres mesures, pour qu'une bonne semaine
  ancienne ne puisse pas embellir une mauvaise semaine récente. Une semaine avec moins de quatre mesures reste vide,
  et le trou dans la courbe est une information.

## 5. Ce qui alimente la mesure

Il fallait des mesures pour qu'il y ait quelque chose à mesurer. Avant, seul le test d'étendue produisait des
observations ; « Trouve la note » et « Note droite » calculaient un verdict, l'affichaient et le jetaient.

Les trois passent désormais par `lib/vocal/capture.ts` : mêmes seuils de clarté, même médiane robuste, même
dispersion en écart absolu médian. Une note tenue dans un exercice produit exactement la même observation qu'une
note tenue pendant le test, sinon les sources ne seraient pas comparables.

« Trouve la note » conclut maintenant sur 40 trames au lieu de 25 — environ deux tiers de seconde au lieu de quatre
dixièmes. C'est un peu plus long à l'usage, et c'est le minimum pour que la tentative compte comme une mesure plutôt
que comme un simple repère à l'écran.

## 6. Ce que ça change ailleurs

- **Niveaux** : les seuils de justesse et de stabilité exigent une mesure. Sans micro, on ne franchit pas un palier
  de justesse, même après cent séances. Les autres critères sont exprimés en nombre d'exercices terminés, ce qui est
  une quantité de pratique et s'annonce comme telle. Le niveau ne redescend pas quand une mesure recule : c'est une
  position dans le parcours, pas une note.
- **Dosage de la séance** : `standingOf` remplace le score. Position mesurée si elle existe, sinon position déduite
  de la pratique. La boucle d'aplanissement demeure pour les compétences non mesurées — c'est inévitable quand on
  n'a que le volume — mais elle ne s'applique plus à la justesse ni à la stabilité, qui sont pilotées par le micro.
- **Bilan de séance** : « +3,3 en Justesse » devient « Justesse mesurée 48 → 52 », et peut afficher une baisse.
- **Objectifs** : les identifiants sont conservés pour ne pas orpheliner ce qui a déjà été obtenu. « Oreille
  éveillée » et « Note droite » demandent maintenant une valeur mesurée ; « Souffle posé » demande dix exercices de
  respiration, ce qu'il mesurait déjà en réalité.
- **Base de données** : la colonne `skills.score` est supprimée (`0003_measured_skills.sql`). Rien à migrer : la
  mesure se recalcule depuis les observations, déjà synchronisées.

## 7. Ce qui reste imparfait, et assumé

- **Sept compétences sur neuf n'ont aucune mesure.** Articulation, musicalité, registres, mémoire mélodique,
  indépendance chorale, respiration, échauffement : rien dans le navigateur ne sait les évaluer. L'application ne
  leur donne donc pas de note plutôt que d'en inventer une.
- **Le micro reste un repère approximatif.** Autocorrélation sur 2048 échantillons, erreurs d'octave possibles,
  inutilisable sur les consonnes, sensible au bruit de la pièce. La tolérance d'octave et le seuil de clarté
  limitent les dégâts ; la fiabilité affichée dit combien de mesures soutiennent le chiffre.
- **Une baisse peut venir de la pièce, pas de la voix.** Un micro plus loin, une pièce plus sonore, une fatigue de
  fin de journée suffisent. C'est pourquoi la recommandation qui annonce un recul propose ces explications avant de
  conclure quoi que ce soit sur la voix.
