import MapThemeSection from "@/components/settings/MapThemeSection";
import ProfileEditSection from "@/components/settings/ProfileEditSection";
import SubscriptionSection, {
  PaymentMethod,
  PlanType,
} from "@/components/settings/SubscriptionSection";
import { useAuth } from "@/contexts/AuthContext";
import { useMapTheme } from "@/contexts/MapThemeContext";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ───────────── theme ───────────── */
const ACCENT = "#c1ec72";
const BG = "#212122";
const SHEET_BG = "#000000";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

/* ───────────── Action Tile Component ───────────── */
interface ActionTile {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
}

const ACTION_TILES: ActionTile[] = [
  { id: "profile",      icon: "account-edit-outline", label: "Profile",       color: TEXT_PRIMARY },
  { id: "subscription", icon: "hand-coin-outline",    label: "Subscription",  color: TEXT_PRIMARY },
  { id: "notification", icon: "bell-outline",          label: "Notifications", color: TEXT_PRIMARY },
  { id: "map-theme",    icon: "palette-outline",       label: "Map Theme",     color: TEXT_PRIMARY },
  { id: "logout",       icon: "logout",                label: "Logout",        color: "#ff6b6b"    },
];

function ActionTileButton({
  tile,
  onPress,
}: {
  tile: ActionTile;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [tileStyles.tile, pressed && { opacity: 0.7 }]}
    >
      <MaterialCommunityIcons name={tile.icon} size={24} color={tile.color} />
      <Text style={tileStyles.tileLabel}>{tile.label}</Text>
    </Pressable>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    width: 100,
    aspectRatio: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  tileLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
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
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
});

