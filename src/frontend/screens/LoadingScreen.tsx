import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import createLoadingStyles from '../styles/loadingStyles';
import { useTheme } from '../ThemeContext';

export default function LoadingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createLoadingStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.text}>Loading...</Text>
    </View>
  );
}
