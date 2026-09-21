# AdSlott

Application web quotidienne (défi/sondage du jour, classement) dont
l'audience est monétisée par des slots publicitaires en surenchère
immédiate — le prix repart à 1 € chaque jour à minuit (Europe/Paris) et le
plus offrant prend le slot, sans remboursement du précédent annonceur.

V1 : monnaie fictive (portefeuille virtuel), pas de paiement réel.

## Stack

- TypeScript (strict), React, Next.js (App Router)
- PostgreSQL + Prisma
- Auth : session cookie chiffrée (`iron-session`) + mots de passe hashés (`bcryptjs`)
- Paiement : abstrait derrière une interface `PaymentProvider` (implémentation V1 = portefeuille virtuel, voir `src/lib/payment/`)
- Temps réel : polling toutes les 5 secondes (V1)
- Tests : Vitest, contre une vraie base Postgres

## Démarrer en local

### 1. Base de données

Avec Docker :

```bash
docker compose up -d
```

Sans Docker (Postgres déjà installé localement) : créez un rôle/une base
`adslott` correspondant à `.env.example`, ainsi qu'une base `adslott_test`
pour les tests d'intégration.

### 2. Variables d'environnement

```bash
cp .env.example .env
```

Ajustez `SESSION_SECRET` (32 caractères min., ex. `openssl rand -base64 32`)
et les autres valeurs si besoin. Pour les tests, un `.env.test` séparé
pointe vers `adslott_test` (voir plus bas).

### 3. Installation et migrations

```bash
npm install
npm run db:migrate   # applique les migrations sur adslott
npm run db:seed      # crée les slots de départ, un compte admin et un sondage du jour
```

Compte admin créé par le seed : `admin@adslott.local` / `adminpassword`.

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Tests

Les tests d'intégration tournent contre une vraie base Postgres (pas de
mock) pour valider la logique de concurrence. Créez une base
`adslott_test` (voir `.env.test`), appliquez-y les migrations, puis :

```bash
DATABASE_URL="postgresql://adslott:adslott@localhost:5432/adslott_test?schema=public" npx prisma migrate deploy
npm test
```

Couverture :

- `tests/bidding.test.ts` — logique d'enchère (acceptation, rejet sous le
  prix minimum, solde insuffisant, pas de remboursement, agrégation des
  stats journalières, nettoyage du HTML)
- `tests/reset.test.ts` — reset quotidien idempotent
- `tests/concurrency.test.ts` — N enchères simultanées sur le même slot :
  une seule gagne, aucune autre n'est débitée

## Reset quotidien

Le reset (prix → 1 €, annonce vidée) est **idempotent** et appliqué de
deux façons complémentaires :

1. **Rattrapage à la demande** : `GET /api/slots` (et donc chaque
   chargement de la page d'accueil) vérifie et réinitialise tout slot dont
   `lastResetDate` n'est plus la date du jour (Europe/Paris).
2. **Tâche planifiée** : `npm run cron:reset` exécute le même reset sans
   attendre de requête. À planifier via une crontab système à minuit
   Europe/Paris, par ex. :

   ```cron
   0 0 * * * cd /path/to/adslott && npm run cron:reset >> /var/log/adslott-reset.log 2>&1
   ```

Comme le rattrapage à la demande couvre les jobs manqués, une exécution en
retard ou en double du cron ne pose pas de problème.

## Concurrence

Chaque enchère s'exécute dans une transaction Postgres qui verrouille la
ligne du slot (`SELECT … FOR UPDATE`), relit le prix courant, vérifie que
l'offre dépasse prix + incrément minimal, débite le portefeuille (avec son
propre verrou de ligne), enregistre l'enchère et met à jour le slot — le
tout ou rien. Un trigger PostgreSQL interdit en plus toute baisse du prix
d'un slot en dehors du reset quotidien (voir la migration
`prisma/migrations/20260921181118_init`).

## Structure

```
src/lib/bidding.ts       logique d'enchère (transaction verrouillée)
src/lib/slots.ts         lecture des slots, reset quotidien idempotent
src/lib/payment/         interface PaymentProvider + implémentation portefeuille virtuel
src/lib/auth.ts          inscription/connexion, session
src/app/api/             routes API (slots, enchères, contenu du jour, admin)
src/app/admin/           interface d'administration
scripts/daily-reset.ts   script pour la tâche planifiée
tests/                   tests Vitest (intégration, contre Postgres)
```

## Variables d'environnement

Voir `.env.example`. Toutes les sommes sont en centimes (entiers).

| Variable                  | Description                                    |
| -------------------------- | ----------------------------------------------- |
| `DATABASE_URL`              | Connexion Postgres                              |
| `SESSION_SECRET`            | Clé de chiffrement du cookie de session (32+ car.) |
| `SLOT_START_PRICE_CENTS`    | Prix de départ d'un slot chaque jour (défaut 100) |
| `MIN_BID_INCREMENT_CENTS`   | Incrément minimal entre deux enchères (défaut 50) |
| `STARTING_WALLET_CENTS`     | Crédit de départ à l'inscription (défaut 5000)   |
| `RESET_TIMEZONE`            | Fuseau horaire du reset quotidien (Europe/Paris) |

## Hors périmètre V1

Paiements réels (Stripe), notifications, statistiques avancées, comptes
annonceurs complets, Redis/WebSockets. L'interface `PaymentProvider`
(`src/lib/payment/PaymentProvider.ts`) est conçue pour qu'une
implémentation Stripe (autorisation puis capture manuelle dans la
transaction verrouillée) remplace le portefeuille virtuel sans toucher à
la logique des slots.
