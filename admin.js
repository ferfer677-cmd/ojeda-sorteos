import { db, storage } from "./firebase.js";

import {
  entrarConGoogle,
  salir,
  alCambiarSesion
} from "./auth.js";

import { nombreAbreviado } from "./firestore.js";

import { mostrarIngresosDiarios, actualizarComisiones } from "./admin-diario.js?v=3";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  increment,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
  ref,
  getDownloadURL,
  deleteObject,
  getMetadata
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";


// =====================================================
// SESIÓN
// =====================================================
// El login es con Google (ver auth.js). Las reglas de Firebase
// solo dejan leer y modificar participantes a la cuenta admin.

let adminActivo = false;


// =====================================================
// ELEMENTOS
// =====================================================

const loginAdmin =
  document.getElementById("loginAdmin");

const panelAdmin =
  document.getElementById("panelAdmin");


const btnLogin =
  document.getElementById("btnLogin");

const cerrarSesion =
  document.getElementById("cerrarSesion");

const buscador =
  document.getElementById("buscador");

const pendientes =
  document.getElementById("pendientes");

const pagados =
  document.getElementById("pagados");

const tituloPendientes =
  document.getElementById("tituloPendientes");

const tituloPagados =
  document.getElementById("tituloPagados");

const totalParticipantes =
  document.getElementById("totalParticipantes");

const recaudacionTotal =
  document.getElementById("recaudacionTotal");

const recaudacionPendiente =
  document.getElementById("recaudacionPendiente");

const statPendientes =
  document.getElementById("statPendientes");

const statPagados =
  document.getElementById("statPagados");

const statOrigen =
  document.getElementById("statOrigen");

const tituloAnuncio =
  document.getElementById("tituloAnuncio");

const tituloOrganico =
  document.getElementById("tituloOrganico");

const tituloRepetidas =
  document.getElementById("tituloRepetidas");

const listaRepetidas =
  document.getElementById("repetidas");

const anuncioVacio =
  document.getElementById("anuncioVacio");

const organicoVacio =
  document.getElementById("organicoVacio");


const sortearReferidos =
  document.getElementById("sortearReferidos");

const aprobarTodos =
  document.getElementById("aprobarTodos");

const borrarTodo =
  document.getElementById("borrarTodo");

const exportarSorteo =
  document.getElementById("exportarSorteo");


// =====================================================
// LOGIN
// =====================================================

function mostrarPanel() {

  if (loginAdmin) {
    loginAdmin.style.display = "none";
  }

  if (panelAdmin) {
    panelAdmin.style.display = "block";
  }

}


function mostrarLogin() {

  if (loginAdmin) {
    loginAdmin.style.display = "block";
  }

  if (panelAdmin) {
    panelAdmin.style.display = "none";
  }

}

// =====================================================
// ACTUALIZAR RANKING
// =====================================================

async function actualizarRanking(datos, cantidad) {

  const dniRanking =
    datos.dniNormalizado ||
    String(datos.dni || "")
      .replace(/\D/g, "")
      .trim();

  if (!dniRanking) {
    console.warn(
      "No se pudo actualizar ranking: participante sin DNI",
      datos
    );
    return;
  }

  const nombreRanking =
    `${datos.nombre || ""} ${datos.apellido || ""}`
      .replace(/\s+/g, " ")
      .trim();

  await setDoc(
    doc(db, "ranking", dniRanking),
    {
      dniNormalizado: dniRanking,
      nombre: nombreRanking,
      chances: increment(Number(cantidad) || 0)
    },
    {
      merge: true
    }
  );

  await actualizarRankingPublico();

}


// =====================================================
// RANKING PÚBLICO (TOP 5)
// =====================================================
// "ranking" tiene DNI y nombre completo: solo lo lee el admin.
// La página lee "publico/ranking": top 5 con nombre abreviado.

async function actualizarRankingPublico() {

  try {

    const snapshot =
      await getDocs(
        query(
          collection(db, "ranking"),
          orderBy("chances", "desc"),
          limit(5)
        )
      );

    const top =
      snapshot.docs.map(
        (documento) => {

          const datos =
            documento.data();

          const partes =
            String(datos.nombre || "")
              .trim()
              .split(/\s+/)
              .filter(Boolean);

          return {
            nombre:
              nombreAbreviado(
                partes[0] || "",
                partes.slice(1).join(" ")
              ),
            chances:
              Number(datos.chances) || 0
          };

        }
      );

    await setDoc(
      doc(db, "publico", "ranking"),
      {
        top,
        actualizado: serverTimestamp()
      }
    );

  } catch (error) {

    console.error(
      "No se pudo actualizar el ranking público:",
      error
    );

  }

}

// =====================================================
// VACIAR RANKING (al borrar todo el sorteo)
// =====================================================

async function vaciarRanking() {

  const snapshot =
    await getDocs(collection(db, "ranking"));

  // De a 400 por tanda (Firestore acepta hasta 500)
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += 400) {
    const tanda = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => tanda.delete(d.ref));
    await tanda.commit();
  }

  // Top 5 público vacío: la página oculta el ranking
  await setDoc(
    doc(db, "publico", "ranking"),
    { top: [], actualizado: serverTimestamp() }
  );

  return docs.length;

}

// =====================================================
// ACTUALIZAR CONSULTAS PÚBLICAS ("VER MIS NÚMEROS")
// =====================================================
// "consultas/{dni}" es lo único que lee el público al buscar
// sus números: nombre abreviado + compras aprobadas.

function dniDe(datos) {

  return (
    datos.dniNormalizado ||
    String(datos.dni || "")
  )
    .toString()
    .replace(/\D/g, "")
    .trim();

}


function armarConsulta(participantesDelDni) {

  const aprobados =
    participantesDelDni.filter(
      (p) =>
        p.datos.estado === "Pagado" &&
        Array.isArray(p.datos.numeros) &&
        p.datos.numeros.length
    );

  if (!aprobados.length) {
    return null;
  }

  const primero =
    aprobados[0].datos;

  return {
    nombre:
      nombreAbreviado(
        primero.nombre,
        primero.apellido
      ),
    compras:
      aprobados.map(
        (p) => ({
          pack: p.datos.pack || "",
          chances: Number(p.datos.chancesFinales) || p.datos.numeros.length,
          numeros: p.datos.numeros
        })
      ),
    actualizado:
      serverTimestamp()
  };

}


async function guardarConsulta(dni, consulta) {

  if (!dni) {
    return;
  }

  if (consulta) {

    await setDoc(
      doc(db, "consultas", dni),
      consulta
    );

  } else {

    await deleteDoc(
      doc(db, "consultas", dni)
    );

  }

}


// Rearma la consulta de un DNI (después de aprobar o borrar)

async function actualizarConsulta(dni) {

  if (!dni) {
    return;
  }

  try {

    // Solo las compras de ese DNI (antes leía todos los participantes)
    const snapshot =
      await getDocs(
        query(
          collection(db, "participantes"),
          where("dniNormalizado", "==", dni)
        )
      );

    const delDni =
      snapshot.docs.map(
        (documento) => ({
          id: documento.id,
          datos: documento.data()
        })
      );

    await guardarConsulta(
      dni,
      armarConsulta(delDni)
    );

  } catch (error) {

    console.error(
      "No se pudo actualizar la consulta pública:",
      error
    );

    // Avisar: si no, la persona no ve sus números y nadie se entera
    alert(
      `⚠️ No se pudo actualizar "Ver mis números" del DNI ${dni}.\n\n` +
      'Tocá "ACTUALIZAR VER MIS NÚMEROS" para arreglarlo.\n\n' +
      `(${error.message})`
    );

  }

}


// Rearma todas las consultas (para pasar los aprobados viejos)

async function actualizarTodasLasConsultas() {

  const participantes =
    await obtenerParticipantes();

  const porDni =
    new Map();

  participantes.forEach(
    (p) => {

      const dni =
        dniDe(p.datos);

      if (!dni) {
        return;
      }

      if (!porDni.has(dni)) {
        porDni.set(dni, []);
      }

      porDni.get(dni).push(p);

    }
  );

  // Borrar consultas de DNIs que ya no tienen compras

  const existentes =
    await getDocs(
      collection(db, "consultas")
    );

  for (const documento of existentes.docs) {

    if (!porDni.has(documento.id)) {
      await deleteDoc(documento.ref);
    }

  }

  let actualizadas = 0;

  for (const [dni, lista] of porDni) {

    const consulta =
      armarConsulta(lista);

    await guardarConsulta(dni, consulta);

    if (consulta) {
      actualizadas++;
    }

  }

  return actualizadas;

}


// =====================================================
// LOGIN CON GOOGLE
// =====================================================

alCambiarSesion(
  (esAdmin) => {

    adminActivo = esAdmin;

    if (esAdmin) {

      mostrarPanel();

      cargarParticipantes();

      actualizarRankingPublico();

    } else {

      mostrarLogin();

    }

  }
);


if (btnLogin) {

  btnLogin.addEventListener(
    "click",
    async () => {

      try {

        btnLogin.disabled = true;

        await entrarConGoogle();

      } catch (error) {

        console.error(
          "Error de login:",
          error
        );

        if (
          error.code !== "auth/popup-closed-by-user" &&
          error.code !== "auth/cancelled-popup-request"
        ) {

          alert(
            "❌ No se pudo entrar.\n\n" +
            error.message
          );

        }

      } finally {

        btnLogin.disabled = false;

      }

    }
  );

}


// =====================================================
// CERRAR SESIÓN
// =====================================================

