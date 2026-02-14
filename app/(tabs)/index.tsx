import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ───────────── constants ───────────── */
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const ACCENT = '#c1ec72';
const BG = '#000000';
const SHEET_BG = '#0E0E10';
const SURFACE = '#151518';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.12)';
const SEPARATOR = 'rgba(255,255,255,0.08)';

const INITIAL_REGION = {
  latitude: -20.348404,
  longitude: 57.552152,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

/* placeholder bus markers around Mauritius */
const BUS_MARKERS = [
  { id: '1', latitude: -20.1609, longitude: 57.5012, title: 'Port Louis Terminal' },
  { id: '2', latitude: -20.2309, longitude: 57.4992, title: 'Quatre Bornes Stop' },
  { id: '3', latitude: -20.3168, longitude: 57.5225, title: 'Curepipe Central' },
  { id: '4', latitude: -20.2631, longitude: 57.5803, title: 'Centre de Flacq' },
  { id: '5', latitude: -20.4398, longitude: 57.6592, title: 'Mahebourg Station' },
  { id: '6', latitude: -20.1000, longitude: 57.5700, title: 'Pamplemousses' },
];

/* mock recent places */
const RECENT_PLACES = [
  { id: '1', type: 'recent' as const, title: 'Curepipe Central', subtitle: 'Royal Road, Curepipe 74401' },
  { id: '2', type: 'saved' as const, title: 'Port Louis Market', subtitle: 'Queen Street, Port Louis 11328' },
  { id: '3', type: 'recent' as const, title: 'Rose Hill Transport Hub', subtitle: 'Royal Road, Rose Hill 71368' },
  { id: '4', type: 'saved' as const, title: 'Quatre Bornes', subtitle: 'St Jean Road, Quatre Bornes 72257' },
  { id: '5', type: 'recent' as const, title: 'Mahebourg Waterfront', subtitle: 'Rue des Hollandais, Mahebourg 50802' },
];

/* ───────────── sub-components ───────────── */

function BusMarkerView() {
  return (
    <View style={markerStyles.outer}>
      <View style={markerStyles.inner} />
    </View>
  );
}

const markerStyles = StyleSheet.create({
  outer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BG,
  },
});

function MenuButton({ onPress, top }: { onPress: () => void; top: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.85, duration: 100, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={[menuStyles.wrap, { top: top + 8 }, { transform: [{ scale }], opacity }]}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={menuStyles.btn}>
        <MaterialCommunityIcons name="menu" size={22} color={TEXT_PRIMARY} />
      </Pressable>
    </Animated.View>
  );
}

const menuStyles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, zIndex: 10 },
  btn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function QuickActionButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={[quickStyles.btn, active && quickStyles.btnActive]}
      >
        <MaterialCommunityIcons name={icon} size={18} color={active ? ACCENT : TEXT_SECONDARY} />
        <Text style={[quickStyles.label, active && quickStyles.labelActive]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const quickStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  btnActive: { borderColor: ACCENT },
  label: { color: TEXT_SECONDARY, fontSize: 13, fontWeight: '500' },
  labelActive: { color: ACCENT },
});

function PlaceRow({
  item,
  isLast,
}: {
  item: (typeof RECENT_PLACES)[number];
  isLast: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => console.log('Navigate to', item.title)}
        onPressIn={() => Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
        style={placeStyles.row}
      >
        <View style={placeStyles.iconWrap}>
          <MaterialCommunityIcons
            name={item.type === 'recent' ? 'clock-outline' : 'map-marker-outline'}
            size={20}
            color={TEXT_SECONDARY}
          />
        </View>
        <View style={placeStyles.textWrap}>
          <Text style={placeStyles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={placeStyles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
      </Pressable>
      {!isLast && <View style={placeStyles.separator} />}
    </Animated.View>
  );
}

const placeStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1, marginRight: 8 },
  title: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '500', marginBottom: 2 },
  subtitle: { color: TEXT_SECONDARY, fontSize: 13 },
  separator: { height: 1, backgroundColor: SEPARATOR, marginLeft: 52 },
});

/* ───────────── main screen ───────────── */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  const SHEET_HEIGHT = SCREEN_H * 0.50;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* ── OpenStreetMap (no API key) ── */}
      <MapView style={StyleSheet.absoluteFillObject} initialRegion={INITIAL_REGION}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />
        {BUS_MARKERS.map((m) => (
          <Marker key={m.id} coordinate={{ latitude: m.latitude, longitude: m.longitude }} title={m.title}>
            <BusMarkerView />
          </Marker>
        ))}
      </MapView>

      {/* dark overlay for readability */}
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* ── Menu Button ── */}
      <MenuButton top={insets.top} onPress={() => console.log('Open menu')} />

      {/* ── Bottom Sheet ── */}
      <KeyboardAvoidingView
        style={[styles.sheetContainer, { height: SHEET_HEIGHT + insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.sheet}>
          {/* drag handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Search Input ── */}
            <View style={[styles.searchRow, searchFocused && styles.searchRowFocused]}>
              <MaterialCommunityIcons name="magnify" size={20} color={TEXT_SECONDARY} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter your location"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={searchText}
                onChangeText={setSearchText}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                selectionColor={ACCENT}
              />
            </View>

            {/* ── Where to? + Quick Actions ── */}
            <View style={styles.whereRow}>
              <Pressable
                style={({ pressed }) => [styles.whereBtn, pressed && { opacity: 0.85 }]}
                onPress={() => console.log('Where to?')}
              >
                <MaterialCommunityIcons name="map-marker" size={18} color={ACCENT} style={{ marginRight: 8 }} />
                <Text style={styles.whereText}>Where to?</Text>
              </Pressable>

              <View style={styles.quickActions}>
                <QuickActionButton
                  icon="home-outline"
                  label="Home"
                  active={activeQuick === 'home'}
                  onPress={() => setActiveQuick(activeQuick === 'home' ? null : 'home')}
                />
                <QuickActionButton
                  icon="briefcase-outline"
                  label="Work"
                  active={activeQuick === 'work'}
                  onPress={() => setActiveQuick(activeQuick === 'work' ? null : 'work')}
                />
              </View>
            </View>

            {/* ── Section heading ── */}
            <Text style={styles.sectionHeading}>Recent</Text>

            {/* ── Recent / saved list ── */}
            {RECENT_PLACES.map((item, idx) => (
              <PlaceRow key={item.id} item={item} isLast={idx === RECENT_PLACES.length - 1} />
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* map overlay */
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  /* bottom sheet */
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  /* search */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  searchRowFocused: {
    borderColor: ACCENT,
  },
  searchInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    padding: 0,
  },

  /* where to row */
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  whereBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 48,
  },
  whereText: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },

  /* section */
  sectionHeading: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
});
