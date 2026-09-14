/* build.mjs – baut das ganze Spiel in EINE Datei.
   Aufruf:
     node build.mjs            -> oakblade-einzeldatei.html (zum Doppelklicken)
     node build.mjs --artifact -> artifact.html (ohne Kopf, für die Vorschau)

   Warum? So gibt es nur eine einzige Datei: kein alter Zwischenspeicher,
   keine halb geladenen Stände. Die Datei läuft auch offline, überall. */
import { readFileSync, writeFileSync } from 'node:fs';

const alsArtifact = process.argv.includes('--artifact');
const dateien = ['joystick.js', 'sprites.js', 'maps.js', 'audio.js',
                 'dialog.js', 'chat.js', 'kampf.js', 'game.js'];

let html = readFileSync('index.html', 'utf8');

// Stylesheet einbetten
html = html.replace('<link rel="stylesheet" href="style.css">',
  '<style>\n' + readFileSync('style.css', 'utf8') + '\n</style>');

// Alle Skripte einbetten
for (const datei of dateien) {
  html = html.replace(`<script src="${datei}"></script>`,
    '<script>\n' + readFileSync(datei, 'utf8') + '\n</script>');
}

if (alsArtifact) {
  // Die Vorschau bringt ihren eigenen Kopf mit: alles bis <title> raus
  html = html.slice(html.indexOf('<title>'));
  html = html.replace('</head>', '').replace('<body>', '')
             .replace('</body>', '').replace('</html>', '');
  // Manifest und Icons gibt es in der Vorschau nicht
  html = html.replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?/g, '');
  writeFileSync(process.argv[process.argv.indexOf('--artifact') + 1] || 'artifact.html', html.trim());
} else {
  writeFileSync('oakblade-einzeldatei.html', html);
}

const wo = alsArtifact ? 'Vorschau-Fassung' : 'oakblade-einzeldatei.html';
console.log(wo + ' gebaut:', Math.round(html.length / 1024) + ' KB, alles in einer Datei');
