import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Colors, Shadows } from '@/constants/theme';

export default function StudentTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jadwal',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && styles.iconWrapperActive,
              ]}
            >
              <Icon
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={focused ? Colors.tabBarActiveTint : Colors.tabBarInactiveTint}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Riwayat',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && styles.iconWrapperActive,
              ]}
            >
              <Icon
                name={focused ? 'time' : 'time-outline'}
                size={22}
                color={focused ? Colors.tabBarActiveTint : Colors.tabBarInactiveTint}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.floatingNav,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: Colors.primary,
  },
});

