# RotVault

Biblioteca local de sonidos y estudio de recorte para crear clips WAV.

El frontend y la API son proyectos separados. La carpeta [api](api/) tiene su
propio `package.json` y se puede mover a otro repositorio.
El repositorio del frontend ignora `api/` para que puedas versionarla aparte.

## Iniciar en el ordenador

Abre dos terminales:

```bash
cd api
npm install
npm run dev
```

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:3000`. La API escucha en `127.0.0.1:3001`.

## Dónde se guardan los archivos

Los sonidos existentes y los recortes nuevos están en
`public/assets/audio/`. El archivo `manifest.json` guarda sus títulos,
categorías y demás datos. La API escribe y borra tanto los WAV como sus entradas
del catálogo. Para cambiar la ubicación cuando muevas la API a otro repositorio,
configura `AUDIO_DIR` según [api/README.md](api/README.md).

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
