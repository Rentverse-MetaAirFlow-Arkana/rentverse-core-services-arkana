export class CodeGenerator {
  /**
   * Generate unique property code
   * Format: PROP-YYYYMMDD-XXXX (e.g., PROP-20231228-A1B2)
   */
  static generatePropertyCode(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Generate random 4-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 4; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `PROP-${year}${month}${day}-${randomCode}`;
  }

  /**
   * Generate unique booking code
   * Format: BOOK-YYYYMMDD-XXXX
   */
  static generateBookingCode(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 4; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `BOOK-${year}${month}${day}-${randomCode}`;
  }

  /**
   * Generate unique user code
   * Format: USER-YYYYMMDD-XXXX
   */
  static generateUserCode(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 4; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `USER-${year}${month}${day}-${randomCode}`;
  }
}
