'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.kromi-arch');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const KEYCHAIN_SERVICE = 'kromi-arch';
const KEYCHAIN_ACCOUNT = 'openai-key';
const IS_MAC = process.platform === 'darwin';

// ─── Keychain (macOS) ────────────────────────────────────────────────────────

function keychainGet() {
  if (!IS_MAC) return null;
  try {
    return execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w`,
      { stdio: 'pipe' }
    ).toString().trim();
  } catch {
    return null;
  }
}

function keychainSet(value) {
  if (!IS_MAC) return false;
  try {
    // Delete existing entry first (update = delete + add)
    try {
      execSync(
        `security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}"`,
        { stdio: 'pipe' }
      );
    } catch {}
    execSync(
      `security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}" -w "${value}"`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

function keychainDelete() {
  if (!IS_MAC) return;
  try {
    execSync(
      `security delete-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_ACCOUNT}"`,
      { stdio: 'pipe' }
    );
  } catch {}
}

// ─── Non-secret config (dbUrl, etc.) ─────────────────────────────────────────

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveConfig(updates) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  // Never persist the API key to disk — always use Keychain on macOS
  const { openaiKey, ...rest } = updates;
  const current = loadConfig();
  const { openaiKey: _drop, ...currentClean } = current;
  const next = { ...currentClean, ...rest };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));

  if (openaiKey) {
    if (IS_MAC) {
      keychainSet(openaiKey);
    } else {
      // Non-macOS fallback: warn and store (Linux/Windows users manage their own secrets)
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...next, openaiKey }, null, 2));
    }
  }

  return next;
}

// Priority: env var → Keychain (macOS) → config.json (non-macOS fallback)
function getOpenAIKey() {
  return process.env.OPENAI_API_KEY || keychainGet() || loadConfig().openaiKey;
}

function deleteOpenAIKey() {
  keychainDelete();
  const cfg = loadConfig();
  delete cfg.openaiKey;
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

module.exports = { loadConfig, saveConfig, getOpenAIKey, deleteOpenAIKey, CONFIG_FILE, IS_MAC };
