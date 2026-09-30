# Render deployment

This repository deploys as three Render services plus MongoDB Atlas:

- `anpr-ml`: Python Flask inference service
- `anpr-backend`: Node.js API
- `anpr-frontend`: React/Vite static site
- MongoDB Atlas: hosted database

## 1. Create MongoDB Atlas

1. Create a cluster and database named `anpr_city`.
2. Create a database user.
3. In **Network Access**, allow the Render outbound IPs. For a demo, `0.0.0.0/0` works, but restrict access before production.
4. Copy the SRV connection string. It will be used as `MONGODB_URI`.

## 2. Create the Render Blueprint

1. Push this repository to GitHub or GitLab.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render will read `render.yaml` and create the two web services and static site.
4. Set the prompted secret values:

Backend `anpr-backend`:

- `MONGODB_URI`: Atlas connection string
- `ML_SERVICE_URL`: the deployed `anpr-ml` URL, for example `https://anpr-ml.onrender.com`
- `FRONTEND_URL`: the deployed frontend URL, for example `https://anpr-frontend.onrender.com`

Frontend `anpr-frontend`:

- `VITE_API_URL`: the deployed backend URL, for example `https://anpr-backend.onrender.com`

The frontend variable is injected at build time, so redeploy the frontend after changing it.

## 3. Verify services

Open these URLs after deployment:

- `https://<backend>/api/health`
- `https://<ml-service>/health`
- `https://<frontend>/`

The ML service loads `models/custom_trained_model.pt` during startup. The first deploy can take several minutes and needs enough memory for Ultralytics and OpenCV. Render free instances may sleep and may not have enough memory for reliable video inference; use a paid instance or a GPU-capable provider for production workloads.

## Important deployment behavior

Uploaded media is sent from the backend to the ML service as multipart data. The services therefore do not require a shared filesystem. Uploaded files stored under Render's local disk are ephemeral; use object storage such as S3 or Cloudinary if uploaded media must survive restarts or redeployments.
