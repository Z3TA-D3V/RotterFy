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

## Dónde se guardan los audios

Los 33 sonidos existentes y los recortes nuevos están en
`public/assets/audio/`. El archivo `manifest.json` guarda sus títulos,
categorías y demás datos. La API escribe y borra tanto los WAV como sus entradas
del catálogo. Para cambiar la ubicación cuando muevas la API a otro repositorio,
configura `AUDIO_DIR` según [api/README.md](api/README.md).

**Exportar biblioteca** descarga un ZIP de copia de seguridad. Los guiones y la
lista de vídeos de stock aún usan IndexedDB; los audios no dependen de él.

## Versión compilada en local

Con la API en marcha, ejecuta en el frontend:

```bash
npm run build
npm start
```

Una publicación estática puede consultar los sonidos incluidos en el build.
Guardar o borrar desde otro ordenador requeriría publicar también la API con
autenticación y un almacenamiento accesible para ella.
