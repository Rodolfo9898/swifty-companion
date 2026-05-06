import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Campus,
  UserSummary,
  fetchCampuses,
  fetchCampusUsers,
  fetchUsers,
  fetchUserProfile,
} from '../../backend/ft/repo';
import {
  leaderboardRepo,
} from '../../backend/leaderboard/repo';
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
const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 75, 100];
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
  { id: 'correction_points', label: 'Correction points' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'campus_name', label: 'Campus' },
];

const FIELD_LABELS: Array<{ id: SortField; label: string }> = [
  { id: 'displayname', label: 'Display name' },
  { id: 'level', label: 'Level' },
  { id: 'correction_points', label: 'Correction points' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'campus_name', label: 'Campus' },
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
  campus?: string;
  correction_points?: number | null;
  wallets?: number | null;
  weekly_logtime?: number | null;
  coalition_name?: string | null;
  blackholed_at?: string | null;
  badge?: string | null;
  badges?: string[] | null;
  alumni?: boolean | null;
  is_alumni?: boolean | null;
};

type BadgeCarrier = {
  badge?: string | null;
  badges?: string[] | string | null;
  alumni?: boolean | null;
  is_alumni?: boolean | null;
  blackholed_at?: string | null;
};

const getBadgeTokens = (entry: BadgeCarrier) => {
  const rawBadges = typeof entry.badges === 'string'
    ? entry.badges.split(',')
    : Array.isArray(entry.badges)
      ? entry.badges
      : [];
  return [
    ...rawBadges,
    entry.badge,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).toLowerCase().split(/[^a-z0-9_-]+/))
    .filter(Boolean);
};

const hasAlumniBadge = (entry: BadgeCarrier) => {
  if (entry.alumni || entry.is_alumni) return true;
  return getBadgeTokens(entry).includes('alumni');
};

const hasBlackholedBadge = (entry: BadgeCarrier) => {
  if (entry.blackholed_at) return true;
  return getBadgeTokens(entry).includes('blackholed');
};

