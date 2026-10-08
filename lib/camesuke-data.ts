export type CaptureStep = {
  id: string;
  title: string;
  subtitle: string;
  /** Instruction shown on the guide frame itself, mirroring the on-image caption. */
  caption: string;
  /** Reference photo shown during the instructions phase, served from public/samples. */
  image: string;
  purpose: string[];
  tips: string[];
};

// General shooting rules that apply to every step (unedited originals, normal
// 1x lens, no screenshots/collages). Surfaced once as a persistent note.
export const captureGuidelines: string[] = [
  "スクリーンショットや加工・合成された画像は使用できません。",
  "通常カメラ(1倍)で撮影してください。広角(0.5倍)・ズーム・ポートレートモードは避けてください。",
];

// Sample photos live at public/samples/1.png .. 4.png, numbered to match the
// step order below.
const rawCaptureSteps: Omit<CaptureStep, "image">[] = [
  {
    id: "back-wall",
    title: "奥の壁(縦の長方形で撮影)",
    subtitle: "奥の壁を、床から天井までまっすぐ正面から撮影",
    caption: "左右の幅がそろった長方形に見えるように撮影してください。",
    purpose: ["壁の高さ", "壁の幅"],
    tips: [
      "床から天井まで、上下を切らずに1枚に収めてください",
      "壁の正面に立ち、スマートフォンを傾けずまっすぐ構えてください",
    ],
  },
  {
    id: "floor",
    title: "底面(真上からの長方形で撮影)",
    subtitle: "床を真上から見下ろすように撮影",
    caption: "床全体が長方形に見え、奥側と手前側の横幅が同じ長さに見えるように撮影してください。",
    purpose: ["床の形状", "奥行きの基準"],
    tips: ["便器の真上あたりから、床に対してまっすぐ下向きに構えてください"],
  },
  {
    id: "model-label",
    title: "型番の撮影(アップ)",
    subtitle: "タンク側面や便座の裏にあることが多いです",
    caption: "メーカー名と型番が読めるように、ラベル部分をアップで撮影してください。",
    purpose: ["メーカー・型番"],
    tips: [
      "ラベルの文字にピントを合わせ、フラッシュの反射に注意してください",
      "写真と合わせて、下の欄にメーカー名と型番を入力してください",
    ],
  },
  {
    id: "plumbing",
    title: "給排水まわり",
    subtitle: "便器の後ろや横の配管を接写",
    caption: "給水・排水の配管が分かるように撮影してください。",
    purpose: ["配管の種類", "配管の状態"],
    tips: ["止水栓も写してください", "暗い場合はフラッシュをご使用ください"],
  },
];

export const captureSteps: CaptureStep[] = rawCaptureSteps.map((step, i) => ({
  ...step,
  image: `/samples/${i + 1}.png`,
}));

export type QualityCheck = { label: string; state: "pass" | "warn" | "fail" };

export const qualityChecks: QualityCheck[] = [
  { label: "ブレがない(シャープ)", state: "pass" },
  { label: "十分な明るさ", state: "pass" },
  { label: "基準物が写っている", state: "pass" },
  { label: "床・天井のラインが枠内", state: "pass" },
  { label: "前の写真との重なり", state: "warn" },
  { label: "指定の角度と一致", state: "pass" },
];

export type CaseRecord = {
  id: string;
  customer: string;
  address: string;
  submitted: string;
  status: "review" | "approved" | "survey";
  confidence: number;
  width: number;
  depth: number;
  height: number;
  toilet: string;
  floor: string;
  wall: string;
  ceiling: string;
  pipe: string;
  warnings: string[];
};

export const cases: CaseRecord[] = [
  {
    id: "000123",
    customer: "山本 健一",
    address: "東京都世田谷区",
    submitted: "2026-08-28 14:02",
    status: "review",
    confidence: 91,
    width: 1480,
    depth: 2930,
    height: 2440,
    toilet: "TOTO CS330B",
    floor: "ビニールシート",
    wall: "ビニールクロス",
    ceiling: "ビニールクロス",
    pipe: "床排水 200mm",
    warnings: [],
  },
  {
    id: "000124",
    customer: "佐々木 美咲",
    address: "神奈川県川崎市",
    submitted: "2026-08-28 11:47",
    status: "survey",
    confidence: 58,
    width: 1210,
    depth: 1660,
    height: 2380,
    toilet: "未特定",
    floor: "不明",
    wall: "タイル(推定)",
    ceiling: "不明",
    pipe: "確認不可",
    warnings: [
      "品番ラベルが読み取れません",
      "右側の壁が枠外です",
      "2枚の写真で光量不足",
    ],
  },
  {
    id: "000125",
    customer: "井上 拓也",
    address: "千葉県千葉市",
    submitted: "2026-08-27 18:20",
    status: "approved",
    confidence: 95,
    width: 1600,
    depth: 2100,
    height: 2500,
    toilet: "LIXIL YBC-Z30S",
    floor: "クッションフロア",
    wall: "ビニールクロス",
    ceiling: "ビニールクロス",
    pipe: "壁排水 120mm",
    warnings: [],
  },
  {
    id: "000126",
    customer: "中川 浩二",
    address: "埼玉県さいたま市",
    submitted: "2026-08-27 09:05",
    status: "review",
    confidence: 84,
    width: 1350,
    depth: 1900,
    height: 2420,
    toilet: "Panasonic XCH1500WS",
    floor: "ビニールシート",
    wall: "ビニールクロス",
    ceiling: "ビニールクロス",
    pipe: "床排水 200mm",
    warnings: ["奥行きに中程度のパース歪み"],
  },
];
