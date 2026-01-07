import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createStatsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    selectorCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: '700',
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
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: spacing.sm,
    },
    error: {
      color: colors.error,
      marginTop: spacing.sm,
    },
  });
}
