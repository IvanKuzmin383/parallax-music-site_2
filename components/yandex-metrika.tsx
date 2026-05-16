"use client"

import Script from "next/script"
import { useEffect } from "react"

interface YandexMetrikaProps {
  ymid: string | undefined
}

export function YandexMetrika({ ymid }: YandexMetrikaProps) {
  // Проверяем, что ID валидный (число)
  const isValidId = ymid && /^\d+$/.test(String(ymid).trim())

  useEffect(() => {
    // Проверяем, что компонент смонтирован
    if (typeof window === 'undefined' || !document.head) {
      console.warn('[Yandex.Metrika] window или document.head недоступны')
      return
    }
    // Отладочная информация (всегда показываем для диагностики)
    if (!isValidId) {
      console.warn('[Yandex.Metrika] ID счетчика не найден или невалиден:', ymid)
      console.warn('[Yandex.Metrika] Тип ymid:', typeof ymid, 'Значение:', ymid)
      return
    }

    const metrikaId = String(ymid).trim()
    console.log('[Yandex.Metrika] Инициализация счетчика с ID:', metrikaId)

    // Проверяем, не добавлен ли уже скрипт загрузки
    const scriptUrl = `https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}`
    const existingScript = Array.from(document.scripts).find(
      (s) => s.src === scriptUrl || s.id === 'yandex-metrika-loader'
    )
    
    if (existingScript) {
      console.log('[Yandex.Metrika] Скрипт уже добавлен')
      // Если скрипт уже есть, но счетчик не инициализирован, инициализируем
      if (typeof (window as any).ym === 'function') {
        try {
          (window as any).ym(Number(metrikaId), 'init', {
            ssr: true,
            webvisor: true,
            clickmap: true,
            accurateTrackBounce: true,
            trackLinks: true,
          })
          console.log('[Yandex.Metrika] Счетчик инициализирован (повторная попытка)')
        } catch (error) {
          console.error('[Yandex.Metrika] Ошибка инициализации:', error)
        }
      }
      return
    }

    // Yandex.Metrika counter - точная копия кода от Яндекс
    // Выполняем код напрямую, а не через innerHTML
    try {
      console.log('[Yandex.Metrika] Начинаем добавление скрипта...')
      
      // Инициализируем объект ym
      ;(window as any).ym = (window as any).ym || function(...args: any[]) {
        ;((window as any).ym.a = (window as any).ym.a || []).push(args)
      }
      ;(window as any).ym.l = Number(new Date())
      
      // Проверяем, не добавлен ли уже скрипт с таким URL
      const scripts = Array.from(document.scripts)
      const alreadyExists = scripts.some((s) => s.src === scriptUrl)
      
      if (alreadyExists) {
        console.log('[Yandex.Metrika] Скрипт с таким URL уже существует')
      } else {
        // Создаем скрипт загрузки библиотеки
        const loaderScript = document.createElement('script')
        loaderScript.type = 'text/javascript'
        loaderScript.async = true
        loaderScript.src = scriptUrl
        loaderScript.id = 'yandex-metrika-loader'
        
        // Добавляем обработчики для отладки
        loaderScript.onload = () => {
          console.log('[Yandex.Metrika] Скрипт библиотеки загружен')
        }
        loaderScript.onerror = (error) => {
          console.error('[Yandex.Metrika] Ошибка загрузки скрипта библиотеки:', error)
        }
        
        // Добавляем скрипт в head
        if (document.head) {
          document.head.appendChild(loaderScript)
          console.log('[Yandex.Metrika] Скрипт загрузки добавлен в head, ID:', loaderScript.id)
          console.log('[Yandex.Metrika] URL скрипта:', scriptUrl)
        } else {
          console.error('[Yandex.Metrika] document.head не найден!')
        }
      }

      // Инициализируем счетчик после загрузки библиотеки
      // Используем несколько попыток для гарантии загрузки
      let attempts = 0
      const maxAttempts = 50 // 5 секунд максимум
      
      const initMetrika = () => {
        attempts++
        if (typeof (window as any).ym === 'function') {
          try {
            ;(window as any).ym(Number(metrikaId), 'init', {
              ssr: true,
              webvisor: true,
              clickmap: true,
              accurateTrackBounce: true,
              trackLinks: true,
            })
            console.log('[Yandex.Metrika] Счетчик инициализирован успешно')
          } catch (error) {
            console.error('[Yandex.Metrika] Ошибка инициализации:', error)
          }
        } else if (attempts < maxAttempts) {
          // Если библиотека еще не загружена, ждем и пробуем снова
          setTimeout(initMetrika, 100)
        } else {
          console.error('[Yandex.Metrika] Не удалось инициализировать счетчик: библиотека не загрузилась за', maxAttempts * 100, 'мс')
        }
      }

      // Пробуем инициализировать сразу, если библиотека уже загружена
      initMetrika()
      
    } catch (error) {
      console.error('[Yandex.Metrika] Ошибка при добавлении скрипта:', error)
    }
  }, [ymid, isValidId])

  if (!isValidId) {
    return null
  }

  const metrikaId = String(ymid).trim()
  const scriptUrl = `https://mc.yandex.ru/metrika/tag.js?id=${metrikaId}`

  return (
    <>
      {/* Загружаем библиотеку через Next.js Script */}
      <Script
        id="yandex-metrika-loader"
        src={scriptUrl}
        strategy="afterInteractive"
      />
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${metrikaId}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  )
}

