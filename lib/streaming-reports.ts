import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { execute, query, queryOne, withTransaction, clientExecute } from "./database"
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
  const rows = await query<StreamingReportRow>("SELECT * FROM streaming_reports")
  return rows.map(rowToReport)
}

export async function getReportsByUserId(userId: string): Promise<StreamingReport[]> {
  const rows = await query<StreamingReportRow>(
    "SELECT * FROM streaming_reports WHERE user_id = ?",
    [userId]
  )
  return rows.map(rowToReport)
}

export async function getReportById(id: string): Promise<StreamingReport | null> {
  const row = await queryOne<StreamingReportRow>("SELECT * FROM streaming_reports WHERE id = ?", [
    id,
  ])
  return row ? rowToReport(row) : null
}

async function insertReportAndCreditBalance(
  reportId: string,
  userId: string,
  amount: number,
  reportFilePath: string,
  fileName: string,
  now: string
): Promise<void> {
  await withTransaction(async (client) => {
    await clientExecute(
      client,
      `
      INSERT INTO streaming_reports (id, user_id, amount, file_path, file_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [reportId, userId, amount, reportFilePath, fileName, now, now]
    )
    await clientExecute(
      client,
      "UPDATE cabinet_users SET streaming_balance = COALESCE(streaming_balance, 0) + ? WHERE id = ?",
      [amount, userId]
    )
  })
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
  await insertReportAndCreditBalance(reportId, userId, amount, reportFilePath, fileName, now)

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
    console.log("[streaming-reports] Created report", {
      id: report.id,
      userId: report.userId,
      amount: report.amount,
    })
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
  await insertReportAndCreditBalance(
    reportId,
    userId,
    amount,
    reportFilePath,
    originalName,
    now
  )

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
  await insertReportAndCreditBalance(
    reportId,
    userId,
    amount,
    reportFilePath,
    originalName,
    now
  )

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
  await execute(`UPDATE streaming_reports SET ${updates.join(", ")} WHERE id = ?`, params)

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

  const changes = await execute("DELETE FROM streaming_reports WHERE id = ?", [id])

  if (process.env.NODE_ENV === "development" && changes > 0) {
    console.log("[streaming-reports] Deleted report", { id: report.id, userId: report.userId })
  }

  return changes > 0
}
