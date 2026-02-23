import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

// This helps you find the redirect URI to add to Google Cloud Console
const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'saras',
    path: 'redirect',
});

console.log('--- GOOGLE LOGIN DEBUG ---');
console.log('Redirect URI:', redirectUri);
console.log('Add this to Google Cloud Console > Credentials > Authorized redirect URIs');
console.log('--------------------------');

interface User {
    name: string;
    email: string;
    picture: string;
}

interface AuthContextType {
    user: User | null;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    // 1. Create a project at https://console.cloud.google.com/
    // 2. Create an "OAuth client ID" of type "Web application"
    // 3. Add the Redirect URI logged above to the list
    // 4. Paste the Client ID below:
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com",
        iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
        webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
        redirectUri,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            fetchUserInfo(authentication?.accessToken);
        }
    }, [response]);

    async function fetchUserInfo(token?: string) {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userInfo = await res.json();
            setUser(userInfo);
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        } finally {
            setLoading(false);
        }
    }

    const signIn = async () => {
        await promptAsync();
    };

    const signOut = async () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
