# ⚡ ReplyAI ERP — Complete Setup & Deployment Guide
## Enterprise Multi-Tenant AI Messaging SaaS — MongoDB Atlas + Railway + Vercel

---

## 📌 MongoDB vs PostgreSQL — Why MongoDB Atlas?

| | MongoDB Atlas | PostgreSQL (Supabase/Neon) |
|--|--|--|
| Schema flexibility | ✅ Schema-less — any business type | ❌ Fixed schema, needs migrations |
| Free tier | ✅ 512MB forever (no expiry) | ⚠️ Limited, some expire |
| Scaling | ✅ Horizontal sharding built-in | Harder to scale |
| Product variants | ✅ Nested documents naturally | Requires extra tables |
| No credit card | ✅ Truly free | Some require card |
| Setup time | ✅ 5 minutes | More complex |

**Verdict:** MongoDB Atlas M0 (free tier) = perfect for SaaS startups. 512MB holds ~500,000+ conversations easily.

---

## 🗺️ Full Architecture

```
                    ┌──────────────────────────────────────┐
                    │         SAAS OWNER (You)              │
                    │   Manages all clients from one place  │
                    └──────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        Client A                 Client B                 Client C
    (Fashion Shop)           (Restaurant)           (Electronics)
    WhatsApp + IG            WhatsApp only            IG only
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │   Your Backend         │  ← Railway (free tier)
                    │   (Node.js + Express)  │
                    │                        │
                    │  Security Stack:       │
                    │  • Helmet headers      │
                    │  • Rate limiting       │
                    │  • JWT + Refresh       │
                    │  • AES-256 encryption  │
                    │  • Input sanitization  │
                    │  • Audit logging       │
                    │  • XSS protection      │
                    └────────────┬───────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               ▼                 ▼                 ▼
       MongoDB Atlas         Claude API       Meta APIs
       (Free M0 tier)       (Anthropic)  (WhatsApp + Instagram)
```

---

## 🔑 Step 1 — MongoDB Atlas Free Tier Setup

### 1.1 Create Account
1. Go to **https://cloud.mongodb.com**
2. Click **"Try Free"**
3. Sign up with Google or email — **no credit card needed**

### 1.2 Create Free Cluster
1. Click **"Build a Database"**
2. Choose **M0 FREE** (512 MB, shared)
3. Select provider: **AWS** (recommended)
4. Select region: **Mumbai (ap-south-1)** for India
5. Cluster name: `repliai-cluster` (or anything)
6. Click **"Create Deployment"**

### 1.3 Create Database User
A dialog will appear:
1. Username: `repliai_user`
2. Password: Click **"Autogenerate Secure Password"** → **COPY THIS PASSWORD**
3. Click **"Create User"**

### 1.4 Allow IP Access
1. In the next screen, under "Where would you like to connect from?"
2. Click **"Add My Current IP Address"** (for local dev)
3. Also add `0.0.0.0/0` (allow all IPs — needed for Railway deployment)
   - Click **"Add IP Address"** → type `0.0.0.0/0` → Description: "Railway/Production" → Add
4. Click **"Finish and Close"**

### 1.5 Get Connection String
1. Go to your cluster → Click **"Connect"**
2. Choose **"Drivers"**
3. Select **Node.js** version **5.5 or later**
4. Copy the connection string, looks like:
   ```
   mongodb+srv://repliai_user:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add `/repliai` before the `?` to set the database name:
   ```
   mongodb+srv://repliai_user:YOURPASSWORD@cluster0.abc123.mongodb.net/repliai?retryWrites=true&w=majority
   ```
7. This is your **MONGODB_URI** ✅

---

## 🔐 Step 2 — Generate Security Keys

Run these commands in your terminal to generate secure keys:

```bash
# JWT Secret (64 bytes = 128 hex chars)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Refresh Token Secret
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key (32 bytes = 64 hex chars) — for storing Meta tokens
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

Save these — you'll need them in your .env file.

---

## 💻 Step 3 — Local Development Setup

### 3.1 Install Prerequisites
```bash
# Node.js v18+ (check with: node --version)
# Download: https://nodejs.org/en/download

# Git (check with: git --version)
# Download: https://git-scm.com
```

