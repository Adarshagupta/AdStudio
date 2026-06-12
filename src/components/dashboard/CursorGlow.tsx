"use client";

import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -200, y: -200 });
  const targetRef = useRef({ x: -200, y: -200 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    function onMouseMove(e: MouseEvent) {
      targetRef.current = { x: e.clientX, y: e.clientY };
    }

    function animate() {
      const pos = posRef.current;
      const target = targetRef.current;
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      pos.x += dx * 0.12;
      pos.y += dy * 0.12;
      if (glow) {
        glow.style.transform = `translate(${pos.x - 150}px, ${pos.y - 150}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", onMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ willChange: "transform" }}
    >
      <div
        className="absolute h-[300px] w-[300px] rounded-full opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(99,102,241,0.15) 40%, transparent 70%)",
        }}
      />
    </div>
  );
}
