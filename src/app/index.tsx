import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { subscribeAllClasses } from '@/services/admin';
import {
  AuthUser,
  getDemoAccounts,
  signInUser,
  signUpUser,
  subscribeAllUsers,
} from '@/services/auth';
import { isFirebaseConfigured } from '@/services/firebase';
import { DEFAULT_CLASSES, PracticalClass } from '@/services/sessions';
import { useCurrentUser } from '@/store/hooks';
import { UserRole } from '@/types/attendance';

type AuthMode = 'LOGIN' | 'REGISTER';

export default function AuthAndRoleRoute() {
  const { setCurrentUser } = useCurrentUser();

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State khusus Registrasi (SRS-AUTH-01 & Requirement 1)
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');
  const [selectedClass, setSelectedClass] = useState('A1');
  const [availableClasses, setAvailableClasses] =
    useState<PracticalClass[]>(DEFAULT_CLASSES);

  // State Database Akun Sistem Live Realtime (Requirement 4)
  const [allSystemUsers, setAllSystemUsers] = useState<AuthUser[]>(() =>
    getDemoAccounts()
  );
  const [systemDbModalVisible, setSystemDbModalVisible] = useState(false);
  const [systemDbSearch, setSystemDbSearch] = useState('');
  const [systemDbRoleFilter, setSystemDbRoleFilter] = useState<
    'ALL' | UserRole
  >('ALL');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: FeedbackType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  // Sinkronisasi realtime ke kelas dan pengguna database
  useEffect(() => {
    const unsubClasses = subscribeAllClasses((classes) => {
      setAvailableClasses(classes);
    });
    const unsubUsers = subscribeAllUsers((users) => {
      setAllSystemUsers(users);
    });
    return () => {
      unsubClasses();
      unsubUsers();
    };
  }, []);

  /**
   * Auto-routing RBAC berdasarkan peran pengguna (SRS-AUTH-02 & SRS-AUTH-ADMIN).
   */
  const routeByUserRole = (user: {
    uid: string;
    name: string;
    role: UserRole;
    identifier: string;
    enrolledClasses?: string[];
  }) => {
    setCurrentUser({
      id: user.uid,
      name: user.name,
      role: user.role,
      identifier: user.identifier,
      enrolledClasses: user.enrolledClasses,
    });

    if (user.role === 'ADMIN') {
      router.replace('/admin' as any);
    } else if (user.role === 'ASSISTANT') {
      router.replace('/assistant' as Href);
    } else {
      router.replace('/student' as Href);
    }
  };

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      const loggedInUser = await signInUser(email, password);
      routeByUserRole(loggedInUser);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal melakukan autentikasi. Periksa kembali kredensial Anda.';
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Gagal Masuk',
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setSubmitting(true);
    try {
      const createdUser = await signUpUser(email, password, {
        email: email.trim().toLowerCase(),
        name: fullName,
        role: registerRole,
        identifier: registerRole === 'ASSISTANT' ? '' : identifier,
        requestedClass: registerRole === 'STUDENT' ? selectedClass : undefined,
      });

      if (createdUser.approvalStatus === 'PENDING_ADMIN') {
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Pendaftaran Berhasil!',
          message:
            'Akun Asisten Anda berhasil diajukan dan sedang menunggu persetujuan dari Admin Lab.',
        });
        setMode('LOGIN');
      } else if (createdUser.approvalStatus === 'PENDING_ASSISTANT') {
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Pendaftaran Berhasil!',
          message: `Akun Praktikan Anda berhasil diajukan dan sedang menunggu persetujuan dari Asisten Pengampu Kelas ${selectedClass}.`,
        });
        setMode('LOGIN');
      } else {
        routeByUserRole(createdUser);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mendaftarkan akun baru. Silakan coba lagi.';
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Registrasi Gagal',
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSystemUsers = allSystemUsers.filter((u) => {
    if (systemDbRoleFilter !== 'ALL' && u.role !== systemDbRoleFilter) {
      return false;
    }
    if (systemDbSearch.trim()) {
      const q = systemDbSearch.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchId = (u.identifier || '').toLowerCase().includes(q);
      const matchCls = (u.enrolledClasses || [])
        .concat(u.requestedClass ? [u.requestedClass] : [])
        .some((c) => c.toLowerCase().includes(q));
      return matchName || matchEmail || matchId || matchCls;
    }
    return true;
  });

  return (
    <Screen style={styles.container}>
      {/* Brand Header */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Icon name="school" size={32} color={Colors.primary} />
        </View>
        <AppText variant="h1" align="center" style={styles.title}>
          Presensi Praktikum
        </AppText>
        <AppText variant="bodySm" align="center" color={Colors.textMuted}>
          Sistem Presensi Praktikum Terpadu & Realtime
        </AppText>
        <View style={styles.connectionBadgeWrap}>
          <Badge
            label={
              isFirebaseConfigured
                ? 'Firebase Cloud Aktif'
                : 'Mode Autentikasi Hybrid'
            }
            variant={isFirebaseConfigured ? 'open' : 'primary'}
            size="sm"
            showDot
          />
        </View>
      </View>

      {/* Kartu Utama: Form Login & Registrasi Firebase (SRS-AUTH-01 & SRS-AUTH-02) */}
      <Card variant="default" padding="lg" style={styles.authCard}>
        {/* Mode Switcher: Masuk vs Daftar */}
        <View style={styles.modeTabRow}>
          <Pressable
            style={[
              styles.modeTab,
              mode === 'LOGIN' && styles.modeTabActive,
            ]}
            onPress={() => setMode('LOGIN')}
            accessibilityRole="tab"
          >
            <AppText
              variant="bodySm"
              weight="semibold"
              color={mode === 'LOGIN' ? Colors.textWhite : Colors.textSecondary}
            >
              Masuk
            </AppText>
          </Pressable>
          <Pressable
            style={[
              styles.modeTab,
              mode === 'REGISTER' && styles.modeTabActive,
            ]}
            onPress={() => setMode('REGISTER')}
            accessibilityRole="tab"
          >
            <AppText
              variant="bodySm"
              weight="semibold"
              color={
                mode === 'REGISTER' ? Colors.textWhite : Colors.textSecondary
              }
            >
              Daftar Akun
            </AppText>
          </Pressable>
        </View>

        {mode === 'REGISTER' ? (
          <>
            {/* Pilihan Peran (Praktikan vs Asisten) */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                PERAN PENGGUNA
              </AppText>
              <View style={styles.roleChoiceRow}>
                <Pressable
                  style={[
                    styles.roleChoiceBtn,
                    registerRole === 'STUDENT' && styles.roleChoiceBtnActive,
                  ]}
                  onPress={() => setRegisterRole('STUDENT')}
                >
                  <Icon
                    name="person-outline"
                    size={16}
                    color={
                      registerRole === 'STUDENT'
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />
                  <AppText
                    variant="bodySm"
                    weight="semibold"
                    color={
                      registerRole === 'STUDENT'
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  >
                    Praktikan
                  </AppText>
                </Pressable>

                <Pressable
                  style={[
                    styles.roleChoiceBtn,
                    registerRole === 'ASSISTANT' && styles.roleChoiceBtnActive,
                  ]}
                  onPress={() => setRegisterRole('ASSISTANT')}
                >
                  <Icon
                    name="school-outline"
                    size={16}
                    color={
                      registerRole === 'ASSISTANT'
                        ? Colors.primary
                        : Colors.textMuted
                    }
                  />
                  <AppText
                    variant="bodySm"
                    weight="semibold"
                    color={
                      registerRole === 'ASSISTANT'
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  >
                    Asisten
                  </AppText>
                </Pressable>
              </View>
            </View>

            {/* Input Nama Lengkap */}
            <View style={styles.fieldGroup}>
              <AppText variant="label" style={styles.fieldLabel}>
                NAMA LENGKAP
              </AppText>
              <View style={styles.inputBox}>
                <Icon
                  name="person-outline"
                  size={18}
                  color={Colors.textMuted}
                />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Contoh: Budi Santoso"
                  placeholderTextColor={Colors.textLight}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Input NIM Praktikan atau Pemberitahuan Kode Asisten Otomatis */}
            {registerRole === 'STUDENT' ? (
              <>
                <View style={styles.fieldGroup}>
                  <AppText variant="label" style={styles.fieldLabel}>
                    NIM PRAKTIKAN
                  </AppText>
                  <View style={styles.inputBox}>
                    <Icon
                      name="card-outline"
                      size={18}
                      color={Colors.textMuted}
                    />
                    <TextInput
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder="Contoh: 24060124140130"
                      placeholderTextColor={Colors.textLight}
                      style={styles.textInput}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Pemilihan Kelas Praktikan (Requirement 1: Tanpa mata kuliah, diatur ketersediaan admin) */}
                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <AppText variant="label" style={styles.fieldLabel}>
                      PILIH KELAS PRAKTIKUM
                    </AppText>
                    <AppText variant="caption" color={Colors.textMuted}>
                      {availableClasses.filter((c) => c.isOpen !== false).length} Kelas Tersedia
                    </AppText>
                  </View>
                  <View style={styles.classChipsGrid}>
                    {availableClasses.map((cls) => {
                      const isSel = selectedClass.toUpperCase() === cls.classCode.toUpperCase();
                      const isClosed = cls.isOpen === false;
                      return (
                        <Pressable
                          key={cls.classCode}
                          disabled={isClosed}
                          style={[
                            styles.classChip,
                            isSel && styles.classChipActive,
                            isClosed && styles.classChipDisabled,
                          ]}
                          onPress={() => setSelectedClass(cls.classCode)}
                        >
                          <AppText
                            variant="caption"
                            weight={isSel ? 'bold' : 'regular'}
                            color={
                              isClosed
                                ? Colors.textLight
                                : isSel
                                ? Colors.textWhite
                                : Colors.textSecondary
                            }
                          >
                            Kelas {cls.classCode}
                          </AppText>
                          {isClosed ? (
                            <AppText variant="caption" color={Colors.danger} style={styles.closedTag}>
                              (Tutup)
                            </AppText>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                  <AppText variant="caption" color={Colors.textMuted} style={styles.classHint}>
                    ⚠️ Pendaftaran praktikan memerlukan persetujuan asisten kelas terkait. Ketersediaan kelas diatur oleh Admin.
                  </AppText>
                </View>
              </>
            ) : (
              <View style={styles.autoAstCard}>
                <Icon
                  name="shield-checkmark"
                  size={18}
                  color={Colors.primary}
                />
                <View style={styles.autoAstTextCol}>
                  <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
                    Pendaftaran Asisten Lab
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Kode asisten akan diberikan otomatis dan memerlukan persetujuan Administrator Lab.
                  </AppText>
                </View>
              </View>
            )}
          </>
        ) : null}

        {/* Input Email */}
        <View style={styles.fieldGroup}>
          <AppText variant="label" style={styles.fieldLabel}>
            ALAMAT EMAIL
          </AppText>
          <View style={styles.inputBox}>
            <Icon name="mail-outline" size={18} color={Colors.textMuted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nama@praktikum.ac.id"
              placeholderTextColor={Colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
            />
          </View>
        </View>

        {/* Input Kata Sandi */}
        <View style={styles.fieldGroup}>
          <AppText variant="label" style={styles.fieldLabel}>
            KATA SANDI
          </AppText>
          <View style={styles.inputBox}>
            <Icon
              name="lock-closed-outline"
              size={18}
              color={Colors.textMuted}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={Colors.textLight}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.textInput}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={8}
            >
              <Icon
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* Tombol Submit Utama */}
        <CustomButton
          title={mode === 'LOGIN' ? 'Masuk' : 'Daftar dan Masuk'}
          onPress={mode === 'LOGIN' ? handleLogin : handleRegister}
          loading={submitting}
          variant="primary"
          size="md"
          icon={
            <Icon
              name={mode === 'LOGIN' ? 'log-in-outline' : 'person-add-outline'}
              size={18}
              color={Colors.textWhite}
            />
          }
        />
      </Card>

      {/* Tombol Database Akun Sistem di Pojok Kiri Bawah (Requirement 4) */}
      <View style={styles.bottomBarRow}>
        <Pressable
          style={styles.systemDbBtn}
          onPress={() => setSystemDbModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Buka Database Akun Sistem"
        >
          <View style={styles.livePulseDot} />
          <Icon name="server-outline" size={15} color={Colors.primary} />
          <AppText variant="caption" weight="bold" color={Colors.primary}>
            Database Akun ({allSystemUsers.length})
          </AppText>
        </Pressable>
      </View>

      {/* Modal Database Akun Sistem Realtime (Requirement 4) */}
      <Modal
        visible={systemDbModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSystemDbModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSystemDbModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleCol}>
              <View style={styles.liveSyncBadge}>
                <View style={styles.livePulseDotGreen} />
                <AppText variant="caption" weight="bold" color={Colors.success}>
                  DATABASE AKTIF • REALTIME SYNC
                </AppText>
              </View>
              <AppText variant="title" weight="bold">
                Database Akun Sistem
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {allSystemUsers.length} Akun Terdaftar di Cloud Firestore
              </AppText>
            </View>

            <Pressable
              onPress={() => setSystemDbModalVisible(false)}
              style={styles.modalCloseBtn}
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Search Box */}
          <View style={styles.searchBox}>
            <Icon name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama, email, NIM, atau kode..."
              placeholderTextColor={Colors.textLight}
              value={systemDbSearch}
              onChangeText={setSystemDbSearch}
            />
            {systemDbSearch ? (
              <Pressable onPress={() => setSystemDbSearch('')}>
                <Icon name="close-circle" size={16} color={Colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Role Filter Tabs */}
          <View style={styles.roleFilterRow}>
            {(
              [
                { key: 'ALL', label: 'Semua' },
                { key: 'ADMIN', label: 'Admin' },
                { key: 'ASSISTANT', label: 'Asisten' },
                { key: 'STUDENT', label: 'Praktikan' },
              ] as const
            ).map((rf) => {
              const isRfActive = systemDbRoleFilter === rf.key;
              return (
                <Pressable
                  key={rf.key}
                  style={[
                    styles.roleFilterChip,
                    isRfActive && styles.roleFilterChipActive,
                  ]}
                  onPress={() => setSystemDbRoleFilter(rf.key)}
                >
                  <AppText
                    variant="caption"
                    weight={isRfActive ? 'bold' : 'regular'}
                    color={isRfActive ? Colors.textWhite : Colors.textSecondary}
                  >
                    {rf.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* User List */}
          <ScrollView
            style={styles.userListScroll}
            contentContainerStyle={styles.userListContainer}
            showsVerticalScrollIndicator={false}
          >
            {filteredSystemUsers.length === 0 ? (
              <View style={styles.emptySearchWrap}>
                <AppText variant="bodySm" color={Colors.textMuted} align="center">
                  Tidak ada akun yang sesuai dengan pencarian.
                </AppText>
              </View>
            ) : (
              filteredSystemUsers.map((user) => {
                const isAdmin = user.role === 'ADMIN';
                const isAst = user.role === 'ASSISTANT';
                const isApproved =
                  user.approvalStatus === 'APPROVED' || !user.approvalStatus;
                const isPendingAdmin = user.approvalStatus === 'PENDING_ADMIN';
                const isPendingAst =
                  user.approvalStatus === 'PENDING_ASSISTANT';
                const isRejected = user.approvalStatus === 'REJECTED';

                return (
                  <View key={user.uid} style={styles.userCard}>
                    <View style={styles.userCardTop}>
                      <View style={styles.userCardAvatar}>
                        <Icon
                          name={
                            isAdmin
                              ? 'shield-checkmark'
                              : isAst
                              ? 'school'
                              : 'person'
                          }
                          size={18}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.userCardDetails}>
                        <View style={styles.userCardNameRow}>
                          <AppText variant="bodySm" weight="bold" numberOfLines={1}>
                            {user.name}
                          </AppText>
                          <Badge
                            label={
                              isAdmin ? 'Admin' : isAst ? 'Asisten' : 'Praktikan'
                            }
                            variant={
                              isAdmin
                                ? 'closed'
                                : isAst
                                ? 'primary'
                                : 'attended'
                            }
                            size="sm"
                          />
                        </View>
                        <AppText variant="caption" color={Colors.textMuted}>
                          {user.email}
                        </AppText>
                        <View style={styles.userCardSubRow}>
                          <AppText
                            variant="caption"
                            weight="semibold"
                            color={Colors.textSecondary}
                          >
                            {isAdmin ? 'Kode: ' : isAst ? 'Kode: ' : 'NIM: '}
                            {user.identifier || '-'}
                          </AppText>
                          {user.enrolledClasses && user.enrolledClasses.length > 0 ? (
                            <AppText variant="caption" color={Colors.primary}>
                              • Kelas: {user.enrolledClasses.join(', ')}
                            </AppText>
                          ) : user.requestedClass ? (
                            <AppText variant="caption" color={Colors.warning}>
                              • Kelas: {user.requestedClass}
                            </AppText>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.userCardBottom}>
                      <Badge
                        label={
                          isApproved
                            ? 'Disetujui'
                            : isPendingAdmin
                            ? 'Menunggu Admin'
                            : isPendingAst
                            ? 'Menunggu Asisten'
                            : 'Ditolak'
                        }
                        variant={
                          isApproved
                            ? 'open'
                            : isRejected
                            ? 'danger'
                            : 'waiting'
                        }
                        size="sm"
                        showDot={!isRejected}
                      />

                      <CustomButton
                        title="Gunakan Akun"
                        size="sm"
                        variant="outline"
                        fullWidth={false}
                        onPress={() => {
                          setEmail(user.email);
                          setPassword('password123');
                          setMode('LOGIN');
                          setSystemDbModalVisible(false);
                        }}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Feedback Modal (FR-07 / SRS-UI-01) */}
      <FeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        primaryLabel="Mengerti"
        onPrimary={() => setFeedback((prev) => ({ ...prev, visible: false }))}
        onClose={() => setFeedback((prev) => ({ ...prev, visible: false }))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    marginBottom: Spacing.xxs,
  },
  connectionBadgeWrap: {
    marginTop: Spacing.xs,
  },
  authCard: {
    marginBottom: Spacing.md,
  },
  modeTabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.xxs + 2,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  modeTabActive: {
    backgroundColor: Colors.primary,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    marginBottom: Spacing.xs,
  },
  roleChoiceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
  },
  roleChoiceBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.md,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },
  autoAstCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  autoAstTextCol: {
    flex: 1,
    gap: 2,
  },
  classChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 2,
  },
  classChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 2,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  classChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  classChipDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.surfaceMuted,
  },
  closedTag: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  classHint: {
    marginTop: Spacing.xs,
  },
  bottomBarRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 2,
  },
  systemDbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  livePulseDotGreen: {
    width: 6,
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  modalTitleCol: {
    flex: 1,
    gap: 2,
  },
  liveSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  modalCloseBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm + 2,
    height: 42,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.text,
    paddingVertical: 4,
  },
  roleFilterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  roleFilterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleFilterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  userListScroll: {
    maxHeight: 420,
  },
  userListContainer: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  emptySearchWrap: {
    paddingVertical: Spacing.xl,
  },
  userCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  userCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  userCardAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardDetails: {
    flex: 1,
    gap: 2,
  },
  userCardNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  userCardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
    marginTop: 2,
  },
});
