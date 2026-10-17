# HomePath AI — Build Journey

**Project:** AI Mortgage FAQ Assistant  
**Stack:** HTML, CSS, JavaScript, AWS Lambda, Amazon Bedrock (Claude Haiku 4.5)  
**Repo:** https://github.com/cecilrolle16/mortgage-faq-assistant

This document describes what I built, the problems I hit in AWS and with generative AI, and how I solved them.

---

## 1. Goal

Build a professional mortgage FAQ web app where a user types a home-financing question and receives an AI-generated answer. The AI had to live on **AWS**, not in the browser, so model access stayed on the server.

**End-to-end flow:**

```
User (browser)
  → POST JSON { "question": "..." }
  → AWS Lambda Function URL
  → Amazon Bedrock Runtime (Converse API)
  → Claude Haiku 4.5 (US inference profile)
  → { "answer": "..." }
  → UI (loading, errors, disclaimer)
```

---

## 2. What I built, in order

### Phase A — Frontend (no cloud yet)

I created a three-file client:

| File | Role |
|------|------|
| `index.html` | Structure: form, answer area, financial disclaimer |
| `style.css` | Mortgage/fintech UI, responsive layout |
| `script.js` | Validation, loading state, `fetch`, error handling |

**Demo mode:** While the API URL was a placeholder (`api.example.com`), the app did **not** call the network. It returned topic-based sample answers (down payment, credit score, FHA, etc.) so I could test UX first.

### Phase B — Serverless backend on AWS

I added:

- **AWS Lambda** (Python) as the API
- **Lambda Function URL** as the HTTPS endpoint (no API Gateway required for this learning project)
- **Amazon Bedrock** so the “brain” was Claude, not hardcoded text
- **IAM execution role** so Lambda could call Bedrock
- **CORS** so a browser on `localhost` or `file://` could call the Function URL

### Phase C — Ship it

I pushed the working code and a professional README to GitHub for employers.

---

## 3. AWS and AI concepts I used

| Term | What it meant on this project |
|------|-------------------------------|
| **IAM** | Identity and Access Management. Lambda does not use my login; it uses an **execution role**. |
| **Execution role** | The identity Lambda assumes (`homepath-mortgage-faq-role-...`) when it calls Bedrock. |
| **IAM user / root** | My console login. The Bedrock **playground** uses this identity, not the Lambda role. |
| **Amazon Bedrock** | AWS service that hosts foundation models (here, Anthropic Claude). |
| **Foundation model** | The base model ID, e.g. `anthropic.claude-haiku-4-5-20251001-v1:0`. |
| **Inference profile** | A routing ID Bedrock requires for on-demand Claude 4.5, e.g. `us.anthropic.claude-haiku-4-5-20251001-v1:0`. |
| **Converse API** | Bedrock’s chat-style API (`bedrock.converse`) used in Lambda. |
| **Function URL** | Public HTTPS URL that invokes Lambda with HTTP POST. |
| **Auth type NONE vs AWS_IAM** | `NONE` = browser can call it. `AWS_IAM` = requests must be SigV4-signed → browsers get **403 Forbidden**. |
| **Resource-based policy** | Who is allowed to **invoke** the Function URL (`lambda:InvokeFunctionUrl` / `lambda:InvokeFunction`). |
| **CORS** | Browser security. The page origin must be allowed to POST to the Function URL. |
| **AWS Marketplace subscribe** | First-time access to some Claude models requires `aws-marketplace:Subscribe` / `ViewSubscriptions`. |
| **CloudWatch Logs** | Where Lambda prints Bedrock errors (`error_code`, `error_detail`). |
| **502 vs 403 vs 400** | 403 = blocked before Lambda. 400 = bad request. 502 = Lambda ran, Bedrock failed. |

---

## 4. Challenges and how I overcame them

### Challenge 1 — No backend, but I needed to test the product

**Problem:** Bedrock was not connected yet. The UI would look broken if every submit failed.

**What I did:** Implemented **demo mode**. If `API_URL` was still the placeholder, JavaScript returned realistic mortgage copy after a short delay (simulated latency) and kept validation, loading, and errors.

**Takeaway:** Separate **product UX** from **cloud wiring**. Ship a testable UI first.

---

### Challenge 2 — Lambda test returned 502 (`ResourceNotFoundException` / use-case form)

**Problem:** Anthropic on Bedrock requires a **first-time use (FTU) / use-case details** form. The old “Model access” page is retired; the form lives under **Model catalog**.

**What I did:** Submitted Anthropic use-case details (educational mortgage FAQ, no PII). Waited, then retested.

**Takeaway:** Model access is **account policy**, not just application code.

---

### Challenge 3 — Legacy model (`Claude 3 Haiku` then “upgrade to an active model”)

**Problem:** The first model ID (`anthropic.claude-3-haiku-20240307-v1:0`) was **Legacy**. New accounts cannot invoke it.

**What I did:** Upgraded to **Claude Haiku 4.5** and the **US inference profile**:

`us.anthropic.claude-haiku-4-5-20251001-v1:0`

I learned to read `error_detail`, then search Lambda for `BEDROCK_MODEL_ID`, then match **Model catalog**.

**Takeaway:** On Bedrock, the **model ID is a contract**. Catalog “Active vs Legacy” matters as much as Python syntax.

---

### Challenge 4 — Inference profile required (`ValidationException`)

**Problem:** Invoking the **bare** Haiku 4.5 ID with on-demand throughput failed. Bedrock asked for an **inference profile** ID or ARN.

