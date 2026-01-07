import type { FortyTwoProjectUser, FortyTwoUser } from '../types/fortyTwo';
import type { CatalogProject, CatalogSection, CatalogTrack } from './rncpCatalog';

export interface RncpProjectProgress {
  project: CatalogProject;
  validated: boolean;
  finalMark: number | null;
  earnedXp: number;
}

export interface RncpSectionProgress {
  section: CatalogSection;
  completedProjects: number;
  earnedXp: number;
  projects: RncpProjectProgress[];
}

export interface RncpTrackProgress {
  track: CatalogTrack;
  level: number;
  sections: RncpSectionProgress[];
}

export function normalizeProjectKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getPrimaryLevel(user: FortyTwoUser | null) {
  const cursus = user?.cursus_users ?? [];
  if (cursus.length === 0) return 0;
  return Math.max(...cursus.map((entry) => entry.level));
}

function isProjectValidated(project: FortyTwoProjectUser) {
  const validated = project.validated ?? project['validated?'];
  if (validated === true) return true;
  if (validated === false) return false;
  if (project.final_mark !== null) return project.final_mark >= 50;
  return project.status === 'finished';
}

function buildUserProjectMap(user: FortyTwoUser | null) {
  const map = new Map<number, FortyTwoProjectUser>();
  (user?.projects_users ?? []).forEach((project) => {
    map.set(project.project.id, project);
  });
  return map;
}

function calculateExperience(
  project: CatalogProject,
  projectsById: Map<number, CatalogProject>,
  userProjects: Map<number, FortyTwoProjectUser>,
) {
  let projects = 0;
  let experience = 0;

  const userProject = userProjects.get(project.id);
  for (const childId of project.children) {
    const child = projectsById.get(childId);
    if (!child) continue;
    const childExperience = calculateExperience(child, projectsById, userProjects);
    projects += childExperience.projects;
    experience += childExperience.experience;
  }

  if (userProject && isProjectValidated(userProject)) {
    projects += 1;
    experience += (project.experience || 0) * ((userProject.final_mark ?? 0) / 100);
  }

  return { experience, projects };
}

function buildSectionProgress(
  section: CatalogSection,
  projectsById: Map<number, CatalogProject>,
  userProjects: Map<number, FortyTwoProjectUser>,
) {
  const projects: RncpProjectProgress[] = section.projects.map((project) => {
    const userProject = userProjects.get(project.id);
    const validated = userProject ? isProjectValidated(userProject) : false;
    const grade = userProject?.final_mark ?? 0;
    const earnedXp = validated ? Math.round((project.experience || 0) * (grade / 100)) : 0;
    return {
      project,
      validated,
      finalMark: userProject?.final_mark ?? null,
      earnedXp,
    };
  });

  let completedProjects = 0;
  let earnedXp = 0;
  for (const project of section.projects) {
    const result = calculateExperience(project, projectsById, userProjects);
    completedProjects += result.projects;
    earnedXp += result.experience;
  }

  return {
    section,
    completedProjects,
    earnedXp,
    projects,
  };
}

export function buildRncpProgress(
  user: FortyTwoUser | null,
  tracks: CatalogTrack[],
  projectsById: Map<number, CatalogProject>,
) {
  const userProjects = buildUserProjectMap(user);
  const level = getPrimaryLevel(user);

  return tracks.map((track) => {
    const sections = track.sections.map((section) =>
      buildSectionProgress(section, projectsById, userProjects),
    );
    return {
      track,
      level,
      sections,
    };
  });
}
