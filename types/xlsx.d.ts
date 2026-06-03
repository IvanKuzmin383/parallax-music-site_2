declare module "xlsx" {
  export interface WorkBook {
    SheetNames: string[]
    Sheets: Record<string, WorkSheet>
  }

  export interface WorkSheet {
    [cell: string]: unknown
  }

  export function read(data: Buffer | Uint8Array, opts: { type: "buffer"; raw?: boolean }): WorkBook

  export const utils: {
    sheet_to_json<T>(sheet: WorkSheet, opts: { header: number; defval: string; raw?: boolean }): T[]
  }
}
