Aim for efficient design, maintainability, and consistency with Angular Material 3.

# 🚨 SCHEMA IS BACKEND-GENERATED - DO NOT EDIT

**The `src/app/schema.graphql` file is auto-generated from the backend.**

- **NEVER** edit the schema file directly
- **NEVER** add types, mutations, or queries to the schema
- **NEVER** run `codegen` configuration changes or suggest setting up codegen
- **NEVER** create or modify any codegen.yml, codegen.ts, or similar configuration files
- If a GraphQL type/mutation/query doesn't exist, **tell the user what to add to the backend**

When you encounter a missing GraphQL field or mutation:
1. **DO NOT** comment out frontend code that uses it
2. **DO NOT** try to add it to the schema
3. **DO NOT** suggest using GraphQL codegen tools
4. **DO** document what the backend needs to provide
5. **DO** let the user know so they can update the backend

**Schema Sync Process:** The user will update the backend and sync the schema. Frontend types should be defined manually in TypeScript to match the schema.

# 🚀 ANGULAR 21 & APOLLO 4.x - CRITICAL PATTERNS

## Dependency Injection: MUST use inject()
**ESLint rule `@angular-eslint/prefer-inject` will REJECT constructor injection.**

```typescript
// ❌ REJECTED BY LINTER
constructor(private service: MyService) {}

// ✅ CORRECT - Use inject()
private readonly service = inject(MyService);
```

## Apollo Client 4.x: Handle undefined data
**Query results may have `data: undefined` - always handle this.**

```typescript
// ❌ WILL CAUSE TS18048 ERROR
.pipe(map((result) => result.data.myQuery))

// ✅ CORRECT - Check for undefined
.pipe(map((result) => result.data?.myQuery ?? []))
```

## Apollo Imports Changed
```typescript
// ❌ OLD - These imports no longer exist in apollo-angular 13.x
import { MutationResult, QueryRef } from 'apollo-angular';

// ✅ NEW - Import from @apollo/client
import { ApolloQueryResult } from '@apollo/client/core';
import type { QueryRef } from 'apollo-angular';
```

# 🎯 AGENT WORKFLOW ESSENTIALS

## Log File Reading - NON-NEGOTIABLE
**Terminal output is ALWAYS truncated.** After running any terminal command:
1. **ALWAYS** use `2>&1 | tee logs/<name>.log` 
2. **IMMEDIATELY** call `read_file` on the log file to see actual output
3. **NEVER** assume success from truncated output

## Write Compliant Code FIRST
Don't iterate - get it right the first time by checking:
- **Dependency Injection**: Use `inject()` not constructor injection - ESLint will reject constructor params
- **Apollo Queries**: Handle `result.data` being undefined with optional chaining or null checks
- **SCSS**: 4px grid for spacing (4, 8, 12, 16, 20, 24...), 2px grid for fonts (10, 12, 14, 16...), MD3 tokens for colors
- **TypeScript**: Match interface types exactly, don't add missing type values to unions without checking the interface
- **Backend Data**: If backend provides data (sectors, industries, exchanges, periods, intervals), LOAD IT - never hardcode

## Union Types Must Match Interface Definitions
When you create computed properties with union type assertions like `'sector' as const`, ensure the interface actually includes that type. Check the interface FIRST before writing code.

## Icon Visibility in Dark Mode
Always set explicit color on icons: `color: var(--md-sys-color-on-surface-variant)` - don't assume inheritance works.

# ⚠️ CRITICAL: Before Writing ANY Code

## Project-Specific Command Patterns
```bash
# Build with log capture
 cd /Users/nik/projects/capital-copilot-fe && yarn build 2>&1 | tee logs/build.log

# Lint with log capture
 cd /Users/nik/projects/capital-copilot-fe && yarn lint 2>&1 | tee logs/lint.log

# Stylelint with log capture  
 cd /Users/nik/projects/capital-copilot-fe && yarn stylelint "src/app/**/*.scss" 2>&1 | tee logs/stylelint.log
```

**After EVERY command:** call `read_file` on the log file to see actual output.


## 🚫 NO HARDCODED VALUES - Use Backend APIs
**NEVER hardcode values that the backend provides.** Always fetch from GraphQL.

