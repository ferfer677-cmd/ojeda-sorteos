import { db } from "./firebase.js";

import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// =====================================================
// ERRORES AL ENVIAR UNA COMPRA
// =====================================================
// Se guardan para verlos en el admin. Sin datos personales:
// solo qué falló, qué archivo era y desde dónde.

const corto = (valor, maximo) =>
  String(valor ?? "").slice(0, maximo);

function appDelNavegador() {

  const navegador = navigator.userAgent;

  if (/Instagram/i.test(navegador)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB/.test(navegador)) return "Facebook";
  if (/TikTok|musical_ly/i.test(navegador)) return "TikTok";
  if (/WhatsApp/i.test(navegador)) return "WhatsApp";

  return "Navegador";

}

function sistema() {

  const navegador = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(navegador)) return "iPhone";
  if (/Android/.test(navegador)) return "Android";

  return "Computadora";

}

// Nunca interrumpe la compra: si no se puede guardar, se ignora
export function registrarErrorCompra({ etapa, error, archivo }) {

  addDoc(
    collection(db, "errores_compra"),
    {
      etapa: corto(etapa, 30),
      codigo: corto(error?.code || error?.message || "sin_codigo", 80),
      detalle: corto(error?.serverResponse || error?.message, 300),
      archivoTipo: corto(archivo?.type, 80),
      archivoKB: archivo ? Math.round(archivo.size / 1024) : 0,
      app: appDelNavegador(),
      sistema: sistema(),
      fecha: serverTimestamp()
    }
  ).catch((fallo) => {
    console.warn("No se pudo registrar el error:", fallo);
  });

}
