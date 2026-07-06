const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function handleResponse(res, fallbackMsg) {
  if (!res.ok) {
    let detail = fallbackMsg
    try {
      const body = await res.json()
      if (body.detail) detail = body.detail
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

export async function startStory({ player_name, original_setting, companion }) {
  const res = await fetch(`${BASE_URL}/story/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_name, original_setting, companion }),
  })
  return handleResponse(res, 'Failed to start story')
}

export async function continueStory({ session_id, chosen_option }) {
  const res = await fetch(`${BASE_URL}/story/continue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, chosen_option }),
  })
  return handleResponse(res, 'Failed to continue story')
}

export async function getStorySummary({ session_id }) {
  const res = await fetch(`${BASE_URL}/story/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id }),
  })
  return handleResponse(res, 'Failed to generate summary')
}
