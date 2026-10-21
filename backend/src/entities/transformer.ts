import { ValueTransformer } from 'typeorm';

export const BigIntTransformer: ValueTransformer = {
  to: (value: number | string | null | undefined) => value,
  from: (value: string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? (value as any) : num;
  },
};
