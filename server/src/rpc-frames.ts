type RecordValue = Record<string, any>;

/** Decode OMP v2 logical frames without accepting interleaved or unbounded chunks. */
export class RpcFrameDecoder {
  reset() {
    this.pending = null;
  }
  private pending: {
    id: string;
    count: number;
    size: number;
    index: number;
    bytes: number;
    parts: Buffer[];
  } | null = null;
  private limit: number;
  constructor(limit = 64 * 1024 * 1024) {
    this.limit = limit;
  }

  accept(record: RecordValue): RecordValue | null {
    try {
      if (
        !record ||
        Array.isArray(record) ||
        typeof record !== "object" ||
        typeof record.type !== "string"
      ) {
        throw new Error("OMP sent an invalid logical frame");
      }
      if (record.type !== "rpc_chunk") {
        if (this.pending) throw new Error("OMP interrupted a chunked frame");
        return record;
      }
      const { chunkId, count, byteLength, index, data } = record;
      if (
        typeof chunkId !== "string" ||
        !chunkId ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 65536 ||
        !Number.isInteger(byteLength) ||
        byteLength < 1 ||
        byteLength > this.limit ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= count ||
        typeof data !== "string" ||
        !data.length ||
        data.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(data)
      ) {
        throw new Error("OMP sent invalid chunk metadata");
      }
      const bytes = Buffer.from(data, "base64");
      if (bytes.toString("base64") !== data)
        throw new Error("OMP sent invalid chunk encoding");
      if (!this.pending) {
        if (index !== 0)
          throw new Error("OMP chunk sequence did not start at zero");
        this.pending = {
          id: chunkId,
          count,
          size: byteLength,
          index: 0,
          bytes: 0,
          parts: [],
        };
      }
      const current = this.pending;
      if (
        chunkId !== current.id ||
        count !== current.count ||
        byteLength !== current.size ||
        index !== current.index
      ) {
        throw new Error("OMP chunk sequence changed or arrived out of order");
      }
      current.bytes += bytes.length;
      if (current.bytes > current.size)
        throw new Error("OMP chunk sequence exceeded its declared size");
      current.parts.push(bytes);
      current.index++;
      if (current.index < current.count) return null;
      if (current.bytes !== current.size)
        throw new Error("OMP chunk sequence has an incorrect byte length");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(current.parts, current.size),
      );
      const result = JSON.parse(text);
      if (
        !result ||
        Array.isArray(result) ||
        typeof result.type !== "string" ||
        result.type === "rpc_chunk"
      ) {
        throw new Error("OMP reassembled an invalid logical frame");
      }
      this.pending = null;
      return result;
    } catch (error) {
      this.pending = null;
      throw error;
    }
  }
}
