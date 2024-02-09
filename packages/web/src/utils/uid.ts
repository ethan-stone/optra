import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "2346789abcdefghijkmnpqrtwxyzABCDEFGHJKLMNPQRTUVWXYZ",
  26,
);

type Prefix =
  | "client"
  | "api"
  | "csk"
  | "ws"
  | "req"
  | "client_scope"
  | "api_scope"
  | "ssk"
  | "dek";

export function uid(prefix?: Prefix, length = 21): string {
  return prefix ? `${prefix}_${nanoid(length)}` : nanoid(length);
}
