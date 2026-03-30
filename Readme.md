# 🚀 Tutorlix – Local Kubernetes Setup (Minikube)

This guide helps you run the **Next.js + Django (DRF)** application on Kubernetes using Minikube.

---

# 🧱 Prerequisites

* Docker Desktop (running)
* Minikube installed
* kubectl installed

---

# ⚙️ Step 1: Start Minikube

```bash
minikube start --memory=8192 --cpus=4
```

---

# 🔗 Step 2: Connect Docker to Minikube

```bash
eval $(minikube docker-env)
```

👉 This ensures Docker builds images inside Minikube.

---

# 🏗️ Step 3: Build Images

```bash
docker build -t tutorlix-backend ./backend
docker build -t tutorlix-frontend ./frontend
```

---

# 📦 Step 4: Deploy to Kubernetes

```bash
kubectl apply -f k8s/
```

---

# 🔍 Step 5: Verify Pods

```bash
kubectl get pods
```

Expected:

```
backend-xxxx   Running
frontend-xxxx  Running
```

---

# 🌐 Step 6: Access Frontend

```bash
minikube service frontend
```

👉 Opens app in browser

---

# 🔥 Step 7: Fix Backend API Access (IMPORTANT)

Kubernetes internal DNS (`backend:8000`) **does NOT work in browser**

### Use port-forward instead:

```bash
kubectl port-forward service/backend 8000:8000
```

👉 Now backend available at:

```
http://localhost:8000
```

---

# ⚛️ Step 8: Configure Frontend API URL

Update frontend deployment:

```yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "http://localhost:8000"
```

---

# 🔁 Step 9: Rebuild Frontend (IMPORTANT)

```bash
eval $(minikube docker-env)

docker build -t tutorlix-frontend ./frontend
kubectl rollout restart deployment frontend
```

---

# 🛡️ Step 10: Fix Django ALLOWED_HOSTS

In `settings.py`:

```python
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "dev.tutorlix.com",
]
```

---

# 🧪 Testing

* Frontend loads ✅
* API calls hit backend ✅
* No `DisallowedHost` error ✅

---

# ⚠️ Common Issues

## ❌ ERR_CONNECTION_REFUSED

* Backend not exposed correctly
* Fix → use port-forward

---

## ❌ DisallowedHost error

* Add `127.0.0.1` to `ALLOWED_HOSTS`
* Rebuild backend

---

## ❌ Changes not reflecting

* Rebuild image + restart deployment

```bash
kubectl rollout restart deployment <name>
```

---

# 🧠 Key Learnings

* Kubernetes does NOT build images
* Next.js env variables are build-time
* `localhost` behaves differently across environments
* Always rebuild + redeploy after changes

---

# 🚀 Next Steps

* Ingress (domain routing)
* HTTPS (cert-manager)
* Autoscaling
* CI/CD with Kubernetes

---

# 💬 Notes

* Keep `kubectl port-forward` running while testing locally
* Do NOT use `backend:8000` in frontend for browser calls
* Use service names ONLY inside cluster

---

🔥 You're now running a full-stack app on Kubernetes!
