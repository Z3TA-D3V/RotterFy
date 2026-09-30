# Cómo funciona RotVault: guía para aprender React con este proyecto

Esta guía está pensada para leer el código mientras estudias React. Empieza por la idea general y después sigue un caso concreto: pulsar «Reproducir» o guardar un recorte. No necesitas entender cada archivo antes de usar la aplicación.

## 1. Qué hace la aplicación

RotVault es una herramienta local para organizar sonidos, reproducirlos, recortarlos y guardar nuevos clips WAV. También permite escribir guiones, asociarles sonidos, grabar tomas de voz y catalogar vídeos. La interfaz está hecha con **React y TypeScript**. Un servidor **Express** independiente guarda los datos y archivos.

```text
Navegador (React, puerto 3000)
    │ acciones del usuario y peticiones fetch
    ▼
API local (Express, puerto 3001)
    │ lectura y escritura
    ▼
public/assets/ (WAV, imágenes, vídeos y archivos JSON)
```

React decide **qué se ve** y responde a los clics. La API decide **qué queda guardado** en disco. Hay además preferencias pequeñas, como el orden del menú, que se guardan en el `localStorage` del navegador.

## 2. Cómo arrancarla y dónde mirar primero

En dos terminales, desde la raíz del proyecto:

```powershell
cd api
pnpm install
pnpm dev
```

```powershell
pnpm install
pnpm dev
```

Abre `http://127.0.0.1:3000`. Si ves la interfaz pero no se cargan o guardan datos, comprueba que la API del puerto 3001 también esté funcionando. La variable `VITE_API_URL` de `.env.example` permite cambiar su dirección.

Lee estos archivos en este orden:

1. `index.html`: contiene el elemento HTML con `id="root"`.
2. `src/main.tsx`: monta React dentro de ese elemento.
3. `src/App.tsx`: organiza las pantallas, el estado compartido y las acciones principales.
4. `src/components/SoundLibrary.tsx`: ejemplo relativamente sencillo de componente con props, estado local, filtros y eventos.
5. `src/utils/audioStorage.ts`: muestra cómo el frontend habla con la API.
6. `api/server.js`: muestra cómo la API atiende esas peticiones y escribe los archivos.

## 3. De `index.html` a la pantalla

`src/main.tsx` hace, simplificando, esto:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`createRoot` conecta React al HTML. `<App />` es el componente principal. `StrictMode` ayuda a detectar problemas durante el desarrollo; por eso algunos efectos pueden ejecutarse más de una vez en ese entorno. El `!` después de `getElementById` es una afirmación de TypeScript: el autor asegura que el elemento existe.

Un **componente** es una función que devuelve JSX, una sintaxis parecida a HTML. Por ejemplo, `App` devuelve una barra lateral, una cabecera, el contenido de la pestaña activa y, si hay un sonido seleccionado, un reproductor inferior. Cuando cambia un dato de estado, React vuelve a ejecutar el componente para calcular la interfaz nueva.

La aplicación no usa aquí un enrutador de URLs. La pantalla visible depende de `activeTab`, un estado de `App`:

```tsx
const [activeTab, setActiveTab] = useState<ActiveTab>('library');

{activeTab === 'library' && <SoundLibrary sounds={sounds} /* ... */ />}
{activeTab === 'trimmer' && <StudioWorkspace /* ... */ />}
```

El primer valor es la pestaña actual y `setActiveTab` la cambia. La expresión `condición && <Componente />` significa «muestra el componente si la condición es verdadera».

## 4. Mapa de carpetas

| Ruta | Función |
| --- | --- |
| `src/App.tsx` | Coordina navegación, catálogos, reproducción y acciones compartidas. |
| `src/components/` | Pantallas y piezas visuales: biblioteca, estudio, guiones, grabación, etc. |
| `src/utils/` | Funciones de audio, peticiones HTTP, exportación y preferencias. |
| `src/types/index.ts` | Describe con TypeScript la forma de sonidos, guiones y vídeos. |
| `src/index.css` | Estilos globales; los componentes también usan clases de Tailwind. |
| `api/server.js` | Rutas HTTP de Express y lectura/escritura de archivos. |
| `api/script-ai.js` | Construcción de mensajes y cálculo aproximado de coste de IA. |
| `public/assets/` | Archivos reales y catálogos JSON. Son datos del usuario. |
| `test/`, `api/test/` | Pruebas de interfaz, utilidades y servidor. |

`api/` es un proyecto Git independiente y el repositorio del frontend lo ignora. Por eso hay dos `package.json`, dos instalaciones de dependencias y dos procesos.

## 5. Props, estado y flujo de datos

Una **prop** es un dato que un componente padre entrega a un hijo. En `App.tsx`, `SoundLibrary` recibe la lista `sounds` y varias funciones:

