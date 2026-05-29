/**
 * CashGuard – Database Layer (Firestore)
 * Generic CRUD helpers scoped to the current user
 */

import { db }                                       from './firebase.js';
import { collection, doc, addDoc, setDoc, getDoc,
         getDocs, updateDoc, deleteDoc, query,
         where, orderBy, serverTimestamp,
         Timestamp }                                from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns a reference to /users/{uid}/{storeName} collection */
export function userCol(uid, storeName) {
  return collection(db, 'users', uid, storeName);
}

/** Add a document and return its generated id */
export async function dbAdd(uid, storeName, data) {
  const ref = await addDoc(userCol(uid, storeName), {
    ...data,
    createdAt: serverTimestamp()
  });
  return ref.id;
}

/** Set a document with a known id (upsert) */
export async function dbSet(uid, storeName, id, data) {
  const ref = doc(db, 'users', uid, storeName, id);
  await setDoc(ref, data, { merge: true });
}

/** Get a single document by id */
export async function dbGet(uid, storeName, id) {
  const ref = doc(db, 'users', uid, storeName, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Get all documents in a subcollection */
export async function dbGetAll(uid, storeName) {
  const snap = await getDocs(userCol(uid, storeName));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Update specific fields of a document */
export async function dbUpdate(uid, storeName, id, data) {
  const ref = doc(db, 'users', uid, storeName, id);
  await updateDoc(ref, data);
}

/** Delete a document by id */
export async function dbDelete(uid, storeName, id) {
  const ref = doc(db, 'users', uid, storeName, id);
  await deleteDoc(ref);
}

/** Get all documents ordered by a field */
export async function dbGetOrdered(uid, storeName, field, direction = 'desc') {
  const q = query(userCol(uid, storeName), orderBy(field, direction));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get user profile document */
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Create or update the user profile document */
export async function setUserProfile(uid, data) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, data, { merge: true });
}

/** Convert Firestore Timestamp to ISO string for display */
export function tsToISO(ts) {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date(ts).toISOString();
}
