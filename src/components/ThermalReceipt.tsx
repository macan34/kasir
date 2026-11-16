import React, { useMemo, useRef } from 'react';
import { Printer, X, CheckCircle, Download } from 'lucide-react';
import type { Store } from '@/types';

function aggregateReceiptItems(items: ReceiptData['items']) {
  const merged = new Map<string, ReceiptData['items'][number]>();

  for (const item of items) {
    const key = `${item.product_name.trim()}::${item.unit_price}`;
    const existing = merged.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      existing.line_total = existing.quantity * existing.unit_price;
    } else {
      merged.set(key, { ...item, line_total: item.quantity * item.unit_price });
    }
  }

  return Array.from(merged.values());
}

export interface ReceiptData {
  invoice_number: string;
  created_at?: string;
  store_name?: string;
  store_address?: string;
  customer_name?: string | null;
  cashier_name?: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  amount_paid?: number;
  change_amount?: number;
}

interface ThermalReceiptProps {
  data: ReceiptData;
  store: Store | null;
  onClose: () => void;
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function ThermalReceipt({ data, store, onClose }: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const receiptItems = useMemo(() => aggregateReceiptItems(data.items), [data.items]);

  const storeName = 'RETAILED POSS';
  const storeAddress = '';
  const dateFormatted = data.created_at
    ? new Date(data.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  const cashier = data.cashier_name || 'Kasir 01';
  const customer = data.customer_name || 'Pelanggan Umum';
  const amountPaid = data.amount_paid ?? data.total;
  const change = data.change_amount ?? Math.max(0, amountPaid - data.total);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=420,height=760');

    if (!printWindow) {
      window.print();
      return;
    }

    const itemMarkup = receiptItems
      .map(item => `
        <div class="item-row">
          <div class="item-name">${escapeHtml(item.product_name)}</div>
          <div class="item-meta">
            <span>${item.quantity} x ${item.unit_price.toLocaleString('id-ID')}</span>
            <span>${item.line_total.toLocaleString('id-ID')}</span>
          </div>
        </div>
      `)
      .join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Struk ${escapeHtml(data.invoice_number)}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              max-width: 80mm;
            }
            body {
              display: block;
              padding: 0;
            }
            .receipt {
              width: 76mm;
              padding: 2mm 3mm 10mm 3mm;
              box-sizing: border-box;
              margin: 0 auto;
            }
            .center { text-align: center; }
            .title { font-weight: 700; text-transform: uppercase; font-size: 15px; }
            .sub { font-size: 11px; color: #333; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .meta { font-size: 11px; }
            .meta-row, .summary-row { display: flex; justify-content: space-between; gap: 10px; }
            .summary-row { margin-top: 4px; }
            .item-row { font-size: 11px; margin: 6px 0; }
            .item-name { font-weight: 700; }
            .item-meta { display: flex; justify-content: space-between; padding-left: 8px; }
            .total { font-weight: 700; font-size: 13px; }
            .footer { font-size: 11px; text-align: center; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="center">
              <div class="title">${escapeHtml(storeName)}</div>
            </div>

            <div class="divider"></div>

            <div class="meta">
              <div class="meta-row"><span>No. Nota:</span><span>${escapeHtml(data.invoice_number)}</span></div>
              <div class="meta-row"><span>Tanggal:</span><span>${escapeHtml(dateFormatted)}</span></div>
              <div class="meta-row"><span>Kasir:</span><span>${escapeHtml(cashier)}</span></div>
              <div class="meta-row"><span>Pelanggan:</span><span>${escapeHtml(customer)}</span></div>
            </div>

            <div class="divider"></div>

            <div>${itemMarkup}</div>

            <div class="divider"></div>

            <div class="meta">
              <div class="summary-row"><span>Subtotal</span><span>Rp ${data.subtotal.toLocaleString('id-ID')}</span></div>
              ${data.discount_amount > 0 ? `<div class="summary-row"><span>Diskon</span><span>-Rp ${data.discount_amount.toLocaleString('id-ID')}</span></div>` : ''}
              ${data.tax_amount > 0 ? `<div class="summary-row"><span>PPN (11%)</span><span>Rp ${data.tax_amount.toLocaleString('id-ID')}</span></div>` : ''}
              <div class="summary-row total"><span>TOTAL</span><span>Rp ${data.total.toLocaleString('id-ID')}</span></div>
              <div class="summary-row"><span>Bayar (${escapeHtml(data.payment_method)})</span><span>Rp ${amountPaid.toLocaleString('id-ID')}</span></div>
              <div class="summary-row"><span>Kembali</span><span>Rp ${change.toLocaleString('id-ID')}</span></div>
            </div>

            <div class="divider"></div>

            <div class="footer">
              <div><strong>*** TERIMA KASIH ***</strong></div>
              <div>Barang yang sudah dibeli</div>
              <div>tidak dapat ditukar / dikembalikan</div>
              <div>=== Layanan Konsumen: pos@retaillet.com ===</div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 800);
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Container - hide scrollbar */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn my-auto">
        {/* Modal Actions Header (Hidden in Print) */}
        <div className="print:hidden p-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-sm">Preview Struk Epson TM-T82X (80mm)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons Top */}
        <div className="print:hidden p-3 bg-gray-50 flex gap-2 border-b border-gray-100">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4" /> Cetak ke Epson TM-T82X
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

        {/* Receipt Paper Area */}
        <div className="p-6 bg-gray-100 flex justify-center max-h-[70vh] overflow-y-auto print:p-0 print:m-0 print:max-h-none print:overflow-visible">
          <div
            id="epson-thermal-receipt"
            ref={receiptRef}
            className="bg-white p-4 shadow-md w-[80mm] max-w-full text-black font-mono text-[12px] leading-tight select-none border border-dashed border-gray-300 print:border-none print:shadow-none print:w-[80mm] print:p-0 print:m-0"
          >
            {/* Header Struk */}
            <div className="text-center mb-3">
              <div className="font-bold text-[15px] uppercase tracking-wider">{storeName}</div>
            </div>

            {/* Divider */}
            <div className="border-b border-black border-dashed my-2" />

            {/* Meta Transaksi */}
            <div className="text-[11px] space-y-0.5 mb-2">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold">{data.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{dateFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{cashier}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="truncate max-w-[150px]">{customer}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-black border-dashed my-2" />

            {/* List Barang */}
            <div className="space-y-1.5 my-2">
              {receiptItems.map((item, idx) => (
                <div key={`${item.product_name}-${item.unit_price}-${idx}`} className="text-[11px]">
                  <div className="font-semibold text-gray-900">{item.product_name}</div>
                  <div className="flex justify-between text-gray-800 pl-2">
                    <span>
                      {item.quantity} x {item.unit_price.toLocaleString('id-ID')}
                    </span>
                    <span className="font-medium">{item.line_total.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-b border-black border-dashed my-2" />

            {/* Totalan */}
            <div className="text-[11px] space-y-1 mb-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp {data.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {data.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span>-Rp {data.discount_amount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {data.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span>PPN (11%)</span>
                  <span>Rp {data.tax_amount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[13px] pt-1 border-t border-black border-dotted">
                <span>TOTAL</span>
                <span>Rp {data.total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px]">
                <span className="uppercase">Bayar ({data.payment_method})</span>
                <span>Rp {amountPaid.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Kembali</span>
                <span>Rp {change.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-black border-dashed my-2" />

            {/* Footer Ucapan Terima Kasih */}
            <div className="text-center text-[11px] space-y-1 my-3 text-gray-800">
              <div className="font-bold">*** TERIMA KASIH ***</div>
              <div>Barang yang sudah dibeli</div>
              <div>tidak dapat ditukar / dikembalikan</div>
              <div className="text-[10px] text-gray-600 mt-2">
                === Layanan Konsumen: pos@retaillet.com ===
              </div>
            </div>

            {/* Padding bawah untuk paper feed cutter printer thermal */}
            <div className="h-6 print:h-12" />
          </div>
        </div>

        {/* Modal Bottom note */}
        <div className="print:hidden p-3 bg-white border-t border-gray-100 text-center text-xs text-gray-500">
          💡 Tips: Pilih Printer <strong>Epson TM-T82X</strong> atau <strong>Thermal Receipt (80mm)</strong>, atur Margins ke <strong>None</strong>.
        </div>
      </div>
    </div>
  );
}
