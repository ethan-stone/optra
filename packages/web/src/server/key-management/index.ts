import { KMSClient } from "@aws-sdk/client-kms";
import { AWSKeyManagementService } from "./client";
import { env } from "@/env";
import { db } from "../db";

export const keyManagementService = new AWSKeyManagementService(
  new KMSClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  }),
  db,
  env.AWS_KMS_KEY_ARN,
);
