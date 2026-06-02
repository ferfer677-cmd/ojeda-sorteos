import { guardarParticipante } from "./firestore.js";
import { subirComprobante } from "./storage.js";
document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     MODAL
  ========================= */

  const modal = document.getElementById("purchaseModal");
  const cards = document.querySelectorAll(".open-modal");
  const closeBtn = document.getElementById("closeModal");
  const selectedPack = document.getElementById("selectedPack");

  cards.forEach(card => {

    card.addEventListener("click", () => {

      const packName =
        card.querySelector("h3").innerText;

      const packPrice =
        card.querySelector("strong").innerText;

      selectedPack.innerText =
        `${packName} • ${packPrice}`;

      modal.classList.add("show");
document.body.classList.add("modal-open");

    });

  });

  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
document.body.classList.remove("modal-open");
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("show");
document.body.classList.remove("modal-open");
    }
  });


  /* =========================
     CONTADOR
  ========================= */

  const targetDate =
    new Date("2026-07-10T21:00:00");

  function updateCountdown() {

    const now = new Date();

    const difference =
      targetDate - now;

    if (difference <= 0) return;

    const days =
      Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );

    const hours =
      Math.floor(
        (difference % (1000 * 60 * 60 * 24))
        / (1000 * 60 * 60)
      );

    const minutes =
      Math.floor(
        (difference % (1000 * 60 * 60))
        / (1000 * 60)
      );

    const seconds =
      Math.floor(
        (difference % (1000 * 60))
        / 1000
      );

    document.getElementById("days").innerText =
      days;

    document.getElementById("hours").innerText =
      hours.toString().padStart(2, "0");

    document.getElementById("minutes").innerText =
      minutes.toString().padStart(2, "0");

    document.getElementById("seconds").innerText =
      seconds.toString().padStart(2, "0");
  }

  updateCountdown();

  setInterval(updateCountdown, 1000);


  /* =========================
     COPIAR ALIAS
  ========================= */

  const copyAlias =
    document.getElementById("copyAlias");

  if (copyAlias) {

    copyAlias.addEventListener("click", () => {

      navigator.clipboard.writeText(
        "tienda.ojeda"
      );

      copyAlias.innerText =
        "✓ ALIAS COPIADO";

      setTimeout(() => {

        copyAlias.innerText =
          "COPIAR ALIAS";

      }, 2000);

    });

  }


  /* =========================
     COPIAR CVU
  ========================= */

  const copyCvu =
    document.getElementById("copyCvu");

  if (copyCvu) {

    copyCvu.addEventListener("click", () => {

      navigator.clipboard.writeText(
        "0000168300000001294776"
      );

      copyCvu.innerText =
        "✓ CVU COPIADO";

      setTimeout(() => {

        copyCvu.innerText =
          "COPIAR CVU";

      }, 2000);

    });

  }
  const purchaseForm =
  document.getElementById("purchaseForm");

if (purchaseForm) {

 purchaseForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const nombre =
      document.getElementById("nombre").value;

    const apellido =
      document.getElementById("apellido").value;

    const dni =
      document.getElementById("dni").value;

    const telefono =
      document.getElementById("telefono").value;

    const instagram =
      document.getElementById("instagram").value;

const archivo =
  document.getElementById("comprobante").files[0];
    
  const pack =
      document.getElementById("selectedPack").innerText;

      if (!archivo) {
  alert("Debes adjuntar un comprobante");
  return;
}

const comprobante =
  await subirComprobante(archivo);

   
const guardado = await guardarParticipante({
  nombre,
  apellido,
  dni,
  telefono,
  instagram,
  pack,
  comprobanteURL: comprobante.url,
  comprobantePath: comprobante.path
});

if (!guardado) {
  alert("Error al guardar el participante");
  return;
}
    
alert("Datos enviados correctamente. Estado del pago: Esperando");

purchaseForm.reset();

modal.classList.remove("show");
document.body.classList.remove("modal-open");

  });

}

});