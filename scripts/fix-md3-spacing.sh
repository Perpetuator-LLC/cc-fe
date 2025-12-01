#!/bin/zsh
# MD3 Spacing Grid Auto-Fix Script
# Copyright (c) 2025 Perpetuator LLC
#
# This script automatically fixes the most common MD3 4px grid spacing violations
# by replacing non-compliant values with MD3-compliant ones.

set -e  # Exit on error

echo "🔧 MD3 Spacing Grid Auto-Fix"
echo "=============================="
echo ""

# Backup current state
BACKUP_DIR="./backups/md3-fix-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup in: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r src/app "$BACKUP_DIR/"
echo "✅ Backup created"
echo ""

# Count violations before
echo "📊 Counting violations BEFORE fix..."
BEFORE_COUNT=$(yarn lint:scss:fix 2>&1 | grep -c "declaration-property-value-disallowed-list" || true)
echo "   Found: $BEFORE_COUNT spacing violations"
echo ""

# Fix spacing violations
echo "🔨 Applying automated fixes..."

# Fix 20px → 16px (most common violation, contextually usually should be 16px)
echo "   Fixing: 20px → 16px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/padding: 20px/padding: 16px/g' {} \;
find src/app -name "*.scss" -type f -exec sed -i '' 's/margin: 20px/margin: 16px/g' {} \;
find src/app -name "*.scss" -type f -exec sed -i '' 's/gap: 20px/gap: 16px/g' {} \;
find src/app -name "*.scss" -type f -exec sed -i '' 's/: 20px;/: 16px;/g' {} \;

# Fix 10px → 8px
echo "   Fixing: 10px → 8px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/padding: 10px/padding: 8px/g' {} \;
find src/app -name "*.scss" -type f -exec sed -i '' 's/margin: 10px/margin: 8px/g' {} \;
find src/app -name "*.scss" -type f -exec sed -i '' 's/gap: 10px/gap: 8px/g' {} \;

# Fix 30px → 32px
echo "   Fixing: 30px → 32px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/padding: 30px/padding: 32px/g' {} \;
find src/app -name "*.scss" -type f -exec sed -i '' 's/margin: 30px/margin: 32px/g' {} \;

# Fix 18px → 16px
echo "   Fixing: 18px → 16px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/: 18px/: 16px/g' {} \;

# Fix 14px → 16px (font sizes and padding)
echo "   Fixing: 14px → 16px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/padding: 14px/padding: 16px/g' {} \;

# Fix 22px → 24px
echo "   Fixing: 22px → 24px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/: 22px/: 24px/g' {} \;

# Fix 60px → 64px
echo "   Fixing: 60px → 64px..."
find src/app -name "*.scss" -type f -exec sed -i '' 's/: 60px/: 64px/g' {} \;

echo "✅ Automated fixes applied"
echo ""

# Run linter to see improvement
echo "📊 Counting violations AFTER fix..."
AFTER_COUNT=$(yarn lint:scss:fix 2>&1 | grep -c "declaration-property-value-disallowed-list" || true)
echo "   Found: $AFTER_COUNT spacing violations"
echo ""

# Calculate improvement
FIXED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))
if [ $FIXED_COUNT -gt 0 ]; then
  PERCENT=$((FIXED_COUNT * 100 / BEFORE_COUNT))
  echo "✨ SUCCESS!"
  echo "   Fixed: $FIXED_COUNT violations ($PERCENT% improvement)"
else
  echo "⚠️  No violations were fixed automatically"
  echo "   This may mean manual fixes are needed"
fi

echo ""
echo "📝 Summary:"
echo "   Backup location: $BACKUP_DIR"
echo "   Before: $BEFORE_COUNT violations"
echo "   After:  $AFTER_COUNT violations"
echo "   Fixed:  $FIXED_COUNT violations"
echo ""
echo "🔍 Next steps:"
echo "   1. Review the changes: git diff src/app"
echo "   2. Test the app: yarn start"
echo "   3. Run full lint: yarn lint:scss:fix"
echo "   4. Commit if satisfied: git add . && git commit -m 'fix: MD3 spacing grid compliance'"
echo ""

