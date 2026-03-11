import { Buffer } from 'buffer';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

import createBonusStyles from '../styles/bonusStyles';
import { ensureAccessToken } from '../../backend/auth/fortyTwoAuth';
import { fetchMe } from '../../backend/api/fortyTwoApi';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';

type TranscriptTemplate = {
  id: number;
  label: string;
};

const TRANSCRIPT_TEMPLATES: TranscriptTemplate[] = [
  { id: 119, label: '42cursus - Dutch' },
  { id: 120, label: '42cursus - Français' },
  { id: 14, label: '42cursus - English' },
];

const API_BASE = 'https://api.intra.42.fr';

async function savePdfFromResponse(response: Response, targetUri: string) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text.slice(0, 160)}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 100) {
    throw new Error('Received an invalid PDF payload.');
  }

  const pdfBase64 = Buffer.from(bytes).toString('base64');
  await FileSystem.writeAsStringAsync(targetUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const minYear = 2023;
  const years: number[] = [];
  for (let year = currentYear; year >= minYear; year -= 1) {
    years.push(year);
  }
  return years;
}

export default function BonusScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createBonusStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();

  const [downloading, setDownloading] = useState(false);
  const tapCount = useRef(0);
  const lastTap = useRef(0);

  const yearOptions = useMemo(() => getYearOptions(), []);
  const defaultStartYear = yearOptions[yearOptions.length - 1] ?? 2023;
  const defaultEndYear = yearOptions[0] ?? new Date().getFullYear();

  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(TRANSCRIPT_TEMPLATES[0].id);
  const [selectedStartYear, setSelectedStartYear] = useState<number>(defaultStartYear);
  const [selectedEndYear, setSelectedEndYear] = useState<number>(defaultEndYear);
  const [openMenu, setOpenMenu] = useState<'template' | 'startYear' | 'endYear' | null>(null);

  const selectedTemplate =
    TRANSCRIPT_TEMPLATES.find((template) => template.id === selectedTemplateId) ?? TRANSCRIPT_TEMPLATES[0];

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

  const downloadTranscript = async (
    token: string,
    profile: { id: number; login?: string }
  ) => {
    if (!profile?.id || !FileSystem.documentDirectory) {
      throw new Error('File system is not available on this device.');
    }

    if (selectedStartYear > selectedEndYear) {
      throw new Error('Start year cannot be greater than end year.');
    }

    const url = `https://projects.intra.42.fr/users/${profile.id}/transcripts/${selectedTemplateId}/generate.pdf`;
    const body = new URLSearchParams({
      start_year: String(selectedStartYear),
      end_year: String(selectedEndYear),
      sr_id: String(selectedTemplateId),
    }).toString();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/pdf',
      },
      body,
    });

    const targetUri = `${FileSystem.documentDirectory}transcript_${profile.login || profile.id}_${selectedTemplateId}_${selectedStartYear}-${selectedEndYear}.pdf`;
    await savePdfFromResponse(response, targetUri);
    return targetUri;
  };

  const downloadTranscriptFromApi = async (
    token: string,
    profile: { id: number; login?: string }
  ) => {
    if (!profile?.id || !FileSystem.documentDirectory) {
      throw new Error('File system is not available on this device.');
    }

    const response = await fetch(`${API_BASE}/v2/users/${profile.id}/transcript`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
    });

    const targetUri = `${FileSystem.documentDirectory}transcript_${profile.login || profile.id}_api.pdf`;
    await savePdfFromResponse(response, targetUri);
    return targetUri;
  };


  const resolveCurrentUser = async () => {
    let currentUser = user;
    if (!currentUser?.id || !currentUser?.login) {
      const me = await fetchMe();
      currentUser = me;
      await refreshUser();
    }
    if (!currentUser?.id) {
      throw new Error('Could not resolve your profile id from the active session.');
    }
    return currentUser;
  };

  const handleOpenTranscriptWeb = async () => {
    try {
      const currentUser = await resolveCurrentUser();
      // @ts-expect-error route typed in RootStackParamList
      navigation.navigate('TranscriptWeb', {
        userId: currentUser.id,
        startYear: selectedStartYear,
        endYear: selectedEndYear,
        templateId: selectedTemplateId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to open transcript web session.';
      Alert.alert('Open transcript failed', message);
    }
  };

  const handleDownloadTranscript = async () => {
    if (!FileSystem.documentDirectory) {
      Alert.alert('Download failed', 'File system is not available on this device.');
      return;
    }
    if (downloading) return;

    setDownloading(true);
    try {
      const token = await ensureAccessToken();

      const currentUser = await resolveCurrentUser();

      let fileUri: string;
      try {
        fileUri = await downloadTranscript(token, currentUser);
        await openLink(fileUri);
        return;
      } catch (primaryErr) {
        try {
          fileUri = await downloadTranscriptFromApi(token, currentUser);
          await openLink(fileUri);
          return;
        } catch (apiErr) {
          const message = apiErr instanceof Error ? apiErr.message : '';
          if (message.includes('(401)')) {
            await openLink(`https://projects.intra.42.fr/users/${currentUser.id}/transcripts`);
            return;
          }
          throw apiErr;
        }
      }
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
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Important links</Text>
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenIntranet}>
          <Text style={styles.linkTitle}>Open intranet profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenHolyGraph}>
          <Text style={styles.linkTitle}>Holy graph</Text>
        </TouchableOpacity>

        <View style={styles.linkButton}>
          <Text style={styles.linkTitle}>Transcript</Text>

          <View style={styles.selectRow}>
            <Text style={styles.selectLabel}>Start Year</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpenMenu('startYear')}>
              <Text style={styles.dropdownText} numberOfLines={1}>{selectedStartYear}</Text>
              <Text style={styles.dropdownIcon}>▾</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectRow}>
            <Text style={styles.selectLabel}>End Year</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpenMenu('endYear')}>
              <Text style={styles.dropdownText} numberOfLines={1}>{selectedEndYear}</Text>
              <Text style={styles.dropdownIcon}>▾</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.selectRow}>
            <Text style={styles.selectLabel}>Choose PDF</Text>
            <TouchableOpacity style={styles.dropdownButton} onPress={() => setOpenMenu('template')}>
              <Text style={styles.dropdownText} numberOfLines={1}>{selectedTemplate.label}</Text>
              <Text style={styles.dropdownIcon}>▾</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.downloadSecondaryButton}
            onPress={handleOpenTranscriptWeb}
          >
            <Text style={styles.downloadSecondaryButtonText}>Open in-app transcript session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.downloadActionButton, downloading && styles.linkButtonDisabled]}
            onPress={handleDownloadTranscript}
            disabled={downloading}
          >
            <View style={styles.linkRow}>
              <Text style={styles.linkTitle}>
                {downloading ? 'Generating PDF…' : 'Download'}
              </Text>
              {downloading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal transparent visible={openMenu !== null} animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOpenMenu(null)}>
          <View style={styles.modalCard}>
            <ScrollView style={styles.modalList}>
              {openMenu === 'template'
                ? TRANSCRIPT_TEMPLATES.map((template) => {
                    const active = template.id === selectedTemplateId;
                    return (
                      <TouchableOpacity
                        key={`template-${template.id}`}
                        style={[styles.modalItem, active && styles.modalItemActive]}
                        onPress={() => {
                          setSelectedTemplateId(template.id);
                          setOpenMenu(null);
                        }}
                      >
                        <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{template.label}</Text>
                      </TouchableOpacity>
                    );
                  })
                : null}

              {openMenu === 'startYear'
                ? yearOptions.map((year) => {
                    const active = year === selectedStartYear;
                    return (
                      <TouchableOpacity
                        key={`start-year-${year}`}
                        style={[styles.modalItem, active && styles.modalItemActive]}
                        onPress={() => {
                          setSelectedStartYear(year);
                          if (year > selectedEndYear) {
                            setSelectedEndYear(year);
                          }
                          setOpenMenu(null);
                        }}
                      >
                        <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{year}</Text>
                      </TouchableOpacity>
                    );
                  })
                : null}

              {openMenu === 'endYear'
                ? yearOptions.map((year) => {
                    const active = year === selectedEndYear;
                    return (
                      <TouchableOpacity
                        key={`end-year-${year}`}
                        style={[styles.modalItem, active && styles.modalItemActive]}
                        onPress={() => {
                          setSelectedEndYear(year);
                          if (year < selectedStartYear) {
                            setSelectedStartYear(year);
                          }
                          setOpenMenu(null);
                        }}
                      >
                        <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>{year}</Text>
                      </TouchableOpacity>
                    );
                  })
                : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
