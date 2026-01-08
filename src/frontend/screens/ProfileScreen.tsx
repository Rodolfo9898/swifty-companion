import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../AppRoot';
import { fetchUserProfile } from '../../backend/api/fortyTwoApi';
import type { FortyTwoCursusUser, FortyTwoProjectUser, FortyTwoUser } from '../types/fortyTwo';
import ProgressBar from '../components/ProgressBar';
import SectionHeader from '../components/SectionHeader';
import createProfileStyles from '../styles/profileStyles';
import { useTheme } from '../ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

type ProjectFilter = 'all' | '42cursus' | 'piscine';

function getPrimaryCursus(cursusUsers: FortyTwoCursusUser[]): FortyTwoCursusUser | null {
  if (!cursusUsers || cursusUsers.length === 0) return null;
  return cursusUsers.reduce((best, current) => (current.level > best.level ? current : best));
}

function getProjectStatusLabel(project: FortyTwoProjectUser) {
  const validated = project.validated ?? project['validated?'];
  if (validated === true) return 'Passed';
  if (validated === false) return 'Failed';
  if (project.final_mark !== null) return project.final_mark >= 50 ? 'Passed' : 'Failed';
  return project.status;
}

function mapCursusById(cursusUsers: FortyTwoCursusUser[]) {
  const map = new Map<number, FortyTwoCursusUser>();
  cursusUsers.forEach((entry) => {
    if (entry?.cursus?.id) {
      map.set(entry.cursus.id, entry);
    }
  });
  return map;
}

function categorizeProject(
  project: FortyTwoProjectUser,
  cursusMap: Map<number, FortyTwoCursusUser>
): ProjectFilter {
  const slug = project.project.slug.toLowerCase();
  const name = project.project.name.toLowerCase();
  const hasPiscineName = slug.includes('piscine') || name.includes('piscine');

  if (project.cursus_ids && project.cursus_ids.length > 0) {
    for (const cursusId of project.cursus_ids) {
      const cursus = cursusMap.get(cursusId);
      const cursusName = cursus?.cursus?.name?.toLowerCase() ?? '';
      const cursusSlug = cursus?.cursus?.slug?.toLowerCase() ?? '';
      const combined = `${cursusName} ${cursusSlug}`;
      if (combined.includes('piscine')) return 'piscine';
      if (combined.includes('42cursus')) return '42cursus';
    }
  }

  if (hasPiscineName) return 'piscine';
  if (slug.includes('42cursus')) return '42cursus';
  return 'all';
}

