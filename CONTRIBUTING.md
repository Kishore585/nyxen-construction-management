# Contributing to Nyxen AI

Thank you for contributing to the Nyxen AI Construction Verification System! This guide will help you get started.

## 🔧 Development Setup

### Prerequisites
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript Importer

### First Time Setup

```bash
# Clone the repo
git clone <repository-url>
cd NYXen

# Install dependencies
npm run install:all
npm install

# Start development servers
npm run dev
```

## 📝 Code Guidelines

### TypeScript
- Use strict TypeScript — no `any` types unless absolutely necessary
- Define interfaces for all data structures
- Use enums for fixed value sets

### CSS
- All styles go in `frontend/src/index.css`
- Use CSS custom properties (variables) from the design system
- NO external CSS frameworks (no Tailwind, Bootstrap, etc.)
- Follow the glass-morphism design language

### API Routes
- RESTful naming conventions
- All responses follow: `{ success: boolean, data?: any, error?: string }`
- Proper HTTP status codes
- JWT auth required for protected routes

### File Naming
- Components: `PascalCase.tsx` (e.g., `GlassCard.tsx`)
- Services: `camelCase.ts` (e.g., `imageAnalysisService.ts`)
- Routes: `camelCase.ts` (e.g., `projects.ts`)
- Styles: `kebab-case.css`

## 🔀 Git Workflow

### Branch Naming
```
feature/short-description    # New features
fix/issue-description        # Bug fixes
docs/what-changed            # Documentation
refactor/what-changed        # Code refactoring
```

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add GPS validation endpoint
fix: correct Nyxen quantity calculation
docs: update API documentation
style: improve dashboard card layout
refactor: extract measurement logic to service
```

### Pull Request Process
1. Pull latest rat-1: `git pull origin rat-1`
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes and test locally
4. Commit with clear messages
5. Push: `git push origin feature/my-feature`
6. Create PR with description of changes
7. Request review from at least one team member

## 📁 Project Structure Guide

### Frontend (`frontend/src/`)
| Directory | Purpose |
|-----------|---------|
| `components/` | Reusable UI components (cards, buttons, tables) |
| `pages/` | Full page components (one per route) |
| `layouts/` | Page layout wrappers (sidebar, header) |
| `services/` | API communication layer |
| `store/` | Global state management |

### Backend (`backend/src/`)
| Directory | Purpose |
|-----------|---------|
| `config/` | Environment & database configuration |
| `data/` | Mock data and seed files |
| `middleware/` | Express middleware (auth, validation) |
| `models/` | Data model interfaces and CRUD operations |
| `routes/` | API route handlers |
| `services/` | Business logic and AI processing |

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend build check
cd frontend && npm run build

# Full smoke test
npm run dev  # Then manually verify all pages
```

## 🐛 Reporting Issues

When reporting bugs, include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information
- Console error logs (if any)

## 💡 Feature Requests

Open an issue with:
- Clear description of the feature
- Use case / motivation
- Proposed implementation (optional)

---

Thank you for making Nyxen AI better! 🏗️
