import { SSTConfig } from "sst";
import { SchedulerStack } from "./stacks/SchedulerStack";
import { MessageQueueStack } from "./stacks/MessageQueueStack";

export default {
  config(_input) {
    return {
      name: "optra",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(MessageQueueStack);
    app.stack(SchedulerStack);
  },
} satisfies SSTConfig;
