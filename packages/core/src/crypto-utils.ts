import { webcrypto } from "crypto";

export async function hashSHA256(data: string): Promise<string> {
  const text = new TextEncoder().encode(data);

  const hashed = await crypto.subtle.digest(
    {
      name: "SHA-256",
    },
    text
  );

  const buffer = new Uint8Array(hashed);

  return buffer.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, "0"),
    ""
  );
}

export type JwtPayload = {
  sub: string;
  iat: number;
  exp: number;
  version: number;
  secret_expires_at?: number | undefined | null;
  metadata?: Record<string, unknown> | undefined | null;
  scope?: string | undefined | null;
};

/**
 * @typedef JwtAlgorithm
 * @type {'ES256' | 'ES384' | 'ES512' | 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512'}
 */

const algorithms = {
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: { name: "SHA-256" } },
  ES384: { name: "ECDSA", namedCurve: "P-384", hash: { name: "SHA-384" } },
  ES512: { name: "ECDSA", namedCurve: "P-521", hash: { name: "SHA-512" } },
  HS256: { name: "HMAC", hash: { name: "SHA-256" } },
  HS384: { name: "HMAC", hash: { name: "SHA-384" } },
  HS512: { name: "HMAC", hash: { name: "SHA-512" } },
  RS256: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
  RS384: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-384" } },
  RS512: { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-512" } },
} as const;

/**
 * @typedef JwtAlgorithms
 */
export type JwtAlgorithms = typeof algorithms;

export type JwtAlgorithm = keyof JwtAlgorithms;

type SubtleCryptoImportKeyAlgorithm = JwtAlgorithms[keyof JwtAlgorithms];

type JsonWebKey = webcrypto.JsonWebKey;
type CryptoKey = webcrypto.CryptoKey;

/**
 * @typedef JwtHeader
 * @prop {string} [typ] Type
 */
export type JwtHeader = {
  /**
   * Type (default: `"JWT"`)
   *
   * @default "JWT"
   */
  typ: "JWT";
  kid: string;
};

/**
 * @typedef JwtOptions
 * @prop {JwtAlgorithm | string} algorithm
 */
export type JwtOptions = {
  algorithm: JwtAlgorithm;
};

/**
 * @typedef JwtSignOptions
 * @extends JwtOptions
 * @prop {JwtHeader} [header]
 */
export type JwtSignOptions = {
  header: JwtHeader;
} & JwtOptions;

/**
 * @typedef JwtVerifyOptions
 * @extends JwtOptions
 * @prop {boolean} [throwError=false] If `true` throw error if checks fail. (default: `false`)
 */
export type JwtVerifyOptions = {
  /**
   * If `true` throw error if checks fail. (default: `false`)
   *
   * @default false
   */
  throwError?: boolean;
} & JwtOptions;

/**
 * @typedef JwtData
 * @prop {JwtHeader} header
 * @prop {JwtPayload} payload
 */
export type JwtData = {
  header?: JwtHeader;
  payload?: JwtPayload;
};

function bytesToByteString(bytes: Uint8Array): string {
  let byteStr = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    byteStr += String.fromCharCode(bytes[i] as number);
  }
  return byteStr;
}

