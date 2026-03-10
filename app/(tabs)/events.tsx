import { AppBackground } from '@/components/AppBackground';
import { ReloadOverlay } from '@/components/ReloadOverlay';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EVENTS } from '@/constants/EventData';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useReloadOnRefresh } from '@/hooks/use-reload-on-refresh';
import { hapticImpact, hapticSelection } from '@/lib/haptics';
import React, { useMemo, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const TABS = ['Upcoming', 'Registered', 'Past'] as const;
type TabType = typeof TABS[number];

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function EventCard({ event, index, onPress }: { event: typeof EVENTS[0]; index: number; onPress: (event: typeof EVENTS[0]) => void }) {
    const { registeredEvents, toggleEventRegistration } = useUser();
    const isRegistered = registeredEvents.includes(event.id);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const isPast = new Date(event.isoDate) < now;

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => { if (!isPast) scale.value = withSpring(0.98); };
    const handlePressOut = () => { if (!isPast) scale.value = withSpring(1); };

    const handleRegister = () => {
        if (!isPast) {
            hapticSelection();
            toggleEventRegistration(event.id);
        }
    };

    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={() => {
                    hapticImpact();
                    onPress(event);
                }}
                style={styles.eventCardContainer}
            >
                <Animated.View style={[
                    styles.eventCard,
                    isRegistered && styles.eventCardRegistered,
                    isPast && styles.eventCardPast,
                    animatedStyle
                ]}>
                    <View style={[styles.eventInfo, isPast && { opacity: 0.6 }]}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <View style={styles.eventMeta}>
                            <View style={[
                                styles.dateBadge,
                                isRegistered && { backgroundColor: 'rgba(255, 122, 0, 0.15)' },
                                isPast && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                            ]}>
                                <Text style={[
                                    styles.dateBadgeText,
                                    isRegistered && { color: '#FF7A00' },
                                    isPast && { color: Colors.light.textSecondary }
                                ]}>{event.date}</Text>
                            </View>
                            <Text style={styles.eventLocation}>📍 {event.location}</Text>
                        </View>
                    </View>

                    {isPast ? (
                        <View style={styles.pastLabel}>
                            <Text style={styles.pastLabelText}>Past</Text>
                        </View>
                    ) : (
                        <Pressable
                            onPress={handleRegister}
                            style={[styles.registerBtn, isRegistered && styles.registerBtnActive]}
                        >
                            <Text style={[styles.registerText, isRegistered && styles.registerTextActive]}>
                                {isRegistered ? 'Going' : 'Register'}
                            </Text>
                            {isRegistered && <IconSymbol size={16} name="checkmark" color={Colors.light.text} style={{ marginLeft: 4 }} />}
                        </Pressable>
                    )}
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

function getDaysInMonth(month: number, year: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number) {
    return new Date(year, month, 1).getDay();
}

export default function EventsScreen() {
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const isExpanded = viewportWidth >= 1024;
    const appFrameWidth = isExpanded
        ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
        : viewportWidth;
    const { registeredEvents, toggleEventRegistration } = useUser();
    const [activeTab, setActiveTab] = useState<TabType>('Upcoming');
    const [selectedEvent, setSelectedEvent] = useState<typeof EVENTS[0] | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<typeof EVENTS[0][] | null>(null);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const { refreshing, onRefresh } = useReloadOnRefresh();

    // Calendar State
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const numDays = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

    const prevMonth = () => {
        hapticSelection();
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
        else setCurrentMonth(currentMonth - 1);
    };
    const nextMonth = () => {
        hapticSelection();
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
        else setCurrentMonth(currentMonth + 1);
    };

    const isToday = (day: number) =>
        day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

    const hasEventOnDate = (day: number) => {
        const monthStr = (currentMonth + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        const isoDateString = `${currentYear}-${monthStr}-${dayStr}`;
        return EVENTS.some(e => e.isoDate === isoDateString && registeredEvents.includes(e.id));
    };

    const handleDayPress = (day: number) => {
        hapticSelection();
        const monthStr = (currentMonth + 1).toString().padStart(2, '0');
        const dayStr = day.toString().padStart(2, '0');
        const isoDateString = `${currentYear}-${monthStr}-${dayStr}`;

        const dayEvents = EVENTS.filter(e => e.isoDate === isoDateString && registeredEvents.includes(e.id));

        if (dayEvents.length > 0) {
            setSelectedDayEvents(dayEvents);
            setSelectedDay(`${day} ${monthName} ${currentYear}`);
        }
    };

    // Filtering and Sorting logic
    const filteredEvents = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let filtered = EVENTS.filter(event => {
            const eventDate = new Date(event.isoDate);
            if (activeTab === 'Registered') {
                return registeredEvents.includes(event.id);
            } else if (activeTab === 'Past') {
                return eventDate < now;
            } else {
                return eventDate >= now;
            }
        });

        // Sorting
        return filtered.sort((a, b) => {
            const dateA = new Date(a.isoDate).getTime();
            const dateB = new Date(b.isoDate).getTime();

            if (activeTab === 'Past') {
                return dateB - dateA; // Most recent past first
            }
            return dateA - dateB; // Soonest upcoming/registered first
        });
    }, [activeTab, registeredEvents]);

    const handleCardPress = (event: typeof EVENTS[0]) => {
        hapticImpact();
        setSelectedEvent(event);
    };

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
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="transparent"
                            colors={['transparent']}
                        />
                    }
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Events</Text>
                        <Text style={styles.headerSubtitle}>Discover and join the celebration</Text>
                    </View>

                    {/* Tab Selector */}
                    <View style={styles.tabContainer}>
                        <View style={styles.tabRow}>
                            {TABS.map((t) => (
                                <Pressable
                                    key={t}
                                    onPress={() => {
                                        hapticSelection();
                                        setActiveTab(t);
                                    }}
                                    style={[styles.tab, activeTab === t && styles.tabActive]}
                                >
                                    <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Premium Calendar */}
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarGradient}>
                            <View style={styles.calendarHeader}>
                                <Pressable onPress={prevMonth} hitSlop={20} style={styles.navBtn}>
                                    <IconSymbol name="chevron.right" size={24} color={Colors.light.gold} style={{ transform: [{ rotate: '180deg' }] }} />
                                </Pressable>
                                <View style={styles.monthTitleContainer}>
                                    <Text style={styles.monthTitle}>{monthName}</Text>
                                    <Text style={styles.yearTitle}>{currentYear}</Text>
                                </View>
                                <Pressable onPress={nextMonth} hitSlop={20} style={styles.navBtn}>
                                    <IconSymbol name="chevron.right" size={24} color={Colors.light.gold} />
                                </Pressable>
                            </View>

                            <View style={styles.weekRow}>
                                {DAYS_OF_WEEK.map((d, i) => (
                                    <Text key={i} style={styles.weekDay}>{d}</Text>
                                ))}
                            </View>

                            <View style={styles.dayGrid}>
                                {Array.from({ length: firstDay }).map((_, i) => (
                                    <View key={`empty-${i}`} style={styles.dayCell} />
                                ))}
                                {Array.from({ length: numDays }).map((_, i) => {
                                    const day = i + 1;
                                    const isCurrentDay = isToday(day);
                                    const isRegisteredDay = hasEventOnDate(day);

                                    return (
                                        <View key={day} style={styles.dayCell}>
                                            <Pressable
                                                onPress={() => handleDayPress(day)}
                                                disabled={!isRegisteredDay}
                                                style={({ pressed }) => [
                                                    styles.daySelector,
                                                    isCurrentDay && styles.todaySelector,
                                                    isRegisteredDay && styles.registeredSelector,
                                                    pressed && isRegisteredDay && { opacity: 0.7, scale: 0.95 }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.dayText,
                                                    isCurrentDay && styles.todayText,
                                                    isRegisteredDay && styles.registeredText
                                                ]}>
                                                    {day}
                                                </Text>
                                            </Pressable>
                                            {isRegisteredDay && !isCurrentDay && <View style={styles.eventIndicator} />}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>

                    {/* Events List */}
                    <View style={styles.listSection}>
                        <Text style={styles.sectionTitle}>
                            {activeTab === 'Upcoming' ? 'Upcoming Celebrations' :
                                activeTab === 'Registered' ? 'Your Schedule' : 'Relive the Moments'}
                        </Text>

                        {filteredEvents.length === 0 ? (
                            <View style={styles.emptyState}>
                                <IconSymbol name="calendar" size={48} color="rgba(255, 122, 0, 0.1)" />
                                <Text style={styles.emptyStateText}>
                                    {activeTab === 'Registered' ? "You haven't registered for any events yet." : "No events found in this category."}
                                </Text>
                            </View>
                        ) : (
                            filteredEvents.map((event, index) => (
                                <EventCard key={event.id} event={event} index={index} onPress={handleCardPress} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Event Details Popup */}
            {selectedEvent && (
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => {
                            hapticImpact();
                            setSelectedEvent(null);
                        }}
                    />
                    <Animated.View entering={FadeInDown} style={styles.modalContent}>
                        <View style={styles.modalGradient}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setSelectedEvent(null);
                                }} style={styles.closeBtn}>
                                    <IconSymbol name="chevron.right" size={24} color={Colors.light.text} style={{ transform: [{ rotate: '90deg' }] }} />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={styles.modalInfoRow}>
                                    <IconSymbol name="calendar" size={20} color={Colors.light.gold} />
                                    <Text style={styles.modalInfoText}>{selectedEvent.date}</Text>
                                </View>
                                <View style={styles.modalInfoRow}>
                                    <Text style={{ fontSize: 18 }}>📍</Text>
                                    <Text style={styles.modalInfoText}>{selectedEvent.location}</Text>
                                </View>

                                <View style={styles.descriptionSection}>
                                    <Text style={styles.descriptionTitle}>About this event</Text>
                                    <Text style={styles.descriptionText}>{selectedEvent.description}</Text>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                {(() => {
                                    const eventDate = new Date(selectedEvent.isoDate);
                                    const todayMidnight = new Date();
                                    todayMidnight.setHours(0, 0, 0, 0);

                                    return eventDate >= todayMidnight ? (
                                        <Pressable
                                            style={[
                                                styles.modalActionBtn,
                                                registeredEvents.includes(selectedEvent.id) && styles.modalActionBtnActive
                                            ]}
                                            onPress={() => {
                                                hapticSelection();
                                                toggleEventRegistration(selectedEvent.id);
                                            }}
                                        >
                                            <Text style={[
                                                styles.modalActionText,
                                                registeredEvents.includes(selectedEvent.id) && { color: '#FF7A00' }
                                            ]}>
                                                {registeredEvents.includes(selectedEvent.id) ? 'Registered ✓' : 'Secure my spot'}
                                            </Text>
                                        </Pressable>
                                    ) : (
                                        <View style={styles.modalPastBadge}>
                                            <Text style={styles.modalPastBadgeText}>This event has concluded</Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>
                    </Animated.View>
                </View>
            )}

            {/* Day Events Popup */}
            {selectedDayEvents && (
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => {
                            hapticImpact();
                            setSelectedDayEvents(null);
                        }}
                    />
                    <Animated.View entering={FadeInDown} style={styles.dayModalContent}>
                        <View style={styles.modalGradient}>
                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.dayModalTitle}>{selectedDay}</Text>
                                    <Text style={styles.dayModalSubtitle}>{selectedDayEvents.length} Registered {selectedDayEvents.length === 1 ? 'Event' : 'Events'}</Text>
                                </View>
                                <Pressable onPress={() => {
                                    hapticImpact();
                                    setSelectedDayEvents(null);
                                }} style={styles.closeBtn}>
                                    <IconSymbol name="chevron.right" size={24} color={Colors.light.text} style={{ transform: [{ rotate: '90deg' }] }} />
                                </Pressable>
                            </View>

                            <ScrollView style={styles.dayModalBody} showsVerticalScrollIndicator={false}>
                                {selectedDayEvents.map((event) => (
                                    <Pressable
                                        key={event.id}
                                        onPress={() => {
                                            hapticImpact();
                                            setSelectedDayEvents(null);
                                            setSelectedEvent(event);
                                        }}
                                        style={({ pressed }) => [
                                            styles.miniEventCard,
                                            pressed && { opacity: 0.7 }
                                        ]}
                                    >
                                        <View style={styles.miniEventInfo}>
                                            <Text style={styles.miniEventTitle}>{event.title}</Text>
                                            <Text style={styles.miniEventMeta}>📍 {event.location}</Text>
                                        </View>
                                        <IconSymbol name="chevron.right" size={20} color={Colors.light.gold} />
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    safeArea: { flex: 1, paddingHorizontal: Spacing.lg },
    header: { marginTop: Spacing.md, marginBottom: Spacing.lg },
    headerTitle: { fontSize: 32, fontFamily: Fonts.header, color: Colors.light.accentText, marginBottom: 4 },
    headerSubtitle: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.light.textSecondary },

    tabContainer: { marginBottom: Spacing.lg },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 122, 0, 0.15)',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
    tabActive: { backgroundColor: Colors.light.gold },
    tabText: { color: Colors.light.textSecondary, fontSize: 14, fontFamily: Fonts.medium },
    tabTextActive: { color: Colors.light.text, fontFamily: Fonts.bold },

    calendarCard: {
        borderRadius: 20,
        overflow: 'visible',
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
        marginBottom: Spacing.xl,
        marginHorizontal: 0,
        backgroundColor: Colors.light.surfaceElevated,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    calendarGradient: {
        padding: Spacing.md,
        backgroundColor: Colors.light.surfaceElevated,
        borderRadius: 20,
        overflow: 'hidden',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm
    },
    monthTitleContainer: { alignItems: 'center' },
    monthTitle: { color: Colors.light.text, fontSize: 22, fontFamily: Fonts.header, letterSpacing: 0.5 },
    yearTitle: { color: Colors.light.accentText, fontSize: 14, fontFamily: Fonts.medium, marginTop: -2 },
    navBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    weekRow: { flexDirection: 'row', marginBottom: Spacing.md },
    weekDay: {
        flex: 1,
        textAlign: 'center',
        color: 'rgba(0, 0, 0, 0.45)',
        fontSize: 11,
        fontFamily: Fonts.bold,
        letterSpacing: 1
    },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', height: 45, alignItems: 'center', justifyContent: 'center' },
    daySelector: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    todaySelector: {
        backgroundColor: Colors.light.gold,
        shadowColor: Colors.light.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    registeredSelector: {
        borderWidth: 1.5,
        borderColor: Colors.light.gold,
    },
    dayText: { color: Colors.light.text, fontSize: 15, fontFamily: Fonts.medium },
    todayText: { color: Colors.light.text, fontFamily: Fonts.bold },
    registeredText: { color: Colors.light.accentText, fontFamily: Fonts.bold },
    eventIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.light.gold,
        position: 'absolute',
        bottom: 4
    },

    listSection: { flex: 1 },
    sectionTitle: { color: Colors.light.text, fontSize: 22, fontFamily: Fonts.header, marginBottom: Spacing.md },
    eventCardContainer: {
        marginBottom: Spacing.md,
        paddingHorizontal: 0,
    },
    eventCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.light.surfaceElevated, borderRadius: 20,
        borderWidth: 1, borderColor: Colors.light.borderSubtle,
        padding: Spacing.lg,
        overflow: 'visible',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 4,
    },
    eventCardRegistered: {
        borderColor: Colors.light.border,
        backgroundColor: Colors.light.surface,
    },
    eventCardPast: {
        borderColor: Colors.light.borderSubtle,
        backgroundColor: Colors.light.surface,
    },
    eventInfo: { flex: 1, marginRight: Spacing.md },
    eventTitle: { color: Colors.light.text, fontSize: 17, fontFamily: Fonts.bold, marginBottom: 8 },
    eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBadge: { backgroundColor: 'rgba(255, 122, 0, 0.3)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    dateBadgeText: { color: Colors.light.accentText, fontSize: 12, fontFamily: Fonts.bold },
    eventLocation: { color: Colors.light.textSecondary, fontSize: 13, fontFamily: Fonts.regular },
    registerBtn: {
        backgroundColor: Colors.light.gold,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    registerBtnActive: {
        backgroundColor: 'rgba(255, 122, 0, 0.85)',
    },
    registerText: { color: Colors.light.text, fontFamily: Fonts.bold, fontSize: 13 },
    registerTextActive: { color: Colors.light.text },
    pastLabel: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: Colors.light.borderSubtle,
    },
    pastLabelText: {
        color: 'rgba(0, 0, 0, 0.35)',
        fontFamily: Fonts.bold,
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    emptyState: { alignItems: 'center', padding: 60, opacity: 0.5 },
    emptyStateText: {
        color: Colors.light.textSecondary,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20
    },

    // Modal Styles
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },
    modalContent: {
        width: SCREEN_WIDTH * 0.9,
        maxHeight: '80%',
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 122, 0, 0.5)',
    },
    modalGradient: {
        padding: Spacing.xl,
        backgroundColor: Colors.light.surfaceElevated,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.lg,
    },
    modalTitle: {
        flex: 1,
        fontSize: 26,
        fontFamily: Fonts.header,
        color: Colors.light.text,
        marginRight: Spacing.md,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 122, 0, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBody: {
        marginBottom: Spacing.xl,
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        gap: 12,
    },
    modalInfoText: {
        color: 'rgba(0, 0, 0, 0.65)',
        fontSize: 15,
        fontFamily: Fonts.medium,
    },
    descriptionSection: {
        marginTop: Spacing.lg,
    },
    descriptionTitle: {
        color: Colors.light.accentText,
        fontSize: 14,
        fontFamily: Fonts.bold,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    descriptionText: {
        color: Colors.light.text,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: Fonts.regular,
        opacity: 0.9,
    },
    modalFooter: {
        alignItems: 'center',
    },
    modalActionBtn: {
        backgroundColor: Colors.light.gold,
        paddingHorizontal: 40,
        paddingVertical: 16,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center',
    },
    modalActionBtnActive: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#FF7A00',
    },
    modalActionText: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    modalPastBadge: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
    },
    modalPastBadgeText: {
        color: 'rgba(255, 122, 0, 0.3)',
        fontFamily: Fonts.medium,
        fontSize: 14,
    },
    dayModalContent: {
        width: SCREEN_WIDTH * 0.85,
        maxHeight: '60%',
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.light.border,
        elevation: 4,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    dayModalTitle: {
        fontSize: 22,
        fontFamily: Fonts.header,
        color: Colors.light.text,
    },
    dayModalSubtitle: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        color: Colors.light.accentText,
        marginTop: 2,
    },
    dayModalBody: {
        marginTop: Spacing.sm,
    },
    miniEventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderSubtle,
    },
    miniEventInfo: {
        flex: 1,
    },
    miniEventTitle: {
        color: Colors.light.text,
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 4,
    },
    miniEventMeta: {
        color: Colors.light.textSecondary,
        fontSize: 13,
        fontFamily: Fonts.regular,
    },
});
