// ======================================================
// BARRA DE COMPRA FIJA (CELULAR) + CIERRE DE COMPRAS
// ======================================================
// Necesita carteles.js (OJEDA_CIERRE, participacionesCerradas, Carteles).

(function () {

  // ====================================================
  // PARTICIPACIONES CERRADAS
  // ====================================================

  const MENSAJE_CERRADO =
    "🔒 Las participaciones de este sorteo están cerradas.\n\n" +
    "¡Estate atento al próximo! Unite al canal de WhatsApp para enterarte primero.";

  // Todo lo que abre el formulario de compra
  const SELECTOR_COMPRA = [
    ".open-modal",
    "[data-promo-chances]",
    "[data-entero-chances]",
    ".participar-btn",
    ".barra-compra-btn"
  ].join(",");


  function aplicarCierre() {

    document.body.classList.add("participaciones-cerradas");

    document
      .querySelectorAll(".participar-btn")
      .forEach((boton) => {
        // Con las compras cerradas, el botón principal lleva
        // al canal de WhatsApp para enterarse del próximo sorteo
        boton.textContent = "📲 ENTERATE DEL PRÓXIMO SORTEO";
        boton.setAttribute("href", window.OJEDA_WHATSAPP);
        boton.setAttribute("target", "_blank");
        boton.setAttribute("rel", "noopener");
        boton.classList.add("boton-proximo");
      });

    // Cerrar el formulario si estaba abierto
    document
      .getElementById("purchaseModal")
      ?.classList.remove("show");

    document.body.classList.remove("modal-open");

    ocultarBarra();

  }


  // Bloquear clics de compra (fase de captura: antes que script.js)
  document.addEventListener(
    "click",
    (e) => {

      if (!window.participacionesCerradas()) {
        return;
      }

      const objetivo =
        e.target.closest(SELECTOR_COMPRA);

      if (!objetivo) {
        return;
      }

      // El botón principal abre el canal de WhatsApp (su link normal)
      if (objetivo.classList.contains("participar-btn")) {
        e.stopImmediatePropagation();
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();

      alert(MENSAJE_CERRADO);

    },
    true
  );


  // Bloquear el envío del formulario
  document.addEventListener(
    "submit",
    (e) => {

      if (
        e.target.id === "purchaseForm" &&
        window.participacionesCerradas()
      ) {

        e.preventDefault();
        e.stopImmediatePropagation();

        alert(MENSAJE_CERRADO);

        aplicarCierre();

      }

    },
    true
  );


  // ====================================================
  // BARRA FIJA ABAJO (SOLO CELULAR)
  // ====================================================

  const barra =
    document.createElement("div");

  barra.className = "barra-compra";

  barra.innerHTML = `
    <a href="#chances" class="barra-compra-btn">
      <span class="barra-compra-texto">🎟️ QUIERO MI MT-07</span>
      <span class="barra-compra-precio"></span>
    </a>
  `;

  document.body.appendChild(barra);

  const precioBarra =
    barra.querySelector(".barra-compra-precio");

  barra
    .querySelector(".barra-compra-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      document
        .getElementById("chances")
        ?.scrollIntoView({ behavior: "smooth" });
    });


  // Precio más bajo que se ve en las tarjetas
  // (cambia si se activa una palabra clave)
  function actualizarPrecio() {

    const precios =
      [...document.querySelectorAll(".pack-card .precio-actual")]
        .map((el) => Number(el.textContent.replace(/\D/g, "")))
        .filter((n) => n > 0);

    precioBarra.textContent =
      precios.length
        ? `DESDE $${Math.min(...precios).toLocaleString("es-AR")}`
        : "";

  }


  let heroVisible = true;
  let chancesVisible = false;


  function ocultarBarra() {
    barra.classList.remove("visible");
    document.body.classList.remove("con-barra-compra");
  }


  function evaluarBarra() {

    const mostrar =
      !heroVisible &&
      !chancesVisible &&
      !window.participacionesCerradas() &&
      !window.Carteles.hayAbierto();

    if (mostrar) {
      actualizarPrecio();
      barra.classList.add("visible");
      document.body.classList.add("con-barra-compra");
    } else {
      ocultarBarra();
    }

  }


  // Aparece cuando ya pasó el botón principal
  // y se esconde mientras se ven las tarjetas de precios
  if ("IntersectionObserver" in window) {

    const botonHero =
      document.querySelector(".participar-btn");

    const seccionChances =
      document.getElementById("chances");

    const observador =
      new IntersectionObserver(
        (entradas) => {

          entradas.forEach((entrada) => {

            if (entrada.target === botonHero) {
              heroVisible =
                entrada.isIntersecting ||
                entrada.boundingClientRect.top > 0;
            }

            if (entrada.target === seccionChances) {
              chancesVisible = entrada.isIntersecting;
            }

          });

          evaluarBarra();

        },
        { threshold: 0 }
      );

    if (botonHero) observador.observe(botonHero);
    if (seccionChances) observador.observe(seccionChances);

  }


  // Esconder la barra mientras hay un cartel abierto
  setInterval(evaluarBarra, 700);


  // ====================================================
  // INICIO
  // ====================================================

  if (window.participacionesCerradas()) {

    aplicarCierre();

  } else {

    // Cerrar justo a la hora, aunque la página siga abierta
    const faltan =
      window.OJEDA_CIERRE - new Date();

    // setTimeout no acepta más de ~24 días
    if (faltan < 2147483647) {
      setTimeout(aplicarCierre, faltan);
    }

  }

})();
