import { Href, router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { CustomButton } from '@/components/ui/CustomButton';
import { FeedbackModal, FeedbackType } from '@/components/ui/FeedbackModal';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { signInUser, signUpUser } from '@/services/auth';
import { useCurrentUser } from '@/store/hooks';
import { UserRole } from '@/types/attendance';

type AuthMode = 'LOGIN' | 'REGISTER';

export default function AuthAndRoleRoute() {
  const { setCurrentUser } = useCurrentUser();

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
        enrolledClasses: [],
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

  return (
    <Screen contentContainerStyle={styles.scrollContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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

              {/* Input NIM Praktikan */}
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
              ) : null}
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
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                }
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
      </KeyboardAvoidingView>

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
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.md,
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
  authCard: {
    marginBottom: Spacing.xl,
  },
  modeTabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
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
    minHeight: 44,
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
    minHeight: 48,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.md,
    color: Colors.text,
    paddingVertical: 0,
  },
});
