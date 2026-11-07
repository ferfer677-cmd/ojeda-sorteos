// ======================================================
// API DE CONVERSIONES DE META
// ======================================================
// Cuando una compra pasa a "Pagado" (el admin la aprueba, sola o con
// "Aprobar todos"), se le manda a Meta un evento Purchase con el monto
// real. Es la única "Purchase": la página, al enviar el comprobante,
// solo manda "AddPaymentInfo". Así Meta cuenta las compras aprobadas.
//
// Token: secreto de Firebase META_CAPI_TOKEN (nunca en el código).
//   firebase functions:secrets:set META_CAPI_TOKEN
//
// Para probar con "Probar eventos" del Administrador de eventos:
// crear en Firestore el documento privado/meta con el campo
// testEventCode = "TEST12345" (el código que da Meta). Borrarlo al terminar.

const { onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getStorage, getDownloadURL } = require("firebase-admin/storage");
const crypto = require("node:crypto");

// Cierre de compras: viernes 13/11/2026 19:00 (igual que firestore.rules)
const CIERRE_COMPRAS = 1794607200000;

initializeApp();

const META_CAPI_TOKEN = defineSecret("META_CAPI_TOKEN");
const CLAVE_BUSCADOR = defineSecret("CLAVE_BUSCADOR");

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
// IP DEL COMPRADOR
// ======================================================
// La página la pide por /api/mi-ip (rewrite de firebase.json), así sale
// por la misma conexión con la que navega. No guarda nada: solo la devuelve.

exports.miIp = onRequest(
  {
    region: "southamerica-east1",
    invoker: "public",
    maxInstances: 10
  },
  (pedido, respuesta) => {

    const ip =
      pedido.get("fastly-client-ip") ||
      String(pedido.get("x-forwarded-for") || "").split(",")[0].trim();

    respuesta.set("Cache-Control", "private, no-store");
    respuesta.json({ ip });

  }
);


// ======================================================
// RULETA DE PREMIOS
// ======================================================
// Cada compra aprobada da un giro. El premio se elige acá, no en el
// navegador. Las probabilidades también figuran en terminos.html:
// si se cambian, cambiarlas en los dos lugares.

const PREMIOS_RULETA = [
  { id: "gratis", peso: 5, nombre: "1 chance gratis", chances: 1, precio: 0, codigo: "RULETAGRATIS" },
  { id: "tresxuno", peso: 15, nombre: "3x1 en tu próxima compra", chances: 0, precio: 0, codigo: "RULETA3X1" },
  { id: "p35", peso: 27, nombre: "35 chances a $12.999", chances: 35, precio: 12999, codigo: "RULETA35" },
  { id: "p200", peso: 27, nombre: "200 chances a $29.999", chances: 200, precio: 29999, codigo: "RULETA200" },
  { id: "p500", peso: 26, nombre: "400 chances a $39.999", chances: 400, precio: 39999, codigo: "RULETA500" }
];

function elegirPremio() {
  let numero = crypto.randomInt(100);
  return PREMIOS_RULETA.find((p) => (numero -= p.peso) < 0);
}

function premioPublico({ id, nombre, chances, precio, codigo }) {
  return { id, nombre, chances, precio, codigo };
}

// Giros ganados: compras aprobadas, sin contar las chances gratis de la ruleta
function girosGanados(consulta) {
  const compras = consulta.exists ? consulta.get("compras") : null;
  return Array.isArray(compras)
    ? compras.filter((c) => !String(c.pack || "").includes("CHANCE GRATIS")).length
    : 0;
}

async function comprasDelDni(db, dni) {
  const compras =
    await db.collection("participantes").where("dniNormalizado", "==", dni).get();
  return compras.docs.map((d) => d.data());
}

// Premios ganados que todavía no se compraron
function premiosPendientes(giros, compras) {

  const usados = {};

  compras.forEach((c) => {
    usados[c.codigoPromo] = (usados[c.codigoPromo] || 0) + 1;
  });

  return giros
    .map((giro) => PREMIOS_RULETA.find((p) => p.id === giro.premio))
    .filter((premio) => {
      if (!premio || premio.id === "gratis") return false;
      if (usados[premio.codigo] > 0) {
        usados[premio.codigo]--;
        return false;
      }
      return true;
    })
    .map(premioPublico);

}

