import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIVE_BG = '#ffffff';
const PILL_BG = '#000000';
const ACTIVE_ICON = '#ffffff';
const INACTIVE_ICON = 'rgba(255,255,255,0.45)';

const TAB_ROUTES: Array<{
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { key: 'index',   label: 'Home',     icon: 'home-outline',    activeIcon: 'home' },
  { key: 'journey', label: 'Journey',  icon: 'chart-timeline-variant', activeIcon: 'chart-timeline-variant' },
  { key: 'settings',label: 'Account',  icon: 'account-outline', activeIcon: 'account' },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.pill}>
        {TAB_ROUTES.map((route, index) => {
          const isActive = index === activeIndex;
          const routeKey = state.routes[index]?.name;

          return (
            <Pressable
              key={route.key}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: state.routes[index].key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(routeKey);
                }
              }}
            >
              <MaterialCommunityIcons
                name={isActive ? route.activeIcon : route.icon}
                size={22}
                color={isActive ? ACTIVE_ICON : INACTIVE_ICON}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {route.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    console.log('[TabLayout] isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
    if (!isLoading && !isAuthenticated) {
      console.log('[TabLayout] not authenticated → redirecting to welcome');
      router.replace('/(auth)/welcome');
    }
  }, [isAuthenticated, isLoading]);

  // Return null while loading — splash screen covers this
  if (isLoading) return null;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="journey" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: PILL_BG,
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#c1ec72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 44,
    gap: 2,
  },
  tabItemActive: {
  },
  label: {
    color: INACTIVE_ICON,
    fontSize: 13,
    fontWeight: '500',
  },
  labelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
