import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

interface UserContextType {
    isAuthenticated: boolean;
    userName: string;
    setUserName: (name: string) => Promise<void>;
    userAvatarUrl: string;
    userRole: string;
    setUserRole: (role: string) => Promise<void>;
    registeredEvents: string[];
    toggleEventRegistration: (eventId: string) => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function logGoogleMetadata(user: {
    id: string;
    email?: string | null;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
}) {
    const provider = user.app_metadata?.provider;
    if (provider !== 'google') return;

    const metadata = user.user_metadata ?? {};
    const lines = [
        '================ GOOGLE AUTH USER ================',
        `id:            ${user.id || 'N/A'}`,
        `email:         ${user.email || 'N/A'}`,
        `name:          ${metadata.full_name ?? metadata.name ?? 'N/A'}`,
        `given_name:    ${metadata.given_name ?? 'N/A'}`,
        `family_name:   ${metadata.family_name ?? 'N/A'}`,
        `avatar_url:    ${metadata.avatar_url ?? 'N/A'}`,
        `email_verified:${String(metadata.email_verified ?? 'N/A')}`,
        `provider:      ${provider}`,
        `providers:     ${Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers.join(', ') : 'N/A'}`,
        '==================================================',
    ];

    console.log(`\n${lines.join('\n')}\n`);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userName, setUserNameState] = useState('');
    const [userAvatarUrl, setUserAvatarUrlState] = useState('');
    const [userRole, setUserRoleState] = useState('');
    const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);

    useEffect(() => {
        loadUserName();
        loadUserAvatarUrl();
        loadUserRole();
        loadRegisteredEvents();
    }, []);

    useEffect(() => {
        if (!supabase) return;

        const applySessionUser = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
            logGoogleMetadata(session.user);

            const metadataName = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name;
            const displayName = metadataName || session.user.email || '';
            const avatarUrl =
                session.user.user_metadata?.avatar_url ??
                session.user.user_metadata?.picture ??
                '';

            if (displayName) {
                setUserNameState(displayName);
                await AsyncStorage.setItem('@guest_user_name', displayName);
            }
            if (avatarUrl) {
                setUserAvatarUrlState(avatarUrl);
                await AsyncStorage.setItem('@user_avatar_url', avatarUrl);
            }

            const savedRole = await AsyncStorage.getItem('@user_role');
            if (!savedRole) {
                setUserRoleState('Guest');
                await AsyncStorage.setItem('@user_role', 'Guest');
            }
        };

        applySessionUser().catch((e) => console.error('Failed to hydrate Supabase session', e));

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                setIsAuthenticated(false);
                return;
            }
            setIsAuthenticated(true);
            logGoogleMetadata(session.user);

            const metadataName = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name;
            const displayName = metadataName || session.user.email || '';
            const avatarUrl =
                session.user.user_metadata?.avatar_url ??
                session.user.user_metadata?.picture ??
                '';

            if (displayName) {
                setUserNameState(displayName);
                AsyncStorage.setItem('@guest_user_name', displayName).catch((e) =>
                    console.error('Failed to save session user name', e)
                );
            }
            if (avatarUrl) {
                setUserAvatarUrlState(avatarUrl);
                AsyncStorage.setItem('@user_avatar_url', avatarUrl).catch((e) =>
                    console.error('Failed to save session avatar URL', e)
                );
            }

            AsyncStorage.getItem('@user_role')
                .then((savedRole) => {
                    if (!savedRole) {
                        setUserRoleState('Guest');
                        return AsyncStorage.setItem('@user_role', 'Guest');
                    }
                    return null;
                })
                .catch((e) => console.error('Failed to update role after auth', e));
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const loadUserName = async () => {
        try {
            const savedName = await AsyncStorage.getItem('@guest_user_name');
            if (savedName) setUserNameState(savedName);
        } catch (e) {
            console.error('Failed to load user name', e);
        }
    };

    const loadUserRole = async () => {
        try {
            const savedRole = await AsyncStorage.getItem('@user_role');
            if (savedRole) setUserRoleState(savedRole);
        } catch (e) {
            console.error('Failed to load user role', e);
        }
    };

    const loadUserAvatarUrl = async () => {
        try {
            const savedAvatarUrl = await AsyncStorage.getItem('@user_avatar_url');
            if (savedAvatarUrl) setUserAvatarUrlState(savedAvatarUrl);
        } catch (e) {
            console.error('Failed to load user avatar URL', e);
        }
    };

    const loadRegisteredEvents = async () => {
        try {
            const savedEvents = await AsyncStorage.getItem('@user_registered_events');
            if (savedEvents) {
                setRegisteredEvents(JSON.parse(savedEvents));
            }
        } catch (e) {
            console.error('Failed to load registered events', e);
        }
    };

    const setUserName = async (name: string) => {
        setUserNameState(name);
        try {
            await AsyncStorage.setItem('@guest_user_name', name);
        } catch (e) {
            console.error('Failed to save user name', e);
        }
    };

    const setUserRole = async (role: string) => {
        setUserRoleState(role);
        try {
            await AsyncStorage.setItem('@user_role', role);
        } catch (e) {
            console.error('Failed to save user role', e);
        }
    };

    const toggleEventRegistration = async (eventId: string) => {
        const isRegistered = registeredEvents.includes(eventId);
        let newEvents;

        if (isRegistered) {
            newEvents = registeredEvents.filter(id => id !== eventId);
        } else {
            newEvents = [...registeredEvents, eventId];
        }

        setRegisteredEvents(newEvents);
        try {
            await AsyncStorage.setItem('@user_registered_events', JSON.stringify(newEvents));
        } catch (e) {
            console.error('Failed to save registered events', e);
        }
    };

    const logout = async () => {
        if (supabase) {
            try {
                await supabase.auth.signOut();
            } catch (e) {
                console.error('Failed to sign out from Supabase', e);
            }
        }

        setUserNameState('');
        setUserAvatarUrlState('');
        setUserRoleState('');
        setIsAuthenticated(false);
        setRegisteredEvents([]);
        try {
            await AsyncStorage.multiRemove([
                '@guest_user_name',
                '@user_avatar_url',
                '@user_role',
                '@user_registered_events',
            ]);
        } catch (e) {
            console.error('Failed to logout', e);
        }
    };

    return (
        <UserContext.Provider
            value={{
                isAuthenticated,
                userName,
                setUserName,
                userAvatarUrl,
                userRole,
                setUserRole,
                registeredEvents,
                toggleEventRegistration,
                logout,
            }}
        >
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
