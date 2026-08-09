// Rotacao de cores da marca T&T usada em qualquer lugar que precise distinguir
// "N coisas visualmente" sem depender so de azul/turquesa/amarelo (paleta
// principal do design system) -- pista do T&T Turbo, trilha de mundos, etc.
export const BRAND_ROTATION_COLORS = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-success)",
  "var(--color-secondary)",
  "#db2777",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
];

export function brandColorFor(index: number): string {
  return BRAND_ROTATION_COLORS[index % BRAND_ROTATION_COLORS.length];
}
