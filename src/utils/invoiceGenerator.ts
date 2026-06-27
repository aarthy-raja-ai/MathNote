
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
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
  const gstRate = sale.gstRate !== undefined ? sale.gstRate : (settings.gstRate || 18);
  const taxableAmount = subtotal - discountTotal;
  let cgst = 0, sgst = 0, igst = 0, taxTotal = 0;

  if (settings.gstEnabled) {
    if (settings.gstType === 'inter') {
      igst = sale.igst !== undefined ? sale.igst : (taxableAmount * gstRate / 100);
      taxTotal = igst;
    } else {
      // Use saved CGST/SGST if available, otherwise calculate from sale's gstRate
      cgst = sale.cgst !== undefined ? sale.cgst : (taxableAmount * (gstRate / 2) / 100);
      sgst = sale.sgst !== undefined ? sale.sgst : (taxableAmount * (gstRate / 2) / 100);
      taxTotal = cgst + sgst;
    }
  }

  const invoiceNumber = sale.invoiceNumber || `${settings.invoicePrefix || 'INV'}-${sale.id.toUpperCase().slice(0, 8)}`;
  const currency = settings.currency || '₹';
  const discountType = sale.discountType || 'percent';

  return { subtotal, discountTotal, discountType, gstRate, taxableAmount, cgst, sgst, igst, taxTotal, invoiceNumber, currency };
};

const getTaxBreakdown = (sale: Sale, settings: Settings) => {
  const taxBreakdown: Record<number, { cgst: number; sgst: number; igst: number }> = {};
  const gstEnabled = settings.gstEnabled;

  if (gstEnabled && sale.items && sale.items.length > 0) {
      sale.items.forEach(item => {
          const rate = item.taxRate !== undefined ? item.taxRate : (sale.gstRate !== undefined ? sale.gstRate : (settings.gstRate || 18));
          if (rate === 0) return;

          if (!taxBreakdown[rate]) {
              taxBreakdown[rate] = { cgst: 0, sgst: 0, igst: 0 };
          }

          const isInterState = settings.gstType === 'inter';
          let itemTax = 0;
          if (item.taxAmount !== undefined) {
              itemTax = item.taxAmount;
          } else {
              const itemTotal = item.quantity * item.unitPrice;
              const isInclusive = (sale as any).taxMode === 'inclusive' || settings.taxMode === 'inclusive';
              if (isInclusive) {
                  itemTax = itemTotal - (itemTotal / (1 + rate / 100));
              } else {
                  itemTax = itemTotal * rate / 100;
              }
          }

          const cgstVal = !isInterState ? (item.cgst !== undefined ? item.cgst : itemTax / 2) : 0;
          const sgstVal = !isInterState ? (item.sgst !== undefined ? item.sgst : itemTax / 2) : 0;
          const igstVal = isInterState ? (item.igst !== undefined ? item.igst : itemTax) : 0;

          taxBreakdown[rate].cgst += cgstVal;
          taxBreakdown[rate].sgst += sgstVal;
          taxBreakdown[rate].igst += igstVal;
      });
  }
  return taxBreakdown;
};

