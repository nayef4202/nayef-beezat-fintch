/**
 * MongoDB AI (Atlas Vector Search & Embeddings Integration)
 * Endpoint: https://ai.mongodb.com
 * Supports Voyage AI models hosted on MongoDB Atlas (e.g., voyage-finance-2, voyage-3.5, rerank-2)
 */

export interface EmbeddingOptions {
  input: string | string[];
  model?:
    | "voyage-finance-2"
    | "voyage-3.5"
    | "voyage-3.5-lite"
    | "voyage-3-large"
    | "voyage-code-3"
    | "voyage-code-4"
    | string;
  inputType?: "query" | "document";
  truncation?: boolean;
}

export interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

export interface RerankOptions {
  query: string;
  documents: string[];
  model?: "rerank-2" | "rerank-lite-1" | string;
  topK?: number;
  returnDocuments?: boolean;
}

export interface RerankResult {
  relevance_score: number;
  index: number;
  document?: string;
}

export interface RerankResponse {
  object: string;
  data: RerankResult[];
  model: string;
  usage: {
    total_tokens: number;
  };
}

export class MongoDBAIClient {
  private endpoint: string;
  private apiKey: string;

  constructor(endpoint?: string, apiKey?: string) {
    // Check client-side (import.meta.env) and server-side (process.env)
    const rawEndpoint =
      endpoint ||
      (typeof process !== "undefined" && process.env?.["MONGODB_AI_ENDPOINT"]) ||
      (typeof import.meta !== "undefined" && import.meta.env?.["VITE_MONGODB_AI_ENDPOINT"]) ||
      "https://ai.mongodb.com";

    const rawKey =
      apiKey ||
      (typeof process !== "undefined" && process.env?.["MONGODB_AI_API_KEY"]) ||
      (typeof import.meta !== "undefined" && import.meta.env?.["VITE_MONGODB_AI_API_KEY"]) ||
      "";

    this.endpoint = rawEndpoint.replace(/\/+$/, "");
    this.apiKey = rawKey;
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error(
        "MongoDB AI API key is missing. Please set MONGODB_AI_API_KEY or VITE_MONGODB_AI_API_KEY in .env",
      );
    }
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Create vector embeddings for texts using MongoDB AI / Voyage models.
   * Default model is 'voyage-finance-2' optimized for financial & investment terminology.
   */
  async createEmbeddings(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const input = Array.isArray(options.input) ? options.input : [options.input];
    const model = options.model || "voyage-finance-2";

    const body: Record<string, unknown> = {
      input,
      model,
    };

    if (options.inputType) body["input_type"] = options.inputType;
    if (typeof options.truncation === "boolean") body["truncation"] = options.truncation;

    const response = await fetch(`${this.endpoint}/v1/embeddings`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MongoDB AI embeddings request failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as EmbeddingResponse;
  }

  /**
   * Rerank a set of documents against a user query using MongoDB AI rerank models.
   */
  async rerank(options: RerankOptions): Promise<RerankResponse> {
    const model = options.model || "rerank-2";
    const body: Record<string, unknown> = {
      query: options.query,
      documents: options.documents,
      model,
    };

    if (typeof options.topK === "number") body["top_k"] = options.topK;
    if (typeof options.returnDocuments === "boolean") body["return_documents"] = options.returnDocuments;

    const response = await fetch(`${this.endpoint}/v1/rerank`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MongoDB AI rerank request failed (${response.status}): ${errorText}`);
    }

    return (await response.json()) as RerankResponse;
  }

  /**
   * Health check / connectivity test for the endpoint
   */
  async checkConnection(): Promise<{ ok: boolean; message: string; supportedModels?: string[] }> {
    try {
      // Testing with a minimal probe
      await this.createEmbeddings({
        input: "test connection",
        model: "voyage-finance-2",
      });
      return {
        ok: true,
        message: "Successfully connected to MongoDB AI (https://ai.mongodb.com)",
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        message: errorMsg,
      };
    }
  }
}

// Singleton client instance
export const mongodbAI = new MongoDBAIClient();
