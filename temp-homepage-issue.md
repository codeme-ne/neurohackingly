# Homepage Rendering Regression

## Ursache
- Auf der Startseite (`src/pages/index.astro`) fehlte die eröffnende Trennzeile `---` für den Astro-Frontmatter-Block.
- Dadurch wurden sämtliche Import-Anweisungen als normaler HTML-Text gerendert, was in der Live-Ansicht als roher Code sichtbar wurde und das Layout zerstörte.

## Lösungsschritte
1. Den Frontmatter-Block korrekt mit einer öffnenden `---`-Zeile beginnen, so dass die Imports von Astro verarbeitet werden.
2. Danach `npm run build` ausführen, um sicherzustellen, dass die Seite wieder korrekt generiert wird.

## Validierung
- `npm run build`
