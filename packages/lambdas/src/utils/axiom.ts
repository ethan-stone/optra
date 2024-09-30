import { Resource } from "sst";
import { Axiom } from "@axiomhq/js";

export type AxiomEvent = {
  message: string;
  error?: unknown;
  requestId: string;
  namespace: string;
  service: string;
  duration?: number | null;
  level: string;
  timestamp: number;
};

const client = new Axiom({
  token: Resource.AxiomApiKey.value,
  orgId: "personal-9cvj",
});

export async function sendEvents(dataset: string, events: AxiomEvent[]) {
  client.ingest(dataset, events);

  await client.flush();
}
