import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../ThemeContext';
import {
  leaderboardRepo,
  type LeaderboardCampus,
} from '../../backend/leaderboard/repo';
import { useLocalDb } from '../LocalDbContext';
import type { ThemeColors } from '../styles/theme';
import { readLocalRuntimeSettings, saveLocalRuntimeSettings } from '../utils/localSettings';

export default function BonusSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isRefreshingDb, refreshDb } = useLocalDb();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState('10080');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<{
    users: number;
    campuses: number;
    generatedAt?: string;
    version?: number;
    lastUserUpdate?: number | null;
  } | null>(null);
  const [campuses, setCampuses] = useState<LeaderboardCampus[]>([]);
  const [selectedCampusIds, setSelectedCampusIds] = useState<number[]>([]);
  const [loadingCampuses, setLoadingCampuses] = useState(false);
  const [showCampusMenu, setShowCampusMenu] = useState(false);

  useEffect(() => {
    let isActive = true;
    const loadSettings = async () => {
      const settings = await readLocalRuntimeSettings();
      if (!isActive) return;
      setClientSecret(settings.ftClientSecret);
      setSyncIntervalMinutes(String(settings.leaderboardSyncIntervalMinutes));
      setSavedAt(settings.updatedAt ?? null);
      try {
        const status = await leaderboardRepo.fetchStatus();
        if (isActive) {
          setSnapshotStatus({
            users: status.users,
            campuses: status.campuses,
            generatedAt: 'generatedAt' in status ? String(status.generatedAt || '') : undefined,
            version: 'version' in status ? Number(status.version || 0) : undefined,
            lastUserUpdate: status.lastUserUpdate ?? null,
          });
        }
      } catch {
        if (isActive) {
          setSnapshotStatus(null);
        }
      }
      if (leaderboardRepo.isEnabled()) {
        setLoadingCampuses(true);
        try {
          const availableCampuses = await leaderboardRepo.fetchCampuses();
          if (isActive) {
            setCampuses([...availableCampuses].sort((a, b) => a.name.localeCompare(b.name)));
          }
        } catch {
          if (isActive) {
            setCampuses([]);
          }
        } finally {
          if (isActive) {
            setLoadingCampuses(false);
          }
        }
      }
      setLoading(false);
    };
    loadSettings();
    return () => {
      isActive = false;
    };
  }, []);

  const saveSettings = async () => {
    const parsedInterval = Number(syncIntervalMinutes);
    if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
      Alert.alert('Invalid value', 'LEADERBOARD_SYNC_INTERVAL_MINUTES must be a positive number.');
      return;
    }
    setSaving(true);
    try {
      const updatedAt = await saveLocalRuntimeSettings({
        ftClientSecret: clientSecret,
        leaderboardSyncIntervalMinutes: parsedInterval,
      });
      setSavedAt(updatedAt);
      Alert.alert('Saved', 'Local settings updated for this device.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save local settings.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const refreshLocalDb = async () => {
    if (isRefreshingDb) return;
    try {
      await refreshDb({ campusIds: selectedCampusIds });
      const status = await leaderboardRepo.fetchStatus();
      setSnapshotStatus({
        users: status.users,
        campuses: status.campuses,
        generatedAt: 'generatedAt' in status ? String(status.generatedAt || '') : undefined,
        version: 'version' in status ? Number(status.version || 0) : undefined,
        lastUserUpdate: status.lastUserUpdate ?? null,
      });
      Alert.alert(
        'DB refreshed',
        leaderboardRepo.isEnabled() && selectedCampusIds.length
          ? `Selected campuses refreshed (${selectedCampusIds.length}) and local DB reseeded.`
          : 'Leaderboard sync executed and local DB reseeded.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to refresh local DB.';
      Alert.alert('Refresh failed', message);
    }
  };

  const toggleCampus = (campusId: number) => {
    setSelectedCampusIds((prev) =>
      prev.includes(campusId) ? prev.filter((entry) => entry !== campusId) : [...prev, campusId],
    );
  };

  const savedAtLabel = savedAt ? new Date(savedAt).toLocaleString() : 'Not saved yet';
  const selectedCampusLabel = useMemo(() => {
    if (!selectedCampusIds.length) return 'All campuses';
    if (selectedCampusIds.length === 1) {
      return campuses.find((campus) => campus.id === selectedCampusIds[0])?.name ?? '1 campus selected';
    }
    return `${selectedCampusIds.length} campuses selected`;
  }, [campuses, selectedCampusIds]);
  const refreshButtonLabel = isRefreshingDb
    ? 'Refreshing local DB...'
    : leaderboardRepo.isEnabled() && selectedCampusIds.length
      ? `Refresh ${selectedCampusIds.length} selected campuses now`
      : 'Refresh local DB now';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Local Sync Settings</Text>
        <Text style={styles.subtitle}>
          These values are stored locally on this device and used by app token flows.
        </Text>

        <Text style={styles.label}>FT_CLIENT_AUTH</Text>
        <TextInput
          style={styles.input}
          value={clientSecret}
          onChangeText={setClientSecret}
          placeholder="Enter 42 client secret"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading && !saving}
        />

        <Text style={styles.label}>LEADERBOARD_SYNC_INTERVAL_MINUTES</Text>
        <TextInput
          style={styles.input}
          value={syncIntervalMinutes}
          onChangeText={setSyncIntervalMinutes}
          placeholder="10080"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          editable={!loading && !saving}
        />
        <TouchableOpacity
          style={[styles.secondaryButton, saving && styles.buttonDisabled]}
          onPress={() => setSyncIntervalMinutes('10080')}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>Set weekly (10080)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, (loading || saving) && styles.buttonDisabled]}
          onPress={saveSettings}
          disabled={loading || saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save settings'}</Text>
        </TouchableOpacity>

        {leaderboardRepo.isEnabled() ? (
          <View style={styles.campusCard}>
            <Text style={styles.label}>Campuses to refresh</Text>
            <Text style={styles.hint}>
              No selection means all campuses configured on backend.
            </Text>
            {loadingCampuses ? <Text style={styles.hint}>Loading campuses...</Text> : null}
            <TouchableOpacity
              style={[styles.dropdownButton, isRefreshingDb && styles.buttonDisabled]}
              onPress={() => setShowCampusMenu(true)}
              disabled={isRefreshingDb || loadingCampuses}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedCampusLabel}
              </Text>
              <Text style={styles.dropdownIcon}>▾</Text>
            </TouchableOpacity>
            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, isRefreshingDb && styles.buttonDisabled]}
                onPress={() => setSelectedCampusIds([])}
                disabled={isRefreshingDb}
              >
                <Text style={styles.secondaryButtonText}>Select all (backend default)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, isRefreshingDb && styles.buttonDisabled]}
                onPress={() => setSelectedCampusIds(campuses.map((entry) => entry.id))}
                disabled={isRefreshingDb || campuses.length === 0}
              >
                <Text style={styles.secondaryButtonText}>Select all listed</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>Remote sync disabled: LEADERBOARD_API_URL is not configured.</Text>
        )}

        <TouchableOpacity
          style={[styles.secondaryButton, isRefreshingDb && styles.buttonDisabled]}
          onPress={refreshLocalDb}
          disabled={isRefreshingDb}
        >
          <Text style={styles.secondaryButtonText}>{refreshButtonLabel}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Last saved: {savedAtLabel}</Text>
        {snapshotStatus ? (
          <>
            <Text style={styles.hint}>Local snapshot users: {snapshotStatus.users}</Text>
            <Text style={styles.hint}>Local snapshot campuses: {snapshotStatus.campuses}</Text>
            <Text style={styles.hint}>Snapshot version: {snapshotStatus.version ?? 1}</Text>
            {snapshotStatus.generatedAt ? (
              <Text style={styles.hint}>Snapshot generated: {new Date(snapshotStatus.generatedAt).toLocaleString()}</Text>
            ) : null}
          </>
        ) : null}
      </View>
      <Modal transparent visible={showCampusMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCampusMenu(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Campuses to refresh</Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, selectedCampusIds.length === 0 && styles.modalItemActive]}
                onPress={() => setSelectedCampusIds([])}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    selectedCampusIds.length === 0 && styles.modalItemTextActive,
                  ]}
                >
                  All campuses
                </Text>
              </TouchableOpacity>
              {campuses.map((campus) => {
                const isActive = selectedCampusIds.includes(campus.id);
                return (
                  <TouchableOpacity
                    key={campus.id}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => toggleCampus(campus.id)}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {isActive ? 'Selected - ' : ''}{campus.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalDoneButton}
              onPress={() => setShowCampusMenu(false)}
            >
              <Text style={styles.modalDoneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 10,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 8,
    },
    label: {
      color: colors.textSubtle,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 6,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
    },
    secondaryButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      marginTop: 4,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    saveButton: {
      marginTop: 10,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      alignItems: 'center',
    },
    saveButtonText: {
      color: colors.accentText,
      fontWeight: '700',
      fontSize: 13,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 6,
    },
    campusCard: {
      marginTop: 8,
      gap: 8,
    },
    dropdownButton: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 40,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    dropdownText: {
      color: colors.text,
      fontSize: 13,
      flex: 1,
    },
    dropdownIcon: {
      color: colors.textMuted,
      fontSize: 12,
    },
    rowButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 6, 23, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalCard: {
      width: '100%',
      maxHeight: 420,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    modalTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      paddingHorizontal: 16,
      paddingVertical: 14,
      textAlign: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalList: {
      maxHeight: 320,
    },
    modalItem: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: 'center',
    },
    modalItemActive: {
      backgroundColor: colors.surfaceAlt,
    },
    modalItemText: {
      color: colors.text,
      fontSize: 13,
      textAlign: 'center',
    },
    modalItemTextActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    modalDoneButton: {
      margin: 12,
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      alignItems: 'center',
    },
    modalDoneButtonText: {
      color: colors.accentText,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
