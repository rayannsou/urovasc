'use strict';
/* Action ponctuelle : Scanner photonique XA (vendredi matin) en alternance sur 10 semaines.
   Eva 2×/mois max, Isabelle et Antoine 1×/mois, Clément et Rim de temps en temps. */
const admin = require('firebase-admin');
const CYCLE = ['eva','isabelle','eva','antoine','clement','eva','isabelle','eva','antoine','rim'];
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
(async () => {
  const app = admin.initializeApp({credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
  const db = app.firestore();
  const ref = db.doc('trame/semaine'), snap = await ref.get();
  if (!snap.exists) throw new Error('trame/semaine introuvable');
  const t = snap.data();
  const cands = (t.postes || []).filter(p => !p.info && /photonique|\bxa\b|lyric/.test(norm(p.id + ' ' + p.label)));
  console.log('Postes XA trouvés :', JSON.stringify(cands));
  if (cands.length !== 1) throw new Error('Il faut exactement un poste XA : abandon.');
  const ids = [...new Set(CYCLE)];
  const docs = await db.collection('medecins').get();
  const have = new Set(docs.docs.map(d => d.id));
  const missing = ids.filter(i => !have.has(i));
  if (missing.length) throw new Error('Médecins introuvables : ' + missing.join(', ') + ' — présents : ' + [...have].join(', '));
  const key = cands[0].id + '_4_M', prev = (t.cases || {})[key] || null;
  console.log('=== CASE ACTUELLE (sauvegarde) ' + key + ' ===\n' + JSON.stringify(prev) + '\n=== FIN ===');
  const who = (prev && Array.isArray(prev.who) ? prev.who : []).filter(x => !ids.includes(x));
  const nc = Object.assign({}, prev || {}, {who, rot: CYCLE});
  delete nc.rotn;
  await ref.update({['cases.' + key]: nc});
  console.log('Écrit :', JSON.stringify(nc));
})().catch(e => { console.error(e); process.exit(1); });
