
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Sale, Expense, Credit, Settings } from './storage';

// Invoice print size options
export type InvoicePrintSize = 'A4' | 'A5' | 'thermal58' | 'thermal80';
export type InvoiceTemplate = 'classic' | 'modern' | 'minimal';

// ─── Print Size CSS ───────────────────────────────────────────────────────────

const getPrintSizeCSS = (size: InvoicePrintSize): string => {
  switch (size) {
    case 'thermal58':
      return `@page { size: 58mm auto; margin: 2mm; } body { font-size: 9px; padding: 2mm; width: 54mm; }`;
    case 'thermal80':
      return `@page { size: 80mm auto; margin: 3mm; } body { font-size: 10px; padding: 3mm; width: 74mm; }`;
    case 'A5':
      return `@page { size: A5; margin: 10mm; } body { font-size: 11px; padding: 10mm; }`;
    case 'A4':
    default:
      return `@page { size: A4; margin: 15mm; } body { font-size: 14px; padding: 40px; }`;
  }
};

// ─── Shared Helpers ───────────────────────────────────────────────────────────

const getInvoiceData = (sale: Sale, settings: Settings) => {
  const subtotal = sale.subtotal || sale.totalAmount;
  const discountTotal = sale.discountTotal || 0;
  const gstRate = settings.gstRate || 18;
  const taxableAmount = subtotal - discountTotal;
  let cgst = 0, sgst = 0, igst = 0, taxTotal = 0;

  if (settings.gstEnabled) {
    if (settings.gstType === 'inter') {
      igst = sale.igst || (taxableAmount * gstRate / 100);
      taxTotal = igst;
    } else {
      cgst = sale.cgst || (taxableAmount * (gstRate / 2) / 100);
      sgst = sale.sgst || (taxableAmount * (gstRate / 2) / 100);
      taxTotal = cgst + sgst;
    }
  }

  const invoiceNumber = sale.invoiceNumber || `${settings.invoicePrefix || 'INV'}-${sale.id.toUpperCase().slice(0, 8)}`;
  const currency = settings.currency || '₹';

  return { subtotal, discountTotal, gstRate, taxableAmount, cgst, sgst, igst, taxTotal, invoiceNumber, currency };
};

