import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
            setCampuses(availableCampuses);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Local Sync Settings</Text>
        <Text style={styles.subtitle}>
          These values are stored locally on this device and used by app token flows.
        </Text>

        <Text style={styles.label}>FT_CLIENT_SECRET</Text>
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

        <TouchableOpacity
          style={[styles.secondaryButton, isRefreshingDb && styles.buttonDisabled]}
          onPress={refreshLocalDb}
          disabled={isRefreshingDb}
        >
          <Text style={styles.secondaryButtonText}>
            {isRefreshingDb ? 'Refreshing local DB...' : 'Refresh local DB now'}
          </Text>
        </TouchableOpacity>
        {leaderboardRepo.isEnabled() ? (
          <View style={styles.campusCard}>
            <Text style={styles.label}>Campuses to refresh</Text>
            <Text style={styles.hint}>
              No selection means all campuses configured on backend.
            </Text>
            {loadingCampuses ? <Text style={styles.hint}>Loading campuses...</Text> : null}
            <View style={styles.multiSelectWrap}>
              {campuses.map((campus) => {
                const active = selectedCampusIds.includes(campus.id);
                return (
                  <TouchableOpacity
                    key={campus.id}
                    style={[styles.multiSelectItem, active && styles.multiSelectItemActive]}
                    onPress={() => toggleCampus(campus.id)}
                    disabled={isRefreshingDb}
                  >
                    <Text style={[styles.multiSelectText, active && styles.multiSelectTextActive]}>
                      {campus.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    multiSelectWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    multiSelectItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surfaceAlt,
    },
    multiSelectItemActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    multiSelectText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    multiSelectTextActive: {
      color: colors.accentText,
    },
    rowButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
  });
}
