# HKUgram

Course project for COMP3278. The implementation is being delivered one core function at a time following the provided requirements.

## Current status

- Core function 1 complete: MySQL schema plus backend CRUD APIs
- Core function 2 complete: read-only SQL query system and Text-to-SQL demo queries
- Core function 3 complete: React frontend with Art Deco feed, posting flow, and query dashboard
- Core function 4 in progress: integrated Docker deployment and demo readiness

## Run the full project

1. From the repository root, run `docker compose up --build`.
2. Open `http://127.0.0.1:5173` for the frontend.
3. Backend API is available at `http://127.0.0.1:8000`.
4. MySQL is exposed on `127.0.0.1:3306`.

## Docker Images

This project publishes two separate container images instead of one combined image.

- Backend image: `ghcr.io/<owner>/hkugram-backend:<version>`
  Runs the FastAPI application and backend bootstrap logic.
- Frontend image: `ghcr.io/<owner>/hkugram-frontend:<version>`
  Serves the built Vite frontend with Nginx.

The images are separated on purpose:

- backend and frontend use different runtimes
- they can be rebuilt and redeployed independently
- CI/CD is simpler
- production deployments are easier to scale and maintain

## How To Deploy

### Option 1: Local development deployment

This is the current development setup in this repository.

1. Clone the repository.
2. From the repository root, run:

```bash
docker compose up --build
```

3. Open:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- MySQL: `127.0.0.1:3306`

This mode is for development because:

- backend is built locally from `backend/Dockerfile`
- frontend runs the Vite dev server instead of the production frontend image

### Option 2: Deploy with published GHCR images

After GitHub Actions publishes a release, you can deploy with the versioned images directly.

Example image names:

- `ghcr.io/<owner>/hkugram-backend:<version>`
- `ghcr.io/<owner>/hkugram-frontend:<version>`

Example production-style compose file:

```yaml
services:
  db:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: hkugram
      MYSQL_USER: hkugram
      MYSQL_PASSWORD: hkugram
      MYSQL_ROOT_PASSWORD: root
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-uroot", "-proot"]
      interval: 10s
      timeout: 5s
      retries: 10

  backend:
    image: ghcr.io/<owner>/hkugram-backend:<version>
    restart: unless-stopped
    environment:
      APP_NAME: HKUgram API
      DATABASE_URL: mysql+pymysql://hkugram:hkugram@db:3306/hkugram
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    image: ghcr.io/<owner>/hkugram-frontend:<version>
    restart: unless-stopped
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

Deployment steps:

1. Make sure the release workflow has already published the backend and frontend images.
2. Replace `<owner>` with the GitHub account or organization name.
3. Replace `<version>` with the value in the release tag, for example `0.8.0-alpha.1`.
4. Save the compose file and run:

```bash
docker compose up -d
```

5. Open:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`

If the images are private on GHCR, log in first:

```bash
docker login ghcr.io
```

### Option 3: Deploy individual containers manually

You can also run the images without Compose, but Compose is the simpler option because this project also needs MySQL.

In practice, the recommended deployment path for this repo is:

1. MySQL container
2. backend image
3. frontend image

## Deployment Notes

- The backend image expects a working MySQL database through `DATABASE_URL`.
- The backend runs bootstrap on startup, so schema creation and seed logic happen there.
- The frontend image is static and does not contain the backend.
- Because the frontend and backend are separate images, redeploying the UI does not require rebuilding the API image.

## GitHub Actions

- `.github/workflows/ci.yml`
  Runs backend compile checks and frontend production build on push and pull request.

- `.github/workflows/release.yml`
  Reads the project version from `VERSION`, creates a `v<version>` Git tag and GitHub Release when that tag does not already exist, then builds and publishes backend/frontend Docker images to GHCR:
  - `ghcr.io/<owner>/hkugram-backend:<version>`
  - `ghcr.io/<owner>/hkugram-frontend:<version>`
  The workflow can run on every push to `main`, but it only publishes a new release when the current `VERSION` does not already have a matching git tag.

The release workflow uses the repository `GITHUB_TOKEN`, so package publishing must be allowed for Actions in the repository settings.
