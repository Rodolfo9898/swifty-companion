type ProjectJson = {
  id: number;
  name: string;
  slug: string;
  difficulty: number;
  exam: boolean;
  parent?: { id: number } | null;
  children?: Array<{ id: number }>;
};

type ProjectsJson = {
  projects: ProjectJson[];
};

type RncpOptionJson = {
  title: string;
  experience: number;
  number_of_projects: number;
  projects: number[];
};

type RncpTitleJson = {
  type: 'rncp-6' | 'rncp-7';
  title: string;
  level: number;
  number_of_events: number;
  number_of_experiences: number;
  number_of_suite: number;
  options: RncpOptionJson[];
};

type RncpJson = {
  rncp: RncpTitleJson[];
  suite: { projects: number[] };
  experience: { projects: number[] };
};

export interface CatalogProject {
  id: number;
  name: string;
  slug: string;
  experience: number;
  parentId: number | null;
  children: number[];
}

export interface CatalogSection {
  title: string;
  requiredProjects: number;
  requiredXp: number;
  projects: CatalogProject[];
}

export interface CatalogTrack {
  id: string;
  level: 6 | 7;
  title: string;
  rncp: string;
  requirements: {
    level: number;
    events: number;
    experiences: number;
    groupProjects: number;
    suiteProjects: number;
  };
  sections: CatalogSection[];
}

const projectsData = require('../data/projects_21.json') as ProjectsJson;
const rncpData = require('../data/rncp_21.json') as RncpJson;

const projectsById = new Map<number, CatalogProject>();

for (const project of projectsData.projects) {
  if (project.exam) continue;
  projectsById.set(project.id, {
    id: project.id,
    name: project.name,
    slug: project.slug,
    experience: project.difficulty ?? 0,
    parentId: project.parent?.id ?? null,
    children: (project.children ?? []).map((child) => child.id),
  });
}

function getProjectById(id: number) {
  return projectsById.get(id);
}

function formatTrackId(type: 'rncp-6' | 'rncp-7', title: string) {
  return `${type}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function mapProjects(ids: number[]) {
  return ids.map((id) => getProjectById(id)).filter(Boolean) as CatalogProject[];
}

export function getRncpCatalog() {
  return {
    projectsById,
    suiteProjectIds: rncpData.suite.projects,
    experienceProjectIds: rncpData.experience.projects,
    titles: rncpData.rncp,
  };
}

export function buildCatalogTracks(groupProjects = 2): CatalogTrack[] {
  const suiteProjects = mapProjects(rncpData.suite.projects);

  return rncpData.rncp.map((title) => {
    const sections: CatalogSection[] = [
      {
        title: 'Suite',
        requiredProjects: title.number_of_suite,
        requiredXp: 0,
        projects: suiteProjects,
      },
      ...title.options.map((option) => ({
        title: option.title,
        requiredProjects: option.number_of_projects,
        requiredXp: option.experience,
        projects: mapProjects(option.projects),
      })),
    ];

    return {
      id: formatTrackId(title.type, title.title),
      level: title.type === 'rncp-6' ? 6 : 7,
      title: title.title,
      rncp: title.type === 'rncp-6' ? 'RNCP 6' : 'RNCP 7',
      requirements: {
        level: title.level,
        events: title.number_of_events,
        experiences: title.number_of_experiences,
        groupProjects,
        suiteProjects: title.number_of_suite,
      },
      sections,
    };
  });
}
