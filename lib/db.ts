export const defaults = {
  id: 1,
  starts_at: "2026-11-26T16:00:00+05:00",
  location: "Мектептің акт залы",
  description: "Ерекше кеш. Мыңдаған ұмытылмас естелік.",
  dress_code: "Black tie & evening gowns",
  registration_open: true,
  registration_deadline: "2026-11-26T12:00:00+05:00",
  voting_status: "closed",
  results_published: false,
  screen_results_visible: false,
  voting_url: "",
  reveal_at: null,
  tie_winner: null,
};
export type Settings = Omit<typeof defaults, "reveal_at" | "tie_winner"> & {
  reveal_at: string | null;
  tie_winner: string | null;
};
export type Couple = {
  id: string;
  first_name: string;
  second_name: string;
  group_name: string;
  couple_name: string;
  photo_path: string;
  status: string;
  number: number;
  sort_order: number;
  contact?: string;
};
export type Program = {
  id?: number;
  time: string;
  end_time?: string | null;
  title: string;
  description: string;
  sort_order: number;
};
export const defaultProgram: Program[] = [
  {
    time: "16:00",
    end_time: "17:00",
    title: "Вальс",
    description: "Әсем әуен мен жұптардың вальсіне арналған салтанатты сағат.",
    sort_order: 0,
  },
  {
    time: "17:00",
    end_time: "18:30",
    title: "Дискотека және ойын-сауық бағдарламасы",
    description: "Би алаңы, көңілді ойындар және кештің ерекше сәттері.",
    sort_order: 1,
  },
];
export function photo(path: string) {
  return path ? "/api/media/" + encodeURIComponent(path) : "";
}

export type ScreenData = {
  visible: boolean;
  voting_status: string;
  total_votes: number;
  leaders: (Couple & { votes: number; percentage: number; rank: number })[];
};
