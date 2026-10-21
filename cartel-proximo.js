// ======================================================
// CARTEL "ATENTOS AL PRÓXIMO SORTEO"
// ======================================================
// Aparece al entrar a la página cuando las compras ya están
// cerradas (después de OJEDA_CIERRE, en carteles.js).
// Invita a unirse al canal de WhatsApp (OJEDA_WHATSAPP).
// Usa el mismo diseño que el cartel de cierre (clases cierre-*).

(function () {

  const DEMORA_MS = 1200;

  if (!window.participacionesCerradas || !window.participacionesCerradas()) {
    return;
  }

  const overlay =
    document.createElement("div");

  overlay.className = "cierre-overlay";

  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "proximoTitulo");

  overlay.innerHTML = `
    <div class="cierre-card proximo-card">

      <button
        type="button"
        class="cierre-cerrar"
        aria-label="Cerrar"
      >✕</button>

      <div class="cierre-reloj">🏁</div>

      <p class="cierre-etiqueta">¡SORTEO FINALIZADO!</p>

      <h2 id="proximoTitulo" class="cierre-titulo">
        ESTATE ATENTO AL PRÓXIMO SORTEO
      </h2>

      <p class="cierre-texto">
        Gracias a todos los que participaron 🙌
        <br>
        Unite a nuestro canal de WhatsApp y
        <strong>enterate primero</strong>
        cuando arranque el próximo 🔥
      </p>

      <a
        class="cierre-cta proximo-cta"
        target="_blank"
        rel="noopener"
      >
        📲 UNIRME AL CANAL DE WHATSAPP
      </a>

    </div>
  `;

  overlay
    .querySelector(".proximo-cta")
    .setAttribute("href", window.OJEDA_WHATSAPP);


  function cerrar() {

    overlay.classList.remove("activo");

    document.removeEventListener("keydown", alApretarTecla);

    setTimeout(() => overlay.remove(), 300);

  }


  function alApretarTecla(e) {
    if (e.key === "Escape") {
      cerrar();
    }
  }


  overlay
    .querySelector(".cierre-cerrar")
    .addEventListener("click", cerrar);

  // Al tocar "Unirme", se abre WhatsApp y se cierra el cartel
  overlay
    .querySelector(".proximo-cta")
    .addEventListener("click", cerrar);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      cerrar();
    }
  });

  document.addEventListener("keydown", alApretarTecla);


  function abrir() {
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add("activo"), 30);
  }

  setTimeout(
    () => window.Carteles
      ? window.Carteles.cuandoLibre(abrir)
      : abrir(),
    DEMORA_MS
  );

})();
