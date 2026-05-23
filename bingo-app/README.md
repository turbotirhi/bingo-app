# 🪔 Indian Bingo — Setup Guide

## Step 1 — Get a free Firebase database (for real-time sync)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it anything (e.g. "my-bingo")
3. Disable Google Analytics (not needed) → **Create project**
4. In the left sidebar click **"Realtime Database"**
5. Click **"Create database"** → choose **"Start in test mode"** → Enable
6. Click the ⚙️ gear icon → **"Project settings"**
7. Scroll to **"Your apps"** → click the **</>** (web) icon
8. Register app (any nickname) → copy the `firebaseConfig` object shown

## Step 2 — Paste your Firebase config into the app

Open `src/App.js` and replace the `FIREBASE_CONFIG` object at the top:

```js
const FIREBASE_CONFIG = {
  apiKey: "your-actual-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123",
};
```

## Step 3 — Push to GitHub

```bash
cd bingo-app
git init
git add .
git commit -m "Indian bingo app"
git branch -M main
# Create a new repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/bingo-app.git
git push -u origin main
```

## Step 4 — Deploy free on Vercel

1. Go to **https://vercel.com** → Sign up with GitHub (free)
2. Click **"Add New Project"** → import your `bingo-app` repo
3. Leave all settings as default → click **Deploy**
4. In ~1 minute you get a link like `https://bingo-app-xyz.vercel.app`

**Share that link with everyone — that's it! 🎉**

Everyone opens the same link, picks their name, and plays in real time.
