# Run these ONE AT A TIME in AWS CloudShell (us-east-1).
# Function: homepath-mortgage-faq

# 1) CORS: allow all methods (* includes browser preflight)
aws lambda update-function-url-config \
  --region us-east-1 \
  --function-name homepath-mortgage-faq \
  --cors '{"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["content-type"]}'

# 2) Attach full Bedrock + Marketplace policy to the Lambda role
aws iam put-role-policy \
  --role-name homepath-mortgage-faq-role-8lciya1p \
  --policy-name BedrockClaudeHaiku45 \
  --policy-document file://iam-policy.json

# If CloudShell does not have the JSON file, paste the policy inline instead:
# aws iam put-role-policy --role-name homepath-mortgage-faq-role-8lciya1p --policy-name BedrockClaudeHaiku45 --policy-document '{"Version":"2012-10-17","Statement":[{"Sid":"InvokeClaudeHaiku45","Effect":"Allow","Action":["bedrock:InvokeModel","bedrock:InvokeModelWithResponseStream","bedrock:Converse","bedrock:ConverseStream"],"Resource":["arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0","arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0"]},{"Sid":"MarketplaceSubscribeClaude","Effect":"Allow","Action":["aws-marketplace:ViewSubscriptions","aws-marketplace:Subscribe","aws-marketplace:Unsubscribe"],"Resource":"*"}]}'

# 3) Test the Function URL
curl -X POST "https://7cypdm64mhrvtd33czwwbvgfsi0fkkef.lambda-url.us-east-1.on.aws/" \
  -H "Content-Type: application/json" \
  -d '{"question": "What credit score do I need for a conventional mortgage?"}'
