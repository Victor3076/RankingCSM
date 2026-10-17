// tournamentLogic.js - Reglas de cálculo del Torneo de Tenis de Mesa
// Reproduce fielmente la lógica del Google Apps Script original

function crearTorneoInicial(participantesPersonalizados) {
  const gruposDefecto = [
    {
      id: "A",
      nombre: "GRUPO A",
      jugadores: [
        { id: "A1", nombre: "Víctor Rodríguez", foto: "" },
        { id: "A2", nombre: "Joseph Ferrini", foto: "" },
        { id: "A3", nombre: "Jarvis Gómez", foto: "" },
        { id: "A4", nombre: "Carlos Santana", foto: "" }
      ]
    },
    {
      id: "B",
      nombre: "GRUPO B",
      jugadores: [
        { id: "B1", nombre: "Néstor Noriega", foto: "" },
        { id: "B2", nombre: "Elio Perdomo", foto: "" },
        { id: "B3", nombre: "Rodolfo Troisi", foto: "" },
        { id: "B4", nombre: "Ernesto Brito", foto: "" }
      ]
    },
    {
      id: "C",
      nombre: "GRUPO C",
      jugadores: [
        { id: "C1", nombre: "Bernardo Castillo", foto: "" },
        { id: "C2", nombre: "Luis Cornivel", foto: "" },
        { id: "C3", nombre: "Allan García", foto: "" },
        { id: "C4", nombre: "Jose Anol", foto: "" }
      ]
    },
    {
      id: "D",
      nombre: "GRUPO D",
      jugadores: [
        { id: "D1", nombre: "Hugo Yanez", foto: "" },
        { id: "D2", nombre: "Cesar Antia", foto: "" },
        { id: "D3", nombre: "Carlos Hernández", foto: "" },
        { id: "D4", nombre: "Alexander Verde", foto: "" }
      ]
    }
  ];

  const grupos = participantesPersonalizados || gruposDefecto;

  // Generar partidos de fase de grupos
  // Orden exacto del script:
  // [j0, j1], [j2, j3], [j0, j3], [j2, j1], [j0, j2], [j3, j1]
  const partidosGrupos = {};
  const ordenEmparejamientos = [
    [0, 1], // Mesa 1
    [2, 3], // Mesa 2
    [0, 3], // Mesa 3
    [2, 1], // Mesa 4
    [0, 2], // Mesa 5
    [3, 1]  // Mesa 6
  ];

  grupos.forEach((g) => {
    partidosGrupos[g.id] = ordenEmparejamientos.map((emp, idx) => {
      const j1 = g.jugadores[emp[0]];
      const j2 = g.jugadores[emp[1]];
      return {
        id: `M_${g.id}_${idx + 1}`,
        mesa: `MESA ${idx + 1}`,
        grupoId: g.id,
        j1Id: j1 ? j1.id : "",
        j1Nombre: j1 ? j1.nombre : `Jugador ${emp[0] + 1}`,
        j2Id: j2 ? j2.id : "",
        j2Nombre: j2 ? j2.nombre : `Jugador ${emp[1] + 1}`,
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        finalizado: false
      };
    });
  });

  // Estructura de Play-offs (Fase Final: Cuartos, Semis, 3er Lugar y Final)
  const playoffs = {
    // Cuartos de final
    cuartos: [
      {
        id: "Q1",
        codigo: "1A vs 2D",
        etiqueta: "Cuartos 1 (1A vs 2D)",
        origen1: "1° GRUPO A",
        origen2: "2° GRUPO D",
        j1Id: null,
        j1Nombre: "1° GRUPO A",
        j2Id: null,
        j2Nombre: "2° GRUPO D",
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        perdedorId: null,
        perdedorNombre: null,
        finalizado: false
      },
      {
        id: "Q2",
        codigo: "2A vs 1B",
        etiqueta: "Cuartos 2 (2A vs 1B)",
        origen1: "2° GRUPO A",
        origen2: "1° GRUPO B",
        j1Id: null,
        j1Nombre: "2° GRUPO A",
        j2Id: null,
        j2Nombre: "1° GRUPO B",
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        perdedorId: null,
        perdedorNombre: null,
        finalizado: false
      },
      {
        id: "Q3",
        codigo: "2B vs 1C",
        etiqueta: "Cuartos 3 (2B vs 1C)",
        origen1: "2° GRUPO B",
        origen2: "1° GRUPO C",
        j1Id: null,
        j1Nombre: "2° GRUPO B",
        j2Id: null,
        j2Nombre: "1° GRUPO C",
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        perdedorId: null,
        perdedorNombre: null,
        finalizado: false
      },
      {
        id: "Q4",
        codigo: "2C vs 1D",
        etiqueta: "Cuartos 4 (2C vs 1D)",
        origen1: "2° GRUPO C",
        origen2: "1° GRUPO D",
        j1Id: null,
        j1Nombre: "2° GRUPO C",
        j2Id: null,
        j2Nombre: "1° GRUPO D",
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        perdedorId: null,
        perdedorNombre: null,
        finalizado: false
      }
    ],
    // Semifinales
    semis: [
      {
        id: "SF1",
        codigo: "Semi Final 1",
        etiqueta: "Semi Final 1 (Ganador Q1 vs Ganador Q2)",
        origen1: "Ganador 1A vs 2D",
        origen2: "Ganador 2A vs 1B",
        j1Id: null,
        j1Nombre: "Ganador 1A vs 2D",
        j2Id: null,
        j2Nombre: "Ganador 2A vs 1B",
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        perdedorId: null,
        perdedorNombre: null,
        finalizado: false
      },
      {
        id: "SF2",
        codigo: "Semi Final 2",
        etiqueta: "Semi Final 2 (Ganador Q3 vs Ganador Q4)",
        origen1: "Ganador 2B vs 1C",
        origen2: "Ganador 2C vs 1D",
        j1Id: null,
        j1Nombre: "Ganador 2B vs 1C",
        j2Id: null,
        j2Nombre: "Ganador 2C vs 1D",
        sets1: ["", "", "", "", ""],
        sets2: ["", "", "", "", ""],
        ff1: false,
        ff2: false,
        ganadorId: null,
        ganadorNombre: null,
        perdedorId: null,
        perdedorNombre: null,
        finalizado: false
      }
    ],
    // Tercer Lugar
    tercerLugar: {
      id: "TL",
      codigo: "Tercer Lugar",
      etiqueta: "Definición 3er y 4to Puesto",
      origen1: "Perdedor Semi Final 1",
      origen2: "Perdedor Semi Final 2",
      j1Id: null,
      j1Nombre: "Perdedor Semi Final 1",
      j2Id: null,
      j2Nombre: "Perdedor Semi Final 2",
      sets1: ["", "", "", "", ""],
      sets2: ["", "", "", "", ""],
      ff1: false,
      ff2: false,
      ganadorId: null,
      ganadorNombre: null,
      perdedorId: null,
      perdedorNombre: null,
      finalizado: false
    },
    // Final
    final: {
      id: "FIN",
      codigo: "Final",
      etiqueta: "Gran Final (Campeonato)",
      origen1: "Ganador Semi Final 1",
      origen2: "Ganador Semi Final 2",
      j1Id: null,
      j1Nombre: "Ganador Semi Final 1",
      j2Id: null,
      j2Nombre: "Ganador Semi Final 2",
      sets1: ["", "", "", "", ""],
      sets2: ["", "", "", "", ""],
      ff1: false,
      ff2: false,
      ganadorId: null,
      ganadorNombre: null,
      perdedorId: null,
      perdedorNombre: null,
      finalizado: false
    }
  };

  const torneo = {
    titulo: "Control de Partidos - Torneo de Tenis de Mesa",
    fechaCreacion: new Date().toISOString(),
    grupos: grupos,
    partidosGrupos: partidosGrupos,
    playoffs: playoffs,
    clasificadosGrupos: {},
    tablaGeneral: [],
    podio: {
      campeon: null,
      subcampeon: null,
      tercero: null,
      cuarto: null
    }
  };

  return recalcularTorneo(torneo);
}

