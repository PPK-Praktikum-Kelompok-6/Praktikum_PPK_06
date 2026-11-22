import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { FeedbackModal } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  assignAssistantToClass,
  subscribeAllClasses,
  toggleActiveClass,
} from '@/services/admin';
import { getDemoAccounts } from '@/services/auth';
import { PracticalClass } from '@/services/sessions';

export default function AdminClassesScreen() {
  const [classes, setClasses] = useState<PracticalClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<PracticalClass | null>(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Ambil daftar asisten yang tersedia dari akun demo/sistem
  const availableAssistants = getDemoAccounts().filter(
    (acc) => acc.role === 'ASSISTANT'
  );

  useEffect(() => {
    const unsub = subscribeAllClasses((list) => {
      setClasses(list);
    });
    return () => unsub();
  }, []);

  const handleOpenAssign = (cls: PracticalClass) => {
    setSelectedClass(cls);
    setAssignModalVisible(true);
  };

  const handleSelectAssistant = async (ast: (typeof availableAssistants)[0]) => {
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      await assignAssistantToClass(
        selectedClass.id,
        selectedClass.classCode,
        ast.uid,
        ast.name
      );
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Penugasan Berhasil',
        message: `Asisten ${ast.name} (${ast.identifier}) berhasil ditetapkan sebagai penanggung jawab Kelas ${selectedClass.classCode}.`,
      });
      setAssignModalVisible(false);
      setSelectedClass(null);
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Menugaskan Asisten',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cls: PracticalClass) => {
    const nextState = cls.isOpen === false;
    try {
      await toggleActiveClass(cls.id, cls.classCode, nextState);
      setFeedback({
        visible: true,
        type: 'info',
        title: nextState ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup',
        message: `Status ketersediaan pendaftaran untuk Kelas ${cls.classCode} sekarang ${
          nextState ? 'DIBUKA' : 'DITUTUP'
        }.`,
      });
    } catch (err: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Mengubah Status',
        message: err?.message || 'Terjadi kesalahan sistem.',
      });
    }
  };

  return (
    <Screen scroll withBottomNavPadding style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="caption" color={Colors.primary} weight="bold">
          MANAJEMEN KELAS & ASISTEN
        </AppText>
        <AppText variant="h1" style={styles.title}>
          Tanggung Jawab Kelas
        </AppText>
        <AppText variant="bodySm" color={Colors.textSecondary}>
          Administrator berwenang menentukan dan memberikan akses kelas laboratorium kepada masing-masing asisten
        </AppText>
      </View>

      {/* Summary Responsibility Card */}
      <Card variant="accent" padding="md" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Icon name="shield-checkmark" size={20} color={Colors.primary} />
          <AppText variant="caption" weight="bold" color={Colors.primaryDark}>
            REKAP PENUGASAN ASISTEN SAAT INI
          </AppText>
        </View>
        <View style={styles.summaryList}>
          {availableAssistants.map((ast) => {
            const assignedClasses = classes.filter((c) => {
              const ids = c.assistantIds || (c.assistantId ? [c.assistantId] : []);
              const names = c.assistantNames || (c.assistantName ? [c.assistantName] : []);
              const firstName = ast.name.toLowerCase().split(' ')[0];
              return (
                ids.includes(ast.uid) ||
                names.some((n) => n.toLowerCase().includes(firstName))
              );
            });
            return (
              <View key={ast.uid} style={styles.assistantSummaryRow}>
                <View style={styles.astInfoCol}>
                  <AppText variant="bodySm" weight="semibold">
                    {ast.name} ({ast.identifier})
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    {assignedClasses.length > 0
                      ? `Mengampu: ${assignedClasses.map((c) => `Kelas ${c.classCode}`).join(', ')}`
                      : 'Belum ada kelas yang ditugaskan'}
                  </AppText>
                </View>
                <Badge
                  label={`${assignedClasses.length} Kelas`}
                  variant={assignedClasses.length > 0 ? 'primary' : 'closed'}
                  size="sm"
                />
              </View>
            );
          })}
        </View>
      </Card>

      {/* Class List */}
      <View style={styles.sectionTitleRow}>
        <AppText variant="title">Daftar Kelas Laboratorium</AppText>
        <AppText variant="caption" color={Colors.textMuted}>
          {classes.length} Kelas Terdaftar
        </AppText>
      </View>

      {classes.length === 0 ? (
        <EmptyState
          title="Tidak Ada Data Kelas"
          message="Belum ada kelas laboratorium yang terdaftar di sistem."
          iconName="school-outline"
        />
      ) : (
        classes.map((cls) => {
          return (
            <Card key={cls.id} variant="default" padding="md" style={styles.classCard}>
              <View style={styles.classCardTop}>
                <View style={styles.classBadge}>
                  <AppText variant="h2" weight="bold" color={Colors.primary}>
                    {cls.classCode}
                  </AppText>
                </View>

                <View style={styles.classDetails}>
                  <View style={styles.classTitleRow}>
                    <AppText variant="title" weight="bold">
                      {cls.courseName ? `${cls.courseName} (${cls.classCode})` : `Kelas ${cls.classCode}`}
                    </AppText>
                    <Badge
                      label={cls.isOpen !== false ? 'Terbuka' : 'Ditutup'}
                      variant={cls.isOpen !== false ? 'open' : 'closed'}
                      size="sm"
                      showDot
                    />
                  </View>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Ruangan: {cls.room || 'Lab Komputer'} • {cls.studentIds?.length || 0} Praktikan Terdaftar
                  </AppText>
                  <AppText variant="caption" color={Colors.textSecondary}>
                    Kode Praktikan: {cls.studentJoinCode || '-'} • Invite Asprak: {cls.assistantInviteCode || '-'}
                  </AppText>
                  <View style={styles.assistantBadgeRow}>
                    <Icon name="people" size={13} color={Colors.primary} />
                    <AppText variant="caption" weight="semibold" color={Colors.primary}>
                      Asprak: {(cls.assistantNames && cls.assistantNames.length > 0 ? cls.assistantNames.join(', ') : cls.assistantName) || 'Belum Ditugaskan'}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={styles.classActionRow}>
                <View style={styles.actionBtnCol}>
                  <CustomButton
                    title={cls.isOpen !== false ? 'Tutup Pendaftaran' : 'Buka Pendaftaran'}
                    variant={cls.isOpen !== false ? 'outline' : 'primary'}
                    size="sm"
                    onPress={() => handleToggleActive(cls)}
                  />
                </View>
                <View style={styles.actionBtnCol}>
                  <CustomButton
                    title="Tugaskan Asisten"
                    variant="outline"
                    size="sm"
                    icon={<Icon name="swap-horizontal" size={16} color={Colors.primary} />}
                    onPress={() => handleOpenAssign(cls)}
                  />
                </View>
              </View>
            </Card>
          );
        })
      )}

      {/* Modal Pemilihan Asisten */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAssignModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <AppText variant="title" weight="bold">
            Pilih Asisten Penanggung Jawab
          </AppText>
          <AppText variant="caption" color={Colors.textSecondary} style={styles.modalSub}>
            Tentukan asisten yang bertanggung jawab untuk mengampu{' '}
            <AppText variant="caption" weight="bold">
              Kelas {selectedClass?.classCode} ({selectedClass?.courseName})
            </AppText>
          </AppText>

          <View style={styles.assistantListWrap}>
            {availableAssistants.map((ast) => {
              const isCurrent =
                selectedClass?.assistantId === ast.uid ||
                selectedClass?.assistantName === ast.name;
              return (
                <Pressable
                  key={ast.uid}
                  style={[styles.assistantChoiceRow, isCurrent && styles.assistantChoiceRowActive]}
                  onPress={() => handleSelectAssistant(ast)}
                  disabled={submitting}
                >
                  <View style={styles.astAvatar}>
                    <Icon name="school" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.astChoiceTextCol}>
                    <AppText variant="bodySm" weight="bold">
                      {ast.name}
                    </AppText>
                    <AppText variant="caption" color={Colors.textMuted}>
                      Kode Asisten: {ast.identifier} • {ast.email}
                    </AppText>
                  </View>
                  {isCurrent ? (
                    <Badge label="PJ Saat Ini" variant="open" size="sm" />
                  ) : (
                    <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <CustomButton
            title="Tutup"
            variant="outline"
            size="md"
            onPress={() => setAssignModalVisible(false)}
            style={styles.closeModalBtn}
          />
        </View>
      </Modal>

      <FeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onPrimary={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    marginTop: 2,
    marginBottom: 4,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  summaryList: {
    gap: Spacing.sm,
  },
  assistantSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  astInfoCol: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  classCard: {
    marginBottom: Spacing.md,
  },
  classCardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  classBadge: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  classDetails: {
    flex: 1,
    gap: 2,
  },
  classTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  assistantBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  classActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionBtnCol: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalSub: {
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  assistantListWrap: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  assistantChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  assistantChoiceRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  astAvatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  astChoiceTextCol: {
    flex: 1,
  },
  closeModalBtn: {
    marginTop: Spacing.xs,
  },
});

