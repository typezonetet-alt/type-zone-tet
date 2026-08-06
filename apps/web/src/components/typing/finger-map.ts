// Mapa de dedos ABNT2 (docs/briefing.md secao 10). Compartilhado entre o
// teclado virtual e a ilustracao de maos.
export type FingerId =
  | "L-pinky"
  | "L-ring"
  | "L-middle"
  | "L-index"
  | "R-index"
  | "R-middle"
  | "R-ring"
  | "R-pinky"
  | "thumbs";

export const FINGER_LABEL: Record<FingerId, string> = {
  "L-pinky": "mindinho esquerdo",
  "L-ring": "anelar esquerdo",
  "L-middle": "médio esquerdo",
  "L-index": "indicador esquerdo",
  "R-index": "indicador direito",
  "R-middle": "médio direito",
  "R-ring": "anelar direito",
  "R-pinky": "mindinho direito",
  thumbs: "polegares",
};

export const FINGER_COLOR: Record<FingerId, string> = {
  "L-pinky": "#f472b6",
  "L-ring": "#fb923c",
  "L-middle": "#facc15",
  "L-index": "#4ade80",
  "R-index": "#22d3ee",
  "R-middle": "#60a5fa",
  "R-ring": "#a78bfa",
  "R-pinky": "#f87171",
  thumbs: "#94a3b8",
};

export const KEY_FINGER: Record<string, FingerId> = {
  "1": "L-pinky",
  q: "L-pinky",
  a: "L-pinky",
  z: "L-pinky",
  "2": "L-ring",
  w: "L-ring",
  s: "L-ring",
  x: "L-ring",
  "3": "L-middle",
  e: "L-middle",
  d: "L-middle",
  c: "L-middle",
  "4": "L-index",
  "5": "L-index",
  r: "L-index",
  t: "L-index",
  f: "L-index",
  g: "L-index",
  v: "L-index",
  b: "L-index",
  "6": "R-index",
  "7": "R-index",
  y: "R-index",
  u: "R-index",
  h: "R-index",
  j: "R-index",
  n: "R-index",
  m: "R-index",
  "8": "R-middle",
  i: "R-middle",
  k: "R-middle",
  ",": "R-middle",
  "9": "R-ring",
  o: "R-ring",
  l: "R-ring",
  ".": "R-ring",
  "0": "R-pinky",
  "-": "R-pinky",
  "=": "R-pinky",
  p: "R-pinky",
  ç: "R-pinky",
  ";": "R-pinky",
  " ": "thumbs",
};
