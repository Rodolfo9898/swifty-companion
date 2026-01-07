import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createHomeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
    },
    headerText: {
      flex: 1,
    },
    welcome: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSubtle,
      marginTop: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.md,
    },
    tile: {
      width: '47%',
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      minHeight: 120,
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
    },
    tileTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    tileSubtitle: {
      color: colors.textSubtle,
      marginTop: spacing.xs,
      fontSize: 12,
    },
  });
}
