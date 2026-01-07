import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import {
  Campus,
  UserSummary,
  fetchCampuses,
  fetchCampusUsers,
  fetchUsers,
} from '../../backend/api/fortyTwoApi';
import createLeaderboardStyles from '../styles/leaderboardStyles';
import { useTheme } from '../ThemeContext';

const ALL_CAMPUSES = -1;
const PAGE_SIZE = 50;

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createLeaderboardStyles(colors), [colors]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number>(ALL_CAMPUSES);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCampuses = async () => {
      try {
        const data = await fetchCampuses();
        setCampuses(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load campuses.';
        setError(message);
      }
    };
    loadCampuses();
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      setError(null);
      try {
        const request = campusId === ALL_CAMPUSES
          ? fetchUsers(page, PAGE_SIZE)
          : fetchCampusUsers(campusId, page, PAGE_SIZE);
        const result = await request;
        setUsers(result.data);
        setTotal(result.total ?? 0);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load users.';
        setError(message);
      }
    };
    loadUsers();
  }, [campusId, page]);

  const totalPages = total ? Math.ceil(total / PAGE_SIZE) : undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.selectorCard}>
        <Text style={styles.label}>Campus</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={String(campusId)}
            onValueChange={(value) => {
              setCampusId(Number(value));
              setPage(1);
            }}
            style={styles.picker}
            dropdownIconColor={colors.text}
          >
            <Picker.Item label="All campuses" value={String(ALL_CAMPUSES)} />
            {campuses.map((campus) => (
              <Picker.Item key={campus.id} label={campus.name} value={String(campus.id)} />
            ))}
          </Picker>
        </View>
        {totalPages ? (
          <Text style={styles.hint}>Page {page} of {totalPages}</Text>
        ) : (
          <Text style={styles.hint}>Page {page}</Text>
        )}
      </View>

      {users.map((user) => {
        const avatar = user.image?.link;
        return (
          <View key={`${user.id}-${user.login}`} style={styles.card}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
            )}
            <View>
              <Text style={styles.login}>{user.login}</Text>
              <Text style={styles.display}>{user.displayname ?? 'Unknown'}</Text>
            </View>
            <Text style={styles.level}>{user.level ? user.level.toFixed(2) : '--'}</Text>
          </View>
        );
      })}

      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.button, page <= 1 && styles.buttonDisabled]}
          onPress={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page <= 1}
        >
          <Text style={styles.buttonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, totalPages && page >= totalPages && styles.buttonDisabled]}
          onPress={() => setPage((prev) => prev + 1)}
          disabled={totalPages ? page >= totalPages : false}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}
