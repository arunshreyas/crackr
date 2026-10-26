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

export async function markConceptReviewedAction(params: {
  conceptKey: string;
  status: RevisionStatus;
  notes?: string | null;
  feedback?: string | null;
}) {
  const { profile } = await requireAuthenticatedUser();

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
}

export async function getRevisionItemDetailAction(conceptKey: string) {
  const { profile } = await requireAuthenticatedUser();

  const detail = await getRevisionItemDetail(profile.id, conceptKey);
  return {
    success: true,
    data: detail,
  };
}

export async function getRevisionQueueAction(filters?: GetRevisionQueueFilters) {
  const { profile } = await requireAuthenticatedUser();

  const queue = await getUserRevisionQueue(profile.id, filters);
  return {
    success: true,
    data: queue,
  };
}

export async function refreshRevisionDashboardAction() {
  const { profile } = await requireAuthenticatedUser();

  const data = await getRevisionDashboardData(profile.id);
  return {
    success: true,
    data,
  };
}