export default function ProfileScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const { login, initialProfile } = route.params;
  const [profile, setProfile] = useState<FortyTwoUser | null>(initialProfile ?? null);
  const [loading, setLoading] = useState(!initialProfile);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all');
  const [selectedCursusId, setSelectedCursusId] = useState<number | null>(null);
  const [showCursusMenu, setShowCursusMenu] = useState(false);

  const loadProfile = async () => {
    setError(null);
    try {
      const data = await fetchUserProfile(login);
      setProfile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load profile.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialProfile) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login]);

  const cursusOptions = useMemo(() => {
    const seen = new Set<number | string>();
    const options: FortyTwoCursusUser[] = [];
    (profile?.cursus_users ?? []).forEach((entry) => {
      const id = entry.cursus?.id;
      const name = entry.cursus?.name ?? '';
      const key = id ?? name;
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push(entry);
    });
    return options;
  }, [profile]);

  useEffect(() => {
    if (!cursusOptions.length) return;
    if (selectedCursusId) return;
    const fortyTwo = cursusOptions.find((entry) => {
      const slug = entry.cursus?.slug?.toLowerCase() ?? '';
      const name = entry.cursus?.name?.toLowerCase() ?? '';
      return slug.includes('42cursus') || name.includes('42cursus');
    });
    if (fortyTwo?.cursus?.id) {
      setSelectedCursusId(fortyTwo.cursus.id);
      return;
    }
    const first = cursusOptions[0]?.cursus?.id;
    if (first) {
      setSelectedCursusId(first);
    }
  }, [cursusOptions, selectedCursusId]);

  const primaryCursus = useMemo(() => getPrimaryCursus(profile?.cursus_users ?? []), [profile]);
  const selectedCursus = useMemo(() => {
    if (!selectedCursusId) return primaryCursus;
    return (profile?.cursus_users ?? []).find((entry) => entry.cursus?.id === selectedCursusId) ?? primaryCursus;
  }, [profile, primaryCursus, selectedCursusId]);
  const skills = selectedCursus?.skills ?? [];
  const projects = useMemo(() => {
    const cursusMap = mapCursusById(profile?.cursus_users ?? []);
    return (profile?.projects_users ?? [])
      .filter((project) => project.status === 'finished' || project.final_mark !== null)
      .filter((project) => {
        if (!selectedCursusId) return true;
        if (project.cursus_ids && project.cursus_ids.length > 0) {
          return project.cursus_ids.includes(selectedCursusId);
        }
        return true;
      })
      .filter((project) => {
        if (projectFilter === 'all') return true;
        return categorizeProject(project, cursusMap) === projectFilter;
      })
      .sort((a, b) => (b.final_mark ?? 0) - (a.final_mark ?? 0));
  }, [profile, projectFilter, selectedCursusId]);

  const achievements = useMemo(() => {
    const items = profile?.achievements ?? [];
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [profile]);

  const titleDisplay = useMemo(() => {
    if (!profile?.title) return null;
    return profile.title.replace(/%login/g, profile.login);
  }, [profile]);


  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error ?? 'No profile data available.'}</Text>
      </View>
    );
  }

  const avatar = profile.image?.versions?.large || profile.image?.link;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        loadProfile();
      }} />}
    >
      <View style={styles.logoWrap}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} />
      </View>
      <View style={styles.headerCard}>
        {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : null}
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile.displayname}</Text>
          <Text style={styles.login}>Login: {profile.login}</Text>
          {titleDisplay ? <Text style={styles.detail}>Title: {titleDisplay}</Text> : null}
          <Text style={styles.detail}>{profile.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader label="Core details" icon={require('../../../assets/core.png')} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{profile.phone || 'Not shared'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{profile.location || 'Unavailable'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Wallet</Text>
          <Text style={styles.detailValue}>{profile.wallet}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Correction points</Text>
          <Text style={styles.detailValue}>{profile.correction_point}</Text>
        </View>
         <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Level</Text>
          <Text style={styles.detailValue}>{selectedCursus ? selectedCursus.level.toFixed(2) : 'N/A'}</Text>
        </View>
        <View style={styles.selectRow}>
          <Text style={styles.selectLabel}>Cursus</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowCursusMenu(true)}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {selectedCursus?.cursus?.name || 'Select cursus'}
            </Text>
            <Text style={styles.dropdownIcon}>▾</Text>
          </TouchableOpacity>
        </View>
       
      </View>
      <Modal transparent visible={showCursusMenu} animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCursusMenu(false)}
        >
          <View style={styles.modalCard}>
            <ScrollView style={styles.modalList}>
              {cursusOptions.map((entry) => {
                const id = entry.cursus?.id ?? null;
                const isActive = id === selectedCursus?.cursus?.id;
                return (
                  <TouchableOpacity
                    key={entry.cursus?.id ?? entry.cursus?.name}
                    style={[styles.modalItem, isActive && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedCursusId(id);
                      setShowCursusMenu(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                      {entry.cursus?.name ?? 'Unknown cursus'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.section}>
        <SectionHeader label="Skills" icon={require('../../../assets/skills.png')} />
        {skills.length === 0 ? (
          <Text style={styles.emptyText}>No skills available.</Text>
        ) : (
          skills.map((skill) => {
            const percentage = Math.round((skill.level % 1) * 100);
            return (
              <View key={skill.id} style={styles.skillCard}>
                <View style={styles.skillHeader}>
                  <Text style={styles.skillName}>{skill.name}</Text>
                  <Text style={styles.skillLevel}>{skill.level.toFixed(2)}</Text>
                </View>
                <ProgressBar value={percentage / 100} />
                <Text style={styles.skillPercent}>{percentage}%</Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader label="Completed projects" icon={require('../../../assets/project.png')} />
        <View style={styles.filterRow}>
          {([
            ['all', 'All'],
            ['42cursus', '42cursus'],
            ['piscine', 'Piscine'],
          ] as const).map(([value, label]) => {
            const isActive = projectFilter === value;
            return (
              <TouchableOpacity
                key={value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setProjectFilter(value)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {projects.length === 0 ? (
          <Text style={styles.emptyText}>No completed projects found.</Text>
        ) : (
          projects.map((project) => (
            <View key={`${project.project.id}-${project.occurrence}`} style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.project.name}</Text>
                <Text style={styles.projectMark}>{project.final_mark ?? 'N/A'}</Text>
              </View>
              <Text style={styles.projectStatus}>{getProjectStatusLabel(project)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader label="Achievements" icon={require('../../../assets/achievements.png')} />
        {achievements.length > 0 ? (
          achievements.map((achievement) => (
            <View key={achievement.id} style={styles.achievementCard}>
              <Text style={styles.achievementTitle}>{achievement.name}</Text>
              {achievement.description ? (
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No achievements available.</Text>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}
