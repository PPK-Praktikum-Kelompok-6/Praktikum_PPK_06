import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { CreateSessionInput } from '@/types/attendance';

export interface CreateSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: CreateSessionInput) => { success: boolean; message: string };
}

const PRESET_COURSES = [
  'Pemrograman Web & Mobile',
  'Struktur Data & Algoritma',
  'Basis Data Lanjut',
  'Kecerdasan Buatan',
  'Jaringan Komputer',
];

const PRESET_ROOMS = [
  'Lab Komputer 1',
  'Lab Komputer 2',
  'Lab Basis Data',
  'Lab Jaringan',
];

const PRESET_TIMES = [
  { start: '08.00', end: '10.00' },
  { start: '10.00', end: '12.00' },
  { start: '13.00', end: '15.00' },
  { start: '15.30', end: '17.30' },
];

export function CreateSessionModal({
  visible,
  onClose,
  onSubmit,
}: CreateSessionModalProps) {
  const [courseName, setCourseName] = useState('');
  const [classCode, setClassCode] = useState('A1');
  const [room, setRoom] = useState('');
  const [startTime, setStartTime] = useState('08.00');
  const [endTime, setEndTime] = useState('10.00');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCourseName('');
    setClassCode('A1');
    setRoom('');
    setStartTime('08.00');
    setEndTime('10.00');
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    if (!courseName.trim()) {
      setError('Nama mata kuliah wajib diisi atau dipilih.');
      return;
    }
    if (!room.trim()) {
      setError('Ruangan Lab praktikum wajib diisi atau dipilih.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setError('Waktu mulai dan selesai praktikum wajib diisi.');
      return;
    }

    setError(null);
    const result = onSubmit({
      courseName: courseName.trim(),
      classCode: classCode.trim() || 'A1',
      room: room.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      description: description.trim() || undefined,
    });

    if (result.success) {
      resetForm();
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <AppText variant="caption" color={Colors.primary} weight="bold">
                JADWAL BARU
              </AppText>
              <AppText variant="h2" style={styles.title}>
                Tambah Sesi Praktikum
              </AppText>
            </View>
            <Pressable
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal"
              style={styles.closeButton}
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle" size={16} color={Colors.danger} />
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {error}
                </AppText>
              </View>
            ) : null}

            {/* Mata Kuliah */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                MATA KULIAH *
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Pemrograman Web & Mobile"
                placeholderTextColor={Colors.textLight}
                value={courseName}
                onChangeText={(text) => {
                  setCourseName(text);
                  if (error) setError(null);
                }}
              />
              {/* Presets Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {PRESET_COURSES.map((course) => (
                  <Pressable
                    key={course}
                    style={[
                      styles.chip,
                      courseName === course && styles.chipActive,
                    ]}
                    onPress={() => {
                      setCourseName(course);
                      if (error) setError(null);
                    }}
                  >
                    <AppText
                      variant="caption"
                      color={courseName === course ? Colors.textWhite : Colors.textSecondary}
                      weight={courseName === course ? 'semibold' : 'regular'}
                    >
                      {course}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Ruangan Lab */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                RUANGAN LAB *
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Lab Komputer 2"
                placeholderTextColor={Colors.textLight}
                value={room}
                onChangeText={(text) => {
                  setRoom(text);
                  if (error) setError(null);
                }}
              />
              {/* Preset Rooms */}
              <View style={styles.chipsWrap}>
                {PRESET_ROOMS.map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, room === r && styles.chipActive]}
                    onPress={() => {
                      setRoom(r);
                      if (error) setError(null);
                    }}
                  >
                    <AppText
                      variant="caption"
                      color={room === r ? Colors.textWhite : Colors.textSecondary}
                      weight={room === r ? 'semibold' : 'regular'}
                    >
                      {r}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Row: Kelas & Preset Waktu */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                KELAS PRAKTIKUM
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="Contoh: A1, B2, atau C1"
                placeholderTextColor={Colors.textLight}
                value={classCode}
                onChangeText={setClassCode}
              />
            </View>

            {/* Waktu Mulai & Waktu Selesai */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                WAKTU PRAKTIKUM (WIB) *
              </AppText>
              <View style={styles.timeRow}>
                <View style={styles.timeCol}>
                  <AppText variant="caption" color={Colors.textMuted} style={styles.subLabel}>
                    Mulai
                  </AppText>
                  <TextInput
                    style={styles.input}
                    placeholder="08.00"
                    placeholderTextColor={Colors.textLight}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>

                <View style={styles.timeDivider}>
                  <AppText variant="body" color={Colors.textMuted} weight="bold">
                    -
                  </AppText>
                </View>

                <View style={styles.timeCol}>
                  <AppText variant="caption" color={Colors.textMuted} style={styles.subLabel}>
                    Selesai
                  </AppText>
                  <TextInput
                    style={styles.input}
                    placeholder="10.00"
                    placeholderTextColor={Colors.textLight}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>

              {/* Time Presets */}
              <View style={styles.chipsWrap}>
                {PRESET_TIMES.map((t) => {
                  const isMatch = startTime === t.start && endTime === t.end;
                  return (
                    <Pressable
                      key={`${t.start}-${t.end}`}
                      style={[styles.chip, isMatch && styles.chipActive]}
                      onPress={() => {
                        setStartTime(t.start);
                        setEndTime(t.end);
                      }}
                    >
                      <AppText
                        variant="caption"
                        color={isMatch ? Colors.textWhite : Colors.textSecondary}
                        weight={isMatch ? 'semibold' : 'regular'}
                      >
                        {t.start} - {t.end} WIB
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Deskripsi (Opsional) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppText variant="label" style={styles.fieldLabel}>
                  DESKRIPSI PRAKTIKUM
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  (Opsional)
                </AppText>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tambahkan petunjuk, topik materi, atau instruksi praktikum bagi mahasiswa..."
                placeholderTextColor={Colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <CustomButton
              title="Batal"
              variant="outline"
              size="md"
              onPress={handleClose}
              style={styles.footerButton}
            />
            <CustomButton
              title="Simpan Sesi"
              variant="primary"
              size="md"
              onPress={handleSave}
              style={styles.footerButton}
              icon={<Icon name="checkmark" size={18} color={Colors.textWhite} />}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  backdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  errorText: {
    flex: 1,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    color: Colors.textSecondary,
  },
  subLabel: {
    marginBottom: Spacing.xxs,
  },
  input: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeCol: {
    flex: 1,
  },
  timeDivider: {
    paddingTop: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerButton: {
    flex: 1,
  },
});

