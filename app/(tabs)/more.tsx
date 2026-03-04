import { AppBackground } from '@/components/AppBackground';
import { ReloadOverlay } from '@/components/ReloadOverlay';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as AuthSession from 'expo-auth-session';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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
const ROLES = ['Admin', 'Vendor', 'Stage Manager', 'Performer', 'Guest'];
const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

WebBrowser.maybeCompleteAuthSession();

function SelectChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const handlePressIn = () => { scale.value = withSpring(0.92); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.chip, active && styles.chipActive, animatedStyle]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
}



export default function MoreScreen() {
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isExpanded = viewportWidth >= 1024;
    const appFrameWidth = isExpanded
        ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
        : viewportWidth;
    const { userName, userAvatarUrl, userRole, logout } = useUser();
    const { openSignup } = useLocalSearchParams();

    // Modal States
    const [isVolunteerVisible, setVolunteerVisible] = useState(false);
    const [isContactVisible, setContactVisible] = useState(false);
    const [isSignUpVisible, setSignUpVisible] = useState(false);
    const [isSuccessVisible, setSuccessVisible] = useState(false);
    const [isMenuVisible, setMenuVisible] = useState(false);
    const [isBTSVisible, setBTSVisible] = useState(false);
    const [isBTSReviewVisible, setBTSReviewVisible] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { refreshing, onRefresh } = useReloadOnRefresh();

    const BTS_ALLOWED_ROLES = ['Admin', 'Vendor', 'Stage Manager', 'Performer'];
    const isBTSAllowed = userRole && BTS_ALLOWED_ROLES.includes(userRole);
    const isVendor = userRole === 'Vendor';
    const isPerformerOrStageManager = userRole === 'Performer' || userRole === 'Stage Manager';

    const router = useRouter(); // Create local router instance

    React.useEffect(() => {
        if (openSignup === 'true') {
            setSignUpVisible(true);
            // Reset the param so it can be triggered again
            router.setParams({ openSignup: undefined });
        }
    }, [openSignup, router]);

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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        Haptics.selectionAsync();
        if (id === '3') setVolunteerVisible(true);
        else if (id === '4') setContactVisible(true);
    };

    // Contact Actions
    const handleMap = () => {
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

        setGoogleLoading(true);
        try {
            const redirectTo = AuthSession.makeRedirectUri({
                scheme: 'saras',
                path: 'more',
                preferLocalhost: true,
            });
            console.log('[Google OAuth] redirectTo:', redirectTo);
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                throw error;
            }

            if (!data?.url) {
                throw new Error('Missing OAuth redirect URL from Supabase.');
            }

            if (Platform.OS === 'web') {
                await Linking.openURL(data.url);
                return;
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
                        {userRole ? (
                            <Text style={styles.welcomeText}>Welcome, {firstName}</Text>
                        ) : (
                            <View style={styles.authButtonsRow}>
                                <Pressable style={styles.signUpBtn} onPress={() => setSignUpVisible(true)}>
                                    <Text style={styles.signUpBtnText}>Sign Up / Log In</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.googleBtn, googleLoading && styles.submitBtnDisabled]}
                                    onPress={handleGoogleSignIn}
                                    disabled={googleLoading}
                                >
                                    <MaterialCommunityIcons name="google" size={18} color={Colors.light.accentText} />
                                    <Text style={styles.googleBtnText}>{googleLoading ? 'Opening...' : 'Google'}</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Name Input */}


                        <Text style={styles.roleDisplay}>Role: <Text style={{ color: Colors.light.accentText }}>{userRole || 'Guest'}</Text></Text>

                        {/* Top Right Menu Button */}
                        <Pressable
                            style={styles.menuBtn}
                            onPress={() => setMenuVisible(!isMenuVisible)}
                            hitSlop={10}
                        >
                            <MaterialCommunityIcons name="dots-horizontal" size={24} color="rgba(0, 0, 0, 0.4)" />
                        </Pressable>

                        {/* Menu Overlay & Dropdown */}
                        {isMenuVisible && (
                            <>
                                <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)} />
                                <Pressable style={styles.menuDropdown} onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    logout();
                                    setMenuVisible(false);
                                }}>
                                    <MaterialCommunityIcons name="logout" size={18} color={Colors.light.peach} />
                                    <Text style={styles.menuText}>Logout</Text>
                                </Pressable>
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
                            onPress={() => Linking.openURL('https://www.google.com/search?q=vendors')}
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
                            onPress={() => Linking.openURL('https://chat.whatsapp.com/FGZo1aXlcpUB88DIZXw8Ub?mode=gi_t')}
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
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            <Modal visible={isVolunteerVisible} animationType="slide" transparent={true} onRequestClose={() => setVolunteerVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Join the Team</Text>
                                <Pressable onPress={() => setVolunteerVisible(false)}>
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
            <Modal visible={isContactVisible} animationType="slide" transparent={true} onRequestClose={() => setContactVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Contact Us</Text>
                                <Pressable onPress={() => setContactVisible(false)}>
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

            {/* Sign Up Modal */}
            <SignUpModal
                visible={isSignUpVisible}
                onClose={() => setSignUpVisible(false)}
            />

            {/* BTS Submission Modal */}
            <BTSModal
                visible={isBTSVisible}
                onClose={() => setBTSVisible(false)}
            />

            {/* BTS Review Modal (Admin) */}
            <BTSReviewModal
                visible={isBTSReviewVisible}
                onClose={() => setBTSReviewVisible(false)}
            />
        </View>
    );
}

function BTSModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { userName, userRole } = useUser();
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!link.trim()) return;
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

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
                            <Pressable onPress={onClose}>
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
                            <Pressable onPress={onClose}>
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

function SignUpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { setUserRole, setUserName, userName } = useUser();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRole, setSelectedRole] = useState('Guest');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        setLoading(true);

        console.log('\n\n' + '='.repeat(50));
        console.log(`NEW SIGNUP REQUEST RECEIVED`);
        console.log('='.repeat(50));
        console.log(`User:  ${userName}`);
        console.log(`Email: ${email}`);
        console.log(`Pass:  ${password}`);
        console.log(`Role:  ${selectedRole}`);
        console.log('-'.repeat(50) + '\n');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setUserRole(selectedRole);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alert(`Approved. You are now a ${selectedRole}.`);

        setLoading(false);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sign Up</Text>
                            <Pressable onPress={onClose}>
                                <View style={styles.modalCloseBtn}><MaterialCommunityIcons name="close" size={20} color={Colors.light.text} /></View>
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalIntro}>Create an account to unlock more features.</Text>

                            <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Alexis"
                                placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                value={userName}
                                onChangeText={setUserName}
                                maxLength={20}
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

                            <Text style={styles.inputLabel}>SELECT YOUR ROLE</Text>
                            <View style={styles.roleChipContainer}>
                                {ROLES.map((role) => (
                                    <SelectChip
                                        key={role}
                                        label={role}
                                        active={selectedRole === role}
                                        onPress={() => setSelectedRole(role)}
                                    />
                                ))}
                            </View>

                            <Pressable
                                style={[styles.submitBtn, (!userName || !email || !validateEmail(email) || !password) && styles.submitBtnDisabled]}
                                onPress={handleSignUp}
                                disabled={!userName || !email || !validateEmail(email) || !password || loading}
                            >
                                <Text style={styles.submitText}>{loading ? 'Creating...' : 'Create Account'}</Text>
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
        <Pressable onPress={onPress}>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    signUpBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 12,
        paddingHorizontal: 24,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    signUpBtnText: { color: Colors.light.text, fontFamily: Fonts.bold, fontSize: 16 },
    googleBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.4)',
        backgroundColor: Colors.light.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    googleBtnText: { color: Colors.light.accentText, fontFamily: Fonts.bold, fontSize: 15 },
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
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 122, 0, 0.35)',
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 30, // Higher than overlay
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
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
});
