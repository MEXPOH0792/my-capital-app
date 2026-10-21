// Share a plain-text note through whatever the platform offers.
//
// Only ever called from an explicit user action — nothing here sends anything
// on its own, and the text is handed to the OS share sheet, not to any server.

export type ShareOutcome = 'shared' | 'copied';

const copyToClipboard = async (text: string): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Older WebViews without the Clipboard API.
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return;
  }

  throw new Error('No clipboard available');
};

/**
 * Tries the native share sheet, then the Web Share API, then the clipboard.
 * Returns what actually happened so the caller can word the confirmation
 * correctly instead of claiming a share that never opened.
 */
export const shareOrCopyText = async (title: string, text: string): Promise<ShareOutcome> => {
  if (typeof window !== 'undefined' && window.SystemUiBridge) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, dialogTitle: title });
      return 'shared';
    } catch {
      // A cancelled or unavailable native sheet falls through to the clipboard.
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch {
      /* fall through */
    }
  }

  await copyToClipboard(text);
  return 'copied';
};
