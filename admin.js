import { db, storage } from "./firebase.js";

import {
  entrarConGoogle,
  salir,
  alCambiarSesion
} from "./auth.js";

import { nombreAbreviado } from "./firestore.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

import {
  ref,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";


// =====================================================
// SESIÓN
// =====================================================
// El login es con Google (ver auth.js). Las reglas de Firebase
// solo dejan leer y modificar participantes a la cuenta admin.

let adminActivo = false;


// =====================================================
// ELEMENTOS
// =====================================================

const loginAdmin =
  document.getElementById("loginAdmin");

const panelAdmin =
  document.getElementById("panelAdmin");


const btnLogin =
  document.getElementById("btnLogin");

const cerrarSesion =
  document.getElementById("cerrarSesion");

const buscador =
  document.getElementById("buscador");

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

const aprobarTodos =
  document.getElementById("aprobarTodos");

const borrarTodo =
  document.getElementById("borrarTodo");

const exportarSorteo =
  document.getElementById("exportarSorteo");


// =====================================================
// LOGIN
// =====================================================

function mostrarPanel() {

  if (loginAdmin) {
    loginAdmin.style.display = "none";
  }

  if (panelAdmin) {
    panelAdmin.style.display = "block";
  }

}


function mostrarLogin() {

  if (loginAdmin) {
    loginAdmin.style.display = "block";
  }

  if (panelAdmin) {
    panelAdmin.style.display = "none";
  }

}

// =====================================================
// ACTUALIZAR RANKING
// =====================================================

async function actualizarRanking(datos, cantidad) {

  const dniRanking =
    datos.dniNormalizado ||
    String(datos.dni || "")
      .replace(/\D/g, "")
      .trim();

  if (!dniRanking) {
    console.warn(
      "No se pudo actualizar ranking: participante sin DNI",
      datos
    );
    return;
  }

  const nombreRanking =
    `${datos.nombre || ""} ${datos.apellido || ""}`
      .replace(/\s+/g, " ")
      .trim();

  await setDoc(
    doc(db, "ranking", dniRanking),
    {
      dniNormalizado: dniRanking,
      nombre: nombreRanking,
      chances: increment(Number(cantidad) || 0)
    },
    {
      merge: true
    }
  );

  await actualizarRankingPublico();

}


// =====================================================
// RANKING PÚBLICO (TOP 5)
// =====================================================
// "ranking" tiene DNI y nombre completo: solo lo lee el admin.
// La página lee "publico/ranking": top 5 con nombre abreviado.

async function actualizarRankingPublico() {

  try {

    const snapshot =
      await getDocs(
        query(
          collection(db, "ranking"),
          orderBy("chances", "desc"),
          limit(5)
        )
      );

    const top =
      snapshot.docs.map(
        (documento) => {

          const datos =
            documento.data();

          const partes =
            String(datos.nombre || "")
              .trim()
              .split(/s+/)
              .filter(Boolean);

          return {
            nombre:
              nombreAbreviado(
                partes[0] || "",
                partes.slice(1).join(" ")
              ),
            chances:
              Number(datos.chances) || 0
          };

        }
      );

    await setDoc(
      doc(db, "publico", "ranking"),
      {
        top,
        actualizado: serverTimestamp()
      }
    );

  } catch (error) {

    console.error(
      "No se pudo actualizar el ranking público:",
      error
    );

  }

}

// =====================================================
// ACTUALIZAR CONSULTAS PÚBLICAS ("VER MIS NÚMEROS")
// =====================================================
// "consultas/{dni}" es lo único que lee el público al buscar
// sus números: nombre abreviado + compras aprobadas.

function dniDe(datos) {

  return (
    datos.dniNormalizado ||
    String(datos.dni || "")
  )
    .toString()
    .replace(/\D/g, "")
    .trim();

}


function armarConsulta(participantesDelDni) {

  const aprobados =
    participantesDelDni.filter(
      (p) =>
        p.datos.estado === "Pagado" &&
        Array.isArray(p.datos.numeros) &&
        p.datos.numeros.length
    );

  if (!aprobados.length) {
    return null;
  }

  const primero =
    aprobados[0].datos;

  return {
    nombre:
      nombreAbreviado(
        primero.nombre,
        primero.apellido
      ),
    compras:
      aprobados.map(
        (p) => ({
          pack: p.datos.pack || "",
          chances: Number(p.datos.chancesFinales) || p.datos.numeros.length,
          numeros: p.datos.numeros
        })
      ),
    actualizado:
      serverTimestamp()
  };

}


async function guardarConsulta(dni, consulta) {

  if (!dni) {
    return;
  }

  if (consulta) {

    await setDoc(
      doc(db, "consultas", dni),
      consulta
    );

  } else {

    await deleteDoc(
      doc(db, "consultas", dni)
    );

  }

}


// Rearma la consulta de un DNI (después de aprobar o borrar)

async function actualizarConsulta(dni) {

  if (!dni) {
    return;
  }

  try {

    const participantes =
      await obtenerParticipantes();

    await guardarConsulta(
      dni,
      armarConsulta(
        participantes.filter(
          (p) => dniDe(p.datos) === dni
        )
      )
    );

  } catch (error) {

    console.error(
      "No se pudo actualizar la consulta pública:",
      error
    );

  }

}


// Rearma todas las consultas (para pasar los aprobados viejos)

async function actualizarTodasLasConsultas() {

  const participantes =
    await obtenerParticipantes();

  const porDni =
    new Map();

  participantes.forEach(
    (p) => {

      const dni =
        dniDe(p.datos);

      if (!dni) {
        return;
      }

      if (!porDni.has(dni)) {
        porDni.set(dni, []);
      }

      porDni.get(dni).push(p);

    }
  );

  // Borrar consultas de DNIs que ya no tienen compras

  const existentes =
    await getDocs(
      collection(db, "consultas")
    );

  for (const documento of existentes.docs) {

    if (!porDni.has(documento.id)) {
      await deleteDoc(documento.ref);
    }

  }

  let actualizadas = 0;

  for (const [dni, lista] of porDni) {

    const consulta =
      armarConsulta(lista);

    await guardarConsulta(dni, consulta);

    if (consulta) {
      actualizadas++;
    }

  }

  return actualizadas;

}


// =====================================================
// LOGIN CON GOOGLE
// =====================================================

alCambiarSesion(
  (esAdmin) => {

    adminActivo = esAdmin;

    if (esAdmin) {

      mostrarPanel();

      cargarParticipantes();

      actualizarRankingPublico();

    } else {

      mostrarLogin();

    }

  }
);


if (btnLogin) {

  btnLogin.addEventListener(
    "click",
    async () => {

      try {

        btnLogin.disabled = true;

        await entrarConGoogle();

      } catch (error) {

        console.error(
          "Error de login:",
          error
        );

        if (
          error.code !== "auth/popup-closed-by-user" &&
          error.code !== "auth/cancelled-popup-request"
        ) {

          alert(
            "❌ No se pudo entrar.\n\n" +
            error.message
          );

        }

      } finally {

        btnLogin.disabled = false;

      }

    }
  );

}


// =====================================================
// CERRAR SESIÓN
// =====================================================

if (cerrarSesion) {

  cerrarSesion.addEventListener(
    "click",
    async () => {

      await salir();

      location.reload();

    }
  );

}


// =====================================================
// ACTUALIZAR CONSULTAS (BOTÓN)
// =====================================================

const btnActualizarConsultas =
  document.getElementById("actualizarConsultas");

if (btnActualizarConsultas) {

  btnActualizarConsultas.addEventListener(
    "click",
    async () => {

      btnActualizarConsultas.disabled = true;

      try {

        await actualizarRankingPublico();

        const cantidad =
          await actualizarTodasLasConsultas();

        alert(
          `✅ Consultas actualizadas: ${cantidad} participantes con números.`
        );

      } catch (error) {

        console.error(error);

        alert(
          "❌ Error actualizando consultas.\n\n" +
          error.message
        );

      } finally {

        btnActualizarConsultas.disabled = false;

      }

    }
  );

}


// =====================================================
// CANTIDAD DE CHANCES
// =====================================================

function cantidadPorPack(pack) {

  if (!pack) return 0;

  const texto =
    pack
      .toString()
      .toUpperCase();

  if (
    texto.includes("100 CHANCE")
  ) {
    return 100;
  }

  if (
    texto.includes("50 CHANCE")
  ) {
    return 50;
  }

  if (
    texto.includes("30 CHANCE")
  ) {
    return 30;
  }

  if (
    texto.includes("10 CHANCE")
  ) {
    return 10;
  }

  if (
    texto.includes("3 CHANCE")
  ) {
    return 3;
  }

  if (
    texto.includes("1 CHANCE")
  ) {
    return 1;
  }

  return 0;
}

// =====================================================
// PRECIO POR CHANCES
// =====================================================

function precioPorChances(chances) {

  chances = Number(chances);

  if (chances === 100) {
    return 22000;
  }

  if (chances === 50) {
    return 14000;
  }

  if (chances === 30) {
    return 10000;
  }

  if (chances === 10) {
    return 6000;
  }

  if (chances === 3) {
    return 3600;
  }

  if (chances === 1) {
    return 1600;
  }

  return 0;
}
// =====================================================
// GENERAR NÚMERO
// =====================================================

function generarNumero() {

  return Math.floor(
    Math.random() * 1000000
  )
    .toString()
    .padStart(6, "0");

}


// =====================================================
// OBTENER PARTICIPANTES
// =====================================================

async function obtenerParticipantes() {

  const snapshot =
    await getDocs(
      collection(
        db,
        "participantes"
      )
    );

  const participantes = [];

  snapshot.forEach(
    (documento) => {

      participantes.push({

        id:
          documento.id,

        datos:
          documento.data()

      });

    }
  );


  // Ordenar por fecha

  participantes.sort(
    (a, b) => {

      const fechaA =
        a.datos.fecha &&
        typeof a.datos.fecha.toDate ===
          "function"
          ? a.datos.fecha
              .toDate()
              .getTime()
          : 0;


      const fechaB =
        b.datos.fecha &&
        typeof b.datos.fecha.toDate ===
          "function"
          ? b.datos.fecha
              .toDate()
              .getTime()
          : 0;


      return fechaB - fechaA;

    }
  );


  return participantes;

}


// =====================================================
// OBTENER NÚMEROS USADOS
// =====================================================

async function obtenerNumerosUsados() {

  const participantes =
    await obtenerParticipantes();

  const usados =
    new Set();


  participantes.forEach(
    (participante) => {

      const numeros =
        participante.datos.numeros;


      if (
        Array.isArray(numeros)
      ) {

        numeros.forEach(
          (numero) => {

            usados.add(
              numero.toString()
            );

          }
        );

      }

    }
  );


  return usados;

}


// =====================================================
// GENERAR NÚMEROS ÚNICOS
// =====================================================

async function generarNumerosUnicos(
  cantidad
) {

  const usados =
    await obtenerNumerosUsados();

  const nuevos = [];


  while (
    nuevos.length < cantidad
  ) {

    const numero =
      generarNumero();


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


// =====================================================
// FECHA
// =====================================================

function mostrarFecha(
  timestamp
) {

  if (
    !timestamp ||
    typeof timestamp.toDate !==
      "function"
  ) {

    return "Sin fecha";

  }


  return timestamp
    .toDate()
    .toLocaleString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    );

}


// =====================================================
// CARGAR PARTICIPANTES
// =====================================================

async function cargarParticipantes() {

  if (
    !pendientes ||
    !pagados
  ) {

    console.error(
      "No se encontraron los contenedores del admin."
    );

    return;

  }


  pendientes.innerHTML =
    `
      <p>
        ⏳ Cargando participantes...
      </p>
    `;

  pagados.innerHTML = "";


  try {

    const participantes =
      await obtenerParticipantes();


    pendientes.innerHTML = "";

    pagados.innerHTML = "";


    let cantidadPendientes = 0;

    let cantidadPagados = 0;


    const dniUnicos =
      new Set();


    // =================================================
    // RECAUDACIÓN TOTAL
    // SOLO PAGOS APROBADOS
    // =================================================

    let recaudacion = 0;


    participantes.forEach(
      (participante) => {

        const datos =
          participante.datos;


        if (
          datos.estado === "Pagado"
        ) {

      let precio = 0;

// =============================================
// PRECIO REAL DE LA COMPRA
// =============================================

if (datos.pack) {

  const textoPack = datos.pack.toString();

  // Busca el precio que quedó guardado dentro del pack.
  // Ejemplo:
  // "50 CHANCES • $35.000"
  // "50 CHANCES • $14.000"
  // "PROMO EXCLUSIVA • 50 CHANCES • $11.999"

  const coincidenciaPrecio =
    textoPack.match(/\$\s*([\d.]+)/);

  if (coincidenciaPrecio) {

    precio = Number(
      coincidenciaPrecio[1]
        .replace(/\./g, "")
    );

  }

}

// Si el pack no tenía el precio escrito,
// usa precioFinal guardado en Firebase.

if (
  !precio ||
  !Number.isFinite(precio)
) {

  if (
    Number(datos.precioFinal) > 0
  ) {

    precio =
      Number(datos.precioFinal);

  }

}

// Último respaldo para promociones.

if (
  !precio &&
  datos.codigoPromo === "SUPER50"
) {

  precio = 11999;

}

if (
  !precio &&
  datos.codigoPromo === "SUPER100"
) {

  precio = 14999;

}

// Último respaldo por cantidad de chances.

if (!precio) {

  const chances =
    Number(datos.chancesFinales) ||
    cantidadPorPack(datos.pack);

  precio =
    precioPorChances(chances);

}

recaudacion += precio;


        }

      }
    );


    // =================================================
    // BUSCADOR
    // =================================================

    const textoBusqueda =
      buscador
        ? buscador.value
            .toLowerCase()
            .trim()
        : "";


    participantes.forEach(
      (participante) => {

        const id =
          participante.id;

        const datos =
          participante.datos;


        // =============================================
        // DNI ÚNICO
        // =============================================

        if (datos.dni) {

          const dni =
            datos.dni
              .toString()
              .replace(/\D/g, "");


          if (dni) {
            dniUnicos.add(dni);
          }

        }


        // =============================================
        // FILTRO BUSCADOR
        // =============================================

        const nombre =
          (
            datos.nombre || ""
          )
            .toString()
            .toLowerCase();


        const apellido =
          (
            datos.apellido || ""
          )
            .toString()
            .toLowerCase();


        const dniTexto =
          (
            datos.dni || ""
          )
            .toString()
            .toLowerCase();


        const coincide =

          nombre.includes(
            textoBusqueda
          )

          ||

          apellido.includes(
            textoBusqueda
          )

          ||

          dniTexto.includes(
            textoBusqueda
          );


        if (
          textoBusqueda &&
          !coincide
        ) {

          return;

        }


        // =============================================
        // NÚMEROS
        // =============================================

        const numeros =
          Array.isArray(
            datos.numeros
          )
            ? datos.numeros
            : [];


        const numerosHTML =
          numeros.length
            ? numeros.join(", ")
            : "Sin asignar";


        // =============================================
        // TARJETA
        // =============================================

        const card =
          document.createElement(
            "div"
          );


        card.className =
          "card";


        card.innerHTML = `

        <h3>
  ${datos.nombre || ""}
  ${datos.apellido || ""}
</h3>

<p>
  <strong>DNI:</strong>
  ${datos.dni || "-"}
</p>

<p>
  <strong>DNI NORMALIZADO:</strong>
  ${datos.dniNormalizado || "❌ NO EXISTE"}
</p>

          <p>
            <strong>Teléfono:</strong>
            ${datos.telefono || "-"}
          </p>

          <p>
            <strong>Instagram:</strong>
            ${datos.instagram || "-"}
          </p>

          <p>
            <strong>Pack:</strong>
            ${datos.pack || "-"}
          </p>

          <p>
            <strong>Chances:</strong>
            ${datos.chancesFinales || 0}
          </p>

          <p>
            <strong>Estado:</strong>
            ${datos.estado || "-"}
          </p>

          <p>
            <strong>Fecha:</strong>
            ${mostrarFecha(datos.fecha)}
          </p>

          <p>
            <strong>Números:</strong><br>
            ${numerosHTML}
          </p>


          ${
            datos.comprobanteURL

            ? `

              <div class="comprobante-admin">

                <p>
                  <strong>
                    📄 COMPROBANTE
                  </strong>
                </p>

                <a
                  href="${datos.comprobanteURL}"
                  target="_blank"
                  rel="noopener"
                >

                  <img
                    src="${datos.comprobanteURL}"
                    alt="Comprobante"
                    class="comprobante-preview"
                    loading="lazy"
                    style="
                      display:block;
                      width:260px;
                      height:300px;
                      max-width:260px;
                      max-height:300px;
                      object-fit:cover;
                      margin:10px auto;
                      border-radius:8px;
                      cursor:pointer;
                    "
                  >

                </a>

                <p>

                  <a
                    href="${datos.comprobanteURL}"
                    target="_blank"
                    rel="noopener"
                  >
                    🔍 VER EN GRANDE
                  </a>

                </p>

              </div>

            `

            : `

              <p>
                📄 Sin comprobante
              </p>

            `
          }


          <div class="admin-actions">

            ${
              datos.estado !== "Pagado"

              ? `

                <button
                  class="aprobar-btn"
                  type="button"
                >
                  ✅ APROBAR PAGO
                </button>

              `

              : `

                <p>
                  ✅ PAGO APROBADO
                </p>

              `
            }


            <button
              class="eliminar-btn"
              type="button"
            >
              🗑 ELIMINAR
            </button>

          </div>

        `;


        // =============================================
        // APROBAR PAGO
        // =============================================

        const aprobar =
          card.querySelector(
            ".aprobar-btn"
          );


        if (aprobar) {

          aprobar.addEventListener(
            "click",
            async () => {

              const confirmar =
                confirm(
                  "¿Confirmar este pago?"
                );


              if (!confirmar) {
                return;
              }


              try {

                aprobar.disabled =
                  true;


                aprobar.innerText =
                  "⏳ GENERANDO NÚMEROS...";


                let cantidad =
                  Number(
                    datos.chancesFinales
                  );


                if (!cantidad) {

                  cantidad =
                    cantidadPorPack(
                      datos.pack
                    );

                }


                if (!cantidad) {

                  alert(
                    "❌ No se pudo determinar la cantidad de chances."
                  );

                  aprobar.disabled =
                    false;

                  aprobar.innerText =
                    "✅ APROBAR PAGO";

                  return;

                }


                const numeros =
                  await generarNumerosUnicos(
                    cantidad
                  );


          let precioFinal = 0;

// Primero intenta recuperar el precio REAL
// que tenía la compra cuando fue realizada.

if (datos.pack) {

  const textoPack =
    datos.pack.toString();

  const coincidenciaPrecio =
    textoPack.match(/\$\s*([\d.]+)/);

  if (coincidenciaPrecio) {

    precioFinal =
      Number(
        coincidenciaPrecio[1]
          .replace(/\./g, "")
      );

  }
}

// Si no encontró precio dentro de "pack",
// usa el precioFinal que ya exista.

if (
  !precioFinal &&
  Number(datos.precioFinal) > 0
) {

  precioFinal =
    Number(datos.precioFinal);

}

// Promos como último respaldo.

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER50"
) {

  precioFinal = 11999;

}

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER100"
) {

  precioFinal = 14999;

}

// Último respaldo por cantidad.

if (!precioFinal) {

  precioFinal =
    precioPorChances(cantidad);

}

                await updateDoc(

                  doc(
                    db,
                    "participantes",
                    id
                  ),

                  {

                    estado:
                      "Pagado",

                    chancesFinales:
                      cantidad,

                    precioFinal:
                      precioFinal,

                    numeros:
                      numeros

                  }

                );
// Actualizar ranking
await actualizarRanking(
  datos,
  cantidad
);

// Actualizar "Ver mis números"
await actualizarConsulta(
  dniDe(datos)
);

                alert(
                  `✅ Pago aprobado.\n\nSe asignaron ${cantidad} números.`
                );


                await cargarParticipantes();


              } catch (error) {

                console.error(
                  "ERROR APROBANDO:",
                  error
                );


                alert(
                  "❌ Error al aprobar el pago.\n\n" +
                  error.message
                );


                aprobar.disabled =
                  false;

                aprobar.innerText =
                  "✅ APROBAR PAGO";

              }

            }
          );

        }


        // =============================================
        // ELIMINAR
        // =============================================

        const eliminar =
          card.querySelector(
            ".eliminar-btn"
          );


        if (eliminar) {

          eliminar.addEventListener(
            "click",
            async () => {

              const confirmar =
                confirm(
                  `¿Eliminar a ${datos.nombre || ""} ${datos.apellido || ""}?`
                );


              if (!confirmar) {
                return;
              }


              try {

                // -----------------------------------------
                // BORRAR COMPROBANTE
                // -----------------------------------------

                if (
                  datos.comprobantePath
                ) {

                  try {

                    const archivoRef =
                      ref(
                        storage,
                        datos.comprobantePath
                      );


                    await deleteObject(
                      archivoRef
                    );

                  } catch (error) {

                    console.warn(
                      "No se pudo eliminar el comprobante:",
                      error
                    );

                  }

                }


                // -----------------------------------------
                // BORRAR PARTICIPANTE
                // -----------------------------------------

                await deleteDoc(

                  doc(
                    db,
                    "participantes",
                    id
                  )

                );


                // Actualizar "Ver mis números"
                await actualizarConsulta(
                  dniDe(datos)
                );


                await cargarParticipantes();


              } catch (error) {

                console.error(
                  "ERROR ELIMINANDO:",
                  error
                );


                alert(
                  "❌ No se pudo eliminar.\n\n" +
                  error.message
                );

              }

            }
          );

        }


        // =============================================
        // MOSTRAR
        // =============================================

        if (
          datos.estado === "Pagado"
        ) {

          pagados.appendChild(
            card
          );

          cantidadPagados++;

        } else {

          pendientes.appendChild(
            card
          );

          cantidadPendientes++;

        }

      }
    );


    // =================================================
    // CONTADORES
    // =================================================

    if (tituloPendientes) {

      tituloPendientes.textContent =
        `PAGOS PENDIENTES (${cantidadPendientes})`;

    }


    if (tituloPagados) {

      tituloPagados.textContent =
        `PAGOS APROBADOS (${cantidadPagados})`;

    }


    if (totalParticipantes) {

      totalParticipantes.innerHTML = `

        <div>
          PARTICIPANTES ÚNICOS:
          ${dniUnicos.size}
        </div>

      `;

    }


    // =================================================
    // MOSTRAR RECAUDACIÓN
    // =================================================

    if (recaudacionTotal) {

      recaudacionTotal.innerHTML = `

        <div>
          💰 RECAUDACIÓN:
          $${recaudacion.toLocaleString("es-AR")}
        </div>

      `;

    }


    // =================================================
    // SIN PARTICIPANTES
    // =================================================

    if (
      participantes.length === 0
    ) {

      pendientes.innerHTML = `

        <p>
          No hay participantes en Firebase.
        </p>

      `;

    }


    console.log(
      "Participantes encontrados:",
      participantes.length
    );


    console.log(
      "Recaudación:",
      recaudacion
    );


  } catch (error) {

    console.error(
      "ERROR CARGANDO FIREBASE:",
      error
    );


    pendientes.innerHTML = `

      <div style="
        padding:20px;
        border:1px solid #f00;
        border-radius:10px;
      ">

        <h3>
          ❌ ERROR CON FIREBASE
        </h3>

        <p>
          ${error.message}
        </p>

        <p>
          Abrí F12 → Console para ver
          el error completo.
        </p>

      </div>

    `;

  }

}