exports.ruleta = onRequest(
  {
    region: "southamerica-east1",
    invoker: "public",
    maxInstances: 10
  },
  async (pedido, respuesta) => {

    respuesta.set("Cache-Control", "private, no-store");

    if (pedido.method !== "POST") {
      respuesta.status(405).json({ error: "METODO" });
      return;
    }

    const dni = String(pedido.body?.dni || "").replace(/[^0-9]/g, "").slice(0, 20);
    const accion = pedido.body?.accion;

    if (!dni || !["estado", "girar"].includes(accion)) {
      respuesta.status(400).json({ error: "DATOS" });
      return;
    }

    if (Date.now() >= CIERRE_COMPRAS) {
      respuesta.json({ disponibles: 0, pendientes: [] });
      return;
    }

    const db = getFirestore();
    const refConsulta = db.collection("consultas").doc(dni);
    const refRuleta = db.collection("ruleta").doc(dni);

    try {

      const compras = await comprasDelDni(db, dni);

      if (accion === "estado") {

        const [consulta, ruleta] =
          await Promise.all([refConsulta.get(), refRuleta.get()]);

        const giros = ruleta.exists ? ruleta.get("giros") || [] : [];

        respuesta.json({
          disponibles: Math.max(girosGanados(consulta) - giros.length, 0),
          pendientes: premiosPendientes(giros, compras)
        });

        return;

      }

      // Girar: en una transacción, para que un doble clic no dé dos giros
      const ultimaCompra =
        compras.find((c) => c.codigoPromo !== "RULETAGRATIS") || compras[0];

      const premio = await db.runTransaction(async (tx) => {

        const consulta = await tx.get(refConsulta);
        const ruleta = await tx.get(refRuleta);

        const giros = ruleta.exists ? ruleta.get("giros") || [] : [];

        if (girosGanados(consulta) <= giros.length) {
          return null;
        }

        const elegido = elegirPremio();

        tx.set(refRuleta, {
          giros: [...giros, { premio: elegido.id, fecha: new Date() }]
        });

        // La chance gratis queda pendiente de aprobar en el admin,
        // que es el que asigna el número
        if (elegido.id === "gratis" && ultimaCompra) {
          tx.create(db.collection("participantes").doc(), {
            nombre: ultimaCompra.nombre || "",
            apellido: ultimaCompra.apellido || "",
            dni: ultimaCompra.dni || dni,
            dniNormalizado: dni,
            telefono: ultimaCompra.telefono || "",
            instagram: ultimaCompra.instagram || "",
            pack: "RULETA • CHANCE GRATIS • 1 CHANCE • $0",
            chancesBase: 1,
            chancesFinales: 1,
            codigoPromo: "RULETAGRATIS",
            precioFinal: 0,
            multiplicadorPromo: 1,
            comprobanteURL: "",
            comprobantePath: "",
            referido: "",
            estado: "Esperando",
            fecha: FieldValue.serverTimestamp()
          });
        }

        return elegido;

      });

      if (!premio) {
        respuesta.status(409).json({ error: "SIN_GIROS" });
        return;
      }

      respuesta.json({ premio: premioPublico(premio) });

    } catch (error) {

      logger.error("Error en la ruleta", { error: sinToken(error.message) });
      respuesta.status(500).json({ error: "RULETA" });

    }

  }
);


// ======================================================
// BUSCADOR DE COMPROBANTES (AYUDANTES)
// ======================================================
// Sub admin: entra con una contraseña en buscador.html. Puede buscar
// por DNI o nombre, cargar a mano la compra de quien no pudo y aprobar
// solo las que cargó él. Todo se hace acá, así nunca descarga la lista
// entera ni ve totales.
//
// Contraseña: secreto de Firebase CLAVE_BUSCADOR (nunca en el código).
// Para ponerla o cambiarla (y sacarle el acceso a quien la tenía):
//   firebase functions:secrets:set CLAVE_BUSCADOR
//   firebase deploy --only functions:buscarComprobantes

