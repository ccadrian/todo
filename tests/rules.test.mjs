// Automatischer Test der Firestore-Regeln gegen den lokalen Emulator.
// Ausführen im Projektordner:  npm install  &&  npm run test:rules
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, collection, getDocs, writeBatch } from 'firebase/firestore';
import fs from 'fs';
const env = await initializeTestEnvironment({ projectId: 'demo-glass', firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 } });
let fails = 0;
const t = async (name, p) => { try { await p; console.log('PASS', name); } catch (e) { fails++; console.log('FAIL', name, e.message); } };
const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const anon = env.unauthenticatedContext().firestore();
const task = (o = {}) => ({ text: 'Hallo', prio: 'yellow', done: false, order: 1024, createdAt: serverTimestamp(), doneAt: null, updatedAt: serverTimestamp(), ...o });
const A = id => doc(alice, 'users/alice/tasks/' + id);

await t('owner create', assertSucceeds(setDoc(A('t1'), task())));
await t('owner read', assertSucceeds(getDoc(A('t1'))));
await t('owner list', assertSucceeds(getDocs(collection(alice, 'users/alice/tasks'))));
await t('owner update text', assertSucceeds(updateDoc(A('t1'), { text: 'Neu', updatedAt: serverTimestamp() })));
await t('owner toggle done', assertSucceeds(updateDoc(A('t1'), { done: true, doneAt: serverTimestamp(), updatedAt: serverTimestamp() })));
await t('owner fractional order', assertSucceeds(updateDoc(A('t1'), { order: 1536.5, updatedAt: serverTimestamp() })));
await t('create with past createdAt (migration)', assertSucceeds(setDoc(A('t2'), task({ createdAt: Timestamp.fromMillis(1700000000000) }))));
await t('batch import', assertSucceeds((() => { const b = writeBatch(alice); for (let i = 0; i < 20; i++) b.set(A('b' + i), task({ order: i })); return b.commit(); })()));
await t('update without updatedAt rejected', assertFails(updateDoc(A('t1'), { text: 'x' })));
await t('changing createdAt rejected', assertFails(updateDoc(A('t1'), { createdAt: Timestamp.fromMillis(1), updatedAt: serverTimestamp() })));
await t('text 501 rejected', assertFails(setDoc(A('t3'), task({ text: 'x'.repeat(501) }))));
await t('text 500 ok', assertSucceeds(setDoc(A('t4'), task({ text: 'x'.repeat(500) }))));
await t('empty text rejected', assertFails(setDoc(A('t5'), task({ text: '' }))));
await t('bad prio rejected', assertFails(setDoc(A('t6'), task({ prio: 'blue' }))));
await t('done non-bool rejected', assertFails(setDoc(A('t7'), task({ done: 'yes' }))));
await t('order string rejected', assertFails(setDoc(A('t8'), task({ order: '1' }))));
await t('order NaN rejected', assertFails(setDoc(A('t9'), task({ order: NaN }))));
await t('extra field rejected', assertFails(setDoc(A('t10'), task({ evil: 1 }))));
await t('missing field rejected', assertFails(setDoc(A('t11'), (() => { const x = task(); delete x.doneAt; return x; })())));
await t('client updatedAt rejected', assertFails(setDoc(A('t12'), task({ updatedAt: Timestamp.now() }))));
await t('owner delete', assertSucceeds(deleteDoc(A('t2'))));
// Foreign access
await t('bob read alice task', assertFails(getDoc(doc(bob, 'users/alice/tasks/t1'))));
await t('bob list alice tasks', assertFails(getDocs(collection(bob, 'users/alice/tasks'))));
await t('bob write alice task', assertFails(setDoc(doc(bob, 'users/alice/tasks/x'), task())));
await t('bob delete alice task', assertFails(deleteDoc(doc(bob, 'users/alice/tasks/t1'))));
await t('bob read alice settings', assertFails(getDoc(doc(bob, 'users/alice'))));
await t('anon read', assertFails(getDoc(doc(anon, 'users/alice/tasks/t1'))));
await t('anon write', assertFails(setDoc(doc(anon, 'users/alice/tasks/y'), task())));
await t('other top-level collection', assertFails(setDoc(doc(alice, 'public/x'), { a: 1 })));
// Settings
const S = doc(alice, 'users/alice');
await t('settings url', assertSucceeds(setDoc(S, { bg: { kind: 'url', url: 'https://example.com/a.jpg' }, updatedAt: serverTimestamp() })));
await t('settings default', assertSucceeds(setDoc(S, { bg: { kind: 'default', url: null }, updatedAt: serverTimestamp() })));
await t('settings upload', assertSucceeds(setDoc(S, { bg: { kind: 'upload', url: null }, updatedAt: serverTimestamp() })));
await t('settings http rejected', assertFails(setDoc(S, { bg: { kind: 'url', url: 'http://example.com/a.jpg' }, updatedAt: serverTimestamp() })));
await t('settings javascript rejected', assertFails(setDoc(S, { bg: { kind: 'url', url: 'javascript:alert(1)' }, updatedAt: serverTimestamp() })));
await t('settings bad kind', assertFails(setDoc(S, { bg: { kind: 'x', url: null }, updatedAt: serverTimestamp() })));
await t('settings extra field', assertFails(setDoc(S, { bg: { kind: 'default', url: null }, admin: true, updatedAt: serverTimestamp() })));
await t('bob writes alice settings', assertFails(setDoc(doc(bob, 'users/alice'), { bg: { kind: 'default', url: null }, updatedAt: serverTimestamp() })));
// Background asset
const B = doc(alice, 'users/alice/assets/background');
await t('bg asset ok', assertSucceeds(setDoc(B, { mime: 'image/webp', data: 'A'.repeat(700000), updatedAt: serverTimestamp() })));
await t('bg asset too big', assertFails(setDoc(B, { mime: 'image/webp', data: 'A'.repeat(900001), updatedAt: serverTimestamp() })));
await t('bg asset bad mime', assertFails(setDoc(B, { mime: 'text/html', data: 'AAAA', updatedAt: serverTimestamp() })));
await t('other asset id', assertFails(setDoc(doc(alice, 'users/alice/assets/other'), { mime: 'image/webp', data: 'AAAA', updatedAt: serverTimestamp() })));
await t('bob reads alice bg', assertFails(getDoc(doc(bob, 'users/alice/assets/background'))));
await t('owner deletes bg', assertSucceeds(deleteDoc(B)));
await env.cleanup();
console.log(fails ? `${fails} FAILED` : 'ALL RULE TESTS PASSED');
process.exit(fails ? 1 : 0);
