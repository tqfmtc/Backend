import {versionCheck} from '../controllers/nativeController.js';
import express from 'express';
const router = express.Router();

router.get('/version-check',versionCheck)

export default router;