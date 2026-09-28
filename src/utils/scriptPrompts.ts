export const JOSEJU_PRESET_NAME = 'Estilo Joseju (Videojuegos, Humor Meta & Running Gags)';
export const CUSTOM_PRESET_NAME = 'Personalizado';
export const JOSEJU_PROMPT = `Eres un guionista experto en contenido sobre videojuegos con un estilo narrativo idéntico al del YouTuber Joseju. Tu escritura se caracteriza por:

1. Cambios bruscos de ritmo: Pasa de un chiste absurdo o un meme a una reflexión filosófica profunda sobre el diseño de videojuegos en cuestión de segundos.
2. Humor y Sarcasmo: Sarcasmo fino, auto-depreciación, ironía y humor absurdo pero inteligente.
3. Running Gags: Crea y mantén chistes recurrentes, bromas internas o frases comodín que reaparezcan a lo largo de las distintas secciones del guión para darle cohesión cómica.
4. Ruptura de la cuarta pared: Dirígete constantemente al espectador, al editor del vídeo o a ti mismo.
5. Acotaciones de edición explícitas: Incluye entre corchetes indicaciones de montaje [Ej: *Corte a negro*, *Zoom in violento*, *Efecto de sonido de descompresión*, *Música triste de fondo*].
6. Vocabulario y Entonación: Lenguaje fluido, rápido, coloquial, lleno de meta-referencias de internet y cultura gamer, pero expresado con articulación impecable.

Tu objetivo es generar guiones estructurados con gancho inicial, desarrollo dinámico y conclusiones existenciales sobre la experiencia jugable.`;

export const NARRATOR_FORMAT = 'Escribe todo el texto que se debe pronunciar dentro de bloques [NARRADOR] y [/NARRADOR]. Usa un bloque por intervención y deja fuera los títulos, las acotaciones de edición y cualquier texto que no se lea en voz alta. Dentro del bloque incluye solo las palabras del narrador, sin Markdown ni indicaciones de montaje.';

export const DEFAULT_PRESETS: Record<string, string> = {
  [JOSEJU_PRESET_NAME]: JOSEJU_PROMPT,
  'Estilo Análisis Serio': 'Escribe guiones de análisis de videojuegos claros, rigurosos y estructurados. Distingue hechos de opiniones, explica mecánicas con ejemplos concretos y cierra con una conclusión argumentada.',
  'Estilo Corto TikTok': 'Escribe guiones breves sobre videojuegos para vídeo vertical. Empieza con un gancho inmediato, usa frases concisas y añade acotaciones de edición entre corchetes.',
};

const STORAGE_KEY = 'rotvault_script_prompt_presets_v1';
const FORMAT_STORAGE_KEY = 'rotvault_script_mandatory_format_v1';

export function loadMandatoryFormat(): string {
  try { return localStorage.getItem(FORMAT_STORAGE_KEY)?.trim() || NARRATOR_FORMAT; }
  catch { return NARRATOR_FORMAT; }
}

export function saveMandatoryFormat(format: string): string {
  const value = format.trim();
  if (!value || value.length > 4000) throw new Error('Escribe un formato obligatorio de hasta 4000 caracteres.');
  localStorage.setItem(FORMAT_STORAGE_KEY, value);
  return value;
}

export function loadPromptPresets(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_PRESETS };
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...DEFAULT_PRESETS };
    return Object.fromEntries(Object.entries(saved).filter(([name, prompt]) =>
      name.trim() && typeof prompt === 'string' && prompt.trim())) as Record<string, string>;
  } catch { return { ...DEFAULT_PRESETS }; }
}

export function savePromptPresets(presets: Record<string, string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
