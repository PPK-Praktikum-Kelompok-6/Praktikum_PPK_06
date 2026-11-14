import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { FloatingTabBar } from '@/components/ui/FloatingTabBar';
import { Icon } from '@/components/ui/Icon';
import { useCurrentUser } from '@/store/hooks';

export default function AssistantTabsLayout() {
  const { currentUser } = useCurrentUser();

  // Batasan Keamanan & Peran: Praktikan dilarang keras mengakses tampilan asisten
  if (currentUser.role !== 'ASSISTANT') {
    return <Redirect href="/student" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="recap"
        options={{
          title: 'Rekap',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon
              name={focused ? 'clipboard' : 'clipboard-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="permits"
        options={{
          title: 'Izin',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon
              name={focused ? 'file-tray-full' : 'file-tray-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
