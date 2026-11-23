import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export const db = configured
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  : null;
export function client() {
  if (!db)
    throw new Error(
      "Live services are not connected yet. Please contact the event organizer.",
    );
  return db;
}
export const defaults = {
  id: 1,
  starts_at: "2026-11-26T18:00:00+05:00",
  location: "School Grand Hall",
  description: "One extraordinary evening. A thousand unforgettable memories.",
  dress_code: "Black tie & evening gowns",
  registration_open: true,
  registration_deadline: "2026-11-26T12:00:00+05:00",
  voting_status: "closed",
  results_published: false,
  reveal_at: null,
  tie_winner: null,
};
export type Settings = typeof defaults;
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
  title: string;
  description: string;
  sort_order: number;
};
export const defaultProgram: Program[] = [
  {
    time: "18:00",
    title: "The grand arrival",
    description: "Step into the evening. Find your place in the story.",
    sort_order: 0,
  },
  {
    time: "18:30",
    title: "Let the ball begin",
    description: "A royal welcome and the ceremonial opening.",
    sort_order: 1,
  },
  {
    time: "19:00",
    title: "The first waltz",
    description: "The floor is yours. Let the music lead.",
    sort_order: 2,
  },
  {
    time: "19:30",
    title: "A little magic",
    description: "Performances, surprises, and moments to remember.",
    sort_order: 3,
  },
  {
    time: "20:00",
    title: "Crown the evening",
    description: "Cast your vote for the best couple of the ball.",
    sort_order: 4,
  },
  {
    time: "20:30",
    title: "The royal reveal",
    description: "One unforgettable announcement. A well-deserved crown.",
    sort_order: 5,
  },
  {
    time: "21:00",
    title: "One last dance",
    description: "A beautiful ending. A memory that stays.",
    sort_order: 6,
  },
];
export function photo(path: string) {
  return db && path
    ? db.storage.from("couple-photos").getPublicUrl(path).data.publicUrl
    : "";
}
