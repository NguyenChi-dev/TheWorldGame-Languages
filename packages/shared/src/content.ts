import type { Word, WordLevel } from "./types";
import vegetablesJson from "./content/en/vegetables.json";

/** Vùng đất tiếng Anh. supabase/seed.sql và migration *_vung_dat.sql dùng cùng UUID này. */
export const ENGLISH_LAND_ID = "a17d0000-0000-4000-8000-000000000001";
export const ENGLISH_LAND_SLUG = "tieng-anh";

interface RawWord {
  id: string;
  word: string;
  meaning: string;
  level: number;
}

/** 10 từ vựng rau củ tiếng Anh, đọc từ content/en/vegetables.json. */
export const ENGLISH_VEGETABLES: Word[] = (vegetablesJson as RawWord[]).map((raw) => ({
  ...raw,
  level: raw.level as WordLevel,
  landId: ENGLISH_LAND_ID,
  topic: "vegetables",
}));
