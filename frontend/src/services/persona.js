import Persona from 'persona'
import { api } from './api.js'

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

async function refreshPersonaStatus(attempts = 4) {
  let result = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt) await wait(750)
    result = await api.post('/persona/inquiries')
    if (result.verified || ['declined', 'failed'].includes(result.status)) break
  }
  return result
}

export async function openPersonaVerification() {
  const inquiry = await api.post('/persona/inquiries')
  if (inquiry.verified || !inquiry.launchable) return inquiry

  return new Promise((resolve, reject) => {
    let client
    const finish = (result) => {
      client?.destroy()
      resolve(result)
    }

    const config = {
      inquiryId: inquiry.inquiryId,
      environmentId: inquiry.environmentId,
      onReady: () => client.open(),
      onComplete: async () => {
        try {
          finish(await refreshPersonaStatus())
        } catch (error) {
          client?.destroy()
          reject(error)
        }
      },
      onCancel: () => finish({ ...inquiry, cancelled: true }),
      onError: (error) => {
        client?.destroy()
        reject(new Error(error?.message || 'Persona verification could not be opened.'))
      },
    }
    if (inquiry.sessionToken) config.sessionToken = inquiry.sessionToken
    client = new Persona.Client(config)
  })
}
