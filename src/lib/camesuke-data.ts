export type CaptureStep = {
  id: string;
  title: string;
  subtitle: string;
  purpose: string[];
  tips: string[];
};

export const captureSteps: CaptureStep[] = [
  {
    id: "front-floor",
    title: "トイレと床の全体写真",
    subtitle: "ドアの入口から立ち、床全体が写るように撮影",
    purpose: ["部屋の幅", "床の解析"],
    tips: [
      "スマートフォンは胸の高さで構えてください",
      "便器全体が枠の中に入るようにしてください",
      "左右の床の端まで写してください",
    ],
  },
  {
    id: "model-label",
    title: "品番ラベルの接写",
    subtitle: "タンク側面や便座の裏にあることが多いです",
    purpose: ["メーカー・型番", "基準寸法"],
    tips: [
      "ラベルが画面いっぱいになるように撮ってください",
      "フラッシュの反射にご注意ください",
      "TOTO / LIXIL(INAX) / Panasonicに対応",
    ],
  },
  {
    id: "left-wall",
    title: "左側面の写真",
    subtitle: "部屋の中央から左側の壁に向かって撮影",
    purpose: ["奥行き", "高さ", "柱・障害物"],
    tips: ["床と天井のラインを入れてください", "できるだけ下がって撮ってください"],
  },
  {
    id: "front-wall",
    title: "正面の写真",
    subtitle: "便器の後ろの壁に向かって撮影",
    purpose: ["幅", "高さ", "壁面"],
    tips: ["カメラを水平に保ってください", "上下に傾けないでください"],
  },
  {
    id: "right-wall",
    title: "右側面の写真",
    subtitle: "部屋の中央から右側の壁に向かって撮影",
    purpose: ["奥行き", "高さ", "壁の材質"],
    tips: [
      "この面にドアがある場合はドアも入れてください",
      "床と天井のラインを入れてください",
    ],
  },
  {
    id: "plumbing",
    title: "給排水管の写真",
    subtitle: "便器の後ろや横の配管を接写",
    purpose: ["配管の種類", "配管の状態"],
    tips: ["止水栓も写してください", "暗い場合はフラッシュをご使用ください"],
  },
];

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

export const confidenceFactors = [
  { label: "基準物を検出", ok: true },
  { label: "品番を特定", ok: true },
  { label: "写真同士の重なりが十分", ok: true },
  { label: "パースの品質", ok: true },
  { label: "必要な面がすべて写っている", ok: true },
];

export const referenceProducts = [
  { maker: "TOTO", model: "CS330B", category: "大便器", w: 390, d: 705, h: 380 },
  { maker: "TOTO", model: "SH333BA", category: "タンク", w: 390, d: 175, h: 500 },
  { maker: "LIXIL / INAX", model: "YBC-Z30S", category: "大便器", w: 390, d: 750, h: 400 },
  { maker: "LIXIL / INAX", model: "DT-Z380", category: "タンク", w: 400, d: 190, h: 520 },
  { maker: "Panasonic", model: "XCH1500WS", category: "タンクレストイレ", w: 384, d: 650, h: 500 },
  { maker: "基準マーカー", model: "A4用紙", category: "代替マーカー", w: 210, d: 0, h: 297 },
];
