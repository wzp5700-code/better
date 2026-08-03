import "server-only"

import { and, eq, gt, isNull, sql } from "drizzle-orm"

import { db } from "@/db/client"
import { devices, pairingCodes } from "@/db/schema"
import { generatePairingCode, hashToken, PAIRING_CODE_TTL_MS } from "./tokens"

/** Create a one-shot pairing code tied to the master device. */
export async function mintPairingCode(masterDeviceId: number): Promise<{
  id: number
  code: string
  expiresAt: Date
}> {
  const code = generatePairingCode()
  const codeHash = hashToken(code)
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS)

  const [row] = await db
    .insert(pairingCodes)
    .values({
      codeHash,
      createdByDeviceId: masterDeviceId,
      expiresAt,
    })
    .returning()
  if (!row) throw new Error("insert failed")
  return { id: row.id, code, expiresAt }
}

/**
 * Validate a pairing code (presented by a fresh device). Returns the row
 * metadata if valid; otherwise throws.
 */
export async function consumePairingCode(code: string): Promise<{
  id: number
  createdByDeviceId: number
}> {
  const codeHash = hashToken(code)
  const now = new Date()
  const [row] = await db
    .select()
    .from(pairingCodes)
    .where(
      and(
        eq(pairingCodes.codeHash, codeHash),
        gt(pairingCodes.expiresAt, now),
        isNull(pairingCodes.usedAt)
      )
    )
    .limit(1)
  if (!row) {
    throw new Error("配对码无效或已过期")
  }
  return { id: row.id, createdByDeviceId: row.createdByDeviceId }
}

/** Mark a pairing code as used by the given device. */
export async function markPairingCodeUsed(
  id: number,
  deviceId: number
): Promise<void> {
  await db
    .update(pairingCodes)
    .set({ usedByDeviceId: deviceId, usedAt: new Date() })
    .where(eq(pairingCodes.id, id))
}

/** Best-effort cleanup of expired codes. */
export async function pruneExpiredCodes(): Promise<number> {
  const result = await db
    .delete(pairingCodes)
    .where(sql`${pairingCodes.expiresAt} < ${new Date()}`)
  return Number((result as unknown as { rowsAffected?: number }).rowsAffected ?? 0)
}

// Re-export Device type to keep public surface narrow
export type { Device } from "@/db/schema"