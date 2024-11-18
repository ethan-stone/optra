import { bucket } from "./bucket";

export const jwksCloudfront = new sst.aws.Router("JwksCloudfront", {
  routes: {
    "/*": bucket.domain.apply((domain) => `https://${domain}`),
  },
});

export const outputs = {
  JwksBaseUrl: jwksCloudfront.url,
};
