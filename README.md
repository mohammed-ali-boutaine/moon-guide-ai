# AI Learning & Career Assistant

Personal AI learning and career assistant powered by RAG + NLP + personalization.

---

## 1. Learning Assistant (RAG-powered)

### Features

#### Document Understanding

- Automatic document summary
- Key points extraction
- Definitions of difficult concepts
- Explanation of formulas/paragraphs

#### Chatbot for Your Courses

A chatbot trained on:

- Uploaded PDFs
- Lecture notes
- Books
- Slides

It answers questions like:

- "Explain chapter 3 in simple words"
- "Make a study plan for this document"
- "Give practical examples from this lesson"

#### Quiz & Test Generation

- Multiple-choice quiz
- Open-ended questions
- Flashcards
- "Test me" mode with instant correction

#### Study Workflow

1. Upload document
2. App splits, indexes and embeds content (RAG)
3. User studies using AI tools
4. AI tracks weaknesses and recommends revision
5. Weekly smart review

---

## 2. Career & Skills Assistant

This is where you add a unique angle beyond normal e-learning apps.

### What You Collect From the User

The user provides:

- Current education
- Skills
- Projects
- Experience
- Interests
- Personal goals (salary, remote work, field, languages, etc.)

### AI Career Engine Features

#### 1. Skill Gap Analysis

Shows:

- What skills you already have
- What skills you miss for the job you want
- Priority order to learn them

#### 2. Personalized Career Roadmap

**Example:**

"Based on your current React + Laravel skills and interest in AI, here are 3 possible paths:

- AI Developer Roadmap
- Full-stack Web Developer Roadmap
- Data Engineer Path"

Each roadmap contains:

- Tools to learn
- Projects to build
- Certifications to consider
- Timeline (1 month, 3 months, 6 months)

#### 3. Job Recommendations Based on Profile

Your app suggests:

- Jobs you can do now
- Jobs you can reach in 3 months
- Jobs you can reach in 6–12 months

**Example:**

"With your current stack (React + Laravel + PostgreSQL), you can apply for:

- Junior Full-Stack Developer
- Frontend Developer with Tailwind

In 6 months, you can target:

- API Developer
- MERN Developer
- DevOps Junior (if you add Docker + CI/CD)"

#### 4. Career Upgrade Plan

**Example:**

"To upgrade from Junior Developer → Mid Developer:

- Learn TypeScript
- Build 2 real-world projects
- Improve Git workflows
- Add tests (Jest / PHPUnit)"

#### 5. AI Mentor

A chatbot specialized in:

- Interview preparation
- CV optimization
- Portfolio advice
- Choosing your next steps
- Explaining career paths

---

## Project Status (2026-03-17)

### Stack
- **Backend:** FastAPI, Python 3.11, SQLAlchemy 2, Alembic, PostgreSQL 16, Redis 7, Qdrant, Celery
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, TailwindCSS, TanStack Query v5
- **Auth:** JWT in httpOnly cookies + Google SSO
- **AI:** Gemini (`gemini-1.5-flash`) for RAG chat; Gemini (`models/text-embedding-004`, 768 dim) for embeddings (default); Mistral / Sentence Transformers available via `EMBEDDING_PROVIDER`; Qdrant for vector search

### What's Built
- Auth (JWT + Google SSO), sessions, RBAC (TEACHER / STUDENT / ADMIN)
- Class CRUD — create, update, delete, enroll/remove students
- Document upload + RAG pipeline (Celery: extract → chunk → embed → Qdrant)
- Semantic search + full RAG chat API (class sessions + personal document sessions)
- Quiz generation (LLM-based + manual), MCQ/True-False auto-correction, student quiz history
- Quiz assignment to classes + notification system
- Key-concept extraction with spaCy NLP pipeline
- Personalised feedback + student/teacher analytics reports
- Teacher dashboard with global class selector (header), class-scoped nav (sidebar), class-scoped documents/quizzes
- Quiz attempt viewer for teachers (`/dashboard/teacher/quizzes/[id]/attempts`)

### Recent Changes (last sprint)
- Default embedding provider switched from Sentence Transformers to **Gemini** (`models/text-embedding-004`, 768 dim)
- Global `ClassContext` — class selection persists in `localStorage`, visible in `AuthHeader`
- Sidebar nav links update dynamically based on selected class
- Teacher `documents` page redirects to class-specific documents automatically
- Teacher `quizzes` page uses real endpoints (`GET /quiz`, `GET /quiz/{id}/attempts`)
- Personalised feedback + student/teacher report endpoints added
- **Bug fixes:**
  - `class_id: int → UUID` in `classes.py` document endpoints (was causing 422)
  - Added `include` list to `celery_app.py` so tasks are discovered by the worker
  - Worker `docker-compose.yml` now listens on `documents,quiz,celery` queues

### Not Built Yet
- Chat frontend UI
- Flashcards
- Career features (skill gap, roadmap, job recommendations, AI mentor)
- Analytics dashboard

### Key File Paths
| Layer | File |
|---|---|
| Backend entry | `backend/app/main.py` |
| Config | `backend/app/core/config.py` |
| Auth dependency | `backend/app/core/dependencies.py` |
| Embedding service | `backend/app/services/embedding_service.py` |
| Celery app | `backend/app/celery_app.py` |
| Document pipeline | `backend/app/services/document_service.py` |
| Class routes | `backend/app/api/v1/routes/classes.py` |
| Quiz routes | `backend/app/api/v1/routes/quiz.py` |
| Frontend auth context | `frontend/contexts/auth-context.tsx` |
| Class context | `frontend/contexts/class-context.tsx` |
| Header (class selector) | `frontend/components/layout/AuthHeader.tsx` |
| Sidebar | `frontend/components/layout/Sidebar.tsx` |
| Teacher dashboard | `frontend/app/dashboard/teacher/page.tsx` |
