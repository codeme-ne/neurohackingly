#!/usr/bin/env python3
"""
Comprehensive Ghost CMS artifact cleanup for MDX files.
Applies all known patterns in one pass.
"""
import re
from pathlib import Path
from typing import List, Tuple
import sys

class GhostArtifactCleaner:
    def __init__(self):
        self.patterns = self._load_patterns()
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'patterns_removed': {}
        }

    def _load_patterns(self) -> List[Tuple[str, str, str]]:
        """Returns: [(pattern_name, regex, replacement)]"""
        return [
            # Ghost bookmark cards (already handled by separate script)
            ('bookmark_cards',
             r'\[\s*\n\n.*?!\[\]\([^)]+\).*?\n\n\]\(([^)]+)\)',
             lambda m: f'[Read more]({m.group(1)})'),

            # Curly braces that MDX tries to parse as JS expressions
            ('curly_braces_text',
             r'\{([^}]+?)\}',
             r'(\1)'),

            # Newsletter signup blocks
            ('newsletter_css',
             r'\.nc-loop-dots-4-24-icon-o\{.*?\}(?:\s*\.nc-[^\}]+\{[^\}]+\})*',
             ''),
            ('newsletter_html',
             r'<form\s+class="newsletter.*?</form>',
             ''),

            # SVG download buttons
            ('svg_buttons',
             r'\.a\{fill:none;stroke:currentColor.*?download-circle[^}]*\}',
             ''),

            # Inline scripts
            ('inline_scripts',
             r'<script\b[^>]*>.*?</script>',
             ''),

            # Inline styles
            ('inline_styles',
             r'<style\b[^>]*>.*?</style>',
             ''),

            # Ghost figure embeds
            ('ghost_figures',
             r'<figure class="kg-[^"]*".*?</figure>',
             ''),

            # Ghost bookmark divs
            ('ghost_bookmark_divs',
             r'<div class="kg-bookmark.*?</div>(?:\s*</div>)*',
             ''),

            # Escaped brackets (already fixed)
            ('escaped_brackets',
             r'\\(\[|\])',
             r'\1'),

            # Ghost URL placeholders
            ('ghost_urls',
             r'__GHOST_URL__/',
             '/'),

            # Backtick apostrophes
            ('backtick_apostrophes',
             r'([a-z])\\\`([a-z])',
             r"\1'\2"),
        ]

    def clean_file(self, filepath: Path, dry_run: bool = False) -> bool:
        """Clean single file, return True if modified"""
        try:
            original = filepath.read_text()
            content = original
            modified = False

            for pattern_name, regex, replacement in self.patterns:
                if callable(replacement):
                    # Replacement is a function
                    def replacer(m):
                        return replacement(m)
                    new_content = re.sub(regex, replacer, content, flags=re.DOTALL | re.IGNORECASE)
                else:
                    # Replacement is a string
                    new_content = re.sub(regex, replacement, content, flags=re.DOTALL | re.IGNORECASE)

                if new_content != content:
                    modified = True
                    changes = len(re.findall(regex, content, re.DOTALL | re.IGNORECASE))
                    self.stats['patterns_removed'][pattern_name] = \
                        self.stats['patterns_removed'].get(pattern_name, 0) + changes
                    content = new_content

            if modified and not dry_run:
                filepath.write_text(content)
                self.stats['files_modified'] += 1

            self.stats['files_processed'] += 1
            return modified

        except Exception as e:
            print(f"❌ Error processing {filepath}: {e}")
            return False

    def clean_all(self, directory: Path = Path('src/content/blog'), dry_run: bool = False):
        """Clean all MDX files in directory"""
        print(f"{'🔍 DRY RUN' if dry_run else '🧹 CLEANING'}: {directory}\n")

        modified_files = []
        for mdx_file in sorted(directory.glob('*.mdx')):
            if self.clean_file(mdx_file, dry_run):
                status = "WOULD MODIFY" if dry_run else "MODIFIED"
                print(f"✓ {status}: {mdx_file.name}")
                modified_files.append(mdx_file.name)

        self._print_summary()
        return modified_files

    def _print_summary(self):
        """Print cleanup statistics"""
        print(f"\n📊 Cleanup Summary:")
        print(f"   Files processed: {self.stats['files_processed']}")
        print(f"   Files modified: {self.stats['files_modified']}")
        if self.stats['patterns_removed']:
            print(f"\n   Patterns removed:")
            for pattern, count in sorted(self.stats['patterns_removed'].items()):
                print(f"   - {pattern}: {count}x")

if __name__ == '__main__':
    cleaner = GhostArtifactCleaner()
    dry_run = '--dry-run' in sys.argv

    cleaner.clean_all(dry_run=dry_run)

    if dry_run:
        print("\n💡 Run without --dry-run to apply changes")