// =====================================================
// BUSCADOR
// =====================================================

if (buscador) {

  buscador.addEventListener(
    "input",
    () => {

      if (adminActivo) {

        cargarParticipantes();

      }

    }
  );

}


// =====================================================
// APROBAR TODOS
// =====================================================

if (aprobarTodos) {

  aprobarTodos.addEventListener(
    "click",
    async () => {

      const confirmar =
        confirm(
          "¿Aprobar TODOS los pagos pendientes?"
        );


      if (!confirmar) {
        return;
      }


      try {

        const participantes =
          await obtenerParticipantes();


        let aprobados = 0;


        for (
          const participante
          of participantes
        ) {

          const datos =
            participante.datos;


          if (
            datos.estado === "Pagado"
          ) {

            continue;

          }


          let cantidad =
            Number(
              datos.chancesFinales
            );


          if (!cantidad) {

            cantidad =
              cantidadPorPack(
                datos.pack
              );

          }


          if (!cantidad) {
            continue;
          }


          const numeros =
            await generarNumerosUnicos(
              cantidad
            );


let precioFinal = 0;

// Primero intenta recuperar el precio REAL
// que tenía la compra cuando fue realizada.

if (datos.pack) {

  const textoPack =
    datos.pack.toString();

  const coincidenciaPrecio =
    textoPack.match(/\$\s*([\d.]+)/);

  if (coincidenciaPrecio) {

    precioFinal =
      Number(
        coincidenciaPrecio[1]
          .replace(/\./g, "")
      );

  }
}

// Si no encontró precio dentro de "pack",
// usa el precioFinal que ya exista.

if (
  !precioFinal &&
  Number(datos.precioFinal) > 0
) {

  precioFinal =
    Number(datos.precioFinal);

}

// Promos como último respaldo.

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER50"
) {

  precioFinal = 11999;

}

if (
  !precioFinal &&
  datos.codigoPromo === "SUPER100"
) {

  precioFinal = 14999;

}

// Último respaldo por cantidad.

if (!precioFinal) {

  precioFinal =
    precioPorChances(cantidad);

}


          await updateDoc(

            doc(
              db,
              "participantes",
              participante.id
            ),

            {

              estado:
                "Pagado",

              chancesFinales:
                cantidad,

              precioFinal:
                precioFinal,

              numeros:
                numeros

            }

          );
// Actualizar ranking
await actualizarRanking(
  datos,
  cantidad
);

          aprobados++;

        }


        // Actualizar "Ver mis números" de todos
        await actualizarTodasLasConsultas();

        alert(
          `✅ ${aprobados} pagos aprobados.`
        );


        await cargarParticipantes();


      } catch (error) {

        console.error(
          error
        );


        alert(
          "❌ Error aprobando pagos.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// BORRAR TODO
// =====================================================

if (borrarTodo) {

  borrarTodo.addEventListener(
    "click",
    async () => {

      const texto =
        prompt(
          "Escribí BORRAR para eliminar TODOS los participantes."
        );


      if (
        texto !== "BORRAR"
      ) {

        alert(
          "Operación cancelada."
        );

        return;

      }


      try {

        const participantes =
          await obtenerParticipantes();


        for (
          const participante
          of participantes
        ) {

          const datos =
            participante.datos;


          // -----------------------------------------
          // BORRAR COMPROBANTE
          // -----------------------------------------

          if (
            datos.comprobantePath
          ) {

            try {

              await deleteObject(
                ref(
                  storage,
                  datos.comprobantePath
                )
              );

            } catch (error) {

              console.warn(
                "No se pudo borrar archivo:",
                error
              );

            }

          }


          // -----------------------------------------
          // BORRAR PARTICIPANTE
          // -----------------------------------------

          await deleteDoc(

            doc(
              db,
              "participantes",
              participante.id
            )

          );

        }


        // Vaciar "Ver mis números"
        await actualizarTodasLasConsultas();

        alert(
          "✅ Todos los participantes fueron eliminados."
        );


        await cargarParticipantes();


      } catch (error) {

        console.error(
          error
        );


        alert(
          "❌ Error eliminando datos.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// EXPORTAR SORTEO
// =====================================================

if (exportarSorteo) {

  exportarSorteo.addEventListener(
    "click",
    async () => {

      try {

        const participantes =
          await obtenerParticipantes();


        const filas = [];


        participantes.forEach(
          (participante) => {

            const datos =
              participante.datos;


            if (
              datos.estado !== "Pagado"
            ) {

              return;

            }


            if (
              !Array.isArray(
                datos.numeros
              )
            ) {

              return;

            }


            datos.numeros.forEach(
              (numero) => {

                filas.push({

                  numero:
                    numero,

                  nombre:
                    `${datos.nombre || ""} ${datos.apellido || ""}`,

                  dni:
                    datos.dni || "",

                  telefono:
                    datos.telefono || "",

                  instagram:
                    datos.instagram || ""

                });

              }
            );

          }
        );


        if (
          typeof XLSX ===
          "undefined"
        ) {

          alert(
            "❌ No está cargada la librería de Excel."
          );

          return;

        }


        const hoja =
          XLSX.utils.json_to_sheet(
            filas
          );


        const libro =
          XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
          libro,
          hoja,
          "Sorteo"
        );


        XLSX.writeFile(
          libro,
          "sorteo.xlsx"
        );


      } catch (error) {

        console.error(
          "ERROR EXPORTANDO:",
          error
        );


        alert(
          "❌ No se pudo exportar.\n\n" +
          error.message
        );

      }

    }
  );

}


// =====================================================
// INICIO
// =====================================================

console.log(
  "✅ ADMIN NUEVO CARGADO"
);


// La carga empieza en alCambiarSesion, cuando entra el admin.

