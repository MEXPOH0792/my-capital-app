import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function FractalTree({ capital, target, theme, hasDebt, copy }) {
  const progress = Math.min(capital / target, 1);
  const activeColor = hasDebt ? theme.treeSick : theme.treeGlow;

  const branches = useMemo(() => {
    const lines = [];
    const maxDepth = 8;

    const generate = (x, y, len, angle, depth) => {
      if (depth > maxDepth) return;
      const x2 = x + len * Math.cos((angle * Math.PI) / 180);
      const y2 = y + len * Math.sin((angle * Math.PI) / 180);
      lines.push({ x1: x, y1: y, x2, y2, depth });
      generate(x2, y2, len * 0.75, angle - 25, depth + 1);
      generate(x2, y2, len * 0.75, angle + 25, depth + 1);
    };

    generate(50, 100, 22, -90, 1);
    return lines;
  }, []);

  return (
    <div
      className="pointer-events-none relative mb-3 flex h-44 w-full items-end justify-center overflow-hidden md:mb-6 md:h-56"
      role="img"
      aria-label={copy.home?.treeStatus || copy.home?.treeLabel || 'Capital tree'}
    >
      <style>
        {`
          @keyframes tree-whole-sway {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-2px) scale(1.01); }
          }
          @keyframes tree-badge-pulse {
            0%, 100% { opacity: 0.85; }
            50% { opacity: 1; }
          }
        `}
      </style>

      <div
        className="z-10 flex h-full w-full items-end justify-center"
        style={{
          transformOrigin: '50% 100%',
          animation: 'tree-whole-sway 4.8s ease-in-out infinite',
          willChange: 'transform',
        }}
      >
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible scale-[0.94]">
          {branches.map((branch, index) => {
            const fillLevel = progress * 9;
            const isLit = branch.depth <= fillLevel + 1;
            const isSemiLit = branch.depth === Math.floor(fillLevel) + 2;
            let strokeOpacity = hasDebt ? 0.04 : 0.06;
            if (isLit) strokeOpacity = hasDebt ? 0.45 : 0.75;
            if (isSemiLit) strokeOpacity = hasDebt ? 0.12 : 0.25;
            if (progress === 0 && branch.depth === 1) strokeOpacity = 0.5;

            return (
              <line
                key={index}
                x1={branch.x1}
                y1={branch.y1}
                x2={branch.x2}
                y2={branch.y2}
                stroke={activeColor}
                strokeOpacity={strokeOpacity}
                strokeWidth={Math.max(0.3, 3 - branch.depth * 0.35)}
                strokeLinecap="round"
                style={{
                  transition: 'stroke 1s ease, stroke-opacity 1s ease',
                }}
              />
            );
          })}
        </svg>
      </div>

      {hasDebt ? (
        <div
          className="absolute top-2 flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5"
          style={{ animation: 'tree-badge-pulse 2.4s ease-in-out infinite' }}
        >
          <AlertTriangle size={14} className="text-[var(--mc-negative)]" />
          <span className="text-[10px] font-semibold text-[var(--mc-negative)]">{copy.tree.debtHurtsTree}</span>
        </div>
      ) : null}
    </div>
  );
}
