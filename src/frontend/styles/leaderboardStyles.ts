import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createLeaderboardStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    selectorCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.textSubtle,
      fontSize: 12,
      marginBottom: spacing.xs,
    },
    pickerWrap: {
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
    },
    picker: {
      color: colors.text,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
    },
    login: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },
    display: {
      color: colors.textSubtle,
      marginTop: 2,
      fontSize: 12,
    },
    level: {
      color: colors.text,
      fontWeight: '700',
      marginLeft: 'auto',
      fontSize: 13,
    },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    button: {
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    error: {
      color: colors.error,
      marginTop: spacing.sm,
    },
  });
}
