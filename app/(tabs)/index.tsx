import { AppBackground } from '@/components/AppBackground';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useState } from 'react';
import { FlatList, ImageBackground, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
    badgeColor: '#4F8FC0',
    title: 'Sponsor Drop: Rangoli Competition',
    description: 'Enter & share your design to unlock a festival stamp.',
    cta: 'Enter now',
    gradient: ['rgba(243, 233, 210, 0.2)', 'rgba(42, 157, 143, 0.5)'] as const,
    image: require('@/assets/images/drop_rangoli.png'),
    tintColor: '#2A9D8F',
  },
  {
    id: '2',
    badge: 'VENDOR',
    badgeColor: '#4F8FC0',
    title: 'Vendor Spotlight: Curry House',
    description: 'Exclusive tasting menu drop this week. Limited serves.',
    cta: 'View menu',
    gradient: ['rgba(243, 233, 210, 0.2)', 'rgba(42, 157, 143, 0.5)'] as const,
    image: require('@/assets/images/drop_curry.png'),
    tintColor: '#2A9D8F',
  },
  {
    id: '3',
    badge: 'PERFORMER',
    badgeColor: '#1F3A93',
    title: 'Performer Reveal: DJ Karma',
    description: 'Get ready for the main stage! Preview the setlist.',
    cta: 'Listen now',
    gradient: ['rgba(243, 233, 210, 0.2)', 'rgba(79, 143, 192, 0.5)'] as const,
    image: require('@/assets/images/drop_dj.png'),
    tintColor: '#4F8FC0',
  },
];

