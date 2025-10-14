# Code Quality

- All import statements should be at and be added to the top of the file.
- **Comments**: Remove comments that are redundant or can be inferred from well-named functions and variables. Leave
  comments that explain subtleties, provide examples of values, or clarify how to use the code.
- Keep output reasonably concise but provide helpful context.
- Follow the existing formatting as closely as possible.
- Keep comments to a minimum, they should only capture logic not obvious from the code.
- Avoid making excessive assumptions on behavior if not explicitly stated in the prompt.

# High-level

- Most concepts are explained in the `notes` top-level directory in the repo - look there for info, and add to it.
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
