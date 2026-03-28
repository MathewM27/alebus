import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { BusDetailsDTO } from "@/services/api/buses";
import type { JourneyTrackingDTO } from "@/types/JourneyTracking";
import {
  toActiveJourneyCardModel,
  type ActiveJourneyCardModel,
} from "@/utils/activeJourneyViewModel";

/* ───────────── Skeleton Loader ───────────── */
function SkeletonText({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return <Animated.Text style={[style, { opacity }]}>---</Animated.Text>;
}

/* ───────────── theme ───────────── */
const ACCENT = "#c1ec72";
const BG = "#000000";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

interface ActiveJourneySectionProps {
  journeyRecommendations: JourneyTrackingDTO[] | null;
  busDetails: BusDetailsDTO | null;
  busStopName: string | null;
  userStopName: string | null;
  onEndTracking: () => void;
}

export default function ActiveJourneySection({
  journeyRecommendations,
  busDetails,
  busStopName,
  userStopName,
  onEndTracking,
}: ActiveJourneySectionProps) {
  if (!journeyRecommendations || journeyRecommendations.length === 0) {
    return (
      <View style={styles.inactiveCard}>
        <MaterialCommunityIcons
          name="bus-clock"
          size={20}
          color={TEXT_SECONDARY}
        />
        <Text style={styles.inactiveText}>No active journey</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {journeyRecommendations.map((journey, index) => {
        const model = toActiveJourneyCardModel(journey, busDetails, busStopName, userStopName, index);

        if (model.isActive) {
          return (
            <ActiveJourneyCard
              key={journey.journeyId}
              model={model}
              journey={journey}
            />
          );
        }

        return (
          <InactiveRecommendationCard key={journey.journeyId} model={model} />
        );
      })}

      {/* End Tracking Button */}
      <Pressable
        style={({ pressed }) => [
          styles.endTrackingBtn,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onEndTracking}
      >
        <MaterialCommunityIcons
          name="stop-circle-outline"
          size={18}
          color="#ff6b6b"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.endTrackingText}>End Tracking</Text>
      </Pressable>
    </View>
  );
}

/* ───────────── Active Journey Card ───────────── */
function ActiveJourneyCard({
  model,
  journey,
}: {
  model: ActiveJourneyCardModel;
  journey: JourneyTrackingDTO;
}) {
  return (
    <View style={styles.activeCard}>
      {/* Row 1: Distance + ETA */}
      <View style={styles.splitRow}>
        {/* Distance */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="map-marker-distance"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
          >
            {model.distanceText === "---" ? (
              <SkeletonText style={styles.distanceText} />
            ) : (
              <Text style={styles.distanceText}>{model.distanceText}</Text>
            )}
          </ScrollView>
        </View>

        {/* ETA */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
          >
            {model.etaText === "---" ? (
              <SkeletonText style={styles.etaText} />
            ) : (
              <Text style={styles.etaText}>{model.etaText}</Text>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Row 2: Bus Plate + Operator */}
      <View style={styles.splitRow}>
        {/* Bus Plate */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="card-account-details-outline"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
          >
            <Text style={styles.busPlate}>{model.busPlateLabel}</Text>
          </ScrollView>
        </View>

        {/* Bus current stop */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="bus-stop"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
          >
            <Text style={styles.operatorName}>{model.busStopName}</Text>
          </ScrollView>
        </View>
      </View>

      {/* Row 3: Proximity + Destination */}
      <View style={styles.splitRow}>
        {/* Proximity */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
          >
            <Text style={styles.proximityText}>{model.proximityLabel}</Text>
          </ScrollView>
        </View>

        {/* User boarding stop */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.textScroll}
            contentContainerStyle={styles.textScrollContent}
          >
            {model.userStopName === "—" ? (
              <SkeletonText style={styles.destinationName} />
            ) : (
              <Text style={styles.destinationName}>{model.userStopName}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

/* ───────────── Inactive Recommendation Card ───────────── */
function InactiveRecommendationCard({
  model,
}: {
  model: ActiveJourneyCardModel;
}) {
  return (
    <View style={styles.inactiveRecommendation}>
      <View style={styles.inactiveHeader}>
        <MaterialCommunityIcons
          name="bus"
          size={14}
          color="rgba(255,255,255,0.3)"
        />
        <Text style={styles.inactiveBusPlate} numberOfLines={1}>
          {model.busPlateLabel}
        </Text>
      </View>
      <View style={styles.inactiveMetrics}>
        {model.distanceText === "---" ? (
          <SkeletonText style={styles.inactiveDistance} />
        ) : (
          <Text style={styles.inactiveDistance}>{model.distanceText}</Text>
        )}
        <Text style={styles.inactiveMetricSeparator}>•</Text>
        {model.etaText === "---" ? (
          <SkeletonText style={styles.inactiveEta} />
        ) : (
          <Text style={styles.inactiveEta}>{model.etaText}</Text>
        )}
      </View>
    </View>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 10,
  },

  /* Active journey card */
  activeCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 18,
  },
  splitRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  splitItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  proximityText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  textScroll: {
    flex: 1,
  },
  textScrollContent: {
    alignItems: "center",
  },
  destinationName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  busPlate: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  operatorName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  distanceText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "600",
  },
  etaText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },

  /* Inactive recommendation cards */
  inactiveRecommendation: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
  },
  inactiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  inactiveBusPlate: {
    flex: 1,
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "600",
  },
  inactiveMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inactiveMetricSeparator: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 12,
  },
  inactiveDistance: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "600",
  },
  inactiveEta: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
  },

  /* No journey placeholder */
  inactiveCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    marginTop: 8,
    gap: 8,
  },
  inactiveText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },

  endTrackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
    height: 48,
    marginTop: 6,
  },
  endTrackingText: {
    color: "#ff6b6b",
    fontSize: 15,
    fontWeight: "600",
  },
});
