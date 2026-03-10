import { AppBackground } from '@/components/AppBackground';
import { ReloadOverlay } from '@/components/ReloadOverlay';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Events', 'Food', 'Culture'];
const POST_TYPES = ['Event', 'Food', 'Culture'] as const;
type PostType = typeof POST_TYPES[number];

const COMMUNITY_POSTS = [
    // ... (keep existing posts)
    {
        id: '1',
        user: 'Melbourne Diwali Team',
        date: 'December 2025',
        content: 'Recap of 2025! What an incredible year of light and community. Stay tuned for 2026 plans!',
        category: 'Events',
        url: 'https://newsletter.melbournediwali.com.au/dec-25'
    },
    {
        id: '2',
        user: 'Melbourne Diwali Team',
        date: 'November 2025',
        content: 'What an incredible journey we\'ve shared! On October 11th, 2025, we came together at Marvel Stadium to celebrate the Festival of Lights in a style never seen before.',
        category: 'Events',
        url: 'https://newsletter.melbournediwali.com.au/november'
    },
    {
        id: '3',
        user: 'Melbourne Diwali Team',
        date: 'October 2025',
        content: 'The festive guide for Melbourne Diwali at Marvel Stadium Square is here! Check out the map and schedule.',
        category: 'Events',
        url: 'https://newsletter.melbournediwali.com.au/october'
    },
    {
        id: '4',
        user: 'Melbourne Diwali Team',
        date: 'September 2025',
        content: 'Save the date! September highlights upcoming festivities, community stories, and cultural celebrations across Melbourne.',
        category: 'Culture',
        url: 'https://newsletter.melbournediwali.com.au/sept-25'
    },
    {
        id: '5',
        user: 'Melbourne Diwali Team',
        date: 'August 2025',
        content: 'Monthly news and updates highlighting the final preparations for Melbourne Diwali 2025.',
        category: 'All',
        url: 'https://newsletter.melbournediwali.com.au/august'
    },
    {
        id: '6',
        user: 'Melbourne Diwali Team',
        date: 'July 2025',
        content: 'Amazing updates on how Melbourne Diwali at Marvel Stadium Square is shaping the community through inclusive celebrations.',
        category: 'Local',
        url: 'https://newsletter.melbournediwali.com.au/july'
    },
    {
        id: '7',
        user: 'Melbourne Diwali Team',
        date: 'June 2025',
        content: 'The launch of Melbourne Diwali newsletter! Follow us for monthly developments and behind-the-scenes festival prep.',
        category: 'All',
        url: 'https://newsletter.melbournediwali.com.au/june'
    }
];

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.92);
        hapticSelection();
    };
    const handlePressOut = () => { scale.value = withSpring(1); };

    return (
        <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.chip, active && styles.chipActive, animatedStyle]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Animated.View>
        </Pressable>
    );
}

function CommunityPost({ post, index }: { post: typeof COMMUNITY_POSTS[0]; index: number }) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98);
        hapticImpact();
    };
    const handlePressOut = () => { scale.value = withSpring(1); };

    const handlePress = () => {
        hapticImpact();
        if (post.url) { WebBrowser.openBrowserAsync(post.url); }
    };

    const categoryColors: Record<string, string> = {
        'Events': Colors.light.gold,
        'Food': '#FF7A00', // Lime Green
        'Culture': '#FF7A00', // Lavender
        'All': 'rgba(255, 122, 0, 0.25)'
    };

    const headerColor = categoryColors[post.category] || categoryColors['All'];

    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <Animated.View style={[styles.postCard, animatedStyle]}>
                <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                    <View style={styles.postHeader}>
                        <View style={[styles.avatar, { backgroundColor: headerColor + '20', borderColor: headerColor + '40', borderWidth: 1 }]}>
                            <Text style={styles.avatarText}>🪔</Text>
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={[styles.userName, { color: headerColor }]}>{post.user}</Text>
                            <Text style={styles.postDate}>{post.date}</Text>
                        </View>
                    </View>
                    <Text style={styles.postContent}>{post.content}</Text>
                    <View style={styles.postFooter}>
                        <Pressable style={styles.readMoreBtn} onPress={handlePress}>
                            <Text style={styles.readMoreText}>Read Newsletter</Text>
                            <MaterialCommunityIcons name="arrow-right" size={16} color={Colors.light.gold} />
                        </Pressable>
                    </View>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

