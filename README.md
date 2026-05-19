# nest-prisma-demo

API REST construite avec **NestJS** + **Prisma** + **PostgreSQL** + **BetterAuth**.  
Gestion complète d'utilisateurs, posts et catégories avec authentification, rôles et contrôle de propriété.

---

## Stack technique

| Outil | Rôle |
|---|---|
| NestJS 11 | Framework backend Node.js (architecture modulaire) |
| Prisma 7 | ORM — accès à la base de données via des types TypeScript |
| PostgreSQL 15 | Base de données relationnelle |
| BetterAuth | Authentification complète (email/password, OAuth) |
| class-validator | Validation automatique des corps de requête (DTO) |
| Docker / Docker Compose | Conteneurisation de l'API et de la BDD |

---

## Prérequis

- **Node.js** >= 20
- **npm** >= 9
- **Docker** + **Docker Compose**

---

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nestdb"

# BetterAuth
BETTER_AUTH_SECRET="une-chaine-aleatoire-de-32-caracteres-minimum"
BETTER_AUTH_URL="http://localhost:3003"

# Google OAuth (optionnel — console.cloud.google.com)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# GitHub OAuth (optionnel — github.com/settings/developers)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

---

## Lancer le projet

### Option 1 — Docker complet (recommandé)

```bash
docker compose up --build
```

L'API démarre sur **http://localhost:3003**, la BDD sur le port **5432**.  
Les migrations Prisma sont appliquées automatiquement au démarrage.

### Option 2 — En local (développement)

```bash
npm install
docker compose up -d postgres      # BDD uniquement
npx prisma migrate deploy          # Appliquer les migrations
npm run start:dev                  # Serveur avec hot-reload
```

---

## Structure du projet

```
src/
├── main.ts                        # Point d'entrée — montage BetterAuth + NestJS
├── app.module.ts                  # Module racine
├── auth/
│   ├── auth.config.ts             # Configuration BetterAuth (singleton)
│   └── auth.module.ts             # Module NestJS Auth
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts          # Connexion BDD partagée
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── paginate.dto.ts        # Pagination + filtre rôle
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
├── categories/
│   ├── dto/
│   │   ├── create-category.dto.ts
│   │   └── update-category.dto.ts
│   ├── categories.controller.ts
│   ├── categories.service.ts
│   └── categories.module.ts
└── common/
    ├── decorators/
    │   ├── current-user.decorator.ts  # @CurrentUser()
    │   ├── roles.decorator.ts         # @Roles('admin')
    │   ├── param-id.decorator.ts      # @ParamId()
    │   ├── paginate.decorator.ts      # @Paginate()
    │   └── trim.decorator.ts          # @Trim()
    ├── guards/
    │   ├── auth.guard.ts              # Vérifie la session BetterAuth
    │   └── roles.guard.ts             # Vérifie le rôle de l'utilisateur
    └── pipes/
        └── parse-role.pipe.ts         # Valide que ?role= est "admin" ou "user"
```

---

## Modèle de données

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  role          String    @default("user")  // "user" | "admin"
  firstname     String?
  lastname      String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  posts         Post[]
  sessions      Session[]
  accounts      Account[]
}

model Post {
  id         Int        @id @default(autoincrement())
  title      String
  content    String
  published  Boolean    @default(false)
  authorId   String                          // clé étrangère vers User
  author     User       @relation(...)
  categories Category[]
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  deletedAt  DateTime?
}

// Session, Account, Verification — gérés par BetterAuth
```

### Relations

```
User  ──< Post >──< Category
(1)      (many)    (many)
```

---

## Authentification (BetterAuth)

Toutes les routes d'auth sont montées sur `/api/auth`.

### Inscription

```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "mamadou@example.com",
  "password": "Password123!",
  "name": "Mamadou Diallo"
}
```

### Connexion email / mot de passe

```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "mamadou@example.com",
  "password": "Password123!"
}
```

Réponse : token de session + objet user. Un cookie `better-auth.session_token` est automatiquement posé.

### Connexion OAuth (GitHub / Google)

```http
POST /api/auth/sign-in/social
Content-Type: application/json

{
  "provider": "github",
  "callbackURL": "http://localhost:3003/api/auth/get-session"
}
```

Réponse : `{ "url": "https://github.com/login/...", "redirect": true }` — ouvrir l'URL dans le navigateur.

### Session courante

```http
GET /api/auth/get-session
```

### Déconnexion

```http
POST /api/auth/sign-out
Origin: http://localhost:3003
```

---

## Endpoints API

Base URL : `http://localhost:3003`

### Authentification requise

Les routes marquées 🔒 nécessitent un cookie de session valide.  
Les routes marquées 👑 nécessitent le rôle `admin`.

---

