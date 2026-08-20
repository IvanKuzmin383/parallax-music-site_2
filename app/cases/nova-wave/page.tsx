import { permanentRedirect } from "next/navigation"

/** Шаблонный кейс снят с публикации. */
export default function NovaWaveCasePage() {
  permanentRedirect("/cases")
}