```tsx
<SoundLibrary
  sounds={sounds}
  onPlaySound={playSound}
  onToggleFavorite={handleToggleFavorite}
  searchQuery={searchQuery}
/>
```

`SoundLibrary` muestra la lista y, cuando pulsas un botón, llama a `onPlaySound(sound)`. La función real vive en `App`. Este patrón se suele llamar **elevar el estado**: `App` conserva los sonidos porque también los necesitan el soundboard, los guiones y el reproductor. El hijo comunica una intención mediante una función prop; el padre ejecuta el cambio.

En cambio, la categoría seleccionada, el modo cuadrícula/lista y el criterio de orden solo interesan a `SoundLibrary`. Por eso allí se usan `useState` locales. La lista filtrada se calcula desde `sounds`, `searchQuery` y esos estados; no se guarda una segunda copia de la biblioteca.

Un cambio de estado habitual en este proyecto es:

```tsx
setSounds((anteriores) =>
  anteriores.map((sonido) =>
    sonido.id === id ? { ...sonido, favorite: true } : sonido
  )
);
```

`map` crea un **array nuevo** y `{ ...sonido, favorite: true }` crea un **objeto nuevo**. React puede detectar con claridad el cambio. La forma `setSounds((anteriores) => ...)` usa el valor más reciente, algo importante cuando una operación termina después de una petición asíncrona.

Los tipos de `src/types/index.ts` ayudan a leer el código. `SoundItem` define, entre otros, `id`, `title`, `category`, `tags`, `duration`, `favorite` y `playCount`. Una propiedad con `?`, como `coverImage?`, es opcional. `SoundCategory` limita los valores posibles a una unión de cadenas (`'meme' | 'sfx' | ...`). TypeScript comprueba estos datos al desarrollar; en tiempo de ejecución los objetos siguen siendo JavaScript normal.

## 6. Qué hacen los hooks que aparecen aquí

| Hook | Uso real en RotVault |
| --- | --- |
| `useState` | Guarda pestaña activa, sonidos cargados, texto de búsqueda, errores, selección del recorte, etc. Cambiarlo provoca una nueva renderización. |
| `useEffect` | Carga datos al montar `App`, añade escuchadores o temporizadores y los limpia al desmontar. |
| `useRef` | Guarda un controlador de audio, un `MediaRecorder`, un elemento `canvas` o el número de una petición sin provocar una renderización. |
| `useCallback` | Mantiene la referencia de funciones como `playSound` mientras no cambian sus dependencias. |
| `useMemo` | Calcula datos derivados costosos, como los picos visibles de una forma de onda, solo cuando cambian las entradas. |

Ejemplo real del tipo de efecto que verás en `App.tsx`:

```tsx
useEffect(() => {
  let isMounted = true;
  loadInitialData().then((data) => {
    if (isMounted) setSounds(data.sounds);
  });
  return () => { isMounted = false; };
}, []);
```

`[]` indica que el efecto se configura al montar el componente. La función devuelta es la **limpieza**: impide actualizar un componente que ya se ha desmontado. El código real también carga guiones y vídeos y controla errores. `loadInitialData` comparte temporalmente una promesa para evitar cargas simultáneas redundantes durante el montaje.

La regla práctica: usa estado para lo que debe aparecer en la pantalla; usa una ref para manejar una instancia externa o un valor mutable que no necesita mostrarse por sí mismo.

## 7. Cómo se cargan y guardan los datos

Al abrir la aplicación, `App` llama a `initSoundLibrary()` y `loadCreatorLists()`. La primera función pide `GET /api/sounds`; la segunda pide guiones y vídeos. Después, `App` guarda las respuestas en sus estados `sounds`, `scripts` y `stockVideos`.

`audioStorage.ts`, `storage.ts`, `scriptRecordings.ts` y `scriptChat.ts` son la capa de comunicación del frontend. Usan `fetch`, comprueban `response.ok` y transforman la respuesta en JSON o `Blob`. Por ejemplo:

```text
clic en «Favorito»
  → SoundLibrary llama a onToggleFavorite(id)
  → App ejecuta handleToggleFavorite(id)
  → audioStorage.updateSoundMetadata(...) hace PATCH /api/sounds/:id
  → Express actualiza manifest.json
  → App actualiza sounds con setSounds(...)
  → React muestra la estrella cambiada
```

Fíjate en el orden: en esa acción, `App` espera a que el servidor confirme el guardado **antes** de actualizar la lista visual. Si falla, muestra el error. El estado de React representa lo que está en pantalla, pero no es el almacenamiento permanente.

La biblioteca tiene una excepción de lectura: si no responde la API, `getAllSounds` intenta leer el `manifest.json` incluido en la versión estática. Eso puede mostrar los sonidos publicados con el frontend, pero las operaciones de escritura siguen necesitando la API.

Los datos se reparten así:

