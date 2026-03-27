import { Capacitor } from '@capacitor/core';

/**
 * Checks if the application is currently running natively on iOS or Android.
 * @returns boolean
 */
export const isNativePlatform = (): boolean => {
    return Capacitor.isNativePlatform();
};

/**
 * Gets the current active platform.
 * @returns 'web' | 'ios' | 'android'
 */
export const getPlatform = (): string => {
    return Capacitor.getPlatform();
};
