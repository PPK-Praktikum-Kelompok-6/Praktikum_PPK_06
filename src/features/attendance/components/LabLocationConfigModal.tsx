import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { upsertLabLocation } from '@/services/labs';
import { updateSession } from '@/services/sessions';
import { LabLocation } from '@/types/lab';

export interface LabLocationConfigModalProps {
  visible: boolean;
  onClose: () => void;
  initialLab?: LabLocation | null;
  currentRoomName?: string;
  sessionId?: string;
  onSuccess?: (lab: LabLocation) => void;
}

const RADIUS_PRESETS = [30, 50, 60, 100];

export function LabLocationConfigModal({
  visible,
  onClose,
  initialLab,
  currentRoomName,
  sessionId,
  onSuccess,
}: LabLocationConfigModalProps) {
  const [labName, setLabName] = useState('');
  const [building, setBuilding] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusMeters, setRadiusMeters] = useState('60');

  const [loadingGps, setLoadingGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setLabName(initialLab?.name || currentRoomName || 'Lab Komputer 1');
      setBuilding(initialLab?.building || 'Gedung E Departemen Informatika');
      setLatitude(initialLab ? String(initialLab.latitude) : '-7.04975');
      setLongitude(initialLab ? String(initialLab.longitude) : '110.44045');
      setRadiusMeters(initialLab ? String(initialLab.radiusMeters) : '60');
      setErrorMsg('');
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, initialLab, currentRoomName]);

  const handleUseCurrentLocation = async () => {
    setLoadingGps(true);
    setErrorMsg('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan perangkat.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Gagal memperoleh lokasi GPS saat ini. Pastikan GPS aktif.'
      );
    } finally {
      setLoadingGps(false);
    }
  };

  const handleSave = async () => {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = parseInt(radiusMeters, 10);

    if (!labName.trim()) {
      setErrorMsg('Nama laboratorium/ruangan tidak boleh kosong.');
      return;
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Nilai Latitude tidak valid (rentang -90 s/d 90).');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setErrorMsg('Nilai Longitude tidak valid (rentang -180 s/d 180).');
      return;
    }
    if (isNaN(rad) || rad < 5 || rad > 1000) {
      setErrorMsg('Radius harus berupa angka antara 5 hingga 1000 meter.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const labPayload: Omit<LabLocation, 'updatedAt'> = {
        id:
          initialLab?.id ||
          `lab-${labName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}`,
        name: labName.trim(),
        building: building.trim() || 'Gedung E Departemen Informatika',
        latitude: lat,
        longitude: lon,
        radiusMeters: rad,
        updatedBy: 'Asisten Praktikum',
      };

      // 1. Simpan/perbarui ke koleksi labs di Firestore (SRS-S3-03)
      await upsertLabLocation(labPayload);

      // 2. Jika dipanggil dari sesi tertentu, perbarui sesi di Firestore
      if (sessionId) {
        await updateSession(sessionId, {
          labId: labPayload.id,
          radiusMeters: rad,
        });
      }

      const savedLab: LabLocation = {
        ...labPayload,
        updatedAt: new Date().toISOString(),
      };

      if (onSuccess) {
        onSuccess(savedLab);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan konfigurasi lokasi lab.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Icon name="location-outline" size={22} color={Colors.primary} />
              </View>
              <View>
                <AppText variant="h2">Lokasi & Radius Lab</AppText>
                <AppText variant="caption" color={Colors.textMuted}>
                  Kelola koordinat GPS dan batas presensi praktikan
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup"
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={18} color={Colors.danger} />
                <AppText variant="caption" color={Colors.danger} style={styles.errorText}>
                  {errorMsg}
                </AppText>
              </View>
            ) : null}

            {/* Nama Ruangan & Gedung */}
            <View style={styles.formGroup}>
              <AppText variant="caption" color={Colors.textMuted} weight="bold">
                NAMA LABORATORIUM / RUANG
              </AppText>
              <TextInput
                style={styles.textInput}
                value={labName}
                onChangeText={setLabName}
                placeholder="Contoh: Lab Komputer 1"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <AppText variant="caption" color={Colors.textMuted} weight="bold">
                GEDUNG / KETERANGAN
              </AppText>
              <TextInput
                style={styles.textInput}
                value={building}
                onChangeText={setBuilding}
                placeholder="Contoh: Gedung E Lt. 2 Departemen Informatika"
                placeholderTextColor={Colors.textLight}
              />
            </View>

            {/* Koordinat GPS */}
            <View style={styles.coordsHeaderRow}>
              <AppText variant="caption" color={Colors.textMuted} weight="bold">
                TITIK KOORDINAT PUSAT
              </AppText>
              <Pressable
                onPress={handleUseCurrentLocation}
                disabled={loadingGps}
                style={({ pressed }) => [
                  styles.gpsButton,
                  pressed && styles.gpsButtonPressed,
                  loadingGps && styles.gpsButtonDisabled,
                ]}
              >
                {loadingGps ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Icon name="locate" size={14} color={Colors.primary} />
                )}
                <AppText variant="caption" weight="semibold" color={Colors.primary}>
                  {loadingGps ? 'Membaca GPS...' : 'Gunakan Posisi Saya'}
                </AppText>
              </Pressable>
            </View>

            <View style={styles.coordsRow}>
              <View style={styles.coordCol}>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Latitude
                </AppText>
                <TextInput
                  style={styles.textInput}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="-7.04975"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.coordCol}>
                <AppText variant="caption" color={Colors.textSecondary}>
                  Longitude
                </AppText>
                <TextInput
                  style={styles.textInput}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="110.44045"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            {/* Batas Radius Presensi */}
            <View style={styles.formGroup}>
              <View style={styles.radiusHeaderRow}>
                <AppText variant="caption" color={Colors.textMuted} weight="bold">
                  BATAS RADIUS PRESENSI (METER)
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
                      onPress={() => setRadiusMeters(String(preset))}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipSelected,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight={isSelected ? 'bold' : 'regular'}
                        color={isSelected ? Colors.textWhite : Colors.textSecondary}
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
                onChangeText={setRadiusMeters}
                placeholder="60"
                keyboardType="number-pad"
                placeholderTextColor={Colors.textLight}
              />
              <AppText variant="caption" color={Colors.textMuted} style={styles.helperText}>
                Praktikan hanya dapat presensi jika berada dalam batas radius ini dari titik lab.
              </AppText>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <CustomButton
              title="Batal"
              variant="outline"
              size="md"
              onPress={onClose}
              disabled={saving}
              style={styles.cancelBtn}
            />
            <CustomButton
              title={saving ? 'Menyimpan...' : 'Simpan Lokasi Lab'}
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
  formGroup: {
    gap: Spacing.xxs,
  },
  coordsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    backgroundColor: Colors.primaryBg,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  gpsButtonPressed: {
    opacity: 0.7,
  },
  gpsButtonDisabled: {
    opacity: 0.5,
  },
  coordsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  coordCol: {
    flex: 1,
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
