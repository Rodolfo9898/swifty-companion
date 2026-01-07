import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createLoadingStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    text: {
      color: colors.textSubtle,
    },
  });
}
