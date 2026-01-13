import { StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createPlannerStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
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
      color: colors.textMuted,
      fontSize: 12,
    },
    tabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    tabTextActive: {
      color: colors.accentText,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },
    progressRow: {
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    progressLabel: {
      color: colors.textMuted,
      fontSize: 12,
    },
    progressHint: {
      color: colors.textSubtle,
      fontSize: 12,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    pill: {
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    pillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    pillText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    pillTextActive: {
      color: colors.accentText,
    },
    blockHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    blockTitle: {
      color: colors.text,
      fontWeight: '700',
    },
    statusBadge: {
      borderRadius: 999,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    statusBadgeOk: {
      backgroundColor: '#22c55e',
      borderColor: '#22c55e',
    },
    statusBadgeKo: {
      backgroundColor: '#ef4444',
      borderColor: '#ef4444',
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    statusBadgeTextActive: {
      color: '#0f172a',
    },
    projectRow: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    projectRowPlanned: {
      backgroundColor: '#facc15',
      borderRadius: 12,
      paddingHorizontal: spacing.sm,
    },
    projectRowCompleted: {
      backgroundColor: '#22c55e',
      borderRadius: 12,
      paddingHorizontal: spacing.sm,
    },
    projectMain: {
      gap: spacing.xs,
    },
    projectName: {
      color: colors.text,
      fontWeight: '600',
    },
    projectNamePlanned: {
      color: '#0f172a',
    },
    projectMeta: {
      color: colors.textMuted,
      fontSize: 12,
    },
    projectMetaPlanned: {
      color: '#0f172a',
    },
    projectActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    actionButton: {
      borderRadius: 10,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    actionButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    actionButtonText: {
      color: colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    actionButtonTextActive: {
      color: colors.accentText,
    },
    gradeInput: {
      minWidth: 70,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      paddingVertical: 6,
      paddingHorizontal: 10,
      fontSize: 12,
      textAlign: 'center',
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 12,
    },
  });
}
