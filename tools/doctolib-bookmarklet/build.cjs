#!/usr/bin/env node
/**
 * Minifie `extract.js` -> `bookmarklet.txt` (préfixe `javascript:`).
 *
 * Pas de chaîne de build lourde : on réutilise `esbuild`, déjà présent dans `node_modules` (c'est
 * une dépendance de Vite), sans ajouter de dépendance ni toucher au `package.json` de l'app. Ce
 * script est autonome, à lancer depuis la racine du repo :
 *
 *   node tools/doctolib-bookmarklet/build.cjs
 *
 * (extension `.cjs` volontaire : le `package.json` de l'app déclare `"type": "module"`, ce script
 * reste en CommonJS pour utiliser `require` sans y toucher.)
 *
 * `extract.js` reste la seule source qu'on maintient (lisible, commentée). Ne jamais éditer
 * `bookmarklet.txt` à la main : le régénérer avec cette commande après toute modif d'`extract.js`.
 */
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

const here = __dirname
const repoRoot = path.resolve(here, '..', '..')
const sourcePath = path.join(here, 'extract.js')
const outputPath = path.join(here, 'bookmarklet.txt')

// Le paquet `esbuild` (dépendance de Vite) fournit un script Node pur sous `bin/esbuild` — on
// l'exécute via `node`, ce qui évite le shim `.bin/esbuild.cmd` (fichier batch Windows, pas un
// exécutable natif : `execFileSync` échouerait dessus sans `shell: true`, à éviter — args non
// échappés).
const esbuildScript = path.join(repoRoot, 'node_modules', 'esbuild', 'bin', 'esbuild')

if (!fs.existsSync(esbuildScript)) {
  console.error(
    `esbuild introuvable (${esbuildScript}). Lancer "npm install" à la racine du repo, ou minifier ` +
      'extract.js à la main (cf. README.md §Build) si esbuild n\'est plus une dépendance de Vite.',
  )
  process.exit(1)
}

const minified = execFileSync(
  process.execPath,
  [esbuildScript, sourcePath, '--bundle', '--minify', '--format=iife', '--target=es2020'],
  { encoding: 'utf8', cwd: repoRoot },
).trim()

const bookmarklet = `javascript:${minified}`
fs.writeFileSync(outputPath, bookmarklet + '\n', 'utf8')

console.log(`Bookmarklet régénéré : ${path.relative(repoRoot, outputPath)} (${bookmarklet.length} caractères).`)
