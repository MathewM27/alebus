import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

/* ───────────── theme ───────────── */
const ACCENT = '#c1ec72';
const SURFACE = '#151518';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.12)';

interface ProfileEditSectionProps {
  profileName: string;
  profileEmail: string;
  editingName: boolean;
  editingEmail: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onToggleNameEdit: () => void;
  onToggleEmailEdit: () => void;
  onUpdate: () => void;
}

export default function ProfileEditSection({
  profileName,
  profileEmail,
  editingName,
  editingEmail,
  onNameChange,
  onEmailChange,
  onToggleNameEdit,
  onToggleEmailEdit,
  onUpdate,
}: ProfileEditSectionProps) {
  return (
    <View style={styles.container}>
      {/* Name Field */}
      <View style={styles.editFieldRow}>
        <View style={styles.editFieldContent}>
          <Text style={styles.editFieldLabel}>Name</Text>
          <TextInput
            style={[
              styles.editFieldInput,
              !editingName && styles.editFieldInputDisabled,
            ]}
            value={profileName}
            onChangeText={onNameChange}
            editable={editingName}
            placeholderTextColor="rgba(255,255,255,0.3)"
            selectionColor={ACCENT}
          />
        </View>
        <Pressable
          style={styles.editFieldPenBtn}
          onPress={onToggleNameEdit}
        >
          <MaterialCommunityIcons
            name={editingName ? 'check' : 'pencil-outline'}
            size={18}
            color={editingName ? ACCENT : TEXT_SECONDARY}
          />
        </Pressable>
      </View>

      {/* Email Field */}
      <View style={styles.editFieldRow}>
        <View style={styles.editFieldContent}>
          <Text style={styles.editFieldLabel}>Email</Text>
          <TextInput
            style={[
              styles.editFieldInput,
              !editingEmail && styles.editFieldInputDisabled,
            ]}
            value={profileEmail}
            onChangeText={onEmailChange}
            editable={editingEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="rgba(255,255,255,0.3)"
            selectionColor={ACCENT}
          />
        </View>
        <Pressable
          style={styles.editFieldPenBtn}
          onPress={onToggleEmailEdit}
        >
          <MaterialCommunityIcons
            name={editingEmail ? 'check' : 'pencil-outline'}
            size={18}
            color={editingEmail ? ACCENT : TEXT_SECONDARY}
          />
        </Pressable>
      </View>

      {/* Update Button - shows when either field is being edited */}
      {(editingName || editingEmail) && (
        <Pressable
          style={({ pressed }) => [
            styles.updateBtn,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onUpdate}
        >
          <Text style={styles.updateBtnText}>Update</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  editFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editFieldContent: {
    flex: 1,
  },
  editFieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  editFieldInput: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    padding: 0,
  },
  editFieldInputDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  editFieldPenBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  updateBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  updateBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});
