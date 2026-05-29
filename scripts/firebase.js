/**
 * CashGuard – Firebase Initialization
 * Exports: app, auth, db (Firestore)
 */

import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider,
         FacebookAuthProvider, OAuthProvider }     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore }                            from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { firebaseConfig }                          from './firebase-config.js';

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Auth providers
export const googleProvider   = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const appleProvider    = new OAuthProvider('apple.com');

// Configure Google scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Configure Apple scopes
appleProvider.addScope('email');
appleProvider.addScope('name');
