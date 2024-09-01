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
      "type": "sst.aws.ApiGatewayV2"
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
    "MessageDLQ": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "MessageQueue": {
      "type": "sst.aws.Queue"
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
