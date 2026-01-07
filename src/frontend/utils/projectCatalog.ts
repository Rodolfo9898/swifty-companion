type ProjectJson = {
  id: number;
  name: string;
  slug: string;
  difficulty: number;
  exam: boolean;
};

type ProjectsJson = {
  projects: ProjectJson[];
};

export interface CatalogProjectItem {
  id: number;
  name: string;
  slug: string;
  experience: number;
}

const projectsData = require('../data/projects_21.json') as ProjectsJson;

export function getProjectCatalog(): CatalogProjectItem[] {
  return projectsData.projects
    .filter((project) => !project.exam)
    .map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      experience: project.difficulty ?? 0,
    }));
}

export function searchProjects(query: string, projects: CatalogProjectItem[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return projects.slice(0, 12);
  return projects
    .map((project) => {
      const name = project.name.toLowerCase();
      const slug = project.slug.toLowerCase();
      const nameIndex = name.indexOf(needle);
      const slugIndex = slug.indexOf(needle);
      const index = nameIndex === -1 ? slugIndex : nameIndex;
      return { project, index: index === -1 ? 9999 : index };
    })
    .filter((entry) => entry.index !== 9999)
    .sort((a, b) => a.index - b.index || a.project.name.length - b.project.name.length)
    .slice(0, 12)
    .map((entry) => entry.project);
}
