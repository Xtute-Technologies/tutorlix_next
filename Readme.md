# 🚀 Tutorlix – Kubernetes (Minikube) Local Setup

This guide explains how to run the **Next.js + Django (DRF)** app locally using Kubernetes via Minikube.

---

# 🧱 Prerequisites

* Docker Desktop (running)
* Minikube installed
* kubectl installed

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

👉 Ensures images are built inside Minikube.

---

# 🏗️ 3. Build Images

```bash
docker build -t tutorlix-backend ./backend
docker build -t tutorlix-frontend ./frontend
```

---

# 📦 4. Deploy to Kubernetes

```bash
kubectl apply -f k8s/
```

---

# 🔍 5. Verify Pods

```bash
kubectl get pods
```

Expected:

```
backend-xxxx   Running
frontend-xxxx  Running
```

---

# 🌐 6. Use LoadBalancer (IMPORTANT)

Since NodePort is unreliable on Mac, we use LoadBalancer with Minikube tunnel.

---

## Update services

### backend-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: LoadBalancer
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
```

---

### frontend-service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
    - port: 3000
      targetPort: 3000
```

---

## Apply changes

```bash
kubectl apply -f k8s/
```

---

# 🚀 7. Start Tunnel

```bash
minikube tunnel
```

👉 Keep this terminal running

---

# 🌍 8. Access App

* Frontend → http://localhost:3000
* Backend → http://localhost:8000

---

# ⚛️ 9. Frontend API Config

In `frontend-deployment.yaml`:

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://localhost:8000"
```

---

# 🔁 10. Rebuild Frontend (IMPORTANT)

```bash
eval $(minikube docker-env)

docker build -t tutorlix-frontend ./frontend
kubectl rollout restart deployment frontend
```

---

# 🛡️ 11. Django Configuration

### ALLOWED_HOSTS

```python
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "dev.tutorlix.com",
]
```

---

### CORS (Required)

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

# 🧪 Testing Checklist

* Frontend loads ✅
* Backend API responds ✅
* No CORS error ✅
* No DisallowedHost error ✅

---

# ⚠️ Common Issues

## ❌ NodePort not working (Mac)

Use:

```
minikube tunnel
```

---

## ❌ API not working

* Ensure frontend env is correct
* Ensure backend is accessible at `localhost:8000`

---

## ❌ Changes not reflecting

```bash
kubectl rollout restart deployment <name>
```

---

## ❌ DisallowedHost error

Add `127.0.0.1` in ALLOWED_HOSTS

---

## ❌ CORS error

Enable `CORS_ALLOW_ALL_ORIGINS = True`

---

# 🧠 Key Learnings

* Kubernetes does not build images
* Next.js env variables are build-time
* Mac + Minikube requires tunnel for LoadBalancer
* Services communicate via DNS inside cluster
* Browser requires externally accessible URLs

---

# 🚀 Next Steps

* Ingress setup (domain-based routing)
* HTTPS with cert-manager
* Autoscaling
* CI/CD with Kubernetes

---

🔥 You now have a full local Kubernetes setup running!
