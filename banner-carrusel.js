// ======================================================
// CARRUSEL DE BANNERS
// ======================================================
// Pasa solo de derecha a izquierda cada SEGUNDOS_POR_BANNER.
// También se puede deslizar con el dedo o tocar los puntitos.
// Al llegar al último sigue hacia la izquierda con el primero
// (sin "rebobinar" para atrás).

(function () {

  const SEGUNDOS_POR_BANNER = 3;
  const DURACION_TRANSICION_MS = 600;

  const carrusel =
    document.querySelector(".banner-carrusel");

  if (!carrusel) {
    return;
  }

  const pista =
    carrusel.querySelector(".banner-pista");

  const originales =
    [...pista.children];

  const puntos =
    [...carrusel.querySelectorAll(".banner-puntos button")];

  const total =
    originales.length;

  if (total < 2) {
    return;
  }

  // Copia del primero al final, para pasar del último
  // al primero siguiendo hacia la izquierda
  const copia =
    originales[0].cloneNode(true);

  copia.setAttribute("aria-hidden", "true");
  copia.querySelectorAll("img").forEach((img) => {
    img.removeAttribute("fetchpriority");
  });

  pista.appendChild(copia);

  let actual = 0;
  let temporizador = null;
  let pausado = false;

  const sinMovimiento =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  function mover(indice, animado = true) {

    pista.style.transition =
      animado && !sinMovimiento
        ? `transform ${DURACION_TRANSICION_MS}ms ease`
        : "none";

    pista.style.transform =
      `translateX(-${indice * 100}%)`;

    actual = indice;

    const visible =
      indice % total;

    puntos.forEach((punto, i) => {
      punto.classList.toggle("activo", i === visible);
      punto.setAttribute("aria-selected", i === visible ? "true" : "false");
    });

  }


  // Cuando termina de llegar a la copia, saltar al primero real
  pista.addEventListener("transitionend", () => {

    if (actual === total) {
      mover(0, false);
    }

  });


  function siguiente() {

    // Si quedó en la copia (por ejemplo, la pestaña estuvo oculta)
    if (actual >= total) {
      mover(0, false);
      // forzar que el navegador aplique el salto antes de animar
      void pista.offsetWidth;
    }

    mover(actual + 1);

  }


  function iniciar() {

    detener();

    if (pausado) {
      return;
    }

    temporizador =
      setInterval(siguiente, SEGUNDOS_POR_BANNER * 1000);

  }


  function detener() {
    clearInterval(temporizador);
    temporizador = null;
  }


  // Puntitos
  puntos.forEach((punto, i) => {
    punto.addEventListener("click", () => {
      mover(i);
      iniciar();
    });
  });


  // Pausa con el mouse encima (PC)
  carrusel.addEventListener("mouseenter", () => {
    pausado = true;
    detener();
  });

  carrusel.addEventListener("mouseleave", () => {
    pausado = false;
    iniciar();
  });


  // Pausa con la pestaña oculta
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      detener();
    } else {
      iniciar();
    }
  });


  // Deslizar con el dedo
  let inicioX = null;
  let inicioY = null;

  carrusel.addEventListener("touchstart", (e) => {
    inicioX = e.touches[0].clientX;
    inicioY = e.touches[0].clientY;
    detener();
  }, { passive: true });

  carrusel.addEventListener("touchend", (e) => {

    if (inicioX === null) {
      return;
    }

    const dx = e.changedTouches[0].clientX - inicioX;
    const dy = e.changedTouches[0].clientY - inicioY;

    // Solo si fue un deslizamiento horizontal
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {

      if (dx < 0) {
        siguiente();
      } else {
        const anterior = (actual % total) - 1;
        mover(anterior < 0 ? total - 1 : anterior);
      }

    }

    inicioX = null;
    iniciar();

  }, { passive: true });


  mover(0, false);
  iniciar();

})();
