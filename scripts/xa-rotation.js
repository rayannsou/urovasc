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
  const AL = {eva:['eva','fourage'], isabelle:['ima','isabelle','molina'], antoine:['antoine','martin'], clement:['clement','marcelin','cm'], rim:['rim','rm','maaloum']};
  const docs = (await db.collection('medecins').get()).docs.map(d => ({id: d.id, label: norm(d.data().label)}));
  console.log('Médecins :', docs.map(d => d.id + '=' + d.label).join(' | '));
  const R = {};
  for (const k of Object.keys(AL)) {
    const al = AL[k], d = docs.find(x => al.includes(x.label) || al.includes(x.id)) || docs.find(x => al.some(a => a.length > 3 && x.label.startsWith(a)));
    if (!d) throw new Error('Médecin introuvable : ' + k);
    R[k] = d.id;
  }
  console.log('Correspondance :', JSON.stringify(R));
  const ROT = CYCLE.map(k => R[k]), ids = [...new Set(ROT)];
  const key = cands[0].id + '_4_M', prev = (t.cases || {})[key] || null;
  console.log('=== CASE ACTUELLE (sauvegarde) ' + key + ' ===\n' + JSON.stringify(prev) + '\n=== FIN ===');
  const who = (prev && Array.isArray(prev.who) ? prev.who : []).filter(x => !ids.includes(x));
  const nc = Object.assign({}, prev || {}, {who, rot: ROT});
  delete nc.rotn;
  await ref.update({['cases.' + key]: nc});
  console.log('Écrit :', JSON.stringify(nc));
})().catch(e => { console.error(e); process.exit(1); });
