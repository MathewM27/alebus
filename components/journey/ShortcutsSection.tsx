import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

/* ───────────── theme ───────────── */
const ACCENT = "#c1ec72";
const BG = "#000000";
const SURFACE = "#151518";
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
}

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    id: "home",
    icon: "home-outline",
    label: "Home",
    origin: "Curepipe Central",
    destination: "Port Louis Terminal",
  },
  {
    id: "work",
    icon: "briefcase-outline",
    label: "Work",
    origin: "Port Louis Terminal",
    destination: "Curepipe Central",
  },
  {
    id: "school",
    icon: "school-outline",
    label: "School",
    origin: "Rose Hill Hub",
    destination: "Quatre Bornes",
  },
];

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
  onOriginChange,
  onDestChange,
  onSave,
  onDelete,
  onCancel,
}: {
  shortcut: Shortcut;
  editOrigin: string;
  editDest: string;
  onOriginChange: (t: string) => void;
  onDestChange: (t: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={styles.editCard}>
      <View style={styles.editHeader}>
        <View style={styles.editIconWrap}>
          <MaterialCommunityIcons
            name={shortcut.icon}
            size={20}
            color={ACCENT}
          />
        </View>
        <Text style={styles.editTitle}>Edit {shortcut.label}</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={TEXT_SECONDARY}
          />
        </Pressable>
      </View>

      <View style={styles.editField}>
        <MaterialCommunityIcons
          name="circle-outline"
          size={14}
          color={ACCENT}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.editInput}
          value={editOrigin}
          onChangeText={onOriginChange}
          placeholder="Origin"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>
      <View style={styles.editField}>
        <MaterialCommunityIcons
          name="map-marker"
          size={14}
          color={TEXT_SECONDARY}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.editInput}
          value={editDest}
          onChangeText={onDestChange}
          placeholder="Destination"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>

      <View style={styles.editActions}>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={16}
            color="#ff6b6b"
          />
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
  onLabelChange,
  onOriginChange,
  onDestChange,
  onSave,
  onCancel,
}: {
  newLabel: string;
  newOrigin: string;
  newDest: string;
  onLabelChange: (t: string) => void;
  onOriginChange: (t: string) => void;
  onDestChange: (t: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isValid = newLabel.trim() && newOrigin.trim() && newDest.trim();

  return (
    <View style={styles.editCard}>
      <View style={styles.editHeader}>
        <View style={styles.editIconWrap}>
          <MaterialCommunityIcons name="plus" size={20} color={ACCENT} />
        </View>
        <Text style={styles.editTitle}>New Shortcut</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={TEXT_SECONDARY}
          />
        </Pressable>
      </View>

      <View style={styles.editField}>
        <MaterialCommunityIcons
          name="label-outline"
          size={14}
          color={ACCENT}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.editInput}
          value={newLabel}
          onChangeText={onLabelChange}
          placeholder="Label (e.g. Gym)"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>
      <View style={styles.editField}>
        <MaterialCommunityIcons
          name="circle-outline"
          size={14}
          color={ACCENT}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.editInput}
          value={newOrigin}
          onChangeText={onOriginChange}
          placeholder="Origin"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>
      <View style={styles.editField}>
        <MaterialCommunityIcons
          name="map-marker"
          size={14}
          color={TEXT_SECONDARY}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.editInput}
          value={newDest}
          onChangeText={onDestChange}
          placeholder="Destination"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>

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
}

export default function ShortcutsSection({
  shortcuts,
  onShortcutsChange,
  onStartJourney,
  onEditStart,
  onEditEnd,
}: ShortcutsSectionProps) {
  /* ── Edit state ── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOrigin, setEditOrigin] = useState("");
  const [editDest, setEditDest] = useState("");

  /* ── Add new state ── */
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newOrigin, setNewOrigin] = useState("");
  const [newDest, setNewDest] = useState("");

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
        s.id === id ? { ...s, origin: editOrigin, destination: editDest } : s,
      ),
    );
    setEditingId(null);
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
    };
    onShortcutsChange([...shortcuts, newSc]);
    setAdding(false);
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
      {/* Section Label */}
      <Text style={styles.sectionLabel}>Shortcuts</Text>

      {/* Tiles Grid */}
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

      {/* Edit Card */}
      {editingId && (
        <EditCard
          shortcut={shortcuts.find((s) => s.id === editingId)!}
          editOrigin={editOrigin}
          editDest={editDest}
          onOriginChange={setEditOrigin}
          onDestChange={setEditDest}
          onSave={() => handleSaveEdit(editingId)}
          onDelete={() => handleDelete(editingId)}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Add New Form */}
      {adding && (
        <AddNewForm
          newLabel={newLabel}
          newOrigin={newOrigin}
          newDest={newDest}
          onLabelChange={setNewLabel}
          onOriginChange={setNewOrigin}
          onDestChange={setNewDest}
          onSave={handleSaveNew}
          onCancel={handleCancelAdd}
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
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
