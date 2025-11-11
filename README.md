
# Virtual Friends — Web Frontend

A clean React (Vite) frontend for your Virtual Friends backend.

## Quick start

```bash
# 1) Unzip, then open this folder in a terminal
npm install

# 2) (optional) set your backend URL
#    create a .env file and add:
# VITE_API_BASE=https://virtual-friends-chat.onrender.com

# 3) Run locally
npm run dev  # http://localhost:5173

# 4) Build for production
npm run build  # outputs to /dist

# 5) Deploy to Netlify (drag & drop /dist), Vercel, or any static host
```

## Configure CORS on the backend
In Render, add your site URL (e.g., https://your-site.netlify.app and your custom domain) to `ALLOWED_ORIGINS` so the browser can call the API.

