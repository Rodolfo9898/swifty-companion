export interface FortyTwoSkill {
  id: number;
  name: string;
  level: number;
}

export interface FortyTwoCursusUser {
  id: number;
  grade: string | null;
  level: number;
  skills: FortyTwoSkill[];
  cursus: {
    id: number;
    name: string;
    slug?: string;
  };
}

export interface FortyTwoProjectUser {
  id: number;
  occurrence: number;
  final_mark: number | null;
  status: string;
  cursus_ids?: number[];
  // API uses `validated?` but some wrappers expose it without the question mark
  validated?: boolean | null;
  'validated?'?: boolean | null;
  project: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface FortyTwoUserImage {
  link: string | null;
  versions?: {
    large?: string | null;
    medium?: string | null;
    small?: string | null;
    micro?: string | null;
  };
}

export interface FortyTwoAchievement {
  id: number;
  name: string;
  description: string | null;
  kind?: string | null;
  image?: string | null;
  tier?: string | null;
  visible?: boolean;
  created_at?: string | null;
}

export interface FortyTwoUser {
  id: number;
  email: string;
  login: string;
  phone: string | null;
  displayname: string;
  title?: string | null;
  titles?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  image: FortyTwoUserImage;
  location: string | null;
  wallet: number;
  correction_point: number;
  cursus_users: FortyTwoCursusUser[];
  projects_users: FortyTwoProjectUser[];
  achievements?: FortyTwoAchievement[];
}

export interface FortyTwoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  created_at: number;
}
