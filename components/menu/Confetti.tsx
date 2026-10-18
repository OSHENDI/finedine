import type { CSSProperties } from "react";

// Soft pastel rings and arcs in the spirit of the sprinkles in the brand artwork. Plain vectors
// (sharp at any size), few in number, and moved by transform only. They sit behind the content.
const PINK = "#f1b4cb";
const YELLOW = "#f7dd96";
const BLUE = "#bcdbe3";

type Bit = { kind: "ring" | "arc"; color: string; x: string; y: string; size: number; turn: number; seconds: number; delay: number; dx: number; dy: number };

const bits: Bit[] = [
  { kind: "ring", color: BLUE, x: "8%", y: "6%", size: 38, turn: 0, seconds: 46, delay: 0, dx: 70, dy: 90 },
  { kind: "arc", color: PINK, x: "78%", y: "4%", size: 34, turn: 40, seconds: 38, delay: -9, dx: -80, dy: 110 },
  { kind: "ring", color: YELLOW, x: "90%", y: "26%", size: 30, turn: 0, seconds: 52, delay: -20, dx: -60, dy: -70 },
  { kind: "arc", color: BLUE, x: "3%", y: "30%", size: 36, turn: 200, seconds: 44, delay: -6, dx: 90, dy: -60 },
  { kind: "ring", color: PINK, x: "84%", y: "52%", size: 42, turn: 0, seconds: 58, delay: -30, dx: -100, dy: -90 },
  { kind: "arc", color: YELLOW, x: "6%", y: "56%", size: 32, turn: 120, seconds: 40, delay: -14, dx: 80, dy: 70 },
  { kind: "ring", color: YELLOW, x: "20%", y: "74%", size: 26, turn: 0, seconds: 48, delay: -25, dx: 110, dy: -80 },
  { kind: "arc", color: PINK, x: "72%", y: "78%", size: 36, turn: 300, seconds: 54, delay: -3, dx: -90, dy: -100 },
  { kind: "ring", color: BLUE, x: "46%", y: "2%", size: 22, turn: 0, seconds: 36, delay: -17, dx: 60, dy: 120 }
];

export default function Confetti() {
  return (
    <div aria-hidden="true" className="fd-confetti">
      {bits.map((bit, index) => (
        <svg
          className="fd-bit"
          fill="none"
          key={index}
          stroke={bit.color}
          strokeLinecap="round"
          strokeWidth={6}
          style={{ "--x": bit.x, "--y": bit.y, "--s": `${bit.size}px`, "--r": `${bit.turn}deg`, "--d": `${bit.seconds}s`, "--t": `${bit.delay}s`, "--dx": `${bit.dx}px`, "--dy": `${bit.dy}px` } as CSSProperties}
          viewBox="0 0 48 48"
        >
          {bit.kind === "ring" ? <circle cx="24" cy="24" r="17" /> : <path d="M8 30a17 17 0 0 1 32-12" />}
        </svg>
      ))}
    </div>
  );
}
