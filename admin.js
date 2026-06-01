import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
const pendientes =
document.getElementById("pendientes");

const pagados =
document.getElementById("pagados");

const tituloPendientes =
document.getElementById("tituloPendientes");

const tituloPagados =
document.getElementById("tituloPagados");
const totalParticipantes =
document.getElementById("totalParticipantes");
const buscador =
document.getElementById("buscador");

function cantidadPorPack(pack) {

if (pack.includes("15")) return 15;
if (pack.includes("10")) return 10;
if (pack.includes("6")) return 6;
if (pack.includes("4")) return 4;
if (pack.includes("2")) return 2;

return 1;

}

function generarNumero() {

  return Math.floor(
    Math.random() * 1000000
  )
  .toString()
  .padStart(6, "0");

}

async function generarNumerosUnicos(cantidad) {

 const consulta = query(
  collection(db, "participantes"),
  orderBy("fecha", "desc")
);

const snapshot = await getDocs(
  consulta
);
console.log("Cantidad:", snapshot.size);

  const usados = new Set();

  snapshot.forEach((docu) => {

    const datos = docu.data();

    if (datos.numeros) {

      datos.numeros.forEach((n) => {
        usados.add(n);
      });

    }

  });

  const nuevos = [];

  while (nuevos.length < cantidad) {

    const numero = generarNumero();

    if (
      !usados.has(numero) &&
      !nuevos.includes(numero)
    ) {
      nuevos.push(numero);
      usados.add(numero);
    }

  }

  return nuevos;

}


async function cargarParticipantes() {

  pendientes.innerHTML = "";
  pagados.innerHTML = "";

  let cantidadPendientes = 0;
let cantidadPagados = 0;
const dniUnicos = new Set();
  const snapshot = await getDocs(
    collection(db, "participantes")
  );

  snapshot.forEach((documento) => {

    const datos = documento.data();

    if (datos.dni) {
  dniUnicos.add(datos.dni);
}

   const fechaFormateada =
  datos.fecha
    ? datos.fecha.toDate().toLocaleString(
        "es-AR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      )
    : "Sin fecha";
    const textoBusqueda =
  buscador.value
  .toLowerCase()
  .trim();

const coincide =
  datos.nombre?.toLowerCase().includes(textoBusqueda) ||
  datos.apellido?.toLowerCase().includes(textoBusqueda) ||
  datos.dni?.includes(textoBusqueda);

if (textoBusqueda && !coincide) {
  return;
}

    console.log("Participante:", datos.nombre);

    const card = document.createElement("div");

    card.classList.add("card");

    card.innerHTML = `
      <h3>${datos.nombre} ${datos.apellido}</h3>

      <p><strong>DNI:</strong> ${datos.dni}</p>

      <p><strong>Pack:</strong> ${datos.pack}</p>

      <p><strong>Fecha:</strong> ${fechaFormateada}</p>

      <p><strong>Estado:</strong> ${datos.estado}</p>

      <p>
        <strong>Números:</strong><br>
        ${
          datos.numeros
            ? datos.numeros.join(", ")
            : "Sin asignar"
        }
      </p>

      ${
        datos.comprobanteURL
          ? `<img src="${datos.comprobanteURL}" class="comprobante-img">`
          : `<p>Sin comprobante</p>`
      }

      <br>

      ${
        datos.estado === "Pagado"
          ? `<p>✅ Pagado</p>`
          : `
            <button class="aprobar-btn">
              Aprobar pago
            </button>
          `
      }
    `;

    const boton =
      card.querySelector(".aprobar-btn");

    if (boton) {

      boton.addEventListener(
        "click",
        async () => {

          const cantidad =
            cantidadPorPack(datos.pack);

          const numeros =
            await generarNumerosUnicos(cantidad);

          await updateDoc(
            doc(
              db,
              "participantes",
              documento.id
            ),
            {
              estado: "Pagado",
              numeros: numeros
            }
          );

          cargarParticipantes();

        }
      );

    }

    if (datos.estado === "Pagado") {

  pagados.appendChild(card);
  cantidadPagados++;

} else {

  pendientes.appendChild(card);
  cantidadPendientes++;

}

  });
tituloPendientes.textContent =
  `Pagos pendientes (${cantidadPendientes})`;

tituloPagados.textContent =
  `Pagos aprobados (${cantidadPagados})`;

  totalParticipantes.textContent =
  `Participantes únicos: ${dniUnicos.size}`;

}console.log("ADMIN CARGADO");
cargarParticipantes(); 
buscador.addEventListener(
  "input",
  cargarParticipantes
);

const loginAdmin =
document.getElementById("loginAdmin");

const panelAdmin =
document.getElementById("panelAdmin");

const passwordAdmin =
document.getElementById("passwordAdmin");

const btnLogin =
document.getElementById("btnLogin");

const cerrarSesion =
document.getElementById("cerrarSesion");

btnLogin.addEventListener(
  "click",
  () => {

    if (
      passwordAdmin.value ===
      "Ojeda2026!"
    ) {

      localStorage.setItem(
  "adminLogueado",
  "si"
);

      loginAdmin.style.display =
        "none";

      panelAdmin.style.display =
        "block";

    } else {

      alert(
        "Contraseña incorrecta"
      );

    }

  }
);
if (
  localStorage.getItem(
    "adminLogueado"
  ) === "si"
) {

  loginAdmin.style.display =
    "none";

  panelAdmin.style.display =
    "block";

}

cerrarSesion.addEventListener(
  "click",
  () => {

    localStorage.removeItem(
      "adminLogueado"
    );

    location.reload();

  }
);