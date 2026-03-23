# Cahier des Charges Fonctionnel et Technique

## Projet : LearnAI – Plateforme Intelligente de Recommandation et d'Apprentissage Personnalisé

---

### 1. Contexte et Objectifs

#### 1.1 Contexte

L'évaluation des connaissances et l'accompagnement pédagogique nécessitent des outils intelligents et adaptatifs. Les enseignants ont besoin de systèmes efficaces pour générer des quiz, gérer leurs classes, et obtenir des analyses détaillées des performances des étudiants. Les étudiants, quant à eux, ont besoin d'un assistant intelligent capable de répondre à leurs questions et de leur fournir un feedback personnalisé.

#### 1.2 Objectif Principal

Développer une plateforme intelligente d'évaluation et d'assistance pédagogique basée sur un chatbot avec RAG (Retrieval-Augmented Generation), permettant la génération automatique de quiz à partir de documents, la gestion de classes, l'analyse détaillée des performances des étudiants, et l'orientation de carrière personnalisée basée sur l'IA.

#### 1.3 Objectifs Spécifiques

- Générer automatiquement des quiz et des questions d'évaluation à partir de documents uploadés.
- Fournir un chatbot intelligent basé sur RAG capable de répondre aux questions, expliquer des concepts et générer des résumés à partir des documents.
- Permettre aux enseignants de créer des quiz et de les assigner à des classes spécifiques.
- Fournir une correction automatique avec feedback détaillé et analyse des performances.
- Suivre et visualiser la progression des étudiants par classe et par quiz.
- Proposer un système d'orientation de carrière intelligent utilisant un modèle NLP/ML pour recommander des parcours académiques et professionnels basés sur le profil et les intérêts de l'étudiant.
- Assurer la sécurité des données et la conformité RGPD.

---

### 2. Fonctionnalités Principales

#### 2.1 Analyse et Exploitation de Ressources (PDF, Word, TXT)

- Résumé automatique des documents.
- Système de questions/réponses basé sur le contenu.
- Chatbot spécialisé pour expliquer le document.
- Génération automatique de quiz à partir du document.

#### 2.2 Chatbot Intelligent avec RAG

**Réponses aux Questions :**
- Assistance instantanée basée sur les documents uploadés.
- Compréhension du contexte et de l'historique de conversation.
- Réponses sourcées avec références aux documents.

**Explication de Concepts :**
- Clarification des concepts difficiles avec exemples concrets.
- Adaptation du niveau d'explication selon le profil de l'étudiant.
- Utilisation d'analogies et de métaphores pédagogiques.

**Génération de Contenu :**
- Résumés de documents automatiques.
- Extraction de points clés et concepts importants.
- Fiches de révision générées à partir des documents.

**RAG (Retrieval-Augmented Generation) :**
- Indexation et vectorisation des documents uploadés.
- Recherche sémantique dans la base de connaissances.
- Génération de réponses précises et contextualisées.
- Références aux sections spécifiques des documents sources.

#### 2.3 Gestion de Classes

**Création et Gestion de Classes :**
- Création de classes par l'enseignant.
- Ajout et gestion des étudiants par classe.
- Tableau de bord par classe avec statistiques globales.

**Attribution de Quiz :**
- Assignment de quiz spécifiques à une ou plusieurs classes.
- Planification de la disponibilité des quiz.
- Suivi des soumissions par classe.

#### 2.4 Espace Enseignant

**Génération de Quiz :**
- Génération automatique de quiz à partir de documents uploadés (PDF, DOCX, TXT).
- Création manuelle via éditeur visuel intuitif.
- Support de multiples types de questions (QCM, vrai/faux, questions ouvertes, etc.).
- Configuration du quiz (temps limite, seuil de réussite, tentatives).

**Gestion de Classes :**
- Création et gestion de classes.
- Ajout/suppression d'étudiants.
- Attribution de quiz à des classes spécifiques.

**Correction Automatique :**
- Évaluation automatique des réponses des étudiants via IA.
- Analyse NLP pour les questions ouvertes.
- Attribution de points partiels pour réponses incomplètes.