const QUICK_ACTIONS = [
  {
    key: 'schedule',
    label: 'Schedule',
    icon: 'calendar-month',
    path: '/events',
    bgColor: '#1F3A93',
    borderColor: '#173070',
  },
  {
    key: 'passport',
    label: 'My Passport',
    icon: 'passport',
    path: '/(tabs)/rewards?openPassport=true',
    bgColor: '#2A9D8F',
    borderColor: '#1E7D72',
  },
  {
    key: 'scan',
    label: 'Scan & Collect',
    icon: 'qrcode-scan',
    path: '/rewards',
    bgColor: '#2A9D8F',
    borderColor: '#1E7D72',
  },
] as const;

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

    // Device motion can be unavailable on web and some simulators.
    let subscription: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      try {
        subscription = DeviceMotion.addListener((event) => {
          const { rotation } = event;
          if (rotation) {
            tiltX.value = withSpring(rotation.beta * 10, { damping: 10 });
            tiltY.value = withSpring(rotation.gamma * 30, { damping: 15 });
          }
        });
        DeviceMotion.setUpdateInterval(50);
      } catch {
        subscription = null;
      }
    }

    return () => {
      clearInterval(interval);
      subscription?.remove();
    };
  }, [glow, tiltX, tiltY]);

  const animatedGlow = useAnimatedStyle(() => ({
    borderColor: `rgba(79, 143, 192, ${glow.value})`,
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
function LiveDropCard({
  item,
  index,
  onPress,
  width,
  height,
  marginRight = Spacing.md,
}: {
  item: typeof LIVE_DROPS[0];
  index: number;
  onPress: () => void;
  width: number;
  height: number;
  marginRight?: number;
}) {
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
      <Animated.View style={[styles.dropCard, { width, height, marginRight }, animatedStyle]}>
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
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.03)', 'rgba(0, 0, 0, 0.26)', 'rgba(0, 0, 0, 0.62)']}
              locations={[0, 0.55, 1]}
              style={styles.dropGradient}
            >
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
                  <MaterialCommunityIcons name="chevron-right" size={16} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ----- Home Screen -----
export default function HomeScreen() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isExpanded = viewportWidth >= 1024;
  const appFrameWidth = isExpanded
    ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
    : viewportWidth;
  const isTablet = appFrameWidth >= 768;
  const isThreeCol = appFrameWidth >= 1200;
  const sidePadding = isExpanded ? Spacing.xl * 2 : isTablet ? Spacing.xl : Spacing.lg;
  const maxContentWidth = isExpanded ? 1120 : isTablet ? 920 : 720;
  const contentWidth = isExpanded
    ? Math.max(280, appFrameWidth - sidePadding * 2)
    : Math.min(maxContentWidth, Math.max(appFrameWidth - sidePadding * 2, 280));
  const liveDropColumns = isThreeCol ? 3 : isTablet ? 2 : 1;
  const liveDropGap = Spacing.md;
  const liveDropWidth = isTablet
    ? (contentWidth - liveDropGap * (liveDropColumns - 1)) / liveDropColumns
    : Math.min(contentWidth * 0.78, 360);
  const liveDropHeight = isTablet ? 230 : Math.min(viewportHeight * 0.25, 250);
  const detailWidth = Math.min(contentWidth, 700);

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
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: sidePadding, alignItems: 'center' },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              colors={['transparent']}
            />
          }
        >
          <View style={[styles.contentShell, { width: contentWidth }]}>
          {/* Namaste */}
          <Animated.View entering={FadeInDown.delay(200).duration(800)}>
            <Text style={[styles.namaste, isTablet && styles.namasteTablet]}>
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
            {isTablet ? (
              <View style={styles.liveDropGrid}>
                {LIVE_DROPS.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.liveDropGridItem,
                      {
                        width: liveDropWidth,
                        marginRight: (index + 1) % liveDropColumns === 0 ? 0 : liveDropGap,
                      },
                    ]}
                  >
                    <LiveDropCard
                      item={item}
                      index={index}
                      width={liveDropWidth}
                      height={liveDropHeight}
                      marginRight={0}
                      onPress={() => setSelectedDrop(item)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <FlatList
                horizontal
                data={LIVE_DROPS}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <LiveDropCard
                    item={item}
                    index={index}
                    width={liveDropWidth}
                    height={liveDropHeight}
                    onPress={() => setSelectedDrop(item)}
                  />
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dropList}
                snapToInterval={liveDropWidth + Spacing.md}
                decelerationRate="fast"
              />
            )}
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            entering={FadeInDown.delay(800).duration(800)}
            style={styles.quickActionsRow}
          >
            {QUICK_ACTIONS.map((action, index) => (
              <Pressable
                key={action.key}
                style={({ pressed }) => [
                  styles.quickActionButton,
                  index === 1 && styles.quickActionButtonMiddle,
                  {
                    backgroundColor: action.bgColor,
                    borderColor: action.borderColor,
                    shadowColor: action.borderColor,
                  },
                  pressed && styles.quickActionButtonPressed,
                ]}
                onPress={() => handleActionPress(action.path)}
              >
                <View style={styles.quickActionInner}>
                  <MaterialCommunityIcons name={action.icon} size={30} color="#F3E9D2" />
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>

          <View style={{ height: 40 }} />
          </View>
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
                key={liveDropColumns}
                numColumns={liveDropColumns}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.modalDropItem,
                      {
                        width: liveDropWidth,
                        marginRight: (index + 1) % liveDropColumns === 0 ? 0 : liveDropGap,
                      },
                    ]}
                  >
                    <LiveDropCard
                      item={item}
                      index={index}
                      width={liveDropWidth}
                      height={liveDropHeight}
                      marginRight={0}
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
          <Animated.View entering={FadeInDown} style={[styles.detailContent, { width: detailWidth }]}>
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
  contentShell: { width: '100%' },

  // Namaste
  namaste: {
    fontSize: 42,
    color: Colors.light.accentText,
    fontFamily: Fonts.regular,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    letterSpacing: 1,
  },
  namasteTablet: {
    fontSize: 48,
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
    borderColor: 'rgba(42, 157, 143, 0.35)',
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
  liveDropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  liveDropGridItem: {
    marginBottom: Spacing.md,
  },
  dropCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.surfaceElevated,
    borderWidth: 1.5,
    borderColor: 'rgba(42, 157, 143, 0.35)',
    elevation: 5,
    shadowColor: '#2A9D8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  dropImageBg: { width: '100%', height: '100%' },
  dropGradient: {
    padding: Spacing.lg,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tintOverlay: { width: 4, height: 24, borderRadius: 2, opacity: 0.8 },
  dropBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  dropBadgeText: { color: Colors.light.text, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  dropContent: { marginTop: 'auto' },
  dropTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 4,
    textShadowColor: 'rgba(23, 48, 112, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dropDesc: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 12,
    textShadowColor: 'rgba(23, 48, 112, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dropCta: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(23, 48, 112, 0.32)',
  },
  dropCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginRight: 4,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickActionButton: {
    width: '29%',
    aspectRatio: 1,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1F3A93',
    backgroundColor: '#2A9D8F',
    shadowColor: '#1F3A93',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionButtonMiddle: {
    marginHorizontal: 0,
  },
  quickActionButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  quickActionInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  quickActionLabel: {
    color: '#F3E9D2',
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 14,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 58, 147, 0.35)',
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
    borderColor: 'rgba(42, 157, 143, 0.35)',
    padding: Spacing.xl,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: 'rgba(42, 157, 143, 0.25)',
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
    backgroundColor: 'rgba(31, 58, 147, 0.4)',
  },
  detailContent: {
    maxHeight: '70%',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(42, 157, 143, 0.35)',
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
    backgroundColor: 'rgba(42, 157, 143, 0.25)',
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
    backgroundColor: '#4F8FC0',
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
