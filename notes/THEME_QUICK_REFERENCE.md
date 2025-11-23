# Capital Copilot Theme Quick Reference
**Last Updated:** 2025-11-09

## 🎨 Color Palette

### Primary - Capital Blue (Trust, Finance, Stability)
```scss
// Material components
color="primary"

// CSS
background-color: var(--md-sys-color-primary);       // #008ce8 (dark) / #005a9a (light)
color: var(--md-sys-color-on-primary);              // White
```

### Accent - Prominent Purple (Premium, Innovation)
```scss
// Material components
color="accent"  or  color="tertiary"

// CSS
background-color: var(--md-sys-color-tertiary);     // #a63dff (dark) / #5a009a (light)
// OR
background-color: var(--cc-color-secondary);        // Same as tertiary
color: var(--cc-color-on-secondary);                // White
```

### Error - Red (Critical, Danger)
```scss
// Material components
color="warn"

// CSS
color: var(--cc-color-error);                       // #ef5350 (dark) / #c62828 (light)
```

### Success - Green (Growth, Positive)
```scss
color: var(--cc-color-success);                     // #2e7d32
background-color: var(--cc-color-success-container); // Theme-aware
```

### Warning - Orange (Caution, Attention)
```scss
color: var(--cc-color-warning);                     // #f57c00
background-color: var(--cc-color-warning-container); // Theme-aware
```

### Info - Cyan (Information, Neutral)
```scss
color: var(--cc-color-info);                        // #0288d1
background-color: var(--cc-color-info-container);   // Theme-aware
```

### Orange - Vibrant (Energy, Action, Urgency)
```scss
color: var(--cc-color-orange);                      // #ff7b3d (dark) / #9a3b00 (light)
```

## 🎯 Surfaces

### Backgrounds
```scss
--cc-surface-background                             // #121212 (dark) / #fafafa (light)
--cc-surface-card                                   // #1e1e1e (dark) / #ffffff (light)
--cc-surface-elevated                               // #2a2a2a (dark) / #ffffff (light)
--cc-surface-toolbar                                // #1a1a1a (dark) / #ffffff (light)
```

### Borders
```scss
--cc-border-color                                   // rgba(255,255,255,0.12) / rgba(0,0,0,0.12)
--cc-border-color-strong                            // rgba(255,255,255,0.24) / rgba(0,0,0,0.24)
--cc-divider-color                                  // rgba(255,255,255,0.08) / rgba(0,0,0,0.08)
```

### Text
```scss
--cc-text-primary                                   // rgba(255,255,255,0.87) / rgba(0,0,0,0.87)
--cc-text-secondary                                 // rgba(255,255,255,0.60) / rgba(0,0,0,0.60)
--cc-text-tertiary                                  // rgba(255,255,255,0.38) / rgba(0,0,0,0.38)
```

## 📐 Spacing
```scss
--cc-spacing-xs: 4px;
--cc-spacing-sm: 8px;
--cc-spacing-md: 16px;
--cc-spacing-lg: 24px;
--cc-spacing-xl: 32px;
--cc-spacing-2xl: 48px;
```

## 🔲 Border Radius
```scss
--cc-radius-sm: 4px;
--cc-radius-md: 8px;
--cc-radius-lg: 12px;
--cc-radius-xl: 16px;
--cc-radius-round: 999px;
```

## 🛠️ Common Patterns

### Button
```html
<button mat-raised-button color="primary">Primary Action</button>
<button mat-stroked-button color="accent">Secondary</button>
<button mat-button color="warn">Delete</button>
```

### Card
```scss
.my-card {
  background-color: var(--cc-surface-card);
  border: 1px solid var(--cc-border-color);
  border-radius: var(--cc-radius-lg);
  padding: var(--cc-spacing-lg);
}
```

### Status Badge
```html
<span class="cc-success">Active</span>
<span class="cc-warning">Pending</span>
<span class="cc-error">Failed</span>
```

### Themed Text
```scss
.title {
  color: var(--cc-text-primary);
}

.subtitle {
  color: var(--cc-text-secondary);
}

.hint {
  color: var(--cc-text-tertiary);
}
```

## ✅ Build Status
- **Errors:** 0
- **Warnings:** 0
- **Status:** Production Ready

## 📚 Full Documentation
- `/notes/THEME_COLORS_USAGE_NEW.md` - Complete usage guide
- `/notes/MD3_THEMING_STRATEGY.md` - Strategy & psychology
- `/notes/MD3_THEME_LIMITATIONS_AND_SOLUTIONS.md` - MD3 workarounds
- `/logs/ai_edits/MD3_THEME_ZERO_WARNINGS.md` - Implementation summary

