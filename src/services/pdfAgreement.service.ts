import PDFDocument from 'pdfkit';
import fileUploadService from '../utils/fileUpload';

interface BookingData {
  booking: any;
  lease: any;
  property: any;
  tenant: any;
  landlord: any;
}

export class PDFAgreementService {
  
  /**
   * Generate rental agreement PDF
   */
  async generateRentalAgreementPDF(bookingData: BookingData): Promise<{ url: string; path: string; fileName: string; fileSize: number }> {
    try {
      const { booking, lease, property, tenant, landlord } = bookingData;
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      
      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const fileName = `rental_agreement_${booking.id}.pdf`;
            
            // Upload to Supabase
            const uploadResult = await fileUploadService.uploadPDFBuffer(
              pdfBuffer, 
              fileName, 
              'rental-agreements'
            );
            
            resolve({
              url: uploadResult.url,
              path: uploadResult.key,
              fileName: uploadResult.originalName,
              fileSize: uploadResult.size
            });
          } catch (error) {
            reject(error);
          }
        });

        // Generate PDF content
        this.generatePDFContent(doc, bookingData);
        doc.end();
      });
      
    } catch (error) {
      console.error('Error generating rental agreement PDF:', error);
      throw new Error(`Failed to generate rental agreement: ${(error as Error).message}`);
    }
  }

  /**
   * Generate PDF content
   */
  private generatePDFContent(doc: PDFKit.PDFDocument, data: BookingData) {
    const { booking, lease, property, tenant, landlord } = data;
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('RENTAL AGREEMENT', { align: 'center' });
    doc.moveDown(2);
    
    // Agreement details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Agreement ID: ${booking.id}`, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown(2);
    
    // Parties
    doc.fontSize(14).font('Helvetica-Bold').text('PARTIES');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Landlord: ${landlord?.firstName || 'N/A'} ${landlord?.lastName || 'N/A'}`);
    doc.text(`Email: ${landlord?.email || 'N/A'}`);
    doc.text(`Phone: ${landlord?.phone || 'N/A'}`);
    doc.moveDown(1);
    
    doc.text(`Tenant: ${tenant?.firstName || 'N/A'} ${tenant?.lastName || 'N/A'}`);
    doc.text(`Email: ${tenant?.email || 'N/A'}`);
    doc.text(`Phone: ${tenant?.phone || 'N/A'}`);
    doc.moveDown(2);
    
    // Property details
    doc.fontSize(14).font('Helvetica-Bold').text('PROPERTY DETAILS');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Property: ${property?.title || 'N/A'}`);
    doc.text(`Address: ${property?.address || 'N/A'}, ${property?.city || 'N/A'}`);
    doc.text(`Bedrooms: ${property?.bedrooms || 'N/A'}`);
    doc.text(`Bathrooms: ${property?.bathrooms || 'N/A'}`);
    doc.text(`Area: ${property?.areaSqm || 'N/A'} sqm`);
    doc.moveDown(2);
    
    // Lease terms
    doc.fontSize(14).font('Helvetica-Bold').text('LEASE TERMS');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Start Date: ${new Date(booking.startDate).toLocaleDateString()}`);
    doc.text(`End Date: ${new Date(booking.endDate).toLocaleDateString()}`);
    doc.text(`Total Amount: MYR ${parseFloat(booking.totalAmount).toLocaleString()}`);
    doc.text(`Security Deposit: MYR ${parseFloat(booking.securityDeposit || '0').toLocaleString()}`);
    doc.text(`Payment Type: ${booking.paymentType}`);
    doc.text(`Installments: ${booking.installmentCount} payments`);
    doc.moveDown(2);
    
    // Terms and conditions
    doc.fontSize(14).font('Helvetica-Bold').text('TERMS AND CONDITIONS');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    const terms = [
      '1. The tenant agrees to pay rent on time as per the installment schedule.',
      '2. The security deposit will be refunded upon satisfactory completion of the lease.',
      '3. The tenant is responsible for maintaining the property in good condition.',
      '4. No subletting is allowed without written consent from the landlord.',
      '5. The landlord has the right to inspect the property with 24-hour notice.',
      '6. Any damages beyond normal wear and tear will be deducted from the security deposit.',
      '7. This agreement is governed by Malaysian law.',
    ];
    
    terms.forEach(term => {
      doc.text(term, { paragraphGap: 5 });
    });
    
    doc.moveDown(3);
    
    // Signatures
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('SIGNATURES', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(10).font('Helvetica');
    doc.text('Landlord: _________________________', 100, doc.y);
    doc.text('Date: _____________', 350, doc.y - 12);
    doc.moveDown(3);
    
    doc.text('Tenant: _________________________', 100, doc.y);
    doc.text('Date: _____________', 350, doc.y - 12);
    doc.moveDown(2);
    
    // Footer
    doc.fontSize(8).font('Helvetica');
    doc.text('This agreement was generated electronically by Rentverse.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  }
}

export default new PDFAgreementService();