if (cerrarSesion) {

  cerrarSesion.addEventListener(
    "click",
    async () => {

      await salir();

      location.reload();

    }
  );

}


// =====================================================
// ACTUALIZAR CONSULTAS (BOTÓN)
// =====================================================

const btnActualizarConsultas =
  document.getElementById("actualizarConsultas");

if (btnActualizarConsultas) {

  btnActualizarConsultas.addEventListener(
    "click",
    async () => {

      btnActualizarConsultas.disabled = true;

      try {

        await actualizarRankingPublico();

        const cantidad =
          await actualizarTodasLasConsultas();

        alert(
          `✅ Consultas actualizadas: ${cantidad} participantes con números.`
        );

      } catch (error) {

        console.error(error);

        alert(
          "❌ Error actualizando consultas.\n\n" +
          error.message
        );

      } finally {

        btnActualizarConsultas.disabled = false;

      }

    }
  );

}


// =====================================================
// CANTIDAD DE CHANCES
// =====================================================

function cantidadPorPack(pack) {

  if (!pack) return 0;

  const texto =
    pack
      .toString()
      .toUpperCase();

  if (
    texto.includes("100 CHANCE")
  ) {
    return 100;
  }

  if (
    texto.includes("50 CHANCE")
  ) {
    return 50;
  }

  if (
    texto.includes("30 CHANCE")
  ) {
    return 30;
  }

  if (
    texto.includes("10 CHANCE")
  ) {
    return 10;
  }

  if (
    texto.includes("3 CHANCE")
  ) {
    return 3;
  }

  if (
    texto.includes("1 CHANCE")
  ) {
    return 1;
  }

  return 0;
}

// =====================================================
// PRECIO POR CHANCES
// =====================================================

function precioPorChances(chances) {

  chances = Number(chances);

  if (chances === 100) {
    return 22000;
  }

  if (chances === 50) {
    return 14000;
  }

  if (chances === 30) {
    return 10000;
  }

  if (chances === 10) {
    return 6000;
  }

  if (chances === 3) {
    return 3600;
  }

  if (chances === 1) {
    return 1600;
  }

  return 0;
}
// =====================================================
// GENERAR NÚMERO
// =====================================================

function generarNumero() {

  return Math.floor(
    Math.random() * 1000000
  )
    .toString()
    .padStart(6, "0");

}


// =====================================================
// OBTENER PARTICIPANTES
// =====================================================

// Última lista descargada. El buscador la reutiliza
// para no descargar todo de nuevo con cada letra.
let cacheParticipantes = null;

async function obtenerParticipantes(
  { usarCache = false } = {}
) {

  if (usarCache && cacheParticipantes) {
    return cacheParticipantes;
  }

  const snapshot =
    await getDocs(
      collection(
        db,
        "participantes"
      )
    );

  const participantes = [];

  snapshot.forEach(
    (documento) => {

      participantes.push({

        id:
          documento.id,

        datos:
          documento.data()

      });

    }
  );


  // Ordenar por fecha

  participantes.sort(
    (a, b) => {

      const fechaA =
        a.datos.fecha &&
        typeof a.datos.fecha.toDate ===
          "function"
          ? a.datos.fecha
              .toDate()
              .getTime()
          : 0;


      const fechaB =
        b.datos.fecha &&
        typeof b.datos.fecha.toDate ===
          "function"
          ? b.datos.fecha
              .toDate()
              .getTime()
          : 0;


      return fechaB - fechaA;

    }
  );


  cacheParticipantes =
    participantes;

  return participantes;

}


// =====================================================
// OBTENER NÚMEROS USADOS
// =====================================================

async function obtenerNumerosUsados() {

  const participantes =
    await obtenerParticipantes();

  const usados =
    new Set();


  participantes.forEach(
    (participante) => {

      const numeros =
        participante.datos.numeros;


      if (
        Array.isArray(numeros)
      ) {

        numeros.forEach(
          (numero) => {

            usados.add(
              numero.toString()
            );

          }
        );

      }

    }
  );


  return usados;

}


// =====================================================
// GENERAR NÚMEROS ÚNICOS
// =====================================================

async function generarNumerosUnicos(
  cantidad
) {

  const usados =
    await obtenerNumerosUsados();

  const nuevos = [];


  while (
    nuevos.length < cantidad
  ) {

    const numero =
      generarNumero();


    if (
      !usados.has(numero) &&
      !nuevos.includes(numero)
    ) {

      nuevos.push(numero);

      usados.add(numero);

    }

  }


  return nuevos;

}


// =====================================================
// FECHA
// =====================================================

function mostrarFecha(
  timestamp
) {

  if (
    !timestamp ||
    typeof timestamp.toDate !==
      "function"
  ) {

    return "Sin fecha";

  }


  return timestamp
    .toDate()
    .toLocaleString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    );

}


// =====================================================
// TEXTO SEGURO
// =====================================================
// Los datos los escribe el comprador: se muestran como texto,
// nunca como HTML (así nadie puede meter código en el panel).

function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


// =====================================================
// ORIGEN DE LA COMPRA
// =====================================================
//   anuncio: el link traía la etiqueta de los anuncios (utm_source)
//   clave:   usó la palabra clave de una red (RED_POR_CLAVE)
//   link:    vino de Facebook/Instagram sin etiqueta (bio, publicación
//            o un anuncio sin etiquetar): marca fbc o navegador de la app
//   otro:    entró de cualquier otra forma

const FUENTES_META = ["meta", "facebook", "fb", "instagram", "ig", "msg", "an"];

// Cada palabra clave se anuncia en una sola red
const RED_POR_CLAVE = { "50": "instagram", "MENOS": "facebook" };

function redDeClave(datos) {
  return RED_POR_CLAVE[String(datos.codigoPromo || "").trim().toUpperCase()] || "";
}

function fuenteCompra(datos) {
  return String(datos.utmSource || "").trim().toLowerCase();
}

// "instagram", "facebook" o "" si no se puede saber.
// Primero la palabra clave, después lo que dice el anuncio
// y por último el navegador interno de cada app.
function redCompra(datos) {

  const redClave = redDeClave(datos);

  if (redClave) return redClave;

  const fuente = fuenteCompra(datos);

  if (fuente === "ig" || fuente === "instagram") return "instagram";
  if (fuente === "fb" || fuente === "facebook") return "facebook";

  const navegador = String(datos.userAgent || "");

  if (/Instagram/i.test(navegador)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/.test(navegador)) return "facebook";

  return "";

}

function origenCompra(datos) {
  if (FUENTES_META.includes(fuenteCompra(datos))) {
    return "anuncio";
  }
  if (redDeClave(datos)) {
    return "clave";
  }
  return datos.fbc || redCompra(datos) ? "link" : "otro";
}


// Palabras clave que se publicitan en anuncios. "50" es orgánica
// (se comparte en Instagram sin pagar).
const CLAVES_DE_ANUNCIO = ["MENOS"];

// Anuncio: vino de un anuncio de Facebook o Instagram (los parámetros
// del anuncio en la URL, o una palabra clave de anuncio). Orgánico:
// todo lo demás (bio, posts, historias, WhatsApp, boca en boca, la
// palabra "50", la ruleta).
function esDeAnuncio(datos) {
  const origen = origenCompra(datos);
  const clave = String(datos.codigoPromo || "").trim().toUpperCase();
  return origen === "anuncio" || (origen === "clave" && CLAVES_DE_ANUNCIO.includes(clave));
}

function nombreOrigenCompra(datos) {
  return esDeAnuncio(datos) ? "📣 Anuncio" : "🌱 Orgánico";
}


// =====================================================
// ELIMINAR UNA COMPRA
// =====================================================
// Borra el comprobante y la compra, descuenta del ranking los números
// que ya tenía asignados y actualiza "Ver mis números".
// La recaudación se recalcula al recargar la lista.

async function eliminarCompra(id, datos) {

  if (datos.comprobantePath) {

    try {
      await deleteObject(ref(storage, datos.comprobantePath));
    } catch (error) {
      console.warn("No se pudo eliminar el comprobante:", error);
    }

  }

  await deleteDoc(doc(db, "participantes", id));

  // Queda registrada para el control de "Montos borrados"
  try {
    await addDoc(collection(db, "borrados"), {
      nombre: `${datos.nombre || ""} ${datos.apellido || ""}`.trim(),
      dni: String(datos.dni || ""),
      pack: String(datos.pack || ""),
      monto: precioDeCompra(datos),
      estado: datos.estado || "",
      origen: nombreOrigenCompra(datos),
      fechaCompra: datos.fecha || null,
      fecha: serverTimestamp()
    });
  } catch (error) {
    console.warn("No se pudo registrar el borrado:", error);
  }

  const numerosAsignados =
    Array.isArray(datos.numeros) ? datos.numeros.length : 0;

  if (datos.estado === "Pagado" && numerosAsignados) {
    await actualizarRanking(datos, -numerosAsignados);
  }

  await actualizarConsulta(dniDe(datos));

}


// =====================================================
// MONTOS BORRADOS
// =====================================================
// Lo borrado cada día (hora de Argentina), para control.

const diaArgentina = (fecha) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(fecha);

let borradosCargados = [];

