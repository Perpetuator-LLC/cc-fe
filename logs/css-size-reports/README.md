# CSS/SCSS Size Tracking

This directory tracks **compiled CSS output** sizes from Angular builds.

## Quick Commands

```bash
yarn css:dev          # Build + analyze + compare to baseline
yarn css:analyze      # Analyze current build (no rebuild)
yarn css:baseline     # Save current as new baseline
yarn css:compare      # Compare dev snapshot to baseline
```

## Files

| File | Purpose | Git Status |
|------|---------|------------|
| `history.json` | Historical size data with timestamps | ✅ Committed |
| `README.md` | This documentation | ✅ Committed |

## How It Works

1. **`yarn css:dev`** builds the project and records compiled CSS sizes
2. Results are appended to `history.json` with timestamps
3. Each entry includes total size, file count, and git commit hash

## Interpreting Results

### Healthy Metrics
- Total compiled CSS: **100-150 KB** (gzipped: ~20-30KB)
- Individual component CSS: **< 24 KB** (warning at 12KB)
- File count: Should remain stable

### Warning Signs
- Sudden size increases > 10%
- Individual files exceeding 24KB
- Rapid file count growth

## Budget Limits (angular.json)

```json
{
  "type": "anyComponentStyle",
  "maximumWarning": "12kB",   // Triggers warning
  "maximumError": "24kB"      // Fails build
}
```

## Related

- **Source SCSS tracking**: See `logs/scss-sizes/README.md`
- **Angular budgets**: See `angular.json` → budgets
- **MD3 Theme Guide**: See `notes/reference/MD3_COMPREHENSIVE_THEME_GUIDE.md`

