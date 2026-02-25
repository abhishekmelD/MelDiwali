import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabTwoScreen() {
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: Colors.light.warmCream, dark: Colors.dark.warmCream }}
      headerImage={
        <IconSymbol
          size={310}
          color={palette.accent}
          name="paperplane.fill"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
            color: palette.tint,
          }}>
          Diwali Guide
        </ThemedText>
      </ThemedView>
      <ThemedText style={{ color: palette.icon, marginBottom: 16 }}>
        A quick look at ideas to make your celebration vibrant and meaningful.
      </ThemedText>

      <Card variant="elevated" style={styles.cardSpacing}>
        <Collapsible title="Decor and Ambience">
          <ThemedText>
            Light diyas in entryways, balconies, and window sills to create a warm and festive glow.
          </ThemedText>
          <ThemedText style={{ marginTop: 8 }}>
            Add marigold flowers and rangoli patterns using violet and gold tones for a premium look.
          </ThemedText>
        </Collapsible>
      </Card>

      <Card variant="elevated" style={styles.cardSpacing}>
        <Collapsible title="Sweets and Sharing">
          <ThemedText>
            Gift boxes with laddoo, kaju katli, and dry fruits are timeless and appreciated by all age
            groups.
          </ThemedText>
          <View style={{ marginTop: 12 }}>
            <ExternalLink href="https://en.wikipedia.org/wiki/Diwali">
              <ThemedText type="link">Read more about Diwali</ThemedText>
            </ExternalLink>
          </View>
        </Collapsible>
      </Card>

      <Card variant="elevated" style={styles.cardSpacing}>
        <Collapsible title="Outfit Inspiration">
          <ThemedText>
            Pair a rich violet base with gold accents for a modern festive palette.
          </ThemedText>
          <Image
            source={require('@/assets/images/react-logo.png')}
            style={styles.outfitImage}
          />
          {Platform.select({
            ios: <ThemedText style={styles.tipText}>Tip: add subtle shimmer accessories.</ThemedText>,
          })}
        </Collapsible>
      </Card>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#1F3A93',
    bottom: -90,
    left: -35,
    position: 'absolute',
    opacity: 0.2, // increased transparency for texture
  },
  titleContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  outfitImage: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginVertical: 12,
    borderRadius: 12,
  },
  tipText: {
    fontStyle: 'italic',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  }
});
