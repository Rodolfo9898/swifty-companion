import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';

export default function createSectionHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    badge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeIcon: {
      width: 20,
      height: 20,
      resizeMode: 'contain',
    },
    label: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
