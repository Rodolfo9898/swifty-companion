import { StyleSheet } from 'react-native';

import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createTranscriptWebStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    toolbarButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    toolbarButtonPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    toolbarButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    toolbarButtonTextPrimary: {
      color: colors.accentText,
    },
    toolbarStatus: {
      flex: 1,
      color: colors.textMuted,
      fontSize: 11,
      textAlign: 'right',
    },
    webview: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });
}
