import express from 'express';
const router = express.Router();
import submitContactForm from '../Controllers/contact.controller.js';

router.post('/', submitContactForm);

export default router;
