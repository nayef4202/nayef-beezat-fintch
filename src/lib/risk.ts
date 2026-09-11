export type RiskOption = { label: string; points: number };
export type RiskQuestion = { id: string; text: string; options: RiskOption[] };

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: "age",
    text: "كم عمرك تقريباً؟",
    options: [
      { label: "أقل من 25 سنة", points: 16 },
      { label: "من 25 إلى 35 سنة", points: 13 },
      { label: "من 36 إلى 50 سنة", points: 8 },
      { label: "أكثر من 50 سنة", points: 3 },
    ],
  },
  {
    id: "horizon",
    text: "متى تتوقع تحتاج هالفلوس؟",
    options: [
      { label: "خلال سنة (شراء سيارة أو زواج قريب)", points: 2 },
      { label: "من سنتين إلى 4 سنوات", points: 7 },
      { label: "من 5 إلى 10 سنوات", points: 12 },
      { label: "أكثر من 10 سنوات (تقاعد أو مستقبل العيال)", points: 16 },
    ],
  },
  {
    id: "experience",
    text: "شنو خبرتك بالاستثمار؟",
    options: [
      { label: "أول مرة، ما جربت شي", points: 3 },
      { label: "شاركت باكتتاب أو صندوق بنكي", points: 7 },
      { label: "أتداول بالبورصة الكويتية أو أسهم عالمية", points: 12 },
      { label: "خبرة واسعة بأكثر من سوق", points: 16 },
    ],
  },
  {
    id: "drop",
    text: "لو نزلت محفظتك 15٪ خلال شهر، شنو تسوي؟",
    options: [
      { label: "أبيع كل شي وأطلع", points: 1 },
      { label: "أبيع جزء وأقلل المخاطرة", points: 6 },
      { label: "أنتظر وما أغيّر شي", points: 12 },
      { label: "أزيد استثماري لأن الأسعار رخصت", points: 16 },
    ],
  },
  {
    id: "income",
    text: "كم تقدر تستقطع شهرياً من راتبك للاستثمار؟",
    options: [
      { label: "أقل من 50 د.ك", points: 3 },
      { label: "من 50 إلى 200 د.ك", points: 8 },
      { label: "من 200 إلى 500 د.ك", points: 12 },
      { label: "أكثر من 500 د.ك", points: 16 },
    ],
  },
  {
    id: "emergency",
    text: "عندك مبلغ طوارئ يكفيك 6 شهور بعيد عن الاستثمار؟",
    options: [
      { label: "لا، ما عندي شي", points: 2 },
      { label: "عندي جزء بسيط", points: 7 },
      { label: "إي، عندي مبلغ كافي", points: 14 },
    ],
  },
  {
    id: "goal",
    text: "شنو هدفك الأساسي من الاستثمار؟",
    options: [
      { label: "أحافظ على فلوسي من التضخم", points: 3 },
      { label: "دخل ثابت ومستقر", points: 7 },
      { label: "أنمّي فلوسي على المدى الطويل", points: 13 },
      { label: "أعلى عائد ممكن وأتحمل التذبذب", points: 16 },
    ],
  },
];

export const MAX_SCORE = RISK_QUESTIONS.reduce(
  (sum, q) => sum + Math.max(...q.options.map((o) => o.points)),
  0,
);

/** يحوّل مجموع النقاط إلى درجة من 0 إلى 100 */
export function normalizeScore(rawPoints: number): number {
  return Math.round((rawPoints / MAX_SCORE) * 100);
}

export function riskLevelLabel(level: number): string {
  switch (level) {
    case 1:
      return "منخفض";
    case 2:
      return "متوسط";
    case 3:
      return "مرتفع";
    default:
      return "مرتفع جداً";
  }
}

export function formatKwd(value: number): string {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`;
}
