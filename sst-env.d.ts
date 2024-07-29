/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MessageDLQ: {
      type: "sst.aws.Queue"
      url: string
    }
    MessageQueue: {
      type: "sst.aws.Queue"
      url: string
    }
    SchedulerFailedDLQ: {
      type: "sst.aws.Queue"
      url: string
    }
  }
}
export {}
