# Deploy HomePath AI to AWS (Manual Guide)

This guide walks you through deploying the **Lambda backend** with **Amazon Bedrock (Claude)** and connecting it to your frontend.

**Time:** ~20–30 minutes  
**Cost:** Pay-per-use (Bedrock + Lambda). Claude Haiku is low cost for FAQ-style questions.

---

## What you're building

```
Browser (index.html + script.js)
        │
        │  POST { "question": "..." }
        ▼
Lambda Function URL
        │
        ▼
Amazon Bedrock (Claude Haiku)
        │
        ▼
{ "answer": "..." }  →  shown on the page
```

---

## Prerequisites

- [ ] AWS account ([aws.amazon.com](https://aws.amazon.com))
- [ ] Credit card on file (free tier may apply, but Bedrock is billed per use)
- [ ] Region: **US East (N. Virginia) `us-east-1`** recommended (best Bedrock model availability)

---

## Step 1: Enable Claude in Bedrock

1. Sign in to the [AWS Console](https://console.aws.amazon.com)
2. Search for **Amazon Bedrock**
3. Go to **Model catalog** → find **Claude Haiku 4.5** (active model)
4. If prompted, **Submit use case details** (one-time Anthropic form for new accounts)

> **Note:** Claude 3 Haiku is legacy — new accounts cannot use it. This project uses **Claude Haiku 4.5** (`anthropic.claude-haiku-4-5-20251001-v1:0`).

---

## Step 2: Create the Lambda function

1. Search for **Lambda** in the AWS Console
2. Click **Create function**
3. Settings:
   - **Author from scratch**
   - **Function name:** `homepath-mortgage-faq`
   - **Runtime:** `Python 3.12`
   - **Architecture:** `x86_64`
4. Under **Permissions**, expand **Change default execution role**
   - Create a new role with basic Lambda permissions
5. Click **Create function**

---

## Step 3: Paste the Lambda code

1. Open the `lambda/lambda_function.py` file from this project
2. Copy **all** of the code
3. In the Lambda console, open the **Code** tab
4. Replace the contents of `lambda_function.py` with your copied code
5. Click **Deploy**

---

## Step 4: Give Lambda permission to call Bedrock

1. In your Lambda function, go to **Configuration** → **Permissions**
2. Click the **Role name** (opens IAM in a new tab)
3. Click **Add permissions** → **Create inline policy**
4. Click **JSON** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0"
      ]
    }
  ]
}
```

5. Click **Next**
6. **Policy name:** `BedrockInvokeClaudeHaiku`
7. Click **Create policy**

> If you use a different region, replace `us-east-1` in the ARN with your region.

---

## Step 5: Adjust Lambda settings

1. Go to **Configuration** → **General configuration** → **Edit**
   - **Timeout:** `30` seconds (Bedrock can take a few seconds)
   - **Memory:** `256` MB (or `512` MB for slightly faster cold starts)
2. Save

---

## Step 6: Test in the Lambda console

1. Go to the **Test** tab
2. Create a new test event:
   - **Event name:** `MortgageQuestion`
   - Paste the contents of `lambda/test-event.json` from this project
3. Click **Test**
4. You should see **statusCode: 200** and an `answer` in the response body

If you get an access error, double-check Step 1 (model access) and Step 4 (IAM policy).

---

## Step 7: Create a Function URL (so the browser can call it)

1. Go to **Configuration** → **Function URL** → **Create function URL**
2. Settings:
   - **Auth type:** `NONE` (public URL — fine for a learning project; add auth later for production)
   - **Configure cross-origin resource sharing (CORS):**
     - Allow origin: `*`
     - Allow methods: `POST`
     - Allow headers: `Content-Type`
3. Click **Save**
4. **Copy the Function URL** — it looks like:
   ```
   https://abcdefghij.lambda-url.us-east-1.on.aws/
   ```

---

## Step 8: Connect the frontend

1. Open `script.js` in this project
2. Replace the placeholder with your Function URL:

```javascript
const API_URL = "https://YOUR-FUNCTION-URL.lambda-url.us-east-1.on.aws/";
```

3. Save the file
4. Open `index.html` in your browser (or use a local server)
5. Ask a question — you should get a **real AI answer** from Bedrock (demo mode turns off automatically)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error in browser | Re-check Function URL CORS settings (Step 7). Hard-refresh the page (Ctrl+Shift+R). |
| `AccessDeniedException` on Bedrock | Enable Claude Haiku in Bedrock model access (Step 1) and verify IAM policy (Step 4). |
| `502` / "Unable to generate an answer" | Check **CloudWatch Logs** (Lambda → Monitor → View logs) for the exact error. |
| Still seeing demo answers | Make sure `API_URL` in `script.js` is your real URL, not `api.example.com`. |
| Request timeout | Increase Lambda timeout to 30s (Step 5). |

---

## Optional: Custom model or region

In Lambda → **Configuration** → **Environment variables**, add:

| Key | Value |
|-----|-------|
| `BEDROCK_MODEL_ID` | e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| `AWS_REGION` | e.g. `us-east-1` |

Update the IAM policy Resource ARN to match the model and region.

---

## Security note (for later)

This setup uses a **public** Function URL for simplicity. Before going to production:

- Add API Gateway with throttling
- Restrict CORS to your domain only
- Add API keys or AWS WAF
- Never expose secrets in frontend code (Bedrock is called only from Lambda — good)

---

## You're done when…

- [ ] Lambda test returns a real answer
- [ ] `script.js` has your Function URL
- [ ] The website shows AI answers (not demo placeholder text)
- [ ] Loading spinner and error messages still work
