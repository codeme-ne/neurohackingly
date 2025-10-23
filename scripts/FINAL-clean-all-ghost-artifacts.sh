#!/bin/bash
# Comprehensive cleanup of Ghost CMS artifacts from MDX files

BLOG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONTENT_DIR="$BLOG_DIR/src/content/blog"

echo "🧹 Starting comprehensive Ghost CMS artifact cleanup..."
echo "Working directory: $CONTENT_DIR"
echo ""

# Fix escaped brackets that break MDX parsing
echo "1️⃣  Fixing escaped brackets in links..."
find "$CONTENT_DIR" -name "*.mdx" -type f -exec sed -i 's/\\\[\\\([^]]*\\\)\\\]/[\1]/g' {} +
echo "✓ Fixed escaped brackets"

# Remove Ghost URL placeholders
echo "2️⃣  Removing __GHOST_URL__ placeholders..."
find "$CONTENT_DIR" -name "*.mdx" -type f -exec sed -i 's|__GHOST_URL__/|/|g' {} +
echo "✓ Removed Ghost URL placeholders"

# Count total MDX files
TOTAL=$(find "$CONTENT_DIR" -name "*.mdx" | wc -l)

echo ""
echo "✅ Cleanup complete!"
echo "   Processed $TOTAL MDX files"
echo ""
echo "Next: Run 'npm run build' to test"
