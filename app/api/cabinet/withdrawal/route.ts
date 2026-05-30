import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { escapeHtml } from '@/lib/telegram'
import { notifyStaffInBackground } from '@/lib/form-notifications'
import { getCabinetToken, getCabinetSession } from '@/lib/cabinet-auth'
import { getCabinetUserByEmail } from '@/lib/cabinet-users'
import { createWithdrawalRequest } from '@/lib/withdrawal-requests'

const withdrawalSchema = z.object({
  amount: z.number().min(1000, "Минимальная сумма вывода 1000 ₽"),
  type: z.enum(["sbp", "card"]),
  phone: z.string().optional(),
  cardNumber: z.string().optional(),
  bank: z.string().optional(),
  recipientName: z.string().min(2, "ФИО получателя обязательно"),
})

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации
    const token = getCabinetToken(request)
    const session = getCabinetSession(token)
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Не авторизован" },
        { status: 401 }
      )
    }

    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Валидация данных
    const validatedData = withdrawalSchema.parse(body)
    
    // Проверка баланса
    const currentBalance = user.streamingBalance || 0
    if (validatedData.amount > currentBalance) {
      return NextResponse.json(
        { success: false, error: "Недостаточно средств на балансе" },
        { status: 400 }
      )
    }
    
    // Дополнительная валидация в зависимости от типа
    if (validatedData.type === "sbp" && !validatedData.phone) {
      return NextResponse.json(
        { success: false, error: "Номер телефона обязателен для СБП" },
        { status: 400 }
      )
    }
    
    if (validatedData.type === "card") {
      if (!validatedData.cardNumber) {
        return NextResponse.json(
          { success: false, error: "Номер карты обязателен для банковской карты" },
          { status: 400 }
        )
      }
      if (!validatedData.bank) {
        return NextResponse.json(
          { success: false, error: "Название банка обязательно для банковской карты" },
          { status: 400 }
        )
      }
    }
    
    // Создание заявки в БД
    const withdrawalRequest = await createWithdrawalRequest(
      user.id,
      validatedData.amount,
      validatedData.type,
      validatedData.recipientName,
      validatedData.phone,
      validatedData.cardNumber,
      validatedData.bank
    )
    
    // Формирование сообщения для Telegram
    let message = `<b>Запрос на вывод средств</b>\n\n`
    message += `<b>ID заявки:</b> ${withdrawalRequest.id}\n`
    message += `<b>Пользователь:</b> ${escapeHtml(user.email)}\n`
    message += `<b>Сумма:</b> ${validatedData.amount.toLocaleString("ru-RU")} ₽\n`
    message += `<b>Тип вывода:</b> ${validatedData.type === "sbp" ? "СБП" : "Банковская карта"}\n`
    message += `<b>ФИО получателя:</b> ${escapeHtml(validatedData.recipientName)}\n`
    
    if (validatedData.type === "sbp") {
      message += `<b>Номер телефона:</b> ${escapeHtml(validatedData.phone || "")}\n`
    } else {
      message += `<b>Номер карты:</b> ${escapeHtml(validatedData.cardNumber || "")}\n`
      message += `<b>Банк:</b> ${escapeHtml(validatedData.bank || "")}\n`
    }
    message += `\n#вывод`

    notifyStaffInBackground({
      telegramMessage: message,
      emailSubject: `[Parallax] Вывод ${validatedData.amount.toLocaleString('ru-RU')} ₽: ${user.email}`,
      logContext: 'cabinet/withdrawal',
    })
    
    return NextResponse.json(
      { 
        success: true,
        message: "Запрос на вывод средств успешно создан",
        requestId: withdrawalRequest.id
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: "Ошибка валидации данных",
          errors: error.errors 
        },
        { status: 400 }
      )
    }
    
    console.error('Withdrawal request error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: "Ошибка при обработке запроса"
      },
      { status: 500 }
    )
  }
}
