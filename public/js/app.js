// app.js - Lógica interactiva en tiempo real para Torneo de Tenis de Mesa

let estadoTorneo = null;
let pestañaActual = 'participantes';
let sseConexion = null;
let jugadorSeleccionadoParaFoto = null;

// Contexto para el modal de marcador rápido
let marcadorContext = {
  partidoId: null,
  fase: 'grupos',
  grupoId: null,
  setActivo: 0,
  p1Score: 0,
  p2Score: 0,
  sets1: ["", "", "", "", ""],
  sets2: ["", "", "", "", ""]
};

let filtroGrupoActual = 'TODOS';
let _savedLayout = localStorage.getItem('tt_layout');
let layoutGruposActual = (['2col', '4col', 'auto'].includes(_savedLayout)) ? _savedLayout : '2col';

// --- INICIALIZACIÓN Y CONEXIÓN SSE ---
document.addEventListener('DOMContentLoaded', () => {
  iniciarSSE();
  obtenerInfoRed();
  cambiarLayoutGrupos(layoutGruposActual);
});

// Re-ajustar layout al girar el teléfono o redimensionar ventana
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => cambiarLayoutGrupos(layoutGruposActual), 200);
});

function iniciarSSE() {
  const badge = document.getElementById('net-status-badge');

  if (sseConexion) {
    sseConexion.close();
  }

  sseConexion = new EventSource('/api/stream');

  sseConexion.onopen = () => {
    if (badge) {
      badge.innerHTML = '<span class="status-dot"></span> Sincronizado en Vivo';
      badge.style.color = '#34d399';
    }
  };

  sseConexion.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.torneo) {
        estadoTorneo = data.torneo;
        // Guardar copia de seguridad automática en la memoria interna del celular/PC
        try {
          localStorage.setItem('tt_torneo_backup_auto', JSON.stringify(estadoTorneo));
        } catch (e) {}
        actualizarUI();
      }
    } catch (e) {
      console.error('Error al procesar evento SSE:', e);
    }
  };

  sseConexion.onerror = () => {
    if (badge) {
      badge.innerHTML = '<span class="status-dot" style="background:#ef4444;"></span> Reconectando...';
      badge.style.color = '#f87171';
    }
  };
}

// --- ACTUALIZACIÓN DE INTERFAZ ---
function actualizarUI() {
  if (!estadoTorneo) return;

  // Evitar re-renderizar campos que el usuario esté escribiendo activamente
  const activeEl = document.activeElement;
  const isEditingInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.classList.contains('score-input'));

  renderPodio(estadoTorneo.podio);
  renderTablaPosiciones(estadoTorneo.tablaGeneral);

  if (!isEditingInput || pestañaActual !== 'mesas') {
    renderMesas(estadoTorneo.partidosGrupos, estadoTorneo.grupos, estadoTorneo.clasificadosGrupos);
  }
  if (!isEditingInput || pestañaActual !== 'playoffs') {
    renderPlayoffs(estadoTorneo.playoffs);
  }
  if (!isEditingInput || pestañaActual !== 'participantes') {
    renderParticipantes(estadoTorneo.grupos);
  }

  renderModoTV(estadoTorneo);
}

// Helper para avatar / iniciales
function generarAvatarHtml(foto, nombre, claseImg, claseInitials, tamaño) {
  const iniciales = nombre ? nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'TT';
  if (foto && foto.trim() !== '') {
    return `<img src="${foto}" class="${claseImg}" alt="${nombre}" onerror="this.outerHTML='<div class=\\'${claseInitials}\\'>${iniciales}</div>'">`;
  }
  return `<div class="${claseInitials}">${iniciales}</div>`;
}

