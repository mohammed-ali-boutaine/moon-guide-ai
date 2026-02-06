# Jira Planning - Phase 1 & 2 : Infrastructure, Authentification & Gestion de Classes


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
