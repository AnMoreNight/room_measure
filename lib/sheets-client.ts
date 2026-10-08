import { createSign } from "node:crypto";

// ---------------------------------------------------------------------------
// Looks up a toilet's known size in a Google Sheet, by brand/model. Auth is a
// standard service-account JWT bearer flow: sign a short-lived JWT with the
// service account's private key, exchange it for an access token, call the
// Sheets API with that token. No external Google SDK needed — both calls are
// plain REST.
//
// SHEET_RANGE/column order confirmed against the real sheet: Brand | Model |
// PartType (Japanese: 大便器 toilet bowl, タンク tank, タンクレストイレ
// tankless toilet, 洗浄便座 washlet seat) | WidthMm | a second dimension
// whose meaning depends on partType (front-to-back length for a bowl/
// tankless unit, height for a tank, depth for a washlet seat — NOT a
// consistent "depth" or "height" across rows, so it's kept as an untyped
// secondDimensionMm rather than named depth/height).
//
// Important caveat for callers: widthMm is the WIDTH OF WHATEVER PART WAS
// PHOTOGRAPHED, not necessarily the toilet's overall installed footprint.
// A 洗浄便座 (washlet seat) row's width (e.g. ~507mm) is a very different
// physical thing from a タンク (tank) or 大便器 (bowl) row's width
// (~390-400mm) for the same installation. lib/measure/wall-detection.ts's
// toiletWidthLine specifically measures the TANK's width — matching a
// washlet-seat row here would silently produce a wrong real-world size, not
// an error. The capture guide's model-label step currently says to
// photograph "タンク側面や便座の裏" (tank side OR seat underside), which
// can't guarantee a tank photo — see room-size.ts for where this surfaces.
// ---------------------------------------------------------------------------

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEET_RANGE = "Sheet1!A2:E";

export type ToiletSize = {
  brand: string;
  model: string;
  partType: string;
  widthMm: number;
  secondDimensionMm: number;
};

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

function loadServiceAccount(): ServiceAccount {
  const raw = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON が設定されていません。管理者に設定を依頼してください。",
    );
  }
  let parsed: Partial<ServiceAccount>;
  try {
    parsed = JSON.parse(raw) as Partial<ServiceAccount>;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON の形式が不正です(JSONとして解析できません)。");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON の形式が不正です(client_email/private_keyが必要です)。",
    );
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signJwt(account: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signInput = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(signInput).sign(account.private_key);
  return `${signInput}.${base64url(signature)}`;
}

let cachedToken: { value: string; expiresAt: number } | undefined;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const assertion = signJwt(loadServiceAccount());
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google認証に失敗しました (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("Google認証トークンの取得に失敗しました。");
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function fetchSheetRows(): Promise<string[][]> {
  const sheetId = process.env["GOOGLE_SHEET_ID"];
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID が設定されていません。管理者に設定を依頼してください。");
  }

  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_RANGE)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Sheets APIエラー (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]/g, "");
}

/**
 * Looks up a toilet's known size by brand/model in the reference Google
 * Sheet. Returns null when there's no matching row.
 */
export async function lookupToiletSize(brand: string, model: string): Promise<ToiletSize | null> {
  const rows = await fetchSheetRows();
  const targetModel = normalize(model);
  const targetBrand = normalize(brand);

  for (const row of rows) {
    const [rowBrand, rowModel, rowPartType, rowWidth, rowSecondDimension] = row;
    if (!rowBrand || !rowModel) continue;
    if (normalize(rowModel) !== targetModel) continue;
    const normalizedRowBrand = normalize(rowBrand);
    if (!normalizedRowBrand.includes(targetBrand) && !targetBrand.includes(normalizedRowBrand))
      continue;

    const widthMm = Number(rowWidth);
    if (!Number.isFinite(widthMm) || widthMm <= 0) continue;
    const secondDimensionMm = Number(rowSecondDimension);

    return {
      brand: rowBrand,
      model: rowModel,
      partType: rowPartType ?? "",
      widthMm,
      secondDimensionMm: Number.isFinite(secondDimensionMm) ? secondDimensionMm : 0,
    };
  }
  return null;
}
