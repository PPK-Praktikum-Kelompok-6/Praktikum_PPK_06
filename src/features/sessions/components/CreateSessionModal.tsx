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
  onSubmit: (
    input: CreateSessionInput
  ) =>
    | { success: boolean; message: string }
    | Promise<{ success: boolean; message: string }>;
  defaultClassCode?: string;
  availableClasses?: string[];
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

function getFormattedDate(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatReadableDate(dateStr: string): string {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateStr;
}

export function CreateSessionModal({
  visible,
  onClose,
  onSubmit,
  defaultClassCode,
  availableClasses,
}: CreateSessionModalProps) {
  const [courseName, setCourseName] = useState('');
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const classCode = selectedClassCode ?? defaultClassCode ?? 'A1';

  // Mode Praktikum: Tatap Muka (Offline) vs Daring (Online)
  const [deliveryMode, setDeliveryMode] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [room, setRoom] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // Tanggal Praktikum
  const [sessionDate, setSessionDate] = useState(getFormattedDate(0));

  // Waktu Mulai & Selesai
  const [startTime, setStartTime] = useState('08.00');
  const [endTime, setEndTime] = useState('10.00');

  // Deskripsi opsional
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCourseName('');
    setSelectedClassCode(null);
    setDeliveryMode('OFFLINE');
    setRoom('');
    setMeetingLink('');
    setSessionDate(getFormattedDate(0));
    setStartTime('08.00');
    setEndTime('10.00');
    setDescription('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!courseName.trim()) {
      setError('Nama mata kuliah wajib diisi atau dipilih.');
      return;
    }
    if (deliveryMode === 'OFFLINE' && !room.trim()) {
      setError('Ruangan Lab praktikum tatap muka wajib diisi.');
      return;
    }
    if (deliveryMode === 'ONLINE' && !meetingLink.trim()) {
      setError('Link pertemuan praktikum online (Zoom / Google Meet) wajib diisi.');
      return;
    }
    if (!sessionDate.trim()) {
      setError('Tanggal pelaksanaan praktikum wajib dipilih atau diisi.');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setError('Waktu mulai dan selesai praktikum wajib diisi.');
      return;
    }

    const finalRoom =
      deliveryMode === 'ONLINE'
        ? room.trim() || 'Daring (Google Meet / Zoom)'
        : room.trim();

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await Promise.resolve(
        onSubmit({
          courseName: courseName.trim(),
          classCode: classCode.trim() || 'A1',
          room: finalRoom,
          startTime: startTime.trim(),
          endTime: endTime.trim(),
          date: sessionDate.trim(),
          deliveryMode,
          meetingLink: meetingLink.trim() || undefined,
          description: description.trim() || undefined,
        })
      );

      if (result.success) {
        resetForm();
        onClose();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan sesi praktikum.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = getFormattedDate(0);
  const tomorrowStr = getFormattedDate(1);
  const lusaStr = getFormattedDate(2);

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

            {/* Kelas Praktikum */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                PILIH KELAS PRAKTIKUM *
              </AppText>
              <View style={styles.chipsWrap}>
                {(availableClasses && availableClasses.length > 0
                  ? availableClasses
                  : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2']
                ).map((code) => {
                  const isSelected = classCode.toUpperCase() === code.toUpperCase();
                  return (
                    <Pressable
                      key={code}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedClassCode(code)}
                    >
                      <AppText
                        variant="caption"
                        color={isSelected ? Colors.textWhite : Colors.textSecondary}
                        weight={isSelected ? 'semibold' : 'regular'}
                      >
                        Kelas {code}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Mode Praktikum: Tatap Muka (Offline) vs Daring (Online) */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                METODE PELAKSANAAN *
              </AppText>
              <View style={styles.modeToggleRow}>
                <Pressable
                  style={[
                    styles.modeButton,
                    deliveryMode === 'OFFLINE' && styles.modeButtonActive,
                  ]}
                  onPress={() => {
                    setDeliveryMode('OFFLINE');
                    if (error) setError(null);
                  }}
                >
                  <Icon
                    name="business-outline"
                    size={16}
                    color={deliveryMode === 'OFFLINE' ? Colors.textWhite : Colors.textSecondary}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={deliveryMode === 'OFFLINE' ? Colors.textWhite : Colors.textSecondary}
                  >
                    Offline (Lab Fisik)
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.modeButton,
                    deliveryMode === 'ONLINE' && styles.modeButtonActive,
                  ]}
                  onPress={() => {
                    setDeliveryMode('ONLINE');
                    if (error) setError(null);
                  }}
                >
                  <Icon
                    name="videocam-outline"
                    size={16}
                    color={deliveryMode === 'ONLINE' ? Colors.textWhite : Colors.textSecondary}
                  />
                  <AppText
                    variant="caption"
                    weight="bold"
                    color={deliveryMode === 'ONLINE' ? Colors.textWhite : Colors.textSecondary}
                  >
                    Online (Daring / Meet)
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Ruangan Lab (Jika Offline) / Keterangan Ruang (Jika Online) */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                {deliveryMode === 'OFFLINE' ? 'RUANGAN LAB *' : 'KETERANGAN RUANG VIRTUAL'}
              </AppText>
              <TextInput
                style={styles.input}
                placeholder={
                  deliveryMode === 'OFFLINE'
                    ? 'Contoh: Lab Komputer 2'
                    : 'Contoh: Google Meet / Zoom Conference'
                }
                placeholderTextColor={Colors.textLight}
                value={room}
                onChangeText={(text) => {
                  setRoom(text);
                  if (error) setError(null);
                }}
              />
              {deliveryMode === 'OFFLINE' && (
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
              )}
            </View>

            {/* Kolom Link Praktikum (Wajib jika Online, atau Link Tambahan jika Offline) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <AppText variant="label" style={styles.fieldLabel}>
                  {deliveryMode === 'ONLINE'
                    ? 'LINK PERTEMUAN PRAKTIKUM (MEET/ZOOM) *'
                    : 'LINK / TAUTAN PRAKTIKUM (OPSIONAL)'}
                </AppText>
                {deliveryMode === 'OFFLINE' && (
                  <AppText variant="caption" color={Colors.textMuted}>
                    (Opsional)
                  </AppText>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder={
                  deliveryMode === 'ONLINE'
                    ? 'https://meet.google.com/xyz-abcd-efg atau link Zoom'
                    : 'https://... (Link modul/lokasi/meeting opsional)'
                }
                placeholderTextColor={Colors.textLight}
                value={meetingLink}
                autoCapitalize="none"
                keyboardType="url"
                onChangeText={(text) => {
                  setMeetingLink(text);
                  if (error) setError(null);
                }}
              />
            </View>

            {/* Tanggal Praktikum */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                TANGGAL PELAKSANAAN *
              </AppText>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (Contoh: 2026-11-20)"
                placeholderTextColor={Colors.textLight}
                value={sessionDate}
                onChangeText={(text) => {
                  setSessionDate(text);
                  if (error) setError(null);
                }}
              />
              {/* Quick Date Presets */}
              <View style={styles.chipsWrap}>
                <Pressable
                  style={[styles.chip, sessionDate === todayStr && styles.chipActive]}
                  onPress={() => setSessionDate(todayStr)}
                >
                  <AppText
                    variant="caption"
                    color={sessionDate === todayStr ? Colors.textWhite : Colors.textSecondary}
                    weight={sessionDate === todayStr ? 'semibold' : 'regular'}
                  >
                    Hari Ini ({formatReadableDate(todayStr).split(',')[0]})
                  </AppText>
                </Pressable>

                <Pressable
                  style={[styles.chip, sessionDate === tomorrowStr && styles.chipActive]}
                  onPress={() => setSessionDate(tomorrowStr)}
                >
                  <AppText
                    variant="caption"
                    color={sessionDate === tomorrowStr ? Colors.textWhite : Colors.textSecondary}
                    weight={sessionDate === tomorrowStr ? 'semibold' : 'regular'}
                  >
                    Besok ({formatReadableDate(tomorrowStr).split(',')[0]})
                  </AppText>
                </Pressable>

                <Pressable
                  style={[styles.chip, sessionDate === lusaStr && styles.chipActive]}
                  onPress={() => setSessionDate(lusaStr)}
                >
                  <AppText
                    variant="caption"
                    color={sessionDate === lusaStr ? Colors.textWhite : Colors.textSecondary}
                    weight={sessionDate === lusaStr ? 'semibold' : 'regular'}
                  >
                    Lusa ({formatReadableDate(lusaStr).split(',')[0]})
                  </AppText>
                </Pressable>
              </View>

              {/* Formatted Date Preview */}
              <View style={styles.datePreviewBox}>
                <Icon name="calendar-outline" size={14} color={Colors.primary} />
                <AppText variant="caption" color={Colors.primaryDark} weight="medium">
                  {formatReadableDate(sessionDate)}
                </AppText>
              </View>
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

            {/* Deskripsi (Murni Opsional) */}
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
                placeholder="Tambahkan petunjuk, topik materi, atau instruksi praktikum bagi mahasiswa (boleh dikosongkan)..."
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
              loading={isSubmitting}
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
    maxHeight: '92%',
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
    minHeight: 70,
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
  modeToggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  datePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginTop: Spacing.xxs,
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
