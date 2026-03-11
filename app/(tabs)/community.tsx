import { AppBackground } from '@/components/AppBackground';
import { ReloadOverlay } from '@/components/ReloadOverlay';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Events', 'Food', 'Culture'];
type CommunityPost = {
    id: string;
    user: string;
    date: string;
    content: string;
    category: string;
    url?: string;
    title?: string;
    avatarUrl?: string | null;
    imageUrl?: string | null;
};

type DropRow = {
    id: string;
    user_id: string;
    user_email: string | null;
    user_name: string | null;
    user_role: string | null;
    user_avatar_url: string | null;
    title: string;
    description: string;
    image_url: string | null;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
};

const COMMUNITY_POSTS: CommunityPost[] = [];

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

function CommunityPost({ post, index }: { post: CommunityPost; index: number }) {
    const scale = useSharedValue(1);
    const [detailVisible, setDetailVisible] = useState(false);
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
        setDetailVisible(true);
    };

    const categoryColors: Record<string, string> = {
        'Events': Colors.light.gold,
        'Food': '#FF7A00', // Lime Green
        'Culture': '#FF7A00', // Lavender
        'Drops': Colors.light.accentText,
        'All': 'rgba(255, 122, 0, 0.25)'
    };

    const headerColor = categoryColors[post.category] || categoryColors['All'];

    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <Animated.View style={[styles.postCard, animatedStyle]}>
                <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
                    <View style={styles.postHeader}>
                        <View style={[styles.avatar, { backgroundColor: headerColor + '20', borderColor: headerColor + '40', borderWidth: 1 }]}>
                            {post.avatarUrl ? (
                                <Image source={{ uri: post.avatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>🪔</Text>
                            )}
                        </View>
                        <View style={styles.headerInfo}>
                            <Text style={[styles.userName, { color: headerColor }]}>{post.user}</Text>
                            <Text style={styles.postDate}>{post.date}</Text>
                        </View>
                    </View>
                    {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
                    {post.imageUrl ? (
                        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                    ) : null}
                    <Text style={styles.postContent}>{post.content}</Text>
                    <View style={styles.postFooter} />
                </Pressable>
            </Animated.View>

            <Modal
                visible={detailVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                    hapticImpact();
                    setDetailVisible(false);
                }}
            >
                <View style={[styles.modalOverlay, styles.detailOverlay]}>
                    <View style={styles.detailCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Drop Details</Text>
                            <Pressable onPress={() => {
                                hapticImpact();
                                setDetailVisible(false);
                            }}>
                                <View style={styles.closeBtn}>
                                    <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
                                </View>
                            </Pressable>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.detailHeaderRow}>
                                <View style={[styles.avatar, styles.detailAvatar]}>
                                    {post.avatarUrl ? (
                                        <Image source={{ uri: post.avatarUrl }} style={styles.avatarImage} />
                                    ) : (
                                        <Text style={styles.avatarText}>🪔</Text>
                                    )}
                                </View>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.detailUserName}>{post.user}</Text>
                                    <Text style={styles.postDate}>{post.date}</Text>
                                </View>
                            </View>

                            {post.title ? <Text style={styles.detailTitleText}>{post.title}</Text> : null}
                            {post.imageUrl ? (
                                <Image source={{ uri: post.imageUrl }} style={styles.detailImage} />
                            ) : null}
                            <Text style={styles.detailBodyText}>{post.content}</Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Animated.View>
    );
}

