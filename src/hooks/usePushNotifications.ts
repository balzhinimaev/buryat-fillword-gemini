import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  type PushNotificationSchema,
  type ActionPerformed,
  type Token,
} from '@capacitor/push-notifications';
import { registerPushDevice, unregisterPushDevice } from '../services/api';

const PUSH_TOKEN_KEY = 'push:fcmToken';

const isNativeAndroid = (): boolean => Capacitor.getPlatform() === 'android';

const getStoredPushToken = (): string | null => {
  try {
    return localStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredPushToken = (token: string | null): void => {
  try {
    if (token) localStorage.setItem(PUSH_TOKEN_KEY, token);
    else localStorage.removeItem(PUSH_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
};

export function usePushNotifications(isAuthenticated: boolean): void {
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeAndroid()) return;

    let cancelled = false;

    const cleanupTokenOnLogout = async (): Promise<void> => {
      const prevToken = getStoredPushToken();
      if (!prevToken) return;

      try {
        await unregisterPushDevice(prevToken);
      } catch (error) {
        console.warn('Push unregister failed:', error);
      }

      setStoredPushToken(null);
      registeredTokenRef.current = null;
    };

    if (!isAuthenticated) {
      cleanupTokenOnLogout();
      return;
    }

    const onRegistration = async (token: Token): Promise<void> => {
      if (cancelled) return;

      const fcmToken = token.value;
      if (!fcmToken) return;

      setStoredPushToken(fcmToken);
      if (registeredTokenRef.current === fcmToken) return;

      try {
        await registerPushDevice({
          token: fcmToken,
          platform: 'android',
          locale: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        registeredTokenRef.current = fcmToken;
      } catch (error) {
        console.warn('Push register failed:', error);
      }
    };

    const onRegistrationError = (error: unknown): void => {
      console.error('Push registration error:', error);
    };

    const onNotificationReceived = (notification: PushNotificationSchema): void => {
      console.log('Push received:', notification);
    };

    const onNotificationAction = (action: ActionPerformed): void => {
      console.log('Push action performed:', action.notification?.id);
    };

    const setup = async (): Promise<void> => {
      try {
        await PushNotifications.removeAllListeners();

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'prompt') {
          permission = await PushNotifications.requestPermissions();
        }

        if (permission.receive !== 'granted') {
          console.log('Push permission not granted');
          return;
        }

        await PushNotifications.addListener('registration', onRegistration);
        await PushNotifications.addListener('registrationError', onRegistrationError);
        await PushNotifications.addListener('pushNotificationReceived', onNotificationReceived);
        await PushNotifications.addListener('pushNotificationActionPerformed', onNotificationAction);

        await PushNotifications.register();
      } catch (error) {
        console.error('Push setup failed:', error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      PushNotifications.removeAllListeners().catch(() => undefined);
    };
  }, [isAuthenticated]);
}
