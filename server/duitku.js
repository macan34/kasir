function getDuitkuConfig() {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE;
  const apiKey = process.env.DUITKU_API_KEY;
  const callbackUrl = process.env.DUITKU_CALLBACK_URL;
  const returnUrl = process.env.DUITKU_RETURN_URL;

  if (!merchantCode || !apiKey || !callbackUrl || !returnUrl) {
    throw new Error('Konfigurasi Duitku belum lengkap. Atur DUITKU_MERCHANT_CODE, DUITKU_API_KEY, DUITKU_CALLBACK_URL, dan DUITKU_RETURN_URL.');
  }

  const environment = process.env.DUITKU_ENV || 'sandbox';
  if (!['sandbox', 'production'].includes(environment)) {
    throw new Error('DUITKU_ENV harus bernilai sandbox atau production.');
  }

  return {
    merchantCode,
    apiKey,
    callbackUrl,
    returnUrl,
    baseUrl: environment === 'production'
      ? 'https://passport.duitku.com/webapi/api/merchant'
      : 'https://sandbox.duitku.com/webapi/api/merchant',
  };
}

function getDuitkuPaymentMethod(method) {
  const paymentMethods = {
    qris: process.env.DUITKU_QRIS_METHOD || 'SP',
    va: process.env.DUITKU_VA_METHOD || 'BC',
    card: process.env.DUITKU_CARD_METHOD || 'VC',
  };

  return paymentMethods[method] || null;
}

async function createDuitkuInvoice({ merchantOrderId, amount, paymentMethod, productDetails, customerName, email, phoneNumber, items }) {
  const config = getDuitkuConfig();
  const duitkuPaymentMethod = getDuitkuPaymentMethod(paymentMethod);
  if (!duitkuPaymentMethod) throw new Error('Metode pembayaran online tidak didukung.');

  const itemDetails = items.map(item => ({
    name: String(item.product_name).slice(0, 255),
    price: Number(item.unit_price),
    quantity: Number(item.quantity),
  }));
  const itemDetailsTotal = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (!Number.isSafeInteger(amount) || itemDetails.some(item =>
    !Number.isSafeInteger(item.price) || item.price < 0 ||
    !Number.isSafeInteger(item.quantity) || item.quantity < 1
  ) || itemDetailsTotal !== amount) {
    throw new Error('Total pembayaran Duitku harus sama dengan jumlah rincian item.');
  }

  const signature = require('crypto')
    .createHmac('sha256', config.apiKey)
    .update(`${config.merchantCode}${merchantOrderId}${amount}`)
    .digest('hex');

  const response = await fetch(`${config.baseUrl}/v2/inquiry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      merchantCode: config.merchantCode,
      paymentAmount: amount,
      paymentMethod: duitkuPaymentMethod,
      merchantOrderId,
      productDetails: productDetails.slice(0, 255),
      email,
      phoneNumber: phoneNumber || '',
      customerVaName: customerName.slice(0, 20) || 'Pelanggan',
      itemDetails,
      callbackUrl: config.callbackUrl,
      returnUrl: config.returnUrl,
      signature,
      expiryPeriod: 60,
    }),
  });

  const responseBody = await response.text();
  let result = null;
  try {
    result = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    // Keep a bounded plain-text response for upstream error reporting below.
  }
  if (!response.ok || !result || result.statusCode !== '00') {
    const upstreamMessage = result?.statusMessage
      || result?.responseMessage
      || result?.Message
      || result?.message
      || (!result && responseBody.trim().slice(0, 300));
    const message = upstreamMessage || `Duitku mengembalikan HTTP ${response.status}.`;
    throw new Error(`Gagal membuat pembayaran Duitku (HTTP ${response.status}): ${message}`);
  }
  if (!result.paymentUrl) {
    throw new Error('Duitku tidak mengembalikan tautan pembayaran.');
  }

  return {
    payment_url: result.paymentUrl,
    reference: result.reference || null,
    va_number: result.vaNumber || null,
    qr_string: result.qrString || null,
  };
}

module.exports = { createDuitkuInvoice, getDuitkuConfig, getDuitkuPaymentMethod };
