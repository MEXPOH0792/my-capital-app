import { useMemo, useRef, useState } from 'react';

const INITIAL_VISIBLE_HISTORY = 40;
const HISTORY_PAGE_SIZE = 40;

export function useWindowedHistoryList({ filteredHistory, historyFilter, historyQuery, canDeleteTransaction }) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_HISTORY);
  const listRef = useRef(null);

  // Collapse back to the first page whenever the list itself changes. Adjusting
  // state during render is React's documented alternative to a reset effect: it
  // re-renders before committing, so the stale page size is never painted.
  const listKey = `${historyFilter}|${historyQuery}|${filteredHistory.length}`;
  const [lastListKey, setLastListKey] = useState(listKey);
  if (listKey !== lastListKey) {
    setLastListKey(listKey);
    setVisibleCount(INITIAL_VISIBLE_HISTORY);
  }

  const visibleHistory = useMemo(() => filteredHistory.slice(0, visibleCount), [filteredHistory, visibleCount]);
  const hasMoreHistory = filteredHistory.length > visibleCount;
  const deletableIds = useMemo(
    () => new Set(visibleHistory.filter((item) => canDeleteTransaction(item)).map((item) => item.id)),
    [visibleHistory, canDeleteTransaction],
  );

  return {
    listRef,
    visibleHistory,
    hasMoreHistory,
    windowedHistory: visibleHistory,
    topSpacerHeight: 0,
    bottomSpacerHeight: 0,
    deletableIds,
    showMoreHistory: () => setVisibleCount((count) => count + HISTORY_PAGE_SIZE),
  };
}
