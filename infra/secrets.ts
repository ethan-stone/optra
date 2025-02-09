export const secrets = {
  AWSAccessKeyId: new sst.Secret("AWSAccessKeyId"),
  AWSSecretAccessKey: new sst.Secret("AWSSecretAccessKey"),
  StripeApiKey: new sst.Secret("StripeApiKey"),
  StripeProProductId: new sst.Secret("StripeProProductId"),
  StripeVerificationsProductId: new sst.Secret("StripeVerificationsProductId"),
  StripeGenerationsProductId: new sst.Secret("StripeGenerationsProductId"),
  DbUrl: new sst.Secret("DbUrl"),
  AxiomApiKey: new sst.Secret("AxiomApiKey"),
  OptraWorkspaceId: new sst.Secret(
    "OptraWorkspaceId",
    "ws_QWXkVkdcXjZTqKTBGyX94"
  ),
  OptraApiId: new sst.Secret("OptraApiId", "api_iZyhmhx6HLtaqdkq7qmQ7"),
  ClerkSecretKey: new sst.Secret("ClerkSecretKey"),
  ClerkPublishableKey: new sst.Secret(
    "ClerkPublishableKey",
    "pk_test_ZWFzeS1zYXR5ci02OS5jbGVyay5hY2NvdW50cy5kZXYk"
  ),
};
