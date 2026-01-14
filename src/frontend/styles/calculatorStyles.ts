import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createCalculatorStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    label: {
      color: colors.textSubtle,
      fontSize: 12,
      marginBottom: spacing.xs,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    levelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    levelPill: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    levelPillText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    cellName: {
      flex: 2,
    },
    cellSmall: {
      flex: 1,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    stepButton: {
      width: 24,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepButtonDisabled: {
      opacity: 0.4,
    },
    stepButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    cellAction: {
      width: 28,
      alignItems: 'center',
    },
    xpText: {
      color: colors.text,
      fontSize: 12,
      textAlign: 'center',
    },
    inputSmall: {
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 12,
    },
    gradeInput: {
      textAlign: 'center',
      flex: 1,
      minWidth: 44,
    },
    addRowButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: spacing.md,
    },
    addRowText: {
      color: colors.text,
      fontWeight: '600',
    },
    removeText: {
      color: colors.error,
      fontSize: 16,
      fontWeight: '700',
    },
    suggestions: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    suggestionItem: {
      paddingVertical: 6,
    },
    suggestionText: {
      color: colors.text,
      fontSize: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    roadmapSection: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    roadmapSaveRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    roadmapInput: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 12,
    },
    roadmapSaveButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    roadmapSaveText: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '700',
    },
    roadmapList: {
      gap: spacing.xs,
    },
    roadmapItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roadmapName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    roadmapMeta: {
      color: colors.textMuted,
      fontSize: 11,
    },
    roadmapActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    roadmapActionText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    roadmapDeleteText: {
      color: colors.error,
      fontSize: 12,
      fontWeight: '600',
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    checkboxActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    checkboxText: {
      color: colors.accentText,
      fontWeight: '700',
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    buttonText: {
      color: colors.accentText,
      fontWeight: '700',
    },
    result: {
      marginTop: spacing.md,
      color: colors.text,
      fontSize: 22,
      fontWeight: '700',
    },
    hint: {
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
  });
}
