import { db, storage } from "./firebase.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import { guardarParticipante } from "./firestore.js";
import { subirComprobante } from "./storage.js";

import {
  ref,
  listAll,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";


// ======================================================
// REFERIDO
// ======================================================

const urlParams =
  new URLSearchParams(window.location.search);

const referido =
  urlParams.get("ref");

if (referido) {

  localStorage.setItem(
    "referido",
    referido
  );

  console.log(
    "Referido detectado:",
    referido
  );

}


// ======================================================
// TODO EL SISTEMA
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {


    // ==================================================
    // ELEMENTOS
    // ==================================================

    const modal =
      document.getElementById(
        "purchaseModal"
      );

    const successModal =
      document.getElementById(
        "successModal"
      );

    const successBtn =
      document.getElementById(
        "successBtn"
      );

    const closeBtn =
      document.getElementById(
        "closeModal"
      );
if (closeBtn && modal) {
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
  });
}

// Cerrar el cartel de "Comprobante enviado"
if (successBtn && successModal) {
  successBtn.addEventListener("click", () => {
    successModal.classList.remove("show");
  });
}
    const selectedPack =
      document.getElementById(
        "selectedPack"
      );

    const cards =
      document.querySelectorAll(
        ".open-modal"
      );

    const purchaseForm =
      document.getElementById(
        "purchaseForm"
      );

    const comprobante =
      document.getElementById(
        "comprobante"
      );

    const uploadBtn =
      document.querySelector(
        ".upload-btn"
      );


    // ==================================================
    // PACK SELECCIONADO
    // ==================================================

    let packSeleccionado = "";

    let chancesSeleccionadas = 0;

  let codigoPromoActivo = "";

  // ==================================================
// DESCUENTO POR PALABRA CLAVE - 50% OFF
// ==================================================

const PALABRA_DESCUENTO = "MITAD";

let descuentoPalabraClaveActivo = false;

const preciosNormales = {
  1: 5000,
  3: 10000,
  10: 18000,
  30: 38000,
  50: 50000,
  100: 75000
};

const preciosConDescuento = {
  1: 2500,
  3: 5000,
  10: 9000,
  30: 19000,
  50: 25000,
  100: 37500
};

function actualizarPreciosDescuento() {

  document
    .querySelectorAll(".open-modal")
    .forEach((card) => {

      const chances =
        Number(card.dataset.chances);

      const precio =
        descuentoPalabraClaveActivo
          ? preciosConDescuento[chances]
          : preciosNormales[chances];

      if (!precio) return;

      const precioElemento =
        card.querySelector(".precio-actual");

      const precioUnitario =
        card.querySelector(".precio-unitario");

      if (precioElemento) {
        precioElemento.innerText =
          `$${precio.toLocaleString("es-AR")}`;
      }

      if (precioUnitario) {
        precioUnitario.innerText =
          `$${Math.round(precio / chances).toLocaleString("es-AR")} por chance`;
      }

    });

}

const btnAplicarDescuento = document.getElementById("btnAplicarDescuento");

// Enter en el campo también aplica la palabra clave
document.getElementById("codigoDescuento")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnAplicarDescuento?.click();
  }
});

if (btnAplicarDescuento) {
  btnAplicarDescuento.addEventListener("click", () => {
    const input = document.getElementById("codigoDescuento");
    const mensaje = document.getElementById("mensajeDescuento");
    const codigo = (input?.value || "").trim().toUpperCase();

    if (codigo === "MITAD") {
      descuentoPalabraClaveActivo = true;
      actualizarPreciosDescuento();

      document.getElementById("ofertaEnteroOverlay")?.classList.remove("activo");

      if (mensaje) {
        mensaje.innerText = "✅ ¡CÓDIGO ACTIVADO! TENÉS 50% OFF.";
        mensaje.style.color = "#00ff66";
      }

    } else if (codigo === "ENTERO") {
      descuentoPalabraClaveActivo = false;
      actualizarPreciosDescuento();

      document.getElementById("ofertaEnteroOverlay")?.classList.add("activo");

      if (mensaje) {
        mensaje.innerText = "🔥 ¡OFERTA ENTERO ACTIVADA!";
        mensaje.style.color = "#00ff66";
      }

    } else {
      descuentoPalabraClaveActivo = false;
      actualizarPreciosDescuento();

      document.getElementById("ofertaEnteroOverlay")?.classList.remove("activo");

      if (mensaje) {
        mensaje.innerText = "❌ PALABRA CLAVE INCORRECTA.";
        mensaje.style.color = "#ff3333";
      }
    }
  });
}

window.abrirModalPromo = function(
  chances,
  precio,
  codigoPromo = ""
) {

  chancesSeleccionadas = chances;

  codigoPromoActivo =
    codigoPromo || "";

  packSeleccionado =
    `PROMO EXCLUSIVA • ${chances} CHANCES • $${precio}`;

  if (selectedPack) {
    selectedPack.innerText =
      packSeleccionado;
  }

  if (modal) {

    modal.classList.add("show");

    document.body.classList.add(
      "modal-open"
    );

  }

};