| ❌ Don't Hardcode | ✅ Fetch From Backend |
|-------------------|----------------------|
| GICS Sector names | `gicsSectors` query |
| Terminal hints/examples | `terminalHints` query |
| Help text/categories | `terminalHelp` query |
| Chart period/interval options | `chartControls` from GP response |
| Command list | `commands` query |
| Autocomplete suggestions | `autocomplete` query |

**Example - Loading GICS Sectors:**
```typescript
// ❌ BAD - Hardcoded
const GICS_SECTORS = ['Technology', 'Healthcare', ...];

// ✅ GOOD - Loaded from backend
loadGicsSectors(): Observable<string[]> {
  return this.apollo.query<{ gicsSectors: string[] }>({
    query: gql`query { gicsSectors }`,
  }).pipe(map(r => r.data.gicsSectors));
}
```

**See:** `logs/ai_edits/FRONTEND_INTEGRATION_GUIDE.md` for all available backend queries.

## 🧪 Backend API Testing Scripts
Use these scripts to test backend APIs without running the full frontend:

```bash
# Shared authentication library (used by all test scripts)
# Located at: scripts/lib/test-utils.cjs
# Provides: getAccessToken, graphqlQuery, loadEnvironment

# Test DCF Valuation API
node scripts/test-dcf-analysis.cjs MSFT         # DCF for MSFT
node scripts/test-dcf-analysis.cjs AAPL 7       # DCF with 7 year projections

# Test Fundamentals API
node scripts/test-fundamentals.cjs MSFT         # Annual fundamentals
node scripts/test-fundamentals.cjs MSFT q       # Quarterly fundamentals

# Test WebSocket GraphQL APIs (quote, chart, progressive loading, etc.)
node scripts/test-ws-graphql-v2.cjs all

# Test specific functionality
node scripts/test-ws-graphql-v2.cjs quote       # Real-time quotes
node scripts/test-ws-graphql-v2.cjs chart       # Stock price connections
node scripts/test-ws-graphql-v2.cjs progressive # Progressive data loading
node scripts/test-ws-graphql-v2.cjs intervals   # Test all interval types (daily, weekly, hourly, etc.)
node scripts/test-ws-graphql-v2.cjs hourly      # Detailed intraday interval investigation
node scripts/test-ws-graphql-v2.cjs history     # Command history
node scripts/test-ws-graphql-v2.cjs execute     # Execute commands
node scripts/test-ws-graphql-v2.cjs commands    # Available commands list
node scripts/test-ws-graphql-v2.cjs watchlist   # Watchlist symbols
node scripts/test-ws-graphql-v2.cjs dataorder   # Verify data ordering

# Quick GraphQL queries for debugging specific data
node scripts/test-graphql-query.cjs msft-30min           # MSFT 30min regular hours
node scripts/test-graphql-query.cjs msft-30min-extended  # MSFT 30min with extended hours
node scripts/test-graphql-query.cjs msft-daily           # MSFT daily data

# Token management (stored in ~/.capital-copilot/cli-tokens.json)
rm -f ~/.capital-copilot/cli-tokens.json  # Clear cached tokens
```

### Creating New Test Scripts
Use the shared auth library for authenticated API calls:

```javascript
const { graphqlQuery, loadEnvironment } = require('./lib/test-utils.cjs');

// Execute authenticated GraphQL query
const data = await graphqlQuery(`
  query { balanceSheets(ticker: "MSFT", isAnnual: true, limit: 5) { fiscalDateEnding totalAssets } }
`);
```

### Running Scripts with Output Capture

```bash
# Pattern for running scripts and capturing full output:
 cd /Users/nik/projects/capital-copilot-fe && node scripts/test-graphql-query.cjs msft-30min 2>&1 | tee logs/ai_link/test_output.log

# Then use read_file() on the log to see full output
```

This pattern:
1. Runs the script in background with nohup
2. Redirects all output to a log file
3. Waits for completion
4. Displays the captured output

## 🏥 Health Check Verification

Before running tests or debugging API issues, verify both frontend and backend are healthy:

### Backend Health Check
```bash
# Check if backend is running (should return JSON with status and timestamp)
curl -s http://localhost:8000/health/ | jq

# Expected response:
# { "status": "ok", "timestamp": "2026-01-27T12:00:00Z" }

# If empty or error, backend is not running
```

### Frontend Health Check
```bash
# Check if frontend dev server is running
curl -s http://localhost:4200 | head -5

# Or check if build works
 cd /Users/nik/projects/capital-copilot-fe && ng build 2>&1 | tail -5
```

