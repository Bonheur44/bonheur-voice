# Vocal Training — coach vocal choral

En ligne : **https://voice-coach-khaki.vercel.app**

Application web de routine vocale personnalisée et progressive pour choristes, tous pupitres. Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Web Audio API, comptes et base de données Supabase.

Chaque choriste se connecte, retrouve sa progression sur tous ses appareils, et ne voit que ses propres données.

Le principe directeur : **le pupitre déclaré n'est jamais traité comme une vérité vocale.** L'application observe ce que la voix produit réellement, en déduit une étendue, une zone fiable et une zone confortable, et transpose les exercices en conséquence. Deux ténors dont les zones confortables diffèrent ne reçoivent pas les mêmes tonalités.

## Démarrer

```bash
npm install
cp .env.example .env.local     # puis remplir les valeurs, voir « Configuration » ci-dessous
npm run dev                    # http://localhost:3000
```

Sans `.env.local`, l'application démarre quand même et affiche un écran d'installation qui rappelle les étapes.

Tests :

```bash
npm test         # Vitest : profil vocal, test d'étendue, fusion de synchronisation, générateur, progression
npm run test:e2e # Playwright : parcours complet (nécessite un compte de test, voir plus bas)
```

## Configuration

### 1. Projet Supabase

1. Créer un projet sur [supabase.com](https://supabase.com), offre gratuite.
2. Dans **Project Settings → API**, copier l'URL du projet et la clé publique (« anon key », parfois nommée « publishable key »).
3. Renseigner `.env.local` :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Cette clé est visible dans le navigateur : c'est normal. La sécurité repose sur les règles Row Level Security de la base, pas sur le secret de la clé.

### 2. Schéma de la base

Coller le contenu de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) dans **SQL Editor** puis exécuter. Le script crée quatre tables, active la sécurité par ligne, ajoute le déclencheur de création de profil à l'inscription et la fonction de suppression de compte.

Exécuter ensuite [`supabase/migrations/0002_vocal_profile.sql`](supabase/migrations/0002_vocal_profile.sql), qui remplace le pupitre implicite par un pupitre déclaré — les sept, « je ne sais pas » compris — et ajoute la table `observations`. Les deux scripts sont rejouables sans dommage.

### 3. Connexion Google, facultative

La connexion par mot de passe fonctionne sans cette étape.

1. Dans la console Google Cloud, créer un identifiant OAuth de type « application web ».
2. Y ajouter comme URI de redirection autorisée : `https://<ton-projet>.supabase.co/auth/v1/callback`.
3. Dans Supabase, **Authentication → Providers → Google**, coller l'identifiant et le secret.
4. Dans Supabase, **Authentication → URL Configuration**, régler le « Site URL » sur l'adresse de production (`https://voice-coach-khaki.vercel.app`) et ajouter `http://localhost:3000` ainsi que `https://voice-coach-khaki.vercel.app/auth/callback` dans « Redirect URLs ». Sans cela, le retour de Google échoue silencieusement en production.

### 4. Courriels

Par défaut, Supabase demande une confirmation d'adresse à l'inscription. Pour un petit pupitre, cette étape peut être désactivée dans **Authentication → Providers → Email**. Le serveur d'envoi intégré est limité en volume : prévoir un fournisseur SMTP si l'application est ouverte largement.

### 5. Compte de test pour la suite Playwright

Créer un compte dédié, puis l'ajouter à `.env.local` :

```bash
E2E_EMAIL=test@exemple.fr
E2E_PASSWORD=...
```

Sans ces variables, la suite de bout en bout est ignorée au lieu d'échouer. Elle remet le compte à zéro au début de chaque scénario : ne pas utiliser un compte contenant une vraie progression.

## Ce que fait l'application