### 3.2 Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your values:
nano .env   # or use any text editor
```

Fill in your `.env`:
```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb+srv://repliai_user:YOURPASS@cluster0.abc123.mongodb.net/repliai?retryWrites=true&w=majority
JWT_SECRET=<paste your generated key>
REFRESH_TOKEN_SECRET=<paste your generated key>
ENCRYPTION_KEY=<paste your generated key>
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

```bash
# Start backend
npm run dev
# Should print: 🚀 ReplyAI ERP backend running on port 4000
# Should print: ✅ MongoDB connected: cluster0.abc123.mongodb.net
```

### 3.3 Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local

# Edit .env.local:
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local

npm run dev
# Open: http://localhost:3000
```

---

## 🚀 Step 4 — Deploy Backend to Railway (Free Tier)

Railway gives you **$5 free credit/month** — enough for a small backend.

### 4.1 Create Railway Account
1. Go to **https://railway.app**
2. Sign in with GitHub

### 4.2 Deploy from GitHub
```bash
# Push your code to GitHub first
git init
git add .
git commit -m "Initial ReplyAI ERP commit"
git remote add origin https://github.com/YOUR_USERNAME/repliai-erp.git
git push -u origin main
```

1. In Railway dashboard → **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Select your `repliai-erp` repo
4. Select the **`backend`** folder as root

### 4.3 Add Environment Variables in Railway
1. Click your service → **"Variables"** tab
2. Click **"Add Variable"** and add each:

```
NODE_ENV = production
PORT = 4000
MONGODB_URI = <your Atlas URI>
JWT_SECRET = <your generated key>
REFRESH_TOKEN_SECRET = <your generated key>
ENCRYPTION_KEY = <your generated key>
ANTHROPIC_API_KEY = sk-ant-...
META_APP_ID = <your meta app id>
META_APP_SECRET = <your meta app secret>
FRONTEND_URL = https://repliai-dashboard.vercel.app
BACKEND_URL = https://repliai-backend-production.up.railway.app
```

3. Railway auto-deploys when you push to GitHub ✅

### 4.4 Get Your Railway URL
- Dashboard → Your service → **"Settings"** → **"Domains"**
- Copy your URL: `https://repliai-backend-production.up.railway.app`
- Update `BACKEND_URL` in Railway variables

---

## 🌐 Step 5 — Deploy Frontend to Vercel (Free Tier)

Vercel is completely free for frontend Next.js apps.

### 5.1 Deploy
1. Go to **https://vercel.com**
2. Sign in with GitHub
3. Click **"New Project"** → Import your repo
4. Set **Root Directory** to `frontend`
5. Framework: **Next.js** (auto-detected)

### 5.2 Add Environment Variables in Vercel
1. Settings → Environment Variables
2. Add:
   ```
   NEXT_PUBLIC_API_URL = https://repliai-backend-production.up.railway.app
   ```
3. Click **Deploy**

### 5.3 Update Backend CORS
In Railway variables, update:
```
FRONTEND_URL = https://your-app.vercel.app
```

---

## 📱 Step 6 — Get Anthropic API Key

1. Go to **https://console.anthropic.com**
2. Sign up / Log in
3. **API Keys** → **Create Key**
4. Copy key → add to `.env` as `ANTHROPIC_API_KEY`

**Note on pricing:** Claude Sonnet costs ~$0.003 per 1K tokens. A typical customer reply = ~500 tokens = $0.0015. At 1000 replies/month = ~$1.50 in API costs. Very affordable.

---

## 📲 Step 7 — Meta Developer App Setup

### 7.1 Create Meta App
1. Go to **https://developers.facebook.com**
2. **My Apps** → **Create App**
3. App type: **Business**
4. App name: `ReplyAI` (or your brand)
5. Click **Create App**

### 7.2 Add WhatsApp Product
1. In App dashboard → **Add Products** → Find **WhatsApp** → **Set Up**
2. Go to **WhatsApp → API Setup**
3. Note your **Phone Number ID** (looks like: `123456789012345`)
4. Note your **WhatsApp Business Account ID**
5. For testing: Use the **Temporary Access Token** (valid 24hrs)
6. For production: Create a **System User** token (permanent)

**Creating Permanent System User Token:**
- Go to **Meta Business Manager** (business.facebook.com)
- **Settings** → **System Users** → **Add System User**
- Role: **Admin**
- Assign the WhatsApp app to this user
- Generate token with `whatsapp_business_messaging` permission
- This token never expires ✅