function pintarBorradosDelDia() {

  const selector = document.getElementById("diaBorrados");
  const lugar = document.getElementById("statBorrados");

  if (!selector || !lugar) return;

  const delDia =
    borradosCargados.filter(({ dia }) => dia === selector.value);

  const suma = (lista) =>
    lista.reduce((total, { datos }) => total + (Number(datos.monto) || 0), 0);

  const pesos = (monto) => `$${monto.toLocaleString("es-AR")}`;

  // Todo junto, aprobada o no: para Meta ya contaba como compra
  document.getElementById("borradosMonto").textContent = pesos(suma(delDia));
  document.getElementById("borradosDetalle").textContent =
    delDia.length
      ? `${delDia.length} compra${delDia.length === 1 ? "" : "s"} borrada${delDia.length === 1 ? "" : "s"}`
      : "Ese día no se borró nada";

  // Anuncio u orgánico (las borradas antes del 04/11 no lo guardaban)
  const origenDe = (datos) =>
    datos.origen ||
    (/CLAVE MENOS/i.test(datos.pack || "") ? "📣 Anuncio" : "❔ Sin dato");

  const porOrigen = new Map();
  delDia.forEach(({ datos }) => {
    const origen = origenDe(datos);
    const grupo = porOrigen.get(origen) || { compras: 0, monto: 0 };
    grupo.compras++;
    grupo.monto += Number(datos.monto) || 0;
    porOrigen.set(origen, grupo);
  });

  document.getElementById("borradosOrigen").textContent =
    ["📣 Anuncio", "🌱 Orgánico", "❔ Sin dato"]
      .filter((origen) => porOrigen.has(origen))
      .map((origen) => {
        const { compras, monto } = porOrigen.get(origen);
        return `${origen}: ${pesos(monto)} (${compras})`;
      })
      .join(" · ");

  lugar.innerHTML = "";

  // Lista cerrada: se abre tocando "Ver las N compras borradas"
  const detalleBorrados = document.getElementById("detalleBorrados");
  detalleBorrados.hidden = !delDia.length;
  document.getElementById("resumenBorrados").textContent =
    `Ver ${delDia.length === 1 ? "la compra borrada" : `las ${delDia.length} compras borradas`}`;

  delDia.forEach(({ datos }) => {

    const fila = document.createElement("div");
    fila.className = "resumen-fila";

    const quien = document.createElement("b");
    quien.textContent = `${datos.nombre || "Sin nombre"} · DNI ${datos.dni || "-"}`;

    const detalle = document.createElement("span");
    const hora = datos.fecha?.toDate?.().toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    detalle.textContent =
      `${pesos(Number(datos.monto) || 0)} · ${origenDe(datos)}${hora ? ` · ${hora} h` : ""}`;

    fila.append(quien, detalle);
    lugar.appendChild(fila);

  });

}

async function mostrarBorrados() {

  const selector = document.getElementById("diaBorrados");

  if (!selector) return;

  try {

    const resultado = await getDocs(collection(db, "borrados"));

    borradosCargados = resultado.docs
      .map((documento) => {
        const datos = documento.data();
        const fecha = datos.fecha?.toDate?.();
        return { datos, dia: fecha ? diaArgentina(fecha) : "", momento: fecha?.getTime() || 0 };
      })
      .sort((a, b) => b.momento - a.momento);

    const total =
      borradosCargados.reduce((suma, { datos }) => suma + (Number(datos.monto) || 0), 0);

    document.getElementById("borradosTotal").textContent =
      borradosCargados.length
        ? `En total: $${total.toLocaleString("es-AR")} en ${borradosCargados.length} compra${borradosCargados.length === 1 ? "" : "s"}`
        : "Todavía no se borró ninguna compra";

    const hoy = diaArgentina(new Date());
    selector.max = hoy;
    selector.value = selector.value || hoy;

    if (!selector.dataset.listo) {
      selector.dataset.listo = "si";
      selector.addEventListener("change", pintarBorradosDelDia);
    }

    pintarBorradosDelDia();

    // La calculadora de comisiones descuenta las borradas de anuncios
    actualizarComisiones();

  } catch (error) {

    console.error("No se pudieron leer los borrados:", error);
    document.getElementById("borradosTotal").textContent =
      "No se pudieron leer los montos borrados";

  }

}


// =====================================================
// AVISOS ANTES DE APROBAR
// =====================================================
// En cada compra pendiente: si esa persona ya tiene otra compra
// del mismo monto o muy reciente, cuántas chances tiene aprobadas,
// y si el comprobante es el mismo archivo que el de otra compra.

const HORAS_MISMO_MONTO = 24;
const MINUTOS_RECIENTE = 120;

const momentoDe = (datos) => datos.fecha?.toDate?.().getTime() || 0;

function haceCuanto(ms) {
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 48) return `hace ${horas} h`;
  return `hace ${Math.round(horas / 24)} días`;
}

const estadoCorto = (datos) => (datos.estado === "Pagado" ? "aprobada" : "pendiente");

// Compras por DNI (sin la chance gratis de la ruleta)
function agruparPorDni(participantes) {
  const porDni = new Map();
  participantes.forEach(({ id, datos }) => {
    if (datos.codigoPromo === "RULETAGRATIS") return;
    const dni = dniDe(datos);
    if (!dni) return;
    if (!porDni.has(dni)) porDni.set(dni, []);
    porDni.get(dni).push({ id, datos });
  });
  return porDni;
}

// Devuelve [{ tipo: "alerta" | "info", texto }]
function avisosDeCompra(id, datos, porDni) {

  const otras =
    (porDni.get(dniDe(datos)) || []).filter((otra) => otra.id !== id);

  if (!otras.length) return [];

  const avisos = [];
  const precio = precioDeCompra(datos);
  const momento = momentoDe(datos);

  otras.forEach(({ datos: otra }) => {

    const distancia = Math.abs(momento - momentoDe(otra));
    const mismoMonto = precioDeCompra(otra) === precio;

    if (momento && momentoDe(otra) && mismoMonto && distancia <= HORAS_MISMO_MONTO * 3600000) {
      avisos.push({
        tipo: "alerta",
        texto: `⚠️ Posible repetida: otra compra de $${precio.toLocaleString("es-AR")} ${haceCuanto(distancia).replace("hace ", "a ")} de esta (${estadoCorto(otra)})`
      });
    } else if (momento && momentoDe(otra) && distancia <= MINUTOS_RECIENTE * 60000) {
      avisos.push({
        tipo: "alerta",
        texto: `⚠️ Otra compra reciente: ${otra.pack || "-"} (${estadoCorto(otra)})`
      });
    }

  });

  const aprobadas = otras.filter(({ datos: otra }) => otra.estado === "Pagado");
  const chances = aprobadas.reduce(
    (suma, { datos: otra }) => suma + (Array.isArray(otra.numeros) ? otra.numeros.length : 0),
    0
  );
  const pendientesOtras = otras.length - aprobadas.length;

  avisos.push({
    tipo: "info",
    texto:
      `ℹ️ Ya tiene ${chances} chance${chances === 1 ? "" : "s"} aprobada${chances === 1 ? "" : "s"} en ${aprobadas.length} compra${aprobadas.length === 1 ? "" : "s"}` +
      (pendientesOtras ? ` y ${pendientesOtras} pendiente${pendientesOtras === 1 ? "" : "s"} más` : "")
  });

  return avisos;

}

function avisosHTML(avisos) {
  return avisos.length
    ? `<div class="card-avisos">${avisos
        .map(({ tipo, texto }) => `<p class="card-aviso ${tipo}">${esc(texto)}</p>`)
        .join("")}</div>`
    : "";
}

// Huella (MD5) de cada archivo, para no pedirla dos veces
const huellas = new Map();

async function huellaDe(path) {
  if (!huellas.has(path)) {
    huellas.set(
      path,
      getMetadata(ref(storage, path))
        .then((meta) => meta.md5Hash || "")
        .catch(() => "")
    );
  }
  return huellas.get(path);
}

// Compara el comprobante de cada pendiente con los de los últimos 7 días
async function marcarMismoComprobante(participantes, tarjetas) {

  const desde = Date.now() - 7 * 24 * 3600000;

  const conArchivo = participantes.filter(({ id, datos }) =>
    datos.comprobantePath &&
    (tarjetas.has(id) || momentoDe(datos) >= desde)
  );

  // De a 8 pedidos por vez
  const resultado = [];
  for (let i = 0; i < conArchivo.length; i += 8) {
    const tanda = conArchivo.slice(i, i + 8);
    const huellasTanda = await Promise.all(
      tanda.map(({ datos }) => huellaDe(String(datos.comprobantePath).replace(/^\/+/, "")))
    );
    tanda.forEach((compra, j) => resultado.push({ ...compra, huella: huellasTanda[j] }));
  }

  const porHuella = new Map();
  resultado.forEach((compra) => {
    if (!compra.huella) return;
    if (!porHuella.has(compra.huella)) porHuella.set(compra.huella, []);
    porHuella.get(compra.huella).push(compra);
  });

  tarjetas.forEach((card, id) => {

    const propia = resultado.find((compra) => compra.id === id);
    if (!propia?.huella) return;

    const iguales =
      porHuella.get(propia.huella).filter((otra) => otra.id !== id);

    if (!iguales.length) return;

    let lugar = card.querySelector(".card-avisos");
    if (!lugar) {
      lugar = document.createElement("div");
      lugar.className = "card-avisos";
      card.querySelector(".card-pack")?.after(lugar);
    }

    iguales.forEach(({ datos }) => {
      const aviso = document.createElement("p");
      aviso.className = "card-aviso grave";
      aviso.textContent =
        `🚨 Mismo comprobante que la compra de ${datos.nombre || ""} ${datos.apellido || ""} (DNI ${datos.dni || "-"}) · ${mostrarFecha(datos.fecha)} · ${estadoCorto(datos)}`;
      lugar.prepend(aviso);
    });

  });

}


// =====================================================
// PERSONAS CON MÁS DE UNA COMPRA
// =====================================================
// Para controlar que no hayan cargado dos veces la misma operación.
// Se marca "posible duplicado" si hay dos compras con el mismo monto
// en menos de este tiempo.