export default function CommunityScreen() {
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isExpanded = viewportWidth >= 1024;
    const appFrameWidth = isExpanded
        ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
        : viewportWidth;
    const { userName, userRole, userAvatarUrl } = useUser();
    const [activeFilter, setActiveFilter] = useState('All');
    const [isModalVisible, setModalVisible] = useState(false);
    const [isDraftsVisible, setDraftsVisible] = useState(false);
    const { refreshing, onRefresh } = useReloadOnRefresh();

    const [approvedDropPosts, setApprovedDropPosts] = useState<CommunityPost[]>([]);
    const [dropsLoading, setDropsLoading] = useState(false);
    const [dropsError, setDropsError] = useState('');

    const [draftDrops, setDraftDrops] = useState<DropRow[]>([]);
    const [draftDropsLoading, setDraftDropsLoading] = useState(false);
    const [draftDropsError, setDraftDropsError] = useState('');
    const [draftDropBusyIds, setDraftDropBusyIds] = useState<Record<string, boolean>>({});

    const [dropTitle, setDropTitle] = useState('');
    const [dropDescription, setDropDescription] = useState('');
    const [dropImageUrl, setDropImageUrl] = useState('');
    const [dropImageName, setDropImageName] = useState('');
    const [dropImageType, setDropImageType] = useState('image/jpeg');
    const [dropImageBase64, setDropImageBase64] = useState<string | null>(null);
    const [dropImageBlob, setDropImageBlob] = useState<Blob | null>(null);
    const [dropImageObjectUrl, setDropImageObjectUrl] = useState<string | null>(null);
    const [dropStartDate, setDropStartDate] = useState('');
    const [dropEndDate, setDropEndDate] = useState('');
    const [dropLocation, setDropLocation] = useState('');

    const resetDropForm = () => {
        setDropTitle('');
        setDropDescription('');
        setDropImageUrl('');
        setDropImageName('');
        setDropImageType('image/jpeg');
        setDropImageBase64(null);
        setDropImageBlob(null);
        if (dropImageObjectUrl) {
            URL.revokeObjectURL(dropImageObjectUrl);
            setDropImageObjectUrl(null);
        }
        setDropStartDate('');
        setDropEndDate('');
        setDropLocation('');
    };

    const base64ToUint8Array = (base64: string) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let outputLength = base64.length * 3 / 4;
        if (base64[base64.length - 1] === '=') outputLength--;
        if (base64[base64.length - 2] === '=') outputLength--;

        const bytes = new Uint8Array(outputLength | 0);
        let buffer = 0;
        let bits = 0;
        let index = 0;

        for (let i = 0; i < base64.length; i += 1) {
            const value = chars.indexOf(base64.charAt(i));
            if (value < 0) continue;
            buffer = (buffer << 6) | value;
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                bytes[index++] = (buffer >> bits) & 0xff;
            }
        }
        return bytes;
    };

    const loadApprovedDrops = async () => {
        if (!supabase) {
            setDropsError('Supabase is not configured.');
            return;
        }
        setDropsLoading(true);
        setDropsError('');
        const { data, error } = await supabase
            .from('drops')
            .select('id, user_email, user_name, user_avatar_url, title, description, image_url, start_date, end_date, location, created_at')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            setDropsError('Unable to load drops.');
            setDropsLoading(false);
            return;
        }

        const dropPosts = (data as DropRow[] | null)?.map((drop) => {
            const metaParts: string[] = [];
            if (drop.location) metaParts.push(`Location: ${drop.location}`);
            if (drop.start_date || drop.end_date) {
                metaParts.push(`Dates: ${drop.start_date || '—'} → ${drop.end_date || '—'}`);
            }
            const meta = metaParts.length ? `\n${metaParts.join(' · ')}` : '';

            return {
                id: `drop-${drop.id}`,
                user: drop.user_name || drop.user_email || 'Community',
                date: new Date(drop.created_at).toLocaleDateString(),
                title: drop.title,
                content: `${drop.description}${meta}`,
                category: 'Drops',
                avatarUrl: drop.user_avatar_url || null,
                imageUrl: drop.image_url || null,
            };
        }) ?? [];

        setApprovedDropPosts(dropPosts);
        setDropsLoading(false);
    };

    const loadDraftDrops = async () => {
        if (!supabase) {
            setDraftDropsError('Supabase is not configured.');
            return;
        }
        setDraftDropsLoading(true);
        setDraftDropsError('');
        const { data, error } = await supabase
            .from('drops')
            .select('id, user_email, user_name, user_role, user_avatar_url, title, description, image_url, start_date, end_date, location, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            setDraftDropsError('Unable to load draft drops.');
            setDraftDropsLoading(false);
            return;
        }

        setDraftDrops((data as DropRow[]) ?? []);
        setDraftDropsLoading(false);
    };

    const handleSubmitDrop = async () => {
        hapticImpact();
        if (!supabase) {
            Alert.alert('Submission unavailable', 'Supabase is not configured.');
            return;
        }
        if (!dropTitle.trim() || !dropDescription.trim()) {
            Alert.alert('Missing info', 'Please add a title and description.');
            return;
        }
        if (dropStartDate && !isValidDate(dropStartDate)) {
            Alert.alert('Invalid from date', 'Use YYYY-MM-DD format.');
            return;
        }
        if (dropEndDate && !isValidDate(dropEndDate)) {
            Alert.alert('Invalid till date', 'Use YYYY-MM-DD format.');
            return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
            Alert.alert('Auth required', 'Please log in to submit a drop.');
            return;
        }

        let imageUrl: string | null = null;
        if (dropImageBlob || dropImageBase64) {
            try {
                const extension = dropImageName.split('.').pop() || 'jpg';
                const fileName = `drop_${Date.now()}.${extension}`;
                const path = `${userData.user.id}/${fileName}`;

                if (Platform.OS === 'web' && dropImageBlob) {
                    const { error: uploadError } = await supabase
                        .storage
                        .from('drops')
                        .upload(path, dropImageBlob, { contentType: dropImageType || 'image/jpeg' });

                    if (uploadError) {
                        Alert.alert('Image upload failed', uploadError.message);
                        return;
                    }
                } else {
                    if (!dropImageBase64) {
                        Alert.alert('Image upload failed', 'Image data missing.');
                        return;
                    }
                    const bytes = base64ToUint8Array(dropImageBase64);
                    const { error: uploadError } = await supabase
                        .storage
                        .from('drops')
                        .upload(path, bytes, { contentType: dropImageType || 'image/jpeg' });

                    if (uploadError) {
                        Alert.alert('Image upload failed', uploadError.message);
                        return;
                    }
                }

                const { data: publicUrl } = supabase.storage.from('drops').getPublicUrl(path);
                imageUrl = publicUrl?.publicUrl ?? null;
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to upload image.';
                Alert.alert('Image upload failed', message);
                return;
            }
        }

        const { error } = await supabase.from('drops').insert({
            user_id: userData.user.id,
            user_email: userData.user.email ?? null,
            user_name: userName || userData.user.email || 'Community',
            user_role: userRole || 'Guest',
            user_avatar_url: userAvatarUrl || null,
            title: dropTitle.trim(),
            description: dropDescription.trim(),
            image_url: imageUrl,
            start_date: dropStartDate.trim() || null,
            end_date: dropEndDate.trim() || null,
            location: dropLocation.trim() || null,
            status: 'pending',
        });

        if (error) {
            Alert.alert('Submission failed', error.message);
            return;
        }

        hapticSuccess();
        resetDropForm();
        setModalVisible(false);
        Alert.alert('Drop submitted', 'Your drop was sent for admin approval.');
    };

    const setDraftDropBusy = (id: string, busy: boolean) => {
        setDraftDropBusyIds((prev) => ({ ...prev, [id]: busy }));
    };

    const handleApproveDrop = async (drop: DropRow) => {
        if (!supabase || draftDropBusyIds[drop.id]) return;
        setDraftDropBusy(drop.id, true);
        const { error } = await supabase
            .from('drops')
            .update({ status: 'approved' })
            .eq('id', drop.id);

        if (error) {
            Alert.alert('Approval failed', error.message);
        } else {
            hapticSuccess();
            setDraftDrops((prev) => prev.filter((item) => item.id !== drop.id));
            loadApprovedDrops();
        }
        setDraftDropBusy(drop.id, false);
    };

    const handleDenyDrop = async (drop: DropRow) => {
        if (!supabase || draftDropBusyIds[drop.id]) return;
        setDraftDropBusy(drop.id, true);
        const { error } = await supabase
            .from('drops')
            .update({ status: 'rejected' })
            .eq('id', drop.id);

        if (error) {
            Alert.alert('Denial failed', error.message);
        } else {
            hapticImpact();
            setDraftDrops((prev) => prev.filter((item) => item.id !== drop.id));
        }
        setDraftDropBusy(drop.id, false);
    };

    useEffect(() => {
        loadApprovedDrops();
    }, []);

    useEffect(() => {
        if (isDraftsVisible) {
            loadDraftDrops();
        }
    }, [isDraftsVisible]);

    const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    const isDropFormValid = !!dropTitle.trim() && !!dropDescription.trim();

    const handlePickImage = async () => {
        hapticSelection();
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return;
                if (dropImageObjectUrl) {
                    URL.revokeObjectURL(dropImageObjectUrl);
                }
                const objectUrl = URL.createObjectURL(file);
                setDropImageObjectUrl(objectUrl);
                setDropImageUrl(objectUrl);
                setDropImageName(file.name || `drop_${Date.now()}.jpg`);
                setDropImageType(file.type || 'image/jpeg');
                setDropImageBlob(file);
                setDropImageBase64(null);
            };
            input.click();
            return;
        }

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission needed', 'Please allow photo access to attach an image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            base64: true,
        });

        if (result.canceled || !result.assets?.length) return;

        const asset = result.assets[0];
        setDropImageUrl(asset.uri);
        setDropImageName(asset.fileName || `drop_${Date.now()}.jpg`);
        setDropImageType(asset.mimeType || 'image/jpeg');
        setDropImageBlob(null);
        if (dropImageObjectUrl) {
            URL.revokeObjectURL(dropImageObjectUrl);
            setDropImageObjectUrl(null);
        }

        if (asset.base64) {
            setDropImageBase64(asset.base64);
        } else {
            try {
                const fileBase64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                setDropImageBase64(fileBase64);
            } catch (error) {
                console.warn('Failed to read image file', error);
                setDropImageBase64(null);
            }
        }
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
                    {approvedDropPosts.map((post, index) => (
                        <CommunityPost key={post.id} post={post} index={index} />
                    ))}

                    {dropsLoading && <Text style={styles.emptyText}>Loading drops...</Text>}
                    {!dropsLoading && dropsError ? <Text style={styles.emptyText}>{dropsError}</Text> : null}
                    {!dropsLoading && !dropsError && approvedDropPosts.length === 0 ? (
                        <Text style={styles.emptyText}>No drops yet.</Text>
                    ) : null}
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
                                <Text style={styles.modalTitle}>Submit Drop</Text>
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
                                <Text style={styles.modalIntro}>
                                    Share a drop for the community. Your submission will be reviewed by admin before it goes live.
                                </Text>

                                <Text style={styles.inputLabel}>DROP TITLE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Festival Special Combo"
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={dropTitle}
                                    onChangeText={setDropTitle}
                                />

                                <Text style={styles.inputLabel}>DESCRIPTION</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Tell the community what this drop is about..."
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={dropDescription}
                                    onChangeText={setDropDescription}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />

                                <Text style={styles.inputLabel}>IMAGE (OPTIONAL)</Text>
                                <Pressable style={styles.imagePickBtn} onPress={handlePickImage}>
                                    <MaterialCommunityIcons name="image-plus" size={18} color={Colors.light.text} />
                                    <Text style={styles.imagePickText}>
                                        {dropImageUrl ? 'Change image' : 'Add image'}
                                    </Text>
                                </Pressable>
                                {dropImageUrl ? (
                                    <Image source={{ uri: dropImageUrl }} style={styles.imagePreview} />
                                ) : null}

                                <Text style={styles.inputLabel}>FROM DATE (OPTIONAL)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={dropStartDate}
                                    onChangeText={setDropStartDate}
                                />

                                <Text style={styles.inputLabel}>TILL DATE (OPTIONAL)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={dropEndDate}
                                    onChangeText={setDropEndDate}
                                />

                                <Text style={styles.inputLabel}>LOCATION (OPTIONAL)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Marvel Stadium"
                                    placeholderTextColor="rgba(0, 0, 0, 0.35)"
                                    value={dropLocation}
                                    onChangeText={setDropLocation}
                                />

                                <Pressable
                                    style={[styles.postBtn, !isDropFormValid && styles.postBtnDisabled]}
                                    onPress={handleSubmitDrop}
                                    disabled={!isDropFormValid}
                                >
                                    <Text style={styles.postBtnText}>Submit Drop for Review</Text>
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
                        {draftDropsLoading ? (
                            <Text style={styles.draftsEmptyTitle}>Loading drops...</Text>
                        ) : draftDropsError ? (
                            <Text style={styles.draftsEmptyText}>{draftDropsError}</Text>
                        ) : draftDrops.length === 0 ? (
                            <>
                                <Text style={styles.draftsEmptyTitle}>No drafts yet</Text>
                                <Text style={styles.draftsEmptyText}>
                                    Draft drops submitted by the community will appear here for approval.
                                </Text>
                            </>
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {draftDrops.map((drop) => (
                                    <View key={drop.id} style={styles.draftDropCard}>
                                        <Text style={styles.draftDropTitle}>{drop.title}</Text>
                                        <Text style={styles.draftDropMeta}>
                                            {drop.user_name || drop.user_email || 'Community'} · {drop.user_role || 'Guest'}
                                        </Text>
                                        <Text style={styles.draftDropBody}>{drop.description}</Text>
                                        {drop.location ? (
                                            <Text style={styles.draftDropMeta}>Location: {drop.location}</Text>
                                        ) : null}
                                        {drop.start_date || drop.end_date ? (
                                            <Text style={styles.draftDropMeta}>
                                                Dates: {drop.start_date || '—'} → {drop.end_date || '—'}
                                            </Text>
                                        ) : null}
                                        <View style={styles.draftDropActions}>
                                            <Pressable
                                                style={[
                                                    styles.draftDropBtn,
                                                    styles.draftDropApprove,
                                                    draftDropBusyIds[drop.id] && styles.draftDropBtnDisabled,
                                                ]}
                                                onPress={() => handleApproveDrop(drop)}
                                                disabled={draftDropBusyIds[drop.id]}
                                            >
                                                <Text style={styles.draftDropBtnText}>Approve</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[
                                                    styles.draftDropBtn,
                                                    styles.draftDropDeny,
                                                    draftDropBusyIds[drop.id] && styles.draftDropBtnDisabled,
                                                ]}
                                                onPress={() => handleDenyDrop(drop)}
                                                disabled={draftDropBusyIds[drop.id]}
                                            >
                                                <Text style={styles.draftDropBtnTextAlt}>Deny</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
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
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
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
    postTitle: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 6,
    },
    postImage: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        marginBottom: Spacing.md,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    postFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: Colors.light.borderSubtle,
        paddingTop: Spacing.md,
    },
    detailOverlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    detailCard: {
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.xl,
        maxHeight: '85%',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    detailHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    detailAvatar: {
        marginRight: 12,
    },
    detailUserName: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    detailTitleText: {
        color: Colors.light.text,
        fontSize: 20,
        fontFamily: Fonts.bold,
        marginBottom: Spacing.sm,
    },
    detailBodyText: {
        color: Colors.light.text,
        fontSize: 15,
        fontFamily: Fonts.regular,
        lineHeight: 22,
        opacity: 0.9,
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
    imagePickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 122, 0, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.35)',
        marginBottom: Spacing.md,
    },
    imagePickText: {
        color: Colors.light.text,
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    imagePreview: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        marginBottom: Spacing.lg,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },

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
    draftDropCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        padding: Spacing.lg,
        marginTop: Spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    draftDropTitle: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 6,
    },
    draftDropMeta: {
        color: Colors.light.textSecondary,
        fontSize: 12,
        fontFamily: Fonts.medium,
        marginBottom: 8,
    },
    draftDropBody: {
        color: Colors.light.text,
        fontSize: 14,
        fontFamily: Fonts.regular,
        lineHeight: 20,
        marginBottom: 10,
    },
    draftDropActions: {
        flexDirection: 'row',
        gap: 10,
    },
    draftDropBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    draftDropApprove: {
        backgroundColor: Colors.light.gold,
    },
    draftDropDeny: {
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
    },
    draftDropBtnText: {
        color: Colors.light.text,
        fontSize: 13,
        fontFamily: Fonts.bold,
    },
    draftDropBtnTextAlt: {
        color: Colors.light.text,
        fontSize: 13,
        fontFamily: Fonts.bold,
    },
    draftDropBtnDisabled: {
        opacity: 0.5,
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
