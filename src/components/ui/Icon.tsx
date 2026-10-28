import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ColorValue, Image, ImageStyle, StyleProp, TextStyle } from 'react-native';

import { Colors, HandGestureIcons, HandGestureName } from '@/constants/theme';

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

export interface GestureIconProps {
  name: HandGestureName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ImageStyle>;
}

export function GestureIcon({
  name,
  size = 24,
  color = Colors.text,
  style,
}: GestureIconProps) {
  return (
    <Image
      source={HandGestureIcons[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
    />
  );
}
