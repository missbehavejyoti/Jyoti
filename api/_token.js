// HMAC-signed access tokens — proves a tier claim was actually granted by this
// server (Stripe payment, redeemed gift code, or owner/beta code), so the
// client can no longer self-grant access by editing localStorage directly.
const crypto = require('crypto');

function _secret() {
  const s = process.env.ACCESS_TOKEN_SECRET;
  if (!s) throw new Error('ACCESS_TOKEN_SECRET not configured');
  return s;
}

function _b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function _unb64url(str) {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sign(payload) {
  const body = _b64url(JSON.stringify(payload));
  const mac = _b64url(crypto.createHmac('sha256', _secret()).update(body).digest());
  return `${body}.${mac}`;
}

// Signature check only, ignoring expiry: lets an expired subscriber token prove
// "this device was granted access before" when renewing.
function verifySignature(token) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 2) return null;
  const [body, mac] = token.split('.');
  const expected = _b64url(crypto.createHmac('sha256', _secret()).update(body).digest());
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  let payload;
  try { payload = JSON.parse(_unb64url(body).toString()); } catch { return null; }
  if (!payload || !payload.exp) return null;
  return payload;
}

function verify(token) {
  const payload = verifySignature(token);
  if (!payload || Date.now() > payload.exp) return null;
  return payload;
}

// A paid subscriber token (live or expired within the last year) whose email, if
// it carries one, matches. Email alone is never proof: anyone can type an address.
function subscriberProof(token, email) {
  const p = verifySignature(token);
  if (!p || (p.tier !== 'full' && p.tier !== 'compat')) return null;
  if (Date.now() > p.exp + 365 * 86400000) return null;
  if (p.email && email && p.email !== email) return null;
  return p;
}

module.exports = { sign, verify, verifySignature, subscriberProof };