**What I did:** Prefixed the ID with `us.` and updated IAM so the role could invoke both:

- `foundation-model/anthropic.claude-haiku-4-5-...`
- `inference-profile/us.anthropic.claude-haiku-4-5-...`

**Takeaway:** Newer Claude models on `bedrock-runtime` often need a **geo/global inference profile**, not the raw foundation-model ID.

---

### Challenge 5 — 400 “Missing question” in the Lambda console

**Problem:** The default test event was not `{ "question": "..." }`. Function URL events wrap the body as a **string**. Empty or wrong JSON meant Lambda never saw a question.

**What I did:** Used a simple test event:

```json
{ "question": "What credit score do I need for a conventional mortgage?" }
```

I also supported both shapes in code: raw JSON and `event.body` as a string.

**Takeaway:** Console tests and browsers send **different event shapes**. Handlers must parse both.

---

### Challenge 6 — `AccessDeniedException` on `bedrock:InvokeModel` (wrong region)

**Problem:** IAM allowed `us-east-1`, but the US inference profile routed to **`us-east-2`**. The role was not allowed to invoke the model there.

**What I did:** Expanded the IAM `Resource` ARNs to the US regions the profile can route to (e.g. us-east-1, us-east-2, us-west-2) plus the inference-profile ARN.

**Takeaway:** Cross-Region inference means **IAM must follow the destination Region**, not only the Lambda Region.

---

### Challenge 7 — 403 Forbidden on the Function URL

**Problem:** `curl` and the website returned `{"Message":"Forbidden"}`. Lambda **code never ran**.

**Root cause:** Function URL **Auth type** was `AWS_IAM`. Unauthenticated browser/`curl` requests are rejected.

**What I did:**

1. Set Function URL auth to **`NONE`**
2. Added resource-based policy statements:
   - `lambda:InvokeFunctionUrl` with `FunctionUrlAuthType = NONE`
   - `lambda:InvokeFunction` with `lambda:InvokedViaFunctionUrl = true`

**Takeaway:** 403 on a Function URL is usually **auth + resource policy**, not Bedrock.

---

### Challenge 8 — Browser “Unable to reach the server” (CORS)

**Problem:** Lambda **Test** returned 200, but the website failed. Browsers enforce CORS; the Lambda console does not.

**What I did:**

- Enabled Function URL CORS (`AllowOrigin: *`)
- Set `AllowMethods` to `*` (the console cannot use the word `OPTIONS` — it exceeds a 6-character limit)
- Removed duplicate CORS headers from the Lambda response so the browser did not see conflicting `Access-Control-Allow-Origin` values

**Takeaway:** A 200 in the console does not prove the **browser** can call the API.

---

### Challenge 9 — Marketplace subscribe denied

**Problem:** Playground and Lambda returned:

`aws-marketplace:ViewSubscriptions` / `aws-marketplace:Subscribe` not authorized.

**What I did:**

1. Attached Marketplace actions to the **Lambda execution role**
2. Attached the same to **my IAM user** (playground uses the console identity, not Lambda)
3. Confirmed a payment method for Marketplace
4. Successfully invoked **Claude Haiku 4.5 in the playground**
5. Waited a few minutes, then Lambda returned real answers

**Takeaway:** First-time Claude access on Bedrock is often a **Marketplace subscription** plus IAM on **both** the human user and the service role.

---

### Challenge 10 — Syntax error after a bad paste (`'(' was never closed`)

**Problem:** A partial paste of `os.environ.get(` into the Lambda editor broke the function (`Runtime.UserCodeSyntaxError`).

**What I did:** Replaced the entire `lambda_function.py` from the local project and clicked **Deploy**, then confirmed the model ID in the console.

**Takeaway:** Console edits need a full replace + Deploy. Seeing code in the editor is not the same as the **published** version.

---

### Challenge 11 — Localhost refused to connect

**Problem:** `http://localhost:8080` failed (`ERR_CONNECTION_REFUSED`). Nothing was listening on port 8080.

**What I did:** Opened `index.html` directly. The live Function URL still served AI answers. A local static server is optional, not required, once CORS allows the page origin.

---

## 5. How I debugged (method I would use again)

1. Read **`statusCode`** (403 vs 400 vs 502 vs 200).
2. Read **`error_code`** and **`error_detail`** from Lambda (I added these to 502 responses).
3. Map the error to the layer:
   - 403 → Function URL / IAM resource policy  
   - 400 → request JSON  
   - 502 → Bedrock / IAM / model ID / Marketplace  
4. Fix **one layer**, then retest that layer before the website.
5. Only then test the browser (CORS).

---

## 6. Outcome

- Working UI with professional mortgage branding and a legal disclaimer  
- Live path: **browser → Lambda Function URL → Bedrock Converse → Claude Haiku 4.5**  
- IAM scoped to invoke the model and subscribe via Marketplace  
- GitHub repo with README for employers  

**Skills demonstrated:** serverless APIs, IAM (identity-based vs resource-based policies), generative AI on Bedrock, inference profiles, CORS, and systematic debugging of cloud errors.

---

## 7. Honest limits (good to say in an interview)

- Function URL auth is **NONE** (learning project). Production would add auth, throttling, and a tighter CORS origin.
- Answers are **educational**, not personalized financial advice.
- Model IDs and Marketplace rules change; I had to follow Bedrock errors instead of assuming one tutorial ID forever.
