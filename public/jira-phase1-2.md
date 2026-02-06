# Jira Planning - Phase 1 & 2 : Infrastructure, Authentification & Gestion de Classes

## Epic 1 : Infrastructure & Configuration du Projet

---

### Story 1.1 : Configuration de l'environnement de développement
**ID:** LEARN-001  
**Type:** Task  
**Priority:** Highest  
**Story Points:** 5

**Description:**
Mettre en place l'environnement de développement complet avec Docker pour garantir la cohérence entre les environnements de développement, test et production.

**User Story:**
En tant que développeur, je veux un environnement de développement conteneurisé avec Docker afin de garantir la cohérence et faciliter l'onboarding des nouveaux développeurs.

**Acceptance Criteria:**
- [ ] Docker et Docker Compose installés et configurés
- [ ] Conteneur PostgreSQL fonctionnel avec base de données initialisée
- [ ] Conteneur Redis opérationnel
- [ ] Variables d'environnement configurées (.env.example fourni)
- [ ] Script de démarrage rapide (docker-compose up)

**Technical Notes:**
- PostgreSQL 15+
- Redis 7+
- docker-compose.yml avec tous les services

---

### Story 1.2 : Configuration du projet Frontend (Next.js)
**ID:** LEARN-002  
**Type:** Task  
**Priority:** Highest  
**Story Points:** 3

**Description:**
Initialiser le projet frontend avec Next.js, TypeScript et TailwindCSS pour une base solide et moderne.

**User Story:**
En tant que développeur frontend, je veux un projet Next.js configuré avec TypeScript et TailwindCSS afin de développer une interface moderne et type-safe.

**Acceptance Criteria:**
- [ ] Projet Next.js 14+ initialisé avec TypeScript
- [ ] TailwindCSS configuré avec thème personnalisé
- [ ] Structure de dossiers organisée (components, pages, lib, hooks)
- [ ] ESLint et Prettier configurés
- [ ] Layout de base créé
- [ ] Variables d'environnement configurées

**Technical Notes:**
- Next.js 14+ (App Router)
- TypeScript strict mode
- TailwindCSS 3+

---

### Story 1.3 : Configuration du projet Backend (FastAPI)
**ID:** LEARN-003  
**Type:** Task  
**Priority:** Highest  
**Story Points:** 3

**Description:**
Initialiser le projet backend avec FastAPI, configuration de la base de données PostgreSQL et Redis.

**User Story:**
En tant que développeur backend, je veux un projet FastAPI structuré avec connexions DB afin de développer des API performantes et bien organisées.

**Acceptance Criteria:**
- [ ] Projet FastAPI initialisé avec structure modulaire
- [ ] SQLAlchemy configuré avec PostgreSQL
- [ ] Redis client configuré
- [ ] Modèles de base créés (Base class)
- [ ] Migrations Alembic configurées
- [ ] CORS configuré pour le frontend
- [ ] Health check endpoint (/health)

**Technical Notes:**
- FastAPI 0.110+
- SQLAlchemy 2.0+
- Alembic pour migrations
- Pydantic pour validation

---

### Story 1.4 : Configuration CI/CD
**ID:** LEARN-004  
**Type:** Task  
**Priority:** High  
**Story Points:** 5

**Description:**
Mettre en place un pipeline CI/CD avec GitHub Actions pour les tests automatisés et le déploiement.

**User Story:**
En tant que DevOps, je veux un pipeline CI/CD automatisé afin de garantir la qualité du code et automatiser les déploiements.

**Acceptance Criteria:**
- [ ] GitHub Actions configuré
- [ ] Pipeline de tests automatiques (backend et frontend)
- [ ] Linter et formatage vérifiés automatiquement
- [ ] Build Docker automatique
- [ ] Déploiement automatique vers environnement de staging
- [ ] Notifications en cas d'échec

**Technical Notes:**
- GitHub Actions workflows
- Tests avec pytest (backend) et Jest (frontend)

---

## Epic 2 : Système d'Authentification

---

### Story 2.1 : Modèle de données utilisateur
**ID:** LEARN-005  
**Type:** Task  
**Priority:** Highest  
**Story Points:** 3

**Description:**
Créer les modèles de base de données pour les utilisateurs, rôles et profils.

**User Story:**
En tant que développeur backend, je veux des modèles de données robustes pour les utilisateurs afin de gérer l'authentification et les rôles.

