/**
 * Cloudflare Worker - GitHub Webhook Gateway
 * 
 * This worker handles GitHub webhooks and forwards them to the codegenApp backend.
 * Deployed at: https://webhook-gateway.pixeliumperfecto.workers.dev
 */

// Environment variables (set in Cloudflare Workers dashboard)
// GITHUB_WEBHOOK_SECRET - Secret for verifying GitHub webhook signatures
// BACKEND_URL - URL of the codegenApp backend
// API_KEY - API key for authenticating with the backend

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORS()
  }

  // Only handle POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Verify GitHub webhook signature
    const signature = request.headers.get('x-hub-signature-256')
    const event = request.headers.get('x-github-event')
    const delivery = request.headers.get('x-github-delivery')
    
    if (!signature || !event || !delivery) {
      return new Response('Missing required headers', { status: 400 })
    }

    // Get request body
    const body = await request.text()
    
    // Verify signature
    const isValid = await verifySignature(body, signature, GITHUB_WEBHOOK_SECRET)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    // Parse webhook payload
    const payload = JSON.parse(body)
    
    // Log webhook event
    console.log(`Received GitHub webhook: ${event} (${delivery})`)
    console.log(`Repository: ${payload.repository?.full_name}`)
    
    // Filter events we care about
    const relevantEvents = ['push', 'pull_request', 'pull_request_review', 'issues']
    if (!relevantEvents.includes(event)) {
      console.log(`Ignoring event type: ${event}`)
      return new Response('Event ignored', { status: 200 })
    }

    // Filter repositories we care about
    const targetRepos = ['grainchain', 'codegenapp']
    const repoName = payload.repository?.name?.toLowerCase()
    if (!targetRepos.some(target => repoName?.includes(target))) {
      console.log(`Ignoring repository: ${repoName}`)
      return new Response('Repository ignored', { status: 200 })
    }

    // Process the webhook
    const processedEvent = await processWebhookEvent(event, payload)
    
    // Forward to backend
    const backendResponse = await forwardToBackend(processedEvent)
    
    // Return success response
    return new Response(JSON.stringify({
      status: 'success',
      event: event,
      delivery: delivery,
      repository: payload.repository?.full_name,
      processed: processedEvent.type,
      backend_status: backendResponse.status
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({
      status: 'error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    })
  }
}

async function verifySignature(body, signature, secret) {
  if (!secret) {
    console.warn('No webhook secret configured, skipping signature verification')
    return true
  }

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
    const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

async function processWebhookEvent(event, payload) {
  const baseEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    github_event: event,
    github_delivery: payload.delivery || 'unknown',
    repository: {
      name: payload.repository?.name,
      full_name: payload.repository?.full_name,
      owner: payload.repository?.owner?.login,
      private: payload.repository?.private,
      html_url: payload.repository?.html_url
    }
  }

  switch (event) {
    case 'push':
      return {
        ...baseEvent,
        type: 'push',
        data: {
          ref: payload.ref,
          before: payload.before,
          after: payload.after,
          commits: payload.commits?.map(commit => ({
            id: commit.id,
            message: commit.message,
            author: commit.author,
            url: commit.url,
            added: commit.added,
            removed: commit.removed,
            modified: commit.modified
          })),
          head_commit: payload.head_commit ? {
            id: payload.head_commit.id,
            message: payload.head_commit.message,
            author: payload.head_commit.author,
            url: payload.head_commit.url
          } : null,
          pusher: payload.pusher,
          sender: payload.sender
        }
      }

    case 'pull_request':
      return {
        ...baseEvent,
        type: 'pull_request',
        data: {
          action: payload.action,
          number: payload.number,
          pull_request: {
            id: payload.pull_request.id,
            number: payload.pull_request.number,
            title: payload.pull_request.title,
            body: payload.pull_request.body,
            state: payload.pull_request.state,
            html_url: payload.pull_request.html_url,
            head: {
              ref: payload.pull_request.head.ref,
              sha: payload.pull_request.head.sha,
              repo: payload.pull_request.head.repo ? {
                name: payload.pull_request.head.repo.name,
                full_name: payload.pull_request.head.repo.full_name
              } : null
            },
            base: {
              ref: payload.pull_request.base.ref,
              sha: payload.pull_request.base.sha,
              repo: {
                name: payload.pull_request.base.repo.name,
                full_name: payload.pull_request.base.repo.full_name
              }
            },
            user: payload.pull_request.user,
            created_at: payload.pull_request.created_at,
            updated_at: payload.pull_request.updated_at
          },
          sender: payload.sender
        }
      }

    case 'pull_request_review':
      return {
        ...baseEvent,
        type: 'pull_request_review',
        data: {
          action: payload.action,
          pull_request: {
            id: payload.pull_request.id,
            number: payload.pull_request.number,
            title: payload.pull_request.title,
            html_url: payload.pull_request.html_url
          },
          review: {
            id: payload.review.id,
            state: payload.review.state,
            body: payload.review.body,
            html_url: payload.review.html_url,
            user: payload.review.user
          },
          sender: payload.sender
        }
      }

    case 'issues':
      return {
        ...baseEvent,
        type: 'issues',
        data: {
          action: payload.action,
          issue: {
            id: payload.issue.id,
            number: payload.issue.number,
            title: payload.issue.title,
            body: payload.issue.body,
            state: payload.issue.state,
            html_url: payload.issue.html_url,
            user: payload.issue.user,
            labels: payload.issue.labels,
            assignees: payload.issue.assignees
          },
          sender: payload.sender
        }
      }

    default:
      return {
        ...baseEvent,
        type: 'unknown',
        data: payload
      }
  }
}

async function forwardToBackend(processedEvent) {
  const backendUrl = BACKEND_URL || 'http://localhost:3001'
  const endpoint = `${backendUrl}/api/webhooks/github`
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Webhook-Source': 'cloudflare-worker',
        'X-Webhook-Version': '1.0'
      },
      body: JSON.stringify(processedEvent)
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`)
    }

    return {
      status: response.status,
      success: true
    }
  } catch (error) {
    console.error('Failed to forward to backend:', error)
    return {
      status: 500,
      success: false,
      error: error.message
    }
  }
}

function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders()
  })
}

function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256',
    'Access-Control-Max-Age': '86400'
  }
}

// Health check endpoint
addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  
  if (url.pathname === '/health') {
    event.respondWith(new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      worker: 'webhook-gateway'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...getCORSHeaders()
      }
    }))
  }
})

