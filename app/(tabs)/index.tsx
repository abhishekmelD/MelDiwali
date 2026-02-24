import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { Dimensions, FlatList, ImageBackground, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.25;
const MODAL_CARD_WIDTH = SCREEN_WIDTH * 0.8;
const MODAL_CARD_HEIGHT = SCREEN_HEIGHT * 0.3;

// ----- Festival Date: Oct 31, 2026 -----
const FESTIVAL_DATE = new Date('2026-10-31T13:00:00');

function getTimeRemaining() {
  const now = new Date();
  const diff = FESTIVAL_DATE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    mins: Math.floor((diff / (1000 * 60)) % 60),
    secs: Math.floor((diff / 1000) % 60),
  };
}

// ----- Live Drops Data -----
const LIVE_DROPS = [
  {
    id: '1',
    badge: 'SPONSOR DROP',
    badgeColor: '#FFD580',
    title: 'Sponsor Drop: Rangoli Competition',
    description: 'Enter & share your design to unlock a festival stamp.',
    cta: 'Enter now',
    gradient: ['rgba(255,245,230,0.2)', 'rgba(168,230,207,0.6)'] as const,
    image: require('@/assets/images/drop_rangoli.png'),
    tintColor: '#FFB59C',
  },
  {
    id: '2',
    badge: 'VENDOR',
    badgeColor: '#FFD580',
    title: 'Vendor Spotlight: Curry House',
    description: 'Exclusive tasting menu drop this week. Limited serves.',
    cta: 'View menu',
    gradient: ['rgba(255,245,230,0.2)', 'rgba(251,201,210,0.55)'] as const,
    image: require('@/assets/images/drop_curry.png'),
    tintColor: '#D8B4E2',
  },
  {
    id: '3',
    badge: 'PERFORMER',
    badgeColor: '#FBC9D2',
    title: 'Performer Reveal: DJ Karma',
    description: 'Get ready for the main stage! Preview the setlist.',
    cta: 'Listen now',
    gradient: ['rgba(255,245,230,0.2)', 'rgba(216,180,226,0.55)'] as const,
    image: require('@/assets/images/drop_dj.png'),
    tintColor: '#A8E6CF',
  },
];

