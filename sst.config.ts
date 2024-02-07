import { SSTConfig } from "sst";
import { SchedulerStack } from "./stacks/SchedulerStack";
import { MessageQueueStack } from "./stacks/MessageQueueStack";
import { ParametersStack } from "./stacks/ParametersStack";

export default {
  config(_input) {
    return {
      name: "optra",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ParametersStack);
    app.stack(MessageQueueStack);
    app.stack(SchedulerStack);
  },
} satisfies SSTConfig;
