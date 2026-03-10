import { StyleSheet } from 'react-native';

import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createCalculatorProgressStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: spacing.sm,
    },
    chartContainer: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.md,
    },
    chartCanvas: {
      height: 220,
      position: 'relative',
      overflow: 'hidden',
    },
    areaFillSlice: {
      position: 'absolute',
      width: 2,
      backgroundColor: 'rgba(34,197,94,0.25)',
    },
    lineSlice: {
      position: 'absolute',
      height: 2,
      backgroundColor: '#22c55e',
      opacity: 0.95,
    },
    pointDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#22c55e',
      borderWidth: 2,
      borderColor: colors.surfaceAlt,
    },
    axisLabelRow: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    axisLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    checkpointRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    checkpointHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    checkpointName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
    checkpointLevel: {
      color: '#22c55e',
      fontSize: 12,
      fontWeight: '700',
    },
    checkpointMeta: {
      color: colors.textSubtle,
      fontSize: 12,
    },
  });
}