### Quick Full Stack Check
```bash
# Backend
curl -s http://localhost:8000/health/ && echo " ✅ Backend OK" || echo " ❌ Backend DOWN"

# Frontend (dev server)
curl -s http://localhost:4200 > /dev/null && echo " ✅ Frontend OK" || echo " ❌ Frontend DOWN"
```

### GraphQL API Check
```bash
# Test authenticated GraphQL query (requires backend running)
node scripts/test-jobs-chain.cjs 2>&1 | head -20
```

### Common Issues
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `curl: (7) Failed to connect` | Server not running | Start backend/frontend |
| Empty response from scripts | Auth token expired | `rm -f ~/.capital-copilot/cli-tokens.json` |
| GraphQL errors | Schema mismatch | Sync schema from backend |
| `ECONNREFUSED` | Wrong port/URL | Check `environment.ts` API_URL |


**Token handling:** Scripts read credentials from `src/environments/environment.ts` (TEST_EMAIL, TEST_PASSWORD). Tokens are cached in `~/.capital-copilot/cli-tokens.json` with proper file permissions (0600).

## SCSS Rules - MEMORIZE THESE
The linter WILL reject non-compliant SCSS. Write it correctly the first time:

| Property | Rule | Valid Values |
|----------|------|--------------|
| `padding`, `margin`, `gap` | **4px grid only** | 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64px |
| `font-size` | **2px grid only** | 10, 12, 14, 16, 18, 20, 22, 24px |
| `border-radius` | **4px grid only** | 4, 8, 12, 16px (or 999px for pills) |
| `color`, `background`, `border-color` | **MD3 tokens only** | `var(--md-sys-color-*)` |

**NEVER USE:**
- ❌ `::ng-deep` → Put overrides in `styles.scss` with high specificity
- ❌ `!important` → Use CSS specificity instead
- ❌ `#hex`, `rgba()`, `rgb()`, `hsl()` → Use `var(--md-sys-color-*)` tokens
- ❌ Off-grid values like 5px, 10px, 13px, 15px, 18px, 22px

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
| `padding: 6px` | `padding: 4px` or `8px` |
| `margin: 10px` | `margin: 8px` or `12px` |
| `gap: 5px` | `gap: 4px` or `8px` |
| `gap: 6px` | `gap: 4px` or `8px` |
| `font-size: 13px` | `font-size: 12px` or `14px` |
| `font-size: 11px` | `font-size: 10px` or `12px` |
| `font-size: 9px` | `font-size: 10px` |
| `border-radius: 10px` | `border-radius: 8px` or `12px` |
| `border-radius: 6px` | `border-radius: 4px` or `8px` |
| `border-radius: 2px` | `border-radius: 4px` |
| `color: #fff` | `color: var(--md-sys-color-on-primary)` |
| `background: rgba(0,0,0,.5)` | `background: var(--md-sys-color-shadow)` |
| `::ng-deep .mat-*` | Put override in `styles.scss` |

**MANDATORY: After any SCSS edit, run stylelint and READ the log file:**
```bash
 cd /Users/nik/projects/capital-copilot-fe && yarn stylelint "src/app/**/*.scss" 2>&1 | tee logs/stylelint.log
```
Then: `read_file logs/stylelint.log` to verify no errors before continuing.

---


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

## 🚫 DON'T FIGHT MATERIAL COMPONENT SIZING

**Material components have intrinsic sizing that follows MD3 specifications. Don't override widths/heights!**

### Icon Buttons (`mat-icon-button`)
```scss
// ❌ BAD - Fighting MD3 sizing (causes clipped icons, broken hover states)
button {
  width: 24px;
  height: 24px;
  mat-icon {
    width: 16px;
    height: 16px;
    font-size: 16px;
  }
}

// ✅ GOOD - Let Material handle sizing, use color binding for active state
<button mat-icon-button [color]="isActive() ? 'primary' : undefined">
  <mat-icon>push_pin</mat-icon>
</button>
```

### Form Fields (`mat-form-field`)
```html
<!-- ❌ BAD - Trying to make form-field compact with CSS overrides -->
<mat-form-field class="compact-field">...</mat-form-field>

<!-- ✅ GOOD - Use native elements for compact inline controls -->
<select class="interval-select" [value]="value()" (change)="onChange($event)">
  <option *ngFor="let opt of options" [value]="opt">{{ opt }}</option>
</select>
```

