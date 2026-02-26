import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MapTheme } from "@/contexts/MapThemeContext";

/* ───────────── theme ───────────── */
const ACCENT = "#c1ec72";
const SURFACE = "#151518";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

interface MapThemeSectionProps {
  currentTheme: MapTheme;
  onSelectTheme: (theme: MapTheme) => void;
}

interface ThemeOption {
  value: MapTheme;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: "white-balance-sunny",
    description: "Bright map for daytime use",
  },
  {
    value: "dark",
    label: "Dark",
    icon: "moon-waning-crescent",
    description: "Easy on the eyes at night",
  },
];

export default function MapThemeSection({
  currentTheme,
  onSelectTheme,
}: MapThemeSectionProps) {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <Text style={styles.sectionTitle}>Choose Map Style</Text>

      {/* Theme Options */}
      {THEME_OPTIONS.map((option) => {
        const isSelected = currentTheme === option.value;
        return (
          <Pressable
            key={option.value}
            style={[styles.option, isSelected && styles.optionSelected]}
            onPress={() => onSelectTheme(option.value)}
          >
            {/* Icon */}
            <View
              style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}
            >
              <MaterialCommunityIcons
                name={option.icon}
                size={22}
                color={isSelected ? ACCENT : TEXT_SECONDARY}
              />
            </View>

            {/* Details */}
            <View style={styles.optionDetails}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>

            {/* Radio Indicator */}
            <View style={[styles.radio, isSelected && styles.radioSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  optionSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(193,236,114,0.05)",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconWrapSelected: {
    backgroundColor: "rgba(193,236,114,0.15)",
  },
  optionDetails: {
    flex: 1,
  },
  optionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: "600",
  },
  optionDescription: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: TEXT_SECONDARY,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: ACCENT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT,
  },
});
