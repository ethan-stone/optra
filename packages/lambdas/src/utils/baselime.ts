import { Resource } from "sst";

export type BaselimeEvent = {
  message: string;
  requestId: string;
  namespace: string;
  service: string;
  duration?: number | null;
  level: string;
  timestamp: number;
};

export async function sendEvents(dataset: string, events: BaselimeEvent[]) {
  const res = await fetch("https://events.baselime.io/v1/" + dataset, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": Resource.BaselimeApiKey.value,
    },
    body: JSON.stringify(events),
  });

  if (!res.ok) {
    const json = await res.json();
    console.log(json);
    throw new Error("Failed to send events to Baselime");
  }
}
