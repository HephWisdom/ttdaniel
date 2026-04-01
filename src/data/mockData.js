export const overviewArticles = [
  {
    title: "Guide to Pro Photography",
    date: "16 March 2019",
    excerpt:
      "Let me start off by saying, you can do this! It will be hard work but isn't imposibble.",
    imageEmojis: ["📷", "🎥"],
    imageColors: ["#D1FAE5", "#CBD5E1"],
    imageCount: "4+",
    avatarColors: ["#F59E0B", "#EC4899", "#8B5CF6", "#10B981"],
    avatarLetters: ["A", "B", "C", "D"],
    responses: "10+ Responses",
  },
  {
    title: "Modern Industrial Design",
    date: "10 March 2019",
    excerpt:
      "Industrial designs require little furniture and more floor space. This design genre wants people to be able",
    imageEmojis: ["🏛️", "🌇"],
    imageColors: ["#FEF3C7", "#DBEAFE"],
    imageCount: "3+",
    avatarColors: ["#6366F1", "#14B8A6", "#F97316"],
    avatarLetters: ["E", "F", "G"],
    responses: "12+ Responses",
  },
  {
    title: "Learning Design Process",
    date: "07 March 2019",
    excerpt:
      "This involves a methodical integration of pedagogical and technological elements to enrich all learning",
    imageEmojis: ["💻", "✏️"],
    imageColors: ["#EDE9FE", "#FCE7F3"],
    imageCount: "4+",
    avatarColors: ["#2563EB", "#DC2626", "#059669"],
    avatarLetters: ["H", "I", "J"],
    responses: "27+ Responses",
  },
  {
    title: "Design Thinking Process",
    date: "02 March 2019",
    excerpt:
      "This involves a methodical integration of pedagogical and technological elements to enrich all learning",
    imageEmojis: ["🖥️", "📐"],
    imageColors: ["#FEE2E2", "#E0F2FE"],
    imageCount: "2+",
    avatarColors: ["#7C3AED", "#D97706", "#0891B2"],
    avatarLetters: ["K", "L", "M"],
    responses: "30+ Responses",
  },
];

export const topLocations = [
  { city: "Malang", percentage: 74 },
  { city: "Surabaya", percentage: 51 },
  { city: "Yogyakarta", percentage: 42 },
];

export const overviewStats = {
  visitorsLabel: "Profile Visits",
  visitorsValue: "74%",
  impressionsValue: "126k",
  impressionsLabel: "Reach",
};

export const analyticsStats = [
  {
    label: "Total Views",
    value: "48,210",
    change: "↑ 12.4% this month",
    tone: "up",
  },
  {
    label: "Avg. Read Time",
    value: "4m 32s",
    change: "↑ 3.1% this month",
    tone: "up",
  },
  {
    label: "Total Responses",
    value: "1,087",
    change: "↓ 2.0% this month",
    tone: "down",
  },
  {
    label: "Impressions",
    value: "126k",
    change: "↑ 8.7% this month",
    tone: "up",
  },
];

export const topArticles = [
  { title: "Design Thinking Process", responses: "30+ resp." },
  { title: "Learning Design Process", responses: "27+ resp." },
  { title: "Modern Industrial Design", responses: "12+ resp." },
  { title: "Guide to Pro Photography", responses: "10+ resp." },
];

export const publishCategories = [
  "Design",
  "Photography",
  "Technology",
  "Business",
  "Lifestyle",
];

export const initialCreateOptions = {
  allowComments: true,
  featuredArticle: false,
  notifySubscribers: true,
  seoOptimized: true,
};

export const defaultCreateValues = {
  title: "",
  excerpt: "",
  content: "",
  author: "TT Daniel-The Revivalist",
  category: publishCategories[0],
  publishAt: "",
  tags: [],
  image: "",
};
