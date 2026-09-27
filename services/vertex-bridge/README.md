# V-Remix Vertex bridge

This Cloud Run service calls Vertex AI with its attached service account and
ADC. It exists because the project organization policy blocks downloadable
service-account keys, while Veo requires OAuth/ADC rather than the Agent
Platform API key flow.

Required runtime variables:

```text
GOOGLE_CLOUD_PROJECT=ai-arena-vietnam-2026
GOOGLE_CLOUD_VIDEO_LOCATION=us-central1
BRIDGE_SHARED_SECRET=<random value>
```

The attached service account needs the `Agent Platform User`
(`roles/aiplatform.user`) role. Deploy with the service account
`v-remix-runtime@ai-arena-vietnam-2026.iam.gserviceaccount.com`.
