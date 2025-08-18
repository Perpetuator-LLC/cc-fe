# Theme Colors Usage Guide

## Available CSS Custom Properties

### Material Design Colors (Auto-extracted from palettes)

- `--md-sys-color-primary`: Primary color (500 shade from palette)
- `--md-sys-color-primary-light`: Primary color (300 shade from palette)
- `--md-sys-color-primary-dark`: Primary color (700 shade from palette)
- `--md-sys-color-secondary`: Secondary color
- `--md-sys-color-tertiary`: Tertiary color
- `--md-sys-color-error`: Error color (#df4646)
- `--md-sys-color-success`: Success color (#4caf50)
- `--md-sys-color-warning`: Warning color (#ffeb3b)
- `--md-sys-color-background`: Background color

### Application-Specific Colors

- `--theme-color`: Main text color
- `--description-color`: Secondary text color
- `--border-color`: Border color
- `--secondary-color`: Secondary background
- `--secondary-light`: Light secondary background
- `--secondary-dark`: Dark secondary background
- `--secondary-400`: Secondary 400 shade
- `--secondary-450`: Secondary 450 shade
- `--secondary-500`: Secondary 500 shade
- `--toolbar-container-background-color`: Toolbar background
- `--primary`: Primary brand color (#f14a00)
- `--theme-white`: White theme color
- `--theme-yellow`: Yellow theme color
- `--theme-transparent`: Transparent overlay color
- `--purple`: Purple accent color (#8f8fff)

## How to Use in Components

### 1. Basic Component Styling

```scss
.my-component {
  // Use theme colors
  background-color: var(--secondary-light);
  color: var(--theme-color);
  border: 1px solid var(--border-color);

  // Use Material Design colors
  .primary-button {
    background-color: var(--md-sys-color-primary);
    color: white;
  }

  .error-text {
    color: var(--md-sys-color-error);
  }
}
```

### 2. Conditional Styling Based on Theme

```scss
.my-component {
  background-color: var(--secondary-light);
  color: var(--theme-color);

  // Different styles for different themes
  .card {
    background-color: var(--secondary-color);
    border: 1px solid var(--border-color);

    &:hover {
      background-color: var(--secondary-dark);
    }
  }
}
```

### 3. Using Material Design Palette Shades

```scss
.my-component {
  .primary-light {
    background-color: var(--md-sys-color-primary-light);
  }

  .primary-main {
    background-color: var(--md-sys-color-primary);
  }

  .primary-dark {
    background-color: var(--md-sys-color-primary-dark);
  }
}
```

### 4. Complete Component Example

```scss
.user-card {
  background-color: var(--secondary-light);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;

  .card-title {
    color: var(--theme-color);
    font-weight: 600;
    margin-bottom: 8px;
  }

  .card-description {
    color: var(--description-color);
    font-size: 14px;
    margin-bottom: 16px;
  }

  .card-actions {
    display: flex;
    gap: 8px;

    .primary-btn {
      background-color: var(--md-sys-color-primary);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;

      &:hover {
        background-color: var(--md-sys-color-primary-dark);
      }
    }

    .secondary-btn {
      background-color: var(--secondary-color);
      color: var(--theme-color);
      border: 1px solid var(--border-color);
      padding: 8px 16px;
      border-radius: 4px;

      &:hover {
        background-color: var(--secondary-dark);
      }
    }
  }

  .error-message {
    color: var(--md-sys-color-error);
    font-size: 12px;
    margin-top: 8px;
  }
}
```

## Theme Switching

The colors automatically change when the theme switches between light and dark:

```typescript
// In your component
constructor(private themeService: ThemeService) {}

toggleTheme() {
  this.themeService.toggleTheme();
}
```

## Benefits

1. **Automatic Theme Adaptation**: Colors automatically adapt to light/dark themes
2. **Consistent Design**: All components use the same color system
3. **Easy Maintenance**: Change colors in one place (theme definitions)
4. **Accessibility**: Proper contrast ratios maintained
5. **Performance**: Only one theme loaded at a time

## Best Practices

1. **Always use CSS custom properties** instead of hardcoded colors
2. **Use semantic names** (e.g., `--theme-color` instead of `#ffffff`)
3. **Test in both themes** during development
4. **Leverage Material Design palettes** for consistent color relationships
5. **Consider accessibility** when choosing color combinations