const getItemsHTML = (sale: Sale, currency: string, isThermal: boolean) => {
  if (sale.items && sale.items.length > 0) {
    return sale.items.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align: center;">${item.quantity}</td>
        ${!isThermal ? `<td style="text-align: right;">${currency}${item.unitPrice.toLocaleString()}</td>` : ''}
        <td style="text-align: right;">${currency}${(item.quantity * item.unitPrice).toLocaleString()}</td>
      </tr>
    `).join('');
  }
  const subtotal = sale.subtotal || sale.totalAmount;
  return `<tr>
    <td>${sale.note || 'General Items'}</td>
    <td style="text-align: center;">1</td>
    ${!isThermal ? `<td style="text-align: right;">${currency}${subtotal.toLocaleString()}</td>` : ''}
    <td style="text-align: right;">${currency}${subtotal.toLocaleString()}</td>
  </tr>`;
};

// ─── Classic Template ─────────────────────────────────────────────────────────

const classicTemplate = (sale: Sale, settings: Settings, isThermal: boolean): string => {
  const d = getInvoiceData(sale, settings);

  return `
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #EC0B43; padding-bottom: 15px; margin-bottom: 20px; ${isThermal ? 'flex-direction: column;' : ''} }
      .business-info { max-width: 60%; }
      .business-logo { border-radius: 8px; object-fit: cover; margin-bottom: 8px; width: ${isThermal ? '30px' : '60px'}; height: ${isThermal ? '30px' : '60px'}; }
      .business-name { font-weight: bold; color: #1a1a1a; font-size: ${isThermal ? '12px' : '22px'}; margin-bottom: 5px; }
      .business-details { color: #666; line-height: 1.4; font-size: ${isThermal ? '8px' : '12px'}; }
      .gstin { color: #444; font-weight: bold; margin-top: 5px; font-size: ${isThermal ? '7px' : '11px'}; }
      .title { font-weight: bold; color: #EC0B43; font-size: ${isThermal ? '14px' : '28px'}; }
      .invoice-info { ${isThermal ? 'margin-top: 5px;' : 'text-align: right;'} }
      .invoice-number { font-weight: bold; color: #1a1a1a; font-size: ${isThermal ? '10px' : '16px'}; }
      .details { margin-bottom: 20px; }
      .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
      .label { color: #666; font-weight: bold; text-transform: uppercase; font-size: ${isThermal ? '7px' : '12px'}; }
      .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .table th { background-color: #f8f8f8; padding: ${isThermal ? '3px' : '12px'}; text-align: left; border-bottom: 1px solid #ddd; text-transform: uppercase; font-size: ${isThermal ? '8px' : '12px'}; }
      .table td { padding: ${isThermal ? '3px' : '12px'}; border-bottom: 1px solid #eee; font-size: ${isThermal ? '8px' : 'inherit'}; }
      .total-section { ${isThermal ? 'width: 100%;' : 'float: right; width: 280px;'} }
      .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: ${isThermal ? '9px' : '14px'}; }
      .total-row.tax { color: #666; }
      .grand-total { font-weight: bold; border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; font-size: ${isThermal ? '11px' : '18px'}; }
      .footer { margin-top: ${isThermal ? '10px' : '100px'}; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 15px; font-size: ${isThermal ? '7px' : '12px'}; }
      .discount-row { color: #28a745; }
    </style>
    <div class="header">
      <div class="business-info">
        ${settings.businessLogo ? `<img src="${settings.businessLogo}" class="business-logo" />` : ''}
        <div class="business-name">${settings.businessName || 'MathNote'}</div>
        <div class="business-details">
          ${settings.businessAddress ? `${settings.businessAddress}<br>` : ''}
          ${settings.businessPhone ? `Phone: ${settings.businessPhone}` : ''}
        </div>
        ${settings.businessGSTIN ? `<div class="gstin">GSTIN: ${settings.businessGSTIN}</div>` : ''}
      </div>
      <div class="invoice-info">
        <div class="title">${isThermal ? 'RECEIPT' : 'INVOICE'}</div>
        <div class="invoice-number">${d.invoiceNumber}</div>
        <div style="margin-top: 8px;">Date: ${new Date(sale.date).toLocaleDateString('en-IN')}</div>
      </div>
    </div>

    <div class="details">
      <div class="details-row">
        <div>
          <div class="label">Billed To:</div>
          <div style="margin-top: 4px; font-weight: 500;">${sale.customerName || 'Walk-in Customer'}</div>
        </div>
        ${!isThermal ? `<div style="text-align: right;">
          <div class="label">Payment Status:</div>
          <div style="color: ${sale.paidAmount >= sale.totalAmount ? '#28a745' : '#dc3545'}; font-weight: bold; margin-top: 4px;">
            ${sale.paidAmount >= sale.totalAmount ? 'PAID' : 'PARTIAL'}
          </div>
        </div>` : ''}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          ${!isThermal ? '<th style="text-align: right;">Unit Price</th>' : ''}
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${getItemsHTML(sale, d.currency, isThermal)}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <div class="label">Subtotal:</div>
        <div>${d.currency}${d.subtotal.toLocaleString()}</div>
      </div>
      ${d.discountTotal > 0 ? `
        <div class="total-row discount-row">
          <div class="label">Discount:</div>
          <div>-${d.currency}${d.discountTotal.toLocaleString()}</div>
        </div>` : ''}
      ${settings.gstEnabled ? (settings.gstType === 'inter' ? `
        <div class="total-row tax">
          <div class="label">IGST (${d.gstRate}%):</div>
          <div>${d.currency}${d.igst.toLocaleString()}</div>
        </div>` : `
        <div class="total-row tax">
          <div class="label">CGST (${d.gstRate / 2}%):</div>
          <div>${d.currency}${d.cgst.toLocaleString()}</div>
        </div>
        <div class="total-row tax">
          <div class="label">SGST (${d.gstRate / 2}%):</div>
          <div>${d.currency}${d.sgst.toLocaleString()}</div>
        </div>`) : ''}
      <div class="total-row grand-total">
        <div>Total:</div>
        <div>${d.currency}${sale.totalAmount.toLocaleString()}</div>
      </div>
      <div class="total-row">
        <div class="label">Paid:</div>
        <div>${d.currency}${sale.paidAmount.toLocaleString()}</div>
      </div>
      ${sale.totalAmount - sale.paidAmount > 0 ? `
        <div class="total-row" style="color: #dc3545; font-weight: bold;">
          <div>Balance Due:</div>
          <div>${d.currency}${(sale.totalAmount - sale.paidAmount).toLocaleString()}</div>
        </div>` : ''}
    </div>
    <div style="clear: both;"></div>
    <div class="footer">
      <p>Thank you for your business!</p>
      ${!isThermal ? '<p>Generated via MathNote</p>' : ''}
    </div>`;
};

// ─── Modern Template ──────────────────────────────────────────────────────────

const modernTemplate = (sale: Sale, settings: Settings, isThermal: boolean): string => {
  const d = getInvoiceData(sale, settings);

  return `
    <style>
      * { box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; margin: 0; }
      .header-bar { background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; padding: ${isThermal ? '10px' : '30px'}; border-radius: ${isThermal ? '8px' : '16px'}; margin-bottom: ${isThermal ? '10px' : '24px'}; }
      .header-top { display: flex; justify-content: space-between; align-items: flex-start; ${isThermal ? 'flex-direction: column;' : ''} }
      .biz-name { font-size: ${isThermal ? '14px' : '24px'}; font-weight: bold; margin-bottom: 4px; }
      .biz-detail { font-size: ${isThermal ? '8px' : '12px'}; opacity: 0.85; }
      .inv-badge { background: rgba(255,255,255,0.2); border-radius: 8px; padding: ${isThermal ? '6px 8px' : '12px 16px'}; ${isThermal ? 'margin-top: 8px;' : 'text-align: right;'} }
      .inv-label { font-size: ${isThermal ? '9px' : '14px'}; opacity: 0.8; }
      .inv-number { font-size: ${isThermal ? '12px' : '20px'}; font-weight: bold; }
      .inv-date { font-size: ${isThermal ? '8px' : '12px'}; opacity: 0.7; margin-top: 4px; }
      .customer-bar { display: flex; justify-content: space-between; align-items: center; padding: ${isThermal ? '8px' : '16px'}; background: #F1F5F9; border-radius: ${isThermal ? '6px' : '12px'}; margin-bottom: ${isThermal ? '8px' : '20px'}; }
      .customer-name { font-weight: 600; font-size: ${isThermal ? '10px' : '16px'}; color: #1E293B; }
      .customer-label { font-size: ${isThermal ? '7px' : '11px'}; color: #64748B; text-transform: uppercase; }
      .status-badge { padding: 4px 12px; border-radius: 20px; font-size: ${isThermal ? '8px' : '12px'}; font-weight: bold; }
      .status-paid { background: #D1FAE5; color: #059669; }
      .status-partial { background: #FEE2E2; color: #DC2626; }
      .table { width: 100%; border-collapse: collapse; margin-bottom: ${isThermal ? '8px' : '20px'}; }
      .table th { padding: ${isThermal ? '4px' : '12px'}; text-align: left; font-size: ${isThermal ? '7px' : '11px'}; color: #64748B; text-transform: uppercase; border-bottom: 2px solid #E2E8F0; }
      .table td { padding: ${isThermal ? '4px' : '12px'}; border-bottom: 1px solid #F1F5F9; font-size: ${isThermal ? '8px' : '14px'}; }
      .summary-cards { display: flex; gap: ${isThermal ? '4px' : '12px'}; margin-bottom: ${isThermal ? '8px' : '20px'}; }
      .summary-card { flex: 1; padding: ${isThermal ? '6px' : '16px'}; border-radius: ${isThermal ? '6px' : '12px'}; }
      .summary-card .s-label { font-size: ${isThermal ? '7px' : '11px'}; color: #64748B; text-transform: uppercase; }
      .summary-card .s-value { font-size: ${isThermal ? '11px' : '20px'}; font-weight: bold; margin-top: 4px; }
      .card-total { background: #F8FAFC; }
      .card-paid { background: #F0FDF4; }
      .card-due { background: #FEF2F2; }
      .footer { text-align: center; color: #94A3B8; font-size: ${isThermal ? '7px' : '12px'}; margin-top: ${isThermal ? '10px' : '40px'}; padding-top: 15px; border-top: 1px solid #E2E8F0; }
    </style>

    <div class="header-bar">
      <div class="header-top">
        <div>
          <div class="biz-name">${settings.businessName || 'MathNote'}</div>
          ${settings.businessAddress ? `<div class="biz-detail">${settings.businessAddress}</div>` : ''}
          ${settings.businessPhone ? `<div class="biz-detail">Phone: ${settings.businessPhone}</div>` : ''}
          ${settings.businessGSTIN ? `<div class="biz-detail" style="margin-top: 4px; font-weight: 600;">GSTIN: ${settings.businessGSTIN}</div>` : ''}
        </div>
        <div class="inv-badge">
          <div class="inv-label">${isThermal ? 'RECEIPT' : 'INVOICE'}</div>
          <div class="inv-number">${d.invoiceNumber}</div>
          <div class="inv-date">${new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>
      </div>
    </div>

    <div class="customer-bar">
      <div>
        <div class="customer-label">Billed To</div>
        <div class="customer-name">${sale.customerName || 'Walk-in Customer'}</div>
      </div>
      ${!isThermal ? `<div class="status-badge ${sale.paidAmount >= sale.totalAmount ? 'status-paid' : 'status-partial'}">
        ${sale.paidAmount >= sale.totalAmount ? '✓ PAID' : 'PARTIAL'}
      </div>` : ''}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          ${!isThermal ? '<th style="text-align: right;">Rate</th>' : ''}
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${getItemsHTML(sale, d.currency, isThermal)}
      </tbody>
    </table>

    ${settings.gstEnabled || d.discountTotal > 0 ? `
    <div style="margin-bottom: 16px; font-size: ${isThermal ? '8px' : '13px'}; color: #64748B;">
      <div style="display: flex; justify-content: space-between; padding: 4px 0;">
        <span>Subtotal</span><span>${d.currency}${d.subtotal.toLocaleString()}</span>
      </div>
      ${d.discountTotal > 0 ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
        <span>Discount</span><span>-${d.currency}${d.discountTotal.toLocaleString()}</span>
      </div>` : ''}
      ${settings.gstEnabled ? (settings.gstType === 'inter' ? `
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span>IGST (${d.gstRate}%)</span><span>${d.currency}${d.igst.toLocaleString()}</span>
        </div>` : `
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span>CGST (${d.gstRate / 2}%)</span><span>${d.currency}${d.cgst.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
          <span>SGST (${d.gstRate / 2}%)</span><span>${d.currency}${d.sgst.toLocaleString()}</span>
        </div>`) : ''}
    </div>` : ''}

    <div class="summary-cards">
      <div class="summary-card card-total">
        <div class="s-label">Total</div>
        <div class="s-value" style="color: #1E293B;">${d.currency}${sale.totalAmount.toLocaleString()}</div>
      </div>
      <div class="summary-card card-paid">
        <div class="s-label">Paid</div>
        <div class="s-value" style="color: #059669;">${d.currency}${sale.paidAmount.toLocaleString()}</div>
      </div>
      ${sale.totalAmount - sale.paidAmount > 0 ? `
      <div class="summary-card card-due">
        <div class="s-label">Balance Due</div>
        <div class="s-value" style="color: #DC2626;">${d.currency}${(sale.totalAmount - sale.paidAmount).toLocaleString()}</div>
      </div>` : ''}
    </div>

    <div class="footer">
      <p>Thank you for your business!</p>
      ${!isThermal ? '<p>Generated via MathNote</p>' : ''}
    </div>`;
};

// ─── Minimal Template ─────────────────────────────────────────────────────────

const minimalTemplate = (sale: Sale, settings: Settings, isThermal: boolean): string => {
  const d = getInvoiceData(sale, settings);

  return `
    <style>
      body { font-family: 'Courier New', Courier, monospace; color: #000; margin: 0; }
      .header { border-bottom: 1px solid #000; padding-bottom: ${isThermal ? '6px' : '12px'}; margin-bottom: ${isThermal ? '8px' : '16px'}; }
      .biz-name { font-weight: bold; font-size: ${isThermal ? '13px' : '20px'}; text-transform: uppercase; }
      .biz-detail { font-size: ${isThermal ? '8px' : '11px'}; color: #444; }
      .inv-row { display: flex; justify-content: space-between; margin-top: ${isThermal ? '4px' : '8px'}; font-size: ${isThermal ? '9px' : '13px'}; }
      .customer { padding: ${isThermal ? '4px 0' : '8px 0'}; font-size: ${isThermal ? '9px' : '13px'}; margin-bottom: ${isThermal ? '4px' : '8px'}; }
      .table { width: 100%; border-collapse: collapse; margin-bottom: ${isThermal ? '6px' : '16px'}; }
      .table th { padding: ${isThermal ? '3px 0' : '6px 0'}; text-align: left; border-bottom: 1px solid #000; font-size: ${isThermal ? '8px' : '12px'}; text-transform: uppercase; }
      .table td { padding: ${isThermal ? '2px 0' : '6px 0'}; border-bottom: 1px dashed #ccc; font-size: ${isThermal ? '8px' : '13px'}; }
      .totals { border-top: 1px solid #000; padding-top: ${isThermal ? '4px' : '8px'}; }
      .totals .row { display: flex; justify-content: space-between; padding: 2px 0; font-size: ${isThermal ? '9px' : '13px'}; }
      .totals .grand { font-weight: bold; font-size: ${isThermal ? '12px' : '16px'}; border-top: 2px solid #000; margin-top: 4px; padding-top: 4px; }
      .footer { text-align: center; font-size: ${isThermal ? '7px' : '10px'}; color: #666; margin-top: ${isThermal ? '8px' : '24px'}; border-top: 1px dashed #ccc; padding-top: 8px; }
    </style>

    <div class="header">
      <div class="biz-name">${settings.businessName || 'MathNote'}</div>
      ${settings.businessAddress ? `<div class="biz-detail">${settings.businessAddress}</div>` : ''}
      ${settings.businessPhone ? `<div class="biz-detail">Tel: ${settings.businessPhone}</div>` : ''}
      ${settings.businessGSTIN ? `<div class="biz-detail">GSTIN: ${settings.businessGSTIN}</div>` : ''}
      <div class="inv-row">
        <span>${isThermal ? 'RECEIPT' : 'INVOICE'} #${d.invoiceNumber}</span>
        <span>${new Date(sale.date).toLocaleDateString('en-IN')}</span>
      </div>
    </div>

    <div class="customer">
      <strong>To:</strong> ${sale.customerName || 'Walk-in Customer'}
      ${!isThermal && sale.paidAmount < sale.totalAmount ? ` <span style="float: right; font-weight: bold;">PARTIAL</span>` : ''}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center;">Qty</th>
          ${!isThermal ? '<th style="text-align: right;">Rate</th>' : ''}
          <th style="text-align: right;">Amt</th>
        </tr>
      </thead>
      <tbody>
        ${getItemsHTML(sale, d.currency, isThermal)}
      </tbody>
    </table>

    <div class="totals">
      ${(d.discountTotal > 0 || settings.gstEnabled) ? `
        <div class="row"><span>Subtotal</span><span>${d.currency}${d.subtotal.toLocaleString()}</span></div>
        ${d.discountTotal > 0 ? `<div class="row"><span>Discount</span><span>-${d.currency}${d.discountTotal.toLocaleString()}</span></div>` : ''}
        ${settings.gstEnabled ? (settings.gstType === 'inter'
        ? `<div class="row"><span>IGST ${d.gstRate}%</span><span>${d.currency}${d.igst.toLocaleString()}</span></div>`
        : `<div class="row"><span>CGST ${d.gstRate / 2}%</span><span>${d.currency}${d.cgst.toLocaleString()}</span></div>
             <div class="row"><span>SGST ${d.gstRate / 2}%</span><span>${d.currency}${d.sgst.toLocaleString()}</span></div>`
      ) : ''}
      ` : ''}
      <div class="row grand"><span>TOTAL</span><span>${d.currency}${sale.totalAmount.toLocaleString()}</span></div>
      <div class="row"><span>Paid</span><span>${d.currency}${sale.paidAmount.toLocaleString()}</span></div>
      ${sale.totalAmount - sale.paidAmount > 0 ? `<div class="row" style="font-weight: bold;"><span>Due</span><span>${d.currency}${(sale.totalAmount - sale.paidAmount).toLocaleString()}</span></div>` : ''}
    </div>

    <div class="footer">
      Thank you for your business!${!isThermal ? ' • Generated via MathNote' : ''}
    </div>`;
};

// ─── Template Registry ────────────────────────────────────────────────────────

const templates: Record<InvoiceTemplate, (sale: Sale, settings: Settings, isThermal: boolean) => string> = {
  classic: classicTemplate,
  modern: modernTemplate,
  minimal: minimalTemplate,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns raw HTML string for invoice preview (used in WebView).
 */
export const getInvoiceHTML = (
  sale: Sale,
  settings: Settings,
  printSize: InvoicePrintSize = 'A4',
  template?: InvoiceTemplate,
): string => {
  const tpl = template || settings.invoiceTemplate || 'classic';
  const isThermal = printSize === 'thermal58' || printSize === 'thermal80';
  const bodyHTML = templates[tpl](sale, settings, isThermal);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          ${getPrintSizeCSS(printSize)}
        </style>
      </head>
      <body>
        ${bodyHTML}
      </body>
    </html>`;
};

/**
 * Generates a PDF invoice and opens the share dialog.
 */
export const generateInvoicePDF = async (
  sale: Sale,
  settings: Settings,
  printSize: InvoicePrintSize = 'A4',
  template?: InvoiceTemplate,
) => {
  const html = getInvoiceHTML(sale, settings, printSize, template);

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

// ─── Credit Report (unchanged) ────────────────────────────────────────────────

export const generateCreditReport = async (
  partyName: string,
  credits: Credit[],
  settings: Settings
) => {
  const currency = settings.currency || '₹';

  const totalGiven = credits.filter(c => c.type === 'given').reduce((sum, c) => sum + c.amount, 0);
  const totalTaken = credits.filter(c => c.type === 'taken').reduce((sum, c) => sum + c.amount, 0);
  const paidGiven = credits.filter(c => c.type === 'given').reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const paidTaken = credits.filter(c => c.type === 'taken').reduce((sum, c) => sum + (c.paidAmount || 0), 0);
  const dueGiven = totalGiven - paidGiven;
  const dueTaken = totalTaken - paidTaken;
  const netBalance = dueGiven - dueTaken;

  const sortedCredits = [...credits].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; font-size: 14px; }
          .header { border-bottom: 2px solid #EC0B43; padding-bottom: 20px; margin-bottom: 30px; }
          .business-name { font-size: 20px; font-weight: bold; color: #1a1a1a; }
          .report-title { font-size: 24px; font-weight: bold; color: #EC0B43; margin-top: 20px; }
          .party-name { font-size: 18px; color: #333; margin-top: 5px; }
          .date-range { font-size: 12px; color: #666; margin-top: 5px; }
          .summary-card { display: flex; gap: 20px; margin-bottom: 30px; }
          .summary-item { flex: 1; padding: 15px; border-radius: 8px; }
          .summary-given { background-color: rgba(16, 185, 129, 0.1); }
          .summary-taken { background-color: rgba(99, 102, 241, 0.1); }
          .summary-net { background-color: ${netBalance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(236, 11, 67, 0.1)'}; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          .given-color { color: #10B981; }
          .taken-color { color: #6366F1; }
          .net-positive { color: #10B981; }
          .net-negative { color: #EC0B43; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .table th { background-color: #f8f8f8; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-size: 12px; text-transform: uppercase; }
          .table td { padding: 12px; border-bottom: 1px solid #eee; }
          .type-given { color: #10B981; font-weight: 500; }
          .type-taken { color: #6366F1; font-weight: 500; }
          .status-paid { color: #10B981; }
          .status-pending { color: #EC0B43; }
          .payments-section { margin-left: 20px; font-size: 12px; color: #666; }
          .payment-row { padding: 4px 0; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${settings.businessName || 'MathNote'}</div>
          <div class="report-title">Credit History Report</div>
          <div class="party-name">${partyName}</div>
          <div class="date-range">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>

        <div class="summary-card">
          <div class="summary-item summary-given">
            <div class="summary-label">Credit Given (To Receive)</div>
            <div class="summary-value given-color">${currency}${dueGiven.toLocaleString()}</div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">Total: ${currency}${totalGiven.toLocaleString()} | Received: ${currency}${paidGiven.toLocaleString()}</div>
          </div>
          <div class="summary-item summary-taken">
            <div class="summary-label">Credit Taken (To Pay)</div>
            <div class="summary-value taken-color">${currency}${dueTaken.toLocaleString()}</div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">Total: ${currency}${totalTaken.toLocaleString()} | Paid: ${currency}${paidTaken.toLocaleString()}</div>
          </div>
          <div class="summary-item summary-net">
            <div class="summary-label">Net Balance</div>
            <div class="summary-value ${netBalance >= 0 ? 'net-positive' : 'net-negative'}">
              ${netBalance >= 0 ? 'To Receive: ' : 'To Pay: '}${currency}${Math.abs(netBalance).toLocaleString()}
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: right;">Paid</th>
              <th style="text-align: right;">Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${sortedCredits.map(credit => {
    const due = credit.amount - (credit.paidAmount || 0);
    const payments = credit.payments || [];
    return `
                <tr>
                  <td>${new Date(credit.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td class="${credit.type === 'given' ? 'type-given' : 'type-taken'}">${credit.type === 'given' ? '↑ Given' : '↓ Taken'}</td>
                  <td style="text-align: right;">${currency}${credit.amount.toLocaleString()}</td>
                  <td style="text-align: right;">${currency}${(credit.paidAmount || 0).toLocaleString()}</td>
                  <td style="text-align: right;">${currency}${due.toLocaleString()}</td>
                  <td class="${credit.status === 'paid' ? 'status-paid' : 'status-pending'}">${credit.status === 'paid' ? '✓ Paid' : '○ Pending'}</td>
                </tr>
                ${payments.length > 0 ? `
                  <tr>
                    <td colspan="6" class="payments-section">
                      <strong>Payment History:</strong>
                      ${payments.map(p => `
                        <div class="payment-row">
                          ${new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - 
                          ${currency}${p.amount.toLocaleString()} 
                          ${p.paymentMode ? `(${p.paymentMode})` : ''}
                        </div>
                      `).join('')}
                    </td>
                  </tr>
                ` : ''}
              `;
  }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Credit History Report for ${partyName}</p>
          <p>Generated via MathNote - Every Number. Clearly Noted.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Error generating credit report:', error);
  }
};

export const shareOnWhatsApp = async (text: string) => {
  const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
  return url;
};
