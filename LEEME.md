# 🏓 Sistema Web Local para Gestión de Torneos de Tenis de Mesa

Aplicación web local y de red LAN diseñada para reemplazar y modernizar tu planilla de cálculo de Google Sheets con sincronización en tiempo real, soporte de fotos para participantes y podio de campeones.

---

## 🚀 Cómo Iniciar el Sistema (¡1 Solo Clic!)

1. Haz **doble clic** sobre el archivo:
   👉 **`INICIAR_TORNEO.bat`**
2. Se abrirá automáticamente tu navegador web en:
   👉 `http://localhost:3000`
3. ¡Listo! Ya puedes gestionar el torneo sin necesidad de internet.

---

## 📱 Cómo Conectar Celulares o Tablets en la misma Red Wi-Fi (LAN)

Para cargar resultados desde la mesa con un teléfono o colocar una tablet como pantalla pública:

1. Conecta tu celular o tablet a la **misma red Wi-Fi** donde está tu computadora.
2. En la barra superior de la web, presiona el botón:
   👉 **`📱 Conectar Celular / QR`**
3. Abre la cámara de tu celular y **escanea el Código QR** que aparece en pantalla (o escribe la dirección IP que te muestra, por ejemplo: `http://192.168.0.197:3000`).
4. ¡Inmediatamente tendrás acceso desde el móvil! Cualquier resultado que cargues se sincroniza al instante en todos los dispositivos conectados.

---

## 🏆 Características y Funcionalidades

1. **🥇 Podio de Campeones con Fotos**:
   - Tarjetas destacadas para **1° Lugar (Campeón 🏆)**, **2° Lugar (Subcampeón 🥈)**, **3° Lugar (Bronce 🥉)** y **4° Puesto**.
   - Muestra la foto real del jugador, sus sets y estadísticas finales.

2. **📊 Tabla de Posiciones General y Puntos**:
   - Muestra la foto de cada jugador en su fila.
   - Columnas exactas de tu Excel: **Pos, Jugador, PJ, G, P, FF, Sets (+), Sets (-), Dif Sets, Puntos**.
   - Reglas oficiales de tu Google Apps Script:
     - Ganador: +3 Puntos.
     - Perdedor en partido disputado: +1 Punto (por participación).
     - No-presentación (W.O. / FF): 0 Puntos para el ausente, +3 Puntos para el ganador.
     - Desempates: 1° Puntos > 2° Partidos Ganados (G) > 3° Diferencia de Sets (+/-).

3. **🏓 Mesas (Fase de Grupos A, B, C, D)**:
   - Los 4 grupos con sus 6 partidos cada uno (al mejor de 5 sets).
   - Casillas interactivas para escribir los sets (S1 a S5).
   - Botón **`W.O.`** para marcar forfait en un toque.
   - Botón **`📱 Marcador`** táctil pensado para árbitros en celulares (con botones grandes + y - y atajos de 11-9, 11-7, 11-5, etc.).
   - Clasificación en vivo: calcula automáticamente el 1° y 2° lugar de cada grupo.

4. **⚔️ Cuadro Final de Eliminación Directa**:
   - **Cuartos de Final**: 1A vs 2D, 2A vs 1B, 2B vs 1C, 2C vs 1D.
   - **Semifinales**: Ganador Q1 vs Ganador Q2, Ganador Q3 vs Ganador Q4.
   - **Tercer Lugar**: Perdedores de Semifinales.
   - **Gran Final**: Ganadores de Semifinales.
   - Los nombres avanzan automáticamente tan pronto como se definen los partidos previos.

5. **👥 Participantes y Carga de Fotos**:
   - Haz clic en el círculo de cualquier participante para seleccionar una foto de tu disco o **tomar una foto con la cámara del celular**.
   - Las fotos se optimizan y guardan localmente en la carpeta `public/uploads/`.
   - Si no hay foto, el sistema genera automáticamente un avatar deportivo con las iniciales del jugador.

6. **📺 Modo TV / Pantalla Gigante**:
   - Vista en fondo oscuro de alto contraste ideal para proyectar en un televisor de la sala o club.

7. **📊 Botón "Cargar Ejemplo"**:
   - En la barra superior tienes un botón para cargar los resultados exactos que tenías en las fotos de tu Excel para comprobar que todo coincide al 100%.

---

## 💾 Persistencia de Datos

Todos los resultados, nombres y fotos se guardan automáticamente en:
- `data/torneo_data.json`
- `public/uploads/`

Si apagas la computadora o cierras el navegador, **no pierdes nada**. Al volver a abrir `INICIAR_TORNEO.bat` el torneo continúa exactamente donde lo dejaste.
