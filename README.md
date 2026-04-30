# nest-prisma-demo

API REST CRUD construite avec **NestJS** + **Prisma** + **PostgreSQL**.  
Objectif : gérer des utilisateurs (création, lecture, mise à jour, suppression) avec validation des données et pagination.

---

## Stack technique

| Outil | Rôle |
|---|---|
| NestJS 11 | Framework backend Node.js (architecture modulaire) |
| Prisma 7 | ORM — accès à la base de données via des types TypeScript |
| PostgreSQL 15 | Base de données relationnelle |
| class-validator | Validation automatique des corps de requête (DTO) |
| Docker / Docker Compose | Lancer la BDD (et l'API) sans rien installer localement |

---

## Prérequis

- **Node.js** >= 18
- **npm** >= 9
- **Docker** + **Docker Compose** (pour lancer la BDD)

---

## Lancer le projet en local (< 3 min)

### Étape 1 — Installer les dépendances

```bash
cd nest-prisma-demo
npm install
```

### Étape 2 — Démarrer la base de données PostgreSQL

```bash
docker compose up -d postgres
```

Cela lance un conteneur PostgreSQL avec :
- Utilisateur : `postgres`
- Mot de passe : `postgres`
- Base de données : `nestdb`
- Port exposé : `5432`

### Étape 3 — Configurer les variables d'environnement

Le fichier `.env` est déjà présent avec les valeurs par défaut :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestdb"
```

Aucune modification nécessaire si tu utilises Docker Compose.

### Étape 4 — Appliquer les migrations Prisma

```bash
npx prisma migrate deploy
```

> Cela crée la table `User` dans la base de données.

### Étape 5 — Lancer le serveur

```bash
npm run start:dev
```

L'API est disponible sur : **http://localhost:3003**

---

## Lancer avec Docker (API + BDD ensemble)

Si tu veux tout lancer dans Docker sans Node.js en local :

```bash
docker compose up --build
```

L'API démarre sur le port **3003**, la BDD sur le port **5432**.

---

## Structure du projet

```
src/
├── main.ts                  # Point d'entrée — démarre NestJS sur le port 3003
├── app.module.ts            # Module racine
├── prisma/
│   └── prisma.service.ts    # Service Prisma partagé (connexion BDD)
└── users/
    ├── users.module.ts      # Module Users
    ├── users.controller.ts  # Routes HTTP (POST, GET, PATCH, DELETE)
    ├── users.service.ts     # Logique métier
    └── dto/
        ├── create-user.dto.ts   # Validation à la création
        ├── update-user.dto.ts   # Validation à la mise à jour (champs optionnels)
        └── paginate.dto.ts      # Paramètres de pagination (limit, offset)

prisma/
└── schema.prisma            # Modèle de données (table User)
```

---

## Modèle de données

```prisma
// Un utilisateur peut avoir plusieurs posts
model User {
  id        Int      @id @default(autoincrement())
  firstname String
  lastname  String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
}

// Un post appartient à un auteur (User) et peut avoir plusieurs catégories
model Post {
  id         Int        @id @default(autoincrement())
  title      String
  content    String
  published  Boolean    @default(false)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  authorId   Int
  author     User       @relation(fields: [authorId], references: [id])
  categories Category[]
}

// Une catégorie peut être assignée à plusieurs posts (many-to-many implicite)
model Category {
  id    Int    @unique
  name  String @unique
  posts Post[]
}
```

### Schéma des relations

```
User  ──< Post >──< Category
(1)      (many)   (many)
```

- **User → Post** : relation **one-to-many** (un utilisateur écrit plusieurs posts)
- **Post ↔ Category** : relation **many-to-many** (Prisma génère automatiquement une table de jonction `_CategoryToPost`)

---

## Structure du projet (mise à jour)

```
src/
├── main.ts
├── app.module.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── paginate.dto.ts        # Réutilisé par posts et categories
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
├── posts/
│   ├── dto/
│   │   ├── create-post.dto.ts
│   │   └── update-post.dto.ts
│   ├── posts.controller.ts
│   ├── posts.service.ts
│   └── posts.module.ts
└── categories/
    ├── dto/
    │   ├── create-category.dto.ts
    │   └── update-category.dto.ts
    ├── categories.controller.ts
    ├── categories.service.ts
    └── categories.module.ts
```

---

## Endpoints API

Base URL : `http://localhost:3003`

### Créer un utilisateur

```http
POST /users
Content-Type: application/json

{
  "firstname": "Mamadou",
  "lastname": "Diallo",
  "email": "mamadou@example.com"
}
```

Réponse `201` :
```json
{
  "id": 1,
  "firstname": "Mamadou",
  "lastname": "Diallo",
  "email": "mamadou@example.com",
  "createdAt": "2026-04-30T10:00:00.000Z",
  "updatedAt": "2026-04-30T10:00:00.000Z"
}
```

---

### Lister tous les utilisateurs (avec pagination)

```http
GET /users?limit=10&offset=0
```

Réponse `200` :
```json
{
  "data": [...],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

---

### Récupérer un utilisateur par ID

```http
GET /users/:id
```

Réponse `200` ou `404` si introuvable.

---

### Mettre à jour un utilisateur

```http
PATCH /users/:id
Content-Type: application/json

{
  "firstname": "Nouveau prénom"
}
```

Tous les champs sont optionnels (PartialType du DTO de création).

---

### Supprimer un utilisateur

```http
DELETE /users/:id
```

Réponse `200` avec l'objet supprimé, ou `404` si introuvable.

---

---

### Posts

#### Créer un post

```http
POST /posts
Content-Type: application/json

{
  "title": "Mon premier article",
  "content": "Contenu de l'article...",
  "published": true,
  "authorId": 1,
  "categoryIds": [1, 2]
}
```

Réponse `201` — le post avec son auteur et ses catégories inclus (jointure) :
```json
{
  "id": 1,
  "title": "Mon premier article",
  "content": "Contenu de l'article...",
  "published": true,
  "authorId": 1,
  "author": { "id": 1, "firstname": "Mamadou", "lastname": "Diallo", "email": "mamadou@example.com" },
  "categories": [{ "id": 1, "name": "Tech" }, { "id": 2, "name": "NestJS" }],
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### Lister tous les posts (avec pagination)

```http
GET /posts?limit=10&offset=0
```

#### Récupérer un post par ID

```http
GET /posts/:id
```

#### Mettre à jour un post (champs optionnels)

```http
PATCH /posts/:id
Content-Type: application/json

{
  "published": false,
  "categoryIds": [3]
}
```

> `categoryIds` **remplace** toutes les catégories existantes du post par les nouvelles.

#### Supprimer un post

```http
DELETE /posts/:id
```

---

### Categories

#### Créer une catégorie

```http
POST /categories
Content-Type: application/json

{ "name": "Tech" }
```

Réponse `201` — la catégorie avec la liste de ses posts :
```json
{
  "id": 1,
  "name": "Tech",
  "posts": []
}
```

#### Lister toutes les catégories

```http
GET /categories?limit=10&offset=0
```

Chaque catégorie inclut ses posts et l'auteur de chaque post (double jointure).

#### Récupérer une catégorie par ID

```http
GET /categories/:id
```

#### Mettre à jour une catégorie

```http
PATCH /categories/:id
Content-Type: application/json

{ "name": "Backend" }
```

#### Supprimer une catégorie

```http
DELETE /categories/:id
```

---

## Validation automatique des données

NestJS est configuré avec `ValidationPipe` global :

- `whitelist: true` — les champs non déclarés dans le DTO sont automatiquement ignorés
- `forbidNonWhitelisted: true` — une erreur est renvoyée si un champ inconnu est envoyé
- `transform: true` — les types sont automatiquement convertis (ex: `"1"` → `1`)

Règles de validation sur `CreateUserDto` et les autres DTOs :
**User** : `firstname` (min 2 / max 100), `lastname` (min 2 / max 100), `email` (format valide, unique)

**Post** : `title` (min 3 / max 200), `content` (non vide), `authorId` (entier positif), `categoryIds` (tableau d'entiers, optionnel), `published` (booléen, optionnel)

**Category** : `name` (min 2 / max 100, unique)

---

## Tests avec vraie base de données (Testcontainers)

### Philosophie : pourquoi pas de mocks ?

Les tests utilisent **Testcontainers** pour démarrer un vrai conteneur PostgreSQL éphémère à chaque suite de tests, au lieu de mocker PrismaService.

**Pourquoi cette approche est supérieure aux mocks :**

| Mock Prisma | Vraie BDD (Testcontainers) |
|---|---|
| `mockResolvedValue({...})` retourne ce qu'on lui dit | Exécute la vraie requête SQL |
| Ne vérifie pas les contraintes du schéma | La contrainte `@unique` est vraiment testée |
| Si on retire `@unique` du schéma, le test continue de passer | Le test échoue immédiatement |
| Les relations FK ne sont pas vérifiées | Les FK et les cascades sont réelles |

> **Exemple concret** : le test `lève ConflictException si email déjà utilisé` avec un mock se contente de simuler l'erreur P2002. Avec Testcontainers, si un développeur retire accidentellement `@unique` du champ `email` dans le schéma Prisma, le test **détecte vraiment la régression**.

### Prérequis pour lancer les tests

- **Docker** doit être démarré (Testcontainers démarre un conteneur automatiquement)
- Aucune base de données locale nécessaire — tout est géré par Testcontainers

### Lancer les tests

```bash
npm test                    # Tous les tests (Jest)
npm run test:cov            # Avec couverture de code
```

```bash
# Lancer un seul fichier de test (plus rapide pendant le développement)
npx jest --testPathPatterns="users.service.spec" --runInBand
npx jest --testPathPatterns="users.controller.spec" --runInBand
npx jest --testPathPatterns="posts.service.spec" --runInBand
npx jest --testPathPatterns="categories.service.spec" --runInBand
```

> `--runInBand` force l'exécution séquentielle des tests dans un même processus Node.js, ce qui évite les conflits entre conteneurs Docker lancés en parallèle.

### Architecture des tests

```
src/
├── test/
│   └── db.helper.ts              # Helper partagé — démarre le conteneur, applique les migrations
├── app.controller.spec.ts        # Test simple (pas de BDD — endpoint /health)
├── users/
│   ├── users.service.spec.ts     # Tests service Users (vraie BDD)
│   └── users.controller.spec.ts  # Tests contrôleur Users (vraie BDD)
├── posts/
│   └── posts.service.spec.ts     # Tests service Posts (vraie BDD)
└── categories/
    └── categories.service.spec.ts # Tests service Categories (vraie BDD)
```

Le fichier `src/test/db.helper.ts` expose trois fonctions réutilisées dans chaque suite :

| Fonction | Rôle | Appelée dans |
|---|---|---|
| `setupTestDb()` | Démarre le conteneur PostgreSQL, applique les migrations, boot NestJS | `beforeAll` |
| `teardownTestDb(ctx)` | Arrête le module NestJS et le conteneur | `afterAll` |
| `cleanDatabase(prisma)` | Vide toutes les tables (ordre FK respecté) | `beforeEach` |

### Cycle de vie d'un test (suites avec BDD)

```
beforeAll  → démarre 1 conteneur PostgreSQL (postgres:16-alpine)
           → npx prisma migrate deploy (applique les migrations réelles)
           → boot du module NestJS de test

beforeEach → cleanDatabase() → vide post → user → category
             (garantit l'isolation entre chaque it())

afterAll   → module.close() + container.stop()
```

### Couverture des scénarios testés

**UsersService & UsersController** :
- `create` — création réussie, `ConflictException` si email dupliqué (contrainte `@unique` réelle)
- `findAll` — pagination, exclusion des soft-supprimés
- `findOne` — succès, `NotFoundException` si inexistant ou soft-supprimé
- `update` — mise à jour réussie, `NotFoundException`, `ConflictException` sur email dupliqué
- `remove` — soft delete (marque `deletedAt`), `NotFoundException`
- `restore` — remet `deletedAt` à null, `NotFoundException`, `ConflictException` si déjà actif

**PostsService** :
- `create` — succès avec auteur, `NotFoundException` si auteur inexistant ou soft-supprimé
- `findAll` / `findTrashed` — pagination, séparation actifs/supprimés
- `findOne` / `findOneTrashed` — accès ciblé, erreurs correctes
- `remove` — soft delete, `NotFoundException`
- `restore` — `NotFoundException`, `ConflictException` si déjà actif

**CategoriesService** :
- `create` — succès, `ConflictException` si nom dupliqué
- `findAll` — pagination correcte
- `findOne` — succès, `NotFoundException`
- `update` — succès, `NotFoundException`, `ConflictException` sur nom dupliqué
- `remove` — suppression définitive (hard delete), `NotFoundException`

---

## Scripts disponibles

```bash
npm run start:dev     # Démarrage en mode watch (rechargement automatique)
npm run start:prod    # Démarrage en production (depuis /dist)
npm run build         # Compilation TypeScript → JavaScript
npm run test          # Tests (Jest + Testcontainers, ~30s au démarrage)
npm run test:e2e      # Tests end-to-end
npm run lint          # Vérification du code (ESLint + Prettier)
```

```bash
npx prisma migrate dev --name <nom>   # Créer une nouvelle migration
npx prisma migrate deploy             # Appliquer les migrations existantes
npx prisma studio                     # Interface graphique pour la BDD
npx prisma generate                   # Régénérer le client Prisma
```

---

## Erreurs courantes

| Erreur | Cause | Solution |
|---|---|---|
| `ECONNREFUSED 5432` | PostgreSQL n'est pas démarré | `docker compose up -d postgres` |
| `409 Conflict` | Email déjà utilisé | Utiliser un email différent |
| `404 Not Found` | ID inexistant | Vérifier l'ID dans la BDD |
| `400 Bad Request` | Champ manquant ou invalide | Lire le message d'erreur de validation |
| `P1001` Prisma | Impossible de joindre la BDD | Vérifier `DATABASE_URL` dans `.env` |
| Tests lents (~30s) | Testcontainers tire l'image Docker au premier run | Normal — Docker met en cache l'image ensuite |
| `Cannot connect to the Docker daemon` | Docker n'est pas démarré | Démarrer Docker Desktop / le service Docker |
