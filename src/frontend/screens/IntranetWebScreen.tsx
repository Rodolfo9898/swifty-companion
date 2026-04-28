import React, { useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import type { RootStackParamList } from '../AppRoot';
import { useTheme } from '../ThemeContext';
import createTranscriptWebStyles from '../styles/transcriptWebStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'IntranetWeb'>;

export default function IntranetWebScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createTranscriptWebStyles(colors), [colors]);
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [status, setStatus] = useState('Loading intranet...');

  const handleNavChange = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
    setStatus(state.loading ? 'Loading intranet...' : state.title || route.params.title);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => {
            if (canGoBack) webRef.current?.goBack();
          }}
        >
          <Text style={styles.toolbarButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.toolbarButton} onPress={() => webRef.current?.reload()}>
          <Text style={styles.toolbarButtonText}>Reload</Text>
        </TouchableOpacity>

        <Text style={styles.toolbarStatus} numberOfLines={2}>{status}</Text>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: route.params.url }}
        style={styles.webview}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        onNavigationStateChange={handleNavChange}
        onLoadStart={() => setStatus('Loading intranet...')}
        onLoadEnd={() => setStatus(route.params.title)}
      />
    </View>
  );
}
