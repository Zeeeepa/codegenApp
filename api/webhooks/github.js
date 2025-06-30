/**
 * GitHub Webhook Processing
 * Handles incoming GitHub webhook events with signature verification
 */

const crypto = require('crypto');
const logger = require('../logger');
const gitHubAppClient = require('../github-app');

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload, signature, secret) {
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  const expectedSignatureWithPrefix = `sha256=${expectedSignature}`;

  // Use timingSafeEqual to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignatureWithPrefix, 'utf8');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Process GitHub webhook events
 */
async function processGitHubWebhook(req, res) {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];
    const payload = JSON.stringify(req.body);

    logger.info('GitHub webhook received', {
      event,
      deliveryId,
      signature: !!signature,
      payloadSize: payload.length
    });

    // Verify webhook signature
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('GitHub webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!verifyGitHubSignature(payload, signature, webhookSecret)) {
      logger.error('Invalid GitHub webhook signature', {
        event,
        deliveryId,
        signature
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process the webhook event
    const eventData = req.body;
    await handleWebhookEvent(event, eventData, deliveryId);

    res.status(200).json({ success: true, event, deliveryId });

  } catch (error) {
    logger.error('GitHub webhook processing error', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle specific webhook events
 */
async function handleWebhookEvent(event, data, deliveryId) {
  logger.info('Processing GitHub webhook event', {
    event,
    deliveryId,
    repository: data.repository?.full_name,
    action: data.action
  });

  switch (event) {
    case 'installation':
      await handleInstallationEvent(data, deliveryId);
      break;
    
    case 'installation_repositories':
      await handleInstallationRepositoriesEvent(data, deliveryId);
      break;
    
    case 'push':
      await handlePushEvent(data, deliveryId);
      break;
    
    case 'pull_request':
      await handlePullRequestEvent(data, deliveryId);
      break;
    
    case 'issues':
      await handleIssuesEvent(data, deliveryId);
      break;
    
    case 'repository':
      await handleRepositoryEvent(data, deliveryId);
      break;
    
    case 'release':
      await handleReleaseEvent(data, deliveryId);
      break;
    
    default:
      logger.info('Unhandled webhook event', { event, deliveryId });
  }
}

/**
 * Handle installation events (app installed/uninstalled)
 */
async function handleInstallationEvent(data, deliveryId) {
  const { action, installation, repositories } = data;
  
  logger.info('GitHub App installation event', {
    action,
    installationId: installation.id,
    account: installation.account.login,
    repositoryCount: repositories?.length || 0,
    deliveryId
  });

  switch (action) {
    case 'created':
      logger.info('GitHub App installed', {
        installationId: installation.id,
        account: installation.account.login,
        repositories: repositories?.map(repo => repo.full_name) || []
      });
      break;
    
    case 'deleted':
      logger.info('GitHub App uninstalled', {
        installationId: installation.id,
        account: installation.account.login
      });
      break;
    
    case 'suspend':
      logger.info('GitHub App installation suspended', {
        installationId: installation.id,
        account: installation.account.login
      });
      break;
    
    case 'unsuspend':
      logger.info('GitHub App installation unsuspended', {
        installationId: installation.id,
        account: installation.account.login
      });
      break;
  }
}

/**
 * Handle installation repositories events (repositories added/removed)
 */
async function handleInstallationRepositoriesEvent(data, deliveryId) {
  const { action, installation, repositories_added, repositories_removed } = data;
  
  logger.info('GitHub App installation repositories event', {
    action,
    installationId: installation.id,
    repositoriesAdded: repositories_added?.length || 0,
    repositoriesRemoved: repositories_removed?.length || 0,
    deliveryId
  });

  if (repositories_added?.length > 0) {
    logger.info('Repositories added to installation', {
      installationId: installation.id,
      repositories: repositories_added.map(repo => repo.full_name)
    });
  }

  if (repositories_removed?.length > 0) {
    logger.info('Repositories removed from installation', {
      installationId: installation.id,
      repositories: repositories_removed.map(repo => repo.full_name)
    });
  }
}

/**
 * Handle push events
 */
async function handlePushEvent(data, deliveryId) {
  const { repository, pusher, commits, ref } = data;
  
  logger.info('GitHub push event', {
    repository: repository.full_name,
    pusher: pusher.name,
    commitCount: commits.length,
    ref,
    deliveryId
  });

  // Log commit details
  commits.forEach(commit => {
    logger.info('Push commit', {
      repository: repository.full_name,
      sha: commit.id,
      message: commit.message,
      author: commit.author.name,
      timestamp: commit.timestamp
    });
  });
}

/**
 * Handle pull request events
 */
async function handlePullRequestEvent(data, deliveryId) {
  const { action, pull_request, repository } = data;
  
  logger.info('GitHub pull request event', {
    action,
    repository: repository.full_name,
    prNumber: pull_request.number,
    prTitle: pull_request.title,
    author: pull_request.user.login,
    deliveryId
  });

  switch (action) {
    case 'opened':
      logger.info('Pull request opened', {
        repository: repository.full_name,
        prNumber: pull_request.number,
        title: pull_request.title,
        author: pull_request.user.login
      });
      break;
    
    case 'closed':
      logger.info('Pull request closed', {
        repository: repository.full_name,
        prNumber: pull_request.number,
        merged: pull_request.merged,
        author: pull_request.user.login
      });
      break;
    
    case 'synchronize':
      logger.info('Pull request synchronized', {
        repository: repository.full_name,
        prNumber: pull_request.number,
        author: pull_request.user.login
      });
      break;
  }
}

/**
 * Handle issues events
 */
async function handleIssuesEvent(data, deliveryId) {
  const { action, issue, repository } = data;
  
  logger.info('GitHub issues event', {
    action,
    repository: repository.full_name,
    issueNumber: issue.number,
    issueTitle: issue.title,
    author: issue.user.login,
    deliveryId
  });

  switch (action) {
    case 'opened':
      logger.info('Issue opened', {
        repository: repository.full_name,
        issueNumber: issue.number,
        title: issue.title,
        author: issue.user.login
      });
      break;
    
    case 'closed':
      logger.info('Issue closed', {
        repository: repository.full_name,
        issueNumber: issue.number,
        author: issue.user.login
      });
      break;
  }
}

/**
 * Handle repository events
 */
async function handleRepositoryEvent(data, deliveryId) {
  const { action, repository } = data;
  
  logger.info('GitHub repository event', {
    action,
    repository: repository.full_name,
    deliveryId
  });
}

/**
 * Handle release events
 */
async function handleReleaseEvent(data, deliveryId) {
  const { action, release, repository } = data;
  
  logger.info('GitHub release event', {
    action,
    repository: repository.full_name,
    releaseTag: release.tag_name,
    releaseName: release.name,
    author: release.author.login,
    deliveryId
  });
}

module.exports = {
  processGitHubWebhook,
  verifyGitHubSignature,
  handleWebhookEvent
};
