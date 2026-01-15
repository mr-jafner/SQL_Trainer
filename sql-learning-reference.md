# SQL Learning Platform - Reference Export

Generated: 1/12/2026

---

## SQL Foundations

### Query Data Flow

**Why it matters:** Understanding how your query travels through the database engine helps you debug slow queries and predict behavior.

**Watch out for:**
- Assuming queries run instantly - every query goes through parsing, planning, and execution
- Not understanding that the planner chooses HOW to run your query
- Forgetting that results must travel back over the network

**Flow steps:**
- **client**: Your application code - the query starts here as a string.
- **query**: Just text at this point. The database doesn't understand it yet.
- **parser**: Validates syntax, identifies tables/columns, checks permissions. First place errors appear.
- **planner**: Decides HOW to execute: which index to use, join order. Use EXPLAIN to see the plan.
- **executor**: Runs the plan step-by-step. Where most time is spent.
- **storage**: Reads/writes actual data. Could be from disk (slow) or cache (fast).
- **result**: The data coming back. Streams row-by-row for large results.

**My notes:** Useful concept to keep in mind

**Bookmarked:** executor

---

### CRUD Operations

**Why it matters:** CRUD (Create, Read, Update, Delete) are the four fundamental operations. Every feature maps to CRUD.

**Watch out for:**
- UPDATE without WHERE affects ALL rows
- DELETE is permanent without backups
- INSERT can fail on constraint violations

#### CREATE (INSERT)

Adds new rows to a table.

```sql
INSERT INTO users (name, email)
VALUES ('Alice', 'alice@ex.com')
```

Key points: Single row, Multi-row, INSERT...SELECT, With defaults

#### READ (SELECT)

Retrieves data from tables.

```sql
SELECT name, email FROM users
WHERE role = 'admin'
```

Key points: Filter: WHERE, Sort: ORDER BY, Group: GROUP BY, Join: JOIN

#### UPDATE

Modifies existing rows. Always use WHERE!

```sql
UPDATE users SET role = 'mod'
WHERE id = 5
```

Key points: Set columns, With conditions, From subquery

#### DELETE

Removes rows permanently.

```sql
DELETE FROM users WHERE id = 5
```

Key points: With WHERE, TRUNCATE all, Soft delete pattern

---

### JOIN Operations

**Why it matters:** Real data lives in multiple tables. JOINs combine related data in a single query.

**Watch out for:**
- Missing JOIN condition creates cartesian product
- Wrong JOIN type loses or duplicates rows
- Ambiguous columns need table.column syntax

**Flow steps:**
- **tableA**: The "left" table in your JOIN.
- **tableB**: The "right" table with user_id foreign key.
- **condition**: ON clause defines how rows match. Without it: cartesian product!
- **inner**: INNER JOIN: Only matching rows. User with no posts = not included.
- **left**: LEFT JOIN: All from left, matched where possible. No posts = NULLs.
- **result**: Columns from BOTH tables. Same user appears multiple times if multiple posts.

---

