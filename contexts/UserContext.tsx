import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface UserContextType {
    userName: string;
    setUserName: (name: string) => Promise<void>;
    userRole: string;
    setUserRole: (role: string) => Promise<void>;
    registeredEvents: string[];
    toggleEventRegistration: (eventId: string) => Promise<void>;
    logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [userName, setUserNameState] = useState('');
    const [userRole, setUserRoleState] = useState('');
    const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);

    useEffect(() => {
        loadUserName();
        loadUserRole();
        loadRegisteredEvents();
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
        setUserNameState('');
        setUserRoleState('');
        setRegisteredEvents([]);
        try {
            await AsyncStorage.multiRemove(['@guest_user_name', '@user_role', '@user_registered_events']);
        } catch (e) {
            console.error('Failed to logout', e);
        }
    };

    return (
        <UserContext.Provider value={{ userName, setUserName, userRole, setUserRole, registeredEvents, toggleEventRegistration, logout }}>
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
