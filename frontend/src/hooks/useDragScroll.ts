import { useRef } from "react";

export function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);

  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const didDrag = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    didDrag.current = false;
    startX.current = e.pageX;
    scrollLeft.current = ref.current?.scrollLeft ?? 0;
  };

  const onMouseLeave = () => {
    isDown.current = false;
  };

  const onMouseUp = () => {
    isDown.current = false;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !ref.current) return;

    const x = e.pageX;
    const walk = x - startX.current;

    if (Math.abs(walk) > 5) {
      didDrag.current = true;
    }

    ref.current.scrollLeft = scrollLeft.current - walk;
  };

  return {
    ref,
    handlers: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
    },
    didDrag,
  };
}
