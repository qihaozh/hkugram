# HKUgram Project Diagrams

This file captures the diagrams that support the COMP3278 final presentation.
The diagrams are derived from the current implementation in `backend/app` and `frontend/src`.

## 1. System Architecture

```mermaid
flowchart LR
    User[Browser User] --> FE[React + Vite Frontend]
    FE -->|REST API| BE[FastAPI Backend]
    BE -->|SQLAlchemy ORM| DB[(MySQL 8.4)]
    BE --> UP[Local Upload Storage]
    BE --> QE[Read-only SQL + Text-to-SQL Engine]

    subgraph Frontend
      FE --> P1[Home Feed]
      FE --> P2[Create Post]
      FE --> P3[Profile + Follow]
      FE --> P4[History]
      FE --> P5[Analytics]
      FE --> P6[Settings + Auth]
    end

    subgraph Backend
      BE --> R1[/posts routes/]
      BE --> R2[/users routes/]
      BE --> R3[/auth routes/]
      BE --> R4[/analytics routes/]
      BE --> R5[/query routes/]
    end
```

## 2. ER Diagram

```mermaid
erDiagram
    USERS {
        int id PK
        string username UK
        string password_hash
        string display_name
        string bio
        datetime created_at
    }

    POSTS {
        int id PK
        int user_id FK
        string category
        text description
        string image_url
        int image_width
        int image_height
        datetime created_at
    }

    LIKES {
        int id PK
        int user_id FK
        int post_id FK
        datetime created_at
    }

    COMMENTS {
        int id PK
        int user_id FK
        int post_id FK
        text body
        datetime created_at
    }

    VIEW_HISTORY {
        int id PK
        int user_id FK
        int post_id FK
        datetime viewed_at
    }

    FOLLOWS {
        int id PK
        int follower_id FK
        int followee_id FK
        datetime created_at
    }

    USERS ||--o{ POSTS : creates
    USERS ||--o{ LIKES : performs
    USERS ||--o{ COMMENTS : writes
    USERS ||--o{ VIEW_HISTORY : records
    POSTS ||--o{ LIKES : receives
    POSTS ||--o{ COMMENTS : contains
    POSTS ||--o{ VIEW_HISTORY : appears_in
    USERS ||--o{ FOLLOWS : follower
    USERS ||--o{ FOLLOWS : followee
```

## 3. Main Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as FastAPI
    participant D as MySQL

    U->>F: Open Home / Create / Profile / Analytics
    F->>B: GET /feed, /users/{username}, /analytics/overview
    B->>D: Read relational data
    D-->>B: Rows
    B-->>F: JSON response
    F-->>U: Art Deco dashboard/feed UI

    U->>F: Like, comment, follow, or create post
    F->>B: POST request with current user context
    B->>D: Insert/update relational rows
    D-->>B: Commit success
    B-->>F: Updated counts / objects
    F-->>U: Immediate UI refresh
```

## 4. Query Feature Flow

```mermaid
flowchart TD
    Prompt[User prompt or SQL text] --> API[/query/text-to-sql or /query/sql]
    API --> Guard[Read-only validation]
    Guard --> Mapper[Prompt-to-SQL mapping]
    Mapper --> Exec[Execute SELECT only]
    Exec --> Result[Columns + rows + row_count]
    Result --> UI[Analytics / query demo view]
```

## Notes for Presentation

- The required relational design is covered by `users`, `posts`, `likes`, `comments`, `view_history`, and `follows`.
- The SQL system requirement is covered by the read-only `/query/sql` endpoint and the mapped `/query/text-to-sql` endpoint.
- The UI requirement is covered by the React frontend pages for feed, profile, history, analytics, and posting.
- The deployment requirement is covered by Docker Compose with separate frontend, backend, and MySQL services.
