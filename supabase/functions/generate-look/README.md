# generate-look

Accepts a validated Studio selection and asks Gemini for structured cultural
copy, guardrails, a Gen Z tip and an image prompt. The function stores the job
in `generation_jobs` using the service-role key, which must only exist in the
Supabase function environment.

Required secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
GEMINI_TEXT_MODEL=gemini-2.0-flash
```

This function intentionally does not claim to generate a final image. The image
provider can consume the returned `imagePrompt` in a later job without exposing
Gemini credentials to the browser.
