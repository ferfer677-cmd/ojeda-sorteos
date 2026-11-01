// ======================================================
// INGRESOS POR DÍA (PANEL ADMIN)
// ======================================================
// Gráfico de barras por día y detalle del día elegido.
// La plata cuenta el día en que se hizo la compra, en hora de Argentina.

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

  const mejor =
    delPeriodo.reduce((a, b) => (b.monto > a.monto ? b : a), delPeriodo[0]);

  document.getElementById("periodoDiario").textContent =
    `En ${plural(dias.length, "día")}: ${pesos(monto)} · ${plural(cantidad, "compra")}` +
    ` · promedio ${pesos(monto / dias.length)} por día` +
    (mejor.monto ? ` · mejor día: ${diaCorto(mejor.dia)} (${pesos(mejor.monto)})` : "");

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

  return [...grupos.values()].sort((a, b) => b.monto - a.monto);

}

function nombrePack(datos) {

  const chances =
    Number(datos.chancesFinales) ||
    Number((String(datos.pack || "").match(/(\d+)\s*CHANCE/i) || [])[1]) ||
    0;

  return chances ? plural(chances, "chance") : "Sin dato";

}

function mostrarDetalle(totales) {

  const del = compras.filter(({ dia }) => dia === diaElegido);
  const aprobadas = del.filter(({ datos }) => datos.estado === "Pagado");
  const sinAprobar = del.filter(({ datos }) => datos.estado !== "Pagado");

  const total = totales.get(diaElegido) || { monto: 0, compras: 0 };
  const anterior = totales.get(sumarDias(diaElegido, -1)) || { monto: 0 };

  const porAprobar =
    sinAprobar.reduce((suma, { datos }) => suma + ayudas.precioDeCompra(datos), 0);

  document.getElementById("diaTitulo").textContent = diaLargo(diaElegido);
  document.getElementById("diaMonto").textContent = pesos(total.monto);
  document.getElementById("diaCompras").textContent = total.compras.toLocaleString("es-AR");
  document.getElementById("diaPromedio").textContent =
    total.compras ? pesos(total.monto / total.compras) : "-";
  document.getElementById("diaPendiente").textContent =
    porAprobar ? `+ ${pesos(porAprobar)} por aprobar` : "Nada por aprobar";

  let cambio = "Sin ventas el día anterior";

  if (anterior.monto) {
    const parte = Math.round(((total.monto - anterior.monto) / anterior.monto) * 100);
    cambio = `${parte > 0 ? "▲ +" : parte < 0 ? "▼ " : ""}${parte}%`;
  }

  document.getElementById("diaCambio").textContent = cambio;

  const pintar = (id, grupos) => {
    const elemento = document.getElementById(id);
    if (grupos.length) {
      ayudas.mostrarResumen(elemento, grupos);
    } else {
      elemento.textContent = "Sin compras aprobadas";
    }
  };

  pintar("diaOrigen", agrupar(aprobadas, ayudas.nombreOrigen));
  pintar("diaClaves", agrupar(aprobadas, ayudas.nombreClave));
  pintar("diaPacks", agrupar(aprobadas, nombrePack));

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
    panelListo = true;
  }

  pintar();

}
