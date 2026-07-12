/**
 * HomePath AI — Mortgage FAQ Assistant
 *
 * API_URL — set to your AWS Lambda Function URL when the backend is deployed.
 * While API_URL is still the placeholder below, the app runs in DEMO_MODE and
 * returns locally generated sample answers (no network request).
 */

const PLACEHOLDER_API_URL = "https://api.example.com/mortgage-faq";

// Paste your AWS Lambda Function URL here after deploying (see DEPLOY.md).
// Example: "https://abc123.lambda-url.us-east-1.on.aws/"
const API_URL = "https://7cypdm64mhrvtd33czwwbvgfsi0fkkef.lambda-url.us-east-1.on.aws/";

/** Temporary: true until API_URL points at the live AWS Lambda endpoint. */
const DEMO_MODE = API_URL === PLACEHOLDER_API_URL;

/** Simulated latency in demo mode so the loading state feels realistic. */
const DEMO_DELAY_MS = 1200;

const form = document.getElementById("faq-form");
const questionInput = document.getElementById("question-input");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const charCount = document.getElementById("char-count");
const errorBanner = document.getElementById("error-message");
const errorText = errorBanner.querySelector(".error-banner__text");
const loadingState = document.getElementById("loading-state");
const answerSection = document.getElementById("answer-section");
const answerContent = document.getElementById("answer-content");

const MAX_LENGTH = 1000;

questionInput.addEventListener("input", () => {
  const length = questionInput.value.length;
  charCount.textContent = `${length} / ${MAX_LENGTH}`;
  charCount.style.color =
    length > MAX_LENGTH * 0.9 ? "var(--color-error-text)" : "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await handleSubmit();
});

clearBtn.addEventListener("click", resetForm);

