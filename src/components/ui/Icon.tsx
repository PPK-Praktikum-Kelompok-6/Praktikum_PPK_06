import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ColorValue, StyleProp, TextStyle } from 'react-native';

import { Colors } from '@/constants/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
}

export function Icon({
  name,
  size = 20,
  color = Colors.text,
  style,
}: IconProps) {
  return <Ionicons name={name} size={size} color={color as string} style={style} />;
}
