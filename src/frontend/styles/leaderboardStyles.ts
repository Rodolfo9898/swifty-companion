import { Platform, StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createLeaderboardStyles(colors: ThemeColors) {
  const isWeb = Platform.OS === 'web';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: isWeb ? spacing.sm : 1,
      width: '100%',
      maxWidth: isWeb ? 1100 : undefined,
      alignSelf: 'center',
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
    identityColumn: {
      width: 44,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 6,
    },
    infoBlock: {
      flex: 1,
      minWidth: 0,
    },
    rank: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 9,
      backgroundColor: colors.surfaceAlt,
    },
    login: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },
    loginRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    alumniBadge: {
      backgroundColor: '#6b7280',
      borderColor: '#9ca3af',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    alumniBadgeText: {
      color: '#f9fafb',
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
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
      justifyContent: isWeb ? 'center' : 'space-between',
      gap: spacing.md,
      flexWrap: 'wrap',
      marginTop: isWeb ? spacing.md : undefined,
    },
    button: {
      flex: isWeb ? 0 : 1,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: isWeb ? 18 : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: isWeb ? 96 : undefined,
    },
    buttonSmall: {
      flex: 0,
      paddingHorizontal: isWeb ? 18 : 10,
      minWidth: isWeb ? 96 : undefined,
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
