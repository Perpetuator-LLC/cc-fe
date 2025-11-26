Aim for efficient design, maintainability, and consistency with Angular Material 3.

**📖 Complete Theme Guide:** See `notes/MD3_COMPREHENSIVE_THEME_GUIDE.md` for full documentation.

**Current State:** MD3 Migration 83% complete. Use Material components, design tokens, and SCSS mixins.

# Material Design 3 Guidelines

## Core Principles (MUST FOLLOW)
1. **Use Material component variants** - Never create custom buttons/forms when Material provides them
2. **Use design tokens** - Never hardcode colors, spacing, or border-radius
3. **Use SCSS mixins** - Available in `src/styles/_mixins.scss` for common patterns
4. **NO inline styles** - Use component SCSS or utility classes
5. **NO ::ng-deep** - Target Material classes directly (they're not encapsulated)
6. **NO hardcoded px values** - Always use design tokens

## Material Component Usage

### Buttons - Use Material Variants
```html
<!-- ✅ GOOD - Material variants -->
<button mat-button>Text</button>
<button mat-flat-button color="primary">Primary</button>
<button mat-raised-button>Contained</button>
<button mat-stroked-button>Outlined</button>
<button mat-icon-button><mat-icon>menu</mat-icon></button>

<!-- ❌ BAD - Custom classes -->
<button class="primary-action-button">Save</button>
```

### Dialogs - Use Material Layout Features
```html
<!-- ✅ GOOD - Material handles layout -->
<mat-dialog-content>
  <mat-form-field>...</mat-form-field>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button>Cancel</button>
  <button mat-flat-button color="primary">Save</button>
</mat-dialog-actions>

<!-- ❌ BAD - Custom utilities -->
<div class="full-width-field">
  <mat-form-field>...</mat-form-field>
</div>
<div class="flex-between">
  <button class="cancel-btn">Cancel</button>
</div>
```

# Code Standards

## Project Setup
- **Package Manager:** yarn (not npm)
- **UI Framework:** Angular Material 3 (MD3)
- **Angular Version:** 18.0.6
- **Architecture:** Standalone components (no NgModules)
- **Template Syntax:** `@if`/`@for`/`@switch` (not `*ngIf`/`*ngFor`/`*ngSwitch`)

## Code Organization
- **Imports:** At top, organized by external → Angular → local
- **Comments:** Remove obvious comments, keep complex logic explanations
- **AI Notes:** Save to `logs/ai_edits/` with date prefix
- **File Structure:** Each component in own directory with `.ts`/`.html`/`.scss`

## Styling Rules (MUST FOLLOW)
✅ **DO:**
- Use Material component variants (`mat-flat-button color="primary"`)
- Use design tokens (`var(--cc-spacing-md)`, `var(--cc-text-primary)`)
- Use SCSS mixins for common patterns (`@include mixins.mobile { }`)
- Use component-specific SCSS (not inline styles)

❌ **DON'T:**
- NO inline styles (`style="..."`)
- NO `::ng-deep` selectors
- NO hardcoded px values (`padding: 16px` → `padding: var(--cc-spacing-md)`)
- NO hardcoded colors (`#fff` → `var(--cc-text-primary)`)
- NO custom button/form classes when Material provides variants

# HTML
Copyright for HTML use:
```html
<!-- Copyright (c) YEAR Perpetuator LLC -->
```

# SCSS

Copyright for SCSS use:
```css
/* Copyright (c) YEAR Perpetuator LLC */
```

## Design Tokens (Use These, Never Hardcode)

### Colors
```scss
// Text colors (theme-aware)
--cc-text-primary      // Main text
--cc-text-secondary    // Descriptions, secondary text
--cc-text-tertiary     // Disabled, placeholders

// Semantic colors
--cc-color-success     // Green (#4caf50)
--cc-color-error       // Red (#f44336)
--cc-color-warning     // Orange/Yellow (#ff9800)
--cc-color-info        // Cyan
--cc-color-secondary   // Capital Blue (#008ce8 / #005a9a)

// Borders
--cc-border-color       // Standard borders
--cc-border-color-strong // Emphasized borders

// Legacy (keep for compatibility)
--primary               // Vibrant Orange (#f14a00)
--theme-white           // Context-aware white/primary
--theme-color           // Main theme color
--description-color     // Legacy secondary text
```

### Spacing
```scss
--cc-spacing-xs: 4px;   // Minimal gaps, icon spacing
--cc-spacing-sm: 8px;   // Small gaps, button padding
--cc-spacing-md: 16px;  // Medium padding, card spacing
--cc-spacing-lg: 24px;  // Large sections, headers
--cc-spacing-xl: 32px;  // Extra large sections
--cc-spacing-2xl: 48px; // Huge sections, page margins
```

### Border Radius
```scss
--cc-radius-sm: 4px;     // Small elements, badges
--cc-radius-md: 8px;     // Buttons, cards, inputs (default)
--cc-radius-lg: 12px;    // Large cards, dialogs
--cc-radius-xl: 16px;    // Hero elements
--cc-radius-round: 999px; // Pills, fully rounded
```

# SCSS

Copyright for SCSS use:
```css
/* Copyright (c) YEAR Perpetuator LLC */
```

## Design Tokens - Quick Reference

### Colors (Theme-Aware)
```scss
// Text colors
--cc-text-primary       // Main text (rgba(255,255,255,0.87) dark / rgba(0,0,0,0.87) light)
--cc-text-secondary     // Descriptions, secondary text
--cc-text-tertiary      // Disabled, placeholders

// Semantic colors (status badges, alerts)
--cc-color-success      // Green (#4caf50 dark, #2e7d32 light)
--cc-color-error        // Red (#ef5350 dark, #c62828 light)
--cc-color-warning      // Orange (#ff9800 dark, #f57c00 light)
--cc-color-info         // Blue (#03a9f4 dark, #0288d1 light)

// Brand colors
--cc-color-primary      // Capital Blue (#008ce8 dark, #005a9a light)
--cc-color-orange       // Brand Orange (#ff7b3d dark, #f14a00 light)
--primary               // Legacy orange (#f14a00) - use for links, accents

// Surfaces (backgrounds)
--cc-surface-background // Page background
--cc-surface-card       // Cards, panels
--cc-surface-elevated   // Elevated surfaces
--cc-surface-toolbar    // Toolbar/header background

// Borders
--cc-border-color       // Standard borders (1px solid)
--cc-border-color-strong // Emphasized borders
```

### Spacing (Never Hardcode px)
```scss
--cc-spacing-xs: 4px;   // Minimal gaps, icon spacing
--cc-spacing-sm: 8px;   // Small gaps, button padding
--cc-spacing-md: 16px;  // Medium padding, card spacing (most common)
--cc-spacing-lg: 24px;  // Large sections, headers
--cc-spacing-xl: 32px;  // Extra large sections
--cc-spacing-2xl: 48px; // Page-level spacing
```

### Border Radius (Never Hardcode px)
```scss
--cc-radius-sm: 4px;     // Badges, small elements
--cc-radius-md: 8px;     // Buttons, cards, inputs (most common)
--cc-radius-lg: 12px;    // Large cards, dialogs
--cc-radius-xl: 16px;    // Hero elements
--cc-radius-round: 999px; // Pills, fully rounded
```

## SCSS Mixins (Use for Common Patterns)

Import mixins: `@use 'styles/mixins' as mixins;`

```scss
// Responsive
@include mixins.mobile { }    // max-width: 576px
@include mixins.tablet { }    // max-width: 900px
@include mixins.desktop { }   // min-width: 901px

// Cards
@include mixins.card-container;  // Standard card styling
@include mixins.card-elevated;   // Elevated card with shadow

// Buttons (if not using Material variants)
@include mixins.primary-button;
@include mixins.secondary-button;

// Layout
@include mixins.flex-row;
@include mixins.flex-column;
@include mixins.flex-between;
@include mixins.grid-auto-fill(250px);

// Status badges
@include mixins.status-success;
@include mixins.status-error;
@include mixins.status-warning;
@include mixins.status-info;

// States
@include mixins.loading-container;
@include mixins.empty-state;
```

## Component SCSS Pattern

```scss
/* Copyright (c) 2025 Perpetuator LLC */

.my-component {
  padding: var(--cc-spacing-lg);
  
  .header {
    margin-bottom: var(--cc-spacing-md);
    color: var(--cc-text-primary);
  }
  
  .content {
    background: var(--cc-surface-card);
    border: 1px solid var(--cc-border-color);
    border-radius: var(--cc-radius-md);
    padding: var(--cc-spacing-md);
    
    // Responsive
    @include mixins.mobile {
      padding: var(--cc-spacing-sm);
    }
  }
}
```

## Legacy Variables (Being Phased Out)

These still work but prefer design tokens in new code:
```scss
--theme-color       → Use: var(--cc-text-primary)
--description-color → Use: var(--cc-text-secondary)
--secondary-color   → Use: var(--cc-surface-card)
--border-color      → Use: var(--cc-border-color)
```

## Common Patterns (Copy/Paste Ready)

### Card Component
```html
<mat-card>
  <mat-card-header>
    <mat-card-title>Title</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    Content here
  </mat-card-content>
  <mat-card-actions align="end">
    <button mat-button>Action</button>
  </mat-card-actions>
</mat-card>
```

### Form Component
```html
<form>
  <mat-form-field>
    <mat-label>Name</mat-label>
    <input matInput required>
  </mat-form-field>
  
  <div class="actions">
    <button mat-button type="button">Cancel</button>
    <button mat-flat-button color="primary" type="submit">Save</button>
  </div>
</form>
```

```scss
form {
  display: flex;
  flex-direction: column;
  gap: var(--cc-spacing-md);
  
  mat-form-field { width: 100%; }
  
  .actions {
    display: flex;
    gap: var(--cc-spacing-sm);
    justify-content: flex-end;
  }
}
```

### Status Badge
```html
<span class="status-badge success">Active</span>
```

```scss
@use 'styles/mixins' as mixins;

.status-badge {
  &.success { @include mixins.status-success; }
  &.error { @include mixins.status-error; }
  &.warning { @include mixins.status-warning; }
}
```

### Responsive Grid
```scss
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--cc-spacing-md);
  
  @include mixins.mobile {
    grid-template-columns: 1fr;
  }
}
```

# TypeScript
```
export class Service extends BaseService {
constructor(protected override apollo: Apollo,
protected override errorHandler: ErrorHandlerService) {
super(apollo, errorHandler);
}
}
```
- GraphQL: inline definitions, define response interfaces, use observables
- Cache: register policies in owning service, use merge functions

### GraphQL Naming Conventions
**IMPORTANT:** Backend uses Django (snake_case) but Graphene auto-converts to camelCase for GraphQL
- **Backend (Django models):** `latest_episode_date`, `view_count`, `created_at`
- **GraphQL queries/responses:** `latestEpisodeDate`, `viewCount`, `createdAt`
- **TypeScript interfaces:** Use camelCase to match GraphQL responses
- **GraphQL arguments:** Use camelCase (e.g., `orderBy`, not `order_by`)
- Apollo Client automatically handles the conversion, so always use camelCase in frontend

## Types
- Naming: `Result` (GraphQL), `Response` (mutations), `Error` (errors)
- Use `GenericScalar` for JSON | Relay types in `utils/relay.ts`
- Enums for constants with converters | Avoid `any`, use `unknown`

## Components
```
@Component({ standalone: true, imports: [...] })
export class Component implements OnInit, OnDestroy {
@ViewChild(MatSort) sort!: MatSort;
@Input() data: Type[] = [];
private subscriptions = new Subscription();

ngOnDestroy() { this.subscriptions.unsubscribe(); }
}
```
- Subscriptions: always unsubscribe, use operators (`debounceTime`, `switchMap`, `tap`)
- State: signals for reactive, `BehaviorSubject` for complex observables
- Errors: `MessageService` for user-facing, check success flags in mutations

## Patterns
```
// Load data
this.subscriptions.add(service.getData().subscribe({
next: (data) => { this.data = data; this.loading = false; },
error: (err) => { this.messageService.error(err.message); }
}));

// Polling
this.queryRef = this.watchQuery({ query, variables, pollInterval: 3000 });

// Dialog
const ref = this.dialog.open(Component, { width: '500px', data: {} });
ref.afterClosed().subscribe(result => { /* handle */ });
```

## Relay Cursor Pagination
Use `RelayPaginatorBase<T>` from `utils/relay-paginator.ts`:
```typescript
export class MyComponent extends RelayPaginatorBase<MyType> {
  protected loadPage(pageSize: number, cursor: string | null, pageIndex: number) {
    this.service.getData(pageSize, cursor).subscribe(response => {
      this.handlePageData(response.items, response.pageInfo, pageIndex);
    });
  }
}
```
HTML: `[showFirstLastButtons]="false"` `(page)="onPageChange($event)"`

# Public Routes

## Config
```
// Public: NO canActivate
{ path: 'a/:code', loadComponent: () => import(...), title: 'Title' }

// Protected: WITH canActivate
{ path: 'affiliate', canActivate: [AuthGuard], ... }
```

## Component Pattern
```
export class PublicComponent implements OnInit {
isAuthenticated = false;

constructor(private authService: AuthService,
private httpService: HttpService) {}

ngOnInit() {
this.isAuthenticated = this.authService.isLoggedIn();

    // HTTP for public data (not GraphQL)
    this.httpService.getData(code).subscribe({
      next: (data) => { /* handle */ },
      error: () => { /* fail silently on public pages */ }
    });
}

onSignUp() {
this.router.navigate(['/register'], {
queryParams: { ref: this.code }
});
}
}
```

## Requirements
- Standalone | Works logged in/out | HTTP for public data | Silent GraphQL failures
- Self-contained layout/styles | Preserve context via query params
- Loading/error states | Responsive | No console errors unauthenticated

## Storage Service
```
@Injectable({ providedIn: 'root' })
export class StorageService {
setCode(code: string) { sessionStorage.setItem(KEY, code); }
getCode() { return sessionStorage.getItem(KEY); }
clearCode() { sessionStorage.removeItem(KEY); }
}
```

# Best Practices
- TypeScript strict mode | No nested subscriptions (use operators)
- Unsubscribe, clear intervals, cleanup ViewRefs | Use `readonly`/`const`
- OnPush detection for performance | TrackBy for large lists
- Test service methods, mock Apollo | Focus on business logic


# Testing
To see test output use e.g.
```
npm test -- --include='**/cookie-consent.service.spec.ts' --watch=false 2>&1 | cat
```

---

# 📚 Complete Documentation

**For detailed theme/styling information, see:**
- **`notes/MD3_COMPREHENSIVE_THEME_GUIDE.md`** - Complete MD3 theme guide
  - Full design token reference
  - Theme implementation details
  - All SCSS mixins documented
  - Common patterns with examples
  - Migration strategy and roadmap
  - Troubleshooting guide

**For AI session logs:**
- **`logs/ai_edits/`** - Chronological record of all AI-assisted changes
  - Migration analysis reports
  - Phase completion summaries
  - Optimization progress

**Quick Command Reference:**
```bash
# Find hardcoded values to fix
grep -r "margin.*: [0-9]+px" src/app/**/*.scss
grep -r "padding.*: [0-9]+px" src/app/**/*.scss
grep -r "border-radius: [0-9]+px" src/app/**/*.scss

# Find legacy variable usage
grep -r "var(--theme-color)" src/app/**/*.scss
grep -r "var(--description-color)" src/app/**/*.scss

# Check for anti-patterns
grep -r "::ng-deep" src/app/**/*.scss
grep -r 'style="' src/app/**/*.html
```

**Migration Status:** 83% Complete (Phase 1-3: ✅ Done | Phase 4-5: ⏳ In Progress)

