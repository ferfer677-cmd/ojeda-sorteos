// ======================================================
// GANADORES ANTERIORES
// ======================================================
// Datos tomados de las historias destacadas y publicaciones de
// @sorteo_ojeda_ (usuarios verificados en Instagram el 21/10/2026).
//
// Para agregar un ganador: sumar una línea en "ganadores" del sorteo.
//   ig: usuario de Instagram SIN @ (se muestra con link a su perfil)
//   ciudad (opcional): se muestra debajo del premio con 📍
//   nombre: si no hay usuario (o la cuenta ya no existe), se muestra el nombre sin link
// video (opcional): link a la publicación del sorteo en Instagram
// foto (opcional): imagen de la entrega; al tocarla abre fotoVideo (o video)
// fotos (opcional): varias fotos: [{ src, link, alt, ganador }]
//   ganador: a qué ganador de la lista corresponde la foto (0 = el primero)
// entrega: "pendiente" si el premio todavía no se entregó
// Los sorteos van del más reciente al más viejo.

const IG = "https://www.instagram.com/sorteo_ojeda_/reel/";

const SORTEOS_ANTERIORES = [
  {
    titulo: "Yamaha MT-07",
    fecha: "Octubre 2026",
    video: IG + "Dek8dFfkc-c/",
    foto: "assets/ganadores/mt07.jpg",
    entrega: "pendiente",
    fotoVideo: IG + "DelG-xYROIP/",
    ganadores: [
      { premio: "🏍️ Yamaha MT-07", ig: "e.speed420", ciudad: "San Luis capital" },
      { premio: "💵 $50.000", ig: "alcarazgaston" },
      { premio: "💵 $50.000", ig: "matilattanzio" },
      { premio: "💵 $50.000", ig: "romero_david19" },
      { premio: "💵 $50.000", ig: "ricardofraga1305" }
    ]
  },
  {
    titulo: "Honda Falcon 400 y más",
    fecha: "Septiembre 2026",
    video: IG + "DdK00veEWz-/",
    fotos: [
      { src: "assets/ganadores/falcon-fazzari.jpg", link: IG + "DdK00veEWz-/", alt: "@fazzari_motos con la Honda Falcon 400 que ganó" }
    ],
    ganadores: [
      { premio: "🏍️ Honda Falcon 400", ig: "fazzari_motos", ciudad: "Santa Fe" },
      { premio: "🔧 Combo Total impacto + pistola de calor", ig: "facu_frias99" },
      { premio: "🔧 Amoladora", ig: "lucas_obreque_" },
      { premio: "🔧 Destornillador eléctrico", ig: "ariel_duhart23" },
      { premio: "🎒 Mochila Total", ig: "lii_bava" },
      { premio: "💵 $50.000", ig: "nahuel_acosta30" },
      { premio: "💵 $50.000", ig: "mati.benvenuto" }
    ]
  },
  {
    titulo: "Sorteos express",
    fecha: "Septiembre y octubre 2026",
    video: IG + "Ddz1K5sxJFH/",
    ganadores: [
      { premio: "💵 $100.000", ig: "santy.soria83" },
      { premio: "💵 $50.000", ig: "lucas.kwist" },
      { premio: "💵 $50.000", ig: "enriqueadry" },
      { premio: "💵 $50.000", ig: "gustachaura" },
      { premio: "🎁 Sorteo express", ig: "santiagomartinezpastor" }
    ]
  },
  {
    titulo: "Honda Titan 283cc",
    fecha: "Agosto 2026",
    video: IG + "DcUz4rexwpf/",
    fotos: [
      { src: "assets/ganadores/titan-1.jpg", link: IG + "DcUz4rexwpf/", alt: "Entrega de la Honda Titan 283cc a @diego_aguirrec" }
    ],
    ganadores: [
      { premio: "🏍️ Honda Titan 283cc", ig: "diego_aguirrec", ciudad: "Lobería, Buenos Aires" }
    ]
  },
  {
    titulo: "Tornado 250 + $900.000",
    fecha: "Julio 2026",
    fotos: [
      { src: "assets/ganadores/tornado250-eraso.jpg", alt: "@fran_eraso con la Honda Tornado 250 que ganó" }
    ],
    ganadores: [
      { premio: "🏍️ Honda Tornado 250", ig: "fran_eraso", ciudad: "Lobería, Buenos Aires" },
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
    titulo: "Suzuki AX 100 y más",
    fecha: "Mayo y junio 2026",
    video: IG + "DYYWyv5kYQM/",
    fotos: [
      { src: "assets/ganadores/ax100-eiras.jpg", link: IG + "DYYWyv5kYQM/", alt: "@gabrieleiras72 en el taller el día que retiró su Suzuki AX 100" }
    ],
    ganadores: [
      { premio: "🏍️ Suzuki AX 100", ig: "gabrieleiras72", ciudad: "Canning, Buenos Aires" },
      { premio: "💵 $100.000", ig: "gamamercado_" },
      { premio: "🔧 Kit Total", ig: "dougras.777" },
      { premio: "💵 Hasta $200.000", ig: "bnjasanchez" },
      { premio: "💵 $90.000", nombre: "Ganador/a" },
      { premio: "💵 $50.000", ig: "ricky_santillan06" }
    ]
  },
  {
    titulo: "iPhone 16 Pro Max y express",
    fecha: "Marzo 2026",
    video: IG + "DV2B2xGEd1k/",
    foto: "assets/ganadores/iphone.jpg",
    ganadores: [
      { premio: "📱 iPhone 16 Pro Max", ig: "yonii_irizarre" },
      { premio: "💵 $50.000", ig: "elianitazramirez" },
      { premio: "💵 $50.000", ig: "cami.tear" },
      { premio: "💵 $50.000", ig: "nico_lacanna" }
    ]
  },
  {
    titulo: "Sorteo 10 premios: CF Moto 400",
    fecha: "Febrero 2026",
    video: IG + "DU6GSgEEVEH/",
    ganadores: [
      { premio: "🏍️ CF Moto NK 400", ig: "diegoomercil", ciudad: "Santa Fe" },
      { premio: "📱 iPhone 16 Pro", nombre: "Santino Benjamín Rolón" },
      { premio: "🎮 PlayStation 5", ig: "luduena_ampa" },
      { premio: "💵 $1.000.000", ig: "adrigonzalez788" },
      { premio: "💵 $500.000", ig: "genatravaglia" },
      { premio: "🧰 Caja de herramientas Total", nombre: "Derlys Rodríguez" },
      { premio: "💵 $100.000", nombre: "Ganador/a" },
      { premio: "📽️ Proyector", ig: "mauroolea20" },
      { premio: "👕 Buzo del taller", ig: "josemamani493" },
      { premio: "🪛 Set de destornilladores Total", ig: "benja_romero_0" }
    ]
  },
  {
    titulo: "Sorteos express",
    fecha: "Febrero 2026",
    video: IG + "DUo9-FtkTUv/",
    ganadores: [
      { premio: "💵 $180.000", ig: "_matiias17" },
      { premio: "🎁 Sorteo express", ig: "el_retoke07" }
    ]
  },
  {
    titulo: "Sorteos de diciembre",
    fecha: "Diciembre 2025",
    video: IG + "DSG4MSvkaOM/",
    ganadores: [
      { premio: "💵 $100.000", ig: "milagro.rg" },
      { premio: "🎁 Sorteo de fiestas", ig: "maxipavone" }
    ]
  },
  {
    titulo: "Sorteo 5 premios: KTM 390",
    fecha: "Noviembre 2025",
    video: IG + "DQhuRuOkXXO/",
    fotos: [
      { src: "assets/ganadores/ktm.jpg", link: IG + "DQmYgtBEf8n/", alt: "Entrega de la KTM 390 a @diegonicolas.c" },
      { src: "assets/ganadores/axel-1.jpg", ganador: 1, alt: "Entrega de la Honda XR 150 a @olderburgeraxel" }
    ],
    ganadores: [
      { premio: "🏍️ KTM 390", ig: "diegonicolas.c", ciudad: "Mar del Plata, Buenos Aires" },
      { premio: "🏍️ Honda XR 150", ig: "olderburgeraxel", ciudad: "Chaco" },
      { premio: "💵 $500.000", ig: "leo.aguilar60" },
      { premio: "💵 $250.000", ig: "ivangarcia21_" },
      { premio: "💵 $100.000", ig: "leanr.lopez" }
    ]
  },
  {
    titulo: "Moto a elección u $8.000.000",
    fecha: "Septiembre 2025",
    video: IG + "DOhWxh7kVcz/",
    foto: "assets/ganadores/bariloche.jpg",
    fotoVideo: "https://www.instagram.com/sorteo_ojeda_/p/DZi0xDfEQK5/",
    ganadores: [
      { premio: "🏍️ Honda XR", ig: "mabroos_", ciudad: "Bariloche, Río Negro" },
      { premio: "💵 $150.000", ig: "ayrtonrod29" }
    ]
  },
  {
    titulo: "Sorteos de agosto",
    fecha: "Agosto 2025",
    video: IG + "DN9W3OzEX0m/",
    ganadores: [
      { premio: "📱 iPhone", ig: "slv.agust1n" },
      { premio: "🛵 Mini moto eléctrica", ig: "floritdl" },
      { premio: "💵 $50.000", ig: "tapa_74" },
      { premio: "💵 $50.000", ig: "kevluucero" }
    ]
  },
  {
    titulo: "Tornado 293cc + PS5",
    fecha: "Julio 2025",
    video: IG + "DMDZlhks2eO/",
    fotos: [
      { src: "assets/ganadores/tornado-llaves.jpg", link: "https://www.instagram.com/sorteo_ojeda_/p/DQZcNDyEe4I/", alt: "Entrega de las llaves de la Tornado 293cc a @miguel.ibanez.50309 en Corrientes" },
      { src: "assets/ganadores/tornado-entrega.jpg", link: "https://www.instagram.com/sorteo_ojeda_/p/DQZcNDyEe4I/", alt: "@miguel.ibanez.50309 con la Tornado 293cc que ganó" }
    ],
    ganadores: [
      { premio: "🏍️ Tornado 293cc", ig: "miguel.ibanez.50309", ciudad: "Corrientes" },
      { premio: "🎮 PlayStation 5", ig: "daan_blanco" },
      { premio: "💵 $50.000", ig: "rolhajose" }
    ]
  },
  {
    titulo: "Honda Twister 293cc",
    fecha: "Mayo 2025",
    fotos: [
      { src: "assets/ganadores/twister-lagus.jpg", link: "https://www.instagram.com/sorteo_ojeda_/p/DKLI6PzJ7ZJ/", alt: "Entrega de la Twister 293cc a @lagus.293 en Victoria, Entre Ríos" }
    ],
    ganadores: [
      { premio: "🏍️ Honda Twister 293cc", ig: "lagus.293", ciudad: "Victoria, Entre Ríos" }
    ]
  },
  {
    titulo: "Honda CG Titan KS Inyección",
    fecha: "Marzo 2025",
    video: IG + "DHzWPtnJtqF/",
    fotos: [
      { src: "assets/ganadores/cg-titan-camarasa.jpg", link: "https://www.instagram.com/sorteo_ojeda_/p/DJw9R2Pp0dN/", alt: "Entrega de la CG Titan KS a @santii.camarasa en su casa" }
    ],
    ganadores: [
      { premio: "🏍️ Honda CG Titan KS Inyección", ig: "santii.camarasa", ciudad: "San Pedro, Buenos Aires" },
      { premio: "🪖 Casco", ig: "g.hunttter" },
      { premio: "💵 $50.000", ig: "carlitoscamerucci" },
      { premio: "💵 $50.000", ig: "huugsk" },
      { premio: "💵 $50.000", ig: "mateo_gonzalez66" }
    ]
  }
];

// Cuántas entregas con foto se ven antes de tocar "Ver todos"
const ENTREGAS_VISIBLES = 4;


(function () {

  const contenedor =
    document.getElementById("ganadoresLista");

  const botonMas =
    document.getElementById("ganadoresVerMas");

  if (!contenedor) {
    return;
  }

  // ====================================================
  // CONTADOR "+70" (todos los lugares con .ganadores-total)
  // ====================================================

  const total =
    SORTEOS_ANTERIORES.reduce((n, s) => n + s.ganadores.length, 0);

  document
    .querySelectorAll(".ganadores-total")
    .forEach((el) => {
      // Redondeado para abajo a la decena: "+70"
      el.textContent = `+${Math.floor(total / 10) * 10}`;
    });


  function linkInstagram(usuario, clase) {
    const a = document.createElement("a");
    a.href = `https://instagram.com/${usuario}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = clase;
    a.textContent = `@${usuario}`;
    return a;
  }


  function parrafo(texto, clase) {
    const p = document.createElement("p");
    if (clase) p.className = clase;
    p.textContent = texto;
    return p;
  }


  // ====================================================
  // ENTREGAS CON FOTO (como reseñas)
  // ====================================================

  const entregas = [];

  SORTEOS_ANTERIORES.forEach((sorteo) => {

    const fotos =
      sorteo.fotos ||
      (sorteo.foto
        ? [{ src: sorteo.foto, link: sorteo.fotoVideo || sorteo.video }]
        : []);

    // Una reseña por ganador con foto (la primera foto de cada uno)
    const usados = new Set();

    fotos.forEach((foto) => {

      const indice = foto.ganador || 0;

      if (usados.has(indice) || !sorteo.ganadores[indice]) {
        return;
      }

      usados.add(indice);

      entregas.push({
        sorteo,
        foto,
        ganador: sorteo.ganadores[indice]
      });

    });

  });


  entregas.forEach(({ sorteo, foto, ganador }, indice) => {

    const resena = document.createElement("article");
    resena.className = "resena";

    if (indice >= ENTREGAS_VISIBLES) {
      resena.hidden = true;
      resena.dataset.extra = "si";
    }

    const caja = document.createElement(foto.link ? "a" : "div");
    caja.className = "resena-foto";
    if (foto.link) {
      caja.href = foto.link;
      caja.target = "_blank";
      caja.rel = "noopener";
    }

    const img = document.createElement("img");
    img.src = foto.src;
    img.alt = foto.alt || `Entrega del sorteo ${sorteo.titulo}`;
    img.loading = "lazy";
    img.decoding = "async";
    caja.appendChild(img);

    const texto = document.createElement("div");

    const quien = ganador.ig
      ? linkInstagram(ganador.ig, "resena-quien")
      : document.createElement("strong");

    if (!ganador.ig) {
      quien.textContent = ganador.nombre || "Ganador/a";
    }

    const sello = document.createElement("span");
    sello.className = "verificado";

    if (sorteo.entrega === "pendiente") {
      sello.classList.add("pendiente");
      sello.textContent = "🕐 Entrega en curso";
    } else {
      sello.textContent = "✔ Entregado";
    }

    // Premio sin el emoji del principio
    const premio = ganador.premio.replace(/^\W+\s*/u, "");

    const lugar = [ganador.ciudad, sorteo.fecha].filter(Boolean).join(" · ");

    texto.append(quien, sello, parrafo(premio, "premio"), parrafo(`📍 ${lugar}`));

    if (!ganador.ciudad) {
      texto.lastChild.textContent = sorteo.fecha;
    }

    resena.append(caja, texto);
    contenedor.appendChild(resena);

  });


  // ====================================================
  // LISTA COMPLETA, AGRUPADA POR SORTEO (se ve con "Ver todos")
  // ====================================================

  const todos = document.createElement("div");
  todos.className = "ganadores-todos";
  todos.hidden = true;

  SORTEOS_ANTERIORES.forEach((sorteo) => {

    const tarjeta = document.createElement("article");
    tarjeta.className = "ganadores-sorteo";

    const encabezado = document.createElement("header");
    const titulo = document.createElement("h3");
    titulo.textContent = sorteo.titulo;
    const fecha = document.createElement("span");
    fecha.textContent = sorteo.fecha;
    encabezado.append(titulo, fecha);
    tarjeta.appendChild(encabezado);

    const lista = document.createElement("ul");

    sorteo.ganadores.forEach((g) => {

      const item = document.createElement("li");

      const izquierda = document.createElement("div");

      const premio = document.createElement("span");
      premio.className = "ganador-premio";
      premio.textContent = g.premio;
      izquierda.appendChild(premio);

      if (g.ciudad) {
        const ciudad = document.createElement("span");
        ciudad.className = "ganador-ciudad";
        ciudad.textContent = `📍 ${g.ciudad}`;
        izquierda.appendChild(ciudad);
      }

      let quien;

      if (g.ig) {
        quien = linkInstagram(g.ig, "ganador-quien");
      } else {
        quien = document.createElement("span");
        quien.className = "ganador-quien";
        quien.textContent = g.nombre || "Ganador/a";
      }

      item.append(izquierda, quien);
      lista.appendChild(item);

    });

    tarjeta.appendChild(lista);

    if (sorteo.video) {
      const video = document.createElement("a");
      video.className = "ganadores-video";
      video.href = sorteo.video;
      video.target = "_blank";
      video.rel = "noopener";
      video.textContent = "▶ Ver el video del sorteo";
      tarjeta.appendChild(video);
    }

    todos.appendChild(tarjeta);

  });

  contenedor.appendChild(todos);


  if (botonMas) {

    botonMas.addEventListener("click", () => {
      contenedor
        .querySelectorAll('[data-extra="si"]')
        .forEach((t) => { t.hidden = false; });
      todos.hidden = false;
      botonMas.hidden = true;
    });

  }

})();