const MINUTOS_DUPLICADO = 120;

function mostrarRepetidas(participantes) {

  if (!listaRepetidas) return;

  // La chance gratis de la ruleta no cuenta: no es una operación
  const porDni = new Map();

  const idDe = new Map(
    participantes.map(({ id, datos }) => [datos, id])
  );

  participantes.forEach(({ datos }) => {

    if (datos.codigoPromo === "RULETAGRATIS") return;

    const dni = dniDe(datos);

    if (!dni) return;

    if (!porDni.has(dni)) porDni.set(dni, []);

    porDni.get(dni).push(datos);

  });

  const momento = (datos) =>
    datos.fecha?.toDate?.().getTime() || 0;

  const grupos = [...porDni.values()]
    .filter((compras) => compras.length > 1)
    .map((compras) => {

      compras.sort((a, b) => momento(b) - momento(a));

      // Compras con el mismo monto y cerca en el tiempo
      const sospechosas = new Map();

      compras.forEach((a, i) => {
        compras.slice(i + 1).forEach((b) => {

          const minutos =
            Math.round(Math.abs(momento(a) - momento(b)) / 60000);

          if (
            momento(a) && momento(b) &&
            minutos <= MINUTOS_DUPLICADO &&
            precioDeCompra(a) === precioDeCompra(b)
          ) {
            sospechosas.set(a, Math.min(sospechosas.get(a) ?? minutos, minutos));
            sospechosas.set(b, Math.min(sospechosas.get(b) ?? minutos, minutos));
          }

        });
      });

      return { compras, sospechosas };

    })
    .sort((a, b) =>
      (b.sospechosas.size > 0) - (a.sospechosas.size > 0) ||
      momento(b.compras[0]) - momento(a.compras[0])
    );

  const conAlerta =
    grupos.filter((g) => g.sospechosas.size).length;

  if (tituloRepetidas) {
    tituloRepetidas.textContent =
      `🔁 Repetidas (${grupos.length})` + (conAlerta ? ` · ⚠️ ${conAlerta}` : "");
  }

  listaRepetidas.innerHTML = "";

  const ayuda = document.createElement("p");
  ayuda.className = "repetidas-ayuda";
  ayuda.textContent = grupos.length
    ? `${grupos.length} personas con más de una compra. Arriba, las que tienen dos compras del mismo monto con menos de ${MINUTOS_DUPLICADO / 60} horas de diferencia: compará los comprobantes.`
    : "Nadie tiene más de una compra.";
  listaRepetidas.appendChild(ayuda);

  grupos.forEach(({ compras, sospechosas }) => {

    const primera = compras[0];

    const grupo = document.createElement("article");
    grupo.className = "repetida" + (sospechosas.size ? " sospechosa" : "");

    const cabecera = document.createElement("header");

    const titulo = document.createElement("div");

    const nombre = document.createElement("h3");
    nombre.textContent =
      `${primera.nombre || ""} ${primera.apellido || ""}`.trim() || "Sin nombre";

    const resumen = document.createElement("p");
    const total =
      compras.reduce((suma, datos) => suma + precioDeCompra(datos), 0);
    resumen.textContent =
      `DNI ${primera.dni || "-"} · ${compras.length} compras · $${total.toLocaleString("es-AR")}`;

    titulo.append(nombre, resumen);

    const buscar = document.createElement("button");
    buscar.type = "button";
    buscar.className = "repetida-buscar";
    buscar.textContent = "Buscar en la lista";
    buscar.addEventListener("click", () => {
      // Muestra las dos listas con solo las compras de esta persona
      document.querySelector('.pestanas [data-lista="pendientes"]')?.click();
      document.getElementById("pagados").hidden = false;
      buscador.value = String(primera.dni || "");
      buscador.dispatchEvent(new Event("input"));
      buscador.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    cabecera.append(titulo, buscar);
    grupo.appendChild(cabecera);

    if (sospechosas.size) {
      const alerta = document.createElement("p");
      alerta.className = "repetida-alerta";
      alerta.textContent =
        "⚠️ Posible duplicado: mismo monto y poco tiempo entre compras";
      grupo.appendChild(alerta);
    }

    compras.forEach((datos) => {

      const fila = document.createElement("div");
      fila.className = "repetida-compra" + (sospechosas.has(datos) ? " marcada" : "");

      let miniatura;

      if (!datos.comprobanteURL) {
        miniatura = document.createElement("div");
        miniatura.className = "card-comprobante sin";
        miniatura.textContent = "❌ Sin archivo";
      } else {
        miniatura = document.createElement("a");
        miniatura.href = datos.comprobanteURL;
        miniatura.target = "_blank";
        miniatura.rel = "noopener";
        if (/\.pdf($|\?)/i.test(datos.comprobantePath || datos.comprobanteURL)) {
          miniatura.className = "card-comprobante pdf";
          miniatura.textContent = "📄 PDF";
        } else {
          miniatura.className = "card-comprobante";
          const imagen = document.createElement("img");
          imagen.src = datos.comprobanteURL;
          imagen.alt = "Comprobante";
          imagen.loading = "lazy";
          miniatura.appendChild(imagen);
        }
      }

      const info = document.createElement("div");

      const pack = document.createElement("b");
      pack.textContent = datos.pack || "-";

      const detalle = document.createElement("span");
      detalle.textContent =
        [
          mostrarFecha(datos.fecha),
          datos.estado === "Pagado" ? "✅ Aprobada" : "⏳ Pendiente",
          datos.codigoPromo ? `🔑 ${datos.codigoPromo}` : ""
        ].filter(Boolean).join(" · ");

      info.append(pack, detalle);

      if (sospechosas.has(datos)) {
        const aviso = document.createElement("small");
        const minutos = sospechosas.get(datos);
        aviso.textContent =
          minutos < 60
            ? `⚠️ Otra compra igual ${minutos} min antes o después`
            : `⚠️ Otra compra igual ${Math.round(minutos / 6) / 10} h antes o después`;
        info.appendChild(aviso);
      }

      const borrar = document.createElement("button");
      borrar.type = "button";
      borrar.className = "repetida-borrar";
      borrar.textContent = "🗑 Borrar";
      borrar.addEventListener("click", async () => {

        const aprobada = datos.estado === "Pagado";

        const confirmar = confirm(
          `¿Borrar esta compra de ${datos.nombre || ""} ${datos.apellido || ""}?\n\n` +
          `${datos.pack || "-"}\n${mostrarFecha(datos.fecha)} · ${aprobada ? "Aprobada" : "Pendiente"}\n\n` +
          "Se borran la compra y su comprobante" +
          (aprobada ? ", y se descuentan sus números y su plata." : ".")
        );

        if (!confirmar) return;

        borrar.disabled = true;
        borrar.textContent = "Borrando...";

        try {

          await eliminarCompra(idDe.get(datos), datos);

          await cargarParticipantes();

        } catch (error) {

          console.error("ERROR ELIMINANDO:", error);
          alert("❌ No se pudo borrar.\n\n" + error.message);

          borrar.disabled = false;
          borrar.textContent = "🗑 Borrar";

        }

      });

      fila.append(miniatura, info, borrar);
      grupo.appendChild(fila);

    });

    listaRepetidas.appendChild(grupo);

  });

}


// Filas "Nombre · 3 compras · $15.000 · promedio $5.000" (solo texto)
function mostrarResumen(elemento, filas) {

  elemento.innerHTML = "";

  filas.forEach(({ nombre, compras, monto, sangria }) => {

    const fila = document.createElement("div");
    fila.className = "resumen-fila" + (sangria ? " sangria" : "");

    const titulo = document.createElement("b");
    titulo.textContent = nombre;

    const detalle = document.createElement("span");
    const promedio = compras ? Math.round(monto / compras) : 0;
    detalle.textContent =
      `${compras} compra${compras === 1 ? "" : "s"} · $${monto.toLocaleString("es-AR")}` +
      (compras ? ` · promedio $${promedio.toLocaleString("es-AR")}` : "");

    fila.append(titulo, detalle);
    elemento.appendChild(fila);

  });

}


// Suma una compra en un grupo { compras, monto }
function sumarCompra(grupos, clave, monto) {
  grupos[clave] = grupos[clave] || { compras: 0, monto: 0 };
  grupos[clave].compras++;
  grupos[clave].monto += monto;
}


// =====================================================
// PACK MÁS ELEGIDO (lo muestra la página)
// =====================================================
// Cuenta las compras APROBADAS de cada pack y publica en
// "publico/packs" solo el resultado (sin datos de nadie).
// Con menos de MINIMO_COMPRAS_PACK compras no publica nada
// y la página deja el pack de 30 como destacado.

const PACKS_PAGINA = [1, 3, 10, 30, 50, 100];

const MINIMO_COMPRAS_PACK = 10;

let ultimoPackPublicado = "";

async function publicarPackMasElegido(participantes) {

  const conteo = {};
  let total = 0;

  participantes.forEach(({ datos }) => {

    if (datos.estado !== "Pagado") {
      return;
    }

    const chances =
      Number(datos.chancesBase) || cantidadPorPack(datos.pack);

    if (!PACKS_PAGINA.includes(chances)) {
      return;
    }

    conteo[chances] = (conteo[chances] || 0) + 1;
    total++;

  });

  let masElegido = null;

  if (total >= MINIMO_COMPRAS_PACK) {
    masElegido =
      Number(Object.entries(conteo).sort((x, y) => y[1] - x[1])[0][0]);
  }

  const porcentaje =
    masElegido ? Math.round((conteo[masElegido] / total) * 100) : 0;

  // Solo escribir si cambió (el panel recarga la lista seguido)
  const clave = `${masElegido}-${porcentaje}`;

  if (clave === ultimoPackPublicado) {
    return;
  }

  try {

    await setDoc(
      doc(db, "publico", "packs"),
      {
        masElegido,
        porcentaje,
        actualizado: serverTimestamp()
      }
    );

    ultimoPackPublicado = clave;

  } catch (error) {

    console.error("No se pudo publicar el pack más elegido:", error);

  }

}


// =====================================================
// SORTEO DE $50.000 POR COMPARTIR
// =====================================================
// Cada compra APROBADA hecha desde el link de alguien
// (campo "referido" = DNI de quien compartió) le da 1 chance
// a esa persona. Tiene que estar participando y no cuenta
// comprar desde el propio link.

function chancesSorteoReferidos(participantes) {

  const participantePorDni = new Map();

  participantes.forEach(({ datos }) => {
    const dni = dniDe(datos);
    if (dni && !participantePorDni.has(dni)) {
      participantePorDni.set(dni, datos);
    }
  });

  const chancesPorDni = new Map();
  let compras = 0;

  participantes.forEach(({ datos }) => {

    const ref =
      String(datos.referido || "").replace(/[^0-9]/g, "");

    if (
      datos.estado !== "Pagado" ||
      !ref ||
      ref === dniDe(datos) ||
      !participantePorDni.has(ref)
    ) {
      return;
    }

    chancesPorDni.set(ref, (chancesPorDni.get(ref) || 0) + 1);
    compras++;

  });

  const personas =
    [...chancesPorDni.entries()].map(([dni, chances]) => ({
      dni,
      chances,
      datos: participantePorDni.get(dni)
    }));

  return { personas, compras };

}


if (sortearReferidos) {

  sortearReferidos.addEventListener("click", async () => {

    sortearReferidos.disabled = true;

    try {

      const { personas, compras } =
        chancesSorteoReferidos(await obtenerParticipantes());

      if (!personas.length) {
        alert("Todavía nadie compró desde el link de otro participante.");
        return;
      }

      if (!confirm(`Hay ${personas.length} personas con ${compras} chances en total.\n\n¿Sortear ahora los $50.000?`)) {
        return;
      }

      // Al azar, con tantas chances como compras trajo cada uno
      let numero = Math.floor(Math.random() * compras);
      const ganador =
        personas.find((p) => (numero -= p.chances) < 0);

      const d = ganador.datos;

      alert(
        "🎉 GANADOR DE LOS $50.000\n\n" +
        `${d.nombre || ""} ${d.apellido || ""}\n` +
        `DNI: ${d.dni || ganador.dni}\n` +
        `Teléfono: ${d.telefono || "-"}\n` +
        `Instagram: ${d.instagram || "-"}\n\n` +
        `Tenía ${ganador.chances} de ${compras} chances.`
      );

    } catch (error) {

      console.error("ERROR SORTEANDO REFERIDOS:", error);
      alert("❌ No se pudo sortear.\n\n" + error.message);

    } finally {

      sortearReferidos.disabled = false;

    }

  });

}


// =====================================================
// PRECIO DE UNA COMPRA
// =====================================================
// El precio real con el que se compró (queda escrito en "pack");
// si no, precioFinal; si no, por cantidad de chances.

function precioDeCompra(datos) {

  // La chance gratis de la ruleta no suma plata
  if (datos.codigoPromo === "RULETAGRATIS") {
    return 0;
  }

  let precio = 0;

  // Precio que quedó guardado dentro del pack. Ejemplos:
  // "50 CHANCES • $35.000"
  // "PROMO EXCLUSIVA • 50 CHANCES • $11.999"
  if (datos.pack) {

    const coincidenciaPrecio =
      datos.pack.toString().match(/\$\s*([\d.]+)/);

    if (coincidenciaPrecio) {
      precio = Number(coincidenciaPrecio[1].replace(/\./g, ""));
    }

  }

  // Si el pack no tenía el precio escrito, usa precioFinal
  if (!precio || !Number.isFinite(precio)) {
    precio = Number(datos.precioFinal) > 0
      ? Number(datos.precioFinal)
      : 0;
  }

  // Respaldo para promociones viejas
  if (!precio && datos.codigoPromo === "SUPER50") {
    precio = 11999;
  }

  if (!precio && datos.codigoPromo === "SUPER100") {
    precio = 14999;
  }

  // Último respaldo: por cantidad de chances
  if (!precio) {
    precio = precioPorChances(
      Number(datos.chancesFinales) || cantidadPorPack(datos.pack)
    );
  }

  return precio;

}


// =====================================================
// CARGAR PARTICIPANTES
// =====================================================

async function cargarParticipantes(
  { usarCache = false } = {}
) {

  if (
    !pendientes ||
    !pagados
  ) {

    console.error(
      "No se encontraron los contenedores del admin."
    );

    return;

  }


  pendientes.innerHTML =
    `
      <p>
        ⏳ Cargando participantes...
      </p>
    `;

  pagados.innerHTML = "";


  try {

    const participantes =
      await obtenerParticipantes({ usarCache });

    // Compras que se guardaron sin el link del comprobante
    await Promise.all(
      participantes
        .filter(({ datos }) => !datos.comprobanteURL && datos.comprobantePath)
        .map(async ({ datos }) => {
          try {
            datos.comprobanteURL =
              await getDownloadURL(ref(storage, datos.comprobantePath));
          } catch (error) {
            console.warn("No se encontró el comprobante:", error);
          }
        })
    );


    pendientes.innerHTML = "";

    pagados.innerHTML = "";


    let cantidadPendientes = 0;

    let cantidadPagados = 0;

    let cantidadAnuncio = 0;

    let cantidadOrganico = 0;


    const dniUnicos =
      new Set();


    // =================================================
    // RECAUDACIÓN: APROBADOS Y POR APROBAR
    // =================================================

    let recaudacion = 0;

    // La página destaca el pack que de verdad más se compra
    publicarPackMasElegido(participantes);

    let porAprobar = 0;

    // Aprobadas por origen: anuncio u orgánico
    const porOrigen = {};

    // Nombre de cada participante por DNI (para "vino por el link de...")
    const nombrePorDni = new Map(
      participantes.map(({ datos }) => [
        dniDe(datos),
        `${datos.nombre || ""} ${datos.apellido || ""}`.trim()
      ])
    );


    participantes.forEach(
      ({ datos }) => {

        const precio =
          precioDeCompra(datos);

        // Solo aprobadas: es plata que ya entró
        if (datos.estado === "Pagado") {
          sumarCompra(porOrigen, nombreOrigenCompra(datos), precio);
        }

        if (datos.estado === "Pagado") {
          recaudacion += precio;
        } else {
          porAprobar += precio;
        }

      }
    );


    // Para los avisos de las pendientes
    const comprasPorDni = agruparPorDni(participantes);
    const tarjetasPendientes = new Map();


    // =================================================
    // BUSCADOR
    // =================================================

    const textoBusqueda =
      buscador
        ? buscador.value
            .toLowerCase()
            .trim()
        : "";


    participantes.forEach(
      (participante) => {

        const id =
          participante.id;

        const datos =
          participante.datos;


        // =============================================
        // DNI ÚNICO
        // =============================================

        if (datos.dni) {

          const dni =
            datos.dni
              .toString()
              .replace(/\D/g, "");


          if (dni) {
            dniUnicos.add(dni);
          }

        }


        // =============================================
        // FILTRO BUSCADOR
        // =============================================

        const nombre =
          (
            datos.nombre || ""
          )
            .toString()
            .toLowerCase();


        const apellido =
          (
            datos.apellido || ""
          )
            .toString()
            .toLowerCase();


        const dniTexto =
          (
            datos.dni || ""
          )
            .toString()
            .toLowerCase();


        // DNI: se comparan solo los números, así "40.123.456"
        // y "40123456" encuentran a la misma persona.
        const dniDigitos =
          dniTexto.replace(/\D/g, "");

        const busquedaDigitos =
          textoBusqueda.replace(/\D/g, "");

        const coincide =

          nombre.includes(
            textoBusqueda
          )

          ||

          apellido.includes(
            textoBusqueda
          )

          ||

          // Nombre y apellido juntos ("kevin porchile")
          `${nombre} ${apellido}`
            .replace(/\s+/g, " ")
            .includes(
              textoBusqueda.replace(/\s+/g, " ")
            )

          ||

          dniTexto.includes(
            textoBusqueda
          )

          ||

          (
            busquedaDigitos.length > 0 &&
            dniDigitos.includes(
              busquedaDigitos
            )
          );


        if (
          textoBusqueda &&
          !coincide
        ) {

          return;

        }


        // =============================================
        // NÚMEROS
        // =============================================

        const numeros =
          Array.isArray(
            datos.numeros
          )
            ? datos.numeros
            : [];


        const numerosHTML =
          numeros.length
            ? numeros.join(", ")
            : "Sin asignar";


        // =============================================
        // TARJETA
        // =============================================

        const card =
          document.createElement(
            "div"
          );


        const origen =
          origenCompra(datos);

        const red =
          redCompra(datos);

        const nombreRed =
          red === "instagram" ? "Instagram" : red === "facebook" ? "Facebook" : "Facebook o Instagram";

        const deAnuncio =
          esDeAnuncio(datos);

        card.className =
          `card ${datos.estado === "Pagado" ? "card-pagado" : "card-pendiente"}` +
          (deAnuncio ? " card-anuncio" : " card-organico");

        if (deAnuncio) {
          cantidadAnuncio++;
        } else {
          cantidadOrganico++;
        }


        // Comprobante: miniatura (imagen) o link (PDF)
        const url =
          datos.comprobanteURL
            ? esc(datos.comprobanteURL)
            : "";

        const esPdf =
          /\.pdf($|\?)/i.test(datos.comprobantePath || datos.comprobanteURL || "");

        const comprobanteHTML =
          !url
            ? `<div class="card-comprobante sin">📄<br>Sin comprobante</div>`
            : esPdf
              ? `<a class="card-comprobante pdf" href="${url}" target="_blank" rel="noopener">📄<br>Ver PDF</a>`
              : `<a class="card-comprobante" href="${url}" target="_blank" rel="noopener" title="Ver en grande">
                   <img src="${url}" alt="Comprobante" loading="lazy">
                 </a>`;

        const instagram =
          (datos.instagram || "").toString().replace(/^@+/, "").trim();

        const avisos =
          datos.estado !== "Pagado" && datos.codigoPromo !== "RULETAGRATIS"
            ? avisosDeCompra(id, datos, comprasPorDni)
            : [];

        if (datos.estado !== "Pagado") {
          tarjetasPendientes.set(id, card);
        }

        card.innerHTML = `

          ${comprobanteHTML}

          <div class="card-info">

            <h3>${esc(datos.nombre)} ${esc(datos.apellido)}</h3>

            <p class="card-pack">${esc(datos.pack) || "-"}</p>

            ${avisosHTML(avisos)}

            ${
              datos.codigoPromo
                ? `<span class="card-clave">🔑 Palabra clave: ${esc(datos.codigoPromo)}</span>`
                : ""
            }

            ${
              deAnuncio
                ? `<span class="card-clave card-origen">📣 Anuncio${
                    red ? ` · ${nombreRed}` : ""
                  }${
                    origen === "anuncio" && datos.utmCampaign ? `: ${esc(datos.utmCampaign)}` : ""
                  }</span>`
                : `<span class="card-clave card-organico-sello">🌱 Orgánico${
                    (origen === "link" || origen === "clave") && red ? ` · desde ${nombreRed}` : ""
                  }</span>`
            }

            ${
              datos.referido && datos.referido !== dniDe(datos)
                ? `<span class="card-clave card-ref">🤝 Vino por el link de ${
                    esc(nombrePorDni.get(datos.referido) || "DNI " + datos.referido)
                  }</span>`
                : ""
            }

            <dl class="card-datos">
              <div><dt>DNI</dt><dd>${esc(datos.dni) || "-"}${datos.dniNormalizado ? "" : " ⚠️"}</dd></div>
              <div><dt>Teléfono</dt><dd>${esc(datos.telefono) || "-"}</dd></div>
              <div><dt>Instagram</dt><dd>${
                instagram
                  ? `<a href="https://instagram.com/${encodeURIComponent(instagram)}" target="_blank" rel="noopener">@${esc(instagram)}</a>`
                  : "-"
              }</dd></div>
              <div><dt>Chances</dt><dd>${esc(datos.chancesFinales) || 0}</dd></div>
              <div><dt>Fecha</dt><dd>${esc(mostrarFecha(datos.fecha))}</dd></div>
            </dl>

            <p class="card-numeros"><strong>Números:</strong> ${esc(numerosHTML)}</p>

          </div>

          <div class="admin-actions">

            ${
              datos.estado !== "Pagado"
                ? `<button class="aprobar-btn" type="button">✅ APROBAR PAGO</button>`
                : `<span class="aprobado-sello">✅ Aprobado</span>${
                    // Si Meta recibió la compra (API de Conversiones, functions/index.js)
                    datos.metaCapi?.enviado
                      ? `<span class="meta-sello">📡 Meta ✓${datos.metaCapi.prueba ? " (prueba)" : ""}</span>`
                      : datos.metaCapi?.error
                        ? `<span class="meta-sello error" title="${esc(datos.metaCapi.error)}">📡 Meta ✗</span>`
                        : ""
                  }`
            }

            <button class="eliminar-btn" type="button">🗑 Eliminar</button>

          </div>

        `;


        // =============================================
        // APROBAR PAGO
        // =============================================

        const aprobar =
          card.querySelector(
            ".aprobar-btn"
          );


        if (aprobar) {

          aprobar.addEventListener(
            "click",
            async () => {

              const alertas =
                [...card.querySelectorAll(".card-aviso.alerta, .card-aviso.grave")]
                  .map((aviso) => aviso.textContent);

              const confirmar =
                confirm(
                  alertas.length
                    ? `¿Confirmar este pago?\n\nOJO:\n${alertas.join("\n")}`
                    : "¿Confirmar este pago?"
                );


              if (!confirmar) {
                return;
              }


              try {

                aprobar.disabled =
                  true;


                aprobar.innerText =
                  "⏳ GENERANDO NÚMEROS...";


                let cantidad =
                  Number(
                    datos.chancesFinales
                  );


                if (!cantidad) {

                  cantidad =
                    cantidadPorPack(
                      datos.pack
                    );

                }


                if (!cantidad) {

                  alert(
                    "❌ No se pudo determinar la cantidad de chances."
                  );

                  aprobar.disabled =
                    false;

                  aprobar.innerText =
                    "✅ APROBAR PAGO";

                  return;

                }


                const numeros =
                  await generarNumerosUnicos(
                    cantidad
                  );


          let precioFinal = 0;

// Primero intenta recuperar el precio REAL
// que tenía la compra cuando fue realizada.

if (datos.pack) {

  const textoPack =
    datos.pack.toString();

  const coincidenciaPrecio =
    textoPack.match(/\$\s*([\d.]+)/);

  if (coincidenciaPrecio) {

    precioFinal =
      Number(
        coincidenciaPrecio[1]
          .replace(/\./g, "")
      );

  }
}

// Si no encontró precio dentro de "pack",
// usa el precioFinal que ya exista.

if (
  !precioFinal &&
  Number(datos.precioFinal) > 0
) {

  precioFinal =
    Number(datos.precioFinal);

}

// Promos como último respaldo.

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER50"
) {

  precioFinal = 11999;

}

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER100"
) {

  precioFinal = 14999;

}

// Último respaldo por cantidad.

if (!precioFinal) {

  precioFinal =
    precioPorChances(cantidad);

}

                await updateDoc(

                  doc(
                    db,
                    "participantes",
                    id
                  ),

                  {

                    estado:
                      "Pagado",

                    chancesFinales:
                      cantidad,

                    precioFinal:
                      precioFinal,

                    numeros:
                      numeros

                  }

                );
// Actualizar ranking
await actualizarRanking(
  datos,
  cantidad
);

// Actualizar "Ver mis números"
await actualizarConsulta(
  dniDe(datos)
);

                alert(
                  `✅ Pago aprobado.\n\nSe asignaron ${cantidad} números.`
                );


                await cargarParticipantes();


              } catch (error) {

                console.error(
                  "ERROR APROBANDO:",
                  error
                );


                alert(
                  "❌ Error al aprobar el pago.\n\n" +
                  error.message
                );


                aprobar.disabled =
                  false;

                aprobar.innerText =
                  "✅ APROBAR PAGO";

              }

            }
          );

        }


        // =============================================
        // ELIMINAR
        // =============================================

        const eliminar =
          card.querySelector(
            ".eliminar-btn"
          );


        if (eliminar) {

          eliminar.addEventListener(
            "click",
            async () => {

              const confirmar =
                confirm(
                  `¿Eliminar a ${datos.nombre || ""} ${datos.apellido || ""}?`
                );


              if (!confirmar) {
                return;
              }


              try {

                await eliminarCompra(id, datos);

                await cargarParticipantes();


              } catch (error) {

                console.error(
                  "ERROR ELIMINANDO:",
                  error
                );


                alert(
                  "❌ No se pudo eliminar.\n\n" +
                  error.message
                );

              }

            }
          );

        }


        // =============================================
        // MOSTRAR
        // =============================================

        if (
          datos.estado === "Pagado"
        ) {

          pagados.appendChild(
            card
          );

          cantidadPagados++;

        } else {

          pendientes.appendChild(
            card
          );

          cantidadPendientes++;

        }

      }
    );


    // =================================================
    // CONTADORES
    // =================================================

    if (tituloPendientes) {

      tituloPendientes.textContent =
        `Pendientes (${cantidadPendientes})`;

    }


    if (tituloPagados) {

      tituloPagados.textContent =
        `Aprobados (${cantidadPagados})`;

    }


    if (totalParticipantes) {

      totalParticipantes.textContent =
        dniUnicos.size.toLocaleString("es-AR");

    }


    // =================================================
    // MOSTRAR RECAUDACIÓN
    // =================================================

    if (recaudacionTotal) {

      recaudacionTotal.textContent =
        `$${recaudacion.toLocaleString("es-AR")}`;

    }


    if (recaudacionPendiente) {

      recaudacionPendiente.textContent =
        porAprobar > 0
          ? `+ $${porAprobar.toLocaleString("es-AR")} por aprobar`
          : "Nada por aprobar";

    }


    mostrarBorrados();

    mostrarRepetidas(participantes);


    mostrarIngresosDiarios(participantes, {
      precioDeCompra,
      mostrarResumen,
      nombreClave: nombreOrigenCompra,
      esDeAnuncio,
      borrados: () => borradosCargados,
      diaDeBorrado: (datos) =>
        datos.fechaCompra?.toDate ? diaArgentina(datos.fechaCompra.toDate()) : "",
      origenDeBorrado: (datos) =>
        datos.origen || (/CLAVE MENOS/i.test(datos.pack || "") ? "📣 Anuncio" : "")
    });


    if (statOrigen) {

      const total =
        Object.values(porOrigen).reduce((suma, grupo) => suma + grupo.monto, 0);

      const filas =
        ["📣 Anuncio", "🌱 Orgánico"].map((nombre) => {
          const grupo = porOrigen[nombre] || { compras: 0, monto: 0 };
          const parte = total ? Math.round((grupo.monto / total) * 100) : 0;
          return { nombre: `${nombre} · ${parte}%`, ...grupo };
        });

      if (total) {
        mostrarResumen(statOrigen, filas);
      } else {
        statOrigen.textContent = "Todavía no hay compras aprobadas";
      }

    }


    if (tituloAnuncio) {
      tituloAnuncio.textContent =
        `📣 Anuncio (${cantidadAnuncio})`;
    }

    if (tituloOrganico) {
      tituloOrganico.textContent =
        `🌱 Orgánico (${cantidadOrganico})`;
    }

    if (anuncioVacio) {
      anuncioVacio.hidden = cantidadAnuncio > 0;
    }

    if (organicoVacio) {
      organicoVacio.hidden = cantidadOrganico > 0;
    }


    // Totales (sin el filtro del buscador)
    if (statPendientes) {
      statPendientes.textContent =
        participantes.filter(({ datos }) => datos.estado !== "Pagado").length;
    }

    if (statPagados) {
      statPagados.textContent =
        participantes.filter(({ datos }) => datos.estado === "Pagado").length;

    }


    // Sin esperar: los avisos de "mismo comprobante" aparecen solos
    marcarMismoComprobante(participantes, tarjetasPendientes)
      .catch((error) => console.warn("No se pudieron comparar los comprobantes:", error));


    // =================================================
    // SIN PARTICIPANTES
    // =================================================

    if (
      participantes.length === 0
    ) {

      pendientes.innerHTML = `

        <p>
          No hay participantes en Firebase.
        </p>

      `;

    }


    console.log(
      "Participantes encontrados:",
      participantes.length
    );


    console.log(
      "Recaudación:",
      recaudacion
    );


  } catch (error) {

    console.error(
      "ERROR CARGANDO FIREBASE:",
      error
    );


    pendientes.innerHTML = `

      <div style="
        padding:20px;
        border:1px solid #f00;
        border-radius:10px;
      ">

        <h3>
          ❌ ERROR CON FIREBASE
        </h3>

        <p>
          ${error.message}
        </p>

        <p>
          Abrí F12 → Console para ver
          el error completo.
        </p>

      </div>

    `;

  }

}


