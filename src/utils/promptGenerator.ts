/**
 * Reverse-Engineered Master Prompt for creating the Brainrot Sound Library & Creator Command Center.
 * Optimized for Angular (Signals/Standalone) and Modern Web Stacks.
 */

export const REVERSE_ENGINEERED_PROMPT_ES = `Actúa como arquitecto de software frontend senior y especialista en herramientas para creadores de contenido audiovisual. Diseña e implementa una aplicación web local-first de nivel de producción llamada "RotVault / Creator Command Center" con una estética inspirada en el minimalismo refinado de Apple (vidrio esmerilado, bordes de 1px, microinteracciones suaves, tipografía grotesca cuidada) combinada con el diseño de navegación lateral estilo Google AI Studio.

---

### 1. CONTEXTO Y PROBLEMA REAL
Soy creador de contenido en redes sociales (TikTok, Reels, YouTube Shorts) y programador. Mi mayor cuello de botella es perder tiempo buscando sonidos en carpetas locales o tener que importar recopilaciones de 1 minuto a Premiere/CapCut solo para cortar 2 segundos de un sonido (Vine Boom, Metal Pipe, etc.). Necesito una herramienta ágil que resuelva esto en el navegador:
1. **Librería de Sonidos Brainrot & Memes**: visual, rápida y organizada por etiquetas, carpetas y favoritos.
2. **Estudio de Recorte / Trimmer Visual de Audio**: arrastrar cualquier archivo largo (incluso compilaciones de 1 minuto), visualizar la forma de onda, seleccionar el fragmento exacto con marcadores de inicio/fin en milisegundos, previsualizar en bucle, aplicar fade in/out o normalización, y guardarlo/exportarlo en 1 clic como un nuevo sonido independiente sin tener que recargar el archivo para sacar más fragmentos.
3. **Personalización Visual**: portada o avatar meme personalizada para cada sonido (Gigachad, Metal Pipe, Skibidi, emojis o imágenes subidas).
4. **Acceso Rápido a Archivos Locales ("Abrir Carpeta")**:
   - Descarga directa en 1 clic con nombre higienizado (ej. \`vine_boom_cut.wav\`).
   - Integración con File System Access API para guardar automáticamente en la carpeta local de edición.
   - Opción de copiar el archivo de audio directamente al portapapeles (Audio Blob Clipboard).
5. **Modo Soundboard en Vivo**: pads con atajos de teclado (1-9, Q-W-E) para reproducir efectos durante grabaciones o streamings en tiempo real.
6. **Ecosistema Extensible para Creadores**: pestañas de arquitectura preparadas para "Guiones & Hooks" (con anclaje de efectos de sonido en el guión) y "B-Roll & Videos de Stock" (Minecraft Parkour, Subway Surfers, jabón ASMR).

---

### 2. REQUISITOS TÉCNICOS Y ARQUITECTURA
- **Framework sugerido**: Angular 18/19 con Standalone Components, Signals (\`signal\`, \`computed\`, \`effect\`), \`inject()\` dependency injection, RxJS para eventos de audio y TailwindCSS (o React 19 + TypeScript + Vite + TailwindCSS).
- **Procesamiento de Audio 100% en Cliente (Web Audio API)**:
  - API Web Audio para reproducir y procesar los archivos WAV del catálogo local.
  - Decodificación con \`decodeAudioData\` de archivos MP3, WAV, OGG, M4A, WebM.
  - Slicer no destructivo: extracción de muestras PCM en un nuevo \`AudioBuffer\`, cálculo de picos y curvas de fundido (Fade In/Out).
  - Encoder WAV RIFF de 16 bits nativo en JavaScript puro para exportar Blobs instantáneos.
- **Persistencia Local Robusta**:
  - Servidor local para guardar los WAV como archivos en public/assets/audio y actualizar manifest.json al crear o borrar sonidos.
- **Diseño Visual & Principios Estéticos**:
  - Paleta oscura sofisticada (\`#0c0d12\`, zinc/slate neutro) con acentos sutiles.
  - Paneles de vidrio esmerilado con \`backdrop-filter: blur(20px)\` y bordes sutiles \`border-white/10\`.
  - Cero "AI slop": nada de degradados violetas chillones, tarjetas flotantes vacías o píldoras decorativas innecesarias.
  - Menú lateral estilo Google AI Studio con estados activos nítidos, colapsable y barra superior contextual.

---

### 3. VISTAS Y COMPONENTES CLAVE
1. **Sidebar Navigation**:
   - 🎵 Librería de Sonidos (Buscador, filtros por categoría: Brainrot, Memes, SFX, Impactos, Voces, Juegos).
   - ✂️ Recortador & Estudio (Editor de onda con zoom, puntos In/Out, ganancia).
   - ⚡ Soundboard en Vivo (Pad táctil y mapeo de teclas rápidas).
   - 📝 Guiones & Hooks (Banco de gags y hooks de retención con cappings de sonido).
   - 🎬 Videos de Stock & B-Roll (Organizador de clips de fondo para retención).
2. **Componente Waveform Trimmer**:
   - Canvas interactivo para dibujar la forma de onda de audio con barras de amplitud o silueta.
   - Punteros de arrastre para Selección de Inicio y Selección de Fin.
   - Contador digital de tiempo en formato \`mm:ss.ms\`.
   - Botón "Previsualizar Selección" y "Cortar y Guardar en Librería".
   - Flujo continuo: permite seguir sacando más cortes de la misma compilación sin perder el archivo cargado.
3. **Modal / Panel "Abrir en Carpeta"**:
   - Ofrece botón de descarga limpia a la carpeta del creador.
   - Si el navegador soporta \`showDirectoryPicker\`, permite enlazar la carpeta \`C:/Creador/Sonidos\` para exportación directa.
   - Botón de "Copiar al portapapeles" y comando de revelado rápido en explorador de Windows / macOS.

Genera el código modular, tipado estrictamente en TypeScript, sin mocks rotos y completamente funcional.`;