### Users

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/users` | — | Créer un utilisateur |
| `GET` | `/users` | 🔒 👑 | Lister tous les utilisateurs (admin uniquement) |
| `GET` | `/users?role=admin` | 🔒 👑 | Filtrer par rôle |
| `GET` | `/users/:id` | — | Récupérer un utilisateur |
| `PATCH` | `/users/:id` | — | Mettre à jour un utilisateur |
| `DELETE` | `/users/:id` | — | Soft-supprimer un utilisateur |
| `PATCH` | `/users/:id/restore` | — | Restaurer un utilisateur supprimé |

#### Filtre par rôle

```http
GET /users?role=admin&limit=10&offset=0
```

Valeurs acceptées pour `role` : `admin`, `user`. Toute autre valeur retourne une `400 Bad Request`.

---

### Posts

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/posts` | 🔒 | Créer un post (auteur = utilisateur connecté) |
| `GET` | `/posts` | — | Lister tous les posts |
| `GET` | `/posts/:id` | — | Récupérer un post |
| `PATCH` | `/posts/:id` | 🔒 propriétaire ou 👑 | Mettre à jour un post |
| `DELETE` | `/posts/:id` | 🔒 propriétaire ou 👑 | Soft-supprimer un post |
| `PATCH` | `/posts/:id/restore` | — | Restaurer un post supprimé |
| `GET` | `/posts/trash` | — | Lister les posts supprimés |
| `GET` | `/posts/trash/:id` | — | Récupérer un post supprimé |

> **Règle de propriété** : seul le créateur du post peut le modifier ou le supprimer. Un `admin` peut modifier/supprimer n'importe quel post. Tout autre utilisateur reçoit une `403 Forbidden`.

#### Créer un post

```http
POST /posts
Content-Type: application/json

{
  "title": "Mon premier article",
  "content": "Contenu de l'article...",
  "published": true,
  "categoryIds": [1, 2]
}
```

> `authorId` n'est plus fourni dans le body — il est automatiquement extrait de la session.

---

### Categories

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/categories` | Créer une catégorie |
| `GET` | `/categories` | Lister toutes les catégories |
| `GET` | `/categories/:id` | Récupérer une catégorie |
| `PATCH` | `/categories/:id` | Mettre à jour une catégorie |
| `DELETE` | `/categories/:id` | Supprimer une catégorie |

---

## Guards et sécurité

### AuthGuard

Vérifie que la requête contient une session BetterAuth valide.  
Injecte l'utilisateur connecté dans `req.user` — accessible via `@CurrentUser()`.

```typescript
@UseGuards(AuthGuard)
@Get('profil')
getProfil(@CurrentUser() user) {
  return user;
}
```

### RolesGuard

Vérifie que `req.user.role` correspond au rôle requis.  
Toujours utilisé **après** `AuthGuard`.

```typescript
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove() { ... }
```

### ParseRolePipe

Valide les query params de type rôle. Rejette les valeurs inconnues avec une `400`.

```typescript
@Get()
findAll(@Query('role', ParseRolePipe) role: string) { ... }
```

---

## Codes de réponse

| Code | Signification |
|---|---|
| `200` | Succès |
| `201` | Ressource créée |
| `400` | Données invalides (validation DTO ou pipe) |
| `401` | Non authentifié (session manquante ou expirée) |
| `403` | Accès refusé (rôle insuffisant ou non propriétaire) |
| `404` | Ressource introuvable |
| `409` | Conflit (email ou nom déjà utilisé) |

---

## Tests

```bash
npm test                    # Tous les tests (Jest + Testcontainers)
npm run test:cov            # Avec couverture de code
```

Les tests utilisent **Testcontainers** — un vrai PostgreSQL éphémère est démarré automatiquement. Docker doit être actif.

---

## Scripts disponibles

```bash
npm run start:dev     # Développement avec hot-reload
npm run build         # Compilation TypeScript
npm run lint          # ESLint + Prettier
npm test              # Tests
```

```bash
npx prisma migrate dev --name <nom>   # Nouvelle migration
npx prisma migrate deploy             # Appliquer les migrations
npx prisma studio                     # Interface graphique BDD
npx prisma generate                   # Régénérer le client Prisma
```

---

## Erreurs courantes

| Erreur | Cause | Solution |
|---|---|---|
| `ECONNREFUSED 5432` | PostgreSQL non démarré | `docker compose up -d postgres` |
| `401 Unauthorized` | Session manquante | Se connecter via `/api/auth/sign-in/email` |
| `403 Forbidden` | Rôle insuffisant ou non propriétaire | Vérifier le rôle ou l'ownership du post |
| `400 Bad Request` | Champ invalide ou rôle inconnu | Lire le message d'erreur |
| `409 Conflict` | Email ou nom déjà utilisé | Utiliser une valeur unique |
| `404 Not Found` | ID inexistant | Vérifier l'ID |
| `Missing or null Origin` | Header `Origin` absent | Ajouter `Origin: http://localhost:3003` |
| Tests lents (~30s) | Testcontainers tire l'image Docker | Normal au premier lancement |
