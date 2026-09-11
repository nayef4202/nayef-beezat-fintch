/**
 * MongoDB Atlas Database Client
 * Handles connection pooling and database access on the server.
 */

let clientPromise: Promise<any> | null = null;

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Please ensure it is set in .env",
    );
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the MongoClient
    // instance is not recreated every time during HMR.
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<any>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const { MongoClient, ServerApiVersion } = await import("mongodb");
      const client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    if (!clientPromise) {
      const { MongoClient, ServerApiVersion } = await import("mongodb");
      const client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });
      clientPromise = client.connect();
    }
  }

  return clientPromise;
}

export async function getMongoDb(dbName?: string) {
  const client = await getMongoClient();
  const name = dbName || process.env.MONGODB_DB_NAME || "beezat";
  return client.db(name);
}

/**
 * Ping test to confirm Atlas cluster connection
 */
export async function testMongoDbConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const client = await getMongoClient();
    await client.db("admin").command({ ping: 1 });
    return {
      ok: true,
      message: "تم الاتصال بنجاح مع MongoDB Atlas Cluster!",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `فشل الاتصال بـ MongoDB Atlas: ${errorMsg}`,
    };
  }
}
