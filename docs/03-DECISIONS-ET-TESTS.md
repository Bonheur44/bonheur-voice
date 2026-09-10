# Étapes 4 à 6 — Choix d'implémentation, tests, QA

## Hypothèses et décisions prises sans validation

| Sujet | Décision | Pourquoi |
|---|---|---|
| Thème | Sombre uniquement, accent ambre | Ambiance « coach + outil musical », lisible pendant l'exercice, évite l'effet application médicale |
| Stockage | Zustand + `persist` (localStorage), adaptateur isolé | Prototype immédiat, interface prête pour Supabase |
| Tessiture | Réglée au piano lors de l'onboarding, défaut Do3–Sol4 | L'étiquette « ténor » ne suffit pas ; tous les widgets se bornent à cette zone |
| Niveaux | 4 niveaux, seuils sur scores + nombre de séances, niveau manuel possible | L'application n'entend pas la voix ; l'utilisateur garde la main |
| Legato dès le niveau 1 | Oui (dose légère) | La sensation de « parler » est centrale dans le profil |
| Écoute polyphonique au niveau 2 | Oui, sans chanter | Entendre sa ligne avant de la tenir |
| Séance du jour | Déterministe (graine = date + durée + niveau), régénérable | Stable dans la journée, variante à la demande |
| Séance terminée | Le dashboard n'en régénère pas une automatiquement | Éviter de pousser à surentraîner ; une nouvelle séance reste à un clic |
| Détection de hauteur | Autocorrélation normalisée maison, seuil de clarté 0,85, ±25 cents = correct | Pas de dépendance ; limites affichées partout |
| Voix du mode chorale | Oscillateurs (dent de scie filtrée + sinus, vibrato léger), timbres différents par pupitre | Suffisant pour l'indépendance auditive |
| Choral SATB | 8 mesures en Do majeur, ligne de ténor intérieure (notes répétées, mouvements conjoints), transposée pour tenir dans la zone | Réaliste par rapport aux difficultés décrites |
| Compétences mesurées | Justesse et stabilité recalculées depuis les observations ; aucune note pour les sept autres | Un chiffre qui ne peut que monter et qui ignore le micro n'est pas une mesure. Mieux vaut deux valeurs honnêtes que neuf inventées |
| Wake lock | Demandé pendant un exercice si disponible | L'écran ne s'éteint pas pendant qu'on chante |

## Tests unitaires (Vitest)

- Générateur : budget respecté pour 10/15/20/30/45 min, structure respiration → échauffement → … → retour au calme, déterminisme, respect du niveau, pas de registres/chorale au niveau 1, pas de doublon, bornes de durée.
- Adaptation : difficulté cible baisse après « très difficile », monte après « très facile », bornée par le niveau ; poids plus fort pour une compétence faible.
- Catalogue : identifiants uniques, prérequis valides, couverture de chaque compétence.
- Progression : décompte de pratique, série (jours consécutifs, tolérance d'un jour), niveaux (seuils mesurés et pratiqués, pas de saut, refus de progresser sans mesure), recommandations (recul mesuré annoncé comme un progrès).
- Mesure : échelles cents → 0–100, seuil de six mesures, pondération par fraîcheur, tolérance d'octave, baisse quand les mesures récentes se dégradent, tendance sur trois semaines, semaines sans assez de mesures laissées vides.
- Notes : MIDI ↔ Hz, noms français, cents, transposition ; choral : quatre voix de même durée, voix qui ne se croisent pas, ténor dans Do3–Sol4.

## Tests de bout en bout (Playwright, mobile Pixel 7 + desktop Chrome, micro simulé)

1. Onboarding (piano, durée) → dashboard → changement de durée → variante → séance complète (timer qui décrémente, pause qui fige, répétitions, ressenti sur chaque exercice) → bilan → dashboard mis à jour (séance terminée, série 1 j) → progression → historique → persistance après rechargement.
2. Bibliothèque : filtre par catégorie, recherche, fiche, essai libre avec micro.
3. Outils : piano, métronome, gammes, mode chorale (étapes, mixage, lecture), mélodie (note par note, en entier), accordeur.
4. Réglages : tessiture, niveau manuel (la séance du jour se régénère), réinitialisation → retour à l'onboarding.
5. Responsive : barre inférieure sur mobile, latérale sur desktop, aucun défilement horizontal sur toutes les pages.

Chaque test échoue si une erreur console ou une exception de page survient.

## Bugs trouvés par les tests et corrigés

- Séance de 45 min trop courte de 12 min au niveau 1 (exercices plafonnés) → ajout de blocs supplémentaires et ajustement en deux passes.
- Changer de niveau ne régénérait pas la séance du jour → prise en compte du niveau dans `ensureTodaySession`.
- Piano : `setPointerCapture` levait une exception sur un événement sans `pointerId` → protégé.
- Dashboard : après une séance terminée, une nouvelle séance était régénérée automatiquement → affichage « séance terminée » et nouvelle séance à la demande.
