import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

import createBonusStyles from '../styles/bonusStyles';
import { ensureAccessToken } from '../../backend/auth/fortyTwoAuth';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';

export default function BonusScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createBonusStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const tapCount = useRef(0);
  const lastTap = useRef(0);
  const { apiBaseUrl } = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
  const API_BASE = apiBaseUrl || 'https://api.intra.42.fr';

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

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open link.';
      Alert.alert('Open link failed', message);
    }
  };

  const handleOpenIntranet = () => {
    if (!user?.login) {
      Alert.alert('Login required', 'Please login to open your intranet profile.');
      return;
    }
    openLink(`https://profile.intra.42.fr/users/${user.login}`);
  };

  const handleOpenHolyGraph = () => {
    if (!user?.login) {
      Alert.alert('Login required', 'Please login to open your holy graph.');
      return;
    }
    openLink(`https://projects.intra.42.fr/projects/graph?login=${encodeURIComponent(user.login)}`);
  };

  const handleDownloadTranscript = async () => {
    if (!user?.id) {
      Alert.alert('Login required', 'Please login to download your transcript.');
      return;
    }
    if (!FileSystem.documentDirectory) {
      Alert.alert('Download failed', 'File system is not available on this device.');
      return;
    }
    if (downloading) return;
    setDownloading(true);
    try {
      const token = await ensureAccessToken();
      const targetUri = `${FileSystem.documentDirectory}transcript_${user.login || user.id}.pdf`;
      const result = await FileSystem.downloadAsync(
        `${API_BASE}/v2/users/${user.id}/transcript`,
        targetUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/pdf',
          },
        },
      );
      await openLink(result.uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to download transcript.';
      Alert.alert('Download failed', message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={handleSecretTap} activeOpacity={0.8}>
        <Text style={styles.title}>Intranet</Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>Quick access to your 42 profile essentials.</Text>

      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroTitle}>{user?.displayname || '42 Student'}</Text>
            <Text style={styles.heroSubtitle}>{user?.login || 'Login required'}</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>Intranet</Text>
          </View>
        </View>
        <Text style={styles.heroHint}>Open your profile, holy graph, and transcript.</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Important links</Text>
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenIntranet}>
          <Text style={styles.linkTitle}>Open intranet profile</Text>
          <Text style={styles.linkSubtitle}>profile.intra.42.fr</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenHolyGraph}>
          <Text style={styles.linkTitle}>Holy graph</Text>
          <Text style={styles.linkSubtitle}>See your cursus map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.linkButton, downloading && styles.linkButtonDisabled]}
          onPress={handleDownloadTranscript}
          disabled={downloading}
        >
          <Text style={styles.linkTitle}>Download transcript</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkSubtitle}>
              {downloading ? 'Downloading…' : 'PDF from the 42 API'}
            </Text>
            {downloading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
