// ======================================================
// RULETA DE PREMIOS
// ======================================================
// Aparece en "Ver mis números". Cada compra aprobada da un giro.
// El premio lo elige el servidor (girarRuleta en functions/index.js);
// acá solo se muestra la animación y se ofrece usar el premio.

(function () {

  // Porciones de la rueda, en el orden en que se dibujan
  const PORCIONES = [
    { id: "gratis", texto: "1 chance gratis", color: "#00A650" },
    { id: "p35", texto: "35 chances $12.999", color: "#1877F2" },
    { id: "tresxuno", texto: "3x1", color: "#FF6A00" },
    { id: "p200", texto: "200 chances $29.999", color: "#7C3AED" },
    { id: "p500", texto: "400 chances $39.999", color: "#C2185B" }
  ];

  const GRADOS = 360 / PORCIONES.length;

  // 3x1: paga el pack normal y recibe el triple
  const PACKS_3X1 = [
    { paga: 1, recibe: 3, precio: 5000 },
    { paga: 3, recibe: 9, precio: 10000 },
    { paga: 10, recibe: 30, precio: 18000 }
  ];

  const pesos = (monto) => `$${Number(monto).toLocaleString("es-AR")}`;

  async function pedir(accion, dni) {
    const respuesta = await fetch("/api/ruleta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, dni })
    });
    if (!respuesta.ok) {
      throw new Error("RULETA_NO_DISPONIBLE");
    }
    return respuesta.json();
  }


  // ====================================================
  // USAR UN PREMIO
  // ====================================================

  function comprar(chances, precio, codigo) {
    cerrar();
    window.abrirModalPromo(chances, precio, codigo);
  }

  function botonCompra(texto, alTocar) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "ruleta-boton";
    boton.textContent = texto;
    boton.addEventListener("click", alTocar);
    return boton;
  }

  function mostrarPremio(contenedor, premio) {

    contenedor.innerHTML = "";

    const titulo = document.createElement("h3");
    titulo.textContent = `🎉 ${premio.nombre}`;
    contenedor.appendChild(titulo);

    const detalle = document.createElement("p");
    contenedor.appendChild(detalle);

    if (premio.id === "gratis") {
      detalle.textContent =
        "Ya quedó cargada a tu DNI. Tu número aparece cuando se apruebe.";
      return;
    }

    if (premio.id === "tresxuno") {
      detalle.textContent = "Elegí un pack: pagás ese precio y recibís el triple de chances.";
      PACKS_3X1.forEach(({ paga, recibe, precio }) => {
        contenedor.appendChild(
          botonCompra(
            `${paga} → ${recibe} chances por ${pesos(precio)}`,
            () => comprar(recibe, precio, premio.codigo)
          )
        );
      });
      return;
    }

    detalle.textContent = "Esta oferta queda guardada para vos hasta el cierre de compras.";
    contenedor.appendChild(
      botonCompra(
        `Comprar ${premio.chances} chances por ${pesos(premio.precio)}`,
        () => comprar(premio.chances, premio.precio, premio.codigo)
      )
    );

  }


  // ====================================================
  // CARTEL Y RUEDA
  // ====================================================

  let overlay = null;

  function cerrar() {
    overlay?.remove();
    overlay = null;
  }

  function crearRueda() {

    const colores =
      PORCIONES.map(
        (p, i) => `${p.color} ${i * GRADOS}deg ${(i + 1) * GRADOS}deg`
      ).join(", ");

    const rueda = document.createElement("div");
    rueda.className = "ruleta-rueda";
    rueda.style.background = `conic-gradient(${colores})`;

    PORCIONES.forEach((porcion, i) => {
      const texto = document.createElement("span");
      texto.textContent = porcion.texto;
      // El texto se apoya en la mitad de su porción
      texto.style.transform =
        `rotate(${(i + 0.5) * GRADOS - 90}deg) translateX(34px)`;
      rueda.appendChild(texto);
    });

    return rueda;

  }

  function abrir(dni, premiosPendientes, alTerminar) {

    overlay = document.createElement("div");
    overlay.id = "ruletaOverlay";
    overlay.className = "ruleta-overlay activo";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Ruleta de premios");

    const caja = document.createElement("div");
    caja.className = "ruleta-caja";

    const cerrarBoton = document.createElement("button");
    cerrarBoton.type = "button";
    cerrarBoton.className = "ruleta-cerrar";
    cerrarBoton.setAttribute("aria-label", "Cerrar");
    cerrarBoton.textContent = "✕";
    cerrarBoton.addEventListener("click", cerrar);

    const contenido = document.createElement("div");
    contenido.className = "ruleta-contenido";

    caja.append(cerrarBoton, contenido);
    overlay.appendChild(caja);
    document.body.appendChild(overlay);

    // Ya giró antes: mostrar directamente el premio guardado
    if (premiosPendientes) {
      mostrarPremio(contenido, premiosPendientes);
      return;
    }

    const titulo = document.createElement("h3");
    titulo.textContent = "🎡 Girá la ruleta";

    const marco = document.createElement("div");
    marco.className = "ruleta-marco";

    const rueda = crearRueda();
    marco.appendChild(rueda);

    const girar = botonCompra("¡GIRAR!", async () => {

      girar.disabled = true;
      girar.textContent = "Girando...";

      try {

        const { premio } = await pedir("girar", dni);

        const indice =
          PORCIONES.findIndex((p) => p.id === premio.id);

        // Termina con la porción ganadora debajo de la flecha de arriba
        const final =
          360 * 6 - (indice + 0.5) * GRADOS;

        rueda.style.transform = `rotate(${final}deg)`;

        const sinMovimiento =
          matchMedia("(prefers-reduced-motion: reduce)").matches;

        setTimeout(() => {
          mostrarPremio(contenido, premio);
          alTerminar();
        }, sinMovimiento ? 300 : 4800);

      } catch (error) {
        console.warn("No se pudo girar la ruleta:", error);
        girar.textContent = "No se pudo girar. Probá de nuevo más tarde.";
      }

    });

    const aviso = document.createElement("a");
    aviso.href = "terminos.html";
    aviso.target = "_blank";
    aviso.className = "ruleta-aviso";
    aviso.textContent = "Ver probabilidades y condiciones";

    contenido.append(titulo, marco, girar, aviso);

  }


  // ====================================================
  // BOTÓN DEBAJO DE LOS NÚMEROS
  // ====================================================

  async function mostrarBoton(dni, contenedor) {

    const estado = await pedir("estado", dni);

    contenedor.querySelector(".ruleta-llamada")?.remove();

    const pendiente = estado.pendientes?.[0];

    if (!estado.disponibles && !pendiente) {
      return;
    }

    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "ruleta-llamada";
    boton.textContent =
      estado.disponibles
        ? "🎡 ¡Desbloqueaste la ruleta! Hacé clic"
        : `🎁 Tenés un premio de la ruleta: ${pendiente.nombre}`;

    boton.addEventListener("click", () => {
      abrir(
        dni,
        estado.disponibles ? null : pendiente,
        () => mostrarBoton(dni, contenedor).catch(() => {})
      );
    });

    contenedor.appendChild(boton);

  }


  window.Ruleta = {
    // Si falla, los números se siguen viendo: la ruleta simplemente no aparece
    mostrar(dni, contenedor) {
      mostrarBoton(dni, contenedor).catch((error) => {
        console.warn("Ruleta no disponible:", error);
      });
    }
  };

})();
