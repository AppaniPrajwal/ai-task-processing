# AI Task Processing Platform

A full-stack MERN application with a Python worker for background task processing. This project is containerized with Docker and ready for deployment to Kubernetes using Argo CD.

## Features
- **User Authentication**: JWT-based login and registration (hashed with bcrypt).
- **Task Creation**: Users can submit text to be processed (uppercase, lowercase, reverse string, word count).
- **Asynchronous Processing**: The Node.js backend pushes tasks to a Redis queue, which are processed by a Python worker.
- **Real-time Status Tracking**: View task status (pending, running, success, failed) and logs.
- **Rich UI**: Beautiful React frontend using modern CSS aesthetics.

## Project Structure
- `frontend/`: React + Vite application.
- `backend/`: Node.js + Express API.
- `worker/`: Python script to process jobs from Redis.
- `infra/`: Kubernetes manifests for GitOps deployment.
- `docker-compose.yml`: For local development.
- `.github/workflows/ci.yml`: CI/CD pipeline.
- `Architecture.md`: Detailed architecture design and scaling strategy.

## Local Development Setup

1. **Prerequisites**: Ensure you have Docker and Docker Compose installed.
2. **Run the stack**:
   ```bash
   docker-compose up --build
   ```
3. **Access the application**:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## Kubernetes Deployment (GitOps with Argo CD)

1. **Prerequisites**: Ensure you have a running Kubernetes cluster (e.g., k3s, minikube, docker-desktop) and Argo CD installed.
2. **Apply Namespace and Secrets**:
   ```bash
   kubectl apply -f infra/kubernetes/namespace.yaml
   kubectl apply -f infra/kubernetes/secrets.yaml
   ```
3. **Connect to Argo CD**:
   Create an Argo CD application pointing to your infrastructure repository containing the `infra/kubernetes/` manifests. Argo CD will automatically sync the deployments.
4. **Access**: Map `ai-tasks.local` in your `/etc/hosts` file to your cluster IP to use the Ingress.
