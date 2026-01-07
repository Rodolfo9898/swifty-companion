import React, { useMemo } from 'react';
import { View } from 'react-native';
import createProgressStyles from '../styles/progressBarStyles';
import { useTheme } from '../ThemeContext';

interface Props {
  value: number; // 0 to 1
  color?: string;
}

export function ProgressBar({ value, color }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProgressStyles(colors), [colors]);
  const width = `${Math.min(Math.max(value, 0), 1) * 100}%`;
  const barColor = color ?? colors.accent;

  return (
    <View style={styles.container}>
      <View style={[styles.bar, { width, backgroundColor: barColor }]} />
    </View>
  );
}

export default ProgressBar;
