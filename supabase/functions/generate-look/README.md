# generate-look

Creates a persisted `generation_jobs` record and supports `image`, `video` and
`both` output modes. Gemini produces the approved cultural copy and versioned
visual prompt. The image model creates up to four portrait variants
sequentially so a provider concurrency limit does not discard an otherwise
usable first look. Veo starts a long-running video operation that is resumed by
the job status endpoint. Final assets are stored in the private
`generated-lookbooks` Storage bucket and returned as signed 24-hour URLs.

`GET /functions/v1/generate-look?jobId=<id>` returns the sanitized job status
and output. A request can also be resumed with
`GET /functions/v1/generate-look?requestId=<clientRequestId>`. Every POST
requires a UUID `clientRequestId`; retries with the same value resolve to the
same database job instead of starting another provider request. Uploaded image
bytes are used in memory and are not persisted inside `generation_jobs.input`.
The browser never receives a provider key or a service-role key.

For `generationType=both`, the image lookbook is stored before Veo starts. A
Veo provider or Storage failure is recorded in `output.videoError` while the
usable image job completes successfully.

Vertex AI configuration, used to charge the linked Google Cloud project:

```text
GOOGLE_AI_PROVIDER=vertex
GOOGLE_VIDEO_PROVIDER=vertex
GOOGLE_VERTEX_API_KEY
GOOGLE_CLOUD_PROJECT=ai-arena-vietnam-2026
GOOGLE_CLOUD_LOCATION=global
GOOGLE_CLOUD_VIDEO_LOCATION=us-central1
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GEMINI_VIDEO_MODEL=veo-3.1-fast-generate-001
VERTEX_VIDEO_BRIDGE_URL
VERTEX_VIDEO_BRIDGE_SECRET
```

Gemini Developer API fallback:

```text
GOOGLE_VIDEO_PROVIDER=gemini
GEMINI_API_KEY
GEMINI_TEXT_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GEMINI_VIDEO_MODEL=veo-3.1-generate-preview
```

The Gemini Developer API video route uses API-key authentication, but it
requires Gemini API billing/prepaid balance. Google Cloud credits attached to
the Vertex project do not automatically fund that separate Gemini API balance.
When `GOOGLE_VIDEO_PROVIDER` is omitted, video follows `GOOGLE_AI_PROVIDER`
and the deployed project uses the Vertex bridge.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase's
managed Edge Function environment. The function validates all selections
against the active catalog before creating an image job.