export default function CommunityScreen() {
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isExpanded = viewportWidth >= 1024;
    const appFrameWidth = isExpanded
        ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
        : viewportWidth;
    const { userName, userRole } = useUser();
    const [activeFilter, setActiveFilter] = useState('All');
    const [isModalVisible, setModalVisible] = useState(false);
    const [isDraftsVisible, setDraftsVisible] = useState(false);
    const [postType, setPostType] = useState<PostType>('Event');
    const [postTitle, setPostTitle] = useState('');
    const [postDesc, setPostDesc] = useState('');
    const { refreshing, onRefresh } = useReloadOnRefresh();

    const handleCreatePost = () => {
        hapticImpact();
        console.log('\n--- NEW COMMUNITY POST ---');
        console.log(`Author:      ${userName || 'N/A'}`);
        console.log(`Type:        ${postType}`);
        console.log(`Title:       ${postTitle}`);
        console.log(`Description: ${postDesc}`);
        console.log(`Timestamp:   ${new Date().toISOString()}`);
        console.log('---------------------------\n');

        // Reset and close
        setPostTitle('');
        setPostDesc('');
        setPostType('Event');
        setModalVisible(false);
        hapticSuccess();
    };

    return (
        <View style={styles.container}>
            <AppBackground />
            <ReloadOverlay visible={refreshing} />
            <SafeAreaView
                style={[styles.safeArea, isExpanded && { width: appFrameWidth, alignSelf: 'center' }]}
                edges={['top']}
            >
                <Text style={styles.header}>Community</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterRow}
                    contentContainerStyle={styles.filterContent}
                >
                    {FILTERS.map((f) => (
                        <FilterChip
                            key={f}
                            label={f}
                            active={activeFilter === f}
                            onPress={() => {
                                hapticSelection();
                                setActiveFilter(f);
                            }}
                        />
                    ))}
                </ScrollView>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.feedContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="transparent"
                            colors={['transparent']}
                        />
                    }
                >
                    {COMMUNITY_POSTS.map((post, index) => (
                        <CommunityPost key={post.id} post={post} index={index} />
                    ))}

                    <Text style={styles.emptyText}>You&apos;re all caught up!</Text>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>

            {/* Create Post Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setModalVisible(false);
                }}
            >
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalCard}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Create Post</Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setModalVisible(false);
                                }}>
                                    <View style={styles.closeBtn}>
                                        <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                                    </View>
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.inputLabel}>CHOOSE TYPE</Text>
                                <View style={styles.typeRow}>
                                    {POST_TYPES.map((type) => (
                                        <Pressable
                                            key={type}
                                            onPress={() => {
                                                hapticSelection();
                                                setPostType(type);
                                            }}
                                            style={[styles.typeBtn, postType === type && styles.typeBtnActive]}
                                        >
                                            <Text style={[styles.typeBtnText, postType === type && styles.typeBtnTextActive]}>
                                                {type}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Text style={styles.inputLabel}>POST TITLE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="What's happening?"
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={postTitle}
                                    onChangeText={setPostTitle}
                                />

                                <Text style={styles.inputLabel}>DESCRIPTION</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Tell us more about it..."
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={postDesc}
                                    onChangeText={setPostDesc}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />

                                <Pressable
                                    style={[styles.postBtn, (!postTitle || !postDesc) && styles.postBtnDisabled]}
                                    onPress={handleCreatePost}
                                    disabled={!postTitle || !postDesc}
                                >
                                    <Text style={styles.postBtnText}>Post to Community</Text>
                                </Pressable>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Draft Drops Modal (Admin) */}
            <Modal
                visible={isDraftsVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setDraftsVisible(false);
                }}
            >
                <View style={[styles.modalOverlay, styles.draftsOverlay]}>
                    <View style={styles.draftsCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Draft Drops</Text>
                            <Pressable onPress={() => {
                                hapticImpact();
                                setDraftsVisible(false);
                            }}>
                                <View style={styles.closeBtn}>
                                    <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                                </View>
                            </Pressable>
                        </View>
                        <Text style={styles.draftsEmptyTitle}>No drafts yet</Text>
                        <Text style={styles.draftsEmptyText}>
                            Draft drops submitted by the community will appear here for approval.
                        </Text>
                    </View>
                </View>
            </Modal>

            {/* FAB - Hidden for Guest and Stage Manager */}
            {userRole && !['Guest', 'Stage Manager'].includes(userRole) && (
                <Pressable
                    style={styles.fab}
                    onPress={() => {
                        hapticSuccess();
                        setModalVisible(true);
                    }}
                >
                    <MaterialCommunityIcons name="plus" size={32} color={Colors.light.text} />
                </Pressable>
            )}

            {/* Admin Drafts Button */}
            {userRole === 'Admin' && (
                <Pressable
                    style={styles.adminFab}
                    onPress={() => {
                        hapticSelection();
                        setDraftsVisible(true);
                    }}
                >
                    <MaterialCommunityIcons name="clipboard-text-outline" size={26} color={Colors.light.gold} />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    safeArea: { flex: 1 },
    header: {
        fontSize: 32,
        color: Colors.light.accentText,
        fontFamily: Fonts.header,
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg
    },
    filterRow: {
        flexGrow: 0,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        minHeight: 48,
    },
    filterContent: {
        paddingRight: Spacing.lg,
        paddingVertical: 4,
        alignItems: 'center',
    },
    feedContent: { paddingHorizontal: Spacing.lg },
    chip: {
        paddingHorizontal: 16,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        overflow: 'visible',
    },
    chipActive: { backgroundColor: '#FF7A00', borderColor: '#FF7A00' },
    chipText: {
        color: Colors.light.text,
        fontSize: 14,
        fontFamily: Fonts.medium,
        textAlign: 'center',
        includeFontPadding: false,
    },
    chipTextActive: { color: Colors.light.text },

    // Post Card Styles
    postCard: {
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 20 },
    headerInfo: { flex: 1 },
    userName: { color: Colors.light.text, fontSize: 15, fontFamily: Fonts.bold },
    postDate: { color: Colors.light.textSecondary, fontSize: 12, fontFamily: Fonts.regular, marginTop: 1 },
    postContent: {
        color: 'rgba(0, 0, 0, 0.9)',
        fontSize: 15,
        fontFamily: Fonts.regular,
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    postFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderSubtle,
        paddingTop: Spacing.md,
    },
    readMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    readMoreText: {
        color: Colors.light.accentText,
        fontSize: 14,
        fontFamily: Fonts.medium,
    },

    emptyText: { color: 'rgba(0, 0, 0, 0.25)', fontSize: 14, textAlign: 'center', marginTop: Spacing.xl },

    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
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
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputLabel: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 11,
        fontFamily: Fonts.bold,
        letterSpacing: 1.5,
        marginBottom: Spacing.md,
        marginTop: Spacing.lg,
    },
    typeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
    typeBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 122, 0, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.35)',
        flex: 1,
        alignItems: 'center',
    },
    typeBtnActive: {
        backgroundColor: '#FF7A00',
        borderColor: '#FF7A00',
    },
    typeBtnText: { color: Colors.light.accentText, fontSize: 13, fontFamily: Fonts.bold },
    typeBtnTextActive: { color: Colors.light.text },
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
    textArea: {
        minHeight: 120,
        paddingTop: 16,
    },
    postBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: Spacing.xl * 1.5,
        shadowColor: Colors.light.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    postBtnDisabled: {
        opacity: 0.3,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        shadowOpacity: 0.05,
    },
    postBtnText: { color: Colors.light.text, fontSize: 16, fontFamily: Fonts.bold },

    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.light.gold,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    adminFab: {
        position: 'absolute',
        bottom: 96,
        right: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    draftsOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    draftsCard: {
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.xl,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    draftsEmptyTitle: {
        color: Colors.light.text,
        fontSize: 18,
        fontFamily: Fonts.bold,
        marginBottom: Spacing.sm,
    },
    draftsEmptyText: {
        color: 'rgba(0, 0, 0, 0.5)',
        fontSize: 14,
        fontFamily: Fonts.regular,
        lineHeight: 20,
    },
});
