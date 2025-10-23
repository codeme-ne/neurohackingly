#!/usr/bin/env python3
"""
Fix Ghost CMS bookmark cards that break MDX parsing.
These are link structures like: [ content \n\n more content \n\n ](url)
"""
import re
from pathlib import Path

def fix_ghost_bookmarks(filepath: Path) -> bool:
    """
    Fix malformed Ghost bookmark cards in MDX file.
    Returns True if file was modified.
    """
    content = filepath.read_text()
    original = content

    # Pattern: [  multiline content with images/text  ](url)
    # This pattern matches the malformed bookmark structure
    pattern = r'\[\s*\n\n.*?!\[\]\([^)]+\).*?\n\n\]\(([^)]+)\)'

    def replace_bookmark(match):
        """Replace with simple link"""
        url = match.group(1)
        # Extract title from URL or use generic text
        title = url.split('/')[-2].replace('-', ' ').title() if '/' in url else 'Read more'
        return f'[{title}]({url})'

    content = re.sub(pattern, replace_bookmark, content, flags=re.DOTALL)

    if content != original:
        filepath.write_text(content)
        print(f"✓ Fixed: {filepath.name}")
        return True
    return False

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        # Fix specific file
        filepath = Path(sys.argv[1])
        if filepath.exists():
            fix_ghost_bookmarks(filepath)
    else:
        # Fix all MDX files
        blog_dir = Path('src/content/blog')
        count = 0
        for mdx_file in sorted(blog_dir.glob('*.mdx')):
            if fix_ghost_bookmarks(mdx_file):
                count += 1
        print(f"\n📊 Fixed {count} files")
