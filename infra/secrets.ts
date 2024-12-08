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
  SupabaseUrl: new sst.Secret(
    "SupabaseUrl",
    "https://zkfacwibmxqkhnmgkviy.supabase.co"
  ),
  SupabaseAnonKey: new sst.Secret(
    "SupabaseAnonKey",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZmFjd2libXhxa2hubWdrdml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjEwMDc1MjAsImV4cCI6MjAzNjU4MzUyMH0.PzkTq9nKhIbgzQ0_p7PTybdmqDVRiaGgJg3wLzrI5Rk"
  ),
  SupabaseSecretKey: new sst.Secret("SupabaseSecretKey"),
  SupabaseWebhookSecret: new sst.Secret("SupabaseWebhookSecret"),
  SupabaseJwtSecret: new sst.Secret("SupabaseJwtSecret"),
};
