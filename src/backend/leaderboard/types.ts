export interface LeaderboardCampus {
  id: number;
  name: string;
  city: string;
  country: string;
}

export interface LeaderboardUser {
  id: number;
  login: string;
  displayname?: string | null;
  title?: string | null;
  image?: string | null;
  image_url?: string | null;
  campusId?: number | null;
  campus_id?: number | null;
  campusName?: string | null;
  campus_name?: string | null;
  level: number | null;
  weekly_logtime?: number | null;
  correction_points?: number | null;
  wallets?: number | null;
  blackholed_at?: string | null;
  milestone_deadline?: string | null;
  milestone_deadline_at?: string | null;
  deadline?: string | null;
  deadline_at?: string | null;
  coalition_name?: string | null;
  begin_at?: string | null;
  promo?: string | null;
  badge?: string | null;
  badges?: string[] | null;
  alumni?: boolean | null;
  is_alumni?: boolean | null;
  grade?: string | null;
  transcender?: boolean | null;
  is_transcender?: boolean | null;
  updated_at?: number | string | null;
}

export interface LeaderboardPage {
  data: LeaderboardUser[];
  total: number;
  page: number;
  perPage: number;
}
