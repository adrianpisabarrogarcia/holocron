import { clsx } from 'clsx';

export function cn(...inputs: Array<string | undefined | false | null>) {
  return clsx(inputs);
}
