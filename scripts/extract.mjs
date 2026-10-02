// Splits the original single-file HTML apps into CSS / markup / JS for the Next.js routes.
// Usage: node scripts/extract.mjs <folder with the .html files> <this project folder>
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const apps = [
  { name: 'invoice', file: 'Adswise-Invoices.html' },
  { name: 'hrms', file: 'Adswise-HRMS (3).html' },
];

// Link back to the portal home, placed above the app nav (which the app script re-renders).
const home = '<a href="/" class="portal-home">&larr; All Apps</a>\n    ';

for (const a of apps) {
  const html = fs.readFileSync(path.join(root, a.file), 'utf8');
  const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const body = html
    .match(/<body>([\s\S]*?)<script>/)[1]
    .trim()
    .replace('<nav class="nav" id="nav"></nav>', home + '<nav class="nav" id="nav"></nav>');
  const js = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
  const libs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);

  fs.writeFileSync(path.join(out, 'app', a.name, `${a.name}.css`), css);
  fs.writeFileSync(path.join(out, 'public', 'apps', `${a.name}.js`), js);
  fs.writeFileSync(
    path.join(out, 'app', a.name, 'markup.ts'),
    `// Generated from ${a.file} by scripts/extract.mjs — do not edit by hand.\n` +
      `export const markup = ${JSON.stringify(body)};\n` +
      `export const libs = ${JSON.stringify(libs, null, 2)};\n`
  );
  console.log(`${a.name}: css ${css.length}, markup ${body.length}, js ${js.length}`);
}
