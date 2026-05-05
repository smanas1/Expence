import mongoose from "mongoose";

import { RecordModel } from "../models/Record.js";
import { TransactionModel } from "../models/Transaction.js";

const importedRecordPalette = ["#0f766e", "#1d4ed8", "#9333ea", "#c2410c", "#be123c", "#15803d"];

function titleCaseRecordName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "Imported Record";
  }

  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function normalizeRecordPayload(input: { name?: string; note?: string; color?: string }) {
  const name = input.name?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  const color = input.color?.trim() ?? "#0f766e";

  return { name, note, color };
}

export function serializeRecord(record: {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  note?: string;
  color?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}) {
  return {
    _id: String(record._id),
    name: record.name,
    note: record.note ?? "",
    color: record.color ?? "#0f766e",
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : new Date(record.createdAt ?? Date.now()).toISOString(),
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : new Date(record.updatedAt ?? Date.now()).toISOString(),
  };
}

export async function ensureRecordsBackfilledForUser(userId: mongoose.Types.ObjectId) {
  const legacyTransactions = await TransactionModel.find({
    userId,
    kind: { $in: ["income", "expense"] },
    $or: [{ recordId: { $exists: false } }, { recordId: null }],
  })
    .sort({ occurredAt: 1 })
    .lean();

  if (!legacyTransactions.length) {
    return;
  }

  const existingRecords = await RecordModel.find({ userId }).lean();
  const recordsByName = new Map<string, { _id: mongoose.Types.ObjectId; color?: string }>();

  for (const record of existingRecords) {
    recordsByName.set(record.name.trim().toLowerCase(), { _id: record._id, color: record.color });
  }

  const recordIdsBySection = new Map<string, mongoose.Types.ObjectId>();
  let colorIndex = 0;

  for (const transaction of legacyTransactions) {
    const section = typeof transaction.section === "string" && transaction.section.trim() ? transaction.section.trim() : "self";
    const recordName = titleCaseRecordName(section);
    const nameKey = recordName.toLowerCase();

    let recordId = recordsByName.get(nameKey)?._id;

    if (!recordId) {
      const createdRecord = await RecordModel.create({
        userId,
        name: recordName,
        note: `Imported from legacy ${section} entries.`,
        color: importedRecordPalette[colorIndex % importedRecordPalette.length],
      });
      recordId = createdRecord._id;
      if (!recordId) {
        continue;
      }
      colorIndex += 1;
      recordsByName.set(nameKey, { _id: recordId, color: createdRecord.color });
    }

    recordIdsBySection.set(section, recordId);
  }

  await Promise.all(
    legacyTransactions.map((transaction) => {
      const section = typeof transaction.section === "string" && transaction.section.trim() ? transaction.section.trim() : "self";
      const recordId = recordIdsBySection.get(section);
      if (!recordId) {
        return Promise.resolve();
      }

      return TransactionModel.updateOne(
        { _id: transaction._id },
        {
          $set: {
            recordId,
            section,
          },
        },
      );
    }),
  );
}

export async function ensureRecordsBackfilled() {
  const userIds = await TransactionModel.distinct("userId", {
    kind: { $in: ["income", "expense"] },
    $or: [{ recordId: { $exists: false } }, { recordId: null }],
  });

  for (const userId of userIds) {
    await ensureRecordsBackfilledForUser(new mongoose.Types.ObjectId(userId));
  }
}
