import { useCallback, useRef } from "react";

/**
 * Press-and-hold (~300ms) gesture that fires `onHold` without also firing
 * a click. Wire `onPointerDown`/`onPointerUp`/`onPointerLeave` to the target,
 * and check `wasHold()` inside the click handler to suppress it.
 */
export function usePressHold(onHold: () => void, ms = 300) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const didHold = useRef(false);

  const onDown = useCallback(() => {
    didHold.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      didHold.current = true;
      onHold();
    }, ms);
  }, [onHold, ms]);

  const onUp = useCallback(() => {
    clearTimeout(timer.current);
  }, []);

  const wasHold = useCallback(() => {
    if (didHold.current) {
      didHold.current = false;
      return true;
    }
    return false;
  }, []);

  return { onDown, onUp, wasHold };
}
