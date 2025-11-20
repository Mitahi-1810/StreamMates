
import { Room, User } from '../types';

/**
 * SIMULATED MONGODB DRIVER
 * 
 * In a real production environment, this would connect to a MongoDB Atlas cluster
 * using the native Node.js driver or Mongoose.
 * 
 * Since we are running in a browser-only environment for this demo, 
 * we simulate MongoDB behavior using LocalStorage to persist data across tabs.
 */

const STORAGE_KEY = 'streammates_db_v1';

interface DatabaseSchema {
  rooms: Room[];
}

class MockCollection<T> {
  private name: keyof DatabaseSchema;
  private db: MockMongoDB;

  constructor(db: MockMongoDB, name: keyof DatabaseSchema) {
    this.db = db;
    this.name = name;
  }

  private getData(): T[] {
    return this.db.loadData()[this.name] as T[];
  }

  private saveData(data: T[]) {
    const fullDb = this.db.loadData();
    fullDb[this.name] = data as any;
    this.db.persistData(fullDb);
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    const items = this.getData();
    return items.find(item => {
      for (const key in query) {
        if ((item as any)[key] !== (query as any)[key]) return false;
      }
      return true;
    }) || null;
  }

  async insertOne(doc: T): Promise<T> {
    const items = this.getData();
    items.push(doc);
    this.saveData(items);
    return doc;
  }

  async updateOne(query: Partial<T>, update: { $set?: Partial<T>, $push?: any, $pull?: any }): Promise<boolean> {
    const items = this.getData();
    const index = items.findIndex(item => {
      for (const key in query) {
        if ((item as any)[key] !== (query as any)[key]) return false;
      }
      return true;
    });

    if (index === -1) return false;

    const item = items[index];

    // Handle $set
    if (update.$set) {
      Object.assign(item as any, update.$set);
    }

    // Handle $push (MongoDB Array Push)
    if (update.$push) {
      for (const key in update.$push) {
        if (Array.isArray((item as any)[key])) {
          (item as any)[key].push(update.$push[key]);
        }
      }
    }

    // Handle $pull (MongoDB Array Remove)
    if (update.$pull) {
        for (const key in update.$pull) {
            if (Array.isArray((item as any)[key])) {
                const condition = update.$pull[key];
                // Simple check: if condition has id, filter by id
                if (condition.id) {
                    (item as any)[key] = (item as any)[key].filter((el: any) => el.id !== condition.id);
                }
            }
        }
    }

    items[index] = item;
    this.saveData(items);
    return true;
  }
}

class MockMongoDB {
  constructor() {
    // Initialize DB if empty
    if (!localStorage.getItem(STORAGE_KEY)) {
      this.persistData({ rooms: [] });
    }
  }

  loadData(): DatabaseSchema {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"rooms": []}');
    } catch (e) {
      return { rooms: [] };
    }
  }

  persistData(data: DatabaseSchema) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  collection(name: 'rooms'): MockCollection<Room> {
    return new MockCollection<Room>(this, name);
  }
}

export const mongoDb = new MockMongoDB();