- **Page d'accueil publique** puis **connexion** par mot de passe ou Google, avec réinitialisation du mot de passe.
- **Onboarding** en quatre écrans : chorale ou non, pupitre déclaré parmi les sept, durée préférée, puis proposition d'évaluer sa voix tout de suite ou plus tard.
- **Évaluation de la voix** : test d'étendue interactif au micro. Il explore le grave puis l'aigu deux demi-tons à la fois, s'arrête immédiatement sur une gêne déclarée, revérifie quelques notes, et produit une étendue explorée, une zone fiable, une zone confortable, une zone centrale, d'éventuelles zones de transition et une estimation de pupitre assortie d'un niveau de confiance.
- **Dashboard** : séance du jour, profil vocal, série de jours, temps total, niveau, compétences, recommandation, derniers exercices.
- **Séance** : générée selon la durée choisie parmi 10, 15, 20, 30 et 45 minutes, le niveau, les scores par compétence et les ressentis récents. Structure fixe : respiration, échauffement, blocs de travail, retour au calme.
- **Lecteur d'exercice** : objectif, pourquoi, consignes, points d'attention, erreurs fréquentes, sécurité, puis minuteur, répétitions, pause, navigation, outil interactif, et enfin le ressenti.
- **Outils Web Audio** : guide respiratoire, métronome, bourdon, piano, « trouve la note » au micro, mesure de stabilité, intervalles, comparaison de hauteurs, gammes bornées à la zone de travail, apprentissage de mélodie, et le **mode chorale** SATB avec mixage par pupitre.
- **Mode chorale universel** : la ligne travaillée (S, A, T ou B) est un réglage. Les exercices choraux sont écrits en rôles — « ma ligne », « la voix qui attire l'oreille », « la voix d'appui » — et se reformulent pour le pupitre de l'utilisateur. La ligne à apprendre est extraite du choral et transposée dans sa zone.
- **Progression et historique** : radar et barres par compétence, minutes par semaine, activité sur 28 jours, objectifs, détail de chaque séance.
- **Choix des timbres** : six sons pour l'instrument de référence, du piano au son pur, et six jeux de voix pour le chœur. Le réglage reste sur l'appareil, parce que le bon timbre dépend du casque ou du haut-parleur utilisé. Ces choix ne sont pas seulement esthétiques : le son pur rend les écarts de justesse plus audibles, l'orgue aide à tenir une note longue, et les voix identiques suppriment tout indice de timbre pour retrouver sa ligne, ce qui en fait le réglage le plus exigeant.
- **Compte** : nom affiché, changement de mot de passe, état de synchronisation, suppression définitive du compte.

## Profil vocal

Seules les **observations** sont conservées : une tentative sur une note, avec la hauteur produite, la dispersion pendant la tenue, la durée, la clarté de la détection et le confort déclaré. Tout le reste — bandes, estimations, confiance — est une fonction pure recalculée à l'affichage.

Trois conséquences voulues :

- le profil évolue par construction : rien de périmé n'est stocké, et une observation de deux mois pèse moitié moins qu'une d'aujourd'hui ;
- l'application peut toujours répondre « données insuffisantes », puisque la quantité de preuves est une propriété de l'analyse et non un drapeau à maintenir ;
- toute la logique est testable sous Vitest, sans navigateur ni micro.

Quatre bandes, volontairement distinctes : l'**étendue explorée** (ce que la voix a produit), la **zone fiable** (reproduit avec justesse et stabilité), la **zone confortable** (sans tension déclarée) et la **zone centrale** (le noyau le plus assuré). Les bandes sont construites par grappes : une note isolée à sept demi-tons du reste — typiquement une erreur d'octave du détecteur — forme sa propre grappe au lieu de doubler l'étendue affichée.

L'estimation de pupitre compare la zone confortable observée à la **tessiture de travail** des sept pupitres, jamais aux notes extrêmes. Elle publie des parts relatives, un niveau de confiance séparé, et répond « plusieurs pupitres compatibles » quand les deux premiers se tiennent à moins de six points. Le contre-ténor est accompagné d'une réserve explicite : la hauteur seule ne le distingue pas d'un alto.

## Déploiement

L'adresse canonique vit dans [`lib/legal/config.ts`](lib/legal/config.ts) (`LEGAL.siteUrl`) et sert trois fois : mentions légales, `metadataBase` des métadonnées, et aperçu de partage. La changer à un seul endroit suffit.

À vérifier avant ou lors du premier déploiement :

- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` définies dans Vercel — ces variables sont **inlinées à la compilation**, un changement impose un redéploiement ;
- « Site URL » et « Redirect URLs » de Supabase pointant sur le domaine de production ;
- URI de redirection du client OAuth Google pointant sur `https://<projet>.supabase.co/auth/v1/callback` ;
- les deux migrations SQL exécutées.

L'aperçu de partage (`app/opengraph-image.png`, 1200 × 630) est généré à partir de la même marque que les icônes.

## Pages légales

Trois documents publics, accessibles sans compte : mentions légales, politique de confidentialité et conditions d'utilisation, sous `/legal`.

Tout ce qui doit être renseigné par une personne — identité de l'éditeur, adresse de contact, hébergeurs, région du projet — est rassemblé dans [`lib/legal/config.ts`](lib/legal/config.ts). Les valeurs non remplies s'afficheraient entre crochets, pour qu'un oubli se voie au lieu de passer pour une information exacte ; `pendingLegalFields()` en dresse la liste, et un test vérifie qu'elle est vide.

Deux rôles distincts y sont séparés, parce qu'ils relèvent de textes différents :

- l'**hébergeur du site** (Vercel), dont la LCEN impose de publier l'identité et l'adresse postale dans les mentions légales ;
- les **sous-traitants** au sens du RGPD (Supabase, et Google en cas de connexion Google), qu'il faut nommer dans la politique de confidentialité en indiquant où résident les données — sans obligation de publier leur adresse postale.

