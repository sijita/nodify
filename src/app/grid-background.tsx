// Firma retro/hacker: grid sutil + glifos ASCII dispersos y esquinas de caja.
// Puramente decorativo (aria-hidden), sin interacción.

const GLYPHS: Array<{ t: string; s: string; o: number; f?: number }> = [
  { t: "┌", s: "top:16px;left:16px", o: 0.55, f: 18 },
  { t: "┐", s: "top:16px;right:16px", o: 0.55, f: 18 },
  { t: "└", s: "bottom:16px;left:16px", o: 0.55, f: 18 },
  { t: "┘", s: "bottom:16px;right:16px", o: 0.55, f: 18 },
  { t: "//", s: "top:23%;left:10%", o: 0.3 },
  { t: "01", s: "top:41%;left:4%", o: 0.3 },
  { t: "</>", s: "top:57%;left:9%", o: 0.35 },
  { t: "{ }", s: "top:20%;right:10%", o: 0.3 },
  { t: "→", s: "top:35%;right:4%", o: 0.35 },
  { t: "[ ]", s: "top:67%;right:4%", o: 0.3 },
  { t: "fn()", s: "top:47%;left:38%", o: 0.22 },
  { t: "0xFF", s: "top:60%;left:71%", o: 0.28 },
  { t: "&&", s: "top:4%;left:24%", o: 0.3 },
  { t: "1010", s: "top:4%;left:63%", o: 0.3 },
  { t: "0x1F", s: "bottom:6%;left:44%", o: 0.22 },
  { t: "~/", s: "top:16%;left:54%", o: 0.26 },
  { t: "::", s: "top:44%;left:67%", o: 0.28 },
  { t: "#!", s: "top:70%;left:34%", o: 0.26 },
];

export function GridBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px)",
        backgroundSize: "44px 44px",
      }}
    >
      {GLYPHS.map((g) => (
        <span
          key={g.t + g.s}
          className="absolute font-mono text-faint"
          style={
            {
              // posición declarada de forma compacta
              ...Object.fromEntries(
                g.s.split(";").map((p) => {
                  const [k, v] = p.split(":");
                  return [k.trim(), v.trim()];
                }),
              ),
              opacity: g.o,
              fontSize: `${g.f ?? 11}px`,
            } as React.CSSProperties
          }
        >
          {g.t}
        </span>
      ))}
    </div>
  );
}
