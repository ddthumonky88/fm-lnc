import { ValueTransformer } from 'typeorm';

export const StringTransformer: ValueTransformer = {
  to: (value: any) => (value !== null && value !== undefined ? String(value) : null),
  from: (value: any): string | null => (value !== null && value !== undefined ? String(value) : null),
};

export const BigIntTransformer = StringTransformer;
