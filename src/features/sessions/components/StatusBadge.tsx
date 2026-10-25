import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

import { Badge, BadgeSize, BadgeVariant } from '@/components/ui/Badge';
import { StatusLabel } from '@/constants/theme';
import { SessionStatus } from '@/types/attendance';

export interface StatusBadgeProps {
  status: SessionStatus;
  attended?: boolean;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
}

export function StatusBadge({
  status,
  attended = false,
  size = 'md',
  style,
}: StatusBadgeProps) {
  if (attended) {
    return (
      <Badge
        label={StatusLabel.attended}
        variant="attended"
        size={size}
        showDot
        style={style}
      />
    );
  }

  let label: string = StatusLabel.waiting;
  let variant: BadgeVariant = 'waiting';
  let showDot = true;

  switch (status) {
    case 'OPEN':
      label = StatusLabel.open;
      variant = 'open';
      showDot = true;
      break;
    case 'CLOSED':
      label = StatusLabel.closed;
      variant = 'closed';
      showDot = false;
      break;
    case 'NOT_STARTED':
    default:
      label = StatusLabel.waiting;
      variant = 'waiting';
      showDot = true;
      break;
  }

  return (
    <Badge
      label={label}
      variant={variant}
      size={size}
      showDot={showDot}
      style={style}
    />
  );
}
