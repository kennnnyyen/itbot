// Vercel serverless handler — imports the Express app and exports it as the
// default function. Vercel routes all requests to /api/* here.
// app.listen() is NOT called (guarded by process.env.VERCEL in server.js).

import app from '../server/server.js';
export default app;
