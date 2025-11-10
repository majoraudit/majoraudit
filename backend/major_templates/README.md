# Major Template + Processing System

This repository defines how Major Templates are stored and processed using MQL (Major Query Language) — a custom domain-specific language designed to describe academic requirements in a structured, visual, and auditable way.

MQL enables developers or administrators to define complex course requirements (including ranges, tags, and nested logic) using a lightweight, SQL-inspired syntax.

# Overview

Each major has a folder that includes a main json and mql files. The json includes basic information about the major, the format of which can be seen in computer_science.json. Within are links to .mql templates (for various specialties such as ba/bs or globliast/specialist or geographical locations). These templates are parsed into JSON stuctures and then eventually processed by the MajorAudit rules engine.

An example of a completed MajorTemplate can be seen with the computer_science major (bs_ms not yet implemented).

# MQL Syntax
Basic format for a group requirement is: SELECT \<count\> FROM [\<sources\>] : "\<requirement name\>" : \<priority\>
* SELECT \<count\> → Number of courses required for that requirement.
* FROM [ ... ] → Valid courses (defined using COURSE, RANGE, TAG, or nested SELECT).
* "\<requirement name\>" → Human-readable name (used in UI).
* \<priority\> → Numeric order used to determine which rules are audited first, not display order (requirements are displayed from top to bottom)


# Other Elements
* COURSE(code) --> a specific course
* RANGE(dept start, dept end) --> inclusive course range
* TAG(label) --> tag/distribution label
* SELECT n FROM [...] --> nested requirement group
