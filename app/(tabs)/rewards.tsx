import { ReloadOverlay } from '@/components/ReloadOverlay';
import { StarryBackground } from '@/components/StarryBackground';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission, requestPermission]);

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
            <StarryBackground />
            <ReloadOverlay visible={refreshing} />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="transparent"
                            colors={['transparent']}
                        />
                    }
                >
                    <Text style={styles.header}>Rewards</Text>

                    {/* Passport Card */}
                    <View style={styles.passportCard}>
                        {permission?.granted && isFocused ? (
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
                                            <Text style={styles.cameraToggleText}>Turn camera on (TEST)</Text>
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
                                                color={flashOn ? "#000" : Colors.light.gold}
                                            />
                                        </Pressable>

                                        <Pressable
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setCameraEnabled(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.cameraOffBtn,
                                                pressed && { opacity: 0.85 }
                                            ]}
                                        >
                                            <Text style={styles.cameraOffBtnText}>Turn camera off (TEST)</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.qrContainer}>
                                <Pressable style={styles.scanBtn} onPress={() => requestPermission()}>
                                    <Text style={styles.scanIcon}>📷</Text>
                                    <Text style={styles.scanBtnText}>Enable Camera</Text>
                                    <Text style={styles.scanHint}>Camera permission required</Text>
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

                    {/* Test-only: quick add stamps */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.testStampBtn,
                            pressed && { opacity: 0.85 }
                        ]}
                        onPress={() => {
                            setStamps((prev) => prev + 5);
                            setTotalScannedStamps((prev) => prev + 5);
                        }}
                    >
                        <Text style={styles.testStampText}>+5 Stamps (TEST)</Text>
                    </Pressable>

                    {/* Available Rewards */}
                    <View style={styles.rewardsHeader}>
                        <Text style={styles.sectionTitle}>Available rewards</Text>
                        <Text style={styles.partnerText}>✨ Powered by partners</Text>
                    </View>
                    {REWARDS.map((reward, index) => (
                        <RewardCard
                            key={reward.id}
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
                    ))}
                    <View style={{ height: 40 }} />
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
                        <LinearGradient
                            colors={[Colors.light.cardGradientStart, Colors.light.cardGradientEnd]}
                            style={styles.modalCard}
                        >
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
                        </LinearGradient>
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
                            <LinearGradient
                                colors={[Colors.light.cardGradientStart, Colors.light.cardGradientEnd]}
                                style={styles.modalCard}
                            >
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
                            </LinearGradient>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B0B0F' },
    safeArea: { flex: 1, paddingHorizontal: Spacing.lg },
    header: {
        fontSize: 32,
        color: '#fff',
        fontFamily: Fonts.header,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    passportCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.2)',
        padding: Spacing.lg,
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    passportTitle: {
        color: Colors.light.gold,
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
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    cameraOffIcon: {
        fontSize: 32,
        marginBottom: 6,
    },
    cameraOffTitle: {
        color: '#fff',
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
        color: '#000',
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    flashBtnActive: {
        backgroundColor: Colors.light.gold,
        borderColor: Colors.light.gold,
    },
    cameraOffBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.25)',
    },
    cameraOffBtnText: {
        color: Colors.light.gold,
        fontSize: 11,
        fontFamily: Fonts.medium,
    },

    // Scan button styles (fallback when permission not granted)
    qrContainer: {
        width: '100%',
        marginBottom: Spacing.md,
    },
    scanBtn: {
        backgroundColor: 'rgba(255,215,0,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
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
        color: Colors.light.gold,
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
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    progressCardPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.99 }],
        borderColor: 'rgba(255,215,0,0.3)',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    progressTitle: { color: Colors.light.gold, fontSize: 18, fontFamily: Fonts.bold },
    stampLabel: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: Fonts.medium, textAlign: 'right' },
    stampCount: { color: '#fff', fontSize: 28, fontFamily: Fonts.bold, textAlign: 'right' },
    levelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: Spacing.md,
    },
    levelIcon: { fontSize: 16 },
    levelText: { color: Colors.light.textSecondary, fontSize: 14, fontFamily: Fonts.regular },
    levelName: { color: '#fff', fontFamily: Fonts.bold },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: Spacing.sm,
    },
    progressBarFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.gold },
    progressHint: { color: Colors.light.gold, fontSize: 13 },
    rewardsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    sectionTitle: { color: '#fff', fontSize: 24, fontFamily: Fonts.header },
    partnerText: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: Fonts.regular },
    rewardCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        padding: Spacing.lg,
        marginBottom: Spacing.md,
    },
    rewardInfo: { flex: 1, marginRight: Spacing.md },
    rewardTitle: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold, marginBottom: 4 },
    rewardSubtitle: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: Fonts.regular },
    claimBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    claimText: { color: '#000', fontFamily: Fonts.bold, fontSize: 14 },
    claimBtnClaimed: {
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
    },
    claimTextClaimed: { color: '#fff' },
    testStampBtn: {
        alignSelf: 'flex-start',
        marginBottom: Spacing.lg,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: 'rgba(255,215,0,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
    },
    testStampText: {
        color: Colors.light.gold,
        fontFamily: Fonts.bold,
        fontSize: 13,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },

    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.82)',
    },
    modalContainer: {
        width: '88%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.25)',
    },
    modalCard: {
        padding: Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        color: Colors.light.gold,
        fontSize: 28,
        fontFamily: Fonts.header,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    modalCloseText: {
        color: '#fff',
        fontSize: 12,
        fontFamily: Fonts.bold,
    },
    modalInfoBlock: {
        marginBottom: Spacing.md,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    modalMetaLabel: {
        color: Colors.light.textSecondary,
        fontSize: 12,
        fontFamily: Fonts.medium,
        letterSpacing: 1,
        marginBottom: 6,
    },
    modalMetaValue: {
        color: '#fff',
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
        color: '#000',
        fontSize: 15,
        fontFamily: Fonts.bold,
    },
    modalActionBtnClaimed: {
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
    },
    modalActionTextClaimed: { color: '#fff' },
});
