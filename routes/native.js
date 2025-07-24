import {versionCheck} from '../controllers/nativeController.js';
import express from 'express';
const router = express.Router();

router.post('/version-check',versionCheck)

export default router;