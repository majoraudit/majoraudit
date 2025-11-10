# Major Template + Processing System

This repository defines how Major Templates are stored and processed using MQL (Major Query Language) — a custom domain-specific language designed to describe academic requirements in a structured, visual, and auditable way.

MQL enables developers or administrators to define complex course requirements (including ranges, tags, and nested logic) using a lightweight, SQL-inspired syntax.

## Overview

Each major has a folder that includes a main json and mql files. The json includes basic information about the major, the format of which can be seen in computer_science.json. Within are links to .mql templates (for various specialties such as ba/bs or globliast/specialist or geographical locations). These templates are parsed into JSON stuctures and then eventually processed by the MajorAudit rules engine.

An example of a completed MajorTemplate can be seen with the computer_science major (bs_ms not yet implemented).

## Set up testing environment
1. Make a new Python project.
2. Open your terminal and run:
   ```bash
   pip install --upgrade pylibmql
   ```
3. Check that the installation was successful
   ```py
   import pylibmql
   print(pylibmql.parse("").version()) # 0.1.2 at the time of writing this
   ```
4. Test your queries
   ```py
   QUERIES = \
   """
   SELECT 1 FROM [CLASS(MATH 1150), PLACEMENT("5 on AP Calc")] : "Pre-requirements";
   SELECT 1 FROM [CLASS(MATH 2250), CLASS(MATH 2260)] : "Linear algebra with proofs";
   SELECT 1 FROM [CLASS(MATH 3020), CLASS(MATH 1200)] : "Vector analysis or Multivariable calculus";
   """

   output = pylibmql.parse(QUERIES).json()
   print(output)
   ```
5. Compare your output to the output for the above code snippet:
   ```
   {"version":"0.1.2","requirements":[{"query":{"quantity":{"Single":1},"selector":[{"Class":{"department_id":"MATH","course_number":1150}},{"Placement":"5 on AP Calc"}]},"description":"Pre-requirements","priority":1},{"query":{"quantity":{"Single":1},"selector":[{"Class":{"department_id":"MATH","course_number":2250}},{"Class":{"department_id":"MATH","course_number":2260}}]},"description":"Linear algebra with proofs","priority":1},{"query":{"quantity":{"Single":1},"selector":[{"Class":{"department_id":"MATH","course_number":3020}},{"Class":{"department_id":"MATH","course_number":1200}}]},"description":"Vector analysis or Multivariable calculus","priority":1}]}
   ```

## MQL Syntax
Basic format for a group requirement is: `SELECT <count> FROM [<queries>] : "<requirement name>" : <priority>;`
* `SELECT <count>` → Number of courses required for that requirement.
  * Another option is `SELECT <start>-<end>` → Ranged number of courses allowed to fulfill a requirement (start <= end, start != 0 at the requirement level). 
* `FROM [ ... ]` → Valid courses (defined using queries CLASS, RANGE, TAG, or nested SELECT).
* `"<requirement name>"` → Human-readable name (used in UI).
* `<priority> [default=1]` → Numeric order used to determine which rules are audited first, not display order (requirements are displayed from top to bottom)

### MQL Primitives

Primitives are used as arguments to [Queries](#Queries). There are only two primitives.

#### Class
Not a String. It is a construct built from a department id (four ASCII symbols) and course number (four ASCII digits). Classes will be validated during parsing.

Format: `<DEPARTMENT-ID> <COURSE-NUMBER>`  
Examples:
```MATH 2250```
```CPSC 2010```
```S&DS 1230```

#### String
Arbitrary text. Escaping `"` can be done by prepending another `"`: `""""` -> ".

Format: `"<ASCII>"`  
Examples:
```"Lorem Ipsum"```
```"Shakespeare said, ""I love writing,"" and the world was happy"```

### Queries
Queries are like filter functions.  
  
Format: `<QUERY-NAME>(arg1: <primitive>, arg2: <primitive>, ...)`  
Examples:
```CLASS(MATH 2250)```
```RANGE(MATH 2251, MATH 4699)```
```TAG("YC MATH Distribution")```

| Query | Description |
| - | - |
| `CLASS(course: <CLASS primitive>)` | a single course |
| `RANGE(start: <CLASS primitive>, end: <CLASS primitive>)` | inclusive course range |
| `TAG(<STRING primitive>)` | Yale College [tag/distribution label](https://catalog.yale.edu/ycps/attributes/) |
| `SELECT n FROM [...]` |  nested requirement group (n != 0), filtered output will be flattened to parent selection |
| `SELECT n-k FROM [...]` |  nested ranged requirement group (n <= k), filtered output will be flattened to parent selection |

## More information
MQL was developed by Mateo Rodriguez. Reach out to him if you find any bugs.  
  
Helpful links
* The `pylibmql` library: https://pypi.org/project/pylibmql/
* A command-line tool you can run instead of writing the python snippet: [Download Here](https://github.com/mrodz/major-requirement-parser/releases/latest)
* Source code for parser: https://github.com/mrodz/major-requirement-parser/
