const MOOD_WORDS = new Set([
  "afraid",
  "anger",
  "angry",
  "anxiety",
  "anxious",
  "bittersweet",
  "bleak",
  "blue",
  "bored",
  "boredom",
  "calm",
  "cheerful",
  "chill",
  "chilling",
  "comfort",
  "comfortable",
  "comforting",
  "content",
  "cosy",
  "cozy",
  "cry",
  "crying",
  "dark",
  "delighted",
  "depressed",
  "depression",
  "depressing",
  "devastated",
  "down",
  "emotional",
  "excited",
  "excitement",
  "exhausted",
  "fear",
  "feel",
  "feeling",
  "feelings",
  "fun",
  "funny",
  "furious",
  "gloomy",
  "goofy",
  "grief",
  "grieving",
  "happiness",
  "happy",
  "heartbroken",
  "heartwarming",
  "heavy",
  "homesick",
  "hope",
  "hopeful",
  "joy",
  "joyful",
  "laugh",
  "laughter",
  "lighthearted",
  "lonely",
  "lonesome",
  "melancholic",
  "melancholy",
  "miserable",
  "mood",
  "moody",
  "nervous",
  "nostalgia",
  "nostalgic",
  "overwhelmed",
  "peace",
  "peaceful",
  "playful",
  "quiet",
  "rain",
  "rainy",
  "restless",
  "romance",
  "romantic",
  "sad",
  "sadness",
  "scared",
  "scary",
  "sentimental",
  "silly",
  "sleepy",
  "sob",
  "sobbing",
  "somber",
  "sombre",
  "spooky",
  "strange",
  "stress",
  "stressed",
  "sunday",
  "tears",
  "tender",
  "tense",
  "tension",
  "thrill",
  "thrilled",
  "thrilling",
  "tired",
  "uplift",
  "uplifting",
  "warm",
  "weep",
  "weepy",
  "weird",
  "wholesome",
  "wistful",
  "worried",
  "worry",
]);

export function readMoodQuery(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function moodSearchHref(query: string): string {
  return `/mood?q=${encodeURIComponent(query.trim())}`;
}

function moodTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, ""))
    .filter(Boolean);
}

export function looksLikeMood(query: string, titles: readonly string[]): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;
  const exact = titles.some((title) => title.trim().toLowerCase() === trimmed.toLowerCase());
  if (exact) return false;
  const words = moodTokens(trimmed);
  if (words.length > 3) return true;
  return words.some((word) => MOOD_WORDS.has(word));
}
