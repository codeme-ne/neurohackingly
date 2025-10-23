#!/bin/bash

echo "🔍 Scanning for all failing MDX files..."

npm run build 2>&1 | \
  grep "file:" | \
  grep -oP 'src/content/blog/.*?\.mdx' | \
  sort -u > failing-files.txt

FAIL_COUNT=$(wc -l < failing-files.txt)
echo "📊 Found $FAIL_COUNT failing files"
cat failing-files.txt
