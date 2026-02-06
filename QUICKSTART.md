# Moon Guide AI - Guide de Démarrage Rapide

## 🚀 Installation Rapide avec Docker

### Prérequis
- Docker Desktop installé
- Git installé

### Étapes

1. **Cloner et configurer**
   ```bash
   cd moon-guide-ai
   cp .env.example .env
   ```

2. **Démarrer tous les services**
   ```bash
   docker-compose up --build
   ```

3. **Accéder à l'application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - Qdrant Dashboard: http://localhost:6333/dashboard

## 📦 Services

| Service    | Port | Description                    |
|------------|------|--------------------------------|
| Frontend   | 3000 | Interface Next.js + TailwindCSS|
| Backend    | 8000 | API FastAPI                    |
| PostgreSQL | 5432 | Base de données                |
| Redis      | 6379 | Cache et sessions              |
| Qdrant     | 6333 | Base de données vectorielle    |

## 🛠️ Développement Local (Sans Docker)

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## 📁 Structure du Projet

```
moon-guide-ai/
├── frontend/              # Next.js 14 + TypeScript + TailwindCSS
│   ├── app/              # App Router pages
│   ├── components/       # Composants React
│   ├── lib/              # Utilitaires
│   ├── hooks/            # Hooks personnalisés
│   └── types/            # Types TypeScript
│
├── backend/              # FastAPI + Python
│   ├── main.py          # Point d'entrée
│   └── requirements.txt # Dépendances Python
│
├── docker-compose.yml   # Configuration Docker
├── .env.example         # Variables d'environnement
└── DOCKER.md           # Documentation Docker
```

## ✅ Acceptance Criteria - Status

### Frontend (Next.js 14+)
- ✅ Projet Next.js 14+ initialisé avec TypeScript
- ✅ TypeScript strict mode activé
- ✅ TailwindCSS 3+ configuré avec thème personnalisé
- ✅ Structure de dossiers organisée (components, lib, hooks, types)
- ✅ ESLint et Prettier configurés
- ✅ Layout de base avec Header et Footer
- ✅ Variables d'environnement configurées
- ✅ Composants UI réutilisables (Button, Card, LoadingSpinner)
- ✅ Pages de démonstration (Accueil, Documents, Quiz, Carrière)
- ✅ Hooks personnalisés (useAsync, useMounted)
- ✅ Client API configuré
- ✅ Styles globaux avec TailwindCSS

### Infrastructure
- ✅ Docker configuré avec 5 services
- ✅ Docker Compose orchestré
- ✅ Hot reload pour développement
- ✅ Multi-stage build pour production

## 🎨 Personnalisation

### Couleurs du Thème

Éditez [frontend/tailwind.config.ts](frontend/tailwind.config.ts):

```typescript
colors: {
  primary: { ... },    // Couleur principale
  secondary: { ... },  // Couleur secondaire
}
```

### Layout

Modifiez [frontend/components/layout/Header.tsx](frontend/components/layout/Header.tsx) pour personnaliser le menu.

## 📝 Commandes Utiles

```bash
# Docker
make build         # Construire les images
make up           # Démarrer les services
make down         # Arrêter les services
make logs         # Voir les logs
make clean        # Nettoyer tout

# Frontend
npm run dev       # Développement
npm run build     # Build production
npm run lint      # Linter
npm run format    # Formater

# Backend
python -m pytest  # Tests (à venir)
```

## 🔧 Configuration Avancée

### Variables d'environnement

Éditez `.env` pour personnaliser:
- Ports des services
- URL de l'API
- Credentials de la base de données
- Configuration Redis et Qdrant

### TypeScript Paths

Les alias sont configurés dans `tsconfig.json`:
- `@/components/*` → `./components/*`
- `@/lib/*` → `./lib/*`
- `@/hooks/*` → `./hooks/*`

## 📚 Documentation Complète

- [Frontend README](frontend/README.md) - Documentation détaillée du frontend
- [DOCKER.md](DOCKER.md) - Guide Docker complet
- [Cahier des Charges](public/cahier-charge.md) - Spécifications du projet

## 🎯 Prochaines Étapes

1. Implémenter l'authentification
2. Créer les endpoints API backend
3. Intégrer le système RAG avec Qdrant
4. Ajouter l'upload de fichiers
5. Implémenter les fonctionnalités de quiz
6. Développer l'assistant carrière

## 🐛 Problèmes Courants

### Port déjà utilisé
```bash
# Changer les ports dans docker-compose.yml
ports:
  - "3001:3000"  # Au lieu de 3000:3000
```

### Hot reload ne fonctionne pas
```bash
# Redémarrer le service
docker-compose restart frontend
```

### Erreur de connexion à l'API
Vérifiez que `NEXT_PUBLIC_API_URL` pointe vers `http://localhost:8000`

## 📞 Support

Pour toute question, consultez la documentation ou créez une issue.
