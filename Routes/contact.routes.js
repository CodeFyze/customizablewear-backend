import express from 'express';
const router = express.Router();
import submitContactForm from '../Controllers/contact.controller.js';
import verifyEmail from '../Controllers/verify.email.controller.js';

router.post('/', submitContactForm);

export default router;
