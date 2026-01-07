import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import {
  getCachePaths,
  readCacheMeta,
  readEventsCache,
  readGroupCache,
} from '../utils/appCache';
import createStatsStyles from '../styles/statsStyles';
import { useTheme } from '../ThemeContext';

export default function DevCacheScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStatsStyles(colors), [colors]);
  const [output, setOutput] = useState('');

  const handleShowPaths = async () => {
    const meta = await readCacheMeta();
    const paths = getCachePaths();
    setOutput(JSON.stringify({ paths, meta }, null, 2));
  };

  const handleDumpEvents = async () => {
    const data = await readEventsCache();
    setOutput(JSON.stringify(data ?? { message: 'No events cache' }, null, 2));
  };

  const handleDumpGroup = async () => {
    const data = await readGroupCache();
    setOutput(JSON.stringify(data ?? { message: 'No group cache' }, null, 2));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Dev cache tools</Text>

      <View style={styles.selectorCard}>
        <TouchableOpacity style={styles.button} onPress={handleShowPaths}>
          <Text style={styles.buttonText}>Show cache paths</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectorCard}>
        <TouchableOpacity style={styles.button} onPress={handleDumpEvents}>
          <Text style={styles.buttonText}>Dump events cache</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectorCard}>
        <TouchableOpacity style={styles.button} onPress={handleDumpGroup}>
          <Text style={styles.buttonText}>Dump group cache</Text>
        </TouchableOpacity>
      </View>

      {output ? (
        <View style={styles.selectorCard}>
          <Text style={styles.hint}>{output}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
