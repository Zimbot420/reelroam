// Run with: node scripts/generate-apple-secret.mjs
// Generates the Apple OAuth secret key for Supabase
// This secret expires in 6 months — regenerate it then

import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Fill these in ──────────────────────────────────────────────────────────────
const TEAM_ID      = 'T3FHS868J8';
const KEY_ID       = 'LYS9723HS7';       // e.g. 'ABC123DEFG'
const SERVICES_ID  = 'com.simen.scrollaway.signin';
const KEY_FILE     = 'C:/Users/Simen/Downloads/AuthKey_LYS9723HS7.p8';   // e.g. 'C:/Users/Simen/Downloads/AuthKey_ABC123.p8'
// ──────────────────────────────────────────────────────────────────────────────

const privateKey = readFileSync(KEY_FILE, 'utf8');

const now = Math.floor(Date.now() / 1000);
const exp = now + 15777000; // 6 months

const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
})).toString('base64url');

const data = `${header}.${payload}`;
const sign = createSign('SHA256');
sign.update(data);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }, 'base64url');

const jwt = `${data}.${signature}`;

console.log('\n✅ Apple Secret Key (paste this into Supabase):\n');
console.log(jwt);
console.log('\n⚠️  This expires in 6 months. Regenerate it before then.\n');