**Acceptance Criteria:**
- [ ] Modèle User (id, email, password_hash, created_at, updated_at, is_active)
- [ ] Modèle Role (id, name: STUDENT/TEACHER/ADMIN)
- [ ] Modèle UserProfile (id, user_id, first_name, last_name, avatar_url)
- [ ] Relations établies entre modèles
- [ ] Migrations créées et testées
- [ ] Indexes sur colonnes fréquemment requêtées

**Technical Notes:**
- UUID pour les IDs
- Indexation sur email (unique)
- Timestamps automatiques

---

### Story 2.2 : API d'inscription (Register)
**ID:** LEARN-006  
**Type:** Story  
**Priority:** Highest  
**Story Points:** 5

**Description:**
Implémenter l'API d'inscription permettant aux utilisateurs de créer un compte avec email et mot de passe.

**User Story:**
En tant qu'utilisateur, je veux pouvoir créer un compte avec mon email et un mot de passe afin d'accéder à la plateforme.

**Acceptance Criteria:**
- [ ] Endpoint POST /api/auth/register
- [ ] Validation email (format + unicité)
- [ ] Validation mot de passe (min 8 caractères, complexité)
- [ ] Hash du mot de passe (bcrypt)
- [ ] Envoi d'email de confirmation (optionnel pour v1)
- [ ] Retour du token JWT après inscription
- [ ] Gestion des erreurs (email déjà utilisé, mot de passe faible)

**Technical Notes:**
- bcrypt pour hashing
- Pydantic pour validation
- JWT token retourné

---

### Story 2.3 : API de connexion (Login)
**ID:** LEARN-007  
**Type:** Story  
**Priority:** Highest  
**Story Points:** 3

**Description:**
Implémenter l'API de connexion avec email/mot de passe retournant un JWT token.

**User Story:**
En tant qu'utilisateur enregistré, je veux pouvoir me connecter avec mes identifiants afin d'accéder à mon compte.

**Acceptance Criteria:**
- [ ] Endpoint POST /api/auth/login
- [ ] Vérification email et mot de passe
- [ ] Génération de JWT token (access + refresh)
- [ ] Token stocké dans cookie httpOnly ou retourné dans response
- [ ] Gestion des erreurs (identifiants invalides, compte inactif)
- [ ] Rate limiting (max 5 tentatives en 15 min)

**Technical Notes:**
- JWT avec expiration (access: 15min, refresh: 7 jours)
- python-jose pour JWT
- Redis pour rate limiting

---

### Story 2.4 : Middleware d'authentification
**ID:** LEARN-008  
**Type:** Task  
**Priority:** Highest  
**Story Points:** 3

**Description:**
Créer un middleware pour vérifier les tokens JWT et protéger les routes authentifiées.

**User Story:**
En tant que développeur backend, je veux un middleware d'authentification réutilisable afin de protéger facilement les routes privées.

**Acceptance Criteria:**
- [ ] Middleware vérifie la présence du token JWT
- [ ] Validation et décodage du token
- [ ] Injection de l'utilisateur courant dans le contexte
- [ ] Gestion des tokens expirés
- [ ] Refresh token automatique si nécessaire
- [ ] Réponse 401 si non authentifié

**Technical Notes:**
- Dependency injection FastAPI
- Décorateur @require_auth

---

### Story 2.5 : Système de rôles (RBAC)
**ID:** LEARN-009  
**Type:** Task  
**Priority:** High  
**Story Points:** 5

**Description:**
Implémenter le système de contrôle d'accès basé sur les rôles (RBAC) pour gérer les permissions.

**User Story:**
En tant que développeur, je veux un système RBAC afin de contrôler l'accès aux fonctionnalités selon le rôle de l'utilisateur.

**Acceptance Criteria:**
- [ ] Décorateur @require_role(roles: List[Role])
- [ ] Middleware vérifie le rôle de l'utilisateur
- [ ] Rôles : STUDENT, TEACHER, ADMIN
- [ ] Hiérarchie des rôles (ADMIN > TEACHER > STUDENT)
- [ ] Réponse 403 si permissions insuffisantes
- [ ] Tests unitaires pour chaque rôle

**Technical Notes:**
- Enum pour les rôles
- Vérification dans middleware

---

### Story 2.6 : OAuth2 - Connexion Google
**ID:** LEARN-010  
**Type:** Story  
**Priority:** Medium  
**Story Points:** 8

**Description:**
Implémenter l'authentification via Google OAuth2 pour faciliter l'inscription et la connexion.

**User Story:**
En tant qu'utilisateur, je veux pouvoir me connecter avec mon compte Google afin d'éviter de créer un nouveau mot de passe.

