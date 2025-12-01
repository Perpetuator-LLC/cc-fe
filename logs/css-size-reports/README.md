# CSS Size Analysis Reports

This directory contains reports tracking CSS compilation size over time.

## Files

- **`baseline.json`** - The baseline snapshot (committed to git)
  - Represents the "gold standard" to compare against
  - Update when making significant improvements
  
- **`current.dev.json`** - Development snapshot (not committed)
  - Created with `yarn css:dev`
  - Used for local comparison before committing
  - Git-ignored to prevent conflicts

- **`history.json`** - Historical data (committed to git)
  - Tracks size changes over time
  - Useful for trend analysis

## Usage

### Initial Setup (First Time)
```bash
# Build the project and create baseline
yarn css:baseline
```

### During Development
```bash
# 1. Make your SCSS changes
# 2. Create a dev snapshot to see the impact
yarn css:dev

# This automatically:
# - Builds the project
# - Analyzes CSS sizes
# - Compares with baseline
# - Shows you the diff
```

### Before Committing
```bash
# Compare your changes
yarn css:compare

# If you've made significant improvements, update the baseline
yarn css:baseline
```

### Just Check Current State
```bash
# Build and analyze without saving
yarn build
yarn css:analyze
```

## Interpreting Results

### Good Signs ✅
- Total size decreased
- Fewer CSS files (consolidation)
- Reduced duplication

### Warning Signs ⚠️
- Total size increased significantly
- More CSS files generated
- Large individual files (>100KB)

## MD3 Migration Goals

Our MD3 migration should result in:
- **Smaller total CSS** - Less custom styling
- **Fewer files** - Better consolidation
- **Consistent sizing** - Using design tokens reduces duplication

Track progress by comparing baseline before/after major refactoring phases.

