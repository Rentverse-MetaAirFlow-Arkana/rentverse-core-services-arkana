import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import { db } from '../config/database';
import { bookings, properties, users, userSignatures } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import fileUploadService from '../utils/fileUpload';

interface RentalAgreementData {
  booking: any;
  property: any;
  tenant: any;
  landlord: any;
  tenantSignature?: any;
  landlordSignature?: any;
}

class PDFGenerationService {
  /**
   * Upload PDF buffer to Supabase Storage
   */
  async uploadPDFToStorage(pdfBuffer: Buffer, fileName: string): Promise<any> {
    try {
      const result = await fileUploadService.uploadPDFBuffer(
        pdfBuffer,
        fileName,
        'rental-agreements'
      );

      console.log('✅ PDF uploaded successfully to Supabase');

      return {
        key: result.key,
        fileName: `${fileName}.pdf`,
        size: result.size,
        url: result.url,
        bucket: result.bucket,
      };
    } catch (error) {
      console.error('❌ Supabase PDF upload error:', error);
      throw error;
    }
  }

  /**
   * Generate rental agreement PDF
   */
  async generateRentalAgreementPDF(bookingId: string): Promise<any> {
    try {
      // Get booking data with relations
      const [bookingData] = await db
        .select({
          booking: bookings,
          property: properties,
          tenant: users,
        })
        .from(bookings)
        .leftJoin(properties, eq(bookings.propertyId, properties.id))
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(eq(bookings.id, bookingId))
        .limit(1);

      if (!bookingData) {
        throw new Error('Booking not found');
      }

      // Get landlord data
      const [landlord] = await db
        .select()
        .from(users)
        .where(eq(users.id, bookingData.property.ownerId))
        .limit(1);

      // Get tenant signature
      const [tenantSignature] = await db
        .select()
        .from(userSignatures)
        .where(and(
          eq(userSignatures.userId, bookingData.booking.tenantId),
          eq(userSignatures.isActive, true)
        ))
        .limit(1);

      // Get landlord signature
      const [landlordSignature] = await db
        .select()
        .from(userSignatures)
        .where(and(
          eq(userSignatures.userId, bookingData.property.ownerId),
          eq(userSignatures.isActive, true)
        ))
        .limit(1);

      const agreementData: RentalAgreementData = {
        booking: bookingData.booking,
        property: bookingData.property,
        tenant: bookingData.tenant,
        landlord,
        tenantSignature,
        landlordSignature,
      };

      // Generate HTML from template
      const templatePath = path.join(process.cwd(), 'templates', 'rental-agreement.ejs');
      
      // Create a simple template if it doesn't exist
      const templateContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Rental Agreement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .signature { margin-top: 50px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>RENTAL AGREEMENT</h1>
        <p>Agreement ID: <%= booking.id %></p>
    </div>
    
    <div class="section">
        <h3>Property Details</h3>
        <p><strong>Property:</strong> <%= property.title %></p>
        <p><strong>Address:</strong> <%= property.address %>, <%= property.city %></p>
        <p><strong>Monthly Rent:</strong> <%= property.currencyCode %> <%= property.price %></p>
    </div>
    
    <div class="section">
        <h3>Tenant Information</h3>
        <p><strong>Name:</strong> <%= tenant.firstName %> <%= tenant.lastName %></p>
        <p><strong>Email:</strong> <%= tenant.email %></p>
        <p><strong>Phone:</strong> <%= tenant.phone || 'N/A' %></p>
    </div>
    
    <div class="section">
        <h3>Landlord Information</h3>
        <p><strong>Name:</strong> <%= landlord.firstName %> <%= landlord.lastName %></p>
        <p><strong>Email:</strong> <%= landlord.email %></p>
        <p><strong>Phone:</strong> <%= landlord.phone || 'N/A' %></p>
    </div>
    
    <div class="section">
        <h3>Rental Period</h3>
        <p><strong>Start Date:</strong> <%= new Date(booking.startDate).toLocaleDateString() %></p>
        <p><strong>End Date:</strong> <%= new Date(booking.endDate).toLocaleDateString() %></p>
        <p><strong>Total Amount:</strong> <%= property.currencyCode %> <%= booking.totalAmount %></p>
    </div>
    
    <div class="signature">
        <div style="display: flex; justify-content: space-between;">
            <div>
                <p>_________________________</p>
                <p>Tenant Signature</p>
                <p><%= tenant.firstName %> <%= tenant.lastName %></p>
            </div>
            <div>
                <p>_________________________</p>
                <p>Landlord Signature</p>
                <p><%= landlord.firstName %> <%= landlord.lastName %></p>
            </div>
        </div>
        <p style="text-align: center; margin-top: 30px;">
            Date: <%= new Date().toLocaleDateString() %>
        </p>
    </div>
</body>
</html>`;

      const html = ejs.render(templateContent, agreementData);

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();

      // Upload PDF to storage
      const fileName = `rental-agreement-${bookingId}-${Date.now()}`;
      const uploadResult = await this.uploadPDFToStorage(pdfBuffer, fileName);

      console.log('✅ Rental agreement PDF generated successfully');

      return {
        success: true,
        fileName: uploadResult.fileName,
        url: uploadResult.url,
        key: uploadResult.key,
        size: uploadResult.size,
        bookingId,
      };
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      throw new Error(`Failed to generate rental agreement: ${(error as Error).message}`);
    }
  }
}

export default new PDFGenerationService();
