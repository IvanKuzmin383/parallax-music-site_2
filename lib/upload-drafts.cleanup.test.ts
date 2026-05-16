import test from "node:test"
import assert from "node:assert/strict"
import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"
import { removeUploadDraftFiles, type UploadDraft } from "./upload-drafts"

test("removeUploadDraftFiles removes audio and cover from drafts directory", async () => {
  const originalCwd = process.cwd()
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pm-upload-draft-cleanup-"))

  try {
    process.chdir(tempRoot)
    const draftsDir = path.join(tempRoot, "data", "uploads", "upload-drafts")
    await fs.mkdir(draftsDir, { recursive: true })

    const audioRelPath = "single-audio.wav"
    const coverRelPath = "single-cover.jpg"
    const albumTrackRelPath = "album-track.wav"

    await fs.writeFile(path.join(draftsDir, audioRelPath), "audio")
    await fs.writeFile(path.join(draftsDir, coverRelPath), "cover")
    await fs.writeFile(path.join(draftsDir, albumTrackRelPath), "album-audio")

    const draft: UploadDraft = {
      id: "draft-id",
      userId: "artist@example.com",
      kind: "album",
      status: "collecting",
      payload: {
        addons: {},
        albumTracks: [{ audioRelPath: albumTrackRelPath }],
      },
      audioRelPath,
      coverRelPath,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await removeUploadDraftFiles(draft)

    await assert.rejects(fs.access(path.join(draftsDir, audioRelPath)))
    await assert.rejects(fs.access(path.join(draftsDir, coverRelPath)))
    await assert.rejects(fs.access(path.join(draftsDir, albumTrackRelPath)))
  } finally {
    process.chdir(originalCwd)
    await fs.rm(tempRoot, { recursive: true, force: true })
  }
})