const getItemsHTML = (sale: Sale, currency: string, isThermal: boolean) => {
  if (sale.items && sale.items.length > 0) {
    return sale.items.map(item => `
      <tr>
        <td>
          ${item.brand ? `<span style="font-size: 9px; color: #6366f1; font-weight: 600; text-transform: uppercase; display: block; margin-bottom: 2px;">${item.brand}</span>` : ''}
          ${item.productName}
        </td>
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
  const taxBreakdown = getTaxBreakdown(sale, settings);

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
      .total-row.grand-total { border-top: 2px solid #EC0B43; border-bottom: 2px solid #EC0B43; font-weight: bold; font-size: ${isThermal ? '11px' : '18px'}; padding: 10px 0; color: #EC0B43; }
    </style>
    <div class="header">
      <div class="business-info">
        ${settings.businessLogo ? `<img class="business-logo" src="${settings.businessLogo}" />` : ''}
        <div class="business-name">${settings.businessName || 'MathNote Business'}</div>
        <div class="business-details">
          ${settings.businessAddress ? settings.businessAddress : ''}
          ${settings.businessPhone ? '<br>Phone: ' + settings.businessPhone : ''}
        </div>
        ${settings.businessGSTIN ? `<div class="gstin">GSTIN: ${settings.businessGSTIN}</div>` : ''}
      </div>
      <div class="invoice-info">
        <div class="title">INVOICE</div>
        <div class="invoice-number"># ${d.invoiceNumber}</div>
        <div class="business-details" style="margin-top: 5px;">
          Date: ${new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>

    <div class="details">
      <div class="details-row">
        <div>
          <div class="label">Billed To</div>
          <div style="font-weight: bold; margin-top: 4px; font-size: ${isThermal ? '9px' : '15px'};">${sale.customerName || 'General Customer'}</div>
        </div>
        ${sale.paymentMethod ? `
        <div style="text-align: right;">
          <div class="label">Payment Method</div>
          <div style="font-weight: bold; margin-top: 4px; font-size: ${isThermal ? '9px' : '15px'};">${sale.paymentMethod}</div>
        </div>` : ''}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          ${!isThermal ? '<th style="text-align: right; width: 100px;">Price</th>' : ''}
          <th style="text-align: right; width: 100px;">Total</th>
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
      ${d.discountTotal > 0 ? (() => {
        const discountLabel = d.discountType === 'percent'
          ? `Discount (${((d.discountTotal / d.subtotal) * 100).toFixed(0)}%):`
          : 'Discount:';
        return `
        <div class="total-row" style="color: #28a745;">
          <div class="label">${discountLabel}</div>
          <div>-${d.currency}${d.discountTotal.toLocaleString()}</div>
        </div>`;
      })() : ''}
      ${settings.gstEnabled ? (
        Object.keys(taxBreakdown).length > 0 ? (
          settings.gstType === 'inter' ? 
            Object.entries(taxBreakdown).map(([rate, vals]) => vals.igst ? `
              <div class="total-row tax">
                <div class="label">IGST (${rate}%):</div>
                <div>${d.currency}${vals.igst.toLocaleString()}</div>
              </div>` : '').join('')
            :
            Object.entries(taxBreakdown).map(([rate, vals]) => vals.cgst ? `
              <div class="total-row tax">
                <div class="label">CGST (${parseFloat(rate) / 2}%):</div>
                <div>${d.currency}${vals.cgst.toLocaleString()}</div>
              </div>
              <div class="total-row tax">
                <div class="label">SGST (${parseFloat(rate) / 2}%):</div>
                <div>${d.currency}${vals.sgst.toLocaleString()}</div>
              </div>` : '').join('')
        ) : (
          settings.gstType === 'inter' ? `
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
            </div>`
        )
      ) : ''}
      <div class="total-row grand-total">
        <div>Total:</div>
        <div>${d.currency}${sale.totalAmount.toLocaleString()}</div>
      </div>
    </div>`;
};

// ─── Modern Template ──────────────────────────────────────────────────────────

const modernTemplate = (sale: Sale, settings: Settings, isThermal: boolean): string => {
  const d = getInvoiceData(sale, settings);
  const taxBreakdown = getTaxBreakdown(sale, settings);

  return `
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; background-color: #f3f4f6; }
      .container { max-width: 800px; margin: 0 auto; background: #fff; padding: ${isThermal ? '10px' : '40px'}; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; ${isThermal ? 'flex-direction: column; gap: 15px;' : ''} }
      .logo-container { display: flex; align-items: center; gap: 12px; }
      .logo { width: ${isThermal ? '30px' : '50px'}; height: ${isThermal ? '30px' : '50px'}; border-radius: 8px; }
      .company-name { font-size: ${isThermal ? '14px' : '24px'}; font-weight: bold; color: #1e293b; }
      .invoice-title { font-size: ${isThermal ? '18px' : '32px'}; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
      .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
      .meta-item label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; display: block; }
      .meta-item value { font-size: 14px; color: #0f172a; font-weight: 500; }
      .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      .table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
      .table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: ${isThermal ? '9px' : 'inherit'}; }
      .summary-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; ${isThermal ? 'flex-direction: column; gap: 20px;' : ''} }
      .notes-card { max-width: 50%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; borderRadius: 8px; ${isThermal ? 'max-width: 100%;' : ''} }
      .totals-card { width: 280px; ${isThermal ? 'width: 100%;' : ''} }
      .totals-card hr { border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0; }
      .summary-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
      .summary-card { padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .card-total { background: #f0fdf4; border-color: #bbf7d0; }
      .card-paid { background: #eff6ff; border-color: #bfdbfe; }
      .s-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; }
      .s-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
    </style>

    <div class="container">
      <div class="header">
        <div class="logo-container">
          ${settings.businessLogo ? `<img class="logo" src="${settings.businessLogo}" />` : ''}
          <div class="company-name">${settings.businessName || 'MathNote Business'}</div>
        </div>
        <div>
          <div class="invoice-title">INVOICE</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-align: ${isThermal ? 'left' : 'right'};"># ${d.invoiceNumber}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <label>Billed To</label>
          <value>${sale.customerName || 'General Customer'}</value>
        </div>
        <div class="meta-item" style="text-align: right;">
          <label>Invoice Date</label>
          <value>${new Date(sale.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</value>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>Item Details</th>
            <th style="text-align: center; width: 60px;">Qty</th>
            ${!isThermal ? '<th style="text-align: right; width: 100px;">Price</th>' : ''}
            <th style="text-align: right; width: 100px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${getItemsHTML(sale, d.currency, isThermal)}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="notes-card">
          <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Notes / Terms</div>
          <div style="font-size: 12px; color: #475569; line-height: 1.5;">${sale.note || 'Thank you for your business!'}</div>
        </div>
        <div class="totals-card">
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span>Subtotal</span><span>${d.currency}${d.subtotal.toLocaleString()}</span>
          </div>
          ${d.discountTotal > 0 ? (() => {
            const discountLabel = d.discountType === 'percent'
              ? `Discount (${((d.discountTotal / d.subtotal) * 100).toFixed(0)}%)`
              : 'Discount';
            return `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
              <span>${discountLabel}</span><span>-${d.currency}${d.discountTotal.toLocaleString()}</span>
            </div>`;
          })() : ''}
          ${settings.gstEnabled ? (
            Object.keys(taxBreakdown).length > 0 ? (
              settings.gstType === 'inter' ? 
                Object.entries(taxBreakdown).map(([rate, vals]) => vals.igst ? `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span>IGST (${rate}%)</span><span>${d.currency}${vals.igst.toLocaleString()}</span>
                  </div>` : '').join('')
                :
                Object.entries(taxBreakdown).map(([rate, vals]) => vals.cgst ? `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span>CGST (${parseFloat(rate) / 2}%)</span><span>${d.currency}${vals.cgst.toLocaleString()}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                    <span>SGST (${parseFloat(rate) / 2}%)</span><span>${d.currency}${vals.sgst.toLocaleString()}</span>
                  </div>` : '').join('')
            ) : (
              settings.gstType === 'inter' ? `
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span>IGST (${d.gstRate}%)</span><span>${d.currency}${d.igst.toLocaleString()}</span>
                </div>` : `
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span>CGST (${d.gstRate / 2}%)</span><span>${d.currency}${d.cgst.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span>SGST (${d.gstRate / 2}%)</span><span>${d.currency}${d.sgst.toLocaleString()}</span>
                </div>`
            )
          ) : ''}
          <hr>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold; font-size: 16px;">
            <span>Total</span><span>${d.currency}${sale.totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>`;
};

// ─── Minimal Template ─────────────────────────────────────────────────────────

const minimalTemplate = (sale: Sale, settings: Settings, isThermal: boolean): string => {
  const d = getInvoiceData(sale, settings);
  const taxBreakdown = getTaxBreakdown(sale, settings);

  return `
    <style>
      body { font-family: monospace; color: #000; margin: 0; padding: ${isThermal ? '5px' : '20px'}; font-size: ${isThermal ? '10px' : '13px'}; line-height: 1.4; background: #fff; }
      .title { font-size: ${isThermal ? '16px' : '20px'}; font-weight: bold; text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
      .info-section { margin-bottom: 15px; font-size: ${isThermal ? '9px' : 'inherit'}; }
      .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .table { width: 100%; border-collapse: collapse; margin: 15px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
      .table th { padding: 6px 0; text-align: left; font-size: ${isThermal ? '9px' : 'inherit'}; }
      .table td { padding: 6px 0; font-size: ${isThermal ? '9px' : 'inherit'}; }
      .summary { margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; }
      .grand { font-weight: bold; font-size: ${isThermal ? '12px' : '15px'}; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin: 6px 0; }
      .footer { text-align: center; margin-top: 30px; font-size: ${isThermal ? '8px' : '11px'}; }
    </style>

    <div class="title">
      ${settings.businessName ? settings.businessName.toUpperCase() : 'MATHNOTE BILL'}<br>
      <span style="font-size: ${isThermal ? '8px' : '11px'}; font-weight: normal;">
        ${settings.businessAddress ? settings.businessAddress : ''}
        ${settings.businessPhone ? '<br>TEL: ' + settings.businessPhone : ''}
        ${settings.businessGSTIN ? '<br>GSTIN: ' + settings.businessGSTIN : ''}
      </span>
    </div>

    <div class="info-section">
      <div class="row"><span>Invoice:</span><span># ${d.invoiceNumber}</span></div>
      <div class="row"><span>Date:</span><span>${new Date(sale.date).toLocaleDateString('en-IN')}</span></div>
      <div class="row"><span>Customer:</span><span>${sale.customerName || 'General Customer'}</span></div>
      ${sale.paymentMethod ? `<div class="row"><span>Payment:</span><span>${sale.paymentMethod}</span></div>` : ''}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: center; width: 40px;">Qty</th>
          <th style="text-align: right; width: 80px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${getItemsHTML(sale, d.currency, true)}
      </tbody>
    </table>

    <div class="summary">
      <div class="row"><span>Subtotal</span><span>${d.currency}${d.subtotal.toLocaleString()}</span></div>
      ${d.discountTotal > 0 ? (() => {
        const discountLabel = d.discountType === 'percent'
          ? `Discount (${((d.discountTotal / d.subtotal) * 100).toFixed(0)}%)`
          : 'Discount';
        return `
          <div class="row"><span>${discountLabel}</span><span>-${d.currency}${d.discountTotal.toLocaleString()}</span></div>`;
      })() : ''}
      ${settings.gstEnabled ? (
        Object.keys(taxBreakdown).length > 0 ? (
          settings.gstType === 'inter' ? 
            Object.entries(taxBreakdown).map(([rate, vals]) => vals.igst ? `
              <div class="row"><span>IGST ${rate}%</span><span>${d.currency}${vals.igst.toLocaleString()}</span></div>` : '').join('')
            :
            Object.entries(taxBreakdown).map(([rate, vals]) => vals.cgst ? `
              <div class="row"><span>CGST ${parseFloat(rate) / 2}%</span><span>${d.currency}${vals.cgst.toLocaleString()}</span></div>
              <div class="row"><span>SGST ${parseFloat(rate) / 2}%</span><span>${d.currency}${vals.sgst.toLocaleString()}</span></div>` : '').join('')
        ) : (
          settings.gstType === 'inter' ? `
            <div class="row"><span>IGST ${d.gstRate}%</span><span>${d.currency}${d.igst.toLocaleString()}</span></div>` : `
            <div class="row"><span>CGST ${d.gstRate / 2}%</span><span>${d.currency}${d.cgst.toLocaleString()}</span></div>
            <div class="row"><span>SGST ${d.gstRate / 2}%</span><span>${d.currency}${d.sgst.toLocaleString()}</span></div>`
        )
      ) : ''}
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
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback to web WhatsApp
    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }
};
