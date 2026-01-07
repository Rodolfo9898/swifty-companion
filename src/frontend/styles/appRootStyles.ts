import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';

export default function createAppRootStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
    },
    headerLogo: {
      width: 26,
      height: 26,
      borderRadius: 8,
    },
    headerText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerButton: {
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
  });
}