// Después de 8 contraseñas mal desde una misma conexión, 15 minutos sin poder probar
const INTENTOS_MAXIMOS = 8;
const BLOQUEO_MS = 15 * 60 * 1000;
const intentosFallidos = new Map();

function claveCorrecta(clave) {
  const esperada = crypto.createHash("sha256").update(CLAVE_BUSCADOR.value().trim()).digest();
  const recibida = crypto.createHash("sha256").update(String(clave || "")).digest();
  return crypto.timingSafeEqual(esperada, recibida);
}

const MAXIMO_RESULTADOS = 30;

const sinAcentos = (texto) =>
  String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const pesos = (monto) => `$${Number(monto).toLocaleString("es-AR")}`;

// La lista para buscar por nombre se guarda 2 minutos por instancia
let listaNombres = { hasta: 0, docs: [] };


// ------------------------------------------------------
// PACKS PARA CARGAR A MANO
// ------------------------------------------------------
// Los mismos de la página. Si cambian los packs o los precios de
// script.js (preciosNormales / preciosConDescuento) o de ruleta.js
// (PACKS_3X1), cambiarlos también acá. Los de la ruleta salen solos
// de PREMIOS_RULETA.

const PACKS_COMUNES = [
  { chances: 1, nombre: "UNA PARA PROBAR", precio: 5000, mitad: 2500 },
  { chances: 3, nombre: "PROMO INICIAL", precio: 10000, mitad: 5000 },
  { chances: 10, nombre: "POPULAR", precio: 18000, mitad: 9000 },
  { chances: 30, nombre: "🚀 PACK PRO", precio: 38000, mitad: 19000 },
  { chances: 50, nombre: "🔥 PACK GRANDE", precio: 50000, mitad: 25000 },
  { chances: 100, nombre: "👑 PACK MÁXIMO", precio: 75000, mitad: 37500 }
];

// Códigos con reloj (script.js, PROMOS_CON_RELOJ): mismos 3 packs
const PROMOS_CON_RELOJ = [
  { codigo: "3XHOY", vence: Date.parse("2026-11-04T23:10:00-03:00") },
  { codigo: "REVIERNES", vence: Date.parse("2026-11-06T22:07:00-03:00") }
];

const PACKS_3XHOY = [
  { chances: 1, precio: 1500 },
  { chances: 20, precio: 9999 },
  { chances: 100, precio: 19999 }
];

const PACKS_3X1 = [
  { paga: 1, recibe: 3, precio: 5000 },
  { paga: 3, recibe: 9, precio: 10000 },
  { paga: 10, recibe: 30, precio: 18000 }
];

// Cada pack: id, grupo, texto para elegir y lo que se guarda en la compra.
// El texto de "pack" lleva "N CHANCES" y "$precio" (el admin los lee de ahí).
function catalogoDePacks() {

  const packs = [];

  PACKS_COMUNES.forEach(({ chances, nombre, precio }) => {
    packs.push({
      id: `comun${chances}`,
      grupo: "Comunes",
      chances,
      precio,
      codigoPromo: "",
      pack: `${nombre} • ${chances} CHANCE${chances === 1 ? "" : "S"} • ${pesos(precio)}`
    });
  });

  PACKS_COMUNES.forEach(({ chances, nombre, mitad }) => {
    packs.push({
      id: `mitad${chances}`,
      grupo: "Promo 50% OFF",
      chances,
      precio: mitad,
      codigoPromo: "MANUAL50",
      pack: `50% OFF • ${nombre} • ${chances} CHANCE${chances === 1 ? "" : "S"} • ${pesos(mitad)}`
    });
  });

  PROMOS_CON_RELOJ
    .filter(({ vence }) => Date.now() < vence)
    .forEach(({ codigo }) => {
      PACKS_3XHOY.forEach(({ chances, precio }) => {
        packs.push({
          id: `${codigo.toLowerCase()}${chances}`,
          grupo: `Promo ${codigo}`,
          chances,
          precio,
          codigoPromo: codigo,
          pack: `PROMO ${codigo} • ${chances} CHANCE${chances === 1 ? "" : "S"} • ${pesos(precio)}`
        });
      });
    });

  PREMIOS_RULETA
    .filter((premio) => premio.chances > 0 && premio.precio > 0)
    .forEach(({ id, chances, precio, codigo }) => {
      packs.push({
        id: `ruleta_${id}`,
        grupo: "Ruleta",
        chances,
        precio,
        codigoPromo: codigo,
        pack: `RULETA • ${chances} CHANCES • ${pesos(precio)}`
      });
    });

  PACKS_3X1.forEach(({ paga, recibe, precio }) => {
    packs.push({
      id: `ruleta_3x1_${paga}`,
      grupo: "Ruleta",
      chances: recibe,
      precio,
      codigoPromo: "RULETA3X1",
      pack: `RULETA • ${recibe} CHANCES • ${pesos(precio)}`
    });
  });

  return packs.map((pack) => ({
    ...pack,
    texto: `${pack.chances} chance${pack.chances === 1 ? "" : "s"} · ${pesos(pack.precio)}` +
      (pack.id.startsWith("ruleta_3x1") ? " (3x1)" : "")
  }));

}


