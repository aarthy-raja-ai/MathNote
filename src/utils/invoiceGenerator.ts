
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Sale, Expense, Credit, Settings } from './storage';

export const generateInvoicePDF = async (sale: Sale, settings: Settings) => {
    const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #EC0B43; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 28px; font-weight: bold; color: #EC0B43; }
          .invoice-info { text-align: right; }
          .details { margin-bottom: 30px; }
          .details-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .label { color: #666; font-weight: bold; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .table th { background-color: #f8f8f8; padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          .table td { padding: 12px; border-bottom: 1px solid #eee; }
          .total-section { float: right; width: 250px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; margin-top: 10px; padding-top: 10px; }
          .footer { margin-top: 100px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
          .watermark { position: fixed; bottom: 20; right: 20; opacity: 0.1; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">INVOICE</div>
            <div style="margin-top: 5px; color: #666;">MathNote Digital Record</div>
          </div>
          <div class="invoice-info">
            <div>Date: ${new Date(sale.date).toLocaleDateString('en-IN')}</div>
            <div>Invoice #: ${sale.id.toUpperCase().slice(0, 8)}</div>
          </div>
        </div>

        <div class="details">
          <div class="details-row">
            <div>
              <div class="label">Billed To:</div>
              <div style="font-size: 18px; margin-top: 5px;">${sale.customerName || 'Walk-in Customer'}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Payment Status:</div>
              <div style="color: ${sale.paidAmount >= sale.totalAmount ? '#28a745' : '#dc3545'}; font-weight: bold; margin-top: 5px;">
                ${sale.paidAmount >= sale.totalAmount ? 'PAID' : 'PARTIAL'}
              </div>
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${sale.note || 'General Items'}</td>
              <td style="text-align: right;">${settings.currency}${sale.totalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <div class="label">Subtotal:</div>
            <div>${settings.currency}${sale.totalAmount.toLocaleString()}</div>
          </div>
          <div class="total-row">
            <div class="label">Paid Amount:</div>
            <div>${settings.currency}${sale.paidAmount.toLocaleString()}</div>
          </div>
          <div class="total-row grand-total">
            <div>Balance Due:</div>
            <div>${settings.currency}${(sale.totalAmount - sale.paidAmount).toLocaleString()}</div>
          </div>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated via MathNote - Every Number. Clearly Noted.</p>
        </div>
        
        <div class="watermark">MathNote App</div>
      </body>
    </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
};

export const shareOnWhatsApp = async (text: string) => {
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    // Note: In Expo/React Native, we usually use Linking.openURL(url)
    // But since we want to share the professional invoice, the PDF sharing above is often better.
    // We will use this for text reminders.
    return url;
};