| Dato | Lugar principal |
| --- | --- |
| Metadatos de sonidos | `public/assets/audio/manifest.json` |
| Archivos de sonidos | `public/assets/audio/*.wav` |
| Portadas subidas | `public/assets/images/` |
| Guiones e historial del asistente | `public/assets/data/scripts.json` |
| Fichas de vídeos | `public/assets/data/stock-videos.json` |
| Archivos de vídeo | `public/assets/videos/` |
| Grabaciones y sus ediciones | `public/assets/recordings/` y `public/assets/data/script-recordings.json` |
| Orden/visibilidad del menú, preferencias de prompts, zoom, micrófono | `localStorage` del navegador |

`legacyMigration.ts` importa una vez guiones y fichas de vídeos de una versión anterior que usaba IndexedDB. Ese uso de IndexedDB es para migración, no para guardar los datos nuevos en la versión actual.

En la API, `dataRoutes(...)` crea operaciones comunes para guiones y vídeos. `serializeMutation(...)` pone las escrituras en cola para evitar que dos peticiones cambien un mismo catálogo a la vez. Los JSON se escriben primero en un archivo temporal y luego se renombran. En la edición de un sonido, la API hace además copias temporales para poder recuperar el WAV y la portada anteriores si falla la actualización.

## 8. Recorrido completo: reproducir un sonido

1. En `SoundLibrary`, un botón llama a `onPlaySound(sound)`.
2. `App.playSound` detiene lo anterior con `stopAudio()` y pide el `AudioBuffer` a `getSoundAudioBuffer(sound.id)`.
3. `audioStorage.ts` busca primero en una caché `Map`. Si no lo tiene, descarga el archivo como `Blob` y lo decodifica con `decodeAudioBlob`.
4. `audioEngine.ts` usa la Web Audio API: crea un `AudioBufferSourceNode`, lo conecta a un nodo de volumen y finalmente a la salida de audio.
5. `App` actualiza `isPlaying`, `duration` y el sonido actual. `requestAnimationFrame` actualiza el progreso visible.
6. En paralelo se llama a `POST /api/sounds/:id/play` para aumentar `playCount` en el catálogo.

Los `Map` de `audioStorage.ts` evitan volver a descargar o decodificar el mismo sonido en la sesión. Son una caché en memoria, no una copia permanente. `playbackRequestRef` evita que una descarga antigua empiece a sonar después de haber seleccionado otro audio. El controlador de reproducción se guarda en una ref para poder detenerlo inmediatamente.

`AudioPlayerBar` recibe por props el tiempo, progreso, volumen, velocidad y funciones de control. La barra muestra el estado que controla `App`; no administra por su cuenta el sonido de toda la aplicación.

## 9. Recorrido completo: crear o editar un recorte

`StudioWorkspace.tsx` es la pantalla del estudio. Puedes cargar un archivo nuevo o llegar desde «Editar» en un sonido existente. En el segundo caso, `App` descarga su `Blob` y entrega también el `SoundItem` original al estudio.

1. `decodeAudioBlob` convierte el archivo comprimido o WAV en un `AudioBuffer`: muestras de sonido que la Web Audio API puede procesar.
2. `WaveformTrimmer` dibuja la forma de onda en un `canvas`. Recibe `startSec`, `endSec` y `onRangeChange`; al arrastrar los límites, avisa al padre. Para un dibujo grande usa `useMemo`, `ResizeObserver` y refs al canvas.
3. El estudio llama a `sliceAndProcessAudioBuffer` con inicio, fin, ganancia, normalización y fundidos de entrada y salida. Después `bufferToWaveBlob` convierte el resultado en WAV y `extractWaveformPeaks` obtiene datos para dibujar una forma de onda pequeña.
4. `StudioWorkspace` crea el objeto `SoundItem` con título, etiquetas, portada y duración. Si es un sonido nuevo usa `saveSoundToLibrary` (`POST /api/sounds`); si edita uno existente usa `replaceSoundInLibrary` (`PUT /api/sounds/:id`).
5. `audioStorage.ts` convierte el WAV a base64 para enviarlo en JSON. La API valida la petición, escribe el WAV y actualiza `manifest.json`. Solo tras recibir éxito se llama a `onSoundSaved`, que actualiza la lista de `App`.

Editar un sonido conserva su ID, fecha de alta, favorito y número de reproducciones. El componente `CoverCropper` recorta una imagen en canvas cuando se sube una portada personalizada. `AudioTrimmerModal.tsx` ofrece otra interfaz de recorte con lógica parecida; la navegación principal de `App` abre `StudioWorkspace` al entrar en la pestaña de estudio.

**Concepto útil:** `Blob` representa bytes de un archivo; `AudioBuffer` representa muestras decodificadas listas para analizar o reproducir; el WAV es el archivo final que se guarda. Son tres formas distintas del mismo audio durante el proceso.

