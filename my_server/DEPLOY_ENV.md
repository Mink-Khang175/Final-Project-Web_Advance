# Backend Environment Setup (Deploy)

## 1) Required environment variables
Set these in your deployment platform (Vercel/Render/Railway), not in GitHub:

- `MONGODB_URI` (required)
- `GEMINI_API_KEY` (required if using AI chat)
- `ALLOWED_ORIGINS` (recommended)

Useful optional variables:

- `MONGODB_ADMIN_URI`
- `PORT` (local or non-serverless deploy)
- `GEMINI_MODEL`
- `GEMINI_API_VERSION`
- `GEMINI_TIMEOUT_MS`

## 2) Copy local template
For local development:

```bash
# macOS/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Then fill real values in `.env`.

## 3) Vercel deploy notes
- Keep `vercel.json` as-is (`index.js` is serverless entry)
- Do not use localhost in `ALLOWED_ORIGINS` for production
- Add your frontend domain(s), comma-separated

Example:

```env
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://yourname.github.io
```

## 4) Health check
After deploy, verify:

- `GET /api/health`

Expected JSON contains:

- `success: true`
- `status: "ok"`
