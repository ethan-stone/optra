/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "AWSAccessKeyId": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "AWSSecretAccessKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Api": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "DbUrl": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "JwksBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "LogHandler": {
      "name": string
      "type": "sst.aws.Function"
    }
    "MessageDLQ": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "MessageQueue": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "Router": {
      "type": "sst.aws.Router"
      "url": string
    }
    "SchedulerFailedDLQ": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "StripeApiKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "TinyBirdApiKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "TinyBirdGenerationsEndpoint": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "TinyBirdUrl": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "TinyBirdVerificationsEndpoint": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
export {}