**Acceptance Criteria:**
- [ ] Configuration OAuth2 Google (Client ID, Secret)
- [ ] Endpoint GET /api/auth/google/login (redirect)
- [ ] Endpoint GET /api/auth/google/callback
- [ ] Création automatique du compte si premier login
- [ ] Lien avec compte existant si email identique
- [ ] Retour du JWT token après authentification
- [ ] Bouton "Se connecter avec Google" dans le frontend

**Technical Notes:**
- authlib ou httpx pour OAuth2
- Stockage des tokens OAuth en DB si nécessaire

---

### Story 2.7 : Page de connexion Frontend
**ID:** LEARN-011  
**Type:** Story  
**Priority:** Highest  
**Story Points:** 5

**Description:**
Créer l'interface de connexion avec formulaire email/mot de passe et bouton OAuth.

**User Story:**
En tant qu'utilisateur, je veux une page de connexion intuitive afin de me connecter facilement à la plateforme.

**Acceptance Criteria:**
- [ ] Formulaire avec champs email et mot de passe
- [ ] Validation frontend (email valide, mot de passe non vide)
- [ ] Bouton "Se connecter"
- [ ] Bouton "Se connecter avec Google"
- [ ] Affichage des erreurs (identifiants incorrects)
- [ ] Redirection vers dashboard après connexion réussie
- [ ] Lien vers page d'inscription
- [ ] Design responsive

**Technical Notes:**
- React Hook Form pour gestion formulaire
- Zod pour validation
- TailwindCSS pour styling

---

### Story 2.8 : Page d'inscription Frontend
**ID:** LEARN-012  
**Type:** Story  
**Priority:** Highest  
**Story Points:** 5

**Description:**
Créer l'interface d'inscription avec formulaire et sélection du rôle.

**User Story:**
En tant que nouvel utilisateur, je veux pouvoir créer un compte facilement afin d'accéder à la plateforme.

**Acceptance Criteria:**
- [ ] Formulaire avec email, mot de passe, confirmation mot de passe
- [ ] Champs nom et prénom
- [ ] Sélection du rôle (Étudiant / Enseignant)
- [ ] Validation frontend (mot de passe fort, emails identiques)
- [ ] Indicateur de force du mot de passe
- [ ] Bouton "S'inscrire"
- [ ] Affichage des erreurs
- [ ] Redirection vers dashboard après inscription
- [ ] Lien vers page de connexion

**Technical Notes:**
- React Hook Form + Zod
- Validation temps réel

---

### Story 2.9 : Gestion de session et déconnexion
**ID:** LEARN-013  
**Type:** Story  
**Priority:** High  
**Story Points:** 3

**Description:**
Implémenter la gestion de la session utilisateur et la fonctionnalité de déconnexion.

**User Story:**
En tant qu'utilisateur connecté, je veux pouvoir me déconnecter afin de sécuriser mon compte.

**Acceptance Criteria:**
- [ ] Stockage du token dans localStorage ou cookie
- [ ] Context API React pour état d'authentification global
- [ ] Hook useAuth() pour accéder à l'utilisateur courant
- [ ] Endpoint POST /api/auth/logout
- [ ] Invalidation du token côté serveur (blacklist Redis)
- [ ] Bouton déconnexion dans header
- [ ] Redirection vers page connexion après déconnexion

**Technical Notes:**
- Context API + useContext
- Redis pour blacklist tokens

---

## Epic 3 : Gestion de Classes

---

### Story 3.1 : Modèle de données Classes
**ID:** LEARN-014  
**Type:** Task  
**Priority:** Highest  
**Story Points:** 3

**Description:**
Créer le modèle de données pour les classes et l'association avec les utilisateurs.

**User Story:**
En tant que développeur backend, je veux un modèle de données pour les classes afin de gérer les groupes d'étudiants.

**Acceptance Criteria:**
- [ ] Modèle Class (id, name, description, teacher_id, created_at)
- [ ] Modèle ClassStudent (table association class_id, student_id, joined_at)
- [ ] Relation Many-to-One avec User (teacher)
- [ ] Relation Many-to-Many avec User (students)
- [ ] Migrations créées et testées
- [ ] Constraints : un enseignant peut avoir plusieurs classes, un étudiant plusieurs classes

**Technical Notes:**
- Table d'association pour Many-to-Many
- Index sur teacher_id et student_id

---

### Story 3.2 : API CRUD Classes (Enseignant)
**ID:** LEARN-015  
**Type:** Story  
**Priority:** Highest  
**Story Points:** 8

