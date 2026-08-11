// Paleta chica, inspirada en colores ANSI de terminal (desaturados para
// no romper la estética "terminal sobre papel"). El color de un grupo se
// deriva de su nombre — mismo nombre, mismo color siempre, sin guardar
// nada aparte en la base.

const PALETTE_SIZE = 6;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Índice de paleta (0-5) determinístico para un nombre de grupo. */
export function groupColorIndex(name: string): number {
  return hashString(name.trim().toLowerCase()) % PALETTE_SIZE;
}

/** Clase CSS (`tag-0` … `tag-5`) para pintar el tag de un grupo. */
export function groupColorClass(name: string): string {
  return `tag-${groupColorIndex(name)}`;
}
