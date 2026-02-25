import { AppBackground } from '@/components/AppBackground';
import { ReloadOverlay } from '@/components/ReloadOverlay';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { SafeAreaView } from 'react-native-safe-area-context';

const REWARDS = [
    { id: '1', title: 'Free Diya Set', subtitle: 'Collect at the festival', stamps: 4, detail: 'Show your passport at the rewards desk to redeem your diya set.' },
    { id: '2', title: '20% off Curry House', subtitle: 'Valid until Nov 30', stamps: 6, detail: 'Use this reward at Curry House. Valid once per passport.' },
    { id: '3', title: 'VIP Garba Entry', subtitle: 'For Level 3 members', stamps: 10, detail: 'Access the VIP line at Garba Night with this reward.' },
];

function RewardCard({
    reward,
    index,
    isClaimed,
    onPress,
    onClaim,
}: {
    reward: typeof REWARDS[0];
    index: number;
    isClaimed: boolean;
    onPress: () => void;
    onClaim: () => void;
}) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => { scale.value = withSpring(0.98); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <Animated.View
                style={[styles.rewardCard, animatedStyle]}
            >
                <Pressable
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={onPress}
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                >
                    <View style={styles.rewardInfo}>
                        <Text style={styles.rewardTitle}>{reward.title}</Text>
                        <Text style={styles.rewardSubtitle}>{reward.subtitle}</Text>
                    </View>
                    <Pressable
                        onPress={onClaim}
                        disabled={isClaimed}
                        style={({ pressed }) => [
                            styles.claimBtn,
                            isClaimed && styles.claimBtnClaimed,
                            pressed && { opacity: 0.85 }
                        ]}
                    >
                        <Text style={[styles.claimText, isClaimed && styles.claimTextClaimed]}>
                            {isClaimed ? 'Claimed' : 'Claim'}
                        </Text>
                    </Pressable>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

export default function RewardsScreen() {
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isExpanded = viewportWidth >= 1024;
    const appFrameWidth = isExpanded
        ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
        : viewportWidth;
    const isTablet = appFrameWidth >= 768;
    const sidePadding = isExpanded ? Spacing.xl * 2 : isTablet ? Spacing.xl : Spacing.lg;
    const maxContentWidth = isExpanded ? 1120 : isTablet ? 920 : 720;
    const contentWidth = isExpanded
        ? Math.max(280, appFrameWidth - sidePadding * 2)
        : Math.min(maxContentWidth, Math.max(appFrameWidth - sidePadding * 2, 280));
    const rewardColumns = appFrameWidth >= 1200 ? 3 : isTablet ? 2 : 1;
    const rewardGap = Spacing.md;
    const rewardCardWidth = rewardColumns === 1
        ? contentWidth
        : (contentWidth - rewardGap * (rewardColumns - 1)) / rewardColumns;

    const isWeb = Platform.OS === 'web';
    const router = useRouter();
    const { openPassport } = useLocalSearchParams<{ openPassport?: string | string[] }>();
    const { userName } = useUser();
    const [stamps, setStamps] = useState(0);
    const [totalScannedStamps, setTotalScannedStamps] = useState(0);

    const LEVELS = [
        { name: 'Newbie', min: 0, icon: '🪔' },
        { name: 'Explorer', min: 6, icon: '🥉' },
        { name: 'Wanderer', min: 15, icon: '🥈' },
        { name: 'Adventurer', min: 25, icon: '🥇' },
        { name: 'Voyager', min: 35, icon: '🏆' },
        { name: 'Trailblazer', min: 55, icon: '💎' },
        { name: 'Legend', min: 75, icon: '👑' },
    ];

    const getLevelInfo = (total: number) => {
        let levelIndex = 0;
        for (let i = 0; i < LEVELS.length; i += 1) {
            if (total >= LEVELS[i].min) levelIndex = i;
        }
        const current = LEVELS[levelIndex];
        const next = LEVELS[levelIndex + 1] ?? null;
        const nextAt = next ? next.min : current.min;

        return {
            level: levelIndex + 1,
            levelName: current.name,
            levelIcon: current.icon,
            nextLevelAt: nextAt,
            levelMin: current.min,
        };
    };

    const { level, levelName, levelIcon, nextLevelAt, levelMin } = getLevelInfo(totalScannedStamps);

    const [scanned, setScanned] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const isFocused = useIsFocused();
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [isPassportModalVisible, setPassportModalVisible] = useState(false);
    const [selectedReward, setSelectedReward] = useState<typeof REWARDS[0] | null>(null);
    const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
    const { refreshing, onRefresh } = useReloadOnRefresh();

    useEffect(() => {
        if (isWeb || permission?.granted) {
            return;
        }
        (async () => {
            try {
                await requestPermission();
            } catch (error) {
                console.warn('Camera permission request failed:', error);
            }
        })();
    }, [isWeb, permission, requestPermission]);

    useEffect(() => {
        const openPassportParam = Array.isArray(openPassport) ? openPassport[0] : openPassport;
        if (openPassportParam === 'true') {
            setPassportModalVisible(true);
            router.replace('/(tabs)/rewards');
        }
    }, [openPassport, router]);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        setStamps((prev) => prev + 5);
        setTotalScannedStamps((prev) => prev + 5);

        console.log('--- QR CODE SCANNED ---');
        console.log(`User: ${userName || 'N/A'}`);
        console.log(`Scan Data: ${data}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log('------------------------');

        Alert.alert('QR Code Scanned!', `Data: ${data}`, [
            { text: 'OK', onPress: () => setScanned(false) },
        ]);
    };

    const progressDenominator = nextLevelAt - levelMin || 1;
    const progressNumerator = Math.min(totalScannedStamps - levelMin, progressDenominator);
    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: withTiming(`${(progressNumerator / progressDenominator) * 100}%`, { duration: 350 }),
    }));

    const claimReward = (reward: typeof REWARDS[0]) => {
        if (claimedRewards.includes(reward.id)) return;
        if (stamps < reward.stamps) {
            Alert.alert('Not enough stamps', `You need ${reward.stamps - stamps} more stamps to claim this reward.`);
            return;
        }
        setClaimedRewards((prev) => [...prev, reward.id]);
        setStamps((prev) => prev - reward.stamps);
    };

    return (
        <View style={styles.container}>
            <AppBackground />
            <ReloadOverlay visible={refreshing} />
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
                    <Text style={styles.header}>Rewards</Text>

                    {/* Passport Card */}
                    <View style={styles.passportCard}>
                        {!isWeb && permission?.granted && isFocused ? (
                            <View style={styles.cameraContainer}>
                                {cameraEnabled ? (
                                    <CameraView
                                        style={styles.camera}
                                        facing="back"
                                        enableTorch={flashOn}
                                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                                    />
                                ) : (
                                    <View style={styles.cameraOffState}>
                                        <Text style={styles.cameraOffIcon}>📴</Text>
                                        <Text style={styles.cameraOffTitle}>Camera is off</Text>
                                        <Text style={styles.cameraOffHint}>Turn it back on to scan QR codes.</Text>
                                        <Pressable
                                            style={styles.cameraToggleBtn}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setCameraEnabled(true);
                                            }}
                                        >
                                            <Text style={styles.cameraToggleText}>Turn camera on</Text>
                                        </Pressable>
                                    </View>
                                )}
                                {/* Scan overlay */}
                                {cameraEnabled && (
                                    <View style={styles.scanOverlay}>
                                        <View style={styles.scanFrame}>
                                            <View style={[styles.corner, styles.cornerTL]} />
                                            <View style={[styles.corner, styles.cornerTR]} />
                                            <View style={[styles.corner, styles.cornerBL]} />
                                            <View style={[styles.corner, styles.cornerBR]} />
                                        </View>

                                        <Pressable
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setFlashOn(!flashOn);
                                            }}
                                            style={({ pressed }) => [
                                                styles.flashBtn,
                                                flashOn && styles.flashBtnActive,
                                                pressed && { opacity: 0.8 }
                                            ]}
                                        >
                                            <IconSymbol
                                                name={flashOn ? "bolt.fill" : "bolt.slash.fill"}
                                                size={20}
                                                color={flashOn ? Colors.light.text : Colors.light.gold}
                                            />
                                        </Pressable>

                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.qrContainer}>
                                <Pressable
                                    style={styles.scanBtn}
                                    onPress={async () => {
                                        if (isWeb) return;
                                        try {
                                            await requestPermission();
                                        } catch (error) {
                                            console.warn('Camera permission request failed:', error);
                                        }
                                    }}
                                >
                                    <Text style={styles.scanIcon}>📷</Text>
                                    <Text style={styles.scanBtnText}>{isWeb ? 'Camera unavailable on web' : 'Enable Camera'}</Text>
                                    <Text style={styles.scanHint}>
                                        {isWeb ? 'QR scanning works on mobile app builds.' : 'Camera permission required'}
                                    </Text>
                                </Pressable>
                            </View>
                        )}

                        <Text style={styles.passportSubtitle}>
                            Scan stall QR codes to collect stamps.
                        </Text>
                    </View>

                    {/* Progress */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.progressCard,
                            pressed && styles.progressCardPressed,
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setPassportModalVisible(true);
                        }}
                    >
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>Your festival passport</Text>
                            <View>
                                <Text style={styles.stampLabel}>Stamps</Text>
                                <Text style={styles.stampCount}>{stamps}</Text>
                            </View>
                        </View>
                        <View style={styles.levelRow}>
                            <Text style={styles.levelIcon}>{levelIcon}</Text>
                            <Text style={styles.levelText}>
                                Level {level}: <Text style={styles.levelName}>{levelName}</Text>
                            </Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
                        </View>
                        <Text style={styles.progressHint}>
                            {level >= 7
                                ? 'Level maxxed out'
                                : `${Math.max(nextLevelAt - totalScannedStamps, 0)} more stamps to reach Level ${level + 1}`}
                        </Text>
                    </Pressable>

                    {/* Available Rewards */}
                    <View style={styles.rewardsHeader}>
                        <Text style={styles.sectionTitle}>Available rewards</Text>
                        <Text style={styles.partnerText}>✨ Powered by partners</Text>
                    </View>
                    <View style={styles.rewardsGrid}>
                        {REWARDS.map((reward, index) => (
                            <View
                                key={reward.id}
                                style={[
                                    styles.rewardGridItem,
                                    {
                                        width: rewardCardWidth,
                                        marginRight: (index + 1) % rewardColumns === 0 ? 0 : rewardGap,
                                    },
                                ]}
                            >
                                <RewardCard
                                    reward={reward}
                                    index={index}
                                    isClaimed={claimedRewards.includes(reward.id)}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelectedReward(reward);
                                    }}
                                    onClaim={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        claimReward(reward);
                                    }}
                                />
                            </View>
                        ))}
                    </View>
                    <View style={{ height: 40 }} />
                    </View>
                </ScrollView>
            </SafeAreaView>

            <Modal
                visible={isPassportModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setPassportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setPassportModalVisible(false)} />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Festival Passport</Text>
                                <Pressable style={styles.modalCloseBtn} onPress={() => setPassportModalVisible(false)}>
                                    <Text style={styles.modalCloseText}>X</Text>
                                </Pressable>
                            </View>

                            <View style={styles.modalInfoBlock}>
                                <Text style={styles.modalMetaLabel}>CURRENT LEVEL</Text>
                                <Text style={styles.modalMetaValue}>Level {level}: {levelName}</Text>
                            </View>
                            <View style={styles.modalInfoBlock}>
                                <Text style={styles.modalMetaLabel}>TOTAL STAMPS SCANNED</Text>
                                <Text style={styles.modalMetaValue}>{totalScannedStamps}</Text>
                            </View>
                            <View style={styles.modalInfoBlock}>
                                <Text style={styles.modalMetaLabel}>CURRENT STAMPS</Text>
                                <Text style={styles.modalMetaValue}>{stamps}</Text>
                            </View>
                            <View style={styles.modalInfoBlock}>
                                <Text style={styles.modalMetaLabel}>NEXT MILESTONE</Text>
                                <Text style={styles.modalMetaValue}>
                                    {level >= 7
                                        ? 'Level maxxed out'
                                        : `${Math.max(nextLevelAt - totalScannedStamps, 0)} more stamps to reach Level ${level + 1}`}
                                </Text>
                            </View>

                            <Pressable
                                style={styles.modalActionBtn}
                                onPress={() => setPassportModalVisible(false)}
                            >
                                <Text style={styles.modalActionText}>Back to Rewards</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {selectedReward && (
                <Modal
                    visible={true}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setSelectedReward(null)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedReward(null)} />
                        <View style={styles.modalContainer}>
                            <View style={styles.modalCard}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedReward.title}</Text>
                                    <Pressable style={styles.modalCloseBtn} onPress={() => setSelectedReward(null)}>
                                        <Text style={styles.modalCloseText}>X</Text>
                                    </Pressable>
                                </View>

                                <View style={styles.modalInfoBlock}>
                                    <Text style={styles.modalMetaLabel}>REWARD DETAILS</Text>
                                    <Text style={styles.modalMetaValue}>{selectedReward.detail}</Text>
                                </View>
                                <View style={styles.modalInfoBlock}>
                                    <Text style={styles.modalMetaLabel}>REQUIRED STAMPS</Text>
                                    <Text style={styles.modalMetaValue}>{selectedReward.stamps}</Text>
                                </View>

                                <Pressable
                                    style={[
                                        styles.modalActionBtn,
                                        claimedRewards.includes(selectedReward.id) && styles.modalActionBtnClaimed,
                                    ]}
                                    disabled={claimedRewards.includes(selectedReward.id)}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        claimReward(selectedReward);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.modalActionText,
                                            claimedRewards.includes(selectedReward.id) && styles.modalActionTextClaimed,
                                        ]}
                                    >
                                        {claimedRewards.includes(selectedReward.id) ? 'Claimed' : 'Claim Reward'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    safeArea: { flex: 1 },
    scrollContent: { paddingHorizontal: Spacing.lg },
    contentShell: { width: '100%' },
    header: {
        fontSize: 32,
        color: Colors.light.text,
        fontFamily: Fonts.header,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    passportCard: {
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(79, 143, 192, 0.45)',
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    passportTitle: {
        color: Colors.light.accentText,
        fontSize: 18,
        fontFamily: Fonts.bold,
        marginBottom: Spacing.md,
    },

    // Camera scanner styles
    cameraContainer: {
        width: '100%',
        height: 280,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    cameraOffState: {
        flex: 1,
        backgroundColor: 'rgba(31, 58, 147, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    cameraOffIcon: {
        fontSize: 32,
        marginBottom: 6,
    },
    cameraOffTitle: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    cameraOffHint: {
        color: Colors.light.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    cameraToggleBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 14,
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    cameraToggleText: {
        color: Colors.light.text,
        fontFamily: Fonts.bold,
        fontSize: 13,
    },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanFrame: {
        width: 200,
        height: 200,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: Colors.light.gold,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 8,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 8,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 8,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 8,
    },
    flashBtn: {
        position: 'absolute',
        bottom: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(31, 58, 147, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(79, 143, 192, 0.5)',
    },
    flashBtnActive: {
        backgroundColor: Colors.light.gold,
        borderColor: Colors.light.gold,
    },
    // Scan button styles (fallback when permission not granted)
    qrContainer: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    scanBtn: {
        backgroundColor: 'rgba(243, 233, 210, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(79, 143, 192, 0.45)',
        borderRadius: 16,
        paddingVertical: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanIcon: {
        fontSize: 36,
        marginBottom: 8,
    },
    scanBtnText: {
        color: Colors.light.accentText,
        fontSize: 17,
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    scanHint: {
        color: Colors.light.textSecondary,
        fontSize: 13,
    },

    passportSubtitle: { color: Colors.light.textSecondary, fontSize: 14, fontFamily: Fonts.regular },
    progressCard: {
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    progressCardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.99 }],
        borderColor: 'rgba(79, 143, 192, 0.5)',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    progressTitle: { color: Colors.light.accentText, fontSize: 18, fontFamily: Fonts.bold },
    stampLabel: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: Fonts.medium, textAlign: 'right' },
    stampCount: { color: Colors.light.text, fontSize: 28, fontFamily: Fonts.bold, textAlign: 'right' },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: Spacing.md,
    },
    levelIcon: { fontSize: 16 },
    levelText: { color: Colors.light.textSecondary, fontSize: 14, fontFamily: Fonts.regular },
    levelName: { color: Colors.light.text, fontFamily: Fonts.bold },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(18, 58, 100, 0.12)',
        marginBottom: Spacing.sm,
    },
    progressBarFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.gold },
    progressHint: { color: Colors.light.accentText, fontSize: 13 },
    rewardsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: { color: Colors.light.text, fontSize: 24, fontFamily: Fonts.header },
    partnerText: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: Fonts.regular },
    rewardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    rewardGridItem: {
        marginBottom: Spacing.md,
    },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.lg,
    },
    rewardInfo: { flex: 1, marginRight: Spacing.md },
    rewardTitle: { color: Colors.light.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 4 },
    rewardSubtitle: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: Fonts.regular },
    claimBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    claimText: { color: Colors.light.text, fontFamily: Fonts.bold, fontSize: 14 },
    claimBtnClaimed: {
        backgroundColor: 'rgba(42, 157, 143, 0.85)',
    },
    claimTextClaimed: { color: Colors.light.text },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(31, 58, 147, 0.3)',
    },
    modalContainer: {
        width: '88%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(79, 143, 192, 0.5)',
    },
    modalCard: {
        padding: Spacing.xl,
        backgroundColor: Colors.light.surfaceElevated,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        color: Colors.light.accentText,
        fontSize: 28,
        fontFamily: Fonts.header,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(243, 233, 210, 0.35)',
    },
    modalCloseText: {
        color: Colors.light.text,
        fontSize: 12,
        fontFamily: Fonts.bold,
    },
    modalInfoBlock: {
        marginBottom: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderSubtle,
    },
    modalMetaLabel: {
        color: Colors.light.textSecondary,
        fontSize: 12,
        fontFamily: Fonts.medium,
        letterSpacing: 1,
        marginBottom: 6,
    },
    modalMetaValue: {
        color: Colors.light.text,
        fontSize: 18,
        fontFamily: Fonts.bold,
        lineHeight: 24,
    },
    modalActionBtn: {
        marginTop: Spacing.md,
        backgroundColor: Colors.light.gold,
        borderRadius: 16,
        alignItems: 'center',
        paddingVertical: 14,
    },
    modalActionText: {
        color: Colors.light.text,
        fontSize: 15,
        fontFamily: Fonts.bold,
    },
    modalActionBtnClaimed: {
        backgroundColor: 'rgba(42, 157, 143, 0.85)',
    },
    modalActionTextClaimed: { color: Colors.light.text },
});
