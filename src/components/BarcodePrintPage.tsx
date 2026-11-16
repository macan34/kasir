import { useState, useEffect, useRef } from 'react';
import { Printer, Search, Loader2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { api } from '@/lib/api';
import type { Product } from '@/types';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

function ProductBarcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        displayValue: false,
        height: 40,
        margin: 0,
        width: 1.5,
      });
    }
  }, [value]);

  return <svg ref={svgRef} className="max-w-full h-10" aria-label={`Barcode ${value}`} />;
}

export default function BarcodePrintPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState('');
  const [printError, setPrintError] = useState('');

  useEffect(() => {
    api.products.getAll()
      .then(data => {
        const loadedProducts = data || [];
        setProducts(loadedProducts);
        setSelectedProducts(Object.fromEntries(
          loadedProducts.map((product: Product) => [String(product.id), 1])
        ));
      })
      .catch(error => {
        console.error('Error fetching products for barcode printing:', error);
        setLoadError(error instanceof Error ? error.message : 'Gagal memuat daftar produk.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p => {
    const query = search.toLowerCase();
    return p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query);
  });

  const toggleSelect = (id: string | number) => {
    setSelectedProducts(prev => {
      const copy = { ...prev };
      const key = String(id);
      if (copy[key]) {
        delete copy[key];
      } else {
        copy[key] = 1;
      }
      return copy;
    });
  };

  const handlePrint = () => {
    setPrintError('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setPrintError('Izinkan pop-up di browser untuk mencetak label.');
      return;
    }

    try {
      const labels = labelList.map(({ product }) => {
        const value = product.barcode?.trim() || product.sku;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        JsBarcode(svg, value, {
          format: 'CODE128',
          displayValue: false,
          height: 40,
          margin: 0,
          width: 1.5,
        });

        return `
          <article class="label">
            <div class="name">${escapeHtml(product.name)}</div>
            <div class="price">Rp ${product.price.toLocaleString('id-ID')}</div>
            ${svg.outerHTML}
            <div class="code">${escapeHtml(value)}</div>
          </article>
        `;
      }).join('');

      printWindow.onafterprint = () => printWindow.close();
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
        <html lang="id">
          <head>
            <meta charset="utf-8">
            <title>Cetak Label Produk</title>
            <style>
              @page { size: A4 portrait; margin: 8mm; }
              * { box-sizing: border-box; }
              body { margin: 0; color: #111; font-family: Arial, sans-serif; }
              .labels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2mm; }
              .label {
                height: 35mm;
                min-width: 0;
                padding: 2mm;
                border: 0.25mm solid #333;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                text-align: center;
                break-inside: avoid;
                page-break-inside: avoid;
              }
              .name {
                max-width: 100%;
                max-height: 2.3em;
                overflow: hidden;
                font-size: 9pt;
                font-weight: 700;
                line-height: 1.15;
                overflow-wrap: anywhere;
              }
              .price { font-size: 8pt; font-weight: 700; }
              .label svg { display: block; width: 100%; height: 13mm; }
              .code { font-family: monospace; font-size: 7pt; overflow-wrap: anywhere; }
            </style>
          </head>
          <body><main class="labels">${labels}</main></body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 300);
    } catch (error) {
      printWindow.close();
      console.error('Error preparing product labels for printing:', error);
      setPrintError(error instanceof Error ? error.message : 'Gagal menyiapkan label untuk dicetak.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Gagal memuat produk untuk dicetak: {loadError}
      </div>
    );
  }

  // Create list of labels to render based on quantities
  const labelList: { product: Product; index: number }[] = [];
  products.forEach(p => {
    const qty = selectedProducts[String(p.id)] || 0;
    for (let i = 0; i < qty; i++) {
      labelList.push({ product: p, index: i });
    }
  });

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Cetak Barcode & Label Produk</h1>
          <p className="text-sm text-gray-500">Pilih produk dan jumlah label yang ingin dicetak</p>
        </div>
        <button
          onClick={handlePrint}
          disabled={labelList.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-orange-500/20"
        >
          <Printer className="w-4 h-4" /> Cetak Label ({labelList.length})
        </button>
      </div>
      {printError && (
        <div role="alert" className="print:hidden rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {printError}
        </div>
      )}

      {/* Select Products Area (Hidden in Print) */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">{products.length} produk tersedia</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedProducts(previous => {
                const next = { ...previous };
                products.forEach(product => {
                  const key = String(product.id);
                  if (!next[key]) next[key] = 1;
                });
                return next;
              })}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              Pilih semua
            </button>
            <button
              type="button"
              onClick={() => setSelectedProducts({})}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700"
            >
              Hapus pilihan
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
          />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
          {filtered.map(p => {
            const isSelected = !!selectedProducts[String(p.id)];
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-lg border text-sm transition-colors ${
                  isSelected ? 'border-orange-300 bg-orange-50/50' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                    className="rounded text-orange-500 focus:ring-orange-400"
                  />
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className="font-mono text-xs text-gray-400">({p.barcode?.trim() || p.sku})</span>
                </label>
                {isSelected && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Qty Label:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={selectedProducts[String(p.id)] || 1}
                      onChange={e => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setSelectedProducts(prev => ({ ...prev, [String(p.id)]: val }));
                      }}
                      className="w-14 px-2 py-1 text-center text-xs border rounded font-semibold"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Label Sheet Preview */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm print:p-0 print:border-none print:shadow-none">
        <h3 className="print:hidden text-sm font-bold text-gray-700 mb-4">Pratinjau Lembar Label Cetak:</h3>
        {labelList.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Pilih produk di atas untuk melihat label</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2">
            {labelList.map((item, idx) => (
              <div
                key={idx}
                className="border-2 border-dashed border-gray-300 p-3 rounded-lg text-center flex flex-col items-center justify-between bg-white print:border-black print:border-solid print:p-2"
              >
                <div className="text-xs font-bold text-gray-800 truncate w-full">{item.product.name}</div>
                <div className="text-[11px] font-bold text-orange-600 print:text-black my-1">
                  Rp {item.product.price.toLocaleString('id-ID')}
                </div>
                <div className="w-full flex justify-center my-1">
                  <ProductBarcode value={item.product.barcode?.trim() || item.product.sku} />
                </div>
                <div className="font-mono text-[10px] text-gray-700 tracking-wider">{item.product.barcode?.trim() || item.product.sku}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
