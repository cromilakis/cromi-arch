#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { execSync, spawnSync } = require('child_process');

const pkg = require('../package.json');

const PACKAGE_NAME = 'kromi-arch';
const COMMAND_PREFIX = 'karch-';
const MARKER_START = '<!-- kromi-arch:start -->';
const MARKER_END = '<!-- kromi-arch:end -->';
const ROOT = path.join(__dirname, '..');
const DOCKER_DIR = path.join(ROOT, 'docker');

const commandsSrc = path.join(ROOT, 'commands');
const claudeMdSrc = path.join(ROOT, 'templates', 'CLAUDE.md');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTargetBase(local) {
  return local
    ? path.join(process.cwd(), '.claude')
    : path.join(os.homedir(), '.claude');
}

function log(msg)  { console.log(msg); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); }
function dim(msg)  { console.log(`    ${msg}`); }

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

function dockerCompose(args, opts = {}) {
  const result = spawnSync('docker', ['compose', ...args], {
    cwd: DOCKER_DIR,
    stdio: opts.silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  return result;
}

// ─── install / uninstall / status ─────────────────────────────────────────────

function install(opts = {}) {
  const targetBase = getTargetBase(opts.local);
  const targetCommands = path.join(targetBase, 'commands');
  const targetClaude = path.join(targetBase, 'CLAUDE.md');
  const scope = opts.local ? 'proyecto (.claude/)' : 'global (~/.claude/)';

  log('');
  log(`kromi-arch v${pkg.version} — instalando en ${scope}`);
  log('');

  fs.mkdirSync(targetCommands, { recursive: true });

  const files = readKarchFiles();
  if (files.length === 0) {
    fail('No se encontraron skills en commands/. El paquete puede estar incompleto.');
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

  if (!fs.existsSync(claudeMdSrc)) {
    fail('templates/CLAUDE.md no encontrado. Saltando...');
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
  log('Skills disponibles en Claude Code:');
  files.forEach(f => dim(`  /${f.replace('.md', '')}`));
  log('');

  // Auto-restore knowledge base if Docker is running and dump exists
  const dumpPath = path.join(ROOT, 'knowledge.json.gz');
  if (fs.existsSync(dumpPath)) {
    const dockerCheck = spawnSync('docker', ['info'], { stdio: 'pipe' });
    if (dockerCheck.status === 0) {
      log('Knowledge base: Docker detectado, restaurando automáticamente...');
      log('');
      dbStart();
      (async () => {
        try {
          const { importDump } = require('../src/dump');
          log('  Importando chunks...');
          const result = await importDump();
          ok(`Knowledge base lista: ${result.chunks} chunks restaurados`);
          log('');
          log('Claude puede buscar con:');
          dim('  kromi-search "<query>"');
          log('');
        } catch (e) {
          dim(`No se pudo restaurar automáticamente: ${e.message}`);
          dim('Ejecutá: npx kromi-arch db:restore');
          log('');
        }
      })();
      return;
    }
  }

  log('Knowledge base (búsqueda semántica):');
  dim('  npx kromi-arch db:start    → levanta PostgreSQL + pgvector');
  dim('  npx kromi-arch db:restore  → restaura el índice pregenerado (sin OpenAI key)');
  dim('  kromi-search "<query>"     → Claude lo usa para buscar conocimiento');
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
  log(`kromi-arch v${pkg.version} — estado (${scope})`);
  log('');

  if (fs.existsSync(targetCommands)) {
    const installed = fs.readdirSync(targetCommands)
      .filter(f => f.startsWith(COMMAND_PREFIX));
    if (installed.length > 0) {
      ok(`${installed.length} skills instalados`);
    } else {
      dim('No hay skills karch-* instalados');
    }
  } else {
    dim('Directorio commands/ no existe');
  }

  if (fs.existsSync(targetClaude)) {
    const content = fs.readFileSync(targetClaude, 'utf8');
    ok(content.includes(MARKER_START)
      ? 'CLAUDE.md: bloque kromi-arch presente'
      : 'CLAUDE.md existe pero sin bloque kromi-arch');
  } else {
    dim('CLAUDE.md no existe');
  }

  // DB status
  log('');
  const dbCheck = dockerCompose(['ps', '--format', 'json'], { silent: true });
  if (dbCheck.status === 0 && dbCheck.stdout?.includes('kromi-knowledge-db')) {
    ok('Knowledge DB: corriendo (PostgreSQL + pgvector en puerto 5433)');
  } else {
    dim('Knowledge DB: detenida  →  npx kromi-arch db:start');
  }

  // Config
  const { loadConfig } = require('../src/config');
  const cfg = loadConfig();
  if (cfg.openaiKey || process.env.OPENAI_API_KEY) {
    ok('OpenAI API key: configurada');
  } else {
    dim('OpenAI API key: no configurada  →  npx kromi-arch config set openai-key sk-...');
  }

  log('');
  dim(`Versión instalada: v${pkg.version}`);
  const latest = await getLatestVersion();
  if (latest && latest !== pkg.version) {
    dim(`Última disponible: v${latest}  →  npx kromi-arch@latest update`);
  } else if (latest) {
    dim('Estás en la última versión');
  }
  log('');
}

// ─── db:start / db:stop ───────────────────────────────────────────────────────

function dbStart() {
  log('');
  log('kromi-arch — iniciando knowledge DB...');
  log('');

  if (!fs.existsSync(DOCKER_DIR)) {
    fail('docker/ no encontrado. El paquete puede estar incompleto.');
    process.exit(1);
  }

  // Check Docker is available
  const dockerCheck = spawnSync('docker', ['info'], { stdio: 'pipe' });
  if (dockerCheck.status !== 0) {
    fail('Docker no está corriendo. Abrí Docker Desktop e intentá de nuevo.');
    process.exit(1);
  }

  log('  Levantando contenedor PostgreSQL + pgvector...');
  const result = dockerCompose(['up', '-d', '--wait']);
  if (result.status !== 0) {
    fail('Error al levantar el contenedor. Revisá Docker Desktop.');
    process.exit(1);
  }

  ok('Knowledge DB lista en postgresql://kromi:kromi@localhost:5433/kromi_knowledge');
  log('');
  log('Siguiente paso:');
  dim('  npx kromi-arch index   → indexa el playbook completo');
  log('');
}

function dbStop() {
  log('');
  log('kromi-arch — deteniendo knowledge DB...');
  dockerCompose(['down']);
  ok('Knowledge DB detenida');
  log('');
}

// ─── db:dump / db:restore ────────────────────────────────────────────────────

async function dbDump() {
  log('');
  log('kromi-arch — generando dump de knowledge base...');
  const { exportDump } = require('../src/dump');
  const result = await exportDump();
  const kb = (result.bytes / 1024).toFixed(1);
  ok(`knowledge.json.gz generado: ${result.chunks} chunks, ${kb} KB`);
  log('');
}

async function dbRestore() {
  log('');
  log('kromi-arch — restaurando knowledge base desde dump...');
  log('');

  const { importDump, DUMP_PATH } = require('../src/dump');
  const fs = require('fs');

  if (!fs.existsSync(DUMP_PATH)) {
    fail('knowledge.json.gz no encontrado en el paquete.');
    fail('Ejecutá: npx kromi-arch index --force');
    process.exit(1);
  }

  log('  Importando chunks...');
  const result = await importDump();
  ok(`${result.chunks} chunks restaurados`);
  log('');
  log('Knowledge base lista. Claude puede buscar con:');
  dim('  kromi-search "<query>"');
  log('');
}

// ─── index / sync ─────────────────────────────────────────────────────────────

async function runIndex(opts = {}) {
  log('');
  log(`kromi-arch — indexando playbook${opts.force ? ' (forzado)' : ''}...`);
  log('');

  const { indexAll } = require('../src/indexer');
  const results = await indexAll(ROOT, { force: opts.force });

  const indexed  = results.filter(r => r.status === 'indexed');
  const skipped  = results.filter(r => r.status === 'unchanged');
  const errors   = results.filter(r => r.status === 'error');
  const total    = indexed.reduce((n, r) => n + r.chunks, 0);

  log('');
  ok(`${indexed.length} archivos indexados (${total} chunks)`);
  if (skipped.length)  dim(`${skipped.length} archivos sin cambios (saltados)`);
  if (errors.length) {
    errors.forEach(e => fail(`${e.file}: ${e.error}`));
  }
  log('');
  log('Knowledge base lista. Claude puede buscar con:');
  dim('  kromi-search "<query>"');
  log('');
}

// ─── config ───────────────────────────────────────────────────────────────────

function configCmd(args) {
  const { loadConfig, saveConfig } = require('../src/config');

  const [action, key, value] = args;

  if (action === 'set') {
    if (key === 'openai-key') {
      if (!value) { fail('Uso: npx kromi-arch config set openai-key sk-...'); process.exit(1); }
      saveConfig({ openaiKey: value });
      ok(`OpenAI API key guardada en ~/.kromi-arch/config.json`);
    } else if (key === 'db-url') {
      if (!value) { fail('Uso: npx kromi-arch config set db-url postgresql://...'); process.exit(1); }
      saveConfig({ dbUrl: value });
      ok(`DB URL guardada`);
    } else {
      fail(`Clave desconocida: ${key}. Claves válidas: openai-key, db-url`);
    }
  } else if (action === 'get') {
    const cfg = loadConfig();
    if (key === 'openai-key') {
      log(cfg.openaiKey ? '(configurada — no se muestra)' : '(no configurada)');
    } else if (key === 'db-url') {
      log(cfg.dbUrl || 'postgresql://kromi:kromi@localhost:5433/kromi_knowledge (default)');
    } else {
      log(JSON.stringify({ ...cfg, openaiKey: cfg.openaiKey ? '(set)' : '(not set)' }, null, 2));
    }
  } else {
    log('');
    log('Uso:');
    dim('  npx kromi-arch config set openai-key sk-...');
    dim('  npx kromi-arch config set db-url postgresql://...');
    dim('  npx kromi-arch config get openai-key');
    log('');
  }
}

// ─── release ──────────────────────────────────────────────────────────────────

async function release() {
  log('');
  log('kromi-arch — release: index → dump → version → publish');
  log('');

  // 1. Re-index all docs
  await runIndex({ force: true });

  // 2. Regenerate dump
  await dbDump();

  // 3. Bump patch version (modifies package.json in-place, no git tag yet)
  execSync('npm version patch --no-git-tag-version', { cwd: ROOT, stdio: 'inherit' });
  const newPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  ok(`Versión bumpeada a v${newPkg.version}`);
  log('');

  // 4. Commit + push
  log('  Commiteando y pusheando...');
  execSync('git add knowledge.json.gz package.json package-lock.json README.md', { cwd: ROOT, stdio: 'inherit' });
  execSync(`git commit -m "chore: update knowledge base v${newPkg.version}"`, { cwd: ROOT, stdio: 'inherit' });
  execSync('git push --set-upstream origin main', { cwd: ROOT, stdio: 'inherit' });
  ok('Push completado');
  log('');

  // 5. Publish to npm
  log('  Publicando en npm...');
  execSync('npm publish', { cwd: ROOT, stdio: 'inherit' });
  log('');

  ok(`kromi-arch v${newPkg.version} publicado en npm`);
  log('');
}

// ─── help ─────────────────────────────────────────────────────────────────────

function help() {
  log('');
  log(`kromi-arch v${pkg.version}`);
  log('Engineering Playbook — Claude Code skills, metodología SDD+BDD y knowledge base semántica');
  log('');
  log('Skills:');
  dim('  npx kromi-arch install            Instala en ~/.claude/ (global)');
  dim('  npx kromi-arch install --local    Instala en .claude/ del proyecto');
  dim('  npx kromi-arch uninstall          Desinstala de ~/.claude/');
  dim('  npx kromi-arch update             Actualiza skills a la última versión');
  dim('  npx kromi-arch status             Muestra estado completo');
  log('');
  log('Knowledge base (búsqueda semántica sobre el playbook):');
  dim('  npx kromi-arch config set openai-key sk-...   Guarda la API key');
  dim('  npx kromi-arch db:start                        Levanta PostgreSQL + pgvector');
  dim('  npx kromi-arch db:restore                      Restaura dump pregenerado (sin OpenAI key)');
  dim('  npx kromi-arch db:dump                         Genera dump desde la DB actual');
  dim('  npx kromi-arch index                           Re-indexa todos los docs (requiere OpenAI key)');
  dim('  npx kromi-arch index --force                   Re-indexa todo (ignora caché)');
  dim('  npx kromi-arch db:stop                         Detiene la DB');
  log('');
  log('Búsqueda (usado por Claude directamente vía Bash):');
  dim('  kromi-search "<query>"');
  dim('  kromi-search "stripe webhook idempotency" --limit 3');
  log('');
  log('Mantenimiento (solo para el maintainer del paquete):');
  dim('  npx kromi-arch release      Re-indexa, genera dump, versiona y publica en npm');
  log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const [,, command, ...rest] = process.argv;
const opts = {
  local: rest.includes('--local'),
  force: rest.includes('--force'),
};

(async () => {
  switch (command) {
    case 'install':
    case 'update':
      install(opts);
      break;
    case 'uninstall':
      uninstall(opts);
      break;
    case 'status':
      await status(opts);
      break;
    case 'db:start':
      dbStart();
      break;
    case 'db:stop':
      dbStop();
      break;
    case 'db:dump':
      await dbDump();
      break;
    case 'db:restore':
      await dbRestore();
      break;
    case 'index':
    case 'sync':
      await runIndex(opts);
      break;
    case 'config':
      configCmd(rest.filter(a => a !== '--local' && a !== '--force'));
      break;
    case 'release':
      await release();
      break;
    case '--version':
    case '-v':
      log(pkg.version);
      break;
    default:
      help();
  }
})();
