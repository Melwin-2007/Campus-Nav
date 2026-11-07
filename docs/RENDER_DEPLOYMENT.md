# Production Deployment Guide: Hosting Campus Navigator on Render

This guide outlines how to deploy the full-stack **Campus Navigator** application on [Render](https://render.com).

---

## Architecture Overview

Campus Navigator can be deployed to Render in either of two topologies:

| Method | Description | Render Resources | Best For |
|---|---|---|---|
| **Option 1 (Recommended)** | **Unified Full-Stack Web Service** — React SPA built during CI/CD and served directly by FastAPI. | 1 Web Service | Cost efficiency, single URL, free-tier compliance |
| **Option 2** | **Decoupled Architecture** — React SPA as a Render Static Site + FastAPI as a separate Web Service. | 1 Static Site + 1 Web Service | High-traffic scaling, independent frontend/backend CI/CD |

---

## Option 1: Unified Full-Stack Service (Recommended)

In this mode, Render builds the React frontend into `dist/`, mounts the static files inside FastAPI, and serves the entire map application and API on a single URL (`https://campus-navigator.onrender.com`).

### 1. One-Click Blueprint Deployment (render.yaml)
If your repository is connected to Render:
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub / GitLab repository.
4. Render will automatically detect [`render.yaml`](file:///e:/Campus-Nav/render.yaml) and configure the service.
5. Click **Apply**.

---

### 2. Manual Service Setup (Alternative)
If you prefer creating the service manually through the Render UI:

1. Click **New +** > **Web Service**.
2. Select your repository.
3. Configure the following service settings:
   - **Name**: `campus-navigator`
   - **Region**: Oregon (or nearest to your users)
   - **Branch**: `master` (or `main`)
   - **Root Directory**: *(Leave empty to use repository root)*
   - **Runtime**: `Python`
   - **Build Command**: `./build.sh`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (or `Starter`)

4. Add the following **Environment Variables** under the **Environment** tab:

| Variable | Value | Notes |
|---|---|---|
| `PYTHON_VERSION` | `3.11.9` | Matches project runtime |
| `ENVIRONMENT` | `production` | Enables production security controls |
| `SECRET_KEY` | *(Click "Generate")* | 32+ character cryptographic secret |
| `DATABASE_URL` | `sqlite:///./campus_navigator.db` | Default local SQLite |
| `BACKEND_CORS_ORIGINS` | `["*"]` | Allows cross-origin client requests |
| `ADMIN_DEFAULT_USERNAME` | `admin` | Initial admin username |
| `ADMIN_DEFAULT_PASSWORD` | `admin123` | **Change to a strong password** |

5. Click **Deploy Web Service**.

---

## Option 2: Decoupled Deployment (Static Site + API Service)

If you prefer deploying the frontend and backend as separate services:

### Step A: Deploy Backend Web Service
1. In Render, click **New +** > **Web Service**.
2. Configure settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt && python -m app.seed.seeder`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set environment variables:
   - `PYTHON_VERSION`: `3.11.9`
   - `BACKEND_CORS_ORIGINS`: `["https://<your-frontend-subdomain>.onrender.com"]`
   - `SECRET_KEY`: *(Generate)*
4. Note your backend URL (e.g., `https://campus-nav-api.onrender.com`).

### Step B: Deploy Frontend Static Site
1. In Render, click **New +** > **Static Site**.
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. Set environment variable:
   - `VITE_API_URL`: `https://campus-nav-api.onrender.com/api`
4. Set **Redirects / Rewrites** in the **Redirects/Rewrites** tab:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite` (Status `200`)

---

## Database Persistence on Render

### Using SQLite with Render Persistent Disk (Recommended for Single-Service)
On Render's Free tier, the filesystem is ephemeral (resets on deploys or restarts). To persist changes made in the Admin Map Editor permanently on SQLite:
1. In your Web Service settings, navigate to **Disks**.
2. Click **Add Disk**:
   - **Name**: `campus-data`
   - **Mount Path**: `/var/data`
   - **Size**: 1 GB
3. Update your `DATABASE_URL` environment variable:
   ```
   sqlite:////var/data/campus_navigator.db
   ```

### Using Render PostgreSQL
To scale to a production PostgreSQL database:
1. In Render, click **New +** > **PostgreSQL**.
2. Copy the **Internal Database URL** (e.g., `postgres://user:pass@dpg-xxx/dbname`).
3. Paste it as `DATABASE_URL` in your Web Service environment variables.
   > [!NOTE]
   > The application automatically converts `postgres://` to `postgresql://` to maintain strict SQLAlchemy 2.0 driver compatibility.

---

## Post-Deployment Verification

Once Render finishes deploying:

1. **Automated Health Check**:
   Open `https://<your-app>.onrender.com/health` in your browser. Expected response:
   ```json
   {"status": "ok"}
   ```

2. **Open the Web Map**:
   Navigate to `https://<your-app>.onrender.com`.
   - The map loads centered on the SGBIT Belagavi campus.
   - All 7 campus location pins appear with custom photos.
   - Walking directions calculate instantly.

3. **Admin Graph Editor**:
   - Click the **Layers** button (top-right control bar).
   - Sign in with your configured admin credentials (`admin` / your password).
   - Verify that adding nodes, dragging markers, and linking edges saves to the database.

