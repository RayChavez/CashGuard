# 🔥 Guía de Configuración Firebase para CashGuard

## Paso 1 — Crear el Proyecto Firebase

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Haz clic en **"Agregar proyecto"**
3. Escribe el nombre: `CashGuard` (o el que prefieras)
4. Acepta los términos y haz clic en **"Crear proyecto"**

---

## Paso 2 — Registrar la App Web

1. En la pantalla de tu proyecto, haz clic en el ícono **`</>`** (Web)
2. Nombre de la app: `CashGuard Web`
3. Haz clic en **"Registrar app"**
4. Copia el objeto `firebaseConfig` que aparece (algo así):

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. Pega esos valores en el archivo **`scripts/firebase-config.js`**

---

## Paso 3 — Habilitar Authentication

1. En el menú lateral, ve a **Build > Authentication**
2. Haz clic en **"Comenzar"**
3. Ve a la pestaña **"Sign-in method"**
4. Habilita los siguientes proveedores:

### ✉️ Email/Password
- Haz clic en **"Correo electrónico/contraseña"**
- Activa el primer toggle → **"Guardar"**

### 🔵 Google
- Haz clic en **"Google"**
- Activa el toggle
- Ingresa un **correo de soporte**
- **"Guardar"**

### 📘 Facebook
- Haz clic en **"Facebook"**
- Necesitas una **App de Facebook Developer**:
  1. Ve a [https://developers.facebook.com](https://developers.facebook.com)
  2. Crea una app → tipo **"Consumer"**
  3. Agrega el producto **"Facebook Login"**
  4. Copia el **App ID** y **App Secret** y pégalos en Firebase
  5. En la app de Facebook, agrega en **"URIs de redireccionamiento OAuth válidos"**:
     ```
     https://TU-PROYECTO.firebaseapp.com/__/auth/handler
     ```
- **"Guardar"**

### 🍎 Apple (opcional — requiere Apple Developer Account $99/año)
- Haz clic en **"Apple"**
- Sigue las instrucciones de Firebase (requiere Service ID, Team ID, Key ID)
- Si no tienes cuenta Apple Developer, el botón de Apple mostrará un error gracioso

---

## Paso 4 — Crear Base de Datos Firestore

1. En el menú lateral, ve a **Build > Firestore Database**
2. Haz clic en **"Crear base de datos"**
3. Selecciona **"Iniciar en modo de prueba"** (para desarrollo)
   > ⚠️ El modo de prueba expira en 30 días. Ver reglas de producción abajo.
4. Elige la región más cercana (ej. `nam5` para EEUU/MX)
5. **"Habilitar"**

---

## Paso 5 — Reglas de Firestore (Seguridad)

### Para producción, reemplaza las reglas en **Firestore > Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Un usuario solo puede leer/escribir sus propios datos
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Paso 6 — Agregar Dominio Autorizado

Si vas a publicar la app (Vercel, Netlify, hosting propio), agrega el dominio:

1. Ve a **Authentication > Settings > Dominios autorizados**
2. Haz clic en **"Agregar dominio"**
3. Escribe tu dominio (ej. `cashguard.vercel.app`)

Para desarrollo local con `serve` en `localhost:8080` ya está autorizado por defecto.

---

## Paso 7 — Ejecutar la App

```powershell
# Desde la carpeta del proyecto
npx -y serve . -p 8080
```

Abre [http://localhost:8080](http://localhost:8080) en tu navegador.

---

## ✅ Checklist Rápido

- [ ] Firebase project creado
- [ ] App web registrada y `firebase-config.js` actualizado
- [ ] Authentication: Email/Password habilitado
- [ ] Authentication: Google habilitado
- [ ] Authentication: Facebook habilitado (opcional)
- [ ] Firestore Database creada
- [ ] Reglas de seguridad configuradas
- [ ] App ejecutando en localhost:8080

---

## 🐛 Solución de Errores Comunes

| Error | Solución |
|---|---|
| `auth/operation-not-allowed` | El proveedor no está habilitado en Firebase Console |
| `auth/popup-blocked` | Permite popups en tu navegador para localhost |
| `Missing or insufficient permissions` | Revisa las Firestore Rules |
| `Firebase: Error (auth/invalid-api-key)` | La `apiKey` en `firebase-config.js` es incorrecta |
| `Failed to fetch` | Revisa tu conexión y que el `projectId` sea correcto |

---

## 📁 Estructura de Datos en Firestore

```
Firestore
└── users/
    └── {uid}/
        ├── (documento de perfil: name, email, provider)
        ├── accounts/
        │   └── {accountId}/  ← type, name, description, balance
        ├── categories/
        │   └── {categoryId}/ ← name, icon, description, subcategories[]
        └── transactions/
            └── {txId}/       ← date, amount, type, categoryId, accountId, notes
```
