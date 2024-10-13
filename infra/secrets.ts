export const secrets = {
  AWSAccessKeyId: new sst.Secret("AWSAccessKeyId"),
  AWSSecretAccessKey: new sst.Secret("AWSSecretAccessKey"),
  StripeApiKey: new sst.Secret("StripeApiKey"),
  DbUrl: new sst.Secret("DbUrl"),
  AxiomApiKey: new sst.Secret("AxiomApiKey"),
  ClerkSecretKey: new sst.Secret("ClerkSecretKey"),
  ClerkPublishableKey: new sst.Secret(
    "ClerkPublishableKey",
    "pk_test_ZWFzeS1zYXR5ci02OS5jbGVyay5hY2NvdW50cy5kZXYk"
  ),
  OptraWorkspaceId: new sst.Secret(
    "OptraWorkspaceId",
    "ws_brMq3FFLJLj9QtzEG8CfR"
  ),
  OptraApiId: new sst.Secret("OptraApiId", "api_xQ7AJfrWQ939EVL7WGU9Y"),
};
