# Capital Copilot Frontend - Documentation

> **Note:** This documentation is for stakeholders and developers. Product-facing documentation is in the `docs/` directory.

## 📁 Documentation Structure

### 🏗️ Architecture
System design, component architecture, and technical diagrams.
- [ARCHITECTURE_DIAGRAM.md](./architecture/ARCHITECTURE_DIAGRAM.md) - System flow diagrams
- [ANGULAR.md](./architecture/ANGULAR.md) - Angular-specific architecture patterns
- [APOLLO_ANGULAR.md](./architecture/APOLLO_ANGULAR.md) - Apollo GraphQL integration
- [CHART_DATA_ARCHITECTURE.md](./architecture/CHART_DATA_ARCHITECTURE.md) - Progressive chart data loading
- [COMMAND_ROUTING.md](./architecture/COMMAND_ROUTING.md) - Terminal command routing logic

### 🔧 Development
Day-to-day development workflows, setup, and tooling.
- [DEVELOPMENT.md](./development/DEVELOPMENT.md) - Development workflows and standards
- [FRONTEND_QUICK_START.md](./development/FRONTEND_QUICK_START.md) - Getting started guide
- [INITIAL_CONFIG.md](./development/INITIAL_CONFIG.md) - Initial project configuration
- [ASSET_OPTIMIZATION.md](./development/ASSET_OPTIMIZATION.md) - Asset optimization guide
- [FRONTEND_ENHANCEMENT_REQUIREMENTS.md](./development/FRONTEND_ENHANCEMENT_REQUIREMENTS.md) - Enhancement tracking

### 🎨 Reference
Technical reference materials, style guides, and standards.
- [MATERIAL.md](./reference/MATERIAL.md) - Material Design 3 implementation
- [MD3_COMPREHENSIVE_THEME_GUIDE.md](./reference/MD3_COMPREHENSIVE_THEME_GUIDE.md) - Complete MD3 theming guide
- [MD3_LINTING_GUIDE.md](./reference/MD3_LINTING_GUIDE.md) - MD3 linting and quality standards
- [SCSS_LINTING_QUICK_REFERENCE.md](./reference/SCSS_LINTING_QUICK_REFERENCE.md) - SCSS linting quick reference
- [HTML_DOM.md](./reference/HTML_DOM.md) - HTML/DOM best practices
- [FONTS.md](./reference/FONTS.md) - Typography and font usage
- [SVGS.md](./reference/SVGS.md) - SVG asset guidelines
- [CSS_SIZE_TRACKING.md](./reference/CSS_SIZE_TRACKING.md) - CSS bundle size tracking
- [SCSS_SIZE_TRACKING.md](./reference/SCSS_SIZE_TRACKING.md) - SCSS size optimization
- [ESLINT_GUIDELINES.md](./reference/ESLINT_GUIDELINES.md) - ESLint configuration and standards

### 🔌 Integrations
Backend APIs, third-party integrations, and authentication.
- [AUTH_COOKIE_GUIDE.md](./integrations/AUTH_COOKIE_GUIDE.md) - Authentication with localStorage + Bearer tokens
- [BACKEND_API_REFERENCE.md](./integrations/BACKEND_API_REFERENCE.md) - Complete backend API reference
- [GRAPHQL_WEBSOCKET_GUIDE.md](./integrations/GRAPHQL_WEBSOCKET_GUIDE.md) - GraphQL over WebSocket
- [ERROR_TRACKING_GUIDE.md](./integrations/ERROR_TRACKING_GUIDE.md) - Frontend error tracking
- [GRAPHQL_DOCS.md](./integrations/GRAPHQL_DOCS.md) - GraphQL documentation generation
- [OAUTH_SETUP.md](./integrations/OAUTH_SETUP.md) - OAuth configuration guide
- [OAUTH_GRAPHQL_DOCS_QUICKREF.md](./integrations/OAUTH_GRAPHQL_DOCS_QUICKREF.md) - OAuth quick reference

### 🚀 Production
Production deployment, builds, and configuration.
- [PRODUCTION.md](./production/PRODUCTION.md) - Production build and deployment

### 👥 Product
Product features, user stories, and personas.
- [PERSONAS.md](./product/PERSONAS.md) - User personas
- [PERMISSIONS.md](./product/PERMISSIONS.md) - Permission system design
- [RESEARCH_TOPICS_FEATURE.md](./product/RESEARCH_TOPICS_FEATURE.md) - Research topics feature specification
- [user_stories/](./product/user_stories/) - User stories and feature descriptions

## 🚀 Quick Start

New to the project? Start here:

1. **[FRONTEND_QUICK_START.md](./development/FRONTEND_QUICK_START.md)** - Get up and running
2. **[DEVELOPMENT.md](./development/DEVELOPMENT.md)** - Development workflows
3. **[MD3_COMPREHENSIVE_THEME_GUIDE.md](./reference/MD3_COMPREHENSIVE_THEME_GUIDE.md)** - Styling standards

## 📊 Current Status

- **Material Design 3 Migration:** 83% complete
- **ESLint Enforcement:** ✅ No inline templates/styles
- **Angular Version:** 18.0.6
- **UI Framework:** Angular Material 3

## 🛠️ Key Technologies

- **Framework:** Angular 18.0.6 (Standalone Components)
- **UI Library:** Angular Material 3 (MD3)
- **State Management:** Apollo Client + RxJS
- **GraphQL Client:** Apollo Angular
- **Package Manager:** yarn
- **Build Tool:** Angular CLI
- **Linting:** ESLint + Stylelint

## 📝 Contributing

When adding new documentation:

1. **Choose the right directory:**
   - `architecture/` - System design and architecture
   - `development/` - Development processes and tools
   - `reference/` - Technical standards and guides
   - `integrations/` - Third-party service integrations
   - `production/` - Deployment and operations
   - `product/` - Features and user stories

2. **Follow naming conventions:**
   - Use UPPERCASE for major guides (e.g., `DEVELOPMENT.md`)
   - Use descriptive names (e.g., `MD3_COMPREHENSIVE_THEME_GUIDE.md`)
   - Date-stamp temporary or versioned docs

3. **Keep documentation up to date:**
   - Update affected docs when making changes
   - Remove outdated information
   - Cross-reference related documents

## 📄 License

Copyright © 2026 Perpetuator LLC. All rights reserved.

