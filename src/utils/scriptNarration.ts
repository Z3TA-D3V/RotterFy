export function extractNarration(content: string): string {
  return [...content.matchAll(/\[NARRADOR\]([\s\S]*?)\[\/NARRADOR\]/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean)
    .join('\n\n');
}