const ofertaEnteroOverlay = document.getElementById("ofertaEnteroOverlay");

document.getElementById("cerrarOfertaEntero")?.addEventListener("click", () => {
  ofertaEnteroOverlay?.classList.remove("activo");
});

document.querySelectorAll("[data-entero-chances]").forEach((boton) => {
  boton.addEventListener("click", () => {
    const chances = Number(boton.dataset.enteroChances);
    const precios = { 20: 10000, 50: 15000 };
    const precio = precios[chances];

    if (!precio) return;

    ofertaEnteroOverlay?.classList.remove("activo");

    window.abrirModalPromo(chances, precio, `ENTERO${chances}`);
  });
});

ofertaEnteroOverlay?.addEventListener("click", (e) => {
  if (e.target === ofertaEnteroOverlay) {
    ofertaEnteroOverlay.classList.remove("activo");
  }
});


    // ==================================================
    // COMPROBANTE
    // ==================================================

    if (
      comprobante &&
      uploadBtn
    ) {

      comprobante.addEventListener(
        "change",
        () => {

          if (
            comprobante.files.length > 0
          ) {

            uploadBtn.innerHTML =
              "✅ COMPROBANTE SELECCIONADO";

          } else {

            uploadBtn.innerHTML =
              "📷 ADJUNTAR COMPROBANTE";

          }

        }
      );

    }


    // ==================================================
    // ABRIR MODAL
    // ==================================================

    cards.forEach(
      (card) => {

        card.addEventListener(
          "click",
          () => {

            const packName =
              card.querySelector(
                "h3"
              )?.innerText || "";

            const packPrice =
              card.querySelector(
                "strong"
              )?.innerText || "";


            const cantidad =
              Number(
                card.dataset.chances
              );


            if (
              !cantidad ||
              cantidad <= 0
            ) {

              alert(
                "No se pudo determinar la cantidad de chances."
              );

              return;

            }


            chancesSeleccionadas =
              cantidad;

            codigoPromoActivo = "";

            packSeleccionado =
              `${packName} • ${cantidad} CHANCE${cantidad === 1 ? "" : "S"} • ${packPrice}`;


            if (selectedPack) {

              selectedPack.innerText =
                packSeleccionado;

            }

if (modal) {
  modal.classList.add("show");
  document.body.classList.add("modal-open");
}

          }
        );
      }
    );


// ==================================================
// CONTADOR — REVELACIÓN → SORTEO
// ==================================================

const countdownLabel =
  document.getElementById("countdownLabel");

const drawDate =
  document.querySelector(".draw-date");

// ================================================
// ETAPA 1
// Revelación de las motos
// Viernes 18 de septiembre de 2026 — 21:00 hs
// Argentina UTC-3
// ================================================

const revelationDate =
  new Date("2026-09-18T21:00:00-03:00");

// ================================================
// ETAPA 2
// Sorteo definitivo
// Viernes 16 de octubre de 2026 — 22:00 hs
// Argentina UTC-3
// ================================================

const raffleDate =
  new Date("2026-10-16T22:00:00-03:00");


// ==================================================
// ACTUALIZAR CONTADOR
// ==================================================

function updateCountdown() {

  const now = new Date();

  // ==================================================
  // ETAPA 1 — FALTA PARA DAR A CONOCER LAS MOTOS
  // ==================================================

  if (now < revelationDate) {

    if (countdownLabel) {
      countdownLabel.innerText =
        "🏍️ FALTA SOLO ESTO PARA DAR A CONOCER LAS MOTOS";
    }

    if (drawDate) {
      drawDate.innerText =
        "🔥 VIERNES 18 DE SEPTIEMBRE — 21:00 HS";
    }

    actualizarValores(
      revelationDate - now
    );

    return;
  }


  // ==================================================
  // ETAPA 2 — FALTA PARA EL SORTEO EN VIVO
  // ==================================================

  if (now < raffleDate) {

    if (countdownLabel) {
      countdownLabel.innerText =
        "🔥 FALTA SOLO ESTO PARA EL SORTEO EN VIVO";
    }

    if (drawDate) {
      drawDate.innerText =
        "🏆 VIERNES 16 DE OCTUBRE — 22:00 HS";
    }

    actualizarValores(
      raffleDate - now
    );

    return;
  }


  // ==================================================
  // DESPUÉS DEL SORTEO
  // ==================================================

  if (countdownLabel) {
    countdownLabel.innerText =
      "🏆 SORTEO EN VIVO";
  }

  if (drawDate) {
    drawDate.innerText =
      "🏆 VIERNES 16 DE OCTUBRE — 22:00 HS";
  }

  actualizarValores(0);
}


// ==================================================
// MOSTRAR DÍAS / HORAS / MINUTOS / SEGUNDOS
// ==================================================

