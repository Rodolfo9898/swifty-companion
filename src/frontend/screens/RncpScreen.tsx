import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  fetchMeProfile,
  fetchProjectByName,
  fetchProjectBySlug,
  fetchProjectTags,
  fetchUserEvents,
} from '../../backend/api/fortyTwoApi';
import ProgressBar from '../components/ProgressBar';
import type { FortyTwoUser } from '../types/fortyTwo';
import createRncpStyles from '../styles/rncpStyles';
import { buildRncpProgress, normalizeProjectKey } from '../utils/rncpProgress';
import {
  isCacheFresh,
  readEventsCache,
  readGroupCache,
  readCacheMeta,
  writeCacheMeta,
  writeEventsCache,
  writeGroupCache,
} from '../utils/appCache';
import { buildCatalogTracks, getRncpCatalog } from '../utils/rncpCatalog';
import { useTheme } from '../ThemeContext';

const GROUP_TAG = 'group';
const projectCache = new Map<string, { id: number; difficulty: number }>();
const tagCache = new Map<number, string[]>();
const GROUP_CACHE_KEY = 'rncp-group-count';
const EVENT_CACHE_KEY = 'rncp-event-count';
const STATIC_EVENT_DATA: Record<string, { events: string[] }> = {
  'rperez-t': require('../data/events_rperezt.json'),
};
const STATIC_GROUP_DATA: Record<string, { projects: { id: number }[] }> = {
  'rperez-t': require('../data/group_projects_done.json'),
};

