export type TrendDirection = "up" | "down";

export type TrendReport = {
  keyword: string;
  direction: TrendDirection;
  change: string;
  trend: { headline: string; summary: string; spark: number[] };
  data: {
    series: { day: string; value: number }[];
    excerpts: { text: string; source: string }[];
  };
  insight: string;
  opportunity: string;
  recommendations: { label: string; chips: string[] }[];
};

const spark = (seed: number, n: number) =>
  Array.from({ length: n }, (_, i) =>
    Math.round(30 + 45 * Math.abs(Math.sin(seed + i * 0.55)) + i * 2.2),
  );

const days = (values: number[]) =>
  values.map((value, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (values.length - 1 - i));
    return {
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    };
  });

export function buildReport(keyword: string): TrendReport {
  const seed = keyword.length;
  const values = spark(seed, 14);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const direction: TrendDirection = last >= first ? "up" : "down";
  const change = `${direction === "up" ? "+" : "-"}${Math.round(
    Math.abs((last - first) / Math.max(first, 1)) * 100,
  )}%`;

  return {
    keyword,
    direction,
    change,
    trend: {
      headline: `“${keyword}” is accelerating across short-form audio`,
      summary:
        "Mention volume has compounded for nine consecutive days, led by creator-side usage rather than label pushes.",
      spark: values,
    },
    data: {
      series: days(values),
      excerpts: [
        {
          text: "this sound is everywhere on my fyp and i'm not even mad about it",
          source: "TikTok comment · 12.4k likes",
        },
        {
          text: "the slowed version hits different at 2am, someone make a full edit",
          source: "Reddit r/popheads",
        },
        {
          text: "playlist curators are already reshuffling around this one",
          source: "X / Twitter",
        },
      ],
    },
    insight:
      `Growth around ${keyword} is organic and creator-led: edits and duets outpace official posts 4:1. ` +
      "That pattern usually signals another 10–14 days of runway before saturation.",
    opportunity:
      "A campaign entering now can ride an unclaimed sound with low creator CPM before major labels bid the space up.",
    recommendations: [
      { label: "Hashtags", chips: ["#slowedreverb", "#nightdrivecore", `#${keyword.replace(/\s+/g, "").toLowerCase()}`] },
      { label: "Content angles", chips: ["POV transitions", "Behind-the-lyric", "Duet challenge"] },
      { label: "Creator direction", chips: ["Micro creators 10–50k", "Bedroom producers", "Late-night vlog niche"] },
    ],
  };
}

export const SUGGESTED_PROMPTS = [
  "Trends among Gen Z",
  "Romantic songs right now",
  "Afrobeats crossover",
  "Slowed + reverb edits",
  "Breakout indie artists",
];

export type SavedSearch = {
  keyword: string;
  at: string;
  direction: TrendDirection;
};

export const INITIAL_HISTORY: SavedSearch[] = [
  { keyword: "Sad girl autumn", at: "2h ago", direction: "up" },
  { keyword: "Punjabi pop crossover", at: "Yesterday", direction: "up" },
  { keyword: "Hyperpop revival", at: "3 days ago", direction: "down" },
  { keyword: "Lo-fi study beats", at: "Last week", direction: "down" },
];
