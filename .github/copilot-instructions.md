# Style Migration Strategy
- **Theme-dependent** (colors, backgrounds, borders) → Move to theme
- **Layout/structure** → Replace with Material layout utilities  
- **Component-specific** → Keep minimal, use Material APIs
- **Utility classes** → Keep or replace with Angular CDK

# Code Standards
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

## Variables (Never Hardcode Colors)
```
--primary, --theme-color, --theme-white, --description-color
--toolbar-container-background-color, --border-color
--secondary-color/dark/light, --secondary-400/450/500
--md-sys-color-success/warning/error, --purple
```

## Buttons
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
