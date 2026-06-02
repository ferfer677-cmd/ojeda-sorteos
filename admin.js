import { db } from "./firebase.js";

import { storage } from "./firebase.js";

import {
  ref,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
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

const recaudacionTotal =
document.getElementById("recaudacionTotal");

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
let recaudacion = 0;

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
    ? `
      <p>✅ Pagado</p>

      <button class="eliminar-btn">
        🗑 ELIMINAR PARTICIPANTE
      </button>
    `
    : `
      <button class="aprobar-btn">
        Aprobar pago
      </button>

      <button class="eliminar-btn">
        🗑 ELIMINAR PARTICIPANTE
      </button>
    `
}
    `;

    const boton =
      card.querySelector(".aprobar-btn");

      const botonEliminar =
  card.querySelector(".eliminar-btn");

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

   if (botonEliminar) {

 botonEliminar.addEventListener(
  "click",
  async () => {

      const confirmar = confirm(
        `¿Eliminar a ${datos.nombre} ${datos.apellido}?`
      );

      if (!confirmar) {
        return;
      }

  if (datos.comprobantePath) {

  try {

      console.log(
      "Intentando borrar:",
      datos.comprobantePath
    );

    const archivoRef = ref(
      storage,
      datos.comprobantePath
    );

    await deleteObject(archivoRef);

    console.log(
      "Comprobante eliminado:",
      datos.comprobantePath
    );

  } catch (error) {

    console.error(
      "Error eliminando comprobante:",
      error
    );

  }

}

await deleteDoc(
  doc(
    db,
    "participantes",
    documento.id
  )
);

cargarParticipantes();

    }
  );

}

if (datos.estado === "Pagado") {

  pagados.appendChild(card);
  cantidadPagados++;

  const precioTexto =
    datos.pack.split("$")[1];

  if (precioTexto) {

    const precio =
      Number(
        precioTexto.replace(/\./g, "")
      );

    recaudacion += precio;

  }

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

  recaudacionTotal.textContent =
  `Recaudación estimada: $${recaudacion.toLocaleString("es-AR")}`;

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

const exportarSorteo =
document.getElementById("exportarSorteo");

const borrarTodo =
document.getElementById("borrarTodo");

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

borrarTodo.addEventListener(
  "click",
  async () => {

    const texto = prompt(
      'Escribí BORRAR para eliminar todo el sorteo'
    );

    if (texto !== "BORRAR") {

      alert(
        "Operación cancelada"
      );

      return;

    }

    const snapshot = await getDocs(
      collection(db, "participantes")
    );

    for (const documento of snapshot.docs) {

      const datos = documento.data();

      if (datos.comprobantePath) {

        try {

          const archivoRef = ref(
            storage,
            datos.comprobantePath
          );

          await deleteObject(
            archivoRef
          );

        } catch (error) {

          console.error(
            "Error eliminando comprobante:",
            error
          );

        }

      }

      await deleteDoc(
        doc(
          db,
          "participantes",
          documento.id
        )
      );

    }

    alert(
      "Sorteo eliminado correctamente"
    );

    cargarParticipantes();

  }
);

exportarSorteo.addEventListener(
  "click",
  async () => {

    const snapshot = await getDocs(
      collection(db, "participantes")
    );

    const filas = [];

snapshot.forEach((documento) => {

  const datos = documento.data();

  if (datos.estado !== "Pagado") {
    return;
  }

  if (!datos.numeros) {
    return;
  }

  datos.numeros.forEach((numero) => {

   filas.push({
  numero: numero,
  nombre: `${datos.nombre} ${datos.apellido}`,
  dni: datos.dni,
  telefono: datos.telefono
});

  });

});

const hoja = XLSX.utils.json_to_sheet(filas);

const libro = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(
  libro,
  hoja,
  "Sorteo"
);

XLSX.writeFile(
  libro,
  "sorteo.xlsx"
);
    

  }
);