# Static resource revalidation

Verified locally on 2026-10-21.

The authenticated Tasks and calendar JavaScript, CSS and license routes now return SHA-256 ETags. Digests are calculated once per immutable module asset per Worker isolate. Matching If-None-Match values return an empty 304 response; stale validators return current content. HEAD returns headers without a body. Authentication still runs before conditional handling. Responses remain private and must revalidate, with Cookie/Authorization variance; HTML and API caching are unchanged.

Four JS/CSS response bodies total 2,308,892 bytes uncompressed (local gzip estimate: 580,109 bytes; production compression was not measured). Matching conditional requests return 0 body bytes, excluding response headers. This improves warm-cache transfers; first-load payload size, parsing and execution are unchanged. No wall-clock speedup is claimed.

Validation: all 205 Node tests pass. Integration checks cover six asset paths, weak/list validators, stale validators, HEAD, and unauthenticated requests with a valid ETag. Existing functional tests remain green. Deployment has not been performed for this change.
