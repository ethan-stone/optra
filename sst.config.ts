import { SSTConfig } from "sst";
import { SchedulerStack } from "./stacks/SchedulerStack";

export default {
  config(_input) {
    return {
      name: "optra",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(SchedulerStack);
  },
} satisfies SSTConfig;
