import crypto from "crypto";

export function hashSHA256(data: string) {
  // Creating a hash object
  const hash = crypto.createHash("sha256");

  // Updating the data to hash with the input string
  hash.update(data);

  // Calculating the hash (digest) of the data
  // 'hex' means the output will be formatted as a hexadecimal string
  const digest = hash.digest("hex");

  return digest;
}
