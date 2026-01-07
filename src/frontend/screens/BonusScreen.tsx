import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import TokenControls from '../components/TokenControls';
import createBonusStyles from '../styles/bonusStyles';
import { useTheme } from '../ThemeContext';

export default function BonusScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createBonusStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Token controls</Text>
      <View style={styles.card}>
        <TokenControls />
      </View>
    </ScrollView>
  );
}
