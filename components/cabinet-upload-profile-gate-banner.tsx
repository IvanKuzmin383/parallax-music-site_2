import Link from "next/link"
import { Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function CabinetUploadProfileGateBanner() {
  return (
    <Alert className="border-primary/35 bg-primary/[0.06]">
      <Info className="text-primary" />
      <AlertTitle className="text-foreground">
        Сначала заполните обязательные поля в профиле
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-foreground/90 text-sm leading-relaxed">
          Укажите фамилию, имя, адрес регистрации и контактный телефон - без этого отправка релиза
          недоступна. Отчество - если есть в паспорте, либо отметьте «Без отчества» в профиле.
        </p>
        <Button asChild size="sm" variant="default">
          <Link href="/cabinet/profile">Открыть профиль</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
