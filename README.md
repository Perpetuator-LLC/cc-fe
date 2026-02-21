# Capital Copilot Frontend

> **Angular 21 | Material Design 3 | Apollo GraphQL**

[![Angular](https://img.shields.io/badge/Angular-21.1-red)](https://angular.io/)
[![Material Design](https://img.shields.io/badge/Material-MD3-blue)](https://m3.material.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ and yarn
- Access to Capital Copilot backend API

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Perpetuator-LLC/cc-fe.git
   cd cc-fe
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Configure environment:**
   
   Create `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     API_URL: 'http://127.0.0.1:8000',
     STRIPE_PUBLIC_KEY: 'pk_test_...',
   };
   ```

4. **Start development server:**
   ```bash
   yarn start
   ```
   
   Navigate to `http://localhost:4200/`

### Build

```bash
# Development build
yarn build

# Production build
yarn build --configuration=production
```

## 📚 Documentation

Comprehensive documentation is available in the [`notes/`](./notes/) directory:

### Quick Links

- **[Getting Started](./notes/development/FRONTEND_QUICK_START.md)** - Complete setup guide
- **[Development](./notes/development/DEVELOPMENT.md)** - Development workflows and standards
- **[MD3 Theme Guide](./notes/reference/MD3_COMPREHENSIVE_THEME_GUIDE.md)** - Material Design 3 styling
- **[Architecture](./notes/architecture/)** - System design and patterns

### Documentation Structure

```
notes/
├── architecture/        # System design and component architecture
├── development/         # Development workflows and setup
├── reference/          # Technical standards and guides
├── integrations/       # OAuth, GraphQL, third-party services
├── production/         # Deployment and operations
└── product/            # Features, user stories, personas
```

See [notes/README.md](./notes/README.md) for complete documentation index.

## 🛠️ Key Technologies

- **Framework:** Angular 21.1 (Standalone Components)
- **UI Library:** Angular Material 3 (MD3)
- **State Management:** Apollo Client 4.x + RxJS
- **GraphQL:** Apollo Angular 13.x
- **TypeScript:** 5.9+
- **Package Manager:** yarn
- **Linting:** ESLint 9.x + Stylelint

## 📋 Available Commands

```bash
# Development
yarn start              # Start dev server (port 4200)
yarn build              # Build for development
yarn build:prod         # Build for production

# Code Quality
yarn lint               # Run ESLint
yarn lint:scss          # Run Stylelint
yarn lint --fix         # Auto-fix ESLint issues
yarn test               # Run unit tests

# Documentation
yarn docs:graphql       # Generate GraphQL API docs

# Utilities
yarn analyze            # Analyze bundle size
```

## 🎨 Styling Standards

This project follows **Material Design 3** guidelines:

- ✅ Use MD3 design tokens: `var(--md-sys-color-*)`
- ✅ Use Material components: `<mat-button>`, `<mat-card>`
- ✅ 4px grid spacing: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64
- ✅ 2px font-size grid: 10, 12, 14, 16, 18, 20, 22, 24
- ✅ Use `inject()` for dependency injection (not constructor injection)
- ❌ No inline templates/styles (enforced by ESLint)
- ❌ No hardcoded colors (hex/rgba) - use MD3 tokens
- ❌ No `::ng-deep` or `!important`

See [MD3_COMPREHENSIVE_THEME_GUIDE.md](./notes/reference/MD3_COMPREHENSIVE_THEME_GUIDE.md) for details.

## 🧪 Testing

```bash
# Run all tests
yarn test

# Run specific test
yarn test --include='**/my-component.spec.ts'

# Watch mode
yarn test --watch
```

## 📦 Project Structure

```
capital-copilot-fe/
├── src/
│   ├── app/                 # Application code
│   │   ├── components/      # Reusable components
│   │   ├── services/        # Business logic services
│   │   ├── guards/          # Route guards
│   │   └── ...
│   ├── assets/              # Static assets
│   ├── styles/              # Global styles and themes
│   └── environments/        # Environment configs
├── public/                  # Public static files
├── notes/                   # Documentation
├── scripts/                 # Build and utility scripts
└── logs/                    # Build and test logs
```

## 🔐 Environment Configuration

### Development (`src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  API_URL: 'http://127.0.0.1:8000',
  OAUTH_CLIENT_ID: 'your_dev_client_id',
  STRIPE_PUBLIC_KEY: 'pk_test_...',
};
```

### Production (`src/environments/environment.prod.ts`)

```typescript
export const environment = {
  production: true,
  API_URL: 'https://api.capitalcopilot.io',
  OAUTH_CLIENT_ID: 'your_prod_client_id',
  STRIPE_PUBLIC_KEY: 'pk_live_...',
};
```

## 🚀 Deployment

See [PRODUCTION.md](./notes/production/PRODUCTION.md) for deployment instructions.

## 📄 License

Copyright © 2025-2026 Perpetuator LLC. All rights reserved.

## 🆘 Support

- **Documentation:** [notes/README.md](./notes/README.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/capital-copilot-fe/issues)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

