import * as TaskManager from 'expo-task-manager'

import { handleResponse, type Response } from './respond'
import { NOTIFICATION_TASK } from './schedule'

/**
 * The payload Android hands the task for an action tap is not documented, so
 * it is treated as unknown and searched for the shape a response has. Anything
 * else is ignored rather than guessed at.
 */
function asResponse(value: unknown): Response | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>

  if (typeof record.actionIdentifier === 'string' && typeof record.notification === 'object') {
    const notification = record.notification as Record<string, unknown> | null
    const request = notification?.request as Record<string, unknown> | undefined
    const content = request?.content as Record<string, unknown> | undefined
    if (request && content && typeof request.identifier === 'string') {
      return {
        actionIdentifier: record.actionIdentifier,
        notification: {
          request: {
            identifier: request.identifier,
            content: {
              title: typeof content.title === 'string' ? content.title : null,
              body: typeof content.body === 'string' ? content.body : null,
              data: content.data,
            },
          },
        },
      }
    }
  }

  // The response may be wrapped one level down.
  for (const nested of Object.values(record)) {
    const found = asResponse(nested)
    if (found) return found
  }
  return null
}

// Registered at module scope because TaskManager requires it, and guarded
// because this file sits in the root layout's import chain.
try {
  TaskManager.defineTask(NOTIFICATION_TASK, async ({ data, error }) => {
    if (error) return
    const response = asResponse(data)
    if (response) await handleResponse(response, false)
  })
} catch {
  // Background responses are unavailable; taps are answered on the next open.
}
