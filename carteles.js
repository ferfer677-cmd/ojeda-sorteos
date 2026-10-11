// ======================================================
// CONFIGURACIÓN DEL SORTEO Y CARTELES
// ======================================================
// Se carga antes que los demás scripts de index.html.
//
// CIERRE DE PARTICIPACIONES:
// Viernes 16 de octubre de 2026 — 21:30 hs (Argentina UTC-3).
// Si la cambiás, cambiala también en firestore.rules y storage.rules
// (ahí está en hora UTC: 21:30 de Argentina = 00:30 UTC del día siguiente).

window.OJEDA_CIERRE =
  new Date("2026-10-16T21:30:00-03:00");


window.participacionesCerradas = function () {
  return new Date() >= window.OJEDA_CIERRE;
};


// ======================================================
// NUNCA DOS CARTELES JUNTOS
// ======================================================
// Antes de abrir un cartel (aviso de compra, cierre, súper promo)
// se pregunta si ya hay otro abierto y, si lo hay, se espera.

const SELECTORES_CARTELES = [
  ".cierre-overlay.activo",
  "#superPromoOverlay.activo",
  "#ofertaEnteroOverlay.activo",
  "#purchaseModal.show",
  "#successModal.show",
  "#imageModal.show",
  "#imageModal.active",
  "#imageModal.open",
  ".cerrado-aviso.activo"
];

window.Carteles = {

  hayAbierto() {
    return SELECTORES_CARTELES.some(
      (selector) => document.querySelector(selector)
    );
  },

  // Ejecuta "abrir" cuando no haya ningún cartel abierto
  cuandoLibre(abrir) {

    if (!this.hayAbierto()) {
      abrir();
      return;
    }

    const espera =
      setInterval(() => {
        if (!this.hayAbierto()) {
          clearInterval(espera);
          // Un respiro entre un cartel y otro
          setTimeout(abrir, 800);
        }
      }, 500);

  }

};
