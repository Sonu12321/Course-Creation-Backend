import express from "express";
import ConnectDB from "./database.js";
import dotenv from "dotenv";
import userRouter from './routes/userRoutes.js'
import StudentRouter from './routes/StudentsRoutes.js'
import CourseRouter from './routes/courseRoutes.js'
import PurchaseRouter from './routes/purchaseRoutes.js'
import CourseGetRouter from './routes/CourseRouterToGet.js'
import courseProgressRoutes from './routes/CourseProgressRoutes.js';
import adminProgressRoutes from './routes/adminRoutes.js'
// Add this line with your other route imports
import certificateRoutes from './routes/certificateRoutes.js';


// Add this line with your other app.use statements
import cookieParser from "cookie-parser";
import path from 'path';
import cors from 'cors'
import fs from 'fs';
// import status from 'express-status-monitor'

dotenv.config()

const app = express()
// Ensure upload directories exist
// Update the dirs array
const dirs = [
    './public',
    './public/temp',
    './public/temp/uploads'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Static file serving setup
app.use("/public", express.static("public"));
app.use("/public/temp", express.static("public/temp"));

// Middleware setup
// Add this special handling for the webhook route before your other middleware
// This is important because Stripe sends the webhook as raw data
app.post('/api/purchase/webhook', express.raw({type: 'application/json'}), (req, res) => {
    req.rawBody = req.body;
    PurchaseRouter(req, res);
});

// Keep your existing middleware setup for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CORS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type", "Authorization"],
}));

// Your existing route setup
app.use('/api/users', userRouter);
app.use('/api/students', StudentRouter);
app.use('/api/courses', CourseRouter);
app.use('/api/purchase', PurchaseRouter);
app.use('/api/Courseget', CourseGetRouter);
app.use('/api/progress', courseProgressRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminProgressRoutes);


// Database connection and server start
ConnectDB()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    })
    .catch((error) => {
        console.log(`Error: ${error.message}`);
        process.exit(1);
    })
    
    
    app.get('/welcome',(req,res) => {
        res.send({
            "welcomsd":"sdsdsdsd"
        })
    })
        