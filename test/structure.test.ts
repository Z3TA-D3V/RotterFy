import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? tsxFiles(file) : entry.name.endsWith('.tsx') ? [file] : [];
  });
}

describe('cobertura de archivos TSX', () => {
  it('mantiene un archivo de prueba por cada TSX con la misma ruta', () => {
    const root = process.cwd();
    const missing = tsxFiles(path.join(root, 'src')).map((file) =>
      path.join(root, 'test', path.relative(path.join(root, 'src'), file).replace(/\.tsx$/, '.test.tsx')))
      .filter((file) => !existsSync(file));
    expect(missing).toEqual([]);
  });
});
