// ======================================================
// API DE CONVERSIONES DE META
// ======================================================
// Cuando una compra pasa a "Pagado" (el admin la aprueba, sola o con
// "Aprobar todos"), se le manda a Meta un evento Purchase con el monto
// real. Lleva el mismo ID de evento que el Píxel de la página
// (metaEventId), así Meta no cuenta la compra dos veces.
//
// Token: secreto de Firebase META_CAPI_TOKEN (nunca en el código).
//   firebase functions:secrets:set META_CAPI_TOKEN
//
// Para probar con "Probar eventos" del Administrador de eventos:
// crear en Firestore el documento privado/meta con el campo
// testEventCode = "TEST12345" (el código que da Meta). Borrarlo al terminar.

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

initializeApp();

const META_CAPI_TOKEN = defineSecret("META_CAPI_TOKEN");

// Píxel de ojedasorteos.com.ar (el mismo de index.html)
const PIXEL_ID = "1685745569217221";

const VERSION_API = "v21.0";

// Meta no acepta eventos de hace más de 7 días
const MAXIMO_ANTIGUEDAD_SEG = 7 * 24 * 60 * 60 - 3600;


// ======================================================
// AYUDAS
// ======================================================

// Los errores de Meta pueden repetir el token: nunca guardarlo ni mostrarlo
function sinToken(texto) {
  return String(texto || "").replace(/EAA[A-Za-z0-9]+/g, "[token oculto]");
}

function sha256(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex");
}

// Meta pide los datos personales normalizados y cifrados (SHA-256)
function cifrado(texto) {
  const limpio = String(texto || "").trim().toLowerCase();
  return limpio ? [sha256(limpio)] : undefined;
}

// Teléfono argentino como 549 + área + número (igual que la lista de clientes)
function telefonoParaMeta(telefono) {

  let d = String(telefono || "").replace(/[^0-9]/g, "");

  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54")) d = d.slice(2);

  d = d.replace(/^0+/, "");

  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.substr(largoArea, 2) === "15") {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }

  return d.length === 10 ? `549${d}` : "";

}

// Monto real: el que quedó escrito en el pack ("... • $19.000"), si no precioFinal
function montoDeCompra(datos) {

  const enPack =
    String(datos.pack || "").match(/\$\s*([0-9.]+)/);

  const monto =
    enPack ? Number(enPack[1].replace(/\./g, "")) : 0;

  return monto || Number(datos.precioFinal) || 0;

}

function chancesDeCompra(datos) {
  const enPack = String(datos.pack || "").match(/([0-9]+)\s*CHANCE/i);
  return Number(datos.chancesBase) || (enPack ? Number(enPack[1]) : 0);
}


// ======================================================
// EVENTO "PURCHASE" AL APROBAR UN PAGO
// ======================================================

exports.compraAprobadaAMeta = onDocumentUpdated(
  {
    document: "participantes/{id}",
    region: "southamerica-east1",
    secrets: [META_CAPI_TOKEN],
    retry: false
  },
  async (evento) => {

    const antes = evento.data?.before.data();
    const despues = evento.data?.after.data();

    // Solo cuando pasa a "Pagado", y una sola vez
    if (
      !antes ||
      !despues ||
      antes.estado === "Pagado" ||
      despues.estado !== "Pagado" ||
      despues.metaCapi?.enviado
    ) {
      return;
    }

    const id = evento.params.id;
    const referencia = evento.data.after.ref;

    const ahora = Math.floor(Date.now() / 1000);

    // Hora de la compra (cuando envió el comprobante); si es muy vieja, ahora
    const fechaCompra =
      despues.fecha?.toDate ? Math.floor(despues.fecha.toDate().getTime() / 1000) : ahora;

    const horaEvento =
      ahora - fechaCompra > MAXIMO_ANTIGUEDAD_SEG ? ahora : fechaCompra;

    const telefono = telefonoParaMeta(despues.telefono);
    const dni = String(despues.dniNormalizado || despues.dni || "").replace(/[^0-9]/g, "");

    const datosUsuario = {
      ph: telefono ? [sha256(telefono)] : undefined,
      fn: cifrado(despues.nombre),
      ln: cifrado(despues.apellido),
      country: [sha256("ar")],
      external_id: dni ? [sha256(dni)] : undefined,
      fbc: despues.fbc || undefined,
      fbp: despues.fbp || undefined,
      client_user_agent: despues.userAgent || undefined
    };

    const cuerpo = {
      data: [
        {
          event_name: "Purchase",
          event_time: horaEvento,
          event_id: despues.metaEventId || id,
          action_source: "website",
          event_source_url: despues.paginaUrl || "https://ojedasorteos.com.ar/",
          user_data: datosUsuario,
          custom_data: {
            currency: "ARS",
            value: montoDeCompra(despues),
            num_items: chancesDeCompra(despues),
            content_name: `${chancesDeCompra(despues)} chances`,
            content_category: despues.codigoPromo || "sin clave"
          }
        }
      ]
    };

    // Código de prueba opcional (privado/meta.testEventCode)
    try {
      const config =
        await getFirestore().doc("privado/meta").get();
      const codigo = config.exists ? config.get("testEventCode") : "";
      if (codigo) {
        cuerpo.test_event_code = String(codigo);
      }
    } catch (error) {
      logger.warn("No se pudo leer privado/meta", error);
    }

    try {

      const respuesta = await fetch(
        `https://graph.facebook.com/${VERSION_API}/${PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_TOKEN.value())}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cuerpo)
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(sinToken(resultado?.error?.message) || `HTTP ${respuesta.status}`);
      }

      await referencia.update({
        metaCapi: {
          enviado: FieldValue.serverTimestamp(),
          recibidos: resultado.events_received || 0,
          prueba: Boolean(cuerpo.test_event_code)
        }
      });

      logger.info("Compra enviada a Meta", { id, recibidos: resultado.events_received });

    } catch (error) {

      // El pago queda aprobado igual; solo se anota el error para verlo en el admin
      const mensaje = sinToken(error.message).slice(0, 300);

      logger.error("No se pudo enviar la compra a Meta", { id, error: mensaje });

      await referencia.update({
        metaCapi: { error: mensaje }
      });

    }

  }
);
