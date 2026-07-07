# LIVE Quiz — AI Agent Instructions

Use this document to add quiz sets to the `/LIVE` game programmatically.
The agent should insert rows into two Supabase tables: `live_quiz_sets` and `live_questions`.

## Connection

- Project ref: `vybdoouamvxvxkjkrnyf`
- Base URL: `https://vybdoouamvxvxkjkrnyf.supabase.co`
- Use the **service role key** (server-side only, never in a browser) OR sign in as an admin user.
- REST endpoint: `POST https://vybdoouamvxvxkjkrnyf.supabase.co/rest/v1/<table>`
- Required headers:
  - `apikey: <SERVICE_ROLE_KEY>`
  - `Authorization: Bearer <SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`
  - `Prefer: return=representation`

## Schema

### `live_quiz_sets`
| Column        | Type      | Notes                             |
|---------------|-----------|-----------------------------------|
| `id`          | uuid      | auto (default `gen_random_uuid()`) |
| `name`        | text      | **required** — display name       |
| `description` | text      | optional                          |
| `created_by`  | uuid      | optional — admin user id          |
| `created_at`  | timestamp | auto                              |
| `updated_at`  | timestamp | auto                              |

### `live_questions`
| Column           | Type   | Notes                                              |
|------------------|--------|----------------------------------------------------|
| `id`             | uuid   | auto                                               |
| `quiz_set_id`    | uuid   | **required** — FK to `live_quiz_sets.id`           |
| `order_index`    | int    | **required** — 1..N, controls play order           |
| `question`       | text   | **required**                                       |
| `choice_a`..`d`  | text   | **required** — all four                            |
| `correct_choice` | text   | **required** — one of `A`, `B`, `C`, `D` (uppercase) |
| `prize_amount`   | bigint | $JC awarded at this rung; use prize-ladder values  |

### Recommended prize ladder (15 questions)
`25, 50, 100, 175, 250, 400, 650, 1000, 1500, 2250, 3250, 5000, 7500, 12000, 20000`

Quiz sets can have any length (not required to be 15).

## Workflow

1. **Create the quiz set** — insert one row into `live_quiz_sets`, capture the returned `id`.
2. **Insert questions** — insert N rows into `live_questions` with the captured `quiz_set_id`, `order_index` 1..N, and the answer set.
3. The new set appears immediately in the LIVE admin dropdown at `/LIVE`.

## Example (bash + curl)

```bash
SUPABASE_URL="https://vybdoouamvxvxkjkrnyf.supabase.co"
KEY="$SUPABASE_SERVICE_ROLE_KEY"

# 1) Create the quiz set
SET_ID=$(curl -s -X POST "$SUPABASE_URL/rest/v1/live_quiz_sets" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"name":"Crypto Basics #1","description":"Warm-up round"}' \
  | jq -r '.[0].id')

# 2) Insert questions (batch)
curl -s -X POST "$SUPABASE_URL/rest/v1/live_questions" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "[
    {\"quiz_set_id\":\"$SET_ID\",\"order_index\":1,\"question\":\"What is BTC?\",
     \"choice_a\":\"Bitcoin\",\"choice_b\":\"Bytecoin\",\"choice_c\":\"Bitcash\",\"choice_d\":\"Bitchain\",
     \"correct_choice\":\"A\",\"prize_amount\":25},
    {\"quiz_set_id\":\"$SET_ID\",\"order_index\":2,\"question\":\"Who created Bitcoin?\",
     \"choice_a\":\"Vitalik\",\"choice_b\":\"Satoshi Nakamoto\",\"choice_c\":\"Elon Musk\",\"choice_d\":\"Hal Finney\",
     \"correct_choice\":\"B\",\"prize_amount\":50}
  ]"
```

## Example (JavaScript / supabase-js)

```ts
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const { data: set } = await supabase
  .from("live_quiz_sets")
  .insert({ name: "Crypto Basics #1", description: "Warm-up round" })
  .select().single();

const questions = [
  { question: "What is BTC?", choice_a: "Bitcoin", choice_b: "Bytecoin",
    choice_c: "Bitcash", choice_d: "Bitchain", correct_choice: "A", prize_amount: 25 },
  // ...
].map((q, i) => ({ ...q, quiz_set_id: set.id, order_index: i + 1 }));

await supabase.from("live_questions").insert(questions);
```

## Validation rules (agent must enforce before insert)

- `correct_choice` must be exactly `A`, `B`, `C`, or `D` (uppercase).
- All of `question`, `choice_a`..`choice_d` must be non-empty strings.
- `order_index` must be unique per `quiz_set_id` and sequential from 1.
- `prize_amount` must be a non-negative integer.
- Prefer concise questions (< 200 chars) and choices (< 80 chars) for mobile display.

## Deleting / editing

- Update: `PATCH /rest/v1/live_questions?id=eq.<uuid>` with JSON body.
- Delete a set: delete children first (`DELETE /rest/v1/live_questions?quiz_set_id=eq.<uuid>`), then the set row.
