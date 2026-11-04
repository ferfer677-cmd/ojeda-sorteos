// ======================================================
// INGRESOS POR DÍA (PANEL ADMIN)
// ======================================================
// Gráfico de barras por día y detalle del día elegido.
// La plata cuenta el día en que se hizo la compra, en hora de Argentina.
// Incluye la calculadora de comisiones (botón "💸 Comisiones").

import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const ZONA = "America/Argentina/Buenos_Aires";

const formatoClave =
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

const UN_DIA = 86400000;

// Lo que se recibe de admin.js y se conserva entre recargas de la lista
let compras = [];
let ayudas = null;
let rango = "30";
let diaElegido = "";
let panelListo = false;

const pesos = (monto) =>
  `$${Math.round(monto).toLocaleString("es-AR")}`;

const plural = (cantidad, palabra) =>
  `${cantidad.toLocaleString("es-AR")} ${palabra}${cantidad === 1 ? "" : "s"}`;


// ======================================================
// FECHAS
// ======================================================

function diaDeFecha(fecha) {

  const valor =
    fecha && typeof fecha.toDate === "function"
      ? fecha.toDate()
      : fecha
        ? new Date(fecha)
        : null;

  if (!valor || Number.isNaN(valor.getTime())) {
    return "";
  }

  return formatoClave.format(valor);

}

const hoy = () => formatoClave.format(new Date());

const aUtc = (dia) => Date.parse(`${dia}T00:00:00Z`);

const sumarDias = (dia, cantidad) =>
  new Date(aUtc(dia) + cantidad * UN_DIA).toISOString().slice(0, 10);

function textoDia(dia, opciones) {
  return new Date(aUtc(dia)).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    ...opciones
  });
}

