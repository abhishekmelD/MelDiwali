import { AppBackground } from '@/components/AppBackground';
import { ReloadOverlay } from '@/components/ReloadOverlay';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { HapticImpactStyle, hapticImpact, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as ExpoLinking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, Pressable, Animated as RNAnimated, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type MCIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const LINKS: { id: string; icon: MCIconName; title: string; subtitle: string }[] = [
    { id: '1', icon: 'book-open-page-variant-outline', title: 'Learn Hub', subtitle: 'Discover the history of Diwali' },
    { id: '2', icon: 'image-multiple-outline', title: 'Gallery', subtitle: 'Photos from past festivals' },
    { id: '3', icon: 'handshake-outline', title: 'Volunteer', subtitle: 'Join the festival team' },
    { id: '4', icon: 'email-outline', title: 'Contact Us', subtitle: 'Get in touch' },
];

const INTERESTS = ['Event Setup', 'Information Desk', 'Food & Drink', 'Cultural Guide', 'Media & Photo'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROLE_REQUEST_OPTIONS: { role: string; icon: MCIconName; subtitle: string }[] = [
    { role: 'Vendor', icon: 'storefront-outline', subtitle: 'Manage stalls, offers, and vendor tools' },
    { role: 'Sponsor', icon: 'star-circle-outline', subtitle: 'Access sponsor activations and resources' },
    { role: 'Stage Manager', icon: 'clipboard-text-outline', subtitle: 'Coordinate stage schedules and flow' },
    { role: 'Performer', icon: 'microphone-variant', subtitle: 'Access performer updates and set details' },
];
const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);
const validatePassword = (password: string) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
const getPasswordRequirements = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    return { hasMinLength, hasLetter, hasNumber };
};

WebBrowser.maybeCompleteAuthSession();
const configuredWebUrl = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/+$/, '');

type RoleRequestRow = {
    id: string;
    user_id: string;
    user_email: string | null;
    current_role: string;
    requested_role: string;
    status: string;
    created_at: string;
};

function SelectChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const handlePressIn = () => { scale.value = withSpring(0.92); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    return (
        <Pressable
            onPress={() => {
                hapticSelection();
                onPress();
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            <Animated.View style={[styles.chip, active && styles.chipActive, animatedStyle]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
}

function SwipeToConfirm({
    label,
    onConfirm,
    disabled,
    loading,
}: {
    label: string;
    onConfirm: () => void;
    disabled?: boolean;
    loading?: boolean;
}) {
    const knobSize = 72;
    const horizontalPadding = 5;
    const thumbX = React.useRef(new RNAnimated.Value(0)).current;
    const hintShift = React.useRef(new RNAnimated.Value(0)).current;
    const hintOpacity = React.useRef(new RNAnimated.Value(0.58)).current;
    const dragStartXRef = React.useRef(0);
    const lastHapticXRef = React.useRef(0);
    const lastHapticAtRef = React.useRef(0);
    const [trackWidth, setTrackWidth] = useState(0);
    const [confirmed, setConfirmed] = useState(false);
    const maxTranslate = Math.max(trackWidth - knobSize - horizontalPadding * 2, 0);
    const completionThreshold = maxTranslate * 0.86;

    React.useEffect(() => {
        const shiftLoop = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(hintShift, {
                    toValue: 4,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(hintShift, {
                    toValue: 0,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        const opacityLoop = RNAnimated.loop(
            RNAnimated.sequence([
                RNAnimated.timing(hintOpacity, {
                    toValue: 0.72,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                RNAnimated.timing(hintOpacity, {
                    toValue: 0.58,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );

        if (!disabled && !loading && !confirmed) {
            shiftLoop.start();
            opacityLoop.start();
        } else {
            shiftLoop.stop();
            opacityLoop.stop();
            hintShift.setValue(0);
            hintOpacity.setValue(0.58);
        }

        return () => {
            shiftLoop.stop();
            opacityLoop.stop();
        };
    }, [confirmed, disabled, hintOpacity, hintShift, loading]);

    React.useEffect(() => {
        if (disabled || !trackWidth) {
            setConfirmed(false);
            thumbX.setValue(0);
            dragStartXRef.current = 0;
        }
    }, [disabled, trackWidth, thumbX]);

    const panResponder = React.useMemo(
        () =>
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disabled && !loading && !confirmed && maxTranslate > 0,
            onMoveShouldSetPanResponder: (_, gestureState) =>
                !disabled && !loading && !confirmed && maxTranslate > 0 && Math.abs(gestureState.dx) > 2,
            onPanResponderGrant: () => {
                thumbX.stopAnimation((value: number) => {
                    dragStartXRef.current = value;
                    lastHapticXRef.current = value;
                    lastHapticAtRef.current = 0;
                });
            },
            onPanResponderMove: (_, gestureState) => {
                const nextX = Math.min(Math.max(dragStartXRef.current + gestureState.dx, 0), maxTranslate);
                thumbX.setValue(nextX);

                const now = Date.now();
                const progress = maxTranslate > 0 ? nextX / maxTranslate : 0;
                const minInterval = 40;
                const maxInterval = 120;
                const interval = Math.round(maxInterval - (maxInterval - minInterval) * progress);
                const distanceGate = 12;

                if (Math.abs(nextX - lastHapticXRef.current) >= distanceGate && now - lastHapticAtRef.current >= interval) {
                    const style =
                        progress > 0.66
                            ? HapticImpactStyle.Heavy
                            : progress > 0.33
                                ? HapticImpactStyle.Medium
                                : HapticImpactStyle.Light;
                    hapticImpact(style);
                    lastHapticXRef.current = nextX;
                    lastHapticAtRef.current = now;
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (disabled || loading || confirmed) return;

                const finalX = Math.min(Math.max(dragStartXRef.current + gestureState.dx, 0), maxTranslate);
                if (finalX >= completionThreshold && maxTranslate > 0) {
                    RNAnimated.timing(thumbX, {
                        toValue: maxTranslate,
                        duration: 130,
                        useNativeDriver: true,
                    }).start(() => {
                        setConfirmed(true);
                        onConfirm();
                    });
                    return;
                }

                RNAnimated.spring(thumbX, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 3,
                }).start();
                dragStartXRef.current = 0;
            },
        }),
        [completionThreshold, confirmed, disabled, loading, maxTranslate, onConfirm, thumbX]
    );

    return (
        <View
            style={[styles.swipeTrack, (disabled || loading) && styles.swipeTrackDisabled]}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
            <RNAnimated.View
                style={[
                    styles.swipeHintRow,
                    {
                        transform: [{ translateX: hintShift }],
                        opacity: hintOpacity,
                    },
                ]}
                pointerEvents="none"
            >
                <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255, 122, 0, 0.85)" />
                <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255, 122, 0, 0.7)" />
                <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255, 122, 0, 0.5)" />
                <Text style={styles.swipeLabel}>
                    {loading ? 'Sending request...' : confirmed ? 'Request sent' : label}
                </Text>
            </RNAnimated.View>
            <RNAnimated.View
                {...panResponder.panHandlers}
                style={[
                    styles.swipeKnob,
                    {
                        width: knobSize,
                        height: knobSize,
                        borderRadius: knobSize / 2,
                        left: horizontalPadding,
                        transform: [{ translateX: thumbX }],
                    },
                ]}
            >
                <MaterialCommunityIcons
                    name={loading ? 'loading' : confirmed ? 'check' : 'chevron-double-right'}
                    size={20}
                    color={Colors.light.text}
                />
            </RNAnimated.View>
        </View>
    );
}



export default function MoreScreen() {
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isExpanded = viewportWidth >= 1024;
    const appFrameWidth = isExpanded
        ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
        : viewportWidth;
    const { isAuthenticated, userName, userAvatarUrl, userRole, logout } = useUser();
    const { openSignup } = useLocalSearchParams();

    // Modal States
    const [isVolunteerVisible, setVolunteerVisible] = useState(false);
    const [isContactVisible, setContactVisible] = useState(false);
    const [isLoginVisible, setLoginVisible] = useState(false);
    const [isSignUpVisible, setSignUpVisible] = useState(false);
    const [isRoleRequestVisible, setRoleRequestVisible] = useState(false);
    const [roleRequestStep, setRoleRequestStep] = useState<'select' | 'confirm'>('select');
    const [requestedRole, setRequestedRole] = useState('');
    const [requestSending, setRequestSending] = useState(false);
    const [isSuccessVisible, setSuccessVisible] = useState(false);
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [isBTSVisible, setBTSVisible] = useState(false);
    const [isBTSReviewVisible, setBTSReviewVisible] = useState(false);
    const [isRoleApprovalVisible, setRoleApprovalVisible] = useState(false);
    const [roleApprovalLoading, setRoleApprovalLoading] = useState(false);
    const [roleApprovalError, setRoleApprovalError] = useState('');
    const [roleApprovalItems, setRoleApprovalItems] = useState<RoleRequestRow[]>([]);
    const [roleApprovalBusyIds, setRoleApprovalBusyIds] = useState<Record<string, boolean>>({});
    const [googleLoading, setGoogleLoading] = useState(false);
    const { refreshing, onRefresh } = useReloadOnRefresh();

    const BTS_ALLOWED_ROLES = ['Admin', 'Vendor', 'Sponsor', 'Stage Manager', 'Performer'];
    const isBTSAllowed = userRole && BTS_ALLOWED_ROLES.includes(userRole);
    const isVendor = userRole === 'Vendor';
    const isPerformerOrStageManager = userRole === 'Performer' || userRole === 'Stage Manager';
    const isAdmin = userRole === 'Admin';

    const router = useRouter(); // Create local router instance
    const suppressAuthFromParamsRef = React.useRef(false);

    React.useEffect(() => {
        if (openSignup === 'true') {
            if (suppressAuthFromParamsRef.current || !!userRole) {
                setLoginVisible(false);
                setSignUpVisible(false);
                router.replace('/(tabs)/more');
                return;
            }
            setLoginVisible(true);
            // Clear query params after first open to prevent modal reopening loops.
            router.replace('/(tabs)/more');
        }
    }, [openSignup, router, userRole]);

    React.useEffect(() => {
        if (userRole && (isLoginVisible || isSignUpVisible)) {
            setLoginVisible(false);
            setSignUpVisible(false);
        }
    }, [userRole, isLoginVisible, isSignUpVisible]);

    // Volunteer Form State
    const [volName, setVolName] = useState('');
    const [volEmail, setVolEmail] = useState('');
    const [volPhone, setVolPhone] = useState('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [volStatement, setVolStatement] = useState('');

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
    };
    const toggleDay = (day: string) => {
        setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    };


    const validatePhone = (phone: string) => /^(\+61|0)[0-9]{9}$/.test(phone.replace(/\s/g, ''));

    const isEmailValid = validateEmail(volEmail);
    const isPhoneValid = validatePhone(volPhone);
    const isFormValid = volName && isEmailValid && isPhoneValid && selectedInterests.length > 0 && selectedDays.length > 0;

    const handleVolunteerSubmit = () => {
        hapticSuccess();
        setSuccessVisible(true);
        setTimeout(() => {
            setSuccessVisible(false);
            setVolunteerVisible(false);
        }, 2000);

        console.log('\n--- NEW VOLUNTEER APPLICATION ---');
        console.log(`Name: ${volName}`);
        console.log(`Email: ${volEmail}`);
        console.log(`Phone: ${volPhone}`);
        console.log(`Interests: ${selectedInterests.join(', ')}`);
        console.log(`Availability: ${selectedDays.join(', ')}`);
        console.log(`Statement: ${volStatement}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log('----------------------------------\n');
    };

    const handleLinkPress = (id: string) => {
        hapticImpact();
        if (id === '3') setVolunteerVisible(true);
        else if (id === '4') setContactVisible(true);
    };

    const handleOpenRoleRequest = () => {
        hapticImpact();
        setMenuVisible(false);
        setRoleRequestStep('select');
        setRoleRequestVisible(true);
    };

    const handleContinueRoleRequest = () => {
        if (!requestedRole) return;
        hapticImpact();
        setRoleRequestStep('confirm');
    };

    const handleSendRoleRequest = async () => {
        if (!requestedRole || requestSending) return;
        hapticImpact();
        if (!supabase) {
            Alert.alert('Request unavailable', 'Supabase is not configured. Check your .env.local values.');
            return;
        }

        setRequestSending(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) {
                throw userError;
            }

            const authUser = userData.user;
            if (!authUser) {
                throw new Error('You must be logged in to request a role.');
            }

            const effectiveCurrentRole = userRole || 'Guest';
            const status =
                effectiveCurrentRole === 'Guest' && requestedRole === 'Guest'
                    ? 'approved'
                    : 'pending';

            const { error: insertError } = await supabase.from('role_requests').insert({
                user_id: authUser.id,
                user_email: authUser.email ?? null,
                current_role: effectiveCurrentRole,
                requested_role: requestedRole,
                status,
            });

            if (insertError) {
                throw insertError;
            }

            hapticSuccess();
            Alert.alert(
                'Request sent',
                `Your request for ${requestedRole} access has been sent to the admin.`
            );
            setRoleRequestVisible(false);
            setRoleRequestStep('select');
            setRequestedRole('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to submit role request.';
            Alert.alert('Request failed', message);
        } finally {
            setRequestSending(false);
        }
    };
    const selectedRoleOption = ROLE_REQUEST_OPTIONS.find((item) => item.role === requestedRole);

    const handleOpenRoleApprovals = async () => {
        if (!supabase) {
            Alert.alert('Admin tools unavailable', 'Supabase is not configured. Check your .env.local values.');
            return;
        }
        hapticImpact();
        setRoleApprovalVisible(true);
        setRoleApprovalLoading(true);
        setRoleApprovalError('');
        try {
            const { data, error } = await supabase
                .from('role_requests')
                .select('id, user_id, user_email, current_role, requested_role, status, created_at')
                .eq('status', 'pending')
                .neq('current_role', 'requested_role')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRoleApprovalItems((data as RoleRequestRow[]) ?? []);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to load role requests.';
            setRoleApprovalError(message);
        } finally {
            setRoleApprovalLoading(false);
        }
    };

    const setRoleBusy = (id: string, busy: boolean) => {
        setRoleApprovalBusyIds((prev) => ({ ...prev, [id]: busy }));
    };

    const handleApproveRoleRequest = async (item: RoleRequestRow) => {
        if (!supabase) return;
        if (roleApprovalBusyIds[item.id]) return;
        hapticImpact();
        setRoleBusy(item.id, true);
        try {
            const { error } = await supabase
                .from('role_requests')
                .update({
                    current_role: item.requested_role,
                    status: 'approved',
                })
                .eq('id', item.id);

            if (error) throw error;
            setRoleApprovalItems((prev) => prev.filter((row) => row.id !== item.id));
            hapticSuccess();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to approve role request.';
            Alert.alert('Approval failed', message);
        } finally {
            setRoleBusy(item.id, false);
        }
    };

    const handleDenyRoleRequest = async (item: RoleRequestRow) => {
        if (!supabase) return;
        if (roleApprovalBusyIds[item.id]) return;
        hapticImpact();
        setRoleBusy(item.id, true);
        try {
            const { error } = await supabase
                .from('role_requests')
                .update({
                    requested_role: item.current_role,
                    status: 'rejected',
                })
                .eq('id', item.id);

            if (error) throw error;
            setRoleApprovalItems((prev) => prev.filter((row) => row.id !== item.id));
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to deny role request.';
            Alert.alert('Denial failed', message);
        } finally {
            setRoleBusy(item.id, false);
        }
    };

    // Contact Actions
    const handleMap = () => {
        hapticImpact();
        const address = '2 Wharf St, Docklands VIC 3008';
        const url = Platform.select({
            ios: `maps:0,0?q=${address}`,
            android: `geo:0,0?q=${address}`,
            default: `https://www.google.com/maps/search/?api=1&query=${address}`,
        });
        Linking.openURL(url!);
    };

    const handleGoogleSignIn = async () => {
        if (!supabase) {
            Alert.alert('Auth unavailable', 'Supabase is not configured. Check your .env.local values.');
            return;
        }
        hapticImpact();

        const handleAuthSuccess = () => {
            suppressAuthFromParamsRef.current = true;
            setLoginVisible(false);
            setSignUpVisible(false);
            router.replace('/(tabs)/more');
        };

        setGoogleLoading(true);
        try {
            const isWeb = Platform.OS === 'web';
            const runtimeWebOrigin = isWeb && typeof window !== 'undefined'
                ? window.location.origin?.replace(/\/+$/, '')
                : undefined;
            const webBaseUrl = configuredWebUrl || runtimeWebOrigin;
            const redirectTo =
                isWeb && webBaseUrl
                    ? `${webBaseUrl}/more`
                    : AuthSession.makeRedirectUri({
                        scheme: 'saras',
                        path: 'more',
                        preferLocalhost: false,
                    });
            console.log('[Google OAuth] redirectTo:', redirectTo);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    // On web, let Supabase handle full-page redirect directly.
                    skipBrowserRedirect: !isWeb,
                },
            });

            if (error) {
                throw error;
            }

            if (isWeb) {
                return;
            }

            if (!data?.url) {
                throw new Error('Missing OAuth redirect URL from Supabase.');
            }

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            console.log('[Google OAuth] authSession result:', result.type);
            if (result.type !== 'success' || !result.url) {
                if (result.type !== 'cancel' && result.type !== 'dismiss') {
                    throw new Error(`Google auth did not complete (result: ${result.type}).`);
                }
                return;
            }
            console.log('[Google OAuth] callback URL:', result.url);

            const { queryParams } = ExpoLinking.parse(result.url);
            const hashFragment = result.url.includes('#') ? result.url.split('#')[1] : '';
            const hashParams = new URLSearchParams(hashFragment);
            const queryAccessToken =
                typeof queryParams?.access_token === 'string' ? queryParams.access_token : undefined;
            const queryRefreshToken =
                typeof queryParams?.refresh_token === 'string' ? queryParams.refresh_token : undefined;
            const codeParam = typeof queryParams?.code === 'string' ? queryParams.code : undefined;
            const hashCode = hashParams.get('code') ?? undefined;
            const accessToken = hashParams.get('access_token') ?? queryAccessToken;
            const refreshToken = hashParams.get('refresh_token') ?? queryRefreshToken;
            const authCode = hashCode ?? codeParam;

            if (authCode) {
                const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
                if (exchangeError) {
                    throw exchangeError;
                }
                handleAuthSuccess();
                return;
            }

            if (accessToken && refreshToken) {
                const { error: setSessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });
                if (setSessionError) {
                    throw setSessionError;
                }
                handleAuthSuccess();
                return;
            }

            throw new Error('Google sign-in callback did not include a code or session tokens.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to start Google sign-in.';
            Alert.alert('Google sign-in failed', message);
        } finally {
            setGoogleLoading(false);
        }
    };

    const firstName = userName?.trim() ? userName.trim().split(/\s+/)[0] : 'Guest';

    return (
        <View style={styles.container}>
            <AppBackground />
            <ReloadOverlay visible={refreshing} />
            <SafeAreaView
                style={[styles.safeArea, isExpanded && { width: appFrameWidth, alignSelf: 'center' }]}
                edges={['top']}
            >
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
                    <Text style={styles.header}>More</Text>

                    {/* Profile */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatar}>
                            {userAvatarUrl ? (
                                <Image source={{ uri: userAvatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <MaterialCommunityIcons name="account-outline" size={28} color={Colors.light.accentText} />
                            )}
                        </View>
                        <Text style={styles.profileTitle}>Festival Pass</Text>
                        {/* Sign Up Button or Welcome Message */}
                        {isAuthenticated ? (
                            <Text style={styles.welcomeText}>Welcome, {firstName}</Text>
                        ) : (
                            <View style={styles.authButtonsRow}>
                                <Pressable style={styles.signUpBtn} onPress={() => {
                                    hapticImpact();
                                    setLoginVisible(true);
                                }}>
                                    <MaterialCommunityIcons name="account-plus-outline" size={18} color={Colors.light.text} />
                                    <Text style={styles.signUpBtnText}>Log In / Sign Up</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Name Input */}


                        {userRole && userRole !== 'Guest' && (
                            <Text style={styles.roleDisplay}>
                                Role: <Text style={{ color: Colors.light.accentText }}>{userRole}</Text>
                            </Text>
                        )}

                        {/* Top Right Menu Button */}
                        {isAuthenticated && (
                            <>
                                <Pressable
                                    style={styles.menuBtn}
                                    onPress={() => {
                                        hapticImpact();
                                        setMenuVisible(!isMenuVisible);
                                    }}
                                    hitSlop={10}
                                >
                                    <MaterialCommunityIcons name="dots-horizontal" size={24} color="rgba(0, 0, 0, 0.4)" />
                                </Pressable>

                                {/* Menu Overlay & Dropdown */}
                                {isMenuVisible && (
                                    <>
                                        <Pressable
                                            style={styles.menuOverlay}
                                            onPress={() => {
                                                hapticImpact();
                                                setMenuVisible(false);
                                            }}
                                        />
                                        <View style={styles.menuDropdown}>
                                            <Pressable style={styles.menuItem} onPress={handleOpenRoleRequest}>
                                                <MaterialCommunityIcons name="account-cog-outline" size={18} color={Colors.light.accentText} />
                                                <Text style={[styles.menuText, styles.menuRequestText]}>Request role</Text>
                                            </Pressable>
                                            <Pressable style={styles.menuItem} onPress={() => {
                                                hapticImpact();
                                                logout().catch((e) => console.warn('Logout cleanup failed', e));
                                                setMenuVisible(false);
                                            }}>
                                                <MaterialCommunityIcons name="logout" size={18} color={Colors.light.peach} />
                                                <Text style={styles.menuText}>Logout</Text>
                                            </Pressable>
                                        </View>
                                    </>
                                )}
                            </>
                        )}
                    </View>
                    {/* Links */}
                    {LINKS.map((link) => (
                        <Pressable
                            key={link.id}
                            style={styles.linkCard}
                            onPress={() => handleLinkPress(link.id)}
                        >
                            <MaterialCommunityIcons name={link.icon} size={24} color={Colors.light.accentText} style={styles.linkIcon} />
                            <View style={styles.linkInfo}>
                                <Text style={styles.linkTitle}>{link.title}</Text>
                                <Text style={styles.linkSubtitle}>{link.subtitle}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
                        </Pressable>
                    ))}

                    {/* Vendor WhatsApp Group */}
                    {isVendor && (
                        <Pressable
                            style={styles.linkCard}
                            onPress={() => {
                                hapticImpact();
                                Linking.openURL('https://www.google.com/search?q=vendors');
                            }}
                        >
                            <MaterialCommunityIcons name="message-text-outline" size={24} color={Colors.light.accentText} style={styles.linkIcon} />
                            <View style={styles.linkInfo}>
                                <Text style={styles.linkTitle}>Vendor whatsapp group</Text>
                                <Text style={styles.linkSubtitle}>Join the vendor community chat</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
                        </Pressable>
                    )}

                    {/* Performer/Stage Manager WhatsApp Group */}
                    {isPerformerOrStageManager && (
                        <Pressable
                            style={styles.linkCard}
                            onPress={() => {
                                hapticImpact();
                                Linking.openURL('https://chat.whatsapp.com/FGZo1aXlcpUB88DIZXw8Ub?mode=gi_t');
                            }}
                        >
                            <MaterialCommunityIcons name="account-music-outline" size={24} color={Colors.light.accentText} style={styles.linkIcon} />
                            <View style={styles.linkInfo}>
                                <Text style={styles.linkTitle}>Performer whatsapp group</Text>
                                <Text style={styles.linkSubtitle}>Connect with performers and stage managers</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
                        </Pressable>
                    )}

                    {/* BTS Submission / Review - Role Restricted */}
                    {isBTSAllowed && (
                        <Pressable
                            style={styles.linkCard}
                            onPress={() => {
                                hapticImpact();
                                if (userRole === 'Admin') {
                                    setBTSReviewVisible(true);
                                } else {
                                    setBTSVisible(true);
                                }
                            }}
                        >
                            <MaterialCommunityIcons name="movie-open-outline" size={24} color={Colors.light.accentText} style={styles.linkIcon} />
                            <View style={styles.linkInfo}>
                                <Text style={styles.linkTitle}>
                                    {userRole === 'Admin' ? 'Review BTS submissions' : 'Submit BTS Clip'}
                                </Text>
                                <Text style={styles.linkSubtitle}>
                                    {userRole === 'Admin' ? 'Approve or reject community submissions' : 'Share behind-the-scenes moments'}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
                        </Pressable>
                    )}

                    {/* Admin: Approve Role Requests */}
                    {isAdmin && (
                        <Pressable
                            style={styles.linkCard}
                            onPress={() => {
                                handleOpenRoleApprovals();
                            }}
                        >
                            <MaterialCommunityIcons name="account-check-outline" size={24} color={Colors.light.accentText} style={styles.linkIcon} />
                            <View style={styles.linkInfo}>
                                <Text style={styles.linkTitle}>Approve role requests</Text>
                                <Text style={styles.linkSubtitle}>Review pending role changes</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.light.textSecondary} />
                        </Pressable>
                    )}

                    <View style={styles.ackCard}>
                        <MaterialCommunityIcons name="dharmachakra" size={24} color={Colors.light.gold} style={styles.ackIcon} />
                        <Text style={styles.ackTitle}>Acknowledgement of Country</Text>
                        <Text style={styles.ackText}>
                            We acknowledge the Traditional Owners of the land where we work and live, and pay our respects to Elders past and present. We celebrate the stories, culture, and traditions of Aboriginal and Torres Strait Islander peoples.
                        </Text>
                    </View>

                    <Text style={styles.version}>Melbourne Diwali v1.0.0</Text>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Volunteer Modal */}
            <Modal
                visible={isVolunteerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setVolunteerVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Join the Team</Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setVolunteerVisible(false);
                                }}>
                                    <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                                </Pressable>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalIntro}>Become a part of the Melbourne Diwali family! Tell us how you&apos;d like to help spread the light.</Text>
                                <Text style={styles.inputLabel}>FULL NAME</Text>
                                <TextInput style={styles.input} placeholder="e.g. Alexis Smith" placeholderTextColor="rgba(0, 0, 0, 0.25)" value={volName} onChangeText={setVolName} />
                                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                                <TextInput style={[styles.input, volEmail && !isEmailValid && styles.inputError]} placeholder="alexis@example.com" placeholderTextColor="rgba(0, 0, 0, 0.25)" keyboardType="email-address" autoCapitalize="none" value={volEmail} onChangeText={setVolEmail} />
                                {volEmail && !isEmailValid && <Text style={styles.errorText}>Invalid email address</Text>}
                                <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                                <TextInput style={[styles.input, volPhone && !isPhoneValid && styles.inputError]} placeholder="e.g. 0400 000 000" placeholderTextColor="rgba(0, 0, 0, 0.25)" keyboardType="phone-pad" value={volPhone} onChangeText={setVolPhone} />
                                {volPhone && !isPhoneValid && <Text style={styles.errorText}>Invalid AU phone number</Text>}
                                <Text style={styles.inputLabel}>INTEREST AREAS</Text>
                                <View style={styles.chipRow}>{INTERESTS.map(i => <SelectChip key={i} label={i} active={selectedInterests.includes(i)} onPress={() => toggleInterest(i)} />)}</View>
                                <Text style={styles.inputLabel}>AVAILABILITY (DAYS)</Text>
                                <View style={styles.chipRow}>{DAYS.map(d => <SelectChip key={d} label={d} active={selectedDays.includes(d)} onPress={() => toggleDay(d)} />)}</View>
                                <Text style={styles.inputLabel}>WHY DO YOU WANT TO JOIN?</Text>
                                <TextInput style={[styles.input, styles.textArea]} placeholder="Your motivation..." placeholderTextColor="rgba(0, 0, 0, 0.35)" multiline numberOfLines={4} value={volStatement} onChangeText={setVolStatement} />
                                <Pressable style={[styles.submitBtn, !isFormValid && styles.submitBtnDisabled]} onPress={handleVolunteerSubmit} disabled={!isFormValid}>
                                    <Text style={styles.submitText}>Submit Application</Text>
                                </Pressable>
                            </ScrollView>

                            {/* Success Overlay */}
                            {isSuccessVisible && (
                                <Animated.View style={styles.successOverlay}>
                                    <View style={styles.successIconContainer}>
                                        <MaterialCommunityIcons name="check-circle" size={80} color={Colors.light.gold} />
                                        <Text style={styles.successText}>Success!</Text>
                                        <Text style={styles.successSubtext}>We&apos;ve received your application.</Text>
                                    </View>
                                </Animated.View>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Contact Modal */}
            <Modal
                visible={isContactVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setContactVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Contact Us</Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setContactVisible(false);
                                }}>
                                    <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                                </Pressable>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalIntro}>Reach out with your questions, ideas, or messages-we&apos;re always happy to chat.</Text>
                                <ContactCard icon="map-marker-outline" title="Visit Us" value="2 Wharf St, Docklands VIC 3008" onPress={handleMap} />
                                <ContactCard icon="email-outline" title="Email" value="info@melbournediwali.com.au" onPress={() => Linking.openURL('mailto:info@melbournediwali.com.au')} />
                                <ContactCard icon="phone-outline" title="Phone" value="+61 493 887 000" onPress={() => Linking.openURL('tel:+61493887000')} />
                                <ContactCard icon="web" title="Website" value="melbournediwali.com.au" onPress={() => Linking.openURL('https://melbournediwali.com.au')} />
                                <View style={styles.modalFooter}>
                                    <Text style={styles.ackTitle}>Acknowledgement of Country</Text>
                                    <Text style={styles.ackText}>We acknowledge the Traditional Owners of the land where we work and live...</Text>
                                    <Text style={styles.copyright}>©2025 by Melbourne Diwali</Text>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Request Role Modal */}
            <Modal
                visible={isRoleRequestVisible}
                animationType="none"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setRoleRequestVisible(false);
                    setRoleRequestStep('select');
                }}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {roleRequestStep === 'select' ? 'Request Role' : 'Confirm Request'}
                                </Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setRoleRequestVisible(false);
                                    setRoleRequestStep('select');
                                }}>
                                    <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                                </Pressable>
                            </View>
                            {roleRequestStep === 'select' ? (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Text style={styles.modalIntro}>Select the utility role you want to request from admin.</Text>
                                    <View style={styles.roleRequestCards}>
                                        {ROLE_REQUEST_OPTIONS.map((roleOption) => (
                                            <Pressable
                                                key={roleOption.role}
                                                style={[
                                                    styles.roleRequestCard,
                                                    requestedRole === roleOption.role && styles.roleRequestCardActive,
                                                ]}
                                                onPress={() => {
                                                    hapticSelection();
                                                    setRequestedRole(roleOption.role);
                                                }}
                                            >
                                                <View style={styles.roleRequestIconWrap}>
                                                    <MaterialCommunityIcons
                                                        name={roleOption.icon}
                                                        size={24}
                                                        color={Colors.light.gold}
                                                    />
                                                </View>
                                                <View style={styles.roleRequestContent}>
                                                    <Text style={styles.roleRequestTitle}>{roleOption.role}</Text>
                                                    <Text style={styles.roleRequestSubtitle}>{roleOption.subtitle}</Text>
                                                </View>
                                                <MaterialCommunityIcons
                                                    name={requestedRole === roleOption.role ? 'check-circle' : 'check-circle-outline'}
                                                    size={20}
                                                    color={Colors.light.gold}
                                                />
                                            </Pressable>
                                        ))}
                                    </View>

                                    <Pressable
                                        style={[styles.submitBtn, !requestedRole && styles.submitBtnDisabled]}
                                        onPress={handleContinueRoleRequest}
                                        disabled={!requestedRole}
                                    >
                                        <Text style={styles.submitText}>Continue</Text>
                                    </Pressable>
                                </ScrollView>
                            ) : (
                                <>
                                    <View style={styles.confirmBody}>
                                        <Text style={styles.confirmHeading}>Review Your Request</Text>
                                        <Text style={styles.confirmSubheading}>
                                            Confirm that you want to request admin access for this role utility.
                                        </Text>

                                        <View style={styles.confirmRoleCard}>
                                            <View style={styles.confirmRoleIconWrap}>
                                                <MaterialCommunityIcons
                                                    name={selectedRoleOption?.icon ?? 'account-cog-outline'}
                                                    size={34}
                                                    color={Colors.light.gold}
                                                />
                                            </View>
                                            <Text style={styles.confirmRoleLabel}>{requestedRole || 'Selected role'}</Text>
                                            <Text style={styles.confirmRoleDescription}>
                                                {selectedRoleOption?.subtitle ?? 'Role utility access request'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.confirmFooter}>
                                        <SwipeToConfirm
                                            label="Slide to confirm"
                                            onConfirm={handleSendRoleRequest}
                                            disabled={!requestedRole}
                                            loading={requestSending}
                                        />
                                    </View>
                                </>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Login Modal */}
            <LoginModal
                visible={isLoginVisible}
                onClose={() => {
                    hapticImpact();
                    setLoginVisible(false);
                }}
                onOpenSignUp={() => {
                    hapticImpact();
                    setLoginVisible(false);
                    setSignUpVisible(true);
                }}
                onGooglePress={handleGoogleSignIn}
                googleLoading={googleLoading}
            />

            {/* Sign Up Modal */}
            <SignUpModal
                visible={isSignUpVisible}
                onClose={() => {
                    hapticImpact();
                    setSignUpVisible(false);
                }}
                onOpenLogin={() => {
                    hapticImpact();
                    setSignUpVisible(false);
                    setLoginVisible(true);
                }}
                onGooglePress={handleGoogleSignIn}
                googleLoading={googleLoading}
            />

            {/* BTS Submission Modal */}
            <BTSModal
                visible={isBTSVisible}
                onClose={() => {
                    hapticImpact();
                    setBTSVisible(false);
                }}
            />

            {/* BTS Review Modal (Admin) */}
            <BTSReviewModal
                visible={isBTSReviewVisible}
                onClose={() => {
                    hapticImpact();
                    setBTSReviewVisible(false);
                }}
            />

            {/* Role Request Approvals (Admin) */}
            <Modal
                visible={isRoleApprovalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setRoleApprovalVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, styles.roleApprovalTitle]}>Approve Role Requests</Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setRoleApprovalVisible(false);
                                }}>
                                    <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                                </Pressable>
                            </View>
                            <Text style={styles.modalIntro}>Review pending role changes</Text>
                            {roleApprovalLoading ? (
                                <Text style={styles.modalIntro}>Loading role requests...</Text>
                            ) : roleApprovalError ? (
                                <Text style={styles.errorText}>{roleApprovalError}</Text>
                            ) : roleApprovalItems.length === 0 ? (
                                <Text style={styles.modalIntro}>
                                    No pending role changes. Everyone is already on their current role.
                                </Text>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {roleApprovalItems.map((item) => (
                                        <View key={item.id} style={styles.roleApprovalCard}>
                                            <View style={styles.roleApprovalTopRow}>
                                                <View style={styles.roleApprovalEmailRow}>
                                                    <View style={styles.roleApprovalAvatar}>
                                                        <MaterialCommunityIcons name="account-outline" size={18} color={Colors.light.accentText} />
                                                    </View>
                                                    <Text style={styles.roleApprovalEmail} numberOfLines={1}>
                                                        {item.user_email || 'Unknown email'}
                                                    </Text>
                                                </View>
                                                <View style={styles.roleApprovalMetaRow}>
                                                    <Text style={styles.roleApprovalTimestamp}>
                                                        {new Date(item.created_at).toLocaleString()}
                                                    </Text>
                                                    <View style={styles.roleApprovalBadge}>
                                                        <Text style={styles.roleApprovalBadgeText}>PENDING</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View style={styles.roleApprovalRoleRow}>
                                                <View style={styles.roleApprovalRoleBlock}>
                                                    <Text style={styles.roleApprovalRoleValue}>{item.current_role}</Text>
                                                </View>
                                                <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255, 122, 0, 0.7)" />
                                                <View style={[styles.roleApprovalRoleBlock, styles.roleApprovalRoleBlockAlt]}>
                                                    <Text style={styles.roleApprovalRoleValue}>{item.requested_role}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.roleApprovalActions}>
                                                <Pressable
                                                    style={[
                                                        styles.roleApprovalBtn,
                                                        styles.roleApprovalApprove,
                                                        roleApprovalBusyIds[item.id] && styles.roleApprovalBtnDisabled,
                                                    ]}
                                                    onPress={() => handleApproveRoleRequest(item)}
                                                    disabled={roleApprovalBusyIds[item.id]}
                                                >
                                                    <Text style={styles.roleApprovalBtnText}>Approve</Text>
                                                </Pressable>
                                                <Pressable
                                                    style={[
                                                        styles.roleApprovalBtn,
                                                        styles.roleApprovalDeny,
                                                        roleApprovalBusyIds[item.id] && styles.roleApprovalBtnDisabled,
                                                    ]}
                                                    onPress={() => handleDenyRoleRequest(item)}
                                                    disabled={roleApprovalBusyIds[item.id]}
                                                >
                                                    <Text style={styles.roleApprovalBtnTextAlt}>Deny</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function BTSModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { userName, userRole } = useUser();
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!link.trim()) return;
        hapticImpact();
        setLoading(true);

        console.log('\n\n' + '='.repeat(50));
        console.log(`NEW BTS CLIP SUBMISSION`);
        console.log('='.repeat(50));
        console.log(`User:  ${userName}`);
        console.log(`Role:  ${userRole}`);
        console.log(`Link:  ${link}`);
        console.log('-'.repeat(50) + '\n');

        // Simulate upload/save
        await new Promise(resolve => setTimeout(resolve, 1500));

        hapticSuccess();
        alert(`Thank you. Your BTS clip has been submitted for review.`);

        setLoading(false);
        setLink('');
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Submit BTS</Text>
                            <Pressable onPress={() => {
                                hapticImpact();
                                onClose();
                            }}>
                                <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalIntro}>Share your behind-the-scenes photos or videos. Please provide a publicly accessible link (e.g., Google Photos, Dropbox, or iCloud).</Text>

                            <Text style={styles.inputLabel}>CLIPS LINK</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://photos.google.com/..."
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={link}
                                onChangeText={setLink}
                                autoCapitalize="none"
                                keyboardType="url"
                            />

                            <Pressable
                                style={[styles.submitBtn, !link.trim() && styles.submitBtnDisabled]}
                                onPress={handleSubmit}
                                disabled={!link.trim() || loading}
                            >
                                <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Send to Team'}</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function BTSReviewModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    return (
        <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Review BTS</Text>
                            <Pressable onPress={() => {
                                hapticImpact();
                                onClose();
                            }}>
                                <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                            </Pressable>
                        </View>
                        <Text style={styles.modalIntro}>
                            No submissions yet. Draft BTS clips from the community will appear here.
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function LoginModal({
    visible,
    onClose,
    onOpenSignUp,
    onGooglePress,
    googleLoading,
}: {
    visible: boolean;
    onClose: () => void;
    onOpenSignUp: () => void;
    onGooglePress: () => void;
    googleLoading: boolean;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        hapticImpact();
        if (!supabase) {
            Alert.alert('Auth unavailable', 'Supabase is not configured. Check your .env.local values.');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }

        if (!password) {
            Alert.alert('Missing password', 'Please enter your password.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                throw error;
            }

            hapticSuccess();
            setEmail('');
            setPassword('');
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to log in with email/password.';
            Alert.alert('Login failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Login</Text>
                            <Pressable onPress={() => {
                                hapticImpact();
                                onClose();
                            }}>
                                <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalIntro}>Continue with Google, or log in with your email and password.</Text>

                            <Pressable
                                style={[styles.googleAuthBtn, googleLoading && styles.submitBtnDisabled]}
                                onPress={onGooglePress}
                                disabled={googleLoading}
                            >
                                <MaterialCommunityIcons name="google" size={18} color={Colors.light.accentText} />
                                <Text style={styles.googleAuthBtnText}>{googleLoading ? 'Opening Google...' : 'Continue with Google'}</Text>
                            </Pressable>

                            <View style={styles.authDividerRow}>
                                <View style={styles.authDividerLine} />
                                <Text style={styles.authDividerText}>or use email</Text>
                                <View style={styles.authDividerLine} />
                            </View>

                            <Text style={styles.inputLabel}>EMAIL</Text>
                            <TextInput
                                style={[styles.input, email && !validateEmail(email) && styles.inputError]}
                                placeholder="you@example.com"
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {email && !validateEmail(email) && <Text style={styles.errorText}>Invalid email address</Text>}

                            <Text style={styles.inputLabel}>PASSWORD</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your password"
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />

                            <Pressable
                                style={[styles.submitBtn, (!email || !validateEmail(email) || !password || loading) && styles.submitBtnDisabled]}
                                onPress={handleLogin}
                                disabled={!email || !validateEmail(email) || !password || loading}
                            >
                                <Text style={styles.submitText}>{loading ? 'Logging in...' : 'Log In'}</Text>
                            </Pressable>

                            <Pressable onPress={() => {
                                hapticImpact();
                                onOpenSignUp();
                            }} style={styles.authSwitchBtn}>
                                <Text style={styles.authSwitchText}>
                                    Not registered? <Text style={styles.authSwitchEmphasis}>Sign Up</Text>
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function SignUpModal({
    visible,
    onClose,
    onOpenLogin,
    onGooglePress,
    googleLoading,
}: {
    visible: boolean;
    onClose: () => void;
    onOpenLogin: () => void;
    onGooglePress: () => void;
    googleLoading: boolean;
}) {
    const { setUserName } = useUser();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const passwordRequirements = getPasswordRequirements(password);

    const handleSignUp = async () => {
        hapticImpact();
        if (!supabase) {
            Alert.alert('Auth unavailable', 'Supabase is not configured. Check your .env.local values.');
            return;
        }

        if (!name.trim()) {
            Alert.alert('Missing name', 'Please enter your name.');
            return;
        }

        if (!validateEmail(email)) {
            Alert.alert('Invalid email', 'Please enter a valid email address.');
            return;
        }

        if (!validatePassword(password)) {
            Alert.alert('Weak password', 'Password must be at least 8 characters and include both letters and numbers.');
            return;
        }

        setLoading(true);
        try {
            const normalizedEmail = email.trim();
            const normalizedName = name.trim();
            const { data, error } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                    data: {
                        full_name: normalizedName,
                        name: normalizedName,
                    },
                },
            });

            if (error) {
                throw error;
            }

            await setUserName(normalizedName);

            if (data.user?.id) {
                const { error: roleInsertError } = await supabase.from('role_requests').insert({
                    user_id: data.user.id,
                    user_email: data.user.email ?? normalizedEmail,
                    current_role: 'Guest',
                    requested_role: 'Guest',
                    status: 'approved',
                });
                if (roleInsertError) {
                    console.warn('Role request seed failed:', roleInsertError.message);
                }
            }

            hapticSuccess();

            if (data.session) {
                Alert.alert('Account created', 'Your account has been created and you are now logged in.');
                setName('');
                setEmail('');
                setPassword('');
                onClose();
                return;
            }

            Alert.alert('Check your inbox', 'Your account was created. Please verify your email, then log in.');
            setName('');
            setEmail('');
            setPassword('');
            onOpenLogin();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to create account.';
            Alert.alert('Signup failed', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Sign Up</Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    onClose();
                                }}>
                                    <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                                </Pressable>
                            </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalIntro}>Create your account with Google or with your name, email, and password.</Text>

                            <Pressable
                                style={[styles.googleAuthBtn, googleLoading && styles.submitBtnDisabled]}
                                onPress={onGooglePress}
                                disabled={googleLoading}
                            >
                                <MaterialCommunityIcons name="google" size={18} color={Colors.light.accentText} />
                                <Text style={styles.googleAuthBtnText}>{googleLoading ? 'Opening Google...' : 'Continue with Google'}</Text>
                            </Pressable>

                            <View style={styles.authDividerRow}>
                                <View style={styles.authDividerLine} />
                                <Text style={styles.authDividerText}>or create with email</Text>
                                <View style={styles.authDividerLine} />
                            </View>

                            <Text style={styles.inputLabel}>NAME</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Alexis"
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={name}
                                onChangeText={setName}
                                maxLength={60}
                            />

                            <Text style={styles.inputLabel}>EMAIL</Text>
                            <TextInput
                                style={[styles.input, email && !validateEmail(email) && styles.inputError]}
                                placeholder="you@example.com"
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {email && !validateEmail(email) && <Text style={styles.errorText}>Invalid email address</Text>}

                            <Text style={styles.inputLabel}>PASSWORD</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Set a password"
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            {password.length > 0 && (
                                <View style={styles.passwordHelpContainer}>
                                    <View style={styles.requirementRow}>
                                        <MaterialCommunityIcons
                                            name={passwordRequirements.hasMinLength ? 'check-circle' : 'check-circle-outline'}
                                            size={14}
                                            color={Colors.light.gold}
                                            style={styles.requirementIcon}
                                        />
                                        <Text style={styles.requirementText}>At least 8 characters</Text>
                                    </View>
                                    <View style={styles.requirementRow}>
                                        <MaterialCommunityIcons
                                            name={passwordRequirements.hasLetter ? 'check-circle' : 'check-circle-outline'}
                                            size={14}
                                            color={Colors.light.gold}
                                            style={styles.requirementIcon}
                                        />
                                        <Text style={styles.requirementText}>At least one letter</Text>
                                    </View>
                                    <View style={styles.requirementRow}>
                                        <MaterialCommunityIcons
                                            name={passwordRequirements.hasNumber ? 'check-circle' : 'check-circle-outline'}
                                            size={14}
                                            color={Colors.light.gold}
                                            style={styles.requirementIcon}
                                        />
                                        <Text style={styles.requirementText}>At least one number</Text>
                                    </View>
                                </View>
                            )}

                            <Pressable
                                style={[styles.submitBtn, (!name.trim() || !email || !validateEmail(email) || !validatePassword(password) || loading) && styles.submitBtnDisabled]}
                                onPress={handleSignUp}
                                disabled={!name.trim() || !email || !validateEmail(email) || !validatePassword(password) || loading}
                            >
                                <Text style={styles.submitText}>{loading ? 'Creating...' : 'Create Account'}</Text>
                            </Pressable>

                            <Pressable onPress={() => {
                                hapticImpact();
                                onOpenLogin();
                            }} style={styles.authSwitchBtn}>
                                <Text style={styles.authSwitchText}>Already have an account? Log In</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function ContactCard({ icon, title, value, onPress }: { icon: any; title: string; value: string; onPress: () => void }) {
    return (
        <Pressable onPress={() => {
            hapticImpact();
            onPress();
        }}>
            <View style={styles.contactCard}>
                <View style={styles.iconCircle}><MaterialCommunityIcons name={icon} size={24} color={Colors.light.gold} /></View>
                <View style={styles.contactInfo}><Text style={styles.contactLabel}>{title}</Text><Text style={styles.contactValue}>{value}</Text></View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(0, 0, 0, 0.2)" />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    safeArea: { flex: 1, paddingHorizontal: Spacing.lg, overflow: 'visible' },
    header: { fontSize: 32, fontFamily: Fonts.header, color: Colors.light.accentText, marginTop: Spacing.md, marginBottom: Spacing.lg },
    profileCard: {
        backgroundColor: Colors.light.surfaceElevated, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.light.borderSubtle,
        padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.lg,
        marginHorizontal: 0,
        overflow: 'visible',
        position: 'relative', // For absolute positioning of menu
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255, 122, 0, 0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 32,
    },
    profileTitle: { color: Colors.light.accentText, fontSize: 18, fontFamily: Fonts.bold, marginBottom: Spacing.md },
    authButtonsRow: {
        width: '100%',
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    signUpBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        gap: 8,
    },
    signUpBtnText: { color: Colors.light.text, fontFamily: Fonts.bold, fontSize: 16 },
    googleAuthBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.4)',
        backgroundColor: Colors.light.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    googleAuthBtnText: { color: Colors.light.accentText, fontFamily: Fonts.bold, fontSize: 15 },
    authDividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.lg,
    },
    authDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.light.borderSubtle,
    },
    authDividerText: {
        marginHorizontal: Spacing.md,
        color: 'rgba(0, 0, 0, 0.45)',
        fontSize: 12,
        fontFamily: Fonts.medium,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    authSwitchBtn: {
        alignSelf: 'center',
        marginTop: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    authSwitchText: {
        color: Colors.light.accentText,
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    authSwitchEmphasis: {
        textDecorationLine: 'underline',
    },
    welcomeText: {
        color: Colors.light.text,
        fontFamily: Fonts.bold,
        fontSize: 20,
        marginTop: Spacing.sm,
    },
    nameInputContainer: { width: '100%', marginTop: Spacing.xl, alignItems: 'center' },
    nameInputLabel: { color: 'rgba(0, 0, 0, 0.4)', fontSize: 11, fontFamily: Fonts.bold, letterSpacing: 1.5, marginBottom: Spacing.sm },
    nameInput: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.medium,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
    },
    roleDisplay: {
        color: 'rgba(0, 0, 0, 0.45)',
        fontSize: 13,
        fontFamily: Fonts.medium,
        marginTop: Spacing.md,
    },
    linkCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.light.surfaceElevated, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.light.borderSubtle,
        padding: Spacing.lg, marginBottom: Spacing.md,
        marginHorizontal: 0,
        overflow: 'visible',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    linkIcon: { fontSize: 24, marginRight: Spacing.md },
    linkInfo: { flex: 1 },
    linkTitle: { color: Colors.light.text, fontSize: 16, fontFamily: Fonts.bold, marginBottom: 2 },
    linkSubtitle: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: Fonts.regular },
    sectionTitle: { color: Colors.light.text, fontSize: 24, fontFamily: Fonts.header, marginTop: Spacing.md, marginBottom: Spacing.md },
    dangerCard: {
        backgroundColor: 'rgba(255, 122, 0, 0.2)', borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.5)',
        padding: Spacing.lg, marginBottom: Spacing.md,
    },
    dangerText: { color: Colors.light.peach, fontSize: 15, fontFamily: Fonts.medium },
    version: { color: 'rgba(0, 0, 0, 0.2)', fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: Spacing.xl },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)', justifyContent: 'flex-end' },
    modalContent: { height: '85%' },
    modalCard: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.xl,
        backgroundColor: Colors.light.surfaceElevated,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    modalTitle: { color: Colors.light.text, fontSize: 28, fontFamily: Fonts.header },
    roleApprovalTitle: {
        flex: 1,
        marginRight: Spacing.md,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalIntro: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 14,
        fontFamily: Fonts.regular,
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    roleApprovalCard: {
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 16,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.2)',
    },
    roleApprovalTopRow: {
        flexDirection: 'column',
        marginBottom: Spacing.sm,
    },
    roleApprovalEmailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleApprovalAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 122, 0, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    roleApprovalEmail: {
        color: Colors.light.text,
        fontSize: 17,
        fontFamily: Fonts.bold,
        flex: 1,
    },
    roleApprovalMetaRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    roleApprovalTimestamp: {
        color: Colors.light.textSecondary,
        fontSize: 12,
    },
    roleApprovalBadge: {
        backgroundColor: 'rgba(255, 122, 0, 0.18)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    roleApprovalBadgeText: {
        color: Colors.light.accentText,
        fontSize: 10,
        fontFamily: Fonts.bold,
        letterSpacing: 1,
    },
    roleApprovalRoleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    roleApprovalRoleBlock: {
        flex: 1,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
    roleApprovalRoleBlockAlt: {
        backgroundColor: 'rgba(255, 122, 0, 0.1)',
    },
    roleApprovalRoleValue: {
        color: Colors.light.text,
        fontSize: 15,
        fontFamily: Fonts.bold,
    },
    roleApprovalActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    roleApprovalBtn: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
    },
    roleApprovalApprove: {
        backgroundColor: '#FF7A00',
        borderColor: '#FF7A00',
    },
    roleApprovalDeny: {
        backgroundColor: 'rgba(255, 122, 0, 0.08)',
        borderColor: 'rgba(255, 122, 0, 0.4)',
    },
    roleApprovalBtnText: {
        color: Colors.light.text,
        fontSize: 13,
        fontFamily: Fonts.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleApprovalBtnTextAlt: {
        color: Colors.light.accentText,
        fontSize: 13,
        fontFamily: Fonts.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    roleApprovalBtnDisabled: {
        opacity: 0.55,
    },
    modalFooter: {
        marginTop: Spacing.xl,
        paddingTop: Spacing.xl,
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderSubtle,
        alignItems: 'center',
    },
    inputLabel: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 11,
        fontFamily: Fonts.bold,
        letterSpacing: 1.5,
        marginBottom: Spacing.md,
        marginTop: Spacing.lg,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: Colors.light.text,
        fontSize: 15,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
    },
    inputError: { borderColor: 'rgba(255, 122, 0, 0.7)', backgroundColor: 'rgba(255, 122, 0, 0.2)' },
    errorText: { color: Colors.light.peach, fontSize: 12, fontFamily: Fonts.regular, marginTop: 4 },
    passwordHelpContainer: { marginTop: 4 },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    requirementIcon: {
        marginRight: 6,
    },
    requirementText: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 12,
        fontFamily: Fonts.regular,
    },
    textArea: { minHeight: 100, textAlignVertical: 'top', paddingTop: 16 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
    },
    chipActive: { backgroundColor: Colors.light.gold, borderColor: Colors.light.gold },
    chipText: { color: 'rgba(0, 0, 0, 0.5)', fontSize: 13, fontFamily: Fonts.medium },
    chipTextActive: { color: Colors.light.text },
    submitBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    submitBtnDisabled: { opacity: 0.5, backgroundColor: 'rgba(255, 122, 0, 0.25)' },
    submitText: { color: Colors.light.text, fontSize: 16, fontFamily: Fonts.bold },

    // Contact Card
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        marginHorizontal: 0,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        backgroundColor: Colors.light.surfaceElevated,
        overflow: 'visible',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contactInfo: { flex: 1 },
    contactLabel: { color: 'rgba(0, 0, 0, 0.35)', fontSize: 11, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
    contactValue: { color: Colors.light.text, fontSize: 15, fontFamily: Fonts.medium },
    ackTitle: { color: Colors.light.accentText, fontSize: 13, fontFamily: Fonts.bold, marginBottom: 8, textAlign: 'center' },
    ackText: { color: 'rgba(0, 0, 0, 0.4)', fontSize: 11, fontFamily: Fonts.regular, lineHeight: 18, textAlign: 'center' },
    copyright: { color: 'rgba(0, 0, 0, 0.2)', fontSize: 11, fontFamily: Fonts.regular },

    // Success Overlay Styles
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 32,
    },
    successIconContainer: {
        alignItems: 'center',
    },
    successText: {
        color: Colors.light.text,
        fontSize: 24,
        fontFamily: Fonts.bold,
        marginTop: 16,
    },
    successSubtext: {
        color: 'rgba(0, 0, 0, 0.6)',
        fontSize: 14,
        fontFamily: Fonts.regular,
        marginTop: 8,
    },

    // Acknowledgment Card
    ackCard: {
        padding: Spacing.xl,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.35)',
        alignItems: 'center',
        marginVertical: Spacing.xl,
        backgroundColor: Colors.light.surfaceElevated,
    },
    ackIcon: {
        marginBottom: 12,
        opacity: 0.8,
    },
    roleContainer: {
        width: '100%',
        marginTop: Spacing.lg,
        alignItems: 'center',
    },
    roleChipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginTop: Spacing.md,
    },
    roleRequestCards: {
        marginTop: Spacing.sm,
        gap: Spacing.md,
    },
    roleRequestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        backgroundColor: Colors.light.surfaceElevated,
        paddingVertical: 14,
        paddingHorizontal: 14,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    roleRequestCardActive: {
        borderColor: Colors.light.gold,
        backgroundColor: 'rgba(255, 122, 0, 0.12)',
    },
    roleRequestIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 122, 0, 0.2)',
        marginRight: 12,
    },
    roleRequestContent: {
        flex: 1,
        marginRight: 8,
    },
    roleRequestTitle: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 2,
    },
    roleRequestSubtitle: {
        color: Colors.light.textSecondary,
        fontSize: 12,
        fontFamily: Fonts.regular,
        lineHeight: 18,
    },
    menuBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
        zIndex: 20,
    },
    menuDropdown: {
        position: 'absolute',
        top: 48,
        right: 16,
        backgroundColor: Colors.light.surface,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        minWidth: 170,
        gap: 2,
        zIndex: 30, // Higher than overlay
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 8,
    },
    menuOverlay: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -1000,
        bottom: -1000,
        zIndex: 10,
        backgroundColor: 'transparent',
    },
    menuText: {
        color: Colors.light.peach,
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    menuRequestText: {
        color: Colors.light.accentText,
    },
    confirmBody: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmHeading: {
        color: Colors.light.text,
        fontSize: 24,
        fontFamily: Fonts.bold,
        textAlign: 'center',
    },
    confirmSubheading: {
        color: 'rgba(0, 0, 0, 0.52)',
        fontSize: 14,
        fontFamily: Fonts.regular,
        lineHeight: 22,
        textAlign: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.xl,
        maxWidth: 320,
    },
    confirmRoleCard: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        backgroundColor: Colors.light.surfaceElevated,
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    confirmRoleIconWrap: {
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 122, 0, 0.2)',
        marginBottom: Spacing.md,
    },
    confirmRoleLabel: {
        color: Colors.light.text,
        fontSize: 22,
        fontFamily: Fonts.header,
        textAlign: 'center',
    },
    confirmRoleDescription: {
        color: Colors.light.textSecondary,
        fontSize: 13,
        fontFamily: Fonts.regular,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: Spacing.sm,
    },
    confirmRoleText: {
        color: Colors.light.accentText,
        fontFamily: Fonts.bold,
    },
    confirmFooter: {
        paddingBottom: Spacing.sm,
    },
    swipeTrack: {
        height: 87,
        borderRadius: 44,
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.4)',
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingHorizontal: 8,
        position: 'relative',
    },
    swipeTrackDisabled: {
        opacity: 0.72,
    },
    swipeHintRow: {
        position: 'absolute',
        left: 102,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    swipeLabel: {
        marginLeft: 4,
        color: 'rgba(0, 0, 0, 0.45)',
        fontSize: 15,
        fontFamily: Fonts.medium,
    },
    swipeKnob: {
        position: 'absolute',
        top: 7,
        backgroundColor: Colors.light.gold,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 4,
        elevation: 3,
    },
});
