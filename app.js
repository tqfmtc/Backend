import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import guestRoutes from './features/guestTutor/routes/guestRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/guest', guestRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
