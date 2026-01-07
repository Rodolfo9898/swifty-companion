import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Campus,
  UserSummary,
  fetchCampuses,
  fetchCampusUsers,
  fetchUsers,
  fetchUserProfile,
} from '../../backend/api/fortyTwoApi';
import type { RootStackParamList } from '../AppRoot';
import createLeaderboardStyles from '../styles/leaderboardStyles';
import { useAuth } from '../AuthContext';
import { useTheme } from '../ThemeContext';
import {
  readLeaderboardCache,
  readLeaderboardRanking,
  writeLeaderboardCache,
  writeLeaderboardRanking,
} from '../utils/appCache';

const ALL_CAMPUSES = -1;
const PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const BELGIUM_MATCHERS = ['belgium', 'brussels', 'bruxelles'];

type Props = NativeStackScreenProps<RootStackParamList, 'Leaderboard'>;

type SortOrder = 'desc' | 'asc';

type CursusEntry = {
  level: number;
  cursus?: { slug?: string | null; name?: string | null };
};

const isPiscineCursus = (user: CursusEntry) => {
  const slug = user.cursus?.slug?.toLowerCase() ?? '';
  const name = user.cursus?.name?.toLowerCase() ?? '';
  return slug.includes('piscine') || name.includes('piscine');
};

const looksPiscineName = (value?: string | null) =>
  Boolean(value && value.toLowerCase().includes('piscine'));

type RankedEntry = {
  login: string;
  displayname?: string;
  image?: UserSummary['image'];
  level: number | null;
};

const isFortyTwoCursus = (user: CursusEntry) => {
  const slug = user.cursus?.slug?.toLowerCase() ?? '';
  const name = user.cursus?.name?.toLowerCase() ?? '';
  return slug.includes('42cursus') || name.includes('42cursus');
};

const getCurrentCursus = (user: { cursus_users?: CursusEntry[] }) => {
  const cursusUsers = user.cursus_users ?? [];
  if (!cursusUsers.length) return null;
  const fortyTwoEntries = cursusUsers.filter((entry) => isFortyTwoCursus(entry));
  const candidates = fortyTwoEntries.length ? fortyTwoEntries : cursusUsers;
  return candidates.reduce((current, entry) => {
    if (!current) return entry;
    if (typeof entry.level !== 'number') return current;
    if (typeof current.level !== 'number') return entry;
    return entry.level >= current.level ? entry : current;
  }, null as CursusEntry | null);
};

const isEligibleUser = (user: UserSummary) => {
  if (!user.cursus_users || user.cursus_users.length === 0) {
    if (looksPiscineName(user.displayname) || looksPiscineName(user.login)) {
      return false;
    }
    return true;
  }
  const current = getCurrentCursus(user);
  if (current && isPiscineCursus(current)) return false;
  const cursusUsers = user.cursus_users ?? [];
  return cursusUsers.some((entry) => isFortyTwoCursus(entry));
};

function getUserLevel(user: UserSummary) {
  const current = getCurrentCursus(user);
  if (current && Number.isFinite(current.level)) {
    return current.level;
  }
  if (typeof user.level === 'number') {
    return user.level;
  }
  return null;
}

