You are improving the CORE PROMPTING AND GENERATION LOGIC for an internal tool that converts image-to-UI analysis results into reusable AI Skills.

Important:
This task is NOT about polishing one generated SKILL file.
This task is about redesigning the generator's internal logic so that future generated SKILLs are better by default.

Use the principles from Anthropic's “Lessons from Building Claude Code: How We Use Skills” as the design reference for the generator architecture.

## Objective

Refactor the generator so it no longer treats a skill as “just a markdown output”.
Instead, the generator should treat a skill as a modular system that may include:

- SKILL.md
- references/
- assets/
- scripts/
- config.json
- optional stable data/logging suggestions

The generator must become better at deciding:
- what belongs in SKILL.md
- what should be split into references
- what should become reusable assets
- when helper scripts are worth generating
- when config/setup is required
- how to write a trigger-oriented description
- how to derive gotchas from likely model failure points

## Required Design Changes

### 1. Redefine the generator's concept of a skill
The generator must no longer assume the output is a single prompt-like markdown file.
It should generate structured skills when appropriate.

### 2. High-signal content filtering
The generator should avoid filling SKILL.md with obvious frontend knowledge.
It should prioritize:
- ambiguity resolution
- non-obvious interpretation rules
- repeated model mistakes
- project-specific constraints
- edge cases
- failure-prevention guidance

### 3. Mandatory gotcha extraction logic
The generator should infer likely gotchas from image-to-UI workflows, such as:
- spacing misreads
- incorrect grouping
- wrong hierarchy
- responsive misinterpretation
- over-decoration
- incorrect component mapping
- layout rigidity
These gotchas should be first-class outputs, not optional extras.

### 4. Progressive disclosure logic
The generator should decide when to move content out of SKILL.md into:
- references/ui-rules.md
- references/layout.md
- references/components.md
- assets/templates/*
- scripts/*
SKILL.md should stay concise and high-signal.

### 5. Trigger-oriented description generation
The generator must write the skill description for model invocation, not for humans.
Description should answer:
“When should this skill be used?”
not
“What is this skill about?”

### 6. Avoid over-railroading
The generator should avoid overly rigid step-by-step instructions unless absolutely necessary.
It should encode intent, constraints, and success conditions instead of brittle procedures.

### 7. Execution support logic
When useful, the generator should produce supporting artifacts such as:
- template outputs
- reusable snippets
- helper scripts
- validation checklists
These should reduce hallucination and repeated reinvention.

### 8. Verification-aware output
The generator should include logic for producing validation guidance where appropriate, especially for:
- alignment
- spacing consistency
- component completeness
- responsive behavior
- structure fidelity versus source UI

## What you should deliver

Please redesign the core generation logic and prompt structure for this tool.

Return:

1. A revised SYSTEM / CORE PROMPT for the SKILL generator
2. A decision framework for when to generate:
   - only SKILL.md
   - SKILL.md + references
   - SKILL.md + references + assets
   - SKILL.md + references + assets + scripts
   - config.json
3. A content selection policy:
   - what belongs in SKILL.md
   - what must be excluded from SKILL.md
   - what should be moved into other files
4. A gotcha generation policy specifically for image-to-UI skill generation
5. A description-generation policy
6. A verification-generation policy

## Final goal

Upgrade the generator from:
“generate a skill document”
to:
“generate a modular, reusable, production-grade skill system by default”

Do not mainly optimize wording.
Mainly optimize:
- generation rules
- output structure logic
- inclusion/exclusion criteria
- artifact selection logic
- failure-prevention logic
- trigger logic
- modularization rules

This is a generator architecture task, not a copywriting task.