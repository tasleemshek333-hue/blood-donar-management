# 🩸 GiftLife — Local Blood Donor Finder & Emergency Alert System

GiftLife is a premium, high-fidelity web application engineered to bridge the critical gap between emergency blood requesters and local life-saving donors. 

Featuring visual aesthetics built on deep crimson-glassmorphic CSS models, fluid motion cues, and instant notification systems, GiftLife delivers an intuitive and responsive experience when minutes matter most.

---

## 🚀 Step-by-Step Guide: Testing, Git, Mobile Access, and Cloud Deployment

This comprehensive guide takes you from your local workspace to a fully deployed production environment accessible on any mobile or desktop browser globally.

---

### 📂 Phase 1: Clean Up & Code Rehydration (Any System)

If you are running the project for the first time on a new system, or want a one-click re-creation from scratch, we have bundled the entire codebase into a single self-extracting file called `recreate-app.js`.

#### How to use the Self-Extractor (`recreate-app.js`):
1. Copy the `recreate-app.js` file to an empty directory on any machine.
2. Open a terminal in that directory and run:
   ```bash
   node recreate-app.js
   ```
3. The script will automatically reconstruct the complete folder structure and extract every single source code file (including base64 encoded images, stylesheets, models, routes, and views).
4. Run `npm install` and your application is fully restored and ready to run!

---

### 🧪 Phase 2: Running and Testing Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the local server**:
   ```bash
   node server.js
   ```
   *Note: If script execution is disabled on your system for `npm.ps1`, use `node server.js` instead of `npm run dev` for a flawless launch.*
3. **Verify the server output**:
   You should see confirmation logs indicating that the local in-memory database has booted and is listening on **`http://localhost:5000`**.
4. **Default Admin Login**:
   - **Phone**: `9999999999`
   - **Password**: `admin123`

---

### 📱 Phase 3: Instant Mobile & Android Sharing (Zero-Config Tunneling)

If you want to quickly share the app running on your machine with anyone on their **mobile, Android, or tablet devices** without setting up cloud accounts, you can tunnel your local port to the internet.

1. Keep your local server running on `node server.js`.
2. Open a **new terminal** and run:
   ```bash
   npx localtunnel --port 5000
   ```
3. This command will output a public URL, for example:
   `https://sweet-donkeys-cry.loca.lt`
4. **Accessing the URL on Mobile**:
   - Open that link on any Android or mobile phone.
   - If prompted for a "tunnel password", enter the external IP address of your hosting machine (localtunnel displays this in the terminal, or you can find it by googling "what is my IP").
   - Anyone in the world can now browse your local blood donor app live from their phone!

---

### octocat Phase 4: Pushing to GitHub

To store your project securely and prepare for permanent cloud deployment, you need to push it to a GitHub repository.

> [!IMPORTANT]
> We have pre-configured a `.gitignore` file in the root of the project. This ensures that bulky temporary folders (like `node_modules/`, `database_data/`, `local-mongo-db/`, and environment secrets) are **never** pushed to GitHub.

Follow these steps in your terminal:

1. **Initialize the local Git repository**:
   ```bash
   git init
   ```
2. **Stage all clean source code files**:
   ```bash
   git add .
   ```
3. **Commit your codebase**:
   ```bash
   git commit -m "feat: complete high-fidelity blood donor application"
   ```
4. **Configure your main branch**:
   ```bash
   git branch -M main
   ```
5. **Link your local repository to GitHub**:
   - Go to [GitHub](https://github.com) and click **New Repository**.
   - Do **NOT** initialize it with a README or `.gitignore` (since we already have them).
   - Copy the repository remote URL and run:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
     ```
6. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

---

### ☁️ Phase 5: Permanent Cloud Deployment (Free Hosting)

To make your application run 24/7 permanently on a public web address, follow this professional cloud deployment workflow.

#### 1. Setup a Free Cloud Database (MongoDB Atlas)
Since local in-memory databases reset on restarts, a production server needs a cloud database.
- Register for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
- Create a new free cluster (Shared Tier).
- In the **Database Access** tab, create a database user and password.
- In the **Network Access** tab, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`).
- Click **Connect** ➔ **Drivers** ➔ Copy the Connection String (looks like `mongodb+srv://<username>:<password>@cluster.mongodb.net/...`).

