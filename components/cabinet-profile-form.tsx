"use client"

import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type ProfileFormValues,
  profileFormValuesToPatch,
  profilePatchSchema,
  TAX_SYSTEM_OPTIONS,
} from "@/lib/cabinet-counterparty"

type CabinetProfileFormProps = {
  defaultValues: ProfileFormValues
  saving: boolean
  onSavingChange: (saving: boolean) => void
  onSaved: (profileCompleteForUpload: boolean) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export function CabinetProfileForm({
  defaultValues,
  saving,
  onSavingChange,
  onSaved,
}: CabinetProfileFormProps) {
  const form = useForm<ProfileFormValues>({ defaultValues })
  const counterpartyType = defaultValues.counterpartyType
  const edoRequired = form.watch("edoRequired")
  const showTaxBlock = counterpartyType === "legal_entity" || counterpartyType === "sole_proprietor"

  const onSubmit = async (values: ProfileFormValues) => {
    onSavingChange(true)
    const payload = profileFormValuesToPatch(values, counterpartyType)
    const parsed = profilePatchSchema.safeParse(payload)
    if (!parsed.success) {
      for (const issue of parsed.error.errors) {
        const key = issue.path[0]
        if (typeof key === "string") {
          form.setError(key as keyof ProfileFormValues, { message: issue.message })
        }
      }
      toast.error(parsed.error.errors[0]?.message ?? "Проверьте заполнение полей")
      onSavingChange(false)
      return
    }

    try {
      const response = await fetch("/api/cabinet/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsed.data),
      })
      const data = await response.json().catch(() => ({} as { error?: string; profileCompleteForUpload?: boolean }))
      if (!response.ok) {
        toast.error(data.error || "Не удалось сохранить профиль")
        return
      }
      toast.success("Профиль сохранён")
      onSaved(data.profileCompleteForUpload !== false)
    } catch {
      toast.error("Ошибка сохранения профиля")
    } finally {
      onSavingChange(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      {counterpartyType === "individual" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Фамилия *</Label>
              <Input placeholder="Иванов" {...form.register("lastName")} disabled={saving} />
              <FieldError message={form.formState.errors.lastName?.message} />
            </div>
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input placeholder="Иван" {...form.register("firstName")} disabled={saving} />
              <FieldError message={form.formState.errors.firstName?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Отчество *</Label>
            <Input placeholder="Иванович" {...form.register("patronymic")} disabled={saving} />
            <FieldError message={form.formState.errors.patronymic?.message} />
          </div>
          <div className="space-y-2">
            <Label>Адрес регистрации *</Label>
            <Input
              placeholder="Россия, город, улица, дом, квартира"
              {...form.register("registrationAddress")}
              disabled={saving}
            />
            <FieldError message={form.formState.errors.registrationAddress?.message} />
          </div>
        </>
      ) : null}

      {counterpartyType === "sole_proprietor" ? (
        <>
          <div className="space-y-2">
            <Label>ФИО индивидуального предпринимателя *</Label>
            <Input placeholder="Иванов Иван Иванович" {...form.register("ipFullName")} disabled={saving} />
            <FieldError message={form.formState.errors.ipFullName?.message} />
          </div>
          <div className="space-y-2">
            <Label>Отчество</Label>
            <Input placeholder="Необязательно" {...form.register("patronymic")} disabled={saving} />
            <FieldError message={form.formState.errors.patronymic?.message} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>ИНН *</Label>
              <Input placeholder="12 цифр" {...form.register("inn")} disabled={saving} inputMode="numeric" />
              <FieldError message={form.formState.errors.inn?.message} />
            </div>
            <div className="space-y-2">
              <Label>ОГРНИП *</Label>
              <Input placeholder="15 цифр" {...form.register("ogrnip")} disabled={saving} inputMode="numeric" />
              <FieldError message={form.formState.errors.ogrnip?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адрес регистрации ИП *</Label>
            <Input
              placeholder="Россия, город, улица, дом"
              {...form.register("registrationAddress")}
              disabled={saving}
            />
            <FieldError message={form.formState.errors.registrationAddress?.message} />
          </div>
        </>
      ) : null}

      {counterpartyType === "legal_entity" ? (
        <>
          <div className="space-y-2">
            <Label>Полное наименование *</Label>
            <Input
              placeholder='Общество с ограниченной ответственностью «...»'
              {...form.register("companyFullName")}
              disabled={saving}
            />
            <FieldError message={form.formState.errors.companyFullName?.message} />
          </div>
          <div className="space-y-2">
            <Label>Краткое наименование</Label>
            <Input placeholder="ООО «...»" {...form.register("companyShortName")} disabled={saving} />
            <FieldError message={form.formState.errors.companyShortName?.message} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>ИНН *</Label>
              <Input placeholder="10 цифр" {...form.register("inn")} disabled={saving} inputMode="numeric" />
              <FieldError message={form.formState.errors.inn?.message} />
            </div>
            <div className="space-y-2">
              <Label>КПП *</Label>
              <Input placeholder="9 цифр" {...form.register("kpp")} disabled={saving} inputMode="numeric" />
              <FieldError message={form.formState.errors.kpp?.message} />
            </div>
            <div className="space-y-2">
              <Label>ОГРН *</Label>
              <Input placeholder="13 цифр" {...form.register("ogrn")} disabled={saving} inputMode="numeric" />
              <FieldError message={form.formState.errors.ogrn?.message} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Юридический адрес *</Label>
            <Input placeholder="Адрес по ЕГРЮЛ" {...form.register("legalAddress")} disabled={saving} />
            <FieldError message={form.formState.errors.legalAddress?.message} />
          </div>
          <div className="space-y-2">
            <Label>Почтовый адрес</Label>
            <Input
              placeholder="Если отличается от юридического"
              {...form.register("postalAddress")}
              disabled={saving}
            />
            <FieldError message={form.formState.errors.postalAddress?.message} />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Подписант / представитель</h3>
            <div className="space-y-2">
              <Label>ФИО подписанта *</Label>
              <Input {...form.register("signatoryFullName")} disabled={saving} />
              <FieldError message={form.formState.errors.signatoryFullName?.message} />
            </div>
            <div className="space-y-2">
              <Label>Должность *</Label>
              <Input placeholder="Генеральный директор" {...form.register("signatoryPosition")} disabled={saving} />
              <FieldError message={form.formState.errors.signatoryPosition?.message} />
            </div>
            <div className="space-y-2">
              <Label>Основание полномочий *</Label>
              <Input placeholder="Устав / Доверенность № … от …" {...form.register("signatoryAuthorityBasis")} disabled={saving} />
              <FieldError message={form.formState.errors.signatoryAuthorityBasis?.message} />
            </div>
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label>Телефон *</Label>
        <Input placeholder="+7 (999) 123-45-67" {...form.register("phone")} disabled={saving} />
        <FieldError message={form.formState.errors.phone?.message} />
      </div>

      <div className="space-y-2">
        <Label>Telegram username</Label>
        <Input placeholder="@username" {...form.register("telegram")} disabled={saving} />
        <FieldError message={form.formState.errors.telegram?.message} />
      </div>

      {(counterpartyType === "legal_entity" || counterpartyType === "sole_proprietor") && (
        <div className="space-y-2">
          <Label>Email для документов (акты, УПД)</Label>
          <Input
            type="email"
            placeholder="docs@company.ru"
            {...form.register("documentsEmail")}
            disabled={saving}
          />
          <FieldError message={form.formState.errors.documentsEmail?.message} />
        </div>
      )}

      <div className="space-y-2">
        <Label>Имя артиста</Label>
        <Input placeholder="Название артиста" {...form.register("artistName")} disabled={saving} />
        <FieldError message={form.formState.errors.artistName?.message} />
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-sm font-medium">
          Реквизиты для выплат роялти
          {counterpartyType === "legal_entity" ? " *" : ""}
        </h3>

        <div className="space-y-2">
          <Label>Расчётный счёт{counterpartyType === "legal_entity" ? " *" : ""}</Label>
          <Input placeholder="20 цифр" {...form.register("bankAccountNumber")} disabled={saving} inputMode="numeric" />
          <FieldError message={form.formState.errors.bankAccountNumber?.message} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>БИК{counterpartyType === "legal_entity" ? " *" : ""}</Label>
            <Input placeholder="044525225" {...form.register("bankBic")} disabled={saving} inputMode="numeric" />
            <FieldError message={form.formState.errors.bankBic?.message} />
          </div>
          <div className="space-y-2">
            <Label>Корреспондентский счёт</Label>
            <Input placeholder="20 цифр" {...form.register("bankCorrespondentAccount")} disabled={saving} inputMode="numeric" />
            <FieldError message={form.formState.errors.bankCorrespondentAccount?.message} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Наименование банка{counterpartyType === "legal_entity" ? " *" : ""}</Label>
          <Input placeholder="АО «Банк ...»" {...form.register("bankName")} disabled={saving} />
          <FieldError message={form.formState.errors.bankName?.message} />
        </div>
      </div>

      {showTaxBlock ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-medium">Налоги и закрывающие документы</h3>

          <div className="flex items-center gap-2">
            <Checkbox
              id="vatPayer"
              checked={form.watch("vatPayer")}
              onCheckedChange={(c) => form.setValue("vatPayer", c === true)}
              disabled={saving}
            />
            <Label htmlFor="vatPayer" className="font-normal cursor-pointer">
              Работаем с НДС
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Система налогообложения</Label>
            <Select
              value={form.watch("taxSystem") || "_none"}
              onValueChange={(v) =>
                form.setValue("taxSystem", v === "_none" ? "" : (v as ProfileFormValues["taxSystem"]))
              }
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не указано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Не указано</SelectItem>
                {TAX_SYSTEM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edoRequired"
              checked={edoRequired}
              onCheckedChange={(c) => form.setValue("edoRequired", c === true)}
              disabled={saving}
            />
            <Label htmlFor="edoRequired" className="font-normal cursor-pointer">
              Нужны закрывающие документы в ЭДО
            </Label>
          </div>

          {edoRequired ? (
            <div className="space-y-2">
              <Label>Идентификатор в ЭДО *</Label>
              <Input
                placeholder="СБИС, Диадок, идентификатор контрагента"
                {...form.register("edoIdentifier")}
                disabled={saving}
              />
              <FieldError message={form.formState.errors.edoIdentifier?.message} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? (
            "Сохранение..."
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