export default function RncpScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createRncpStyles(colors), [colors]);
  const [profile, setProfile] = useState<FortyTwoUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<6 | 7>(6);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [eventCount, setEventCount] = useState(0);
  const [completedExperiences, setCompletedExperiences] = useState<string[]>([]);
  const [groupProjectCount, setGroupProjectCount] = useState(0);
  const [loadedProfile, setLoadedProfile] = useState(false);
  const [loadedEvents, setLoadedEvents] = useState(false);
  const [loadedGroupProjects, setLoadedGroupProjects] = useState(false);
  const [loadedCache, setLoadedCache] = useState(false);

  const loadProfile = useCallback(async () => {
    if (loadedProfile) return;
    setError(null);
    setLoading(true);
    try {
      const data = await fetchMeProfile();
      setProfile(data);
      setLoadedProfile(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load RNCP progress.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loadedProfile]);

  useEffect(() => {
    const loadCache = async () => {
      try {
        const cachedGroup = await SecureStore.getItemAsync(GROUP_CACHE_KEY);
        if (cachedGroup) {
          setGroupProjectCount(Number(cachedGroup));
        }
        const cachedEvents = await SecureStore.getItemAsync(EVENT_CACHE_KEY);
        if (cachedEvents) {
          setEventCount(Number(cachedEvents));
        }
      } catch {
        // ignore cache errors
      } finally {
        setLoadedCache(true);
      }
    };
    loadCache();
  }, []);

  useEffect(() => {
    if (!loadedCache) return;
    loadProfile();
  }, [loadProfile, loadedCache]);

  const { projectsById, experienceProjectIds } = useMemo(() => getRncpCatalog(), []);
  const catalogTracks = useMemo(() => buildCatalogTracks(), []);
  const normalizeLabel = useCallback(
    (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
    [],
  );
  const getDefaultTrackId = useCallback(
    (level: 6 | 7) => {
      const tracks = catalogTracks.filter((item) => item.level === level);
      if (level === 6) {
        const preferred = tracks.find((item) => {
          const label = normalizeLabel(item.title);
          return label.includes('web') && label.includes('mobile');
        });
        if (preferred) return preferred.id;
      }
      return tracks[0]?.id ?? '';
    },
    [catalogTracks, normalizeLabel],
  );
  const progress = useMemo(
    () => buildRncpProgress(profile, catalogTracks, projectsById),
    [profile, catalogTracks, projectsById],
  );
  const filteredTracks = progress.filter((item) => item.track.level === selectedLevel);
  const selected =
    filteredTracks.find((item) => item.track.id === selectedTrackId) ?? filteredTracks[0];
  const ratio = (current: number, target: number) => {
    if (!target) return 0;
    return current / target;
  };
  const formatXp = (xp: number) => (xp > 0 ? `${xp}` : 'N/A');
  const checkIcon = require('../../../assets/check.png');

  useEffect(() => {
    if (!profile || loadedEvents) return;
    let active = true;

    const loadEvents = async () => {
      try {
        const staticEvents = STATIC_EVENT_DATA[profile.login];
        if (staticEvents?.events?.length) {
          if (active) {
            setEventCount(staticEvents.events.length);
            setLoadedEvents(true);
            await SecureStore.setItemAsync(EVENT_CACHE_KEY, String(staticEvents.events.length));
            await writeEventsCache({ count: staticEvents.events.length, names: staticEvents.events });
            const meta = await readCacheMeta();
            await writeCacheMeta({ ...meta, eventsUpdatedAt: Date.now() });
          }
          return;
        }
        const fresh = await isCacheFresh('events');
        if (fresh) {
          const cached = await readEventsCache<{ count: number }>();
          if (cached && active) {
            setEventCount(cached.count);
            setLoadedEvents(true);
            return;
          }
        }
        const perPage = 100;
        const names: string[] = [];
        let page = 1;
        while (page <= 10) {
          const data = await fetchUserEvents(profile.id, page, perPage);
          if (data.length === 0) break;
          data.forEach((item) => {
            const kind = item.event?.kind?.toLowerCase() ?? '';
            if (kind.includes('extern') || kind.includes('association')) {
              return;
            }
            if (item.event?.name) {
              names.push(item.event.name);
            }
          });
          if (data.length < perPage) break;
          page += 1;
        }
        if (active) {
          setEventCount(names.length);
          setLoadedEvents(true);
          await SecureStore.setItemAsync(EVENT_CACHE_KEY, String(names.length));
          await writeEventsCache({ count: names.length, names });
          const meta = await readCacheMeta();
          await writeCacheMeta({ ...meta, eventsUpdatedAt: Date.now() });
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Unable to load events.';
          setError(message);
        }
      }
    };

    const loadExperiences = () => {
      const normalizedProjects = new Map<number, { validated: boolean }>();
      (profile.projects_users ?? []).forEach((project) => {
        const validated =
          project.validated ??
          project['validated?'] ??
          (project.final_mark !== null ? project.final_mark >= 50 : project.status === 'finished');
        normalizedProjects.set(project.project.id, { validated: Boolean(validated) });
      });

      const completed = experienceProjectIds
        .map((id) => projectsById.get(id))
        .filter((project) => project && normalizedProjects.get(project.id)?.validated)
        .map((project) => project!.name);
      if (active) {
        setCompletedExperiences(completed);
      }
    };

    loadEvents();
    loadExperiences();

    return () => {
      active = false;
    };
  }, [profile, loadedEvents]);

  useEffect(() => {
    if (!selectedTrackId) {
      setSelectedTrackId(getDefaultTrackId(selectedLevel));
    }
  }, [getDefaultTrackId, selectedLevel, selectedTrackId]);

  useEffect(() => {
    if (!profile || loadedGroupProjects) return;
    let active = true;

    const loadGroupProjects = async () => {
      try {
        const staticGroups = STATIC_GROUP_DATA[profile.login];
        if (staticGroups?.projects?.length) {
          const count = staticGroups.projects.length;
          if (active) {
            setGroupProjectCount(count);
            setLoadedGroupProjects(true);
            await SecureStore.setItemAsync(GROUP_CACHE_KEY, String(count));
            await writeGroupCache({ count, projects: staticGroups.projects });
            const meta = await readCacheMeta();
            await writeCacheMeta({ ...meta, groupUpdatedAt: Date.now() });
          }
          return;
        }
        const fresh = await isCacheFresh('group');
        if (fresh) {
          const cached = await readGroupCache<{ count: number }>();
          if (cached && active) {
            setGroupProjectCount(cached.count);
            setLoadedGroupProjects(true);
            return;
          }
        }
        const uniqueProjects = new Map<string, { slug: string; name: string; validated: boolean }>();
        (profile.projects_users ?? []).forEach((project) => {
          const slugKey = normalizeProjectKey(project.project.slug);
          const nameKey = normalizeProjectKey(project.project.name);
          const validated =
            project.validated ??
            project['validated?'] ??
            (project.final_mark !== null ? project.final_mark >= 50 : project.status === 'finished');
          const existingSlug = uniqueProjects.get(slugKey);
          if (!existingSlug || (validated && !existingSlug.validated)) {
            uniqueProjects.set(slugKey, { slug: project.project.slug, name: project.project.name, validated: Boolean(validated) });
          }
          const existingName = uniqueProjects.get(nameKey);
          if (!existingName || (validated && !existingName.validated)) {
            uniqueProjects.set(nameKey, { slug: project.project.slug, name: project.project.name, validated: Boolean(validated) });
          }
        });

        let count = 0;
        for (const entry of uniqueProjects.values()) {
          if (!entry.validated) continue;
          const key = normalizeProjectKey(entry.slug);
          const cached = projectCache.get(key);
          let projectId = cached?.id;
          if (!projectId) {
            let info = await fetchProjectBySlug(entry.slug);
            if (!info) {
              info = await fetchProjectByName(entry.name);
            }
            if (!info?.id) continue;
            projectId = info.id;
            projectCache.set(key, { id: projectId, difficulty: info.difficulty ?? 0 });
          }
          const cachedTags = tagCache.get(projectId);
          if (cachedTags) {
            if (cachedTags.some((tag) => tag.toLowerCase().includes(GROUP_TAG))) {
              count += 1;
            }
            continue;
          }
          const tags = await fetchProjectTags(projectId);
          const tagNames = tags.map((tag) => tag.name);
          tagCache.set(projectId, tagNames);
          if (tagNames.some((tag) => tag.toLowerCase().includes(GROUP_TAG))) {
            count += 1;
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
        if (active) {
          setGroupProjectCount(count);
          setLoadedGroupProjects(true);
          await SecureStore.setItemAsync(GROUP_CACHE_KEY, String(count));
          await writeGroupCache({ count, projects: Array.from(uniqueProjects.values()) });
          const meta = await readCacheMeta();
          await writeCacheMeta({ ...meta, groupUpdatedAt: Date.now() });
        }
      } catch (err) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Unable to load group projects.';
          setError(message);
        }
      }
    };

    loadGroupProjects();

    return () => {
      active = false;
    };
  }, [profile, loadedGroupProjects]);

  // Project XP is loaded from local dataset.

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>RNCP</Text>
        <Text style={styles.subtitle}>Track your RNCP progress.</Text>
      </View>

      <View style={styles.tabRow}>
        {[6, 7].map((level) => {
          const isActive = selectedLevel === level;
          return (
            <TouchableOpacity
              key={`rncp-${level}`}
              style={[styles.tab, styles.levelTab, isActive && styles.tabActive]}
              onPress={() => {
                setSelectedLevel(level as 6 | 7);
                setSelectedTrackId(getDefaultTrackId(level as 6 | 7));
              }}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                RNCP {level}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tabRow}>
        {filteredTracks.map((item) => {
          const isActive = item.track.id === selectedTrackId;
          return (
            <TouchableOpacity
              key={item.track.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setSelectedTrackId(item.track.id)}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {item.track.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected ? (
        <>
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.tabTitle}>{selected.track.title}</Text>
            </View>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Level required</Text>
              <ProgressBar value={ratio(selected.level, selected.track.requirements.level)} />
              <Text style={styles.progressHint}>
                {selected.level.toFixed(2)} / {selected.track.requirements.level}
              </Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Events required</Text>
              <ProgressBar value={ratio(eventCount, selected.track.requirements.events)} />
              <Text style={styles.progressHint}>
                {eventCount} / {selected.track.requirements.events}
              </Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Professional experiences</Text>
              <ProgressBar value={ratio(completedExperiences.length, selected.track.requirements.experiences)} />
              <Text style={styles.progressHint}>
                {completedExperiences.length} / {selected.track.requirements.experiences}
              </Text>
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Group projects</Text>
              <ProgressBar value={ratio(groupProjectCount, selected.track.requirements.groupProjects)} />
              <Text style={styles.progressHint}>
                {groupProjectCount} / {selected.track.requirements.groupProjects}
              </Text>
            </View>
          </View>

          {selected.sections.map((section) => (
            <View key={section.section.title} style={styles.card}>
              <Text style={styles.sectionTitle}>
                {section.section.title}
              </Text>
              <Text style={styles.progressHint}>
                I must have validated a number of projects greater than or equal to {section.section.requiredProjects}.
              </Text>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Projects</Text>
                <ProgressBar value={ratio(section.completedProjects, section.section.requiredProjects)} />
                <Text style={styles.progressHint}>
                  {section.completedProjects} / {section.section.requiredProjects}
                </Text>
              </View>
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Experience</Text>
                {section.section.requiredXp > 0 ? (
                  <>
                    <ProgressBar value={ratio(section.earnedXp, section.section.requiredXp)} />
                    <Text style={styles.progressHint}>
                      {section.earnedXp} XP / {section.section.requiredXp} XP
                    </Text>
                  </>
                ) : (
                  <Text style={styles.progressHint}>No XP requirement.</Text>
                )}
              </View>
              <Text style={styles.listTitle}>List of validated projects:</Text>
              {section.projects.filter((project) => project.validated).length === 0 ? (
                <Text style={styles.projectStatus}>None yet</Text>
              ) : (
                section.projects
                  .filter((project) => project.validated)
                  .map((project) => (
                    <View key={project.project.slug} style={styles.projectRow}>
                      <Image source={checkIcon} style={styles.checkIcon} />
                      <View style={styles.projectInfo}>
                        <Text style={styles.projectActive}>{project.project.name}</Text>
                        <Text style={styles.projectMeta}>
                          Score {project.finalMark ?? 'N/A'} | XP {formatXp(project.project.experience)}
                        </Text>
                      </View>
                    </View>
                  ))
              )}

              <Text style={styles.listTitle}>List of unvalidated projects:</Text>
              {section.projects.filter((project) => !project.validated).length === 0 ? (
                <Text style={styles.projectStatus}>None</Text>
              ) : (
                section.projects
                  .filter((project) => !project.validated)
                  .map((project) => (
                    <View key={project.project.slug} style={styles.projectRow}>
                      <View style={styles.checkSpacer} />
                      <View style={styles.projectInfo}>
                        <Text style={styles.project}>{project.project.name}</Text>
                        <Text style={styles.projectMeta}>
                          Score {project.finalMark ?? 'N/A'} | XP {formatXp(project.project.experience)}
                        </Text>
                      </View>
                    </View>
                  ))
              )}
            </View>
          ))}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}
