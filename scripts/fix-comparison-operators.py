#!/usr/bin/env python3
"""
Fix comparison operators (<, >, <=, >=) that MDX interprets as HTML tags.
"""
import re
from pathlib import Path

def fix_comparison_operators(filepath: Path) -> bool:
    """Fix <, >, <=, >= operators that break MDX parsing"""
    content = filepath.read_text()
    original = content

    # Pattern 1: < followed by number (e.g., "<17%", "<100")
    content = re.sub(r'(\s)<(\d)', r'\1less than \2', content)

    # Pattern 2: > followed by number (e.g., ">50%", ">100")
    content = re.sub(r'(\s)>(\d)', r'\1greater than \2', content)

    # Pattern 3: <= followed by number
    content = re.sub(r'(\s)<=(\d)', r'\1less than or equal to \2', content)

    # Pattern 4: >= followed by number
    content = re.sub(r'(\s)>=(\d)', r'\1greater than or equal to \2', content)

    if content != original:
        filepath.write_text(content)
        print(f"✓ Fixed: {filepath.name}")
        return True
    return False

if __name__ == '__main__':
    blog_dir = Path('src/content/blog')
    count = 0
    for mdx_file in sorted(blog_dir.glob('*.mdx')):
        if fix_comparison_operators(mdx_file):
            count += 1
    print(f"\n📊 Fixed {count} files")
