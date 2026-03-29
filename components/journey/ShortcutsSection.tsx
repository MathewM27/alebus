import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { loadAllStops, type NearbyStop } from "@/services/api/stops";

/* ───────────── theme ───────────── */
const ACCENT = "#c1ec72";
const BG = "#000000";
const SURFACE = "#151518";
const SUGGESTION_BG = "#1A1A1D";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "rgba(255,255,255,0.65)";
const BORDER = "rgba(255,255,255,0.12)";

/* ───────────── types ───────────── */
export interface Shortcut {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  origin: string;
  destination: string;
  originStopId?: string;
  originLat?: number;
  originLon?: number;
  destStopId?: string;
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    id: "home",
    icon: "home-outline",
    label: "Home",
    origin: "",
    destination: "",
  },
  {
    id: "work",
    icon: "briefcase-outline",
    label: "Work",
    origin: "",
    destination: "",
  },
];

/* ───────────── SuggestionList ───────────── */
function SuggestionList({
  suggestions,
  onSelect,
}: {
  suggestions: NearbyStop[];
  onSelect: (stop: NearbyStop) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <View style={sugStyles.box}>
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        indicatorStyle="white"
        style={{ maxHeight: 116 }}
      >
        {suggestions.map((stop) => (
          <Pressable
            key={stop.id}
            onPress={() => onSelect(stop)}
            style={sugStyles.row}
          >
            <View style={sugStyles.iconWrap}>
              <MaterialCommunityIcons
                name="bus-stop"
                size={14}
                color={TEXT_SECONDARY}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sugStyles.label} numberOfLines={1}>
                {stop.name}
              </Text>
              <Text style={sugStyles.sublabel} numberOfLines={1}>
                {Math.round(stop.distanceMeters)}m away
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {suggestions.length > 2 && (
        <LinearGradient
          colors={["transparent", SUGGESTION_BG]}
          style={sugStyles.fade}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
const sugStyles = StyleSheet.create({
  box: {
    backgroundColor: SUGGESTION_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 4,
    marginBottom: 4,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(173, 0, 0, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  label: { color: TEXT_PRIMARY, fontSize: 13 },
  sublabel: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 1 },
  fade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});

/* ───────────── sub-components ───────────── */

function ShortcutTile({
  shortcut,
  onTap,
  onEditPress,
}: {
  shortcut: Shortcut;
  onTap: () => void;
  onEditPress: () => void;
}) {
  return (
    <View style={styles.tileWrapper}>
      <Pressable
        onPress={onTap}
        style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
      >
        <MaterialCommunityIcons
          name={shortcut.icon}
          size={24}
          color={TEXT_PRIMARY}
        />
        <Text style={styles.tileLabel} numberOfLines={1}>
          {shortcut.label}
        </Text>
      </Pressable>
      <Pressable onPress={onEditPress} hitSlop={8} style={styles.tileEditBtn}>
        <MaterialCommunityIcons
          name="dots-vertical"
          size={14}
          color={TEXT_SECONDARY}
        />
      </Pressable>
    </View>
  );
}

function AddNewTile({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.tileWrapper}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.tile,
          styles.tileAdd,
          pressed && { opacity: 0.7 },
        ]}
      >
        <MaterialCommunityIcons name="plus" size={24} color={ACCENT} />
        <Text style={styles.tileLabel}>Add New</Text>
      </Pressable>
    </View>
  );
}

function EditCard({
  shortcut,
  editOrigin,
  editDest,
  allStops,
  onLoadStops,
  onOriginChange,
  onDestChange,
  onOriginSelect,
  onDestSelect,
  onSave,
  onDelete,
  onCancel,
  onFieldFocus,
  onFieldBlur,
}: {
  shortcut: Shortcut;
  editOrigin: string;
  editDest: string;
  allStops: NearbyStop[];
  onLoadStops: () => void;
  onOriginChange: (t: string) => void;
  onDestChange: (t: string) => void;
  onOriginSelect?: (stop: NearbyStop) => void;
  onDestSelect?: (stop: NearbyStop) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onFieldFocus?: () => void;
  onFieldBlur?: () => void;
}) {
  const [originSuggestions, setOriginSuggestions] = useState<NearbyStop[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<NearbyStop[]>([]);

  const handleOriginChange = (text: string) => {
    onOriginChange(text);
    setDestSuggestions([]);
    if (!text.trim()) { setOriginSuggestions([]); return; }
    const q = text.toLowerCase();
    setOriginSuggestions(allStops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6));
  };

  const handleDestChange = (text: string) => {
    onDestChange(text);
    setOriginSuggestions([]);
    if (!text.trim()) { setDestSuggestions([]); return; }
    const q = text.toLowerCase();
    setDestSuggestions(allStops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6));
  };

  return (
    <View style={styles.editCard}>
      <View style={styles.editHeader}>
        <View style={styles.editIconWrap}>
          <MaterialCommunityIcons name={shortcut.icon} size={20} color={ACCENT} />
        </View>
        <Text style={styles.editTitle}>Edit {shortcut.label}</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={20} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      <View style={styles.editField}>
        <MaterialCommunityIcons name="circle-outline" size={14} color={ACCENT} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.editInput}
          value={editOrigin}
          onChangeText={handleOriginChange}
          placeholder="Origin"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
          onFocus={() => { onLoadStops(); onFieldFocus?.(); }}
          onBlur={() => { setOriginSuggestions([]); onFieldBlur?.(); }}
        />
      </View>
      <SuggestionList
        suggestions={originSuggestions}
        onSelect={(stop) => { onOriginChange(stop.name); onOriginSelect?.(stop); setOriginSuggestions([]); Keyboard.dismiss(); }}
      />

      <View style={styles.editField}>
        <MaterialCommunityIcons name="map-marker" size={14} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.editInput}
          value={editDest}
          onChangeText={handleDestChange}
          placeholder="Destination"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
          onFocus={() => { onLoadStops(); onFieldFocus?.(); }}
          onBlur={() => { setDestSuggestions([]); onFieldBlur?.(); }}
        />
      </View>
      <SuggestionList
        suggestions={destSuggestions}
        onSelect={(stop) => { onDestChange(stop.name); onDestSelect?.(stop); setDestSuggestions([]); Keyboard.dismiss(); }}
      />

      <View style={styles.editActions}>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ff6b6b" />
        </Pressable>
        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AddNewForm({
  newLabel,
  newOrigin,
  newDest,
  allStops,
  onLoadStops,
  onLabelChange,
  onOriginChange,
  onDestChange,
  onOriginSelect,
  onDestSelect,
  onSave,
  onCancel,
  onFieldFocus,
  onFieldBlur,
}: {
  newLabel: string;
  newOrigin: string;
  newDest: string;
  allStops: NearbyStop[];
  onLoadStops: () => void;
  onLabelChange: (t: string) => void;
  onOriginChange: (t: string) => void;
  onDestChange: (t: string) => void;
  onOriginSelect?: (stop: NearbyStop) => void;
  onDestSelect?: (stop: NearbyStop) => void;
  onSave: () => void;
  onCancel: () => void;
  onFieldFocus?: () => void;
  onFieldBlur?: () => void;
}) {
  const isValid = newLabel.trim() && newOrigin.trim() && newDest.trim();
  const [originSuggestions, setOriginSuggestions] = useState<NearbyStop[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<NearbyStop[]>([]);

  const handleOriginChange = (text: string) => {
    onOriginChange(text);
    setDestSuggestions([]);
    if (!text.trim()) { setOriginSuggestions([]); return; }
    const q = text.toLowerCase();
    setOriginSuggestions(allStops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6));
  };

  const handleDestChange = (text: string) => {
    onDestChange(text);
    setOriginSuggestions([]);
    if (!text.trim()) { setDestSuggestions([]); return; }
    const q = text.toLowerCase();
    setDestSuggestions(allStops.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6));
  };

  return (
    <View style={styles.editCard}>
      <View style={styles.editHeader}>
        <View style={styles.editIconWrap}>
          <MaterialCommunityIcons name="plus" size={20} color={ACCENT} />
        </View>
        <Text style={styles.editTitle}>New Shortcut</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={20} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      <View style={styles.editField}>
        <MaterialCommunityIcons name="label-outline" size={14} color={ACCENT} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.editInput}
          value={newLabel}
          onChangeText={onLabelChange}
          placeholder="Label (e.g. Gym)"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
          onFocus={onFieldFocus}
          onBlur={onFieldBlur}
        />
      </View>

      <View style={styles.editField}>
        <MaterialCommunityIcons name="circle-outline" size={14} color={ACCENT} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.editInput}
          value={newOrigin}
          onChangeText={handleOriginChange}
          placeholder="Origin"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
          onFocus={() => { onLoadStops(); onFieldFocus?.(); }}
          onBlur={() => { setOriginSuggestions([]); onFieldBlur?.(); }}
        />
      </View>
      <SuggestionList
        suggestions={originSuggestions}
        onSelect={(stop) => { onOriginChange(stop.name); onOriginSelect?.(stop); setOriginSuggestions([]); Keyboard.dismiss(); }}
      />

      <View style={styles.editField}>
        <MaterialCommunityIcons name="map-marker" size={14} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.editInput}
          value={newDest}
          onChangeText={handleDestChange}
          placeholder="Destination"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
          onFocus={() => { onLoadStops(); onFieldFocus?.(); }}
          onBlur={() => { setDestSuggestions([]); onFieldBlur?.(); }}
        />
      </View>
      <SuggestionList
        suggestions={destSuggestions}
        onSelect={(stop) => { onDestChange(stop.name); onDestSelect?.(stop); setDestSuggestions([]); Keyboard.dismiss(); }}
      />

      <Pressable
        onPress={onSave}
        style={({ pressed }) => [
          styles.saveBtn,
          { marginTop: 12, marginLeft: 0 },
          !isValid && { opacity: 0.4 },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Text style={styles.saveBtnText}>Save Shortcut</Text>
      </Pressable>
    </View>
  );
}

/* ───────────── main component ───────────── */

interface ShortcutsSectionProps {
  shortcuts: Shortcut[];
  onShortcutsChange: (shortcuts: Shortcut[]) => void;
  onStartJourney: (shortcut: Shortcut) => void;
  onEditStart?: () => void;
  onEditEnd?: () => void;
  onFieldFocus?: () => void;
  onFieldBlur?: () => void;
}

export default function ShortcutsSection({
  shortcuts,
  onShortcutsChange,
  onStartJourney,
  onEditStart,
  onEditEnd,
  onFieldFocus,
  onFieldBlur,
}: ShortcutsSectionProps) {
  /* ── Edit state ── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOrigin, setEditOrigin] = useState("");
  const [editDest, setEditDest] = useState("");
  const [editOriginStop, setEditOriginStop] = useState<NearbyStop | null>(null);
  const [editDestStop, setEditDestStop] = useState<NearbyStop | null>(null);

  /* ── Add new state ── */
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newDest, setNewDest] = useState("");
  const [newOriginStop, setNewOriginStop] = useState<NearbyStop | null>(null);
  const [newDestStop, setNewDestStop] = useState<NearbyStop | null>(null);

  /* ── Stop data (loaded once on first field focus) ── */
  const [allStops, setAllStops] = useState<NearbyStop[]>([]);
  const [stopsLoaded, setStopsLoaded] = useState(false);
  const [stopsLoading, setStopsLoading] = useState(false);

  const loadStops = useCallback(async () => {
    if (stopsLoaded || stopsLoading) return;
    setStopsLoading(true);
    try {
      const stops = await loadAllStops(-20.2, 57.55);
      setAllStops(stops);
      setStopsLoaded(true);
    } catch {
      // allow retry on next focus
    } finally {
      setStopsLoading(false);
    }
  }, [stopsLoaded, stopsLoading]);

  /* ── Handlers ── */
  const handleEditToggle = (sc: Shortcut) => {
    if (editingId === sc.id) {
      setEditingId(null);
      onEditEnd?.();
    } else {
      setEditingId(sc.id);
      setEditOrigin(sc.origin);
      setEditDest(sc.destination);
      setAdding(false);
      onEditStart?.();
    }
  };

  const handleSaveEdit = (id: string) => {
    onShortcutsChange(
      shortcuts.map((s) =>
        s.id === id ? {
          ...s,
          origin: editOrigin,
          destination: editDest,
          originStopId: editOriginStop?.id,
          originLat: editOriginStop?.lat,
          originLon: editOriginStop?.lon,
          destStopId: editDestStop?.id,
        } : s,
      ),
    );
    setEditingId(null);
    setEditOriginStop(null);
    setEditDestStop(null);
    onEditEnd?.();
  };

  const handleDelete = (id: string) => {
    onShortcutsChange(shortcuts.filter((s) => s.id !== id));
    setEditingId(null);
    onEditEnd?.();
  };

  const handleAddNew = () => {
    setAdding(true);
    setNewLabel("");
    setNewOrigin("");
    setNewDest("");
    setEditingId(null);
    onEditStart?.();
  };

  const handleSaveNew = () => {
    if (!newLabel.trim() || !newOrigin.trim() || !newDest.trim()) return;
    const newSc: Shortcut = {
      id: Date.now().toString(),
      icon: "map-marker-path",
      label: newLabel.trim(),
      origin: newOrigin.trim(),
      destination: newDest.trim(),
      originStopId: newOriginStop?.id,
      originLat: newOriginStop?.lat,
      originLon: newOriginStop?.lon,
      destStopId: newDestStop?.id,
    };
    onShortcutsChange([...shortcuts, newSc]);
    setAdding(false);
    setNewOriginStop(null);
    setNewDestStop(null);
    onEditEnd?.();
  };

  const handleCancelAdd = () => {
    setAdding(false);
    onEditEnd?.();
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    onEditEnd?.();
  };

  return (
    <View style={styles.container}>
      {/* Tiles Grid — hidden while editing or adding */}
      {!editingId && !adding && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tilesScrollContent}
        >
          {shortcuts.map((sc) => (
            <ShortcutTile
              key={sc.id}
              shortcut={sc}
              onTap={() => onStartJourney(sc)}
              onEditPress={() => handleEditToggle(sc)}
            />
          ))}
          <AddNewTile onPress={handleAddNew} />
        </ScrollView>
      )}

      {/* Edit Card */}
      {editingId && (
        <EditCard
          shortcut={shortcuts.find((s) => s.id === editingId)!}
          editOrigin={editOrigin}
          editDest={editDest}
          allStops={allStops}
          onLoadStops={loadStops}
          onOriginChange={setEditOrigin}
          onDestChange={setEditDest}
          onOriginSelect={setEditOriginStop}
          onDestSelect={setEditDestStop}
          onSave={() => handleSaveEdit(editingId)}
          onDelete={() => handleDelete(editingId)}
          onCancel={handleCancelEdit}
          onFieldFocus={onFieldFocus}
          onFieldBlur={onFieldBlur}
        />
      )}

      {/* Add New Form */}
      {adding && (
        <AddNewForm
          newLabel={newLabel}
          newOrigin={newOrigin}
          newDest={newDest}
          allStops={allStops}
          onLoadStops={loadStops}
          onLabelChange={setNewLabel}
          onOriginChange={setNewOrigin}
          onDestChange={setNewDest}
          onOriginSelect={setNewOriginStop}
          onDestSelect={setNewDestStop}
          onSave={handleSaveNew}
          onCancel={handleCancelAdd}
          onFieldFocus={onFieldFocus}
          onFieldBlur={onFieldBlur}
        />
      )}
    </View>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  /* Tiles Grid */
  tilesScrollContent: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
    marginBottom: 20,
  },
  tileWrapper: {
    width: 100,
    position: "relative",
  },
  tile: {
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
  tileAdd: {
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
  },
  tileLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  tileEditBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 10,
  },

  /* Edit Card */
  editCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 18,
    marginBottom: 20,
  },
  editHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  editIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(193,236,114,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  editTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  editField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  editInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    padding: 0,
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: ACCENT,
    borderRadius: 12,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: BG,
    fontSize: 14,
    fontWeight: "600",
  },
});
