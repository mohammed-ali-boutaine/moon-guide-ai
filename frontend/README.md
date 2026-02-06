# Moon Guide AI - Frontend

Interface utilisateur moderne construite avec Next.js 14, TypeScript et TailwindCSS.

## 🚀 Stack Technique

- **Framework**: Next.js 14.1 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS 3.4
- **Linting**: ESLint + Prettier
- **Font**: Inter (Google Fonts)

## 📁 Structure du Projet

```
frontend/
├── app/                      # App Router (Next.js 14)
│   ├── layout.tsx           # Layout racine
│   ├── page.tsx             # Page d'accueil
│   ├── globals.css          # Styles globaux
│   ├── documents/           # Page documents
│   ├── quiz/                # Page quiz
│   └── career/              # Page carrière
│
├── components/              # Composants réutilisables
│   ├── ui/                 # Composants UI de base
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── LoadingSpinner.tsx
│   └── layout/             # Composants de layout
│       ├── Header.tsx
│       └── Footer.tsx
│
├── hooks/                   # Hooks React personnalisés
│   ├── use-async.ts        # Hook pour requêtes async
│   └── use-mounted.ts      # Hook détection mount
│
├── lib/                     # Utilitaires et helpers
│   ├── utils.ts            # Fonctions utilitaires
│   └── api-client.ts       # Client API
│
├── types/                   # Types TypeScript
│   └── index.ts            # Types globaux
│
└── styles/                  # Styles additionnels
```

## 🎨 Configuration TailwindCSS

### Thème Personnalisé

```typescript
// Couleurs primaires et secondaires personnalisées
colors: {
  primary: { ... },    // Bleu (système)
  secondary: { ... },  // Violet (accent)
}
```

### Animations

- `animate-fade-in`: Apparition en fondu
- `animate-slide-up`: Glissement vers le haut

## 🛠️ Démarrage

### Installation

```bash
# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.local.example .env.local
```

### Développement

```bash
# Lancer le serveur de développement
npm run dev

# Linter le code
npm run lint

# Formater le code
npm run format

# Vérifier les types
npm run type-check
```

Le serveur démarre sur [http://localhost:3000](http://localhost:3000)

### Build Production

```bash
npm run build
npm run start
```

## 🔧 Configuration

### Variables d'Environnement

Créez un fichier `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Moon Guide AI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### TypeScript

Configuration stricte activée:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

### Alias de Chemins

```typescript
@/*              → ./*
@/components/*   → ./components/*
@/lib/*          → ./lib/*
@/hooks/*        → ./hooks/*
@/types/*        → ./types/*
```

## 📦 Composants UI

### Button

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Cliquez-moi
</Button>
```

Variants: `primary`, `secondary`, `outline`, `ghost`
Sizes: `sm`, `md`, `lg`

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent>
    Contenu de la carte
  </CardContent>
</Card>
```

### LoadingSpinner

```tsx
import { LoadingSpinner } from '@/components/ui';

<LoadingSpinner size="md" />
```

## 🎣 Hooks Personnalisés

### useAsync

Hook pour gérer les requêtes asynchrones:

```tsx
import { useAsync } from '@/hooks';

const { data, status, error, execute } = useAsync(fetchData);
```

### useMounted

Hook pour détecter le montage côté client:

```tsx
import { useMounted } from '@/hooks';

const mounted = useMounted();
if (!mounted) return null;
```

## 🌐 API Client

Client HTTP simplifié:

```tsx
import { apiClient } from '@/lib/api-client';

// GET
const data = await apiClient.get('/endpoint');

// POST
const result = await apiClient.post('/endpoint', { data });
```

## 📝 ESLint & Prettier

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

Configuration Prettier avec:
- Tri automatique des classes Tailwind
- Single quotes
- Semi-colons
- Trailing commas

## 🚢 Docker

Le frontend est dockerisé avec multi-stage build:

```bash
# Development
docker-compose up frontend

# Production
docker build -t frontend --target production .
```

## 📄 Pages Disponibles

- `/` - Page d'accueil avec présentation
- `/documents` - Gestion des documents d'apprentissage
- `/quiz` - Quiz et tests de connaissances
- `/career` - Assistant carrière et CV

## 🎯 Prochaines Étapes

- [ ] Authentification utilisateur
- [ ] Upload de fichiers
- [ ] Intégration API backend
- [ ] Gestion d'état global (Zustand/Redux)
- [ ] Tests (Jest + React Testing Library)
- [ ] i18n internationalisation

## 📚 Ressources

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
