import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { CustomButton } from '@/components/ui/CustomButton';
import { Icon } from '@/components/ui/Icon';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/store/hooks';
import { UserProfile, UserRole } from '@/types/attendance';

export interface RoleSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onUserSelected?: (user: UserProfile) => void;
}

export function RoleSelectorModal({
  visible,
  onClose,
  onUserSelected,
}: RoleSelectorModalProps) {
  const { currentUser, availableUsers, setCurrentUser } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role);

  const filteredUsers = availableUsers.filter((u) => u.role === selectedRole);

  const handleSelectUser = (user: UserProfile) => {
    setCurrentUser(user);
    onUserSelected?.(user);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <AppText variant="title">Pilih Profil & Peran</AppText>
              <AppText variant="bodySm" color={Colors.textMuted}>
                Simulasi akun Asisten atau Praktikan
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal"
            >
              <Icon name="close" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Role Filter Tabs */}
          <View style={styles.tabContainer}>
            <Pressable
              style={[
                styles.tab,
                selectedRole === 'ASSISTANT' && styles.tabActive,
              ]}
              onPress={() => setSelectedRole('ASSISTANT')}
            >
              <Icon
                name="school-outline"
                size={18}
                color={
                  selectedRole === 'ASSISTANT'
                    ? Colors.primary
                    : Colors.textMuted
                }
              />
              <AppText
                variant="bodySm"
                weight={selectedRole === 'ASSISTANT' ? 'semibold' : 'regular'}
                color={
                  selectedRole === 'ASSISTANT'
                    ? Colors.primary
                    : Colors.textMuted
                }
              >
                Asisten Praktikum
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.tab,
                selectedRole === 'STUDENT' && styles.tabActive,
              ]}
              onPress={() => setSelectedRole('STUDENT')}
            >
              <Icon
                name="person-outline"
                size={18}
                color={
                  selectedRole === 'STUDENT' ? Colors.primary : Colors.textMuted
                }
              />
              <AppText
                variant="bodySm"
                weight={selectedRole === 'STUDENT' ? 'semibold' : 'regular'}
                color={
                  selectedRole === 'STUDENT' ? Colors.primary : Colors.textMuted
                }
              >
                Praktikan
              </AppText>
            </Pressable>
          </View>

          {/* User List */}
          <ScrollView
            style={styles.userList}
            contentContainerStyle={styles.userListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredUsers.map((user) => {
              const isSelected = currentUser.id === user.id;

              return (
                <Pressable
                  key={user.id}
                  style={[
                    styles.userCard,
                    isSelected && styles.userCardSelected,
                  ]}
                  onPress={() => handleSelectUser(user)}
                >
                  <View style={styles.userInfo}>
                    <View
                      style={[
                        styles.avatar,
                        isSelected && styles.avatarSelected,
                      ]}
                    >
                      <Icon
                        name={
                          user.role === 'ASSISTANT'
                            ? 'school'
                            : 'person'
                        }
                        size={20}
                        color={
                          isSelected ? Colors.textWhite : Colors.primary
                        }
                      />
                    </View>
                    <View style={styles.userTextContainer}>
                      <AppText variant="body" weight="semibold">
                        {user.name}
                      </AppText>
                      <AppText variant="caption" color={Colors.textMuted}>
                        {user.role === 'ASSISTANT' ? 'Kode: ' : 'NIM: '}
                        {user.identifier}
                      </AppText>
                    </View>
                  </View>

                  {isSelected ? (
                    <Badge label="Aktif" variant="open" size="sm" showDot />
                  ) : (
                    <Icon
                      name="chevron-forward"
                      size={20}
                      color={Colors.textLight}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <CustomButton
              title="Tutup"
              onPress={onClose}
              variant="secondary"
              size="md"
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '80%',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.md,
    padding: Spacing.xxs,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    gap: Spacing.xs,
  },
  tabActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  userList: {
    maxHeight: 280,
  },
  userListContent: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  userCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: Colors.primary,
  },
  userTextContainer: {
    flex: 1,
  },
  footer: {
    marginTop: Spacing.md,
  },
});
