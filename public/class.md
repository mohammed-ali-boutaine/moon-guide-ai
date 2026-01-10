# Diagramme de Classes v1


```mermaid
classDiagram
    %% ==================== USERS ====================
    class User {
        <<abstract>>
        -UUID id
        -String email
        -String password_hash
        -String first_name
        -String last_name
        -UserRole role
        -DateTime created_at
        -DateTime updated_at
        -DateTime last_login
        -Boolean is_active
        +authenticate(password: String) Boolean
        +updateProfile(data: Dict) void
        +resetPassword(newPassword: String) void
        +verifyEmail() void
    }
    
    class Student {
        -String student_id
        -String phone_number
        -Date date_of_birth
        -String academic_level
        -Float overall_progress
        -Int total_quiz_taken
        -Float average_score
        +enrollInClass(class: Class) void
        +takeQuiz(quiz: Quiz) QuizAttempt
        +viewProgress() ProgressTracker
        +getRecommendations() List~CareerRecommendation~
        +chatWithBot(message: String) Message
        +exportResults() File
    }
    
    class Teacher {
        -String employee_id
        -String department
        -String specialization
        -Int years_experience
        -Int total_students
        -Int total_quizzes_created
        +createClass(name: String, description: String) Class
        +uploadDocument(file: File) Document
        +createQuiz(data: Dict) Quiz
        +assignQuizToClass(quiz: Quiz, class: Class) void
        +viewClassAnalytics(class: Class) Analytics
        +generateQuizFromDocument(doc: Document) Quiz
        +reviewStudentPerformance(student: Student) Report
        +exportClassData(class: Class) File
    }
    
    class Admin {
        -String admin_level
        -List~String~ permissions
        -DateTime last_access
        +manageUsers() List~User~
        +viewSystemLogs() List~Log~
        +configureSettings(settings: Dict) void
        +generateSystemReport() Report
        +manageSubscriptions() void
        +moderateContent() void
        +backupDatabase() void
    }

    %% ==================== EDUCATION ====================
    class Class {
        -UUID id
        -String name
        -String description
        -String class_code
        -Teacher teacher
        -Int student_count
        -DateTime created_at
        -Boolean is_active
        +addStudent(student: Student) void
        +removeStudent(student: Student) void
        +assignQuiz(quiz: Quiz, startDate: DateTime, endDate: DateTime) void
        +getStudents() List~Student~
        +getAssignedQuizzes() List~Quiz~
        +getStatistics() ClassStatistics
        +exportStudentList() File
        +sendNotification(message: String) void
    }
    
    class Document {
        -UUID id
        -String title
        -String description
        -String file_path
        -String file_type
        -Int file_size
        -Teacher uploaded_by
        -DateTime uploaded_at
        -DateTime last_modified
        -List~String~ chunks
        -Boolean is_indexed
        -Int download_count
        -String language
        +processDocument() void
        +generateEmbeddings() List~Float~
        +extractText() String
        +extractConcepts() List~Concept~
        +summarize() String
        +chunk(chunkSize: Int) List~String~
        +delete() void
    }
    
    class Concept {
        -UUID id
        -String name
        -String description
        -String category
        -Float difficulty_level
        -List~String~ keywords
        -List~Document~ related_documents
        +getRelatedQuestions() List~Question~
        +getMasteryLevel(student: Student) Float
    }

    %% ==================== QUIZ SYSTEM ====================
    class Quiz {
        -UUID id
        -String title
        -String description
        -Teacher creator
        -QuizDifficulty difficulty
        -Int time_limit_minutes
        -Float passing_score
        -Int max_attempts
        -QuizMode mode
        -Boolean shuffle_questions
        -Boolean shuffle_answers
        -DateTime created_at
        -DateTime updated_at
        -Boolean is_published
        -Int total_questions
        +addQuestion(question: Question) void
        +removeQuestion(question: Question) void
        +generateFromDocument(doc: Document, count: Int) void
        +assignToClass(class: Class) void
        +publish() void
        +duplicate() Quiz
        +getStatistics() QuizStatistics
        +exportToPDF() File
    }
    
    class Question {
        -UUID id
        -Quiz quiz
        -QuestionType type
        -String question_text
        -String explanation
        -List~String~ options
        -String correct_answer
        -List~String~ correct_answers
        -Float difficulty
        -List~Concept~ concepts
        -Int time_limit_seconds
        -Float points
        -String image_url
        -Int order_index
        -Float success_rate
        -Int times_asked
        +validate(answer: String) Boolean
        +calculatePartialCredit(answer: String) Float
        +generateExplanation() String
        +addToQuestionBank() void
        +updateStatistics(isCorrect: Boolean) void
    }
    
    class QuizAttempt {
        -UUID id
        -Quiz quiz
        -Student student
        -DateTime started_at
        -DateTime submitted_at
        -Int time_spent_seconds
        -Float score
        -Float percentage
        -AttemptStatus status
        -Int attempt_number
        -Boolean is_completed
        -String ip_address
        -Int tab_switches
        +startAttempt() void
        +submitAnswer(answer: Answer) void
        +submit() void
        +autoSave() void
        +generateFeedback() Feedback
        +calculateScore() Float
        +getTimeRemaining() Int
        +abandon() void
    }
    
    class Answer {
        -UUID id
        -QuizAttempt attempt
        -Question question
        -String student_answer
        -List~String~ selected_options
        -Boolean is_correct
        -Float points_earned
        -Float points_possible
        -String ai_feedback
        -DateTime answered_at
        -Int time_spent_seconds
        -Int revision_count
        +evaluate() Float
        +generateFeedback() String
        +isPartiallyCorrect() Boolean
        +markForReview() void
    }

    class QuestionBank {
        -UUID id
        -String name
        -String description
        -Teacher owner
        -List~Question~ questions
        -Int question_count
        -DateTime created_at
        +addQuestion(question: Question) void
        +searchQuestions(criteria: Dict) List~Question~
        +filterByDifficulty(level: Float) List~Question~
        +filterByConcept(concept: Concept) List~Question~
        +exportBank() File
        +importQuestions(file: File) void
        +shareWithTeacher(teacher: Teacher) void
    }

    %% ==================== AI/ML COMPONENTS ====================
    class ChatbotSession {
        -UUID id
        -User user
        -List~Message~ messages
        -List~Document~ context_documents
        -DateTime created_at
        -DateTime last_active
        -String session_title
        -Boolean is_archived
        +sendMessage(content: String) Message
        +getResponse() Message
        +searchContext(query: String) List~String~
        +addDocument(doc: Document) void
        +clearHistory() void
        +exportConversation() File
        +regenerateLastResponse() Message
    }
    
    class Message {
        -UUID id
        -ChatbotSession session
        -String content
        -MessageRole role
        -DateTime timestamp
        -List~String~ sources
        -List~String~ references
        -Float relevance_score
        -Boolean is_helpful
        +addSource(source: String) void
        +rateMessage(rating: Int) void
        +flagInappropriate() void
    }
    
    class VectorStore {
        -String collection_name
        -String embedding_model
        -Int dimension
        -Int total_vectors
        -DateTime last_updated
        +addDocument(doc: Document, embeddings: List~Float~) void
        +searchSimilar(query: String, topK: Int) List~SearchResult~
        +deleteDocument(docId: UUID) void
        +updateDocument(docId: UUID, embeddings: List~Float~) void
        +getCollectionStats() Dict
        +optimize() void
    }

    class RAGPipeline {
        -String model_name
        -VectorStore vector_store
        -Int chunk_size
        -Int chunk_overlap
        -Float similarity_threshold
        +processDocument(doc: Document) void
        +generateEmbeddings(text: String) List~Float~
        +retrieveContext(query: String, topK: Int) List~String~
        +generateResponse(query: String, context: List~String~) String
        +evaluateQuality(response: String) Float
    }

    %% ==================== CAREER ADVISOR ====================
    class CareerProfile {
        -UUID id
        -Student student
        -Dict interests
        -Dict skills
        -Dict academic_performance
        -Dict personality_traits
        -Dict preferences
        -String academic_level
        -List~String~ favorite_subjects
        -List~String~ disliked_subjects
        -String career_goals
        -DateTime last_updated
        -Float profile_completeness
        +updateInterests(interests: Dict) void
        +updateSkills(skills: Dict) void
        +addAcademicPerformance(subject: String, score: Float) void
        +completeQuestionnaire(responses: Dict) void
        +generateRecommendations() List~CareerRecommendation~
        +exportProfile() File
        +calculateProfileScore() Float
    }
    
    class CareerRecommendation {
        -UUID id
        -CareerProfile profile
        -String career_path
        -String academic_branch
        -String specialization
        -Float match_score
        -String justification
        -List~String~ required_skills
        -List~String~ recommended_courses
        -String roadmap
        -String salary_range
        -String job_outlook
        -List~String~ similar_careers
        -DateTime generated_at
        +generateDetailedReport() Report
        +compareWithOtherCareers(career: CareerRecommendation) Dict
        +getRequiredSteps() List~Step~
        +findRelatedOpportunities() List~Opportunity~
    }
    
    class MLModel {
        -UUID id
        -String model_name
        -String model_type
        -String version
        -String model_path
        -Dict hyperparameters
        -Float accuracy
        -Float precision
        -Float recall
        -Float f1_score
        -DateTime trained_at
        -DateTime last_used
        -Int prediction_count
        -String training_dataset
        +predict(features: Dict) Dict
        +predictProba(features: Dict) Dict
        +evaluate(testData: Dataset) Dict
        +retrain(newData: Dataset) void
        +saveModel() void
        +loadModel() void
        +getFeatureImportance() Dict
    }

    class AdaptiveQuestionnaire {
        -UUID id
        -String questionnaire_type
        -List~QuestionNode~ questions
        -Dict current_state
        -Float confidence_threshold
        +getNextQuestion(previousAnswers: Dict) QuestionNode
        +analyzeResponses(responses: Dict) Dict
        +calculateConfidence() Float
        +generateProfile(responses: Dict) CareerProfile
        +optimizeQuestionFlow() void
    }

    class QuestionNode {
        -UUID id
        -String question_text
        -QuestionType question_type
        -List~String~ options
        -Dict branching_logic
        -Float importance_weight
        +evaluateResponse(response: String) Dict
        +getNextNodes(response: String) List~QuestionNode~
    }

    %% ==================== ANALYTICS & TRACKING ====================
    class Analytics {
        -UUID id
        -AnalyticsType type
        -Class class
        -Quiz quiz
        -DateTime generated_at
        -Dict performance_metrics
        -Dict concept_mastery
        -List~Student~ struggling_students
        -Float class_average
        -Float median_score
        -Int total_submissions
        -Dict time_analysis
        +generateInsights() List~Insight~
        +identifyTrends() List~Trend~
        +compareWithPrevious() Dict
        +detectAnomalies() List~Anomaly~
        +exportReport() File
        +scheduleAutoGeneration(frequency: String) void
    }
    
    class ProgressTracker {
        -UUID id
        -Student student
        -Dict concept_scores
        -Dict skill_levels
        -Float overall_progress
        -List~Milestone~ milestones
        -DateTime last_updated
        -Dict weekly_activity
        -Int streak_days
        +updateProgress(quiz: QuizAttempt) void
        +calculateConceptMastery(concept: Concept) Float
        +visualizeProgress() Chart
        +predictPerformance(quiz: Quiz) Float
        +getRecommendedStudyTopics() List~Concept~
        +awardBadge(badge: Badge) void
    }

    class Feedback {
        -UUID id
        -QuizAttempt attempt
        -String overall_feedback
        -List~String~ strengths
        -List~String~ weaknesses
        -List~Concept~ concepts_to_review
        -List~String~ improvement_suggestions
        -Float improvement_potential
        -DateTime generated_at
        +generatePersonalizedFeedback() void
        +identifyLearningGaps() List~Concept~
        +suggestResources() List~Resource~
        +compareWithPeers() Dict
    }

    class Notification {
        -UUID id
        -User recipient
        -String title
        -String message
        -NotificationType type
        -NotificationPriority priority
        -Boolean is_read
        -DateTime created_at
        -DateTime read_at
        -Dict action_data
        +send() void
        +markAsRead() void
        +delete() void
        +scheduleNotification(sendAt: DateTime) void
    }

    class Badge {
        -UUID id
        -String name
        -String description
        -String icon_url
        -BadgeCategory category
        -Int points_required
        -String criteria
        -DateTime earned_at
        +checkEligibility(student: Student) Boolean
        +award(student: Student) void
    }

    %% ==================== ENUMS ====================
    class UserRole {
        <<enumeration>>
        STUDENT
        TEACHER
        ADMIN
    }

    class QuestionType {
        <<enumeration>>
        MULTIPLE_CHOICE
        TRUE_FALSE
        SHORT_ANSWER
        ESSAY
        MATCHING
        ORDERING
        FILL_IN_BLANK
    }

    class QuizMode {
        <<enumeration>>
        TRAINING
        EXAM
        PRACTICE
    }

    class AttemptStatus {
        <<enumeration>>
        IN_PROGRESS
        COMPLETED
        SUBMITTED
        GRADED
        ABANDONED
    }

    class MessageRole {
        <<enumeration>>
        USER
        ASSISTANT
        SYSTEM
    }

    class QuizDifficulty {
        <<enumeration>>
        BEGINNER
        INTERMEDIATE
        ADVANCED
        EXPERT
    }

    class AnalyticsType {
        <<enumeration>>
        CLASS_PERFORMANCE
        QUIZ_ANALYSIS
        STUDENT_PROGRESS
        CONCEPT_MASTERY
    }

    class NotificationType {
        <<enumeration>>
        QUIZ_ASSIGNED
        QUIZ_DUE
        GRADE_AVAILABLE
        NEW_MESSAGE
        SYSTEM_ALERT
    }

    %% ==================== RELATIONSHIPS ====================
    
    %% Inheritance
    User <|-- Student
    User <|-- Teacher
    User <|-- Admin
    
    %% User Relationships
    Student "0..*" -- "0..*" Class : enrolls in
    Teacher "1" -- "0..*" Class : manages
    Teacher "1" -- "0..*" Document : uploads
    Teacher "1" -- "0..*" Quiz : creates
    Teacher "1" -- "0..*" QuestionBank : owns
    
    %% Class Relationships
    Class "1" -- "0..*" Quiz : assigned
    Class "1" -- "0..*" Analytics : generates
    
    %% Quiz Relationships
    Quiz "1" *-- "1..*" Question : contains
    Quiz "1" -- "0..*" QuizAttempt : attempted by
    Question "0..*" -- "0..*" Concept : covers
    Question "0..*" -- "1" QuestionBank : stored in
    
    %% Attempt Relationships
    Student "1" -- "0..*" QuizAttempt : takes
    QuizAttempt "1" *-- "1..*" Answer : contains
    QuizAttempt "1" -- "1" Feedback : receives
    Answer "1" -- "1" Question : answers
    
    %% RAG/Chatbot Relationships
    User "1" -- "0..*" ChatbotSession : creates
    ChatbotSession "1" *-- "0..*" Message : contains
    ChatbotSession "0..*" -- "0..*" Document : uses
    Document "0..*" -- "1" VectorStore : indexed in
    RAGPipeline "1" -- "1" VectorStore : uses
    Document "1" -- "0..*" Concept : contains
    
    %% Career Advisor Relationships
    Student "1" -- "1" CareerProfile : has
    CareerProfile "1" -- "0..*" CareerRecommendation : generates
    CareerProfile "1" -- "1" AdaptiveQuestionnaire : completes
    AdaptiveQuestionnaire "1" *-- "1..*" QuestionNode : contains
    MLModel "1" -- "0..*" CareerRecommendation : predicts
    
    %% Analytics Relationships
    Student "1" -- "1" ProgressTracker : tracks
    ProgressTracker "0..*" -- "0..*" Concept : monitors
    ProgressTracker "0..*" -- "0..*" Badge : earns
    Analytics "1" -- "0..*" Student : analyzes
    
    %% Notification Relationships
    User "1" -- "0..*" Notification : receives
```