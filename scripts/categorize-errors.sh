#!/bin/bash

echo "📋 Categorizing error types..."

# Extract error patterns with full context
npm run build 2>&1 | \
  grep -A 3 "Could not parse" | \
  tee error-patterns.txt

echo ""
echo "📊 Error Summary:"
grep "Caused by" error-patterns.txt | sort | uniq -c | sort -rn
