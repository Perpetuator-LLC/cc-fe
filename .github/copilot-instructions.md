Start every command you run with a space incase `setopt HIST_IGNORE_SPACE` is enabled in your shell.

Aim for efficient design, maintainability, and consistency with Angular Material 3.

# ⚠️ SCSS QUICK CHECKLIST (Check before writing ANY SCSS)

**Before you write SCSS, verify:**
- [ ] Spacing values are on 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
- [ ] Font sizes are on 2px grid: 10, 12, 14, 16, 18, 20, 22, 24px
- [ ] Border-radius is on 4px grid: 4, 8, 12, 16px (or 999px for pills)
- [ ] Colors use MD3 tokens: `var(--md-sys-color-primary)` not `#hex` or `rgba()`
- [ ] No `::ng-deep` - use `styles.scss` or `:host` selectors
- [ ] No `!important` - use specificity instead
- [ ] No color functions: `rgba()`, `rgb()`, `hsl()` - use tokens

**Common fixes:**
| ❌ Wrong | ✅ Correct |
|----------|-----------|
| `padding: 18px` | `padding: 16px` or `20px` |
| `font-size: 13px` | `font-size: 12px` or `14px` |
| `font-size: 11px` | `font-size: 10px` or `12px` |
| `border-radius: 10px` | `border-radius: 8px` or `12px` |
| `color: #fff` | `color: var(--md-sys-color-on-primary)` |
| `background: rgba(0,0,0,.5)` | `background: var(--md-sys-color-shadow)` |
| `::ng-deep .mat-*` | Put override in `styles.scss` |

---

Redirect STDERR to STDOUT and pipe to tee and capture command output in a logs file e.g.
```bash 
cd REPO_DIR && yarn build 2>&1 | tee logs/build.log
```

Do not use command line tools to edit or read files, use your functions that you have for file operations.

## Documentation Locations
- **`notes/`** - Internal documentation, guides, and technical notes
- **`docs/`** - Public-facing documentation only
- **`logs/ai_edits/`** - AI session logs and change summaries

**📖 Complete Theme Guide:** See `notes/MD3_COMPREHENSIVE_THEME_GUIDE.md` for full documentation.

**🔐 Auth Guide:** See `notes/integrations/AUTH_COOKIE_GUIDE.md` for HTTP-only cookie authentication.

**🚫 NO INLINE TEMPLATES/STYLES:** ESLint enforces external `templateUrl` and `styleUrl` only. See `docs/eslint-no-inline-templates-styles.md`
* It is too hard to do SCSS linting and MD3 compliance checks with inline styles.

**Current State:** MD3 Migration 83% complete. Use Material components, design tokens, and SCSS mixins.

## TL;DR for AI/Copilot (READ THIS FIRST)

**⚠️ STYLELINT WILL REJECT YOUR CODE IF YOU VIOLATE THESE RULES:**

### ABSOLUTE PROHIBITIONS (Linter will fail)
- **NO `::ng-deep`** - deprecated, use global styles in `styles.scss` instead
- **NO `!important`** - use specificity or Material component variants
- **NO hex colors** - use `var(--md-sys-color-*)` tokens (e.g., `var(--md-sys-color-primary)`)
- **NO `rgba()`/`rgb()`/`hsl()` functions** - use MD3 tokens with opacity variants
- **NO inline styles** (`style="..."`) - enforced by ESLint
- **NO inline templates** - enforced by ESLint (templateUrl required)

### MD3 4px SPACING GRID (Linter enforced)
**Valid spacing values:** 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64px
```scss
// ✅ GOOD - On the 4px grid
padding: 16px;
gap: 8px;
margin: 24px;
border-radius: 8px;   // 4, 8, 12, 16px for radius

// ❌ BAD - Linter will REJECT these
padding: 18px;        // Use 16px or 20px
gap: 14px;            // Use 12px or 16px
border-radius: 10px;  // Use 8px or 12px
margin: 15px;         // Use 16px
```

### MD3 TYPOGRAPHY GRID (Font sizes on 2px grid)
**Valid font sizes:** 10, 12, 14, 16, 18, 20, 22, 24px (even numbers)
```scss
// ✅ GOOD
font-size: 12px;
font-size: 14px;

// ❌ BAD - Linter will REJECT
font-size: 11px;      // Use 10px or 12px
font-size: 13px;      // Use 12px or 14px
font-size: 9px;       // Use 10px
```

### WHAT TO USE INSTEAD
- **Colors:** `var(--md-sys-color-primary)`, `var(--md-sys-color-on-surface)`, etc.
- **Spacing:** Use mixins `@include mixins.flex-row` (auto gap: 16px) or exact 4px grid values
- **Material overrides:** Put in `styles.scss` using high specificity selectors, not `::ng-deep`
- **Opacity:** Use pre-defined opacity tokens or surface-variant colors

