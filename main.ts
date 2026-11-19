// Leonida Legend v2 — hand-in program for gta6-trophy-guide-01 (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css, app.js and
// data/trophies.json); it opens in a desktop browser with the network off and loads
// nothing from outside app/. This program copies app/ and screenshots/ beside it
// into the output directory and writes dossier.json there with the kit's vendored
// make.fun library, exactly as the scorer rebuilds it. Leave vendor/makefun-frontend.ts
// untouched — the gate compares the dossier byte for byte against its own copy.
// The build is fully deterministic: no timestamps, no random values, no network,
// so two runs write identical bytes.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve locally: node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Same caps as the sealed gate: at most 4 screenshots of 256 KiB, app/ at most
// 993 files and directories and 48 MiB, dossier text at most 160 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
