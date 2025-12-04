# SCSS File Size Tracking

## Purpose
Track SCSS source file sizes and compiled CSS output to monitor bundle size optimizations during the MD3 migration and refactoring efforts.

## Usage

### Track Current Sizes
```bash
yarn scss:track
```

This will:
1. Build the project in production mode
2. Analyze all source SCSS files
3. Analyze compiled CSS output
4. Generate timestamped report in `logs/scss-sizes/`
5. Update `logs/scss-sizes/sizes.dev.json` for comparison

### Compare Changes
```bash
# Make your SCSS changes, then:
yarn scss:track

# Compare with previous run:
diff logs/scss-sizes/sizes.dev.json logs/scss-sizes/sizes.2025-11-30_14-30-00.json
```

### Workflow Integration
The `.dev.json` file is tracked in git to provide a baseline. Before committing significant SCSS changes:

1. **Before changes:**
   ```bash
   yarn scss:track  # Creates baseline
   git add logs/scss-sizes/sizes.dev.json
   git commit -m "Baseline: SCSS sizes before refactoring"
   ```

2. **After changes:**
   ```bash
   yarn scss:track  # Compare against baseline
   # Review the diff to ensure bundle size improvements
   git add logs/scss-sizes/sizes.dev.json
   git commit -m "After: SCSS refactoring reduced bundle by XKB"
   ```

## File Structure

```
logs/scss-sizes/
├── sizes.dev.json           # Tracked baseline (committed to git)
└── sizes.YYYY-MM-DD_HH-MM-SS.json  # Timestamped snapshots (ignored)
```

## Report Format

```json
{
  "timestamp": "2025-11-30_14-30-00",
  "summary": {
    "total_source_bytes": 524288,
    "total_source_human": "512KB",
    "total_compiled_bytes": 262144,
    "total_compiled_human": "256KB",
    "total_source_files": 145,
    "total_compiled_files": 3,
    "compression_ratio_percent": 50,
    "reduction_bytes": 262144,
    "reduction_human": "256KB"
  }
}
```

## Metrics to Monitor

### During MD3 Migration
- **Source file count**: Should decrease as we consolidate styles into mixins
- **Total source bytes**: May initially increase (adding MD3 tokens), should decrease overall
- **Compiled output**: Should decrease significantly as we remove custom styles

### Goals
- Reduce total SCSS source files by 20-30% through consolidation
- Reduce compiled CSS bundle by 30-40% by removing duplicate styles
- Maintain compression ratio >60% (compiled size vs source size)

## Integration with CI/CD

Consider adding to pre-push hooks:
```bash
# .husky/pre-push
yarn scss:track
git add logs/scss-sizes/sizes.dev.json
```

Or integrate into build process to track progress over time.

## Troubleshooting

### "Permission denied" error
```bash
chmod +x scripts/track-scss-size.sh
```

### Build fails during tracking
The script builds the project before analyzing. If build fails:
1. Fix build errors first
2. Run `yarn build` manually to verify
3. Then re-run `yarn scss:track`

## See Also
- [MD3 Comprehensive Theme Guide](./MD3_COMPREHENSIVE_THEME_GUIDE.md)
- [CSS Size Analysis](./css-size-analysis.md) (existing tool for runtime analysis)

