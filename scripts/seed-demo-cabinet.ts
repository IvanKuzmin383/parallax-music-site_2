/**
 * Demo releases + platform stats for one staging account (marketing screenshots).
 *
 * Usage (test server only):
 *   pnpm exec tsx scripts/seed-demo-cabinet.ts --dry-run
 *   pnpm exec tsx scripts/seed-demo-cabinet.ts --apply
 *   pnpm exec tsx scripts/seed-demo-cabinet.ts --remove
 *
 * Env: DEMO_SEED_EMAIL (default DigitalReachMusic@ya.ru), DEMO_UPLOADS_DIR (default /data/uploads).
 * Refuses to run unless NEXT_PUBLIC_SITE_URL points at the staging host.
 */
import fs from "fs"
import path from "path"
import sharp from "sharp"
import type { PoolClient } from "pg"
import { closePool, getPool } from "../lib/database"

const STAGING_HOST = "fonozvuk.ru"
const DEMO_ID_PREFIX = "de305eed-"
const DEMO_ISRC_PREFIX = "QZDEM26"
const STATS_END = process.env.DEMO_STATS_END ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

const PLATFORM_WEIGHTS: Array<[string, number]> = [
  ["yandex_music", 0.38],
  ["vk_ok_boom", 0.27],
  ["youtube_music", 0.12],
  ["spotify", 0.08],
  ["apple_music", 0.07],
  ["zvuk", 0.05],
  ["kion_music", 0.03],
]

const COUNTRY_WEIGHTS: Array<[string, number]> = [
  ["Russia", 0.86],
  ["Kazakhstan", 0.05],
  ["Belarus", 0.04],
  ["Uzbekistan", 0.02],
  ["Unknown", 0.03],
]

type DemoRelease = {
  n: number
  title: string
  artist: string
  genre: string
  status: string
  releaseDate: string
  cover: string
  /** Peak daily plays across all platforms; 0 = not on platforms yet. */
  peakDaily: number
}

const DEMO_RELEASES: DemoRelease[] = [
  { n: 1, title: "Неоновый дождь", artist: "ЛаймВи", genre: "Pop", status: "released", releaseDate: "2026-07-10", cover: "example-01.webp", peakDaily: 2400 },
  { n: 2, title: "Север", artist: "Limb8", genre: "Electronic", status: "released", releaseDate: "2026-08-07", cover: "example-04.webp", peakDaily: 1500 },
  { n: 3, title: "Без тебя", artist: "ЛаймВи", genre: "Pop", status: "released", releaseDate: "2026-09-18", cover: "example-06.webp", peakDaily: 3100 },
  { n: 4, title: "Ночной город", artist: "Limb8", genre: "Electronic", status: "released", releaseDate: "2026-10-16", cover: "example-08.webp", peakDaily: 900 },
  { n: 5, title: "Полярная звезда", artist: "ЛаймВи", genre: "Pop", status: "approved_by_platforms", releaseDate: "2026-11-20", cover: "example-02.webp", peakDaily: 0 },
  { n: 6, title: "Тихий океан", artist: "Limb8", genre: "Ambient", status: "sent_to_platforms", releaseDate: "2026-11-27", cover: "example-10.webp", peakDaily: 0 },
  { n: 7, title: "Мой космос", artist: "ЛаймВи", genre: "Pop", status: "on_moderation", releaseDate: "2026-12-04", cover: "example-11.webp", peakDaily: 0 },
]

function demoId(n: number): string {
  return `${DEMO_ID_PREFIX}0000-4000-8000-${String(n).padStart(12, "0")}`
}

function demoIsrc(n: number): string {
  return `${DEMO_ISRC_PREFIX}${String(n).padStart(5, "0")}`
}

function demoUpc(n: number): string {
  return `50640099${String(90000 + n).padStart(5, "0")}`
}

