import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DynamicNotch } from '@/components/dynamic-notch/DynamicNotch';
import { attachTimerCompletionNotice } from '@/features/timer/timerFeature';
import { dynamicNotchManager } from '@/services/DynamicNotchManager';
import { notificationService } from '@/services/NotificationService';
import { powerService } from '@/services/PowerService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Order matters: the manager must be listening before the power service
    // can deliver a charger event, and the notification handler must be set
    // before any notification can arrive.
    notificationService.configure();
    dynamicNotchManager.start();
    void powerService.start();
    const detachTimerNotice = attachTimerCompletionNotice();

    return () => {
      detachTimerNotice();
      powerService.stop();
      dynamicNotchManager.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* The surface is black and sits over the status bar, so the status
            bar content is always light while it is on screen. */}
        <ThemeProvider value={DarkTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#000000' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen
              name="settings"
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </Stack>

          {/* Rendered last so it composites above every screen. */}
          <DynamicNotch />

          <AnimatedSplashOverlay />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
