import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ColorValue, Image, ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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

/**
 * Subset of free Boxicons v3.0.8 vector icons bundled locally as SVG paths
 * so Expo Go can render crisp Boxicons across iOS, Android, and Web without
 * requiring a custom icon font build.
 */
export type BoxIconName =
  | 'user-voice'
  | 'location'
  | 'buildings'
  | 'globe'
  | 'bar-chart-big'
  | 'light-bulb'
  | 'clock'
  | 'calendar';

export interface BoxIconProps {
  name: BoxIconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

const BOXICON_PATHS: Record<BoxIconName, readonly string[]> = {
  'user-voice': [
    'M4 8c0 2.28 1.72 4 4 4s4-1.72 4-4-1.72-4-4-4-4 1.72-4 4m6 0c0 1.18-.82 2-2 2s-2-.82-2-2 .82-2 2-2 2 .82 2 2m5.54 3.54c2.02-2.02 2.02-5.06 0-7.07l-1.41 1.41c1.23 1.23 1.23 3.01 0 4.24l1.41 1.41Z',
    'M21.1 8c0-2.34-.97-4.6-2.74-6.36l-1.41 1.41C18.34 4.44 19.1 6.19 19.1 8s-.76 3.56-2.15 4.95l1.41 1.41C20.12 12.6 21.1 10.34 21.1 8M3 20h10c.55 0 1-.45 1-1v-1c0-2.76-2.24-5-5-5H7c-2.76 0-5 2.24-5 5v1c0 .55.45 1 1 1m4-5h2c1.65 0 3 1.35 3 3H4c0-1.65 1.35-3 3-3',
  ],
  location: [
    'M16 10c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4m-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2',
    'M11.42 21.81c.17.12.38.19.58.19s.41-.06.58-.19c.3-.22 7.45-5.37 7.42-11.82 0-4.41-3.59-8-8-8s-8 3.59-8 8c-.03 6.44 7.12 11.6 7.42 11.82M12 4c3.31 0 6 2.69 6 6 .02 4.44-4.39 8.43-6 9.74-1.61-1.31-6.02-5.29-6-9.74 0-3.31 2.69-6 6-6',
  ],
  buildings: [
    'M21 4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v6H5c-1.1 0-2 .9-2 2v9c0 .55.45 1 1 1h16c.55 0 1-.45 1-1zM5 12h6v8H5zm14 8h-6v-8c0-1.1-.9-2-2-2H9V4h10z',
    'M11 6h2v2h-2zm4 0h2v2h-2zm0 4.03h2V12h-2zM15 14h2v2h-2zm-8 0h2v2H7z',
  ],
  globe: [
    'M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2m7.5 7.24c-1.05-.45-2.36-.77-3.76-.97-.2-1.4-.52-2.71-.97-3.76 2.19.81 3.92 2.55 4.73 4.73m-3.55 4.44c.03-.56.05-1.12.05-1.68s-.02-1.12-.05-1.68C18.62 10.79 20 11.64 20 12s-1.39 1.21-4.05 1.68M12 20c-.36 0-1.21-1.39-1.68-4.05.56.03 1.12.05 1.68.05s1.12-.02 1.68-.05C13.21 18.62 12.36 20 12 20m0-6c-.69 0-1.33-.03-1.93-.07-.05-.6-.07-1.24-.07-1.93s.03-1.33.07-1.93c.6-.05 1.24-.07 1.93-.07s1.33.03 1.93.07c.05.6.07 1.24.07 1.93s-.03 1.33-.07 1.93c-.6.05-1.24.07-1.93.07m-8-2c0-.36 1.39-1.21 4.05-1.68C8.02 10.88 8 11.44 8 12s.02 1.12.05 1.68C5.38 13.21 4 12.36 4 12m8-8c.36 0 1.21 1.39 1.68 4.05C13.12 8.02 12.56 8 12 8s-1.12.02-1.68.05C10.79 5.38 11.64 4 12 4m-2.76.5c-.45 1.05-.77 2.36-.97 3.76-1.4.2-2.71.52-3.76.97A8.04 8.04 0 0 1 9.24 4.5M4.51 14.76c1.05.45 2.36.77 3.76.97.2 1.4.52 2.71.97 3.76a8.04 8.04 0 0 1-4.73-4.73m10.26 4.73c.45-1.05.77-2.36.97-3.76 1.4-.2 2.71-.52 3.76-.97a8.04 8.04 0 0 1-4.73 4.73',
  ],
  'bar-chart-big': [
    'M21 7h-5V3c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v8H3c-.55 0-1 .45-1 1v9c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V8c0-.55-.45-1-1-1M4 13h4v7H4zm6-1V4h4v16h-4zm10 8h-4V9h4z',
  ],
  'light-bulb': [
    'M9 20h6v2H9zm-.83-4.95c.41.62.62 1.36.72 1.95H8v2h8v-2h-.89c.11-.59.31-1.33.72-1.95.36-.54.76-1.01 1.14-1.46 1-1.18 2.03-2.39 2.03-4.6 0-3.86-3.14-7-7-7s-7 3.14-7 7c0 2.21 1.03 3.42 2.02 4.58.39.45.78.92 1.15 1.47ZM12 4c2.76 0 5 2.24 5 5 0 1.47-.62 2.2-1.55 3.3-.4.47-.85 1-1.28 1.64-.68 1.03-.97 2.23-1.09 3.06h-2.17c-.12-.83-.4-2.03-1.08-3.05-.43-.65-.89-1.19-1.29-1.66C7.61 11.2 7 10.48 7 9c0-2.76 2.24-5 5-5',
  ],
  clock: [
    'M12 2C6.58 2 2 6.58 2 12s4.58 10 10 10 10-4.58 10-10S17.42 2 12 2m0 18c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8-3.66 8-8 8',
    'M13 7h-2v6h6v-2h-4z',
  ],
  calendar: [
    'M19 4h-2V2h-2v2H9V2H7v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2M5 20V8h14V6v14z',
  ],
};

/** Renders a vector icon from the bundled Boxicons v3.0.8 Free SVG set. */
export function BoxIcon({
  name,
  size = 18,
  color = Colors.text,
  style,
}: BoxIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {BOXICON_PATHS[name].map((d, index) => (
        <Path key={index} d={d} fill={color} />
      ))}
    </Svg>
  );
}
