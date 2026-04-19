# Validation Sprint — Setup and Interpretation Guide

## What you're doing

Running one script, solving one CAPTCHA on your phone, and getting a yes/no answer on whether the product thesis works.

## The three sub-questions we're validating

- **Q1:** Can we expose a cloud browser session so a phone can interact with it live?
- **Q2:** When a human solves the CAPTCHA in that live view, does the agent-side browser session register a valid token?
- **Q3:** Can the agent then complete the form submission using that token?

## Setup

### 1. Browserbase account

Sign up at https://www.browserbase.com. Free tier is sufficient. After signup:
1. Create a new project
2. Copy your API key and Project ID

### 2. Local project setup

    npm init -y
    npm install playwright-core @browserbasehq/sdk dotenv
    npm install -D typescript @types/node tsx

### 3. Create .env file

    BROWSERBASE_API_KEY=your_key_here
    BROWSERBASE_PROJECT_ID=your_project_id_here

### 4. Run

    npx tsx validate.ts

## What you'll do during the test

1. Run the script from your laptop
2. It prints a live-view URL in the terminal
3. Open that URL on your PHONE (not your laptop — that's the whole test)
4. Solve the hCaptcha challenge on your phone
5. Script detects the token, verifies it, prints PASS or FAIL

## Interpreting the result

### CORE THESIS CONFIRMED
The product is buildable. Proceed to wrapping this into an SDK with Telegram notifications and testing against real forms.

### CORE THESIS NOT CONFIRMED
Try twice more first. If three runs fail, the architecture needs rethinking. Possible alternatives: local agent with mobile notifications, browser extension, native desktop app.

### Errors
Usually setup issues (bad API key, wrong Node version, hit free tier limit). Fix and retry.

## What this does NOT validate

- hCaptcha behavior on real Greenhouse/production forms
- Notification flow speed in practice
- Token lifetime under real user conditions
- Failure modes (user ignores ping, solves wrong, etc.)

Those are v0.2 validations. This is just the yes/no on architecture feasibility.

## If the test passes, next moves

1. Run same test against a real Greenhouse form (change target URL)
2. Wrap in minimum SDK shape
3. Integrate into existing agent runner as CAPTCHA fallback
4. Apply to 10 jobs with it
