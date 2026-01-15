import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, ChevronDown, Check, AlertTriangle, Database, Server, Cloud, ArrowRight, Circle, Diamond, Eye, EyeOff, BookOpen, Map, GitBranch, Layers, RefreshCw, CheckCircle2, XCircle, Play, Terminal, Info, Lightbulb, AlertCircle, Code, Table, Star, FileText, Printer, Download, MessageSquare, Keyboard, Search, Shuffle, X, HelpCircle, Bookmark } from 'lucide-react';

// ============================================================
// STORAGE UTILITIES
// ============================================================

const STORAGE_KEY = 'sql-learning-progress-v3';
const NOTES_KEY = 'sql-learning-notes-v1';

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

const saveNotes = async (notes) => {
  try {
    await window.storage.set(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes:', e);
  }
};

const loadNotes = async () => {
  try {
    const result = await window.storage.get(NOTES_KEY);
    return result ? JSON.parse(result.value) : null;
  } catch (e) {
    console.error('Failed to load notes:', e);
    return null;
  }
};

// ============================================================
// SQL EXERCISE ENGINE
// ============================================================

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

// SQL Executor
const executeSQL = (sql, db = sampleDatabase) => {
  try {
    const normalizedSQL = sql.trim().toLowerCase().replace(/\s+/g, ' ');
    
    if (normalizedSQL.startsWith('select')) {
      return executeSelect(sql, db);
    }
    if (normalizedSQL.startsWith('insert')) {
      return executeInsert(sql, db);
    }
    if (normalizedSQL.startsWith('update')) {
      return executeUpdate(sql, db);
    }
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
  
  const fromMatch = normalized.match(/from\s+(\w+)/i);
  if (!fromMatch) return { error: 'Missing FROM clause' };
  
  const tableName = fromMatch[1].toLowerCase();
  if (!db[tableName]) return { error: `Table '${tableName}' not found. Available: ${Object.keys(db).join(', ')}` };
  
  let results = [...db[tableName]];
  
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
  
  const whereMatch = normalized.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/i);
  if (whereMatch) {
    const condition = whereMatch[1].trim();
    results = applyWhere(results, condition);
  }
  
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
  
  const limitMatch = normalized.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    results = results.slice(0, parseInt(limitMatch[1]));
  }
  
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
  
  const selectMatch = normalized.match(/select\s+(.+?)\s+from/i);
  if (selectMatch) {
    const cols = selectMatch[1].trim();
    if (cols !== '*') {
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
    const andParts = condition.split(/\s+and\s+/i);
    return andParts.every(part => evaluateCondition(row, part.trim()));
  });
};

const evaluateCondition = (row, condition) => {
  let match = condition.match(/(\w+)\s*=\s*'([^']+)'/i);
  if (match) return String(row[match[1]]) === match[2];
  
  match = condition.match(/(\w+)\s*=\s*(\d+)/i);
  if (match) return row[match[1]] === parseInt(match[2]);
  
  match = condition.match(/(\w+)\s*!=\s*'([^']+)'/i);
  if (match) return String(row[match[1]]) !== match[2];
  
  match = condition.match(/(\w+)\s*>\s*(\d+)/i);
  if (match) return row[match[1]] > parseInt(match[2]);
  
  match = condition.match(/(\w+)\s*<\s*(\d+)/i);
  if (match) return row[match[1]] < parseInt(match[2]);
  
  match = condition.match(/(\w+)\s*>=\s*(\d+)/i);
  if (match) return row[match[1]] >= parseInt(match[2]);
  
  match = condition.match(/(\w+)\s+like\s+'%([^%]+)%'/i);
  if (match) return String(row[match[1]]).toLowerCase().includes(match[2].toLowerCase());
  
  match = condition.match(/(\w+)\s+is\s+null/i);
  if (match) return row[match[1]] === null || row[match[1]] === undefined;
  
  match = condition.match(/(\w+)\s+is\s+not\s+null/i);
  if (match) return row[match[1]] !== null && row[match[1]] !== undefined;
  
  match = condition.match(/(\w+)\s*=\s*(true|false)/i);
  if (match) return row[match[1]] === (match[2].toLowerCase() === 'true');
  
  return true;
};