```scss
// Native select styled to match MD3
.interval-select {
  height: 28px;
  padding: 4px 8px;
  border: 1px solid var(--md-sys-color-outline);
  border-radius: 4px;
  font-size: 12px;
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface);

  &:focus {
    border-color: var(--md-sys-color-primary);
    outline: none;
  }
}
```

### When to Use Native Elements vs Material Components
| Need | Use |
|------|-----|
| Compact inline dropdown (< 32px height) | Native `<select>` with MD3 styling |
| Form with validation/hints | `<mat-form-field>` |
| Standard buttons | `mat-button`, `mat-flat-button`, etc. |
| Compact icon actions | `mat-icon-button` (don't resize!) |
| Toggle options | `mat-button-toggle-group` |
| Dropdown menus | `mat-menu` with `mat-menu-item` |

### Icon Buttons (`mat-icon-button`) — NEVER OVERRIDE SIZING

**Material icon buttons have intrinsic 48px touch targets with centered 24px icons. DO NOT resize them.**

```html
<!-- ✅ CORRECT - Just use mat-icon-button, no custom classes needed -->
<button mat-icon-button matTooltip="Preview">
  <mat-icon>play_circle</mat-icon>
</button>

<!-- ❌ WRONG - Custom sizing breaks icon centering -->
<button mat-icon-button class="small-btn">
  <mat-icon>play_circle</mat-icon>
</button>
```

```scss
// ❌ BAD - NEVER DO THIS - Icons will be off-center
.small-btn {
  width: 32px;
  height: 32px;
  
  mat-icon {
    width: 18px;
    height: 18px;
    font-size: 18px;
  }
}

// ✅ GOOD - No custom sizing needed, Material handles it
// Just use mat-icon-button directly with no SCSS overrides
```

**If you need a smaller touch target:**
- Use `mat-mini-fab` for 40px circular buttons
- Or accept the 48px standard touch target (better for accessibility)

**Icon naming conventions:**
- `play_circle` / `pause_circle` — for media playback controls
- `volume_up` — for audio currently playing
- `play_arrow` / `pause` — for simpler play/pause icons

### Buttons with Icons and Text — PROPER PATTERNS

**Material buttons with icons MUST follow this pattern:**

```html
<!-- ✅ CORRECT - Icon and text as siblings inside button -->
<button mat-flat-button color="primary">
  <mat-icon>mic</mat-icon>
  <span>Create Recording</span>
</button>

<!-- ✅ CORRECT - Conditional loading state using SEPARATE BUTTONS -->
<!-- Use @if/@else to swap entire buttons, not content inside a button -->
@if (loading) {
  <button mat-flat-button color="primary" disabled>
    <mat-spinner diameter="18" />
    <span>Creating...</span>
  </button>
} @else {
  <button mat-flat-button color="primary" (click)="create()" [disabled]="!valid">
    <mat-icon>mic</mat-icon>
    <span>Create Recording</span>
  </button>
}

<!-- ❌ WRONG - Conditional content INSIDE button causes content projection issues -->
<button mat-flat-button color="primary" [disabled]="loading">
  @if (loading) {
    <mat-spinner diameter="18" />
    <span>Creating...</span>
  } @else {
    <mat-icon>mic</mat-icon>
    <span>Create Recording</span>
  }
</button>

<!-- ❌ WRONG - Text not wrapped in span -->
<button mat-flat-button>
  <mat-icon>mic</mat-icon>
  Create Recording
</button>

<!-- ❌ WRONG - ng-container doesn't help with content projection -->
<button mat-flat-button>
  <ng-container>
    <mat-icon>mic</mat-icon>
    <span>Create Recording</span>
  </ng-container>
</button>

<!-- ❌ WRONG - Self-closing button -->
<button mat-flat-button />
```

**Key rules:**
1. Always wrap button text in `<span>` when next to icon
2. For loading/conditional states: use separate `@if/@else` buttons, NOT conditional content inside
3. Use `mat-spinner` with `diameter="18"` for loading state
4. Add `type="button"` to prevent form submission in dialogs
5. Never override button sizing with CSS

### Menus and Menu Items (`mat-menu`, `mat-menu-item`)
```scss
// ❌ BAD - Fighting MD3 menu sizing
.my-menu-item {
  min-width: 200px;
  padding: 8px 16px;
  mat-icon {
    width: 18px;
    height: 18px;
    font-size: 18px;
  }
}

// ✅ GOOD - Let Material handle menu styling
// Only override for layout (flex), not sizing
.my-menu-item {
  display: flex;
  justify-content: space-between;
  
  .menu-content {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
```

```html
<!-- ❌ BAD - Embedding buttons inside menu items breaks layout -->
<div mat-menu-item class="custom-menu-item">
  <span>Item Name</span>
  <button mat-icon-button (click)="action()">
    <mat-icon>more_vert</mat-icon>
  </button>
</div>

<!-- ✅ GOOD - Use submenu for actions -->
<button mat-menu-item [matMenuTriggerFor]="actionsMenu">
  <mat-icon>folder</mat-icon>
  <span>Item Name</span>
</button>
<mat-menu #actionsMenu="matMenu">
  <button mat-menu-item (click)="view()">View</button>
  <button mat-menu-item (click)="edit()">Edit</button>
  <button mat-menu-item (click)="delete()">Delete</button>
</mat-menu>
```

### Active/Selected State in Buttons
```html
<!-- ❌ BAD - Custom .active class with manual styling -->
<button mat-icon-button [class.active]="isActive()">

<!-- ✅ GOOD - Use Material's color binding -->
<button mat-icon-button [color]="isActive() ? 'primary' : undefined">
```

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

## Project Setup
- **Package Manager:** yarn (not npm)
- **Angular Version:** 21.x (with standalone components)
- **Apollo Client:** 4.x with apollo-angular 13.x
- **TypeScript:** 5.9.x
- **ESLint:** 9.x with flat config

## Dependency Injection - MUST USE inject()

**ESLint enforces `@angular-eslint/prefer-inject` - constructor injection will fail linting.**

```typescript
// ❌ BAD - Constructor injection (LINTER WILL REJECT)
export class MyService {
  constructor(
    private apollo: Apollo,
    private messageService: MessageService,
  ) {}
}

// ✅ GOOD - Use inject() function
export class MyService {
  private readonly apollo = inject(Apollo);
  private readonly messageService = inject(MessageService);
}
```

### Service Pattern with inject()
```typescript
@Injectable({ providedIn: 'root' })
export class MyService extends BaseService {
  // Inject dependencies as readonly class fields
  private readonly someService = inject(SomeService);
  
  constructor() {
    // Call super() with injected dependencies if extending BaseService
    super();
  }
}
```

### Component Pattern with inject()
```typescript
@Component({ standalone: true, imports: [...] })
export class MyComponent implements OnInit, OnDestroy {
  // Services via inject()
  private readonly myService = inject(MyService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  
  // ViewChild, Input, Output remain as decorators
  @ViewChild(MatSort) sort!: MatSort;
  @Input() data: Type[] = [];
  
  private subscriptions = new Subscription();

  ngOnDestroy() { this.subscriptions.unsubscribe(); }
}
```

## Apollo Client 4.x - Query Result Handling

**Apollo Client 4.x changed result types - `result.data` may be undefined.**

```typescript
// ❌ BAD - Will cause TS2345/TS18048 errors
.pipe(map((result) => result.data.myQuery))

// ✅ GOOD - Handle potentially undefined data
.pipe(
  map((result) => {
    if (!result.data) {
      throw new Error('No data returned');
    }
    return result.data.myQuery;
  })
)

// ✅ ALSO GOOD - Use optional chaining with fallback
.pipe(map((result) => result.data?.myQuery ?? []))
```

### BaseService Pattern
Services extending BaseService use `query()` and `mutate()` methods that handle error extraction:
```typescript
export class MyService extends BaseService {
  getData(): Observable<MyType[]> {
    return this.query<{ myQuery: MyType[] }>({
      query: MY_QUERY,
      fetchPolicy: 'network-only',
    }).pipe(map(({ myQuery }) => myQuery));
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
See "Component Pattern with inject()" above for the standard component structure.

Key points:
- Use `inject()` for all service dependencies
- `@ViewChild`, `@Input`, `@Output` remain as decorators
- Always implement `OnDestroy` and unsubscribe
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
```typescript
export class PublicComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly httpService = inject(HttpService);
  private readonly router = inject(Router);
  
  isAuthenticated = false;

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

