import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createBonusStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.md,
    },
    heroTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    heroSubtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 4,
    },
    heroPill: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    heroPillText: {
      color: colors.accentText,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    heroHint: {
      color: colors.textSubtle,
      fontSize: 12,
      marginTop: spacing.sm,
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    linkButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    linkTitle: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 13,
    },
    linkSubtitle: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
    selectRow: {
      marginTop: spacing.sm,
      gap: 6,
    },
    selectLabel: {
      color: colors.textSubtle,
      fontSize: 12,
      fontWeight: '600',
    },
    dropdownButton: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 38,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    dropdownText: {
      color: colors.text,
      fontSize: 12,
      flex: 1,
    },
    dropdownIcon: {
      color: colors.textMuted,
      fontSize: 12,
      marginLeft: spacing.xs,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxHeight: 360,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    modalList: {
      maxHeight: 360,
    },
    modalItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    modalItemActive: {
      backgroundColor: colors.surfaceAlt,
    },
    modalItemText: {
      color: colors.text,
      fontSize: 13,
      textAlign: 'center',
    },
    modalItemTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
  });
}
