import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { PaymentStatus } from '@/types/fine';

export interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

/**
 * Badge status pembayaran persisten dari webhook Midtrans:
 * `pending` | `success` | `failed` (SRS-S4-05 & SRS-S4-06).
 */
export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  switch (status) {
    case 'success':
      return <Badge label="BERHASIL" variant="open" showDot />;
    case 'pending':
      return <Badge label="MENUNGGU" variant="waiting" showDot />;
    case 'failed':
      return <Badge label="GAGAL" variant="closed" />;
  }
}
