import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';

export default function createProgressStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      height: 10,
      width: '100%',
      backgroundColor: colors.progressTrack,
      borderRadius: 999,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 999,
    },
  });
}