Le point d'accès de la base est affiché à partir de `NEXT_PUBLIC_SUPABASE_URL`, dont seul l'hôte est repris. Cette URL est déjà publique par construction : elle figure dans le code envoyé au navigateur, et la sécurité repose sur les règles d'isolation par ligne, non sur son secret.

Passer `publisher.anonymous` à `true` applique le régime non professionnel de la LCEN (article 6 III 2) : un particulier qui ne tire aucun revenu du site peut alors ne publier ni son nom ni son adresse, à condition de les avoir communiqués à son hébergeur.

## Synchronisation

Le cache local reste la source de vérité pendant l'usage : l'application fonctionne hors ligne, ce qui compte en répétition. Les données sont ensuite envoyées à Supabase.

- Une clé localStorage par utilisateur, pour que deux choristes sur le même téléphone ne mélangent pas leurs données.
- À la connexion : lecture distante, fusion avec le local, puis écriture du résultat.
- Ensuite, chaque modification est envoyée après deux secondes de regroupement, avec reprise automatique au retour du réseau.
- Arbitrage des conflits par horodatage le plus récent, avec des exceptions raisonnées : l'onboarding ne se défait jamais, les séances sont réunies plutôt qu'écrasées, et un objectif conserve sa première obtention. Les observations vocales, elles, ne sont jamais modifiées après coup : une simple union par identifiant suffit, ce qui permet à deux appareils d'enrichir le même profil. Les règles sont des fonctions pures dans [`lib/sync/merge.ts`](lib/sync/merge.ts), couvertes par des tests.
- Les valeurs par défaut ne portent pas d'horodatage : sur un appareil neuf, elles perdent l'arbitrage face au compte, ce qui évite d'écraser une progression existante.

## Limites honnêtes

- La détection de hauteur par autocorrélation est un **repère approximatif** : voix seule et tenue, pièce calme, erreurs d'octave possibles, inutilisable sur les consonnes. Elle couvre 60 à 1200 Hz, soit du Si1 d'une basse au Ré6 d'une soprano. L'interface n'affiche que « trop bas, correct, trop haut » à 25 cents près, et une stabilité indicative. Aucun son n'est enregistré ni transmis.
- Le profil vocal estimé n'est **ni un diagnostic, ni un verdict sur un pupitre**. Le placement dans un chœur dépend aussi du timbre, de l'endurance et des besoins de l'ensemble, que l'application ne mesure pas.
- Les voix du mode chorale sont synthétiques.
- Les scores de compétence modélisent la pratique et le ressenti déclaré. Ce n'est pas une mesure de la voix.
- L'application n'est pas un diagnostic médical : arrêter en cas de douleur, de raclement ou de fatigue vocale.

## Architecture

Voir [`docs/01-ANALYSE.md`](docs/01-ANALYSE.md) pour le passage du profil aux compétences et à la progression, [`docs/02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md) pour la technique, et [`docs/05-EVOLUTION-COACH-CHORAL.md`](docs/05-EVOLUTION-COACH-CHORAL.md) pour le passage de l'application ténor au coach multi-pupitres.

```text
app/            page d'accueil publique, login, reset-password, auth/callback,
                dashboard, onboarding, assessment (hub + test d'étendue),
                routine, routine/play, exercises, progression, history,
                tools, settings, account
proxy.ts        rafraîchit la session et protège les pages (convention Next 16)
components/     ui, layout, auth, dashboard, routine, exercises, audio, charts, vocal
lib/            types, skills, utils,
                audio       synthèse, détection de hauteur, timbres, transposition
                vocal       observations → bandes → estimation de pupitre
                assessment  machine à états du test d'étendue, catalogue des tests
                exercises   personnalisation des textes selon la ligne travaillée
                routine     génération de séance
                progression scores, niveaux, séries, recommandations
                storage, store, supabase (clients et types), sync (fusion et service)
data/           exercises (54 exercices, 9 catégories),
                music (mélodies, choral SATB, extraction de « ma ligne »)
supabase/       migrations SQL
tests/          unit (Vitest), e2e (Playwright)
```

Les clés de stockage local conservent le préfixe historique `vocal-training-tenor:` : les renommer orphelinerait les données déjà enregistrées sur les appareils.

## Suite envisagée

- Les sept autres évaluations — justesse, stabilité, oreille, intervalles, mémoire, indépendance, confort par zone — sont déjà décrites dans [`lib/assessment/catalog.ts`](lib/assessment/catalog.ts) et affichées comme « bientôt ». La chaîne d'observations existe : chacune n'a qu'à produire des `VocalObservation`.
- Espace chorale : invitation par lien, progression partagée entre choristes, répertoire commun, rôles de chef de pupitre. Chaque table étant déjà indexée par utilisateur, le modèle s'y prête.
- Import de chants : `ChoralePiece` est déjà indexé par voix, et « ma ligne » en est extraite à la demande. Ajouter un chant reviendrait à ajouter une pièce, sans toucher aux exercices.
