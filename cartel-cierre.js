// ======================================================
// CARTEL "CIERRE DE PARTICIPACIONES"
// ======================================================
// Aparece cada vez que alguien entra o recarga la página,
// con la cuenta regresiva hasta el cierre de participaciones.
// Después del cierre ya no aparece.

// Viernes 16 de octubre de 2026 — 21:30 hs (Argentina UTC-3)
const CIERRE_PARTICIPACIONES =
  new Date("2026-10-16T21:30:00-03:00");

// Espera antes de mostrarlo (para que cargue la página)
const DEMORA_MS = 1200;


function dosDigitos(numero) {
  return String(numero).padStart(2, "0");
}


function crearCartel() {

  const overlay =
    document.createElement("div");

  overlay.className = "cierre-overlay";

  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "cierreTitulo");

  overlay.innerHTML = `
    <div class="cierre-card">

      <button
        type="button"
        class="cierre-cerrar"
        aria-label="Cerrar"
      >✕</button>

      <div class="cierre-reloj">⏰</div>

      <p class="cierre-etiqueta">ÚLTIMA OPORTUNIDAD</p>

      <h2 id="cierreTitulo" class="cierre-titulo">
        SE CIERRAN LAS PARTICIPACIONES
      </h2>

      <p class="cierre-subtitulo">
        Viernes 16/10 a las <strong>21:30 hs</strong>
      </p>

      <div class="cierre-contador">
        <div class="cierre-caja" data-unidad="dias">
          <span>00</span><small>DÍAS</small>
        </div>
        <div class="cierre-caja">
          <span data-valor="horas">00</span><small>HORAS</small>
        </div>
        <div class="cierre-caja">
          <span data-valor="minutos">00</span><small>MIN</small>
        </div>
        <div class="cierre-caja">
          <span data-valor="segundos">00</span><small>SEG</small>
        </div>
      </div>

      <p class="cierre-texto">
        Después de esa hora no se aceptan más compras.
        <br>
        🏍️ ¡Asegurá tus chances por la MT-07!
      </p>

      <a href="#chances" class="cierre-cta">
        🎟️ QUIERO PARTICIPAR
      </a>

    </div>
  `;

  return overlay;

}


function iniciarCartelCierre() {

  if (new Date() >= CIERRE_PARTICIPACIONES) {
    return;
  }

  const overlay =
    crearCartel();

  const cajaDias =
    overlay.querySelector('[data-unidad="dias"]');

  const valorDias =
    cajaDias.querySelector("span");

  const valores = {
    horas: overlay.querySelector('[data-valor="horas"]'),
    minutos: overlay.querySelector('[data-valor="minutos"]'),
    segundos: overlay.querySelector('[data-valor="segundos"]')
  };

  let intervalo = null;


  function cerrar() {

    overlay.classList.remove("activo");

    clearInterval(intervalo);

    document.removeEventListener("keydown", alApretarTecla);

    setTimeout(
      () => overlay.remove(),
      300
    );

  }


  function alApretarTecla(e) {
    if (e.key === "Escape") {
      cerrar();
    }
  }


  function actualizar() {

    const restante =
      CIERRE_PARTICIPACIONES - new Date();

    if (restante <= 0) {
      cerrar();
      return;
    }

    const totalSegundos =
      Math.floor(restante / 1000);

    const dias =
      Math.floor(totalSegundos / 86400);

    // El último día no se muestra "00 DÍAS"
    cajaDias.style.display =
      dias > 0 ? "" : "none";

    valorDias.textContent =
      dosDigitos(dias);

    valores.horas.textContent =
      dosDigitos(Math.floor((totalSegundos % 86400) / 3600));

    valores.minutos.textContent =
      dosDigitos(Math.floor((totalSegundos % 3600) / 60));

    valores.segundos.textContent =
      dosDigitos(totalSegundos % 60);

    // Menos de 3 horas: más urgencia
    overlay.classList.toggle(
      "urgente",
      restante < 3 * 60 * 60 * 1000
    );

  }


  overlay
    .querySelector(".cierre-cerrar")
    .addEventListener("click", cerrar);

  overlay
    .querySelector(".cierre-cta")
    .addEventListener("click", cerrar);

  // Tocar afuera del cartel también lo cierra
  overlay.addEventListener(
    "click",
    (e) => {
      if (e.target === overlay) {
        cerrar();
      }
    }
  );

  document.addEventListener("keydown", alApretarTecla);

  actualizar();

  intervalo =
    setInterval(actualizar, 1000);

  document.body.appendChild(overlay);

  setTimeout(
    () => overlay.classList.add("activo"),
    DEMORA_MS
  );

}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarCartelCierre);
} else {
  iniciarCartelCierre();
}