### 7.3 Connect WhatsApp in Dashboard
1. Open your ReplyAI dashboard → **Connect Platforms**
2. Enter your **Phone Number ID** + **Access Token**
3. Click **Connect**
4. You'll receive a **Webhook URL** and **Verify Token**

### 7.4 Set Webhook in Meta
1. Meta App → **WhatsApp** → **Configuration** → **Webhooks**
2. Click **Edit**
3. Paste your Webhook URL: `https://your-backend.railway.app/webhooks/whatsapp/YOUR_TENANT_ID`
4. Paste Verify Token from dashboard
5. Click **Verify and Save**
6. Subscribe to field: **messages** ✅

### 7.5 Instagram Setup
1. Your Instagram must be **Business or Creator** type
2. Link to a Facebook Page
3. In Meta App → **Add Products** → **Instagram**
4. Get your **Instagram Account ID** from the API Setup page
5. Generate a **Page Access Token** from your linked Facebook Page
6. Enable permissions: `instagram_manage_messages`, `instagram_basic`
7. Connect Instagram in ReplyAI dashboard the same way

---

## 💳 Step 8 — Razorpay Billing Setup (Optional)

### 8.1 Create Razorpay Account
1. Go to **https://razorpay.com**
2. Create account → Complete KYC (needed for payouts)
3. **Settings** → **API Keys** → Generate Test Keys

### 8.2 Add to Environment
```env
RAZORPAY_KEY_ID = rzp_test_...
RAZORPAY_KEY_SECRET = ...
RAZORPAY_WEBHOOK_SECRET = ...
```

### Suggested Pricing Plans (India)

| Plan | Monthly | Replies | Platforms |
|------|---------|---------|-----------|
| Free | ₹0 | 100 | 1 |
| Starter | ₹999 | 500 | 2 |
| Growth | ₹2,499 | 2,000 | 2 |
| Pro | ₹4,999 | Unlimited | 2 |
| Enterprise | Custom | Unlimited | Custom |

---

## 🛡️ Security Features Included

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt, 12 rounds |
| JWT Access Tokens | 7 day expiry |
| Refresh Tokens | 30 day expiry, auto-rotation |
| Account lockout | 5 failed attempts → 2hr lock |
| Meta token storage | AES-256-GCM encrypted in DB |
| SQL/NoSQL injection | express-mongo-sanitize |
| XSS attacks | xss-clean middleware |
| HTTP param pollution | hpp middleware |
| Rate limiting | 100 req/15min general, 10 req/15min auth |
| Security headers | Helmet (CSP, HSTS, etc.) |
| Webhook verification | Meta signature (HMAC-SHA256) |
| Message deduplication | In-memory cache |
| Audit trail | Immutable AuditLog collection |
| Input validation | express-validator on all endpoints |
| CORS | Strict origin whitelist |
| Error masking | No stack traces in production |
| Logging | Winston + daily rotating files |

---

## 🗄️ MongoDB Atlas — Free Tier Management Tips

### Monitor Usage
1. Atlas dashboard → **Metrics** tab
2. Watch: Storage, Connections, Network

### 512MB — How far does it go?
- Each conversation ~2KB (with 20 messages)
- 512MB → ~250,000 conversations
- Each product record ~500 bytes
- 512MB → ~1,000,000 products

### When to upgrade
- Atlas M2 = $9/month → 2GB storage
- Atlas M5 = $25/month → 5GB storage

### Backup (free)
- Atlas → Clusters → Ellipsis menu → **Download** backup
- Or use `mongodump` CLI tool

### Atlas Search Index (for product search)
After connecting, create a search index:
1. Atlas → **Search** → **Create Search Index**
2. Collection: `products`
3. This powers the full-text product search in the AI

---

## 🔄 Workflow: Adding a New Business Client

When a new shop owner signs up to your SaaS:

