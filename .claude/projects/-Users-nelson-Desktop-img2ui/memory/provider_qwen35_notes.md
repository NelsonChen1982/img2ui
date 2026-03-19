---
name: qwen35-provider-notes
description: Qwen 3.5 35B-A3B works well for UI component recognition via OpenRouter, pricing notes
type: project
---

Qwen 3.5 35B-A3B via OpenRouter performs well for UI component CSS extraction tasks.

**Pricing:**
- qwen/qwen3.5-35b-a3b: $0.1625/M input, $1.30/M output (good quality)
- qwen/qwen3.5-flash-02-23: $0.065/M input, $0.26/M output (to be tested)

**Why:** Both are significantly cheaper than GPT-4o-mini ($0.15/$0.60) while Qwen 3.5 35B shows comparable quality for this use case.

**How to apply:** When evaluating provider costs or recommending defaults, consider Qwen 3.5 Flash as the cheapest viable option if testing confirms quality is acceptable.
