import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { updateSession } from '@/services/sessions';
import { LabLocation } from '@/types/lab';

export interface LabLocationConfigModalProps {
  visible: boolean;
  onClose: () => void;
  initialLab?: LabLocation | null;
  currentRoomName?: string;
  initialRadiusMeters?: number;
  sessionId?: string;
  onSuccess?: (newRadiusMeters: number) => void;
}

const RADIUS_PRESETS = [30, 50, 60, 100, 150];

export function LabLocationConfigModal({
  visible,
  onClose,
  initialLab,
  currentRoomName,
  initialRadiusMeters,
  sessionId,
  onSuccess,
}: LabLocationConfigModalProps) {
  const [draftRadius, setDraftRadius] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const defaultRadius = initialRadiusMeters ?? initialLab?.radiusMeters ?? 60;
  const radiusMeters = draftRadius ?? String(defaultRadius);

  const displayLabName = initialLab?.name || currentRoomName || 'Lab D';
  const displayBuilding = initialLab?.building || 'Gedung E';
  const displayCoords = initialLab
    ? `${initialLab.latitude.toFixed(5)}, ${initialLab.longitude.toFixed(5)}`
    : 'Mengikuti titik master laboratorium';

  const handleCloseModal = () => {
    setDraftRadius(null);
    setErrorMsg('');
    onClose();
  };

  const handleSave = async () => {
    const rad = parseInt(radiusMeters, 10);

    if (isNaN(rad) || rad < 5 || rad > 1000) {
      setErrorMsg('Radius harus berupa angka antara 5 hingga 1000 meter.');
      return;
    }

    if (!sessionId) {
      setErrorMsg('ID sesi praktikum tidak ditemukan.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      // Hanya memperbarui batas radius untuk sesi praktikum ini saja,
      // tanpa mengubah master data lokasi/koordinat laboratorium di koleksi `labs`.
      await updateSession(sessionId, {
        labId: initialLab?.id,
        radiusMeters: rad,
      });

      onSuccess?.(rad);
      setDraftRadius(null);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan radius presensi sesi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCloseModal}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Icon name="locate-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.headerTextCol}>
                <AppText variant="h2">Atur Radius Presensi</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  Berlaku khusus untuk sesi praktikum ini saja
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={handleCloseModal}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={18} color={Colors.danger} />
                <AppText
                  variant="caption"
                  color={Colors.danger}
                  style={styles.errorText}
                >
                  {errorMsg}
                </AppText>
              </View>
            ) : null}

            {/* Info Lokasi Lab Terkunci (Read-Only Master Data) */}
            <View style={styles.lockedInfoCard}>
              <View style={styles.lockedHeaderRow}>
                <AppText variant="caption" color={Colors.textMuted} weight="bold">
                  INFORMASI LABORATORIUM (TETAP)
                </AppText>
                <View style={styles.lockedTag}>
                  <Icon name="lock-closed" size={12} color={Colors.textMuted} />
                  <AppText variant="caption" color={Colors.textMuted}>
                    Terkunci
                  </AppText>
                </View>
              </View>

              <View style={styles.lockedRow}>
                <Icon name="desktop-outline" size={16} color={Colors.primary} />
                <View style={styles.lockedCol}>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Nama Ruangan / Lab
                  </AppText>
                  <AppText variant="bodySm" weight="semibold">
                    {displayLabName}
                  </AppText>
                </View>
              </View>

              <View style={styles.lockedRow}>
                <Icon name="business-outline" size={16} color={Colors.primary} />
                <View style={styles.lockedCol}>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Gedung
                  </AppText>
                  <AppText variant="bodySm" color={Colors.textSecondary}>
                    {displayBuilding}
                  </AppText>
                </View>
              </View>

              <View style={styles.lockedRow}>
                <Icon name="navigate-outline" size={16} color={Colors.primary} />
                <View style={styles.lockedCol}>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Titik Koordinat Pusat (Lat, Long)
                  </AppText>
                  <AppText variant="bodySm" color={Colors.textSecondary}>
                    {displayCoords}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Batas Radius Presensi (Editable untuk sesi ini) */}
            <View style={styles.formGroup}>
              <View style={styles.radiusHeaderRow}>
                <AppText variant="caption" color={Colors.textMuted} weight="bold">
                  BATAS RADIUS PRESENSI SESI INI (METER)
                </AppText>
                <Badge
                  label={`${radiusMeters || '0'} meter`}
                  variant="attended"
                  size="sm"
                />
              </View>

              {/* Preset Chips */}
              <View style={styles.presetsRow}>
                {RADIUS_PRESETS.map((preset) => {
                  const isSelected = String(preset) === radiusMeters;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setDraftRadius(String(preset))}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipSelected,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight={isSelected ? 'bold' : 'regular'}
                        color={
                          isSelected ? Colors.textWhite : Colors.textSecondary
                        }
                      >
                        {preset} m
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.textInput}
                value={radiusMeters}
                onChangeText={setDraftRadius}
                placeholder="60"
                keyboardType="number-pad"
                placeholderTextColor={Colors.textLight}
              />
              <AppText
                variant="caption"
                color={Colors.textMuted}
                style={styles.helperText}
              >
                Perubahan radius ini hanya berlaku pada sesi praktikum ini dan tidak mengubah data utama laboratorium maupun sesi lainnya.
              </AppText>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <CustomButton
              title="Batal"
              variant="outline"
              size="md"
              onPress={handleCloseModal}
              disabled={saving}
              style={styles.cancelBtn}
            />
            <CustomButton
              title={saving ? 'Menyimpan...' : 'Simpan Radius Sesi'}
              variant="primary"
              size="md"
              loading={saving}
              onPress={handleSave}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  errorText: {
    flex: 1,
    lineHeight: 18,
  },
  lockedInfoCard: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  lockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  lockedCol: {
    flex: 1,
    gap: 1,
  },
  formGroup: {
    gap: Spacing.xxs,
  },
  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: 14,
  },
  radiusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxs,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  helperText: {
    marginTop: Spacing.xxs,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
