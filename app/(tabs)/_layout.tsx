import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Text, useWindowDimensions } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';

export default function TabLayout() {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isExpanded = viewportWidth >= 1024;
  const appFrameWidth = isExpanded
    ? Math.max(320, Math.min(viewportWidth * 0.5, viewportHeight * 0.56))
    : undefined;
  const { userRole } = useUser();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF7A00',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: Colors.light.background,
          borderTopColor: Colors.light.background,
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 12,
          paddingTop: 6,
          marginBottom: 8,
          width: appFrameWidth,
          alignSelf: isExpanded ? 'center' : undefined,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 10,
          letterSpacing: 0.2,
        },
        tabBarLabel: ({ children }) => (
          <Text
            style={{
              fontWeight: '600',
              fontSize: 10,
              letterSpacing: 0.2,
              color: '#FF7A00',
            }}
          >
            {children}
          </Text>
        ),
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        listeners={{
          tabPress: (e) => {
            if (!userRole) {
              e.preventDefault();
              router.push('/(tabs)/more?openSignup=true');
            }
          },
        }}
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        listeners={{
          tabPress: (e) => {
            if (!userRole) {
              e.preventDefault();
              router.push('/(tabs)/more?openSignup=true');
            }
          },
        }}
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        listeners={{
          tabPress: (e) => {
            if (!userRole) {
              e.preventDefault();
              router.push('/(tabs)/more?openSignup=true');
            }
          },
        }}
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="gift.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="ellipsis" color={color} />,
        }}
      />
      {/* Hide old explore tab */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
