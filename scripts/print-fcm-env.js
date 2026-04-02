/**
 * Prints FIREBASE_SERVICE_ACCOUNT_JSON as one line for Render / .env paste.
 * Usage: from backend folder → npm run fcm-env
 * Requires: backend/firebase-service-account.json
 */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'firebase-service-account.json');
if (!fs.existsSync(p)) {
  console.error('\n--- FILE NAHI MILI ---\n');
  console.error('Is EXACT path par file honi chahiye (backend folder ke andar, package.json ke saath):');
  console.error('  ', p);
  console.error('\nKya karo:');
  console.error('  1) Firebase Console → Project settings → Service accounts → Generate new private key');
  console.error('  2) Download hui JSON ko YAHAN copy karo aur naam rakho: firebase-service-account.json');
  console.error('  3) Fir dubara: npm run fcm-env\n');
  process.exit(1);
}
const json = JSON.parse(fs.readFileSync(p, 'utf8'));
const oneLine = JSON.stringify(json);
const outDir = path.join(__dirname, '..');
const outTxt = path.join(outDir, 'firebase-service-account.oneline.txt');
const outB64 = path.join(outDir, 'firebase-service-account.b64.txt');

fs.writeFileSync(outTxt, oneLine, 'utf8');
const b64 = Buffer.from(oneLine, 'utf8').toString('base64');
fs.writeFileSync(outB64, b64, 'utf8');

console.log('\nOK — 2 files ban gayi (backend folder mein):\n');
console.log('  1) firebase-service-account.oneline.txt');
console.log('      → Cursor mein kholo, Cmd+A, Copy → Render → FIREBASE_SERVICE_ACCOUNT_JSON');
console.log('  2) firebase-service-account.b64.txt');
console.log('      → Copy → Render → FIREBASE_SERVICE_ACCOUNT_B64 (jab JSON paste na chale)\n');
console.log('(Terminal mein poori line nahi dikhayi — file se copy karo.)\n');
