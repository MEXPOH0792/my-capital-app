import { useCallback, useState } from 'react';
import { useStore } from '../store/useAppStore.js';
import { buildDiagnosticsSnapshot, serializeDiagnosticsSnapshot } from '../utils/diagnostics.js';
import { hapticError, hapticSuccess } from '../utils/haptics.js';

const FILENAME_PREFIX = 'my-capital-diagnostics-';

const stampedFileName = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${FILENAME_PREFIX}${stamp}.json`;
};

const copyToClipboard = async (text) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for older browsers / WebView without Clipboard API.
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

const shareAsFile = async (text, fileName) => {
  // Try Capacitor share + filesystem when running native; fall back to Web
  // Share API; fall back to a Blob download in the browser.
  if (typeof window !== 'undefined' && window.SystemUiBridge) {
    try {
      const [filesystem, share] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
      const { Filesystem, Directory, Encoding } = filesystem;
      const { Share } = share;
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: text,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: 'My Capital diagnostics',
        text: 'Diagnostics log',
        url: writeResult.uri,
        dialogTitle: 'Send log',
      });
      return;
    } catch (error) {
      // Fall through to web fallbacks.
      if (typeof console !== 'undefined') console.warn('[diagnostics] native share failed, falling back', error);
    }
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof File === 'function') {
    try {
      const file = new File([text], fileName, { type: 'application/json' });
      // Some browsers refuse files in share, fall back to plain text in that case.
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'My Capital diagnostics', files: [file] });
        return;
      }
      await navigator.share({ title: 'My Capital diagnostics', text });
      return;
    } catch {
      /* fall through */
    }
  }

  if (typeof document !== 'undefined' && typeof Blob === 'function' && typeof URL?.createObjectURL === 'function') {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  throw new Error('No share or download mechanism available');
};

export function useDiagnosticsActions({ copyText }) {
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const snapshot = useCallback(() => buildDiagnosticsSnapshot(useStore.getState()), []);

  const copyDiagnostics = useCallback(async () => {
    setBusy(true);
    try {
      const text = serializeDiagnosticsSnapshot(snapshot());
      await copyToClipboard(text);
      setNotice(copyText.copied);
      hapticSuccess();
    } catch {
      setNotice(copyText.failed);
      hapticError();
    } finally {
      setBusy(false);
    }
  }, [copyText, snapshot]);

  const shareDiagnostics = useCallback(async () => {
    setBusy(true);
    try {
      const text = serializeDiagnosticsSnapshot(snapshot());
      await shareAsFile(text, stampedFileName());
      setNotice(copyText.shared);
      hapticSuccess();
    } catch {
      setNotice(copyText.failed);
      hapticError();
    } finally {
      setBusy(false);
    }
  }, [copyText, snapshot]);

  return {
    notice,
    busy,
    copyDiagnostics,
    shareDiagnostics,
    bufferedErrorsCount: snapshot().recentErrors.length,
  };
}
