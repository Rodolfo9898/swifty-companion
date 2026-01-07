import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createProfileStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    loadingText: {
      color: colors.textSubtle,
      marginTop: 12,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    avatar: {
      width: 86,
      height: 86,
      borderRadius: 43,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    headerInfo: {
      flex: 1,
    },
    name: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    login: {
      color: colors.accent,
      fontSize: 14,
      marginTop: 2,
    },
    detail: {
      color: colors.textSubtle,
      marginTop: 6,
    },
    section: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterChipText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    filterChipTextActive: {
      color: colors.accentText,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      gap: 12,
    },
    detailLabel: {
      color: colors.textMuted,
      fontSize: 13,
    },
    detailValue: {
      color: colors.textSubtle,
      fontWeight: '600',
      flexShrink: 1,
      textAlign: 'right',
    },
    skillCard: {
      marginBottom: 14,
    },
    skillHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    skillName: {
      color: colors.textSubtle,
      fontWeight: '600',
    },
    skillLevel: {
      color: colors.accent,
      fontWeight: '600',
    },
    skillPercent: {
      color: colors.textMuted,
      marginTop: 6,
      fontSize: 12,
    },
    projectCard: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceAlt,
      paddingVertical: 10,
    },
    projectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    projectName: {
      color: colors.textSubtle,
      fontWeight: '600',
      flex: 1,
    },
    projectMark: {
      color: colors.accent,
      fontWeight: '700',
    },
    projectStatus: {
      color: colors.textMuted,
      marginTop: 4,
    },
    emptyText: {
      color: colors.textMuted,
    },
    achievementCard: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceAlt,
      paddingVertical: 10,
    },
    achievementTitle: {
      color: colors.text,
      fontWeight: '700',
    },
    achievementDescription: {
      color: colors.textSubtle,
      marginTop: 4,
    },
    error: {
      color: colors.error,
      marginTop: 14,
      textAlign: 'center',
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: 16,
    },
    logo: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
  });
}
