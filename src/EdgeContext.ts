export class Point {
  constructor(public x: number, public y: number) {}
}

export class HalfEdge {
  constructor(
    public origin: Point,
    public next: HalfEdge | null = null,
    public twin: HalfEdge | null = null,
    public fixed: boolean = false,
  ) {}
}

export class EdgeContext {
  private edges: HalfEdge[] = [];

  constructor(public readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError("EdgeContext: capacity must be positive integer");
    }
  }

  create(
    x: number,
    y: number,
    next?: HalfEdge | null,
    twin?: HalfEdge | null,
    fixed?: boolean,
  ): HalfEdge {
    const edge = new HalfEdge(
      new Point(x, y),
      next ?? null,
      twin ?? null,
      fixed ?? false,
    );
    this.edges.push(edge);
    return edge;
  }

  destroy(edge: HalfEdge): void {
    const index = this.edges.indexOf(edge);
    if (index !== -1) {
      this.edges.splice(index, 1);
    }
  }

  reset(): void {
    this.edges = [];
  }

  any(): HalfEdge {
    if (this.edges.length === 0) {
      throw new RangeError("EdgeContext: empty");
    }
    return this.edges[0]!;
  }

  iterator(): Iterable<HalfEdge> {
    return this.edges;
  }

  count(): number {
    return this.edges.length;
  }

  countUsed(): number {
    return this.edges.length;
  }

  setOrigin(edge: HalfEdge, x: number, y: number): void {
    edge.origin.x = x;
    edge.origin.y = y;
  }

  getCapacity(): number {
    return this.capacity;
  }

  isInUse(edge: HalfEdge): boolean {
    return this.edges.includes(edge);
  }
}