**Feedback Détaillé pour Étudiants :**
- Identification des forces et faiblesses par concept.
- Axes d'amélioration priorisés.
- Explications pédagogiques pour chaque erreur.

**Tableau de Bord Enseignant :**
- Résumé de la performance globale par classe.
- Analyse individuelle des étudiants avec alertes pour ceux en difficulté.
- Statistiques par quiz : taux de réussite, questions difficiles, concepts à revoir.
- Insights pédagogiques.

#### 2.5 Espace Étudiant

**Passage de Quiz :**
- Interface d'examen épurée avec timer et sauvegarde automatique.
- Modes entraînement (feedback immédiat) et examen (résultats après soumission).

**Feedback Intelligent et Personnalisé :**
- Score détaillé avec explications pour chaque réponse.
- Analyse des points forts et des lacunes identifiées.
- Points à améliorer identifiés par le système.

**Suivi de Progression :**
- Visualisation de l'évolution des performances dans le temps.
- Graphiques par quiz et par concept.
- Historique des quiz passés avec résultats détaillés.

**Accès au Chatbot :**
- Interaction avec le chatbot pour poser des questions sur les documents.
- Demande d'explications sur les concepts difficiles.
- Génération de résumés et de fiches de révision.

#### 2.6 Système d'Orientation de Carrière (Career Advisor)

**Analyse de Profil :**
- Questionnaire interactif pour collecter les informations de l'étudiant.
- Compétences actuelles, domaines d'intérêt, niveau académique.
- Objectifs professionnels et préférences (salaire, secteur, environnement de travail).

**Modèle NLP/ML pour Recommandations :**
- Analyse sémantique des réponses de l'étudiant via NLP.
- Modèle de Machine Learning entraîné sur des données de parcours académiques et professionnels.
- Classification et matching entre profil étudiant et filières/carrières.

**Recommandations de Parcours Académiques :**
- Suggestion de branches et spécialités adaptées au profil.
- Filières universitaires recommandées (Informatique, Ingénierie, Médecine, etc.).
- Programmes et diplômes suggérés avec justifications.

**Recommandations de Carrières :**
- Liste de métiers correspondant au profil et intérêts.
- Description détaillée de chaque carrière (compétences requises, perspectives, salaire moyen).
- Classement par pertinence selon le matching du modèle ML.

**Questions Interactives Intelligentes :**
- Système de questions adaptatives qui s'ajustent selon les réponses précédentes.
- Questions sur les matières préférées, compétences soft skills, valeurs professionnelles.
- Analyse des réponses pour affiner les recommandations.

**Rapport d'Orientation Personnalisé :**
- Génération d'un rapport complet avec parcours recommandés.
- Roadmap étape par étape pour atteindre les objectifs.
- Ressources et conseils pour chaque parcours suggéré.

---

### 3. Spécifications Fonctionnelles

#### 3.1 Gestion des Utilisateurs et Sécurité

**Authentification :**
- Connexion sécurisée via Email/Mot de passe ou OAuth2 (Google/Microsoft).

**Rôles (RBAC) :**
- **Étudiant** : Accès aux cours recommandés, quiz, chatbot, suivi de progression.
- **Enseignant** : Upload de contenus, création de cours, accès aux statistiques des étudiants.
- **Admin** : Gestion globale, analytics, logs d'audit.

**Profil Apprenant :**
- Informations de base (nom, email, classe).
- Historique des quiz passés.

#### 3.2 Gestion de Classes

**Création de Classes :**
- L'enseignant peut créer des classes.
- Chaque classe a un nom et une description.

**Gestion des Étudiants :**
- Ajout d'étudiants à une classe.
- Visualisation de la liste des étudiants par classe.
- Suppression ou transfert d'étudiants.

**Attribution de Quiz :**
- Assignment de quiz à une ou plusieurs classes.
- Les étudiants ne voient que les quiz assignés à leur classe.

