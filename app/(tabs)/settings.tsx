import ProfileEditSection from '@/components/settings/ProfileEditSection';
import SubscriptionSection, { PaymentMethod, PlanType } from '@/components/settings/SubscriptionSection';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ───────────── theme (same as journey/index) ───────────── */
const { height: SCREEN_H } = Dimensions.get('window');
const ACCENT = '#c1ec72';
const BG = '#FFFFFF';
const SHEET_BG = '#0E0E10';
const SURFACE = '#151518';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.12)';

/* ── snap points ── */
const SNAP_LOW = 140;
const SNAP_MID = SCREEN_H * 0.35;
const SNAP_HIGH = SCREEN_H * 0.85;

const TY_HIGH = SCREEN_H - SNAP_HIGH;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;

const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

/* ───────────── Action Tile Component ───────────── */
interface ActionTile {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
}

const ACTION_TILES: ActionTile[] = [
  { id: 'profile', icon: 'account-edit-outline', label: 'Profile', color: '#FFFFFF' },
  { id: 'subscription', icon: 'hand-coin-outline', label: 'Subscription', color: '#FFFFFF' },
  { id: 'notification', icon: 'bell-outline', label: 'Notifications', color: '#FFFFFF' },
];

function ActionTileButton({ tile, onPress }: { tile: ActionTile; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        tileStyles.tile,
        { backgroundColor: tile.color },
        pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] },
      ]}
    >
      <MaterialCommunityIcons name={tile.icon} size={24} color="#1a1a1a" />
      <Text style={tileStyles.tileLabel}>{tile.label}</Text>
    </Pressable>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    gap: 8,
  },
  tileLabel: {
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/* ───────────── Social Link Component ───────────── */
function SocialLink({
  icon,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        socialStyles.btn,
        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </Pressable>
  );
}

const socialStyles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* ─────────────────────────────────────────────────
   SettingsScreen
   ───────────────────────────────────────────────── */

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { email, logout } = useAuth();

  // Extract name from email or use placeholder
  const userName = email ? email.split('@')[0] : 'User';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  /* ── Profile edit state ── */
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [profileName, setProfileName] = useState(displayName);
  const [profileEmail, setProfileEmail] = useState(email || '');

  /* ── Subscription state ── */
  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);

  /* ── shared values ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);

  const snapTo = useCallback((target: number) => {
    'worklet';
    translateY.value = withSpring(target, SPRING_CFG);
  }, []);

  /* ── Pan gesture ── */
  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(TY_HIGH, Math.min(ctx.value + e.translationY, TY_LOW));
    })
    .onEnd((e) => {
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;

      if (Math.abs(v) > FLING) {
        if (v > 0) {
          snapTo(cur < TY_MID ? TY_MID : TY_LOW);
        } else {
          snapTo(cur > TY_MID ? TY_MID : TY_HIGH);
        }
        return;
      }

      const snaps = [TY_HIGH, TY_MID, TY_LOW];
      let best = snaps[0];
      let bestD = Math.abs(cur - snaps[0]);
      for (const snap of snaps) {
        const d = Math.abs(cur - snap);
        if (d < bestD) {
          bestD = d;
          best = snap;
        }
      }
      snapTo(best);
    });

  /* ── Animated styles ── */
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY_MID, TY_LOW],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /* ── Handlers ── */
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(boot)/register' as Href);
          },
        },
      ]
    );
  };

  const handleTilePress = (tileId: string) => {
    if (tileId === 'profile') {
      setShowProfileEdit(!showProfileEdit);
      setShowSubscription(false); // Close other panels
      // Reset editing states when closing
      if (showProfileEdit) {
        setEditingName(false);
        setEditingEmail(false);
      }
    } else if (tileId === 'subscription') {
      setShowSubscription(!showSubscription);
      setShowProfileEdit(false); // Close other panels
      // Reset subscription states when closing
      if (showSubscription) {
        setSelectedPlan(null);
        setShowPaymentOptions(false);
        setSelectedPayment(null);
      }
    } else {
      console.log('Pressed:', tileId);
      // TODO: Navigate to respective screens
    }
  };

  const handleUpdateProfile = () => {
    console.log('Update profile:', { name: profileName, email: profileEmail });
    // TODO: Implement actual profile update
    setEditingName(false);
    setEditingEmail(false);
  };

  const handleProceedSubscription = () => {
    setShowPaymentOptions(true);
  };

  const handlePaymentSelect = (method: 'card' | 'juice') => {
    setSelectedPayment(method);
  };

  const handleConfirmPayment = () => {
    console.log('Confirm payment:', { plan: selectedPlan, method: selectedPayment });
    // TODO: Implement actual payment processing
    Alert.alert(
      'Payment',
      `Processing ${selectedPlan === 'monthly' ? '1 Month (Rs 100)' : '12 Months (Rs 1200)'} subscription via ${selectedPayment === 'card' ? 'Credit Card' : 'Juice'}`,
      [{ text: 'OK' }]
    );
  };

  const handleSocialPress = (platform: string) => {
    console.log('Open:', platform);
    // TODO: Open social links
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <StatusBar style="dark" />

          {/* Profile Header Area (above sheet) */}
          <View style={[styles.profileArea, { paddingTop: insets.top + 16 }]}>
        {/* Back button */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a1a" />
        </Pressable>

        {/* Menu button */}
        <Pressable style={styles.menuBtn}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#1a1a1a" />
        </Pressable>

        {/* Profile Picture */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={48} color="#666" />
          </View>
        </View>

        {/* Name & Email */}
        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{email || 'user@example.com'}</Text>

        {/* Social Links */}
        <View style={styles.socialRow}>
          <SocialLink
            icon="instagram"
            color="#E4405F"
            onPress={() => handleSocialPress('instagram')}
          />
          <SocialLink
            icon="facebook"
            color="#1877F2"
            onPress={() => handleSocialPress('facebook')}
          />
          <SocialLink
            icon="linkedin"
            color="#0A66C2"
            onPress={() => handleSocialPress('linkedin')}
          />
          <SocialLink
            icon="whatsapp"
            color="#25D366"
            onPress={() => handleSocialPress('whatsapp')}
          />
        </View>
      </View>

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          {/* Title & Description */}
          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <Text style={styles.headerSubtitle}>Manage your profile and preferences</Text>
          </View>

          {/* Action Tiles */}
          <View style={styles.tilesContainer}>
            <View style={styles.tilesGrid}>
              {ACTION_TILES.map((tile) => (
                <ActionTileButton
                  key={tile.id}
                  tile={tile}
                  onPress={() => handleTilePress(tile.id)}
                />
              ))}
            </View>
          </View>

          {/* Profile Edit Section */}
          {showProfileEdit && (
            <ProfileEditSection
              profileName={profileName}
              profileEmail={profileEmail}
              editingName={editingName}
              editingEmail={editingEmail}
              onNameChange={setProfileName}
              onEmailChange={setProfileEmail}
              onToggleNameEdit={() => setEditingName(!editingName)}
              onToggleEmailEdit={() => setEditingEmail(!editingEmail)}
              onUpdate={handleUpdateProfile}
            />
          )}

          {/* Subscription Section */}
          {showSubscription && (
            <SubscriptionSection
              selectedPlan={selectedPlan}
              showPaymentOptions={showPaymentOptions}
              selectedPayment={selectedPayment}
              onSelectPlan={setSelectedPlan}
              onProceed={handleProceedSubscription}
              onSelectPayment={handlePaymentSelect}
              onBack={() => {
                setShowPaymentOptions(false);
                setSelectedPayment(null);
              }}
              onConfirmPayment={handleConfirmPayment}
            />
          )}

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.logoutBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleLogout}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#ff6b6b" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>

          {/* Expanded content */}
          <Animated.View style={[styles.expandedWrap, expandedOpacity]}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {/* Additional settings content can go here */}
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
        </View>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Profile Area */
  profileArea: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 52,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    position: 'absolute',
    right: 16,
    top: 52,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },

  /* Sheet */
  sheetOuter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },

  /* Tiles */
  tilesContainer: {
    paddingHorizontal: 20,
  },
  tilesGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  expandedWrap: {
    flex: 1,
    marginTop: 16,
  },

  /* Logout */
  logoutContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
    paddingVertical: 16,
  },
  logoutText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
});
