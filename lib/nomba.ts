/**
 * lib/nomba.ts
 * Nomba Payment Gateway client library.
 * Handles OAuth token caching, checkout order creation and transaction verification.
 *
 * Environment variables required:
 *   NOMBA_BASE_URL      — e.g. https://sandbox.nomba.com (sandbox) or https://api.nomba.com (prod)
 *   NOMBA_CHECKOUT_PATH — e.g. /v1/checkout  (order endpoint: BASE_URL + CHECKOUT_PATH + /order)
 *   NOMBA_CLIENT_ID     — OAuth client ID from Nomba dashboard
 *   NOMBA_CLIENT_SECRET — OAuth client secret (or "Private Key") from Nomba dashboard
 *   NOMBA_ACCOUNT_ID    — Account ID from Nomba dashboard
 */

const BASE_URL = process.env.NOMBA_BASE_URL || "https://sandbox.nomba.com";
const CHECKOUT_PATH = process.env.NOMBA_CHECKOUT_PATH || "/v1/checkout";
const CLIENT_ID = process.env.NOMBA_CLIENT_ID!;
const CLIENT_SECRET = process.env.NOMBA_CLIENT_SECRET!;
const ACCOUNT_ID = process.env.NOMBA_ACCOUNT_ID!;

interface TokenCache {
  access_token: string;
  refresh_token: string;
  expiresAt: number; // ms timestamp
}

// Module-level token cache (survives across requests within the same worker)
let _tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Refresh 5 minutes before expiry (as recommended by Nomba docs)
  if (_tokenCache && _tokenCache.expiresAt - now > 5 * 60 * 1000) {
    return _tokenCache.access_token;
  }

  // Try refresh token first to avoid exposing client_secret repeatedly
  if (_tokenCache?.refresh_token && _tokenCache.expiresAt - now <= 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(_tokenCache.access_token, _tokenCache.refresh_token);
      if (refreshed) return refreshed;
    } catch {
      // Fall through to full re-auth
    }
  }

  // Full re-authentication
  const res = await fetch(`${BASE_URL}/v1/auth/token/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accountId": ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const json = await res.json();
  if (json.code !== "00") {
    throw new Error(`Nomba auth failed: ${json.description}`);
  }

  const expiresAt = new Date(json.data.expiresAt).getTime();
  _tokenCache = {
    access_token: json.data.access_token,
    refresh_token: json.data.refresh_token || "",
    expiresAt,
  };
  return json.data.access_token;
}

async function refreshAccessToken(currentToken: string, refreshToken: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/v1/auth/token/refresh`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${currentToken}`,
      "Content-Type": "application/json",
      "accountId": ACCOUNT_ID,
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const json = await res.json();
  if (json.code !== "00") return null;

  const expiresAt = new Date(json.data.expiresAt).getTime();
  _tokenCache = {
    access_token: json.data.access_token,
    refresh_token: json.data.refresh_token || refreshToken,
    expiresAt,
  };
  return json.data.access_token;
}

export interface CreateOrderParams {
  orderReference: string;
  amount: number; // in Naira
  customerEmail: string;
  callbackUrl: string;
}

export interface CreateOrderResult {
  checkoutLink: string;
  orderReference: string;
}

/**
 * Create a Nomba hosted checkout order.
 * Returns the checkoutLink to redirect the customer to.
 * Endpoint: POST BASE_URL + CHECKOUT_PATH + /order
 */
export async function createCheckoutOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}${CHECKOUT_PATH}/order`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "accountId": ACCOUNT_ID,
    },
    body: JSON.stringify({
      order: {
        orderReference: params.orderReference,
        amount: params.amount.toFixed(2),
        currency: "NGN",
        customerEmail: params.customerEmail,
        callbackUrl: params.callbackUrl,
      },
    }),
  });

  const json = await res.json();
  if (json.code !== "00") {
    throw new Error(`Nomba create order failed: ${json.description}`);
  }

  return {
    checkoutLink: json.data.checkoutLink,
    orderReference: json.data.orderReference,
  };
}

export interface VerifyTransactionResult {
  success: boolean;
  statusCode: string;
  transactionId?: string;
  paymentReference?: string;
  paymentMethod?: string; // 'card_payment' | 'bank_transfer'
  amount?: number;
}

/**
 * Verify a transaction using the order reference or transaction ID.
 * Always call this server-side before confirming a booking.
 * Uses GET BASE_URL/v1/transactions/accounts/single or the checkout transaction endpoint.
 */
export async function verifyTransaction(
  orderReference: string,
  transactionId?: string,
): Promise<VerifyTransactionResult> {
  const token = await getAccessToken();

  // Prefer transactionId lookup (more precise) if provided
  if (transactionId) {
    try {
      const res = await fetch(
        `${BASE_URL}/v1/transactions/accounts/single?transactionRef=${encodeURIComponent(transactionId)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "accountId": ACCOUNT_ID,
          },
        },
      );
      const json = await res.json();
      if (json.code === "00" && json.data?.status === "SUCCESS") {
        return {
          success: true,
          statusCode: json.data.status,
          transactionId,
          paymentMethod: json.data.type,
          amount: json.data.transactionAmount
            ? parseFloat(json.data.transactionAmount)
            : undefined,
        };
      }
    } catch {
      // Fall through to orderReference lookup
    }
  }

  // Fallback: look up by orderReference via checkout transaction endpoint
  const res = await fetch(
    `${BASE_URL}${CHECKOUT_PATH}/transaction?idType=orderReference&id=${encodeURIComponent(orderReference)}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "accountId": ACCOUNT_ID,
      },
    },
  );

  const json = await res.json();
  if (json.code !== "00") {
    return { success: false, statusCode: json.description || "FAILED" };
  }

  const txDetails = json.data?.transactionDetails;
  const order = json.data?.order;

  return {
    success: json.data?.success === true,
    statusCode: txDetails?.statusCode || "",
    transactionId: txDetails?.transactionId,
    paymentReference: txDetails?.paymentReference,
    paymentMethod: order?.paymentMethod,
    amount: order?.amount ? parseFloat(order.amount) : undefined,
  };
}

/**
 * Verify the HMAC-SHA256 signature from Nomba webhook headers.
 * Builds the canonical hash payload from the webhook event fields.
 * Returns true if the computed signature matches the Nomba-provided signature.
 */
export function verifyWebhookSignature(
  payload: string,
  secret: string,
  nombaSignature: string,
  nombaTimestamp: string,
  webhookData: Record<string, any>,
): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");

    const merchant = webhookData?.data?.merchant || {};
    const transaction = webhookData?.data?.transaction || {};

    const eventType = webhookData?.event_type || "";
    const requestId = webhookData?.requestId || "";
    const userId = merchant?.userId || "";
    const walletId = merchant?.walletId || "";
    const transactionId = transaction?.transactionId || "";
    const transactionType = transaction?.type || "";
    const transactionTime = transaction?.time || "";
    let responseCode = transaction?.responseCode || "";
    if (responseCode === "null") responseCode = "";

    const hashPayload = `${eventType}:${requestId}:${userId}:${walletId}:${transactionId}:${transactionType}:${transactionTime}:${responseCode}:${nombaTimestamp}`;

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(hashPayload);
    const computed = hmac.digest("base64");

    return computed.toLowerCase() === nombaSignature.toLowerCase();
  } catch {
    return false;
  }
}
