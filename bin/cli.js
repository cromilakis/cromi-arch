#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const pkg = require('../package.json');

const PACKAGE_NAME = 'kromi-arch';
const COMMAND_PREFIX = 'karch-';
const MARKER_START = '<!-- kromi-arch:start -->';
const MARKER_END = '<!-- kromi-arch:end -->';

const commandsSrc = path.join(__dirname, '..', 'commands');
const claudeMdSrc = path.join(__dirname, '..', 'templates', 'CLAUDE.md');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTargetBase(local) {
  return local
    ? path.join(process.cwd(), '.claude')
    : path.join(os.homedir(), '.claude');
}

function log(msg) { console.log(msg); }
function ok(msg)  { console.log(`  ✓ ${msg}`); }
function err(msg) { console.error(`  ✗ ${msg}`); }
function dim(msg) { console.log(`    ${msg}`); }

function getLatestVersion() {
  return new Promise((resolve) => {
    const url = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;
    https.get(url, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).version); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function readKarchFiles() {
  if (!fs.existsSync(commandsSrc)) return [];
  return fs.readdirSync(commandsSrc)
    .filter(f => f.startsWith(COMMAND_PREFIX) && f.endsWith('.md'))
    .sort();
}

// ─── Comandos ─────────────────────────────────────────────────────────────────

function install(opts = {}) {
  const targetBase = getTargetBase(opts.local);
  const targetCommands = path.join(targetBase, 'commands');
  const targetClaude = path.join(targetBase, 'CLAUDE.md');
  const scope = opts.local ? 'proyecto (.claude/)' : 'global (~/.claude/)';

  log('');
  log(`kromi-arch v${pkg.version} — instalando en ${scope}`);
  log('');

  // 1. Crear directorios
  fs.mkdirSync(targetCommands, { recursive: true });

  // 2. Copiar skills karch-*
  const files = readKarchFiles();
  if (files.length === 0) {
    err('No se encontraron skills en commands/. El paquete puede estar incompleto.');
    process.exit(1);
  }

  for (const file of files) {
    fs.copyFileSync(
      path.join(commandsSrc, file),
      path.join(targetCommands, file)
    );
  }
  ok(`${files.length} skills instalados en ${targetCommands}`);
  files.forEach(f => dim(`/${f.replace('.md', '')}`));

  // 3. Gestionar CLAUDE.md
  if (!fs.existsSync(claudeMdSrc)) {
    err('templates/CLAUDE.md no encontrado. Saltando...');
  } else {
    const newBlock = fs.readFileSync(claudeMdSrc, 'utf8');
    const marked = `${MARKER_START}\n${newBlock}\n${MARKER_END}`;

    if (fs.existsSync(targetClaude)) {
      let existing = fs.readFileSync(targetClaude, 'utf8');
      const start = existing.indexOf(MARKER_START);
      const end = existing.indexOf(MARKER_END);

      if (start !== -1 && end !== -1) {
        existing =
          existing.slice(0, start) +
          marked +
          existing.slice(end + MARKER_END.length);
      } else {
        existing = existing.trimEnd() + '\n\n' + marked;
      }
      fs.writeFileSync(targetClaude, existing);
      ok('CLAUDE.md actualizado (bloque kromi-arch reemplazado)');
    } else {
      fs.writeFileSync(targetClaude, marked);
      ok(`CLAUDE.md creado en ${targetClaude}`);
    }
  }

  log('');
  log(`Listo. En Claude Code puedes usar:`);
  files.forEach(f => dim(`  /${f.replace('.md', '')}`));
  log('');
}

function uninstall(opts = {}) {
  const targetBase = getTargetBase(opts.local);
  const targetCommands = path.join(targetBase, 'commands');
  const targetClaude = path.join(targetBase, 'CLAUDE.md');
  const scope = opts.local ? 'proyecto (.claude/)' : 'global (~/.claude/)';

  log('');
  log(`kromi-arch — desinstalando de ${scope}`);
  log('');

  // 1. Eliminar karch-* de commands/
  let removed = 0;
  if (fs.existsSync(targetCommands)) {
    const files = fs.readdirSync(targetCommands)
      .filter(f => f.startsWith(COMMAND_PREFIX));
    for (const file of files) {
      fs.unlinkSync(path.join(targetCommands, file));
      removed++;
    }
  }
  ok(`${removed} skills eliminados`);

  // 2. Eliminar bloque de CLAUDE.md
  if (fs.existsSync(targetClaude)) {
    let content = fs.readFileSync(targetClaude, 'utf8');
    const start = content.indexOf(MARKER_START);
    const end = content.indexOf(MARKER_END);

    if (start !== -1 && end !== -1) {
      content =
        content.slice(0, start).trimEnd() +
        content.slice(end + MARKER_END.length);
      content = content.trim();

      if (content.length === 0) {
        fs.unlinkSync(targetClaude);
        ok('CLAUDE.md eliminado (estaba vacío sin el bloque kromi-arch)');
      } else {
        fs.writeFileSync(targetClaude, content + '\n');
        ok('Bloque kromi-arch eliminado de CLAUDE.md');
      }
    } else {
      dim('No se encontró bloque kromi-arch en CLAUDE.md');
    }
  }

  log('');
  ok('kromi-arch desinstalado correctamente');
  log('');
}

async function status(opts = {}) {
  const targetBase = getTargetBase(opts.local);
  const targetCommands = path.join(targetBase, 'commands');
  const targetClaude = path.join(targetBase, 'CLAUDE.md');
  const scope = opts.local ? 'local (.claude/)' : 'global (~/.claude/)';

  log('');
  log(`kromi-arch — estado (${scope})`);
  log('');

  // Skills instalados
  if (fs.existsSync(targetCommands)) {
    const installed = fs.readdirSync(targetCommands)
      .filter(f => f.startsWith(COMMAND_PREFIX));

    if (installed.length > 0) {
      ok(`${installed.length} skills instalados:`);
      installed.forEach(f => dim(`/${f.replace('.md', '')}`));
    } else {
      dim('No hay skills karch-* instalados');
    }
  } else {
    dim('Directorio commands/ no existe');
  }

  // CLAUDE.md
  log('');
  if (fs.existsSync(targetClaude)) {
    const content = fs.readFileSync(targetClaude, 'utf8');
    if (content.includes(MARKER_START)) {
      ok('CLAUDE.md: bloque kromi-arch presente');
    } else {
      dim('CLAUDE.md existe pero sin bloque kromi-arch');
    }
  } else {
    dim('CLAUDE.md no existe');
  }

  // Versión local vs latest en npm
  log('');
  dim(`Versión instalada: v${pkg.version}`);
  const latest = await getLatestVersion();
  if (latest && latest !== pkg.version) {
    dim(`Última disponible: v${latest} → npx kromi-arch@latest update`);
  } else if (latest) {
    dim('Estás en la última versión');
  }

  log('');
}

function help() {
  log('');
  log(`kromi-arch v${pkg.version}`);
  log('Engineering Playbook — Claude Code skills y metodología SDD+BDD');
  log('');
  log('Uso:');
  log('  npx kromi-arch install            Instala en ~/.claude/ (global, recomendado)');
  log('  npx kromi-arch install --local    Instala en .claude/ del proyecto actual');
  log('  npx kromi-arch uninstall          Desinstala de ~/.claude/');
  log('  npx kromi-arch uninstall --local  Desinstala de .claude/ del proyecto');
  log('  npx kromi-arch update             Actualiza la versión instalada');
  log('  npx kromi-arch status             Muestra estado de instalación');
  log('');
  log('Para instalar siempre la última versión:');
  log('  npx kromi-arch@latest install');
  log('');
  log('Documentación: https://github.com/ipcromilakis/kromi-arch');
  log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const [,, command, ...rest] = process.argv;
const opts = { local: rest.includes('--local') };

(async () => {
  switch (command) {
    case 'install':
      install(opts);
      break;
    case 'uninstall':
      uninstall(opts);
      break;
    case 'update':
      install(opts);
      break;
    case 'status':
      await status(opts);
      break;
    case '--version':
    case '-v':
      log(pkg.version);
      break;
    default:
      help();
  }
})();
