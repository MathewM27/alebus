import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const ACCENT = '#6c6c72';
const TAB_BG = '#0E0E10';
const TAB_INACTIVE = 'rgba(255,255,255,0.5)';
const BAR_HEIGHT = 70;
const FLOATING_SIZE = 48;

/* Custom Tab Bar with Floating Active Indicator */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const routes: Array<{
    key: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    activeIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  }> = [
    { key: 'index', icon: 'home-outline', activeIcon: 'home' },
    { key: 'journey', icon: 'chart-timeline-variant' },
    { key: 'settings', icon: 'account-outline', activeIcon: 'account' },
  ];

  const activeIndex = state.index;

  return (
    <View style={styles.tabBarContainer}>
      {/* Background bar with cutout */}
      <View style={styles.tabBarBg}>
        <Svg
          width="100%"
          height={BAR_HEIGHT}
          viewBox="0 0 375 70"
          preserveAspectRatio="none"
          style={StyleSheet.absoluteFillObject}
        >
          <Path
            d={getTabBarPath(activeIndex, 375, BAR_HEIGHT)}
            fill={TAB_BG}
          />
        </Svg>
      </View>

      {/* Tab buttons */}
      <View style={styles.tabBarContent}>
        {routes.map((route, index) => {
          const isActive = index === activeIndex;
          const routeKey = state.routes[index]?.name;

          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
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
              {isActive ? (
                <View style={styles.floatingCircle}>
                  <MaterialCommunityIcons
                    name={route.activeIcon || route.icon}
                    size={24}
                    color="#000"
                  />
                </View>
              ) : (
                <MaterialCommunityIcons
                  name={route.icon}
                  size={24}
                  color={TAB_INACTIVE}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* Generate SVG path with cutout for active tab */
function getTabBarPath(activeIndex: number, width: number, height: number): string {
  const tabWidth = width / 3;
  const cutoutRadius = 28;  // radius of the cutout arc
  const cutoutDepth = 8;    // how deep the cutout goes into the bar

  // Center X position of active tab
  const centerX = tabWidth * activeIndex + tabWidth / 2;

  // Start from top-left, move right until we hit the cutout
  const leftEdge = centerX - cutoutRadius;
  const rightEdge = centerX + cutoutRadius;

  return `
    M 0 ${cutoutDepth}
    L ${leftEdge} ${cutoutDepth}
    Q ${centerX} ${cutoutDepth - 2} ${rightEdge} ${cutoutDepth}
    L ${width} ${cutoutDepth}
    L ${width} ${height}
    L 0 ${height}
    Z
  `;
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="journey" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'relative',
    height: BAR_HEIGHT + 20, // extra space for floating circle
  },
  tabBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    overflow: 'hidden',
  },
  tabBarContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
  },
  floatingCircle: {
    width: FLOATING_SIZE,
    height: FLOATING_SIZE,
    borderRadius: FLOATING_SIZE / 2,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
