# RotVault

Biblioteca local de sonidos y estudio de recorte para crear clips WAV.

El frontend y la API son proyectos separados. La carpeta [api](api/) tiene su
propio `package.json` y se puede mover a otro repositorio.
El repositorio del frontend ignora `api/` para que puedas versionarla aparte.

## Descargar vídeo o audio de YouTube

La sección **Descargas** acepta la URL de un vídeo y permite guardarlo como MP4
en **B-Roll & Vídeos** o como WAV en la **Librería de Sonidos**. Muestra el
progreso y permite cancelar. Solo procesa un vídeo a la vez; las listas de
reproducción no se descargan. Las tareas se mantienen en memoria mientras la API
está abierta; los archivos completados permanecen en sus catálogos.
Al completarse una descarga iniciada en ese navegador, Chrome recibe otra copia
del archivo. Si el navegador impide la descarga automática, el botón
**Descargar en Chrome** permite repetirla. También puedes descargar los vídeos
guardados desde su tarjeta en B-Roll. Puedes escribir una categoría nueva antes
de descargar un vídeo o cambiarla después en B-Roll; las categorías en uso
aparecen como filtros.

El comando `yt-dlp` se ejecuta **en el ordenador que aloja `api/`**, no en el
navegador. Instala `yt-dlp`, `ffmpeg` y `ffprobe` en ese ordenador y comprueba
que `yt-dlp --version` y `ffmpeg -version` funcionan en la misma terminal desde
la que arrancas la API. En Windows se pueden instalar con `winget`; en Linux,
usa el gestor de paquetes del servidor o los binarios publicados por sus
proyectos. La API busca `yt-dlp` y `ffmpeg` en `PATH`. Si están en otro lugar,
configura `YTDLP_PATH` y `FFMPEG_PATH` en `api/.env` con las rutas de los
ejecutables. No se incluyen binarios en el repositorio: varían según el sistema
operativo y se actualizan por separado.

La URL se valida como vídeo individual de YouTube. La API llama al ejecutable
con argumentos fijos y guarda primero en un directorio temporal; actualiza el
catálogo solo después de completar la descarga. Para vídeo se solicita MP4; si
el vídeo no ofrece una combinación MP4 compatible, se muestra un error. Para
audio se convierte a WAV, que puede ocupar mucho espacio en vídeos largos.

### Acceso desde otro ordenador de la red privada

El navegador del otro ordenador **no puede usar el `yt-dlp` instalado en tu PC**.
Debe hablar con la API de la máquina que lo tenga instalado. Como ejemplo, si
la IP de esa máquina es `192.168.1.50`, configura antes de iniciar:

```powershell
$env:FRONTEND_HOST = '0.0.0.0'
$env:API_HOST = '0.0.0.0'
$env:FRONTEND_ORIGIN = 'http://192.168.1.50:3000'
```

Crea un archivo `.env.local` en la raíz del frontend con:

```text
VITE_API_URL=http://192.168.1.50:3001/api
```

Después ejecuta `pnpm dev` en la máquina servidor y abre
`http://192.168.1.50:3000` desde el otro ordenador. Permite los puertos 3000 y
3001 en el cortafuegos de Windows solo para tu red privada. Si publicas una
versión compilada, configura `VITE_API_URL` **antes** de `pnpm build` y sirve la
carpeta `dist/` en una dirección accesible. `API_HOST` y `FRONTEND_ORIGIN` se
pueden poner también en `api/.env`; `FRONTEND_HOST` se define para el lanzador
de desarrollo. La API expuesta así no tiene autenticación: limítala a una red
de confianza o colócala detrás de un proxy con acceso protegido.

## Iniciar en el ordenador

Instala las dependencias de ambos proyectos una vez:

```bash
npm install
cd api
npm install
cd ..
```

Desde la carpeta principal, inicia ambos servidores con un solo comando:

```bash
npm run dev
```

Abre `http://127.0.0.1:3000`. La API escucha en `127.0.0.1:3001`.
Pulsa Ctrl+C para detener ambos servidores. Para iniciar solo el frontend,
usa `npm run dev:frontend`.

## Dónde se guardan los archivos

Los sonidos existentes y los recortes nuevos están en
`public/assets/audio/`. El archivo `manifest.json` guarda sus títulos,
categorías y demás datos. La API escribe y borra tanto los WAV como sus entradas
del catálogo. Para cambiar la ubicación cuando muevas la API a otro repositorio,
configura `AUDIO_DIR` según [api/README.md](api/README.md).

Al abrir un sonido con **Editar** y guardar los cambios, la API reemplaza su WAV,
portada y metadatos en la misma entrada del catálogo. Un recorte de un archivo
nuevo crea una entrada nueva.

Las portadas recortadas se guardan en `public/assets/images/`, los vídeos en
`public/assets/videos/` y sus fichas y los guiones en `public/assets/data/`.
La API gestiona las altas y bajas. Al abrir esta versión en el navegador que
guardaba guiones y fichas en IndexedDB, se importan una vez a los archivos JSON;
después la aplicación lee y escribe mediante la API.

**Exportar biblioteca** descarga un ZIP de los sonidos. Para una copia completa,
copia también `public/assets/data/`, `public/assets/images/` y
`public/assets/videos/`.

## Versión compilada en local

Con la API en marcha, ejecuta en el frontend:

```bash
npm run build
npm start
```

Una publicación estática puede consultar los sonidos incluidos en el build.
Guardar o borrar desde otro ordenador requeriría publicar también la API con
autenticación y un almacenamiento accesible para ella.

## Pruebas y comprobaciones

```bash
pnpm install
pnpm check
```

`pnpm check` ejecuta TypeScript, las pruebas unitarias con cobertura y el build.
La carpeta `test/` reproduce las rutas de `src/`: cada `.tsx` tiene su
correspondiente `.test.tsx`. La prueba `test/structure.test.ts` comprueba esta
regla automáticamente. La API tiene pruebas propias: `cd api && pnpm test`.
Los dos repositorios ejecutan sus comprobaciones en GitHub Actions.
