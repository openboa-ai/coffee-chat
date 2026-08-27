# Coffee Chat

> Codex-first Agent Plugin for capturing confirmed perspectives and applying
> them to human understanding and agent judgment.

## Essence

Important judgment depends not only on what a person knows, but on what they
consider important and which trade-offs they accept. Coffee Chat makes that
perspective reusable without pretending that an AI inference is the person's
view.

## Role

Coffee Chat is the Product and Plugin layer. It owns the meaning and execution
boundaries of Roast and Brew, while sibling repositories own data, benchmark
criteria, and evaluation evidence.

## Goal

Capture a person's expressed perspective in a user-confirmed Bean, then apply
that Bean so another person can understand the owner or an Agent can judge,
create, or take a bounded action using the owner's priorities.

## Why

People publish abundant information in posts, interviews, documents, talks,
and work records, yet the person's priorities and judgment remain difficult to
understand because perspective signals are scattered. Coffee Chat addresses
that gap; the problem is not that people never share viewpoints, but that
others cannot reliably understand the viewpoint inside an information-heavy
stream. These expressions are often public opinions rather than hidden
personality data: an industry-change judgment, a news or event opinion, or an
explanation of what matters in work can all be perspective signals. Coffee
Chat is not a knowledge summarizer and it does not infer a hidden personality.

## What

The Product exposes two Skills. Roast captures a source-supported perspective
for confirmation. Brew applies a confirmed perspective to a new situation and
produces a human-understanding or agent-judgment/action result.

## How

An Origin is source material. Roast produces a reviewable candidate, and only
the user's explicit confirmation makes it a Bean. Brew consumes that confirmed
Bean together with the current prompt and input and produces Coffee. Public
content can be an Origin, but the confirmation boundary remains mandatory.

## Product model

~~~text
Origin (source, facts, context)
  -> Roast
  -> candidate
  -> explicit user confirmation
  -> Bean (confirmed perspective, taste, and needed factual context)
  -> Brew
  -> Coffee
       ├─ Human Understanding
       └─ Agent Judgment / Action
~~~

Taste is the observed effect of a confirmed Bean acting as an Agent's choice
criterion; it is not a separate file or schema.

### Roast

Roast captures a person's expressed perspective from an Origin. It separates
facts from a one-off opinion, identifies priorities and trade-offs, preserves
scope and uncertainty, and presents a candidate for review. Only explicit
confirmation makes the candidate a Bean.

### Brew

Brew applies a confirmed Bean to a new prompt and input. It does not merely
quote the Bean. It makes the perspective visible in an explanation, a choice,
an artifact, or a bounded action result while preserving factual, safety, and
authority constraints.

## General Agent interface

~~~text
prompt + input -> output
~~~

prompt may be a request, purpose, question, situation, event, or trigger.
input is the complete managed environment and context; it may contain text,
files, directories, Origins, Beans, or task state. output may be text, files,
directory state, a decision, or an action result.

This repository keeps the general interface separate from the Coffee Chat
vocabulary. Current evaluations use a small text/file/directory scope, but the
product model is not limited to text.

## Plugin layout

The portable Agent Plugins manifest is the root plugin.json. The two
discoverable Skills are shared by all supported hosts:

The layout follows the [Agent Plugins specification](https://agent-plugins.org/specification),
the [OpenAI/Codex packaging contract](https://developers.openai.com/plugins/build/plugins),
and the [Claude Code plugin structure](https://code.claude.com/docs/en/plugins).

~~~text
coffee-chat/
├── plugin.json
├── .codex-plugin/
│   └── plugin.json
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── roast/
    │   └── SKILL.md
    └── brew/
        └── SKILL.md
~~~

The root manifest is the portable source of truth. The Codex manifest is the
primary OpenAI/ChatGPT host projection; the Claude manifest is a compatibility
projection. Neither projection owns product meaning, and Skills are never
duplicated by host.

This source repository is the packaging superset: a portable artifact contains
the root `plugin.json` and `skills/`, while a host artifact adds that host's
manifest and uses the same `skills/` directory.

The repository contains no Roastery data, Coffee archive, benchmark cases,
Ground Truth, evaluator evidence, runtime, MCP server, product commands,
agents, marketplace catalog, or budget configuration. The repository-local
`.githooks/pre-commit` is only a security guard; it is not Product behavior.
Other concerns belong to the sibling repositories or to the executing host.

## Repository boundaries

- coffee-chat-roastery owns Origins and explicitly confirmed Beans.
- coffee-chat-bench owns candidate-independent cases, criteria, Ground Truth,
  and graders.
- coffee-chat-eval owns clean execution, isolation, outputs, traces, timing,
  grading, and human feedback.

The Product repository owns Skills and their meaning. It does not own the data
or the measurement of its own success.

## Local security hook

After cloning, run `npm run hooks:install` to configure Git to use the committed
`.githooks/pre-commit` guard. This local hook is supplementary to the trusted
central checks and grants no permission to publish, persist, or execute data.

## Status

This repository defines the product skeleton and Skill contracts. Product
behavior is not considered measured until coffee-chat-eval executes the frozen
Product against the qualified coffee-chat-bench cases.

## License

Coffee Chat is MIT licensed, Copyright © 2026 Openboa AI. Origin and Bean
content rights are determined by the owner and the Roastery's applicable
policy.