/**
 * Recalcula todas las estadísticas, clasificaciones y llaves del torneo
 */
function recalcularTorneo(torneo) {
  // Mapa de jugadores para lookup rápido de foto e id
  const mapaJugadores = {};
  torneo.grupos.forEach((g) => {
    g.jugadores.forEach((j) => {
      mapaJugadores[j.nombre] = j;
      mapaJugadores[j.id] = j;
    });
  });

  // Estadísticas globales por nombre de jugador
  const statsGlobal = {};

  function initStats(nombre) {
    if (!statsGlobal[nombre]) {
      const jInfo = mapaJugadores[nombre] || {};
      statsGlobal[nombre] = {
        jugador: nombre,
        id: jInfo.id || null,
        foto: jInfo.foto || "",
        grupo: jInfo.grupo || "",
        pj: 0,
        g: 0,
        p: 0,
        ff: 0,
        setsG: 0,
        setsP: 0,
        pts: 0
      };
    }
  }

  // Inicializar todos los jugadores registrados
  torneo.grupos.forEach((g) => {
    g.jugadores.forEach((j) => {
      initStats(j.nombre);
      statsGlobal[j.nombre].grupo = g.nombre;
      statsGlobal[j.nombre].foto = j.foto;
      statsGlobal[j.nombre].id = j.id;
    });
  });

  function esPlaceholder(nombre) {
    if (!nombre) return true;
    const s = nombre.toString();
    return s.includes("°") || s.includes("Ganador") || s.includes("Perdedor") || s.trim() === "";
  }

  function procesarResultadoPartido(p) {
    const j1 = p.j1Nombre;
    const j2 = p.j2Nombre;

    // Resetear status del partido
    p.ganadorId = null;
    p.ganadorNombre = null;
    p.perdedorId = null;
    p.perdedorNombre = null;
    p.finalizado = false;

    if (esPlaceholder(j1) || esPlaceholder(j2)) return;

    initStats(j1);
    initStats(j2);

    let setsJ1 = 0;
    let setsJ2 = 0;
    let esFF1 = p.ff1 === true;
    let esFF2 = p.ff2 === true;
    let partidoJugado = false;

    for (let s = 0; s < 5; s++) {
      const v1 = p.sets1[s] !== undefined && p.sets1[s] !== null ? p.sets1[s].toString().trim().toUpperCase() : "";
      const v2 = p.sets2[s] !== undefined && p.sets2[s] !== null ? p.sets2[s].toString().trim().toUpperCase() : "";

      if (v1 === "FF") esFF1 = true;
      if (v2 === "FF") esFF2 = true;

      const num1 = parseInt(p.sets1[s], 10);
      const num2 = parseInt(p.sets2[s], 10);

      if (v1 !== "" || v2 !== "") partidoJugado = true;

      if (!isNaN(num1) && !isNaN(num2)) {
        if (num1 > num2) setsJ1++;
        if (num2 > num1) setsJ2++;
      }
    }

    if (partidoJugado || esFF1 || esFF2) {
      if (esFF1 && !esFF2) {
        statsGlobal[j1].pj++;
        statsGlobal[j1].p++;
        statsGlobal[j1].ff++;

        statsGlobal[j2].pj++;
        statsGlobal[j2].g++;
        statsGlobal[j2].pts += 3;

        p.ganadorNombre = j2;
        p.ganadorId = mapaJugadores[j2]?.id || null;
        p.perdedorNombre = j1;
        p.perdedorId = mapaJugadores[j1]?.id || null;
        p.finalizado = true;
      } else if (esFF2 && !esFF1) {
        statsGlobal[j2].pj++;
        statsGlobal[j2].p++;
        statsGlobal[j2].ff++;

        statsGlobal[j1].pj++;
        statsGlobal[j1].g++;
        statsGlobal[j1].pts += 3;

        p.ganadorNombre = j1;
        p.ganadorId = mapaJugadores[j1]?.id || null;
        p.perdedorNombre = j2;
        p.perdedorId = mapaJugadores[j2]?.id || null;
        p.finalizado = true;
      } else {
        // Partido normal disputado
        if (setsJ1 >= 3 || setsJ2 >= 3) {
          statsGlobal[j1].pj++;
          statsGlobal[j2].pj++;
          statsGlobal[j1].setsG += setsJ1;
          statsGlobal[j1].setsP += setsJ2;
          statsGlobal[j2].setsG += setsJ2;
          statsGlobal[j2].setsP += setsJ1;

          if (setsJ1 >= 3) {
            statsGlobal[j1].g++;
            statsGlobal[j1].pts += 3;
            statsGlobal[j2].p++;
            statsGlobal[j2].pts += 1;

            p.ganadorNombre = j1;
            p.ganadorId = mapaJugadores[j1]?.id || null;
            p.perdedorNombre = j2;
            p.perdedorId = mapaJugadores[j2]?.id || null;
            p.finalizado = true;
          } else if (setsJ2 >= 3) {
            statsGlobal[j2].g++;
            statsGlobal[j2].pts += 3;
            statsGlobal[j1].p++;
            statsGlobal[j1].pts += 1;

            p.ganadorNombre = j2;
            p.ganadorId = mapaJugadores[j2]?.id || null;
            p.perdedorNombre = j1;
            p.perdedorId = mapaJugadores[j1]?.id || null;
            p.finalizado = true;
          }
        }
      }
    }
  }

  // --- FASE 1: PROCESAR PARTIDOS DE GRUPOS ---
  torneo.grupos.forEach((g) => {
    const partidos = torneo.partidosGrupos[g.id] || [];
    partidos.forEach((p) => {
      procesarResultadoPartido(p);
    });
  });

  // --- FASE 2: CALCULAR CLASIFICADOS DE CADA GRUPO ---
  const clasificadosTemp = {};
  torneo.grupos.forEach((g) => {
    const listaJugadores = [...g.jugadores];
    listaJugadores.sort((a, b) => {
      const stA = statsGlobal[a.nombre] || { pts: 0, g: 0, setsG: 0, setsP: 0 };
      const stB = statsGlobal[b.nombre] || { pts: 0, g: 0, setsG: 0, setsP: 0 };
      if (stB.pts !== stA.pts) return stB.pts - stA.pts;
      if (stB.g !== stA.g) return stB.g - stA.g;
      const difA = stA.setsG - stA.setsP;
      const difB = stB.setsG - stB.setsP;
      return difB - difA;
    });

    clasificadosTemp[g.nombre] = {
      p1: listaJugadores[0] || { nombre: `1° ${g.nombre}` },
      p2: listaJugadores[1] || { nombre: `2° ${g.nombre}` },
      rankingCompleto: listaJugadores
    };
  });
  torneo.clasificadosGrupos = clasificadosTemp;

  // --- FASE 3: ASIGNAR CLASIFICADOS A CUARTOS DE FINAL ---
  // Q1: 1A vs 2D
  // Q2: 2A vs 1B
  // Q3: 2B vs 1C
  // Q4: 2C vs 1D
  const q = torneo.playoffs.cuartos;
  const cA = clasificadosTemp["GRUPO A"];
  const cB = clasificadosTemp["GRUPO B"];
  const cC = clasificadosTemp["GRUPO C"];
  const cD = clasificadosTemp["GRUPO D"];

  // Actualizar nombres y IDs en Cuartos
  q[0].j1Nombre = cA?.p1?.nombre || "1° GRUPO A";
  q[0].j1Id = cA?.p1?.id || null;
  q[0].j2Nombre = cD?.p2?.nombre || "2° GRUPO D";
  q[0].j2Id = cD?.p2?.id || null;

  q[1].j1Nombre = cA?.p2?.nombre || "2° GRUPO A";
  q[1].j1Id = cA?.p2?.id || null;
  q[1].j2Nombre = cB?.p1?.nombre || "1° GRUPO B";
  q[1].j2Id = cB?.p1?.id || null;

  q[2].j1Nombre = cB?.p2?.nombre || "2° GRUPO B";
  q[2].j1Id = cB?.p2?.id || null;
  q[2].j2Nombre = cC?.p1?.nombre || "1° GRUPO C";
  q[2].j2Id = cC?.p1?.id || null;

  q[3].j1Nombre = cC?.p2?.nombre || "2° GRUPO C";
  q[3].j1Id = cC?.p2?.id || null;
  q[3].j2Nombre = cD?.p1?.nombre || "1° GRUPO D";
  q[3].j2Id = cD?.p1?.id || null;

  // Procesar Cuartos
  q.forEach((partido) => procesarResultadoPartido(partido));

  // --- FASE 4: ASIGNAR GANADORES A SEMIFINALES ---
  const sf = torneo.playoffs.semis;
  // SF1: Ganador Q1 vs Ganador Q2
  sf[0].j1Nombre = q[0].ganadorNombre || "Ganador 1A vs 2D";
  sf[0].j1Id = q[0].ganadorId || null;
  sf[0].j2Nombre = q[1].ganadorNombre || "Ganador 2A vs 1B";
  sf[0].j2Id = q[1].ganadorId || null;

  // SF2: Ganador Q3 vs Ganador Q4
  sf[1].j1Nombre = q[2].ganadorNombre || "Ganador 2B vs 1C";
  sf[1].j1Id = q[2].ganadorId || null;
  sf[1].j2Nombre = q[3].ganadorNombre || "Ganador 2C vs 1D";
  sf[1].j2Id = q[3].ganadorId || null;

  // Procesar Semis
  sf.forEach((partido) => procesarResultadoPartido(partido));

  // --- FASE 5: TERCER LUGAR Y FINAL ---
  const tl = torneo.playoffs.tercerLugar;
  const fin = torneo.playoffs.final;

  // Tercer Lugar: Perdedor SF1 vs Perdedor SF2
  tl.j1Nombre = sf[0].perdedorNombre || "Perdedor Semi Final 1";
  tl.j1Id = sf[0].perdedorId || null;
  tl.j2Nombre = sf[1].perdedorNombre || "Perdedor Semi Final 2";
  tl.j2Id = sf[1].perdedorId || null;
  procesarResultadoPartido(tl);

  // Final: Ganador SF1 vs Ganador SF2
  fin.j1Nombre = sf[0].ganadorNombre || "Ganador Semi Final 1";
  fin.j1Id = sf[0].ganadorId || null;
  fin.j2Nombre = sf[1].ganadorNombre || "Ganador Semi Final 2";
  fin.j2Id = sf[1].ganadorId || null;
  procesarResultadoPartido(fin);

  // --- FASE 6: DETERMINAR PODIO DE HONOR ---
  torneo.podio = {
    campeon: fin.finalizado && fin.ganadorNombre ? {
      nombre: fin.ganadorNombre,
      id: fin.ganadorId,
      foto: mapaJugadores[fin.ganadorNombre]?.foto || ""
    } : null,
    subcampeon: fin.finalizado && fin.perdedorNombre ? {
      nombre: fin.perdedorNombre,
      id: fin.perdedorId,
      foto: mapaJugadores[fin.perdedorNombre]?.foto || ""
    } : null,
    tercero: tl.finalizado && tl.ganadorNombre ? {
      nombre: tl.ganadorNombre,
      id: tl.ganadorId,
      foto: mapaJugadores[tl.ganadorNombre]?.foto || ""
    } : null,
    cuarto: tl.finalizado && tl.perdedorNombre ? {
      nombre: tl.perdedorNombre,
      id: tl.perdedorId,
      foto: mapaJugadores[tl.perdedorNombre]?.foto || ""
    } : null
  };

  // --- FASE 7: TABLA DE POSICIONES GENERAL Y PUNTOS ---
  const listaGeneral = Object.values(statsGlobal).map((st) => ({
    ...st,
    difSets: st.setsG - st.setsP
  }));

  listaGeneral.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.g !== a.g) return b.g - a.g;
    return b.difSets - a.difSets;
  });

  torneo.tablaGeneral = listaGeneral;

  return torneo;
}

module.exports = {
  crearTorneoInicial,
  recalcularTorneo
};
