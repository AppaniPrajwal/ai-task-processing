# AI Task Processing Platform — Architecture

## Overview

The AI Task Processing Platform is a cloud-native microservices application that separates the user-facing API from a background processing layer, ensuring a responsive user experience regardless of task load.

```
┌─────────────┐     HTTPS      ┌──────────────────────────────────────────┐
│   Browser   │ ─────────────▶ │          Kubernetes Cluster              │
└─────────────┘                │                                          │
                               │  ┌──────────┐      ┌──────────────────┐ │
                               │  │ Ingress  │─────▶│    Frontend      │ │
                               │  │ (nginx)  │      │  React + Vite    │ │
                               │  └──────────┘      └──────────────────┘ │
                               │       │                                  │
                               │       ▼                                  │
                               │  ┌──────────────────┐                   │
                               │  │   Backend API    │                   │
                               │  │ Node.js/Express  │                   │
                               │  └────────┬─────────┘                   │
                               │           │              │               │
                               │      Push task      Query/Update         │
                               │           │              │               │
                               │           ▼              ▼               │
                               │  ┌──────────────┐  ┌──────────────┐    │
                               │  │     Redis    │  │   MongoDB    │    │
                               │  │  Task Queue  │  │  (Database)  │    │
                               │  └──────┬───────┘  └──────────────┘    │
                               │         │                 ▲             │
                               │    BRPOP (blocking)       │             │
                               │         │           Write results       │
                               │         ▼                 │             │
                               │  ┌──────────────────────────────────┐  │
                               │  │       Python Worker (x2)         │  │
                               │  │  Process: uppercase / lowercase  │  │
                               │  │          reverse / word count    │  │
                               │  └──────────────────────────────────┘  │
                               └──────────────────────────────────────────┘

CI/CD:  GitHub Actions → Docker Hub → Argo CD → Kubernetes
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, custom CSS (glassmorphism) |
| Backend API | Node.js 20, Express, Mongoose, JWT auth, bcrypt |
| Worker | Python 3.12, redis-py, pymongo |
| Database | MongoDB Atlas (cloud-hosted) |
| Message Queue | Redis (in-cluster) |
| Container Runtime | Docker |
| Orchestration | Kubernetes (k3s / minikube) |
| GitOps CD | Argo CD |
| CI | GitHub Actions |

## Request Flow

1. **User submits a task** via the React frontend.
2. **Backend API** validates the JWT, saves the task as `pending` in MongoDB, pushes a lightweight JSON payload onto the Redis `task_queue` list, and immediately returns `{ status: "pending" }` to the browser.
3. **Python Worker** calls `BRPOP` on `task_queue` — this is a blocking, atomic operation. Even with multiple worker replicas, each task is guaranteed to be picked up by exactly one worker.
4. **Worker processes** the task (uppercase / lowercase / reverse / word count), then writes the result and status back to MongoDB.
5. **Frontend polls** the `/api/tasks` endpoint every 3 seconds to display live status and logs.

## Kubernetes Resources

All manifests live in `infra/kubernetes/`:

| File | Purpose |
|---|---|
| `namespace.yaml` | Isolates all resources in `ai-task-platform` |
| `secrets.yaml` | Holds `MONGO_URI` and `JWT_SECRET` (base64-encoded) |
| `configmap.yaml` | Non-secret environment config |
| `backend.yaml` | Backend `Deployment` + `Service` with health probes and resource limits |
| `worker.yaml` | Worker `Deployment` (2 replicas) with resource limits and liveness probe |
| `frontend.yaml` | Frontend `Deployment` + `Service` |
| `redis.yaml` | Redis `Deployment` + `Service` |
| `mongodb.yaml` | MongoDB `Deployment` + `Service` (if self-hosted) |
| `ingress.yaml` | Nginx Ingress routing `/api` → backend, `/` → frontend |
| `application.yaml` | Argo CD `Application` resource |

## CI/CD Pipeline

```
git push → GitHub Actions
                │
                ├─ Lint (ESLint frontend)
                │
                └─ Build & push Docker images (SHA-tagged)
                        │
                        └─ Patch image tags in infra repo
                                │
                                └─ Argo CD detects drift → auto-sync → rolling deploy
```

### GitHub Actions (`ci.yml`)
- Runs on every push to `main`
- Builds and pushes three images to Docker Hub tagged with the commit SHA
- Updates the image tag in the infra manifests via `sed`
- Commits the change back to the repo

### Argo CD
- Watches the `infra/kubernetes/` directory
- Detects the new image tag committed by GitHub Actions
- Applies a rolling update to the cluster automatically

## Security

- All secrets (MongoDB URI, JWT secret) are stored in a Kubernetes `Secret` and injected as environment variables — never hardcoded in images.
- JWT tokens expire and are validated on every API request.
- Passwords are hashed with bcrypt before storage.
- `.env` files are gitignored; use `.env.example` as a template.

## Resource Limits

Every deployment declares CPU and memory requests/limits to ensure stable scheduling and prevent noisy-neighbour issues:

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| Frontend | 50m | 100m | 64Mi | 128Mi |
| Backend | 100m | 250m | 128Mi | 256Mi |
| Worker | 100m | 500m | 128Mi | 256Mi |
