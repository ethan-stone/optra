<!--- Eraser file: https://app.eraser.io/workspace/cnvjDJIj5YzCQRGmIwRX --->

[﻿developer.okta.com/docs/guides/client-secret-rotation-key/main/#rotate-a-client-secret](https://developer.okta.com/docs/guides/client-secret-rotation-key/main/#rotate-a-client-secret)

A client can have at most two secrets at a time. When choosing to rotate a secret, an expiration date can be chosen for the current secret, or it can expire immediately.

When a secret expires, the version of the client is incremented, thus invalidating any JWTs that are on the older version. A message should be published to all servers so they can remove cached clients, so the next time they are verified they can be freshly retrieved.
