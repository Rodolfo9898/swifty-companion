export interface Campus {
  id: number;
  name: string;
  city: string;
  country: string;
  users_count?: number;
}

export interface UserSummary {
  id: number;
  login: string;
  displayname?: string;
  image?: {
    link?: string | null;
  };
  level?: number;
  campus_users?: Array<{
    is_primary?: boolean;
    campus?: { id?: number | null };
  }>;
  cursus_users?: Array<{
    level: number;
    cursus?: { id: number; slug?: string | null; name?: string | null };
  }>;
}

export interface MeProfile {
  id: number;
  login: string;
  displayname: string;
  email: string;
  image?: {
    link?: string | null;
  };
  cursus_users?: Array<{
    level: number;
    cursus: { id: number; slug?: string; name: string };
  }>;
}

export interface ProjectInfo {
  id: number;
  name: string;
  slug: string;
  difficulty?: number;
}

export interface ProjectTag {
  id: number;
  name: string;
}

export interface UserEventItem {
  id: number;
  event: {
    id: number;
    name: string;
    kind?: string | null;
  };
}
