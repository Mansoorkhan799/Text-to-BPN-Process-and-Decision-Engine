import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  // Skip MongoDB connection during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('MongoDB connection skipped during build phase');
  }

  try {
    // Runtime check for MongoDB URI
    if (!process.env.MONGODB_URI) {
      // During build, this is expected - don't throw, just return a mock
      if (process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ MONGODB_URI not set - this is expected during build');
      }
      throw new Error('Please define the MONGODB_URI environment variable');
    }

    const uri = process.env.MONGODB_URI;
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Add connection pooling options
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      // Enable connection monitoring
      monitorCommands: false,
    };
    
    // If we have a cached connection, use it
    if (cachedClient && cachedDb) {
      // Test if the connection is still alive
      try {
        await cachedClient.db('admin').command({ ping: 1 });
        return { client: cachedClient, db: cachedDb };
      } catch {
        // Connection is dead, clear cache and reconnect
        cachedClient = null;
        cachedDb = null;
      }
    }

    // Create new connection if none exists
    const client = await MongoClient.connect(uri, options);
    const db = client.db('nextauth');
    
    // Cache the connection
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    // Don't log errors during build phase
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      console.error('Failed to connect to MongoDB:', error);
    }
    throw error;
  }
}

export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

// Graceful shutdown - only register in non-build environments
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  process.on('SIGINT', async () => {
    await closeConnection();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await closeConnection();
    process.exit(0);
  });
}
