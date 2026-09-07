function baseUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
}

function decodeValue(value = {}) {
  if ('stringValue' in value) return value.stringValue
  if ('booleanValue' in value) return value.booleanValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue)
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {})
  return null
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function encodeValue(value) {
  if (value == null) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (typeof value === 'object') return { mapValue: { fields: encodeFields(value) } }
  return { stringValue: String(value) }
}

function encodeFields(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encodeValue(value)]))
}

export async function getDocument(projectId, path, token) {
  const response = await fetch(`${baseUrl(projectId)}/${path}`, { headers: { authorization: `Bearer ${token}` } })
  if (response.status === 404) return null
  if (!response.ok) throw Object.assign(new Error(`Firestore read failed (${response.status})`), { status: response.status })
  const document = await response.json()
  return { name: document.name, ...decodeFields(document.fields) }
}

export async function patchDocument(projectId, path, data, token) {
  const masks = Object.keys(data).map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&')
  const response = await fetch(`${baseUrl(projectId)}/${path}?${masks}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: encodeFields(data) }),
  })
  if (!response.ok) throw Object.assign(new Error(`Firestore update failed (${response.status})`), { status: response.status })
  return response.json()
}
