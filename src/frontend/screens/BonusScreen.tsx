import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import createBonusStyles from '../styles/bonusStyles';
import { fetchMe } from '../../backend/ft/repo';
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

  const handleOpenIntranet = () => {
    if (!user?.login) {
      Alert.alert('Login required', 'Please login to open your intranet profile.');
      return;
    }
    // @ts-expect-error route typed in RootStackParamList
    navigation.navigate('IntranetWeb', {
      url: `https://profile.intra.42.fr/users/${user.login}`,
      title: 'Intranet Profile',
    });
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
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            // @ts-expect-error route typed in RootStackParamList
            navigation.navigate('BonusSettings');
          }}
        >
          <Text style={styles.linkTitle}>Local sync settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={handleOpenIntranet}>
          <Text style={styles.linkTitle}>Open intranet profile</Text>
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
          <Text style={styles.linkSubtitle}>
            If the transcript page asks for login, sign in there first, then tap Auto Generate.
          </Text>
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
