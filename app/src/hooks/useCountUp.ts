import { useEffect, useRef, useState } from "react";

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

/** Animates a numeric value from 0 (or previous value) up to `target` over `duration` ms. */
export function useCountUp(target: number, duration = 900, active = true) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const from = useRef(0);

  useEffect(() => {
    if (!active) return;
    cancelAnimationFrame(raf.current!);
    const start = performance.now();
    const startVal = from.current;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = easeOutCubic(p);
      const v = Math.round(startVal + (target - startVal) * eased);
      setValue(v);
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active]);

  return value;
}
