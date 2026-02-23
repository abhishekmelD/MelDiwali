import {
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold
} from '@expo-google-fonts/outfit';
import {
  PlayfairDisplay_700Bold,
  useFonts
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { UserProvider } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loaded, error] = useFonts({
    PlayfairDisplay_700Bold,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const navigationTheme = isDark
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        primary: Colors.dark.tint,
        background: Colors.dark.background,
        card: Colors.dark.surface,
        text: Colors.dark.text,
        border: Colors.dark.border,
        notification: Colors.dark.accent,
      },
    }
    : {
      ...DarkTheme, // Enforce Dark Theme logic even for "light" mode identifiers to keep consistency
      colors: {
        ...DarkTheme.colors,
        primary: Colors.light.tint,
        background: Colors.light.background,
        card: Colors.light.surface,
        text: Colors.light.text,
        border: Colors.light.border,
        notification: Colors.light.accent,
      },
    };

  return (
    <UserProvider>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              title: 'Diwali Wishes',
              headerStyle: {
                backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
              },
              headerTintColor: isDark ? Colors.dark.accent : Colors.light.tint,
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </UserProvider>
  );
}
