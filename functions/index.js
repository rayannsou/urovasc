'use strict';
const {onSchedule} = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const {dueFor, neededDates} = require('./plan');
admin.initializeApp();
const fs = admin.firestore();

/* toutes les 15 minutes : envoie les rappels dont l'heure choisie est passée (une seule fois chacun) */
exports.rappels = onSchedule({schedule: 'every 15 minutes', timeZone: 'Europe/Paris', region: 'europe-west1'}, async () => {
  const parts = new Intl.DateTimeFormat('fr-CA', {timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date());
  const g = t => parts.find(p => p.type === t).value;
  const now = {date: g('year') + '-' + g('month') + '-' + g('day'), hm: g('hour') + ':' + g('minute')};
  const users = (await fs.collection('push').where('on', '==', true).get()).docs;
  if (!users.length) return;
  const tr = await fs.doc('trame/semaine').get();
  const overrides = {};
  await Promise.all(neededDates(now.date).map(async d => { const s = await fs.doc('ajustements/' + d).get(); if (s.exists) overrides[d] = s.data(); }));
  /* la veille d'une astreinte tombe un vendredi : on a aussi besoin du samedi */
  const sat = neededDates(now.date);
  const swaps = (await fs.collection('echanges').get()).docs.map(d => d.data());
  const data = {trame: tr.exists ? tr.data() : {postes: [], cases: {}}, overrides, swaps};
  for (const u of users) {
    const v = u.data(); if (!v.token) continue;
    const due = dueFor(data, u.id, v, now);
    for (const m of due) {
      try {
        await admin.messaging().send({token: v.token, notification: {title: m.title, body: m.body}, webpush: {fcmOptions: {link: 'https://rayannsou.github.io/urovasc/'}}});
        await u.ref.set({sent: {[m.key]: Date.now()}}, {merge: true});
      } catch (e) {
        if (e && /registration-token|not-registered|invalid-argument/i.test(String(e.code || e.message))) { await u.ref.set({on: false, token: ''}, {merge: true}); break; }
        console.error('envoi', u.id, e && e.message);
      }
    }
  }
});
