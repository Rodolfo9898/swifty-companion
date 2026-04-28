import React, { useMemo } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { useTheme } from '../ThemeContext';
import createTranscriptWebStyles from '../styles/transcriptWebStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'TranscriptWeb'>;

export default function TranscriptWebScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createTranscriptWebStyles(colors), [colors]);
  const { userId } = route.params;
  const transcriptUrl = `https://projects.intra.42.fr/users/${userId}/transcripts`;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarStatus} numberOfLines={3}>
          Transcript auto-generation uses an embedded native WebView on mobile. On web, open the 42 page in a new tab and generate it there.
        </Text>
        <TouchableOpacity
          style={[styles.toolbarButton, styles.toolbarButtonPrimary]}
          onPress={() => Linking.openURL(transcriptUrl)}
        >
          <Text style={[styles.toolbarButtonText, styles.toolbarButtonTextPrimary]}>Open Transcript Page</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
