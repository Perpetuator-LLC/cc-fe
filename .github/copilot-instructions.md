# Code Quality

- All import statements should be at and be added to the top of the file.
- **Comments**: Remove comments that are redundant or can be inferred from well-named functions and variables. Leave
  comments that explain subtleties, provide examples of values, or clarify how to use the code.
- Keep output reasonably concise but provide helpful context.
- Follow the existing formatting as closely as possible.
- Keep comments to a minimum, they should only capture logic not obvious from the code.
- Avoid making excessive assumptions on behavior if not explicitly stated in the prompt.

# High-level

- Prefer to load things in parallel with `forkJoin` or similar patterns instead of sequentially where possible.
- Any new notes created to describe code should go into the logs/ai_edits/ directory with a descriptive filename.
- Do not use inline styles in Angular components, use SCSS files instead.
- Use Angular best practices.
- Use Angular Material (MD3) components where possible.
- Prefer `@if` and `@for` over the `ngIf` and `ngFor` directives in templates for styling.
- Components should be created in their own directories with a `component.ts`, `component.html`, and `component.scss` file.
- Create tests where appropriate and have them mainly focus on covering the TS logic.

# SCSS Styling Guidelines

## CSS Variables (Custom Properties)

- **Always use CSS variables** for colors, spacing, and theme-specific values
- **Color variables to use:**
  - `--primary` - Primary brand color (#f14a00)
  - `--theme-color` - Main text color (changes based on theme)
  - `--theme-white` - White text color
  - `--description-color` - Secondary/muted text color
  - `--toolbar-container-background-color` - Toolbar and card backgrounds
  - `--secondary-color`, `--secondary-dark`, `--secondary-light` - Background variations
  - `--border-color` - All borders and dividers
  - `--secondary-400`, `--secondary-450`, `--secondary-500` - Additional background shades
  - `--md-sys-color-success`, `--md-sys-color-warning`, `--md-sys-color-error` - Status colors
  - `--purple` - Accent color (#8f8fff)
- **Never hardcode colors** - always use CSS variables so themes work correctly

## Buttons

- **Prevent text wrapping/squashing:**
  - Always add `white-space: nowrap` to prevent text from wrapping
  - Add `flex-shrink: 0` to prevent buttons from shrinking below their content size
  - Use `min-width: fit-content` to maintain minimum width
- **Button with icon + text:**
  - Use `display: inline-flex` with `align-items: center`
  - Add `gap: 8px` between icon and text
  - Set icon to `margin: 0` to remove default margins
  - Set icon dimensions explicitly: `font-size: 20px; width: 20px; height: 20px;`
- **Primary action buttons:**
  - `background: var(--primary)`
  - `color: var(--theme-white)`
  - `border-radius: 10px`
  - `border: 1px solid var(--border-color)`
  - `font-weight: 600`
  - `padding: 8px 16px` or `10px 16px` for larger buttons

## Flexbox Layouts

- **Container patterns:**
  - Use `display: flex` with `gap` property instead of margins between children
  - Common gaps: `8px`, `10px`, `16px`, `20px`
  - Use `justify-content: space-between` for header layouts with title + actions
  - Use `align-items: center` for vertically centered content
- **Responsive flex:**
  - Add `flex-wrap: wrap` when items should wrap on smaller screens
  - For title sections that can shrink: add `min-width: 0` and `flex: 1`
  - For buttons that shouldn't shrink: add `flex-shrink: 0`

## Responsive Design

- **Breakpoints:**
  - Mobile: `@media screen and (max-width: 576px)`
  - Tablet: `@media screen and (max-width: 991px)`
  - Desktop: `@media screen and (max-width: 900px)` for specific layouts
- **Mobile patterns:**
  - Switch to `flex-direction: column` for stacked layouts
  - Change `padding-inline: 30px` to `padding-inline: 20px`
  - Set `height: auto` for containers with fixed heights
  - Make buttons full width: `width: 100%` with `justify-content: center`
- **Grid layouts:**
  - Use CSS Grid with responsive columns
  - Example: `grid-template-columns: repeat(3, 1fr)` → `repeat(2, 1fr)` → `repeat(1, 1fr)`

## Spacing & Sizing

- **Border radius:** `8px`, `10px`, or `20px` for pills/badges
- **Padding conventions:**
  - Cards/containers: `padding: 16px` or `padding-inline: 30px`
  - Buttons: `padding: 8px 16px` or `10px 16px`
  - Small elements: `padding: 0 10px`
- **Gaps:** Use `gap` property: `8px`, `10px`, `16px`, `20px`
- **Borders:** Always `1px solid var(--border-color)`

## Typography

- **Font weights:** `400` (normal), `500` (medium), `600` (semi-bold), `700` (bold)
- **Font sizes:**
  - Headers: `20px` (h3), larger for h1/h2
  - Body/buttons: `13px`, `14px`
  - Small text/badges: `12px`
- **Line height:** Use `line-height: 100%` for tight spacing or default for normal text
- **Text overflow protection:**
  - Add `white-space: nowrap` to prevent wrapping
  - Add `overflow: hidden` and `text-overflow: ellipsis` for truncation

## Cards & Containers

- **Card styling:**
  - `background-color: var(--toolbar-container-background-color)`
  - `border: 1px solid var(--border-color)`
  - `border-radius: 8px` or `border-radius: 0` for full-width cards
  - `box-shadow: none` (we don't use shadows)
- **Table cells:**
  - `padding: 16px`
  - `background: var(--toolbar-container-background-color)`
  - `border-bottom: 1px solid var(--border-color)`
  - Last row: `.mdc-data-table__row:last-child .mat-mdc-cell { border-bottom: 0; }`

## Status Badges/Chips

- **Badge pattern:**
  - `border-radius: 20px`
  - `font-weight: 500`
  - `font-size: 12px`
  - `padding: 0 10px` or `padding: 8px`
  - `height: 20px` or `22px`
  - `display: inline-flex`
  - `align-items: center`
  - `justify-content: center`
- **Colors:**
  - Success: `background: var(--md-sys-color-success); color: var(--theme-white)`
  - Neutral: `background: var(--secondary-dark); color: var(--theme-color)`

## Angular Material Overrides

- **Form fields:** Often hide outlines and subscripts for custom styling
- **Icons:** Explicitly set dimensions and remove default margins
- **Tables:** Use Material table but heavily customize with our variables
- **No inline styles:** Move all styles to SCSS, even if initially prototyping with inline styles

# TypeScript & Architecture Guidelines

## Service Architecture

### Base Service Pattern
- **All services extend `BaseService`** which provides standardized Apollo query/mutation/watchQuery methods
- **Services are singleton** - use `providedIn: 'root'` decorator
- **Constructor pattern:**
  ```typescript
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }
  ```

### GraphQL Patterns
- **Define interfaces for all GraphQL responses** - place them at the top of the service file
- **Use inline GQL definitions** within methods (not at file level) for better organization
- **Always define response interface** for type safety:
  ```typescript
  interface Response {
    createPodcast: {
      success: boolean;
      message: string;
      podcast: PodcastsResult;
    };
  }
  ```
- **Use observables with RxJS operators:**
  - `map()` to transform data and check success flags
  - `catchError()` handled by BaseService (don't add redundant error handling)
  - Throw errors for unsuccessful operations: `throw new Error(data.message)`

### Cache Policies
- **Register cache policies** in services that own the data using `cachePolicyRegistry.register()`
- **Keep cache configuration modular** - don't put everything in global Apollo config
- **Use merge functions** to control how arrays/objects are updated in cache

## Type Definitions

### Interface Naming
- **Result suffix** for GraphQL response types: `PodcastsResult`, `UserResult`, `TeamsResult`
- **Response suffix** for mutation/query responses: `GetUserJobsResponse`, `PodcastCategoriesResponse`
- **Error suffix** for error types: `RegisterError`, `ApolloErrorParams`

### Common Patterns
- **Use `GenericScalar`** type (aliased to `unknown`) for dynamic JSON fields
- **Relay pagination types** in `utils/relay.ts`:
  - `RelayConnection<T>` - contains edges and pageInfo
  - `RelayEdge<T>` - contains cursor and node
  - `PageInfo` - pagination metadata
- **Enums for constants:**
  - Create enum: `export enum JobStatus { PENDING = 'PENDING', ... }`
  - String conversion functions: `stringToJobStatus()`, `statusToString()`
  - Type-safe everywhere, convert at boundaries

### Type Safety
- **Avoid `any`** - use `unknown` and narrow with type guards
- **Use `null` for missing values**, not `undefined` (GraphQL convention)
- **Optional properties** use `property?: type` or `property: type | null`

## Component Architecture

### Component Structure
```typescript
@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [/* all Angular Material and custom components */],
  templateUrl: './component.component.html',
  styleUrls: ['./component.component.scss'],
})
export class ComponentNameComponent implements OnInit, OnDestroy, AfterViewInit {
  // ViewChild references
  @ViewChild('templateRef') templateRef!: TemplateRef<never>;
  @ViewChild(MatSort) sort!: MatSort;
  
  // Input/Output
  @Input() data: DataType[] = [];
  
  // Private subscriptions
  private subscriptions = new Subscription();
  
  // Public properties (template bindings)
  loading = false;
  dataSource = new MatTableDataSource<DataType>([]);
  
  // Subjects for streams
  searchTerm$ = new Subject<string>();
  
  constructor(
    private router: Router,
    private messageService: MessageService,
    private dataService: DataService,
  ) {
    // Setup observables/subjects in constructor if needed
  }
  
  ngOnInit(): void { }
  ngAfterViewInit(): void { }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
```

### Subscription Management
- **Always unsubscribe** - use `Subscription` container and `unsubscribe()` in `ngOnDestroy`
- **Add to subscriptions:** `this.subscriptions.add(observable.subscribe({ ... }))`
- **Use RxJS operators** for complex logic:
  - `debounceTime()` for search inputs
  - `distinctUntilChanged()` to avoid duplicate emissions
  - `switchMap()` for dependent observables
  - `tap()` for side effects

### State Management
- **Use Angular signals** for reactive state: `signal<Type>(initialValue)`
- **WritableSignal** for mutable state: `private stateSignal: WritableSignal<Type> = signal(initialValue)`
- **Convert to observable** with `toObservable()` when needed for RxJS operators
- **BehaviorSubject** for complex observables with initial value
- **Update signals:** `this.signal.set(newValue)` or `this.signal.update(fn)`

## Error Handling

### Service Layer
- **Errors handled by BaseService** - automatically caught and routed to ErrorHandlerService
- **Check success flags** in mutations and throw errors:
  ```typescript
  .pipe(
    map((data) => {
      if (!data.mutation.success) {
        throw new Error(data.mutation.message);
      }
      return data.mutation;
    })
  )
  ```

### Component Layer
- **Use MessageService** for user-facing errors:
  - `messageService.error(message, timeout?, dismissible?)`
  - `messageService.warning(message, timeout?, dismissible?)`
  - `messageService.success(message, timeout?, dismissible?)`
  - `messageService.info(message, timeout?, dismissible?)`
  - `messageService.progress(message, progress, dismissible?)` - for long operations
- **Clear messages** before new operations: `messageService.clearMessages()`
- **Subscribe with error handler:**
  ```typescript
  this.service.method().subscribe({
    next: (data) => { /* handle success */ },
    error: (err) => {
      this.messageService.error(`Failed: ${err.message}`);
    },
    complete: () => { /* cleanup */ }
  })
  ```

## Utility Patterns

### Error Handler Utilities
- **`mapQueryResult<T>`** - extracts data from Apollo query, throws on errors
- **`mapMutationResult<T>`** - extracts data from Apollo mutation, throws on errors
- **`handleApolloError`** - normalizes Apollo errors into consistent Error objects
- **Check for specific HTTP codes** (e.g., 413 for file size) and provide user-friendly messages

### Common Utility Functions
- **String converters** for enums: `stringToJobStatus()`, `kindToString()`
- **Date handling** - use ISO strings from GraphQL, convert to Date objects in components
- **Null coalescing** - provide defaults: `data?.field || 'Default'`

## Data Loading Patterns

### List Components
```typescript
loadData(first = 10, after: string | null = null, filters?: Filters): void {
  this.loading = true;
  this.subscriptions.add(
    this.service.getData(first, after, filters).subscribe({
      next: (response) => {
        this.data = response.items;
        this.dataSource = new MatTableDataSource(this.data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.messageService.error(`Failed: ${err.message}`);
      },
      complete: () => {
        this.loading = false;
      }
    })
  );
}
```

### Polling Pattern
- **Use `watchQuery` with pollInterval** for real-time updates
- **Dynamic polling** - adjust interval based on state (0 to disable)
- **QueryRef pattern:**
  ```typescript
  this.queryRef = this.watchQuery({ query, variables, pollInterval: 3000 });
  this.queryRef.valueChanges.pipe(...).subscribe(...)
  ```
- **Update variables dynamically:** `this.queryRef.setVariables({ ...vars })`

### Job Tracking Pattern
- **Track job state transitions** with `getJobTransitions(newJobs, oldJobs, targetStatus)`
- **Auto-cleanup old jobs** - use intervals to remove completed/failed jobs after delay
- **Signal-based job state** for reactive UI updates

## Dialog Patterns
- **Open dialog:**
  ```typescript
  const dialogRef = this.dialog.open(DialogComponent, {
    width: '500px',
    data: { /* pass data */ }
  });
  ```
- **Handle close:**
  ```typescript
  dialogRef.afterClosed().subscribe((result) => {
    if (result) {
      // Refresh data or handle result
    }
  });
  ```

## Best Practices

### General
- **Use TypeScript strict mode** - no implicit any, strict null checks
- **Avoid nested subscriptions** - use RxJS operators like `switchMap`, `mergeMap`
- **Memory leaks** - always unsubscribe, clear intervals, cleanup ViewRefs
- **Use readonly** for properties that shouldn't change
- **Use const** for variables that won't be reassigned

### Observable Patterns
- **Hot vs Cold** - understand when observables execute
- **Share subscriptions** - use `shareReplay()` for expensive operations
- **Avoid subscribe in subscribe** - use higher-order operators

### Component Communication
- **Parent to child** - use `@Input()`
- **Child to parent** - use `@Output()` with EventEmitter
- **Sibling components** - use shared service with BehaviorSubject
- **Global state** - use signals and services

### Performance
- **OnPush change detection** - for performance-critical components
- **TrackBy functions** - for `@for` loops with large lists
- **Lazy loading** - for routes and heavy modules
- **Virtual scrolling** - for very large lists (Angular CDK)

### Testing
- **Test service methods** - mock Apollo and verify GraphQL calls
- **Test component logic** - mock services, verify state changes
- **Focus on business logic** - not UI interactions
- **Use TestBed** for component testing, standalone for services

# Public Routes (Unauthenticated Access)

When creating pages that should be accessible without authentication (landing pages, marketing pages, legal pages, etc.), follow these patterns:

## 1. Route Configuration

Public routes are defined in `src/app/app.routes.ts` **WITHOUT** the `canActivate: [AuthGuard]` directive.

**Example - Public Route:**
```typescript
{
  path: 'a/:code',
  loadComponent: () =>
    import('./affiliate-landing/affiliate-landing.component').then((c) => c.AffiliateLandingComponent),
  title: 'Join Affiliate Network',
  // NO canActivate guard - this is public
}
```

**Example - Protected Route (for comparison):**
```typescript
{
  path: 'affiliate',
  loadComponent: () =>
    import('./affiliate-dashboard/affiliate-dashboard.component').then((c) => c.AffiliateDashboardComponent),
  title: 'Affiliate Dashboard',
  canActivate: [AuthGuard], // ✅ Requires authentication
  data: {
    icon: 'share',
  },
}
```

## 2. Component Structure for Public Routes

Public route components should:

### a. Be Standalone Components
```typescript
@Component({
  selector: 'app-affiliate-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './affiliate-landing.component.html',
  styleUrls: ['./affiliate-landing.component.scss'],
})
export class AffiliateLandingComponent implements OnInit, OnDestroy {
  // Component logic
}
```

### b. Check Authentication State (Optional)
Public pages can still check if a user is logged in to provide conditional UI:

```typescript
export class AffiliateLandingComponent implements OnInit, OnDestroy {
  isAuthenticated = false;

  constructor(
    private authService: AuthService,
    // ... other dependencies
  ) {}

  ngOnInit(): void {
    // Check auth status to show different UI
    this.isAuthenticated = this.authService.isLoggedIn();
    
    // Continue with page logic...
  }
}
```

### c. Handle GraphQL Errors Gracefully
Public pages may attempt authenticated GraphQL calls, but should handle failures silently:

```typescript
checkExistingAffiliate(): void {
  if (!this.isAuthenticated) {
    return;
  }

  this.subscriptions.add(
    this.affiliateService.getMyAffiliateRelationship().subscribe({
      next: (relationship) => {
        // Handle success
        if (relationship) {
          this.hasExistingAffiliate = true;
          this.existingAffiliateUsername = relationship.affiliate.username;
        }
      },
      error: () => {
        // Silently fail - user may have expired token
        // This is acceptable on public pages
      },
    }),
  );
}
```

### d. Use HTTP Service for Public Data
For data that doesn't require authentication, use a dedicated HTTP service instead of GraphQL:

```typescript
export class AffiliateLandingComponent implements OnInit {
  constructor(
    private affiliateHttpService: AffiliateHttpService, // HTTP service
    private affiliateService: AffiliateService,         // GraphQL service (for authenticated calls)
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    
    // Public data via HTTP
    this.subscriptions.add(
      this.affiliateHttpService.getAffiliateLanding(code).subscribe({
        next: (data) => {
          this.affiliateData = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Invalid or inactive affiliate code';
          this.loading = false;
        },
      }),
    );
  }
}
```

## 3. Navigation to/from Public Routes

### Redirecting to Login/Register with Context
Public pages should preserve context when sending users to auth pages:

```typescript
onSignUp(): void {
  this.router.navigate(['/register'], { 
    queryParams: { ref: this.affiliateData?.affiliate_code } 
  });
}

onSignIn(): void {
  this.router.navigate(['/login'], { 
    queryParams: { ref: this.affiliateData?.affiliate_code } 
  });
}
```

### Reading Query Parameters
Auth pages should read and preserve these parameters:

```typescript
export class LoginComponent {
  private affiliateCode: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private affiliateStorageService: AffiliateStorageService,
  ) {
    // Read ref parameter from URL
    const refCode = this.route.snapshot.queryParams['ref'];
    if (refCode) {
      this.affiliateCode = refCode;
      this.affiliateStorageService.setAffiliateCode(refCode);
    } else {
      this.affiliateCode = this.affiliateStorageService.getAffiliateCode();
    }
  }
}
```

## 4. Layout Considerations

### No Toolbar/Sidenav
Public routes typically render WITHOUT the main application layout (toolbar, sidenav, navigation):

- The component handles its own layout entirely
- Uses Material components directly (MatCard, MatButton, etc.)
- Provides its own navigation elements (Sign In, Sign Up buttons)

### Self-Contained Styling
Public route components should include all necessary styles in their SCSS file:

```scss
// affiliate-landing.component.scss
.landing-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary-color);
  padding: 20px;
}

.landing-card {
  max-width: 600px;
  width: 100%;
  text-align: center;
}
```

## 5. Template Patterns for Public Routes

### Loading State
```html
@if (loading) {
  <div class="loading-container">
    <mat-spinner></mat-spinner>
    <p>Loading affiliate information...</p>
  </div>
}
```

### Error State
```html
@if (!loading && error) {
  <mat-card class="error-card">
    <mat-card-content>
      <h2>Oops!</h2>
      <p>{{ error }}</p>
      <button mat-raised-button color="primary" routerLink="/home">Go Home</button>
    </mat-card-content>
  </mat-card>
}
```

### Conditional UI Based on Auth State
```html
@if (!loading && !error && affiliateData) {
  <mat-card class="landing-card">
    <mat-card-header>
      @if (affiliateData.brand_image_url) {
        <img [src]="getBrandImageUrl()" alt="Brand" class="brand-image">
      }
    </mat-card-header>
    
    <mat-card-content>
      <h1>Join {{ affiliateData.affiliate_username }}'s Network</h1>
      
      @if (!isAuthenticated) {
        <!-- Show Sign Up / Sign In buttons -->
        <button mat-raised-button color="primary" (click)="onSignUp()">Sign Up</button>
        <button mat-raised-button (click)="onSignIn()">Sign In</button>
      } @else if (hasExistingAffiliate) {
        <!-- Already in a network -->
        <p>You're already part of {{ existingAffiliateUsername }}'s network.</p>
      } @else {
        <!-- Authenticated, can join -->
        <button mat-raised-button color="primary" (click)="onJoinNetwork()">
          Join Network
        </button>
      }
    </mat-card-content>
  </mat-card>
}
```

## 6. Testing Checklist for Public Routes

When implementing a new public route:

- [ ] Route defined in `app.routes.ts` without `canActivate` guard
- [ ] Component is standalone with all necessary imports
- [ ] Works when NOT logged in (primary use case)
- [ ] Works when logged in (shows appropriate UI)
- [ ] Handles loading states properly
- [ ] Handles error states gracefully
- [ ] Uses HTTP service for public data (not GraphQL with auth)
- [ ] GraphQL errors fail silently (if applicable)
- [ ] Navigation to login/register preserves context via query params
- [ ] Self-contained styling (no dependency on app layout)
- [ ] Responsive design for mobile/tablet/desktop
- [ ] No console errors when accessed without authentication
- [ ] Proper TypeScript types for all data
- [ ] Subscription cleanup in `ngOnDestroy`

## 7. Examples of Public Routes

Current public routes in the application:

| Path | Component | Purpose |
|------|-----------|---------|
| `/home` | HomeComponent | Landing/marketing page |
| `/register` | RegisterComponent | User registration |
| `/login` | LoginComponent | User login |
| `/forgot` | ForgotPasswordComponent | Password reset request |
| `/verify` | VerifyEmailComponent | Email verification |
| `/reset` | ResetPasswordComponent | Password reset |
| `/a/:code` | AffiliateLandingComponent | Affiliate network invitation |
| `/privacy-policy` | PrivacyPolicyComponent | Privacy policy |
| `/terms-and-conditions` | TermsAndConditionsComponent | Terms of service |

## 8. HTTP Service Pattern for Public Data

Create dedicated HTTP services for public endpoints that don't require authentication:

```typescript
// affiliate-http.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface AffiliateLandingData {
  affiliate_code: string;
  affiliate_username: string;
  brand_image_url: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AffiliateHttpService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAffiliateLanding(code: string): Observable<AffiliateLandingData> {
    return this.http.get<AffiliateLandingData>(
      `${this.apiUrl}/a/${code}/`
    );
  }
}
```

## 9. Storage Service Pattern

Use storage services to preserve state between public and authenticated routes:

```typescript
// affiliate-storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AffiliateStorageService {
  private readonly STORAGE_KEY = 'pendingAffiliateCode';

  setAffiliateCode(code: string): void {
    sessionStorage.setItem(this.STORAGE_KEY, code);
  }

  getAffiliateCode(): string | null {
    return sessionStorage.getItem(this.STORAGE_KEY);
  }

  clearAffiliateCode(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}
```

---

## Summary

Public routes in Capital Copilot are characterized by:

1. **No AuthGuard** - Route is accessible without login
2. **Standalone component** - Self-contained with all dependencies
3. **Dual-mode operation** - Works for both authenticated and unauthenticated users
4. **HTTP for public data** - Use HTTP services, not authenticated GraphQL
5. **Graceful error handling** - Silent failures for optional authenticated features
6. **Context preservation** - Query parameters preserve state through auth flow
7. **Self-contained layout** - No dependency on app shell/toolbar
8. **Storage services** - Persist context across route transitions

Follow these patterns when adding new public pages like marketing pages, legal pages, or public-facing features.
