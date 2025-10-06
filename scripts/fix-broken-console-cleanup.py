#!/usr/bin/env python3
"""
Fix broken console.log cleanup artifacts
Removes orphaned template literal fragments and broken statements
"""

import re
import os
from pathlib import Path

# Files with errors from type-check
ERROR_FILES = [
    'app/api/admin/health/openrouter/route.ts',
    'app/api/admin/openrouter-prompt/route.ts',
    'app/api/admin/prompts/route.ts',
    'app/api/chat/history/route.ts',
    'app/api/chat/route.ts',
    'app/api/chat/sync/route.ts',
    'app/api/conversations/[id]/route.ts',
    'app/api/conversations/route.ts',
]

def fix_broken_fragments(content: str) -> str:
    """Remove broken console.log fragments and fix syntax"""

    # Pattern 1: Orphaned closing fragments like `}... (${var})`);
    content = re.sub(r'^\s*\}\.\.\..*?\)\);?\s*$', '', content, flags=re.MULTILINE)

    # Pattern 2: Orphaned template literal fragments at start of line
    content = re.sub(r'^\s*`[^`]*?\$\{[^}]+\}[^`]*?`\);\s*$', '', content, flags=re.MULTILINE)

    # Pattern 3: Orphaned backticks and closing parens
    content = re.sub(r'^\s*`\);\s*$', '', content, flags=re.MULTILINE)

    # Pattern 4: Lines that start with template literal syntax without opening
    content = re.sub(r'^\s*\$\{[^}]+\}.*?`\);\s*$', '', content, flags=re.MULTILINE)

    # Pattern 5: Remove lines with just closing syntax artifacts
    content = re.sub(r'^\s*[\)\]}\s,]+`\);\s*$', '', content, flags=re.MULTILINE)

    # Pattern 6: Remove standalone backtick-paren combinations
    content = re.sub(r'^\s*[`\'\"]\);\s*$', '', content, flags=re.MULTILINE)

    # Pattern 7: Orphaned string concatenation fragments
    content = re.sub(r'^\s*[+]\s*[`\'\""].*?[`\'\""]\);\s*$', '', content, flags=re.MULTILINE)

    # Clean up multiple consecutive blank lines
    content = re.sub(r'\n\n\n+', '\n\n', content)

    return content

def main():
    base_path = Path('/Users/eriksupit/Desktop/makalah-deploy/makalahApp')

    fixed_count = 0

    for file_path in ERROR_FILES:
        full_path = base_path / file_path

        if not full_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue

        # Read file
        with open(full_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Fix broken fragments
        fixed_content = fix_broken_fragments(original_content)

        # Only write if changed
        if fixed_content != original_content:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)

            lines_removed = original_content.count('\n') - fixed_content.count('\n')
            print(f"✓ Fixed {file_path} ({lines_removed} fragments removed)")
            fixed_count += 1
        else:
            print(f"- {file_path} (no changes needed)")

    print(f"\n✅ Fixed {fixed_count} files with broken console.log cleanup artifacts")

if __name__ == '__main__':
    main()
