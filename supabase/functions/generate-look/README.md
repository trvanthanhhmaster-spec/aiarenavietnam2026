# generate-look

Creates a persisted `generation_jobs` record, asks Gemini for the approved
cultural copy and versioned image prompt, generates four portrait variants
through the configured Gemini image model, stores them in the private
`generated-lookbooks` Storage bucket and returns signed 24-hour URLs.

`GET /functions/v1/generate-look?jobId=<id>` returns the sanitized job status
and output. The browser never receives a provider key or a service-role key.

Required Edge Function secrets:

```text
GEMINI_API_KEY
GEMINI_TEXT_MODEL=gemini-2.0-flash
GEMINI_IMAGE_MODEL=imagen-3.0-generate-002
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase's
managed Edge Function environment. The function validates all selections
against the active catalog before creating an image job.
