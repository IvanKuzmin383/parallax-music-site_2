import { CabinetUserDetail } from "@/components/admin/cabinet-user-detail"

export default async function AdminCabinetUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CabinetUserDetail userId={id} />
}
