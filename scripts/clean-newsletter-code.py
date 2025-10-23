#!/usr/bin/env python3
"""
Clean Ghost CMS newsletter signup code from MDX files.
This removes the problematic inline CSS/JS that breaks MDX parsing.
"""

import re
from pathlib import Path

# Patterns to match various newsletter signup blocks
patterns = [
    # Pattern 1: "Count me in!" version
    re.compile(
        r' Count me in! \.nc-loop-dots.*?@keyframes nc-loop-dots.*?\}\}\n+'
        r'Email sent! Check your inbox to complete your signup\.\n+'
        r'No spam\. Just high quality insights\.\n+',
        re.DOTALL
    ),
    # Pattern 2: "Subscribe" version
    re.compile(
        r' Subscribe \.nc-loop-dots.*?@keyframes nc-loop-dots.*?\}\}\n+'
        r'Email sent! Check your inbox to complete your signup\.\n+'
        r'No spam\. .*?\n+',
        re.DOTALL
    ),
]

def clean_file(filepath):
    """Remove newsletter signup code from a single file."""
    content = filepath.read_text(encoding='utf-8')
    original_content = content

    # Apply all patterns
    for pattern in patterns:
        content = pattern.sub('', content)

    if content != original_content:
        filepath.write_text(content, encoding='utf-8')
        print(f"✓ Cleaned {filepath.name}")
        return True
    else:
        print(f"- No changes needed for {filepath.name}")
        return False

def main():
    """Process all MDX files in the blog content directory."""
    blog_dir = Path(__file__).parent.parent / 'src' / 'content' / 'blog'
    mdx_files = list(blog_dir.glob('*.mdx'))

    print(f"Processing {len(mdx_files)} MDX files...")
    print()

    cleaned_count = 0
    for filepath in sorted(mdx_files):
        if clean_file(filepath):
            cleaned_count += 1

    print()
    print(f"✓ Done! Cleaned {cleaned_count} files.")

if __name__ == '__main__':
    main()
