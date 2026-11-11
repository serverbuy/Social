import { useMemo } from "react";

function bits(n: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const s = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const r = s - Math.floor(s);
    return {
      left: `${(r * 100).toFixed(2)}%`,
      delay: `${(r * 2.4).toFixed(2)}s`,
      dur: `${(1.2 + (1 - r) * 2.2).toFixed(2)}s`,
      size: 4 + Math.floor(r * 6),
    };
  });
}

export function ProfileDeco({ kind }: { kind?: string }) {
  const rain = useMemo(() => bits(36, 3), []);
  const snow = useMemo(() => bits(28, 7), []);
  const spark = useMemo(() => bits(18, 11), []);
  const embers = useMemo(() => bits(22, 17), []);
  if (!kind) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {kind === "rain"
        ? rain.map((d, i) => (
            <span
              key={i}
              className="absolute top-[-10%] w-px bg-gradient-to-b from-transparent to-white/80"
              style={{
                left: d.left,
                height: 16 + (i % 10),
                animation: `fall ${d.dur} linear ${d.delay} infinite`,
              }}
            />
          ))
        : null}
      {kind === "snow"
        ? snow.map((d, i) => (
            <span
              key={i}
              className="absolute top-[-8%] rounded-full bg-white/80"
              style={{
                left: d.left,
                width: d.size,
                height: d.size,
                animation: `fall ${Number(d.dur) + 3}s linear ${d.delay} infinite`,
              }}
            />
          ))
        : null}
      {kind === "spark"
        ? spark.map((d, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: d.left,
                top: `${(i * 17) % 90}%`,
                width: 3,
                height: 3,
                animation: `twinkle ${d.dur} ease-in-out ${d.delay} infinite`,
              }}
            />
          ))
        : null}
      {kind === "embers"
        ? embers.map((d, i) => (
            <span
              key={i}
              className="absolute bottom-[-6%] rounded-full"
              style={{
                left: d.left,
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                background: i % 2 ? "#f97316" : "#fbbf24",
                animation: `rise ${Number(d.dur) + 1.5}s linear ${d.delay} infinite`,
              }}
            />
          ))
        : null}
      {kind === "storm"
        ? rain.map((d, i) => (
            <span
              key={i}
              className="absolute top-[-10%] w-0.5 bg-gradient-to-b from-transparent to-sky-200/90"
              style={{
                left: d.left,
                height: 22 + (i % 14),
                animation: `fall ${Number(d.dur) * 0.55}s linear ${d.delay} infinite`,
              }}
            />
          ))
        : null}
      {kind === "confetti"
        ? spark.concat(embers).map((d, i) => (
            <span
              key={i}
              className="absolute top-[-6%] rounded-[1px]"
              style={{
                left: d.left,
                width: 5,
                height: 8,
                background: ["#f43f5e", "#fbbf24", "#22d3ee", "#a855f7"][i % 4],
                animation: `fall ${Number(d.dur) + 1}s linear ${d.delay} infinite`,
              }}
            />
          ))
        : null}
      {kind === "aurora" ? (
        <span
          className="absolute inset-x-0 top-0 h-40 opacity-50"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(52,211,153,.35), rgba(56,189,248,.3), rgba(167,139,250,.35), transparent)",
            animation: "twinkle 5s ease-in-out infinite",
          }}
        />
      ) : null}
      {kind === "matrix"
        ? rain.map((d, i) => (
            <span
              key={i}
              className="absolute top-[-10%] font-mono text-[10px] text-emerald-400/70"
              style={{
                left: d.left,
                animation: `fall ${Number(d.dur) + 2}s linear ${d.delay} infinite`,
              }}
            >
              {i % 2 ? "01" : "10"}
            </span>
          ))
        : null}
      <style>{`
        @keyframes fall {
          from { transform: translateY(0); opacity: .85; }
          to { transform: translateY(110vh); opacity: .15; }
        }
        @keyframes rise {
          from { transform: translateY(0); opacity: .9; }
          to { transform: translateY(-110vh); opacity: 0; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: .15; transform: scale(.6); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
