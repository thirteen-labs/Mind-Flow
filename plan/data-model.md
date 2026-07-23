# Data Model

## Storage Strategy

| Data Type | Storage | Notes |
|-----------|---------|-------|
| Journal entries | SQLite | Structured content with metadata |
| Planner boards | SQLite | Canvas state serialized as JSON |
| Cards / Nodes | SQLite | Individual items on planner canvas |
| Connections | SQLite | Edges between planner nodes |
| Media files | Filesystem | Images, audio, video, PDFs |
| Preferences | MMKV | Theme, font, UI settings |
| Cache | MMKV | Temporary data, search index |

## SQLite Schema

### journals
```sql
CREATE TABLE journals (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,        -- ISO date: 2026-07-22
  title TEXT,
  content TEXT,                     -- Markdown content
  mood TEXT,                        -- Mood emoji or label
  word_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### journal_sections
```sql
CREATE TABLE journal_sections (
  id TEXT PRIMARY KEY,
  journal_id TEXT NOT NULL REFERENCES journals(id),
  label TEXT NOT NULL,              -- Morning, Afternoon, Evening, etc.
  sort_order INTEGER NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL
);
```

### planner_boards
```sql
CREATE TABLE planner_boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,                        -- Optional date association
  zoom_level REAL DEFAULT 1.0,
  pan_x REAL DEFAULT 0.0,
  pan_y REAL DEFAULT 0.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### planner_nodes
```sql
CREATE TABLE planner_nodes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES planner_boards(id),
  type TEXT NOT NULL,               -- text, journal, idea, task, goal, image, video, audio, pdf, mindmap, etc.
  label TEXT,
  content TEXT,                     -- JSON-serialized content
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL,
  height REAL,
  color TEXT,
  rotation REAL DEFAULT 0.0,
  z_index INTEGER DEFAULT 0,
  parent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### node_connections
```sql
CREATE TABLE node_connections (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES planner_boards(id),
  source_id TEXT NOT NULL REFERENCES planner_nodes(id),
  target_id TEXT NOT NULL REFERENCES planner_nodes(id),
  label TEXT,
  style TEXT DEFAULT 'solid',       -- solid, dashed, dotted
  color TEXT,
  created_at TEXT NOT NULL
);
```

### media
```sql
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  uri TEXT NOT NULL,                -- Local file path
  type TEXT NOT NULL,               -- image, video, audio, pdf, voice
  mime_type TEXT,
  size_bytes INTEGER,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  thumbnail_uri TEXT,
  created_at TEXT NOT NULL
);
```

### tags
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);
```

### journal_tags / node_tags (junction tables)
```sql
CREATE TABLE journal_tags (
  journal_id TEXT NOT NULL REFERENCES journals(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (journal_id, tag_id)
);

CREATE TABLE node_tags (
  node_id TEXT NOT NULL REFERENCES planner_nodes(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (node_id, tag_id)
);
```

### goals
```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',     -- active, completed, archived
  target_date TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

## Data Flow

```
User Input
    │
    ▼
React State (local UI state)
    │
    ├──► SQLite (persist structured data)
    ├──► Filesystem (persist media files)
    └──► MMKV (persist preferences)
    │
    ▼
React Context / Hooks (data access layer)
    │
    ▼
Components re-render
```