async function handleSubmit() {
  hideError();
  hideAnswer();

  const question = questionInput.value.trim();

  if (!question) {
    showError("Please enter a mortgage question before submitting.");
    questionInput.focus();
    return;
  }

  if (question.length < 10) {
    showError("Please provide a more detailed question (at least 10 characters).");
    questionInput.focus();
    return;
  }

  setLoading(true);

  try {
    const answer = await fetchAnswer(question);
    displayAnswer(answer);
  } catch (error) {
    showError(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
}

async function fetchAnswer(question) {
  // DEMO_MODE — remove this branch once AWS Lambda is connected.
  if (DEMO_MODE) {
    return fetchDemoAnswer(question);
  }

  return fetchLiveAnswer(question);
}

/**
 * Temporary demo responses until AWS Lambda is wired up.
 * Matches common mortgage topics by keyword; falls back to a general answer.
 */
async function fetchDemoAnswer(question) {
  await delay(DEMO_DELAY_MS);
  return generateDemoAnswer(question);
}

async function fetchLiveAnswer(question) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = "";
      try {
        const body = await response.json();
        detail = body.message || body.error || "";
      } catch {
        /* response body is not JSON */
      }
      throw new ApiError(
        detail || `Server returned an error (${response.status}).`,
        response.status
      );
    }

    const data = await response.json();

    if (!data.answer && !data.response) {
      throw new ApiError("The server returned an empty response. Please try again.");
    }

    return data.answer || data.response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("The request timed out. Please check your connection and try again.");
    }
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        "Browser blocked the request (usually CORS). In AWS, update your Function URL CORS to allow POST and OPTIONS from your origin, then hard-refresh the page."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function generateDemoAnswer(question) {
  const q = question.toLowerCase();

  if (matchesTopic(q, ["down payment", "downpayment", "how much to put down"])) {
    return buildDemoResponse(question, [
      "Most conventional loans require a minimum down payment of 3% to 5% for qualified borrowers, though putting down 20% lets you avoid private mortgage insurance (PMI).",
      "FHA loans typically require 3.5% down with a credit score of 580 or higher. VA and USDA loans may offer 0% down for eligible buyers.",
      "A larger down payment reduces your monthly payment and total interest paid over the life of the loan. Consider your savings, emergency fund, and closing costs when deciding how much to put down.",
    ]);
  }

  if (matchesTopic(q, ["credit score", "credit rating", "fico", "minimum credit"])) {
    return buildDemoResponse(question, [
      "For a conventional mortgage, most lenders look for a credit score of 620 or higher. Scores of 740+ typically qualify for the best interest rates.",
      "FHA loans are more flexible — you may qualify with a score as low as 580 (3.5% down) or even 500 (10% down), depending on the lender.",
      "Before applying, review your credit report for errors, pay down high balances, and avoid opening new credit accounts. Even a small score improvement can save thousands over the loan term.",
    ]);
  }

  if (matchesTopic(q, ["interest rate", "rates", "apr", "how much will i pay"])) {
    return buildDemoResponse(question, [
      "Mortgage rates change daily based on the economy, Federal Reserve policy, and your personal profile — credit score, down payment, loan type, and property location all factor in.",
      "As a rough reference, a 30-year fixed-rate mortgage for a well-qualified borrower might range from the low 6% to mid 7% range, but your actual rate will differ. Always get a personalized Loan Estimate from a lender.",
      "You can lower your rate by improving your credit, choosing a shorter loan term, paying discount points, or making a larger down payment. Comparing offers from at least three lenders is one of the best ways to save.",
    ]);
  }

  if (matchesTopic(q, ["refinanc", "refi", "lower my payment", "cash out"])) {
    return buildDemoResponse(question, [
      "Refinancing replaces your current mortgage with a new one — usually to get a lower rate, shorten the term, or tap home equity (cash-out refinance).",
      "A good rule of thumb: refinancing may be worthwhile if you can lower your rate by at least 0.5% to 1% and plan to stay in the home long enough to recoup closing costs (often 2–5 years).",
      "You'll need to re-qualify based on income, credit, and home value. An appraisal is typically required. Compare the new monthly payment, total interest, and closing costs before deciding.",
    ]);
  }

  if (matchesTopic(q, ["fha", "va loan", "usda", "government loan"])) {
    return buildDemoResponse(question, [
      "Government-backed loans help buyers who may not qualify for conventional financing. FHA loans are popular with first-time buyers and require as little as 3.5% down.",
      "VA loans offer 0% down and no PMI for eligible veterans and active-duty service members. USDA loans provide 0% down for qualifying properties in designated rural areas.",
      "These programs have specific eligibility rules, property requirements, and upfront fees (e.g., FHA mortgage insurance). A lender experienced with your loan type can walk you through the details.",
    ]);
  }

  if (matchesTopic(q, ["closing cost", "closing fee", "how much to close"])) {
    return buildDemoResponse(question, [
      "Closing costs typically range from 2% to 5% of the loan amount and cover appraisal, title insurance, lender fees, prepaid taxes, and escrow setup.",
      "On a $300,000 home, expect roughly $6,000 to $15,000 in closing costs. Your Loan Estimate and Closing Disclosure will itemize every fee.",
      "Some costs are negotiable, and sellers may agree to pay a portion. Lender credits can offset fees in exchange for a slightly higher rate. Budget for closing costs in addition to your down payment.",
    ]);
  }

  if (matchesTopic(q, ["pmi", "private mortgage insurance", "mortgage insurance"])) {
    return buildDemoResponse(question, [
      "PMI is required on conventional loans when you put less than 20% down. It protects the lender — not you — if you default. PMI typically costs 0.5% to 1.5% of the loan amount per year.",
      "You can request PMI removal once you reach 20% equity based on the original value, or it may cancel automatically at 22% equity on a conventional loan.",
      "FHA loans use MIP (Mortgage Insurance Premium) instead, which often lasts for the life of the loan unless you refinance. VA loans do not require PMI.",
    ]);
  }

  if (matchesTopic(q, ["pre-approv", "preapprov", "pre qualif", "get approved"])) {
    return buildDemoResponse(question, [
      "Pre-approval is a lender's conditional commitment to loan you a specific amount based on a review of your credit, income, assets, and debts. It's stronger than pre-qualification and shows sellers you're a serious buyer.",
      "The process usually takes 1–3 business days and requires documents such as pay stubs, W-2s, tax returns, and bank statements.",
      "Pre-approval letters are typically valid for 60–90 days. Shop around — multiple credit inquiries for mortgage shopping within a 14–45 day window usually count as a single inquiry on your credit report.",
    ]);
  }

  return buildDemoResponse(question, [
    "That's a great question. Mortgage terms depend on your credit profile, income, down payment, property type, and the loan program you choose.",
    "In general, start by checking your credit score, calculating what you can afford (including taxes, insurance, and HOA fees), and getting pre-approved with a licensed lender.",
    "For personalized guidance on your situation, speak with a mortgage loan officer who can review your finances and recommend the best path forward.",
  ]);
}

function buildDemoResponse(question, paragraphs) {
  const intro = `Regarding your question — "${question}" — here's a helpful overview:\n\n`;
  return intro + paragraphs.join("\n\n");
}

function matchesTopic(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function displayAnswer(text) {
  answerContent.innerHTML = formatAnswer(text);
  answerSection.hidden = false;
  answerSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function formatAnswer(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p>${escapeHtml(text)}</p>`;
  }

  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  questionInput.disabled = isLoading;
  submitBtn.classList.toggle("btn--loading", isLoading);
  loadingState.hidden = !isLoading;
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.hidden = false;
}

function hideError() {
  errorBanner.hidden = true;
  errorText.textContent = "";
}

function hideAnswer() {
  answerSection.hidden = true;
  answerContent.innerHTML = "";
}

function resetForm() {
  questionInput.value = "";
  charCount.textContent = `0 / ${MAX_LENGTH}`;
  charCount.style.color = "";
  hideError();
  hideAnswer();
  questionInput.focus();
}

function getErrorMessage(error) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return "Something went wrong. Please try again in a moment.";
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
