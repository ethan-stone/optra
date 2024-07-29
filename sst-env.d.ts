/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    DbUrl: {
      type: "sst.sst.Secret"
      value: string
    }
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
    StripeApiKey: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}
