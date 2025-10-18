export class EdgeContext {
  readonly origins: Float32Array;
  readonly next: Int32Array;
  readonly twin: Int32Array;
  readonly fixed: Uint8Array;
  readonly inUse: Uint8Array;
  private readonly freeStack: Int32Array;
  private freeTop: number;
  private allocated = 0;
  private maxUsedIndex = -1;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("EdgeContext: capacity must be positive integer");
    }
    this.origins = new Float32Array(capacity * 2);
    this.next = new Int32Array(capacity).fill(-1);
    this.twin = new Int32Array(capacity).fill(-1);
    this.fixed = new Uint8Array(capacity).fill(0);
    this.inUse = new Uint8Array(capacity).fill(0);
    this.freeStack = new Int32Array(capacity);
    this.freeTop = capacity;
    for (let i = 0; i < capacity; i += 1) {
      this.freeStack[i] = capacity - 1 - i;
    }
  }

  create(
    x: number,
    y: number,
    next?: number,
    twin?: number,
    fixed?: boolean,
  ): number {
    if (this.freeTop === 0) {
      throw new RangeError("EdgeContext: out of memory");
    }
    const index = this.freeStack[--this.freeTop]!;
    this.inUse[index] = 1;
    this.origins[index * 2] = x;
    this.origins[index * 2 + 1] = y;
    this.next[index] = next ?? -1;
    this.twin[index] = twin ?? -1;
    this.fixed[index] = fixed ? 1 : 0;
    this.allocated += 1;
    if (index > this.maxUsedIndex) {
      this.maxUsedIndex = index;
    }
    return index;
  }

  destroy(index: number): void {
    this.inUse[index] = 0;
    this.fixed[index] = 0;
    this.next[index] = -1;
    this.twin[index] = -1;
    this.freeStack[this.freeTop++] = index;
    this.allocated -= 1;
    if (index === this.maxUsedIndex) {
      this.recomputeMaxUsedIndex();
    }
  }

  reset(): void {
    this.allocated = 0;
    this.maxUsedIndex = -1;
    for (let i = 0; i < this.capacity; i += 1) {
      this.inUse[i] = 0;
      this.fixed[i] = 0;
      this.next[i] = -1;
      this.twin[i] = -1;
      this.origins[i * 2] = 0;
      this.origins[i * 2 + 1] = 0;
      this.freeStack[i] = this.capacity - 1 - i;
    }
    this.freeTop = this.capacity;
  }

  any(): number {
    for (let i = 0; i <= this.maxUsedIndex; i += 1) {
      if (this.inUse[i]) {
        return i;
      }
    }
    throw new RangeError("EdgeContext: empty");
  }

  iterator(): Iterable<number> {
    const ctx = this;
    return {
      *[Symbol.iterator]() {
        for (let i = 0; i <= ctx.maxUsedIndex; i += 1) {
          if (ctx.inUse[i]) {
            yield i;
          }
        }
      },
    };
  }

  count(): number {
    return this.allocated;
  }

  countUsed(): number {
    return this.maxUsedIndex + 1;
  }

  setOrigin(index: number, x: number, y: number): void {
    this.origins[index * 2] = x;
    this.origins[index * 2 + 1] = y;
  }

  private recomputeMaxUsedIndex(): void {
    for (let i = this.maxUsedIndex - 1; i >= 0; i -= 1) {
      if (this.inUse[i]) {
        this.maxUsedIndex = i;
        return;
      }
    }
    this.maxUsedIndex = -1;
  }

  getCapacity(): number {
    return this.capacity;
  }

  isInUse(index: number): boolean {
    return index >= 0 && index < this.capacity && this.inUse[index] === 1;
  }
}
