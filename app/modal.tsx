import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { AppBackground } from '@/components/AppBackground';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ModalScreen() {
  const router = useRouter();
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <ThemedView style={[styles.container, { backgroundColor: palette.background }]}>
      <AppBackground />
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <Card variant="elevated" style={[styles.card, { backgroundColor: palette.surface }]}>
        <ThemedText
          type="title"
          style={[
            styles.title,
            {
              color: palette.tint,
              fontFamily: Fonts.rounded,
            }
          ]}>
          Shine Brighter
        </ThemedText>

        <ThemedText style={styles.message}>
          May this Diwali bring calm, success, and meaningful moments with your loved ones.
        </ThemedText>

        <View style={styles.separator} />

        <Button
          title="Back to Home"
          variant="primary"
          onPress={() => router.dismiss()}
          style={styles.button}
        />
      </Card>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    alignItems: 'center',
    borderRadius: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 28,
  },
  message: {
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 32,
    opacity: 0.9,
  },
  separator: {
    height: 1,
    width: '80%',
    backgroundColor: Colors.light.borderSubtle,
    opacity: 0.2,
    marginBottom: 32,
  },
  button: {
    width: '100%',
    minWidth: 200,
  },
});
