import { useEffect, useRef, useState } from "react";

interface Props {
  onMove: (x: number, y: number, active: boolean) => void;
}

export function Joystick({ onMove }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<number | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const R = 62;

    const down = (e: PointerEvent) => {
      if (idRef.current !== null) return;
      idRef.current = e.pointerId;
      el.setPointerCapture(e.pointerId);
      originRef.current = { x: e.clientX, y: e.clientY };
      const rect = el.getBoundingClientRect();
      setOrigin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setKnob({ x: 0, y: 0 });
    };
    const move = (e: PointerEvent) => {
      if (idRef.current !== e.pointerId) return;
      let dx = e.clientX - originRef.current.x;
      let dy = e.clientY - originRef.current.y;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      setKnob({ x: dx, y: dy });
      const nx = dx / R;
      const ny = dy / R;
      const n = Math.hypot(nx, ny);
      const dead = n < 0.15 ? 0 : 1;
      onMove(nx * dead, ny * dead, n > 0.15);
    };
    const up = (e: PointerEvent) => {
      if (idRef.current !== e.pointerId) return;
      idRef.current = null;
      setOrigin(null);
      setKnob({ x: 0, y: 0 });
      onMove(0, 0, false);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [onMove]);

  return (
    <div ref={ref} className="absolute inset-0 touch-none" style={{ touchAction: "none" }}>
      {origin && (
        <>
          <div
            className="pointer-events-none absolute rounded-full border-2 border-cyan-300/40 bg-cyan-300/5"
            style={{ left: origin.x - 62, top: origin.y - 62, width: 124, height: 124 }}
          />
          <div
            className="pointer-events-none absolute rounded-full border-2 border-cyan-200/80 bg-cyan-300/30 shadow-[0_0_20px_rgba(99,230,255,0.5)]"
            style={{ left: origin.x + knob.x - 26, top: origin.y + knob.y - 26, width: 52, height: 52 }}
          />
        </>
      )}
    </div>
  );
}
