'use strict';
/* Action ponctuelle : autorise les collections « osteo_* » dans les règles Firestore, sans toucher au reste. */
const admin = require('firebase-admin');
(async () => {
  const app = admin.initializeApp({credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
  const sr = app.securityRules();
  const rs = await sr.getFirestoreRuleset();
  const src = rs.source.find(f => /rules/.test(f.name)) || rs.source[0];
  console.log('=== RÈGLES ACTUELLES (sauvegarde) ===\n' + src.content + '\n=== FIN ===');
  if (/osteo_/.test(src.content)) { console.log('Déjà autorisé : rien à faire.'); return; }
  if (/allow\s+read\s*,\s*write\s*:\s*if\s+true/.test(src.content) && /\/\{[a-z]+=\*\*\}/.test(src.content)) { console.log('Règles déjà ouvertes à tout : rien à faire.'); return; }
  const idx = src.content.lastIndexOf('}'), idx2 = src.content.lastIndexOf('}', idx - 1);
  if (idx < 0 || idx2 < 0 || !/documents\s*\{/.test(src.content)) throw new Error('Structure des règles inattendue : abandon.');
  const block = "\n    match /{col}/{doc=**} {\n      allow read, write: if col.matches('osteo_.*');\n    }\n  ";
  const out = src.content.slice(0, idx2) + block + src.content.slice(idx2);
  await sr.releaseFirestoreRulesetFromSource(out);
  console.log('Règles publiées.\n' + out);
})().catch(e => { console.error(e); process.exit(1); });