**If the linter rejects your SCSS, check: spacing grid, font sizes, colors, ::ng-deep, !important**

# Material Design 3 (MD3) Theming: Root-Controlled Architecture

## Core Principles (LINTER WILL REJECT VIOLATIONS)
1. **ALL theming via `@include mat.theme()` on root** - Never style components directly
2. **NO `::ng-deep`** - Deprecated. Use `styles.scss` with specific selectors
3. **NO `!important`** - Ever. Use selector specificity instead
4. **NO color functions** - No `rgba()`, `rgb()`, `hsl()`. Use MD3 tokens only
5. **NO hex colors** - Use `var(--md-sys-color-*)` tokens
6. **4px spacing grid** - All spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
7. **2px typography grid** - Font sizes: 10, 12, 14, 16, 18, 20, 22, 24px

## MD3 Theming Architecture

### Theme Definition (styles.scss - SINGLE SOURCE OF TRUTH)
```scss
@use '@angular/material' as mat;
@use 'm3-theme' as theme;

// ONE theme definition on root - Material emits CSS custom properties for all components
html {
  @include mat.all-component-themes(theme.$dark-theme);
}

// Multi-theme: ONLY swap colors, never re-include full theme (causes duplication)
body.light {
  @include mat.all-component-colors(theme.$light-color);
}
```

### Token Customization (ONLY via mixins, never direct)
```scss
// ✅ GOOD - Override tokens via mixin
html {
  @include mat.theme-overrides((
    primary-container: #custom-color,
  ));
}

// ❌ BAD - Direct variable override
html {
  --md-sys-color-primary: #custom-color; // Never do this
}
```

### Material Component Overrides (NO ::ng-deep!)
```scss
// ❌ NEVER DO THIS - Linter will reject
::ng-deep .mat-mdc-form-field {
  display: none;
}

// ✅ GOOD - Put in styles.scss with high specificity
// In styles.scss (global):
.my-component .mat-mdc-form-field-subscript-wrapper {
  display: none;
}

// ✅ GOOD - Use component encapsulation with :host
// In component.scss:
:host .mat-mdc-button {
  min-width: auto;
}

// ✅ GOOD - Use appearance/config options instead of CSS
<mat-form-field appearance="outline" subscriptSizing="dynamic">
```

## Component Usage Patterns

### Material Variants (Use These, Not Custom Classes)
```html
<!-- ✅ Buttons -->
<button mat-button>Text</button>
<button mat-flat-button color="primary">Primary</button>
<button mat-raised-button>Contained</button>
<button mat-stroked-button>Outlined</button>
<button mat-icon-button><mat-icon>menu</mat-icon></button>

<!-- ✅ Dialogs -->
<mat-dialog-content>
  <mat-form-field appearance="outline">...</mat-form-field>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button>Cancel</button>
  <button mat-flat-button color="primary">Save</button>
</mat-dialog-actions>

<!-- ❌ NEVER custom component styling -->
<button class="custom-btn">Bad</button>
<div class="custom-dialog-layout">Bad</div>
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

## Styling Rules (LINTER ENFORCED)

✅ **DO:**
- Use Material component variants (`mat-flat-button color="primary"`)
- Use MD3 design tokens (`var(--md-sys-color-primary)`, `var(--md-sys-color-on-surface)`)
- Use SCSS mixins for layout/responsive (`@include mixins.flex-row`)
- Use 4px grid spacing: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64px
- Use 2px font-size grid: 10, 12, 14, 16, 18, 20, 22, 24px
- Use border-radius on 4px grid: 4, 8, 12, 16px

❌ **LINTER WILL REJECT:**
- `::ng-deep` - deprecated, put overrides in `styles.scss`
- `!important` - use specificity instead
- Hex colors: `#fff` → `var(--md-sys-color-surface)`
- Color functions: `rgba(0,0,0,0.5)` → `var(--md-sys-color-shadow)`
- Off-grid spacing: `padding: 18px` → `padding: 16px` or `20px`
- Off-grid fonts: `font-size: 13px` → `font-size: 12px` or `14px`
- Off-grid radius: `border-radius: 10px` → `8px` or `12px`
- Inline styles: `style="..."` - never

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

# SCSS

Copyright for SCSS use:
```css
/* Copyright (c) YEAR Perpetuator LLC */
```

## MD3 Design Tokens (Use These, Never Hardcode)

