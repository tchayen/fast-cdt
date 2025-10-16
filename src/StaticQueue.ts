export class StaticQueue {
  private readonly values: number[];
  private begin = 0;
  private end = 0;

  constructor(public readonly capacity: number) {
    this.values = new Array(capacity);
  }

  push(value: number): void {
    this.values[this.end++] = value;
  }

  pop(): number | null {
    if (this.begin === this.end) {
      return null;
    }
    return this.values[this.begin++] ?? null;
  }

  size(): number {
    return this.end - this.begin;
  }

  reset(): void {
    this.begin = 0;
    this.end = 0;
  }
}
