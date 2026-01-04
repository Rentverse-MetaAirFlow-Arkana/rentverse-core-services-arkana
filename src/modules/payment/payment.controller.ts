import { db } from "@/config/database";
import { xenditClient } from "@/config/payment";
import { leases, payment } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";
import { stat } from "fs";

class PaymentsController {
    async createInvoice(req: Request, res: Response) {
        try {
            const { amount, customersEmails, externalId } = req.body;
            const data = {
                amount: amount,
                invoiceDuration: 172800,
                externalId: externalId,
                description: "Payment for order " + externalId,
                currency: "IDR",
                reminderTime: 1,

                successRedirectUrl: "myapp.com",
                failureRedirectUrl: "myapp.com",
                
                customer: {
                    email: customersEmails
                },
                
                paymentMethods: ["VA", "CREDIT_CARD", "QRIS", "EWALLET", "RETAIL_OUTLET"],
            }

            const response = await xenditClient.Invoice.createInvoice({
                data
            })

            res.status(201).json({
                status: 'success',
                message: 'Payment created successfully',
                invoiceUrl: response.invoiceUrl,
                externalId: response.externalId,
            });


        } catch (error) {
            res.status(500).json({ message: 'Error creating payment', error: Error instanceof Error ? Error.message : String(error) });
        }
    }

    async invoiceCallback(req: Request, res: Response) {
        try {
            const callback = req.headers['x-callback-token'];
            if (callback !== process.env.XENDIT_CALLBACK_TOKEN) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { status, external_id, id: invoice_id, amount } = req.body;
            if (status === 'COMPLETED' || status === 'SETTLED') {

            await db.transaction(async (tx) => {
                // update payment ketika status status paid
                const [updatePayment] = await tx
                    .update(payment)
                    .set({
                        status: 'COMPLETED',
                        paidAt: new Date(),
                    })
                    .where(eq(payment.leaseId, external_id))
                    .returning();

                // update status booking database
                const [updatedBooking] = await tx
                    .update(leases)
                    .set({ 
                        status, 
                        updatedAt: new Date() 
                    })
                    .where(eq(leases.id, external_id))
                    .returning();
            });

            } else if (status === 'EXPIRED') {
                // update ketika session sudah selesai
                const [updatePayment] = await db
                    .update(payment)
                    .set({
                        status: 'FAILED',
                        updatedAt: new Date(),
                    })
                    .where(eq(payment.leaseId, external_id))
            }

            res.status(200).send('Callback received');
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving payment',  error: Error instanceof Error ? Error.message : String(error) });
        }
    }

    async getInvoice(req: Request, res: Response){
        try {
            const { externalId } = req.params;
            const invoice = await xenditClient.Invoice.getInvoiceById({ invoiceId: externalId });

            res.status(200).json({
                status: 'success',
                message: 'Invoice retrieved successfully',
                invoice,
            });
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving payment',  error: Error instanceof Error ? Error.message : String(error) });
        }
    }

    async getStatusInvoice(req: Request, res: Response) {
        try{
            const {externalId} = req.params;

            const invoiceStatus = await xenditClient.Invoice.expireInvoice({ invoiceId: externalId });

            res.status(200).json({
                status: 'success',
                message: 'Invoice status retrieved successfully',
                invoiceStatus,
            });
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving payment',  error: Error instanceof Error ? Error.message : String(error) });
        }
    }
}


export default new PaymentsController();