# 🚀 Tutorlix – Local Development Setup (Skaffold + Kubernetes + Kustomize)

This guide explains how to run the **Next.js + Django (DRF)** app locally using **Skaffold + Minikube + Kustomize** for a fast, automatic, and production-like workflow.

---

# 🧱 Prerequisites

Make sure the following are installed and running:

* Docker Desktop (running)
* Minikube
* kubectl
* Skaffold

---

# ⚙️ 1. Start Minikube

```bash
minikube start --memory=8192 --cpus=4
```

---

# 🔗 2. Use Minikube Docker

```bash
eval $(minikube docker-env)
```

👉 Ensures images are built inside Minikube (no need to push)

---

# 📁 3. Project Structure

```
tutorlix/
 ├── backend/
 ├── frontend/
 ├── k8s/
 │    ├── base/
 │    │    ├── all-in-one.yaml
 │    │    └── kustomization.yaml
 │    │
 │    └── overlays/
 │         ├── local/
 │         │    └── kustomization.yaml
 │         └── vps/
 │              └── kustomization.yaml
 │
 └── skaffold.yaml
```

---

# ⚙️ 4. Skaffold Configuration

```yaml
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: tutorlix

build:
  local:
    push: false
    useBuildkit: true
  artifacts:
    - image: tutorlix-backend
      context: backend
      docker:
        dockerfile: Dockerfile.local
      sync:
        manual:
          - src: "**/*.py"
            dest: .

    - image: tutorlix-frontend
      context: frontend
      docker:
        dockerfile: Dockerfile.local
      sync:
        manual:
          - src: "**/*.{js,jsx,ts,tsx}"
            dest: .

manifests:
  kustomize:
    paths:
      - k8s/overlays/local

deploy:
  kubectl: {}

portForward:
  - resourceType: service
    resourceName: frontend
    port: 3000
    localPort: 3000

  - resourceType: service
    resourceName: backend
    port: 8000
    localPort: 8000
```

---

# ⚠️ 5. Kubernetes Config (IMPORTANT)

### ✅ Service Type

Use:

```yaml
type: ClusterIP
```

👉 No LoadBalancer needed in local dev

---

# ⚛️ 6. Frontend API Config (Kustomize-based)

Environment variables are managed via **Kustomize overlays**

### Local (k8s/overlays/local)

```yaml
configMapGenerator:
  - name: frontend-config
    literals:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

generatorOptions:
  disableNameSuffixHash: true
```

---

### VPS / Production (k8s/overlays/vps)

```yaml
configMapGenerator:
  - name: frontend-config
    literals:
      - NEXT_PUBLIC_API_URL=https://api.tutorlix.com

generatorOptions:
  disableNameSuffixHash: true
```

---

### Deployment usage

```yaml
envFrom:
  - configMapRef:
      name: frontend-config
```

---

# 🛡️ 7. Django Configuration

### ALLOWED_HOSTS

```python
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "dev.tutorlix.com",
]
```

---

### CORS Setup

```python
INSTALLED_APPS = [
    ...
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    ...
]

CORS_ALLOW_ALL_ORIGINS = True
```

---

# 🚀 8. Start Development

```bash
skaffold dev
```

---

# 🎉 What Happens Now

* Code change → auto sync/build
* Auto deploy to Kubernetes
* Auto port-forward
* Live logs in terminal

💀 No manual docker build
💀 No kubectl restart

---

# 🌍 9. Access App

* Frontend → http://localhost:3000
* Backend → http://localhost:8000

---

# 🧪 Testing Checklist

* Frontend loads ✅
* Backend API responds ✅
* No CORS error ✅
* No DisallowedHost error ✅

---

# ⚠️ Common Issues

### ❌ Changes not reflecting

Run:

```bash
skaffold dev
```

---

### ❌ Image pull error

```yaml
imagePullPolicy: Never
```

---

### ❌ Slow builds

👉 Add `.dockerignore`:

**frontend/.dockerignore**

```
node_modules
.next
.git
.env
```

**backend/.dockerignore**

```
__pycache__
*.pyc
venv
.git
.env
```

---

### ❌ API not working

* Check env (`NEXT_PUBLIC_API_URL`)
* Check backend pod running

---

### ❌ Port already in use

```bash
lsof -i :3000
kill -9 <pid>
```

---

# 🧠 Key Learnings

* Skaffold automates build + deploy
* Kustomize manages environment configs
* Kubernetes services use internal DNS
* No LoadBalancer needed for local dev
* Port-forward replaces tunnel
* Next.js env vars are build-time dependent

---

# 🚀 Dev vs Prod

| Environment | Setup                           |
| ----------- | ------------------------------- |
| Local Dev   | Skaffold + Minikube + Kustomize |
| Dev Server  | Jenkins + Kubernetes            |
| Production  | VPS / Cloud Kubernetes          |

---

🔥 You now have a production-grade Kubernetes dev workflow!
