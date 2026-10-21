# guccigrace — Gemma + Supabase

Retro Hacktoberfest-inspired medicine literacy website with patient and pharmacist portals.

## 1. Run the website in GitHub Codespaces

```bash
cd guccigrace
cp config.example.js config.js # skip if already present
python3 -m http.server 3000
```

Open **Ports → 3000 → Open in Browser**. The public landing page works immediately. Auth, inventory, scans, chatbot and voice AI require setup below.

## 2. Set up Supabase

1. Create a project at https://supabase.com/dashboard.
2. In **SQL Editor**, run the full contents of `supabase/schema.sql` once.
3. Open **Project Settings / API Keys** (or Connect), copy **Project URL** and **publishable/anon key**.
4. Edit `config.js` and replace both placeholders. These two values are intended for frontend use; **never put service_role or secret API keys in this file**.
5. In **Authentication → URL Configuration**, set Site URL to your actual development URL and add your Codespaces forwarded URL(s) under redirect URLs. For local use, add `http://localhost:3000` as appropriate. Codespaces URLs vary.
6. Email confirmation is enabled by default on many projects. Verify your email after sign-up. If you change authentication settings, understand the security tradeoffs.
7. For a real production app, pharmacist role must be **verified by an administrator**. This demo uses a self-selected role and must not be treated as professional verification.

## 3. Deploy Gemma 4 Edge Function

The server-side function uses an **OpenAI-compatible chat completions API** from a provider that actually hosts your desired Gemma 4 model **with vision support**. Not all Gemma endpoints accept images or use this protocol. Confirm your provider's API docs and model ID. No model or provider is falsely assumed.

Install/login to Supabase CLI (or use an environment with it installed):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy gemma-assistant
supabase secrets set GEMMA_API_KEY='YOUR_PRIVATE_API_KEY'
supabase secrets set GEMMA_MODEL='YOUR_PROVIDER_GEMMA_4_MODEL_ID'
supabase secrets set GEMMA_API_URL='https://YOUR_PROVIDER/OPENAI_COMPATIBLE_CHAT_COMPLETIONS_ENDPOINT'
```

The function automatically uses Supabase's provided `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables. Do not add the Gemma key to frontend JavaScript, `.env` committed to Git, or the browser. Keep JWT verification enabled for the function.

**Important:** the configured endpoint must accept chat-completions messages with `image_url` data URLs for the image scanner. Text chat may work even if your Gemma provider does not support images. Check model vision capability.

## 4. Feature checklist

- Landing page and role selection
- Supabase email/password signup and login
- Patient scan UI, private scan history, Gemma image analysis
- Patient Gemma chatbot
- Patient voice input via Web Speech API and read-aloud via SpeechSynthesis (browser support varies)
- Pharmacist inventory create/read/update/delete with RLS, search, low-stock and expiry alerts
- Responsive UI

## Security and clinical limitations

- **Prototype, not a clinical or pharmacy production system.** AI can hallucinate, misread images or omit critical information. Never rely on generated dosages or medicine identification for treatment decisions.
- Images are sent to your selected external Gemma API provider. Obtain informed user consent and check provider data handling and applicable health privacy requirements before processing real patient information. No image is saved to Supabase Storage by this prototype; scan **text** is saved in `scan_history`.
- Edge Function CORS currently allows any origin; restrict this to your own domain before production.
- Add rate limiting, abuse protection, logging hygiene, secure retention/deletion controls, accessibility review, and clinical review before public release.
- Voice recognition may use browser/vendor speech services; obtain consent and explain privacy implications.
- The current demo does not validate pharmacist credentials. Production must include independent verification and an administrator-controlled role assignment.
- This prototype does not offer a direct pharmacist messaging service; only inventory tools.
