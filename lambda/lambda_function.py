"""
HomePath AI — Mortgage FAQ Lambda
Calls Amazon Bedrock (Claude) to answer mortgage questions.

Deploy via AWS Console — see DEPLOY.md in the project root.
"""

import json
import os
import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Use the US inference profile (required for Haiku 4.5 on Bedrock).
# Override via Lambda env var BEDROCK_MODEL_ID if needed.
BEDROCK_MODEL_ID = os.environ.get(
    "BEDROCK_MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0"
)
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

SYSTEM_PROMPT = """You are HomePath AI, a professional mortgage FAQ assistant.

Rules:
- Answer mortgage and home-financing questions clearly in 2–4 short paragraphs.
- Cover topics like down payments, credit scores, rates, loan types (FHA, VA, USDA, conventional), refinancing, PMI, closing costs, and pre-approval.
- Use plain language a first-time homebuyer can understand.
- Provide general educational information only — never personalized financial, legal, or tax advice.
- Do not guarantee rates, approval, or specific loan terms.
- When appropriate, suggest speaking with a licensed mortgage professional.
- Do not invent specific lender names, NMLS numbers, or current rate quotes."""

# Function URL CORS is configured in AWS — only set Content-Type here to avoid
# duplicate Access-Control-* headers (which browsers reject).
RESPONSE_HEADERS = {
    "Content-Type": "application/json",
}

bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)


def lambda_handler(event, context):
    try:
        method = _get_http_method(event)

        if method == "OPTIONS":
            return _response(200, {"ok": True})

        if method != "POST":
            return _response(405, {"error": "Method not allowed. Use POST."})

        question = _parse_question(event)
        if not question:
            return _response(400, {"error": "Missing or empty 'question' field."})

        if len(question) < 10:
            return _response(
                400,
                {"error": "Question is too short. Please provide at least 10 characters."},
            )

        if len(question) > 1000:
            return _response(400, {"error": "Question must be 1000 characters or fewer."})

        answer = _ask_bedrock(question)
        return _response(200, {"answer": answer})

    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON in request body."})
    except ClientError as err:
        error_code = err.response.get("Error", {}).get("Code", "Unknown")
        error_message = err.response.get("Error", {}).get("Message", str(err))
        print(f"Bedrock ClientError: {error_code} - {error_message}")
        return _response(502, {
            "error": "Unable to generate an answer right now. Please try again.",
            "error_code": error_code,
            "error_detail": error_message,
        })
    except BotoCoreError as err:
        print(f"Bedrock BotoCoreError: {err}")
        return _response(502, {
            "error": "Unable to generate an answer right now. Please try again.",
            "error_detail": str(err),
        })
    except Exception as err:
        print(f"Unexpected error: {err}")
        return _response(500, {"error": "Something went wrong. Please try again."})


def _get_http_method(event):
    """Supports Lambda Function URL and API Gateway event shapes."""
    if "requestContext" in event and "http" in event["requestContext"]:
        return event["requestContext"]["http"].get("method", "POST")
    return event.get("httpMethod", "POST")


def _parse_question(event):
    body = event.get("body", event)
    if isinstance(body, str):
        body = json.loads(body) if body else {}
    if not isinstance(body, dict):
        return ""
    return str(body.get("question", "")).strip()


def _ask_bedrock(question):
    payload = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": question}],
    }

    result = bedrock.invoke_model(
        modelId=BEDROCK_MODEL_ID,
        body=json.dumps(payload),
        contentType="application/json",
        accept="application/json",
    )

    response_body = json.loads(result["body"].read())
    content = response_body.get("content", [])

    if not content:
        raise ValueError("Empty response from Bedrock")

    return content[0].get("text", "").strip()


def _response(status_code, payload):
    return {
        "statusCode": status_code,
        "headers": RESPONSE_HEADERS,
        "body": json.dumps(payload),
    }
