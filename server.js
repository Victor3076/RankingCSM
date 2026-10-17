// server.js - Servidor Local HTTP y SSE para Torneo de Tenis de Mesa
// 100% Nativo de Node.js (Sin librerías externas para máxima portabilidad y funcionamiento offline)

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { crearTorneoInicial, recalcularTorneo } = require('./tournamentLogic');

const PUERTO = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'torneo_data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

// Asegurar directorios
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Cargar o inicializar datos del torneo
let torneo = null;

function guardarDatos() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(torneo, null, 2), 'utf8');
  } catch (err) {
    console.error('Error al guardar datos:', err);
  }
}

function cargarDatos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      torneo = JSON.parse(raw);
      torneo = recalcularTorneo(torneo);
      console.log('✔ Datos del torneo cargados exitosamente desde disco.');
      return;
    }
  } catch (err) {
    console.warn('Advertencia al leer torneo_data.json, se creará uno nuevo:', err.message);
  }
  torneo = crearTorneoInicial();
  guardarDatos();
  console.log('✔ Nuevo torneo inicializado y guardado.');
}

cargarDatos();

// Clientes SSE (Server-Sent Events) conectados en tiempo real (móviles, tablets, PCs)
const clientesSSE = new Set();

function transmitirEstado() {
  const payload = JSON.stringify({ tipo: 'ACTUALIZACION_TORNEO', torneo });
  for (const res of clientesSSE) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      clientesSSE.delete(res);
    }
  }
}

// Ping periódico para mantener vivas las conexiones SSE en dispositivos móviles
setInterval(() => {
  for (const res of clientesSSE) {
    try {
      res.write(': ping\n\n');
    } catch (e) {
      clientesSSE.delete(res);
    }
  }
}, 25000);

// Detección de IPs locales en la red LAN
function obtenerIpsLocales() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Filtrar IPv4 y no loopback (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

// Tipos MIME para servir archivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function servirArchivo(res, rutaArchivo) {
  fs.stat(rutaArchivo, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 No encontrado');
      return;
    }

    const ext = path.extname(rutaArchivo).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(rutaArchivo);
    stream.pipe(res);
  });
}

function parsearJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Límite de 25MB para subida de fotos en base64
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  // Configurar CORS para permitir conexiones LAN sin restricciones
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // --- RUTAS DE API ---

  // SSE: Conexión en vivo para sincronización instantánea
  if (pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(`data: ${JSON.stringify({ tipo: 'INICIAL', torneo })}\n\n`);

    clientesSSE.add(res);
    req.on('close', () => {
      clientesSSE.delete(res);
    });
    return;
  }

  // GET /api/torneo
  if (pathname === '/api/torneo' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(torneo));
    return;
  }

  // GET /api/info-red
  if (pathname === '/api/info-red' && req.method === 'GET') {
    const ips = obtenerIpsLocales();
    const lanUrls = ips.map(ip => `http://${ip}:${PUERTO}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      puerto: PUERTO,
      localUrl: `http://localhost:${PUERTO}`,
      ips: ips,
      lanUrls: lanUrls
    }));
    return;
  }

  // POST /api/partido (actualizar sets de un partido)
  if (pathname === '/api/partido' && req.method === 'POST') {
    try {
      const data = await parsearJsonBody(req);
      const { fase, partidoId, grupoId, sets1, sets2, ff1, ff2 } = data;

      let encontrado = false;

      if (fase === 'grupos' && grupoId && torneo.partidosGrupos[grupoId]) {
        const p = torneo.partidosGrupos[grupoId].find(item => item.id === partidoId);
        if (p) {
          if (sets1 !== undefined) p.sets1 = sets1;
          if (sets2 !== undefined) p.sets2 = sets2;
          if (ff1 !== undefined) p.ff1 = Boolean(ff1);
          if (ff2 !== undefined) p.ff2 = Boolean(ff2);
          encontrado = true;
        }
      } else if (fase === 'playoffs') {
        const cuartos = torneo.playoffs.cuartos.find(item => item.id === partidoId);
        const semis = torneo.playoffs.semis.find(item => item.id === partidoId);
        let target = cuartos || semis;
        if (!target && torneo.playoffs.tercerLugar.id === partidoId) target = torneo.playoffs.tercerLugar;
        if (!target && torneo.playoffs.final.id === partidoId) target = torneo.playoffs.final;

        if (target) {
          if (sets1 !== undefined) target.sets1 = sets1;
          if (sets2 !== undefined) target.sets2 = sets2;
          if (ff1 !== undefined) target.ff1 = Boolean(ff1);
          if (ff2 !== undefined) target.ff2 = Boolean(ff2);
          encontrado = true;
        }
      }

      if (!encontrado) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Partido no encontrado' }));
        return;
      }

      // Recalcular torneo completo (avances de fase, clasificaciones, podio y tabla)
      torneo = recalcularTorneo(torneo);
      guardarDatos();
      transmitirEstado();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, torneo }));
    } catch (err) {
      console.error('Error al actualizar partido:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/actualizar-participante (modificar nombre de jugador)
  if (pathname === '/api/actualizar-participante' && req.method === 'POST') {
    try {
      const data = await parsearJsonBody(req);
      const { jugadorId, nombre, grupoId } = data;

      let modificado = false;
      let nombreAntiguo = '';

      torneo.grupos.forEach(g => {
        g.jugadores.forEach(j => {
          if (j.id === jugadorId) {
            nombreAntiguo = j.nombre;
            j.nombre = nombre.trim();
            modificado = true;
          }
        });
      });

      if (modificado) {
        // Actualizar nombres en partidos de grupo
        Object.keys(torneo.partidosGrupos).forEach(gid => {
          torneo.partidosGrupos[gid].forEach(p => {
            if (p.j1Id === jugadorId || p.j1Nombre === nombreAntiguo) p.j1Nombre = nombre.trim();
            if (p.j2Id === jugadorId || p.j2Nombre === nombreAntiguo) p.j2Nombre = nombre.trim();
          });
        });

        torneo = recalcularTorneo(torneo);
        guardarDatos();
        transmitirEstado();
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, torneo }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/subir-foto (subir foto para un participante en base64)
  if (pathname === '/api/subir-foto' && req.method === 'POST') {
    try {
      const data = await parsearJsonBody(req);
      const { jugadorId, fotoBase64 } = data;

      if (!jugadorId || !fotoBase64) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Faltan datos obligatorios' }));
        return;
      }

      // Procesar data URL (ej: "data:image/jpeg;base64,...")
      const matches = fotoBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      let extension = 'jpg';
      let buffer = null;

      if (matches) {
        extension = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(fotoBase64, 'base64');
      }

      const fileName = `foto_${jugadorId}_${Date.now()}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, buffer);

      const urlFoto = `/uploads/${fileName}`;

      // Asignar al jugador en los grupos
      torneo.grupos.forEach(g => {
        g.jugadores.forEach(j => {
          if (j.id === jugadorId) {
            j.foto = urlFoto;
          }
        });
      });

      torneo = recalcularTorneo(torneo);
      guardarDatos();
      transmitirEstado();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, urlFoto, torneo }));
    } catch (err) {
      console.error('Error al subir foto:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/eliminar-foto
  if (pathname === '/api/eliminar-foto' && req.method === 'POST') {
    try {
      const data = await parsearJsonBody(req);
      const { jugadorId } = data;

      torneo.grupos.forEach(g => {
        g.jugadores.forEach(j => {
          if (j.id === jugadorId) {
            j.foto = '';
          }
        });
      });

      torneo = recalcularTorneo(torneo);
      guardarDatos();
      transmitirEstado();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, torneo }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/nuevo-torneo (generar nuevo torneo desde cero o con participantes actuales)
  if (pathname === '/api/nuevo-torneo' && req.method === 'POST') {
    try {
      const data = await parsearJsonBody(req);
      const { mantenerParticipantes } = data;

      let participantes = null;
      if (mantenerParticipantes && torneo && torneo.grupos) {
        // Clonar participantes y sus fotos, pero reiniciar scores
        participantes = JSON.parse(JSON.stringify(torneo.grupos));
      }

      torneo = crearTorneoInicial(participantes);
      guardarDatos();
      transmitirEstado();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, torneo }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/cargar-ejemplo (cargar el ejemplo completado del Excel)
  if (pathname === '/api/cargar-ejemplo' && req.method === 'POST') {
    try {
      // Recrear torneo inicial
      torneo = crearTorneoInicial();

      const gruposScores = {
        A: [
          { s1: ["11", "11", "11", "", ""], s2: ["FF", "FF", "FF", "", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["9", "7", "4", "", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["4", "1", "7", "", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["FF", "FF", "FF", "", ""] },
          { s1: ["11", "11", "9", "6", "9"], s2: ["3", "6", "11", "11", "11"] },
          { s1: ["11", "11", "11", "", ""], s2: ["FF", "FF", "FF", "", ""] }
        ],
        B: [
          { s1: ["11", "5", "11", "11", ""], s2: ["3", "11", "3", "8", ""] },
          { s1: ["10", "9", "11", "11", "7"], s2: ["12", "11", "5", "9", "11"] },
          { s1: ["11", "11", "11", "", ""], s2: ["6", "7", "5", "", ""] },
          { s1: ["16", "5", "11", "8", "6"], s2: ["14", "11", "4", "11", "11"] },
          { s1: ["11", "10", "11", "11", ""], s2: ["8", "12", "9", "5", ""] },
          { s1: ["7", "9", "11", "6", ""], s2: ["11", "11", "9", "11", ""] }
        ],
        C: [
          { s1: ["3", "8", "3", "", ""], s2: ["11", "11", "11", "", ""] },
          { s1: ["8", "11", "11", "11", ""], s2: ["11", "7", "3", "3", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["6", "5", "9", "", ""] },
          { s1: ["1", "9", "11", "7", ""], s2: ["11", "11", "7", "11", ""] },
          { s1: ["9", "6", "7", "", ""], s2: ["11", "11", "11", "", ""] },
          { s1: ["10", "2", "7", "", ""], s2: ["12", "11", "11", "", ""] }
        ],
        D: [
          { s1: ["11", "11", "11", "", ""], s2: ["FF", "FF", "FF", "", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["0", "7", "4", "", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["5", "4", "4", "", ""] },
          { s1: ["11", "11", "11", "", ""], s2: ["FF", "FF", "FF", "", ""] },
          { s1: ["12", "8", "11", "7", "11"], s2: ["10", "11", "5", "11", "9"] },
          { s1: ["11", "11", "11", "", ""], s2: ["FF", "FF", "FF", "", ""] }
        ]
      };

      ['A', 'B', 'C', 'D'].forEach(gid => {
        gruposScores[gid].forEach((sc, idx) => {
          torneo.partidosGrupos[gid][idx].sets1 = sc.s1;
          torneo.partidosGrupos[gid][idx].sets2 = sc.s2;
        });
      });

      recalcularTorneo(torneo);

      torneo.playoffs.cuartos[0].sets1 = ["11", "3", "10", "11", "12"];
      torneo.playoffs.cuartos[0].sets2 = ["9", "11", "12", "4", "10"];

      torneo.playoffs.cuartos[1].sets1 = ["11", "11", "11", "", ""];
      torneo.playoffs.cuartos[1].sets2 = ["6", "7", "6", "", ""];

      torneo.playoffs.cuartos[2].sets1 = ["11", "8", "5", "5", ""];
      torneo.playoffs.cuartos[2].sets2 = ["1", "11", "11", "11", ""];

      torneo.playoffs.cuartos[3].sets1 = ["5", "11", "4", "8", ""];
      torneo.playoffs.cuartos[3].sets2 = ["11", "8", "11", "11", ""];

      recalcularTorneo(torneo);

      torneo.playoffs.semis[0].sets1 = ["11", "10", "9", "8", ""];
      torneo.playoffs.semis[0].sets2 = ["7", "12", "11", "11", ""];

      torneo.playoffs.semis[1].sets1 = ["5", "8", "11", "5", ""];
      torneo.playoffs.semis[1].sets2 = ["11", "11", "8", "11", ""];

      recalcularTorneo(torneo);

      torneo.playoffs.tercerLugar.sets1 = ["2", "3", "5", "", ""];
      torneo.playoffs.tercerLugar.sets2 = ["11", "11", "11", "", ""];

      torneo.playoffs.final.sets1 = ["11", "11", "11", "", ""];
      torneo.playoffs.final.sets2 = ["9", "4", "8", "", ""];

      torneo = recalcularTorneo(torneo);
      guardarDatos();
      transmitirEstado();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, torneo }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- SERVIR ARCHIVOS ESTÁTICOS ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Evitar Directory Traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acceso denegado');
    return;
  }

  servirArchivo(res, filePath);
});

server.listen(PUERTO, '0.0.0.0', () => {
  const ips = obtenerIpsLocales();
  console.log('\n================================================================');
  console.log('   🏓 CONTROL DE PARTIDOS - TORNEO DE TENIS DE MESA (WEB LAN)');
  console.log('================================================================');
  console.log(`  💻 Acceso local en esta PC:`);
  console.log(`     👉 http://localhost:${PUERTO}\n`);

  if (ips.length > 0) {
    console.log(`  📱 Acceso desde Celulares y Tablets en la Red Wi-Fi / LAN:`);
    ips.forEach(ip => {
      console.log(`     👉 http://${ip}:${PUERTO}`);
    });
  } else {
    console.log(`  ℹ  No se detectó conexión Wi-Fi/LAN activa adicional.`);
  }
  console.log('================================================================');
  console.log('  Presiona Ctrl+C en cualquier momento para detener el servidor.\n');
});