### System Color Tokens (Read from theme, never set directly)
```scss
// Primary/Secondary/Tertiary
--md-sys-color-primary
--md-sys-color-on-primary
--md-sys-color-primary-container
--md-sys-color-on-primary-container

// Surface colors (backgrounds)
--md-sys-color-surface
--md-sys-color-on-surface
--md-sys-color-surface-container-lowest
--md-sys-color-surface-container-low
--md-sys-color-surface-container
--md-sys-color-surface-container-high
--md-sys-color-surface-container-highest

// Semantic
--md-sys-color-error
--md-sys-color-on-error
--md-sys-color-error-container
--md-sys-color-on-error-container

// Extended (custom success/warning/info)
--md-extended-color-success-color
--md-extended-color-success-on-color
--md-extended-color-success-color-container
--md-extended-color-success-on-color-container
// (same pattern for warning, info)

// Outline/Shadow
--md-sys-color-outline
--md-sys-color-outline-variant
--md-sys-color-shadow
```

### Spacing (Use SCSS Mixins, Not Direct Values)
```scss
// ✅ GOOD - Use mixins from styles/_mixins.scss
@include mixins.flex-row;      // Auto gap: 16px
@include mixins.flex-column;   // Auto gap: 16px
@include mixins.mobile { }     // Responsive

// ❌ BAD - Direct hardcoded values
padding: 16px;
gap: 8px;
```

### MD3 4px Grid (LINTER ENFORCED)
```scss
// ✅ VALID spacing values (4px increments):
// 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64px
padding: 16px;  // ✅
gap: 24px;      // ✅
gap: 4px;       // ✅

// ✅ VALID font-sizes (2px increments, even numbers):
// 10, 12, 14, 16, 18, 20, 22, 24px
font-size: 12px;  // ✅
font-size: 14px;  // ✅

// ✅ VALID border-radius (4px increments):
// 4, 8, 12, 16px (or 999px for pills)
border-radius: 8px;   // ✅
border-radius: 12px;  // ✅

// ❌ LINTER REJECTS (off-grid values):
margin: 18px;         // ❌ Use 16px or 20px
padding: 15px;        // ❌ Use 16px
font-size: 13px;      // ❌ Use 12px or 14px
font-size: 11px;      // ❌ Use 10px or 12px
border-radius: 10px;  // ❌ Use 8px or 12px
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

## SCSS Mixins (Use for Layout/Responsive, NOT Theming)

Import: `@use 'styles/mixins' as mixins;`

```scss
// Responsive (ONLY use for layout adjustments)
@include mixins.mobile { }    // max-width: 576px
@include mixins.tablet { }    // max-width: 900px
@include mixins.desktop { }   // min-width: 901px

// Layout (auto-applies MD3 spacing)
@include mixins.flex-row;        // display: flex, gap: 16px
@include mixins.flex-column;     // column + gap: 16px
@include mixins.flex-between;    // justify-content: space-between
@include mixins.grid-auto-fill(256px);  // Responsive grid

// Status badges (use MD3 extended colors)
@include mixins.status-success;  // --md-extended-color-success-*
@include mixins.status-error;    // --md-sys-color-error-*
@include mixins.status-warning;  // --md-extended-color-warning-*
@include mixins.status-info;     // --md-extended-color-info-*

// States
@include mixins.loading-container;
@include mixins.empty-state;
```

## Component SCSS Pattern (Minimal Custom Styles)

```scss
/* Copyright (c) 2025 Perpetuator LLC */
@use 'styles/mixins' as mixins;

.my-component {
  // Layout only - let Material handle colors/typography
  @include mixins.flex-column;
  
  padding: 16px;  // MD3 4px grid value
  
  .header {
    margin-bottom: 16px;
    color: var(--md-sys-color-on-surface);  // Use MD3 token
  }
  
  .content {
    background: var(--md-sys-color-surface-container);  // MD3 token
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: 8px;  // MD3 standard
    padding: 16px;
    
    @include mixins.mobile {
      padding: 8px;  // MD3 grid
    }
  }
}
```

**Key Rules:**
- Use MD3 tokens (`--md-sys-color-*`) not custom variables
- Spacing: 4px grid values only (4, 8, 16, 24, 32, 48)
- Let Material components handle most styling
- Component SCSS = layout/spacing only, not colors/typography

## Common Patterns (Copy/Paste Ready)

## Common Patterns (Copy/Paste Ready)

### Card Component (Let Material Handle Styling)
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
@use 'styles/mixins' as mixins;

form {
  @include mixins.flex-column;  // Auto gap: 16px
  
  mat-form-field { width: 100%; }
  
  .actions {
    display: flex;
    gap: 8px;  // MD3 4px grid
    justify-content: flex-end;
  }
}
```

### Status Badge (Use Mixins, Not Custom Styles)
```html
<span class="status-badge success">Active</span>
```

```scss
@use 'styles/mixins' as mixins;

.status-badge {
  &.success { @include mixins.status-success; }
  &.error { @include mixins.status-error; }
  &.warning { @include mixins.status-warning; }
  &.info { @include mixins.status-info; }
}
```

### Responsive Grid (Use Mixin)
```scss
@use 'styles/mixins' as mixins;

.grid-layout {
  @include mixins.grid-auto-fill(256px);  // MD3 grid value
  
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

