import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Check, AlertTriangle, Database, Server, Cloud, ArrowRight, Circle, Diamond, Eye, EyeOff, BookOpen, Map, GitBranch, Layers, RefreshCw, CheckCircle2, XCircle, Play, Terminal, Info, Lightbulb, AlertCircle, Code, Zap, Shield, Clock, Table } from 'lucide-react';

// ============================================================
// STORAGE UTILITIES
// ============================================================

const STORAGE_KEY = 'sql-learning-progress-v2';

const saveProgress = async (progress) => {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
};

const loadProgress = async () => {
  try {
    const result = await window.storage.get(STORAGE_KEY);
    return result ? JSON.parse(result.value) : null;
  } catch (e) {
    console.error('Failed to load progress:', e);
    return null;
  }
};

// ============================================================
// SQL EXERCISE ENGINE
// ============================================================

// Sample database for exercises
const sampleDatabase = {
  users: [
    { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', created_at: '2024-01-15' },
    { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', created_at: '2024-02-20' },
    { id: 3, name: 'Carol', email: 'carol@example.com', role: 'user', created_at: '2024-03-10' },
    { id: 4, name: 'David', email: 'david@example.com', role: 'moderator', created_at: '2024-03-15' },
  ],
  posts: [
    { id: 1, user_id: 1, title: 'Getting Started with SQL', content: 'SQL is...', published: true, created_at: '2024-01-20' },
    { id: 2, user_id: 1, title: 'Advanced Queries', content: 'JOINs are...', published: true, created_at: '2024-02-01' },
    { id: 3, user_id: 2, title: 'My First Post', content: 'Hello...', published: true, created_at: '2024-02-25' },
    { id: 4, user_id: 3, title: 'Draft Post', content: 'WIP...', published: false, created_at: '2024-03-12' },
    { id: 5, user_id: 2, title: 'PostgreSQL Tips', content: 'Postgres...', published: true, created_at: '2024-03-20' },
  ],
  comments: [
    { id: 1, post_id: 1, user_id: 2, text: 'Great intro!', created_at: '2024-01-21' },
    { id: 2, post_id: 1, user_id: 3, text: 'Very helpful', created_at: '2024-01-22' },
    { id: 3, post_id: 2, user_id: 3, text: 'I learned a lot', created_at: '2024-02-02' },
    { id: 4, post_id: 3, user_id: 1, text: 'Welcome!', created_at: '2024-02-26' },
    { id: 5, post_id: 5, user_id: 4, text: 'Nice tips', created_at: '2024-03-21' },
  ],
  orders: [
    { id: 1, user_id: 1, total: 99.99, status: 'completed', created_at: '2024-01-25' },
    { id: 2, user_id: 2, total: 149.50, status: 'completed', created_at: '2024-02-28' },
    { id: 3, user_id: 1, total: 75.00, status: 'pending', created_at: '2024-03-15' },
    { id: 4, user_id: 3, total: 200.00, status: 'completed', created_at: '2024-03-18' },
  ]
};

// Schema definitions for reference display
const schemaDefinitions = {
  users: {
    description: 'User accounts',
    columns: [
      { name: 'id', type: 'INT', note: 'Primary key' },
      { name: 'name', type: 'TEXT', note: '' },
      { name: 'email', type: 'TEXT', note: 'Unique' },
      { name: 'role', type: 'TEXT', note: 'admin, user, moderator' },
      { name: 'created_at', type: 'DATE', note: '' },
    ],
    relationships: []
  },
  posts: {
    description: 'Blog posts',
    columns: [
      { name: 'id', type: 'INT', note: 'Primary key' },
      { name: 'user_id', type: 'INT', note: 'FK → users.id' },
      { name: 'title', type: 'TEXT', note: '' },
      { name: 'content', type: 'TEXT', note: '' },
      { name: 'published', type: 'BOOL', note: 'true/false' },
      { name: 'created_at', type: 'DATE', note: '' },
    ],
    relationships: ['users.id → posts.user_id']
  },
  comments: {
    description: 'Comments on posts',
    columns: [
      { name: 'id', type: 'INT', note: 'Primary key' },
      { name: 'post_id', type: 'INT', note: 'FK → posts.id' },
      { name: 'user_id', type: 'INT', note: 'FK → users.id' },
      { name: 'text', type: 'TEXT', note: '' },
      { name: 'created_at', type: 'DATE', note: '' },
    ],
    relationships: ['posts.id → comments.post_id', 'users.id → comments.user_id']
  },
  orders: {
    description: 'Purchase orders',
    columns: [
      { name: 'id', type: 'INT', note: 'Primary key' },
      { name: 'user_id', type: 'INT', note: 'FK → users.id' },
      { name: 'total', type: 'DECIMAL', note: 'Order total' },
      { name: 'status', type: 'TEXT', note: 'pending, completed' },
      { name: 'created_at', type: 'DATE', note: '' },
    ],
    relationships: ['users.id → orders.user_id']
  }
};

// Determine which tables are relevant for each module's exercises
const moduleTableHints = {
  'data-flow-basics': ['users'],
  'crud-concepts': ['users', 'posts'],
  'where-filtering': ['posts', 'users'],
  'join-flow': ['users', 'posts', 'comments'],
  'aggregation': ['posts', 'comments'],
  'pg-types': ['users'],
  'returning-clause': ['users'],
  'cte-flow': ['users'],
  'upsert': ['users'],
  'transactions': ['orders'],
  'supabase-architecture': ['users'],
  'rls-concept': ['posts'],
  'client-patterns': ['posts'],
  'auth-flow': [],
  'migration-flow': [],
  'migration-faults': [],
  'query-faults': [],
  'type-translation': [],
};

// Simple SQL parser and executor for exercises
const executeSQL = (sql, db = sampleDatabase) => {
  try {
    const normalizedSQL = sql.trim().toLowerCase().replace(/\s+/g, ' ');
    
    // SELECT queries
    if (normalizedSQL.startsWith('select')) {
      return executeSelect(sql, db);
    }
    
    // INSERT queries (simulated)
    if (normalizedSQL.startsWith('insert')) {
      return executeInsert(sql, db);
    }
    
    // UPDATE queries (simulated)
    if (normalizedSQL.startsWith('update')) {
      return executeUpdate(sql, db);
    }
    
    // DELETE queries (simulated)
    if (normalizedSQL.startsWith('delete')) {
      return executeDelete(sql, db);
    }
    
    return { error: 'Unsupported query type. Try SELECT, INSERT, UPDATE, or DELETE.' };
  } catch (e) {
    return { error: e.message };
  }
};

const executeSelect = (sql, db) => {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  
  // Parse FROM clause to get table
  const fromMatch = normalized.match(/from\s+(\w+)/i);
  if (!fromMatch) return { error: 'Missing FROM clause' };
  
  const tableName = fromMatch[1].toLowerCase();
  if (!db[tableName]) return { error: `Table '${tableName}' not found. Available: ${Object.keys(db).join(', ')}` };
  
  let results = [...db[tableName]];
  
  // Handle JOINs
  const joinMatch = normalized.match(/join\s+(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/i);
  if (joinMatch) {
    const joinTable = joinMatch[1].toLowerCase();
    if (!db[joinTable]) return { error: `Join table '${joinTable}' not found` };
    
    const leftTable = joinMatch[2].toLowerCase();
    const leftCol = joinMatch[3].toLowerCase();
    const rightTable = joinMatch[4].toLowerCase();
    const rightCol = joinMatch[5].toLowerCase();
    
    const newResults = [];
    results.forEach(leftRow => {
      db[joinTable].forEach(rightRow => {
        const leftVal = leftTable === tableName ? leftRow[leftCol] : rightRow[leftCol];
        const rightVal = rightTable === tableName ? leftRow[rightCol] : rightRow[rightCol];
        
        if (leftVal === rightVal) {
          newResults.push({ ...leftRow, ...rightRow, [`${joinTable}_id`]: rightRow.id });
        }
      });
    });
    results = newResults;
  }
  
  // Handle WHERE clause
  const whereMatch = normalized.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i);
  if (whereMatch) {
    const condition = whereMatch[1].trim();
    results = applyWhere(results, condition);
  }
  
  // Handle ORDER BY
  const orderMatch = normalized.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/i);
  if (orderMatch) {
    const orderCol = orderMatch[1];
    const orderDir = (orderMatch[2] || 'asc').toLowerCase();
    results.sort((a, b) => {
      if (a[orderCol] < b[orderCol]) return orderDir === 'asc' ? -1 : 1;
      if (a[orderCol] > b[orderCol]) return orderDir === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  // Handle LIMIT
  const limitMatch = normalized.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    results = results.slice(0, parseInt(limitMatch[1]));
  }
  
  // Handle GROUP BY with COUNT
  const groupMatch = normalized.match(/group\s+by\s+(\w+)/i);
  if (groupMatch) {
    const groupCol = groupMatch[1];
    const grouped = {};
    results.forEach(row => {
      const key = row[groupCol];
      if (!grouped[key]) grouped[key] = { [groupCol]: key, count: 0 };
      grouped[key].count++;
    });
    results = Object.values(grouped);
  }
  
  // Handle column selection
  const selectMatch = normalized.match(/select\s+(.+?)\s+from/i);
  if (selectMatch) {
    const cols = selectMatch[1].trim();
    if (cols !== '*') {
      // Handle COUNT(*)
      if (cols.toLowerCase().includes('count(*)')) {
        return { results: [{ count: results.length }], rowCount: 1 };
      }
      
      const colNames = cols.split(',').map(c => c.trim().split(/\s+as\s+/i)).map(parts => ({
        original: parts[0].replace(/^\w+\./, ''),
        alias: parts[1] || parts[0].replace(/^\w+\./, '')
      }));
      
      results = results.map(row => {
        const newRow = {};
        colNames.forEach(({ original, alias }) => {
          if (row.hasOwnProperty(original)) {
            newRow[alias] = row[original];
          }
        });
        return newRow;
      });
    }
  }
  
  return { results, rowCount: results.length };
};

const applyWhere = (results, condition) => {
  return results.filter(row => {
    // Handle multiple conditions with AND
    const andParts = condition.split(/\s+and\s+/i);
    return andParts.every(part => evaluateCondition(row, part.trim()));
  });
};

const evaluateCondition = (row, condition) => {
  // Handle = comparison
  let match = condition.match(/(\w+)\s*=\s*'([^']+)'/i);
  if (match) return String(row[match[1]]) === match[2];
  
  match = condition.match(/(\w+)\s*=\s*(\d+)/i);
  if (match) return row[match[1]] === parseInt(match[2]);
  
  // Handle != comparison
  match = condition.match(/(\w+)\s*!=\s*'([^']+)'/i);
  if (match) return String(row[match[1]]) !== match[2];
  
  // Handle > comparison
  match = condition.match(/(\w+)\s*>\s*(\d+)/i);
  if (match) return row[match[1]] > parseInt(match[2]);
  
  // Handle < comparison
  match = condition.match(/(\w+)\s*<\s*(\d+)/i);
  if (match) return row[match[1]] < parseInt(match[2]);
  
  // Handle >= comparison
  match = condition.match(/(\w+)\s*>=\s*(\d+)/i);
  if (match) return row[match[1]] >= parseInt(match[2]);
  
  // Handle LIKE (simple pattern)
  match = condition.match(/(\w+)\s+like\s+'%([^%]+)%'/i);
  if (match) return String(row[match[1]]).toLowerCase().includes(match[2].toLowerCase());
  
  // Handle IS NULL
  match = condition.match(/(\w+)\s+is\s+null/i);
  if (match) return row[match[1]] === null || row[match[1]] === undefined;
  
  // Handle IS NOT NULL
  match = condition.match(/(\w+)\s+is\s+not\s+null/i);
  if (match) return row[match[1]] !== null && row[match[1]] !== undefined;
  
  // Handle boolean
  match = condition.match(/(\w+)\s*=\s*(true|false)/i);
  if (match) return row[match[1]] === (match[2].toLowerCase() === 'true');
  
  return true;
};

const executeInsert = (sql, db) => {
  // Simulate INSERT with RETURNING
  const match = sql.match(/insert\s+into\s+(\w+)/i);
  if (!match) return { error: 'Invalid INSERT syntax' };
  
  const tableName = match[1].toLowerCase();
  const hasReturning = sql.toLowerCase().includes('returning');
  
  // Simulate a new row
  const newId = db[tableName] ? Math.max(...db[tableName].map(r => r.id)) + 1 : 1;
  const simulatedRow = { id: newId, created_at: new Date().toISOString().split('T')[0] };
  
  if (hasReturning) {
    return { 
      results: [simulatedRow], 
      rowCount: 1,
      message: `INSERT with RETURNING - new row returned (simulated)` 
    };
  }
  
  return { results: [], rowCount: 1, message: 'INSERT successful (simulated). Use RETURNING to get the inserted row!' };
};

const executeUpdate = (sql, db) => {
  const hasReturning = sql.toLowerCase().includes('returning');
  return { 
    results: hasReturning ? [{ id: 1, updated: true }] : [], 
    rowCount: 1,
    message: hasReturning ? 'UPDATE with RETURNING (simulated)' : 'UPDATE successful (simulated)'
  };
};

const executeDelete = (sql, db) => {
  const hasReturning = sql.toLowerCase().includes('returning');
  return { 
    results: hasReturning ? [{ id: 1, deleted: true }] : [], 
    rowCount: 1,
    message: hasReturning ? 'DELETE with RETURNING (simulated)' : 'DELETE successful (simulated)'
  };
};

// ============================================================
// CURRICULUM DATA
// ============================================================

const curriculum = {
  foundations: {
    id: 'foundations',
    title: 'SQL Foundations',
    icon: Database,
    description: 'Core concepts that transfer from SQLite to any SQL database',
    modules: [
      {
        id: 'data-flow-basics',
        title: 'Query Data Flow',
        type: 'dataflow',
        why: "Understanding how your query travels through the database engine helps you debug slow queries and predict behavior. When something goes wrong, you'll know which stage to investigate.",
        pitfalls: [
          "Assuming queries run instantly - every query goes through parsing, planning, and execution",
          "Not understanding that the planner chooses HOW to run your query - the same SQL can execute differently based on table size and indexes",
          "Forgetting that results must travel back over the network - large result sets have latency"
        ],
        content: {
          description: 'How a SELECT query flows through the database system - from your code to results',
          nodes: [
            { id: 'client', label: 'Your Code', type: 'boundary', x: 50, y: 50 },
            { id: 'query', label: 'SQL Query\nString', type: 'flow', x: 180, y: 50 },
            { id: 'parser', label: 'Query\nParser', type: 'process', x: 310, y: 50 },
            { id: 'planner', label: 'Query\nPlanner', type: 'process', x: 310, y: 130 },
            { id: 'executor', label: 'Executor', type: 'process', x: 310, y: 210 },
            { id: 'storage', label: 'Storage\nEngine', type: 'boundary', x: 450, y: 130 },
            { id: 'result', label: 'Result Set', type: 'flow', x: 180, y: 210 },
          ],
          edges: [
            { from: 'client', to: 'query' },
            { from: 'query', to: 'parser' },
            { from: 'parser', to: 'planner' },
            { from: 'planner', to: 'executor' },
            { from: 'executor', to: 'storage' },
            { from: 'storage', to: 'executor' },
            { from: 'executor', to: 'result' },
            { from: 'result', to: 'client' },
          ],
          reveals: {
            client: 'Your application code - could be Python, JavaScript, or any language. The query starts here as a string.',
            query: 'Just text at this point. The database doesn\'t understand it yet - it\'s like sending a message that needs to be read.',
            parser: 'Validates syntax (SELECT not SELCT), identifies tables/columns, checks if they exist, verifies permissions. First place errors appear.',
            planner: 'The brain! Decides HOW to execute: which index to use, join order, scan method. Use EXPLAIN to see the plan.',
            executor: 'Runs the plan step-by-step. Fetches data, applies filters, performs joins, sorts results. Where most time is spent.',
            storage: 'Reads/writes actual data. Could be from disk (slow) or memory cache (fast). Why "warming up" a database helps.',
            result: 'The data coming back. Streams row-by-row for large results. Must travel back over the network to your code.',
          }
        },
        exercises: [
          {
            id: 'ex1',
            prompt: 'Select all columns from the users table to see what data we have:',
            hint: 'Use SELECT * FROM tablename',
            starterCode: 'SELECT ',
            solution: 'SELECT * FROM users',
            validator: (result) => result.results && result.results.length === 4
          }
        ]
      },
      {
        id: 'crud-concepts',
        title: 'CRUD Operations',
        type: 'conceptmap',
        why: "CRUD (Create, Read, Update, Delete) are the four fundamental operations for any data system. Every app feature maps to one or more CRUD operations. Understanding these thoroughly is the foundation for everything else.",
        pitfalls: [
          "UPDATE without WHERE affects ALL rows - always double-check your conditions",
          "DELETE is permanent (unless you have backups or soft deletes)",
          "INSERT can fail silently on constraint violations if not handled",
          "Reading doesn't mean you can write - different permissions may apply"
        ],
        content: {
          central: 'SQL Operations',
          branches: [
            {
              label: 'CREATE (INSERT)',
              color: '#22c55e',
              details: 'Adds new rows to a table. Can insert one or multiple rows. Values must match column types and constraints.',
              syntax: "INSERT INTO users (name, email)\nVALUES ('Alice', 'alice@ex.com')",
              children: ['Single row: VALUES (...)', 'Multi-row: VALUES (...), (...)', 'From query: INSERT...SELECT', 'With defaults: omit columns']
            },
            {
              label: 'READ (SELECT)',
              color: '#3b82f6',
              details: 'Retrieves data from one or more tables. Most complex operation - supports filtering, sorting, joining, grouping, and aggregation.',
              syntax: "SELECT name, email FROM users\nWHERE role = 'admin'\nORDER BY name",
              children: ['Filter: WHERE', 'Sort: ORDER BY', 'Group: GROUP BY', 'Combine: JOIN', 'Limit: LIMIT/OFFSET']
            },
            {
              label: 'UPDATE',
              color: '#f59e0b',
              details: 'Modifies existing rows. Critical: always use WHERE unless you intend to update every row!',
              syntax: "UPDATE users\nSET role = 'moderator'\nWHERE id = 5",
              children: ['Set one column', 'Set multiple columns', 'Conditional: CASE WHEN', 'From subquery']
            },
            {
              label: 'DELETE',
              color: '#ef4444',
              details: 'Removes rows permanently. Like UPDATE, always use WHERE. Consider soft delete (setting a flag) for recoverable data.',
              syntax: "DELETE FROM users\nWHERE id = 5",
              children: ['With condition: WHERE', 'All rows: TRUNCATE', 'Soft delete pattern', 'Cascade to children']
            }
          ]
        },
        exercises: [
          {
            id: 'crud-select',
            prompt: 'Select just the name and email columns from users:',
            hint: 'List specific columns instead of using *',
            starterCode: 'SELECT ',
            solution: 'SELECT name, email FROM users',
            validator: (result) => result.results && result.results[0] && 'name' in result.results[0] && 'email' in result.results[0] && !('id' in result.results[0])
          },
          {
            id: 'crud-where',
            prompt: "Find users with the role 'admin':",
            hint: "Use WHERE role = 'value'",
            starterCode: 'SELECT * FROM users WHERE ',
            solution: "SELECT * FROM users WHERE role = 'admin'",
            validator: (result) => result.results && result.results.length === 1 && result.results[0].role === 'admin'
          },
          {
            id: 'crud-insert',
            prompt: 'Insert a new user and get the inserted row back using RETURNING:',
            hint: 'INSERT INTO table (cols) VALUES (vals) RETURNING *',
            starterCode: "INSERT INTO users (name, email) VALUES ('Test', 'test@ex.com') ",
            solution: "INSERT INTO users (name, email) VALUES ('Test', 'test@ex.com') RETURNING *",
            validator: (result) => result.results && result.results.length > 0 && result.message?.includes('RETURNING')
          }
        ]
      },
      {
        id: 'where-filtering',
        title: 'WHERE & Filtering',
        type: 'conceptmap',
        why: "WHERE is how you find specific data. Without it, you get everything - which is rarely what you want. Efficient filtering is the difference between a fast app and a slow one.",
        pitfalls: [
          "String comparisons are case-sensitive in Postgres (use ILIKE for case-insensitive)",
          "NULL requires special handling: use IS NULL, not = NULL",
          "LIKE with leading wildcard (%text) can't use indexes - very slow on large tables",
          "Multiple ORs can be slow - consider IN (...) instead"
        ],
        content: {
          central: 'WHERE Clause',
          branches: [
            {
              label: 'Comparison',
              color: '#3b82f6',
              details: 'Basic equality and range checks. The foundation of filtering.',
              syntax: "WHERE age >= 18 AND status = 'active'",
              children: ['= equal', '!= or <> not equal', '> < >= <= ranges', 'BETWEEN x AND y']
            },
            {
              label: 'Pattern Matching',
              color: '#8b5cf6',
              details: 'Search within text values. LIKE for patterns, ILIKE for case-insensitive.',
              syntax: "WHERE name LIKE 'A%'\nWHERE email ILIKE '%@gmail%'",
              children: ['% matches any chars', '_ matches one char', 'ILIKE (case-insensitive)', '~ regex (Postgres)']
            },
            {
              label: 'NULL Handling',
              color: '#f59e0b',
              details: 'NULL is special - it\'s not a value, it\'s the absence of a value. Can\'t use = with NULL.',
              syntax: "WHERE deleted_at IS NULL\nWHERE phone IS NOT NULL",
              children: ['IS NULL', 'IS NOT NULL', 'COALESCE(x, default)', 'NULLIF(x, y)']
            },
            {
              label: 'Logical Operators',
              color: '#22c55e',
              details: 'Combine multiple conditions. AND is stricter (all must match), OR is looser (any can match).',
              syntax: "WHERE (role = 'admin' OR role = 'mod')\nAND active = true",
              children: ['AND (all must match)', 'OR (any can match)', 'NOT (negate)', 'IN (list match)']
            }
          ]
        },
        exercises: [
          {
            id: 'where-multiple',
            prompt: "Find posts that are published AND have user_id = 1:",
            hint: 'Combine conditions with AND',
            starterCode: 'SELECT * FROM posts WHERE ',
            solution: 'SELECT * FROM posts WHERE published = true AND user_id = 1',
            validator: (result) => result.results && result.results.length === 2 && result.results.every(r => r.published === true && r.user_id === 1)
          },
          {
            id: 'where-like',
            prompt: "Find posts with 'SQL' anywhere in the title:",
            hint: "Use LIKE with % wildcards: LIKE '%pattern%'",
            starterCode: 'SELECT * FROM posts WHERE title ',
            solution: "SELECT * FROM posts WHERE title LIKE '%SQL%'",
            validator: (result) => result.results && result.results.length >= 1 && result.results.every(r => r.title.includes('SQL'))
          }
        ]
      },
      {
        id: 'join-flow',
        title: 'JOIN Operations',
        type: 'dataflow',
        why: "Real data lives in multiple tables (users, orders, products). JOINs let you combine related data in a single query instead of making multiple queries and combining in code.",
        pitfalls: [
          "Missing JOIN condition creates a cartesian product (every row × every row) - devastating performance",
          "Wrong JOIN type: INNER loses unmatched rows, LEFT keeps them with NULLs",
          "Ambiguous columns: if both tables have 'id', you must specify table.id",
          "N+1 problem: querying in a loop instead of using JOIN"
        ],
        content: {
          description: 'How JOINs combine rows from multiple tables based on related columns',
          nodes: [
            { id: 'tableA', label: 'users\n(4 rows)', type: 'boundary', x: 50, y: 50 },
            { id: 'tableB', label: 'posts\n(5 rows)', type: 'boundary', x: 50, y: 170 },
            { id: 'condition', label: 'ON\nusers.id =\nposts.user_id', type: 'flow', x: 200, y: 110 },
            { id: 'inner', label: 'INNER JOIN\n(only matches)', type: 'process', x: 350, y: 50 },
            { id: 'left', label: 'LEFT JOIN\n(all left +\nmatches)', type: 'process', x: 350, y: 130 },
            { id: 'result', label: 'Combined\nResult', type: 'boundary', x: 500, y: 90 },
          ],
          edges: [
            { from: 'tableA', to: 'condition' },
            { from: 'tableB', to: 'condition' },
            { from: 'condition', to: 'inner' },
            { from: 'condition', to: 'left' },
            { from: 'inner', to: 'result' },
            { from: 'left', to: 'result' },
          ],
          reveals: {
            tableA: 'The "left" table in your JOIN. All its columns will be available in results with users.column_name.',
            tableB: 'The "right" table. Has user_id which references users.id - this is the foreign key relationship.',
            condition: 'The ON clause defines how rows match. Without it, you get every possible combination (cartesian product)!',
            inner: 'INNER JOIN: Only returns rows where both tables have matching values. User with no posts? Not in results.',
            left: 'LEFT JOIN: All rows from users, matched with posts where possible. User with no posts? Included, posts columns are NULL.',
            result: 'Each result row has columns from BOTH tables. Same user appears multiple times if they have multiple posts.',
          }
        },
        exercises: [
          {
            id: 'join-basic',
            prompt: 'Join users with posts to see who wrote each post:',
            hint: 'SELECT ... FROM users JOIN posts ON users.id = posts.user_id',
            starterCode: 'SELECT users.name, posts.title FROM users ',
            solution: 'SELECT users.name, posts.title FROM users JOIN posts ON users.id = posts.user_id',
            validator: (result) => result.results && result.results.length === 5 && result.results[0].name && result.results[0].title
          },
          {
            id: 'join-filter',
            prompt: 'Join users with posts, but only show published posts:',
            hint: 'Add WHERE after the JOIN',
            starterCode: 'SELECT users.name, posts.title FROM users JOIN posts ON users.id = posts.user_id ',
            solution: 'SELECT users.name, posts.title FROM users JOIN posts ON users.id = posts.user_id WHERE posts.published = true',
            validator: (result) => result.results && result.results.length === 4 && result.results.every(r => r.title !== 'Draft Post')
          }
        ]
      },
      {
        id: 'aggregation',
        title: 'Aggregation & Grouping',
        type: 'conceptmap',
        why: "Aggregation turns many rows into summary information - counts, sums, averages. Essential for dashboards, reports, and analytics. GROUP BY lets you aggregate within categories.",
        pitfalls: [
          "SELECT columns must be in GROUP BY or inside aggregate functions",
          "WHERE filters rows BEFORE grouping, HAVING filters AFTER",
          "COUNT(*) counts rows, COUNT(column) counts non-NULL values",
          "AVG on integers might truncate - cast to decimal if needed"
        ],
        content: {
          central: 'Aggregation',
          branches: [
            {
              label: 'Aggregate Functions',
              color: '#3b82f6',
              details: 'Functions that combine multiple rows into a single value.',
              syntax: "SELECT COUNT(*), AVG(total)\nFROM orders",
              children: ['COUNT(*) - row count', 'SUM(col) - total', 'AVG(col) - average', 'MIN/MAX - extremes']
            },
            {
              label: 'GROUP BY',
              color: '#22c55e',
              details: 'Split rows into groups, then aggregate each group separately.',
              syntax: "SELECT user_id, COUNT(*)\nFROM posts\nGROUP BY user_id",
              children: ['One group per unique value', 'Multiple columns OK', 'Aggregate per group', 'NULL is its own group']
            },
            {
              label: 'HAVING',
              color: '#f59e0b',
              details: 'Filter groups AFTER aggregation. Like WHERE, but for aggregated results.',
              syntax: "SELECT user_id, COUNT(*)\nFROM posts GROUP BY user_id\nHAVING COUNT(*) > 1",
              children: ['Filters groups', 'Uses aggregate values', 'After GROUP BY', 'Before ORDER BY']
            },
            {
              label: 'Order of Operations',
              color: '#8b5cf6',
              details: 'SQL clauses execute in a specific order, not the order written.',
              syntax: "FROM → WHERE → GROUP BY\n→ HAVING → SELECT → ORDER BY",
              children: ['1. FROM (get rows)', '2. WHERE (filter rows)', '3. GROUP BY (make groups)', '4. HAVING (filter groups)']
            }
          ]
        },
        exercises: [
          {
            id: 'agg-count',
            prompt: 'Count how many posts each user has (group by user_id):',
            hint: 'SELECT column, COUNT(*) FROM table GROUP BY column',
            starterCode: 'SELECT user_id, ',
            solution: 'SELECT user_id, COUNT(*) FROM posts GROUP BY user_id',
            validator: (result) => result.results && result.results.length >= 3 && result.results[0].count !== undefined
          },
          {
            id: 'agg-total',
            prompt: 'Find the total number of comments in the database:',
            hint: 'Use COUNT(*) without GROUP BY for a total',
            starterCode: 'SELECT ',
            solution: 'SELECT COUNT(*) FROM comments',
            validator: (result) => result.results && result.results[0] && result.results[0].count === 5
          }
        ]
      }
    ]
  },
  postgres: {
    id: 'postgres',
    title: 'PostgreSQL Specifics',
    icon: Server,
    description: 'Features and syntax unique to PostgreSQL (vs SQLite)',
    modules: [
      {
        id: 'pg-types',
        title: 'PostgreSQL Data Types',
        type: 'conceptmap',
        why: "PostgreSQL has richer types than SQLite. UUID for distributed IDs, JSONB for flexible data, arrays for lists without join tables, and proper timestamps with timezones.",
        pitfalls: [
          "TIMESTAMP vs TIMESTAMPTZ: without timezone, times can be ambiguous. Always prefer TIMESTAMPTZ.",
          "JSONB looks convenient but querying is harder than relational columns - don't over-use it",
          "Arrays seem great but they can't have foreign keys - use join tables for relationships",
          "UUID generation requires pgcrypto extension or Postgres 13+"
        ],
        content: {
          central: 'Postgres Types',
          branches: [
            {
              label: 'SQLite → Postgres',
              color: '#6b7280',
              details: 'Types that need translation from SQLite. Postgres is stricter about types.',
              syntax: "-- SQLite flexible, Postgres strict\nINTEGER → INT or BIGINT\nTEXT → TEXT or VARCHAR(n)\nREAL → FLOAT or NUMERIC\nBLOB → BYTEA",
              children: ['INTEGER → INT/BIGINT', 'TEXT → TEXT/VARCHAR', 'REAL → FLOAT/NUMERIC', 'BLOB → BYTEA']
            },
            {
              label: 'UUID',
              color: '#8b5cf6',
              details: 'Universally unique IDs. Better than auto-increment for distributed systems - no collisions, no exposing counts.',
              syntax: "id UUID PRIMARY KEY\n  DEFAULT gen_random_uuid()\n-- Postgres 13+, or use pgcrypto",
              children: ['gen_random_uuid()', 'No collisions ever', "Can't guess next ID", 'Works across databases']
            },
            {
              label: 'JSONB',
              color: '#06b6d4',
              details: 'Binary JSON stored efficiently. Query with operators, index with GIN. Great for flexible/sparse data.',
              syntax: "data JSONB,\n-- Access: data->>'name'\n-- Query: data @> '{\"active\": true}'",
              children: ['-> returns JSON', '->> returns text', '@> containment query', 'Can be indexed (GIN)']
            },
            {
              label: 'Arrays',
              color: '#ec4899',
              details: 'Store lists in a single column. Good for tags, small lists. Not for relationships (use join tables).',
              syntax: "tags TEXT[],\n-- Query: 'sql' = ANY(tags)\n-- Add: array_append(tags, 'new')",
              children: ['ANY(array) for search', 'array_append to add', 'unnest() to expand', 'No foreign keys!']
            },
            {
              label: 'TIMESTAMPTZ',
              color: '#f59e0b',
              details: 'Timestamps WITH timezone. Stores in UTC, converts on display. Prevents timezone bugs.',
              syntax: "created_at TIMESTAMPTZ\n  DEFAULT NOW()\n-- Always stores UTC internally",
              children: ['NOW() for current', 'Stores as UTC', 'Displays in local TZ', 'INTERVAL for math']
            }
          ]
        },
        exercises: [
          {
            id: 'pg-types-1',
            prompt: 'Select all users, ordered by when they were created (newest first):',
            hint: 'ORDER BY column DESC',
            starterCode: 'SELECT * FROM users ',
            solution: 'SELECT * FROM users ORDER BY created_at DESC',
            validator: (result) => result.results && result.results[0].created_at >= result.results[result.results.length-1].created_at
          }
        ]
      },
      {
        id: 'returning-clause',
        title: 'RETURNING Clause',
        type: 'dataflow',
        why: "In SQLite, after INSERT you need a second query to get the created row's ID. PostgreSQL's RETURNING gives you the data in one round-trip. Faster, safer, no race conditions.",
        pitfalls: [
          "SQLite habit: INSERT then SELECT last_insert_rowid() - doesn't exist in Postgres",
          "Forgetting RETURNING means you don't know what was actually created/updated",
          "RETURNING works with INSERT, UPDATE, and DELETE - use it everywhere",
          "Can return specific columns or * for all"
        ],
        content: {
          description: 'Get inserted/updated/deleted data back in the same query - no second round-trip',
          nodes: [
            { id: 'sqlite', label: 'SQLite\nPattern', type: 'boundary', x: 50, y: 40 },
            { id: 'insert1', label: 'INSERT\nINTO users...', type: 'process', x: 50, y: 110 },
            { id: 'select1', label: 'SELECT *\nWHERE id=\nlast_rowid()', type: 'process', x: 50, y: 190 },
            { id: 'pg', label: 'Postgres\nPattern', type: 'boundary', x: 280, y: 40 },
            { id: 'insert2', label: 'INSERT INTO\nusers...\nRETURNING *', type: 'process', x: 280, y: 130 },
            { id: 'result', label: 'Inserted row\nreturned\nimmediately', type: 'flow', x: 450, y: 130 },
          ],
          edges: [
            { from: 'sqlite', to: 'insert1' },
            { from: 'insert1', to: 'select1' },
            { from: 'pg', to: 'insert2' },
            { from: 'insert2', to: 'result' },
          ],
          reveals: {
            sqlite: 'The old way: two queries, two round-trips, potential race condition between them.',
            insert1: 'INSERT completes but only tells you success/fail and row count. What ID was generated?',
            select1: 'Second query to fetch what was just inserted. last_insert_rowid() only works in same connection.',
            pg: 'PostgreSQL way: one query does both insert and return. Atomic operation.',
            insert2: 'RETURNING * gives you all columns. Can also specify: RETURNING id, created_at',
            result: 'The complete row including generated values: UUID, timestamps, defaults. Immediate.',
          }
        },
        exercises: [
          {
            id: 'returning-insert',
            prompt: 'Insert a new user and get the full row back:',
            hint: 'Add RETURNING * at the end',
            starterCode: "INSERT INTO users (name, email) VALUES ('New User', 'new@ex.com') ",
            solution: "INSERT INTO users (name, email) VALUES ('New User', 'new@ex.com') RETURNING *",
            validator: (result) => result.message && result.message.includes('RETURNING')
          },
          {
            id: 'returning-update',
            prompt: 'Update a user and get the updated row back:',
            hint: 'RETURNING works with UPDATE too',
            starterCode: "UPDATE users SET role = 'admin' WHERE id = 2 ",
            solution: "UPDATE users SET role = 'admin' WHERE id = 2 RETURNING *",
            validator: (result) => result.message && result.message.includes('RETURNING')
          }
        ]
      },
      {
        id: 'cte-flow',
        title: 'CTEs (WITH Clause)',
        type: 'dataflow',
        why: "Common Table Expressions make complex queries readable. Instead of nested subqueries, you build up named 'steps' that read like a recipe. Essential for complex reports and data transformations.",
        pitfalls: [
          "CTEs in Postgres are optimization fences by default - can be slower than subqueries (use WITH ... AS MATERIALIZED or NOT MATERIALIZED to control)",
          "Recursive CTEs can infinite loop if base case is wrong",
          "CTEs only exist for one query - can't reference in next statement",
          "Over-using CTEs for simple queries adds overhead without benefit"
        ],
        content: {
          description: 'Build complex queries step-by-step with named subqueries that you can reference like tables',
          nodes: [
            { id: 'with', label: 'WITH', type: 'flow', x: 30, y: 100 },
            { id: 'cte1', label: 'active_users\nAS (SELECT...)', type: 'process', x: 140, y: 40 },
            { id: 'cte2', label: 'user_stats\nAS (SELECT...)', type: 'process', x: 140, y: 160 },
            { id: 'main', label: 'SELECT *\nFROM active_users\nJOIN user_stats', type: 'process', x: 320, y: 100 },
            { id: 'result', label: 'Final\nResult', type: 'boundary', x: 480, y: 100 },
          ],
          edges: [
            { from: 'with', to: 'cte1' },
            { from: 'with', to: 'cte2' },
            { from: 'cte1', to: 'cte2', label: 'can reference' },
            { from: 'cte1', to: 'main' },
            { from: 'cte2', to: 'main' },
            { from: 'main', to: 'result' },
          ],
          reveals: {
            with: 'Keyword that starts CTE block. Can define multiple named queries separated by commas.',
            cte1: 'First named subquery. Results can be referenced by name like a table. Scoped to this statement only.',
            cte2: 'Second CTE. Can reference cte1! They execute in order. Build up complexity step-by-step.',
            main: 'The actual query that uses the CTEs. Much cleaner than nested subqueries 3 levels deep.',
            result: 'Output of the main query. CTEs disappear after - they\'re just for organization.',
          }
        },
        exercises: [
          {
            id: 'cte-simple',
            prompt: 'Write a CTE that gets admin users, then select from it (WITH admins AS (...) SELECT ...):',
            hint: "WITH name AS (SELECT...) SELECT * FROM name",
            starterCode: "WITH admins AS (SELECT * FROM users WHERE role = 'admin') ",
            solution: "WITH admins AS (SELECT * FROM users WHERE role = 'admin') SELECT * FROM admins",
            validator: (result) => result.results && result.results.length === 1 && result.results[0].role === 'admin'
          }
        ]
      },
      {
        id: 'upsert',
        title: 'UPSERT (ON CONFLICT)',
        type: 'conceptmap',
        why: "Often you want to 'insert if new, update if exists'. Without UPSERT, you need complex logic: check if exists, then insert or update. ON CONFLICT handles this atomically.",
        pitfalls: [
          "Must specify which column(s) determine conflict - needs unique constraint",
          "DO UPDATE SET must use EXCLUDED to reference the incoming values",
          "DO NOTHING silently drops conflicts - may not be what you want",
          "Partial indexes can make conflict detection tricky"
        ],
        content: {
          central: 'ON CONFLICT',
          branches: [
            {
              label: 'The Problem',
              color: '#ef4444',
              details: 'You want to insert a row, but it might already exist. Traditional approach needs multiple queries.',
              syntax: "-- Bad: multiple queries\nSELECT EXISTS(...);\nIF not exists THEN INSERT\nELSE UPDATE",
              children: ['Race conditions', 'Extra round-trips', 'Complex app logic', 'Transaction needed']
            },
            {
              label: 'DO NOTHING',
              color: '#6b7280',
              details: 'If conflict, silently skip the insert. Row stays as-is. Good for idempotent operations.',
              syntax: "INSERT INTO users (email, name)\nVALUES ('a@b.com', 'Alice')\nON CONFLICT (email) DO NOTHING",
              children: ['Skip on conflict', 'No error thrown', 'No update made', 'Returns 0 rows affected']
            },
            {
              label: 'DO UPDATE',
              color: '#22c55e',
              details: 'If conflict, update the existing row with new values. EXCLUDED refers to the values you tried to insert.',
              syntax: "INSERT INTO users (email, name)\nVALUES ('a@b.com', 'Alice')\nON CONFLICT (email)\nDO UPDATE SET name = EXCLUDED.name",
              children: ['Update on conflict', 'EXCLUDED = new values', 'Can update subset', 'Can add WHERE']
            },
            {
              label: 'Conflict Target',
              color: '#3b82f6',
              details: 'Must specify which column(s) define a conflict. Column must have UNIQUE constraint.',
              syntax: "ON CONFLICT (email)     -- single\nON CONFLICT (a, b)      -- composite\nON CONFLICT ON CONSTRAINT name",
              children: ['Single column', 'Multiple columns', 'Named constraint', 'Partial index']
            }
          ]
        },
        exercises: [
          {
            id: 'upsert-concept',
            prompt: 'This is a concept exercise. What would happen if you INSERT a user with an existing email using ON CONFLICT DO NOTHING?',
            hint: 'The insert would be silently skipped',
            starterCode: "-- Imagine: INSERT INTO users (email) VALUES ('existing@email.com') ON CONFLICT DO NOTHING\n-- Answer with a comment: ",
            solution: "-- The insert is silently skipped, no error, no update",
            validator: () => true
          }
        ]
      },
      {
        id: 'transactions',
        title: 'Transactions & ACID',
        type: 'dataflow',
        why: "Transactions group multiple operations into an atomic unit: all succeed or all fail. Critical for data integrity. Moving money between accounts? Both UPDATE must succeed or neither should.",
        pitfalls: [
          "SQLite auto-commits unless you BEGIN - Postgres does too via autocommit",
          "Long transactions hold locks and block other queries",
          "Forgetting COMMIT leaves transaction hanging (and locks held)",
          "Deadlocks happen when two transactions wait for each other"
        ],
        content: {
          description: 'Group multiple operations - all succeed together or all fail together',
          nodes: [
            { id: 'begin', label: 'BEGIN', type: 'flow', x: 50, y: 100 },
            { id: 'op1', label: 'UPDATE\naccount A\n-100', type: 'process', x: 170, y: 50 },
            { id: 'op2', label: 'UPDATE\naccount B\n+100', type: 'process', x: 170, y: 150 },
            { id: 'decide', label: 'Check\nSuccess?', type: 'flow', x: 320, y: 100 },
            { id: 'commit', label: 'COMMIT\n(permanent)', type: 'boundary', x: 470, y: 50 },
            { id: 'rollback', label: 'ROLLBACK\n(undo all)', type: 'boundary', x: 470, y: 150 },
          ],
          edges: [
            { from: 'begin', to: 'op1' },
            { from: 'op1', to: 'op2' },
            { from: 'op2', to: 'decide' },
            { from: 'decide', to: 'commit' },
            { from: 'decide', to: 'rollback' },
          ],
          reveals: {
            begin: 'Starts a transaction. Changes after this are tentative until COMMIT.',
            op1: 'First operation. Changes are visible to THIS transaction but not others (isolation).',
            op2: 'Second operation. If this fails, op1 should be undone - that\'s atomicity.',
            decide: 'Your code checks if everything succeeded. Any error? Rollback. All good? Commit.',
            commit: 'Makes all changes permanent. Other transactions can now see them. Releases locks.',
            rollback: 'Undoes ALL changes since BEGIN. Database returns to previous state. Safe failure.',
          }
        },
        exercises: [
          {
            id: 'tx-concept',
            prompt: 'Why would you use a transaction for transferring money between two accounts?',
            hint: 'What if the second UPDATE fails after the first succeeds?',
            starterCode: '-- Explain in a comment: ',
            solution: '-- Without transaction: first account debited, second not credited = lost money. Transaction ensures both happen or neither.',
            validator: () => true
          }
        ]
      }
    ]
  },
  supabase: {
    id: 'supabase',
    title: 'Supabase Layer',
    icon: Cloud,
    description: 'The platform between your app and PostgreSQL',
    modules: [
      {
        id: 'supabase-architecture',
        title: 'System Boundaries',
        type: 'dataflow',
        why: "Supabase isn't just a database - it's a platform with multiple services. Understanding which service does what helps you use the right tool and debug issues.",
        pitfalls: [
          "Thinking Supabase IS Postgres - it's a layer ON TOP of Postgres",
          "Not realizing the JS client talks to PostgREST, not Postgres directly",
          "Confusing auth.users (Supabase auth) with public.users (your table)",
          "Expecting SQL features that PostgREST doesn't expose"
        ],
        content: {
          description: 'How your app connects through Supabase\'s services to PostgreSQL',
          nodes: [
            { id: 'app', label: 'Your App', type: 'boundary', x: 30, y: 110 },
            { id: 'client', label: 'supabase-js\nClient', type: 'flow', x: 140, y: 110 },
            { id: 'postgrest', label: 'PostgREST\n(REST API)', type: 'process', x: 280, y: 40 },
            { id: 'gotrue', label: 'GoTrue\n(Auth)', type: 'process', x: 280, y: 110 },
            { id: 'realtime', label: 'Realtime\n(WebSocket)', type: 'process', x: 280, y: 180 },
            { id: 'postgres', label: 'PostgreSQL', type: 'boundary', x: 430, y: 110 },
          ],
          edges: [
            { from: 'app', to: 'client' },
            { from: 'client', to: 'postgrest' },
            { from: 'client', to: 'gotrue' },
            { from: 'client', to: 'realtime' },
            { from: 'postgrest', to: 'postgres' },
            { from: 'gotrue', to: 'postgres' },
            { from: 'realtime', to: 'postgres' },
          ],
          reveals: {
            app: 'Your frontend or backend code. Uses the Supabase JavaScript client library.',
            client: 'supabase.from("users").select("*") - translates your code into API calls. Handles auth tokens.',
            postgrest: 'Auto-generates REST API from your database schema. Tables become endpoints. supabase.from() uses this.',
            gotrue: 'Handles signUp, signIn, JWT tokens, OAuth providers. Creates auth.users entries.',
            realtime: 'Listens to database changes. When a row changes, pushes to subscribed clients via WebSocket.',
            postgres: 'Your actual database. You have full SQL access in the dashboard. This is where your data lives.',
          }
        },
        exercises: [
          {
            id: 'supabase-select',
            prompt: 'What happens when you call supabase.from("users").select("*")? (Describe the flow)',
            hint: 'Client → PostgREST → PostgreSQL → back',
            starterCode: '-- Describe the flow: ',
            solution: '-- Client sends HTTP GET to PostgREST API, PostgREST translates to SELECT * FROM users, runs against Postgres, returns JSON',
            validator: () => true
          }
        ]
      },
      {
        id: 'rls-concept',
        title: 'Row Level Security',
        type: 'conceptmap',
        why: "Supabase exposes your database via API. Without RLS, anyone with your API URL could read/write all data. RLS adds WHERE clauses at the database level that can't be bypassed.",
        pitfalls: [
          "Tables are PUBLIC by default when RLS is disabled - anyone can read everything!",
          "Enabling RLS with no policies = no access (locked out)",
          "Forgetting INSERT/UPDATE/DELETE policies - SELECT policy alone isn't enough",
          "Using service_role key in browser exposes ability to bypass RLS"
        ],
        content: {
          central: 'Row Level Security',
          branches: [
            {
              label: 'The Problem',
              color: '#ef4444',
              details: 'Your API is public. Anyone can call it. How do you ensure users only see their own data?',
              syntax: "-- Without RLS, this returns ALL users:\nsupabase.from('users').select('*')\n-- Including other people's data!",
              children: ['API key is public', 'No server middleware', 'Can\'t trust the client', 'Need database-level security']
            },
            {
              label: 'Enable RLS',
              color: '#3b82f6',
              details: 'First step: turn on RLS for the table. This blocks ALL access until you add policies.',
              syntax: "ALTER TABLE posts\n  ENABLE ROW LEVEL SECURITY;\n-- Now NO ONE can access (even you)",
              children: ['Per-table setting', 'Blocks all by default', 'Must add policies', 'In Supabase UI: Table → RLS']
            },
            {
              label: 'auth.uid()',
              color: '#8b5cf6',
              details: 'Magic function that returns the current user\'s ID from their JWT token. NULL if not logged in.',
              syntax: "-- In policy:\nUSING (user_id = auth.uid())\n-- Only rows where user_id matches",
              children: ['From JWT token', 'NULL if anonymous', 'Use in USING clause', 'Can\'t be faked']
            },
            {
              label: 'Policy Types',
              color: '#22c55e',
              details: 'Different policies for different operations. A SELECT policy doesn\'t grant INSERT.',
              syntax: "CREATE POLICY \"Users can read own\"\n  ON posts FOR SELECT\n  USING (user_id = auth.uid());",
              children: ['FOR SELECT (read)', 'FOR INSERT (create)', 'FOR UPDATE (modify)', 'FOR DELETE (remove)']
            },
            {
              label: 'Common Patterns',
              color: '#f59e0b',
              details: 'Typical RLS policies you\'ll use repeatedly.',
              syntax: "-- Public read, auth write:\nFOR SELECT USING (true)\nFOR INSERT WITH CHECK\n  (auth.uid() IS NOT NULL)",
              children: ['Own data only', 'Public read', 'Team/org access', 'Admin override']
            }
          ]
        },
        exercises: [
          {
            id: 'rls-policy',
            prompt: 'Write a policy description: how would you ensure users can only see their own posts?',
            hint: 'Compare user_id column to auth.uid()',
            starterCode: '-- Policy: FOR SELECT ON posts USING (___)',
            solution: '-- Policy: FOR SELECT ON posts USING (user_id = auth.uid())',
            validator: () => true
          }
        ]
      },
      {
        id: 'client-patterns',
        title: 'Client Query Patterns',
        type: 'conceptmap',
        why: "The Supabase JS client translates method chains into PostgREST queries. Understanding this mapping helps you write efficient queries and debug issues.",
        pitfalls: [
          "Chaining .select() after .insert() is how you get RETURNING behavior",
          "Forgetting .single() when expecting one row returns an array",
          ".eq() is case-sensitive for text - use .ilike() for case-insensitive",
          "Error handling: always check for error in the response"
        ],
        content: {
          central: 'Supabase Client',
          branches: [
            {
              label: 'SELECT (Read)',
              color: '#3b82f6',
              details: 'Fetch data from a table. Chain filters, ordering, and limits.',
              syntax: "const { data, error } = await supabase\n  .from('posts')\n  .select('id, title')\n  .eq('published', true)\n  .order('created_at', { ascending: false })\n  .limit(10)",
              children: ['.select("*") or columns', '.eq(), .neq(), .gt(), .lt()', '.order(column, {ascending})', '.limit(n), .range(from, to)']
            },
            {
              label: 'INSERT (Create)',
              color: '#22c55e',
              details: 'Add new rows. Chain .select() to get the inserted data back (like RETURNING).',
              syntax: "const { data, error } = await supabase\n  .from('posts')\n  .insert({ title: 'New', user_id: '...' })\n  .select()  // ← RETURNING equivalent",
              children: ['.insert(object) single', '.insert([array]) batch', '.select() for RETURNING', '.upsert() for ON CONFLICT']
            },
            {
              label: 'UPDATE (Modify)',
              color: '#f59e0b',
              details: 'Change existing rows. MUST have a filter or it updates ALL rows!',
              syntax: "const { data, error } = await supabase\n  .from('posts')\n  .update({ published: true })\n  .eq('id', postId)  // ← Required!\n  .select()",
              children: ['.update(changes)', 'Filter is REQUIRED', '.select() for RETURNING', 'Without filter = ALL rows']
            },
            {
              label: 'DELETE (Remove)',
              color: '#ef4444',
              details: 'Remove rows. Like UPDATE, MUST have a filter to avoid deleting everything.',
              syntax: "const { error } = await supabase\n  .from('posts')\n  .delete()\n  .eq('id', postId)  // ← Required!",
              children: ['.delete() starts it', 'Filter is REQUIRED', '.select() gets deleted rows', 'RLS still applies']
            },
            {
              label: 'Error Handling',
              color: '#6b7280',
              details: 'Always destructure { data, error }. Check error before using data.',
              syntax: "const { data, error } = await supabase\n  .from('posts').select()\n\nif (error) {\n  console.error(error.message)\n  return\n}\n// Safe to use data here",
              children: ['Always check error', 'error.message for text', 'error.code for type', 'data is null on error']
            }
          ]
        },
        exercises: [
          {
            id: 'client-pattern-1',
            prompt: 'How would you fetch the 5 most recent published posts using supabase-js?',
            hint: '.from().select().eq().order().limit()',
            starterCode: "// supabase.from('posts')._____",
            solution: "// supabase.from('posts').select('*').eq('published', true).order('created_at', { ascending: false }).limit(5)",
            validator: () => true
          }
        ]
      },
      {
        id: 'auth-flow',
        title: 'Auth Flow',
        type: 'dataflow',
        why: "Authentication is how users prove who they are. Supabase handles the complexity: signup, login, password reset, OAuth. You get JWTs that work with RLS.",
        pitfalls: [
          "Storing session in localStorage is default but vulnerable to XSS",
          "Not listening to onAuthStateChange means missing token refreshes",
          "Confusing auth.users (Supabase-managed) with your users table (you manage)",
          "JWT expires - client handles refresh automatically, but long offline = re-login"
        ],
        content: {
          description: 'How user authentication flows through Supabase',
          nodes: [
            { id: 'user', label: 'User\nClicks Login', type: 'boundary', x: 30, y: 100 },
            { id: 'client', label: 'supabase\n.auth.signIn()', type: 'flow', x: 150, y: 100 },
            { id: 'gotrue', label: 'GoTrue\nVerifies', type: 'process', x: 290, y: 100 },
            { id: 'jwt', label: 'JWT Token\n(contains uid)', type: 'flow', x: 420, y: 40 },
            { id: 'session', label: 'Session\nStored', type: 'process', x: 420, y: 160 },
            { id: 'api', label: 'API Calls\n+ Token', type: 'boundary', x: 550, y: 100 },
          ],
          edges: [
            { from: 'user', to: 'client' },
            { from: 'client', to: 'gotrue' },
            { from: 'gotrue', to: 'jwt' },
            { from: 'gotrue', to: 'session' },
            { from: 'jwt', to: 'api' },
            { from: 'session', to: 'client' },
          ],
          reveals: {
            user: 'User provides email/password, or clicks OAuth provider (Google, GitHub, etc.)',
            client: 'signInWithPassword({email, password}) or signInWithOAuth({provider})',
            gotrue: 'GoTrue service validates credentials against auth.users table. Creates session if valid.',
            jwt: 'JSON Web Token contains user ID (sub claim). Sent with every API request. RLS uses this!',
            session: 'Token + refresh token stored. Client auto-refreshes before expiry. Persists across page loads.',
            api: 'Every supabase.from() call includes the JWT. PostgREST extracts auth.uid() from it.',
          }
        },
        exercises: [
          {
            id: 'auth-flow-1',
            prompt: 'Why does RLS need authentication to work properly?',
            hint: 'How does auth.uid() get its value?',
            starterCode: '-- Explain: ',
            solution: '-- auth.uid() gets the user ID from the JWT token. Without authentication, auth.uid() is NULL, so policies comparing user_id = auth.uid() fail.',
            validator: () => true
          }
        ]
      }
    ]
  },
  migration: {
    id: 'migration',
    title: 'Migration Path',
    icon: RefreshCw,
    description: 'Moving from SQLite to Supabase PostgreSQL',
    modules: [
      {
        id: 'migration-flow',
        title: 'Migration Steps',
        type: 'dataflow',
        why: "Migration is a journey with multiple phases. Rushing leads to data loss or security holes. Following the steps ensures nothing is forgotten.",
        pitfalls: [
          "Migrating without RLS policies = publicly exposed data",
          "Assuming SQLite types translate 1:1 - they don't",
          "Not testing with real data volume - works in dev, fails in prod",
          "Forgetting to update app code - queries might use SQLite-specific syntax"
        ],
        content: {
          description: 'Step-by-step journey from local SQLite to hosted Supabase',
          nodes: [
            { id: 'audit', label: '1. Audit\nSchema', type: 'process', x: 30, y: 30 },
            { id: 'translate', label: '2. Translate\nTypes', type: 'process', x: 30, y: 110 },
            { id: 'create', label: '3. Create\nTables', type: 'process', x: 30, y: 190 },
            { id: 'rls', label: '4. Add\nRLS', type: 'process', x: 180, y: 190 },
            { id: 'data', label: '5. Migrate\nData', type: 'process', x: 180, y: 110 },
            { id: 'code', label: '6. Update\nCode', type: 'process', x: 180, y: 30 },
            { id: 'test', label: '7. Test\nFully', type: 'process', x: 330, y: 110 },
            { id: 'launch', label: '8. Launch', type: 'boundary', x: 460, y: 110 },
          ],
          edges: [
            { from: 'audit', to: 'translate' },
            { from: 'translate', to: 'create' },
            { from: 'create', to: 'rls' },
            { from: 'rls', to: 'data' },
            { from: 'data', to: 'code' },
            { from: 'code', to: 'test' },
            { from: 'test', to: 'launch' },
          ],
          reveals: {
            audit: 'Run .schema in SQLite. Document every table, column, type, constraint. Export as reference.',
            translate: 'Map types: INTEGER→INT, TEXT→TEXT, BLOB→BYTEA. Identify new opportunities: UUID? JSONB? TIMESTAMPTZ?',
            create: 'Create tables in Supabase SQL Editor. Add proper constraints (NOT NULL, UNIQUE, FK) that SQLite may have lacked.',
            rls: 'CRITICAL: Enable RLS on every table. Add policies before data goes in. Test policies work correctly.',
            data: 'Export from SQLite (CSV or SQL dump). Import to Supabase. Verify row counts match.',
            code: 'Replace sqlite3 with supabase-js. Update queries: last_insert_rowid()→RETURNING, etc.',
            test: 'Test ALL operations: CRUD, auth, RLS, edge cases. Test with multiple users. Load test if needed.',
            launch: 'Point production to Supabase. Monitor for errors. Keep SQLite backup until confident.',
          }
        },
        exercises: [
          {
            id: 'migration-order',
            prompt: 'Why should you add RLS policies BEFORE migrating data?',
            hint: 'What happens if data is in the table with no RLS?',
            starterCode: '-- Explain: ',
            solution: '-- If data is in a table without RLS, it could be publicly exposed during the window between data migration and policy creation.',
            validator: () => true
          }
        ]
      },
      {
        id: 'migration-faults',
        title: 'Migration Fault Tree',
        type: 'faulttree',
        why: "Migration can fail in many ways. Knowing the failure modes in advance helps you prevent them or recover quickly.",
        pitfalls: [],
        content: {
          root: 'Migration Fails',
          branches: [
            {
              fault: 'Schema Translation Errors',
              icon: 'warning',
              causes: [
                { cause: 'Type mismatch', detail: 'SQLite is dynamically typed. "123" in INTEGER column works. Postgres rejects it.', fix: 'Clean and cast data before migration. Run validation queries.' },
                { cause: 'NULL in PRIMARY KEY', detail: 'SQLite allows NULL in PRIMARY KEY (quirk). Postgres doesn\'t.', fix: 'Find NULLs: SELECT * WHERE pk IS NULL. Fix before migration.' },
                { cause: 'Reserved words as names', detail: 'Column named "user", "order", "group" - reserved in Postgres.', fix: 'Rename columns, or quote them: "user" (not recommended).' },
                { cause: 'Missing constraints', detail: 'SQLite often used without proper constraints. Postgres enforces them.', fix: 'Audit data for constraint violations before adding constraints.' }
              ]
            },
            {
              fault: 'Data Migration Errors',
              icon: 'warning',
              causes: [
                { cause: 'Encoding issues', detail: 'SQLite stores bytes as-is. Postgres expects valid UTF-8 text.', fix: 'Clean text data: iconv or Python to validate/fix encoding.' },
                { cause: 'Foreign key violations', detail: 'Orphaned child records that SQLite allowed without FK enforcement.', fix: 'Enable FK checking in SQLite first: PRAGMA foreign_keys=ON. Clean orphans.' },
                { cause: 'Date format problems', detail: 'SQLite stores dates as TEXT in any format. Postgres needs ISO format.', fix: 'Standardize date format during export. Use strftime() in SQLite.' },
                { cause: 'Sequence misalignment', detail: 'Auto-increment sequence doesn\'t know about imported IDs.', fix: 'After import: SELECT setval(seq, max(id)) FROM table;' }
              ]
            },
            {
              fault: 'Security/Access Errors',
              icon: 'error',
              causes: [
                { cause: 'No RLS enabled', detail: 'Table is fully public! Anyone with API URL can read/write all data.', fix: 'Enable RLS on EVERY table. Add restrictive policies before data.' },
                { cause: 'Overly permissive policies', detail: 'Policy says USING (true) - allows everyone to access everything.', fix: 'Test policies: act as different users, verify access is correct.' },
                { cause: 'Service key exposed', detail: 'Using service_role key in client-side code - bypasses ALL RLS.', fix: 'Use anon key in browser. Service key only on server (env variable).' },
                { cause: 'Missing policies for operations', detail: 'SELECT policy exists, but no INSERT/UPDATE/DELETE.', fix: 'Create policies for all operations your app needs.' }
              ]
            },
            {
              fault: 'Application Code Errors',
              icon: 'warning',
              causes: [
                { cause: 'last_insert_rowid()', detail: 'SQLite function. Doesn\'t exist in Postgres/Supabase.', fix: 'Use RETURNING clause or .select() after .insert() in supabase-js.' },
                { cause: 'AUTOINCREMENT keyword', detail: 'Postgres uses SERIAL or GENERATED ALWAYS AS IDENTITY.', fix: 'Update CREATE TABLE statements. Or use UUID instead.' },
                { cause: 'Datetime functions', detail: 'SQLite: datetime("now"). Postgres: NOW() or CURRENT_TIMESTAMP.', fix: 'Update all date/time function calls. Use TIMESTAMPTZ.' },
                { cause: 'Boolean handling', detail: 'SQLite uses 0/1 for booleans. Postgres has true/false type.', fix: 'Update queries to use true/false instead of 0/1.' }
              ]
            }
          ]
        },
        exercises: [
          {
            id: 'fault-prevention',
            prompt: 'You find a column named "order" in your SQLite schema. What should you do before migrating?',
            hint: '"order" is a reserved word in SQL',
            starterCode: '-- Solution: ',
            solution: '-- Rename the column to something non-reserved like "sort_order" or "order_number" before migrating.',
            validator: () => true
          }
        ]
      },
      {
        id: 'query-faults',
        title: 'Query Debugging',
        type: 'faulttree',
        why: "When queries return wrong results, systematic debugging saves hours. This fault tree gives you a checklist to work through.",
        pitfalls: [],
        content: {
          root: 'Query Returns Wrong Data',
          branches: [
            {
              fault: 'No Rows Returned',
              icon: 'warning',
              causes: [
                { cause: 'WHERE too restrictive', detail: 'Your conditions filter out everything. AND combines conditions strictly.', fix: 'Remove WHERE clauses one by one. Check each condition returns results.' },
                { cause: 'RLS blocking access', detail: 'Policy\'s USING clause evaluates to false for all rows.', fix: 'Test in SQL Editor with service role. Check auth.uid() value.' },
                { cause: 'Wrong schema/table', detail: 'public.users vs auth.users are different tables!', fix: 'Verify schema: \\dt in psql, or check Supabase Table Editor.' },
                { cause: 'Case sensitivity', detail: '"Alice" != "alice" in Postgres string comparison.', fix: 'Use ILIKE instead of LIKE, or LOWER() both sides.' },
                { cause: 'Empty JOIN result', detail: 'No matching rows between joined tables.', fix: 'Check join columns exist and have matching values. Try LEFT JOIN.' }
              ]
            },
            {
              fault: 'Too Many Rows',
              icon: 'warning',
              causes: [
                { cause: 'Missing WHERE clause', detail: 'No filter = all rows returned.', fix: 'Add appropriate WHERE conditions.' },
                { cause: 'Cartesian product from JOIN', detail: 'Missing or wrong ON clause creates every combination.', fix: 'Verify JOIN condition. Check for duplicate matches.' },
                { cause: 'Duplicate rows from JOIN', detail: 'Many-to-many relationship creates multiplied rows.', fix: 'Use DISTINCT, or rethink query structure. Aggregate if needed.' },
                { cause: 'RLS too permissive', detail: 'Policy allows access to more than intended.', fix: 'Review policy. Ensure auth.uid() check is correct.' }
              ]
            },
            {
              fault: 'Wrong Values in Results',
              icon: 'warning',
              causes: [
                { cause: 'Column name ambiguity', detail: 'Both tables have "id" - which one did you get?', fix: 'Use aliases: users.id AS user_id, posts.id AS post_id.' },
                { cause: 'NULL behavior', detail: 'NULL + anything = NULL. NULL comparisons always false.', fix: 'Use COALESCE(col, default). Use IS NULL not = NULL.' },
                { cause: 'Type coercion', detail: 'Implicit casting changing values unexpectedly.', fix: 'Use explicit CAST(). Check column type matches expected.' },
                { cause: 'Timezone issues', detail: 'TIMESTAMP without TZ interpreted differently by server/client.', fix: 'Use TIMESTAMPTZ. Store and compare in UTC.' }
              ]
            },
            {
              fault: 'Query Too Slow',
              icon: 'info',
              causes: [
                { cause: 'Missing index', detail: 'Full table scan on every query. O(n) per query.', fix: 'Add index on columns used in WHERE, JOIN, ORDER BY.' },
                { cause: 'N+1 query pattern', detail: 'Loop in app code, query per iteration.', fix: 'Use JOIN to fetch related data in one query.' },
                { cause: 'SELECT * waste', detail: 'Fetching columns you don\'t need. More data to transfer.', fix: 'Select only columns you need. Especially avoid large TEXT/JSONB.' },
                { cause: 'Function on indexed column', detail: 'WHERE LOWER(name) = ... can\'t use index on name.', fix: 'Create functional index, or store pre-lowercased.' }
              ]
            }
          ]
        },
        exercises: [
          {
            id: 'debug-scenario',
            prompt: 'Your query returns 0 rows but you know the data exists. What\'s your debugging sequence?',
            hint: 'Check RLS, then WHERE conditions one by one',
            starterCode: '-- Debug steps: ',
            solution: '-- 1. Test same query in SQL Editor with service role (bypasses RLS). 2. If it works, RLS is the issue - check auth.uid(). 3. If not, remove WHERE clauses one by one to find the filtering issue.',
            validator: () => true
          }
        ]
      },
      {
        id: 'type-translation',
        title: 'Type Translation Reference',
        type: 'conceptmap',
        why: "A quick reference for translating SQLite types to Postgres equivalents. Bookmark this for your migration.",
        pitfalls: [],
        content: {
          central: 'Type Mapping',
          branches: [
            {
              label: 'Numeric Types',
              color: '#3b82f6',
              details: 'SQLite is loose with numbers. Postgres has specific sizes.',
              syntax: "INTEGER → INT or BIGINT\nREAL → FLOAT or DOUBLE PRECISION\n(any) → NUMERIC(p,s) for exact",
              children: ['SMALLINT (2 bytes)', 'INT (4 bytes)', 'BIGINT (8 bytes)', 'NUMERIC (exact decimal)']
            },
            {
              label: 'Text Types',
              color: '#22c55e',
              details: 'TEXT works in both. Postgres adds VARCHAR for bounded length.',
              syntax: "TEXT → TEXT (unbounded)\nTEXT → VARCHAR(n) (limited)\nTEXT → CHAR(n) (fixed, padded)",
              children: ['TEXT (any length)', 'VARCHAR(n) (max n)', 'CHAR(n) (exactly n)', 'Always UTF-8']
            },
            {
              label: 'Date/Time',
              color: '#f59e0b',
              details: 'SQLite stores as TEXT. Postgres has real date/time types.',
              syntax: "TEXT → DATE (date only)\nTEXT → TIME (time only)\nTEXT → TIMESTAMP(TZ) (both)",
              children: ['DATE (YYYY-MM-DD)', 'TIME (HH:MM:SS)', 'TIMESTAMP (no TZ)', 'TIMESTAMPTZ (with TZ) ✓']
            },
            {
              label: 'Binary/Other',
              color: '#8b5cf6',
              details: 'BLOB becomes BYTEA. Consider JSONB for structured data.',
              syntax: "BLOB → BYTEA\nTEXT (json) → JSONB\nINTEGER (bool) → BOOLEAN",
              children: ['BYTEA (binary)', 'JSONB (JSON, indexed)', 'BOOLEAN (true/false)', 'UUID (unique IDs)']
            }
          ]
        },
        exercises: [
          {
            id: 'type-exercise',
            prompt: 'What Postgres type would you use for a user\'s registration date and why?',
            hint: 'Consider timezones',
            starterCode: '-- Answer: ',
            solution: '-- TIMESTAMPTZ - stores the date/time with timezone info. Prevents bugs when users are in different timezones.',
            validator: () => true
          }
        ]
      }
    ]
  }
};

// ============================================================
// VISUALIZATION COMPONENTS
// ============================================================

const DataFlowDiagram = ({ content, revealed, onReveal, frozen }) => {
  const { nodes, edges, reveals, description } = content;
  
  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <p className="text-slate-300 text-sm mb-4">{description}</p>
      <svg viewBox="0 0 600 260" className="w-full h-56">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>
        
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from);
          const to = nodes.find(n => n.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x + 55}
              y1={from.y + 30}
              x2={to.x + 5}
              y2={to.y + 30}
              stroke="#64748b"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        
        {nodes.map((node) => {
          const isRevealed = revealed.includes(node.id);
          const hasReveal = reveals && reveals[node.id];
          const colors = {
            boundary: { fill: '#1e40af', stroke: '#3b82f6' },
            flow: { fill: '#065f46', stroke: '#10b981' },
            process: { fill: '#7c2d12', stroke: '#f97316' },
          };
          const color = colors[node.type] || colors.process;
          
          return (
            <g key={node.id}>
              <rect
                x={node.x}
                y={node.y}
                width="110"
                height="60"
                rx="6"
                fill={color.fill}
                stroke={isRevealed ? '#fff' : color.stroke}
                strokeWidth={isRevealed ? 3 : 2}
                className={hasReveal && !frozen ? 'cursor-pointer hover:opacity-80' : ''}
                onClick={() => hasReveal && !frozen && onReveal(node.id)}
              />
              <text
                x={node.x + 55}
                y={node.y + 20}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                className="pointer-events-none"
              >
                {node.label.split('\n').map((line, i) => (
                  <tspan key={i} x={node.x + 55} dy={i === 0 ? 0 : 13}>{line}</tspan>
                ))}
              </text>
              {hasReveal && !isRevealed && !frozen && (
                <circle cx={node.x + 100} cy={node.y + 10} r="6" fill="#8b5cf6" className="animate-pulse" />
              )}
            </g>
          );
        })}
      </svg>
      
      {reveals && Object.keys(reveals).length > 0 && (
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(reveals).map(([nodeId, detail]) => {
            const isRevealed = revealed.includes(nodeId) || frozen;
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return null;
            return (
              <div
                key={nodeId}
                className={`p-3 rounded border transition-all ${
                  isRevealed
                    ? 'bg-slate-800 border-slate-600'
                    : 'bg-slate-800/50 border-slate-700 cursor-pointer hover:border-violet-500'
                }`}
                onClick={() => !frozen && !isRevealed && onReveal(nodeId)}
              >
                <div className="flex items-center gap-2">
                  {isRevealed ? (
                    <Eye size={14} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <EyeOff size={14} className="text-slate-500 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-slate-300">{node.label.replace(/\n/g, ' ')}</span>
                </div>
                {isRevealed && (
                  <p className="text-sm text-slate-400 mt-2 ml-6">{detail}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ConceptMap = ({ content, revealed, onReveal, frozen }) => {
  const { central, branches } = content;
  
  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <div className="flex flex-col items-center">
        <div className="bg-slate-700 text-white px-5 py-2 rounded-full font-bold mb-4">
          {central}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          {branches.map((branch, i) => {
            const isRevealed = revealed.includes(branch.label) || frozen;
            
            return (
              <div
                key={i}
                className={`rounded-lg border-2 transition-all ${
                  isRevealed ? 'border-opacity-100' : 'border-opacity-50 cursor-pointer hover:border-opacity-80'
                }`}
                style={{ borderColor: branch.color }}
                onClick={() => !frozen && !isRevealed && onReveal(branch.label)}
              >
                <div
                  className="px-3 py-2 font-medium text-white text-sm flex items-center justify-between"
                  style={{ backgroundColor: branch.color + '33' }}
                >
                  <span>{branch.label}</span>
                  {!isRevealed && !frozen && (
                    <ChevronRight size={14} className="text-slate-400" />
                  )}
                </div>
                
                {isRevealed && (
                  <div className="p-3 bg-slate-800 space-y-2">
                    <p className="text-slate-300 text-sm">{branch.details}</p>
                    {branch.syntax && (
                      <pre className="bg-slate-900 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                        {branch.syntax}
                      </pre>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {branch.children.map((child, j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
                        >
                          {child}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FaultTree = ({ content, revealed, onReveal, frozen }) => {
  const { root, branches } = content;
  
  const iconMap = {
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
  };
  
  return (
    <div className="bg-slate-900 rounded-lg p-4">
      <div className="flex justify-center mb-4">
        <div className="bg-red-900/80 border-2 border-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
          <Diamond size={18} />
          {root}
        </div>
      </div>
      
      <div className="space-y-3">
        {branches.map((branch, i) => {
          const isRevealed = revealed.includes(branch.fault) || frozen;
          
          return (
            <div key={i} className="border border-slate-700 rounded-lg overflow-hidden">
              <div
                className={`px-3 py-2 bg-slate-800 flex items-center justify-between ${
                  !frozen && !isRevealed ? 'cursor-pointer hover:bg-slate-700' : ''
                }`}
                onClick={() => !frozen && !isRevealed && onReveal(branch.fault)}
              >
                <div className="flex items-center gap-2">
                  {iconMap[branch.icon]}
                  <span className="font-medium text-white text-sm">{branch.fault}</span>
                </div>
                {isRevealed ? (
                  <ChevronDown size={14} className="text-slate-400" />
                ) : (
                  <ChevronRight size={14} className="text-slate-400" />
                )}
              </div>
              
              {isRevealed && (
                <div className="divide-y divide-slate-700 max-h-64 overflow-y-auto">
                  {branch.causes.map((item, j) => (
                    <div key={j} className="p-3 bg-slate-800/50">
                      <div className="flex items-start gap-2">
                        <ArrowRight size={12} className="text-slate-500 mt-1 flex-shrink-0" />
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-medium text-slate-200 text-sm">{item.cause}</p>
                          <p className="text-xs text-slate-400">{item.detail}</p>
                          <div className="flex items-start gap-1 text-xs">
                            <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-green-300">{item.fix}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================
// SCHEMA REFERENCE COMPONENT
// ============================================================

const SchemaReference = ({ tables, expanded: initialExpanded = false }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [activeTable, setActiveTable] = useState(tables[0] || null);
  
  if (!tables || tables.length === 0) return null;
  
  return (
    <div className="border border-slate-600 rounded-lg bg-slate-800/50 mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700/50 rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Table size={14} className="text-emerald-400" />
          <span className="text-sm font-medium text-slate-200">Schema Reference</span>
          <span className="text-xs text-slate-400">({tables.join(', ')})</span>
        </div>
        {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          {/* Table tabs */}
          <div className="flex gap-1 mb-2 flex-wrap">
            {tables.map(table => (
              <button
                key={table}
                onClick={() => setActiveTable(table)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  activeTable === table 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {table}
              </button>
            ))}
          </div>
          
          {/* Active table schema */}
          {activeTable && schemaDefinitions[activeTable] && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">{schemaDefinitions[activeTable].description}</p>
              
              {/* Columns */}
              <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-1 pr-3">Column</th>
                      <th className="text-left py-1 pr-3">Type</th>
                      <th className="text-left py-1">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schemaDefinitions[activeTable].columns.map(col => (
                      <tr key={col.name} className="text-slate-300">
                        <td className="py-0.5 pr-3 font-mono text-emerald-400">{col.name}</td>
                        <td className="py-0.5 pr-3 text-blue-300">{col.type}</td>
                        <td className="py-0.5 text-slate-500">{col.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Sample data preview */}
              <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                <p className="text-xs text-slate-500 mb-1">Sample data ({sampleDatabase[activeTable].length} rows):</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      {Object.keys(sampleDatabase[activeTable][0]).map(col => (
                        <th key={col} className="text-left py-1 pr-2 font-mono">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleDatabase[activeTable].slice(0, 3).map((row, i) => (
                      <tr key={i} className="text-slate-300 border-b border-slate-800">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="py-0.5 pr-2 truncate max-w-24">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sampleDatabase[activeTable].length > 3 && (
                  <p className="text-xs text-slate-600 mt-1">...and {sampleDatabase[activeTable].length - 3} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// DATABASE VIEWER COMPONENT (for dashboard)
// ============================================================

const DatabaseViewer = ({ isOpen, onClose }) => {
  const [activeTable, setActiveTable] = useState('users');
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-400" />
            <span className="font-bold text-white">Practice Database</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <XCircle size={20} />
          </button>
        </div>
        
        {/* Table tabs */}
        <div className="px-4 py-2 border-b border-slate-700 flex gap-2 flex-wrap">
          {Object.keys(sampleDatabase).map(table => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                activeTable === table 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {table} ({sampleDatabase[table].length})
            </button>
          ))}
        </div>
        
        {/* Schema info */}
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700">
          <p className="text-sm text-slate-300 mb-2">{schemaDefinitions[activeTable].description}</p>
          <div className="flex flex-wrap gap-2">
            {schemaDefinitions[activeTable].columns.map(col => (
              <span key={col.name} className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                <span className="text-emerald-400 font-mono">{col.name}</span>
                <span className="text-slate-500 mx-1">:</span>
                <span className="text-blue-300">{col.type}</span>
                {col.note && <span className="text-slate-500 ml-1">({col.note})</span>}
              </span>
            ))}
          </div>
          {schemaDefinitions[activeTable].relationships.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Relationships:</span>
              {schemaDefinitions[activeTable].relationships.map((rel, i) => (
                <span key={i} className="text-xs text-amber-400">{rel}</span>
              ))}
            </div>
          )}
        </div>
        
        {/* Data table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-600">
                {Object.keys(sampleDatabase[activeTable][0]).map(col => (
                  <th key={col} className="text-left py-2 px-2 text-slate-300 font-mono font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleDatabase[activeTable].map((row, i) => (
                <tr key={i} className="border-b border-slate-700 hover:bg-slate-700/50">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="py-1.5 px-2 text-slate-300">{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-900/50">
          <p className="text-xs text-slate-500">
            This sample data is used in all practice exercises. Tables are related via foreign keys (user_id, post_id).
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SQL EXERCISE COMPONENT
// ============================================================

const SQLExercise = ({ exercise, onComplete, isComplete }) => {
  const [code, setCode] = useState(exercise.starterCode);
  const [result, setResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [passed, setPassed] = useState(isComplete);
  
  const runQuery = () => {
    const queryResult = executeSQL(code);
    setResult(queryResult);
    
    if (!queryResult.error && exercise.validator(queryResult)) {
      setPassed(true);
      onComplete(exercise.id);
    }
  };
  
  return (
    <div className="border border-slate-600 rounded-lg p-3 bg-slate-800/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-slate-200">{exercise.prompt}</p>
        {passed && <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />}
      </div>
      
      <div className="space-y-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-slate-900 text-green-400 font-mono text-sm p-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none resize-none"
          rows={3}
          placeholder="Write your SQL here..."
          disabled={passed}
        />
        
        <div className="flex items-center gap-2">
          <button
            onClick={runQuery}
            disabled={passed}
            className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${
              passed 
                ? 'bg-green-600/50 text-green-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            <Play size={14} />
            {passed ? 'Completed' : 'Run'}
          </button>
          
          {!passed && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="px-3 py-1 rounded text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center gap-1"
            >
              <Lightbulb size={14} />
              Hint
            </button>
          )}
        </div>
        
        {showHint && !passed && (
          <p className="text-xs text-amber-300 bg-amber-900/30 p-2 rounded">
            💡 {exercise.hint}
          </p>
        )}
        
        {result && (
          <div className="mt-2">
            {result.error ? (
              <div className="text-red-400 text-xs bg-red-900/30 p-2 rounded">
                ❌ {result.error}
              </div>
            ) : (
              <div className="text-xs">
                {result.message && (
                  <p className="text-blue-300 mb-1">{result.message}</p>
                )}
                <p className="text-slate-400 mb-1">
                  {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
                </p>
                {result.results && result.results.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-600">
                          {Object.keys(result.results[0]).map(col => (
                            <th key={col} className="px-2 py-1 text-slate-300 font-medium">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.results.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-slate-700">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-2 py-1 text-slate-400">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.results.length > 5 && (
                      <p className="text-slate-500 mt-1">...and {result.results.length - 5} more rows</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MODULE VIEW COMPONENT
// ============================================================

const ModuleView = ({ module, progress, onComplete, onBack }) => {
  const [revealed, setRevealed] = useState(progress?.revealed || []);
  const [completedExercises, setCompletedExercises] = useState(progress?.exercises || []);
  const isComplete = progress?.complete;
  
  const handleReveal = (id) => {
    if (!revealed.includes(id)) {
      setRevealed([...revealed, id]);
    }
  };
  
  const handleExerciseComplete = (exerciseId) => {
    if (!completedExercises.includes(exerciseId)) {
      setCompletedExercises([...completedExercises, exerciseId]);
    }
  };
  
  const getRequiredReveals = () => {
    if (module.type === 'dataflow' && module.content.reveals) {
      return Object.keys(module.content.reveals);
    } else if (module.type === 'conceptmap') {
      return module.content.branches.map(b => b.label);
    } else if (module.type === 'faulttree') {
      return module.content.branches.map(b => b.fault);
    }
    return [];
  };
  
  const requiredReveals = getRequiredReveals();
  const allRevealed = requiredReveals.every(r => revealed.includes(r));
  const exercises = module.exercises || [];
  const allExercisesComplete = exercises.length === 0 || exercises.every(e => completedExercises.includes(e.id));
  const canComplete = allRevealed && allExercisesComplete && !isComplete;
  
  const renderContent = () => {
    const props = {
      content: module.content,
      revealed,
      onReveal: handleReveal,
      frozen: isComplete,
    };
    
    switch (module.type) {
      case 'dataflow':
        return <DataFlowDiagram {...props} />;
      case 'conceptmap':
        return <ConceptMap {...props} />;
      case 'faulttree':
        return <FaultTree {...props} />;
      default:
        return <div>Unknown module type</div>;
    }
  };
  
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm"
      >
        <ChevronRight size={16} className="rotate-180" />
        Back
      </button>
      
      <div className="bg-slate-800 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{module.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              {module.type === 'dataflow' && <Map size={14} className="text-blue-400" />}
              {module.type === 'conceptmap' && <GitBranch size={14} className="text-green-400" />}
              {module.type === 'faulttree' && <AlertTriangle size={14} className="text-amber-400" />}
              <span className="text-xs text-slate-400 capitalize">{module.type.replace('map', ' Map').replace('tree', ' Tree').replace('flow', ' Flow')}</span>
            </div>
          </div>
          {isComplete && (
            <span className="flex items-center gap-1 text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded">
              <CheckCircle2 size={12} />
              Complete
            </span>
          )}
        </div>
        
        {/* Why This Matters */}
        {module.why && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={14} className="text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Why This Matters</span>
            </div>
            <p className="text-sm text-slate-300">{module.why}</p>
          </div>
        )}
        
        {/* Pitfalls */}
        {module.pitfalls && module.pitfalls.length > 0 && (
          <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Watch Out For</span>
            </div>
            <ul className="space-y-1">
              {module.pitfalls.map((pitfall, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {pitfall}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Main Content */}
        {renderContent()}
        
        {/* Exercises */}
        {exercises.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={16} className="text-green-400" />
              <span className="font-medium text-white">Practice Exercises</span>
              <span className="text-xs text-slate-400">
                ({completedExercises.length}/{exercises.length} complete)
              </span>
            </div>
            
            {/* Schema Reference for this module */}
            {moduleTableHints[module.id] && moduleTableHints[module.id].length > 0 && (
              <SchemaReference 
                tables={moduleTableHints[module.id]} 
                expanded={false}
              />
            )}
            
            <div className="space-y-3">
              {exercises.map(exercise => (
                <SQLExercise
                  key={exercise.id}
                  exercise={exercise}
                  onComplete={handleExerciseComplete}
                  isComplete={completedExercises.includes(exercise.id) || isComplete}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Completion */}
        {!isComplete && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {revealed.length}/{requiredReveals.length} concepts
                {exercises.length > 0 && ` • ${completedExercises.length}/${exercises.length} exercises`}
              </div>
              {canComplete ? (
                <button
                  onClick={() => onComplete(module.id, revealed, completedExercises)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-medium flex items-center gap-1"
                >
                  <Check size={14} />
                  Complete & Freeze
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  {!allRevealed ? 'Reveal all concepts' : 'Complete exercises'} to finish
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// CATEGORY & DASHBOARD VIEWS
// ============================================================

const CategoryView = ({ category, progress, onSelectModule }) => {
  const Icon = category.icon;
  
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-700 rounded-lg">
          <Icon size={22} className="text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">{category.title}</h2>
          <p className="text-xs text-slate-400">{category.description}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {category.modules.map((module) => {
          const moduleProgress = progress[module.id];
          const isComplete = moduleProgress?.complete;
          
          return (
            <button
              key={module.id}
              onClick={() => onSelectModule(module)}
              className="w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle2 size={16} className="text-green-400" />
                ) : (
                  <Circle size={16} className="text-slate-500" />
                )}
                <div>
                  <span className="text-white text-sm font-medium">{module.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {module.type === 'dataflow' && (
                      <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Flow</span>
                    )}
                    {module.type === 'conceptmap' && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Map</span>
                    )}
                    {module.type === 'faulttree' && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Fault</span>
                    )}
                    {module.exercises && module.exercises.length > 0 && (
                      <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Code size={10} />
                        {module.exercises.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-500 group-hover:text-white" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard = ({ progress, onSelectCategory }) => {
  const categories = Object.values(curriculum);
  const [showDatabase, setShowDatabase] = useState(false);
  
  const getStats = () => {
    let total = 0;
    let complete = 0;
    categories.forEach(cat => {
      cat.modules.forEach(mod => {
        total++;
        if (progress[mod.id]?.complete) complete++;
      });
    });
    return { total, complete, percent: total > 0 ? Math.round((complete / total) * 100) : 0 };
  };
  
  const stats = getStats();
  
  return (
    <div className="space-y-4">
      {/* Database Viewer Modal */}
      <DatabaseViewer isOpen={showDatabase} onClose={() => setShowDatabase(false)} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg p-4">
        <h1 className="text-xl font-bold text-white mb-1">SQL Learning Journey</h1>
        <p className="text-blue-100 text-sm mb-3">SQLite → PostgreSQL → Supabase</p>
        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-500"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
        <p className="text-xs text-blue-100 mt-1">
          {stats.complete}/{stats.total} modules ({stats.percent}%)
        </p>
      </div>
      
      {/* Sample Database Info - Now Clickable */}
      <button
        onClick={() => setShowDatabase(true)}
        className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-left transition-colors group"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-emerald-400" />
            <span className="font-medium text-white text-sm">Practice Database</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-emerald-400 transition-colors">
            <Eye size={12} />
            <span>View Data</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-2">Click to explore the sample data used in exercises:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sampleDatabase).map(([table, rows]) => (
            <span key={table} className="text-xs bg-slate-700 group-hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded transition-colors">
              {table} ({rows.length})
            </span>
          ))}
        </div>
      </button>
      
      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const moduleCount = category.modules.length;
          const completeCount = category.modules.filter(m => progress[m.id]?.complete).length;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className="bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-left transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={20} className="text-blue-400" />
                <span className="font-bold text-white text-sm">{category.title}</span>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-white ml-auto" />
              </div>
              <p className="text-xs text-slate-400 mb-2">{category.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all"
                    style={{ width: `${(completeCount / moduleCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{completeCount}/{moduleCount}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-slate-400" />
          <span className="text-sm font-medium text-white">Module Types</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Map size={12} className="text-blue-400" />
            <span className="text-slate-300">Data Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <GitBranch size={12} className="text-green-400" />
            <span className="text-slate-300">Concept Map</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-slate-300">Fault Tree</span>
          </div>
          <div className="flex items-center gap-1">
            <Code size={12} className="text-violet-400" />
            <span className="text-slate-300">Exercises</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================

export default function SQLLearningPlatform() {
  const [progress, setProgress] = useState({});
  const [view, setView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProgress().then(saved => {
      if (saved) setProgress(saved);
      setLoading(false);
    });
  }, []);
  
  useEffect(() => {
    if (!loading) {
      saveProgress(progress);
    }
  }, [progress, loading]);
  
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setView('category');
  };
  
  const handleSelectModule = (module) => {
    setSelectedModule(module);
    setView('module');
  };
  
  const handleCompleteModule = (moduleId, revealed, exercises) => {
    setProgress(prev => ({
      ...prev,
      [moduleId]: { complete: true, revealed, exercises, completedAt: new Date().toISOString() }
    }));
  };
  
  const handleBack = () => {
    if (view === 'module') {
      setView('category');
      setSelectedModule(null);
    } else if (view === 'category') {
      setView('dashboard');
      setSelectedCategory(null);
    }
  };
  
  const handleReset = async () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      setProgress({});
      try {
        await window.storage.delete(STORAGE_KEY);
      } catch (e) {
        console.error('Failed to delete progress:', e);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 p-3 md:p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {view !== 'dashboard' && (
              <button
                onClick={handleBack}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-blue-400" />
              <span className="font-bold text-white text-sm">SQL Learning Platform</span>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reset
          </button>
        </div>
        
        {view === 'dashboard' && (
          <Dashboard progress={progress} onSelectCategory={handleSelectCategory} />
        )}
        
        {view === 'category' && selectedCategory && (
          <CategoryView
            category={selectedCategory}
            progress={progress}
            onSelectModule={handleSelectModule}
          />
        )}
        
        {view === 'module' && selectedModule && (
          <ModuleView
            module={selectedModule}
            progress={progress[selectedModule.id]}
            onComplete={handleCompleteModule}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
