import { auth } from "./firebase.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

// =====================================================
// ADMIN
// =====================================================
// Esta cuenta de Google es la única que puede entrar al admin.
// Si la cambiás, cambiala también en firestore.rules y storage.rules.

export const EMAIL_ADMIN = "ferfer677@gmail.com";


export function esAdmin(usuario) {

  return Boolean(
    usuario &&
    usuario.email === EMAIL_ADMIN &&
    usuario.emailVerified
  );

}


export async function entrarConGoogle() {

  const proveedor =
    new GoogleAuthProvider();

  proveedor.setCustomParameters({
    prompt: "select_account"
  });

  const resultado =
    await signInWithPopup(
      auth,
      proveedor
    );

  if (!esAdmin(resultado.user)) {

    await signOut(auth);

    throw new Error(
      `La cuenta ${resultado.user.email} no tiene permiso de administrador.`
    );

  }

  return resultado.user;

}


export function salir() {

  return signOut(auth);

}


// Llama a callback(true) cuando entra el admin y callback(false) cuando no hay sesión.

export function alCambiarSesion(callback) {

  onAuthStateChanged(
    auth,
    (usuario) => {

      if (usuario && !esAdmin(usuario)) {

        signOut(auth);

        callback(false);

        return;

      }

      callback(esAdmin(usuario));

    }
  );

}