**Description:**
Implémenter les API pour créer, lire, modifier et supprimer des classes (réservé aux enseignants).

**User Story:**
En tant qu'enseignant, je veux pouvoir créer et gérer mes classes afin d'organiser mes étudiants.

**Acceptance Criteria:**
- [ ] POST /api/classes - Créer une classe (nom, description)
- [ ] GET /api/classes - Lister mes classes
- [ ] GET /api/classes/{id} - Détails d'une classe avec liste étudiants
- [ ] PUT /api/classes/{id} - Modifier une classe
- [ ] DELETE /api/classes/{id} - Supprimer une classe
- [ ] Vérification : seul le propriétaire peut modifier/supprimer
- [ ] Pagination pour la liste

**Technical Notes:**
- RBAC : @require_role([Role.TEACHER])
- Vérification ownership

---

### Story 3.3 : API Gestion des étudiants dans une classe
**ID:** LEARN-016  
**Type:** Story  
**Priority:** High  
**Story Points:** 5

**Description:**
Implémenter les API pour ajouter et retirer des étudiants d'une classe.

**User Story:**
En tant qu'enseignant, je veux pouvoir ajouter et retirer des étudiants de mes classes afin de gérer les inscriptions.

**Acceptance Criteria:**
- [ ] POST /api/classes/{id}/students - Ajouter un étudiant par email
- [ ] DELETE /api/classes/{id}/students/{student_id} - Retirer un étudiant
- [ ] GET /api/classes/{id}/students - Liste des étudiants de la classe
- [ ] Vérification : seul le prof propriétaire peut modifier
- [ ] Validation : l'utilisateur ajouté doit avoir le rôle STUDENT
- [ ] Gestion erreurs : étudiant déjà dans la classe, étudiant inexistant

**Technical Notes:**
- Recherche user par email
- Validation du rôle

---

### Story 3.4 : API Liste des classes pour étudiant
**ID:** LEARN-017  
**Type:** Story  
**Priority:** High  
**Story Points:** 3

**Description:**
Permettre aux étudiants de voir les classes auxquelles ils appartiennent.

**User Story:**
En tant qu'étudiant, je veux voir la liste de mes classes afin de savoir dans quels groupes je suis inscrit.

**Acceptance Criteria:**
- [ ] GET /api/students/me/classes - Liste des classes de l'étudiant connecté
- [ ] Informations retournées : nom classe, description, nom enseignant, nombre étudiants
- [ ] Filtrage et recherche optionnels
- [ ] Tri par date de création

**Technical Notes:**
- Join avec User pour info enseignant
- Count des étudiants

---

### Story 3.5 : Page Gestion des classes - Frontend Enseignant
**ID:** LEARN-018  
**Type:** Story  
**Priority:** Highest  
**Story Points:** 8

**Description:**
Créer l'interface permettant aux enseignants de gérer leurs classes.

**User Story:**
En tant qu'enseignant, je veux une interface pour créer et gérer mes classes afin d'organiser mes étudiants facilement.

**Acceptance Criteria:**
- [ ] Page avec liste des classes en cards
- [ ] Bouton "Créer une classe" ouvrant un modal
- [ ] Formulaire création : nom, description
- [ ] Pour chaque classe : nom, nombre d'étudiants, action modifier/supprimer
- [ ] Confirmation avant suppression
- [ ] Design responsive et moderne
- [ ] Loading states et gestion erreurs

**Technical Notes:**
- Modal avec React Portal
- TanStack Query pour data fetching
- Optimistic updates

---

### Story 3.6 : Page Détails d'une classe - Frontend Enseignant
**ID:** LEARN-019  
**Type:** Story  
**Priority:** High  
**Story Points:** 8

**Description:**
Créer la page de détails d'une classe avec liste des étudiants et actions.

**User Story:**
En tant qu'enseignant, je veux voir les détails d'une classe et gérer ses étudiants afin de suivre ma classe.