```
1. They go to: https://your-app.vercel.app/signup
2. Fill: Name, Email, Password, Business Name, Business Type
3. Auto-creates: tenant in MongoDB with free plan
4. Dashboard unlocked immediately

5. They go to: Products → Add all their products with prices/stock
6. They go to: Settings → Add delivery info, return policy, greeting
7. They go to: Connect Platforms → Paste WhatsApp/Instagram credentials
8. They go to: Connect Platforms → Copy webhook URL → paste in Meta app

DONE — AI starts replying to their customers automatically ✅
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|---------|
| MongoDB connection fails | Check IP whitelist (add 0.0.0.0/0 for Railway) |
| Webhook not verifying | Backend must be deployed (not localhost) |
| AI not replying | Check Anthropic API key + quota |
| WhatsApp token expired | Use System User permanent token |
| CORS errors | Update FRONTEND_URL in Railway env vars |
| Login always fails | Check JWT_SECRET is same in all environments |
| Messages duplicated | Dedup cache active — check messageId in logs |

---

## 📁 Project File Structure

```
repliai-enterprise/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          ← MongoDB connection
│   │   ├── models/
│   │   │   ├── Tenant.js            ← Business owner (multi-tenant)
│   │   │   ├── Product.js           ← Universal product catalogue
│   │   │   ├── Conversation.js      ← Messages (embedded)
│   │   │   └── AuditLog.js          ← Security audit trail
│   │   ├── middleware/
│   │   │   ├── auth.js              ← JWT + refresh token
│   │   │   └── security.js          ← Helmet, rate limit, sanitize
│   │   ├── routes/
│   │   │   ├── auth.js              ← Signup/login/refresh/reset
│   │   │   ├── products.js          ← CRUD + bulk stock update
│   │   │   ├── conversations.js     ← Chat history + stats
│   │   │   ├── platforms.js         ← WhatsApp/Instagram connect
│   │   │   ├── settings.js          ← Business + AI settings
│   │   │   ├── dashboard.js         ← Aggregated stats
│   │   │   ├── team.js              ← Team member management
│   │   │   └── audit.js             ← Audit log viewer
│   │   ├── services/
│   │   │   └── aiService.js         ← Claude AI brain (universal)
│   │   ├── utils/
│   │   │   ├── encryption.js        ← AES-256-GCM for Meta tokens
│   │   │   └── logger.js            ← Winston rotating logs
│   │   ├── webhooks/
│   │   │   └── index.js             ← WA + IG handlers + dedup
│   │   └── index.js                 ← Main app + security stack
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.js
    │   │   ├── page.js              ← Redirect to dashboard/login
    │   │   ├── globals.css          ← Full design system
    │   │   ├── login/page.js
    │   │   ├── signup/page.js       ← 2-step with 12 business types
    │   │   └── dashboard/
    │   │       ├── layout.js        ← Protected layout
    │   │       ├── page.js          ← Stats + chart + recent convs
    │   │       ├── products/        ← Universal product catalogue
    │   │       ├── conversations/   ← All DMs with filters
    │   │       ├── leads/           ← Lead/order pipeline
    │   │       ├── analytics/       ← Charts and reports
    │   │       ├── connect/         ← Platform connection
    │   │       ├── settings/        ← Business + AI config
    │   │       ├── team/            ← Team management
    │   │       ├── audit/           ← Security audit log
    │   │       └── billing/         ← Plans + Razorpay
    │   ├── components/
    │   │   └── Sidebar.js           ← Full ERP navigation
    │   └── lib/
    │       ├── api.js               ← Axios + auto token refresh
    │       └── AuthContext.js       ← Auth state
    └── package.json
```

---

## ✅ Launch Checklist

### Before going live:
- [ ] MongoDB Atlas M0 cluster created and URI copied
- [ ] Security keys generated and stored in Railway env vars
- [ ] Anthropic API key added
- [ ] Meta Developer App created and approved
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] CORS configured (FRONTEND_URL set correctly)
- [ ] BACKEND_URL set to Railway URL
- [ ] At least one test conversation completed successfully
- [ ] Password reset email configured (SMTP)
- [ ] Razorpay integrated (for paid plans)

### Security hardening before first paying customer:
- [ ] ENCRYPTION_KEY is a random 32-byte hex (not the example)
- [ ] JWT_SECRET is a random 64-byte hex
- [ ] Meta tokens are stored encrypted (verify with AuditLog)
- [ ] Rate limits tested
- [ ] Error messages don't leak internals (NODE_ENV=production)
- [ ] MongoDB Atlas IP whitelist cleaned up (remove 0.0.0.0/0 if possible, use Railway IPs)

---

Built with ❤️ using Node.js, Next.js, MongoDB Atlas, and Claude AI
