# Quick Reference: No More Inline Styles!

## ✅ Migration Complete

All dialog components now use external `.html` and `.scss` files.

## 📋 New Pattern (Use This!)

```typescript
@Component({
  selector: 'app-my-dialog',
  standalone: true,
  imports: [...],
  templateUrl: './my-dialog.component.html',  // ✅ External HTML
  styleUrl: './my-dialog.component.scss',      // ✅ External SCSS
})
export class MyDialogComponent { }
```

## ❌ Old Pattern (Don't Use!)

```typescript
@Component({
  selector: 'app-my-dialog',
  standalone: true,
  imports: [...],
  template: `...`,    // ❌ Inline template
  styles: [`...`],    // ❌ Inline styles (bypasses validation!)
})
export class MyDialogComponent { }
```

## 🎨 MD3 Design Tokens (Use These!)

### Colors
```scss
// ✅ DO use MD3 tokens
color: var(--md-sys-color-on-surface);
background: var(--md-sys-color-surface-container);
border-color: var(--md-sys-color-outline-variant);

// ❌ DON'T use legacy variables or hardcoded colors
color: var(--theme-color);        // ❌ Legacy
background: var(--secondary-light); // ❌ Legacy  
border-color: var(--border-color); // ❌ Legacy
color: #8f8fff;                    // ❌ Hardcoded
```

### Spacing (MD3 4px Grid)
```scss
// ✅ DO use MD3 4px grid values
padding: 8px;
gap: 16px;
margin: 24px;
border-radius: 8px;

// ❌ DON'T use non-grid values
padding: 10px;        // ❌ Not on 4px grid
gap: 14px;            // ❌ Not on 4px grid
border-radius: 10px;  // ❌ Not on 4px grid
```

## 📁 File Structure

For each dialog component, you should have:
```
my-dialog/
├── my-dialog.component.ts      # TypeScript logic
├── my-dialog.component.html    # Template (with copyright)
└── my-dialog.component.scss    # Styles (with copyright, validated)
```

## ✅ Benefits

1. **Automatic Validation** - Stylelint checks all SCSS files
2. **Better IDE Support** - Syntax highlighting, autocomplete
3. **Easier Code Review** - Clear separation of concerns
4. **MD3 Compliance** - Design tokens enforced
5. **Theme Support** - Components adapt automatically
6. **Maintainability** - Easier to find and modify

## 🔍 How to Check

```bash
# Verify no inline styles remain
grep -r "styles: \[" src/app --include="*.ts"
# Should return nothing!

# Run stylelint on all SCSS
yarn lint:scss
# Should pass with 0 errors

# Build the app
yarn build
# Should complete successfully
```

## 📚 Examples

All dialog components now follow this pattern:
- `delete-account-dialog`
- `confirm-delete-dialog`
- `auth-callback`
- `create-podcast-dialog`
- `policy-acceptance-dialog`
- `create-episode-dialog`
- `redeem-gift-code-dialog`
- `select-topic-dialog`
- `create-topic-dialog`

Look at any of these for reference when creating new components!

