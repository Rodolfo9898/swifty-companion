import React, { useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import type { RootStackParamList } from '../AppRoot';
import { useTheme } from '../ThemeContext';
import createTranscriptWebStyles from '../styles/transcriptWebStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'TranscriptWeb'>;

function buildInjection(startYear: number, endYear: number, templateId: number) {
  return `
    (function() {
      try {
        const form = document.querySelector('form[action*="/transcripts/"]');
        if (!form) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage('FORM_NOT_FOUND');
          return true;
        }

        const startInput = form.querySelector('input[name="start_year"]');
        const endInput = form.querySelector('input[name="end_year"]');
        const srSelect = form.querySelector('select[name="sr_id"]');

        if (startInput) startInput.value = '${startYear}';
        if (endInput) endInput.value = '${endYear}';
        if (srSelect) srSelect.value = '${templateId}';

        if (!window.__RN_TRANSCRIPT_SUBMITTED__) {
          window.__RN_TRANSCRIPT_SUBMITTED__ = true;
          form.submit();
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage('FORM_SUBMITTED');
        }
      } catch (e) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('FORM_ERROR:' + String(e));
      }
      return true;
    })();
  `;
}

export default function TranscriptWebScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createTranscriptWebStyles(colors), [colors]);
  const webRef = useRef<WebView>(null);

  const { userId, startYear, endYear, templateId } = route.params;
  const [status, setStatus] = useState('Open session and download');
  const [canGoBack, setCanGoBack] = useState(false);

  const transcriptUrl = `https://projects.intra.42.fr/users/${userId}/transcripts`;
  const injectedJavaScript = useMemo(() => buildInjection(startYear, endYear, templateId), [startYear, endYear, templateId]);

  const handleReloadAndSubmit = () => {
    setStatus('Trying auto-submit…');
    webRef.current?.reload();
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    if (message === 'FORM_SUBMITTED') {
      setStatus('Form submitted. PDF should open/download if session is valid.');
      return;
    }
    if (message === 'FORM_NOT_FOUND') {
      setStatus('Please login in this page, then tap Auto Generate.');
      return;
    }
    if (message.startsWith('FORM_ERROR:')) {
      setStatus('Auto-fill failed. You can still submit manually.');
    }
  };

  const handleNavChange = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
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

        <TouchableOpacity
          style={[styles.toolbarButton, styles.toolbarButtonPrimary]}
          onPress={handleReloadAndSubmit}
        >
          <Text style={[styles.toolbarButtonText, styles.toolbarButtonTextPrimary]}>Auto Generate</Text>
        </TouchableOpacity>

        <Text style={styles.toolbarStatus} numberOfLines={2}>{status}</Text>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: transcriptUrl }}
        style={styles.webview}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavChange}
        onLoadStart={() => setStatus('Loading transcript page…')}
      />
    </View>
  );
}
