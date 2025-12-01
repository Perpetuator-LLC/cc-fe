# CSS Size Tracking - Quick Reference

## Commands

```bash
# First time setup
yarn build && yarn css:baseline

# During development
yarn css:dev                # Build + analyze + compare
yarn css:analyze            # Analyze only (no build)
yarn css:compare            # Compare dev vs baseline

# After major improvements
yarn css:baseline           # Update baseline
```

## What Gets Tracked

✅ **Committed to Git:**
- `logs/css-size-reports/baseline.json` - Reference point
- `logs/css-size-reports/history.json` - Timeline

❌ **Not Committed (Local):**
- `logs/css-size-reports/current.dev.json` - Dev snapshot

## Typical Workflow

```bash
# 1. Start work
git checkout -b feature/md3-migration

# 2. Make SCSS changes
# ... edit component files ...

# 3. Check impact
yarn css:dev

# 4. See results
📊 CSS Size Comparison
Difference: ✅ 18.23 KB (-3.99%)
🎉 Great! CSS size reduced by 18.23 KB!

# 5. Commit with context
git commit -m "refactor: use MD3 tokens (-18KB CSS)"

# 6. Major milestone? Update baseline
yarn css:baseline
```

## Interpreting Output

### Good Signs ✅
```
Total size:      456 KB → 423 KB  (-33 KB, -7%)
File count:      45 → 42          (-3 files)
Largest file:    78 KB → 63 KB    (-15 KB)
```

### Warning Signs ⚠️
```
Total size:      456 KB → 506 KB  (+50 KB, +11%)
File count:      42 → 48          (+6 files)
Largest file:    news.css 250 KB  (too large!)
```

## Quick Tips

- 💡 Run `css:dev` after each component migration
- 💡 Update baseline after completing migration phases
- 💡 Include size changes in commit messages
- 💡 Investigate any size increases before committing
- 💡 Celebrate size reductions! 🎉

## Goals

Our MD3 migration should achieve:
- [ ] **-15% total CSS size**
- [ ] **Largest file < 50 KB**
- [ ] **Consistent 4px grid spacing**
- [ ] **All colors from design tokens**

Track with: `yarn css:dev`

---

**Full Docs:** See `notes/CSS_SIZE_TRACKING.md`

