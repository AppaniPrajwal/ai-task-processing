# AI Task Processing Platform - Architecture Document

## Overview
The AI Task Processing Platform is a fully decoupled, cloud-native microservices application designed for high availability, fault tolerance, and dynamic scalability. By separating the user-facing API from the heavy compute processing layer, the platform guarantees responsive user experiences even under extreme load.

The core stack consists of:
- **Frontend**: A modern React application built with Vite, utilizing Glassmorphism design and custom CSS for a premium aesthetic.
- **Backend API**: Node.js and Express.js providing RESTful endpoints, secured with JWT authentication, and using Mongoose for data modeling.
- **Worker Pipeline**: Python 3.11 asynchronous workers dedicated to processing computationally intensive tasks.
- **Primary Database**: MongoDB, serving as the source of truth for user profiles, task metadata, and structured logs.
- **Message Broker**: Redis, utilized as a high-throughput, low-latency task queue buffering requests between the Node.js backend and Python workers.
- **Orchestration & Infrastructure**: Kubernetes (k3s/minikube) managed via GitOps using Argo CD, with Kustomize for environment configurations.

## KEDA Setup & Dynamic Scaling Strategy

Traditional Kubernetes Horizontal Pod Autoscalers (HPA) rely heavily on CPU and Memory metrics. While effective for monolithic web applications, metric-based scaling is often too slow and indirect for queue-based worker architectures. If a massive burst of tasks arrives, CPU spikes only *after* workers pick them up, leading to delayed scaling and prolonged queue times.

To solve this, we implement **KEDA (Kubernetes Event-driven Autoscaling)**.

### How KEDA Works in our Architecture
KEDA directly monitors the length of the `task_queue` in our Redis instance. Instead of waiting for CPU usage to trigger a scale-out event, KEDA acts proactively.

1. **ScaledObject Configuration**: We define a `ScaledObject` custom resource that points to the worker `Deployment` and authenticates with the Redis instance using a `TriggerAuthentication` resource.
2. **Redis Trigger**: The trigger is configured to watch the `task_queue` list. We set a `listLength` threshold (e.g., `listLength: 10`).
3. **Scaling Behavior**:
   - If the queue has 0 items, KEDA can scale the Python worker pods down to `0` (Zero-to-Scale), saving compute resources and costs during idle periods.
   - For every 10 tasks in the queue, KEDA spins up an additional pod, up to a defined `maxReplicaCount` (e.g., 50).
   - As workers process tasks and the queue length drops, KEDA gracefully scales the deployment back down.

This event-driven approach ensures that our processing power precisely matches our backlog in real-time.

## Redis Persistence: AOF Configuration Specifics

Redis is traditionally an in-memory datastore, which means a pod restart or crash could result in the loss of all queued tasks. Given that tasks might involve financial transactions or critical data processing, data loss is unacceptable.

To guarantee message durability, we configure Redis with **AOF (Append Only File)** persistence.

### AOF Technical Implementation
While Redis supports RDB (Redis Database) snapshots, RDB only saves at specific intervals (e.g., every 5 minutes). If a crash occurs between snapshots, tasks are lost. AOF, instead, logs every single write operation received by the server.

- **`appendonly yes`**: This is enabled in the `redis.conf` mapped via a Kubernetes ConfigMap.
- **`appendfsync everysec`**: We use the `everysec` policy. This provides the optimal balance between performance and durability. Redis will buffer writes and flush them to the disk every second. In the absolute worst-case catastrophic hardware failure, only 1 second of queue data is lost, without the massive I/O overhead of syncing on `always`.
- **AOF Rewrite (`auto-aof-rewrite-percentage`)**: To prevent the AOF file from growing indefinitely, Redis periodically rewrites the log in the background, creating the shortest sequence of commands needed to rebuild the current dataset in memory.
- **Persistent Volumes (PV/PVC)**: The AOF file (`appendonly.aof`) is stored on a Kubernetes `PersistentVolumeClaim`. If the Redis pod is evicted or crashes, the new pod binds to the same PVC, reads the AOF file, and perfectly reconstructs the `task_queue` before accepting new connections.

## GitOps and Kustomize Overlay Layout

To maintain strict parity across environments (Development, Staging, Production) without duplicating YAML manifests, we utilize **Kustomize** paired with **Argo CD**.

### Directory Structure
Our infrastructure code is organized to maximize reusability:
```text
infra/kubernetes/
├── base/
│   ├── backend-deployment.yaml
│   ├── worker-deployment.yaml
│   ├── redis-statefulset.yaml
│   ├── mongo-statefulset.yaml
│   ├── services.yaml
│   └── kustomization.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   ├── scale-patch.yaml
    │   └── configmap-env.yaml
    └── production/
        ├── kustomization.yaml
        ├── scale-patch.yaml
        ├── ingress-prod.yaml
        └── configmap-env.yaml
```

### The Base Layer
The `base/` directory contains the raw, environment-agnostic Kubernetes manifests. These define the standard architecture: container images, port bindings, volume mounts, and basic labels.

### The Overlay Layer
The `overlays/` directory contains environment-specific variations.
- **Staging Overlay**: Modifies the base manifests to use fewer resources. It might patch the `worker-deployment` to have a `maxReplicaCount` of 5, use cheaper storage classes, and configure the `.env` ConfigMap to point to a staging database.
- **Production Overlay**: Patches the base to enforce high availability. It configures pod anti-affinity to ensure workers are spread across different nodes, bumps the `maxReplicaCount` to 50, applies resource requests/limits, and defines strict NetworkPolicies.

### Argo CD Continuous Delivery
Argo CD runs inside our Kubernetes cluster and continuously monitors our GitHub repository.
1. We define an Argo CD `Application` for Staging that watches the `infra/kubernetes/overlays/staging` path.
2. When code is merged to the `main` branch, a GitHub Action builds a new Docker image, pushes it to the registry, and updates the image tag in the staging `kustomization.yaml`.
3. Argo CD detects the configuration drift and automatically applies the changes to the staging namespace.
4. Once verified, a Pull Request is made to update the `production` overlay. Merging triggers Argo CD to securely and predictably roll out the changes to the production namespace.

## Handling High Task Volume & Concurrency
With 100,000 tasks per day, the system must efficiently manage concurrent load.
- **Atomic Operations**: The workers use Redis `BRPOP` (Blocking Right Pop). This is an atomic operation, guaranteeing that even with 50 concurrent workers, a single task is exclusively handed to exactly one worker. No duplicate processing can occur.
- **Asynchronous Flow**: The Node.js API acts strictly as an ingress proxy. It validates the JWT, constructs the task payload, pushes it to Redis in `O(1)` time, and instantly responds with `200 OK` and a `pending` status. This non-blocking design ensures the API can handle thousands of requests per second without being bogged down by the actual task computation.
- **Structured MongoDB Logging**: Workers execute `$push` operations to the MongoDB `logs` array. By storing logs as structured objects (`timestamp`, `level`, `message`) rather than concatenated strings, the frontend can efficiently query and render real-time, color-coded execution logs for the end user.
