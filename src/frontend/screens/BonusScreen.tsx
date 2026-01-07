import React, { useMemo, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import TokenControls from '../components/TokenControls';
import createBonusStyles from '../styles/bonusStyles';
import { useTheme } from '../ThemeContext';

export default function BonusScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createBonusStyles(colors), [colors]);
  const navigation = useNavigation();
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTap.current > 2000) {
      tapCount.current = 0;
    }
    lastTap.current = now;
    tapCount.current += 1;
    if (tapCount.current >= 7) {
      tapCount.current = 0;
      // Hidden dev screen
      // @ts-expect-error - navigation typing for hidden route
      navigation.navigate('DevCache');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handleSecretTap} activeOpacity={0.8}>
        <Text style={styles.title}>Token controls</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <TokenControls />
      </View>
    </ScrollView>
  );
}