const diaLargo = (dia) => {
  const texto = textoDia(dia, { weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const diaCorto = (dia) =>
  textoDia(dia, { day: "numeric", month: "numeric" });


// ======================================================
// DATOS
// ======================================================

function totalesPorDia() {

  const totales = new Map();

  compras.forEach(({ datos, dia }) => {

    if (!dia || datos.estado !== "Pagado") return;

    const total = totales.get(dia) || { monto: 0, compras: 0 };

    total.monto += ayudas.precioDeCompra(datos);
    total.compras++;

    totales.set(dia, total);

  });

  return totales;

}

// Todos los días del rango, también los que no tuvieron ventas
function diasDelRango(totales) {

  const ultimo = hoy();

  let primero;

  if (rango === "todo") {
    primero = [...totales.keys()].sort()[0] || ultimo;
  } else {
    primero = sumarDias(ultimo, 1 - Number(rango));
  }

  const dias = [];

  for (let dia = primero; dia <= ultimo; dia = sumarDias(dia, 1)) {
    dias.push(dia);
  }

  return dias;

}

// Tope redondo para la escala: 1, 2 o 5 por una potencia de 10
function topeRedondo(maximo) {

  if (maximo <= 0) return 1000;

  const potencia = 10 ** Math.floor(Math.log10(maximo));

  const paso = [1, 2, 5, 10].find((p) => p * potencia >= maximo);

  return paso * potencia;

}

const montoCorto = (monto) =>
  monto >= 1000000
    ? `$${(monto / 1000000).toLocaleString("es-AR")} M`
    : monto >= 1000
      ? `$${(monto / 1000).toLocaleString("es-AR")} mil`
      : `$${monto}`;


// ======================================================
// GRÁFICO
// ======================================================

function dibujarBarras(dias, totales) {

  const grafico = document.getElementById("graficoDiario");
  const globo = document.getElementById("globoDiario");

  grafico.innerHTML = "";
  globo.hidden = true;

  const tope =
    topeRedondo(
      Math.max(0, ...dias.map((dia) => totales.get(dia)?.monto || 0))
    );

  const escala = document.createElement("div");
  escala.className = "diario-escala";

  [1, 0.5, 0].forEach((parte) => {
    const linea = document.createElement("span");
    linea.style.bottom = `${parte * 100}%`;
    linea.textContent = parte ? montoCorto(tope * parte) : "$0";
    escala.appendChild(linea);
  });

  const zona = document.createElement("div");
  zona.className = "diario-zona";

  const barras = document.createElement("div");
  barras.className = "diario-barras";

  // Cada cuántos días va una fecha abajo, para que no se pisen
  const saltoFechas = Math.max(1, Math.ceil(dias.length / 7));

  dias.forEach((dia, indice) => {

    const total = totales.get(dia) || { monto: 0, compras: 0 };

    const columna = document.createElement("button");
    columna.type = "button";
    columna.className = "diario-columna" + (dia === diaElegido ? " elegida" : "");
    columna.setAttribute(
      "aria-label",
      `${diaLargo(dia)}: ${pesos(total.monto)}, ${plural(total.compras, "compra")}`
    );
    columna.setAttribute("aria-pressed", String(dia === diaElegido));

    const barra = document.createElement("i");
    // 196px: la altura de la zona de barras en admin.css
    barra.style.height = total.monto ? `${(total.monto / tope) * 196}px` : "0";
    columna.appendChild(barra);

    if ((dias.length - 1 - indice) % saltoFechas === 0) {
      const fecha = document.createElement("small");
      fecha.textContent = diaCorto(dia);
      columna.appendChild(fecha);
    }

    const mostrarGlobo = () => {

      globo.textContent = "";

      const titulo = document.createElement("b");
      titulo.textContent = diaLargo(dia);

      const detalle = document.createElement("span");
      detalle.textContent = `${pesos(total.monto)} · ${plural(total.compras, "compra")}`;

      globo.append(titulo, detalle);
      globo.hidden = false;

      const caja = globo.offsetParent.getBoundingClientRect();
      const lugar = columna.getBoundingClientRect();
      const ancho = globo.offsetWidth;

      const izquierda =
        lugar.left - caja.left + lugar.width / 2 - ancho / 2;

      globo.style.left =
        `${Math.min(Math.max(izquierda, 0), caja.width - ancho)}px`;

    };

    const ocultarGlobo = () => { globo.hidden = true; };

    columna.addEventListener("mouseenter", mostrarGlobo);
    columna.addEventListener("focus", mostrarGlobo);
    columna.addEventListener("mouseleave", ocultarGlobo);
    columna.addEventListener("blur", ocultarGlobo);
    columna.addEventListener("click", () => elegirDia(dia));

    barras.appendChild(columna);

  });

  zona.appendChild(barras);
  grafico.append(escala, zona);

  // En rangos largos hay scroll: se arranca viendo lo más nuevo
  zona.scrollLeft = zona.scrollWidth;

}


// ======================================================
// RESUMEN DEL PERÍODO
// ======================================================

function mostrarPeriodo(dias, totales) {

  const delPeriodo =
    dias.map((dia) => ({ dia, ...(totales.get(dia) || { monto: 0, compras: 0 }) }));

  const monto = delPeriodo.reduce((suma, d) => suma + d.monto, 0);
  const cantidad = delPeriodo.reduce((suma, d) => suma + d.compras, 0);

  document.getElementById("periodoDiario").textContent =
    `En ${plural(dias.length, "día")}: ${pesos(monto)} · ${plural(cantidad, "compra")}`;

}


// ======================================================
// DETALLE DEL DÍA
// ======================================================

function agrupar(lista, nombreDe) {

  const grupos = new Map();

  lista.forEach(({ datos }) => {

    const nombre = nombreDe(datos);
    const grupo = grupos.get(nombre) || { nombre, compras: 0, monto: 0 };

    grupo.compras++;
    grupo.monto += ayudas.precioDeCompra(datos);

    grupos.set(nombre, grupo);

  });

  // La de más plata primero; "Otros" siempre al final
  return [...grupos.values()].sort((a, b) =>
    (a.nombre === "Otros") - (b.nombre === "Otros") ||
    b.monto - a.monto
  );

}

function mostrarDetalle(totales) {

  const del = compras.filter(({ dia }) => dia === diaElegido);
  const aprobadas = del.filter(({ datos }) => datos.estado === "Pagado");
  const sinAprobar = del.filter(({ datos }) => datos.estado !== "Pagado");

  const total = totales.get(diaElegido) || { monto: 0, compras: 0 };

  const porAprobar =
    sinAprobar.reduce((suma, { datos }) => suma + ayudas.precioDeCompra(datos), 0);

  document.getElementById("diaTitulo").textContent = diaLargo(diaElegido);
  document.getElementById("diaMonto").textContent = pesos(total.monto);
  document.getElementById("diaCompras").textContent = total.compras.toLocaleString("es-AR");
  document.getElementById("diaPendiente").textContent =
    porAprobar ? `+ ${pesos(porAprobar)} por aprobar` : "Nada por aprobar";

  const claves = document.getElementById("diaClaves");
  const grupos = agrupar(aprobadas, ayudas.nombreClave);

  if (grupos.length) {
    ayudas.mostrarResumen(claves, grupos);
  } else {
    claves.textContent = "Sin compras aprobadas";
  }

}


// ======================================================
// PINTAR Y CONTROLES
// ======================================================

function pintar() {

  const totales = totalesPorDia();
  const dias = diasDelRango(totales);

  document.querySelectorAll("#rangoDiario button").forEach((boton) => {
    boton.setAttribute("aria-pressed", String(boton.dataset.rango === rango));
  });

  const selector = document.getElementById("selectorDia");
  selector.max = hoy();
  selector.value = diaElegido;

  dibujarBarras(dias, totales);
  mostrarPeriodo(dias, totales);
  mostrarDetalle(totales);
  pintarComisiones();

}


// ======================================================
// COMISIONES
// ======================================================
// Recaudado por anuncios (compras aprobadas que vinieron de un
// anuncio de Facebook o Instagram) menos lo que se gastó en
// anuncios, y eso se reparte 70/30. Lo orgánico no entra.
// Las compras de anuncios borradas ya no suman (no están en la
// lista); se muestra cuánto fue, por el día en que se compraron.
// El gasto se guarda en Firestore (gastos_anuncios/{día} o
// gastos_anuncios/todo), así queda igual en la compu y en el celu.

const PARTE_MAYOR = 0.7;

let modoComisiones = "dia";

// Gasto cargado por clave ("2026-11-04" o "todo")
const gastos = new Map();

const claveGasto = () => (modoComisiones === "todo" ? "todo" : diaElegido);

const soloNumeros = (texto) => Number(String(texto || "").replace(/\D/g, "")) || 0;

function recaudadoPorAnuncios() {
  return compras
    .filter(({ datos, dia }) =>
      datos.estado === "Pagado" &&
      ayudas.esDeAnuncio(datos) &&
      (modoComisiones === "todo" || dia === diaElegido)
    )
    .reduce((suma, { datos }) => suma + ayudas.precioDeCompra(datos), 0);
}

// Borradas que venían de anuncios, en el día o en todo el sorteo
function borradasDeAnuncios() {
  const lista = (ayudas.borrados?.() || []).filter(({ datos }) =>
    ayudas.origenDeBorrado(datos) === "📣 Anuncio" &&
    (modoComisiones === "todo" || ayudas.diaDeBorrado(datos) === diaElegido)
  );
  return {
    compras: lista.length,
    monto: lista.reduce((suma, { datos }) => suma + (Number(datos.monto) || 0), 0)
  };
}

export function actualizarComisiones() {
  if (ayudas) pintarComisiones();
}

function pintarComisiones() {

  const caja = document.getElementById("comisiones");

  if (!caja || caja.hidden) return;

  document.querySelectorAll("#modoComisiones button").forEach((boton) => {
    boton.setAttribute("aria-pressed", String(boton.dataset.modo === modoComisiones));
  });

  document.getElementById("comisionesPeriodo").textContent =
    modoComisiones === "todo"
      ? "Todo el sorteo, hasta ahora"
      : `${diaLargo(diaElegido)}${diaElegido === hoy() ? " (hasta ahora)" : ""}`;

  const campo = document.getElementById("gastoAnuncios");
  const clave = claveGasto();

  // Al cambiar de día o de modo, trae el gasto guardado
  if (campo.dataset.clave !== clave) {
    campo.dataset.clave = clave;
    campo.value = gastos.has(clave) ? formatear(gastos.get(clave)) : "";
    if (!gastos.has(clave)) cargarGasto(clave);
  }

  const anuncios = recaudadoPorAnuncios();
  const gasto = soloNumeros(campo.value);
  const neto = anuncios - gasto;

  document.getElementById("comisionesAnuncios").textContent = pesos(anuncios);

  const borradas = borradasDeAnuncios();
  document.getElementById("comisionesBorradas").textContent =
    borradas.compras
      ? `Ya descontado: ${pesos(borradas.monto)} de ${plural(borradas.compras, "compra")} de anuncios borrada${borradas.compras === 1 ? "" : "s"}`
      : "Sin compras de anuncios borradas";
  document.getElementById("comisionesNeto").textContent =
    neto < 0 ? `-${pesos(-neto)}` : pesos(neto);
  document.getElementById("comisionesNeto").classList.toggle("negativo", neto < 0);

  const mayor = Math.round(neto * PARTE_MAYOR);
  const menor = neto - mayor;
  const conSigno = (monto) => (monto < 0 ? `-${pesos(-monto)}` : pesos(monto));

  document.getElementById("comisiones70").textContent = conSigno(mayor);
  document.getElementById("comisiones30").textContent = conSigno(menor);

}

const formatear = (monto) => (monto ? monto.toLocaleString("es-AR") : "");

async function cargarGasto(clave) {
  try {
    const guardado = await getDoc(doc(db, "gastos_anuncios", clave));
    gastos.set(clave, Number(guardado.get("monto")) || 0);
    const campo = document.getElementById("gastoAnuncios");
    // Si mientras tanto no cambió de día ni escribió nada
    if (campo.dataset.clave === clave && !campo.value) {
      campo.value = formatear(gastos.get(clave));
      pintarComisiones();
    }
  } catch (error) {
    console.warn("No se pudo leer el gasto de anuncios:", error);
  }
}

// Una espera por día (o "todo"): cambiar de día no cancela lo anterior
const esperasGuardar = new Map();

function guardarGasto(clave, monto) {
  clearTimeout(esperasGuardar.get(clave));
  const nota = document.getElementById("comisionesNota");
  esperasGuardar.set(clave, setTimeout(async () => {
    try {
      await setDoc(doc(db, "gastos_anuncios", clave), { monto, actualizado: serverTimestamp() });
      nota.textContent = "✅ Gasto guardado.";
    } catch (error) {
      console.warn("No se pudo guardar el gasto de anuncios:", error);
      nota.textContent = "⚠️ No se pudo guardar el gasto. La cuenta igual está bien.";
    }
  }, 700));
}

function prepararComisiones() {

  const boton = document.getElementById("botonComisiones");
  const caja = document.getElementById("comisiones");
  const campo = document.getElementById("gastoAnuncios");

  if (!boton || !caja) return;

  boton.addEventListener("click", () => {
    caja.hidden = !caja.hidden;
    boton.setAttribute("aria-expanded", String(!caja.hidden));
    pintarComisiones();
    if (!caja.hidden) caja.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  document.querySelectorAll("#modoComisiones button").forEach((opcion) => {
    opcion.addEventListener("click", () => {
      modoComisiones = opcion.dataset.modo;
      pintarComisiones();
    });
  });

  campo.addEventListener("input", () => {
    const monto = soloNumeros(campo.value);
    campo.value = formatear(monto);
    gastos.set(claveGasto(), monto);
    guardarGasto(claveGasto(), monto);
    pintarComisiones();
  });

}

function elegirDia(dia) {

  diaElegido = dia;

  // Si el día queda afuera del gráfico, se muestra todo
  if (rango !== "todo" && dia < sumarDias(hoy(), 1 - Number(rango))) {
    rango = "todo";
  }

  pintar();

}

function prepararControles() {

  document.querySelectorAll("#rangoDiario button").forEach((boton) => {
    boton.addEventListener("click", () => {
      rango = boton.dataset.rango;
      pintar();
    });
  });

  document.getElementById("selectorDia").addEventListener("change", (evento) => {
    if (evento.target.value) {
      elegirDia(evento.target.value);
    }
  });

}

export function mostrarIngresosDiarios(participantes, funciones) {

  if (!document.getElementById("graficoDiario")) return;

  ayudas = funciones;

  compras =
    participantes.map(({ datos }) => ({ datos, dia: diaDeFecha(datos.fecha) }));

  diaElegido = diaElegido || hoy();

  if (!panelListo) {
    prepararControles();
    prepararComisiones();
    panelListo = true;
  }

  pintar();

}
