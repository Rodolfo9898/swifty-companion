import { Platform, StyleSheet } from 'react-native';
import type { ThemeColors } from './theme';
import { spacing } from './theme';

export default function createPlannerStyles(colors: ThemeColors) {
  const isWeb = Platform.OS === 'web';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: isWeb ? 32 : spacing.lg,
      paddingBottom: isWeb ? 80 : spacing.lg,
      gap: isWeb ? 24 : spacing.lg,
      width: '100%',
      maxWidth: isWeb ? 1180 : undefined,
      alignSelf: 'center',
    },
    header: {
      gap: isWeb ? spacing.sm : spacing.xs,
      backgroundColor: isWeb ? colors.surface : undefined,
      borderColor: isWeb ? colors.border : undefined,
      borderRadius: isWeb ? 28 : undefined,
      borderWidth: isWeb ? 1 : undefined,
      padding: isWeb ? 28 : undefined,
      shadowColor: isWeb ? '#000000' : undefined,
      shadowOpacity: isWeb ? 0.18 : undefined,
      shadowRadius: isWeb ? 24 : undefined,
      alignItems: isWeb ? 'center' : undefined,
    },
    title: {
      color: colors.text,
      fontSize: isWeb ? 34 : 20,
      fontWeight: '800',
      letterSpacing: isWeb ? -0.8 : undefined,
      textAlign: isWeb ? 'center' : undefined,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: isWeb ? 15 : 12,
      lineHeight: isWeb ? 22 : undefined,
      textAlign: isWeb ? 'center' : undefined,
    },
    tabRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
      flexWrap: 'wrap',
      alignSelf: isWeb ? 'center' : undefined,
      maxWidth: isWeb ? 820 : undefined,
    },
    tab: {
      flex: isWeb ? 0 : 1,
      minWidth: isWeb ? 260 : undefined,
      paddingVertical: isWeb ? 14 : spacing.sm,
      paddingHorizontal: isWeb ? 18 : undefined,
      borderRadius: isWeb ? 16 : 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabCompact: {
      paddingVertical: isWeb ? 12 : 6,
      flex: 0,
      minWidth: isWeb ? 96 : undefined,
      paddingHorizontal: isWeb ? 18 : 12,
    },
    tabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: isWeb ? 14 : 12,
      textAlign: 'center',
      width: '100%',
    },
    tabTextCompact: {
      fontSize: isWeb ? 13 : 11,
    },
    tabTextActive: {
      color: colors.accentText,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: isWeb ? 24 : 18,
      padding: isWeb ? 28 : spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: isWeb ? '#000000' : undefined,
      shadowOpacity: isWeb ? 0.16 : undefined,
      shadowRadius: isWeb ? 22 : undefined,
    },
    sectionTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: isWeb ? 18 : undefined,
      marginBottom: isWeb ? spacing.md : spacing.sm,
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
    eligibilityRow: {
      marginTop: spacing.sm,
      alignItems: 'flex-start',
    },
    eligibilityText: {
      fontSize: 13,
      fontWeight: '700',
    },
    eligibilityOk: {
      color: '#22c55e',
    },
    eligibilityWarn: {
      color: '#facc15',
    },
    eligibilityKo: {
      color: '#ef4444',
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
      marginBottom: isWeb ? spacing.md : spacing.sm,
      gap: spacing.md,
    },
    blockTitle: {
      color: colors.text,
      fontWeight: '800',
      fontSize: isWeb ? 18 : undefined,
      flex: 1,
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
      paddingVertical: isWeb ? spacing.md : spacing.sm,
      gap: spacing.xs,
      flexDirection: isWeb ? 'row' : undefined,
      alignItems: isWeb ? 'center' : undefined,
      justifyContent: isWeb ? 'space-between' : undefined,
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
      flex: isWeb ? 1 : undefined,
    },
    projectName: {
      color: colors.text,
      fontWeight: '600',
      fontSize: isWeb ? 15 : undefined,
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
      flexWrap: 'wrap',
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    stepButton: {
      width: 24,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepButtonDisabled: {
      opacity: 0.4,
    },
    stepButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
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
    gradeInputCentered: {
      minWidth: 56,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 12,
    },
  });
}