// ------------------------------------------------------
// BUSCAR
// ------------------------------------------------------

async function compraParaAyudante(documento) {

  const datos = documento.data();

  let comprobante = datos.comprobanteURL || "";

  if (!comprobante && datos.comprobantePath) {
    try {
      comprobante = await getDownloadURL(getStorage().bucket().file(datos.comprobantePath));
    } catch {
      comprobante = "";
    }
  }

  return {
    id: documento.id,
    nombre: `${datos.nombre || ""} ${datos.apellido || ""}`.trim(),
    dni: String(datos.dni || ""),
    pack: String(datos.pack || ""),
    estado: datos.estado || "",
    fecha: datos.fecha?.toMillis?.() || 0,
    comprobante,
    // Solo las que cargó el sub admin las puede aprobar él
    cargadaAMano: datos.cargadoPor === "subadmin",
    cantidadNumeros: Array.isArray(datos.numeros) ? datos.numeros.length : 0
  };

}

async function buscar(db, textoPedido) {

  const texto = String(textoPedido || "").trim().slice(0, 60);
  const dni = texto.replace(/[^0-9]/g, "");
  const esDni = /^[0-9.\s-]+$/.test(texto);

  if (esDni ? dni.length < 6 : sinAcentos(texto).replace(/\s/g, "").length < 3) {
    return { error: "CORTO" };
  }

  let encontrados;

  if (esDni) {

    const resultado =
      await db.collection("participantes").where("dniNormalizado", "==", dni).get();

    encontrados = resultado.docs;

  } else {

    if (Date.now() > listaNombres.hasta) {
      const resultado = await db.collection("participantes").get();
      listaNombres = { hasta: Date.now() + 2 * 60 * 1000, docs: resultado.docs };
    }

    const palabras = sinAcentos(texto).split(/\s+/).filter(Boolean);

    encontrados = listaNombres.docs.filter((documento) => {
      const datos = documento.data();
      const nombre = sinAcentos(`${datos.nombre || ""} ${datos.apellido || ""}`);
      return palabras.every((palabra) => nombre.includes(palabra));
    });

  }

  // La chance gratis de la ruleta no tiene comprobante
  encontrados =
    encontrados.filter((documento) => documento.get("codigoPromo") !== "RULETAGRATIS");

  const compras = await Promise.all(
    encontrados
      .sort((a, b) => (b.get("fecha")?.toMillis?.() || 0) - (a.get("fecha")?.toMillis?.() || 0))
      .slice(0, MAXIMO_RESULTADOS)
      .map(compraParaAyudante)
  );

  logger.info("Búsqueda en el buscador", { cantidad: compras.length });

  return { compras, hayMas: encontrados.length > MAXIMO_RESULTADOS };

}


// ------------------------------------------------------
// CARGAR UNA COMPRA A MANO
// ------------------------------------------------------
// El comprobante ya lo subió la página a comprobantes/ (como una
// compra común). Acá se arma la compra con el pack del catálogo:
// el precio nunca lo decide el navegador.

const textoLimpio = (valor, maximo) => String(valor || "").trim().slice(0, maximo);

