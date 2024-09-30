import { apiFn } from "./api";
import { bucket } from "./bucket";

const defaultSite = new sst.aws.StaticSite("DefaultSite", {
  path: "packages/default-route",
});

export const router = new sst.aws.Router("Router", {
  routes: {
    "/*": defaultSite.url,
    "/api/*": apiFn.url,
    "/jwks/*": bucket.domain.apply((domain) => `https://${domain}`),
  },
  transform: {
    cachePolicy: {
      comment:
        "Router caching policy. Caching is completely disabled for the router.",
      name: "Router-Caching-Disabled",
      maxTtl: 0,
      minTtl: 0,
      defaultTtl: 0,
      parametersInCacheKeyAndForwardedToOrigin: {
        cookiesConfig: {
          cookieBehavior: "none",
        },
        headersConfig: {
          headerBehavior: "none",
        },
        queryStringsConfig: {
          queryStringBehavior: "none",
        },
        enableAcceptEncodingBrotli: false,
        enableAcceptEncodingGzip: false,
      },
    },
  },
});

export const outputs = {
  RouterUrl: router.url,
};
