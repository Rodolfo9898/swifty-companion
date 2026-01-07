import { Platform, StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createTokenControlStyles(colors: ThemeColors) {
  const pickerHeight = Platform.OS === 'android' ? 55 : 32;

  return StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
    },
    title: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 6,
    },
    row: {
      gap: 8,
    },
    field: {
      gap: 4,
    },
    label: {
      color: colors.textMuted,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    value: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    pickerWrap: {
      height: pickerHeight,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    picker: {
      height: pickerHeight,
      width: '100%',
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
    },
    pickerButton: {
      height: pickerHeight,
      borderRadius: 8,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    pickerButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    refreshButton: {
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    refreshButtonText: {
      color: colors.accentText,
      fontWeight: '700',
      fontSize: 12,
    },
  });
}
