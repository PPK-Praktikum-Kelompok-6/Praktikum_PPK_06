export interface CreateSnapParams {
  orderId: string;
  grossAmount: number;
  itemName: string;
  studentName: string;
  studentNim: string;
  studentEmail?: string;
}

export interface SnapTransactionResponse {
  token: string;
  redirect_url: string;
}

/**
 * Memanggil Midtrans Snap API Sandbox (`POST /snap/v1/transactions`)
 * menggunakan `process.env.MIDTRANS_SERVER_KEY` (tidak pernah terekspos ke client).
 */
export async function createMidtransSnapTransaction(
  params: CreateSnapParams
): Promise<SnapTransactionResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi di backend/.env');
  }

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

  const payload = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: Math.round(params.grossAmount),
    },
    item_details: [
      {
        id: params.orderId,
        price: Math.round(params.grossAmount),
        quantity: 1,
        name: params.itemName.slice(0, 50),
      },
    ],
    customer_details: {
      first_name: params.studentName,
      email: params.studentEmail || `${params.studentNim}@student.ac.id`,
    },
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as Partial<SnapTransactionResponse> & {
    error_messages?: string[];
  };

  if (!response.ok || !data.token || !data.redirect_url) {
    const errMsg =
      data.error_messages?.join(', ') ||
      `Midtrans Snap API error (${response.status})`;
    throw new Error(errMsg);
  }

  return {
    token: data.token,
    redirect_url: data.redirect_url,
  };
}

export interface MidtransStatusResponse {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

/**
 * Mengambil status transaksi langsung dari Midtrans Core API (`/v2/{order_id}/status`)
 * sebagai backup verifikasi server-to-server apabila webhook tertunda.
 */
export async function getMidtransTransactionStatus(
  orderId: string
): Promise<MidtransStatusResponse> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi di backend/.env');
  }

  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? `https://api.midtrans.com/v2/${encodeURIComponent(orderId)}/status`
    : `https://api.sandbox.midtrans.com/v2/${encodeURIComponent(orderId)}/status`;

  const authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`;

  const response = await fetch(baseUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: authHeader,
    },
  });

  const data = (await response.json()) as Partial<MidtransStatusResponse> & {
    status_message?: string;
  };

  if (!response.ok || !data.order_id || !data.transaction_status) {
    throw new Error(
      data.status_message || `Midtrans Status API error (${response.status})`
    );
  }

  return {
    order_id: data.order_id,
    status_code: String(data.status_code || '200'),
    gross_amount: String(data.gross_amount || '0.00'),
    signature_key: data.signature_key,
    transaction_status: data.transaction_status,
    fraud_status: data.fraud_status,
    payment_type: data.payment_type,
    transaction_id: data.transaction_id,
  };
}
