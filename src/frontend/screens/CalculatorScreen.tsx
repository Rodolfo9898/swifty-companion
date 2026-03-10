import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../AuthContext';
import { readCalculatorRoadmaps, writeCalculatorRoadmaps } from '../utils/appCache';
import createCalculatorStyles from '../styles/calculatorStyles';
import { getProjectCatalog, searchProjects } from '../utils/projectCatalog';
import { useTheme } from '../ThemeContext';
import type { RootStackParamList } from '../AppRoot';
import {
  buildProgressSeries,
  getPrimaryLevel,
  levelToTotalXp,
  type XpProjectEntry,
} from '../utils/xpProgress';

type ProjectEntry = XpProjectEntry;

type Props = NativeStackScreenProps<RootStackParamList, 'Calculator'>;

type RoadmapEntry = {
  name: string;
  projects: ProjectEntry[];
  updatedAt: number;
};

export default function CalculatorScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createCalculatorStyles(colors), [colors]);
  const { user } = useAuth();
  const catalog = useMemo(() => getProjectCatalog(), []);

  const [level] = useState(() => getPrimaryLevel(user?.cursus_users));
  const nextProjectId = useRef(2);
  const normalizeProjects = useCallback((items: ProjectEntry[]) => {
    if (!items.length) {
      return [{ id: 'project-1', name: '', experience: 0, grade: '100', bonus: false }];
    }
    const seen = new Set<string>();
    return items.map((project) => {
      let id = project.id && project.id.trim() ? project.id : `project-${nextProjectId.current++}`;
      if (seen.has(id)) {
        id = `project-${nextProjectId.current++}`;
      }
      seen.add(id);
      return {
        id,
        name: project.name ?? '',
        experience: Number(project.experience) || 0,
        grade: project.grade ?? '100',
        bonus: Boolean(project.bonus),
      };
    });
  }, []);

  const [projects, setProjects] = useState<ProjectEntry[]>([
    { id: 'project-1', name: '', experience: 0, grade: '100', bonus: false },
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [roadmapName, setRoadmapName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState<RoadmapEntry[]>([]);

  useEffect(() => {
    let isActive = true;
    const loadRoadmaps = async () => {
      const cached = await readCalculatorRoadmaps<RoadmapEntry[]>();
      if (!isActive) return;
      setSavedRoadmaps(Array.isArray(cached) ? cached : []);
    };
    loadRoadmaps();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const maxId = projects.reduce((max, project) => {
      const match = project.id.match(/project-(\d+)/);
      if (!match) return max;
      const value = Number(match[1]);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);
    nextProjectId.current = Math.max(nextProjectId.current, maxId + 1);
  }, [projects]);

  const addProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        id: `project-${nextProjectId.current++}`,
        name: '',
        experience: 0,
        grade: '100',
        bonus: false,
      },
    ]);
  };

  const updateProject = (id: string, field: 'name' | 'grade' | 'bonus', value: string | boolean) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;
        if (field !== 'grade') {
          return { ...project, [field]: value };
        }
        const raw = typeof value === 'string' ? value : String(value);
        const numeric = Number(raw);
        if (Number.isNaN(numeric)) {
          return { ...project, grade: raw };
        }
        const clamped = Math.max(80, Math.min(125, numeric));
        return { ...project, grade: String(clamped) };
      }),
    );
  };

  const stepGrade = (id: string, delta: number) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;
        const current = Number(project.grade);
        const base = Number.isFinite(current) ? current : 100;
        const next = Math.max(80, Math.min(125, base + delta));
        return { ...project, grade: String(next) };
      }),
    );
  };

  const selectProject = (id: string, projectName: string, experience: number) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === id ? { ...project, name: projectName, experience } : project)),
    );
    setActiveProjectId(null);
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const saveRoadmap = async () => {
    const trimmed = roadmapName.trim();
    if (!trimmed) {
      setSaveError('Give this roadmap a name to save it.');
      return;
    }
    const normalized = normalizeProjects(projects);
    const next = [...savedRoadmaps];
    const existingIndex = next.findIndex((entry) => entry.name.toLowerCase() === trimmed.toLowerCase());
    const entry = { name: trimmed, projects: normalized, updatedAt: Date.now() };
    if (existingIndex >= 0) {
      next[existingIndex] = entry;
    } else {
      next.unshift(entry);
    }
    setSavedRoadmaps(next);
    setRoadmapName('');
    setSaveError(null);
    await writeCalculatorRoadmaps(next);
  };

  const loadRoadmap = (entry: RoadmapEntry) => {
    setProjects(normalizeProjects(entry.projects ?? []));
    setActiveProjectId(null);
  };

  const deleteRoadmap = async (name: string) => {
    const next = savedRoadmaps.filter((entry) => entry.name !== name);
    setSavedRoadmaps(next);
    await writeCalculatorRoadmaps(next);
  };

  const overrideRoadmap = async (name: string) => {
    const normalized = normalizeProjects(projects);
    const next = [...savedRoadmaps];
    const index = next.findIndex((entry) => entry.name === name);
    if (index < 0) return;
    next[index] = { ...next[index], projects: normalized, updatedAt: Date.now() };
    setSavedRoadmaps(next);
    await writeCalculatorRoadmaps(next);
  };

  const progressSeries = useMemo(() => buildProgressSeries(level, projects), [level, projects]);

  const result = useMemo(() => {
    const finalCheckpoint = progressSeries[progressSeries.length - 1];
    return finalCheckpoint ? finalCheckpoint.level : null;
  }, [progressSeries]);

  const projectedXpGain = useMemo(() => {
    const startXp = levelToTotalXp(level);
    const finalCheckpoint = progressSeries[progressSeries.length - 1];
    if (!finalCheckpoint) return 0;
    return Math.max(0, finalCheckpoint.totalXp - startXp);
  }, [level, progressSeries]);

  const openProgressGraph = () => {
    navigation.navigate('CalculatorProgress', {
      baseLevel: level,
      projects,
    });
  };

  const renderProjectItem = useCallback(
    ({ item: project, drag, isActive }: RenderItemParams<ProjectEntry>) => (
      <View>
        <View style={[styles.tableRow, isActive && styles.rowDragging]}>
          <View style={styles.rowTop}>
            <View style={styles.cellName}>
              <TextInput
                style={styles.inputSmall}
                value={project.name}
                placeholder="Start typing..."
                onChangeText={(value) => updateProject(project.id, 'name', value)}
                onFocus={() => setActiveProjectId(project.id)}
              />
            </View>
            <TouchableOpacity
              style={styles.dragHandle}
              onLongPress={drag}
              delayLongPress={180}
              disabled={isActive}
            >
              <Text style={styles.dragHandleText}>≡</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cellAction} onPress={() => removeProject(project.id)}>
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowBottom}>
            <View style={[styles.mobileGroup, styles.markGroup]}>
              <Text style={styles.labelCompact}>Mark</Text>
              <View style={styles.stepper}>
                {(() => {
                  const numericGrade = Number(project.grade);
                  const clampedGrade = Number.isFinite(numericGrade) ? numericGrade : 100;
                  const atMin = clampedGrade <= 80;
                  const atMax = clampedGrade >= 125;
                  return (
                    <>
                      <TouchableOpacity
                        style={[styles.stepButton, atMin && styles.stepButtonDisabled]}
                        onPress={() => stepGrade(project.id, -1)}
                        disabled={atMin}
                      >
                        <Text style={styles.stepButtonText}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.inputSmall, styles.gradeInput]}
                        keyboardType="numeric"
                        value={project.grade}
                        onChangeText={(value) => updateProject(project.id, 'grade', value)}
                      />
                      <TouchableOpacity
                        style={[styles.stepButton, atMax && styles.stepButtonDisabled]}
                        onPress={() => stepGrade(project.id, 1)}
                        disabled={atMax}
                      >
                        <Text style={styles.stepButtonText}>+</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>
            </View>

            <View style={[styles.mobileGroup, styles.bonusGroup]}>
              <Text style={styles.labelCompact}>Bonus</Text>
              <TouchableOpacity
                style={[styles.checkbox, project.bonus && styles.checkboxActive]}
                onPress={() => updateProject(project.id, 'bonus', !project.bonus)}
              >
                {project.bonus ? <Text style={styles.checkboxText}>✓</Text> : null}
              </TouchableOpacity>
            </View>

            <View style={[styles.mobileGroup, styles.xpGroup]}>
              <Text style={styles.labelCompact}>XP</Text>
              <Text style={styles.xpText}>{project.experience ? project.experience : '-'}</Text>
            </View>
          </View>
        </View>

        {activeProjectId === project.id ? (
          <View style={styles.suggestions}>
            {searchProjects(project.name, catalog).map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.suggestionItem}
                onPress={() => selectProject(project.id, entry.name, entry.experience)}
              >
                <Text style={styles.suggestionText}>{entry.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    ),
    [activeProjectId, catalog, removeProject, selectProject, stepGrade, styles, updateProject],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>XP Calculator</Text>
        <View style={styles.levelRow}>
          <Text style={styles.label}>Current level</Text>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>{Number.isFinite(level) ? level.toFixed(2) : '0.00'}</Text>
          </View>
        </View>

        <DraggableFlatList
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={renderProjectItem}
          onDragEnd={({ data }) => setProjects(data)}
          scrollEnabled={false}
          activationDistance={6}
          contentContainerStyle={styles.projectsList}
        />

        <TouchableOpacity style={styles.addRowButton} onPress={addProject}>
          <Text style={styles.addRowText}>Add a project +</Text>
        </TouchableOpacity>
        {result !== null ? (
          <View style={styles.resultRow}>
            <View style={styles.resultMeta}>
              <Text style={styles.result}>End level: {result.toFixed(2)}</Text>
              <Text style={styles.resultHint}>Projected gain: +{Math.round(projectedXpGain)} XP</Text>
            </View>
            <TouchableOpacity style={styles.progressButton} onPress={openProgressGraph}>
              <Text style={styles.progressButtonText}>Overview</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.roadmapSection}>
          <Text style={styles.sectionTitle}>Roadmaps</Text>
          <View style={styles.roadmapSaveRow}>
            <TextInput
              style={styles.roadmapInput}
              value={roadmapName}
              placeholder="Roadmap name"
              onChangeText={(value) => {
                setRoadmapName(value);
                if (saveError) setSaveError(null);
              }}
            />
            <TouchableOpacity style={styles.roadmapSaveButton} onPress={saveRoadmap}>
              <Text style={styles.roadmapSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
          {savedRoadmaps.length ? (
            <View style={styles.roadmapList}>
              {savedRoadmaps.map((entry) => {
                const label = `${entry.projects.length} projects`;
                const dateLabel = new Date(entry.updatedAt).toLocaleDateString();
                return (
                  <View key={entry.name} style={styles.roadmapItem}>
                    <View style={styles.cellName}>
                      <Text style={styles.roadmapName}>{entry.name}</Text>
                      <Text style={styles.roadmapMeta}>{label} | {dateLabel}</Text>
                    </View>
                    <View style={styles.roadmapActions}>
                      <TouchableOpacity onPress={() => loadRoadmap(entry)}>
                        <Text style={styles.roadmapActionText}>Load</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.roadmapOverrideButton} onPress={() => overrideRoadmap(entry.name)}>
                        <Text style={styles.roadmapOverrideText}>Override</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRoadmap(entry.name)}>
                        <Text style={styles.roadmapDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.hint}>No roadmaps saved yet.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
