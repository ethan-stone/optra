<p><a target="_blank" href="https://app.eraser.io/workspace/cnvjDJIj5YzCQRGmIwRX" id="edit-in-eraser-github-link"><img alt="Edit in Eraser" src="https://firebasestorage.googleapis.com/v0/b/second-petal-295822.appspot.com/o/images%2Fgithub%2FOpen%20in%20Eraser.svg?alt=media&amp;token=968381c8-a7e7-472a-8ed6-4a6626da5501"></a></p>

[﻿developer.okta.com/docs/guides/client-secret-rotation-key/main/#rotate-a-client-secret](https://developer.okta.com/docs/guides/client-secret-rotation-key/main/#rotate-a-client-secret) 

A client can have at most two secrets at a time. When choosing to rotate a secret, an expiration date can be chosen for the current secret, or it can expire immediately.

When a secret expires, the version of the client is incremented, thus invalidating any JWTs that are on the older version. A message should be published to all servers so they can remove cached clients, so the next time they are verified they can be freshly retrieved.


<!--- Eraser file: https://app.eraser.io/workspace/cnvjDJIj5YzCQRGmIwRX --->