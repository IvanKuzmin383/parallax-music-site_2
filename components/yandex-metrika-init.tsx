"use client"

import { useEffect } from "react"

interface YandexMetrikaInitProps {
  metrikaId: string
}

export function YandexMetrikaInit({ metrikaId }: YandexMetrikaInitProps) {
  useEffect(() => {
    // Проверяем, что компонент смонтирован
    if (typeof window === 'undefined') {
      return
    }

    const counterId = Number(metrikaId)
    console.log('[Yandex.Metrika] Инициализация счетчика, ID:', counterId)

    // Стандартный код инициализации Яндекс.Метрики (точная копия официального кода)
    // Создаем очередь команд - библиотека выполнит их после загрузки
    ;(window as any).ym = (window as any).ym || function(...args: any[]) {
      ;((window as any).ym.a = (window as any).ym.a || []).push(args)
    }
    ;(window as any).ym.l = Number(new Date())

    // Добавляем команду инициализации в очередь
    // Если библиотека еще не загружена, команда попадет в очередь
    // Если библиотека уже загружена, команда выполнится сразу
    try {
      ;(window as any).ym(counterId, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
      })
      console.log('[Yandex.Metrika] Команда инициализации добавлена, очередь:', (window as any).ym.a)
    } catch (error) {
      console.error('[Yandex.Metrika] Ошибка при добавлении команды:', error)
    }

    // Мониторим загрузку библиотеки для отладки
    let checkCount = 0
    const maxChecks = 100
    
    const monitor = setInterval(() => {
      checkCount++
      
      // Проверяем, загрузилась ли библиотека (она заменяет объект-очередь)
      const scriptExists = document.querySelector('script[src*="mc.yandex.ru/metrika/tag.js"]') !== null
      const queueExists = (window as any).ym && (window as any).ym.a && Array.isArray((window as any).ym.a)
      const libraryLoaded = scriptExists && !queueExists && typeof (window as any).ym === 'function'
      
      if (libraryLoaded) {
        console.log('[Yandex.Metrika] Библиотека загружена! Команды из очереди должны быть выполнены')
        clearInterval(monitor)
      } else if (checkCount >= maxChecks) {
        console.warn('[Yandex.Metrika] Проверка завершена. Скрипт существует:', scriptExists)
        console.warn('[Yandex.Metrika] Очередь существует:', queueExists)
        console.warn('[Yandex.Metrika] ym:', typeof (window as any).ym)
        clearInterval(monitor)
      }
    }, 100)

    return () => {
      clearInterval(monitor)
    }
  }, [metrikaId])

  return null
}
