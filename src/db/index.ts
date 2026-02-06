import { sql } from '@vercel/postgres';

export { sql };

// Helper to convert snake_case DB results to camelCase
export function toCamelCase<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

export function toCamelCaseArray<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map((item) => toCamelCase<T>(item));
}