function demoTrackKey(n: number): string {
  return `ISRC:${demoIsrc(n)}|EAN:${demoUpc(n)}|CAT:DEMO${String(n).padStart(4, "0")}`
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

/** Deterministic PRNG so re-seeding gives the same charts. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function eachDay(fromYmd: string, toYmd: string): string[] {
  const out: string[] = []
  const d = new Date(`${fromYmd}T00:00:00Z`)
  const end = new Date(`${toYmd}T00:00:00Z`)
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/** Launch spike, decay to a long tail, weekend bump, noise. */
function dailyTotal(peak: number, dayIndex: number, weekday: number, rnd: () => number): number {
  const ramp = Math.min(1, (dayIndex + 1) / 6)
  const decay = 0.35 + 0.65 * Math.exp(-dayIndex / 28)
  const weekend = weekday === 0 || weekday === 6 ? 1.18 : 1
  const noise = 0.85 + rnd() * 0.3
  return Math.round(peak * ramp * decay * weekend * noise)
}

function splitByWeights(total: number, weights: Array<[string, number]>): Array<[string, number]> {
  let left = total
  return weights.map(([key, w], i) => {
    const value = i === weights.length - 1 ? left : Math.round(total * w)
    left -= value
    return [key, Math.max(0, value)]
  })
}

function findUploadsDir(): string {
  return process.env.DEMO_UPLOADS_DIR?.trim() || "/data/uploads"
}

async function removeDemoRows(client: PoolClient, email: string): Promise<void> {
  const like = `${DEMO_ID_PREFIX}%`
  const keyLike = `ISRC:${DEMO_ISRC_PREFIX}%`
  await client.query(`DELETE FROM music_platform_track_daily_plays_by_country WHERE track_key LIKE $1`, [keyLike])
  await client.query(`DELETE FROM music_platform_track_daily_plays WHERE track_key LIKE $1`, [keyLike])
  await client.query(`DELETE FROM music_platform_tracks WHERE track_key LIKE $1`, [keyLike])
  await client.query(`DELETE FROM cabinet_music_track_map WHERE cabinet_track_id LIKE $1`, [like])
  await client.query(`DELETE FROM tracks WHERE id LIKE $1 AND LOWER(user_id) = LOWER($2)`, [like, email])
  await client.query(`DELETE FROM releases WHERE id LIKE $1 AND LOWER(user_id) = LOWER($2)`, [like, email])
}

function removeDemoFiles(uploadsDir: string): void {
  for (const r of DEMO_RELEASES) {
    fs.rmSync(path.join(uploadsDir, "covers", `${demoId(r.n)}.jpg`), { force: true })
    fs.rmSync(path.join(uploadsDir, "audio", `${demoId(r.n)}.wav`), { force: true })
  }
}

async function writeFiles(uploadsDir: string): Promise<void> {
  const coversDir = path.join(uploadsDir, "covers")
  const audioDir = path.join(uploadsDir, "audio")
  fs.mkdirSync(coversDir, { recursive: true })
  fs.mkdirSync(audioDir, { recursive: true })
  const audioSrc = path.join(process.cwd(), "public", "aimastering", "after.wav")
  for (const r of DEMO_RELEASES) {
    const coverSrc = path.join(process.cwd(), "public", "aicover", r.cover)
    await sharp(coverSrc).resize(1400, 1400, { fit: "cover" }).jpeg({ quality: 88 }).toFile(
      path.join(coversDir, `${demoId(r.n)}.jpg`)
    )
    fs.copyFileSync(audioSrc, path.join(audioDir, `${demoId(r.n)}.wav`))
  }
}

async function insertDemo(client: PoolClient, email: string, uploadsDir: string): Promise<{ plays: number }> {
  const userId = email
  const mapUserId = email.toLowerCase()
  let totalPlays = 0

  for (const r of DEMO_RELEASES) {
    const id = demoId(r.n)
    const coverPath = path.join(uploadsDir, "covers", `${id}.jpg`)
    const audioPath = path.join(uploadsDir, "audio", `${id}.wav`)
    const createdAt = new Date(`${r.releaseDate}T09:00:00Z`)
    createdAt.setUTCDate(createdAt.getUTCDate() - 21)
    const onPlatforms = r.status === "released"
    const platformLinks = onPlatforms
      ? JSON.stringify({
          yandex: "https://music.yandex.ru/",
          vk: "https://music.vk.com/",
          spotify: "https://open.spotify.com/",
          appleMusic: "https://music.apple.com/",
        })
      : null

    await client.query(
      `INSERT INTO releases (id, user_id, kind, title, artist_name, label_name, cover_path, release_date, upc, status, wizard_step, addons_json, created_at, updated_at)
       VALUES ($1, $2, 'single', $3, $4, 'Parallax Music', $5, $6, $7, $8, 6, '{}', $9, $9)`,
      [id, userId, r.title, r.artist, coverPath, r.releaseDate, demoUpc(r.n), r.status, createdAt.toISOString()]
    )
    await client.query(
      `INSERT INTO tracks (id, user_id, release_id, track_order, track_name, artist_name, genre, is_ai_made, music_ai_service,
         music_author, lyrics_author, cover_path, audio_path, status, release_date, upc, isrc, platform_links, label_name,
         lyrics_language, has_explicit_language, created_at, updated_at)
       VALUES ($1, $2, $1, 0, $3, $4, $5, TRUE, 'Suno', $4, $4, $6, $7, $8, $9, $10, $11, $12, 'Parallax Music',
         'ru', FALSE, $13, $13)`,
      [id, userId, r.title, r.artist, r.genre, coverPath, audioPath, r.status, r.releaseDate, demoUpc(r.n),
        demoIsrc(r.n), platformLinks, createdAt.toISOString()]
    )

    if (r.peakDaily <= 0) continue

    const trackKey = demoTrackKey(r.n)
    const rnd = mulberry32(1000 + r.n)
    const days = eachDay(r.releaseDate, STATS_END)
    const perPlatform = new Map<string, Array<[string, number]>>()

    days.forEach((day, i) => {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay()
      const total = dailyTotal(r.peakDaily, i, weekday, rnd)
      totalPlays += total
      for (const [platform, plays] of splitByWeights(total, PLATFORM_WEIGHTS)) {
        const rows = perPlatform.get(platform) ?? []
        rows.push([day, plays])
        perPlatform.set(platform, rows)
      }
    })

    for (const [platform, rows] of perPlatform) {
      await client.query(
        `INSERT INTO music_platform_tracks (platform_key, track_key, title, author) VALUES ($1, $2, $3, $4)`,
        [platform, trackKey, r.title, r.artist]
      )
      await client.query(
        `INSERT INTO cabinet_music_track_map (user_id, platform_key, track_key, cabinet_track_id, matched_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [mapUserId, platform, trackKey, id]
      )
      await client.query(
        `INSERT INTO music_platform_track_daily_plays (platform_key, track_key, stat_date, plays)
         SELECT $1, $2, d, p FROM UNNEST($3::text[], $4::int[]) AS t(d, p)`,
        [platform, trackKey, rows.map((x) => x[0]), rows.map((x) => x[1])]
      )
      const cDates: string[] = []
      const cCountries: string[] = []
      const cPlays: number[] = []
      for (const [day, plays] of rows) {
        for (const [country, cp] of splitByWeights(plays, COUNTRY_WEIGHTS)) {
          if (cp <= 0) continue
          cDates.push(day)
          cCountries.push(country)
          cPlays.push(cp)
        }
      }
      await client.query(
        `INSERT INTO music_platform_track_daily_plays_by_country (platform_key, track_key, stat_date, country, plays)
         SELECT $1, $2, d, c, p FROM UNNEST($3::text[], $4::text[], $5::int[]) AS t(d, c, p)`,
        [platform, trackKey, cDates, cCountries, cPlays]
      )
    }
  }
  return { plays: totalPlays }
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2))
  const mode = args.has("--apply") ? "apply" : args.has("--remove") ? "remove" : args.has("--dry-run") ? "dry-run" : null
  if (!mode) {
    console.error("Specify --dry-run, --apply or --remove")
    process.exit(1)
  }

  const root = process.cwd()
  loadEnvFile(path.join(root, ".env"))
  loadEnvFile(path.join(root, ".env.local"))

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  if (!siteUrl.includes(STAGING_HOST)) {
    console.error(`[demo-seed] refused: NEXT_PUBLIC_SITE_URL=${siteUrl || "(empty)"} is not ${STAGING_HOST}`)
    process.exit(1)
  }

  const email = process.env.DEMO_SEED_EMAIL?.trim() || "DigitalReachMusic@ya.ru"
  const uploadsDir = findUploadsDir()
  const pool = getPool()
  const client = await pool.connect()

  try {
    const user = await client.query(`SELECT email FROM cabinet_users WHERE LOWER(email) = LOWER($1)`, [email])
    if (user.rowCount !== 1) throw new Error(`user ${email} not found`)
    const canonicalEmail = String(user.rows[0].email)

    await client.query("BEGIN")
    await removeDemoRows(client, canonicalEmail)
    if (mode === "remove") {
      await client.query("COMMIT")
      removeDemoFiles(uploadsDir)
      console.log(`[demo-seed] removed demo data for ${canonicalEmail}`)
      return
    }

    const { plays } = await insertDemo(client, canonicalEmail, uploadsDir)
    if (mode === "dry-run") {
      await client.query("ROLLBACK")
      console.log(`[demo-seed] dry-run ok: ${DEMO_RELEASES.length} releases, ${plays} plays (rolled back, no files written)`)
      return
    }

    await writeFiles(uploadsDir)
    await client.query("COMMIT")
    console.log(`[demo-seed] applied for ${canonicalEmail}: ${DEMO_RELEASES.length} releases, ${plays} plays`)
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {})
    throw err
  } finally {
    client.release()
    await closePool()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
