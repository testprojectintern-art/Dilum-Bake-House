import express from 'express';
import { getActiveSession, openSession, closeSession, getSessions } from '../controllers/posSessionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

const posAllowed = authorize('admin', 'manager', 'cashier');

router.get('/', posAllowed, getSessions);
router.get('/active', posAllowed, getActiveSession);
router.post('/open', posAllowed, openSession);
router.post('/close', posAllowed, closeSession);

export default router;
