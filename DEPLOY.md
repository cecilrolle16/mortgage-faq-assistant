# Finish HomePath AI (Amazon Bedrock)

You already have the frontend, Lambda, Function URL (`NONE` auth), and a working Function URL. Finish with **three AWS steps**.

```
Browser  →  Lambda Function URL  →  Amazon Bedrock (Claude Haiku 4.5)  →  answer
```

Model ID used in code: `us.anthropic.claude-haiku-4-5-20251001-v1:0`

---

## Step 1: Redeploy Lambda code

1. Open `lambda/lambda_function.py` on your computer → Ctrl+A → Ctrl+C
2. AWS Console → **Lambda** → `homepath-mortgage-faq` → **Code**
3. Ctrl+A → Ctrl+V → **Deploy**
4. Confirm the file contains: `us.anthropic.claude-haiku-4-5-20251001-v1:0`
5. **Configuration** → **General configuration** → timeout **30 seconds**

---

## Step 2: One IAM policy (Bedrock + Marketplace)

This is the last Bedrock blocker. Claude on Bedrock needs Marketplace subscribe permission **and** invoke permission in **us-east-1 and us-east-2**.

1. Lambda → **Configuration** → **Permissions** → click role `homepath-mortgage-faq-role-8lciya1p`
2. **Add permissions** → **Create inline policy** → **JSON**
3. Paste the contents of `lambda/iam-policy.json`
4. Name: `BedrockClaudeHaiku45` → **Create policy**

Also confirm **Billing → Payment methods** has a default card (Marketplace needs this once).

**Subscribe the model once from the console (required for new accounts):**

1. Amazon Bedrock → **Model catalog** → **Claude Haiku 4.5**
2. Open **Playground / Chat**
3. Send: `What is a down payment?`
4. If a use-case / Marketplace prompt appears, accept it
5. Wait **2 minutes**

That first playground call enables the model for the whole account, including Lambda.

---

## Step 3: CORS for the website

The console cannot list `OPTIONS` (name is too long). Use `*` for methods.

**CloudShell** — paste this **one** command:

```bash
aws lambda update-function-url-config --region us-east-1 --function-name homepath-mortgage-faq --cors '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["content-type"]}'
```

Auth type must stay **NONE**.

---

## Step 4: Test

**A. Lambda Test tab** — event:

```json
{
  "question": "What credit score do I need for a conventional mortgage?"
}
```

Want: `"statusCode": 200` and an `"answer"`.

**B. CloudShell:**

```bash
curl -X POST "https://7cypdm64mhrvtd33czwwbvgfsi0fkkef.lambda-url.us-east-1.on.aws/" -H "Content-Type: application/json" -d '{"question": "What credit score do I need for a conventional mortgage?"}'
```

Want: `{"answer":"..."}` not `Forbidden` and not Marketplace errors.

**C. Website:** open `index.html` or `http://localhost:8080` → Ctrl+Shift+R → ask a question.

`script.js` already has your Function URL. Demo mode is off.

---

## Error cheat sheet

| error_detail contains | Do this |
|-----------------------|---------|
| Marketplace / Subscribe | Step 2 policy + playground subscribe + wait 2 min |
| not authorized InvokeModel us-east-2 | Use `lambda/iam-policy.json` (covers all regions) |
| inference profile | Keep `us.anthropic...` in Lambda code |
| Forbidden | Function URL Auth = NONE + public invoke permissions |
| Browser cannot reach server | Step 3 CORS `AllowMethods: ["*"]` then hard refresh |

---

## Public website URL (Amazon S3)

To give employers a link they can open in a browser (not GitHub):

1. AWS Console → **S3** → **Create bucket**
2. Name (must be unique): `homepath-faq-cecilrolle16`
3. Region: **us-east-1**
4. Uncheck **Block all public access** → acknowledge → Create
5. Open the bucket → **Upload** `index.html`, `style.css`, `script.js`
6. **Permissions** → **Bucket policy** → paste `lambda/s3-website-policy.json` with `REPLACE_BUCKET_NAME` changed to your bucket name
7. **Properties** → **Static website hosting** → Enable → Index document `index.html` → Save
8. Copy the **Bucket website endpoint** (starts with `http://`)

That URL is the public app. Get Answer still calls Lambda/Bedrock.

### HTTPS with CloudFront (optional)

1. Search **CloudFront** → **Create distribution**
2. **Origin domain:** `homepath-faq-cecilrolle16.s3.us-east-1.amazonaws.com` (pick the bucket from the list, not the website endpoint)
3. **Origin access:** Public (bucket is already public). Do **not** require Origin Access Control unless you follow extra OAC steps.
4. **Viewer protocol policy:** Redirect HTTP to HTTPS
5. **Allowed HTTP methods:** GET, HEAD
6. **Default root object:** `index.html`
7. **Web Application Firewall (WAF):** Do **not** enable (extra cost)
8. Create distribution and wait until status is **Enabled** (can take 5–15 minutes)
9. Use the **Distribution domain name**: `https://dxxxxxxxx.cloudfront.net`

Get Answer still calls the Lambda Function URL.

---

## Done when

- Lambda Test = 200 with a real Claude answer
- Website shows that answer (not a canned demo)
- Financial disclaimer still visible
