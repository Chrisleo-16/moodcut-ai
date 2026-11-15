export const ON_DEVICE_LANGUAGES = ["en", "ja", "es", "de", "fr"] as const;

export type OnDeviceLanguage = (typeof ON_DEVICE_LANGUAGES)[number];

export type LanguageRoute = { onDevice: true; language: OnDeviceLanguage } | { onDevice: false; language: string };

const STOP_WORDS: Record<string, readonly string[]> = {
  en: ["the", "and", "a", "to", "of", "my", "me", "feel", "feeling", "something", "with", "for", "night", "like"],
  es: ["el", "la", "los", "las", "de", "que", "un", "una", "y", "en", "por", "con", "quiero", "algo", "triste"],
  de: ["der", "die", "das", "und", "ein", "eine", "ich", "mit", "für", "nicht", "etwas", "will", "einen"],
  fr: ["le", "la", "les", "des", "un", "une", "et", "je", "avec", "pour", "dans", "quelque", "envie"],
  it: ["il", "lo", "gli", "che", "non", "per", "una", "con", "sono", "voglio", "qualcosa"],
  pt: ["os", "as", "que", "um", "uma", "não", "com", "para", "eu", "quero", "algo"],
  nl: ["het", "een", "van", "ik", "niet", "met", "voor", "wil", "iets"],
};

function isOnDeviceLanguage(value: string): value is OnDeviceLanguage {
  return (ON_DEVICE_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Gemini Nano, through the Chrome Prompt API, accepts English, Japanese,
 * Spanish, German, and French. Other languages are sent to the cloud model.
 */
export function routeMoodLanguage(text: string): LanguageRoute {
  if (/[\u3040-\u30ff]/.test(text)) return { onDevice: true, language: "ja" };
  if (/[\uac00-\ud7af\u0600-\u06ff\u0400-\u04ff\u0590-\u05ff\u0e00-\u0e7f\u0900-\u097f]/.test(text)) {
    return { onDevice: false, language: "other" };
  }
  if (/[\u4e00-\u9fff]/.test(text)) return { onDevice: false, language: "zh" };

  const tokens = text.toLowerCase().match(/[a-zà-öø-ÿ]+/g) ?? [];
  const scores = Object.entries(STOP_WORDS).map(([language, words]) => {
    const score = tokens.reduce((total, token) => total + (words.includes(token) ? 1 : 0), 0);
    return { language, score };
  });
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  if (!best || best.score === 0) return { onDevice: true, language: "en" };
  if (isOnDeviceLanguage(best.language)) return { onDevice: true, language: best.language };
  const tied = scores.find((entry) => entry.score === best.score && isOnDeviceLanguage(entry.language));
  if (tied && isOnDeviceLanguage(tied.language)) return { onDevice: true, language: tied.language };
  return { onDevice: false, language: best.language };
}

export function moodPrompt(mood: string, language: OnDeviceLanguage | "en"): string {
  switch (language) {
    case "ja":
      return `視聴者の気分: 「${mood}」。許可されたジャンルから1〜3個、mediaType は movie か tv か any、era は any か classic か recent か upcoming、minVote は 0 から 10（指定がなければ 0）を JSON で返してください。`;
    case "es":
      return `Estado de ánimo: "${mood}". Devuelve JSON con 1 a 3 géneros de la lista, mediaType movie tv o any, era any classic recent o upcoming, y minVote de 0 a 10 (0 si no pide una nota alta).`;
    case "de":
      return `Stimmung: „${mood}“. Antworte mit JSON: 1 bis 3 Genres aus der Liste, mediaType movie tv oder any, era any classic recent oder upcoming, minVote von 0 bis 10 (0, wenn keine hohe Bewertung verlangt wird).`;
    case "fr":
      return `Humeur : « ${mood} ». Réponds en JSON avec 1 à 3 genres de la liste, mediaType movie tv ou any, era any classic recent ou upcoming, et minVote de 0 à 10 (0 sans exigence de note).`;
    case "en":
      return `The viewer described a mood: "${mood}". Choose 1 to 3 genres from the allowed list, mediaType movie or tv or any, era any or classic (before 2000) or recent (2018 or later) or upcoming, and minVote from 0 to 10. Use 0 unless they asked for highly rated titles.`;
    default: {
      const unexpected: never = language;
      return String(unexpected);
    }
  }
}
