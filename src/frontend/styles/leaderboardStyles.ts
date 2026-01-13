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
      gap: 1,
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
      marginBottom: 0,
    },
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 12,
      height: 40,
    },
    dropdownButtonCompact: {
      height: 34,
      paddingHorizontal: 10,
    },
    dropdownText: {
      color: colors.text,
      fontSize: 12,
      flex: 1,
      marginRight: 8,
    },
    dropdownIcon: {
      color: colors.textMuted,
      fontSize: 12,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      padding: spacing.lg,
      position: 'relative',
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '70%',
    },
    modalTitle: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.md,
      fontSize: 16,
    },
    modalList: {
      maxHeight: '100%',
    },
    modalItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: colors.surfaceAlt,
    },
    modalItemActive: {
      backgroundColor: colors.accent,
    },
    modalItemText: {
      color: colors.text,
      fontSize: 13,
      textAlign: 'center',
    },
    modalItemTextActive: {
      color: colors.accentText,
      fontWeight: '600',
    },
    tabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    inlineRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    inlineGroup: {
      flex: 1,
    },
    inlineButton: {
      flex: 1,
      marginTop: spacing.sm,
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
    searchInput: {
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      marginBottom: spacing.sm,
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
    secondaryButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '600',
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
      paddingVertical: 4,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardHighlighted: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceAlt,
    },
    firstCard: {
      marginTop: spacing.sm,
    },
    rank: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      width: 24,
      textAlign: 'right',
    },
    avatar: {
      width: 32,
      height: 32,
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
