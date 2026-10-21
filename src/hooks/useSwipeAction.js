import { useCallback, useRef, useState } from 'react';

/**
 * Generic horizontal-swipe handler for list rows.
 *
 * Tracks touch deltas, locks into horizontal gesture only when the user moves
 * far enough sideways (so vertical scroll keeps working). Two thresholds:
 *  - `peekThreshold`: when released between this and `commitThreshold`, the
 *    row stays open showing the action zone.
 *  - `commitThreshold`: when released beyond this, `onCommit` fires.
 *
 * Returns:
 *  - `bind`: object with onTouchStart/Move/End to spread on the row
 *  - `offset`: current translateX (negative = swiped left)
 *  - `isOpen`: row currently parked at peek state
 *  - `reset()`: programmatically close
 *  - `wasSwiped()`: returns true if the most recent gesture was a real swipe
 *    (use this in onClick to suppress the row tap that follows a finger drag).
 */
export function useSwipeAction({
  enabled = true,
  peekThreshold = 60,
  commitThreshold = 140,
  lockThreshold = 8,
  onCommit,
  onPeek,
  onClose,
}) {
  const [offset, setOffset] = useState(0);
  const stateRef = useRef({
    startX: 0,
    startY: 0,
    baseOffset: 0,
    locked: false,
    cancelled: false,
    moved: false,
  });
  const swipedRecentlyRef = useRef(false);

  const reset = useCallback(() => {
    setOffset(0);
    onClose?.();
  }, [onClose]);

  const onTouchStart = useCallback(
    (event) => {
      if (!enabled) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        baseOffset: offset,
        locked: false,
        cancelled: false,
        moved: false,
      };
    },
    [enabled, offset],
  );

  const onTouchMove = useCallback(
    (event) => {
      if (!enabled || stateRef.current.cancelled) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - stateRef.current.startX;
      const dy = touch.clientY - stateRef.current.startY;

      if (!stateRef.current.locked) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > lockThreshold) {
          // Vertical intent — let scrolling win, do not interfere again.
          stateRef.current.cancelled = true;
          return;
        }
        if (Math.abs(dx) < lockThreshold) return;
        stateRef.current.locked = true;
      }

      stateRef.current.moved = true;
      // Allow only left-swipe in this app (action zone is on the right).
      const next = Math.min(0, stateRef.current.baseOffset + dx);
      setOffset(next);
    },
    [enabled, lockThreshold],
  );

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;
    if (stateRef.current.cancelled || !stateRef.current.locked || !stateRef.current.moved) {
      swipedRecentlyRef.current = false;
      return;
    }
    swipedRecentlyRef.current = true;
    setTimeout(() => {
      swipedRecentlyRef.current = false;
    }, 250);

    const distance = -offset;
    if (distance >= commitThreshold) {
      setOffset(0);
      onCommit?.();
    } else if (distance >= peekThreshold) {
      setOffset(-peekThreshold);
      onPeek?.();
    } else {
      setOffset(0);
      onClose?.();
    }
  }, [enabled, offset, commitThreshold, peekThreshold, onCommit, onPeek, onClose]);

  const onTouchCancel = useCallback(() => {
    if (!enabled) return;
    stateRef.current.cancelled = true;
    setOffset(0);
  }, [enabled]);

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    offset,
    isOpen: offset <= -peekThreshold,
    reset,
    wasSwiped: () => swipedRecentlyRef.current,
  };
}
