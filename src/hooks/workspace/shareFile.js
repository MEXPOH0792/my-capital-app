// Handing a generated file to the platform: the Android share sheet, the Web
// Share API, or a plain download. Shared by the backup export and the family
// report so both behave the same on every platform.

import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * @returns 'shared' when the system sheet took it, 'downloaded' when the file
 *   was saved directly, 'cancelled' when the user dismissed the sheet.
 */
export const shareGeneratedFile = async ({
  filename,
  content,
  mimeType = 'application/json',
  shareTitle,
  shareText,
  dialogTitle,
}) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });

  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      const fileUri = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title: shareTitle, text: shareText, url: fileUri.uri, dialogTitle });
      return 'shared';
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled';
  }

  try {
    if (typeof window !== 'undefined' && typeof File !== 'undefined' && navigator?.share) {
      const file = new File([blob], filename, { type: mimeType });
      const canShareFiles = typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({ title: shareTitle, files: [file] });
        return 'shared';
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
};
