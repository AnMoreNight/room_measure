// OpenCV.js Mats are backed by WASM heap memory and must be freed manually
// via .delete() — they're not garbage collected. MatBag just tracks every
// Mat/MatVector created during one measurement pass so a single
// bag.deleteAll() in a `finally` block can't miss one.

type Deletable = { delete: () => void };

export class MatBag {
  private items: Deletable[] = [];

  track<T extends Deletable>(item: T): T {
    this.items.push(item);
    return item;
  }

  deleteAll() {
    for (const item of this.items) item.delete();
    this.items = [];
  }
}
