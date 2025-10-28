import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function updateInternalLinks() {
  const files = await glob('src/content/blog/**/*.mdx');
  let updatedCount = 0;

  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // Replace /blog/:slug links but NOT /blog/tag/ links
    // Matches: [text](/blog/slug) but NOT [text](/blog/tag/...)
    content = content.replace(
      /\[([^\]]+)\]\(\/blog\/([^t][^)]+)\)/g,
      '[$1](/$2)'
    );

    // Also handle edge case where tag might start with 't' but isn't 'tag/'
    // This catches /blog/the-post etc. that start with 't'
    content = content.replace(
      /\[([^\]]+)\]\(\/blog\/(t(?!ag\/)[^)]+)\)/g,
      '[$1](/$2)'
    );

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Updated: ${path.basename(file)}`);
      updatedCount++;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} file${updatedCount === 1 ? '' : 's'}`);
}

updateInternalLinks();