const executeInsert = (sql, db) => {
  const match = sql.match(/insert\s+into\s+(\w+)/i);
  if (!match) return { error: 'Invalid INSERT syntax' };
  
  const tableName = match[1].toLowerCase();
  const hasReturning = sql.toLowerCase().includes('returning');
  
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
// SANDBOX CHALLENGES
// ============================================================

const sandboxChallenges = [
  {
    id: 'c1',
    difficulty: 'easy',
    prompt: 'Find all users who are NOT admins',
    hint: "Use != or <> for not equal",
    validator: (r) => r.results?.length === 3 && r.results.every(u => u.role !== 'admin')
  },
  {
    id: 'c2',
    difficulty: 'easy',
    prompt: 'Count the total number of posts',
    hint: 'Use COUNT(*)',
    validator: (r) => r.results?.[0]?.count === 5
  },
  {
    id: 'c3',
    difficulty: 'medium',
    prompt: 'Find all published posts with their author names',
    hint: 'JOIN users and posts, filter by published',
    validator: (r) => r.results?.length === 4 && r.results[0]?.name && r.results[0]?.title
  },
  {
    id: 'c4',
    difficulty: 'medium',
    prompt: 'Find users who have placed orders over $100',
    hint: 'JOIN users and orders, use WHERE total > 100',
    validator: (r) => r.results?.length >= 2 && r.results.every(u => u.name)
  },
  {
    id: 'c5',
    difficulty: 'medium',
    prompt: 'Count how many posts each user has written',
    hint: 'GROUP BY user_id with COUNT',
    validator: (r) => r.results?.length >= 3 && r.results[0]?.count !== undefined
  },
  {
    id: 'c6',
    difficulty: 'hard',
    prompt: 'Find the user with the most posts',
    hint: 'GROUP BY, ORDER BY count DESC, LIMIT 1',
    validator: (r) => r.results?.length === 1
  },
  {
    id: 'c7',
    difficulty: 'easy',
    prompt: 'Get the 3 most recent orders',
    hint: 'ORDER BY created_at DESC LIMIT 3',
    validator: (r) => r.results?.length === 3
  },
  {
    id: 'c8',
    difficulty: 'medium',
    prompt: 'Find all comments on posts written by Alice',
    hint: 'You need to join comments → posts → users',
    validator: (r) => r.results?.length >= 1
  },
];

// ============================================================
// CURRICULUM DATA (abbreviated for space - same structure as before)
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
        why: "Understanding how your query travels through the database engine helps you debug slow queries and predict behavior.",
        pitfalls: [
          "Assuming queries run instantly - every query goes through parsing, planning, and execution",
          "Not understanding that the planner chooses HOW to run your query",
          "Forgetting that results must travel back over the network"
        ],
        content: {
          description: 'How a SELECT query flows through the database system',
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
            client: 'Your application code - the query starts here as a string.',
            query: 'Just text at this point. The database doesn\'t understand it yet.',
            parser: 'Validates syntax, identifies tables/columns, checks permissions. First place errors appear.',
            planner: 'Decides HOW to execute: which index to use, join order. Use EXPLAIN to see the plan.',
            executor: 'Runs the plan step-by-step. Where most time is spent.',
            storage: 'Reads/writes actual data. Could be from disk (slow) or cache (fast).',
            result: 'The data coming back. Streams row-by-row for large results.',
          }
        },
        exercises: [
          {
            id: 'ex1',
            prompt: 'Select all columns from the users table:',
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
        why: "CRUD (Create, Read, Update, Delete) are the four fundamental operations. Every feature maps to CRUD.",
        pitfalls: [
          "UPDATE without WHERE affects ALL rows",
          "DELETE is permanent without backups",
          "INSERT can fail on constraint violations"
        ],
        content: {
          central: 'SQL Operations',
          branches: [
            {
              label: 'CREATE (INSERT)',
              color: '#22c55e',
              details: 'Adds new rows to a table.',
              syntax: "INSERT INTO users (name, email)\nVALUES ('Alice', 'alice@ex.com')",
              children: ['Single row', 'Multi-row', 'INSERT...SELECT', 'With defaults']
            },
            {
              label: 'READ (SELECT)',
              color: '#3b82f6',
              details: 'Retrieves data from tables.',
              syntax: "SELECT name, email FROM users\nWHERE role = 'admin'",
              children: ['Filter: WHERE', 'Sort: ORDER BY', 'Group: GROUP BY', 'Join: JOIN']
            },
            {
              label: 'UPDATE',
              color: '#f59e0b',
              details: 'Modifies existing rows. Always use WHERE!',
              syntax: "UPDATE users SET role = 'mod'\nWHERE id = 5",
              children: ['Set columns', 'With conditions', 'From subquery']
            },
            {
              label: 'DELETE',
              color: '#ef4444',
              details: 'Removes rows permanently.',
              syntax: "DELETE FROM users WHERE id = 5",
              children: ['With WHERE', 'TRUNCATE all', 'Soft delete pattern']
            }
          ]
        },
        exercises: [
          {
            id: 'crud-select',
            prompt: 'Select just the name and email columns from users:',
            hint: 'List specific columns instead of *',
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
          }
        ]
      },
      {
        id: 'join-flow',
        title: 'JOIN Operations',
        type: 'dataflow',
        why: "Real data lives in multiple tables. JOINs combine related data in a single query.",
        pitfalls: [
          "Missing JOIN condition creates cartesian product",
          "Wrong JOIN type loses or duplicates rows",
          "Ambiguous columns need table.column syntax"
        ],
        content: {
          description: 'How JOINs combine rows from multiple tables',
          nodes: [
            { id: 'tableA', label: 'users\n(4 rows)', type: 'boundary', x: 50, y: 50 },
            { id: 'tableB', label: 'posts\n(5 rows)', type: 'boundary', x: 50, y: 170 },
            { id: 'condition', label: 'ON\nusers.id =\nposts.user_id', type: 'flow', x: 200, y: 110 },
            { id: 'inner', label: 'INNER JOIN\n(only matches)', type: 'process', x: 350, y: 50 },
            { id: 'left', label: 'LEFT JOIN\n(all left +\nmatches)', type: 'process', x: 350, y: 150 },
            { id: 'result', label: 'Combined\nResult', type: 'boundary', x: 500, y: 100 },
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
            tableA: 'The "left" table in your JOIN.',
            tableB: 'The "right" table with user_id foreign key.',
            condition: 'ON clause defines how rows match. Without it: cartesian product!',
            inner: 'INNER JOIN: Only matching rows. User with no posts = not included.',
            left: 'LEFT JOIN: All from left, matched where possible. No posts = NULLs.',
            result: 'Columns from BOTH tables. Same user appears multiple times if multiple posts.',
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
          }
        ]
      }
    ]
  },
  postgres: {
    id: 'postgres',
    title: 'PostgreSQL Specifics',
    icon: Server,
    description: 'Features unique to PostgreSQL',
    modules: [
      {
        id: 'returning-clause',
        title: 'RETURNING Clause',
        type: 'dataflow',
        why: "Get inserted/updated data back in one query. No second round-trip needed.",
        pitfalls: [
          "SQLite habit: INSERT then SELECT - doesn't work in Postgres",
          "Forgetting RETURNING means extra queries",
          "Works with INSERT, UPDATE, and DELETE"
        ],
        content: {
          description: 'Get data back from write operations in one query',
          nodes: [
            { id: 'sqlite', label: 'SQLite\nPattern', type: 'boundary', x: 50, y: 40 },
            { id: 'insert1', label: 'INSERT...', type: 'process', x: 50, y: 110 },
            { id: 'select1', label: 'SELECT\nlast_rowid()', type: 'process', x: 50, y: 180 },
            { id: 'pg', label: 'Postgres\nPattern', type: 'boundary', x: 280, y: 40 },
            { id: 'insert2', label: 'INSERT...\nRETURNING *', type: 'process', x: 280, y: 130 },
            { id: 'result', label: 'Row returned\nimmediately', type: 'flow', x: 450, y: 130 },
          ],
          edges: [
            { from: 'sqlite', to: 'insert1' },
            { from: 'insert1', to: 'select1' },
            { from: 'pg', to: 'insert2' },
            { from: 'insert2', to: 'result' },
          ],
          reveals: {
            sqlite: 'Two queries, two round-trips, race condition risk.',
            insert1: 'INSERT only returns success/fail.',
            select1: 'Second query to fetch what was inserted.',
            pg: 'One query does both. Atomic.',
            insert2: 'RETURNING * or specific columns.',
            result: 'Complete row including generated values.',
          }
        },
        exercises: [
          {
            id: 'returning-insert',
            prompt: 'Insert a new user and get the row back:',
            hint: 'Add RETURNING * at the end',
            starterCode: "INSERT INTO users (name, email) VALUES ('New', 'new@ex.com') ",
            solution: "INSERT INTO users (name, email) VALUES ('New', 'new@ex.com') RETURNING *",
            validator: (result) => result.message && result.message.includes('RETURNING')
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
        id: 'rls-concept',
        title: 'Row Level Security',
        type: 'conceptmap',
        why: "API is public. RLS ensures users only see their own data at the database level.",
        pitfalls: [
          "Tables are PUBLIC by default when RLS disabled",
          "Enabling RLS with no policies = locked out",
          "service_role key in browser bypasses all RLS"
        ],
        content: {
          central: 'Row Level Security',
          branches: [
            {
              label: 'The Problem',
              color: '#ef4444',
              details: 'API is public. Anyone could query any data.',
              syntax: "-- Without RLS:\nsupabase.from('users').select('*')\n-- Returns ALL users!",
              children: ['API key is public', 'No server middleware', 'Need DB-level security']
            },
            {
              label: 'Enable RLS',
              color: '#3b82f6',
              details: 'First step: turn on RLS. Blocks ALL access until policies added.',
              syntax: "ALTER TABLE posts\n  ENABLE ROW LEVEL SECURITY;",
              children: ['Per-table setting', 'Blocks all by default', 'Must add policies']
            },
            {
              label: 'auth.uid()',
              color: '#8b5cf6',
              details: 'Returns current user ID from JWT token.',
              syntax: "USING (user_id = auth.uid())",
              children: ['From JWT token', 'NULL if anonymous', 'Can\'t be faked']
            },
            {
              label: 'Policy Types',
              color: '#22c55e',
              details: 'Different policies for different operations.',
              syntax: "CREATE POLICY \"read own\"\n  ON posts FOR SELECT\n  USING (user_id = auth.uid());",
              children: ['FOR SELECT', 'FOR INSERT', 'FOR UPDATE', 'FOR DELETE']
            }
          ]
        },
        exercises: []
      }
    ]
  },
  migration: {
    id: 'migration',
    title: 'Migration Path',
    icon: RefreshCw,
    description: 'Moving from SQLite to Supabase',
    modules: [
      {
        id: 'migration-faults',
        title: 'Migration Fault Tree',
        type: 'faulttree',
        why: "Know failure modes in advance to prevent or recover quickly.",
        pitfalls: [],
        content: {
          root: 'Migration Fails',
          branches: [
            {
              fault: 'Schema Errors',
              icon: 'warning',
              causes: [
                { cause: 'Type mismatch', detail: 'SQLite is loosely typed. Postgres rejects bad data.', fix: 'Clean/cast data before migration.' },
                { cause: 'NULL in PRIMARY KEY', detail: 'SQLite allows, Postgres doesn\'t.', fix: 'Find NULLs first, fix them.' },
                { cause: 'Reserved words', detail: 'Column named "user" or "order" fails.', fix: 'Rename columns.' }
              ]
            },
            {
              fault: 'Security Errors',
              icon: 'error',
              causes: [
                { cause: 'No RLS enabled', detail: 'Table publicly accessible!', fix: 'Enable RLS before adding data.' },
                { cause: 'Service key exposed', detail: 'In client-side code = bypasses RLS.', fix: 'Use anon key in browser.' }
              ]
            }
          ]
        },
        exercises: []
      }
    ]
  }
};

// ============================================================
// KEYBOARD NAVIGATION HOOK
// ============================================================

const useKeyboardNav = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const key = e.key.toLowerCase();
      if (handlers[key]) {
        e.preventDefault();
        handlers[key]();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

// ============================================================
// EXPORT UTILITIES
// ============================================================

const generateMarkdownExport = (progress, notes, curriculum) => {
  let md = `# SQL Learning Platform - Reference Export\n\n`;
  md += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;
  
  Object.values(curriculum).forEach(category => {
    const completedModules = category.modules.filter(m => progress[m.id]?.complete);
    if (completedModules.length === 0) return;
    
    md += `## ${category.title}\n\n`;
    
    completedModules.forEach(module => {
      md += `### ${module.title}\n\n`;
      
      if (module.why) {
        md += `**Why it matters:** ${module.why}\n\n`;
      }
      
      if (module.pitfalls?.length) {
        md += `**Watch out for:**\n`;
        module.pitfalls.forEach(p => {
          md += `- ${p}\n`;
        });
        md += `\n`;
      }
      
      // Add reveals based on module type
      if (module.type === 'conceptmap' && module.content.branches) {
        module.content.branches.forEach(branch => {
          md += `#### ${branch.label}\n\n`;
          md += `${branch.details}\n\n`;
          if (branch.syntax) {
            md += `\`\`\`sql\n${branch.syntax}\n\`\`\`\n\n`;
          }
          if (branch.children?.length) {
            md += `Key points: ${branch.children.join(', ')}\n\n`;
          }
        });
      }
      
      if (module.type === 'dataflow' && module.content.reveals) {
        md += `**Flow steps:**\n`;
        Object.entries(module.content.reveals).forEach(([key, value]) => {
          md += `- **${key}**: ${value}\n`;
        });
        md += `\n`;
      }
      
      if (module.type === 'faulttree' && module.content.branches) {
        module.content.branches.forEach(branch => {
          md += `#### ${branch.fault}\n\n`;
          branch.causes.forEach(cause => {
            md += `- **${cause.cause}**: ${cause.detail}\n  - Fix: ${cause.fix}\n`;
          });
          md += `\n`;
        });
      }
      
      // Add personal notes
      const moduleNotes = notes?.modules?.[module.id];
      if (moduleNotes) {
        md += `**My notes:** ${moduleNotes}\n\n`;
      }
      
      // Add bookmarked reveals
      const bookmarks = notes?.bookmarks?.[module.id];
      if (bookmarks?.length) {
        md += `**Bookmarked:** ${bookmarks.join(', ')}\n\n`;
      }
      
      md += `---\n\n`;
    });
  });
  
  return md;
};

const downloadFile = (content, filename, type = 'text/markdown') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ============================================================
// COMPONENTS
// ============================================================

// Keyboard Help Modal
const KeyboardHelp = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const shortcuts = [
    { key: 'j', desc: 'Next item / Move down' },
    { key: 'k', desc: 'Previous item / Move up' },
    { key: 'Enter', desc: 'Expand / Select' },
    { key: 'Esc', desc: 'Go back / Close' },
    { key: 'r', desc: 'Quick review mode' },
    { key: 's', desc: 'Open sandbox' },
    { key: 'n', desc: 'Add/edit note (in module)' },
    { key: '?', desc: 'Show this help' },
  ];
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div 
        className="bg-slate-800 rounded-lg p-4 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-blue-400" />
            <span className="font-bold text-white">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-sm font-mono text-slate-200">{s.key}</kbd>
              <span className="text-sm text-slate-300">{s.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Notes Editor
const NotesEditor = ({ moduleId, notes, onSave, onClose }) => {
  const [text, setText] = useState(notes?.modules?.[moduleId] || '');
  
  const handleSave = () => {
    onSave(moduleId, text);
    onClose();
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-label="Edit notes"
    >
      <div 
        className="bg-slate-800 rounded-lg p-4 max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-amber-400" />
            <span className="font-bold text-white">Personal Notes</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add your notes... (connects to your projects, reminders, etc.)"
          className="w-full h-32 bg-slate-900 text-slate-200 p-3 rounded border border-slate-600 focus:border-amber-500 focus:outline-none resize-none"
          aria-label="Notes text area"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button 
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};

// Quick Review Panel
const QuickReviewPanel = ({ isOpen, onClose, progress, notes, curriculum, onJumpTo }) => {
  const [filter, setFilter] = useState('all'); // all, bookmarked
  
  if (!isOpen) return null;
  
  const completedModules = [];
  Object.values(curriculum).forEach(category => {
    category.modules.forEach(module => {
      if (progress[module.id]?.complete) {
        completedModules.push({ ...module, category: category.title });
      }
    });
  });
  
  const bookmarkedItems = [];
  if (notes?.bookmarks) {
    Object.entries(notes.bookmarks).forEach(([moduleId, items]) => {
      const module = completedModules.find(m => m.id === moduleId);
      if (module && items.length) {
        items.forEach(item => {
          bookmarkedItems.push({ moduleId, module, item });
        });
      }
    });
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-label="Quick review"
    >
      <div 
        className="bg-slate-800 rounded-t-lg md:rounded-lg w-full md:max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-blue-400" />
            <span className="font-bold text-white">Quick Review</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              All ({completedModules.length})
            </button>
            <button
              onClick={() => setFilter('bookmarked')}
              className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${filter === 'bookmarked' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              <Star size={12} />
              Bookmarked ({bookmarkedItems.length})
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white ml-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {filter === 'all' && (
            <div className="space-y-3">
              {completedModules.map(module => (
                <button
                  key={module.id}
                  onClick={() => onJumpTo(module)}
                  className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white text-sm">{module.title}</span>
                    <span className="text-xs text-slate-400">{module.category}</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{module.why}</p>
                  {notes?.modules?.[module.id] && (
                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                      <MessageSquare size={10} />
                      {notes.modules[module.id].slice(0, 50)}...
                    </p>
                  )}
                </button>
              ))}
              {completedModules.length === 0 && (
                <p className="text-slate-400 text-center py-8">No completed modules yet</p>
              )}
            </div>
          )}
          
          {filter === 'bookmarked' && (
            <div className="space-y-2">
              {bookmarkedItems.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onJumpTo(item.module)}
                  className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={12} className="text-amber-400" />
                    <span className="font-medium text-white text-sm">{item.item}</span>
                  </div>
                  <span className="text-xs text-slate-400">in {item.module.title}</span>
                </button>
              ))}
              {bookmarkedItems.length === 0 && (
                <p className="text-slate-400 text-center py-8">No bookmarked items yet. Star reveals in modules to bookmark them.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// SQL Sandbox
const SQLSandbox = ({ isOpen, onClose }) => {
  const [code, setCode] = useState('SELECT * FROM users');
  const [result, setResult] = useState(null);
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [activeTable, setActiveTable] = useState('users');
  
  const runQuery = () => {
    const queryResult = executeSQL(code);
    setResult(queryResult);
    
    if (currentChallenge && !queryResult.error && currentChallenge.validator(queryResult)) {
      if (!completedChallenges.includes(currentChallenge.id)) {
        setCompletedChallenges([...completedChallenges, currentChallenge.id]);
      }
    }
  };
  
  const getRandomChallenge = () => {
    const incomplete = sandboxChallenges.filter(c => !completedChallenges.includes(c.id));
    if (incomplete.length === 0) {
      setCurrentChallenge(sandboxChallenges[Math.floor(Math.random() * sandboxChallenges.length)]);
    } else {
      setCurrentChallenge(incomplete[Math.floor(Math.random() * incomplete.length)]);
    }
    setCode('');
    setResult(null);
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 md:p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-label="SQL Sandbox"
    >
      <div 
        className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-green-400" />
            <span className="font-bold text-white">SQL Sandbox</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={getRandomChallenge}
              className="px-2 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded flex items-center gap-1"
            >
              <Shuffle size={12} />
              Random Challenge
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Challenge banner */}
        {currentChallenge && (
          <div className={`px-4 py-2 border-b ${completedChallenges.includes(currentChallenge.id) ? 'bg-green-900/30 border-green-700' : 'bg-violet-900/30 border-violet-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${
                  currentChallenge.difficulty === 'easy' ? 'bg-green-600' :
                  currentChallenge.difficulty === 'medium' ? 'bg-amber-600' : 'bg-red-600'
                } text-white`}>
                  {currentChallenge.difficulty}
                </span>
                <span className="text-white text-sm">{currentChallenge.prompt}</span>
              </div>
              {completedChallenges.includes(currentChallenge.id) && (
                <CheckCircle2 size={18} className="text-green-400" />
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">💡 {currentChallenge.hint}</p>
          </div>
        )}
        
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Schema panel */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-700 p-3 overflow-y-auto">
            <p className="text-xs text-slate-400 mb-2 font-medium">TABLES</p>
            <div className="flex md:flex-col gap-1 flex-wrap">
              {Object.keys(sampleDatabase).map(table => (
                <button
                  key={table}
                  onClick={() => setActiveTable(table)}
                  className={`px-2 py-1 text-xs rounded text-left ${activeTable === table ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  {table} ({sampleDatabase[table].length})
                </button>
              ))}
            </div>
            
            {activeTable && (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-1">{schemaDefinitions[activeTable].description}</p>
                <div className="space-y-0.5">
                  {schemaDefinitions[activeTable].columns.map(col => (
                    <div key={col.name} className="text-xs flex items-center gap-1">
                      <span className="text-emerald-400 font-mono">{col.name}</span>
                      <span className="text-slate-500">{col.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Challenges: {completedChallenges.length}/{sandboxChallenges.length}</p>
              <div className="flex flex-wrap gap-1">
                {sandboxChallenges.map(c => (
                  <div
                    key={c.id}
                    className={`w-4 h-4 rounded text-xs flex items-center justify-center ${
                      completedChallenges.includes(c.id) ? 'bg-green-600' : 'bg-slate-700'
                    }`}
                    title={c.prompt}
                  >
                    {completedChallenges.includes(c.id) && <Check size={10} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Query panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-700">
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Write your SQL query here..."
                className="w-full h-24 bg-slate-900 text-green-400 font-mono text-sm p-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none resize-none"
                aria-label="SQL query input"
              />
              <button
                onClick={runQuery}
                className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm flex items-center gap-1"
              >
                <Play size={14} />
                Run Query
              </button>
            </div>
            
            {/* Results */}
            <div className="flex-1 p-3 overflow-auto">
              {result && (
                <>
                  {result.error ? (
                    <div className="text-red-400 text-sm bg-red-900/30 p-2 rounded">
                      ❌ {result.error}
                    </div>
                  ) : (
                    <div>
                      {result.message && (
                        <p className="text-blue-300 text-sm mb-2">{result.message}</p>
                      )}
                      <p className="text-slate-400 text-xs mb-2">
                        {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
                      </p>
                      {result.results?.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-600">
                                {Object.keys(result.results[0]).map(col => (
                                  <th key={col} className="text-left py-1 px-2 text-slate-300 font-mono">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.results.slice(0, 20).map((row, i) => (
                                <tr key={i} className="border-b border-slate-700">
                                  {Object.values(row).map((val, j) => (
                                    <td key={j} className="py-1 px-2 text-slate-300">{String(val)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {result.results.length > 20 && (
                            <p className="text-slate-500 text-xs mt-1">...and {result.results.length - 20} more rows</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Schema Reference Component
const SchemaReference = ({ tables, expanded: initialExpanded = false }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [activeTable, setActiveTable] = useState(tables[0] || null);
  
  if (!tables || tables.length === 0) return null;
  
  return (
    <div className="border border-slate-600 rounded-lg bg-slate-800/50 mb-3 print:border-slate-400">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-700/50 rounded-t-lg"
        aria-expanded={expanded}
        aria-label="Schema reference"
      >
        <div className="flex items-center gap-2">
          <Table size={14} className="text-emerald-400" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-200">Schema Reference</span>
          <span className="text-xs text-slate-400">({tables.join(', ')})</span>
        </div>
        {expanded ? <ChevronDown size={14} className="text-slate-400" aria-hidden="true" /> : <ChevronRight size={14} className="text-slate-400" aria-hidden="true" />}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 pt-1">
          <div className="flex gap-1 mb-2 flex-wrap" role="tablist">
            {tables.map(table => (
              <button
                key={table}
                onClick={() => setActiveTable(table)}
                className={`px-2 py-1 text-xs rounded transition-colors ${activeTable === table ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                role="tab"
                aria-selected={activeTable === table}
              >
                {table}
              </button>
            ))}
          </div>
          
          {activeTable && schemaDefinitions[activeTable] && (
            <div className="space-y-2" role="tabpanel">
              <p className="text-xs text-slate-400">{schemaDefinitions[activeTable].description}</p>
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
              <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                <p className="text-xs text-slate-500 mb-1">Sample ({sampleDatabase[activeTable].length} rows):</p>
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Database Viewer
const DatabaseViewer = ({ isOpen, onClose }) => {
  const [activeTable, setActiveTable] = useState('users');
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-label="Database viewer"
    >
      <div 
        className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-400" aria-hidden="true" />
            <span className="font-bold text-white">Practice Database</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close">
            <XCircle size={20} />
          </button>
        </div>
        
        <div className="px-4 py-2 border-b border-slate-700 flex gap-2 flex-wrap" role="tablist">
          {Object.keys(sampleDatabase).map(table => (
            <button
              key={table}
              onClick={() => setActiveTable(table)}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${activeTable === table ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              role="tab"
              aria-selected={activeTable === table}
            >
              {table} ({sampleDatabase[table].length})
            </button>
          ))}
        </div>
        
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-700">
          <p className="text-sm text-slate-300 mb-2">{schemaDefinitions[activeTable].description}</p>
          <div className="flex flex-wrap gap-2">
            {schemaDefinitions[activeTable].columns.map(col => (
              <span key={col.name} className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                <span className="text-emerald-400 font-mono">{col.name}</span>
                <span className="text-slate-500 mx-1">:</span>
                <span className="text-blue-300">{col.type}</span>
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4" role="tabpanel">
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
      </div>
    </div>
  );
};

// SQL Exercise Component
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
    <div className="border border-slate-600 rounded-lg p-3 bg-slate-800/50" role="region" aria-label={`Exercise: ${exercise.prompt}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-slate-200">{exercise.prompt}</p>
        {passed && <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" aria-label="Completed" />}
      </div>
      
      <div className="space-y-2">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-slate-900 text-green-400 font-mono text-sm p-2 rounded border border-slate-700 focus:border-blue-500 focus:outline-none resize-none"
          rows={3}
          placeholder="Write your SQL here..."
          disabled={passed}
          aria-label="SQL input"
        />
        
        <div className="flex items-center gap-2">
          <button
            onClick={runQuery}
            disabled={passed}
            className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 ${passed ? 'bg-green-600/50 text-green-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            <Play size={14} aria-hidden="true" />
            {passed ? 'Completed' : 'Run'}
          </button>
          
          {!passed && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="px-3 py-1 rounded text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center gap-1"
              aria-expanded={showHint}
            >
              <Lightbulb size={14} aria-hidden="true" />
              Hint
            </button>
          )}
        </div>
        
        {showHint && !passed && (
          <p className="text-xs text-amber-300 bg-amber-900/30 p-2 rounded" role="note">
            💡 {exercise.hint}
          </p>
        )}
        
        {result && (
          <div className="mt-2" role="region" aria-label="Query results">
            {result.error ? (
              <div className="text-red-400 text-xs bg-red-900/30 p-2 rounded">❌ {result.error}</div>
            ) : (
              <div className="text-xs">
                {result.message && <p className="text-blue-300 mb-1">{result.message}</p>}
                <p className="text-slate-400 mb-1">{result.rowCount} row{result.rowCount !== 1 ? 's' : ''}</p>
                {result.results?.length > 0 && (
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

// Visualization Components
const DataFlowDiagram = ({ content, revealed, onReveal, frozen, notes, onToggleBookmark }) => {
  const { nodes, edges, reveals, description } = content;
  
  return (
    <div className="bg-slate-900 rounded-lg p-4 print:bg-white print:border print:border-slate-300">
      <p className="text-slate-300 text-sm mb-4 print:text-slate-700">{description}</p>
      <svg viewBox="0 0 600 260" className="w-full h-56" role="img" aria-label="Data flow diagram">
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
            <line key={i} x1={from.x + 55} y1={from.y + 30} x2={to.x + 5} y2={to.y + 30} stroke="#64748b" strokeWidth="2" markerEnd="url(#arrowhead)" />
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
                x={node.x} y={node.y} width="110" height="60" rx="6"
                fill={color.fill} stroke={isRevealed ? '#fff' : color.stroke} strokeWidth={isRevealed ? 3 : 2}
                className={hasReveal && !frozen ? 'cursor-pointer hover:opacity-80' : ''}
                onClick={() => hasReveal && !frozen && onReveal(node.id)}
                role={hasReveal && !frozen ? 'button' : undefined}
                aria-label={node.label.replace('\n', ' ')}
                tabIndex={hasReveal && !frozen ? 0 : undefined}
              />
              <text x={node.x + 55} y={node.y + 20} textAnchor="middle" fill="white" fontSize="11" className="pointer-events-none">
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
        <div className="mt-4 space-y-2 max-h-64 overflow-y-auto print:max-h-none">
          {Object.entries(reveals).map(([nodeId, detail]) => {
            const isRevealed = revealed.includes(nodeId) || frozen;
            const node = nodes.find(n => n.id === nodeId);
            const isBookmarked = notes?.bookmarks?.includes?.(nodeId);
            if (!node) return null;
            return (
              <div
                key={nodeId}
                className={`p-3 rounded border transition-all print:border-slate-300 ${isRevealed ? 'bg-slate-800 border-slate-600 print:bg-slate-50' : 'bg-slate-800/50 border-slate-700 cursor-pointer hover:border-violet-500'}`}
                onClick={() => !frozen && !isRevealed && onReveal(nodeId)}
                role={!frozen && !isRevealed ? 'button' : undefined}
                tabIndex={!frozen && !isRevealed ? 0 : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isRevealed ? <Eye size={14} className="text-green-400" /> : <EyeOff size={14} className="text-slate-500" />}
                    <span className="text-sm font-medium text-slate-300 print:text-slate-700">{node.label.replace(/\n/g, ' ')}</span>
                  </div>
                  {isRevealed && onToggleBookmark && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleBookmark(nodeId); }}
                      className="p-1 hover:bg-slate-700 rounded"
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <Star size={14} className={isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-slate-500'} />
                    </button>
                  )}
                </div>
                {isRevealed && <p className="text-sm text-slate-400 mt-2 ml-6 print:text-slate-600">{detail}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ConceptMap = ({ content, revealed, onReveal, frozen, notes, onToggleBookmark }) => {
  const { central, branches } = content;
  
  return (
    <div className="bg-slate-900 rounded-lg p-4 print:bg-white print:border print:border-slate-300">
      <div className="flex flex-col items-center">
        <div className="bg-slate-700 text-white px-5 py-2 rounded-full font-bold mb-4 print:bg-slate-200 print:text-slate-800">
          {central}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          {branches.map((branch, i) => {
            const isRevealed = revealed.includes(branch.label) || frozen;
            const isBookmarked = notes?.bookmarks?.includes?.(branch.label);
            
            return (
              <div
                key={i}
                className={`rounded-lg border-2 transition-all print:border ${isRevealed ? 'border-opacity-100' : 'border-opacity-50 cursor-pointer hover:border-opacity-80'}`}
                style={{ borderColor: branch.color }}
                onClick={() => !frozen && !isRevealed && onReveal(branch.label)}
                role={!frozen && !isRevealed ? 'button' : undefined}
                tabIndex={!frozen && !isRevealed ? 0 : undefined}
              >
                <div className="px-3 py-2 font-medium text-white text-sm flex items-center justify-between print:text-slate-800" style={{ backgroundColor: branch.color + '33' }}>
                  <span>{branch.label}</span>
                  <div className="flex items-center gap-1">
                    {isRevealed && onToggleBookmark && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleBookmark(branch.label); }}
                        className="p-1 hover:bg-black/20 rounded"
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        <Star size={12} className={isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-slate-400'} />
                      </button>
                    )}
                    {!isRevealed && !frozen && <ChevronRight size={14} className="text-slate-400" />}
                  </div>
                </div>
                
                {isRevealed && (
                  <div className="p-3 bg-slate-800 space-y-2 print:bg-slate-50">
                    <p className="text-slate-300 text-sm print:text-slate-700">{branch.details}</p>
                    {branch.syntax && (
                      <pre className="bg-slate-900 text-green-400 p-2 rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap print:bg-slate-100 print:text-slate-800">
                        {branch.syntax}
                      </pre>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {branch.children.map((child, j) => (
                        <span key={j} className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs print:bg-slate-200 print:text-slate-700">
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

const FaultTree = ({ content, revealed, onReveal, frozen, notes, onToggleBookmark }) => {
  const { root, branches } = content;
  
  const iconMap = {
    warning: <AlertTriangle size={16} className="text-amber-400" aria-hidden="true" />,
    error: <XCircle size={16} className="text-red-400" aria-hidden="true" />,
    info: <Info size={16} className="text-blue-400" aria-hidden="true" />,
  };
  
  return (
    <div className="bg-slate-900 rounded-lg p-4 print:bg-white print:border print:border-slate-300">
      <div className="flex justify-center mb-4">
        <div className="bg-red-900/80 border-2 border-red-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 print:bg-red-100 print:text-red-800 print:border-red-300">
          <Diamond size={18} aria-hidden="true" />
          {root}
        </div>
      </div>
      
      <div className="space-y-3">
        {branches.map((branch, i) => {
          const isRevealed = revealed.includes(branch.fault) || frozen;
          const isBookmarked = notes?.bookmarks?.includes?.(branch.fault);
          
          return (
            <div key={i} className="border border-slate-700 rounded-lg overflow-hidden print:border-slate-300">
              <div
                className={`px-3 py-2 bg-slate-800 flex items-center justify-between print:bg-slate-100 ${!frozen && !isRevealed ? 'cursor-pointer hover:bg-slate-700' : ''}`}
                onClick={() => !frozen && !isRevealed && onReveal(branch.fault)}
                role={!frozen && !isRevealed ? 'button' : undefined}
                tabIndex={!frozen && !isRevealed ? 0 : undefined}
              >
                <div className="flex items-center gap-2">
                  {iconMap[branch.icon]}
                  <span className="font-medium text-white text-sm print:text-slate-800">{branch.fault}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isRevealed && onToggleBookmark && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleBookmark(branch.fault); }}
                      className="p-1 hover:bg-slate-700 rounded print:hidden"
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <Star size={12} className={isBookmarked ? 'text-amber-400 fill-amber-400' : 'text-slate-500'} />
                    </button>
                  )}
                  {isRevealed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                </div>
              </div>
              
              {isRevealed && (
                <div className="divide-y divide-slate-700 max-h-64 overflow-y-auto print:max-h-none print:divide-slate-300">
                  {branch.causes.map((item, j) => (
                    <div key={j} className="p-3 bg-slate-800/50 print:bg-white">
                      <div className="flex items-start gap-2">
                        <ArrowRight size={12} className="text-slate-500 mt-1 flex-shrink-0" aria-hidden="true" />
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className="font-medium text-slate-200 text-sm print:text-slate-800">{item.cause}</p>
                          <p className="text-xs text-slate-400 print:text-slate-600">{item.detail}</p>
                          <div className="flex items-start gap-1 text-xs">
                            <CheckCircle2 size={12} className="text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <span className="text-green-300 print:text-green-700">{item.fix}</span>
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

// Module View
const ModuleView = ({ module, progress, notes, onComplete, onBack, onSaveNote, onToggleBookmark, focusIndex, setFocusIndex }) => {
  const [revealed, setRevealed] = useState(progress?.revealed || []);
  const [completedExercises, setCompletedExercises] = useState(progress?.exercises || []);
  const [showNotes, setShowNotes] = useState(false);
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
  
  // Keyboard navigation for reveals
  useKeyboardNav({
    'j': () => {
      if (focusIndex < requiredReveals.length - 1) {
        setFocusIndex(focusIndex + 1);
      }
    },
    'k': () => {
      if (focusIndex > 0) {
        setFocusIndex(focusIndex - 1);
      }
    },
    'enter': () => {
      if (requiredReveals[focusIndex] && !revealed.includes(requiredReveals[focusIndex])) {
        handleReveal(requiredReveals[focusIndex]);
      }
    },
    'n': () => setShowNotes(true),
  });
  
  const handleToggleBookmark = (itemId) => {
    onToggleBookmark(module.id, itemId);
  };
  
  const moduleNotes = {
    text: notes?.modules?.[module.id] || '',
    bookmarks: notes?.bookmarks?.[module.id] || []
  };
  
  const renderContent = () => {
    const props = {
      content: module.content,
      revealed,
      onReveal: handleReveal,
      frozen: isComplete,
      notes: moduleNotes,
      onToggleBookmark: handleToggleBookmark,
    };
    
    switch (module.type) {
      case 'dataflow': return <DataFlowDiagram {...props} />;
      case 'conceptmap': return <ConceptMap {...props} />;
      case 'faulttree': return <FaultTree {...props} />;
      default: return <div>Unknown module type</div>;
    }
  };
  
  return (
    <div className="space-y-4">
      {showNotes && (
        <NotesEditor
          moduleId={module.id}
          notes={notes}
          onSave={onSaveNote}
          onClose={() => setShowNotes(false)}
        />
      )}
      
      <div className="flex items-center justify-between print:hidden">
        <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm">
          <ChevronRight size={16} className="rotate-180" aria-hidden="true" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(true)}
            className={`p-1.5 rounded hover:bg-slate-700 ${moduleNotes.text ? 'text-amber-400' : 'text-slate-400'}`}
            aria-label="Edit notes"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-lg p-4 print:bg-white print:shadow-none print:p-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white print:text-slate-900">{module.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              {module.type === 'dataflow' && <Map size={14} className="text-blue-400" aria-hidden="true" />}
              {module.type === 'conceptmap' && <GitBranch size={14} className="text-green-400" aria-hidden="true" />}
              {module.type === 'faulttree' && <AlertTriangle size={14} className="text-amber-400" aria-hidden="true" />}
              <span className="text-xs text-slate-400 capitalize print:text-slate-600">{module.type.replace('map', ' Map').replace('tree', ' Tree').replace('flow', ' Flow')}</span>
            </div>
          </div>
          {isComplete && (
            <span className="flex items-center gap-1 text-green-400 text-xs bg-green-900/30 px-2 py-1 rounded print:bg-green-100 print:text-green-700">
              <CheckCircle2 size={12} aria-hidden="true" />
              Complete
            </span>
          )}
        </div>
        
        {module.why && (
          <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg print:bg-blue-50 print:border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb size={14} className="text-blue-400" aria-hidden="true" />
              <span className="text-sm font-medium text-blue-300 print:text-blue-700">Why This Matters</span>
            </div>
            <p className="text-sm text-slate-300 print:text-slate-700">{module.why}</p>
          </div>
        )}
        
        {module.pitfalls?.length > 0 && (
          <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg print:bg-amber-50 print:border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={14} className="text-amber-400" aria-hidden="true" />
              <span className="text-sm font-medium text-amber-300 print:text-amber-700">Watch Out For</span>
            </div>
            <ul className="space-y-1">
              {module.pitfalls.map((pitfall, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2 print:text-slate-700">
                  <span className="text-amber-500 mt-0.5" aria-hidden="true">•</span>
                  {pitfall}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {moduleNotes.text && (
          <div className="mb-4 p-3 bg-slate-700/50 border border-slate-600 rounded-lg print:bg-slate-100 print:border-slate-300">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={14} className="text-amber-400" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-300 print:text-slate-700">My Notes</span>
            </div>
            <p className="text-sm text-slate-400 print:text-slate-600">{moduleNotes.text}</p>
          </div>
        )}
        
        {renderContent()}
        
        {exercises.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 print:hidden">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={16} className="text-green-400" aria-hidden="true" />
              <span className="font-medium text-white">Practice Exercises</span>
              <span className="text-xs text-slate-400">({completedExercises.length}/{exercises.length})</span>
            </div>
            
            {moduleTableHints[module.id]?.length > 0 && (
              <SchemaReference tables={moduleTableHints[module.id]} expanded={false} />
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
        
        {!isComplete && (
          <div className="mt-4 pt-4 border-t border-slate-700 print:hidden">
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
                  <Check size={14} aria-hidden="true" />
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

// Category View
const CategoryView = ({ category, progress, onSelectModule, focusIndex, setFocusIndex }) => {
  const Icon = category.icon;
  
  useKeyboardNav({
    'j': () => {
      if (focusIndex < category.modules.length - 1) {
        setFocusIndex(focusIndex + 1);
      }
    },
    'k': () => {
      if (focusIndex > 0) {
        setFocusIndex(focusIndex - 1);
      }
    },
    'enter': () => {
      if (category.modules[focusIndex]) {
        onSelectModule(category.modules[focusIndex]);
      }
    },
  });
  
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-700 rounded-lg">
          <Icon size={22} className="text-blue-400" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-bold text-white">{category.title}</h2>
          <p className="text-xs text-slate-400">{category.description}</p>
        </div>
      </div>
      
      <div className="space-y-2" role="list">
        {category.modules.map((module, index) => {
          const moduleProgress = progress[module.id];
          const isComplete = moduleProgress?.complete;
          const isFocused = index === focusIndex;
          
          return (
            <button
              key={module.id}
              onClick={() => onSelectModule(module)}
              className={`w-full p-3 rounded-lg transition-colors text-left flex items-center justify-between group ${isFocused ? 'bg-slate-600 ring-2 ring-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
              role="listitem"
            >
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle2 size={16} className="text-green-400" aria-label="Completed" />
                ) : (
                  <Circle size={16} className="text-slate-500" aria-label="Not completed" />
                )}
                <div>
                  <span className="text-white text-sm font-medium">{module.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {module.type === 'dataflow' && <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">Flow</span>}
                    {module.type === 'conceptmap' && <span className="text-xs bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded">Map</span>}
                    {module.type === 'faulttree' && <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Fault</span>}
                    {module.exercises?.length > 0 && (
                      <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Code size={10} aria-hidden="true" />
                        {module.exercises.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-500 group-hover:text-white" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Dashboard
const Dashboard = ({ progress, notes, onSelectCategory, onExport, onPrint, focusIndex, setFocusIndex }) => {
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
  
  useKeyboardNav({
    'j': () => {
      if (focusIndex < categories.length - 1) {
        setFocusIndex(focusIndex + 1);
      }
    },
    'k': () => {
      if (focusIndex > 0) {
        setFocusIndex(focusIndex - 1);
      }
    },
    'enter': () => {
      if (categories[focusIndex]) {
        onSelectCategory(categories[focusIndex]);
      }
    },
  });
  
  return (
    <div className="space-y-4">
      <DatabaseViewer isOpen={showDatabase} onClose={() => setShowDatabase(false)} />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-lg p-4 print:bg-blue-100 print:text-blue-900">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white print:text-blue-900">SQL Learning Journey</h1>
            <p className="text-blue-100 text-sm mb-3 print:text-blue-700">SQLite → PostgreSQL → Supabase</p>
          </div>
          <div className="flex gap-1 print:hidden">
            <button
              onClick={onExport}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white"
              title="Export as Markdown"
              aria-label="Export as Markdown"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onPrint}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded text-white"
              title="Print-friendly view"
              aria-label="Print"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-2 overflow-hidden print:bg-blue-200">
          <div className="bg-white h-full transition-all duration-500 print:bg-blue-600" style={{ width: `${stats.percent}%` }} />
        </div>
        <p className="text-xs text-blue-100 mt-1 print:text-blue-700">{stats.complete}/{stats.total} modules ({stats.percent}%)</p>
      </div>
      
      {/* Database */}
      <button
        onClick={() => setShowDatabase(true)}
        className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-left transition-colors group print:hidden"
        aria-label="View practice database"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-emerald-400" aria-hidden="true" />
            <span className="font-medium text-white text-sm">Practice Database</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-emerald-400 transition-colors">
            <Eye size={12} aria-hidden="true" />
            <span>View</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sampleDatabase).map(([table, rows]) => (
            <span key={table} className="text-xs bg-slate-700 group-hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded transition-colors">
              {table} ({rows.length})
            </span>
          ))}
        </div>
      </button>
      
      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:grid-cols-2" role="list">
        {categories.map((category, index) => {
          const Icon = category.icon;
          const moduleCount = category.modules.length;
          const completeCount = category.modules.filter(m => progress[m.id]?.complete).length;
          const isFocused = index === focusIndex;
          
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category)}
              className={`rounded-lg p-3 text-left transition-colors group print:border print:border-slate-300 ${isFocused ? 'bg-slate-700 ring-2 ring-blue-500' : 'bg-slate-800 hover:bg-slate-700'}`}
              role="listitem"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={20} className="text-blue-400" aria-hidden="true" />
                <span className="font-bold text-white text-sm print:text-slate-900">{category.title}</span>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-white ml-auto print:hidden" aria-hidden="true" />
              </div>
              <p className="text-xs text-slate-400 mb-2 print:text-slate-600">{category.description}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden print:bg-slate-200">
                  <div className="bg-blue-500 h-full transition-all" style={{ width: `${(completeCount / moduleCount) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-400">{completeCount}/{moduleCount}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="bg-slate-800 rounded-lg p-3 print:bg-slate-100 print:border print:border-slate-300">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={14} className="text-slate-400" aria-hidden="true" />
          <span className="text-sm font-medium text-white print:text-slate-900">Module Types</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Map size={12} className="text-blue-400" aria-hidden="true" />
            <span className="text-slate-300 print:text-slate-700">Data Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <GitBranch size={12} className="text-green-400" aria-hidden="true" />
            <span className="text-slate-300 print:text-slate-700">Concept Map</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle size={12} className="text-amber-400" aria-hidden="true" />
            <span className="text-slate-300 print:text-slate-700">Fault Tree</span>
          </div>
          <div className="flex items-center gap-1">
            <Code size={12} className="text-violet-400" aria-hidden="true" />
            <span className="text-slate-300 print:text-slate-700">Exercises</span>
          </div>
        </div>
      </div>
      
      {/* Keyboard hint */}
      <p className="text-xs text-slate-500 text-center print:hidden">
        Press <kbd className="px-1 bg-slate-700 rounded">?</kbd> for keyboard shortcuts
      </p>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================

export default function SQLLearningPlatform() {
  const [progress, setProgress] = useState({});
  const [notes, setNotes] = useState({ modules: {}, bookmarks: {} });
  const [view, setView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [focusIndex, setFocusIndex] = useState(0);
  
  // Modals
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  
  // Load data
  useEffect(() => {
    Promise.all([loadProgress(), loadNotes()]).then(([savedProgress, savedNotes]) => {
      if (savedProgress) setProgress(savedProgress);
      if (savedNotes) setNotes(savedNotes);
      setLoading(false);
    });
  }, []);
  
  // Save progress
  useEffect(() => {
    if (!loading) saveProgress(progress);
  }, [progress, loading]);
  
  // Save notes
  useEffect(() => {
    if (!loading) saveNotes(notes);
  }, [notes, loading]);
  
  // Global keyboard shortcuts
  useKeyboardNav({
    '?': () => setShowKeyboardHelp(true),
    'escape': () => {
      if (showKeyboardHelp) setShowKeyboardHelp(false);
      else if (showQuickReview) setShowQuickReview(false);
      else if (showSandbox) setShowSandbox(false);
      else handleBack();
    },
    'r': () => !showSandbox && setShowQuickReview(true),
    's': () => !showQuickReview && setShowSandbox(true),
  });
  
  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setView('category');
    setFocusIndex(0);
  };
  
  const handleSelectModule = (module) => {
    setSelectedModule(module);
    setView('module');
    setFocusIndex(0);
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
      setFocusIndex(0);
    } else if (view === 'category') {
      setView('dashboard');
      setSelectedCategory(null);
      setFocusIndex(0);
    }
  };
  
  const handleReset = async () => {
    if (confirm('Reset all progress and notes? This cannot be undone.')) {
      setProgress({});
      setNotes({ modules: {}, bookmarks: {} });
      try {
        await window.storage.delete(STORAGE_KEY);
        await window.storage.delete(NOTES_KEY);
      } catch (e) {
        console.error('Failed to delete data:', e);
      }
    }
  };
  
  const handleSaveNote = (moduleId, text) => {
    setNotes(prev => ({
      ...prev,
      modules: { ...prev.modules, [moduleId]: text }
    }));
  };
  
  const handleToggleBookmark = (moduleId, itemId) => {
    setNotes(prev => {
      const moduleBookmarks = prev.bookmarks[moduleId] || [];
      const newBookmarks = moduleBookmarks.includes(itemId)
        ? moduleBookmarks.filter(b => b !== itemId)
        : [...moduleBookmarks, itemId];
      return {
        ...prev,
        bookmarks: { ...prev.bookmarks, [moduleId]: newBookmarks }
      };
    });
  };
  
  const handleExport = () => {
    const md = generateMarkdownExport(progress, notes, curriculum);
    downloadFile(md, 'sql-learning-reference.md');
  };
  
  const handlePrint = () => {
    window.print();
  };
  
  const handleJumpTo = (module) => {
    // Find category
    const category = Object.values(curriculum).find(c => 
      c.modules.some(m => m.id === module.id)
    );
    if (category) {
      setSelectedCategory(category);
      setSelectedModule(module);
      setView('module');
      setShowQuickReview(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white" role="status">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 p-3 md:p-4 print:bg-white print:p-0">
      {/* Modals */}
      <KeyboardHelp isOpen={showKeyboardHelp} onClose={() => setShowKeyboardHelp(false)} />
      <QuickReviewPanel 
        isOpen={showQuickReview} 
        onClose={() => setShowQuickReview(false)}
        progress={progress}
        notes={notes}
        curriculum={curriculum}
        onJumpTo={handleJumpTo}
      />
      <SQLSandbox isOpen={showSandbox} onClose={() => setShowSandbox(false)} />
      
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="flex items-center gap-2">
            {view !== 'dashboard' && (
              <button
                onClick={handleBack}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                aria-label="Go back"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-blue-400" aria-hidden="true" />
              <span className="font-bold text-white text-sm">SQL Learning Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowQuickReview(true)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Quick Review (R)"
              aria-label="Quick review"
            >
              <BookOpen size={16} />
            </button>
            <button
              onClick={() => setShowSandbox(true)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="SQL Sandbox (S)"
              aria-label="SQL Sandbox"
            >
              <Terminal size={16} />
            </button>
            <button
              onClick={() => setShowKeyboardHelp(true)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <HelpCircle size={16} />
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-2"
            >
              Reset
            </button>
          </div>
        </div>
        
        {/* Print header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-slate-900">SQL Learning Reference</h1>
          <p className="text-slate-600">Exported {new Date().toLocaleDateString()}</p>
        </div>
        
        {/* Views */}
        {view === 'dashboard' && (
          <Dashboard 
            progress={progress} 
            notes={notes}
            onSelectCategory={handleSelectCategory}
            onExport={handleExport}
            onPrint={handlePrint}
            focusIndex={focusIndex}
            setFocusIndex={setFocusIndex}
          />
        )}
        
        {view === 'category' && selectedCategory && (
          <CategoryView
            category={selectedCategory}
            progress={progress}
            onSelectModule={handleSelectModule}
            focusIndex={focusIndex}
            setFocusIndex={setFocusIndex}
          />
        )}
        
        {view === 'module' && selectedModule && (
          <ModuleView
            module={selectedModule}
            progress={progress[selectedModule.id]}
            notes={notes}
            onComplete={handleCompleteModule}
            onBack={handleBack}
            onSaveNote={handleSaveNote}
            onToggleBookmark={handleToggleBookmark}
            focusIndex={focusIndex}
            setFocusIndex={setFocusIndex}
          />
        )}
      </div>
      
      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
