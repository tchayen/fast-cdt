import { nullthrows as nt } from "./nullthrows";

export class Ring {
  private readonly values: number[];
  private readonly next: number[];
  private readonly prev: number[];
  private allocated = 0;

  private firstIndex = -1;
  private lastIndex = -1;
  size = 0;

  constructor(public readonly capacity: number) {
    this.values = new Array(capacity);
    this.next = new Array(capacity);
    this.prev = new Array(capacity);
  }

  private allocNode(): number {
    return this.allocated++;
  }

  get first(): number {
    return this.firstIndex;
  }

  get last(): number {
    return this.lastIndex;
  }

  append(value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    if (this.size === 0) {
      this.next[index] = index;
      this.prev[index] = index;
      this.firstIndex = index;
      this.lastIndex = index;
    } else {
      const last = this.lastIndex;
      const first = this.firstIndex;
      this.next[last] = index;
      this.prev[index] = last;
      this.next[index] = first;
      this.prev[first] = index;
      this.lastIndex = index;
    }

    this.size += 1;
    return index;
  }

  prepend(value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    if (this.size === 0) {
      this.next[index] = index;
      this.prev[index] = index;
      this.firstIndex = index;
      this.lastIndex = index;
    } else {
      const first = this.firstIndex;
      const last = this.lastIndex;
      this.prev[first] = index;
      this.next[index] = first;
      this.prev[index] = last;
      this.next[last] = index;
      this.firstIndex = index;
    }

    this.size += 1;
    return index;
  }

  insertAfter(nodeIndex: number, value: number): number {
    const index = this.allocNode();
    this.values[index] = value;

    const nextIndex = nt(this.next[nodeIndex]);
    this.next[nodeIndex] = index;
    this.prev[index] = nodeIndex;
    this.next[index] = nextIndex;
    this.prev[nextIndex] = index;

    if (nodeIndex === this.lastIndex) {
      this.lastIndex = index;
    }

    this.size += 1;
    return index;
  }

  remove(nodeIndex: number): void {
    if (this.size === 1) {
      this.firstIndex = -1;
      this.lastIndex = -1;
      this.size = 0;
      return;
    }

    const prevIndex = nt(this.prev[nodeIndex]);
    const nextIndex = nt(this.next[nodeIndex]);

    this.next[prevIndex] = nextIndex;
    this.prev[nextIndex] = prevIndex;

    if (nodeIndex === this.firstIndex) {
      this.firstIndex = nextIndex;
    }
    if (nodeIndex === this.lastIndex) {
      this.lastIndex = prevIndex;
    }

    this.size -= 1;
  }

  pop(): number | null {
    if (this.size === 0) {
      return null;
    }
    const value = this.values[this.lastIndex];
    this.remove(this.lastIndex);
    return value ?? null;
  }

  popFirst(): number | null {
    if (this.size === 0) {
      return null;
    }
    const value = this.values[this.firstIndex];
    this.remove(this.firstIndex);
    return value ?? null;
  }

  length(): number {
    return this.size;
  }

  valueOf(index: number): number {
    return this.values[index]!;
  }

  nextOf(index: number): number {
    return this.next[index]!;
  }

  prevOf(index: number): number {
    return this.prev[index]!;
  }

  reset(): void {
    this.size = 0;
    this.firstIndex = -1;
    this.lastIndex = -1;
    this.allocated = 0;
  }
}
