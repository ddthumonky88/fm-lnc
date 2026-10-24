'use client';

import React from 'react';
import { Trophy, Shield, Flag, MapPin, Award } from 'lucide-react';

export interface EntityIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 1. StadiumIcon: An oval arena / football stadium with bowl & pitch
 */
export function StadiumIcon({ size = 18, className = '', style }: EntityIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', ...style }}
    >
      <ellipse cx="12" cy="10.5" rx="9.5" ry="5.5" />
      <ellipse cx="12" cy="10.5" rx="5" ry="2.5" />
      <path d="M2.5 10.5v3.5c0 3 4.25 5.5 9.5 5.5s9.5-2.5 9.5-5.5v-3.5" />
    </svg>
  );
}

/**
 * 2. CompIcon: Trophy cup for competitions
 */
export function CompIcon({ size = 18, className = '', style }: EntityIconProps) {
  return (
    <Trophy
      size={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', ...style }}
    />
  );
}

/**
 * 3. ClubIcon: Football club shield emblem
 */
export function ClubIcon({ size = 18, className = '', style }: EntityIconProps) {
  return (
    <Shield
      size={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', ...style }}
    />
  );
}

/**
 * 4. NationIcon: Country flag
 */
export function NationIcon({ size = 18, className = '', style }: EntityIconProps) {
  return (
    <Flag
      size={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', ...style }}
    />
  );
}

/**
 * 5. CityIcon: Location map pin
 */
export function CityIcon({ size = 18, className = '', style }: EntityIconProps) {
  return (
    <MapPin
      size={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', ...style }}
    />
  );
}

/**
 * 6. AwardIcon: Rosette ribbon medal for national & competition awards
 */
export function AwardIcon({ size = 18, className = '', style }: EntityIconProps) {
  return (
    <Award
      size={size}
      className={`inline-block shrink-0 ${className}`}
      style={{ verticalAlign: 'middle', ...style }}
    />
  );
}
