# HomePath AI — Mortgage FAQ Assistant

A mortgage-themed web app that answers home-financing questions using **Amazon Bedrock (Claude Haiku 4.5)** behind **AWS Lambda**.

Built as a full-stack cloud project: static frontend, serverless API, IAM-secured model access, and a public Function URL.

## Demo

Open `index.html` in a browser (or serve the folder locally) and ask:

> How much do I need for a down payment on an FHA loan?

The UI includes loading state, error handling, character count, mobile layout, and a financial disclaimer.

## Architecture

```
Browser (HTML / CSS / JS)
        │  POST { "question": "..." }
        ▼
AWS Lambda Function URL  (auth: NONE, CORS enabled)
        │
        ▼
Amazon Bedrock  —  Claude Haiku 4.5
        │  US inference profile: us.anthropic.claude-haiku-4-5-20251001-v1:0
        ▼
{ "answer": "..." }
```

Bedrock is never called from the browser. The API key stays on the server (Lambda IAM role).

## Project files

| File | Role |
|------|------|
| `index.html` | Page structure |
| `style.css` | Fintech UI |
| `script.js` | Form, loading, errors, API call |
| `lambda/lambda_function.py` | Lambda handler → Bedrock Converse |
| `lambda/iam-policy.json` | IAM policy for Bedrock + Marketplace |
| `DEPLOY.md` | AWS setup notes |

If `API_URL` in `script.js` is still the placeholder, the app uses a local demo mode (no network). With a real Function URL, it calls Bedrock.

## Run locally

Double-click `index.html`, or from this folder:

```powershell
# Python (if installed)
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Skills shown

- HTML, CSS, and JavaScript (fetch, validation, UX states)
- AWS Lambda + Function URLs
- Amazon Bedrock (Claude) with inference profiles
- IAM least-privilege policies and Marketplace model access
- CORS for a browser calling a public API

## Disclaimer

Answers are educational only. This is not a lender and does not provide financial, legal, or tax advice.