const EMPTY_BADGE_LOGINS = {
  alumni: new Set<string>(),
  blackholed: new Set<string>(),
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

const getPrimaryCampusId = (user?: UserSummary | null) => {
  const campusUsers = user?.campus_users ?? [];
  if (!campusUsers.length) return null;
  const primary = campusUsers.find((entry) => entry.is_primary);
  return (primary?.campus?.id ?? campusUsers[0]?.campus?.id) ?? null;
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
  const [showPageMenu, setShowPageMenu] = useState(false);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const [promos, setPromos] = useState<string[]>([]);
  const [promo, setPromo] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [highlightLogin, setHighlightLogin] = useState<string | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  const [badgeLogins, setBadgeLogins] = useState(EMPTY_BADGE_LOGINS);
  const [sortField, setSortField] = useState<SortField>('level');
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
  const useBackend = leaderboardRepo.isEnabled();
  const scrollRef = useRef<ScrollView | null>(null);
  const rowYByLoginRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const loadCampuses = async () => {
      try {
        const allCampuses: Campus[] = useBackend
          ? await leaderboardRepo.fetchCampuses()
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
        setCampuses(sorted);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load campuses.';
        setError(message);
      }
    };
    loadCampuses();
  }, [currentUser, useBackend, campusId]);

  const loadUsers = async (
    targetCampusId: number,
    targetPage: number,
    meLogin?: string,
    searchOverride?: string,
  ): Promise<{ users: UserSummary[]; total: number; page: number } | null> => {
    setError(null);
    try {
      if (useBackend) {
        const response = await leaderboardRepo.fetchPage({
          campusId: targetCampusId === ALL_CAMPUSES ? undefined : targetCampusId,
          promo: promo || undefined,
          search: (searchOverride ?? appliedSearch) || undefined,
          sortField,
          page: targetPage,
          perPage: pageSize,
          sort: sortOrder,
          meLogin,
        });
        setPage(response.page ?? targetPage);
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
          badge: entry.badge ?? undefined,
          badges: entry.badges ?? undefined,
          alumni: entry.alumni ?? undefined,
          is_alumni: entry.is_alumni ?? undefined,
          cursus_users: [
            {
              level: entry.level ?? 0,
              cursus: { id: 21, slug: '42cursus', name: '42cursus' },
            },
          ],
        })) as UserSummary[];
        setUsers(mapped);
        const totalCount = response.total ?? 0;
        setTotal(totalCount);
        return { users: mapped, total: totalCount, page: response.page ?? targetPage };
      }
      const cacheKey = `${targetCampusId}:${targetPage}`;
      const cache = await readLeaderboardCache<{
        [key: string]: { updatedAt: number; users: UserSummary[]; total: number };
      }>();
      const cachedEntry = cache[cacheKey];
      if (cachedEntry && Date.now() - cachedEntry.updatedAt < DAY_MS) {
        setUsers(cachedEntry.users);
        setTotal(cachedEntry.total);
        setPage(targetPage);
        return { users: cachedEntry.users, total: cachedEntry.total, page: targetPage };
      }
      const request = targetCampusId === ALL_CAMPUSES
        ? fetchUsers(targetPage, pageSize)
        : fetchCampusUsers(targetCampusId, targetPage, pageSize);
      const result = await request;
      const enriched = await enrichUsers(result.data);
      setUsers(enriched);
      setTotal(result.total ?? 0);
      setPage(targetPage);
      const nextCache = {
        ...cache,
        [cacheKey]: {
          updatedAt: Date.now(),
          users: enriched,
          total: result.total ?? 0,
        },
      };
      await writeLeaderboardCache(nextCache);
      return { users: enriched, total: result.total ?? 0, page: targetPage };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load users.';
      setError(message);
      return null;
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
    if (appliedCampusId === null || isJumping) return;
    loadUsers(appliedCampusId, page);
  }, [appliedCampusId, page, appliedSearch, sortField, sortOrder, promo, pageSize, isJumping]);

  const handleJumpToMe = async () => {
    if (!currentUser?.login || isJumping) return;
    if (users.some((user) => user.login === currentUser.login)) {
      setHighlightLogin(currentUser.login);
      return;
    }
    setIsJumping(true);
    setPage(1);
    setActiveTab('compare');
    setSearchText('');
    setAppliedCampusId(campusId);
    setAppliedSearch('');
    setHighlightLogin(currentUser.login);
    try {
      const first = await loadUsers(campusId, 1, currentUser.login, '');
      const hasUser = first?.users.some((user) => user.login === currentUser.login);
      if (hasUser) return;
      const maxPages = first?.total ? Math.max(1, Math.ceil(first.total / pageSize)) : 200;
      for (let pageIndex = 2; pageIndex <= maxPages; pageIndex += 1) {
        const pageResult = await loadUsers(campusId, pageIndex, undefined, '');
        if (pageResult?.users.some((user) => user.login === currentUser.login)) {
          return;
        }
      }
      setError('Unable to find your ranking.');
    } finally {
      setIsJumping(false);
    }
  };

  useEffect(() => {
    setUsers([]);
    setTotal(0);
  }, [campusId]);

  useEffect(() => {
    setPage(1);
    setAppliedCampusId(campusId);
    setAppliedSearch(searchText.trim());
    setHighlightLogin(null);
  }, [campusId, searchText, promo, sortField, sortOrder, pageSize]);

  useEffect(() => {
    if (!useBackend) {
      setBadgeLogins(EMPTY_BADGE_LOGINS);
      return;
    }
    let cancelled = false;
    const loadBadgeLogins = async () => {
      try {
        const baseParams = {
          campusId: campusId === ALL_CAMPUSES ? undefined : campusId,
          promo: activeTab === 'compare' ? promo || undefined : undefined,
          search: activeTab === 'compare' ? appliedSearch || undefined : undefined,
          sortField: 'login',
          sort: 'asc' as const,
          perPage: 100,
        };
        const fetchLogins = async (badge: 'alumni' | 'blackholed') => {
          const logins = new Set<string>();
          let pageIndex = 1;
          let totalPagesForBadge = 1;
          while (pageIndex <= totalPagesForBadge && pageIndex <= 200) {
            const response = await leaderboardRepo.fetchPage({
              ...baseParams,
              badge,
              page: pageIndex,
            });
            response.data.forEach((entry) => logins.add(entry.login));
            totalPagesForBadge = response.total
              ? Math.max(1, Math.ceil(response.total / (response.perPage || 100)))
              : pageIndex;
            if (!response.data.length) break;
            pageIndex += 1;
          }
          return logins;
        };
        const [alumni, blackholed] = await Promise.all([
          fetchLogins('alumni'),
          fetchLogins('blackholed'),
        ]);
        if (!cancelled) {
          setBadgeLogins({ alumni, blackholed });
        }
      } catch {
        if (!cancelled) {
          setBadgeLogins(EMPTY_BADGE_LOGINS);
        }
      }
    };
    loadBadgeLogins();
    return () => {
      cancelled = true;
    };
  }, [activeTab, appliedSearch, campusId, promo, useBackend]);

  useEffect(() => {
    if (!highlightLogin) return;
    if (!scrollRef.current) return;
    const tryScroll = () => {
      const y = rowYByLoginRef.current[highlightLogin];
      if (typeof y !== 'number') return;
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    };
    tryScroll();
    const timer = setTimeout(tryScroll, 50);
    return () => clearTimeout(timer);
  }, [highlightLogin, users, activeTab]);

  const totalPages = total ? Math.ceil(total / pageSize) : undefined;
  const pageLabel = `Page ${page}`;

  useEffect(() => {
    const loadRanking = async () => {
      if (useBackend) {
        try {
          const entries = await leaderboardRepo.fetchTop({
            campusId: campusId === ALL_CAMPUSES ? undefined : campusId,
            limit: 10,
            excludeLogin: 'latorche',
          });
          setRankingEntries(entries.map((entry) => ({
            login: entry.login,
            displayname: entry.displayname ?? undefined,
            image: entry.image ? { link: entry.image } : undefined,
            level: entry.level ?? null,
            campus: entry.campusName ?? undefined,
            correction_points: entry.correction_points ?? undefined,
            wallets: entry.wallets ?? undefined,
            weekly_logtime: entry.weekly_logtime ?? undefined,
            coalition_name: entry.coalition_name ?? undefined,
            blackholed_at: entry.blackholed_at ?? undefined,
            badge: entry.badge ?? undefined,
            badges: entry.badges ?? undefined,
            alumni: entry.alumni ?? undefined,
            is_alumni: entry.is_alumni ?? undefined,
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
  }, [campusId, useBackend]);

  useEffect(() => {
    if (!useBackend) return;
    const loadPromos = async () => {
      try {
        const list = await leaderboardRepo.fetchPromos({
          campusId: campusId === ALL_CAMPUSES ? undefined : campusId,
        });
        const normalized = list
          .map((value) => value.trim())
          .filter((value) => value.length > 0);
        const sorted = normalized.sort((a, b) => {
          const [am, ay] = a.split('/');
          const [bm, by] = b.split('/');
          const aYear = Number(ay) || 0;
          const bYear = Number(by) || 0;
          if (aYear !== bYear) return bYear - aYear;
          const aMonth = Number(am) || 0;
          const bMonth = Number(bm) || 0;
          return bMonth - aMonth;
        });
        setPromos(sorted);
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
        const result = await fetchCampusUsers(campusId, pageIndex, pageSize);
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
        if (result.data.length < pageSize) break;
        if (totalCount && pageIndex * pageSize >= totalCount) break;
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
  const formatTimestamp = (value: number) => {
    const date = new Date(value);
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  const rankingLabel = rankingUpdatedAt ? formatTimestamp(rankingUpdatedAt) : 'Not available';

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
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
              Leaderboard
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
        {useBackend ? (
          <>
            <View style={styles.inlineRow}>
              <View style={styles.inlineGroup}>
                <Text style={styles.label}>Campus</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, styles.dropdownButtonCompact]}
                  onPress={() => setShowCampusMenu(true)}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {campusId === ALL_CAMPUSES
                      ? 'All campuses'
                      : (campuses.find((campus) => campus.id === campusId)?.name ?? 'Select campus')}
                  </Text>
                  <Text style={styles.dropdownIcon}>▾</Text>
                </TouchableOpacity>
              </View>
              {activeTab === 'compare' ? (
                <View style={styles.inlineGroup}>
                  <Text style={styles.label}>Promo</Text>
                  <TouchableOpacity
                    style={[styles.dropdownButton, styles.dropdownButtonCompact]}
                    onPress={() => setShowPromoMenu(true)}
                  >
                    <Text style={styles.dropdownText} numberOfLines={1}>
                      {promo ? promo : 'Any promo'}
                    </Text>
                    <Text style={styles.dropdownIcon}>▾</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {activeTab === 'compare' ? (
              <>
                <Text style={styles.label}>Search</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search login, display name, title..."
                  placeholderTextColor={colors.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                <View style={styles.inlineRow}>
                  <View style={styles.inlineGroup}>
                    <Text style={styles.label}>Sort by</Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, styles.dropdownButtonCompact]}
                      onPress={() => setShowSortFieldMenu(true)}
                    >
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {SORT_FIELDS.find((field) => field.id === sortField)?.label ?? 'Level'}
                      </Text>
                      <Text style={styles.dropdownIcon}>▾</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inlineGroup}>
                    <Text style={styles.label}>Order</Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, styles.dropdownButtonCompact]}
                      onPress={() => setShowSortMenu(true)}
                    >
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                      </Text>
                      <Text style={styles.dropdownIcon}>▾</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inlineGroup}>
                    <Text style={styles.label}>People</Text>
                    <TouchableOpacity
                      style={[styles.dropdownButton, styles.dropdownButtonCompact]}
                      onPress={() => setShowPageSizeMenu(true)}
                    >
                      <Text style={styles.dropdownText} numberOfLines={1}>
                        {pageSize}
                      </Text>
                      <Text style={styles.dropdownIcon}>▾</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.inlineRow}>
                  {useBackend && currentUser?.login ? (
                    <TouchableOpacity
                      style={[styles.secondaryButton, styles.inlineButton, isJumping && styles.buttonDisabled]}
                      onPress={handleJumpToMe}
                      disabled={isJumping}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {isJumping ? 'Searching...' : 'Jump to me'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.inlineButton]}
                    onPress={() => setShowFieldsMenu(true)}
                  >
                    <Text style={styles.secondaryButtonText}>Show fields…</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.inlineRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.inlineButton]}
                  onPress={() => setShowFieldsMenu(true)}
                >
                  <Text style={styles.secondaryButtonText}>Show fields…</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
        {activeTab === 'compare' ? (
          <></>
        ) : (
          <>
            <View style={styles.rankingMeta}>
              <Text style={styles.hint}>Last updated: {rankingLabel}</Text>
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

      {activeTab === 'compare' ? sortedUsers.map((user, index) => {
        const avatar = user.image?.link;
        const level = getUserLevel(user);
        const rank = (page - 1) * pageSize + index + 1;
        return (
          <TouchableOpacity
            key={`${user.id}-${user.login}`}
            style={[
              styles.card,
              index === 0 && styles.firstCard,
              highlightLogin === user.login && styles.cardHighlighted,
            ]}
            onLayout={(event) => {
              rowYByLoginRef.current[user.login] = event.nativeEvent.layout.y;
            }}
            onPress={() =>
              navigation.navigate('Search', { initialLogin: user.login })
            }
          >
            <View style={styles.identityColumn}>
              <Text style={styles.rank}>{rank}</Text>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
              )}
            </View>
            <View style={styles.infoBlock}>
              <View style={styles.loginRow}>
                <Text style={styles.login}>{user.login}</Text>
                {hasAlumniBadge(user as UserSummary & BadgeCarrier) || badgeLogins.alumni.has(user.login) ? (
                  <View style={styles.alumniBadge}>
                    <Text style={styles.alumniBadgeText}>Alumni</Text>
                  </View>
                ) : null}
                {hasBlackholedBadge(user as UserSummary & BadgeCarrier) || badgeLogins.blackholed.has(user.login) ? (
                  <View style={styles.blackholedBadge}>
                    <Text style={styles.blackholedBadgeText}>Blackholed</Text>
                  </View>
                ) : null}
              </View>
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
        const rank = index + 1;
        return (
          <TouchableOpacity
            key={`${entry.login}-${index}`}
            style={[
              styles.card,
              index === 0 && styles.firstCard,
              highlightLogin === entry.login && styles.cardHighlighted,
            ]}
            onLayout={(event) => {
              rowYByLoginRef.current[entry.login] = event.nativeEvent.layout.y;
            }}
            onPress={() => navigation.navigate('Search', { initialLogin: entry.login })}
          >
            <View style={styles.identityColumn}>
              <Text style={styles.rank}>{rank}</Text>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <Image source={require('../../../assets/logo.png')} style={styles.avatar} />
              )}
            </View>
            <View style={styles.infoBlock}>
              <View style={styles.loginRow}>
                <Text style={styles.login}>{entry.login}</Text>
                {hasAlumniBadge(entry) || badgeLogins.alumni.has(entry.login) ? (
                  <View style={styles.alumniBadge}>
                    <Text style={styles.alumniBadgeText}>Alumni</Text>
                  </View>
                ) : null}
                {hasBlackholedBadge(entry) || badgeLogins.blackholed.has(entry.login) ? (
                  <View style={styles.blackholedBadge}>
                    <Text style={styles.blackholedBadgeText}>Blackholed</Text>
                  </View>
                ) : null}
              </View>
              {shownFields.displayname ? (
                <Text style={styles.display}>{entry.displayname ?? 'Unknown'}</Text>
              ) : null}
              {shownFields.campus_name && (entry as RankedEntry & { campus?: string }).campus ? (
                <Text style={styles.display}>{(entry as RankedEntry & { campus?: string }).campus}</Text>
              ) : null}
              {shownFields.correction_points && (entry as RankedEntry & { correction_points?: number }).correction_points !== undefined ? (
                <Text style={styles.display}>
                  Correction points: {(entry as RankedEntry & { correction_points?: number }).correction_points}
                </Text>
              ) : null}
              {shownFields.wallets && (entry as RankedEntry & { wallets?: number }).wallets !== undefined ? (
                <Text style={styles.display}>
                  Wallets: {(entry as RankedEntry & { wallets?: number }).wallets}
                </Text>
              ) : null}
              {shownFields.weekly_logtime && (entry as RankedEntry & { weekly_logtime?: number }).weekly_logtime !== undefined ? (
                <Text style={styles.display}>
                  Weekly logtime: {(entry as RankedEntry & { weekly_logtime?: number }).weekly_logtime} min
                </Text>
              ) : null}
              {shownFields.coalition_name && (entry as RankedEntry & { coalition_name?: string }).coalition_name ? (
                <Text style={styles.display}>
                  Coalition: {(entry as RankedEntry & { coalition_name?: string }).coalition_name}
                </Text>
              ) : null}
              {shownFields.blackholed_at && (entry as RankedEntry & { blackholed_at?: string }).blackholed_at ? (
                <Text style={styles.display}>
                  Blackhole: {(entry as RankedEntry & { blackholed_at?: string }).blackholed_at}
                </Text>
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
        <>
          <View style={styles.pagination}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSmall, page <= 1 && styles.buttonDisabled]}
              onPress={() => setPage(1)}
              disabled={page <= 1}
            >
              <Text style={styles.buttonText}>First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSmall, page <= 1 && styles.buttonDisabled]}
              onPress={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
            >
              <Text style={styles.buttonText}>Prev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSmall]}
              onPress={() => totalPages && setShowPageMenu(true)}
              disabled={!totalPages}
            >
              <Text style={styles.buttonText}>{pageLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSmall,
                totalPages && page >= totalPages && styles.buttonDisabled,
              ]}
              onPress={() => setPage((prev) => prev + 1)}
              disabled={totalPages ? page >= totalPages : false}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSmall,
                totalPages && page >= totalPages && styles.buttonDisabled,
              ]}
              onPress={() => totalPages && setPage(totalPages)}
              disabled={!totalPages || page >= totalPages}
            >
              <Text style={styles.buttonText}>Last</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal transparent visible={showCampusMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowCampusMenu(false)} />
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
        </View>
      </Modal>
      <Modal transparent visible={showSortMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSortMenu(false)} />
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
        </View>
      </Modal>
      <Modal transparent visible={showPromoMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowPromoMenu(false)} />
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
        </View>
      </Modal>
      <Modal transparent visible={showSortFieldMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSortFieldMenu(false)} />
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
        </View>
      </Modal>
      <Modal transparent visible={showPageSizeMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowPageSizeMenu(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>People per page</Text>
            <View>
              {PAGE_SIZE_OPTIONS.map((value) => {
                const isActive = value === pageSize;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setPageSize(value);
                      setPage(1);
                      setShowPageSizeMenu(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showFieldsMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowFieldsMenu(false)} />
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
        </View>
      </Modal>
      <Modal transparent visible={showPageMenu} animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowPageMenu(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Go to page</Text>
            <ScrollView style={styles.modalList}>
              {totalPages
                ? Array.from({ length: totalPages }, (_, idx) => idx + 1).map((value) => {
                    const isActive = value === page;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.modalItem, isActive && styles.modalItemActive]}
                        onPress={() => {
                          setPage(value);
                          setShowPageMenu(false);
                        }}
                      >
                        <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                          Page {value}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
