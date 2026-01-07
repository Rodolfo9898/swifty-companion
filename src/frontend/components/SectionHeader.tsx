import React, { useMemo } from 'react';
import { Image, Text, View } from 'react-native';

import { useTheme } from '../ThemeContext';
import createSectionHeaderStyles from '../styles/sectionHeaderStyles';

interface Props {
  label: string;
  icon: any;
}

export default function SectionHeader({ label, icon }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSectionHeaderStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Image source={icon} style={styles.badgeIcon} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
