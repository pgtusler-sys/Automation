---
name: pipedrive-api-connection
description: Specifics for connecting to and calling the Pipedrive API (v1/v2) from n8n or any HTTP client — authentication, host choice, which API version to use per resource, ID discovery, field shapes, rate limits, and the silent-failure gotchas. Use when wiring up Pipedrive credentials, discovering stage/owner/field/label IDs, or debugging Pipedrive 4xx errors and "success-but-nothing-happened" writes.
---

# Pipedrive API Connection

Reference for talking to Pipedrive reliably. Verified against a live account (n8n, HTTP Request nodes).

## Authentication
Two valid methods — pick one and use it on **every** call:
- **`x-api-token` HEADER** (recommended): header name `x-api-token`, value = the API token. In n8n, a generic **Header Auth** credential named e.g. `Pipedrive x-api-token`.
- **`api_token` query param** OR n8n's predefined **`pipedriveApi`** credential type (HTTP Request node → Authentication: *Predefined Credential Type* → *Pipedrive API*). This appends `api_token` to the query automatically and works on arbitrary full URLs.
- Do **not** mix methods. The token belongs in the credential store, never hardcoded in a URL or committed.

## Host
- Company host: `https://{company}.pipedrive.com/api/v2` and `/api/v1`.
- **Global host (no subdomain needed): `https://api.pipedrive.com`** — works with the token (`/api/v2/...` and `/v1/...`). Use this to avoid hunting the company subdomain. Verified: `GET https://api.pipedrive.com/v1/users` and `/v1/stages` work via the predefined credential.

## API version per resource
- **v2** for: deals, persons, persons/search, dealFields, personFields, pipelines, stages.
- **v1 ONLY** for: **notes** (no v2 notes endpoint) and **users** (no v2 users list). The v1 sunset date is uncertain — build v2-first, use v1 only where required.

## ID discovery (do this first, before hardcoding anything)
Hit these and record the numeric IDs (a one-off "discovery" sub-flow is handy):
- **Stages:** `GET /v1/stages` (or `/api/v2/stages?pipeline_id=N`) → each `id` is a `stage_id`. **Stage names are NOT unique across pipelines** — always note the `pipeline_id`.
- **Pipelines:** `GET /api/v2/pipelines`.
- **Users (owners):** `GET /v1/users` → `id` = `owner_id`, plus `email` (build an email→id owner map; skip `active_flag:false`).
- **Custom fields + labels (tags):** `GET /v1/dealFields` (or `/api/v2/dealFields`). Custom fields are keyed by a **40-char hash**. The label field has `key: "label"` whose `options[]` give label `id`s (Pipedrive's "tags").

## Field shapes & write rules
- **v2 deal object:** `person_id`, `owner_id`, `pipeline_id`, `stage_id` are flat integers (v1 nested some of these as objects — v2 is flatter).
- **Owner:** v2 uses `owner_id` (v1 used `user_id`).
- **Stage change:** `PATCH /api/v2/deals/{id}` with `{ "stage_id": N }` **alone** — pipeline is inferred from the stage. Don't send pipeline_id unless creating.
- **Custom fields:** nested under `custom_fields`, keyed by the 40-char hash; enum/set values must be the **numeric option id**. ⚠️ A **wrong key returns `success:true` but SILENTLY no-ops** — always verify the write actually landed.
- **Labels are an array (`label_ids`) and PATCH REPLACES the whole array.** To add/remove: GET the deal → merge/filter the array → PATCH. Clear-all = `null` (an empty `[]` is rejected).
- **Create deal:** `POST /api/v2/deals` with `{ title (required), status:'open', pipeline_id, stage_id, person_id, owner_id }`.
- **Add note (v1):** `POST /v1/notes` with `{ content, deal_id and/or person_id }`.

## Rate limits
- Search API is the tightest (~10 req / 2s). Use the `x-ratelimit-reset` header to back off (NOT `Retry-After`). For burst-heavy flows, add **Retry On Fail** to the GET/lookup nodes so a 429 retries instead of silently returning empty.

## Common errors & what they mean
- **`403 / "Pipeline is not visible to the owner"`** — you set `owner_id` to a user who lacks access to that pipeline. Pipedrive rejects the whole request. Fix: don't assign that owner on that pipeline, or grant the user pipeline visibility in Pipedrive settings. Decouple owner from stage so a bad owner doesn't block the stage change.
- **`success:true` but the field didn't change** — almost always a wrong custom-field hash key (silent no-op) or a string sent where a numeric option id was required.
- **`Forbidden / Credentials not found` after import (n8n)** — the credential binding went stale on import; re-select the credential on the node.
- **422 from a downstream service complaining about `email`** — that's the *other* service (e.g. GHL), not Pipedrive; omit empty fields rather than sending `""`.

## Sanity-check pattern
After any write, read the response `data`: confirm `stage_id`/`owner_id`/`pipeline_id`/`custom_fields` actually reflect what you sent. Because of the silent-no-op behavior, "the call returned 200" is not proof the data changed.
