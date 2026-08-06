import { cn } from "@/lib/cn";
import { Hands } from "./hands";
import { KEY_FINGER } from "./finger-map";

interface KeySpec {
  key: string;
  label?: string;
  anchor?: boolean;
  wide?: boolean;
}

const ROWS: KeySpec[][] = [
  [
    { key: "1" }, { key: "2" }, { key: "3" }, { key: "4" }, { key: "5" },
    { key: "6" }, { key: "7" }, { key: "8" }, { key: "9" }, { key: "0" },
  ],
  [
    { key: "q" }, { key: "w" }, { key: "e" }, { key: "r" }, { key: "t" },
    { key: "y" }, { key: "u" }, { key: "i" }, { key: "o" }, { key: "p" },
  ],
  [
    { key: "a" }, { key: "s" }, { key: "d" }, { key: "f", anchor: true }, { key: "g" },
    { key: "h" }, { key: "j", anchor: true }, { key: "k" }, { key: "l" }, { key: "ç" },
  ],
  [
    { key: "z" }, { key: "x" }, { key: "c" }, { key: "v" },
    { key: "b" }, { key: "n" }, { key: "m" }, { key: "," }, { key: "." },
  ],
];

export interface VirtualKeyboardProps {
  targetChar: string | null;
}

export function VirtualKeyboard({ targetChar }: VirtualKeyboardProps) {
  const normalizedTarget = targetChar?.toLowerCase() ?? null;
  const activeFinger = normalizedTarget ? (KEY_FINGER[normalizedTarget] ?? null) : null;

  return (
    <div className="select-none space-y-4">
      <Hands activeFinger={activeFinger} />
      <div className="space-y-1.5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
        {ROWS.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5">
            {row.map((spec) => (
              <Key key={spec.key} spec={spec} active={normalizedTarget === spec.key} />
            ))}
          </div>
        ))}
        <div className="flex justify-center gap-1.5 pt-1">
          <Key spec={{ key: " ", label: "espaço", wide: true }} active={normalizedTarget === " "} />
        </div>
      </div>
    </div>
  );
}

function Key({ spec, active }: { spec: KeySpec; active: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-10 items-center justify-center rounded-md border text-sm font-medium uppercase transition-colors",
        spec.wide ? "w-40" : "w-9",
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
          : "border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--foreground)]",
      )}
    >
      {spec.label ?? spec.key}
      {spec.anchor ? (
        <span className="absolute bottom-1 h-0.5 w-3 rounded-full bg-[var(--color-muted-foreground)]" />
      ) : null}
    </div>
  );
}