// --- RENDER TAB 1: PODIO DE HONOR Y POSICIONES ---
function renderPodio(podio) {
  const container = document.getElementById('podium-container');
  if (!container) return;

  const posiciones = [
    { key: 'campeon', label: '1° Lugar - Campeón', icon: '🏆', medal: '🥇', clase: 'campeon' },
    { key: 'subcampeon', label: '2° Lugar - Subcampeón', icon: '🥈', medal: '🥈', clase: 'subcampeon' },
    { key: 'tercero', label: '3° Lugar - Bronce', icon: '🥉', medal: '🥉', clase: 'tercero' },
    { key: 'cuarto', label: 'Cuarto Puesto', icon: '🎖️', medal: '4°', clase: 'cuarto' }
  ];

  let html = '';
  posiciones.forEach(pos => {
    const j = podio && podio[pos.key];
    const nombre = j && j.nombre ? j.nombre : 'Por definir';
    const foto = j ? j.foto : '';
    const avatar = generarAvatarHtml(foto, nombre, 'player-avatar', 'avatar-initials');

    html += `
      <div class="podium-card ${pos.clase}">
        <div class="podium-badge">
          ${pos.medal} ${pos.label}
        </div>
        <div class="podium-avatar-wrapper">
          ${avatar}
          <div class="podium-rank-icon">${pos.icon}</div>
        </div>
        <div class="podium-name">${nombre}</div>
        <div class="podium-sub">${j ? 'Finalista Oficial' : 'Fase en disputa'}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderTablaPosiciones(tabla) {
  const tbody = document.getElementById('standings-table-body');
  if (!tbody || !tabla) return;

  let html = '';
  tabla.forEach((fila, idx) => {
    const pos = idx + 1;
    let rankClass = '';
    let medalla = '';

    if (pos === 1) { rankClass = 'rank-1'; medalla = '🥇 '; }
    else if (pos === 2) { rankClass = 'rank-2'; medalla = '🥈 '; }
    else if (pos === 3) { rankClass = 'rank-3'; medalla = '🥉 '; }

    const avatar = generarAvatarHtml(fila.foto, fila.jugador, 'table-player-avatar', 'table-player-initials');

    html += `
      <tr class="${rankClass}">
        <td style="font-weight: 800; font-size: 0.95rem;">
          ${medalla}${pos}
        </td>
        <td class="player-cell">
          ${avatar}
          <div class="table-player-info">
            <span class="table-player-name">${fila.jugador}</span>
            <span class="table-player-group">${fila.grupo || ''}</span>
          </div>
        </td>
        <td style="font-weight: 600;">${fila.pj}</td>
        <td style="color: #059669; font-weight: 700;">${fila.g}</td>
        <td style="color: #dc2626; font-weight: 600;">${fila.p}</td>
        <td style="color: #6b7280;">${fila.ff}</td>
        <td style="color: #2563eb; font-weight: 700;">${fila.setsG}</td>
        <td style="color: #64748b;">${fila.setsP}</td>
        <td style="font-weight: 700; color: ${fila.difSets > 0 ? '#059669' : (fila.difSets < 0 ? '#dc2626' : '#64748b')}">
          ${fila.difSets > 0 ? '+' : ''}${fila.difSets}
        </td>
        <td>
          <span class="points-pill">${fila.pts}</span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// --- RENDER TAB 2: MESAS (FASE DE GRUPOS) ---
function renderMesas(partidosGrupos, grupos, clasificados) {
  const container = document.getElementById('groups-container');
  if (!container || !grupos) return;

  const filtro = filtroGrupoActual || 'TODOS';

  let html = '';

  grupos.forEach(g => {
    if (filtro !== 'TODOS' && filtro !== g.id) return;

    const infoClasif = clasificados ? clasificados[g.nombre] : null;
    const p1Clasif = infoClasif && infoClasif.p1 ? infoClasif.p1.nombre : '1° ' + g.nombre;
    const p2Clasif = infoClasif && infoClasif.p2 ? infoClasif.p2.nombre : '2° ' + g.nombre;

    html += `
      <div class="group-column" id="col-grupo-${g.id}">
        <div class="group-header">
          ${g.nombre}
        </div>
        <div class="group-qualifiers-bar">
          <div><span class="qualifier-pill">1°</span> ${p1Clasif}</div>
          <div><span class="qualifier-pill">2°</span> ${p2Clasif}</div>
        </div>
        <div class="matches-container">
    `;

    const partidos = partidosGrupos[g.id] || [];
    partidos.forEach((p, idx) => {
      const j1Winner = p.ganadorNombre && p.ganadorNombre === p.j1Nombre;
      const j2Winner = p.ganadorNombre && p.ganadorNombre === p.j2Nombre;

      const avatar1 = generarAvatarHtml(obtenerFotoJugador(p.j1Nombre), p.j1Nombre, 'player-thumb-micro', 'micro-initials');
      const avatar2 = generarAvatarHtml(obtenerFotoJugador(p.j2Nombre), p.j2Nombre, 'player-thumb-micro', 'micro-initials');

      html += `
        <div class="match-card" id="card-${p.id}" data-j1="${(p.j1Nombre || '').toLowerCase()}" data-j2="${(p.j2Nombre || '').toLowerCase()}" data-mesa="${(p.mesa || '').toLowerCase()}">
          <div class="match-header">
            <span>${p.mesa}</span>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; color: #475569;" onclick="abrirMarcadorRapido('${p.id}', 'grupos', '${g.id}')">
                📱 Marcador
              </button>
              <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; color: #dc2626;" onclick="toggleFF('${p.id}', 'grupos', '${g.id}')">
                W.O.
              </button>
            </div>
          </div>
          <table class="match-table">
            <thead>
              <tr>
                <th class="col-jugador">Jugador</th>
                <th class="col-set">S1</th>
                <th class="col-set">S2</th>
                <th class="col-set">S3</th>
                <th class="col-set">S4</th>
                <th class="col-set">S5</th>
              </tr>
            </thead>
            <tbody>
              <tr class="${j1Winner ? 'winner-highlight' : ''}">
                <td class="col-jugador">
                  <div class="player-row-info" title="${p.j1Nombre}">
                    ${avatar1}
                    <span>${p.j1Nombre}</span>
                  </div>
                </td>
                ${[0, 1, 2, 3, 4].map(s => `
                  <td class="col-set">
                    <input type="text" 
                      class="score-input ${p.sets1[s] === 'FF' ? 'ff-active' : ''}" 
                      value="${p.sets1[s] || ''}" 
                      data-partido-id="${p.id}"
                      data-grupo-id="${g.id}"
                      data-fase="grupos"
                      data-jugador="1"
                      data-set="${s}"
                      onchange="guardarSetInput(this)"
                      maxlength="3">
                  </td>
                `).join('')}
              </tr>

              <tr class="${j2Winner ? 'winner-highlight' : ''}">
                <td class="col-jugador">
                  <div class="player-row-info" title="${p.j2Nombre}">
                    ${avatar2}
                    <span>${p.j2Nombre}</span>
                  </div>
                </td>
                ${[0, 1, 2, 3, 4].map(s => `
                  <td class="col-set">
                    <input type="text" 
                      class="score-input ${p.sets2[s] === 'FF' ? 'ff-active' : ''}" 
                      value="${p.sets2[s] || ''}" 
                      data-partido-id="${p.id}"
                      data-grupo-id="${g.id}"
                      data-fase="grupos"
                      data-jugador="2"
                      data-set="${s}"
                      onchange="guardarSetInput(this)"
                      maxlength="3">
                  </td>
                `).join('')}
              </tr>
            </tbody>
          </table>
          <div class="match-footer">
            <span>${p.finalizado ? '✓ Finalizado' : 'Pendiente'}</span>
            ${p.ganadorNombre ? `<span class="winner-tag">🏆 Ganó: ${p.ganadorNombre}</span>` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  cambiarLayoutGrupos(layoutGruposActual);

  if (textoBusquedaActual) {
    filtrarPartidosEnTiempoReal(textoBusquedaActual);
  }
}

// Búsqueda en tiempo real
let textoBusquedaActual = '';

function filtrarPartidosEnTiempoReal(texto) {
  textoBusquedaActual = (texto || '').trim().toLowerCase();
  const clearBtn = document.getElementById('btn-clear-search');
  if (clearBtn) {
    clearBtn.style.display = textoBusquedaActual ? 'flex' : 'none';
  }

  const matchCards = document.querySelectorAll('.match-card');
  let coincidencias = 0;

  matchCards.forEach(card => {
    if (!textoBusquedaActual) {
      card.style.display = '';
      card.classList.remove('search-matched');
      return;
    }

    const j1 = card.getAttribute('data-j1') || '';
    const j2 = card.getAttribute('data-j2') || '';
    const mesa = card.getAttribute('data-mesa') || '';

    if (j1.includes(textoBusquedaActual) || j2.includes(textoBusquedaActual) || mesa.includes(textoBusquedaActual)) {
      card.style.display = '';
      card.classList.add('search-matched');
      coincidencias++;
    } else {
      card.style.display = 'none';
      card.classList.remove('search-matched');
    }
  });

  const bannerResultados = document.getElementById('search-results-indicator');
  if (bannerResultados) {
    if (textoBusquedaActual) {
      bannerResultados.style.display = 'block';
      bannerResultados.innerHTML = `Mostrando <strong>${coincidencias}</strong> partido(s) para "<strong>${texto}</strong>" <button class="btn btn-sm btn-outline" style="margin-left: 8px; padding: 2px 8px; font-size: 0.72rem; color:#0369a1; border-color:#7dd3fc; background:white;" onclick="limpiarBusqueda()">Mostrar todos</button>`;
    } else {
      bannerResultados.style.display = 'none';
    }
  }
}

function limpiarBusqueda() {
  const inp = document.getElementById('input-busqueda-jugador');
  if (inp) {
    inp.value = '';
  }
  filtrarPartidosEnTiempoReal('');
}

function cambiarFiltroGrupo(val, btn) {
  filtroGrupoActual = val;

  document.querySelectorAll('#btn-group-filtros button').forEach(b => {
    b.classList.remove('active');
  });
  if (btn) {
    btn.classList.add('active');
  }

  if (estadoTorneo) {
    renderMesas(estadoTorneo.partidosGrupos, estadoTorneo.grupos, estadoTorneo.clasificadosGrupos);
  }
}

function cambiarLayoutGrupos(modo) {
  layoutGruposActual = modo || '2col';
  localStorage.setItem('tt_layout', layoutGruposActual);

  const container = document.getElementById('groups-container');
  if (container) {
    container.classList.remove('grid-2col', 'grid-4col', 'grid-1col', 'grid-auto');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      // En móvil siempre 1 columna, sin importar la selección del usuario
      container.style.gridTemplateColumns = '1fr';
    } else if (layoutGruposActual === '2col') {
      container.classList.add('grid-2col');
      container.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    } else if (layoutGruposActual === '4col') {
      container.classList.add('grid-4col');
      container.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
    } else {
      // auto
      container.classList.add('grid-auto');
      container.style.gridTemplateColumns = window.innerWidth >= 1700
        ? 'repeat(4, minmax(0, 1fr))'
        : 'repeat(2, minmax(0, 1fr))';
    }
  }

  ['auto', '2col', '4col'].forEach(m => {
    const b = document.getElementById(`btn-layout-${m}`);
    if (b) {
      if (m === layoutGruposActual) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    }
  });
}

function filtrarGrupoVista(val) {
  cambiarFiltroGrupo(val);
}

// --- RENDER TAB 3: CUADRO FINAL (LLAVES) ---
function renderPlayoffs(playoffs) {
  const container = document.getElementById('playoffs-container');
  if (!container || !playoffs) return;

  function renderPartidoPlayoff(p, titulo) {
    const j1Winner = p.ganadorNombre && p.ganadorNombre === p.j1Nombre;
    const j2Winner = p.ganadorNombre && p.ganadorNombre === p.j2Nombre;

    const avatar1 = generarAvatarHtml(obtenerFotoJugador(p.j1Nombre), p.j1Nombre, 'player-thumb-micro', 'micro-initials');
    const avatar2 = generarAvatarHtml(obtenerFotoJugador(p.j2Nombre), p.j2Nombre, 'player-thumb-micro', 'micro-initials');

    return `
      <div class="match-card" style="margin-bottom: 8px;">
        <div class="match-header" style="background: #3f588a; color: white;">
          <span>${titulo || p.codigo}</span>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; color: white;" onclick="abrirMarcadorRapido('${p.id}', 'playoffs', null)">
              📱 Marcador
            </button>
            <button class="btn btn-outline btn-sm" style="padding: 2px 6px; font-size: 0.7rem; color: #fca5a5;" onclick="toggleFF('${p.id}', 'playoffs', null)">
              W.O.
            </button>
          </div>
        </div>
        <table class="match-table">
          <thead>
            <tr>
              <th class="col-jugador">Jugador</th>
              <th class="col-set">S1</th>
              <th class="col-set">S2</th>
              <th class="col-set">S3</th>
              <th class="col-set">S4</th>
              <th class="col-set">S5</th>
            </tr>
          </thead>
          <tbody>
            <tr class="${j1Winner ? 'winner-highlight' : ''}">
              <td class="col-jugador">
                <div class="player-row-info" title="${p.j1Nombre}">
                  ${avatar1}
                  <span>${p.j1Nombre}</span>
                </div>
              </td>
              ${[0, 1, 2, 3, 4].map(s => `
                <td class="col-set">
                  <input type="text" 
                    class="score-input ${p.sets1[s] === 'FF' ? 'ff-active' : ''}" 
                    value="${p.sets1[s] || ''}" 
                    data-partido-id="${p.id}"
                    data-fase="playoffs"
                    data-jugador="1"
                    data-set="${s}"
                    onchange="guardarSetInput(this)"
                    maxlength="3">
                </td>
              `).join('')}
            </tr>

            <tr class="${j2Winner ? 'winner-highlight' : ''}">
              <td class="col-jugador">
                <div class="player-row-info" title="${p.j2Nombre}">
                  ${avatar2}
                  <span>${p.j2Nombre}</span>
                </div>
              </td>
              ${[0, 1, 2, 3, 4].map(s => `
                <td class="col-set">
                  <input type="text" 
                    class="score-input ${p.sets2[s] === 'FF' ? 'ff-active' : ''}" 
                    value="${p.sets2[s] || ''}" 
                    data-partido-id="${p.id}"
                    data-fase="playoffs"
                    data-jugador="2"
                    data-set="${s}"
                    onchange="guardarSetInput(this)"
                    maxlength="3">
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
        <div class="match-footer">
          <span>${p.finalizado ? '✓ Clasificado' : 'En espera'}</span>
          ${p.ganadorNombre ? `<span class="winner-tag">🏆 Ganó: ${p.ganadorNombre}</span>` : ''}
        </div>
      </div>
    `;
  }

  let html = `
    <!-- Cuartos de final -->
    <div class="bracket-category">
      <div class="bracket-category-header">
        <span>1. CUARTOS DE FINAL (1A vs 2D | 2A vs 1B | 2B vs 1C | 2C vs 1D)</span>
      </div>
      <div class="bracket-grid">
        ${playoffs.cuartos.map(p => renderPartidoPlayoff(p, p.codigo)).join('')}
      </div>
    </div>

    <!-- Semifinales -->
    <div class="bracket-category">
      <div class="bracket-category-header">
        <span>2. SEMIFINALES (Semi Final 1 y Semi Final 2)</span>
      </div>
      <div class="bracket-grid">
        ${playoffs.semis.map(p => renderPartidoPlayoff(p, p.codigo)).join('')}
      </div>
    </div>

    <!-- Tercer Lugar y Gran Final -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
      <div class="bracket-category" style="border-color: #d97706;">
        <div class="bracket-category-header" style="background: linear-gradient(135deg, #b45309, #d97706);">
          <span>🥉 DEFINICIÓN TERCER LUGAR</span>
        </div>
        <div style="padding: 16px; background: #fffbeb;">
          ${renderPartidoPlayoff(playoffs.tercerLugar, 'Tercer Lugar')}
        </div>
      </div>

      <div class="bracket-category" style="border-color: #f59e0b;">
        <div class="bracket-category-header" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
          <span>🏆 GRAN FINAL DEL CAMPEONATO</span>
        </div>
        <div style="padding: 16px; background: #fffdf5;">
          ${renderPartidoPlayoff(playoffs.final, 'Gran Final')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// --- RENDER TAB 4: PARTICIPANTES Y FOTOS ---
function renderParticipantes(grupos) {
  const container = document.getElementById('participants-container');
  if (!container || !grupos) return;

  let html = '';

  grupos.forEach(g => {
    html += `
      <div class="group-participant-card">
        <div class="group-header">
          ${g.nombre}
        </div>
        <div style="display: flex; flex-direction: column;">
    `;

    g.jugadores.forEach((j, idx) => {
      const avatar = generarAvatarHtml(j.foto, j.nombre, 'player-avatar', 'avatar-initials');

      html += `
        <div class="participant-item">
          <div class="participant-photo-btn" onclick="seleccionarFoto('${j.id}')" title="Haz clic para subir o tomar foto">
            ${avatar}
            <div class="photo-overlay">📷</div>
          </div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
            <input type="text" class="participant-input input-nombre-jugador" 
              data-jugador-id="${j.id}" 
              data-grupo-id="${g.id}" 
              value="${j.nombre}" 
              placeholder="Nombre del jugador">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.72rem; color: #64748b;">Jugador #${idx + 1} (${g.nombre})</span>
              ${j.foto ? `<button class="btn btn-danger-outline btn-sm" style="padding: 1px 6px; font-size: 0.68rem;" onclick="eliminarFoto('${j.id}')">Quitar foto</button>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// --- RENDER TAB 5: MODO PANTALLA GIGANTE / TV ---
function renderModoTV(torneo) {
  const tvPodium = document.getElementById('tv-podium-container');
  const tvStandings = document.getElementById('tv-standings-container');
  const tvPlayoffs = document.getElementById('tv-playoffs-container');

  if (tvPodium) {
    renderPodio(torneo.podio);
    tvPodium.innerHTML = document.getElementById('podium-container').innerHTML;
  }

  if (tvStandings && torneo.tablaGeneral) {
    let html = `
      <table class="excel-table" style="background: white; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align: left; padding-left: 8px;">Jugador</th>
            <th>G</th>
            <th>P</th>
            <th>Sets</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
    `;
    torneo.tablaGeneral.forEach((f, idx) => {
      const avatar = generarAvatarHtml(f.foto, f.jugador, 'player-thumb-micro', 'micro-initials');
      html += `
        <tr>
          <td style="font-weight: 800;">${idx + 1}</td>
          <td style="text-align: left; display: flex; align-items: center; gap: 6px; padding: 6px;">
            ${avatar}
            <span style="font-weight: 700;">${f.jugador}</span>
          </td>
          <td style="color: #059669; font-weight: 700;">${f.g}</td>
          <td style="color: #dc2626;">${f.p}</td>
          <td>${f.setsG}-${f.setsP}</td>
          <td><span class="points-pill">${f.pts}</span></td>
        </tr>
      `;
    });
    html += '</tbody></table>';
    tvStandings.innerHTML = html;
  }

  if (tvPlayoffs && torneo.playoffs) {
    const fin = torneo.playoffs.final;
    const tl = torneo.playoffs.tercerLugar;

    tvPlayoffs.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <div style="font-weight: 800; color: #f59e0b; margin-bottom: 6px;">🏆 GRAN FINAL</div>
          <div style="font-size: 1.1rem; font-weight: 700;">${fin.j1Nombre} vs ${fin.j2Nombre}</div>
          <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">
            ${fin.ganadorNombre ? `Ganador: <strong>${fin.ganadorNombre}</strong>` : 'Por disputarse'}
          </div>
        </div>

        <div style="background: #1e293b; padding: 14px; border-radius: 8px; border-left: 4px solid #d97706;">
          <div style="font-weight: 800; color: #d97706; margin-bottom: 6px;">🥉 TERCER PUESTO</div>
          <div style="font-size: 1.1rem; font-weight: 700;">${tl.j1Nombre} vs ${tl.j2Nombre}</div>
          <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 4px;">
            ${tl.ganadorNombre ? `Ganador: <strong>${tl.ganadorNombre}</strong>` : 'Por disputarse'}
          </div>
        </div>
      </div>
    `;
  }
}

// --- GUARDAR RESULTADOS DE SETS ---
async function guardarSetInput(inputEl) {
  const partidoId = inputEl.getAttribute('data-partido-id');
  const grupoId = inputEl.getAttribute('data-grupo-id');
  const fase = inputEl.getAttribute('data-fase');

  // Buscar todos los inputs de este partido
  const selector = `input[data-partido-id="${partidoId}"]`;
  const inputs = Array.from(document.querySelectorAll(selector));

  const sets1 = ["", "", "", "", ""];
  const sets2 = ["", "", "", "", ""];

  inputs.forEach(inp => {
    const jug = inp.getAttribute('data-jugador');
    const setIdx = parseInt(inp.getAttribute('data-set'), 10);
    const val = inp.value.trim().toUpperCase();

    if (jug === '1') sets1[setIdx] = val;
    if (jug === '2') sets2[setIdx] = val;
  });

  try {
    const res = await fetch('/api/partido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partidoId,
        fase,
        grupoId,
        sets1,
        sets2
      })
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
    }
  } catch (err) {
    console.error('Error al guardar set:', err);
  }
}

// Toggle W.O. (Forfeit) rápido
async function toggleFF(partidoId, fase, grupoId) {
  let partido = null;
  if (fase === 'grupos' && estadoTorneo.partidosGrupos[grupoId]) {
    partido = estadoTorneo.partidosGrupos[grupoId].find(p => p.id === partidoId);
  } else if (fase === 'playoffs') {
    partido = estadoTorneo.playoffs.cuartos.find(p => p.id === partidoId) ||
              estadoTorneo.playoffs.semis.find(p => p.id === partidoId);
    if (!partido && estadoTorneo.playoffs.tercerLugar.id === partidoId) partido = estadoTorneo.playoffs.tercerLugar;
    if (!partido && estadoTorneo.playoffs.final.id === partidoId) partido = estadoTorneo.playoffs.final;
  }

  if (!partido) return;

  const respuesta = prompt(`¿Quién cometió W.O. (No se presentó)?\n\n1 = ${partido.j1Nombre}\n2 = ${partido.j2Nombre}\n0 = Quitar W.O.`);
  if (respuesta === null) return;

  let sets1 = [...partido.sets1];
  let sets2 = [...partido.sets2];

  if (respuesta === '1') {
    sets1 = ["FF", "FF", "FF", "", ""];
    sets2 = ["11", "11", "11", "", ""];
  } else if (respuesta === '2') {
    sets1 = ["11", "11", "11", "", ""];
    sets2 = ["FF", "FF", "FF", "", ""];
  } else if (respuesta === '0') {
    sets1 = ["", "", "", "", ""];
    sets2 = ["", "", "", "", ""];
  } else {
    alert("Opción no válida. Escribe 1, 2 o 0.");
    return;
  }

  try {
    const res = await fetch('/api/partido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partidoId, fase, grupoId, sets1, sets2 })
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
    }
  } catch (e) {
    console.error(e);
  }
}

// --- SUBIDA Y GESTIÓN DE FOTOS ---
function seleccionarFoto(jugadorId) {
  jugadorSeleccionadoParaFoto = jugadorId;
  const input = document.getElementById('photo-file-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

function procesarFotoSeleccionada(event) {
  const file = event.target.files[0];
  if (!file || !jugadorSeleccionadoParaFoto) return;

  // Redimensionar y optimizar la imagen antes de subir para que sea ultra rápida
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxDim = 400; // 400px es perfecto para fotos de jugadores
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const base64Optimizada = canvas.toDataURL('image/jpeg', 0.85);
      enviarFotoAlServidor(jugadorSeleccionadoParaFoto, base64Optimizada);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function enviarFotoAlServidor(jugadorId, fotoBase64) {
  try {
    const res = await fetch('/api/subir-foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId, fotoBase64 })
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
    }
  } catch (err) {
    console.error('Error al subir foto:', err);
    alert('Error al guardar la foto.');
  }
}

async function eliminarFoto(jugadorId) {
  if (!confirm('¿Deseas quitar la foto de este participante?')) return;
  try {
    const res = await fetch('/api/eliminar-foto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugadorId })
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
    }
  } catch (err) {
    console.error(err);
  }
}

// Guardar nombres editados de participantes
async function guardarNombresParticipantes() {
  const inputs = document.querySelectorAll('.input-nombre-jugador');
  for (const inp of inputs) {
    const jugadorId = inp.getAttribute('data-jugador-id');
    const grupoId = inp.getAttribute('data-grupo-id');
    const nombre = inp.value.trim();

    if (nombre) {
      await fetch('/api/actualizar-participante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jugadorId, nombre, grupoId })
      });
    }
  }
  alert('¡Nombres actualizados correctamente!');
}

function obtenerFotoJugador(nombre) {
  if (!estadoTorneo || !nombre) return '';
  for (const g of estadoTorneo.grupos) {
    for (const j of g.jugadores) {
      if (j.nombre === nombre) return j.foto;
    }
  }
  return '';
}

// --- MODAL MARCADOR RÁPIDO PARA CELULAR ---
function abrirMarcadorRapido(partidoId, fase, grupoId) {
  let partido = null;
  if (fase === 'grupos' && estadoTorneo.partidosGrupos[grupoId]) {
    partido = estadoTorneo.partidosGrupos[grupoId].find(p => p.id === partidoId);
  } else if (fase === 'playoffs') {
    partido = estadoTorneo.playoffs.cuartos.find(p => p.id === partidoId) ||
              estadoTorneo.playoffs.semis.find(p => p.id === partidoId);
    if (!partido && estadoTorneo.playoffs.tercerLugar.id === partidoId) partido = estadoTorneo.playoffs.tercerLugar;
    if (!partido && estadoTorneo.playoffs.final.id === partidoId) partido = estadoTorneo.playoffs.final;
  }

  if (!partido) return;

  marcadorContext.partidoId = partidoId;
  marcadorContext.fase = fase;
  marcadorContext.grupoId = grupoId;
  marcadorContext.sets1 = [...partido.sets1];
  marcadorContext.sets2 = [...partido.sets2];
  marcadorContext.setActivo = 0;

  // Determinar cuál es el primer set pendiente
  for (let s = 0; s < 5; s++) {
    if (!partido.sets1[s] && !partido.sets2[s]) {
      marcadorContext.setActivo = s;
      break;
    }
  }

  document.getElementById('marcador-modal-title').textContent = `${partido.mesa || partido.codigo}: ${partido.j1Nombre} vs ${partido.j2Nombre}`;
  document.getElementById('fast-p1-name').textContent = partido.j1Nombre;
  document.getElementById('fast-p2-name').textContent = partido.j2Nombre;

  renderizarBotonesSetsModal();
  cargarSetEnMarcadorRapido(marcadorContext.setActivo);

  document.getElementById('modal-marcador').classList.add('active');
}

function renderizarBotonesSetsModal() {
  const container = document.getElementById('marcador-set-buttons');
  if (!container) return;

  container.innerHTML = [0, 1, 2, 3, 4].map(s => {
    const activo = marcadorContext.setActivo === s;
    const s1Val = marcadorContext.sets1[s];
    const s2Val = marcadorContext.sets2[s];
    const label = (s1Val || s2Val) ? `S${s + 1} (${s1Val}-${s2Val})` : `Set ${s + 1}`;

    return `
      <button class="btn btn-sm ${activo ? 'btn-primary' : 'btn-outline'}" 
        style="${activo ? '' : 'color:#1e293b; border-color:#cbd5e1;'}"
        onclick="cargarSetEnMarcadorRapido(${s})">
        ${label}
      </button>
    `;
  }).join('');
}

function cargarSetEnMarcadorRapido(setIdx) {
  marcadorContext.setActivo = setIdx;
  const v1 = parseInt(marcadorContext.sets1[setIdx], 10) || 0;
  const v2 = parseInt(marcadorContext.sets2[setIdx], 10) || 0;
  marcadorContext.p1Score = v1;
  marcadorContext.p2Score = v2;

  document.getElementById('fast-p1-score').textContent = marcadorContext.sets1[setIdx] || '0';
  document.getElementById('fast-p2-score').textContent = marcadorContext.sets2[setIdx] || '0';
  renderizarBotonesSetsModal();
}

function modificarPuntosRapido(jugador, delta) {
  if (jugador === 1) {
    marcadorContext.p1Score = Math.max(0, marcadorContext.p1Score + delta);
    document.getElementById('fast-p1-score').textContent = marcadorContext.p1Score;
  } else {
    marcadorContext.p2Score = Math.max(0, marcadorContext.p2Score + delta);
    document.getElementById('fast-p2-score').textContent = marcadorContext.p2Score;
  }
}

function aplicarPresetMarcador(p1, p2) {
  marcadorContext.p1Score = p1;
  marcadorContext.p2Score = p2;
  document.getElementById('fast-p1-score').textContent = p1;
  document.getElementById('fast-p2-score').textContent = p2;
}

function aplicarPresetFF() {
  marcadorContext.p1Score = 11;
  marcadorContext.p2Score = 'FF';
  document.getElementById('fast-p1-score').textContent = '11';
  document.getElementById('fast-p2-score').textContent = 'FF';
}

async function guardarMarcadorRapido() {
  const s = marcadorContext.setActivo;
  marcadorContext.sets1[s] = document.getElementById('fast-p1-score').textContent.trim();
  marcadorContext.sets2[s] = document.getElementById('fast-p2-score').textContent.trim();

  try {
    const res = await fetch('/api/partido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partidoId: marcadorContext.partidoId,
        fase: marcadorContext.fase,
        grupoId: marcadorContext.grupoId,
        sets1: marcadorContext.sets1,
        sets2: marcadorContext.sets2
      })
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
      // Si aún no se completó el partido y hay más sets, pasar al siguiente set automáticamente
      if (s < 4) {
        cargarSetEnMarcadorRapido(s + 1);
      } else {
        cerrarModalMarcador();
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function cerrarModalMarcador() {
  document.getElementById('modal-marcador').classList.remove('active');
}

// --- MODAL DE CONEXIÓN RED LAN Y CÓDIGO QR ---
let lanUrlActual = '';

async function obtenerInfoRed() {
  try {
    const res = await fetch('/api/info-red');
    const data = await res.json();
    if (data.lanUrls && data.lanUrls.length > 0) {
      lanUrlActual = data.lanUrls[0];
    } else {
      lanUrlActual = data.localUrl || window.location.origin;
    }
  } catch (e) {
    lanUrlActual = window.location.origin;
  }
}

async function abrirModalRed() {
  await obtenerInfoRed();
  const urlBox = document.getElementById('lan-url-text');
  const qrBox = document.getElementById('qr-code-box');

  if (urlBox) urlBox.textContent = lanUrlActual;

  if (qrBox && window.QRCode) {
    qrBox.innerHTML = '';
    new QRCode(qrBox, {
      text: lanUrlActual,
      width: 190,
      height: 190,
      colorDark: '#0f172a',
      colorLight: '#ffffff'
    });
  }

  document.getElementById('modal-red').classList.add('active');
}

function cerrarModalRed() {
  document.getElementById('modal-red').classList.remove('active');
}

function copiarUrlLan() {
  if (navigator.clipboard && lanUrlActual) {
    navigator.clipboard.writeText(lanUrlActual).then(() => {
      alert('¡Enlace copiado al portapapeles!');
    });
  } else {
    prompt('Copia esta dirección en tu celular:', lanUrlActual);
  }
}

// --- ACCIONES GENERALES DEL TORNEO ---
function abrirModalNuevoTorneo() {
  document.getElementById('modal-nuevo-torneo').classList.add('active');
}

function cerrarModalNuevoTorneo() {
  document.getElementById('modal-nuevo-torneo').classList.remove('active');
}

async function ejecutarNuevoTorneo(mantenerParticipantes) {
  cerrarModalNuevoTorneo();
  try {
    const res = await fetch('/api/nuevo-torneo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mantenerParticipantes })
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
      alert('¡Nuevo torneo inicializado con éxito!');
    }
  } catch (e) {
    console.error(e);
  }
}

async function cargarEjemploExcel() {
  if (!confirm('¿Deseas cargar los resultados de ejemplo de tus fotos del Excel?\n(Esto llenará todos los partidos de grupos y llaves tal cual tu hoja de cálculo)')) {
    return;
  }

  try {
    const res = await fetch('/api/cargar-ejemplo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.ok) {
      estadoTorneo = data.torneo;
      actualizarUI();
      cambiarPestana('podio');
      alert('¡Datos de ejemplo cargados! Puedes revisar el Podio, la Tabla de Posiciones y las Llaves.');
    }
  } catch (e) {
    console.error(e);
  }
}

// Navegación entre pestañas
function cambiarPestana(idPestana) {
  pestañaActual = idPestana;

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

  const btnNav = document.getElementById(`tab-nav-${idPestana}`);
  const pane = document.getElementById(`pane-${idPestana}`);

  if (btnNav) btnNav.classList.add('active');
  if (pane) pane.classList.add('active');
}

// ==========================================
// RESPALDO Y RESTAURACIÓN (CELULAR Y PC)
// ==========================================

// 1. Descargar copia del torneo en archivo JSON
function descargarRespaldoJSON() {
  if (!estadoTorneo) {
    alert('No hay datos de torneo cargados para respaldar.');
    return;
  }

  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(estadoTorneo, null, 2));
    const downloadAnchor = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    const hora = new Date().toTimeString().slice(0, 5).replace(':', '-');
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `torneo_csm_${fecha}_${hora}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // Guardar también en localStorage del navegador
    localStorage.setItem('tt_torneo_backup_manual', JSON.stringify(estadoTorneo));
    alert('✔ Respaldo descargado exitosamente a tu dispositivo.');
  } catch (err) {
    alert('Error al generar respaldo: ' + err.message);
  }
}

// 2. Procesar archivo de respaldo subido por el usuario
async function procesarArchivoRespaldo(event) {
  const input = event.target;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const contenido = JSON.parse(e.target.result);
      if (!contenido.grupos || !contenido.partidosGrupos) {
        alert('El archivo seleccionado no corresponde a un respaldo válido de este torneo.');
        input.value = '';
        return;
      }

      if (!confirm('¿Deseas restaurar este respaldo?\nSe reemplazarán los datos actuales por los del archivo.')) {
        input.value = '';
        return;
      }

      const res = await fetch('/api/restaurar-respaldo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contenido)
      });

      const resData = await res.json();
      if (resData.ok) {
        estadoTorneo = resData.torneo;
        localStorage.setItem('tt_torneo_backup_auto', JSON.stringify(estadoTorneo));
        actualizarUI();
        alert('🎉 ¡Torneo restaurado con éxito!');
      } else {
        alert('Error al restaurar: ' + (resData.error || 'Respuesta no válida'));
      }
    } catch (err) {
      alert('Error al leer el archivo JSON: ' + err.message);
    } finally {
      input.value = '';
    }
  };

  reader.readAsText(file);
}
