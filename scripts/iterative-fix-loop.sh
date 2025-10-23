#!/bin/bash
# Iterative fix loop: build, find errors, fix common patterns, repeat

MAX_ITERATIONS=10
ITERATION=1

echo "🔄 Starting iterative fix loop (max $MAX_ITERATIONS iterations)"

while [ $ITERATION -le $MAX_ITERATIONS ]; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔁 Iteration $ITERATION/$MAX_ITERATIONS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Try build
    echo "🏗️  Building..."
    npm run build > /tmp/build-output.log 2>&1

    if [ $? -eq 0 ]; then
        echo "✅ BUILD SUCCESS!"
        echo ""
        echo "📊 Final Statistics:"
        grep "pages generated" /tmp/build-output.log
        exit 0
    fi

    # Extract failing file
    FAILING_FILE=$(grep "file:" /tmp/build-output.log | head -1 | grep -oP 'src/content/blog/.*?\.mdx' | head -1)

    if [ -z "$FAILING_FILE" ]; then
        echo "❌ No specific file error found. Showing last 20 lines:"
        tail -20 /tmp/build-output.log
        exit 1
    fi

    echo "📄 Failing file: $FAILING_FILE"

    # Get error context
    grep -A 3 "Could not parse\|Unexpected" /tmp/build-output.log | head -10

    # Apply automatic fixes
    echo "🔧 Attempting automatic fix..."

    # Fix 1: Replace { } with ( ) in text
    sed -i 's/\([a-zA-Z]\){/\1(/g; s/}\([a-zA-Z]\)/)\1/g' "$FAILING_FILE"

    # Fix 2: Escape < and > in comparisons
    sed -i 's/\s<\([0-9]\)/ less than \1/g; s/\s>\([0-9]\)/ greater than \1/g' "$FAILING_FILE"

    echo "✓ Applied fixes to $FAILING_FILE"

    ITERATION=$((ITERATION + 1))
done

echo "⚠️  Max iterations reached. Some files may still need manual fixes."
echo "📝 Check /tmp/build-output.log for details"
exit 1
