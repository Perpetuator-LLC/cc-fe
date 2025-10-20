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


# Color Theme Potentials

Primary Foundation Colors
**#1E3A8A (ep Blue)
Establishes maximum trust and security for financial platform users. Blue is universally recognized for banking and fintech applications, with research showing it's the most effective color for building user confidence when handling money and personal data.

**#2C30 (Capital Navy)
Professional authority for core navigation and headers. This deeper blue variant reinforces credibility while distinguishing your platform from lighter "consumer" blues used by social media platforms.

Financial Growth Colors
**#00C896 (Analyticsreen)
Signals financial growth, profit indicators, and positive market movements. Green is psychologically associated with wealth creation and success - essential for your stock and crypto analysis features.

**#22C55E (Successreen)
Used for positive portfolio changes, gains, and achievement indicators. This brighter green creates immediate positive emotional response when users see profitable trades or growing investments.

Innovation & AI Colors
**#8B5CF6 (Premiumurple)
Communicates cutting-edge AI technology and innovation. Purple differentiates your platform from traditional fintech apps, positioning voice generation and automated research as premium, forward-thinking features.

**#66F1 (Tech Purple)
Secondary purple for AI-powered elements like voice cloning controls and automated content generation. This shade maintains the innovation message while ensuring sufficient contrast for accessibility.

Premium Authority Colors
**#0000 (Pure Black)
Conveys luxury, exclusivity, and premium subscription tiers. Black backgrounds create sophisticated user interfaces that signal high-end financial services rather than consumer banking apps.

**#1F2937 (Charcoal BlackSofter alternative to pure black for dark mode interfaces. Reduces eye strain while maintaining the premium authority that black represents in financial technology.

Accent & Status Colors
**#FFD700 (StandarGold)
Premium feature highlighting and call-to-action buttons. Gold immediately signals wealth, success, and exclusive access - perfect for subscription upgrades and premium analytics tools.

**#D4AF37Metallic Gold)
Subtle luxury accents for badges, achievements, and VIP status indicators. This muted gold maintains premium positioning without overwhelming the interface with brightness.

Supporting Neutrals
**#FFFFFF (Purehite)
Essential for text clarity, content backgrounds, and accessibility compliance. White provides necessary contrast against your darker primary colors while maintaining clean, professional appearance.

**#F8FA (Off-White)
Reduces harsh contrast while maintaining readability. This softer white prevents eye strain during extended platform usage for research and analysis activities.

**#6B7280 (Neutralray)
Secondary text, disabled states, and subtle interface elements. This gray maintains visual hierarchy without competing with your primary brand colors.

Trend-Forward Accents
#F67280 (Market Coral)
2025 trend color for differentiating from competitor blues while maintaining warm, approachable feel. Coral adds personality to financial data without compromising trust.

**#46AC (Input Teal)
Modern alternative to traditional green for certain financial indicators. Teal bridges the trust of blue with the growth association of green, perfect for balanced portfolio displays.
