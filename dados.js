// ======================================================
// DADOS (palabra clave "DADO")
// ======================================================
// Al escribir "DADO" en la palabra clave sale un cartel con dos dados:
// la persona pone su DNI, los tira y salen 2 tarjetas. Elige UNA sola,
// una vez por DNI:
// - DOBLE CHANCE: repetir cualquier compra pagada, mismo precio, doble de chances.
// - COMBO: todas las chances que ya tiene, de nuevo, por la mitad de lo gastado.
// Los premios los arma y los guarda el servidor (dados en
// functions/index.js, por /api/ruleta); acá solo se muestran.

(function () {

  const CODIGOS = ["DADO", "DADOS"];

  // Puntos de cada cara en una grilla de 3x3 (0 a 8)
  const PUNTOS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];

  const pesos = (monto) => `$${Number(monto).toLocaleString("es-AR")}`;
  const plural = (n, palabra) => `${n.toLocaleString("es-AR")} ${palabra}${n === 1 ? "" : "s"}`;

  async function pedir(accion, dni, cual) {
    const respuesta = await fetch("/api/ruleta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion, dni, cual })
    });
    if (!respuesta.ok) {
      throw new Error("DADOS_NO_DISPONIBLE");
    }
    return respuesta.json();
  }

  function crear(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto) elemento.textContent = texto;
    return elemento;
  }

  function boton(texto, clase, alTocar) {
    const elemento = crear("button", clase, texto);
    elemento.type = "button";
    elemento.addEventListener("click", alTocar);
    return elemento;
  }


  // ====================================================
  // DADOS DIBUJADOS
  // ====================================================

  function crearDado() {
    const dado = crear("div", "dados-dado");
    for (let i = 0; i < 9; i++) dado.appendChild(crear("i"));
    return dado;
  }

  function ponerCara(dado, numero) {
    dado.querySelectorAll("i").forEach((punto, i) => {
      punto.classList.toggle("on", PUNTOS[numero - 1].includes(i));
    });
    dado.setAttribute("aria-label", `Dado: ${numero}`);
  }

  const alAzar = () => 1 + Math.floor(Math.random() * 6);


  // ====================================================
  // CARTEL
  // ====================================================

  let overlay = null;
  let contenido = null;
  let dniActual = "";

  function cerrar() {
    overlay?.remove();
    overlay = null;
  }

  function comprar(chances, precio, codigo, etiqueta) {
    cerrar();
    window.abrirModalPromo(chances, precio, codigo, etiqueta);
  }

  function mensaje(texto) {
    contenido.innerHTML = "";
    contenido.append(crear("h3", "", "🎲 Dados"), crear("p", "", texto));
  }

  // Premio ya elegido: botones para comprar
  function mostrarElegido(datos) {

    contenido.innerHTML = "";

    if (datos.elegido === "combo") {

      const { compras, gastado, chancesTiene, porChance, chances, precio } = datos.combo;

      contenido.append(
        crear("h3", "", "🎁 Tu COMBO"),
        crear("p", "", `Llevás ${plural(compras, "compra")}, gastaste ${pesos(gastado)} y tenés ${plural(chancesTiene, "chance")} (cada una te salió ${pesos(porChance)}).`),
        crear("p", "dados-destacado", `Te damos ${plural(chances, "chance")} más por ${pesos(precio)}: la mitad de lo que gastaste.`),
        boton(`Comprar ${plural(chances, "chance")} por ${pesos(precio)}`, "ruleta-boton", () =>
          comprar(chances, precio, "DADOSCOMBO", "🎲 DADOS COMBO")
        )
      );

    } else {

      contenido.append(
        crear("h3", "", "🎁 DOBLE CHANCE"),
        crear("p", "", "Elegí qué compra repetir: pagás lo mismo y recibís el doble de chances.")
      );

      datos.doble.forEach(({ antes, chances, precio }) => {
        const opcion = boton(`${plural(chances, "chance")} por ${pesos(precio)}`, "ruleta-boton dados-opcion", () =>
          comprar(chances, precio, "DADOS", "🎲 DADOS x2")
        );
        opcion.appendChild(crear("small", "", `Antes pagaste ${plural(antes, "chance")} por ese precio`));
        contenido.appendChild(opcion);
      });

    }

    contenido.appendChild(
      crear("p", "dados-aviso", "Usá el mismo DNI al comprar. Se usa una sola vez, hasta el cierre de compras, y se paga por transferencia como cualquier compra.")
    );

  }

  // Las 2 tarjetas para elegir una
  function mostrarTarjetas(datos) {

    contenido.innerHTML = "";

    contenido.append(
      crear("h3", "", "🎉 ¡Salieron dobles!"),
      crear("p", "", "Elegí UNA tarjeta. Solo te podés quedar con una.")
    );

    const tarjetas = crear("div", "dados-tarjetas");

    const tarjeta = (cual, titulo, texto) => {
      const elemento = boton("", "dados-tarjeta", async () => {
        tarjetas.querySelectorAll("button").forEach((b) => (b.disabled = true));
        elemento.classList.add("elegida");
        try {
          const elegido = await pedir("dados_elegir", dniActual, cual);
          if (elegido.estado === "tirado" && elegido.elegido) {
            mostrarElegido(elegido);
          } else {
            mensaje("Ya usaste el premio de los dados con este DNI.");
          }
        } catch (error) {
          console.warn("No se pudo elegir la tarjeta:", error);
          tarjetas.querySelectorAll("button").forEach((b) => (b.disabled = false));
          elemento.classList.remove("elegida");
        }
      });
      elemento.append(crear("strong", "", titulo), crear("span", "", texto));
      return elemento;
    };

    if (datos.doble?.length) {
      tarjetas.appendChild(
        tarjeta("doble", "🎟️ DOBLE CHANCE", "Repetí cualquier compra que ya pagaste: mismo precio, el doble de números.")
      );
    }

    const { chances, precio } = datos.combo;

    tarjetas.appendChild(
      tarjeta("combo", "💰 COMBO MITAD", `${plural(chances, "chance")} más (las mismas que ya tenés) por ${pesos(precio)}, la mitad de lo que gastaste.`)
    );

    contenido.appendChild(tarjetas);

  }

  function mostrarResultado(datos) {
    if (datos.estado === "usado") return mensaje("Ya usaste el premio de los dados con este DNI.");
    if (datos.estado !== "tirado") return mensaje("No encontramos compras aprobadas con ese DNI. Los dados son para quienes ya tienen una compra aprobada.");
    if (datos.elegido) return mostrarElegido(datos);
    mostrarTarjetas(datos);
  }

  function abrir() {

    cerrar();

    overlay = crear("div", "ruleta-overlay activo");
    overlay.id = "dadosOverlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Dados");

    const caja = crear("div", "ruleta-caja");
    const cerrarBoton = boton("✕", "ruleta-cerrar", cerrar);
    cerrarBoton.setAttribute("aria-label", "Cerrar");

    contenido = crear("div", "ruleta-contenido");

    caja.append(cerrarBoton, contenido);
    overlay.appendChild(caja);
    document.body.appendChild(overlay);

    const mesa = crear("div", "dados-mesa");
    const dado1 = crearDado();
    const dado2 = crearDado();
    ponerCara(dado1, 5);
    ponerCara(dado2, 2);
    mesa.append(dado1, dado2);

    const dni = crear("input", "dados-dni");
    dni.type = "text";
    dni.inputMode = "numeric";
    dni.autocomplete = "off";
    dni.placeholder = "Tu DNI";
    dni.value = (document.getElementById("dni")?.value || "").replace(/\D/g, "");

    const error = crear("p", "dados-error");

    const tirar = boton("🎲 ¡TIRAR LOS DADOS!", "ruleta-boton", async () => {

      dniActual = dni.value.replace(/\D/g, "");

      if (dniActual.length < 6) {
        error.textContent = "Poné tu DNI, el mismo con el que compraste.";
        dni.focus();
        return;
      }

      error.textContent = "";
      tirar.disabled = true;
      dni.disabled = true;
      tirar.textContent = "Tirando...";

      const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

      mesa.classList.add("tirando");
      const giro = setInterval(() => {
        ponerCara(dado1, alAzar());
        ponerCara(dado2, alAzar());
      }, 110);

      try {

        const [datos] = await Promise.all([
          pedir("dados_tirar", dniActual),
          new Promise((listo) => setTimeout(listo, sinMovimiento ? 200 : 1800))
        ]);

        clearInterval(giro);
        mesa.classList.remove("tirando");

        if (datos.estado !== "tirado") {
          mostrarResultado(datos);
          return;
        }

        // Siempre salen dobles
        const cara = alAzar();
        ponerCara(dado1, cara);
        ponerCara(dado2, cara);
        mesa.classList.add("dobles");

        setTimeout(() => mostrarResultado(datos), sinMovimiento ? 200 : 1200);

      } catch (fallo) {
        clearInterval(giro);
        mesa.classList.remove("tirando");
        console.warn("No se pudieron tirar los dados:", fallo);
        tirar.disabled = false;
        dni.disabled = false;
        tirar.textContent = "🎲 ¡TIRAR LOS DADOS!";
        error.textContent = "No se pudo tirar. Probá de nuevo.";
      }

    });

    dni.addEventListener("keydown", (e) => {
      if (e.key === "Enter") tirar.click();
    });

    contenido.append(
      crear("h3", "", "🎲 Probá tu suerte"),
      crear("p", "", "Poné tu DNI y tirá los dados. Si salen dobles, elegís un premio."),
      mesa,
      dni,
      error,
      tirar
    );

  }

  window.Dados = { CODIGOS, abrir };

})();