#### 3.3 Chatbot Intelligent avec RAG

**Chat Conversationnel :**
- Réponse aux questions basée sur les documents uploadés.
- Explications simplifiées de concepts complexes.
- Génération de résumés de documents.

**RAG (Retrieval-Augmented Generation) :**
- Upload de documents (PDF, DOCX, TXT) par l'enseignant ou l'étudiant.
- Découpage et vectorisation des documents.
- Stockage dans une base de données vectorielle.
- Recherche sémantique pour trouver les passages pertinents.
- Génération de réponses avec références aux sources.

**Historique de Conversation :**
- Stockage des conversations par utilisateur.
- Maintien du contexte dans la conversation.

#### 3.4 Génération et Gestion de Quiz Intelligents

**3.4.1 Création de Quiz par l'Enseignant**

**Interface de Création :**
- Éditeur visuel pour créer des quiz personnalisés.
- Support de multiples types de questions : QCM, vrai/faux, questions ouvertes, association, ordre de réponses.
- Import de questions depuis des documents (PDF, DOCX) avec extraction automatique par IA.
- Réutilisation de questions depuis la banque de questions.

**Configuration du Quiz :**
- Définition du temps limite, du seuil de réussite, du nombre de tentatives autorisées.
- Activation/désactivation du mode aléatoire (ordre des questions et réponses).
- Planification de la disponibilité (dates d'ouverture/fermeture).
- Attribution à des groupes d'étudiants spécifiques.

**Génération Assistée par IA :**
- Suggestion automatique de questions basées sur le contenu du cours.
- Génération de questions de différents niveaux de difficulté (Bloom's Taxonomy).
- Validation de la qualité et de la cohérence des questions générées.

**3.4.2 Passage du Quiz par l'Étudiant**

**Interface d'Examen :**
- Interface épurée sans distractions pour la concentration.
- Timer visible avec alertes avant la fin du temps.
- Sauvegarde automatique des réponses en cours.
- Navigation entre questions avec indicateur de progression.
- Marquage des questions à réviser avant soumission.

**Modes de Passage :**
- Mode entraînement : feedback immédiat après chaque question.
- Mode examen : résultats affichés après soumission complète.

**Protection Anti-Triche :**
- Détection de changement d'onglet/fenêtre.
- Limitation du temps par question (optionnel).
- Enregistrement des timestamps d'activité.

**3.4.3 Correction Automatique par IA**

**Correction Instantanée :**
- Évaluation automatique des QCM, vrai/faux, associations.
- Analyse NLP pour les questions ouvertes (matching sémantique, pas seulement mot-à-mot).
- Détection des réponses partiellement correctes avec attribution de points partiels.

**Génération de Feedback Personnalisé :**
- Explication détaillée pour chaque réponse incorrecte.
- Références aux sections des documents à réviser.
- Identification des concepts non maîtrisés.

**Analyse des Patterns d'Erreurs :**
- Détection des misconceptions récurrentes.
- Identification des lacunes dans la compréhension globale.
- Classement des erreurs par type (conceptuel, inattention, calcul).

**3.4.4 Rapport de Résultats et Points à Améliorer**

**Pour l'Étudiant :**

**Score et Statistiques :**
- Note globale avec visualisation (jauge, graphique).
- Temps passé par question vs temps moyen de la classe.
- Classement anonyme (optionnel).

**Analyse Détaillée :**
- Réponses correctes/incorrectes question par question avec explications.
- Points forts : concepts bien maîtrisés.
- Points à améliorer : Liste priorisée des compétences à travailler.
- Comparaison avec les tentatives précédentes (progression).

**Pour l'Enseignant :**

**Tableau de Bord Quiz :**
- Vue d'ensemble : taux de réussite, note moyenne, temps moyen.
- Distribution des notes (histogramme).
- Identification des étudiants en difficulté (alertes automatiques).

**Analyse par Question :**
- Taux de réussite par question (identification des questions difficiles).
- Analyse des réponses incorrectes communes (detection de problèmes d'enseignement).
- Suggestions d'amélioration du quiz par l'IA.

**Insights Pédagogiques :**
- Concepts les moins maîtrisés : Classement des notions à revoir en classe.
- Corrélation entre temps passé et performance.
- Comparaison des performances entre groupes/cohortes.
- Évolution des résultats dans le temps.

**Actions Recommandées :**
- Suggestions de contenus à renforcer dans le prochain cours.
- Identification des étudiants nécessitant un accompagnement personnalisé.
- Recommandations pour ajuster la difficulté des prochains quiz.

**3.4.5 Révision et Amélioration Continue**

**Feedback Loop :**
- Les étudiants peuvent signaler des questions ambiguës ou incorrectes.
- L'enseignant peut modifier les questions en fonction des retours.
- Statistiques d'utilisation pour identifier les questions à améliorer.

**Banque de Questions Intelligente :**
- Stockage et catégorisation automatique de toutes les questions.
- Métadonnées : difficulté, taux de réussite, temps moyen, concepts couverts.
- Recherche et filtrage avancés pour réutilisation.

#### 3.5 Suivi de Progression & Analytics

**Dashboard Apprenant :**
- Visualisation de la progression par domaine/compétence.
- Temps passé par cours, taux de complétion.
- Badges et gamification (récompenses pour milestones).

**Dashboard Enseignant :**
- Statistiques d'engagement des étudiants.
- Identification des contenus les plus/moins performants.
- Détection des apprenants en difficulté.

#### 3.6 Système d'Orientation de Carrière Intelligent

**Collecte de Données Profil :**
- Questionnaire initial structuré pour les nouveaux étudiants.
- Mise à jour continue du profil basée sur les performances aux quiz.
- Informations collectées : niveau académique, matières préférées, compétences, intérêts, objectifs.

**Modèle NLP/ML d'Orientation :**

**A. Traitement NLP des Réponses :**
- Analyse sémantique des réponses textuelles ouvertes.
- Extraction d'entités (domaines d'intérêt, compétences, valeurs).
- Sentiment analysis pour détecter les préférences et motivations.
- Word embeddings pour comprendre les nuances des réponses.

**B. Modèle de Classification ML :**
- Algorithme de classification multi-label pour branches académiques.
- Features : performances académiques, intérêts, compétences soft/hard skills.
- Training sur datasets de parcours académiques et professionnels réels.
- Modèles candidats : Random Forest, XGBoost, ou Neural Networks.

**C. Système de Scoring et Matching :**
- Score de compatibilité entre profil étudiant et chaque branche/carrière.
- Pondération des critères selon importance (compétences > intérêts > autres).
- Ranking des recommandations par pertinence.

**Questions Adaptatives Intelligentes :**
- Arbre de décision dynamique pour les questions.
- Questions suivantes adaptées selon réponses précédentes.
- Réduction du nombre de questions via apprentissage actif.
- Types de questions : préférences académiques, environnement de travail, valeurs professionnelles.

**Génération de Recommandations :**

**Branches Académiques :**
- Liste de filières universitaires recommandées (Informatique, Ingénierie, Médecine, Sciences, etc.).
- Justification détaillée pour chaque branche suggérée.
- Spécialités recommandées au sein de chaque branche.
- Prérequis et compétences nécessaires.

**Carrières Professionnelles :**
- Métiers correspondant au profil avec pourcentage de matching.
- Description détaillée : missions, compétences requises, évolution, salaire moyen.
- Parcours type pour atteindre chaque carrière.
- Opportunités d'emploi dans le marché local/international.

**Rapport d'Orientation Personnalisé :**
- Document PDF généré automatiquement avec toutes les recommandations.
- Roadmap étape par étape avec timeline.
- Ressources pour approfondir (sites, livres, formations).
- Possibilité de réviser le profil et régénérer le rapport.

**Mise à Jour Continue :**
- Recalcul des recommandations basé sur l'évolution des performances.
- Notifications quand de nouvelles opportunités correspondent au profil.
- Adaptation du modèle ML via feedback utilisateur.

#### 3.7 Gestion des Documents

**Upload Multi-formats :**
- Support de PDF, DOCX, TXT, vidéos (MP4, YouTube links).

**Transcription Automatique :**
- Conversion des vidéos en texte via API (Whisper, AssemblyAI).

**Indexation Intelligente :**
- Organisation automatique des contenus par thème, niveau, durée.

**Métadonnées Enrichies :**
- Tags, descriptions, prérequis générés par IA.

---

### 4. Spécifications Techniques

#### 4.1 Stack Technologique

Cette stack est conçue pour la scalabilité et la performance requise par les systèmes d'apprentissage personnalisé :

- **Frontend** : React.js (Next.js) + TypeScript + TailwindCSS (UI/UX moderne).
- **Backend API** : FastAPI - performance asynchrone pour ML et LLM.
- **Base de Données Relationnelle** : PostgreSQL (Utilisateurs, Classes, Quiz, Résultats, Profils Carrière).
- **Base de Données Vectorielle** : ChromaDB.
- **Cache** : Redis (Sessions, résultats de quiz).
- **Message Queue** : RabbitMQ ou Celery (Traitement asynchrone des documents, génération de quiz).
- **ML Stack** : 
  - scikit-learn, XGBoost pour modèles de classification.
  - Transformers (Hugging Face) pour NLP (BERT, RoBERTa).
  - spaCy pour traitement du texte et NER.
  - MLflow pour tracking et versioning des modèles.
- **Infrastructure** : Docker & Kubernetes (Scalabilité).
- **Cloud Storage** : AWS S3 ou Azure Blob (Stockage documents).

#### 4.2 Architecture IA

**A. Chatbot & RAG :**

1. **Pipeline RAG** :
   - **Extract** : Upload document → Extraction de texte (PDF, DOCX, TXT).
   - **Transform** : Chunking (découpage en segments) → Embedding (OpenAI text-embedding-3 ou Sentence-BERT).
   - **Load** : Stockage dans Qdrant/Pinecone avec métadonnées (nom fichier, classe, auteur).

2. **Génération de Réponses** :
   - Utilisation de GPT-4o, Claude 3.5 Sonnet ou Llama 3.1 via LangChain/LlamaIndex.
   - Recherche sémantique des passages pertinents.
   - Génération de réponses avec références aux sources.
   - Streaming responses pour meilleure UX.

**B. Génération de Quiz :**

1. **Extraction de Concepts** :
   - Analyse NLP pour identifier les concepts clés, définitions, relations.
   - Utilisation de spaCy ou Transformers pour NER (Named Entity Recognition).

2. **Génération de Questions** :
   - Prompts LLM structurés : "Générer 5 QCM de niveau intermédiaire sur [concept]".
   - Templates pour différents types de questions (QCM, vrai/faux, associations).
   - Validation de la qualité des questions générées.

3. **Adaptation Dynamique** :
   - Analyse des résultats précédents pour ajuster la difficulté.
   - Item Response Theory (IRT) pour calibration des questions.

**C. Système d'Orientation de Carrière (Career Advisor ML) :**

1. **Pipeline NLP pour Analyse des Réponses** :
   - Tokenization et preprocessing des réponses textuelles.
   - Utilisation de modèles de langage pré-entraînés (BERT, RoBERTa) pour embeddings.
   - Named Entity Recognition pour extraction d'intérêts et compétences.
   - Sentiment analysis pour détecter motivations et préférences.

2. **Feature Engineering** :
   - Extraction de features structurées :
     - Performances académiques (notes moyennes par domaine).
     - Intérêts (scores par catégorie : sciences, arts, technologie, etc.).
     - Compétences soft skills (leadership, créativité, analyse, etc.).
     - Préférences environnementales (travail d'équipe vs individuel, bureau vs terrain).
   - Encodage des features catégorielles (One-Hot, Target Encoding).
   - Normalisation et scaling des features numériques.

3. **Modèle de Classification Multi-Label** :
   - Architecture : Random Forest, XGBoost, ou réseau de neurones multi-couches.
   - Output : Probabilités pour chaque branche académique (15-20 branches).
   - Training dataset : Données historiques de parcours étudiants + data augmentation.
   - Validation : Cross-validation 5-fold, métriques (F1-score, Precision@K, NDCG).

4. **Système de Recommandation Carrières** :
   - Matching basé sur similarité cosinus entre profil étudiant et profils métiers.
   - Base de données de métiers avec embeddings pré-calculés.
   - Ranking par score de compatibilité.
   - Filtering selon contraintes (niveau requis, marché de l'emploi).

5. **Modèle de Questions Adaptatives** :
   - Arbre de décision pour séquençage optimal des questions.
   - Apprentissage par renforcement pour minimiser le nombre de questions.
   - Mise à jour dynamique selon réponses précédentes.

6. **MLflow Tracking** :
   - Versioning des modèles de classification.
   - Suivi des métriques : accuracy, F1-score par branche, temps d'inférence.
   - A/B Testing entre différentes versions du modèle.
   - Feedback loop : collecte des validations utilisateurs pour réentraînement.

#### 4.3 Pipeline de Données & ETL

```
Utilisateur → Actions (passage quiz, conversations chatbot) → Kafka/RabbitMQ 
→ Airflow ETL → PostgreSQL + Redis
→ Analytics et génération de rapports
```

#### 4.4 MLOps & DevOps

**CI/CD :**
- GitHub Actions pour tests automatisés et déploiement.

**Tracking ML :**
- MLflow pour versioning des modèles et métriques (precision@k, NDCG).

**Monitoring :**
- Prometheus + Grafana pour latence API, utilisation ressources.
- Custom metrics : taux de réussite aux quiz, temps de réponse chatbot.

**Evaluation Continue :**
- RAGAS pour évaluation qualité des réponses du chatbot.
- Feedback utilisateur (thumbs up/down) pour fine-tuning.
- Analyse de la précision de la correction automatique.
- Métriques du modèle Career Advisor : accuracy, precision@k pour recommandations.

#### 4.5 Sécurité & Conformitéé

**Chiffrement :**
- AES-256 au repos, TLS en transit.

**Anonymisation :**
- Données utilisateur anonymisées pour analytics.

**RGPD :**
- Consentement explicite pour collecte de données.
- Export des données utilisateur sur demande.
- Droit à l'oubli (suppression complète des données).


---

### 5. Contraintes et Exigences Non-Fonctionnelles

#### 5.1 Performance

- Temps de réponse API (hors LLM) : < 200ms.
- Temps de génération chatbot : < 5 secondes (avec streaming).
- Génération de quiz : < 10 secondes pour 10 questions.
- Recherche vectorielle : < 500ms.
- Inférence modèle Career Advisor : < 2 secondes.
- Génération rapport d'orientation : < 5 secondes.

#### 5.2 Scalabilité

- Support de 10,000+ utilisateurs simultanés.
- Auto-scaling Kubernetes selon la charge.
- Gestion efficace de la base vectorielle pour des milliers de documents.

#### 5.3 Disponibilité

- Uptime : 99.9% (SLA).
- Backup automatique quotidien de la base de données.
- Disaster Recovery Plan.




### 8. Conclusion

LearnAI est une plateforme intelligente d'évaluation et d'assistance pédagogique qui combine un chatbot basé sur RAG, la génération automatique de quiz à partir de documents, la gestion de classes, et un système d'orientation de carrière intelligent utilisant le Machine Learning et le NLP. Grâce à une architecture technique robuste et des algorithmes d'IA avancés, la plateforme permet aux enseignants de générer et d'assigner des quiz efficacement, d'analyser les performances de leurs classes, et aux étudiants d'obtenir des réponses précises à leurs questions via un assistant intelligent qui s'appuie sur leurs documents de cours, tout en bénéficiant de recommandations personnalisées de parcours académiques et professionnels adaptées à leur profil unique.
