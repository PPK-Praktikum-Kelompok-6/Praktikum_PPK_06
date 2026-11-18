import { Href, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import {
  AuthUser,
  getCurrentUser as getAuthUser,
  onAuthChange,
  signInUser,
  signOutUser,
  signUpUser,
} from '@/services/auth';
import { isFirebaseConfigured } from '@/services/firebase';
import { useCurrentUser } from '@/store/hooks';
import { UserRole } from '@/types/attendance';

type AuthMode = 'LOGIN' | 'REGISTER';

export default function AuthAndRoleRoute() {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() =>
    getAuthUser()
  );

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State khusus Registrasi (SRS-AUTH-01)
  const [fullName, setFullName] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('STUDENT');
  const [identifier, setIdentifier] = useState('');

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

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setAuthUser(user);
    });
    return unsubscribe;
  }, []);

  /**
   * Auto-routing RBAC berdasarkan peran pengguna (SRS-AUTH-02).
   */
  const routeByUserRole = (user: {
    uid: string;
    name: string;
    role: UserRole;
    identifier: string;
  }) => {
    setCurrentUser({
      id: user.uid,
      name: user.name,
      role: user.role,
      identifier: user.identifier,
    });

    if (user.role === 'ASSISTANT') {
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
      });
      routeByUserRole(createdUser);
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

  const handleSignOut = async () => {
    await signOutUser();
    setFeedback({
      visible: true,
      type: 'info',
      title: 'Berhasil Keluar',
      message: 'Sesi Anda telah diakhiri. Silakan masuk kembali untuk melanjutkan.',
    });
  };

  const activeRole = authUser?.role ?? currentUser.role;
  const isAssistant = activeRole === 'ASSISTANT';

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

      {/* Sesi Aktif (Jika pengguna sudah login dan kembali ke layar awal) */}
      {authUser ? (
        <Card variant="accent" padding="md" style={styles.activeSessionCard}>
          <View style={styles.userCardHeader}>
            <AppText
              variant="caption"
              color={Colors.primaryDark}
              weight="semibold"
            >
              SESI LOGIN AKTIF
            </AppText>
            <Badge
              label={isAssistant ? 'Asisten' : 'Praktikan'}
              variant={isAssistant ? 'primary' : 'attended'}
              size="sm"
              showDot
            />
          </View>

          <View style={styles.userInfoRow}>
            <View style={styles.avatar}>
              <Icon
                name={isAssistant ? 'school' : 'person'}
                size={20}
                color={Colors.primary}
              />
            </View>
            <View style={styles.userTextContainer}>
              <AppText variant="body" weight="semibold">
                {authUser.name}
              </AppText>
              <AppText variant="caption" color={Colors.textMuted}>
                {authUser.email} • {isAssistant ? 'Kode: ' : 'NIM: '}
                {authUser.identifier}
              </AppText>
            </View>
          </View>

          <View style={styles.sessionActionsRow}>
            <View style={styles.sessionActionCol}>
              <CustomButton
                title={
                  isAssistant ? 'Dashboard Asisten' : 'Dashboard Praktikan'
                }
                size="sm"
                variant="primary"
                onPress={() => routeByUserRole(authUser)}
              />
            </View>
            <View style={styles.sessionActionCol}>
              <CustomButton
                title="Keluar (Logout)"
                size="sm"
                variant="danger"
                onPress={handleSignOut}
              />
            </View>
          </View>
        </Card>
      ) : null}

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
            ) : (
              <View style={styles.autoAstCard}>
                <Icon
                  name="shield-checkmark"
                  size={18}
                  color={Colors.primary}
                />
                <View style={styles.autoAstTextCol}>
                  <AppText variant="caption" weight="semibold" color={Colors.primaryDark}>
                    Kode Asisten Otomatis
                  </AppText>
                  <AppText variant="caption" color={Colors.textMuted}>
                    Kode (misal AST-01, AST-02) akan diberikan otomatis oleh sistem saat Anda mendaftar.
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
  activeSessionCard: {
    marginBottom: Spacing.md,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  sessionActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sessionActionCol: {
    flex: 1,
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
});
