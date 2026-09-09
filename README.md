# Vocal Training — Tenor

Application web de routine vocale personnalisée et progressive pour un ténor de chorale. Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Web Audio API, comptes et base de données Supabase.

Chaque choriste se connecte, retrouve sa progression sur tous ses appareils, et ne voit que ses propres données.

## Démarrer

```bash
npm install --legacy-peer-deps
cp .env.example .env.local     # puis remplir les valeurs, voir « Configuration » ci-dessous
npm run dev                    # http://localhost:3000
```

Sans `.env.local`, l'application démarre quand même et affiche un écran d'installation qui rappelle les étapes.

Tests :

```bash
npm test         # Vitest : fusion de synchronisation, générateur de séance, progression, notes
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

### 3. Connexion Google, facultative

La connexion par mot de passe fonctionne sans cette étape.

1. Dans la console Google Cloud, créer un identifiant OAuth de type « application web ».
2. Y ajouter comme URI de redirection autorisée : `https://<ton-projet>.supabase.co/auth/v1/callback`.
3. Dans Supabase, **Authentication → Providers → Google**, coller l'identifiant et le secret.
4. Dans Supabase, **Authentication → URL Configuration**, régler le « Site URL » sur `http://localhost:3000` en développement, et ajouter les URL de production dans « Redirect URLs ».

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
- **Onboarding** : zone confortable réglée au piano virtuel, l'étiquette « ténor » ne fixant pas la tessiture, puis durée préférée.
- **Dashboard** : séance du jour, série de jours, temps total, niveau, compétences, recommandation, derniers exercices.
- **Séance** : générée selon la durée choisie parmi 10, 15, 20, 30 et 45 minutes, le niveau, les scores par compétence et les ressentis récents. Structure fixe : respiration, échauffement, blocs de travail, retour au calme.
- **Lecteur d'exercice** : objectif, pourquoi, consignes, points d'attention, erreurs fréquentes, sécurité, puis minuteur, répétitions, pause, navigation, outil interactif, et enfin le ressenti.
- **Outils Web Audio** : guide respiratoire, métronome, bourdon, piano, « trouve la note » au micro, mesure de stabilité, intervalles, comparaison de hauteurs, gammes bornées à la zone confortable, apprentissage de mélodie, et le **mode chorale** SATB avec mixage par pupitre.
- **Progression et historique** : radar et barres par compétence, minutes par semaine, activité sur 28 jours, objectifs, détail de chaque séance.
- **Choix des timbres** : six sons pour l'instrument de référence, du piano au son pur, et six jeux de voix pour le chœur. Le réglage reste sur l'appareil, parce que le bon timbre dépend du casque ou du haut-parleur utilisé. Ces choix ne sont pas seulement esthétiques : le son pur rend les écarts de justesse plus audibles, l'orgue aide à tenir une note longue, et les voix identiques suppriment tout indice de timbre pour retrouver sa ligne, ce qui en fait le réglage le plus exigeant.
- **Compte** : nom affiché, changement de mot de passe, état de synchronisation, suppression définitive du compte.

## Synchronisation

Le cache local reste la source de vérité pendant l'usage : l'application fonctionne hors ligne, ce qui compte en répétition. Les données sont ensuite envoyées à Supabase.

- Une clé localStorage par utilisateur, pour que deux choristes sur le même téléphone ne mélangent pas leurs données.
- À la connexion : lecture distante, fusion avec le local, puis écriture du résultat.
- Ensuite, chaque modification est envoyée après deux secondes de regroupement, avec reprise automatique au retour du réseau.
- Arbitrage des conflits par horodatage le plus récent, avec des exceptions raisonnées : l'onboarding ne se défait jamais, les séances sont réunies plutôt qu'écrasées, et un objectif conserve sa première obtention. Les règles sont des fonctions pures dans [`lib/sync/merge.ts`](lib/sync/merge.ts), couvertes par des tests.
- Les valeurs par défaut ne portent pas d'horodatage : sur un appareil neuf, elles perdent l'arbitrage face au compte, ce qui évite d'écraser une progression existante.

## Limites honnêtes

- La détection de hauteur par autocorrélation est un **repère approximatif** : voix seule et tenue, pièce calme, erreurs d'octave possibles, inutilisable sur les consonnes. L'interface n'affiche que « trop bas, correct, trop haut » à 25 cents près, et une stabilité indicative. Aucun son n'est enregistré ni transmis.
- Les voix du mode chorale sont synthétiques.
- Les scores de compétence modélisent la pratique et le ressenti déclaré. Ce n'est pas une mesure de la voix.
- L'application n'est pas un diagnostic médical : arrêter en cas de douleur, de raclement ou de fatigue vocale.

## Architecture

Voir [`docs/01-ANALYSE.md`](docs/01-ANALYSE.md) pour le passage du profil aux compétences et à la progression, et [`docs/02-ARCHITECTURE.md`](docs/02-ARCHITECTURE.md) pour la technique.

```text
app/            page d'accueil publique, login, reset-password, auth/callback,
                dashboard, onboarding, routine, routine/play, exercises,
                progression, history, tools, settings, account
proxy.ts        rafraîchit la session et protège les pages (convention Next 16)
components/     ui, layout, auth, dashboard, routine, exercises, audio, charts
lib/            types, skills, utils, audio, routine/generator, progression,
                storage, store, supabase (clients et types), sync (fusion et service)
data/           exercises (54 exercices, 9 catégories), music (mélodies, choral SATB)
supabase/       migrations SQL
tests/          unit (Vitest), e2e (Playwright)
```

## Suite envisagée

Espace pupitre : invitation par lien, progression partagée entre choristes, répertoire commun de lignes de ténor, rôles de chef de pupitre. Le modèle de données actuel s'y prête, chaque table étant déjà indexée par utilisateur.
