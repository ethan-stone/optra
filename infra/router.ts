import { apiFn } from "./api";

export const router = new sst.aws.Router("Router", {
  routes: {
    "/*": apiFn.url,
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