## 10. El resto de pantallas

- **Soundboard** (`SoundboardMode.tsx`): organiza sonidos como botones y responde también a teclas. Reutiliza `playSound` de `App`, así que reproduce el mismo catálogo.
- **Guiones** (`ScriptsHub.tsx`): mantiene un borrador local mientras editas. `App` le pasa `onSaveScript` y `onDeleteScript`, que llaman a la API y actualizan la lista compartida. `ScriptPreview.tsx` muestra Markdown; `extractNarration` obtiene los bloques `[NARRADOR]...[/NARRADOR]` para la vista de narrador.
- **Asistente de guiones** (`scriptChat.ts`, `api/server.js`): el frontend envía el mensaje a `POST /api/scripts/:id/chat`. La API usa la clave `OPENAI_API_KEY` del proceso servidor, transmite fragmentos de respuesta y guarda el historial en `scripts.json`. El frontend lee eventos NDJSON `delta`, `done` y `error`. Una propuesta generada se aplica al contenido del guion cuando se pulsa la acción correspondiente.
- **Grabación** (`RecordingStudio.tsx`): `getUserMedia` pide acceso al micrófono y `MediaRecorder` captura una toma. `scriptRecordings.ts` envía el `Blob` a la API. El editor puede guardar una versión WAV procesada; el original y la edición quedan relacionados con el guion.
- **Vídeos de stock** (`StockVideoHub.tsx`): administra fichas y archivos de vídeo mediante `storage.ts` y la API.
- **Ajustes y menú** (`SettingsHub.tsx`, `Sidebar.tsx`): muestran u ocultan secciones y permiten cambiar su orden. `sectionVisibility.ts` y `sectionOrder.ts` guardan esas preferencias en `localStorage`.
- **Exportación** (`libraryExport.ts`): descarga cada sonido y crea un ZIP con los archivos y un `manifest.json` usando JSZip. El ZIP de sonidos no incluye por sí solo los demás datos y archivos de la aplicación.

`React.lazy` y `Suspense` cargan algunos componentes solo cuando hacen falta. Es una forma de dividir el JavaScript descargado inicialmente; por ejemplo, la vista de prompts del sistema no tiene que cargarse al abrir la biblioteca.

## 11. Qué parte es React y qué parte es el navegador

Es fácil mezclar ambos conceptos al principio:

| Tecnología | Qué hace aquí |
| --- | --- |
| React | Componentes, JSX, props, estado y actualización de la interfaz. |
| TypeScript | Comprueba tipos y ayuda al editor; se elimina al compilar. |
| Vite | Sirve el frontend en desarrollo y genera `dist/` para producción. |
| Tailwind CSS | Da estilo mediante clases en `className`. |
| `fetch` | Hace peticiones HTTP desde el navegador. |
| Web Audio API | Decodifica, procesa y reproduce audio. |
| Canvas API | Dibuja ondas y recorta imágenes. |
| MediaRecorder | Graba audio del micrófono. |
| Express/Node | Sirve la API y accede al sistema de archivos. |

React coordina estas APIs mediante efectos, eventos y estado, pero no implementa por sí mismo la reproducción de audio ni el acceso al disco.

## 12. Cómo se comprueba el proyecto

Desde la raíz:

```powershell
pnpm check
```

Ese comando ejecuta la comprobación de TypeScript, las pruebas de Vitest con cobertura y el build de Vite. Si cambias `api/`, ejecuta también:

```powershell
cd api
pnpm test
```

`test/` refleja las rutas de `src/`: cada archivo `.tsx` debe tener su archivo `.test.tsx` correspondiente. `test/structure.test.ts` comprueba la regla. Las pruebas usan React Testing Library para observar el resultado visible de las acciones y otras pruebas verifican almacenamiento, audio y peticiones.

## 13. Ejercicios de lectura recomendados

1. **Filtro:** sigue `searchQuery` desde `TopHeader` hasta `SoundLibrary`. Localiza el `filter` y explica por qué escribir en el buscador vuelve a mostrar una lista distinta sin modificar `sounds`.
2. **Favorito:** sigue `handleToggleFavorite` desde el clic hasta el `PATCH` de la API y vuelve al `setSounds`.
3. **Reproducción:** identifica qué valores están en `useState` y cuáles en `useRef`. Pregúntate cuáles necesitan verse en la pantalla y cuáles controlan objetos externos.
4. **Recorte:** sigue las transformaciones `File/Blob → AudioBuffer → AudioBuffer recortado → Blob WAV → API → archivo WAV`.
5. **Guion:** distingue el borrador que aún estás editando del registro ya guardado en `scripts.json`.

Si entiendes esos cinco caminos, habrás cubierto las ideas centrales de React en esta aplicación: **componentes, props, estado, renderización, eventos, efectos y comunicación asíncrona con un servidor**.
