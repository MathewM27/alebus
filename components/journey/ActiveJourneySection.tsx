import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useStopLookup } from "@/hooks/useStopLookup";
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
  onEndTracking: () => void;
}

export default function ActiveJourneySection({
  journeyRecommendations,
  onEndTracking,
}: ActiveJourneySectionProps) {
  // Gather all destination stop IDs for lookup
  const stopIds =
    journeyRecommendations?.map((j) => j.destinationStopId).filter(Boolean) ??
    [];
  const { data: stopLookup } = useStopLookup(stopIds);

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
        const model = toActiveJourneyCardModel(journey, stopLookup, index);

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

      {/* End Tracking Button - below all recommendations */}
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
          {model.distanceText === "---" ? (
            <SkeletonText style={styles.distanceText} />
          ) : (
            <Text style={styles.distanceText} numberOfLines={1}>
              {model.distanceText}
            </Text>
          )}
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
          {model.etaText === "---" ? (
            <SkeletonText style={styles.etaText} />
          ) : (
            <Text style={styles.etaText} numberOfLines={1}>
              {model.etaText}
            </Text>
          )}
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
          <Text style={styles.busPlate} numberOfLines={1} ellipsizeMode="tail">
            {model.busPlateLabel}
          </Text>
        </View>

        {/* Operator */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="bus"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          <Text
            style={styles.operatorName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {model.operatorName}
          </Text>
        </View>
      </View>

      {/* Row 3: Proximity Badge + Destination */}
      <View style={styles.splitRow}>
        {/* Proximity Badge */}
        <View style={styles.splitItem}>
          <View
            style={[
              styles.proximityBadge,
              { backgroundColor: model.proximityColor.bg },
            ]}
          >
            <View
              style={[
                styles.activeDot,
                { backgroundColor: model.proximityColor.text },
              ]}
            />
            <Text
              style={[
                styles.proximityText,
                { color: model.proximityColor.text },
              ]}
            >
              {model.proximityLabel}
            </Text>
          </View>
        </View>

        {/* Destination */}
        <View style={styles.splitItem}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={TEXT_SECONDARY}
            />
          </View>
          {model.destinationName === "Destination" ? (
            <SkeletonText style={styles.destinationName} />
          ) : (
            <Text
              style={styles.destinationName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {model.destinationName}
            </Text>
          )}
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
        {model.destinationName === "Destination" ? (
          <SkeletonText style={[styles.inactiveDestination, { flex: 1 }]} />
        ) : (
          <Text style={styles.inactiveDestination} numberOfLines={1}>
            {model.destinationName}
          </Text>
        )}
        <View
          style={[
            styles.inactiveProximityBadge,
            { backgroundColor: "rgba(255,255,255,0.05)" },
          ]}
        >
          <Text style={styles.inactiveProximityText}>
            {model.proximityLabel}
          </Text>
        </View>
      </View>
      <View style={styles.inactiveMetrics}>
        {model.distanceText === "---" ? (
          <SkeletonText style={styles.inactiveDistance} />
        ) : (
          <Text style={styles.inactiveDistance}>{model.distanceText}</Text>
        )}
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
    gap: 16,
  },
  splitItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  proximityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  proximityText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
  },
  destinationName: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  busPlate: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  operatorName: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  distanceText: {
    flex: 1,
    color: ACCENT,
    fontSize: 18,
    fontWeight: "700",
  },
  etaText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },

  /* End Tracking Button */
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
  inactiveDestination: {
    flex: 1,
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500",
  },
  inactiveProximityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  inactiveProximityText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  inactiveMetrics: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  inactiveDistance: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontWeight: "600",
  },
  inactiveEta: {
    color: "rgba(255,255,255,0.25)",
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
    marginTop: 16,
    gap: 8,
  },
  inactiveText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
});
