// In-memory FetchAdapter for tests — drives the orchestrator with no network.
// totalCountOverride lets a test simulate an incomplete collection so the §8
// count gate can be exercised.
import type { FetchAdapter, FetchPage, SourceRecord } from "../source";

export class FixtureAdapter implements FetchAdapter {
  readonly name = "fixture";

  constructor(
    private readonly records: readonly SourceRecord[],
    private readonly totalCountOverride?: number,
  ) {}

  async fetchPage(page: number, perPage: number): Promise<FetchPage> {
    const start = (page - 1) * perPage;
    return {
      totalCount: this.totalCountOverride ?? this.records.length,
      records: this.records.slice(start, start + perPage),
    };
  }
}
