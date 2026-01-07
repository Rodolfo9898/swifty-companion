import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createLoginStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surface,
      padding: spacing.xl,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    subtitle: {
      color: colors.textSubtle,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.lg,
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
      fontSize: 16,
    },
    error: {
      marginTop: spacing.md,
      color: colors.error,
    },
  });
}