async function cargarCompra(db, cuerpo) {

  if (Date.now() >= CIERRE_COMPRAS) {
    return { error: "CERRADO" };
  }

  const pack = catalogoDePacks().find((p) => p.id === cuerpo.packId);

  const nombre = textoLimpio(cuerpo.nombre, 80);
  const apellido = textoLimpio(cuerpo.apellido, 80);
  const dni = textoLimpio(cuerpo.dni, 20);
  const dniNormalizado = dni.replace(/\D/g, "");
  const telefono = textoLimpio(cuerpo.telefono, 40);
  const instagram = textoLimpio(cuerpo.instagram, 80);
  const comprobantePath = textoLimpio(cuerpo.comprobantePath, 300);

  if (
    !pack || !nombre || !apellido || !telefono ||
    dniNormalizado.length < 6 || dniNormalizado.length > 9 ||
    !/^comprobantes\/[\w.\-]+$/.test(comprobantePath)
  ) {
    return { error: "DATOS" };
  }

  const archivo = getStorage().bucket().file(comprobantePath);

  const [existe] = await archivo.exists();

  if (!existe) {
    return { error: "SIN_COMPROBANTE" };
  }

  const comprobanteURL = await getDownloadURL(archivo);

  // Día al que corresponde la compra (lo elige el sub admin con ◀ ▶).
  // Hoy: la hora de ahora. Otro día: ese día a las 12:00 de Argentina.
  const hoy =
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

  const dia = /^\d{4}-\d{2}-\d{2}$/.test(cuerpo.dia || "") ? cuerpo.dia : hoy;

  const mediodia = Date.parse(`${dia}T12:00:00-03:00`);

  if (!Number.isFinite(mediodia) || dia > hoy || Date.now() - mediodia > 32 * 24 * 60 * 60 * 1000) {
    return { error: "DATOS" };
  }

  const fecha = dia === hoy ? FieldValue.serverTimestamp() : Timestamp.fromMillis(mediodia);

  const nueva = await db.collection("participantes").add({
    nombre,
    apellido,
    dni,
    dniNormalizado,
    telefono,
    instagram,
    pack: pack.pack,
    chancesBase: pack.chances,
    chancesFinales: pack.chances,
    codigoPromo: pack.codigoPromo,
    precioFinal: pack.precio,
    multiplicadorPromo: 1,
    comprobanteURL,
    comprobantePath,
    referido: "",
    estado: "Esperando",
    cargadoPor: "subadmin",
    diaCompra: dia,
    fecha
  });

  listaNombres.hasta = 0;

  logger.info("Compra cargada por el sub admin", { id: nueva.id, pack: pack.id });

  return { ok: true, id: nueva.id };

}


// ------------------------------------------------------
// APROBAR (solo las cargadas por el sub admin)
// ------------------------------------------------------
// Hace lo mismo que "APROBAR PAGO" del admin: números únicos de 6
// cifras, ranking, top 5 público y "Ver mis números".

// "Kevin Porchile" -> "Kevin P." (igual que firestore.js)
function nombreAbreviado(nombre, apellido) {
  const primerNombre = String(nombre || "").trim().split(/\s+/)[0] || "";
  const partesApellido = String(apellido || "").trim().split(/\s+/).filter(Boolean);
  const inicial = partesApellido.length
    ? partesApellido[partesApellido.length - 1].charAt(0).toUpperCase() + "."
    : "";
  const resultado =
    `${primerNombre.charAt(0).toUpperCase()}${primerNombre.slice(1).toLowerCase()} ${inicial}`.trim();
  return resultado || "Participante";
}

async function actualizarRankingPublico(db) {

  const mejores =
    await db.collection("ranking").orderBy("chances", "desc").limit(5).get();

  const top = mejores.docs.map((documento) => {
    const partes = String(documento.get("nombre") || "").trim().split(/\s+/).filter(Boolean);
    return {
      nombre: nombreAbreviado(partes[0] || "", partes.slice(1).join(" ")),
      chances: Number(documento.get("chances")) || 0
    };
  });

  await db.collection("publico").doc("ranking").set({
    top,
    actualizado: FieldValue.serverTimestamp()
  });

}

