import * as crypto from 'crypto';
import { RawQuestion } from '../types';
import { normalizeForHash } from '../normalize/text';

/**
 * Generates a deterministic SHA-256 content hash for a question and its 4 options.
 */
export function computeContentHash(raw: RawQuestion): string {
  const normText = normalizeForHash(raw.question || '');

  const normOptions = (raw.options || [])
    .map((opt) => normalizeForHash(opt.content || ''))
    .join('|');

  const payload = `${normText}|${normOptions}`;

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export class DeduplicationRegistry {
  private seenHashes = new Set<string>();
  private seenExternalIds = new Set<string>();

  public isDuplicate(externalId: string, contentHash: string): boolean {
    if (this.seenExternalIds.has(externalId) || this.seenHashes.has(contentHash)) {
      return true;
    }
    this.seenExternalIds.add(externalId);
    this.seenHashes.add(contentHash);
    return false;
  }

  public register(externalId: string, contentHash: string): void {
    this.seenExternalIds.add(externalId);
    this.seenHashes.add(contentHash);
  }

  public size(): number {
    return this.seenHashes.size;
  }
}
