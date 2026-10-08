import { createSign } from "node:crypto";

// ---------------------------------------------------------------------------
// Looks up a toilet's known size in a Google Sheet, by brand/model. Auth is a
// standard service-account JWT bearer flow: sign a short-lived JWT with the
// service account's private key, exchange it for an access token, call the
// Sheets API with that token. No external Google SDK needed — both calls are
// plain REST.
//
// SHEET_RANGE/column order below is a best guess (Brand | Model | WidthMm |
// DepthMm | HeightMm) — correct it once the real sheet's layout is confirmed.
// ---------------------------------------------------------------------------

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEET_RANGE = "Sheet1!A2:E";

export type ToiletSize = {
  brand: string;
  model: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
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
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON の形式が不正です(client_email/private_keyが必要です)。");
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
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
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
    const [rowBrand, rowModel, rowWidth, rowDepth, rowHeight] = row;
    if (!rowBrand || !rowModel) continue;
    if (normalize(rowModel) !== targetModel) continue;
    const normalizedRowBrand = normalize(rowBrand);
    if (!normalizedRowBrand.includes(targetBrand) && !targetBrand.includes(normalizedRowBrand)) continue;

    const widthMm = Number(rowWidth);
    const depthMm = Number(rowDepth);
    const heightMm = Number(rowHeight);
    if (![widthMm, depthMm, heightMm].every((n) => Number.isFinite(n) && n > 0)) continue;

    return { brand: rowBrand, model: rowModel, widthMm, depthMm, heightMm };
  }
  return null;
}