/* ─────────────────────────────────────────────────
   SettingsScreen
   ───────────────────────────────────────────────── */

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { email, logout } = useAuth();
  const { mapTheme, setMapTheme } = useMapTheme();
  const { height: screenHeight } = useWindowDimensions();

  const userName = email ? email.split("@")[0] : "User";
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  /* ── Profile edit state ── */
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [profileName, setProfileName] = useState(displayName);
  const [profileEmail, setProfileEmail] = useState(email || "");

  useEffect(() => {
    if (email) {
      const name = email.split("@")[0];
      setProfileName(name.charAt(0).toUpperCase() + name.slice(1));
      setProfileEmail(email);
    }
  }, [email]);

  /* ── Subscription state ── */
  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(null);

  /* ── Map Theme state ── */
  const [showMapTheme, setShowMapTheme] = useState(false);

  /* ── Track whether any expandable section is open ── */
  const isSectionOpen =
    showProfileEdit || showSubscription || showNotifications || showMapTheme;

  /* ── Bottom sheet ──
   * Snap points:
   *   0 → 15% visible  (collapsed)
   *   1 → 50% visible  (default — tiles visible)
   *   2 → 85% visible  (expanded — profile / subscription open)
   *
   * maxSnapIndex = 1 by default so user can't drag above 50%.
   * When a section is open, ceiling lifts to 2 programmatically.
   */
  const {
    translateY,
    sheetStyle,
    pan,
    snapTo,
    TY,
    glowStyle,
    setSectionExpanded,
  } = useBottomSheet({
    screenHeight,
    snapPoints: [0.15, 0.40, 0.85],
    initialSnap: 1,
    maxSnapIndex: isSectionOpen ? 2 : 1,
    onKeyboardShow: true,  // FIX H: lift sheet when profile-edit inputs are focused
  });

  /* ── expandedOpacity: fade content when sheet collapses ── */
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY[1], TY[0]],  // default → collapsed
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /* ── Open/close a tile section ── */
  const openSection = useCallback((open: boolean) => {
    snapTo(open ? 2 : 1);
    setSectionExpanded(open);
  }, [snapTo, setSectionExpanded]);

  /* ── Handlers ── */
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/welcome" as Href);
        },
      },
    ]);
  };

  const handleTilePress = (tileId: string) => {
    if (tileId === "profile") {
      const willOpen = !showProfileEdit;
      setShowProfileEdit(willOpen);
      setShowSubscription(false);
      setShowMapTheme(false);
      setShowNotifications(false);
      openSection(willOpen);
      if (!willOpen) {
        setEditingName(false);
        setEditingEmail(false);
      }
    } else if (tileId === "subscription") {
      const willOpen = !showSubscription;
      setShowSubscription(willOpen);
      setShowProfileEdit(false);
      setShowMapTheme(false);
      setShowNotifications(false);
      openSection(willOpen);
      if (!willOpen) {
        setSelectedPlan(null);
        setShowPaymentOptions(false);
        setSelectedPayment(null);
      }
    } else if (tileId === "map-theme") {
      const willOpen = !showMapTheme;
      setShowMapTheme(willOpen);
      setShowProfileEdit(false);
      setShowSubscription(false);
      setShowNotifications(false);
      openSection(willOpen);
    } else if (tileId === "notification") {
      const willOpen = !showNotifications;
      setShowNotifications(willOpen);
      setShowProfileEdit(false);
      setShowSubscription(false);
      setShowMapTheme(false);
      openSection(willOpen);
    } else if (tileId === "logout") {
      handleLogout();
    } else {
      console.log("Pressed:", tileId);
    }
  };

  const handleUpdateProfile = () => {
    console.log("Update profile:", { name: profileName, email: profileEmail });
    setEditingName(false);
    setEditingEmail(false);
  };

  const handleProceedSubscription = () => {
    setShowPaymentOptions(true);
  };

  const handlePaymentSelect = (method: "card" | "juice") => {
    setSelectedPayment(method);
  };

  const handleConfirmPayment = () => {
    console.log("Confirm payment:", { plan: selectedPlan, method: selectedPayment });
    Alert.alert(
      "Payment",
      `Processing ${selectedPlan === "monthly" ? "1 Month (Rs 100)" : "12 Months (Rs 1200)"} subscription via ${selectedPayment === "card" ? "Credit Card" : "Juice"}`,
      [{ text: "OK" }],
    );
  };

  const handleSocialPress = (platform: string) => {
    console.log("Open:", platform);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <StatusBar style="light" />

          {/* Profile Header Area (above sheet) */}
          <View style={[styles.profileArea, { paddingTop: insets.top + 16 }]}>
            {/* Back button */}
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <MaterialCommunityIcons name="chevron-left" size={28} color="#FFFFFF" />
            </Pressable>

            {/* Menu button */}
            <Pressable style={styles.menuBtn}>
              <MaterialCommunityIcons name="dots-vertical" size={24} color="#FFFFFF" />
            </Pressable>

            {/* Profile Picture */}
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Image
                  source={require("@/assets/images/AlebusLogosSettings.png")}
                  style={styles.avatarImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Name & Email */}
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{email ?? ""}</Text>

            {/* Social Links */}
            <View style={styles.socialRow}>
              <SocialLink icon="instagram"  color="#E4405F" onPress={() => handleSocialPress("instagram")} />
              <SocialLink icon="facebook"   color="#1877F2" onPress={() => handleSocialPress("facebook")} />
              <SocialLink icon="linkedin"   color="#0A66C2" onPress={() => handleSocialPress("linkedin")} />
              <SocialLink icon="whatsapp"   color="#25D366" onPress={() => handleSocialPress("whatsapp")} />
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
                <Text style={styles.headerSubtitle}>
                  Manage your profile and preferences
                </Text>
              </View>

              {/* Action Tiles */}
              <View style={styles.tilesContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tilesScrollContent}
                >
                  {ACTION_TILES.map((tile) => (
                    <ActionTileButton
                      key={tile.id}
                      tile={tile}
                      onPress={() => handleTilePress(tile.id)}
                    />
                  ))}
                </ScrollView>
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

              {/* Notifications Section */}
              {showNotifications && (
                <View style={styles.notificationsCard}>
                  <MaterialCommunityIcons name="bell-off-outline" size={20} color={TEXT_SECONDARY} />
                  <Text style={styles.notificationsText}>No notifications</Text>
                </View>
              )}

              {/* Map Theme Section */}
              {showMapTheme && (
                <MapThemeSection
                  currentTheme={mapTheme}
                  onSelectTheme={setMapTheme}
                />
              )}

              {/* Expanded content */}
              <Animated.View style={[styles.expandedWrap, expandedOpacity]}>
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: insets.bottom + 100,
                  }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Additional settings content can go here */}
                </ScrollView>
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {/* Overscroll glow */}
          <Animated.View
            style={[styles.glowOverlay, glowStyle]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={["transparent", `${ACCENT}10`, `${ACCENT}40`]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
            />
          </Animated.View>
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  backBtn: {
    position: "absolute",
    left: 16,
    top: 52,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuBtn: {
    position: "absolute",
    right: 16,
    top: 52,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "70%",
    height: "70%",
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 20,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },

  /* Sheet */
  sheetOuter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  glowOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    zIndex: 100,
  },
  handleArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgb(255, 255, 255)",
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
    textAlign: "center",
    paddingBottom: 16,
  },

  /* Tiles */
  tilesContainer: {
    paddingHorizontal: 20,
  },
  tilesScrollContent: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
  },

  expandedWrap: {
    flex: 1,
    marginTop: 16,
  },
  notificationsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    marginTop: 16,
    marginHorizontal: 20,
    gap: 8,
  },
  notificationsText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
});
