import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  fetchMeProfile,
  fetchProjectByName,
  fetchProjectBySlug,
  fetchProjectTags,
} from '../../backend/ft/repo';
import ProgressBar from '../components/ProgressBar';
import createPlannerStyles from '../styles/plannerStyles';
import {
  isCacheFresh,
  readCacheMeta,
  readEventsCache,
  readGroupCache,
  readPlannerCache,
  writeCacheMeta,
  writeGroupCache,
  writePlannerCache,
} from '../utils/appCache';
import { getRncpCatalog } from '../utils/rncpCatalog';
import { useTheme } from '../ThemeContext';
import type { FortyTwoProjectUser, FortyTwoUser } from '../types/fortyTwo';
import { normalizeProjectKey } from '../utils/projectKey';

type PlannerProject = {
  id: number;
  name: string;
  xp: number;
};

type PlannerBlock = {
  id: number;
  name: string;
  min_xp: number;
  min_projects: number;
  projects: PlannerProject[];
};

type PlannedProject = {
  grade: number;
  xp: number;
};

type Internship = {
  name: string;
  baseXP: number;
  grade: number;
  projectId: number;
};

const XP_REQUIRED = [
  0, 462, 2688, 5885, 11777, 29217, 46255, 63559, 74340, 85483, 95000, 105630,
  124446, 145782, 169932, 197316, 228354, 263508, 303366, 348516, 399672, 457632,
  523320, 597786, 682164, 777756, 886074, 1008798, 1147902, 1305486, 1484070,
];

const INTERNSHIPS: Internship[] = [
  { name: 'Work Experience I', baseXP: 42000, grade: 100, projectId: 1638 },
  { name: 'Work Experience II', baseXP: 63000, grade: 100, projectId: 1644 },
];

const PROJECT_DISPLAY_NAMES: Record<number, string> = {
  1481: '[DEPRECATED] Piscine PHP Symfony',
  1482: '[Deprecated] Piscine Ruby on Rails',
  1638: 'Work Experience I',
  1644: 'Work Experience II',
  1662: 'Startup Experience',
  1857: 'Apprenticeship I',
  1865: 'Apprentissage 2 ans - 2ème année',
  2189: '[DEPRECATED] Piscine Python Django',
  2228: '[DEPRECATED] Piscine OCaml',
};

const STATIC_EVENT_DATA: Record<string, { events: string[] }> = {
  'rperez-t': require('../data/events_rperezt.json'),
};
const STATIC_GROUP_DATA: Record<string, { projects: { id: number }[] }> = {
  'rperez-t': require('../data/group_projects_done.json'),
};
const GROUP_TAG = 'group';
const projectCache = new Map<string, { id: number; difficulty: number }>();
const tagCache = new Map<number, string[]>();

function getPrimaryLevel(levels: Array<{ level: number; cursus?: { id?: number; slug?: string; name?: string } }> | undefined) {
  if (!levels || levels.length === 0) return 0;
  const primary = levels.find((entry) => {
    if (entry.cursus?.id === 21) return true;
    const slug = entry.cursus?.slug?.toLowerCase() ?? '';
    const name = entry.cursus?.name?.toLowerCase() ?? '';
    return slug.includes('42cursus') || name.includes('42cursus');
  });
  return primary?.level ?? Math.max(...levels.map((entry) => entry.level));
}