#### 2. Deploy the Web Service on Render (Free Tier)
Render is an excellent free cloud hosting platform for Node.js Express servers.
- Sign up at [Render](https://render.com) and link your GitHub account.
- Click **New** ➔ **Web Service**.
- Select your GitHub repository.
- Configure the service settings:
  - **Name**: `giftlife-blood-donor`
  - **Environment**: `Node`
  - **Region**: Select the closest region to you.
  - **Branch**: `main`
  - **Build Command**: `npm install`
  - **Start Command**: `node server.js`
- Scroll down and click **Advanced** to add these **Environment Variables**:
  | Key | Value | Description |
  | :--- | :--- | :--- |
  | `NODE_ENV` | `production` | Enables performance optimizations |
  | `MONGODB_URI` | *Your MongoDB Atlas Connection String* | Connects to your persistent cloud database |
  | `SESSION_SECRET` | *A secure random string* | Protects user sessions |
- Click **Deploy Web Service**.
- Render will automatically build the container and provide a permanent HTTPS URL (e.g. `https://giftlife-blood-donor.onrender.com`) that anyone can access globally from any mobile or desktop device!

---

## 📂 Source Code Structure Map

Here is the structured layout of the application's components:

```
blood-donor-app/
├── server.js                 # Entry point: Express server, session configs, and dynamic DB switcher
├── package.json              # App dependencies, setup commands, and configuration
├── recreate-app.js           # 1-Click Codebase Self-Extractor (Single File Restore)
├── .gitignore                # Excludes node_modules and data folder from Git commits
├── Dockerfile                # Docker container configurations for production
├── .dockerignore             # Prevents bloating of Docker image builds
├── .env.example              # Blueprint template for production environment variables
│
├── public/                   # Client-Facing Static Views & Styling
│   ├── css/
│   │   └── styles.css        # Premium Crimson design theme, Glassmorphic overlays & animations
│   ├── js/
│   │   └── app.js            # Unified session checking, dynamic styling hooks & navbar logic
│   │
│   ├── index.html            # Core landing portal
│   ├── login.html            # Secure unified login portal
│   ├── register.html         # User donor portal entrance
│   ├── register-requester.html # Emergency requester instant registration
│   ├── search.html           # Live radial distance search and donor filter interface
│   ├── emergency.html        # Emergency broadcast center listing active alerts
│   ├── dashboard-donor.html  # Premium Donor Dashboard (eligibility trackers, response keys)
│   ├── dashboard-requester.html # Requester panel featuring the pop-up dynamic CTA modal
│   └── dashboard-admin.html  # System management and oversight dashboard
│
├── routes/                   # Back-End REST API Modules
│   ├── authRoutes.js         # Security, user creation, dynamic role routing, login
│   ├── donorRoutes.js        # Active donor registration, availability updates, geolocation searches
│   └── requestRoutes.js      # Creation, management, responses, and resolution of blood requests
│
└── models/                   # Mongoose Database Schemas
    ├── User.js               # User profiles (Passwords hashed automatically via bcryptjs)
    ├── Donor.js              # Active donor specific registry (Group, status, last donation date)
    ├── BloodRequest.js       # Track active patient requests, locations, and status
    └── Response.js           # Submissions and notifications tying donors to requests
```

---

## 🧬 Key Developer Commands Reference

| Operation | Command | Purpose |
| :--- | :--- | :--- |
| **Install Dependencies** | `npm install` | Restores `node_modules` |
| **Run Locally** | `node server.js` | Launches backend server + seed data |
| **Compile Extractor** | *(Pre-compiled)* | Generates clean `recreate-app.js` file |
| **Tunnel Publicly** | `npx localtunnel --port 5000` | Exposes your server to a live mobile link |
| **Check Git Status** | `git status` | Displays modified and untracked files |
