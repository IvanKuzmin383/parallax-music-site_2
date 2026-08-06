import { permanentRedirect } from "next/navigation"

/** Legacy URL: ИИ-лендинг перенесён на главную. */
export default function AiPage() {
  permanentRedirect("/")
}
