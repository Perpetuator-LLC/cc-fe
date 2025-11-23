Aim for efficient design, maintainability, and consistency with Angular Material 3.

# Style Migration Strategy
- **Theme-dependent** (colors, backgrounds, borders) → Use --cc- design tokens from root styles.scss
- **Layout/structure** → Use --cc-spacing-* tokens, avoid hardcoded px values
- **Component-specific** → Minimize SCSS, leverage Material 3 component theming
- **Utility classes** → Create reusable utility classes instead of inline styles or duplicating code

## Angular Material 3 Styling Guidelines

### Design Token System
- **ALWAYS use --cc- prefixed design tokens** for custom styling
- **Color tokens:** `--cc-text-primary`, `--cc-text-secondary`, `--cc-color-success/error/warning`, `--cc-border-color`
- **Spacing tokens:** `--cc-spacing-xs/sm/md/lg/xl/2xl` (4px/8px/16px/24px/32px/48px)
- **Border radius:** `--cc-radius-sm/md/lg/xl/round` (4px/8px/12px/16px/999px)
- **Legacy tokens:** `--primary`, `--theme-white`, `--theme-color` (keep for backward compatibility)

### Core Principles
- **NEVER add custom SCSS** for layout, spacing, or colors when design tokens exist
- **NO inline styles** - use utility classes or component SCSS
- **NO ::ng-deep** - use proper Material component scoping
- **NO hardcoded px values** - use design tokens
- Use Angular Material 3 components with their default styling
- For layout, use CSS Grid/Flexbox with --cc-spacing-* tokens
- Replace custom button/input styles with mat-button, mat-form-field variants
- When refactoring existing components, identify and remove custom SCSS that duplicates Material theming

### Component Header Pattern
All list components (podcasts-list, episodes-list, teams-list, etc.) should use:
```scss
.content-header {
  padding-top: var(--cc-spacing-md); // 16px to prevent overlap with layout header
  padding-bottom: var(--cc-spacing-md);
  padding-inline: 30px;
  // ... other properties
}
```

# Code Standards
- This project uses yarn, and Angular Material 3 for UI components and styling.
- Imports at top | Remove obvious comments | Follow existing format | Minimize assumptions
- Use `forkJoin` for parallel ops | AI notes → `logs/ai_edits/` 
- No inline styles | Angular Material MD3 | `@if`/`@for` over `ngIf`/`ngFor`
- Components: own dir with `.ts`/`.html`/`.scss` | Tests focus on TS logic

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

## Buttons
```scss
// Use Material button variants, not custom classes
// Apply border-radius via global styles or utility classes
background: var(--primary);
color: var(--theme-white);
border-radius: var(--cc-radius-md);
border: 1px solid var(--cc-border-color);
font-weight: 600;
padding: var(--cc-spacing-sm) var(--cc-spacing-md);
```
white-space: nowrap; flex-shrink: 0; min-width: fit-content;
display: inline-flex; align-items: center; gap: 8px;
background: var(--primary); color: var(--theme-white);
border-radius: 10px; border: 1px solid var(--border-color);
font-weight: 600; padding: 8px 16px;
```

## Layouts
- Use `gap` (8/10/16/20px), not margins | `justify-content: space-between` for headers
- Responsive: mobile `max-width: 576px`, tablet `991px`, desktop `900px`
- Mobile: `flex-direction: column`, `padding-inline: 20px`, buttons `width: 100%`

## Spacing
- Border radius: 8/10/20px | Padding: cards 16px, buttons 8-16px
- Borders: `1px solid var(--border-color)`
- Fonts: weights 400/500/600/700, sizes 12-20px

# TypeScript

## Services
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