function actualizarValores(difference) {

  const daysElement =
    document.getElementById("days");

  const hoursElement =
    document.getElementById("hours");

  const minutesElement =
    document.getElementById("minutes");

  const secondsElement =
    document.getElementById("seconds");


  difference =
    Math.max(0, difference);


  const days =
    Math.floor(
      difference /
      (1000 * 60 * 60 * 24)
    );


  const hours =
    Math.floor(
      (difference %
        (1000 * 60 * 60 * 24)) /
      (1000 * 60 * 60)
    );


  const minutes =
    Math.floor(
      (difference %
        (1000 * 60 * 60)) /
      (1000 * 60)
    );


  const seconds =
    Math.floor(
      (difference %
        (1000 * 60)) /
      1000
    );


  if (daysElement) {
    daysElement.innerText =
      String(days).padStart(2, "0");
  }


  if (hoursElement) {
    hoursElement.innerText =
      String(hours).padStart(2, "0");
  }


  if (minutesElement) {
    minutesElement.innerText =
      String(minutes).padStart(2, "0");
  }


  if (secondsElement) {
    secondsElement.innerText =
      String(seconds).padStart(2, "0");
  }
}


// ==================================================
// INICIAR CONTADOR
// ==================================================

updateCountdown();

setInterval(
  updateCountdown,
  1000
);

    // ==================================================
    // COPIAR ALIAS
    // ==================================================

    const copyAlias =
      document.getElementById(
        "copyAlias"
      );


    if (copyAlias) {

      copyAlias.addEventListener(
        "click",
        async () => {

          try {

            await navigator.clipboard.writeText(
              "repuestos.ojeda"
            );

            copyAlias.innerText =
              "✓ ALIAS COPIADO";


            setTimeout(
              () => {

                copyAlias.innerText =
                  "COPIAR ALIAS";

              },
              2000
            );

          } catch (error) {

            console.error(
              "Error copiando alias:",
              error
            );

          }

        }
      );

    }


    // ==================================================
    // COPIAR CVU
    // ==================================================

    const copyCvu =
      document.getElementById(
        "copyCvu"
      );


    if (copyCvu) {

      copyCvu.addEventListener(
        "click",
        async () => {

          try {

            await navigator.clipboard.writeText(
              "3840200500000030295274"
            );

            copyCvu.innerText =
              "✓ CVU COPIADO";


            setTimeout(
              () => {

                copyCvu.innerText =
                  "COPIAR CVU";

              },
              2000
            );

          } catch (error) {

            console.error(
              "Error copiando CVU:",
              error
            );

          }

        }
      );

    }


    // ==================================================
    // ENVIAR COMPROBANTE
    // ==================================================

    if (purchaseForm) {

      let enviando = false;


      purchaseForm.addEventListener(
        "submit",
        async (e) => {

          e.preventDefault();


          if (enviando) {
            return;
          }


          if (
            !chancesSeleccionadas ||
            !packSeleccionado
          ) {

            alert(
              "Primero seleccioná un pack de chances."
            );

            return;

          }


          const archivo =
            comprobante?.files?.[0];


          if (!archivo) {

            alert(
              "Debés adjuntar un comprobante."
            );

            return;

          }


          enviando = true;


          const submitBtn =
            purchaseForm.querySelector(
              'button[type="submit"]'
            );


          if (submitBtn) {

            submitBtn.disabled = true;

            submitBtn.innerHTML =
              "⏳ SUBIENDO...";

          }


          purchaseForm.style.pointerEvents =
            "none";

          purchaseForm.style.opacity =
            "0.6";


          try {


            // ------------------------------------------
            // DATOS
            // ------------------------------------------

            const nombre =
              document.getElementById(
                "nombre"
              )?.value
              .trim() || "";


            const apellido =
              document.getElementById(
                "apellido"
              )?.value
              .trim() || "";


            const dni =
              document.getElementById(
                "dniCompra"
              )?.value
              .trim() || "";


            const telefono =
              document.getElementById(
                "telefono"
              )?.value
              .trim() || "";


            const instagram =
              document.getElementById(
                "instagram"
              )?.value
              .trim() || "";


            if (
              !nombre ||
              !apellido ||
              !dni ||
              !telefono
            ) {

              alert(
                "Completá todos los datos obligatorios."
              );

              enviando = false;

              if (submitBtn) {

                submitBtn.disabled =
                  false;

                submitBtn.innerText =
                  "ENVIAR COMPROBANTE";

              }

              purchaseForm.style.pointerEvents =
                "auto";

              purchaseForm.style.opacity =
                "1";

              return;

            }


            // ------------------------------------------
            // SUBIR COMPROBANTE
            // ------------------------------------------

            if (submitBtn) {

              submitBtn.innerHTML =
                "⏳ PREPARANDO COMPROBANTE...";

            }

            const comprobanteSubido =
              await subirComprobante(
                archivo,
                (progreso) => {

                  if (submitBtn) {

                    submitBtn.innerHTML =
                      `⏳ SUBIENDO... ${progreso}%`;

                  }

                }
              );


            // ------------------------------------------
            // GUARDAR PARTICIPANTE
            // ------------------------------------------

            if (submitBtn) {

              submitBtn.innerHTML =
                "⏳ GUARDANDO DATOS...";

            }

            const guardado =
              await guardarParticipante({

                nombre,

                apellido,

                dni,

                telefono,

                instagram,

                pack:
                  packSeleccionado,

                chancesBase:
                  chancesSeleccionadas,

         chancesFinales:
  chancesSeleccionadas,

codigoPromo:
  codigoPromoActivo,


precioFinal:
  codigoPromoActivo === "ENTERO20"
    ? 10000
    : codigoPromoActivo === "ENTERO50"
      ? 15000
      : codigoPromoActivo === "SUPER50"
        ? 14999
        : codigoPromoActivo === "SUPER100"
          ? 19999
          : descuentoPalabraClaveActivo
            ? preciosConDescuento[chancesSeleccionadas] || 0
            : preciosNormales[chancesSeleccionadas] || 0,

        
multiplicadorPromo:
  1,

                referido:
                  localStorage.getItem(
                    "referido"
                  ) || "",

                comprobanteURL:
                  comprobanteSubido.url,

                comprobantePath:
                  comprobanteSubido.path

              });


            if (!guardado) {

              throw new Error(
                "NO_GUARDADO"
              );

            }


            // ------------------------------------------
            // NOTIFICACIÓN LOCAL
            // ------------------------------------------

            mostrarNotificacionCompra(
              nombre,
              apellido,
              packSeleccionado
            );


            // ------------------------------------------
            // MOSTRAR ÉXITO
            // ------------------------------------------

            if (modal) {

              modal.classList.remove(
                "show"
              );

            }


            document.body.classList.remove(
              "modal-open"
            );


            if (successModal) {

              successModal.classList.add(
                "show"
              );

            }


            purchaseForm.reset();


            if (uploadBtn) {

              uploadBtn.innerHTML =
                "📷 ADJUNTAR COMPROBANTE";

            }


          } catch (error) {

            console.error(
              "ERROR AL ENVIAR:",
              error
            );


            // Mensaje claro según qué falló

            let mensaje =
              "No se pudo enviar el comprobante. Probá de nuevo en un momento.";

            if (error.message === "SIN_CONEXION") {

              mensaje =
                "⚠️ Se cortó la conexión mientras subía el comprobante.\n\n" +
                "Revisá tu señal o wifi y tocá ENVIAR COMPROBANTE de nuevo.";

            } else if (
              error.code === "storage/unauthorized" ||
              error.code === "storage/canceled"
            ) {

              mensaje =
                "⚠️ No se pudo subir ese archivo.\n\n" +
                "Probá con una captura de pantalla del comprobante (JPG o PNG).";

            } else if (error.message === "NO_GUARDADO") {

              mensaje =
                "⚠️ El comprobante se subió pero no pudimos registrar tu compra.\n\n" +
                "Revisá tu conexión y tocá ENVIAR COMPROBANTE de nuevo.";

            }

            alert(mensaje);


          } finally {

            enviando = false;


            if (submitBtn) {

              submitBtn.disabled =
                false;

              submitBtn.innerText =
                "ENVIAR COMPROBANTE";

            }


            purchaseForm.style.pointerEvents =
              "auto";

            purchaseForm.style.opacity =
              "1";

          }

        }
      );

    }


    // ==================================================
    // GALERÍA
    // ==================================================

    cargarGaleria();


    // ==================================================
    // RANKING
    // ==================================================

    cargarRanking();


    // ==================================================
    // NOTIFICACIONES EN VIVO
    // ==================================================

    iniciarNotificacionesEnVivo();

  }
);


