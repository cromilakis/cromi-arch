'use strict';

const { Pool } = require('pg');
const { loadConfig } = require('./config');

const DEFAULT_DB_URL = 'postgresql://kromi:kromi@localhost:5433/kromi_knowledge';

function getDbUrl() {
  return process.env.KROMI_DB_URL || loadConfig().dbUrl || DEFAULT_DB_URL;
}

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getDbUrl(),
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, closePool, getDbUrl };
