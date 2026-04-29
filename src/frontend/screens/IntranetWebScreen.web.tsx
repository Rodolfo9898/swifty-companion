import React, { useMemo } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { useTheme } from '../ThemeContext';
import createTranscriptWebStyles from '../styles/transcriptWebStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'IntranetWeb'>;

export default function IntranetWebScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createTranscriptWebStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarStatus} numberOfLines={3}>
          The 42 intranet cannot be embedded in the web app. Open it in the browser instead.
        </Text>
        <TouchableOpacity
          style={[styles.toolbarButton, styles.toolbarButtonPrimary]}
          onPress={() => Linking.openURL(route.params.url)}
        >
          <Text style={[styles.toolbarButtonText, styles.toolbarButtonTextPrimary]}>
            Open Intranet Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
