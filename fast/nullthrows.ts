export function nullthrows<T>(
  value: T | null | undefined,
  message?: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(message ?? "Unexpected null or undefined value");
  }
  return value;
}
