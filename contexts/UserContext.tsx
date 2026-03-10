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
        const sb = supabase;
        if (!sb) return;

        const fetchRoleByEmail = async (email?: string | null) => {
            if (!email) return;
            const { data, error } = await sb
                .from('role_requests')
                .select('current_role')
                .eq('user_email', email)
                .maybeSingle();

            if (error) {
                console.error('Failed to fetch role for user email', error);
                return;
            }

            const role = data?.current_role || 'Guest';
            setUserRoleState(role);
            try {
                await AsyncStorage.setItem('@user_role', role);
            } catch (e) {
                console.error('Failed to save user role', e);
            }
        };

        const applySessionUser = async () => {
            let session: Awaited<ReturnType<typeof sb.auth.getSession>>['data']['session'] | null = null;
            try {
                const result = await sb.auth.getSession();
                session = result.data.session;
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                if (message.includes('Invalid Refresh Token')) {
                    // Token persisted on device is stale; clear local session state silently.
                    await sb.auth.signOut({ scope: 'local' }).catch(() => undefined);
                    setIsAuthenticated(false);
                    setUserNameState('');
                    setUserAvatarUrlState('');
                    setUserRoleState('');
                    return;
                }
                throw e;
            }

            if (!session?.user) {
                setIsAuthenticated(false);
                setUserNameState('');
                setUserAvatarUrlState('');
                setUserRoleState('');
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

            await fetchRoleByEmail(session.user.email);
        };

        applySessionUser().catch((e) => console.error('Failed to hydrate Supabase session', e));

        const { data: authListener } = sb.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                setIsAuthenticated(false);
                setUserNameState('');
                setUserAvatarUrlState('');
                setUserRoleState('');
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

            fetchRoleByEmail(session.user.email).catch((e) =>
                console.error('Failed to update role after auth', e)
            );
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
                // Network failures during remote sign-out should not block local logout.
                console.warn('Remote sign-out failed; clearing local session instead.');
                try {
                    await supabase.auth.signOut({ scope: 'local' });
                } catch {
                    // Ignore: we'll still clear app state below.
                }
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
