import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const boton =
  document.getElementById("buscar");

const resultado =
  document.getElementById("resultado");

boton.addEventListener(
  "click",
  async () => {

    const dni =
      document.getElementById("dni")
      .value
      .trim();

    const snapshot =
      await getDocs(
        collection(db, "participantes")
      );

    let encontrado = false;

    let totalCompras = 0;
let totalNumeros = 0;
let nombreCompleto = "";

    resultado.innerHTML = "";

    snapshot.forEach((documento) => {

      const datos =
        documento.data();

     if (datos.dni === dni) {

  encontrado = true;

  totalCompras++;

  nombreCompleto =
    `${datos.nombre} ${datos.apellido}`;

  if (datos.numeros) {
    totalNumeros += datos.numeros.length;
  }

        resultado.innerHTML += `
          <div class="compra-card">

            <h2>
              ${datos.nombre}
              ${datos.apellido}
            </h2>

            <p>
              <strong>Estado:</strong>
              ${datos.estado}
            </p>

            <p>
              <strong>Pack:</strong>
              ${datos.pack}
            </p>

            <h3>
              Tus números
            </h3>

            <p>
              ${
                datos.numeros
                  ? datos.numeros.join("<br>")
                  : "Todavía no fueron asignados"
              }
            </p>

          </div>
        `;
      }

    });

    if (encontrado) {

  resultado.innerHTML =
    `
      <div class="compra-card">

        <h2>
          ${nombreCompleto}
        </h2>

        <p>
          <strong>Total de compras:</strong>
          ${totalCompras}
        </p>

        <p>
          <strong>Total de números asignados:</strong>
          ${totalNumeros}
        </p>

      </div>
    `
    + resultado.innerHTML;

}
    if (!encontrado) {

      resultado.innerHTML =
        "Participante no encontrado";

    }

  }
);