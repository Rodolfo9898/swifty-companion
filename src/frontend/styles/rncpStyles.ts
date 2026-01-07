import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createRncpStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    header: {
      gap: spacing.xs,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textSubtle,
    },
    tabRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tab: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 140,
    },
    tabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    tabLabelActive: {
      color: colors.accentText,
    },
    tabTitle: {
      color: colors.text,
      marginTop: spacing.xs,
      fontWeight: '600',
    },
    tabTitleActive: {
      color: colors.accentText,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badge: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '700',
    },
    sectionTitle: {
      color: colors.textSubtle,
      fontSize: 13,
      fontWeight: '600',
    },
    listTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tagBadge: {
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      overflow: 'hidden',
      fontSize: 12,
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    progressRow: {
      gap: spacing.sm,
    },
    progressLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    progressHint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    project: {
      color: colors.text,
      fontSize: 14,
      marginTop: 4,
    },
    projectRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: spacing.xs,
      gap: spacing.sm,
    },
    projectStatus: {
      color: colors.textMuted,
      fontSize: 12,
    },
    projectActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    projectInfo: {
      flex: 1,
      gap: 2,
    },
    projectMeta: {
      color: colors.textMuted,
      fontSize: 11,
    },
    checkIcon: {
      width: 18,
      height: 18,
      marginTop: 2,
    },
    checkSpacer: {
      width: 18,
      height: 18,
    },
    error: {
      color: colors.error,
    },
  });
}
