import { nullthrows as nt } from "./nullthrows";

export class RingNode<T> {
  constructor(
    public value: T,
    public next: RingNode<T> | null = null,
    public prev: RingNode<T> | null = null,
  ) {}
}

export class Ring<T> {
  private firstNode: RingNode<T> | null = null;
  private lastNode: RingNode<T> | null = null;
  private size = 0;

  constructor(public readonly capacity: number) {}

  get first(): RingNode<T> | null {
    return this.firstNode;
  }

  get last(): RingNode<T> | null {
    return this.lastNode;
  }

  append(value: T): RingNode<T> {
    const node = new RingNode(value);

    if (this.size === 0) {
      node.next = node;
      node.prev = node;
      this.firstNode = node;
      this.lastNode = node;
    } else {
      const last = nt(this.lastNode);
      const first = nt(this.firstNode);
      last.next = node;
      node.prev = last;
      node.next = first;
      first.prev = node;
      this.lastNode = node;
    }

    this.size += 1;
    return node;
  }

  prepend(value: T): RingNode<T> {
    const node = new RingNode(value);

    if (this.size === 0) {
      node.next = node;
      node.prev = node;
      this.firstNode = node;
      this.lastNode = node;
    } else {
      const first = nt(this.firstNode);
      const last = nt(this.lastNode);
      first.prev = node;
      node.next = first;
      node.prev = last;
      last.next = node;
      this.firstNode = node;
    }

    this.size += 1;
    return node;
  }

  insertAfter(node: RingNode<T>, value: T): RingNode<T> {
    const newNode = new RingNode(value);

    const nextNode = nt(node.next);
    node.next = newNode;
    newNode.prev = node;
    newNode.next = nextNode;
    nextNode.prev = newNode;

    if (node === this.lastNode) {
      this.lastNode = newNode;
    }

    this.size += 1;
    return newNode;
  }

  remove(node: RingNode<T>): void {
    if (this.size === 1) {
      this.firstNode = null;
      this.lastNode = null;
      this.size = 0;
      return;
    }

    const prev = nt(node.prev);
    const next = nt(node.next);

    prev.next = next;
    next.prev = prev;

    if (node === this.firstNode) {
      this.firstNode = next;
    }
    if (node === this.lastNode) {
      this.lastNode = prev;
    }

    this.size -= 1;
  }

  pop(): T | null {
    if (this.size === 0) {
      return null;
    }
    const value = nt(this.lastNode).value;
    this.remove(nt(this.lastNode));
    return value;
  }

  popFirst(): T | null {
    if (this.size === 0) {
      return null;
    }
    const value = nt(this.firstNode).value;
    this.remove(nt(this.firstNode));
    return value;
  }

  length(): number {
    return this.size;
  }

  valueOf(node: RingNode<T>): T {
    return node.value;
  }

  nextOf(node: RingNode<T>): RingNode<T> {
    return nt(node.next);
  }

  prevOf(node: RingNode<T>): RingNode<T> {
    return nt(node.prev);
  }

  reset(): void {
    this.size = 0;
    this.firstNode = null;
    this.lastNode = null;
  }
}
