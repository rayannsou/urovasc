'use strict';
/* Rappels push SANS forfait Blaze : lancé toutes les ~15 min par GitHub Actions (gratuit). */
const admin = require('firebase-admin');
const {dueFor, neededDates} = require('../functions/plan');
admin.initializeApp({credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
const fs = admin.firestore();
(async () => {
  const parts = new Intl.DateTimeFormat('fr-CA', {timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date());
  const g = t => parts.find(p => p.type === t).value;
  const now = {date: g('year') + '-' + g('month') + '-' + g('day'), hm: g('hour') + ':' + g('minute')};
  const users = (await fs.collection('push').where('on', '==', true).get()).docs;
  if (!users.length) return console.log('aucun abonné');
  const tr = await fs.doc('trame/semaine').get();
  const overrides = {};
  await Promise.all(neededDates(now.date).map(async d => { const s = await fs.doc('ajustements/' + d).get(); if (s.exists) overrides[d] = s.data(); }));
  const swaps = (await fs.collection('echanges').get()).docs.map(d => d.data());
  const data = {trame: tr.exists ? tr.data() : {postes: [], cases: {}}, overrides, swaps};
  let n = 0;
  for (const u of users) {
    const v = u.data(); if (!v.token) continue;
    for (const m of dueFor(data, u.id, v, now)) {
      try {
        await admin.messaging().send({token: v.token, notification: {title: m.title, body: m.body}, webpush: {fcmOptions: {link: 'https://rayannsou.github.io/urovasc/'}}});
        await u.ref.set({sent: {[m.key]: Date.now()}}, {merge: true}); n++;
      } catch (e) {
        if (e && /registration-token|not-registered|invalid-argument/i.test(String(e.code || e.message))) { await u.ref.set({on: false, token: ''}, {merge: true}); break; }
        console.error('envoi', u.id, e && e.message);
      }
    }
  }
  console.log(now.date, now.hm, n + ' notification(s) envoyée(s)');
})().catch(e => { console.error(e); process.exit(1); });