// En una transacción: si se aprueban 2 compras del mismo DNI casi
// juntas, la segunda no pisa a la primera con datos viejos.
async function actualizarConsulta(db, dni) {

  if (!dni) return;

  const consulta = db.collection("consultas").doc(dni);

  await db.runTransaction(async (tx) => {

    const compras =
      await tx.get(db.collection("participantes").where("dniNormalizado", "==", dni));

    const aprobadas = compras.docs
      .map((documento) => documento.data())
      .filter((datos) => datos.estado === "Pagado" && Array.isArray(datos.numeros) && datos.numeros.length);

    if (!aprobadas.length) {
      tx.delete(consulta);
      return;
    }

    tx.set(consulta, {
      nombre: nombreAbreviado(aprobadas[0].nombre, aprobadas[0].apellido),
      compras: aprobadas.map((datos) => ({
        pack: datos.pack || "",
        chances: Number(datos.chancesFinales) || datos.numeros.length,
        numeros: datos.numeros
      })),
      actualizado: FieldValue.serverTimestamp()
    });

  });

}

async function aprobarCompra(db, id) {

  const referencia = db.collection("participantes").doc(String(id || "").slice(0, 60) || "-");

  const todas = await db.collection("participantes").get();

  const compra = todas.docs.find((documento) => documento.id === referencia.id);
  const datos = compra?.data();

  if (!datos || datos.cargadoPor !== "subadmin") {
    return { error: "NO_PERMITIDA" };
  }

  if (datos.estado === "Pagado") {
    return { error: "YA_APROBADA" };
  }

  const cantidad = Number(datos.chancesFinales) || 0;

  if (cantidad < 1 || cantidad > 1000) {
    return { error: "DATOS" };
  }

  const usados = new Set();

  todas.docs.forEach((documento) => {
    const numeros = documento.get("numeros");
    if (Array.isArray(numeros)) numeros.forEach((numero) => usados.add(String(numero)));
  });

  const numeros = [];

  while (numeros.length < cantidad) {
    const numero = String(crypto.randomInt(1000000)).padStart(6, "0");
    if (!usados.has(numero)) {
      usados.add(numero);
      numeros.push(numero);
    }
  }

  // En una transacción: si el admin la aprobó o borró recién, no se pisa
  const aprobada = await db.runTransaction(async (tx) => {
    const actual = await tx.get(referencia);
    if (!actual.exists || actual.get("estado") === "Pagado") return false;
    tx.update(referencia, {
      estado: "Pagado",
      chancesFinales: cantidad,
      precioFinal: Number(datos.precioFinal) || 0,
      numeros
    });
    return true;
  });

  if (!aprobada) {
    return { error: "YA_APROBADA" };
  }

  const dni = datos.dniNormalizado || String(datos.dni || "").replace(/\D/g, "");

  await db.collection("ranking").doc(dni).set({
    dniNormalizado: dni,
    nombre: `${datos.nombre || ""} ${datos.apellido || ""}`.replace(/\s+/g, " ").trim(),
    chances: FieldValue.increment(cantidad)
  }, { merge: true });

  // "Ver mis números" lo actualiza verMisNumerosAlDia (al cambiar la compra)
  await actualizarRankingPublico(db);

  listaNombres.hasta = 0;

  logger.info("Compra aprobada por el sub admin", { id: referencia.id, cantidad });

  return { ok: true, cantidad };

}


