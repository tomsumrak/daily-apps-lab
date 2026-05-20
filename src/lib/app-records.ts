import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

export type AppRecordScope = {
  userId: string;
  appSlug: string;
};

export type AppRecordData = Prisma.InputJsonValue;

type RecordTypeFilter = {
  recordType?: string;
};

export type ListAppRecordsInput = AppRecordScope &
  RecordTypeFilter & {
    take?: number;
  };

export type GetAppRecordInput = AppRecordScope & {
  id: string;
};

export type CreateAppRecordInput = AppRecordScope & {
  recordType: string;
  data: AppRecordData;
};

export type UpdateAppRecordInput = AppRecordScope & {
  id: string;
  data: AppRecordData;
};

function clampListLimit(take = DEFAULT_LIST_LIMIT) {
  if (!Number.isFinite(take)) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(Math.max(Math.floor(take), 1), MAX_LIST_LIMIT);
}

export async function listAppRecords({
  userId,
  appSlug,
  recordType,
  take
}: ListAppRecordsInput) {
  return prisma.appRecord.findMany({
    where: {
      userId,
      appSlug,
      ...(recordType ? { recordType } : {})
    },
    orderBy: {
      updatedAt: "desc"
    },
    take: clampListLimit(take)
  });
}

export async function countAppRecords({
  userId,
  appSlug,
  recordType
}: AppRecordScope & RecordTypeFilter) {
  return prisma.appRecord.count({
    where: {
      userId,
      appSlug,
      ...(recordType ? { recordType } : {})
    }
  });
}

export async function getAppRecord({ userId, appSlug, id }: GetAppRecordInput) {
  return prisma.appRecord.findFirst({
    where: {
      id,
      userId,
      appSlug
    }
  });
}

export async function createAppRecord({
  userId,
  appSlug,
  recordType,
  data
}: CreateAppRecordInput) {
  return prisma.appRecord.create({
    data: {
      userId,
      appSlug,
      recordType,
      data
    }
  });
}

export async function updateAppRecord({
  userId,
  appSlug,
  id,
  data
}: UpdateAppRecordInput) {
  const result = await prisma.appRecord.updateMany({
    where: {
      id,
      userId,
      appSlug
    },
    data: {
      data
    }
  });

  if (result.count === 0) {
    return null;
  }

  return getAppRecord({ userId, appSlug, id });
}

export async function deleteAppRecord({
  userId,
  appSlug,
  id
}: GetAppRecordInput) {
  const result = await prisma.appRecord.deleteMany({
    where: {
      id,
      userId,
      appSlug
    }
  });

  return result.count > 0;
}
