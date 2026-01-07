import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { Campus, fetchCampuses, fetchCampusUsers, fetchUsers } from '../../backend/api/fortyTwoApi';
import StatCard from '../components/StatCard';
import createStatsStyles from '../styles/statsStyles';
import { useTheme } from '../ThemeContext';

const ALL_CAMPUSES = -1;

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStatsStyles(colors), [colors]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number>(ALL_CAMPUSES);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    campusCount: 0,
    averageLevel: 0,
    sampleSize: 0,
  });

  useEffect(() => {
    const loadCampuses = async () => {
      try {
        setLoadingError(null);
        const perPage = 100;
        const all: Campus[] = [];
        let page = 1;
        while (page <= 20) {
          const data = await fetchCampuses(page, perPage);
          all.push(...data);
          if (data.length < perPage) break;
          page += 1;
        }
        setCampuses(all);
        setStats((prev) => ({ ...prev, campusCount: all.length }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load campuses.';
        setLoadingError(message);
      }
    };
    loadCampuses();
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      setLoadingError(null);
      try {
        const request = campusId === ALL_CAMPUSES
          ? fetchUsers(1, 50)
          : fetchCampusUsers(campusId, 1, 50);
        const result = await request;
        const levels = result.data
          .map((user) => user.level)
          .filter((value): value is number => typeof value === 'number');
        const averageLevel =
          levels.length > 0
            ? levels.reduce((sum, value) => sum + value, 0) / levels.length
            : 0;
        setStats((prev) => ({
          ...prev,
          totalUsers: result.total ?? result.data.length,
          averageLevel,
          sampleSize: levels.length,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load stats.';
        setLoadingError(message);
      }
    };
    loadStats();
  }, [campusId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>42 Stats overview</Text>

      <View style={styles.selectorCard}>
        <Text style={styles.label}>Campus filter</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={String(campusId)}
            onValueChange={(value) => setCampusId(Number(value))}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            <Picker.Item label="All campuses" value={String(ALL_CAMPUSES)} />
            {campuses.map((campus) => (
              <Picker.Item key={campus.id} label={campus.name} value={String(campus.id)} />
            ))}
          </Picker>
        </View>
        <Text style={styles.hint}>
          Stats use a live sample of the first 50 users for the selected campus.
        </Text>
      </View>

      <View style={styles.row}>
        <StatCard
          title="Total users"
          value={stats.totalUsers.toLocaleString()}
          hint="Based on 42 API totals."
          colors={colors}
        />
        <StatCard
          title="Campuses"
          value={stats.campusCount.toString()}
          hint="Available campuses."
          colors={colors}
        />
      </View>

      <View style={styles.row}>
        <StatCard
          title="Average level"
          value={stats.averageLevel ? stats.averageLevel.toFixed(2) : 'N/A'}
          hint={`Sample size: ${stats.sampleSize}`}
          colors={colors}
        />
      </View>

      {loadingError ? <Text style={styles.error}>{loadingError}</Text> : null}
    </ScrollView>
  );
}
