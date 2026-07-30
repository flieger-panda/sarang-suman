---
date: present
description: A work-in-progress NLU system turning free-text poker variant
  descriptions into structured config schemas via a multi-head transformer
  classifier.
keywords: Python, Transformers, NLU, natural language understanding, multi-head
  classifier, transformers, machine learning, schema design
---
# NLU Parser for Poker Variants

## Overview

**Personal Project (WIP)**

**Stack:** Python, Transformers / ML

## What I Did

I'm building a natural language understanding (NLU) system that converts free-text descriptions of poker game variants into structured configuration schemas, with the goal of automating what is currently a manual configuration process.

The core of the system is a multi-head transformer classifier architecture, designed so a single input description can be parsed into multiple distinct configuration fields simultaneously, for example betting structure, hand rankings, and wild-card rules, rather than requiring separate models or passes per field. This reflects the reality that a single sentence describing a poker variant often encodes several independent pieces of configuration at once.

I'm designing the schema iteratively, evolving it as new variant descriptions surface edge cases the initial version didn't anticipate, and revisiting architecture decisions in step with what the parsing results reveal about which fields are genuinely learnable from text versus which require more explicit structure.
