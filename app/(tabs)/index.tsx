import { AppBackground } from '@/components/AppBackground';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { hapticImpact, hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

type LiveDrop = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
};

const QUICK_ACTIONS = [
  {
    key: 'schedule',
    label: 'Schedule',
    icon: 'calendar-month',
    path: '/events',
    bgColor: '#FF7A00',
    borderColor: '#FF7A00',
  },
  {
    key: 'passport',
    label: 'My Passport',
    icon: 'passport',
    path: '/(tabs)/rewards?openPassport=true',
    bgColor: '#FF7A00',
    borderColor: '#FF7A00',
  },
  {
    key: 'scan',
    label: 'Scan & Collect',
    icon: 'qrcode-scan',
    path: '/rewards',
    bgColor: '#FF7A00',
    borderColor: '#FF7A00',
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
            tiltX.value = withSpring(rotation.beta * 5, { damping: 10 });
            tiltY.value = withSpring(rotation.gamma * 5, { damping: 15 });
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
    borderColor: `rgba(255, 122, 0, ${glow.value})`,
    shadowOpacity: 0.05,
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
        <Text style={styles.countdownLabel}>MELBOURNE DIWALI STARTS IN</Text>
        <View style={styles.countdownRow}>
          {blocks.map((b) => (
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
  item: LiveDrop;
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
    hapticImpact();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 150).springify()}>
      <Animated.View style={[styles.dropCardShadow, { width, height, marginRight }, animatedStyle]}>
        <View style={styles.dropCard}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={{ flex: 1 }}
          >
            <View style={styles.dropCardInner}>
              <View style={styles.dropImageWrap}>
                {item.imageUrl ? (
                  <ImageBackground
                    source={{ uri: item.imageUrl }}
                    style={styles.dropImage}
                    imageStyle={styles.dropImageStyle}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.dropImage, styles.dropImageFallback]}>
                    <MaterialCommunityIcons name="image-outline" size={28} color={Colors.light.textSecondary} />
                  </View>
                )}
              </View>

              <View style={styles.dropContent}>
                <View style={styles.dropBadge}>
                  <Text style={styles.dropBadgeText}>LIVE</Text>
                </View>
                <Text style={styles.dropTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.dropCta}>
                  <Text style={styles.dropCtaText}>View details</Text>
                  <MaterialCommunityIcons name="arrow-right" size={15} color={Colors.light.accentText} />
                </View>
              </View>
            </View>
          </Pressable>
        </View>
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
    : Math.min(contentWidth * 0.88, 400);
  const liveDropHeight = isTablet ? 320 : Math.min(viewportHeight * 0.42, 352);
  const detailWidth = Math.min(contentWidth, 700);

  const router = useRouter();
  const { userName, userRole } = useUser();
  const firstName = userName?.trim() ? userName.trim().split(/\s+/)[0] : '';
  const [isDropsModalVisible, setIsDropsModalVisible] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState<LiveDrop | null>(null);
  const [liveDrops, setLiveDrops] = useState<LiveDrop[]>([]);
  const [dropsLoading, setDropsLoading] = useState(false);
  const { refreshing, onRefresh } = useReloadOnRefresh({
    onBeforeReload: () => {
      hapticSuccess();
    },
  });

  const handleActionPress = (path: any) => {
    hapticImpact();
    if (!userRole) {
      router.push('/(tabs)/more?openSignup=true');
    } else {
      router.push(path);
    }
  };

  const loadLiveDrops = async () => {
    if (!supabase) return;
    setDropsLoading(true);
    const { data, error } = await supabase
      .from('drops')
      .select('id, title, description, image_url, start_date, end_date, location, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error) {
      const mapped = (data as any[] | null)?.map((drop) => ({
        id: drop.id,
        title: drop.title,
        description: drop.description,
        imageUrl: drop.image_url ?? null,
        startDate: drop.start_date ?? null,
        endDate: drop.end_date ?? null,
        location: drop.location ?? null,
      })) ?? [];
      setLiveDrops(mapped);
    }
    setDropsLoading(false);
  };

  useEffect(() => {
    loadLiveDrops();
  }, []);

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
              Namaste{firstName ? `, ${firstName}` : ''}!
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
              <Pressable onPress={() => {
                hapticImpact();
                setIsDropsModalVisible(true);
              }}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            {isTablet ? (
              <View style={styles.liveDropGrid}>
                {liveDrops.map((item, index) => (
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
                data={liveDrops}
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
            {!dropsLoading && liveDrops.length === 0 ? (
              <Text style={styles.emptyDropsText}>No drops yet.</Text>
            ) : null}
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
                  { borderColor: action.borderColor },
                  pressed && styles.quickActionButtonPressed,
                ]}
                onPress={() => handleActionPress(action.path)}
              >
                <View style={styles.quickActionInner}>
                  <MaterialCommunityIcons name={action.icon} size={26} color="#FF7A00" />
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
        onRequestClose={() => {
          hapticImpact();
          setIsDropsModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>All Live Drops</Text>
                <Pressable onPress={() => {
                  hapticImpact();
                  setIsDropsModalVisible(false);
                }}>
                  <View style={styles.modalCloseBtn}>
                    <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                  </View>
                </Pressable>
              </View>

              <FlatList
                data={liveDrops}
                keyExtractor={(item) => item.id}
                key={liveDropColumns}
                numColumns={liveDropColumns}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.modalListContent,
                  liveDropColumns === 1 && styles.modalListSingleColumn,
                ]}
                columnWrapperStyle={liveDropColumns > 1 ? styles.modalColumnWrapper : undefined}
                renderItem={({ item, index }) => (
                  <View
                    style={[
                      styles.modalDropItem,
                      {
                        width: liveDropWidth,
                        marginHorizontal: liveDropColumns > 1 ? liveDropGap / 2 : 0,
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
          <Pressable style={styles.detailBackdrop} onPress={() => {
            hapticImpact();
            setSelectedDrop(null);
          }} />
          <Animated.View entering={FadeInDown} style={[styles.detailContent, { width: detailWidth }]}>
            <View style={styles.detailGradient}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedDrop.title}</Text>
                <Pressable onPress={() => {
                  hapticImpact();
                  setSelectedDrop(null);
                }} style={styles.closeBtnSmall}>
                  <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                </Pressable>
              </View>

              <ScrollView style={styles.detailBody} showsVerticalScrollIndicator={false}>
                {selectedDrop.imageUrl ? (
                  <ImageBackground
                    source={{ uri: selectedDrop.imageUrl }}
                    style={styles.detailImage}
                    imageStyle={{ borderRadius: 16 }}
                  />
                ) : (
                  <View style={[styles.detailImage, styles.detailImageFallback]}>
                    <MaterialCommunityIcons name="image-outline" size={36} color={Colors.light.textSecondary} />
                  </View>
                )}

                <View style={styles.detailDescriptionRow}>
                  <Text style={styles.detailDescriptionHeader}>DROP DETAILS</Text>
                  <Text style={styles.detailDescriptionText}>{selectedDrop.description}</Text>
                </View>

                {selectedDrop.location ? (
                  <View style={styles.detailInstructionRow}>
                    <Text style={styles.detailDescriptionHeader}>LOCATION</Text>
                    <Text style={styles.detailDescriptionText}>{selectedDrop.location}</Text>
                  </View>
                ) : null}
                {selectedDrop.startDate || selectedDrop.endDate ? (
                  <View style={styles.detailInstructionRow}>
                    <Text style={styles.detailDescriptionHeader}>DATES</Text>
                    <Text style={styles.detailDescriptionText}>
                      {selectedDrop.startDate || '—'} → {selectedDrop.endDate || '—'}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>

              <Pressable style={styles.detailActionBtn} onPress={() => {
                hapticImpact();
                setSelectedDrop(null);
              }}>
                <Text style={styles.detailActionText}>Close</Text>
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
    borderColor: 'rgba(255, 122, 0, 0.35)',
    shadowColor: Colors.light.accentText,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
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
  dropCardShadow: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  dropCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  dropCardInner: {
    flex: 1,
    padding: 14,
  },
  dropImageWrap: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  dropImage: {
    width: '100%',
    height: '100%',
  },
  dropImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  dropImageStyle: {
    borderRadius: 12,
  },
  dropBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.light.accentText,
  },
  dropBadgeText: { color: Colors.light.text, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },
  dropContent: { flex: 1, justifyContent: 'space-between', paddingBottom: Spacing.lg },
  dropTitle: {
    color: Colors.light.text,
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginTop: Spacing.xs,
    marginBottom: 4,
  },
  dropCta: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
  },
  dropCtaText: {
    color: Colors.light.accentText,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginRight: 2,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickActionButton: {
    width: '31%',
    minHeight: 92,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FF7A00',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 4,
  },
  quickActionButtonMiddle: {
    marginHorizontal: 0,
  },
  quickActionButtonPressed: {
    transform: [{ scale: 0.97 }],
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
    color: Colors.light.text,
    fontSize: 12,
    fontFamily: Fonts.medium,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
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
    borderColor: 'rgba(255, 122, 0, 0.35)',
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
    backgroundColor: 'rgba(255, 122, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalListContent: {
    paddingBottom: 40,
  },
  modalListSingleColumn: {
    alignItems: 'center',
  },
  modalColumnWrapper: {
    justifyContent: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  detailContent: {
    maxHeight: '70%',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.35)',
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
    backgroundColor: 'rgba(255, 122, 0, 0.25)',
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
  detailImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
  emptyDropsText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    marginTop: Spacing.md,
  },
  detailActionBtn: {
    backgroundColor: '#FF7A00',
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
