# Deployment Guide

## Architecture

- Frontend: Vercel
- Backend API: Render
- Database: MongoDB Atlas

## 1. Backend on Render

- Create a new `Web Service`
- Point it to this repository
- Set `Root Directory` to `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/health`

### Backend environment variables

- `NODE_ENV=production`
- `PORT=5000`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://*.vercel.app`

## 2. Frontend on Vercel

- Import the same repository into Vercel
- Set `Root Directory` to `frontend`

### Frontend environment variables

- `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`

## 3. Important production notes

- Rotate the current MongoDB and JWT secrets before going live if they were ever shared or committed locally.
- After backend deploy, update `ALLOWED_ORIGINS` with your real Vercel production domain and any preview wildcard you want to allow.
- After frontend deploy, verify login, admin dashboard, client export, and intern tracking against the Render API URL.

## 4. Optional seed data

To load the sample intern route locally or against a non-production database:

```bash
cd backend
npm run seed
```
