import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Campus,
  UserSummary,
  fetchCampuses,
  fetchCampusUsers,
  fetchUsers,
  fetchUserProfile,
} from '../../backend/api/fortyTwoApi';
import {
  fetchLeaderboardCampuses,
  fetchLeaderboardPage,
  fetchLeaderboardPromos,
  fetchLeaderboardTop,
  isLeaderboardApiEnabled,
} from '../../backend/api/leaderboardApi';
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
type SortField =
  | 'login'
  | 'displayname'
  | 'level'
  | 'weekly_logtime'
  | 'correction_points'
  | 'wallets'
  | 'campus_name'
  | 'coalition_name'
  | 'blackholed_at';

const SORT_FIELDS: Array<{ id: SortField; label: string }> = [
  { id: 'login', label: 'Login' },
  { id: 'displayname', label: 'Display name' },
  { id: 'level', label: 'Level' },
  { id: 'weekly_logtime', label: 'Weekly logtime' },
  { id: 'correction_points', label: 'Correction points' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'campus_name', label: 'Campus' },
  { id: 'coalition_name', label: 'Coalition' },
  { id: 'blackholed_at', label: 'Blackhole' },
];

const FIELD_LABELS: Array<{ id: SortField; label: string }> = [
  { id: 'displayname', label: 'Display name' },
  { id: 'level', label: 'Level' },
  { id: 'weekly_logtime', label: 'Weekly logtime' },
  { id: 'correction_points', label: 'Correction points' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'campus_name', label: 'Campus' },
  { id: 'coalition_name', label: 'Coalition' },
  { id: 'blackholed_at', label: 'Blackhole' },
];

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
  if (!fortyTwoEntries.length) return null;
  return fortyTwoEntries.reduce((current, entry) => {
    if (!current) return entry;
    if (typeof entry.level !== 'number') return current;
    if (typeof current.level !== 'number') return entry;
    return entry.level >= current.level ? entry : current;
  }, null as CursusEntry | null);
};

