# Relay — Human Handoff Infrastructure for AI Agents

*Early-stage idea. Sharing for feedback, not pitching.*

---

## The problem

Autonomous agents are everywhere now — people use them for job applications, lead generation, research, personal automation, enterprise workflows. The agent ecosystem has exploded in the last eighteen months.

Every one of these agents hits the same wall: when the workflow requires a real human moment, automation breaks. CAPTCHA appears. An SMS 2FA code needs to be entered. A payment needs confirmation. An identity check pops up.

Today, the agent builder's options are:

1. Babysit the agent — defeats the point of automation
2. Skip the sites with human verification — cuts workflow coverage
3. Use a CAPTCHA solver service — violates terms of service, unreliable, and if detected, silently damages the user's reputation with the target system
4. Build custom handoff infrastructure themselves — tedious, and nobody wants to

None of these are good. The result is that autonomous agents today handle maybe 70% of real-world workflows fully, and fall apart on the last 30% — which includes most of the high-value tasks people actually want automated.

## The insight

The human is already willing to help. The problem isn't that CAPTCHAs or 2FA exist — those are there for good reasons. The problem is that the *handoff* to the human is terrible.

If a user is willing to spend ten seconds on their phone to solve a CAPTCHA or approve a payment, the rest of the automation can continue. The bottleneck isn't human availability — it's that there's no frictionless way to pull a human into exactly the moment they're needed, in the right context, with the right information.

## The product

**Relay** is a drop-in SDK for agent builders. One function call turns a CAPTCHA into a push notification:

    await relay.pauseForHuman({
      reason: 'captcha',
      timeout: '2m',
      notify: user,
    });
    // Agent resumes automatically when the human completes the step

Under the hood:

- Agent pauses when a CAPTCHA appears
- User gets a push notification with a live view of the exact page
- User solves the CAPTCHA in seconds
- Agent resumes with the completed state

The user never has to leave what they're doing. The agent never has to give up. The CAPTCHA gets solved by an actual human — which is what the verification was asking for in the first place.

This is *not* a CAPTCHA solver service. The human solving the verification is the same user the agent is acting on behalf of. The verification does exactly what it was designed to do: confirm a real human is present and responsible. What we change is the UX of that confirmation.

SMS/email OTP codes are explicitly out of scope — users can already handle those via text copy-paste without needing a live browser view.

## Initial focus

- **In scope for v0:** CAPTCHA handoff — the one verification type that can't be text-copied and requires visual interaction with the page
- **Out of scope:** SMS/email OTPs — text-copiable, users already handle these without tooling
- **Future scope:** Keyboard-input verifications (require custom event forwarding per Browserbase docs), other visual verifications (payment confirmations, biometric prompts, e-signature flows)

## Who I think the customer is

My best guess — genuinely still figuring this out:

**Primary (near-term):** Agent builders running web automation on sites that deploy CAPTCHA — job applications, CRM entry, form-heavy workflows. The canonical example is my own job application runner. They're technical enough to integrate an SDK, sharp enough to feel the pain of broken handoffs, and motivated enough to pay for infrastructure that unblocks real workflows.

**Secondary (medium-term):** Agent platforms and RPA tools. If Relay becomes the default way to handle human steps, platforms integrate it as a native feature.

**Tertiary (long-term):** End users of consumer agent products. As agents get more mainstream, the handoff experience will matter to non-technical users.

## Why this might work

- The agent wave is real and accelerating
- Current solutions are bad (solver services, manual babysitting, skipping sites)
- Defensible through execution speed and UX, not technical moat
- I am the customer — I'm building agents and running into this daily

## Why it might not work

- Market might be too small if most agent builders today are hobbyists
- Bigger players (Browserbase, Anchor) might absorb this as a feature
- Session-binding problem might be harder than it looks (that's what validation tests)
- Users might prefer slower fully-auto over faster sometimes-interactive

## Validation status

- **Q1 (cloud session + live-view URL):** CONFIRMED — Browserbase session creation and debug URL generation work reliably
- **Q2 (human-side solve propagates to agent session):**
  - **Desktop:** CONFIRMED — human solved hCaptcha in live-view browser, Playwright reconnected and read the token (2083-char JWT) from the same session
  - **Mobile:** PARTIAL — iframe wrapper approach loads session on mobile browsers successfully, but hCaptcha demo page served a drag-heavy challenge inappropriate for mobile touch. Testing against real production forms next to confirm the challenge distribution is the real-world bottleneck, not mobile interaction.
- **Q3 (token usable for submission):** Inferable from desktop Q2 pass — the token is a standard hCaptcha response token, structurally identical to what a direct solve produces
- **Mobile UX architecture:** Hosted iframe wrapper page with Browserbase's documented sandbox flags (`sandbox="allow-same-origin allow-scripts"`). Direct Browserbase debug URL doesn't work reliably on mobile browsers; the iframe wrapper does.

## What I'm doing now

1. Technical validation sprint to confirm the core architecture is buildable
2. Talking to a small number of people to see if the pain resonates
3. Scoping a 2-4 week MVP if the validation passes

## What I'd love feedback on

1. Is this pain real for you or people you know?
2. Who do you think the first 10 paying customers are?
3. What's the obvious thing I'm missing?
4. What would make you try this?