// ----- Countdown Timer -----
function CountdownTimer() {
  const [time, setTime] = useState(getTimeRemaining);
  const glow = useSharedValue(0.4);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeRemaining()), 1000);

    // Glow Animation
    glow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );

    // Device Motion for Tilt
    const subscription = DeviceMotion.addListener((event) => {
      const { rotation } = event;
      if (rotation) {
        // Multipliers control sensitivity. 
        // beta (x-axis tilt) affects rotateX
        // gamma (y-axis tilt) affects rotateY
        // Multiplier of 10 converts radians to a visible but subtle tilt
        tiltX.value = withSpring(rotation.beta * 10, { damping: 10 });
        tiltY.value = withSpring(rotation.gamma * 30, { damping: 15 });
      }
    });
    DeviceMotion.setUpdateInterval(50);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [glow, tiltX, tiltY]);

  const animatedGlow = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 215, 0, ${glow.value})`,
    shadowOpacity: glow.value * 0.4,
  }));

  const animatedTilt = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` }
    ]
  }));

  const blocks = [
    { value: time.days, label: 'DAYS' },
    { value: time.hours, label: 'HOURS' },
    { value: time.mins, label: 'MINS' },
    { value: time.secs, label: 'SECS' },
  ];

  return (
    <Animated.View style={[styles.countdownCard, animatedTilt]}>
      <Animated.View style={[styles.countdownGlow, animatedGlow]} />
      <View style={styles.countdownContent}>
        <Text style={styles.countdownLabel}>FESTIVAL STARTS IN</Text>
        <View style={styles.countdownRow}>
          {blocks.map((b, i) => (
            <View key={b.label} style={styles.countdownBlock}>
              <Text style={styles.countdownValue}>{String(b.value).padStart(2, '0')}</Text>
              <Text style={styles.countdownUnit}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ----- Live Drop Card -----
function LiveDropCard({ item, index, onPress, isModal }: { item: typeof LIVE_DROPS[0]; index: number; onPress: () => void; isModal?: boolean }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 150).springify()}>
      <Animated.View style={[styles.dropCard, isModal && styles.dropCardModal, animatedStyle]}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          style={{ flex: 1 }}
        >
          <ImageBackground
            source={item.image}
            style={styles.dropImageBg}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            <View style={styles.dropGradient}>
              <View style={styles.cardHeader}>
                <View style={[styles.dropBadge, { backgroundColor: item.badgeColor }]}>
                  <Text style={styles.dropBadgeText}>{item.badge}</Text>
                </View>
                <View style={[styles.tintOverlay, { backgroundColor: item.tintColor }]} />
              </View>

              <View style={styles.dropContent}>
                <Text style={styles.dropTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.dropDesc} numberOfLines={1}>{item.description}</Text>
                <View style={styles.dropCta}>
                  <Text style={styles.dropCtaText}>{item.cta}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.light.accentText} />
                </View>
              </View>
            </View>
          </ImageBackground>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ----- Home Screen -----
export default function HomeScreen() {
  const router = useRouter();
  const { userName, userRole } = useUser();
  const [isDropsModalVisible, setIsDropsModalVisible] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState<typeof LIVE_DROPS[0] | null>(null);
  const { refreshing, onRefresh } = useReloadOnRefresh({
    onBeforeReload: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleActionPress = (path: any) => {
    Haptics.selectionAsync();
    if (!userRole) {
      router.push('/(tabs)/more?openSignup=true');
    } else {
      router.push(path);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              colors={['transparent']}
            />
          }
        >
          {/* Namaste */}
          <Animated.View entering={FadeInDown.delay(200).duration(800)}>
            <Text style={styles.namaste}>
              Namaste{userName ? `, ${userName}` : ''}!
            </Text>
          </Animated.View>

          {/* Countdown */}
          <Animated.View entering={FadeInDown.delay(400).duration(800)}>
            <CountdownTimer />
          </Animated.View>

          {/* Live Drops */}
          <Animated.View entering={FadeInDown.delay(600).duration(800)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Drops</Text>
              <Pressable onPress={() => setIsDropsModalVisible(true)}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={LIVE_DROPS}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <LiveDropCard
                  item={item}
                  index={index}
                  onPress={() => setSelectedDrop(item)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dropList}
              snapToInterval={CARD_WIDTH + Spacing.md}
              decelerationRate="fast"
            />
          </Animated.View>

          {/* Action Cards */}
          <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.actionRow}>
            <Pressable style={styles.actionCard} onPress={() => handleActionPress('/events')}>
              <View style={styles.actionGradient}>
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionTitle}>Schedule</Text>
                <Text style={styles.actionSubtitle}>What&apos;s on now?</Text>
              </View>
            </Pressable>
            <Pressable style={styles.actionCard} onPress={() => handleActionPress('/rewards')}>
              <View style={styles.actionGradient}>
                <Text style={styles.actionIcon}>🎫</Text>
                <Text style={styles.actionTitle}>My Passport</Text>
                <Text style={styles.actionSubtitle}>View your stamps</Text>
              </View>
            </Pressable>
          </Animated.View>

          {/* Scan & Collect */}
          <Animated.View entering={FadeInDown.delay(1000).duration(800)}>
            <Pressable style={styles.scanBanner} onPress={() => handleActionPress('/rewards')}>
              <View style={styles.scanGradient}>
                <View style={styles.scanLeft}>
                  <MaterialCommunityIcons name="qrcode-scan" size={34} color={Colors.light.accentText} style={styles.scanIcon} />
                  <View>
                    <Text style={styles.scanTitle}>Scan & Collect</Text>
                    <Text style={styles.scanSubtitle}>Visit stalls to earn stamps</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Live Drops "View All" Modal */}
      <Modal
        visible={isDropsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDropsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>All Live Drops</Text>
                <Pressable onPress={() => setIsDropsModalVisible(false)}>
                  <View style={styles.modalCloseBtn}>
                    <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                  </View>
                </Pressable>
              </View>

              <FlatList
                data={LIVE_DROPS}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item, index }) => (
                  <View style={styles.modalDropItem}>
                    <LiveDropCard
                      item={item}
                      index={index}
                      isModal={true}
                      onPress={() => {
                        setIsDropsModalVisible(false);
                        setSelectedDrop(item);
                      }}
                    />
                  </View>
                )}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Selected Drop Detail Popup */}
      {selectedDrop && (
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setSelectedDrop(null)} />
          <Animated.View entering={FadeInDown} style={styles.detailContent}>
            <View style={styles.detailGradient}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedDrop.title}</Text>
                <Pressable onPress={() => setSelectedDrop(null)} style={styles.closeBtnSmall}>
                  <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                <ImageBackground
                  source={selectedDrop.image}
                  style={styles.detailImage}
                  imageStyle={{ borderRadius: 16 }}
                >
                  <View style={[styles.detailBadge, { backgroundColor: selectedDrop.badgeColor }]}>
                    <Text style={styles.detailBadgeText}>{selectedDrop.badge}</Text>
                  </View>
                </ImageBackground>

                <View style={styles.detailDescriptionRow}>
                  <Text style={styles.detailDescriptionHeader}>OFFER DETAILS</Text>
                  <Text style={styles.detailDescriptionText}>{selectedDrop.description}</Text>
                </View>

                <View style={styles.detailInstructionRow}>
                  <Text style={styles.detailDescriptionHeader}>HOW TO REDEEM</Text>
                  <Text style={styles.detailDescriptionText}>
                    Show this screen at the venue or follow the instructions in the {selectedDrop.cta.toLowerCase()} link to claim your reward.
                  </Text>
                </View>
              </ScrollView>

              <Pressable style={styles.detailActionBtn} onPress={() => setSelectedDrop(null)}>
                <Text style={styles.detailActionText}>{selectedDrop.cta}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },

  // Namaste
  namaste: {
    fontSize: 42,
    color: Colors.light.accentText,
    fontFamily: Fonts.regular,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    letterSpacing: 1,
  },

  // Countdown
  countdownCard: {
    backgroundColor: Colors.light.surfaceElevated,
    borderRadius: 16,
    position: 'relative',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  countdownGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,213,128,0.35)',
    shadowColor: Colors.light.accentText,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  countdownContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    zIndex: 1,
  },
  countdownLabel: {
    color: Colors.light.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  countdownRow: { flexDirection: 'row', gap: Spacing.sm },
  countdownBlock: { alignItems: 'center', minWidth: 64 },
  countdownValue: {
    color: Colors.light.accentText,
    fontSize: 28,
    fontFamily: Fonts.bold,
    fontVariant: ['tabular-nums']
  },
  countdownUnit: { color: Colors.light.textSecondary, fontSize: 10, fontWeight: '600', letterSpacing: 2, marginTop: 2 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { color: Colors.light.text, fontSize: 20, fontWeight: '700' },
  viewAll: { color: Colors.light.accentText, fontSize: 14, fontWeight: '500' },

  // Live Drops
  dropList: { paddingRight: Spacing.lg },
  dropCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: Spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.surfaceElevated,
    borderWidth: 1.5,
    borderColor: 'rgba(232,178,125,0.55)',
    elevation: 5,
    shadowColor: '#D85E3F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  dropCardModal: {
    width: MODAL_CARD_WIDTH,
    height: MODAL_CARD_HEIGHT,
    marginRight: 0,
  },
  dropImageBg: { width: '100%', height: '100%' },
  dropGradient: {
    padding: Spacing.lg,
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,245,230,0.46)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tintOverlay: { width: 4, height: 24, borderRadius: 2, opacity: 0.8 },
  dropBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  dropBadgeText: { color: Colors.light.text, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  dropContent: { marginTop: 'auto' },
  dropTitle: {
    color: Colors.light.text,
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  dropDesc: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 12,
  },
  dropCta: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.accentText,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropCtaText: {
    color: Colors.light.accentText,
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginRight: 4,
  },

  // Action Cards
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232,178,125,0.55)',
    shadowColor: '#D8B4E2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  actionGradient: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,181,156,0.55)',
    minHeight: 120,
    backgroundColor: '#FFF0D9',
  },
  actionIcon: { fontSize: 28, marginBottom: Spacing.sm },
  actionTitle: { color: Colors.light.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  actionSubtitle: { color: Colors.light.textSecondary, fontSize: 13 },

  // Scan
  scanBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(232,178,125,0.55)',
  },
  scanGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,181,156,0.55)',
    backgroundColor: '#FFF0D9',
  },
  scanLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  scanIcon: { marginRight: 4 },
  scanTitle: { color: Colors.light.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  scanSubtitle: { color: Colors.light.textSecondary, fontSize: 13 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(58,28,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
  },
  modalCard: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(232,178,125,0.5)',
    padding: Spacing.xl,
    backgroundColor: '#FFF1DC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    color: Colors.light.text,
    fontSize: 28,
    fontFamily: Fonts.header,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,213,128,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListContent: {
    paddingBottom: 40,
  },
  modalDropItem: {
    marginBottom: Spacing.lg,
    width: '100%',
    alignItems: 'center',
  },

  // Detail Popup
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(58,28,0,0.45)',
  },
  detailContent: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '70%',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 128, 0.5)',
  },
  detailGradient: {
    padding: Spacing.xl,
    backgroundColor: Colors.light.surfaceElevated,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  detailTitle: {
    flex: 1,
    fontSize: 24,
    fontFamily: Fonts.header,
    color: Colors.light.text,
    marginRight: Spacing.md,
  },
  closeBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,213,128,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: {
    marginBottom: Spacing.xl,
  },
  detailImage: {
    width: '100%',
    height: 180,
    marginBottom: Spacing.lg,
    justifyContent: 'flex-end',
    padding: 12,
  },
  detailBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailBadgeText: {
    color: Colors.light.text,
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },
  detailDescriptionRow: {
    marginBottom: Spacing.lg,
  },
  detailInstructionRow: {
    marginBottom: Spacing.md,
  },
  detailDescriptionHeader: {
    color: Colors.light.accentText,
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    marginBottom: 8,
  },
  detailDescriptionText: {
    color: Colors.light.text,
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    opacity: 0.8,
  },
  detailActionBtn: {
    backgroundColor: Colors.light.gold,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  detailActionText: {
    color: Colors.light.text,
    fontSize: 16,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },
});
