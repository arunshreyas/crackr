'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthenticatedUser } from '@/lib/server/auth';
import { RevisionStatus } from '@prisma/client';
import {
  markConceptReviewed,
  getRevisionItemDetail,
  getRevisionDashboardData,
} from '@/lib/server/revision/service';
import { getUserRevisionQueue, GetRevisionQueueFilters } from '@/lib/server/revision/queue';
import { RevisionItem, RevisionDashboardPayload } from '@/lib/server/revision/types';
import { toServerActionError } from '@/lib/server/db/resilience';

export type RevisionActionResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
};

export async function markConceptReviewedAction(params: {
  conceptKey: string;
  status: RevisionStatus;
  notes?: string | null;
  feedback?: string | null;
}): Promise<
  RevisionActionResponse<{
    id: string;
    conceptKey: string;
    status: RevisionStatus;
    reviewCount: number;
    lastReviewedAt: string | null;
    nextReviewDue: string | null;
    notes: string | null;
    lastFeedback: string | null;
  }>
> {
  const { profile } = await requireAuthenticatedUser();

  try {
    const result = await markConceptReviewed({
      userId: profile.id,
      conceptKey: params.conceptKey,
      status: params.status,
      notes: params.notes,
      feedback: params.feedback,
    });

    revalidatePath('/revision');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        id: result.id,
        conceptKey: result.conceptKey,
        status: result.status,
        reviewCount: result.reviewCount,
        lastReviewedAt: result.lastReviewedAt?.toISOString() || null,
        nextReviewDue: result.nextReviewDue?.toISOString() || null,
        notes: result.notes,
        lastFeedback: result.lastFeedback,
      },
    };
  } catch (err) {
    return toServerActionError(err, 'Failed to record concept review');
  }
}

export async function getRevisionItemDetailAction(
  conceptKey: string
): Promise<RevisionActionResponse<Awaited<ReturnType<typeof getRevisionItemDetail>>>> {
  try {
    const { profile } = await requireAuthenticatedUser();
    const detail = await getRevisionItemDetail(profile.id, conceptKey);
    return {
      success: true,
      data: detail,
    };
  } catch (err) {
    return toServerActionError(err, 'Failed to load concept revision details');
  }
}

export async function getRevisionQueueAction(
  filters?: GetRevisionQueueFilters
): Promise<RevisionActionResponse<RevisionItem[]>> {
  try {
    const { profile } = await requireAuthenticatedUser();
    const queue = await getUserRevisionQueue(profile.id, filters);
    return {
      success: true,
      data: queue,
    };
  } catch (err) {
    return toServerActionError(err, 'Failed to load revision queue');
  }
}

export async function refreshRevisionDashboardAction(): Promise<
  RevisionActionResponse<RevisionDashboardPayload>
> {
  try {
    const { profile } = await requireAuthenticatedUser();
    const data = await getRevisionDashboardData(profile.id);
    return {
      success: true,
      data,
    };
  } catch (err) {
    return toServerActionError(err, 'Failed to refresh revision dashboard');
  }
}
