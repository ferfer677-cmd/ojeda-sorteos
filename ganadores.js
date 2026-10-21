// ======================================================
// GANADORES ANTERIORES
// ======================================================
// Datos tomados de las historias destacadas de @sorteo_ojeda_.
// Para agregar un ganador: sumar una línea en "ganadores" del sorteo.
//   ig: usuario de Instagram SIN @ (se muestra con link a su perfil)
//   nombre: si no hay usuario (o la cuenta ya no existe), se muestra el nombre sin link
// Los sorteos van del más reciente al más viejo.

const SORTEOS_ANTERIORES = [
  {
    titulo: "Yamaha MT-07",
    fecha: "Octubre 2026",
    ganadores: [
      { premio: "🏍️ Yamaha MT-07", ig: "e.speed420" },
      { premio: "💵 $50.000", ig: "alcarazgaston" },
      { premio: "💵 $50.000", ig: "matilattanzio" },
      { premio: "💵 $50.000", ig: "romero_david19" },
      { premio: "💵 $50.000", ig: "ricardofraga1305" }
    ]
  },
  {
    titulo: "Sorteos express",
    fecha: "Septiembre y octubre 2026",
    ganadores: [
      { premio: "💵 $100.000", ig: "santy.soria83" },
      { premio: "💵 $50.000", ig: "lucas.kwist" },
      { premio: "💵 $50.000", ig: "enriqueadry" },
      { premio: "💵 $50.000", ig: "gustachaura" }
    ]
  },
  {
    titulo: "Honda Falcon 400 y más",
    fecha: "Septiembre 2026",
    ganadores: [
      { premio: "🏍️ Honda Falcon 400", ig: "fazzari_motos" },
      { premio: "🔧 Miniatornillador + mango", ig: "ariel_duhart23" },
      { premio: "🎒 Mochila Total", ig: "lii_bava" },
      { premio: "🔧 Combo Total", ig: "facu_frias99" },
      { premio: "💵 $50.000", ig: "mati.benvenuto" }
    ]
  },
  {
    titulo: "Tornado 250 + $900.000",
    fecha: "Julio 2026",
    ganadores: [
      { premio: "🏍️ Honda Tornado 250", nombre: "Francisco Eraso" },
      { premio: "💵 $100.000", nombre: "Juan Cruz Díaz" },
      { premio: "💵 $100.000", nombre: "Gerson Gómez" },
      { premio: "💵 $100.000", nombre: "Leandro Puig" },
      { premio: "💵 $100.000", nombre: "Jeremías Mendieta" },
      { premio: "💵 $100.000", nombre: "Julián Cantero" },
      { premio: "💵 $100.000", nombre: "Gabriel Polanco" },
      { premio: "💵 $100.000", nombre: "Jorge Gavilán" },
      { premio: "💵 $100.000", nombre: "Mauricio Malverde" },
      { premio: "💵 $100.000", nombre: "Carlos Pugliese" }
    ]
  },
  {
    titulo: "Sorteos de mitad de año",
    fecha: "Mayo y junio 2026",
    ganadores: [
      { premio: "🏍️ Moto AX 100", ig: "gabrieleiras72" },
      { premio: "🎁 Premio sorteo AX 100", ig: "gamamercado" },
      { premio: "🔧 Kit Total", ig: "dougras.777" },
      { premio: "💵 Hasta $200.000", ig: "bnjasanchez" },
      { premio: "💵 $90.000", nombre: "Ganador/a" },
      { premio: "💵 $50.000", ig: "ricky_santillan06" }
    ]
  },
  {
    titulo: "CF Moto 400 y 9 premios más",
    fecha: "Febrero 2026",
    ganadores: [
      { premio: "🏍️ CF Moto 400", ig: "diegoomercil" },
      { premio: "💵 $1.000.000", ig: "adrigonzalez788" },
      { premio: "💵 $500.000", ig: "genatravaglia" },
      { premio: "💵 $100.000", nombre: "Ganador/a" },
      { premio: "🎮 PlayStation 5", ig: "luduena_ampa" },
      { premio: "📽️ Proyector", nombre: "Ganador/a" },
      { premio: "🧰 Caja de herramientas Total", ig: "benja_romero_0" },
      { premio: "👕 Buzo", ig: "josemamani493" }
    ]
  },
  {
    titulo: "Más sorteos de principio de año",
    fecha: "Febrero a abril 2026",
    ganadores: [
      { premio: "📱 iPhone 16 Pro Max", nombre: "Entregado" },
      { premio: "💵 $50.000", ig: "elianitazramirez" },
      { premio: "💵 $50.000", ig: "cami.tear" },
      { premio: "💵 $50.000", ig: "nico_lacanna" }
    ]
  }
];

// Cuántos sorteos se ven antes de tocar "Ver más"
const SORTEOS_VISIBLES = 3;


(function () {

  const contenedor =
    document.getElementById("ganadoresLista");

  const botonMas =
    document.getElementById("ganadoresVerMas");

  const contador =
    document.getElementById("ganadoresTotal");

  if (!contenedor) {
    return;
  }

  const total =
    SORTEOS_ANTERIORES.reduce((n, s) => n + s.ganadores.length, 0);

  if (contador) {
    // Redondeado para abajo a la decena: "+40"
    contador.textContent = `+${Math.floor(total / 10) * 10}`;
  }

  SORTEOS_ANTERIORES.forEach((sorteo, indice) => {

    const tarjeta =
      document.createElement("article");

    tarjeta.className = "ganadores-sorteo";

    if (indice >= SORTEOS_VISIBLES) {
      tarjeta.hidden = true;
      tarjeta.dataset.extra = "si";
    }

    const encabezado =
      document.createElement("header");

    const titulo =
      document.createElement("h3");

    titulo.textContent = sorteo.titulo;

    const fecha =
      document.createElement("span");

    fecha.textContent = sorteo.fecha;

    encabezado.append(titulo, fecha);
    tarjeta.appendChild(encabezado);

    const lista =
      document.createElement("ul");

    sorteo.ganadores.forEach((g) => {

      const item =
        document.createElement("li");

      const premio =
        document.createElement("span");

      premio.className = "ganador-premio";
      premio.textContent = g.premio;

      let quien;

      if (g.ig) {
        quien = document.createElement("a");
        quien.href = `https://instagram.com/${g.ig}`;
        quien.target = "_blank";
        quien.rel = "noopener";
        quien.textContent = `@${g.ig}`;
      } else {
        quien = document.createElement("span");
        quien.textContent = g.nombre || "Ganador/a";
      }

      quien.classList.add("ganador-quien");

      item.append(premio, quien);
      lista.appendChild(item);

    });

    tarjeta.appendChild(lista);
    contenedor.appendChild(tarjeta);

  });

  if (botonMas) {

    if (SORTEOS_ANTERIORES.length <= SORTEOS_VISIBLES) {
      botonMas.hidden = true;
    }

    botonMas.addEventListener("click", () => {
      contenedor
        .querySelectorAll('[data-extra="si"]')
        .forEach((t) => { t.hidden = false; });
      botonMas.hidden = true;
    });

  }

})();
