
import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// =====================================================
// NORMALIZAR DNI
// =====================================================

function normalizarDNI(dni) {
  return String(dni || "")
    .replace(/\D/g, "")
    .trim();
}

// =====================================================
// GUARDAR PARTICIPANTE
// =====================================================

export async function guardarParticipante(datos) {
  try {
    const dniNormalizado = normalizarDNI(datos.dni);

    await addDoc(
      collection(db, "participantes"),
      {
        nombre: datos.nombre || "",
        apellido: datos.apellido || "",

        // DNI original y normalizado
        dni: datos.dni || "",
        dniNormalizado: dniNormalizado,

        telefono: datos.telefono || "",
        instagram: datos.instagram || "",

        // Pack y chances
        pack: datos.pack || "",
        chancesBase: Number(datos.chancesBase) || 0,
        chancesFinales: Number(datos.chancesFinales) || 0,

        // Promoción y precio
        codigoPromo: datos.codigoPromo || "",
        precioFinal: Number(datos.precioFinal) || 0,
        multiplicadorPromo:
          Number(datos.multiplicadorPromo) || 1,

        // Comprobante
        comprobanteURL: datos.comprobanteURL || "",
        comprobantePath: datos.comprobantePath || "",

        // Referido
        referido: datos.referido || "",

        // Estado
        estado: "Esperando",

        // Fecha
        fecha: serverTimestamp()
      }
    );

    return true;

  } catch (error) {
    console.error(
      "Error guardando participante:",
      error
    );

    return false;
  }
}
