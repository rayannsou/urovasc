'use strict';
/* Logique pure des rappels (testable sans Firebase). Reproduit vacWho() de l'appli. */
const PARTS = ['M', 'AM'];
const pad = n => String(n).padStart(2, '0');
const toKey = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (k, n) => { const d = fromKey(k); d.setUTCDate(d.getUTCDate() + n); return toKey(d); };
const dowOf = k => (fromKey(k).getUTCDay() + 6) % 7; /* 0 = lundi … 5 = samedi */
const minutes = hm => { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? Number(m[1]) * 60 + Number(m[2]) : 20 * 60; };

/* data = {trame, overrides:{date:{poste_part:{w,t,x}}}, swaps:[...]} */
function whoAt(data, postId, k, part) {
  const dow = dowOf(k); if (dow > 5) return [];
  const c = data.trame && data.trame.cases && data.trame.cases[postId + '_' + dow + '_' + part] || null;
  const ov = data.overrides && data.overrides[k] && data.overrides[k][postId + '_' + part] || null;
  if (!c && !(ov && ((ov.w && ov.w.length) || ov.x))) return [];
  const who = ov ? (ov.w || []).slice() : (Array.isArray(c.who) ? c.who.slice() : []);
  (data.swaps || []).filter(x => x.status === 'conclu' && (!ov || (x.updatedAt || 0) > (ov.t || 0)))
    .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0)).forEach(x => {
      if (x.poste === postId && x.date === k && x.part === part) { const i = who.indexOf(x.from); if (i >= 0) who.splice(i, 1); if (!who.includes(x.to)) who.push(x.to); }
      if (x.poste2 === postId && x.date2 === k && x.part2 === part) { const i = who.indexOf(x.to); if (i >= 0) who.splice(i, 1); if (!who.includes(x.from)) who.push(x.from); }
    });
  return who;
}
/* postes de la journée pour id (hors astreinte du samedi) */
function postsOf(data, id, k) {
  const out = [];
  ((data.trame && data.trame.postes) || []).forEach(p => {
    if (p.samedi) return;
    PARTS.forEach(part => { if (whoAt(data, p.id, k, part).includes(id)) out.push({label: p.label, part}); });
  });
  return out;
}
function onAstreinte(data, id, k) {
  if (dowOf(k) !== 5) return false;
  return ((data.trame && data.trame.postes) || []).some(p => p.samedi && whoAt(data, p.id, k, 'M').includes(id));
}
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const frDate = k => { const d = fromKey(k); return DAYS[dowOf(k)] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; };

/* rappels à envoyer maintenant à un utilisateur ; now = {date:'YYYY-MM-DD', hm:'HH:MM'} (heure de Paris) */
function dueFor(data, id, user, now) {
  const out = [], sent = user.sent || {};
  const nm = minutes(now.hm), um = minutes(user.hour);
  if (!(nm >= um && nm < um + 120)) return out;
  const add = (key, title, body) => { if (!sent[key]) out.push({key, title, body}); };
  if (user.veille !== false) {
    const t = addDays(now.date, 1);
    if (dowOf(t) <= 4) {
      const ps = postsOf(data, id, t);
      if (ps.length) {
        const txt = ps.map(p => p.label + (p.part === 'M' ? ' (matin)' : ' (après-midi)')).join(', ');
        add('veille:' + t, 'Demain : vous êtes posté(e)', frDate(t) + ' : ' + txt);
      }
    }
  }
  const sat7 = addDays(now.date, 7), sat1 = addDays(now.date, 1);
  if (user.ast7 !== false && onAstreinte(data, id, sat7)) add('ast7:' + sat7, 'Astreinte dans 1 semaine', 'Vous êtes d’astreinte ' + frDate(sat7) + '.');
  if (user.ast1 !== false && onAstreinte(data, id, sat1)) add('ast1:' + sat1, 'Astreinte demain', 'Vous êtes d’astreinte ' + frDate(sat1) + '.');
  return out;
}
/* dates dont les ajustements sont nécessaires pour un jour donné */
const neededDates = today => [addDays(today, 1), addDays(today, 7)];
module.exports = {whoAt, postsOf, onAstreinte, dueFor, neededDates, addDays, dowOf, frDate};
