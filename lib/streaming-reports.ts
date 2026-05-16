import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { getDb } from "./db"
import { getCabinetUserById, updateCabinetUserBalance } from "./cabinet-users"
import { copyFileToPathAtomic, writeMultipartFileToPathAtomic } from "./node-atomic-upload"
import { getUploadsBasePath } from "./tracks"

export interface StreamingReport {
  id: string
  userId: string
  amount: number
  filePath: string
  fileName: string
  createdAt: string
  updatedAt: string
}

interface StreamingReportRow {
  id: string
  user_id: string
  amount: number
  file_path: string
  file_name: string
  created_at: string
  updated_at: string
}

function rowToReport(row: StreamingReportRow): StreamingReport {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    filePath: row.file_path,
    fileName: row.file_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getReportsDir(): Promise<string> {
  const uploadsBase = await getUploadsBasePath()
  const dir = path.join(uploadsBase, "reports")
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
  return dir
}

export async function getAllReports(): Promise<StreamingReport[]> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM streaming_reports").all() as StreamingReportRow[]
  return rows.map(rowToReport)
}

export async function getReportsByUserId(userId: string): Promise<StreamingReport[]> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM streaming_reports WHERE user_id = ?").all(userId) as StreamingReportRow[]
  return rows.map(rowToReport)
}

export async function getReportById(id: string): Promise<StreamingReport | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM streaming_reports WHERE id = ?").get(id) as StreamingReportRow | undefined
  return row ? rowToReport(row) : null
}

export async function createReport(
  userId: string,
  amount: number,
  fileBuffer: Buffer,
  fileName: string
): Promise<StreamingReport> {
  const reportsDir = await getReportsDir()
  const reportId = crypto.randomUUID()
  const fileExt = path.extname(fileName)
  const reportFileName = `${reportId}${fileExt}`
  const reportFilePath = path.join(reportsDir, reportFileName)

  await fs.writeFile(reportFilePath, fileBuffer)

  const now = new Date().toISOString()

  const db = getDb()
  db.transaction(() => {
    db.prepare(`
      INSERT INTO streaming_reports (id, user_id, amount, file_path, file_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(reportId, userId, amount, reportFilePath, fileName, now, now)
    db.prepare(
      "UPDATE cabinet_users SET streaming_balance = COALESCE(streaming_balance, 0) + ? WHERE id = ?"
    ).run(amount, userId)
  })()

  const report: StreamingReport = {
    id: reportId,
    userId,
    amount,
    filePath: reportFilePath,
    fileName,
    createdAt: now,
    updatedAt: now,
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[streaming-reports] Created report", { id: report.id, userId: report.userId, amount: report.amount })
  }

  return report
}

export async function createReportFromFile(
  userId: string,
  amount: number,
  file: File,
  fileName?: string
): Promise<StreamingReport> {
  const reportsDir = await getReportsDir()
  const reportId = crypto.randomUUID()
  const originalName = fileName ?? file.name
  const fileExt = path.extname(originalName)
  const reportFileName = `${reportId}${fileExt}`
  const reportFilePath = path.join(reportsDir, reportFileName)

  await writeMultipartFileToPathAtomic(file, reportFilePath)

  const now = new Date().toISOString()
  const db = getDb()
  db.transaction(() => {
    db.prepare(`
      INSERT INTO streaming_reports (id, user_id, amount, file_path, file_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(reportId, userId, amount, reportFilePath, originalName, now, now)
    db.prepare(
      "UPDATE cabinet_users SET streaming_balance = COALESCE(streaming_balance, 0) + ? WHERE id = ?"
    ).run(amount, userId)
  })()

  return {
    id: reportId,
    userId,
    amount,
    filePath: reportFilePath,
    fileName: originalName,
    createdAt: now,
    updatedAt: now,
  }
}

export async function createReportFromTempFile(
  userId: string,
  amount: number,
  tempFilePath: string,
  fileName: string
): Promise<StreamingReport> {
  const reportsDir = await getReportsDir()
  const reportId = crypto.randomUUID()
  const originalName = fileName
  const fileExt = path.extname(originalName)
  const reportFileName = `${reportId}${fileExt}`
  const reportFilePath = path.join(reportsDir, reportFileName)

  await copyFileToPathAtomic(tempFilePath, reportFilePath)

  const now = new Date().toISOString()
  const db = getDb()
  db.transaction(() => {
    db.prepare(`
      INSERT INTO streaming_reports (id, user_id, amount, file_path, file_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(reportId, userId, amount, reportFilePath, originalName, now, now)
    db.prepare(
      "UPDATE cabinet_users SET streaming_balance = COALESCE(streaming_balance, 0) + ? WHERE id = ?"
    ).run(amount, userId)
  })()

  return {
    id: reportId,
    userId,
    amount,
    filePath: reportFilePath,
    fileName: originalName,
    createdAt: now,
    updatedAt: now,
  }
}

export async function updateReport(
  id: string,
  partial: Partial<Pick<StreamingReport, "amount" | "fileName">>
): Promise<StreamingReport | null> {
  const oldReport = await getReportById(id)
  if (!oldReport) return null

  const now = new Date().toISOString()

  if (partial.amount !== undefined && partial.amount !== oldReport.amount) {
    const user = await getCabinetUserById(oldReport.userId)
    if (user) {
      const currentBalance = user.streamingBalance || 0
      const balanceDiff = partial.amount - oldReport.amount
      await updateCabinetUserBalance(oldReport.userId, currentBalance + balanceDiff)
    }
  }

  const db = getDb()
  const updates: string[] = ["updated_at = ?"]
  const params: (string | number)[] = [now]

  if (partial.amount !== undefined) {
    updates.push("amount = ?")
    params.push(partial.amount)
  }
  if (partial.fileName !== undefined) {
    updates.push("file_name = ?")
    params.push(partial.fileName)
  }

  params.push(id)
  db.prepare(`UPDATE streaming_reports SET ${updates.join(", ")} WHERE id = ?`).run(...params)

  if (process.env.NODE_ENV === "development") {
    console.log("[streaming-reports] Updated report", { id, amount: partial.amount })
  }

  return getReportById(id)
}

export async function deleteReport(id: string): Promise<boolean> {
  const report = await getReportById(id)
  if (!report) return false

  try {
    await fs.unlink(report.filePath)
    if (process.env.NODE_ENV === "development") {
      console.log("[streaming-reports] Deleted report file:", report.filePath)
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[streaming-reports] Error deleting report file:", error)
    }
  }

  const user = await getCabinetUserById(report.userId)
  if (user) {
    const currentBalance = user.streamingBalance || 0
    await updateCabinetUserBalance(report.userId, currentBalance - report.amount)
  }

  const db = getDb()
  const result = db.prepare("DELETE FROM streaming_reports WHERE id = ?").run(id)

  if (process.env.NODE_ENV === "development" && result.changes > 0) {
    console.log("[streaming-reports] Deleted report", { id: report.id, userId: report.userId })
  }

  return result.changes > 0
}
