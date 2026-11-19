import { useCallback, useEffect, useRef, useState } from 'react';

const getKeyboardInset = () => {
  if (typeof window === 'undefined' || !window.visualViewport) return 0;
  const viewport = window.visualViewport;
  const inset = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
  return inset > 96 ? inset : 0;
};

const DISMISS_DRAG_THRESHOLD = 120;

export default function ModalShell({ isDarkMode, theme, panelStyle, setModal, children, layout = 'sheet' }) {
  const isDialog = layout === 'dialog';
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const sheetRef = useRef(null);
  const dragStateRef = useRef({ startY: 0, locked: false, cancelled: false });

  // Visual viewport tracking so the sheet does not get covered by the soft
  // keyboard while the user types into an input.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport || isDialog) {
      setKeyboardInset(0);
      return undefined;
    }

    const syncKeyboardInset = () => setKeyboardInset(getKeyboardInset());
    syncKeyboardInset();

    window.visualViewport.addEventListener('resize', syncKeyboardInset);
    window.visualViewport.addEventListener('scroll', syncKeyboardInset);
    window.addEventListener('orientationchange', syncKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener('resize', syncKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', syncKeyboardInset);
      window.removeEventListener('orientationchange', syncKeyboardInset);
    };
  }, [isDialog]);

  // ESC closes the modal so keyboard users can dismiss without hunting for a
  // button. The handler is intentionally idempotent w.r.t. multiple modals
  // because <AppModalHost> only renders one at a time.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setModal(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [setModal]);

  // Drag-down-to-dismiss on the bottom sheet. Touch only; the handle area at
  // the top is the easiest drag target but the entire sheet works (the
  // touch-action: pan-y above lets vertical scroll continue inside scrollable
  // children — we only commit if the gesture started on the sheet, not on
  // an input or a nested scroll container).
  const isInteractiveTarget = (target) => {
    if (!target || typeof target.closest !== 'function') return false;
    return Boolean(target.closest('input, textarea, select, [data-no-sheet-drag], [contenteditable="true"]'));
  };

  const onTouchStart = useCallback(
    (event) => {
      if (isDialog) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      if (isInteractiveTarget(event.target)) {
        dragStateRef.current.cancelled = true;
        return;
      }
      // Only allow drag when the sheet is scrolled to the top (so we do not
      // hijack a content scroll-to-bottom gesture).
      if (sheetRef.current && sheetRef.current.scrollTop > 0) {
        dragStateRef.current.cancelled = true;
        return;
      }
      dragStateRef.current = {
        startY: touch.clientY,
        locked: false,
        cancelled: false,
      };
    },
    [isDialog],
  );

  const onTouchMove = useCallback(
    (event) => {
      if (isDialog || dragStateRef.current.cancelled) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      const dy = touch.clientY - dragStateRef.current.startY;
      if (!dragStateRef.current.locked) {
        if (dy < 8) return; // wait until clearly downward
        dragStateRef.current.locked = true;
      }
      setDragY(Math.max(0, dy));
    },
    [isDialog],
  );

  const onTouchEnd = useCallback(() => {
    if (isDialog || dragStateRef.current.cancelled) {
      setDragY(0);
      return;
    }
    if (dragY >= DISMISS_DRAG_THRESHOLD) {
      setIsClosing(true);
      // Wait for slide-out animation to finish before unmounting.
      setTimeout(() => setModal(null), 180);
    } else {
      setDragY(0);
    }
  }, [isDialog, dragY, setModal]);

  const modalStyle = isDialog
    ? panelStyle
    : {
        ...panelStyle,
        marginBottom: keyboardInset ? `${keyboardInset}px` : undefined,
        maxHeight: `calc(100dvh - ${Math.max(12, keyboardInset + 12)}px)`,
        transform: isClosing ? 'translateY(110%)' : dragY > 0 ? `translateY(${dragY}px)` : undefined,
        transition: dragY > 0 && !isClosing ? 'none' : 'transform 220ms cubic-bezier(0.32, 0.72, 0.36, 1)',
      };

  const backdropOpacity = isClosing ? 0 : 1;

  return (
    <div
      className={`fixed inset-0 z-[200] flex justify-center ${isDialog ? 'items-center p-4 sm:p-6' : 'items-end p-0 sm:items-center sm:p-6'}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.70)' : 'rgba(148,163,184,0.18)',
          opacity: backdropOpacity,
        }}
        onClick={() => setModal(null)}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        className={`relative overflow-y-auto border ${
          isDialog
            ? 'w-full max-w-sm rounded-[22px] px-4 py-4 sm:rounded-[22px] sm:px-5 sm:py-5 mc-sheet-pop'
            : 'mc-sheet-slide w-full max-w-none rounded-t-[22px] px-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3.5 safe-bottom sm:max-h-[90vh] sm:max-w-sm sm:rounded-[22px] sm:p-6'
        }`}
        style={{ ...modalStyle, touchAction: isDialog ? 'auto' : 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {!isDialog ? (
          <div
            className="mx-auto mb-2.5 h-1.5 w-12 rounded-full sm:hidden"
            style={{ backgroundColor: theme.border }}
            aria-hidden="true"
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}
