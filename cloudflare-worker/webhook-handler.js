/**
 * Cloudflare Worker for handling GitHub webhooks
 * Receives GitHub webhook events and forwards them to CodegenApp
 */

// Environment variables (set in Cloudflare dashboard)
// CODEGENAPP_API_URL - URL of the main CodegenApp API
// WEBHOOK_SECRET - Secret for validating GitHub webhooks
// API_TOKEN - Token for authenticating with CodegenApp API

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Main request handler
 */
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
    // Validate GitHub webhook
    const isValid = await validateGitHubWebhook(request)
    if (!isValid) {
      console.log('Invalid webhook signature')
      return new Response('Unauthorized', { status: 401 })
    }

    // Parse webhook payload
    const payload = await request.json()
    const headers = Object.fromEntries(request.headers.entries())

    // Extract event information
    const eventType = headers['x-github-event']
    const deliveryId = headers['x-github-delivery']
    const action = payload.action

    console.log(`Received ${eventType} event with action: ${action}`)

    // Process webhook based on event type
    const result = await processWebhook({
      eventType,
      action,
      deliveryId,
      payload,
      headers
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

/**
 * Validate GitHub webhook signature
 */
async function validateGitHubWebhook(request) {
  const signature = request.headers.get('x-hub-signature-256')
  if (!signature) {
    return false
  }

  const secret = WEBHOOK_SECRET
  if (!secret) {
    console.warn('WEBHOOK_SECRET not configured')
    return true // Skip validation if no secret configured
  }

  const body = await request.clone().text()
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
}

/**
 * Process webhook based on event type
 */
async function processWebhook({ eventType, action, deliveryId, payload, headers }) {
  const result = {
    processed: false,
    forwarded: false,
    eventType,
    action,
    deliveryId
  }

  // Handle different event types
  switch (eventType) {
    case 'pull_request':
      result.processed = await handlePullRequestEvent(payload, action)
      break
    
    case 'pull_request_review':
      result.processed = await handlePullRequestReviewEvent(payload, action)
      break
    
    case 'push':
      result.processed = await handlePushEvent(payload)
      break
    
    case 'ping':
      result.processed = true
      result.message = 'Webhook ping received'
      break
    
    default:
      console.log(`Unhandled event type: ${eventType}`)
      result.message = `Event type ${eventType} not handled`
  }

  // Forward to CodegenApp API if processed
  if (result.processed) {
    result.forwarded = await forwardToCodegenApp({
      eventType,
      action,
      deliveryId,
      payload,
      headers: {
        'x-github-event': eventType,
        'x-github-delivery': deliveryId,
        'x-github-hook-id': headers['x-github-hook-id']
      }
    })
  }

  return result
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(payload, action) {
  const validActions = ['opened', 'closed', 'synchronize', 'reopened', 'edited']
  
  if (!validActions.includes(action)) {
    console.log(`Ignoring PR action: ${action}`)
    return false
  }

  const pr = payload.pull_request
  const repository = payload.repository

  console.log(`Processing PR #${pr.number} (${action}) in ${repository.full_name}`)

  // Extract relevant information
  const prInfo = {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    action: action,
    url: pr.html_url,
    branch: pr.head.ref,
    base_branch: pr.base.ref,
    commit_sha: pr.head.sha,
    repository: {
      name: repository.name,
      full_name: repository.full_name,
      owner: repository.owner.login
    },
    author: {
      login: pr.user.login,
      avatar_url: pr.user.avatar_url
    },
    created_at: pr.created_at,
    updated_at: pr.updated_at
  }

  // Store PR info for forwarding
  payload.processed_pr_info = prInfo

  return true
}

/**
 * Handle pull request review events
 */
async function handlePullRequestReviewEvent(payload, action) {
  const validActions = ['submitted', 'edited', 'dismissed']
  
  if (!validActions.includes(action)) {
    console.log(`Ignoring PR review action: ${action}`)
    return false
  }

  const review = payload.review
  const pr = payload.pull_request
  const repository = payload.repository

  console.log(`Processing PR review #${pr.number} (${action}) in ${repository.full_name}`)

  return true
}

/**
 * Handle push events
 */
async function handlePushEvent(payload) {
  const repository = payload.repository
  const ref = payload.ref
  const commits = payload.commits || []

  console.log(`Processing push to ${ref} in ${repository.full_name} (${commits.length} commits)`)

  // Only process pushes to main branches or specific branches
  const mainBranches = ['refs/heads/main', 'refs/heads/master', 'refs/heads/develop']
  if (!mainBranches.includes(ref)) {
    console.log(`Ignoring push to ${ref}`)
    return false
  }

  return true
}

/**
 * Forward webhook to CodegenApp API
 */
async function forwardToCodegenApp(webhookData) {
  const apiUrl = CODEGENAPP_API_URL
  const apiToken = API_TOKEN

  if (!apiUrl) {
    console.error('CODEGENAPP_API_URL not configured')
    return false
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken ? `Bearer ${apiToken}` : undefined,
        'User-Agent': 'CodegenApp-Webhook-Worker/1.0',
        ...webhookData.headers
      },
      body: JSON.stringify(webhookData)
    })

    if (!response.ok) {
      console.error(`Failed to forward webhook: ${response.status} ${response.statusText}`)
      return false
    }

    const result = await response.json()
    console.log('Webhook forwarded successfully:', result)
    return true

  } catch (error) {
    console.error('Error forwarding webhook:', error)
    return false
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256',
      'Access-Control-Max-Age': '86400'
    }
  })
}

/**
 * Health check endpoint
 */
async function handleHealthCheck() {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}

