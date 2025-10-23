#!/usr/bin/env python3
"""
Clean ALL Ghost CMS newsletter signup code from MDX files.
Removes any line containing .nc-loop-dots and surrounding newsletter text.
"""

import re
from pathlib import Path

def clean_file(filepath):
    """Remove all newsletter signup related content from a file."""
    content = filepath.read_text(encoding='utf-8')
    original_content = content

    # Split into lines for processing
    lines = content.split('\n')
    cleaned_lines = []
    skip_mode = False

    for line in lines:
        # Check if this line contains newsletter code markers
        if any(marker in line for marker in [
            '.nc-loop-dots',
            'Count me in!',
            'Email sent! Check your inbox',
            'No spam.',
            '@keyframes nc-loop-dots',
            'Subscribe .nc-loop'
        ]):
            skip_mode = True
            continue

        # Skip lines until we hit content separator or new section
        if skip_mode:
            # End skip mode when we hit a separator or new heading
            if line.strip() in ['* * *', '---'] or line.startswith('#'):
                skip_mode = False
                cleaned_lines.append(line)
            continue

        cleaned_lines.append(line)

    content = '\n'.join(cleaned_lines)

    if content != original_content:
        filepath.write_text(content, encoding='utf-8')
        print(f"✓ Cleaned {filepath.name}")
        return True
    else:
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
