import { randomBytes, webcrypto } from "crypto";

export function uid() {
  return randomBytes(10).toString("hex");
}

export function generateRandomName() {
  // Arrays of animals and colors
  const animals = ["Lion", "Tiger", "Bear", "Elephant", "Panther", "Giraffe"];
  const colors = ["Red", "Blue", "Green", "Yellow", "Purple", "Orange"];

  // Randomly select an animal and a color
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Generate a random six-digit number
  const number = Math.floor(Math.random() * 900000) + 100000;

  // Concatenate them to form the name
  return `${color}${animal}${number}`;
}

export function generateJsonObject(numKeys: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (let i = 0; i < numKeys; i++) {
    obj[`key-${i}`] = `value-${i}`;
  }

  return obj;
}

export async function encrypt(text: Uint8Array, key: Uint8Array) {
  const iv = webcrypto.getRandomValues(new Uint8Array(16));

  const importedKey = await crypto.subtle.importKey(
    "raw",
    key,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    importedKey,
    text
  );

  return { iv, encryptedData: new Uint8Array(encryptedData) };
}
