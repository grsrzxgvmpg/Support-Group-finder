// Platform abstraction: web vs. native (Capacitor).
// When the app runs inside the Android/iOS shell, web APIs like
// navigator.vibrate (dead on iOS WKWebView) and navigator.geolocation
// (no runtime-permission handling) are replaced with Capacitor plugins.

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

export const isNativePlatform = Capacitor.isNativePlatform();

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationErrorCode = 'unsupported' | 'denied' | 'unavailable';

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

const POSITION_OPTIONS = { timeout: 10000, maximumAge: 5 * 60 * 1000 };

export async function getCurrentPosition(): Promise<Coordinates> {
  if (isNativePlatform) {
    let permission;
    try {
      permission = await Geolocation.requestPermissions();
    } catch {
      throw new LocationError('unavailable', 'Location services are unavailable');
    }
    if (permission.location === 'denied' && permission.coarseLocation === 'denied') {
      throw new LocationError('denied', 'Location permission denied');
    }
    try {
      const pos = await Geolocation.getCurrentPosition(POSITION_OPTIONS);
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      throw new LocationError('unavailable', 'Unable to retrieve location');
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new LocationError('unsupported', 'Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }),
      (error) => reject(new LocationError(
        error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
        error.message
      )),
      POSITION_OPTIONS
    );
  });
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const WEB_VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 20, 10],
  warning: [50, 30, 50],
  error: [30, 30, 30, 30]
};

export async function triggerHaptic(type: HapticType = 'light'): Promise<void> {
  if (isNativePlatform) {
    try {
      switch (type) {
        case 'light': await Haptics.impact({ style: ImpactStyle.Light }); break;
        case 'medium': await Haptics.impact({ style: ImpactStyle.Medium }); break;
        case 'heavy': await Haptics.impact({ style: ImpactStyle.Heavy }); break;
        case 'success': await Haptics.notification({ type: NotificationType.Success }); break;
        case 'warning': await Haptics.notification({ type: NotificationType.Warning }); break;
        case 'error': await Haptics.notification({ type: NotificationType.Error }); break;
      }
    } catch {
      // Haptics unavailable on this device - non-essential
    }
    return;
  }

  if ('vibrate' in navigator) {
    navigator.vibrate(WEB_VIBRATION_PATTERNS[type]);
  }
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

// Share via the native sheet when possible, falling back to the Web Share
// API and then the clipboard. Returns what actually happened so callers
// can show the right feedback.
export async function shareContent(options: { title: string; text: string; url?: string }): Promise<ShareOutcome> {
  if (isNativePlatform) {
    try {
      await Share.share({ title: options.title, text: options.text, url: options.url });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  if (navigator.share) {
    try {
      await navigator.share(options);
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(options.text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
