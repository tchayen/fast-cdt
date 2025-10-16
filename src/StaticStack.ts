export class StaticStack {
  private readonly values: number[];
  private top = 0;

  constructor(public readonly capacity: number) {
    this.values = new Array(capacity);
  }

  push(value: number): void {
    this.values[this.top++] = value;
  }

  pop(): number | null {
    if (this.top === 0) {
      return null;
    }
    return this.values[--this.top] ?? null;
  }

  reset(): void {
    this.top = 0;
  }

  size(): number {
    return this.top;
  }
}
