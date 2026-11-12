// ======================================================
// RULETA DE LA SUERTE
// ======================================================
// Cada compra aprobada da un giro. Cuando alguien consulta sus números
// en "Ver mis números", a los 2 segundos sale sola un cartel con la
// ruleta ("como ya compraste, desbloqueaste la Ruleta de la Suerte").
// El premio lo elige el servidor (ruleta en functions/index.js);
// acá solo se muestra la animación y se ofrece usar el premio.

(function () {

  // Porciones de la rueda, en el orden en que se dibujan
  const PORCIONES = [
    { id: "gratis", texto: "1 chance gratis", color: "#00A650", color2: "#00C96A" },
    { id: "p35", texto: "35 chances $12.999", color: "#1565D8", color2: "#3B8BFF" },
    { id: "tresxuno", texto: "3x1", color: "#F25C05", color2: "#FF8A2B" },
    { id: "p200", texto: "200 chances $29.999", color: "#6D28D9", color2: "#9B5CFF" },
    { id: "p500", texto: "400 chances $39.999", color: "#B0135E", color2: "#E8327F" }
  ];

  const GRADOS = 360 / PORCIONES.length;

  // Lamparitas alrededor de la rueda
  const LUCES = 18;

  // Espera entre que aparecen los números y sale la ruleta
  const ESPERA_CARTEL = 2000;

  // 3x1: paga el pack normal y recibe el triple
  // Si cambian, cambiarlos también en functions/index.js (PACKS_3X1)
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

  function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto) elemento.textContent = texto;
    return elemento;
  }

  function botonCompra(texto, alTocar, clase = "ruleta-boton") {
    const boton = crear("button", clase, texto);
    boton.type = "button";
    boton.addEventListener("click", alTocar);
    return boton;
  }

  const sinMovimiento = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;


  // ====================================================
  // PAPELITOS AL GANAR
  // ====================================================

  function papelitos(caja) {
    if (sinMovimiento()) return;
    const colores = ["#FFD54A", "#00C96A", "#3B8BFF", "#FF8A2B", "#E8327F", "#fff"];
    for (let i = 0; i < 46; i++) {
      const pieza = crear("i", "ruleta-papelito");
      pieza.style.left = `${Math.random() * 100}%`;
      pieza.style.background = colores[i % colores.length];
      pieza.style.animationDelay = `${Math.random() * 0.5}s`;
      pieza.style.setProperty("--giro", `${Math.random() * 720 - 360}deg`);
      caja.appendChild(pieza);
      setTimeout(() => pieza.remove(), 2600);
    }
  }


  // ====================================================
  // USAR UN PREMIO
  // ====================================================

  function comprar(chances, precio, codigo) {
    cerrar();
    window.abrirModalPromo(chances, precio, codigo);
  }

  function mostrarPremio(contenedor, premio, recienGanado) {

    contenedor.innerHTML = "";

    contenedor.appendChild(crear("div", "ruleta-trofeo", recienGanado ? "🏆" : "🎁"));

    contenedor.appendChild(
      crear("p", "ruleta-chapita", recienGanado ? "¡GANASTE!" : "TENÉS UN PREMIO GUARDADO")
    );

    contenedor.appendChild(crear("h3", "ruleta-premio", premio.nombre));

    const detalle = crear("p");
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
        (p, i) =>
          `${p.color} ${i * GRADOS}deg, ${p.color2} ${(i + 0.5) * GRADOS}deg, ${p.color} ${(i + 1) * GRADOS}deg`
      ).join(", ");

    const rueda = crear("div", "ruleta-rueda");
    rueda.style.background = `conic-gradient(${colores})`;

    // Líneas doradas entre porciones
    PORCIONES.forEach((porcion, i) => {
      const linea = crear("b", "ruleta-separador");
      linea.style.transform = `rotate(${i * GRADOS}deg)`;
      rueda.appendChild(linea);
    });

    PORCIONES.forEach((porcion, i) => {
      const texto = crear("span", "", porcion.texto);
      // El texto se apoya en la mitad de su porción
      texto.style.transform =
        `rotate(${(i + 0.5) * GRADOS - 90}deg) translateX(30px)`;
      rueda.appendChild(texto);
    });

    return rueda;

  }

  function crearMarco(rueda) {

    const marco = crear("div", "ruleta-marco");
    const aro = crear("div", "ruleta-aro");

    for (let i = 0; i < LUCES; i++) {
      const luz = crear("i", "ruleta-luz");
      // Repartidas sobre el aro dorado
      const angulo = (2 * Math.PI * i) / LUCES;
      luz.style.left = `${50 + 47 * Math.sin(angulo)}%`;
      luz.style.top = `${50 - 47 * Math.cos(angulo)}%`;
      if (i % 2) luz.classList.add("par");
      aro.appendChild(luz);
    }

    aro.appendChild(rueda);
    aro.appendChild(crear("div", "ruleta-centro", "🍀"));
    marco.append(crear("div", "ruleta-flecha"), aro);

    return marco;

  }

  // girosLibres: cuántos giros tiene. premioGuardado: premio sin usar.
  function abrir(dni, girosLibres, premioGuardado, alTerminar) {

    cerrar();

    overlay = crear("div", "ruleta-overlay activo");
    overlay.id = "ruletaOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Ruleta de la Suerte");

    const caja = crear("div", "ruleta-caja ruleta-show");

    const cerrarBoton = botonCompra("✕", cerrar, "ruleta-cerrar");
    cerrarBoton.setAttribute("aria-label", "Cerrar");

    const contenido = crear("div", "ruleta-contenido");

    caja.append(cerrarBoton, contenido);
    overlay.appendChild(caja);
    document.body.appendChild(overlay);

    // Sin giros: mostrar directamente el premio guardado
    if (!girosLibres) {
      mostrarPremio(contenido, premioGuardado, false);
      return;
    }

    const rueda = crearRueda();
    const marco = crearMarco(rueda);

    const girar = botonCompra("🎡 ¡GIRAR LA RULETA!", async () => {

      girar.disabled = true;
      girar.textContent = "Girando...";
      marco.classList.add("girando");

      try {

        const { premio } = await pedir("girar", dni);

        const indice =
          PORCIONES.findIndex((p) => p.id === premio.id);

        // Termina con la porción ganadora debajo de la flecha de arriba
        const final =
          360 * 7 - (indice + 0.5) * GRADOS;

        rueda.style.transform = `rotate(${final}deg)`;

        setTimeout(() => {
          marco.classList.remove("girando");
          mostrarPremio(contenido, premio, true);
          papelitos(caja);
          alTerminar(contenido);
        }, sinMovimiento() ? 300 : 5200);

      } catch (error) {
        console.warn("No se pudo girar la ruleta:", error);
        marco.classList.remove("girando");
        girar.textContent = "No se pudo girar. Probá de nuevo más tarde.";
      }

    }, "ruleta-boton ruleta-girar");

    const aviso = crear("a", "ruleta-aviso", "Ver probabilidades y condiciones");
    aviso.href = "terminos.html";
    aviso.target = "_blank";

    contenido.append(
      crear("p", "ruleta-chapita", "🔓 RULETA DESBLOQUEADA"),
      crear("h3", "", "¡Como ya compraste, desbloqueaste la Ruleta de la Suerte!"),
      crear(
        "p",
        "",
        girosLibres > 1
          ? `Tenés ${girosLibres} giros. Girá y llevate un premio.`
          : "Tenés 1 giro. Girá y llevate un premio."
      ),
      marco,
      girar,
      aviso
    );

  }


  // ====================================================
  // CARTEL QUE SALE SOLO AL VER LOS NÚMEROS
  // ====================================================

  let pendienteDe = "";

  async function ofrecer(dni, contenedor) {

    const estado = await pedir("estado", dni);
    const pendiente = estado.pendientes?.[0];

    if (!estado.disponibles && !pendiente) {
      return;
    }

    pendienteDe = dni;

    setTimeout(() => {

      // Si mientras tanto buscó otro DNI o se fue de la sección, no sale
      if (pendienteDe !== dni || !document.body.contains(contenedor)) return;

      // ¿Le quedan más giros? Botón para girar de nuevo
      const despuesDeGirar = (contenido) => {
        pedir("estado", dni).then((nuevo) => {
          if (!nuevo.disponibles || !overlay) return;
          contenido.appendChild(
            botonCompra(
              `🎡 Tenés ${nuevo.disponibles === 1 ? "otro giro" : `${nuevo.disponibles} giros más`}: girar de nuevo`,
              () => abrir(dni, nuevo.disponibles, null, despuesDeGirar),
              "ruleta-boton ruleta-otra"
            )
          );
        }).catch(() => {});
      };

      const mostrar = () =>
        abrir(dni, estado.disponibles, pendiente, despuesDeGirar);

      if (window.Carteles) {
        window.Carteles.cuandoLibre(mostrar);
      } else {
        mostrar();
      }

    }, ESPERA_CARTEL);

  }


  window.Ruleta = {
    // Si falla, los números se siguen viendo: la ruleta simplemente no aparece
    mostrar(dni, contenedor) {
      ofrecer(dni, contenedor).catch((error) => {
        console.warn("Ruleta no disponible:", error);
      });
    }
  };

})();