// =====================================================
// BUSCADOR
// =====================================================

if (buscador) {

  let esperaBuscador = null;

  buscador.addEventListener(
    "input",
    () => {

      if (!adminActivo) {
        return;
      }

      // Espera a que termines de escribir y filtra
      // la lista ya descargada (no vuelve a leer Firebase)
      clearTimeout(esperaBuscador);

      esperaBuscador =
        setTimeout(
          () => cargarParticipantes({ usarCache: true }),
          250
        );

    }
  );

}


// =====================================================
// APROBAR TODOS
// =====================================================

if (aprobarTodos) {

  aprobarTodos.addEventListener(
    "click",
    async () => {

      const confirmar =
        confirm(
          "¿Aprobar TODOS los pagos pendientes?"
        );


      if (!confirmar) {
        return;
      }


      try {

        const participantes =
          await obtenerParticipantes();


        let aprobados = 0;

        const dnisAprobados = new Set();


        for (
          const participante
          of participantes
        ) {

          const datos =
            participante.datos;


          if (
            datos.estado === "Pagado"
          ) {

            continue;

          }


          let cantidad =
            Number(
              datos.chancesFinales
            );


          if (!cantidad) {

            cantidad =
              cantidadPorPack(
                datos.pack
              );

          }


          if (!cantidad) {
            continue;
          }


          const numeros =
            await generarNumerosUnicos(
              cantidad
            );


let precioFinal = 0;

// Primero intenta recuperar el precio REAL
// que tenía la compra cuando fue realizada.

if (datos.pack) {

  const textoPack =
    datos.pack.toString();

  const coincidenciaPrecio =
    textoPack.match(/\$\s*([\d.]+)/);

  if (coincidenciaPrecio) {

    precioFinal =
      Number(
        coincidenciaPrecio[1]
          .replace(/\./g, "")
      );

  }
}

// Si no encontró precio dentro de "pack",
// usa el precioFinal que ya exista.

if (
  !precioFinal &&
  Number(datos.precioFinal) > 0
) {

  precioFinal =
    Number(datos.precioFinal);

}

// Promos como último respaldo.

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER50"
) {

  precioFinal = 11999;

}

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER100"
) {

  precioFinal = 14999;

}

// Último respaldo por cantidad.

if (!precioFinal) {

  precioFinal =
    precioPorChances(cantidad);

}


          await updateDoc(

            doc(
              db,
              "participantes",
              participante.id
            ),

            {

              estado:
                "Pagado",

              chancesFinales:
                cantidad,

              precioFinal:
                precioFinal,

              numeros:
                numeros

            }

          );
// Actualizar ranking
await actualizarRanking(
  datos,
  cantidad
);

          dnisAprobados.add(
            dniDe(datos)
          );

          aprobados++;

        }


        // Actualizar "Ver mis números" solo de los aprobados
        for (const dni of dnisAprobados) {
          await actualizarConsulta(dni);
        }

        alert(
          `✅ ${aprobados} pagos aprobados.`
        );


        await cargarParticipantes();


      } catch (error) {

        console.error(
          error
        );


        alert(
          "❌ Error aprobando pagos.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// BORRAR TODO
// =====================================================

if (borrarTodo) {

  borrarTodo.addEventListener(
    "click",
    async () => {

      // Antes de borrar: guardar los compradores para Meta
      // (después del borrado ya no se pueden recuperar)
      if (
        confirm(
          "Antes de borrar: ¿querés descargar los compradores para Meta?\n\n" +
          "Aceptar = descargar el archivo ahora\n" +
          "Cancelar = seguir sin descargar"
        )
      ) {

        try {
          await exportarParaMeta();
        } catch (error) {
          alert(
            "❌ No se pudo exportar para Meta, así que no se borra nada.\n\n" +
            error.message
          );
          return;
        }

      }

      const texto =
        prompt(
          "Escribí BORRAR para eliminar TODOS los participantes."
        );


      if (
        texto !== "BORRAR"
      ) {

        alert(
          "Operación cancelada."
        );

        return;

      }


      try {

        const participantes =
          await obtenerParticipantes();


        for (
          const participante
          of participantes
        ) {

          const datos =
            participante.datos;


          // -----------------------------------------
          // BORRAR COMPROBANTE
          // -----------------------------------------

          if (
            datos.comprobantePath
          ) {

            try {

              await deleteObject(
                ref(
                  storage,
                  datos.comprobantePath
                )
              );

            } catch (error) {

              console.warn(
                "No se pudo borrar archivo:",
                error
              );

            }

          }


          // -----------------------------------------
          // BORRAR PARTICIPANTE
          // -----------------------------------------

          await deleteDoc(

            doc(
              db,
              "participantes",
              participante.id
            )

          );

        }


        // Vaciar "Ver mis números"
        await actualizarTodasLasConsultas();

        // Vaciar el ranking (si no, el top 5 sigue mostrando
        // las chances del sorteo anterior)
        const borradosRanking =
          await vaciarRanking();

        alert(
          `✅ Todos los participantes fueron eliminados.

Ranking reiniciado (${borradosRanking} entradas borradas).`
        );


        await cargarParticipantes();


      } catch (error) {

        console.error(
          error
        );


        alert(
          "❌ Error eliminando datos.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// EXPORTAR SORTEO
// =====================================================

if (exportarSorteo) {

  exportarSorteo.addEventListener(
    "click",
    async () => {

      try {

        const participantes =
          await obtenerParticipantes();


        const filas = [];


        participantes.forEach(
          (participante) => {

            const datos =
              participante.datos;


            if (
              datos.estado !== "Pagado"
            ) {

              return;

            }


            if (
              !Array.isArray(
                datos.numeros
              )
            ) {

              return;

            }


            datos.numeros.forEach(
              (numero) => {

                filas.push({

                  numero:
                    numero,

                  nombre:
                    `${datos.nombre || ""} ${datos.apellido || ""}`,

                  dni:
                    datos.dni || "",

                  telefono:
                    datos.telefono || "",

                  instagram:
                    datos.instagram || ""

                });

              }
            );

          }
        );


        if (
          typeof XLSX ===
          "undefined"
        ) {

          alert(
            "❌ No está cargada la librería de Excel."
          );

          return;

        }


        const hoja =
          XLSX.utils.json_to_sheet(
            filas
          );


        const libro =
          XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
          libro,
          hoja,
          "Sorteo"
        );


        XLSX.writeFile(
          libro,
          "sorteo.xlsx"
        );


      } catch (error) {

        console.error(
          "ERROR EXPORTANDO:",
          error
        );


        alert(
          "❌ No se pudo exportar.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// INICIO
// =====================================================

console.log(
  "✅ ADMIN NUEVO CARGADO"
);


// La carga empieza en alCambiarSesion, cuando entra el admin.



// =====================================================
// REVISAR COMPROBANTES (sin archivo, vacíos o faltantes)
// =====================================================
// Recorre todas las compras y revisa el archivo de cada una
// en Storage. Lista solo las que tienen algún problema.

const btnRevisarComprobantes =
  document.getElementById("revisarComprobantes");

const resultadoRevision =
  document.getElementById("resultadoRevision");

// Menos de esto se marca como "muy liviano" (sospechoso)
const KB_SOSPECHOSO = 10;


async function revisarUnComprobante(participante) {

  const datos =
    participante.datos;

  const path =
    (datos.comprobantePath || "")
      .toString()
      .replace(/^\/+/, "");

  if (!path && !datos.comprobanteURL) {
    return { tipo: "sin", texto: "❌ Sin comprobante" };
  }

  if (!path) {
    // Compras viejas con link pero sin ruta: no se puede medir
    return { tipo: "sinRuta", texto: "📎 Sin ruta (formato viejo)" };
  }

  try {

    const meta =
      await getMetadata(ref(storage, path));

    const bytes =
      Number(meta.size) || 0;

    if (bytes === 0) {
      return { tipo: "vacio", texto: "⚠️ Archivo vacío (0 KB)" };
    }

    if (bytes < KB_SOSPECHOSO * 1024) {
      return {
        tipo: "liviano",
        texto: `🔍 Muy liviano (${(bytes / 1024).toFixed(1)} KB)`
      };
    }

    return null;

  } catch (error) {

    if (error.code === "storage/object-not-found") {
      return { tipo: "falta", texto: "🚫 Archivo no encontrado" };
    }

    return { tipo: "error", texto: `❓ No se pudo revisar (${error.code || error.message})` };

  }

}


function mostrarRevision(todos, total) {

  resultadoRevision.innerHTML = "";

  // Las "sin ruta" se listan aparte: tienen comprobante (link),
  // solo que no se puede medir el archivo.
  const sinRuta =
    todos.filter((p) => p.problema.tipo === "sinRuta");

  const problemas =
    todos.filter((p) => p.problema.tipo !== "sinRuta");

  const caja =
    document.createElement("div");

  caja.className = "revision-caja";

  const titulo =
    document.createElement("h3");

  titulo.style.margin = "0 0 10px";

  titulo.textContent =
    problemas.length
      ? `🧾 ${problemas.length} compra${problemas.length === 1 ? "" : "s"} con problemas (de ${total} revisadas)`
      : `✅ Las ${total} compras tienen comprobante válido`;

  caja.appendChild(titulo);

  // Pendientes primero: son las que todavía podés rechazar
  problemas.sort((a, b) =>
    (a.datos.estado === "Pagado") - (b.datos.estado === "Pagado")
  );

  problemas.forEach(({ datos, problema }) => {

    const fila =
      document.createElement("div");

    fila.className = "revision-fila";

    const linea1 =
      document.createElement("div");

    linea1.style.fontWeight = "700";

    linea1.textContent =
      `${problema.texto} — ${datos.nombre || ""} ${datos.apellido || ""}`;

    const linea2 =
      document.createElement("div");

    linea2.className = "revision-detalle";

    linea2.textContent =
      `DNI ${datos.dni || "-"} · ${datos.estado || "-"} · ${datos.pack || "-"}`;

    fila.appendChild(linea1);
    fila.appendChild(linea2);

    // Tocar la fila busca a la persona en el admin
    fila.style.cursor = "pointer";
    fila.title = "Buscar en el panel";
    fila.addEventListener("click", () => {
      if (buscador) {
        buscador.value =
          String(datos.dni || datos.nombre || "");
        buscador.dispatchEvent(new Event("input"));
        buscador.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    caja.appendChild(fila);

  });

  if (sinRuta.length) {

    const detalle =
      document.createElement("details");

    detalle.className = "revision-sin-ruta";

    const resumen =
      document.createElement("summary");


    const pagadas =
      sinRuta.filter((p) => p.datos.estado === "Pagado").length;

    resumen.textContent =
      `📎 ${sinRuta.length} compra${sinRuta.length === 1 ? "" : "s"} sin ruta de archivo (formato viejo) · ${pagadas} pagada${pagadas === 1 ? "" : "s"} · tocá para ver`;

    detalle.appendChild(resumen);

    sinRuta.forEach(({ datos }) => {

      const fila =
        document.createElement("div");

      fila.className = "revision-fila chica";

      fila.textContent =
        `${datos.nombre || ""} ${datos.apellido || ""} · DNI ${datos.dni || "-"} · ${datos.estado || "-"} · ${datos.pack || "-"} `;

      if (datos.comprobanteURL) {
        const link = document.createElement("a");
        link.href = datos.comprobanteURL;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "ver comprobante";
        fila.appendChild(link);
      }

      detalle.appendChild(fila);

    });

    caja.appendChild(detalle);

  }

  const cerrar =
    document.createElement("button");

  cerrar.textContent = "Cerrar";
  cerrar.className = "boton-sec";
  cerrar.addEventListener("click", () => {
    resultadoRevision.innerHTML = "";
  });

  caja.appendChild(cerrar);

  resultadoRevision.appendChild(caja);

}


if (btnRevisarComprobantes && resultadoRevision) {

  btnRevisarComprobantes.addEventListener(
    "click",
    async () => {

      btnRevisarComprobantes.disabled = true;

      try {

        const participantes =
          await obtenerParticipantes();

        const problemas = [];
        let revisados = 0;

        // De a 15 a la vez para que no tarde tanto
        const cola = [...participantes];

        async function trabajador() {
          while (cola.length) {
            const participante = cola.shift();
            const problema = await revisarUnComprobante(participante);
            if (problema) {
              problemas.push({ datos: participante.datos, problema });
            }
            revisados++;
            if (revisados % 25 === 0 || revisados === participantes.length) {
              resultadoRevision.textContent =
                `⏳ Revisando comprobantes... ${revisados} de ${participantes.length}`;
            }
          }
        }

        resultadoRevision.textContent =
          `⏳ Revisando comprobantes... 0 de ${participantes.length}`;

        await Promise.all(
          Array.from({ length: 15 }, trabajador)
        );

        mostrarRevision(problemas, participantes.length);

      } catch (error) {

        console.error(error);

        resultadoRevision.textContent =
          "❌ Error revisando comprobantes: " + error.message;

      } finally {

        btnRevisarComprobantes.disabled = false;

      }

    }
  );

}


// =====================================================
// EXPORTAR PARA META (público personalizado)
// =====================================================
// Arma un CSV para subir en Meta → Públicos → Lista de clientes.
// Solo pagos aprobados, una fila por persona (DNI) con el total
// que gastó (value), así se puede crear un público similar
// basado en valor. No incluye DNI ni Instagram.

const botonExportarMeta =
  document.getElementById("exportarMeta");


// Teléfono argentino en formato internacional: 549 + área + número
// ("2494 15 123456" → "5492494123456"). "" si no se puede armar.
function telefonoParaMeta(telefono) {

  let digitos =
    String(telefono || "").replace(/\D/g, "");

  if (digitos.startsWith("549")) {
    digitos = digitos.slice(3);
  } else if (digitos.startsWith("54")) {
    digitos = digitos.slice(2);
  }

  digitos = digitos.replace(/^0+/, "");

  // Sacar el "15" que va después del código de área
  if (digitos.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (digitos.substr(largoArea, 2) === "15") {
        digitos = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
        break;
      }
    }
  }

  return digitos.length === 10 ? `549${digitos}` : "";

}


function textoParaMeta(texto) {
  return String(texto || "").trim().toLowerCase();
}


function celdaCsv(valor) {
  const texto = String(valor ?? "");
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}


// Descarga el CSV. Devuelve true si se descargó.
async function exportarParaMeta() {

  const participantes =
    await obtenerParticipantes();

  // Una persona = un DNI: se suma todo lo que gastó
  const personas = new Map();

  participantes.forEach(({ datos }) => {

    if (datos.estado !== "Pagado") {
      return;
    }

    const clave =
      dniDe(datos) || telefonoParaMeta(datos.telefono);

    if (!clave) {
      return;
    }

    const persona =
      personas.get(clave) || {
        phone: telefonoParaMeta(datos.telefono),
        fn: textoParaMeta(datos.nombre),
        ln: textoParaMeta(datos.apellido),
        country: "ar",
        value: 0
      };

    persona.value += precioDeCompra(datos);

    personas.set(clave, persona);

  });

  const filas =
    [...personas.values()].filter((p) => p.phone || (p.fn && p.ln));

  if (!filas.length) {
    alert("No hay compras aprobadas para exportar.");
    return false;
  }

  const columnas = ["phone", "fn", "ln", "country", "value"];

  const csv = [
    columnas.join(","),
    ...filas.map((fila) => columnas.map((c) => celdaCsv(fila[c])).join(","))
  ].join("\n");

  const archivo =
    new Blob([csv], { type: "text/csv;charset=utf-8" });

  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(archivo);
  enlace.download =
    `meta-compradores-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);

  const sinTelefono =
    filas.filter((f) => !f.phone).length;

  alert(
    `✅ Archivo listo: ${filas.length} compradores.` +
    (sinTelefono
      ? `\n\n${sinTelefono} sin teléfono válido (van solo con nombre y apellido).`
      : "") +
    "\n\nSubilo en Meta → Públicos → tu público de compradores → Agregar clientes."
  );

  return true;

}


if (botonExportarMeta) {

  botonExportarMeta.addEventListener("click", async () => {

    botonExportarMeta.disabled = true;

    try {

      await exportarParaMeta();

    } catch (error) {

      console.error("ERROR EXPORTANDO PARA META:", error);

      alert("❌ No se pudo exportar.\n\n" + error.message);

    } finally {

      botonExportarMeta.disabled = false;

    }

  });

}
