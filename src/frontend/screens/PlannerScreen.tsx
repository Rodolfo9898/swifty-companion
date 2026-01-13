import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { fetchMeProfile } from '../../backend/api/fortyTwoApi';
import ProgressBar from '../components/ProgressBar';
import createPlannerStyles from '../styles/plannerStyles';
import { readEventsCache, readPlannerCache, writePlannerCache } from '../utils/appCache';
import { getRncpCatalog } from '../utils/rncpCatalog';
import { useTheme } from '../ThemeContext';
import type { FortyTwoProjectUser, FortyTwoUser } from '../types/fortyTwo';

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
};

const XP_REQUIRED = [
  0, 462, 2688, 5885, 11777, 29217, 46255, 63559, 74340, 85483, 95000, 105630,
  124446, 145782, 169932, 197316, 228354, 263508, 303366, 348516, 399672, 457632,
  523320, 597786, 682164, 777756, 886074, 1008798, 1147902, 1305486, 1484070,
];

const INTERNSHIPS: Internship[] = [
  { name: 'Work Experience I', baseXP: 42000, grade: 100 },
  { name: 'Work Experience II', baseXP: 63000, grade: 100 },
];

const STATIC_EVENT_DATA: Record<string, { events: string[] }> = {
  'rperez-t': require('../data/events_rperezt.json'),
};

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
          name: project!.name,
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
    if (rncpLevel === 7 && path === 'web') {
      setPath('sec');
    }
    if (rncpLevel === 6 && path === 'sec') {
      setPath('web');
    }
  }, [rncpLevel, path]);

  const completedProjects = useMemo(() => getCompletedProjectsMap(profile), [profile]);
  const currentLevel = useMemo(() => getPrimaryLevel(profile?.cursus_users), [profile]);
  const { experienceProjectIds } = rncpCatalog;
  const completedExperiences = useMemo(() => {
    const ids = new Set(experienceProjectIds);
    return (profile?.projects_users ?? []).filter((project) => ids.has(project.project.id) && (project.validated ?? project['validated?'] ?? false));
  }, [profile, experienceProjectIds]);

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
    return INTERNSHIPS.filter((internship) => !completedInternshipNames.has(normalizeName(internship.name)));
  }, [completedInternshipNames]);

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
  const totalInternships = completedExperiences.length + plannedInternships.length;

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

  const updatePlanGrade = (project: PlannerProject, value: string) => {
    const grade = Math.max(80, Math.min(125, Number(value)));
    setPlannedProjects((prev) => ({
      ...prev,
      [project.id]: {
        grade,
        xp: Math.round((project.xp * grade) / 100),
      },
    }));
  };

  const handleAddInternship = () => {
    if (!selectedInternship) return;
    const grade = Number(selectedGrade);
    if (Number.isNaN(grade) || grade < 100 || grade > 125) return;
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
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setRncpLevel(value as 6 | 7)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>RNCP {value}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tabRow}>
        {(rncpLevel === 6
          ? [
              { key: 'web', label: 'Web & Mobile' },
              { key: 'apps', label: 'Application' },
            ]
          : [
              { key: 'sec', label: 'Information systems' },
              { key: 'ai', label: 'AI & Data' },
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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Planned internships</Text>
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
        {selectedInternship ? (
          <View style={styles.projectActions}>
            <TextInput
              style={styles.gradeInput}
              value={selectedGrade}
              onChangeText={setSelectedGrade}
              keyboardType="numeric"
              placeholder="Grade"
            />
            <TouchableOpacity style={styles.actionButton} onPress={handleAddInternship}>
              <Text style={styles.actionButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {plannedInternships.length === 0 ? (
          <Text style={styles.emptyText}>No planned internships yet.</Text>
        ) : (
          plannedInternships.map((internship) => (
            <View key={internship.name} style={styles.projectRow}>
              <Text style={styles.projectName}>{internship.name}</Text>
              <Text style={styles.projectMeta}>
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
      </View>

      {blocks.map((block) => {
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
        const isDone =
          xpTotal >= block.min_xp && completedCount + plannedCount >= block.min_projects;
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
            {block.projects.map((project) => {
              const completed = completedProjects.get(project.id);
              const planned = plannedProjects[project.id];
              const plannedXp = planned ? planned.xp : project.xp;
              return (
                <View
                  key={project.id}
                  style={[styles.projectRow, planned && styles.projectRowPlanned]}
                >
                  <TouchableOpacity
                    style={styles.projectMain}
                    onPress={() => handleProjectPress(project, planned, completed)}
                    disabled={Boolean(completed)}
                  >
                    <Text style={[styles.projectName, planned && styles.projectNamePlanned]}>
                      {project.name}
                    </Text>
                    <Text style={[styles.projectMeta, planned && styles.projectMetaPlanned]}>
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
                            <TextInput
                              style={styles.gradeInput}
                              value={String(planned.grade)}
                              onChangeText={(value) => updatePlanGrade(project, value)}
                              keyboardType="numeric"
                            />
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}
