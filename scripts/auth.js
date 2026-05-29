/**
 * CashGuard – Authentication Module (Firebase)
 * Handles: email/password, Google, Facebook, Apple, email recovery
 */

import { auth, googleProvider, facebookProvider, appleProvider } from './firebase.js';
import { getUserProfile, setUserProfile, dbAdd, dbGetAll }        from './db.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
}                                                                   from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ─── Auth State Observer ────────────────────────────────────────────────────

/**
 * Subscribe to auth state changes.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── Current User ────────────────────────────────────────────────────────────

export function getCurrentUser() {
  return auth.currentUser;
}

// ─── Email / Password ────────────────────────────────────────────────────────

export async function registerWithEmail({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  // Set display name in Firebase Auth
  await updateProfile(user, { displayName: name });

  // Create Firestore user profile
  await setUserProfile(user.uid, {
    name,
    email: user.email,
    provider: 'email',
    createdAt: new Date().toISOString()
  });

  // Seed default data
  await seedDefaults(user.uid);

  return user;
}

export async function loginWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ─── Password Recovery ───────────────────────────────────────────────────────

/**
 * Sends a password-reset email via Firebase.
 * No need for security questions — Firebase handles it securely.
 */
export async function sendRecoveryEmail(email) {
  await sendPasswordResetEmail(auth, email);
}

// ─── Social Login ────────────────────────────────────────────────────────────

async function socialLogin(provider) {
  const cred       = await signInWithPopup(auth, provider);
  const user       = cred.user;
  const profile    = await getUserProfile(user.uid);

  // Only seed on first-time login
  if (!profile) {
    await setUserProfile(user.uid, {
      name:      user.displayName || user.email,
      email:     user.email,
      provider:  provider.providerId || 'social',
      photoURL:  user.photoURL || null,
      createdAt: new Date().toISOString()
    });
    await seedDefaults(user.uid);
  }

  return user;
}

export const loginWithGoogle   = () => socialLogin(googleProvider);
export const loginWithFacebook = () => socialLogin(facebookProvider);
export const loginWithApple    = () => socialLogin(appleProvider);

// ─── Sign Out ────────────────────────────────────────────────────────────────

export async function logout() {
  await signOut(auth);
}

// ─── Seed Default Data ───────────────────────────────────────────────────────

async function seedDefaults(uid) {
  // Check if already seeded (idempotent)
  const existingAccounts = await dbGetAll(uid, 'accounts');
  if (existingAccounts.length > 0) return;

  // Default accounts
  const defaultAccounts = [
    { type: 'cash',   name: 'Efectivo',         description: 'Dinero en efectivo',          balance: 0 },
    { type: 'debit',  name: 'Cuenta Bancaria',   description: 'Cuenta de débito principal',  balance: 0 },
  ];
  for (const acc of defaultAccounts) {
    await dbAdd(uid, 'accounts', acc);
  }

  // Default categories
  const defaultCategories = [
    { name: 'Alimentación',    icon: '🍽️', description: 'Comida y bebidas',      subcategories: [
        { name: 'Supermercado',  icon: '🛒', description: '' },
        { name: 'Restaurantes',  icon: '🍴', description: '' },
      ]},
    { name: 'Transporte',      icon: '🚗', description: 'Gastos de movilidad',   subcategories: [
        { name: 'Gasolina',           icon: '⛽', description: '' },
        { name: 'Transporte público', icon: '🚌', description: '' },
      ]},
    { name: 'Salud',           icon: '❤️',  description: 'Gastos médicos',       subcategories: [] },
    { name: 'Entretenimiento', icon: '🎬', description: 'Ocio y diversión',      subcategories: [] },
    { name: 'Servicios',       icon: '💡', description: 'Luz, agua, internet',   subcategories: [] },
    { name: 'Educación',       icon: '📚', description: 'Cursos y libros',       subcategories: [] },
    { name: 'Ingresos',        icon: '💰', description: 'Ingresos varios',       subcategories: [
        { name: 'Salario',   icon: '💼', description: '' },
        { name: 'Freelance', icon: '💻', description: '' },
      ]},
  ];
  for (const cat of defaultCategories) {
    await dbAdd(uid, 'categories', cat);
  }
}
