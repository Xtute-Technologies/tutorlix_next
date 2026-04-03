# 🚀 Tutorlix – Local Development Setup (Skaffold + Kubernetes)

This guide explains how to run the **Next.js + Django (DRF)** app locally using **Skaffold + Minikube** for a fast and automatic development workflow.

---

# 🧱 Prerequisites

* Docker Desktop (running)
* Minikube installed
* kubectl installed
* Skaffold installed

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

👉 Ensures images are built inside Minikube

---

# 📁 3. Project Structure

```
tutorlix/
 ├── backend/
 ├── frontend/
 ├── k8s/
 └── skaffold.yaml
```

---

# ⚙️ 4. Skaffold Configuration

Create `skaffold.yaml` in root:

```yaml
apiVersion: skaffold/v4beta6
kind: Config
metadata:
  name: tutorlix

build:
  local:
    push: false
  artifacts:
    - image: tutorlix-backend
      context: backend
    - image: tutorlix-frontend
      context: frontend

deploy:
  kubectl:
    manifests:
      - k8s/*.yaml

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

# ⚠️ 5. Kubernetes Service Update (IMPORTANT)

Use **ClusterIP** instead of LoadBalancer:

### backend-service.yaml

```yaml
type: ClusterIP
```

### frontend-service.yaml

```yaml
type: ClusterIP
```

👉 No need for `minikube tunnel` in dev

---

# ⚛️ 6. Frontend API Config (VERY IMPORTANT)

In `frontend-deployment.yaml`:

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://backend:8000"
```

👉 Inside Kubernetes, services communicate via DNS (`backend`)

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

### CORS

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

* Code change → auto build
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

Ensure you are running:

```bash
skaffold dev
```

---

### ❌ Image pull error

Add in deployments:

```yaml
imagePullPolicy: Never
```

---

### ❌ API not working

* Ensure frontend env is correct (`backend:8000`)
* Ensure backend pod is running

---

### ❌ Port already in use

```bash
lsof -i :3000
kill -9 <pid>
```

---

# 🧠 Key Learnings

* Skaffold automates build + deploy
* Kubernetes services use internal DNS
* No LoadBalancer needed for local dev
* Port-forward replaces tunnel
* Next.js env variables are build-time

---

# 🚀 Dev vs Prod

| Environment | Setup               |
| ----------- | ------------------- |
| Local Dev   | Skaffold + Minikube |
| Dev Server  | Jenkins + Minikube  |
| Production  | Cloud Kubernetes    |

---

# 🚀 Next Steps

* Ingress setup (domain-based routing)
* HTTPS with cert-manager
* CI/CD pipeline improvements
* Autoscaling

---

🔥 You now have a **modern Kubernetes dev workflow with Skaffold!**
