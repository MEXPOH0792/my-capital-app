import React from 'react';

/**
 * Subtle shimmer skeleton block used as Suspense fallback for lazy-loaded
 * sections, modals and onboarding. Renders a single CSS keyframe — global
 * keyframe declared once in index.css so multiple skeletons share it.
 */
export function Skeleton({ className = '', style }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[16px] border border-[var(--mc-border-soft)] bg-[var(--mc-soft-faint)] ${className}`.trim()}
      aria-hidden="true"
      style={style}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'mc-skeleton-shimmer 1.4s ease-in-out infinite',
        }}
      />
    </div>
  );
}

export function ScreenSkeleton({ height = '10rem' }) {
  return <Skeleton className="w-full" style={{ minHeight: height }} />;
}

export function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 px-4 pb-6" aria-hidden="true">
      <Skeleton className="w-full max-w-md" style={{ minHeight: '14rem' }} />
    </div>
  );
}

export function OnboardingSkeleton({ rootStyle }) {
  return (
    <div
      className="fixed inset-0 flex flex-col gap-4 px-4 pt-[calc(40px+var(--safe-top))]"
      style={rootStyle}
      aria-hidden="true"
    >
      <Skeleton className="h-8 w-32" />
      <Skeleton style={{ minHeight: '8rem' }} />
      <Skeleton style={{ minHeight: '14rem' }} />
    </div>
  );
}
