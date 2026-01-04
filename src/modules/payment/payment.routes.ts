import express from 'express';
import PaymentsController from './payment.controller';

const router = express.Router();


router.post('/create-invoice', PaymentsController.createInvoice);
router.post('/invoice-callback', PaymentsController.invoiceCallback);
router.get('/invoice/:externalId', PaymentsController.getInvoice);
router.get('/invoice-status/:externalId', PaymentsController.getStatusInvoice);

export default router;
