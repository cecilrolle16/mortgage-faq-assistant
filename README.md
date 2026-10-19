# HomePath AI — Mortgage FAQ Assistant

A mortgage FAQ web app on **AWS**. The UI is hosted on **Amazon S3** and delivered over **HTTPS with CloudFront**. Questions are answered by **Amazon Bedrock (Claude Haiku 4.5)** through **AWS Lambda**.

## Live demo (public)

**https://dn53i471y53k0.cloudfront.net**

Open that link, ask a mortgage question, and click **Get Answer**.

Example: *How much do I need for a down payment on an FHA loan?*

The UI includes loading state, error handling, a character count, mobile layout, and a financial disclaimer.

S3 origin (HTTP): http://homepath-faq-cecilrolle16.s3-website-us-east-1.amazonaws.com

## Architecture

```
Browser  (https://dn53i471y53k0.cloudfront.net)
        │
        ▼
Amazon CloudFront  →  Amazon S3  (index.html, style.css, script.js)
        │
        │  POST { "question": "..." }
        ▼
AWS Lambda Function URL
        │
        ▼
Amazon Bedrock  —  Claude Haiku 4.5
        │  us.anthropic.claude-haiku-4-5-20251001-v1:0
        ▼
{ "answer": "..." }
```

The browser never talks to Bedrock directly. Lambda’s IAM role invokes the model.

## Project files

| File | Role |
|------|------|
| `index.html` | Page structure |
| `style.css` | Fintech UI |
| `script.js` | Form, loading, errors, API call |
| `lambda/lambda_function.py` | Lambda handler → Bedrock Converse |
| `lambda/iam-policy.json` | IAM for Bedrock + Marketplace |
| `lambda/s3-website-policy.json` | Public-read policy for the S3 website |
| `DEPLOY.md` | AWS setup notes |

## AWS services used

- **Amazon S3** — static website files  
- **Amazon CloudFront** — HTTPS CDN in front of S3  
- **AWS Lambda** + **Function URL** — API  
- **Amazon Bedrock** — Claude Haiku 4.5  
- **IAM** — execution role and resource policies  

## Run locally

Double-click `index.html`, or serve the folder and open `http://localhost:8080`.

## Disclaimer

Answers are educational only. This is not a lender and does not provide financial, legal, or tax advice.