// ======================================================
// NOTIFICACIÓN FLOTANTE
// ======================================================

let colaNotificaciones = [];

let mostrandoNotificacion = false;


function crearEstilosNotificacion() {

  if (
    document.getElementById(
      "purchaseNotificationStyles"
    )
  ) {

    return;

  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "purchaseNotificationStyles";


  style.innerHTML = `

    .purchase-notification {

      position: fixed;

      left: 20px;
      bottom: 25px;

      z-index: 999999;

      display: flex;
      align-items: center;

      gap: 12px;

      width: min(
        360px,
        calc(100vw - 40px)
      );

      padding: 13px 16px;

      background:
        linear-gradient(
          135deg,
          #111111,
          #1c1c1c
        );

      border:
        1px solid
        rgba(
          255,
          35,
          35,
          0.65
        );

      border-left:
        4px solid
        #ff2020;

      border-radius:
        14px;

      box-shadow:
        0 12px 35px
        rgba(
          0,
          0,
          0,
          0.45
        );

      color: white;

      opacity: 0;

      transform:
        translateY(25px)
        scale(0.96);

      pointer-events: none;

      transition:
        opacity 0.35s ease,
        transform 0.35s ease;

    }


    .purchase-notification.show {

      opacity: 1;

      transform:
        translateY(0)
        scale(1);

    }


    .purchase-notification-icon {

      width: 42px;
      height: 42px;

      flex-shrink: 0;

      display: flex;
      align-items: center;
      justify-content: center;

      background:
        linear-gradient(
          135deg,
          #ff2020,
          #a50000
        );

      border-radius: 50%;

      font-size: 20px;

    }


    .purchase-notification-content {

      display: flex;

      flex-direction: column;

      min-width: 0;

      line-height: 1.2;

    }


    .purchase-notification-content strong {

      font-size: 14px;

      font-weight: 800;

      color: #ffffff;

      white-space: nowrap;

      overflow: hidden;

      text-overflow: ellipsis;

    }


    .purchase-notification-content span {

      margin-top: 4px;

      font-size: 13px;

      font-weight: 700;

      color: #ff3b3b;

    }


    .purchase-notification-content small {

      margin-top: 4px;

      font-size: 10px;

      color: #999;

    }


    @media (
      max-width: 600px
    ) {

      .purchase-notification {

        left: 12px;
        bottom: 15px;

        width:
          calc(100vw - 24px);

        padding:
          11px 13px;

      }

      .purchase-notification-icon {

        width: 38px;
        height: 38px;

        font-size: 18px;

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


function mostrarNotificacionCompra(
  nombre,
  apellido,
  pack
) {

  crearEstilosNotificacion();


  colaNotificaciones.push({

    nombre:
      nombre || "",

    apellido:
      apellido || "",

    pack:
      pack || "chances"

  });


  procesarColaNotificaciones();

}


function procesarColaNotificaciones() {

  if (
    mostrandoNotificacion
  ) {

    return;

  }


  if (
    colaNotificaciones.length === 0
  ) {

    return;

  }


  // Nunca dos carteles juntos: si hay uno abierto
  // (cierre, súper promo, formulario...), esperar.

  if (window.Carteles?.hayAbierto()) {

    setTimeout(
      procesarColaNotificaciones,
      2000
    );

    return;

  }


  mostrandoNotificacion =
    true;


  const compra =
    colaNotificaciones.shift();


  let notification =
    document.getElementById(
      "purchaseNotification"
    );


  if (!notification) {

    notification =
      document.createElement(
        "div"
      );

    notification.id =
      "purchaseNotification";

    notification.className =
      "purchase-notification";


    notification.innerHTML = `

      <div class="
        purchase-notification-icon
      ">
        🎟️
      </div>

      <div class="
        purchase-notification-content
      ">

        <strong
          id="purchaseNotificationName"
        ></strong>

        <span
          id="purchaseNotificationPack"
        ></span>

        <small>
          Compra reciente
        </small>

      </div>

    `;


    document.body.appendChild(
      notification
    );

  }


  const nameElement =
    document.getElementById(
      "purchaseNotificationName"
    );


  const packElement =
    document.getElementById(
      "purchaseNotificationPack"
    );


  // Igual que el ranking: "Kevin Porchile" -> "Kevin P."
  const nombreCompleto =
    nombreRanking(
      `${compra.nombre || ""} ${compra.apellido || ""}`
    );


  if (nameElement) {

    nameElement.textContent =
      `🎉 ${nombreCompleto}`;

  }


  if (packElement) {

    packElement.textContent =
      `Compró ${compra.pack}`;

  }


  // Mostrar

  notification.classList.add(
    "show"
  );


  // Mantener 5 segundos

  setTimeout(
    () => {

      notification.classList.remove(
        "show"
      );


      setTimeout(
        () => {

          mostrandoNotificacion =
            false;

          procesarColaNotificaciones();

        },
        400
      );


    },
    5000
  );

}


// ======================================================
// NOTIFICACIONES EN VIVO DESDE FIREBASE
// ======================================================

let primerCargaNotificaciones =
  true;


function iniciarNotificacionesEnVivo() {

  crearEstilosNotificacion();


  try {

// "compras_recientes" solo tiene nombre abreviado y pack.
// Los datos completos están en "participantes", que solo lee el admin.
const consulta = query(
  collection(db, "compras_recientes"),
  orderBy("fecha", "desc"),
  limit(1)
);

    onSnapshot(
      consulta,
      (snapshot) => {

        // No mostrar las compras
        // que ya existían al abrir

        if (
          primerCargaNotificaciones
        ) {

          primerCargaNotificaciones =
            false;

          return;

        }


        snapshot.docChanges()
          .forEach(
            (change) => {

              if (
                change.type !== "added"
              ) {

                return;

              }


              const datos =
                change.doc.data();


              mostrarNotificacionCompra(

                datos.nombre,

                datos.apellido,

                datos.pack

              );

            }
          );

      },
      (error) => {

        console.error(
          "Error en notificaciones en vivo:",
          error
        );

      }
    );


  } catch (error) {

    console.error(
      "No se pudo iniciar notificaciones:",
      error
    );

  }

}


// ======================================================
// GALERÍA DESDE FIREBASE STORAGE
// ======================================================

let imagenActual = 0;


async function cargarGaleria() {

  const gallery =
    document.getElementById(
      "galleryGrid"
    );


  if (!gallery) {
    return;
  }


  try {

    gallery.innerHTML = "";


    const carpeta =
      ref(
        storage,
        "Premio"
      );


    const archivos =
      await listAll(
        carpeta
      );


    const urls = [];


    for (
      const item
      of archivos.items
    ) {

      const url =
        await getDownloadURL(
          item
        );


      urls.push(url);


      const img =
        document.createElement(
          "img"
        );


      // Miniatura liviana (assets/premios/<mismo nombre>) para la grilla;
      // la foto grande de Storage se descarga solo al abrirla.
      // Si una foto nueva no tiene miniatura, se usa la grande.
      img.dataset.full =
        url;

      img.onerror = () => {
        img.onerror = null;
        img.src = url;
      };

      img.src =
        `assets/premios/${encodeURIComponent(item.name)}`;

      // Se descarga recién cuando la persona baja hasta Premios
      img.loading =
        "lazy";

      img.decoding =
        "async";

      img.width = 400;
      img.height = 400;

      img.className =
        "gallery-img";

      img.alt =
        "Premio";


      gallery.appendChild(
        img
      );

    }


  


    iniciarModalGaleria();


  } catch (error) {

    console.error(
      "Error cargando galería:",
      error
    );

  }

}


// ======================================================
// MODAL GALERÍA
// ======================================================

function iniciarModalGaleria() {

  const contador =
    document.getElementById(
      "galleryCounter"
    );


  const imagenes =
    document.querySelectorAll(
      ".gallery-img"
    );


  const modal =
    document.getElementById(
      "imageModal"
    );


  const modalImg =
    document.getElementById(
      "modalImage"
    );


  const cerrar =
    document.getElementById(
      "closeImageModal"
    );


  const anterior =
    document.getElementById(
      "prevImage"
    );


  const siguiente =
    document.getElementById(
      "nextImage"
    );


  if (
    !modal ||
    !modalImg
  ) {

    return;

  }


  // Muestra al instante la miniatura (ya descargada) y la cambia
  // por la foto grande apenas termina de bajar. También precarga
  // la anterior y la siguiente para que las flechas sean instantáneas.
  const precargadas = new Set();

  function precargar(imgEl) {
    const full = imgEl && imgEl.dataset.full;
    if (!full || precargadas.has(full)) return;
    precargadas.add(full);
    const grande = new Image();
    grande.src = full;
  }

  function mostrarFoto(imgEl) {

    const full = imgEl.dataset.full;

    modalImg.src = imgEl.currentSrc || imgEl.src;

    if (full) {
      const grande = new Image();
      grande.onload = () => {
        if (imagenes[imagenActual] === imgEl) {
          modalImg.src = full;
        }
      };
      grande.src = full;
      precargadas.add(full);
    }

    const total = imagenes.length;
    precargar(imagenes[(imagenActual + 1) % total]);
    precargar(imagenes[(imagenActual - 1 + total) % total]);

  }


  imagenes.forEach(
    (img, index) => {

      img.onclick =
        () => {

          imagenActual =
            index;


          mostrarFoto(img);


          if (contador) {

            contador.textContent =
              `${imagenActual + 1} / ${imagenes.length}`;

          }


          modal.classList.add(
            "show"
          );

        };

    }
  );


  if (cerrar) {

    cerrar.onclick =
      () => {

        modal.classList.remove(
          "show"
        );

      };

  }


  if (anterior) {

    anterior.onclick =
      () => {

        if (
          imagenes.length === 0
        ) {

          return;

        }


        imagenActual--;


        if (
          imagenActual < 0
        ) {

          imagenActual =
            imagenes.length - 1;

        }


        mostrarFoto(imagenes[imagenActual]);


        if (contador) {

          contador.textContent =
            `${imagenActual + 1} / ${imagenes.length}`;

        }

      };

  }


  if (siguiente) {

    siguiente.onclick =
      () => {

        if (
          imagenes.length === 0
        ) {

          return;

        }


        imagenActual++;


        if (
          imagenActual >=
          imagenes.length
        ) {

          imagenActual = 0;

        }


        mostrarFoto(imagenes[imagenActual]);


        if (contador) {

          contador.textContent =
            `${imagenActual + 1} / ${imagenes.length}`;

        }

      };

  }


  modal.onclick =
    (e) => {

      if (
        e.target === modal
      ) {

        modal.classList.remove(
          "show"
        );

      }

    };

}


// ======================================================
// RANKING EN VIVO
// ======================================================

function nombreRanking(
  nombreCompleto
) {

  // MUESTRA PRIMER NOMBRE + INICIAL DEL APELLIDO
  // "Leopoldo david Montiel" -> "Leopoldo M."

  const partes =
    String(nombreCompleto || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (partes.length === 0) {
    return "Participante";
  }

  const primerNombre =
    partes[0].charAt(0).toUpperCase() +
    partes[0].slice(1).toLowerCase();

  if (partes.length === 1) {
    return primerNombre;
  }

  const inicialApellido =
    partes[partes.length - 1]
      .charAt(0)
      .toUpperCase();

  return `${primerNombre} ${inicialApellido}.`;

}


// ======================================================
// CARGAR RANKING
// ======================================================
async function cargarRanking() {

  const container =
    document.getElementById(
      "rankingContainer"
    );

  if (!container) {
    return;
  }

  try {

    // "publico/ranking" tiene solo el top 5 con nombre abreviado.
    // Lo actualiza el admin; la colección "ranking" es privada.

    const snapshot =
      await getDoc(
        doc(
          db,
          "publico",
          "ranking"
        )
      );

    const top =
      snapshot.exists() &&
      Array.isArray(snapshot.data().top)
        ? snapshot.data().top.map(
            (item) => ({
              nombre:
                item.nombre ||
                "Participante",
              chances:
                Number(
                  item.chances
                ) || 0
            })
          )
        : [];

    // ==================================================
    // MOSTRAR RANKING
    // ==================================================

    container.innerHTML = "";

    top.forEach(
      (item, index) => {

        let posicion;

        if (index === 0) {
          posicion = "🥇";
        } else if (index === 1) {
          posicion = "🥈";
        } else if (index === 2) {
          posicion = "🥉";
        } else {
          posicion = index + 1;
        }

        const card =
          document.createElement(
            "div"
          );

        card.className =
          "ranking-card";

        card.innerHTML = `
          <div class="ranking-position">
            ${posicion}
          </div>

          <div class="ranking-info">
            <div class="ranking-name"></div>

            <div class="ranking-chances">
              ${item.chances} CHANCES
            </div>
          </div>
        `;

        // textContent: el nombre se muestra como texto, nunca como HTML
        card.querySelector(
          ".ranking-name"
        ).textContent =
          nombreRanking(item.nombre);

        container.appendChild(
          card
        );

      }
    );

  } catch (error) {

    console.error(
      "Error cargando ranking:",
      error
    );

  }

}

// ======================================================
// CONSULTAR NÚMEROS POR DNI
// ======================================================

const btnConsultar =
  document.getElementById("btnConsultar");

const resultadoNumeros =
  document.getElementById("resultadoNumeros");

if (btnConsultar && resultadoNumeros) {

  btnConsultar.addEventListener(
    "click",
    async () => {

      const dniInput =
        document.getElementById("dni");

      const dniBuscado =
        (dniInput?.value || "")
          .toString()
          .trim()
          .replace(/\D/g, "");

      resultadoNumeros.innerHTML = `
        <p>
          ⏳ Buscando tus números...
        </p>
      `;

      if (!dniBuscado) {

        resultadoNumeros.innerHTML = `
          <p>
            ⚠️ Ingresá tu DNI.
          </p>
        `;

        return;
      }

      try {

        // "consultas/{dni}" solo tiene nombre abreviado
        // y las compras aprobadas con sus números.
        // Lo arma el admin al aprobar cada pago.

        const consultaDoc =
          await getDoc(
            doc(
              db,
              "consultas",
              dniBuscado
            )
          );

        const consultaDatos =
          consultaDoc.exists()
            ? consultaDoc.data()
            : null;

        const encontrados =
          Array.isArray(consultaDatos?.compras)
            ? consultaDatos.compras.map(
                (compra) => ({
                  nombre: consultaDatos.nombre,
                  apellido: "",
                  estado: "Pagado",
                  pack: compra.pack,
                  chancesFinales: compra.chances,
                  numeros: compra.numeros
                })
              )
            : [];


        if (!encontrados.length) {

          resultadoNumeros.innerHTML = `
            <div class="consulta-resultado">
              <h3>❌ NO ENCONTRAMOS NÚMEROS PARA TU DNI</h3>

              <p>
                Revisá que el DNI ingresado
                sea correcto.
              </p>

              <p>
                Si compraste hace poco, tu pago
                todavía se está verificando: los
                números aparecen cuando se aprueba.
              </p>
            </div>
          `;

          return;
        }


        let html = "";

        let totalNumeros = 0;


        encontrados.forEach(
          (datos) => {

            const numeros =
              Array.isArray(
                datos.numeros
              )
                ? datos.numeros
                : [];


            totalNumeros +=
              numeros.length;


            html += `

              <div class="consulta-compra">

                <h3>
                  ${datos.nombre || ""}
                  ${datos.apellido || ""}
                </h3>

                <p>
                  <strong>Estado:</strong>
                  ${datos.estado || "-"}
                </p>

                <p>
                  <strong>Pack:</strong>
                  ${datos.pack || "-"}
                </p>

                <p>
                  <strong>Chances:</strong>
                  ${
                    datos.chancesFinales ||
                    0
                  }
                </p>

                <div class="consulta-numeros">

                  <strong>
                    🎟️ TUS NÚMEROS
                  </strong>

                  ${
                    numeros.length

                      ? numeros
                         .map(
  (numero) =>
    `<span>${numero}</span>`
)
.join(", ")

                      : `
                        <p>
                          Todavía no fueron
                          asignados.
                        </p>
                      `
                  }

                </div>

              </div>

            `;

          }
        );


        resultadoNumeros.innerHTML = `

          <div class="consulta-resumen">

            <strong>
              🎟️ ${totalNumeros}
              NÚMERO${totalNumeros === 1 ? "" : "S"}
              ASIGNADO${totalNumeros === 1 ? "" : "S"}
            </strong>

          </div>

          ${html}

        `;

// Mostrar super promo después de 2 segundos
if (totalNumeros > 0) {
  mostrarSuperPromo();
}


      } catch (error) {

        console.error(
          "ERROR CONSULTANDO NÚMEROS:",
          error
        );

        resultadoNumeros.innerHTML = `

          <div class="consulta-resultado">

            <h3>
              ❌ ERROR
            </h3>

            <p>
              No se pudieron consultar
              tus números.
            </p>

          </div>

        `;

      }

    }
  );

}

// ======================================================
// SUPER PROMO PARA PARTICIPANTES
// ======================================================

const superPromoOverlay =
  document.getElementById("superPromoOverlay");

const superPromoContador =
  document.getElementById("superPromoContador");

const cerrarSuperPromo =
  document.getElementById("cerrarSuperPromo");

let superPromoTimer = null;
let superPromoInterval = null;


// ------------------------------------------------------
// MOSTRAR SUPER PROMO
// ------------------------------------------------------

function mostrarSuperPromo() {

  if (!superPromoOverlay || !superPromoContador) {
    return;
  }

  // Limpiar cualquier contador anterior
  if (superPromoTimer) {
    clearTimeout(superPromoTimer);
  }

  if (superPromoInterval) {
    clearInterval(superPromoInterval);
  }

  // Después del cierre no se ofrece nada
  if (window.participacionesCerradas?.()) {
    return;
  }

  // Esperar 1 segundo y que no haya otro cartel abierto
  const cuandoLibre =
    window.Carteles
      ? (abrir) => window.Carteles.cuandoLibre(abrir)
      : (abrir) => abrir();

  superPromoTimer = setTimeout(() => cuandoLibre(() => {

    let segundosRestantes = 120;

    superPromoOverlay.classList.add("activo");

    function actualizarContador() {

      const minutos =
        Math.floor(segundosRestantes / 60);

      const segundos =
        segundosRestantes % 60;

      superPromoContador.innerText =
        String(minutos).padStart(2, "0") +
        ":" +
        String(segundos).padStart(2, "0");

      if (segundosRestantes <= 0) {

        clearInterval(superPromoInterval);

        superPromoOverlay.classList.remove("activo");

        return;
      }

      segundosRestantes--;
    }

    actualizarContador();

    superPromoInterval = setInterval(
      actualizarContador,
      1000
    );

  }), 1000);
}


// ------------------------------------------------------
// CERRAR POPUP
// ------------------------------------------------------

if (cerrarSuperPromo) {

  cerrarSuperPromo.addEventListener(
    "click",
    () => {

      superPromoOverlay.classList.remove(
        "activo"
      );

      if (superPromoInterval) {
        clearInterval(superPromoInterval);
      }

    }
  );

}


// ------------------------------------------------------
// CERRAR AL TOCAR AFUERA
// ------------------------------------------------------

if (superPromoOverlay) {

  superPromoOverlay.addEventListener(
    "click",
    (e) => {

      if (e.target === superPromoOverlay) {

        superPromoOverlay.classList.remove(
          "activo"
        );

        if (superPromoInterval) {
          clearInterval(superPromoInterval);
        }

      }

    }
  );

}


// ------------------------------------------------------
// BOTONES 50 / 100 CHANCES
// ------------------------------------------------------

document
  .querySelectorAll("[data-promo-chances]")
  .forEach((boton) => {

    boton.addEventListener(
      "click",
      () => {

        const chances =
          Number(boton.dataset.promoChances);

       const precio =
  chances === 50
    ? 14999
    : 19999;

        const codigoPromo =
          chances === 50
            ? "SUPER50"
            : "SUPER100";

        // Cerrar popup
        superPromoOverlay?.classList.remove(
          "activo"
        );

        if (superPromoInterval) {
          clearInterval(superPromoInterval);
        }

        // Abrir directamente la promo
        if (
          typeof window.abrirModalPromo ===
          "function"
        ) {

          window.abrirModalPromo(
            chances,
            precio,
            codigoPromo
          );

        }

      }
    );

  });
