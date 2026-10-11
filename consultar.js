import { db } from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const boton =
  document.getElementById("buscar");

const resultado =
  document.getElementById("resultado");

// =====================================================
// CONSULTAR NÚMEROS POR DNI
// =====================================================
// Lee "consultas/{dni}", que solo tiene nombre abreviado
// y las compras aprobadas. Lo arma el admin al aprobar.

boton.addEventListener(
  "click",
  async () => {

    const dni =
      document.getElementById("dni")
        .value
        .trim()
        .replace(/\D/g, "");

    resultado.innerHTML = "";

    if (!dni) {
      resultado.textContent = "Ingresá tu DNI";
      return;
    }

    try {

      const snapshot =
        await getDoc(
          doc(db, "consultas", dni)
        );

      const datos =
        snapshot.exists()
          ? snapshot.data()
          : null;

      const compras =
        Array.isArray(datos?.compras)
          ? datos.compras
          : [];

      if (!compras.length) {

        resultado.textContent =
          "No encontramos números para ese DNI. Si compraste hace poco, tu pago todavía se está verificando.";

        return;

      }

      const totalNumeros =
        compras.reduce(
          (total, compra) =>
            total + (compra.numeros || []).length,
          0
        );

      // Resumen

      const resumen =
        document.createElement("div");

      resumen.className = "compra-card";

      resumen.innerHTML = `
        <h2></h2>
        <p><strong>Total de compras:</strong> ${compras.length}</p>
        <p><strong>Total de números asignados:</strong> ${totalNumeros}</p>
      `;

      resumen.querySelector("h2").textContent =
        datos.nombre || "Participante";

      resultado.appendChild(resumen);

      // Una tarjeta por compra

      compras.forEach(
        (compra) => {

          const card =
            document.createElement("div");

          card.className = "compra-card";

          card.innerHTML = `
            <p><strong>Pack:</strong> <span class="pack"></span></p>
            <h3>Tus números</h3>
            <p class="numeros"></p>
          `;

          card.querySelector(".pack").textContent =
            compra.pack || "-";

          card.querySelector(".numeros").textContent =
            (compra.numeros || []).join(", ");

          resultado.appendChild(card);

        }
      );

    } catch (error) {

      console.error(
        "Error consultando números:",
        error
      );

      resultado.textContent =
        "No se pudieron consultar tus números. Probá de nuevo.";

    }

  }
);
