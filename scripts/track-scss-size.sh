#!/bin/bash
# Copyright (c) 2025 Perpetuator LLC
# Track SCSS file sizes before and after compilation

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
OUTPUT_DIR="logs/scss-sizes"
DEV_FILE="${OUTPUT_DIR}/sizes.dev.json"
PROD_FILE="${OUTPUT_DIR}/sizes.${TIMESTAMP}.json"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}📊 Tracking SCSS file sizes...${NC}"

# Function to get file size in bytes
get_size() {
    if [ -f "$1" ]; then
        stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Function to format bytes to human readable
format_bytes() {
    local bytes=$1
    if [ "$bytes" -lt 1024 ]; then
        echo "${bytes}B"
    elif [ "$bytes" -lt 1048576 ]; then
        echo "$((bytes / 1024))KB"
    else
        echo "$((bytes / 1048576))MB"
    fi
}

# Build the project to get compiled CSS
echo "Building project..."
yarn build --configuration=production > /dev/null 2>&1

# Initialize JSON structure
cat > "$PROD_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "source_files": {},
  "compiled_files": {},
  "summary": {
    "total_source_bytes": 0,
    "total_compiled_bytes": 0,
    "total_source_files": 0,
    "total_compiled_files": 0,
    "compression_ratio": 0
  }
}
EOF

# Track source SCSS files
total_source_bytes=0
total_source_files=0

echo "Analyzing source SCSS files..."
while IFS= read -r -d '' file; do
    size=$(get_size "$file")
    rel_path="${file#./src/}"

    # Add to JSON (simplified - using temp file approach)
    total_source_bytes=$((total_source_bytes + size))
    total_source_files=$((total_source_files + 1))

    echo "  📄 $rel_path: $(format_bytes "$size")"
done < <(find src -name "*.scss" -type f -print0)

# Track compiled CSS files
total_compiled_bytes=0
total_compiled_files=0

if [ -d "dist" ]; then
    echo ""
    echo "Analyzing compiled CSS files..."
    while IFS= read -r -d '' file; do
        size=$(get_size "$file")
        filename=$(basename "$file")

        total_compiled_bytes=$((total_compiled_bytes + size))
        total_compiled_files=$((total_compiled_files + 1))

        echo "  📦 $filename: $(format_bytes "$size")"
    done < <(find dist -name "*.css" -type f -print0)
fi

# Calculate compression ratio
if [ "$total_source_bytes" -gt 0 ]; then
    compression_ratio=$((total_compiled_bytes * 100 / total_source_bytes))
else
    compression_ratio=0
fi

# Get git info
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Update JSON with summary
cat > "$PROD_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "git": {
    "commit": "$GIT_COMMIT",
    "branch": "$GIT_BRANCH"
  },
  "summary": {
    "total_source_bytes": $total_source_bytes,
    "total_source_human": "$(format_bytes "$total_source_bytes")",
    "total_compiled_bytes": $total_compiled_bytes,
    "total_compiled_human": "$(format_bytes "$total_compiled_bytes")",
    "total_source_files": $total_source_files,
    "total_compiled_files": $total_compiled_files,
    "compression_ratio_percent": $compression_ratio,
    "reduction_bytes": $((total_source_bytes - total_compiled_bytes)),
    "reduction_human": "$(format_bytes $((total_source_bytes - total_compiled_bytes)))"
  }
}
EOF

# Copy to .dev file for comparison
cp "$PROD_FILE" "$DEV_FILE"

echo ""
echo -e "${GREEN}✅ Summary:${NC}"
echo "  Source SCSS: $total_source_files files, $(format_bytes "$total_source_bytes")"
echo "  Compiled CSS: $total_compiled_files files, $(format_bytes "$total_compiled_bytes")"
echo "  Reduction: $(format_bytes $((total_source_bytes - total_compiled_bytes))) (${compression_ratio}% of original)"
echo ""
echo "  📁 Saved to: $PROD_FILE"
echo "  📁 Dev comparison file: $DEV_FILE"
echo ""
echo -e "${YELLOW}💡 To compare changes, run: diff $DEV_FILE $PROD_FILE${NC}"

