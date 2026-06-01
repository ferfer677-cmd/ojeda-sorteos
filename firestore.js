import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

export async function guardarParticipante(datos) {

  try {

    await addDoc(
      collection(db, "participantes"),
      {
        nombre: datos.nombre,
        apellido: datos.apellido,
        dni: datos.dni,
        telefono: datos.telefono,
        instagram: datos.instagram,
        pack: datos.pack,
        comprobanteURL: datos.comprobanteURL,
        estado: "Esperando",
        fecha: serverTimestamp()
      }
    );

    return true;

  } catch (error) {

    console.error(error);

    return false;

  }

}