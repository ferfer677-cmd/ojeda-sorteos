// ======================================================
// CONFIGURACIÓN DEL SORTEO Y CARTELES
// ======================================================
// Se carga antes que los demás scripts de index.html.
//
// CIERRE DE PARTICIPACIONES:
// Viernes 13 de noviembre de 2026 — 19:00 hs (Argentina UTC-3).
// Si la cambiás, cambiala también en firestore.rules y storage.rules
// (ahí está en hora UTC: 19:00 de Argentina = 22:00 UTC).

window.OJEDA_CIERRE =
  new Date("2026-11-13T19:00:00-03:00");


// INICIO DEL SORTEO: "Últimas compras" muestra solo compras desde esta fecha
// (así no aparecen las del sorteo anterior). Cambiarla en cada sorteo nuevo.
window.OJEDA_INICIO =
  new Date("2026-10-24T00:00:00-03:00");


// FOTOS DEL PREMIO (galería y tarjeta principal)
// Nombres de archivo: miniatura en assets/premios/, grande en assets/premios/grandes/.
// La primera es la foto principal. Vacía = se usan las de Firebase Storage.
window.OJEDA_FOTOS = [
  "IMG_5235.jpg",
  "IMG_5228.jpg",
  "IMG_5226.jpg",
  "IMG_5229.jpg",
  "IMG_5233.jpg",
  "IMG_5234.jpg",
  "IMG_5227.jpg",
  "IMG_5230.jpg",
  "IMG_5231.jpg",
  "IMG_5232.jpg",
  "IMG_5236.jpg",
  "IMG_5237.jpg",
  "IMG_5238.jpg",
  "IMG_5239.jpg",
  "IMG_5240.jpg",
  "IMG_5241.jpg",
  "IMG_5242.jpg",
  "IMG_5243.jpg"
];


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


// Canal de WhatsApp (cartel del próximo sorteo y botón principal)
window.OJEDA_WHATSAPP =
  "https://whatsapp.com/channel/0029Vb5dDFT0bIdhfmabL11s";
