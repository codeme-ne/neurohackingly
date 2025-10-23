#!/usr/bin/env python3
"""
Clean Ghost CMS SVG download button code from MDX files.
"""

import re
from pathlib import Path

# Pattern to match the SVG download button code
pattern = re.compile(
    r'\n\n[\d\.]+ [KM]B\n\n'
    r'\.a\{fill:none.*?download-circle\n\n'
    r'\]\(__GHOST_URL__/content/files/.*?\)',
    re.DOTALL
)

def clean_file(filepath):
    """Remove SVG download button code from a file."""
    content = filepath.read_text(encoding='utf-8')
    original_content = content

    # Remove the SVG button code
    content = pattern.sub('', content)

    if content != original_content:
        filepath.write_text(content, encoding='utf-8')
        print(f"✓ Cleaned {filepath.name}")
        return True
    else:
        return False

def main():
    """Process specific MDX files with SVG buttons."""
    blog_dir = Path(__file__).parent.parent / 'src' / 'content' / 'blog'

    files = [
        'get-a-competitive-edge-with-this-months-best-resources.mdx',
        'i-got-an-accountability-partner.mdx',
        'little-treasure-trove.mdx',
        'welcome-here.mdx',
        'cornell-note-taking-system-which-combines-active-recall-and-note-taking.mdx',
    ]

    print(f"Processing {len(files)} files with SVG buttons...")
    print()

    cleaned_count = 0
    for filename in files:
        filepath = blog_dir / filename
        if filepath.exists() and clean_file(filepath):
            cleaned_count += 1

    print()
    print(f"✓ Done! Cleaned {cleaned_count} files.")

if __name__ == '__main__':
    main()