exports.buscarComprobantes = onRequest(
  {
    region: "southamerica-east1",
    invoker: "public",
    maxInstances: 3,
    secrets: [CLAVE_BUSCADOR]
  },
  async (pedido, respuesta) => {

    respuesta.set("Cache-Control", "private, no-store");

    if (pedido.method !== "POST") {
      respuesta.status(405).json({ error: "METODO" });
      return;
    }

    // Contraseña, con límite de intentos por conexión
    const ip =
      String(pedido.get("x-forwarded-for") || "").split(",")[0].trim() || pedido.ip || "";

    const fallos = intentosFallidos.get(ip);

    if (fallos && fallos.cantidad >= INTENTOS_MAXIMOS && Date.now() < fallos.hasta) {
      respuesta.status(429).json({ error: "BLOQUEADO" });
      return;
    }

    if (!claveCorrecta(pedido.body?.clave)) {
      const cantidad = fallos && Date.now() < fallos.hasta ? fallos.cantidad + 1 : 1;
      intentosFallidos.set(ip, { cantidad, hasta: Date.now() + BLOQUEO_MS });
      logger.warn("Contraseña incorrecta en el buscador", { cantidad });
      respuesta.status(403).json({ error: "CLAVE" });
      return;
    }

    intentosFallidos.delete(ip);

    // Solo para entrar: confirma la contraseña sin buscar nada
    if (pedido.body?.entrar === true) {
      respuesta.json({ ok: true });
      return;
    }

    const db = getFirestore();
    const accion = pedido.body?.accion || "buscar";

    try {

      let resultado;

      if (accion === "packs") {
        resultado = {
          packs: catalogoDePacks().map(({ id, grupo, texto }) => ({ id, grupo, texto })),
          abierto: Date.now() < CIERRE_COMPRAS
        };
      } else if (accion === "cargar") {
        resultado = await cargarCompra(db, pedido.body || {});
      } else if (accion === "aprobar") {
        resultado = await aprobarCompra(db, pedido.body?.id);
      } else if (accion === "error") {
        // Falla al cargar desde el celular del sub admin (sin datos del cliente)
        const cuerpo = pedido.body || {};
        logger.warn("Error al cargar desde el sub admin", {
          etapa: textoLimpio(cuerpo.etapa, 20),
          codigo: textoLimpio(cuerpo.codigo, 80),
          archivoTipo: textoLimpio(cuerpo.archivoTipo, 60),
          archivoKB: Number(cuerpo.archivoKB) || 0,
          navegador: textoLimpio(cuerpo.navegador, 200)
        });
        resultado = { ok: true };
      } else {
        resultado = await buscar(db, pedido.body?.texto);
      }

      respuesta.status(resultado.error ? 400 : 200).json(resultado);

    } catch (error) {

      logger.error("Error en el buscador", { accion, error: error.message });
      respuesta.status(500).json({ error: "BUSCADOR" });

    }

  }
);

// ======================================================
// EVENTO "PURCHASE" AL APROBAR UN PAGO
// ======================================================

// ======================================================
// "VER MIS NÚMEROS" SIEMPRE AL DÍA
// ======================================================
// Cada vez que una compra se aprueba, se edita o se borra (desde el
// admin, el sub admin o donde sea), el servidor rearma consultas/{dni}.
// Antes lo hacía el navegador del admin y a veces quedaba viejo
// (2 compras del mismo DNI aprobadas casi juntas, o un corte a mitad).

const CAMPOS_DE_CONSULTA = ["estado", "numeros", "chancesFinales", "pack", "nombre", "apellido", "dniNormalizado"];

exports.verMisNumerosAlDia = onDocumentWritten(
  {
    document: "participantes/{id}",
    region: "southamerica-east1",
    retry: true
  },
  async (evento) => {

    const antes = evento.data?.before.data() || null;
    const despues = evento.data?.after.data() || null;

    // Compra nueva sin aprobar: el público todavía no ve nada
    if (!antes && despues?.estado !== "Pagado") return;

    const cambio = CAMPOS_DE_CONSULTA.some(
      (campo) => JSON.stringify(antes?.[campo] ?? null) !== JSON.stringify(despues?.[campo] ?? null)
    );

    if (!cambio) return;

    const dniDe = (datos) =>
      datos ? String(datos.dniNormalizado || datos.dni || "").replace(/\D/g, "") : "";

    const dnis = new Set([dniDe(antes), dniDe(despues)].filter(Boolean));

    const db = getFirestore();

    for (const dni of dnis) {
      await actualizarConsulta(db, dni);
    }

  }
);


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

    // La chance gratis de la ruleta no es una venta
    if (despues?.codigoPromo === "RULETAGRATIS") {
      return;
    }

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
      client_user_agent: despues.userAgent || undefined,
      client_ip_address: despues.clientIp || undefined
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
