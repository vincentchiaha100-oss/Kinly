# Getting Kinly live — step by step

Two free accounts, about 15 minutes. No credit card needed.

## 1. Create the database (Supabase)

1. Go to supabase.com → sign up free.
2. Click "New project." Name it `kinly`, set a database password (save it somewhere), pick any region.
3. Wait ~2 min for it to spin up.
4. In the left sidebar, click **SQL Editor** → **New query**.
5. Open `supabase-setup.sql` from this folder, copy ALL of it, paste into the query box, click **Run**.
6. Go to **Table Editor** in the sidebar — you should see 4 tables: `family_spaces`, `members`, `tasks`, `expenses`.
7. Go to **Project Settings** (gear icon) → **API**. Copy two values:
   - **Project URL**
   - **anon public** key

## 2. Put those values into the app

1. In this project folder, duplicate `.env.example` and rename the copy to `.env`
2. Paste in your values:
   ```
   VITE_SUPABASE_URL=https://yourprojectid.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...your long key here
   ```

## 3. Test it locally (optional but recommended)

If you have Node.js installed:
```
npm install
npm run dev
```
Open the link it gives you. Sign up, create a family space, add a task. If that works, you're ready to deploy.

## 4. Deploy it for real (Vercel)

1. Put this project on GitHub (create a free GitHub account if needed, create a new repo, upload these files).
2. Go to vercel.com → sign up free → "Add New Project" → import that GitHub repo.
3. Before clicking deploy, expand **Environment Variables** and add the same two values from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. Wait ~1 minute.
5. You'll get a real URL like `kinly-yourname.vercel.app` — that's it. That's the link you send your siblings.

## 5. Try it with a sibling

1. Open the URL, sign up with your email, create the family space.
2. Go to the **Family** tab — copy the invite code.
3. Send that code + the URL to a sibling.
4. They sign up, choose "Join with an invite code," paste it in.
5. Add a task on your phone — it should appear on theirs within a second or two (that's the realtime sync working).

## If something breaks

- **"Missing Supabase environment variables"** → the `.env` file isn't named exactly `.env`, or the Vercel env vars weren't added before deploying (you can add them after too, just redeploy from the Vercel dashboard afterward).
- **Sign up doesn't send a confirmation / login fails** → in Supabase, go to **Authentication → Providers → Email** and check "Confirm email" settings; for testing, you can disable email confirmation to skip that step.
- **Invite code doesn't find a space** → codes are lowercase only; make sure it was copied exactly.

That's the whole path. From here, it's a real, live, multi-user app.
