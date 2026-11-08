// ======================================================
// RULETA DEL CIELO (palabra clave "PAPALEON")
// ======================================================
// Se abre al escribir PAPALEON en la palabra clave (script.js).
// Un giro por celular: el premio queda guardado y al volver a
// escribir la palabra se muestra el mismo. Todos los premios son
// ofertas para comprar; se pagan por transferencia como siempre.
//
// Si se cambian estos packs, el vencimiento o las probabilidades,
// cambiarlos también en functions/index.js (PACKS_PAPALEON, para el
// sub admin) y en terminos.html.

(function () {

  const CODIGO = "PAPALEON";

  // 08/11/2026 23:00 hora de Argentina
  const VENCE = Date.parse("2026-11-08T23:00:00-03:00");
  const HORA = "23:00";

  // Todos tienen la misma probabilidad (1 en 6)
  const PREMIOS = [
    { chances: 5, precio: 3000 },
    { chances: 15, precio: 5999 },
    { chances: 40, precio: 9999 },
    { chances: 120, precio: 19999 },
    { chances: 400, precio: 49999 },
    { chances: 1000, precio: 99999 }
  ];

  const GRADOS = 360 / PREMIOS.length;
  const GUARDADO = "ojedaRuletaCielo";

  const pesos = (monto) => `$${Number(monto).toLocaleString("es-AR")}`;

  const sinMovimiento =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function leerPremio() {
    try {
      const guardado = JSON.parse(localStorage.getItem(GUARDADO) || "null");
      return PREMIOS.find((p) => p.chances === guardado?.chances) || null;
    } catch {
      return null;
    }
  }

  function guardarPremio(premio) {
    try {
      localStorage.setItem(GUARDADO, JSON.stringify({ chances: premio.chances }));
    } catch {}
  }

  function sortear() {
    return PREMIOS[Math.floor(Math.random() * PREMIOS.length)];
  }


  // ====================================================
  // PLUMAS Y ESTRELLITAS AL GANAR
  // ====================================================

  function lluviaDelCielo(fondo) {
    if (sinMovimiento) return;
    const piezas = ["🪶", "✨", "⭐", "🤍", "☁️"];
    for (let i = 0; i < 32; i++) {
      const pieza = document.createElement("i");
      pieza.className = "cielo-pluma";
      pieza.textContent = piezas[i % piezas.length];
      pieza.style.left = Math.random() * 100 + "%";
      pieza.style.animationDelay = Math.random() * 0.8 + "s";
      pieza.style.fontSize = 16 + Math.random() * 14 + "px";
      fondo.appendChild(pieza);
      setTimeout(() => pieza.remove(), 3600);
    }
  }


  // ====================================================
  // CARTEL
  // ====================================================

  function crearRueda() {

    const rueda = document.createElement("div");
    rueda.className = "cielo-rueda";

    PREMIOS.forEach((premio, i) => {
      const texto = document.createElement("span");
      texto.innerHTML = `<b>${premio.chances}</b> chances<br>${pesos(premio.precio)}`;
      texto.style.transform = `rotate(${(i + 0.5) * GRADOS - 90}deg) translateX(30px)`;
      rueda.appendChild(texto);
    });

    const centro = document.createElement("div");
    centro.className = "cielo-centro";
    centro.textContent = "👼";
    rueda.appendChild(centro);

    return rueda;

  }

  function mostrarPremio(contenido, fondo, premio, recienGanado) {

    contenido.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.className = "cielo-titulo";
    titulo.textContent = recienGanado ? "😇 ¡Bendecido!" : "😇 Tu premio del cielo";

    const detalle = document.createElement("p");
    detalle.className = "cielo-bajada";
    detalle.textContent = `Te tocaron ${premio.chances} chances a ${pesos(premio.precio)}. Válido hasta hoy a las ${HORA} hs.`;

    const premioCaja = document.createElement("div");
    premioCaja.className = "cielo-premio";
    premioCaja.innerHTML =
      `<b>${premio.chances} chances</b><strong>${pesos(premio.precio)}</strong>` +
      `<small>${pesos(Math.round(premio.precio / premio.chances))} por chance</small>`;

    const comprar = document.createElement("button");
    comprar.type = "button";
    comprar.className = "cielo-boton";
    comprar.textContent = `Comprar ${premio.chances} chances por ${pesos(premio.precio)}`;
    comprar.addEventListener("click", () => {
      if (Date.now() >= VENCE) {
        comprar.disabled = true;
        comprar.textContent = "⏰ La Ruleta del Cielo ya terminó";
        return;
      }
      fondo.remove();
      window.abrirModalPromo(premio.chances, premio.precio, CODIGO, `PROMO ${CODIGO}`);
    });

    contenido.append(titulo, detalle, premioCaja, comprar);

    if (recienGanado) lluviaDelCielo(fondo);

  }

  function abrir() {

    document.getElementById("ruletaCielo")?.remove();

    const fondo = document.createElement("div");
    fondo.id = "ruletaCielo";
    fondo.className = "cielo-overlay";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-modal", "true");
    fondo.setAttribute("aria-label", "Ruleta del Cielo");

    const caja = document.createElement("div");
    caja.className = "cielo-caja";
    caja.innerHTML =
      '<span class="cielo-nube cielo-nube-1"></span>' +
      '<span class="cielo-nube cielo-nube-2"></span>' +
      '<span class="cielo-nube cielo-nube-3"></span>';

    const cerrarBoton = document.createElement("button");
    cerrarBoton.type = "button";
    cerrarBoton.className = "cielo-cerrar";
    cerrarBoton.setAttribute("aria-label", "Cerrar");
    cerrarBoton.textContent = "✕";
    cerrarBoton.addEventListener("click", () => fondo.remove());

    const contenido = document.createElement("div");
    contenido.className = "cielo-contenido";

    caja.append(cerrarBoton, contenido);
    fondo.appendChild(caja);
    document.body.appendChild(fondo);

    fondo.addEventListener("click", (evento) => {
      if (evento.target === fondo) fondo.remove();
    });

    const yaGanado = leerPremio();

    if (yaGanado) {
      mostrarPremio(contenido, fondo, yaGanado, false);
      return;
    }

    const etiqueta = document.createElement("span");
    etiqueta.className = "cielo-etiqueta";
    etiqueta.textContent = `✨ CÓDIGO ${CODIGO} · HASTA LAS ${HORA} HS`;

    const titulo = document.createElement("h3");
    titulo.className = "cielo-titulo";
    titulo.textContent = "Desbloqueaste la Ruleta del Cielo";

    const bajada = document.createElement("p");
    bajada.className = "cielo-bajada";
    bajada.textContent = "Un solo giro. Todos los premios son packs de chances a precio de regalo.";

    const marco = document.createElement("div");
    marco.className = "cielo-marco";
    const rueda = crearRueda();
    marco.appendChild(rueda);

    const girar = document.createElement("button");
    girar.type = "button";
    girar.className = "cielo-boton";
    girar.textContent = "😇 ¡GIRAR!";

    const probabilidades = document.createElement("small");
    probabilidades.className = "cielo-probabilidades";
    probabilidades.textContent =
      `Todos los premios tienen la misma probabilidad (1 en ${PREMIOS.length}). Un giro por persona.`;

    girar.addEventListener("click", () => {

      girar.disabled = true;
      girar.textContent = "Girando...";

      const premio = sortear();
      guardarPremio(premio);

      const indice = PREMIOS.indexOf(premio);
      // Pequeño desvío para que no caiga siempre en el centro del gajo
      const desvio = (Math.random() - 0.5) * GRADOS * 0.6;
      rueda.style.transform = `rotate(${360 * 6 - (indice + 0.5) * GRADOS + desvio}deg)`;

      setTimeout(
        () => mostrarPremio(contenido, fondo, premio, true),
        sinMovimiento ? 300 : 4800
      );

    });

    contenido.append(etiqueta, titulo, bajada, marco, girar, probabilidades);

  }

  window.RuletaCielo = {
    CODIGO,
    // Devuelve false si ya venció (script.js muestra el mensaje)
    abrir() {
      if (Date.now() >= VENCE) return false;
      abrir();
      return true;
    }
  };

})();