function byteStringToBytes(byteStr: string): Uint8Array {
  let bytes = new Uint8Array(byteStr.length);
  for (let i = 0; i < byteStr.length; i++) {
    bytes[i] = byteStr.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64String(arrayBuffer: ArrayBuffer): string {
  return btoa(bytesToByteString(new Uint8Array(arrayBuffer)));
}

function base64StringToArrayBuffer(b64str: string): ArrayBuffer {
  return byteStringToBytes(atob(b64str)).buffer;
}

function textToArrayBuffer(str: string): ArrayBuffer {
  return byteStringToBytes(decodeURI(encodeURIComponent(str)));
}

// @ts-ignore
function arrayBufferToText(arrayBuffer: ArrayBuffer): string {
  return bytesToByteString(new Uint8Array(arrayBuffer));
}

function arrayBufferToBase64Url(arrayBuffer: ArrayBuffer): string {
  return arrayBufferToBase64String(arrayBuffer)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlToArrayBuffer(b64url: string): ArrayBuffer {
  return base64StringToArrayBuffer(
    b64url.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
  );
}

function textToBase64Url(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBinary(pem: string): ArrayBuffer {
  return base64StringToArrayBuffer(
    pem.replace(/-+(BEGIN|END).*/g, "").replace(/\s/g, "")
  );
}

async function importTextSecret(
  key: string,
  algorithm: SubtleCryptoImportKeyAlgorithm
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    textToArrayBuffer(key),
    algorithm,
    true,
    ["verify", "sign"]
  );
}

async function importJwk(
  key: JsonWebKey,
  algorithm: SubtleCryptoImportKeyAlgorithm
): Promise<CryptoKey> {
  return await crypto.subtle.importKey("jwk", key, algorithm, true, [
    "verify",
    "sign",
  ]);
}

async function importPublicKey(
  key: string,
  algorithm: SubtleCryptoImportKeyAlgorithm
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "spki",
    pemToBinary(key),
    algorithm,
    true,
    ["verify"]
  );
}

async function importPrivateKey(
  key: string,
  algorithm: SubtleCryptoImportKeyAlgorithm
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "pkcs8",
    pemToBinary(key),
    algorithm,
    true,
    ["sign"]
  );
}

async function importKey(
  key: string | JsonWebKey,
  algorithm: SubtleCryptoImportKeyAlgorithm
): Promise<CryptoKey> {
  if (typeof key === "object") return importJwk(key, algorithm);

  if (typeof key !== "string") throw new Error("Unsupported key type!");

  if (key.includes("PUBLIC")) return importPublicKey(key, algorithm);

  if (key.includes("PRIVATE")) return importPrivateKey(key, algorithm);

  return importTextSecret(key, algorithm);
}

function decodePayload<T = any>(raw: string): T | undefined {
  try {
    return JSON.parse(atob(raw));
  } catch {
    return;
  }
}

/**
 * Signs a payload and returns the token
 *
 * @param {JwtPayload} payload The payload object. To use `nbf` (Not Before) and/or `exp` (Expiration Time) add `nbf` and/or `exp` to the payload.
 * @param {string | JsonWebKey} secret A string which is used to sign the payload.
 * @param {JwtSignOptions | JwtAlgorithm | string} [options={ algorithm: 'HS256', header: { typ: 'JWT' } }] The options object or the algorithm.
 * @throws {Error} If there's a validation issue.
 * @returns {Promise<string>} Returns token as a `string`.
 */
export async function sign(
  payload: JwtPayload,
  secret: string | JsonWebKey,
  options: JwtSignOptions
): Promise<string> {
  if (!payload || typeof payload !== "object")
    throw new Error("payload must be an object");

  if (!secret || (typeof secret !== "string" && typeof secret !== "object"))
    throw new Error("secret must be a string or a JWK object");

  const algorithm: SubtleCryptoImportKeyAlgorithm =
    algorithms[options.algorithm];

  if (!algorithm) throw new Error("algorithm not found");

  if (!payload.iat) payload.iat = Math.floor(Date.now() / 1000);

  const partialToken = `${textToBase64Url(JSON.stringify({ ...options.header, alg: options.algorithm }))}.${textToBase64Url(
    JSON.stringify(payload)
  )}`;

  const key = await importKey(secret, algorithm);
  const signature = await crypto.subtle.sign(
    algorithm,
    key,
    textToArrayBuffer(partialToken)
  );

  return `${partialToken}.${arrayBufferToBase64Url(signature)}`;
}

export const InvalidReason = {
  BAD_JWT: "BAD_JWT",
  MISSING_SCOPES: "MISSING_SCOPES",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  EXPIRED: "EXPIRED",
  RATELIMIT_EXCEEDED: "RATELIMIT_EXCEEDED",
  SECRET_EXPIRED: "SECRET_EXPIRED",
  VERSION_MISMATCH: "VERSION_MISMATCH",
  INVALID_CLIENT: "INVALID_CLIENT",
} as const;

/**
 * Verifies the integrity of the token and returns a boolean value.
 *
 * @param {string} token The token string generated by `jwt.sign()`.
 * @param {string | JsonWebKey} secret The string which was used to sign the payload.
 * @param {JWTVerifyOptions | JWTAlgorithm} options The options object or the algorithm.
 * @throws {Error | string} Throws an error `string` if the token is invalid or an `Error-Object` if there's a validation issue.
 * @returns {Promise<boolean>} Returns `true` if signature, `nbf` (if set) and `exp` (if set) are valid, otherwise returns `false`.
 */
export async function verify(
  token: string,
  secret: string | JsonWebKey,
  options: JwtVerifyOptions
): Promise<
  { valid: true } | { valid: false; reason: keyof typeof InvalidReason }
> {
  if (typeof token !== "string") throw new Error("token must be a string");

  if (typeof secret !== "string" && typeof secret !== "object")
    throw new Error("secret must be a string or a JWK object");

  const tokenParts = token.split(".");

  if (tokenParts.length !== 3)
    return { valid: false, reason: InvalidReason.BAD_JWT };

  const algorithm: SubtleCryptoImportKeyAlgorithm =
    algorithms[options.algorithm];

  if (!algorithm) throw new Error("algorithm not found");

  const { payload } = decode(token);

  try {
    if (!payload) throw new Error("PARSE_ERROR");

    if (payload.exp && payload.exp <= Math.floor(Date.now() / 1000))
      return { valid: false, reason: InvalidReason.EXPIRED };

    const key = await importKey(secret, algorithm);

    const valid = await crypto.subtle.verify(
      algorithm,
      key,
      base64UrlToArrayBuffer(tokenParts[2] as string),
      textToArrayBuffer(`${tokenParts[0]}.${tokenParts[1]}`)
    );

    return valid
      ? { valid: true }
      : { valid: false, reason: InvalidReason.INVALID_SIGNATURE };
  } catch (err) {
    throw err;
  }
}

/**
 * Returns the payload **without** verifying the integrity of the token. Please use `jwt.verify()` first to keep your application secure!
 *
 * @param {string} token The token string generated by `jwt.sign()`.
 * @returns {JwtData} Returns an `object` containing `header` and `payload`.
 */
export function decode(token: string): JwtData {
  return {
    header: decodePayload(
      (token.split(".")[0] as string).replace(/-/g, "+").replace(/_/g, "/")
    ),
    payload: decodePayload<JwtPayload>(
      (token.split(".")[1] as string).replace(/-/g, "+").replace(/_/g, "/")
    ),
  };
}

export default {
  sign,
  verify,
  decode,
};
