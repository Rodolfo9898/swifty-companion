import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../AuthContext';
import createCalculatorStyles from '../styles/calculatorStyles';
import { getProjectCatalog, searchProjects } from '../utils/projectCatalog';
import { useTheme } from '../ThemeContext';

const XP_REQUIRED = [
  0, 462, 2688, 5885, 11777, 29217, 46255, 63559, 74340, 85483, 95000, 105630, 124446, 145782, 169932, 197316, 228354, 263508, 303366, 348516,
  399672, 457632, 523320, 597786, 682164, 777756, 886074, 1008798, 1147902, 1305486, 1484070,
];

function getPrimaryLevel(levels: Array<{ level: number }> | undefined) {
  if (!levels || levels.length === 0) return 0;
  return Math.max(...levels.map((entry) => entry.level));
}

export default function CalculatorScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createCalculatorStyles(colors), [colors]);
  const { user } = useAuth();
  const catalog = useMemo(() => getProjectCatalog(), []);

  const [level] = useState(() => getPrimaryLevel(user?.cursus_users));
  const [projects, setProjects] = useState<Array<{
    id: string;
    name: string;
    experience: number;
    grade: string;
    bonus: boolean;
  }>>([
    { id: 'project-1', name: '', experience: 0, grade: '100', bonus: false },
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const addProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        id: `project-${prev.length + 1}`,
        name: '',
        experience: 0,
        grade: '100',
        bonus: false,
      },
    ]);
  };

  const updateProject = (id: string, field: 'name' | 'grade' | 'bonus', value: string | boolean) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id ? { ...project, [field]: value } : project,
      ),
    );
  };

  const selectProject = (id: string, projectName: string, experience: number) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === id ? { ...project, name: projectName, experience } : project,
      ),
    );
    setActiveProjectId(null);
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const { result, progression } = useMemo(() => {
    const currentLevel = Number(level);
    if (
      Number.isNaN(currentLevel) ||
      currentLevel < 0 ||
      projects.length === 0
    ) {
      return { result: null, progression: null };
    }

    const currentLevelFloor = Math.floor(currentLevel);
    const baseXp = XP_REQUIRED[currentLevelFloor] ?? XP_REQUIRED[XP_REQUIRED.length - 1];
    const nextXp = XP_REQUIRED[currentLevelFloor + 1] ?? baseXp;
    const progressIntoLevel = (currentLevel - currentLevelFloor) * (nextXp - baseXp);
    const totalXp = baseXp + progressIntoLevel;
    const earnedXp = projects.reduce((sum, project) => {
      const xpValue = project.experience;
      const gradeValue = Number(project.grade);
      if (Number.isNaN(gradeValue) || xpValue <= 0) {
        return sum;
      }
      const bonusMultiplier = project.bonus ? 1.042 : 1;
      return sum + (gradeValue / 100) * xpValue * bonusMultiplier;
    }, 0);
    const finalXp = totalXp + earnedXp;

    let newLevel = 0;
    while (XP_REQUIRED[newLevel + 1] !== undefined && XP_REQUIRED[newLevel + 1] <= finalXp) {
      newLevel += 1;
    }
    const rangeStart = XP_REQUIRED[newLevel] ?? 0;
    const rangeEnd = XP_REQUIRED[newLevel + 1] ?? rangeStart + 1;
    const fraction = (finalXp - rangeStart) / (rangeEnd - rangeStart);
    const computedLevel = newLevel + Math.max(0, Math.min(1, fraction));

    return {
      result: computedLevel,
      progression: computedLevel - currentLevel,
    };
  }, [level, projects]);

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
        <View style={styles.tableHeader}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.label}>Mark</Text>
          <Text style={styles.label}>Bonus</Text>
          <Text style={styles.label}>XP</Text>
          <Text style={styles.label}> </Text>
        </View>
        {projects.map((project) => (
          <View key={project.id}>
            <View style={styles.tableRow}>
              <View style={styles.cellName}>
                <TextInput
                  style={styles.inputSmall}
                  value={project.name}
                  placeholder="Start typing..."
                  onChangeText={(value) => updateProject(project.id, 'name', value)}
                  onFocus={() => setActiveProjectId(project.id)}
                />
              </View>
              <View style={styles.cellSmall}>
                <TextInput
                  style={styles.inputSmall}
                  keyboardType="numeric"
                  value={project.grade}
                  onChangeText={(value) => updateProject(project.id, 'grade', value)}
                />
              </View>
              <View style={styles.cellSmall}>
                <TouchableOpacity
                  style={[styles.checkbox, project.bonus && styles.checkboxActive]}
                  onPress={() => updateProject(project.id, 'bonus', !project.bonus)}
                >
                  {project.bonus ? <Text style={styles.checkboxText}>✓</Text> : null}
                </TouchableOpacity>
              </View>
              <View style={styles.cellSmall}>
                <Text style={styles.xpText}>{project.experience ? project.experience : '-'}</Text>
              </View>
              <TouchableOpacity style={styles.cellAction} onPress={() => removeProject(project.id)}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
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
        ))}
        <TouchableOpacity style={styles.addRowButton} onPress={addProject}>
          <Text style={styles.addRowText}>Add a project +</Text>
        </TouchableOpacity>
        {result !== null ? (
          <Text style={styles.result}>End level: {result.toFixed(2)}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
