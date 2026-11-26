import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { BoxIcon, Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { PracticalSession } from '@/types/attendance';
import { PermitAttachment } from '@/types/permit';
import { formatDateIndonesian } from '@/utils/formatTime';

export interface PermitFormProps {
  sessions: PracticalSession[];
  onSubmit: (data: {
    sessionId: string;
    classId?: string;
    classCode?: string;
    courseName: string;
    reason: string;
    attachment?: PermitAttachment;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function PermitForm({ sessions, onSubmit, isLoading = false }: PermitFormProps) {
  const insets = useSafeAreaInsets();
  const [userSelectedSessionId, setUserSelectedSessionId] = useState<string>('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<PermitAttachment | null>(null);
  const [pickingFile, setPickingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSessionId =
    userSelectedSessionId && sessions.some((s) => s.id === userSelectedSessionId)
      ? userSelectedSessionId
      : sessions[0]?.id || '';

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  const courseOptions = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.courseName).filter(Boolean))),
    [sessions]
  );

  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (courseFilter !== 'ALL' && s.courseName !== courseFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        s.courseName,
        s.classCode,
        s.date,
        formatDateIndonesian(s.date),
        s.timeSlot,
        s.deliveryMode === 'ONLINE' ? 'daring online' : s.room,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sessions, courseFilter, searchQuery]);

  const handlePickDocument = async () => {
    setErrorMessage(null);
    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const MAX_SIZE = 3 * 1024 * 1024; // Maksimal 3 MB (3,145,728 bytes)
      const fileSize = asset.size ?? 0;

      if (fileSize > MAX_SIZE) {
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        setErrorMessage(
          `Ukuran file maksimal 3 MB. File "${asset.name}" yang Anda pilih berukuran ${sizeMB} MB.`
        );
        return;
      }

      setAttachment({
        name: asset.name,
        size: fileSize,
        mimeType: asset.mimeType || 'application/octet-stream',
        uri: asset.uri,
      });
    } catch (err: any) {
      setErrorMessage('Gagal memilih file dokumen: ' + (err?.message || 'Error'));
    } finally {
      setPickingFile(false);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!selectedSessionId) {
      setErrorMessage('Silakan pilih sesi praktikum terlebih dahulu.');
      return;
    }

    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setErrorMessage('Alasan izin minimal 10 karakter agar asisten dapat memahami situasi Anda.');
      return;
    }

    try {
      await onSubmit({
        sessionId: selectedSessionId,
        classId: selectedSession?.classId,
        classCode: selectedSession?.classCode,
        courseName: selectedSession?.courseName || 'Praktikum',
        reason: trimmed,
        attachment: attachment ?? undefined,
      });
      setReason('');
      setAttachment(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim permohonan izin.';
      setErrorMessage(msg);
    }
  };

  return (
    <Card variant="flat" padding="md" style={styles.card}>
      {/* Sesi Praktikum Searchable Picker */}
      <View style={styles.field}>
        <View style={styles.fieldHeaderRow}>
          <AppText variant="label" weight="semibold" style={styles.label}>
            Pilih Sesi Praktikum
          </AppText>
          {sessions.length > 0 ? (
            <AppText variant="caption" color={Colors.textMuted}>
              {sessions.length} Sesi
            </AppText>
          ) : null}
        </View>

        {sessions.length === 0 || !selectedSession ? (
          <View style={styles.emptySessionNotice}>
            <AppText variant="caption" color={Colors.textMuted}>
              Tidak ada jadwal praktikum yang tersedia saat ini.
            </AppText>
          </View>
        ) : (
          <Pressable
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Pilih sesi praktikum"
            style={({ pressed }) => [
              styles.sessionSelector,
              pressed && styles.selectorPressed,
            ]}
          >
            <View style={styles.selectorTopRow}>
              <AppText
                variant="bodySm"
                weight="bold"
                color={Colors.text}
                numberOfLines={1}
                style={styles.selectorCourse}
              >
                {selectedSession.courseName}
              </AppText>
              <View style={styles.selectorRight}>
                <View style={styles.classPill}>
                  <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
                    Kelas {selectedSession.classCode}
                  </AppText>
                </View>
                <Icon name="chevron-down" size={18} color={Colors.primary} />
              </View>
            </View>

            <View style={styles.selectorMetaRow}>
              <Icon name="calendar-outline" size={14} color={Colors.primary} />
              <AppText variant="caption" color={Colors.primaryDark}>
                {formatDateIndonesian(selectedSession.date)} • {selectedSession.timeSlot}
              </AppText>
              <View style={styles.sessionVenueGroup}>
                <BoxIcon
                  name={selectedSession.deliveryMode === 'ONLINE' ? 'globe' : 'buildings'}
                  size={13}
                  color={Colors.primaryDark}
                />
                <AppText variant="caption" color={Colors.primaryDark} style={styles.sessionInfoText}>
                  {selectedSession.deliveryMode === 'ONLINE' ? 'Daring' : selectedSession.room}
                </AppText>
              </View>
            </View>
          </Pressable>
        )}
      </View>

      {/* Input Alasan */}
      <View style={styles.field}>
        <View style={styles.reasonHeader}>
          <AppText variant="label" weight="semibold" style={styles.label}>
            Alasan Ketidakhadiran *
          </AppText>
          <AppText
            variant="caption"
            color={reason.trim().length >= 10 ? Colors.success : Colors.textMuted}
          >
            {reason.trim().length}/10 karakter
          </AppText>
        </View>

        <TextInput
          multiline
          numberOfLines={4}
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="Contoh: Mengalami demam dan disarankan dokter istirahat selama 2 hari (surat dokter terlampir)."
          placeholderTextColor={Colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
        />
      </View>

      {/* Kolom Lampiran Dokumen Bukti (Maks. 3 MB) */}
      <View style={styles.field}>
        <AppText variant="label" weight="semibold" style={styles.label}>
          Lampiran Bukti (Opsional)
        </AppText>

        {attachment ? (
          <View style={styles.attachedCard}>
            <View style={styles.attachedLeft}>
              <View style={styles.attachedIconWrap}>
                <Icon
                  name={attachment.mimeType.includes('pdf') ? 'document-text' : 'image'}
                  size={20}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.attachedTexts}>
                <AppText variant="bodySm" weight="semibold" numberOfLines={1}>
                  {attachment.name}
                </AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  {(attachment.size / 1024).toFixed(1)} KB • Berkas Terlampir
                </AppText>
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={handleRemoveAttachment}
              style={styles.removeAttachButton}
              accessibilityRole="button"
              accessibilityLabel="Hapus lampiran"
            >
              <Icon name="trash-outline" size={18} color={Colors.danger} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.pickFileBox}
            onPress={handlePickDocument}
            disabled={pickingFile}
          >
            <View style={styles.pickIconCircle}>
              <Icon name="attach" size={18} color={Colors.primary} />
            </View>
            <View style={styles.pickFileTexts}>
              <AppText variant="bodySm" weight="semibold" color={Colors.primaryDark}>
                {pickingFile ? 'Membuka File Picker...' : 'Unggah Surat Dokter / Bukti Izin'}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                Format: PDF, JPG, JPEG, PNG • Maks. 3 MB
              </AppText>
            </View>
          </Pressable>
        )}
      </View>

      {/* Error Message Feedback */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <Icon name="alert-circle" size={16} color={Colors.danger} />
          <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
            {errorMessage}
          </AppText>
        </View>
      )}

      <CustomButton
        title={isLoading ? 'Menganalisis & Mengirim...' : 'Kirim Permohonan Izin'}
        variant="primary"
        size="md"
        loading={isLoading}
        disabled={isLoading || sessions.length === 0}
        onPress={handleSubmit}
        icon={<Icon name="paper-plane" size={16} color={Colors.surface} />}
        style={styles.submitBtn}
      />

      {/* Searchable Modal Picker untuk Memilih Sesi Praktikum */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPickerVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.pickerKeyboardWrap}
          >
            <View
              style={[
                styles.pickerSheet,
                { paddingBottom: Math.max(insets.bottom, Spacing.md) },
              ]}
            >
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHeaderText}>
                  <AppText variant="title" weight="bold">
                    Pilih Sesi Praktikum
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {sessions.length} jadwal tersedia dari kelas Anda
                  </AppText>
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => setPickerVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup daftar sesi"
                  style={styles.pickerCloseBtn}
                >
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={Colors.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Cari matkul, kelas, tanggal, atau ruang..."
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() => setSearchQuery('')}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus pencarian"
                  >
                    <Icon name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>

              {courseOptions.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.courseFilterScroll}
                  contentContainerStyle={styles.courseFilterRow}
                >
                  {['ALL', ...courseOptions].map((opt) => {
                    const active = courseFilter === opt;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setCourseFilter(opt)}
                        style={[
                          styles.courseFilterChip,
                          active && styles.courseFilterChipActive,
                        ]}
                      >
                        <AppText
                          variant="caption"
                          weight={active ? 'semibold' : 'medium'}
                          color={active ? Colors.textWhite : Colors.textSecondary}
                          numberOfLines={1}
                        >
                          {opt === 'ALL' ? 'Semua' : opt}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}

              <FlatList
                data={filteredSessions}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.pickerList}
                contentContainerStyle={styles.pickerListContent}
                ListEmptyComponent={
                  <View style={styles.emptySearchWrap}>
                    <Icon name="search-outline" size={28} color={Colors.textMuted} />
                    <AppText variant="bodySm" weight="semibold" color={Colors.textSecondary}>
                      Sesi Tidak Ditemukan
                    </AppText>
                    <AppText variant="caption" color={Colors.textMuted} align="center">
                      Ubah kata kunci pencarian atau pilih filter mata kuliah lain.
                    </AppText>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = item.id === selectedSessionId;
                  const statusLabel =
                    item.status === 'OPEN'
                      ? 'Dibuka'
                      : item.status === 'NOT_STARTED'
                      ? 'Belum Mulai'
                      : 'Ditutup';
                  return (
                    <Pressable
                      onPress={() => {
                        setUserSelectedSessionId(item.id);
                        setPickerVisible(false);
                        setSearchQuery('');
                      }}
                      style={[
                        styles.sessionOptionCard,
                        isSelected && styles.sessionOptionSelected,
                      ]}
                    >
                      <View style={styles.optionTopRow}>
                        <AppText
                          variant="bodySm"
                          weight="bold"
                          color={isSelected ? Colors.primaryDark : Colors.text}
                          numberOfLines={2}
                          style={styles.optionTitle}
                        >
                          {item.courseName}
                        </AppText>
                        <View style={styles.optionRightChips}>
                          <View style={styles.optionClassPill}>
                            <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
                              Kelas {item.classCode}
                            </AppText>
                          </View>
                          {isSelected ? (
                            <Icon name="checkmark-circle" size={18} color={Colors.primary} />
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.optionMetaRow}>
                        <Icon name="time-outline" size={13} color={Colors.textMuted} />
                        <AppText
                          variant="caption"
                          color={Colors.textSecondary}
                          style={styles.optionMetaText}
                        >
                          {formatDateIndonesian(item.date)} • {item.timeSlot}
                        </AppText>
                      </View>

                      <View style={styles.optionBottomRow}>
                        <View style={styles.sessionVenueGroup}>
                          <BoxIcon
                            name={item.deliveryMode === 'ONLINE' ? 'globe' : 'buildings'}
                            size={13}
                            color={Colors.textMuted}
                          />
                          <AppText
                            variant="caption"
                            color={Colors.textMuted}
                            style={styles.optionMetaText}
                          >
                            {item.deliveryMode === 'ONLINE' ? 'Daring (Online)' : item.room}
                          </AppText>
                        </View>
                        <AppText
                          variant="caption"
                          weight="semibold"
                          color={
                            item.status === 'OPEN'
                              ? Colors.success
                              : item.status === 'NOT_STARTED'
                              ? Colors.warning
                              : Colors.textMuted
                          }
                        >
                          {statusLabel}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  label: {
    color: Colors.text,
    flexShrink: 1,
  },
  emptySessionNotice: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
  },
  sessionSelector: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs + 2,
  },
  selectorPressed: {
    opacity: 0.85,
  },
  selectorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  selectorCourse: {
    flex: 1,
  },
  selectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  classPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  selectorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sessionVenueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  sessionInfoText: {
    flexShrink: 1,
  },
  reasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  textArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    fontSize: Typography.sm,
    color: Colors.text,
    minHeight: 88,
  },
  pickFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
  },
  pickIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickFileTexts: {
    flex: 1,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  attachedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.xs,
  },
  attachedIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedTexts: {
    flex: 1,
  },
  removeAttachButton: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerBg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dangerBg,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  submitBtn: {
    marginTop: Spacing.xs,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  pickerKeyboardWrap: {
    width: '100%',
    maxHeight: '84%',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    maxHeight: '100%',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexShrink: 0,
    marginBottom: Spacing.sm,
  },
  pickerHeaderText: {
    flex: 1,
  },
  pickerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 2,
    minHeight: 44,
    flexShrink: 0,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  courseFilterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: Spacing.sm,
  },
  courseFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  courseFilterChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  courseFilterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pickerList: {
    flexShrink: 1,
  },
  pickerListContent: {
    gap: Spacing.xs + 2,
    paddingBottom: Spacing.sm,
  },
  emptySearchWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  sessionOptionCard: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  sessionOptionSelected: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  optionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  optionTitle: {
    flex: 1,
  },
  optionRightChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 0,
  },
  optionClassPill: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  optionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  optionMetaText: {
    flexShrink: 1,
  },
  optionBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
});
