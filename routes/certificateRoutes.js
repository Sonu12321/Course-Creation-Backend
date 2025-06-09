import express from 'express';
import { generateCertificate, getCertificate, getAllCertificates, verifyCertificate, revokeCertificate } from '../controller/CertificateController.js';
import authUser from "../middlewares/authMiddlewares.js"

const router = express.Router();

// Protected routes (require authentication)
router.post('/generate/:courseId', authUser, generateCertificate);
router.get('/course/:courseId', authUser, getCertificate);
router.get('/all', authUser, getAllCertificates);

// Public route for certificate verification
router.get('/verify/:certificateId', verifyCertificate);

// Admin route
router.patch('/revoke/:certificateId', authUser, revokeCertificate);

export default router;