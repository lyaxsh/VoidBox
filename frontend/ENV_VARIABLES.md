# Frontend Environment Variables

## Required Variables

### Backend API
- `VITE_BACKEND_URL`: Your backend API URL (e.g., `https://voidbox-backend.fly.dev/api`)

### Supabase Configuration
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Contact Support
- `VITE_CONTACT_WORKER_URL`: Your Cloudflare Worker URL for contact form (e.g., `https://your-contact-worker.your-subdomain.workers.dev`)

## Example .env file
```env
VITE_BACKEND_URL=https://voidbox-backend.fly.dev/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_CONTACT_WORKER_URL=https://your-contact-worker.your-subdomain.workers.dev
```

## Setup Instructions
1. Copy the example variables above
2. Create a `.env` file in the `frontend/` directory
3. Replace the placeholder values with your actual configuration
4. Restart your development server after making changes 