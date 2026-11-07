# Campus Navigator — Production Deployment & Demonstration Guide

This guide provides step-by-step instructions for hosting Campus Navigator online, configuring environment variables, and demonstrating the platform locally on a laptop.

---

## 1. Cloud Provider Free-Tier Analysis (Current State)

| Component | Recommended Host | Free-Tier Status & Capabilities | Best Alternative |
|---|---|---|---|
| **Frontend** | **Vercel** | **100% Free**: Unlimited static hosting, automatic SSL, CDN edge distribution, and continuous deployment from Git. | Netlify / Cloudflare Pages |
| **Backend** | **Render** | **Free Web Service**: Supports Python 3.11/FastAPI, 512 MB RAM, free SSL. Spins down after 15 minutes of inactivity (50s cold start). | Railway ($5 free monthly credit) / Fly.io |
| **Database** | **Neon / Supabase** | **Free Serverless PostgreSQL**: 0.5 GB storage with full **PostGIS extension** support enabled out of the box (`CREATE EXTENSION postgis;`). | Managed SQLite for zero-cost single-instance deployments |

---

## 2. Step-by-Step Production Deployment

### Step A: Deploy the Database (PostgreSQL with PostGIS)
1. Sign up for a free account at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a new project called `campus-navigator`.
3. Copy the **PostgreSQL Connection String**:
   ```
   postgresql://user:password@ep-sample-123.region.neon.tech/campus_navigator?sslmode=require
   ```

### Step B: Deploy the Backend (Render)
1. Push your repository to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New Web Service**.
3. Select your GitHub repository.
4. Set the following build settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `DATABASE_URL`: Your PostgreSQL connection string from Step A.
   - `SECRET_KEY`: A random 32+ character secure secret.
   - `ADMIN_DEFAULT_USERNAME`: Your desired admin username (e.g., `superadmin`).
   - `ADMIN_DEFAULT_PASSWORD`: A strong production password.
   - `BACKEND_CORS_ORIGINS`: `["https://your-frontend.vercel.app"]`
6. Click **Deploy Web Service**. Once deployed, copy your backend URL (e.g., `https://campus-nav-api.onrender.com`).

### Step C: Deploy the Frontend (Vercel)
1. Sign in to [Vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Configure the project:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL`: `https://campus-nav-api.onrender.com/api`
5. Click **Deploy**. Your app is live with a global CDN and HTTPS!

---

## 3. Environment Variables Reference Checklist

| Variable Name | Environment | Description | Production Example |
|---|---|---|---|
| `DATABASE_URL` | Backend | Relational database connection string | `postgresql://...` |
| `SECRET_KEY` | Backend | Cryptographic secret for signing JWT tokens | `7f8a9b2c...32bytes` |
| `ADMIN_DEFAULT_USERNAME` | Backend | Default administrator account username | `admin` |
| `ADMIN_DEFAULT_PASSWORD` | Backend | Default administrator account password | *Choose strong password* |
| `BACKEND_CORS_ORIGINS` | Backend | Allowed frontend origin domains | `["https://campus.edu"]` |
| `CAMPUS_NAME` | Backend | Display name of the university campus | `Apex Institute of Tech` |
| `VITE_API_BASE_URL` | Frontend | API endpoint URL prefix | `https://api.campus.edu/api` |

---

## 4. Local Laptop Demonstration Guide

To present Campus Navigator live during a presentation, evaluation, or viva:

### Step 1: Start Both Servers
Open two terminal windows:

**Terminal 1 — Backend:**
```powershell
cd e:\Campus-Nav\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```powershell
cd e:\Campus-Nav\frontend
npm run dev
```

Open `http://localhost:5173` in your browser (Chrome, Edge, or Brave).

### Step 2: Key Features to Showcase

1. **Map Exploration & Dark Mode**:
   - Show smooth panning and zooming on the Leaflet map.
   - Click the Moon icon to toggle Dark Mode and display nighttime map styling.
2. **Instant Search & Autocomplete**:
   - Type `"lib"` in the search bar. Note how the suggestion appears with a highlight. Click it to fly directly to the Central Library.
3. **Category Chips**:
   - Tap the *Food & Dining* chip to isolate canteens and cafeterias.
4. **Step-Free / Accessible Navigation**:
   - Open Directions from *Main Gate* to *Engineering Block*.
   - Toggle **Accessible Route (No Stairs)** on and off to demonstrate how the routing engine re-routes pedestrians around outdoor stairs and utilizes the wheelchair ramp instead.
5. **Simulating GPS Location in Browser**:
   - Press `F12` to open Chrome DevTools.
   - Press `Ctrl + Shift + P`, type `Sensors`, and press `Enter`.
   - Under **Location**, choose **Custom locations** and enter coordinates: `Latitude: 17.6599`, `Longitude: 75.9064`.
   - Tap the **My Location** button in the app: the map will instantly lock onto the simulated blue dot!
6. **Visual Map Graph Editor (Admin Showcase)**:
   - Tap the Layers/Shield button, sign in with `admin` / `admin123`.
   - Enter **Add Node** mode and drop a point on the map.
   - Enter **Link Nodes** mode and connect two nodes with a ramp.
   - Drag a node marker across the screen to demonstrate real-time graph reactivity.