export default function LeaderboardScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createLeaderboardStyles(colors), [colors]);
  const { user: currentUser } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusId, setCampusId] = useState<number>(ALL_CAMPUSES);
  const [appliedCampusId, setAppliedCampusId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [error, setError] = useState<string | null>(null);
  const [rankingEntries, setRankingEntries] = useState<RankedEntry[]>([]);
  const [rankingUpdatedAt, setRankingUpdatedAt] = useState<number | null>(null);
  const [rankingComplete, setRankingComplete] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compare' | 'top10'>('compare');

  useEffect(() => {
    const loadCampuses = async () => {
      try {
        const perPage = 100;
        let pageIndex = 1;
        const allCampuses: Campus[] = [];
        while (pageIndex <= 20) {
          const data = await fetchCampuses(pageIndex, perPage);
          allCampuses.push(...data);
          if (data.length < perPage) break;
          pageIndex += 1;
        }
        const sorted = [...allCampuses].sort((a, b) => a.name.localeCompare(b.name));
        const filtered = sorted.filter((campus) =>
          BELGIUM_MATCHERS.some((term) => campus.name.toLowerCase().includes(term)),
        );
        const available = filtered.length ? filtered : sorted;
        setCampuses(available);
        if (available.length && campusId === ALL_CAMPUSES) {
          setCampusId(available[0].id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load campuses.';
        setError(message);
      }
    };
    loadCampuses();
  }, []);

  const loadUsers = async (targetCampusId: number, targetPage: number) => {
    setError(null);
    try {
      const cacheKey = `${targetCampusId}:${targetPage}`;
      const cache = await readLeaderboardCache<{
        [key: string]: { updatedAt: number; users: UserSummary[]; total: number };
      }>();
      const cachedEntry = cache[cacheKey];
      if (cachedEntry && Date.now() - cachedEntry.updatedAt < DAY_MS) {
        setUsers(cachedEntry.users);
        setTotal(cachedEntry.total);
        return;
      }
      const request = targetCampusId === ALL_CAMPUSES
        ? fetchUsers(targetPage, PAGE_SIZE)
        : fetchCampusUsers(targetCampusId, targetPage, PAGE_SIZE);
      const result = await request;
      const enriched = await enrichUsers(result.data);
      setUsers(enriched);
      setTotal(result.total ?? 0);
      const nextCache = {
        ...cache,
        [cacheKey]: {
          updatedAt: Date.now(),
          users: enriched,
          total: result.total ?? 0,
        },
      };
      await writeLeaderboardCache(nextCache);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load users.';
      setError(message);
    }
  };

  const enrichUsers = async (list: UserSummary[]) => {
    const enriched: UserSummary[] = [];
    for (const entry of list) {
      if (entry.cursus_users?.length || typeof entry.level === 'number') {
        enriched.push(entry);
        continue;
      }
      try {
        const profile = await fetchUserProfile(entry.login);
        const full = profile as UserSummary & { cursus_users?: CursusEntry[] };
        const level = getUserLevel(full);
        enriched.push({
          ...entry,
          image: profile.image ?? entry.image,
          displayname: profile.displayname ?? entry.displayname,
          cursus_users: full.cursus_users ?? entry.cursus_users,
          level: typeof level === 'number' ? level : entry.level,
        });
      } catch {
        enriched.push(entry);
      }
    }
    return enriched;
  };

  useEffect(() => {
    if (appliedCampusId === null) return;
    loadUsers(appliedCampusId, page);
  }, [appliedCampusId, page]);

  const handleCompare = () => {
    setPage(1);
    setAppliedCampusId(campusId);
  };

  useEffect(() => {
    setUsers([]);
    setTotal(0);
  }, [campusId]);

  useEffect(() => {
    const loadRanking = async () => {
      const cache = await readLeaderboardRanking<{
        [key: string]: { updatedAt: number; complete: boolean; entries: RankedEntry[] };
      }>();
      const key = String(campusId);
      const entry = cache[key];
      if (entry) {
        setRankingEntries(entry.entries);
        setRankingUpdatedAt(entry.updatedAt);
        setRankingComplete(entry.complete);
      } else {
        setRankingEntries([]);
        setRankingUpdatedAt(null);
        setRankingComplete(false);
      }
    };
    if (campusId !== ALL_CAMPUSES) {
      loadRanking();
    }
  }, [campusId]);

  const saveRankingCache = async (entries: RankedEntry[], complete: boolean) => {
    const cache = await readLeaderboardRanking<{
      [key: string]: { updatedAt: number; complete: boolean; entries: RankedEntry[] };
    }>();
    const updatedAt = Date.now();
    const nextCache = {
      ...cache,
      [String(campusId)]: { updatedAt, complete, entries },
    };
    await writeLeaderboardRanking(nextCache);
    setRankingEntries(entries);
    setRankingUpdatedAt(updatedAt);
    setRankingComplete(complete);
  };

  const buildRanking = async () => {
    if (campusId === ALL_CAMPUSES) return;
    setRankingLoading(true);
    setError(null);
    try {
      let pageIndex = 1;
      let totalCount = 0;
      const map = new Map<string, RankedEntry>();
      while (pageIndex <= 200) {
        const result = await fetchCampusUsers(campusId, pageIndex, PAGE_SIZE);
        totalCount = result.total ?? totalCount;
        const enriched = await enrichUsers(result.data);
        enriched
          .filter((user) => isEligibleUser(user))
          .forEach((user) => {
            const level = getUserLevel(user);
            map.set(user.login, {
              login: user.login,
              displayname: user.displayname,
              image: user.image,
              level,
            });
          });
        if (result.data.length < PAGE_SIZE) break;
        if (totalCount && pageIndex * PAGE_SIZE >= totalCount) break;
        pageIndex += 1;
      }
      const entries = Array.from(map.values()).sort((a, b) => {
        if (a.level === null && b.level === null) return 0;
        if (a.level === null) return 1;
        if (b.level === null) return -1;
        return b.level - a.level;
      });
      await saveRankingCache(entries, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to build ranking.';
      setError(message);
    } finally {
      setRankingLoading(false);
    }
  };

  const resetRanking = async () => {
    const cache = await readLeaderboardRanking<{
      [key: string]: { updatedAt: number; complete: boolean; entries: RankedEntry[] };
    }>();
    const nextCache = { ...cache };
    delete nextCache[String(campusId)];
    await writeLeaderboardRanking(nextCache);
    setRankingEntries([]);
    setRankingUpdatedAt(null);
    setRankingComplete(false);
  };


  const totalPages = total ? Math.ceil(total / PAGE_SIZE) : undefined;
  const sortedUsers = useMemo(() => {
    const filteredUsers = users.filter((user) => isEligibleUser(user));
    const direction = sortOrder === 'asc' ? 1 : -1;
    return filteredUsers
      .map((user) => ({ user, level: getUserLevel(user) }))
      .sort((a, b) => {
        if (a.level === null && b.level === null) return 0;
        if (a.level === null) return 1;
        if (b.level === null) return -1;
        return (a.level - b.level) * direction;
      })
      .map((entry) => entry.user);
  }, [sortOrder, users]);
  const levelLabel = 'Level';
  const currentUserLevel =
    currentUser && getUserLevel(currentUser as UserSummary);
  const rankingLabel = rankingUpdatedAt
    ? new Date(rankingUpdatedAt).toLocaleString()
    : 'Not built yet';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {currentUser ? (
        <View style={styles.card}>
          {currentUser.image?.link ? (
            <Image source={{ uri: currentUser.image.link }} style={styles.avatar} />
          ) : (
            <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
          )}
          <View>
            <Text style={styles.login}>{currentUser.login}</Text>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>You</Text>
            </View>
          </View>
          <View style={styles.levelBlock}>
            <Text style={styles.levelLabel}>Current level</Text>
            <Text style={styles.level}>
              {typeof currentUserLevel === 'number' ? currentUserLevel.toFixed(2) : '--'}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.selectorCard}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'compare' && styles.tabActive]}
            onPress={() => setActiveTab('compare')}
          >
            <Text style={[styles.tabText, activeTab === 'compare' && styles.tabTextActive]}>
              Compare
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'top10' && styles.tabActive]}
            onPress={() => setActiveTab('top10')}
          >
            <Text style={[styles.tabText, activeTab === 'top10' && styles.tabTextActive]}>
              Top 10
            </Text>
          </TouchableOpacity>
        </View>
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
        {activeTab === 'compare' ? (
          <>
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.label}>Order</Text>
                <View style={styles.pickerWrap}>
                  <Picker
                    selectedValue={sortOrder}
                    onValueChange={(value) => setSortOrder(value as SortOrder)}
                    style={styles.picker}
                    dropdownIconColor={colors.text}
                  >
                    <Picker.Item label="Descending" value="desc" />
                    <Picker.Item label="Ascending" value="asc" />
                  </Picker>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.compareButton} onPress={handleCompare}>
              <Text style={styles.compareButtonText}>Compare</Text>
            </TouchableOpacity>
            {totalPages ? (
              <Text style={styles.hint}>Page {page} of {totalPages}</Text>
            ) : (
              <Text style={styles.hint}>Page {page}</Text>
            )}
          </>
        ) : (
          <>
            <View style={styles.rankingMeta}>
              <Text style={styles.hint}>Last updated: {rankingLabel}</Text>
              <Text style={styles.hint}>
                {rankingComplete ? 'Ranking complete' : 'Ranking not complete'}
              </Text>
            </View>
            <View style={styles.rankingActions}>
              <TouchableOpacity
                style={[styles.compareButton, rankingLoading && styles.buttonDisabled]}
                onPress={buildRanking}
                disabled={rankingLoading}
              >
                <Text style={styles.compareButtonText}>
                  {rankingLoading ? 'Building...' : 'Build ranking'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={resetRanking}>
                <Text style={styles.resetButtonText}>Reset cache</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {activeTab === 'compare' ? sortedUsers.map((user) => {
        const avatar = user.image?.link;
        const level = getUserLevel(user);
        return (
          <TouchableOpacity
            key={`${user.id}-${user.login}`}
            style={styles.card}
            onPress={() =>
              navigation.navigate('Search', { initialLogin: user.login })
            }
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
            )}
            <View>
              <Text style={styles.login}>{user.login}</Text>
              <Text style={styles.display}>{user.displayname ?? 'Unknown'}</Text>
            </View>
            <View style={styles.levelBlock}>
              <Text style={styles.levelLabel}>{levelLabel}</Text>
              <Text style={styles.level}>{level !== null ? level.toFixed(2) : '--'}</Text>
            </View>
          </TouchableOpacity>
        );
      }) : rankingEntries.slice(0, 10).map((entry, index) => {
        const avatar = entry.image?.link;
        return (
          <View key={`${entry.login}-${index}`} style={styles.card}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
            )}
            <View>
              <Text style={styles.login}>{entry.login}</Text>
              <Text style={styles.display}>{entry.displayname ?? 'Unknown'}</Text>
            </View>
            <View style={styles.levelBlock}>
              <Text style={styles.levelLabel}>Level</Text>
              <Text style={styles.level}>
                {typeof entry.level === 'number' ? entry.level.toFixed(2) : '--'}
              </Text>
            </View>
          </View>
        );
      })}

      {activeTab === 'compare' ? (
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
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}
