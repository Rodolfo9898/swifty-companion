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
import { fetchLeaderboardStatus } from '../../backend/api/leaderboardApi';
import type { ThemeColors } from '../styles/theme';
import { readLocalRuntimeSettings, saveLocalRuntimeSettings } from '../utils/localSettings';

export default function BonusSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  useEffect(() => {
    let isActive = true;
    const loadSettings = async () => {
      const settings = await readLocalRuntimeSettings();
      if (!isActive) return;
      setClientSecret(settings.ftClientSecret);
      setSyncIntervalMinutes(String(settings.leaderboardSyncIntervalMinutes));
      setSavedAt(settings.updatedAt ?? null);
      try {
        const status = await fetchLeaderboardStatus();
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
  });
}
