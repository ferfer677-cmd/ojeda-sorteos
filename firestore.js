
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
// TEXTO CON LARGO MÁXIMO
// =====================================================
// Las reglas de Firestore rechazan textos más largos.

function corto(valor, maximo) {
  return String(valor || "")
    .trim()
    .slice(0, maximo);
}

// =====================================================
// NOMBRE ABREVIADO ("Kevin Porchile" -> "Kevin P.")
// =====================================================

export function nombreAbreviado(nombre, apellido) {

  const primerNombre =
    String(nombre || "")
      .trim()
      .split(/\s+/)[0] || "";

  const partesApellido =
    String(apellido || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  const inicial =
    partesApellido.length
      ? partesApellido[partesApellido.length - 1]
          .charAt(0)
          .toUpperCase() + "."
      : "";

  const resultado =
    `${primerNombre.charAt(0).toUpperCase()}${primerNombre.slice(1).toLowerCase()} ${inicial}`
      .trim();

  return resultado || "Participante";

}

// =====================================================
// LÍMITE DE TIEMPO
// =====================================================
// Con mala conexión, Firestore espera indefinidamente.
// Después de este tiempo se avisa al comprador.

function conLimite(promesa, segundos) {
  return Promise.race([
    promesa,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("SIN_CONEXION")),
        segundos * 1000
      )
    )
  ]);
}

// =====================================================
// GUARDAR PARTICIPANTE
// =====================================================

export async function guardarParticipante(datos) {
  try {
    const dniNormalizado = corto(normalizarDNI(datos.dni), 20);

    await conLimite(addDoc(
      collection(db, "participantes"),
      {
        nombre: corto(datos.nombre, 80),
        apellido: corto(datos.apellido, 80),

        // DNI original y normalizado
        dni: corto(datos.dni, 20),
        dniNormalizado: dniNormalizado,

        telefono: corto(datos.telefono, 40),
        instagram: corto(datos.instagram, 80),

        // Pack y chances
        pack: corto(datos.pack, 80),
        chancesBase: Number(datos.chancesBase) || 0,
        chancesFinales: Number(datos.chancesFinales) || 0,

        // Promoción y precio
        codigoPromo: corto(datos.codigoPromo, 40),
        precioFinal: Number(datos.precioFinal) || 0,
        multiplicadorPromo:
          Number(datos.multiplicadorPromo) || 1,

        // Comprobante
        comprobanteURL: corto(datos.comprobanteURL, 1000),
        comprobantePath: corto(datos.comprobantePath, 300),

        // Referido
        referido: corto(datos.referido, 40),

        // Meta (API de Conversiones): se usan al aprobar el pago
        metaEventId: corto(datos.metaEventId, 60),
        fbc: corto(datos.fbc, 300),
        fbp: corto(datos.fbp, 120),
        userAgent: corto(datos.userAgent, 400),
        paginaUrl: corto(datos.paginaUrl, 200),

        // Estado
        estado: "Esperando",

        // Fecha
        fecha: serverTimestamp()
      }
    ), 40);

    // -------------------------------------------------
    // AVISO PÚBLICO DE "NUEVA COMPRA"
    // -------------------------------------------------
    // Solo nombre abreviado y pack: los datos completos
    // quedan en "participantes", que solo ve el admin.

    try {

      await addDoc(
        collection(db, "compras_recientes"),
        {
          nombre: corto(nombreAbreviado(datos.nombre, datos.apellido), 40),
          pack: corto(datos.pack, 80),
          fecha: serverTimestamp()
        }
      );

    } catch (error) {

      // Si falla el aviso, la compra igual quedó guardada
      console.warn(
        "No se pudo publicar el aviso de compra:",
        error
      );

    }

    return true;

  } catch (error) {
    console.error(
      "Error guardando participante:",
      error
    );

    return false;
  }
}
