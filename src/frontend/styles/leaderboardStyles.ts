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
    tabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabText: {
      color: colors.text,
      fontWeight: '600',
    },
    tabTextActive: {
      color: colors.accentText,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    filterGroup: {
      flex: 1,
    },
    compareButton: {
      marginTop: spacing.md,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    compareButtonText: {
      color: colors.accentText,
      fontWeight: '700',
    },
    rankingMeta: {
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    rankingActions: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    resetButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetButtonText: {
      color: colors.text,
      fontWeight: '600',
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
    currentBadge: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    currentBadgeText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    levelBlock: {
      marginLeft: 'auto',
      alignItems: 'flex-end',
      gap: 2,
    },
    levelLabel: {
      color: colors.textMuted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    level: {
      color: colors.text,
      fontWeight: '700',
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
