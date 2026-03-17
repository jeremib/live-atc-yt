import { streams, type Stream, type InsertStream, users, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  // Stream management
  getStreams(): Promise<Stream[]>;
  getStream(id: number): Promise<Stream | undefined>;
  createStream(stream: InsertStream): Promise<Stream>;
  updateStream(id: number, data: Partial<Stream>): Promise<Stream | undefined>;
  deleteStream(id: number): Promise<boolean>;
  
  // User management (keeping for compatibility)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private streams: Map<number, Stream>;
  userCurrentId: number;
  streamCurrentId: number;

  constructor() {
    this.users = new Map();
    this.streams = new Map();
    this.userCurrentId = 1;
    this.streamCurrentId = 1;
  }

  // Stream methods
  async getStreams(): Promise<Stream[]> {
    return Array.from(this.streams.values());
  }

  async getStream(id: number): Promise<Stream | undefined> {
    return this.streams.get(id);
  }

  async createStream(insertStream: InsertStream): Promise<Stream> {
    const id = this.streamCurrentId++;
    const now = new Date().toISOString();
    
    // Construct the stream with properly typed fields
    const stream: Stream = {
      id,
      name: insertStream.name,
      url: insertStream.url,
      fileName: insertStream.fileName || null, 
      type: insertStream.type || "liveatc",
      status: "disconnected",
      isPlaying: false,
      createdAt: now,
    };
    
    this.streams.set(id, stream);
    return stream;
  }

  async updateStream(id: number, data: Partial<Stream>): Promise<Stream | undefined> {
    const stream = this.streams.get(id);
    
    if (!stream) {
      return undefined;
    }
    
    const updatedStream = { ...stream, ...data };
    this.streams.set(id, updatedStream);
    
    return updatedStream;
  }

  async deleteStream(id: number): Promise<boolean> {
    return this.streams.delete(id);
  }

  // User methods (keeping for compatibility)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