const isEligibleUser = (user: UserSummary) => {
  if (!user.cursus_users || user.cursus_users.length === 0) {
    return false;
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
  const [showCampusMenu, setShowCampusMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showPromoMenu, setShowPromoMenu] = useState(false);
  const [showFieldsMenu, setShowFieldsMenu] = useState(false);
  const [showSortFieldMenu, setShowSortFieldMenu] = useState(false);
  const [promos, setPromos] = useState<string[]>([]);
  const [promo, setPromo] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('level');
  const [shownFields, setShownFields] = useState<Record<SortField, boolean>>(() => ({
    displayname: true,
    level: true,
    weekly_logtime: false,
    correction_points: false,
    wallets: false,
    campus_name: true,
    coalition_name: false,
    blackholed_at: false,
    login: false,
  }));
  const useBackend = isLeaderboardApiEnabled();

  useEffect(() => {
    const loadCampuses = async () => {
      try {
        const allCampuses: Campus[] = useBackend
          ? await fetchLeaderboardCampuses()
          : await (async () => {
            const perPage = 100;
            let pageIndex = 1;
            const list: Campus[] = [];
            while (pageIndex <= 20) {
              const data = await fetchCampuses(pageIndex, perPage);
              list.push(...data);
              if (data.length < perPage) break;
              pageIndex += 1;
            }
            return list;
          })();
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

  const loadUsers = async (targetCampusId: number, targetPage: number, meLogin?: string) => {
    setError(null);
    try {
      if (useBackend) {
        const response = await fetchLeaderboardPage({
          campusId: targetCampusId === ALL_CAMPUSES ? undefined : targetCampusId,
          promo: promo || undefined,
          search: appliedSearch || undefined,
          sortField,
          page: targetPage,
          perPage: PAGE_SIZE,
          sort: sortOrder,
          meLogin,
        });
        const mapped = response.data.map((entry) => ({
          id: entry.id,
          login: entry.login,
          displayname: entry.displayname ?? undefined,
          image: entry.image ? { link: entry.image } : undefined,
          level: entry.level ?? undefined,
          title: entry.title ?? undefined,
          campus: entry.campusName ?? undefined,
          weekly_logtime: entry.weekly_logtime ?? undefined,
          correction_points: entry.correction_points ?? undefined,
          wallets: entry.wallets ?? undefined,
          blackholed_at: entry.blackholed_at ?? undefined,
          coalition_name: entry.coalition_name ?? undefined,
          cursus_users: [
            {
              level: entry.level ?? 0,
              cursus: { id: 21, slug: '42cursus', name: '42cursus' },
            },
          ],
        })) as UserSummary[];
        setUsers(mapped);
        setTotal(response.total ?? 0);
        return;
      }
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
      if (entry.cursus_users?.length) {
        enriched.push(entry);
        continue;
      }
      try {
        const profile = await fetchUserProfile(entry.login);
        const full = profile as UserSummary & { cursus_users?: CursusEntry[] };
        if (!full.cursus_users?.length) {
          continue;
        }
        const level = getUserLevel(full);
        if (level === null) {
          continue;
        }
        enriched.push({
          ...entry,
          image: profile.image ?? entry.image,
          displayname: profile.displayname ?? entry.displayname,
          cursus_users: full.cursus_users ?? entry.cursus_users,
          level: typeof level === 'number' ? level : entry.level,
        });
      } catch {
        // Skip if we cannot load cursus info
      }
    }
    return enriched;
  };

  useEffect(() => {
    if (appliedCampusId === null) return;
    loadUsers(appliedCampusId, page);
  }, [appliedCampusId, page, appliedSearch, sortField, sortOrder, promo]);

  const handleCompare = () => {
    setPage(1);
    setAppliedCampusId(campusId);
    setAppliedSearch(searchText.trim());
  };

  const handleJumpToMe = () => {
    if (!currentUser?.login) return;
    setPage(1);
    setAppliedCampusId(campusId);
    setAppliedSearch(searchText.trim());
    loadUsers(campusId, 1, currentUser.login);
  };

  useEffect(() => {
    setUsers([]);
    setTotal(0);
  }, [campusId]);

  useEffect(() => {
    const loadRanking = async () => {
      if (useBackend) {
        try {
          const entries = await fetchLeaderboardTop({
            campusId: campusId === ALL_CAMPUSES ? undefined : campusId,
            promo: promo || undefined,
            limit: 10,
            excludeLogin: 'latorche',
          });
          setRankingEntries(entries.map((entry) => ({
            login: entry.login,
            displayname: entry.displayname ?? undefined,
            image: entry.image ? { link: entry.image } : undefined,
            level: entry.level ?? null,
          })));
          setRankingUpdatedAt(Date.now());
          setRankingComplete(true);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to load top 10.';
          setError(message);
        }
        return;
      }
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
    if (useBackend || campusId !== ALL_CAMPUSES) {
      loadRanking();
    }
  }, [campusId, promo, useBackend]);

  useEffect(() => {
    if (!useBackend) return;
    const loadPromos = async () => {
      try {
        const list = await fetchLeaderboardPromos({
          campusId: campusId === ALL_CAMPUSES ? undefined : campusId,
        });
        setPromos(list);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load promos.';
        setError(message);
      }
    };
    loadPromos();
  }, [campusId, useBackend]);

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
    const filteredUsers = users.filter((user) => user.cursus_users?.length && isEligibleUser(user));
    if (useBackend) {
      return filteredUsers;
    }
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
  }, [sortOrder, useBackend, users]);
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
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowCampusMenu(true)}
        >
          <Text style={styles.dropdownText} numberOfLines={1}>
            {campusId === ALL_CAMPUSES
              ? 'All campuses'
              : (campuses.find((campus) => campus.id === campusId)?.name ?? 'Select campus')}
          </Text>
          <Text style={styles.dropdownIcon}>▾</Text>
        </TouchableOpacity>
        {useBackend ? (
          <>
            <Text style={styles.label}>Promo</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowPromoMenu(true)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {promo ? promo : 'Any promo'}
              </Text>
              <Text style={styles.dropdownIcon}>▾</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Search</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search login, display name, title..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleCompare}
            />
            <Text style={styles.label}>Sort by</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowSortFieldMenu(true)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {SORT_FIELDS.find((field) => field.id === sortField)?.label ?? 'Level'}
              </Text>
              <Text style={styles.dropdownIcon}>▾</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setShowFieldsMenu(true)}
            >
              <Text style={styles.secondaryButtonText}>Show fields…</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {activeTab === 'compare' ? (
          <>
            <View style={styles.filterRow}>
              <View style={styles.filterGroup}>
                <Text style={styles.label}>Order</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowSortMenu(true)}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▾</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.compareButton} onPress={handleCompare}>
              <Text style={styles.compareButtonText}>Compare</Text>
            </TouchableOpacity>
            {useBackend && currentUser?.login ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleJumpToMe}>
                <Text style={styles.secondaryButtonText}>Jump to me</Text>
              </TouchableOpacity>
            ) : null}
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
            {!useBackend ? (
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
            ) : null}
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
              {shownFields.displayname ? (
                <Text style={styles.display}>{user.displayname ?? 'Unknown'}</Text>
              ) : null}
              {shownFields.campus_name && (user as UserSummary & { campus?: string }).campus ? (
                <Text style={styles.display}>{(user as UserSummary & { campus?: string }).campus}</Text>
              ) : null}
              {shownFields.correction_points && (user as UserSummary & { correction_points?: number }).correction_points !== undefined ? (
                <Text style={styles.display}>
                  Correction points: {(user as UserSummary & { correction_points?: number }).correction_points}
                </Text>
              ) : null}
              {shownFields.wallets && (user as UserSummary & { wallets?: number }).wallets !== undefined ? (
                <Text style={styles.display}>
                  Wallets: {(user as UserSummary & { wallets?: number }).wallets}
                </Text>
              ) : null}
              {shownFields.weekly_logtime && (user as UserSummary & { weekly_logtime?: number }).weekly_logtime !== undefined ? (
                <Text style={styles.display}>
                  Weekly logtime: {(user as UserSummary & { weekly_logtime?: number }).weekly_logtime} min
                </Text>
              ) : null}
              {shownFields.coalition_name && (user as UserSummary & { coalition_name?: string }).coalition_name ? (
                <Text style={styles.display}>
                  Coalition: {(user as UserSummary & { coalition_name?: string }).coalition_name}
                </Text>
              ) : null}
              {shownFields.blackholed_at && (user as UserSummary & { blackholed_at?: string }).blackholed_at ? (
                <Text style={styles.display}>
                  Blackhole: {(user as UserSummary & { blackholed_at?: string }).blackholed_at}
                </Text>
              ) : null}
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
          <TouchableOpacity
            key={`${entry.login}-${index}`}
            style={styles.card}
            onPress={() => navigation.navigate('Search', { initialLogin: entry.login })}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
            )}
            <View>
              <Text style={styles.login}>{entry.login}</Text>
              {shownFields.displayname ? (
                <Text style={styles.display}>{entry.displayname ?? 'Unknown'}</Text>
              ) : null}
            </View>
            <View style={styles.levelBlock}>
              <Text style={styles.levelLabel}>Level</Text>
              <Text style={styles.level}>
                {typeof entry.level === 'number' ? entry.level.toFixed(2) : '--'}
              </Text>
            </View>
          </TouchableOpacity>
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
      <Modal transparent visible={showCampusMenu} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCampusMenu(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose campus</Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  campusId === ALL_CAMPUSES && styles.modalItemActive,
                ]}
                onPress={() => {
                  setCampusId(ALL_CAMPUSES);
                  setPage(1);
                  setShowCampusMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    campusId === ALL_CAMPUSES && styles.modalItemTextActive,
                  ]}
                >
                  All campuses
                </Text>
              </TouchableOpacity>
              {campuses.map((campus) => {
                const isActive = campus.id === campusId;
                return (
                  <TouchableOpacity
                    key={campus.id}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setCampusId(campus.id);
                      setPage(1);
                      setShowCampusMenu(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {campus.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal transparent visible={showSortMenu} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSortMenu(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort order</Text>
            <View>
              {([
                { label: 'Descending', value: 'desc' as SortOrder },
                { label: 'Ascending', value: 'asc' as SortOrder },
              ]).map((option) => {
                const isActive = option.value === sortOrder;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setSortOrder(option.value);
                      setShowSortMenu(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal transparent visible={showPromoMenu} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowPromoMenu(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose promo</Text>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={[styles.modalItem, promo === '' && styles.modalItemActive]}
                onPress={() => {
                  setPromo('');
                  setShowPromoMenu(false);
                }}
              >
                <Text style={[styles.modalItemText, promo === '' && styles.modalItemTextActive]}>
                  Any promo
                </Text>
              </TouchableOpacity>
              {promos.map((value) => {
                const isActive = value === promo;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setPromo(value);
                      setShowPromoMenu(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal transparent visible={showSortFieldMenu} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSortFieldMenu(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sort by</Text>
            <ScrollView style={styles.modalList}>
              {SORT_FIELDS.map((field) => {
                const isActive = field.id === sortField;
                return (
                  <TouchableOpacity
                    key={field.id}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setSortField(field.id);
                      setShowSortFieldMenu(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {field.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal transparent visible={showFieldsMenu} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowFieldsMenu(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Fields to show</Text>
            <ScrollView style={styles.modalList}>
              {FIELD_LABELS.map((field) => {
                const isActive = shownFields[field.id];
                return (
                  <TouchableOpacity
                    key={field.id}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setShownFields((prev) => ({ ...prev, [field.id]: !prev[field.id] }));
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {field.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={styles.compareButton}
              onPress={() => setShowFieldsMenu(false)}
            >
              <Text style={styles.compareButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}