**Acceptance Criteria:**
- [ ] Header avec nom et description de la classe
- [ ] Bouton "Modifier la classe"
- [ ] Section "Étudiants" avec tableau (nom, email, date d'inscription)
- [ ] Bouton "Ajouter un étudiant" ouvrant un modal
- [ ] Formulaire ajout : recherche par email
- [ ] Action "Retirer" pour chaque étudiant avec confirmation
- [ ] Statistiques : nombre total d'étudiants
- [ ] Breadcrumb navigation

**Technical Notes:**
- Table réutilisable avec tri
- Search/autocomplete pour ajout étudiant

---

### Story 3.7 : Page Mes Classes - Frontend Étudiant
**ID:** LEARN-020  
**Type:** Story  
**Priority:** High  
**Story Points:** 5

**Description:**
Créer l'interface permettant aux étudiants de voir leurs classes.

**User Story:**
En tant qu'étudiant, je veux voir la liste de mes classes afin de naviguer vers mes cours et quiz.

**Acceptance Criteria:**
- [ ] Page avec liste des classes en cards
- [ ] Pour chaque classe : nom, nom enseignant, nombre étudiants
- [ ] Click sur une classe pour voir les détails
- [ ] Badge avec nombre de quiz assignés (à venir)
- [ ] Design responsive
- [ ] Message si aucune classe

**Technical Notes:**
- Grid layout responsive
- Link vers détails classe

---

### Story 3.8 : Dashboard Enseignant - Vue d'ensemble
**ID:** LEARN-021  
**Type:** Story  
**Priority:** Medium  
**Story Points:** 5

**Description:**
Créer un dashboard pour l'enseignant avec statistiques globales.

**User Story:**
En tant qu'enseignant, je veux un dashboard avec vue d'ensemble afin de suivre mes classes rapidement.

**Acceptance Criteria:**
- [ ] Cartes avec statistiques : nombre total de classes, étudiants, quiz (à venir)
- [ ] Liste des dernières classes créées
- [ ] Graphique simple (nombre étudiants par classe)
- [ ] Liens rapides vers actions fréquentes
- [ ] Design moderne avec icônes

**Technical Notes:**
- Chart.js ou Recharts pour graphiques
- Agrégation côté backend

---

### Story 3.9 : Dashboard Étudiant - Vue d'ensemble
**ID:** LEARN-022  
**Type:** Story  
**Priority:** Medium  
**Story Points:** 5

**Description:**
Créer un dashboard pour l'étudiant avec informations personnalisées.

**User Story:**
En tant qu'étudiant, je veux un dashboard personnalisé afin de voir rapidement mes classes et quiz à venir.

**Acceptance Criteria:**
- [ ] Message de bienvenue avec prénom
- [ ] Cartes avec statistiques : nombre de classes, quiz complétés (à venir)
- [ ] Section "Mes classes" avec accès rapide
- [ ] Section "Quiz récents" (à venir)
- [ ] Design engageant et motivant

**Technical Notes:**
- Skeleton loading
- Empty states bien designés

---

### Story 3.10 : Tests unitaires et d'intégration
**ID:** LEARN-023  
**Type:** Task  
**Priority:** High  
**Story Points:** 5

**Description:**
Écrire des tests complets pour les fonctionnalités d'authentification et gestion de classes.

**User Story:**
En tant que développeur, je veux des tests automatisés afin de garantir la fiabilité du code.

**Acceptance Criteria:**
- [ ] Tests unitaires pour modèles (User, Class, etc.)
- [ ] Tests API pour tous les endpoints d'auth
- [ ] Tests API pour tous les endpoints de classes
- [ ] Tests RBAC (permissions)
- [ ] Tests d'intégration pour workflows complets
- [ ] Coverage > 80%

**Technical Notes:**
- pytest + pytest-asyncio
- Factory Boy pour fixtures
- TestClient FastAPI

---

## Résumé

**Total Stories:** 23  
**Total Story Points:** 110

### Répartition par Epic:
- **Epic 1 - Infrastructure:** 4 stories, 16 points (1 semaine)
- **Epic 2 - Authentification:** 9 stories, 40 points (2 semaines)
- **Epic 3 - Gestion de Classes:** 10 stories, 54 points (2 semaines)

### Priorités:
- **Highest:** 13 stories
- **High:** 8 stories
- **Medium:** 2 stories

### Ordre de développement recommandé:
1. Sprint 1 (2 semaines): LEARN-001 à LEARN-004 (Infrastructure)
2. Sprint 2 (2 semaines): LEARN-005 à LEARN-009 (Auth Backend + RBAC)
3. Sprint 3 (2 semaines): LEARN-011 à LEARN-013 (Auth Frontend + Session)
4. Sprint 4 (2 semaines): LEARN-014 à LEARN-017 (Classes Backend)
5. Sprint 5 (2 semaines): LEARN-018 à LEARN-022 (Classes Frontend + Dashboards)
6. Sprint 6 (1 semaine): LEARN-010 (OAuth Google) + LEARN-023 (Tests)

**Durée totale estimée:** 6-7 semaines
