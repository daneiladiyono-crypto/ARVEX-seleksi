# ARVEX FAMILY — Vercel deployment

## Deploy
1. Extract this ZIP.
2. Upload the project to a GitHub repository.
3. In Vercel, choose **Add New → Project**, import that repository.
4. Framework preset: **Other**. Build command and output directory can remain empty/default.
5. Deploy.

The site uses a Vercel Serverless Function at `/api/verify` to fetch a public TikTok profile and inspect its publicly rendered nickname. No user-supplied nickname field is present.

## Verification behavior
- Accepted if the fetched public display nickname contains `ARVEX` (including stylized Unicode forms), or `ft'AV`.
- The JOIN WhatsApp button is only shown after the server-side check passes.
- Private profiles, blocked requests, or TikTok markup changes may prevent nickname extraction. In those cases the site fails closed and asks the visitor to retry.

## Important limitation
This is automated rule-based nickname matching, not an AI identity/authenticity check. It does not prove account ownership and does not detect impersonation. TikTok does not provide a generally available public profile API for arbitrary profile nickname lookup; its website may block automated requests or change its page structure. For reliable production verification, use an authorized TikTok API/data provider or a human-admin fallback. Do not treat a successful nickname match as proof that the applicant is the account owner.

No API keys are required for this prototype.


## Troubleshooting: "Unexpected token ... is not valid JSON"
This means the browser received an HTML error page instead of the API's JSON response.
- Confirm `api/verify.js` is in the repository root's `api` folder (not nested inside another folder).
- Confirm the repository root also contains `index.html`, `public/`, `package.json`, and `vercel.json`.
- In Vercel Project → Settings → General, set Root Directory to `.` (repository root), then redeploy.
- After deployment, check Vercel → Functions and confirm `/api/verify` is listed.
