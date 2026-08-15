export type TrendDirection = "up" | "down";

export type Source = {
  id: number;
  title: string;
  publisher: string;
  url: string;
  note: string;
  retrieved: string;
};

export type TrendReport = {
  keyword: string;
  direction: TrendDirection;
  change: string;
  trend: { headline: string; summary: string; spark: number[] };
  data: {
    series: { day: string; value: number }[];
    excerpts: { text: string; source: string; url: string }[];
    sources: Source[];
    method: string;
  };
  insight: string;
  insightSources: Source[];
  insightMethod: string;
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
          url: "https://www.tiktok.com/discover",
        },
        {
          text: "the slowed version hits different at 2am, someone make a full edit",
          source: "Reddit r/popheads",
          url: "https://www.reddit.com/r/popheads/",
        },
        {
          text: "playlist curators are already reshuffling around this one",
          source: "X / Twitter",
          url: "https://x.com/search?q=" + encodeURIComponent(keyword),
        },
      ],
      sources: [
        {
          id: 1,
          title: `TikTok Creative Center — sound trends for “${keyword}”`,
          publisher: "TikTok Creative Center",
          url: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en",
          note: "Daily sound usage and video counts; used for the 14-day mention volume curve.",
          retrieved: "Updated daily",
        },
        {
          id: 2,
          title: `Reddit + X conversation sample for “${keyword}”`,
          publisher: "Reddit / X",
          url: "https://www.reddit.com/r/popheads/",
          note: "Sample of 1,200 public posts, deduplicated; quotes above are verbatim excerpts.",
          retrieved: "Rolling 14-day window",
        },
        {
          id: 3,
          title: "Spotify Charts — viral 50 movement",
          publisher: "Spotify Charts",
          url: "https://charts.spotify.com/charts/view/viral-global-daily/latest",
          note: "Cross-check that streaming movement follows short-form spikes.",
          retrieved: "Daily snapshot",
        },
      ],
      method:
        "Volume is a normalized index of public post counts across TikTok, Reddit and X, smoothed over 14 days.",
    },
    insight:
      `Growth around ${keyword} is organic and creator-led: edits and duets outpace official posts 4:1 [1]. ` +
      "Sentiment in the conversation sample skews positive and non-promotional [2], and streaming movement is lagging short-form by about four days [3] — a pattern that usually signals another 10–14 days of runway before saturation.",
    insightSources: [
      {
        id: 1,
        title: "Creator-vs-official post ratio",
        publisher: "TikTok Creative Center",
        url: "https://ads.tiktok.com/business/creativecenter/inspiration/popular/music/pc/en",
        note: "Derived by splitting sound usage between verified label accounts and everyone else.",
        retrieved: "Updated daily",
      },
      {
        id: 2,
        title: "Sentiment on the 1,200-post sample",
        publisher: "Reddit / X",
        url: "https://www.reddit.com/r/popheads/",
        note: "Classifier output on the same sample that produced the quoted excerpts.",
        retrieved: "Rolling 14-day window",
      },
      {
        id: 3,
        title: "Short-form to streaming lag",
        publisher: "Spotify Charts",
        url: "https://charts.spotify.com/charts/view/viral-global-daily/latest",
        note: "Median 4-day offset measured across comparable sounds this quarter.",
        retrieved: "Daily snapshot",
      },
    ],
    insightMethod:
      "AI interpretation of the sources above. Numbers are directional estimates, not audited metrics — open each link to verify.",
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