function getCompletedProjectsMap(profile: FortyTwoUser | null) {
  const map = new Map<number, { finalMark: number }>();
  (profile?.projects_users ?? []).forEach((project) => {
    const validated =
      project.validated ??
      project['validated?'] ??
      (project.final_mark !== null ? project.final_mark >= 50 : project.status === 'finished');
    if (!validated) return;
    map.set(project.project.id, { finalMark: project.final_mark ?? 100 });
  });
  return map;
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getProjectDisplayName(project: { id: number; name: string }) {
  return PROJECT_DISPLAY_NAMES[project.id] ?? project.name.trim();
}

function calculateLevel(currentLevel: number, plannedXp: number) {
  const levelDown = Math.floor(currentLevel);
  const levelUp = Math.ceil(currentLevel);
  const baseXp = XP_REQUIRED[levelDown] ?? 0;
  const nextXp = XP_REQUIRED[levelUp] ?? XP_REQUIRED[XP_REQUIRED.length - 1];
  const progressIntoLevel = (currentLevel - levelDown) * (nextXp - baseXp);
  const currentXp = baseXp + progressIntoLevel;
  let finalXp = currentXp + plannedXp;
  let i = 0;
  for (; i < XP_REQUIRED.length; i += 1) {
    if (XP_REQUIRED[i] > finalXp) break;
  }
  const maxXp = XP_REQUIRED[i] - XP_REQUIRED[i - 1];
  finalXp -= XP_REQUIRED[i - 1];
  return i - 1 + finalXp / maxXp;
}

export default function PlannerScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createPlannerStyles(colors), [colors]);
  const [profile, setProfile] = useState<FortyTwoUser | null>(null);
  const [rncpLevel, setRncpLevel] = useState<6 | 7>(6);
  const [path, setPath] = useState<'web' | 'apps' | 'sec' | 'ai'>('web');
  const [blocks, setBlocks] = useState<PlannerBlock[]>([]);
  const [plannedProjects, setPlannedProjects] = useState<Record<number, PlannedProject>>({});
  const [plannedInternships, setPlannedInternships] = useState<Internship[]>([]);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [selectedGrade, setSelectedGrade] = useState('100');
  const [eventCount, setEventCount] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [groupProjectCount, setGroupProjectCount] = useState(0);
  const [loadedGroupProjects, setLoadedGroupProjects] = useState(false);
  const GRADE_MIN = 80;
  const GRADE_MAX = 125;

  useEffect(() => {
    let isActive = true;
    const loadPlanner = async () => {
      const cached = await readPlannerCache<{
        rncpLevel?: 6 | 7;
        path?: 'web' | 'apps' | 'sec' | 'ai';
        plannedProjects?: Record<number, PlannedProject>;
        plannedInternships?: Internship[];
      }>();
      if (!isActive || !cached) return;
      if (cached.rncpLevel) setRncpLevel(cached.rncpLevel);
      if (cached.path) setPath(cached.path);
      if (cached.plannedProjects) setPlannedProjects(cached.plannedProjects);
      if (cached.plannedInternships) setPlannedInternships(cached.plannedInternships);
    };
    loadPlanner();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const data = await fetchMeProfile();
      setProfile(data);
    };
    loadProfile();
  }, []);

  const rncpCatalog = useMemo(() => getRncpCatalog(), []);

  const selectedTitle = useMemo(() => {
    const titleKey =
      rncpLevel === 6
        ? (path === 'web' ? 'Développement web et mobile' : 'Développement applicatif')
        : (path === 'sec' ? "Système d'information et réseaux" : 'Architecture des bases de données et data');
    return rncpCatalog.titles.find((title) => title.title === titleKey) ?? null;
  }, [rncpCatalog, rncpLevel, path]);

  useEffect(() => {
    if (!selectedTitle) {
      setBlocks([]);
      return;
    }
    const mapProjects = (ids: number[]) =>
      ids
        .map((id) => rncpCatalog.projectsById.get(id))
        .filter(Boolean)
        .map((project) => ({
          id: project!.id,
          name: getProjectDisplayName(project!),
          xp: project!.experience || 0,
        }));

    const suiteBlock: PlannerBlock = {
      id: 0,
      name: 'Suite',
      min_xp: 0,
      min_projects: selectedTitle.number_of_suite,
      projects: mapProjects(rncpCatalog.suiteProjectIds),
    };

    const optionBlocks: PlannerBlock[] = selectedTitle.options.map((option, index) => ({
      id: index + 1,
      name: option.title,
      min_xp: option.experience,
      min_projects: option.number_of_projects,
      projects: mapProjects(option.projects),
    }));

    const combined =
      rncpLevel === 6 && path === 'web'
        ? [...optionBlocks, suiteBlock]
        : rncpLevel === 7 && path === 'sec'
          ? [...optionBlocks, suiteBlock]
          : rncpLevel === 7 && path === 'ai'
            ? [...optionBlocks, suiteBlock]
            : [...optionBlocks, suiteBlock];

    setBlocks(combined);
  }, [path, rncpLevel, rncpCatalog, selectedTitle]);

  useEffect(() => {
    const login = profile?.login;
    if (!login) return;
    const staticEvents = STATIC_EVENT_DATA[login];
    if (staticEvents?.events?.length) {
      setEventCount(staticEvents.events.length);
      return;
    }
    const loadEvents = async () => {
      const cached = await readEventsCache<{ count: number }>();
      if (cached?.count) {
        setEventCount(cached.count);
      }
    };
    loadEvents();
  }, [profile]);

  useEffect(() => {
    writePlannerCache({
      rncpLevel,
      path,
      plannedProjects,
      plannedInternships,
    });
  }, [rncpLevel, path, plannedProjects, plannedInternships]);

  useEffect(() => {
    const validPaths = rncpLevel === 6 ? ['web', 'apps'] : ['sec', 'ai'];
    if (!validPaths.includes(path)) {
      setPath(validPaths[0] as typeof path);
    }
  }, [rncpLevel, path]);

  const completedProjects = useMemo(() => getCompletedProjectsMap(profile), [profile]);
  const currentLevel = useMemo(() => getPrimaryLevel(profile?.cursus_users), [profile]);
  const { experienceProjectIds } = rncpCatalog;
  const experienceProjects = useMemo(() => {
    return experienceProjectIds
      .map((id) => rncpCatalog.projectsById.get(id))
      .filter(Boolean)
      .map((project) => ({
        id: project!.id,
        name: getProjectDisplayName(project!),
        xp: project!.experience || 0,
      }));
  }, [rncpCatalog, experienceProjectIds]);
  const completedExperiences = useMemo(() => {
    return experienceProjects.filter((project) => completedProjects.has(project.id));
  }, [completedProjects, experienceProjects]);
  const unvalidatedExperiences = useMemo(() => {
    return experienceProjects.filter((project) => !completedProjects.has(project.id));
  }, [completedProjects, experienceProjects]);

  const plannedProjectsXp = useMemo(() => {
    const unique = new Map<number, number>();
    Object.entries(plannedProjects).forEach(([id, entry]) => {
      const projectId = Number(id);
      if (!Number.isFinite(projectId)) return;
      const current = unique.get(projectId);
      if (!current || entry.xp > current) {
        unique.set(projectId, entry.xp);
      }
    });
    return Array.from(unique.values()).reduce((acc, xp) => acc + xp, 0);
  }, [plannedProjects]);

  const plannedInternshipsXp = useMemo(() => {
    return plannedInternships.reduce((acc, internship) => acc + internship.baseXP * (internship.grade / 100), 0);
  }, [plannedInternships]);

  const plannedLevel = useMemo(() => {
    return calculateLevel(currentLevel, plannedProjectsXp + plannedInternshipsXp);
  }, [currentLevel, plannedProjectsXp, plannedInternshipsXp]);

  const completedInternshipNames = useMemo(() => {
    const names = new Set<string>();
    (profile?.projects_users ?? []).forEach((project) => {
      const validated =
        project.validated ??
        project['validated?'] ??
        (project.final_mark !== null ? project.final_mark >= 50 : project.status === 'finished');
      if (!validated) return;
      names.add(normalizeName(project.project.name));
    });
    return names;
  }, [profile]);

  const availableInternships = useMemo(() => {
    const experienceIds = new Set(experienceProjectIds);
    return INTERNSHIPS.filter((internship) => (
      !experienceIds.has(internship.projectId) &&
      !completedProjects.has(internship.projectId) &&
      !completedInternshipNames.has(normalizeName(internship.name))
    ));
  }, [completedInternshipNames, completedProjects, experienceProjectIds]);

  useEffect(() => {
    const experienceIds = new Set(experienceProjectIds);
    const migrated = plannedInternships.filter((internship) => experienceIds.has(internship.projectId));
    if (!migrated.length) return;
    setPlannedProjects((prev) => {
      const next = { ...prev };
      migrated.forEach((internship) => {
        if (completedProjects.has(internship.projectId)) return;
        next[internship.projectId] = {
          grade: internship.grade,
          xp: Math.round(internship.baseXP * (internship.grade / 100)),
        };
      });
      return next;
    });
    setPlannedInternships((prev) => prev.filter((internship) => !experienceIds.has(internship.projectId)));
  }, [completedProjects, experienceProjectIds, plannedInternships]);

  useEffect(() => {
    if (!completedInternshipNames.size) return;
    setPlannedInternships((prev) =>
      prev.filter((internship) => !completedInternshipNames.has(normalizeName(internship.name))),
    );
    if (selectedInternship && completedInternshipNames.has(normalizeName(selectedInternship.name))) {
      setSelectedInternship(null);
    }
  }, [completedInternshipNames, selectedInternship]);

  const requiredLevel = selectedTitle?.level ?? (rncpLevel === 6 ? 17 : 21);
  const requiredEvents = selectedTitle?.number_of_events ?? (rncpLevel === 6 ? 10 : 15);
  const requiredInternships = selectedTitle?.number_of_experiences ?? 2;
  const requiredGroupProjects = 2;
  const plannedExperienceIds = useMemo(() => {
    const experienceIds = new Set(experienceProjectIds);
    const ids = new Set<number>();
    Object.keys(plannedProjects).forEach((id) => {
      const projectId = Number(id);
      if (experienceIds.has(projectId)) {
        ids.add(projectId);
      }
    });
    plannedInternships.forEach((internship) => {
      ids.add(internship.projectId);
    });
    return ids;
  }, [experienceProjectIds, plannedInternships, plannedProjects]);
  const totalInternships = completedExperiences.length + plannedExperienceIds.size;

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
          await writeGroupCache({ count, projects: Array.from(uniqueProjects.values()) });
          const meta = await readCacheMeta();
          await writeCacheMeta({ ...meta, groupUpdatedAt: Date.now() });
        }
      } catch {
        if (active) {
          setGroupProjectCount(0);
        }
      }
    };

    loadGroupProjects();
    return () => {
      active = false;
    };
  }, [profile, loadedGroupProjects]);
  const blockStatuses = useMemo(() => {
    return blocks.map((block) => {
      const completedCount = block.projects.filter((project) => completedProjects.has(project.id)).length;
      const plannedCount = block.projects.filter((project) => plannedProjects[project.id]).length;
      let xpTotal = 0;
      block.projects.forEach((project) => {
        const completed = completedProjects.get(project.id);
        if (completed) {
          xpTotal += Math.round((project.xp * completed.finalMark) / 100);
          return;
        }
        const planned = plannedProjects[project.id];
        if (planned) {
          xpTotal += planned.xp;
        }
      });
      const isDone = xpTotal >= block.min_xp && completedCount + plannedCount >= block.min_projects;
      return { block, completedCount, plannedCount, xpTotal, isDone };
    });
  }, [blocks, completedProjects, plannedProjects]);

  const meetsLevel = plannedLevel >= requiredLevel;
  const meetsEvents = eventCount >= requiredEvents;
  const meetsInternships = totalInternships >= requiredInternships;
  const meetsGroups = groupProjectCount >= requiredGroupProjects;
  const meetsBlocks = blockStatuses.every((entry) => entry.isDone);
  const eligibilityLabel = meetsLevel && meetsEvents && meetsInternships && meetsBlocks && meetsGroups
    ? 'Elegible'
    : meetsLevel && meetsEvents && meetsBlocks && meetsGroups && !meetsInternships
      ? 'Work expierience needed'
      : 'Not Elegible';
  const eligibilityStyle = meetsLevel && meetsEvents && meetsInternships && meetsBlocks && meetsGroups
    ? styles.eligibilityOk
    : meetsLevel && meetsEvents && meetsBlocks && meetsGroups && !meetsInternships
      ? styles.eligibilityWarn
      : styles.eligibilityKo;

  const togglePlan = (project: PlannerProject) => {
    setPlannedProjects((prev) => {
      if (prev[project.id]) {
        const next = { ...prev };
        delete next[project.id];
        return next;
      }
      return {
        ...prev,
        [project.id]: {
          grade: 100,
          xp: Math.round(project.xp),
        },
      };
    });
  };

  const handleProjectPress = (project: PlannerProject, planned: PlannedProject | undefined, completed: { finalMark: number } | undefined) => {
    if (completed) return;
    if (planned) {
      setActiveProjectId((prev) => (prev === project.id ? null : project.id));
      return;
    }
    setPlannedProjects((prev) => ({
      ...prev,
      [project.id]: {
        grade: 100,
        xp: Math.round(project.xp),
      },
    }));
    setActiveProjectId(project.id);
  };

  const clampGrade = (value: number) => Math.max(GRADE_MIN, Math.min(GRADE_MAX, value));

  const normalizeGradeInput = (value: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return value;
    return String(clampGrade(numeric));
  };

  const updatePlanGrade = (project: PlannerProject, value: string) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;
    const grade = clampGrade(numeric);
    setPlannedProjects((prev) => ({
      ...prev,
      [project.id]: {
        grade,
        xp: Math.round((project.xp * grade) / 100),
      },
    }));
  };

  const stepPlanGrade = (project: PlannerProject, delta: number) => {
    const current = plannedProjects[project.id]?.grade ?? 100;
    const next = clampGrade(current + delta);
    setPlannedProjects((prev) => ({
      ...prev,
      [project.id]: {
        grade: next,
        xp: Math.round((project.xp * next) / 100),
      },
    }));
  };

  const stepSelectedGrade = (delta: number) => {
    const numeric = Number(selectedGrade);
    const base = Number.isFinite(numeric) ? numeric : 100;
    const next = clampGrade(base + delta);
    setSelectedGrade(String(next));
  };

  const handleAddInternship = () => {
    if (!selectedInternship) return;
    const numeric = Number(selectedGrade);
    if (Number.isNaN(numeric)) return;
    const grade = clampGrade(numeric);
    setPlannedInternships((prev) => {
      const existing = prev.find((item) => item.name === selectedInternship.name);
      if (existing) {
        return prev.map((item) =>
          item.name === selectedInternship.name ? { ...item, grade } : item,
        );
      }
      return [...prev, { ...selectedInternship, grade }];
    });
    setSelectedInternship(null);
    setSelectedGrade('100');
  };

  const removeInternship = (name: string) => {
    setPlannedInternships((prev) => prev.filter((item) => item.name !== name));
  };

  const formatBlockName = (name: string) => name.replace('blocks.', '').replace(/_/g, ' ');

  const sortPlannedFirst = (projects: PlannerProject[]) => {
    return [...projects].sort((a, b) => {
      const aPlanned = plannedProjects[a.id] ? 1 : 0;
      const bPlanned = plannedProjects[b.id] ? 1 : 0;
      return bPlanned - aPlanned;
    });
  };

  const renderProjectRow = (project: PlannerProject) => {
    const completed = completedProjects.get(project.id);
    const planned = plannedProjects[project.id];
    const plannedXp = planned ? planned.xp : project.xp;
    return (
      <View
        key={project.id}
        style={[
          styles.projectRow,
          completed && styles.projectRowCompleted,
          !completed && planned && styles.projectRowPlanned,
        ]}
      >
        <TouchableOpacity
          style={styles.projectMain}
          onPress={() => handleProjectPress(project, planned, completed)}
          disabled={Boolean(completed)}
        >
          <Text style={[
            styles.projectName,
            planned && styles.projectNamePlanned,
            completed && styles.projectNamePlanned,
          ]}>
            {project.name}
          </Text>
          <Text style={[
            styles.projectMeta,
            planned && styles.projectMetaPlanned,
            completed && styles.projectMetaPlanned,
          ]}>
            {completed
              ? `Completed • XP ${Math.round((project.xp * completed.finalMark) / 100)}`
              : planned
                ? `Planned • XP ${plannedXp}`
                : `XP ${project.xp}`}
          </Text>
        </TouchableOpacity>
        {!completed ? (
          <View style={styles.projectActions}>
            {planned ? (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => togglePlan(project)}
                >
                  <Text style={styles.actionButtonText}>Remove</Text>
                </TouchableOpacity>
                {activeProjectId === project.id ? (
                  <View style={styles.stepper}>
                    {(() => {
                      const atMin = planned.grade <= GRADE_MIN;
                      const atMax = planned.grade >= GRADE_MAX;
                      return (
                        <>
                          <TouchableOpacity
                            style={[styles.stepButton, atMin && styles.stepButtonDisabled]}
                            onPress={() => stepPlanGrade(project, -1)}
                            disabled={atMin}
                          >
                            <Text style={styles.stepButtonText}>-</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.gradeInput, styles.gradeInputCentered]}
                            value={String(planned.grade)}
                            onChangeText={(value) => updatePlanGrade(project, value)}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity
                            style={[styles.stepButton, atMax && styles.stepButtonDisabled]}
                            onPress={() => stepPlanGrade(project, 1)}
                            disabled={atMax}
                          >
                            <Text style={styles.stepButtonText}>+</Text>
                          </TouchableOpacity>
                        </>
                      );
                    })()}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderExperiencePill = (project: PlannerProject) => {
    const completed = completedProjects.get(project.id);
    const planned = plannedProjects[project.id];
    const isActive = activeProjectId === project.id;
    const plannedXp = planned ? planned.xp : project.xp;
    return (
      <TouchableOpacity
        key={`experience-pill-${project.id}`}
        style={[
          styles.pill,
          completed && styles.experiencePillCompleted,
          !completed && planned && styles.experiencePillPlanned,
          isActive && styles.pillActive,
        ]}
        onPress={() => handleProjectPress(project, planned, completed)}
        disabled={Boolean(completed)}
      >
        <Text style={[
          styles.pillText,
          (completed || planned || isActive) && styles.pillTextActive,
        ]}>
          {project.name}
        </Text>
        <Text style={[
          styles.experiencePillMeta,
          (completed || planned || isActive) && styles.experiencePillMetaActive,
        ]}>
          {completed
            ? `Completed • XP ${Math.round((project.xp * completed.finalMark) / 100)}`
            : planned
              ? `Planned • XP ${plannedXp}`
              : `XP ${project.xp}`}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>RNCP Planner</Text>
        <Text style={styles.subtitle}>Plan your future RNCP path.</Text>
      </View>

      <View style={styles.tabRow}>
        {[6, 7].map((value) => {
          const isActive = rncpLevel === value;
          return (
            <TouchableOpacity
              key={`planner-${value}`}
              style={[styles.tab, styles.tabCompact, isActive && styles.tabActive]}
              onPress={() => setRncpLevel(value as 6 | 7)}
            >
              <Text style={[styles.tabText, styles.tabTextCompact, isActive && styles.tabTextActive]}>
                RNCP {value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tabRow}>
        {(rncpLevel === 6
          ? [
              { key: 'web', label: 'Développement web et mobile' },
              { key: 'apps', label: 'Développement applicatif' },
            ]
          : [
              { key: 'sec', label: "Système d'information et réseaux" },
              { key: 'ai', label: 'Architecture des bases de données et data' },
            ]).map((option) => {
          const isActive = path === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setPath(option.key as typeof path)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Requirements</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Level</Text>
          <ProgressBar value={plannedLevel / requiredLevel} />
          <Text style={styles.progressHint}>
            {plannedLevel.toFixed(2)} / {requiredLevel}
          </Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Events</Text>
          <ProgressBar value={eventCount / requiredEvents} />
          <Text style={styles.progressHint}>
            {eventCount} / {requiredEvents}
          </Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Internships</Text>
          <ProgressBar value={totalInternships / requiredInternships} />
          <Text style={styles.progressHint}>
            {totalInternships} / {requiredInternships}
          </Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Group projects</Text>
          <ProgressBar value={groupProjectCount / requiredGroupProjects} />
          <Text style={styles.progressHint}>
            {groupProjectCount} / {requiredGroupProjects}
          </Text>
        </View>
        <View style={styles.eligibilityRow}>
          <Text style={[styles.eligibilityText, eligibilityStyle]}>{eligibilityLabel}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plan work experience</Text>
        {completedExperiences.length ? (
          <>
            <Text style={styles.listLabel}>List of validated projects:</Text>
            <View style={styles.pillRow}>
              {completedExperiences.map(renderExperiencePill)}
            </View>
          </>
        ) : null}
        <Text style={styles.listLabel}>List of unvalidated projects:</Text>
        <View style={styles.pillRow}>
          {sortPlannedFirst(unvalidatedExperiences).map(renderExperiencePill)}
        </View>
        {activeProjectId && plannedProjects[activeProjectId] && experienceProjects.some((project) => project.id === activeProjectId) ? (
          <View style={styles.projectActions}>
            {(() => {
              const project = experienceProjects.find((entry) => entry.id === activeProjectId);
              const planned = project ? plannedProjects[project.id] : undefined;
              if (!project || !planned) return null;
              const atMin = planned.grade <= GRADE_MIN;
              const atMax = planned.grade >= GRADE_MAX;
              return (
                <>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => togglePlan(project)}
                  >
                    <Text style={styles.actionButtonText}>Remove</Text>
                  </TouchableOpacity>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepButton, atMin && styles.stepButtonDisabled]}
                      onPress={() => stepPlanGrade(project, -1)}
                      disabled={atMin}
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.gradeInput, styles.gradeInputCentered]}
                      value={String(planned.grade)}
                      onChangeText={(value) => updatePlanGrade(project, value)}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.stepButton, atMax && styles.stepButtonDisabled]}
                      onPress={() => stepPlanGrade(project, 1)}
                      disabled={atMax}
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        ) : null}
        {availableInternships.length || plannedInternships.length ? (
          <>
          {availableInternships.length ? (
            <View style={styles.pillRow}>
              {availableInternships.map((internship) => {
                const isActive = selectedInternship?.name === internship.name;
                return (
                  <TouchableOpacity
                    key={internship.name}
                    style={[styles.pill, isActive && styles.pillActive]}
                    onPress={() => setSelectedInternship(internship)}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                      {internship.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {selectedInternship ? (
            <View style={styles.projectActions}>
              {(() => {
                const numeric = Number(selectedGrade);
                const base = Number.isFinite(numeric) ? numeric : 100;
                const atMin = base <= GRADE_MIN;
                const atMax = base >= GRADE_MAX;
                return (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepButton, atMin && styles.stepButtonDisabled]}
                      onPress={() => stepSelectedGrade(-1)}
                      disabled={atMin}
                    >
                      <Text style={styles.stepButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.gradeInput, styles.gradeInputCentered]}
                      value={selectedGrade}
                      onChangeText={(value) => setSelectedGrade(normalizeGradeInput(value))}
                      keyboardType="numeric"
                      placeholder="Grade"
                    />
                    <TouchableOpacity
                      style={[styles.stepButton, atMax && styles.stepButtonDisabled]}
                      onPress={() => stepSelectedGrade(1)}
                      disabled={atMax}
                    >
                      <Text style={styles.stepButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
              <TouchableOpacity style={styles.actionButton} onPress={handleAddInternship}>
                <Text style={styles.actionButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {plannedInternships.length === 0 ? (
            <Text style={styles.emptyText}>No planned internships yet.</Text>
          ) : (
            plannedInternships.map((internship) => (
              <View key={internship.name} style={[styles.projectRow, styles.projectRowPlanned]}>
                <Text style={styles.projectNamePlanned}>{internship.name}</Text>
                <Text style={styles.projectMetaPlanned}>
                  Grade {internship.grade} • XP {Math.round(internship.baseXP * (internship.grade / 100))}
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => removeInternship(internship.name)}
                >
                  <Text style={styles.actionButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
          </>
        ) : null}
      </View>

      {blockStatuses.map(({ block, completedCount, plannedCount, xpTotal, isDone }) => {
        return (
          <View key={block.id} style={styles.card}>
            <View style={styles.blockHeader}>
              <Text style={styles.blockTitle}>{formatBlockName(block.name)}</Text>
              <View style={[styles.statusBadge, isDone ? styles.statusBadgeOk : styles.statusBadgeKo]}>
                <Text style={[styles.statusBadgeText, styles.statusBadgeTextActive]}>
                  {isDone ? 'OK' : 'KO'}
                </Text>
              </View>
            </View>
            {block.min_xp > 0 ? (
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Experience</Text>
                <ProgressBar value={block.min_xp ? xpTotal / block.min_xp : 0} />
                <Text style={styles.progressHint}>
                  {xpTotal} / {block.min_xp} XP
                </Text>
              </View>
            ) : null}
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Projects</Text>
              <ProgressBar value={block.min_projects ? (completedCount + plannedCount) / block.min_projects : 0} />
              <Text style={styles.progressHint}>
                {completedCount + plannedCount} / {block.min_projects}
              </Text>
            </View>
            {(() => {
              const validatedProjects = block.projects.filter((project) => completedProjects.has(project.id));
              const unvalidatedProjects = sortPlannedFirst(block.projects.filter((project) => !completedProjects.has(project.id)));
              return (
                <>
                  {validatedProjects.length ? (
                    <>
                      <Text style={styles.listLabel}>List of validated projects:</Text>
                      {validatedProjects.map(renderProjectRow)}
                    </>
                  ) : null}
                  <Text style={styles.listLabel}>List of unvalidated projects:</Text>
                  {unvalidatedProjects.map(renderProjectRow)}
                </>
              );
            })()}
          </View>
        );
      })}
    </ScrollView>
  );
}
