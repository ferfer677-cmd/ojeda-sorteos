import { db } from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { guardarParticipante } from "./firestore.js";
import { subirComprobante } from "./storage.js";
document.addEventListener("DOMContentLoaded", () => {

  const comprobante =
  document.getElementById("comprobante");

const uploadBtn =
  document.querySelector(".upload-btn");

if (comprobante && uploadBtn) {

  comprobante.addEventListener(
    "change",
    () => {

      if (comprobante.files.length > 0) {

        uploadBtn.innerHTML =
          "✅ COMPROBANTE SELECCIONADO";

      }

    }
  );

}


  /* =========================
     MODAL
  ========================= */

  const modal = document.getElementById("purchaseModal");
  const successModal =
  document.getElementById("successModal");



const successBtn =
  document.getElementById("successBtn");
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

if (successBtn) {

 successBtn.addEventListener("click", () => {

  location.reload();

});

}

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

let enviando = false;

purchaseForm.addEventListener("submit", async (e) => {



  if (enviando) return;

  enviando = true;



  e.preventDefault();

    const submitBtn =
  purchaseForm.querySelector('button[type="submit"]');

submitBtn.disabled = true;

submitBtn.innerHTML = `
⏳ SUBIENDO...
`;

purchaseForm.style.pointerEvents = "none";
purchaseForm.style.opacity = "0.6";


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
  await subirComprobante(
    archivo,
    (progreso) => {

      submitBtn.innerHTML =
        `⏳ PAGANDO... ${progreso}%`;

    }
  );

   
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
  submitBtn.disabled = false;
  submitBtn.innerText =  "ENVIAR COMPROBANTE";

  alert("Error al guardar el participante");
  return;
}
    
const successModal =
  document.getElementById("successModal");

modal.classList.remove("show");
document.body.classList.remove("modal-open");

successModal.classList.add("show");

purchaseForm.reset();

if (uploadBtn) {

  uploadBtn.innerHTML =
    "📷 ADJUNTAR COMPROBANTE";

}

submitBtn.disabled = false;

submitBtn.innerHTML =
  "ENVIAR COMPROBANTE";

purchaseForm.style.pointerEvents =
  "auto";

purchaseForm.style.opacity =
  "1";

enviando = false;

  });

}

});
const modalImagen =
document.getElementById("imageModal");

const imagenGrande =
document.getElementById("modalImage");

const cerrarImagen =
document.getElementById("closeImageModal");

document
.querySelectorAll(".gallery-img")
.forEach((img)=>{

  img.addEventListener("click",()=>{

    imagenGrande.src = img.src;

    modalImagen.classList.add("show");

  });

});

cerrarImagen.addEventListener(
  "click",
  ()=>{

    modalImagen.classList.remove("show");

  }
);

modalImagen.addEventListener(
  "click",
  (e)=>{

    if(e.target === modalImagen){

      modalImagen.classList.remove("show");

    }

  }
);
import {
  storage
} from "./firebase.js";

import {
  ref,
  listAll,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

async function cargarGaleria() {

  const gallery =
    document.getElementById("galleryGrid");

  if (!gallery) return;

  gallery.innerHTML = "";

  const carpeta =
    ref(storage, "Premio");

  const archivos =
    await listAll(carpeta);

  for (const item of archivos.items) {

    const url =
      await getDownloadURL(item);

    const img =
      document.createElement("img");

    img.src = url;

    img.className =
      "gallery-img";

    gallery.appendChild(img);

  }

  iniciarModalGaleria();

}
let imagenActual = 0;

function iniciarModalGaleria() {

  const imagenes =
    document.querySelectorAll(".gallery-img");

  const modal =
    document.getElementById("imageModal");

  const modalImg =
    document.getElementById("modalImage");

  const cerrar =
    document.getElementById("closeImageModal");

  const anterior =
    document.getElementById("prevImage");

  const siguiente =
    document.getElementById("nextImage");

  imagenes.forEach((img,index)=>{

    img.onclick = ()=>{

      imagenActual = index;

      modalImg.src = img.src;

      modal.classList.add("show");

    };

  });

  cerrar.onclick = ()=>{

    modal.classList.remove("show");

  };

  anterior.onclick = ()=>{

    imagenActual--;

    if(imagenActual < 0){

      imagenActual =
        imagenes.length - 1;

    }

    modalImg.src =
      imagenes[imagenActual].src;

  };

  siguiente.onclick = ()=>{

    imagenActual++;

    if(imagenActual >= imagenes.length){

      imagenActual = 0;

    }

    modalImg.src =
      imagenes[imagenActual].src;

  };

}

cargarGaleria();

async function cargarProgreso() {

  const barra =
    document.getElementById("progressFill");

  const texto =
    document.getElementById("progressText");

  if (!barra) return;

  try {

    const progresoRef =
      doc(db, "configuracion", "progreso");

    const progresoSnap =
      await getDoc(progresoRef);

    if (!progresoSnap.exists()) return;

    const avance =
      progresoSnap.data().avance || 0;

    barra.style.width =
      avance + "%";

    if (texto) {

      texto.textContent =
        avance + "%";

    }

  } catch (error) {

    console.error(
      "Error cargando progreso:",
      error
    );

  }

}

cargarProgreso();