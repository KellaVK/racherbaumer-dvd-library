export function getBearerToken(request) {
  const header = request.headers.get('authorization') || ''
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

export function requireBearerToken(request) {
  const token = getBearerToken(request)
  if (!token) {
    const error = new Error('Sign in is required.')
    error.status = 401
    throw error
  }
  return token
}
