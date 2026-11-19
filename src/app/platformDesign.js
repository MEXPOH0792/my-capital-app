import { Capacitor } from '@capacitor/core';

// The explicit Android build mode also permits isolated browser visual QA.
// Ordinary Web/PWA builds retain the existing presentation.
export const isAndroidDesign = () => Capacitor.getPlatform() === 'android' || import.meta.env?.MODE === 'android';
