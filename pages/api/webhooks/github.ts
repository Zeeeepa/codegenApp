import { NextApiRequest, NextApiResponse } from 'next';
import { verifyWebhookSignature } from '../../../lib/github-app';
import { WebhookEvent } from '@octokit/webhooks-types';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the signature from headers
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Get event type
    const eventType = req.headers['x-github-event'] as string;
    const event = req.body as WebhookEvent;

    console.log(`Received GitHub webhook: ${eventType}`);

    // Process different event types
    switch (eventType) {
      case 'repository':
        await handleRepositoryEvent(event as any);
        break;
      case 'push':
        await handlePushEvent(event as any);
        break;
      case 'pull_request':
        await handlePullRequestEvent(event as any);
        break;
      case 'issues':
        await handleIssuesEvent(event as any);
        break;
      case 'release':
        await handleReleaseEvent(event as any);
        break;
      case 'star':
        await handleStarEvent(event as any);
        break;
      case 'fork':
        await handleForkEvent(event as any);
        break;
      case 'installation':
        await handleInstallationEvent(event as any);
        break;
      case 'installation_repositories':
        await handleInstallationRepositoriesEvent(event as any);
        break;
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Event handlers
async function handleRepositoryEvent(event: any) {
  const { action, repository } = event;
  console.log(`Repository ${action}: ${repository.full_name}`);
  
  // Handle repository events (created, deleted, archived, etc.)
  switch (action) {
    case 'created':
      // Handle new repository creation
      break;
    case 'deleted':
      // Handle repository deletion
      break;
    case 'archived':
      // Handle repository archival
      break;
    case 'unarchived':
      // Handle repository unarchival
      break;
    case 'publicized':
      // Handle repository made public
      break;
    case 'privatized':
      // Handle repository made private
      break;
  }
}

async function handlePushEvent(event: any) {
  const { repository, pusher, commits } = event;
  console.log(`Push to ${repository.full_name} by ${pusher.name}: ${commits.length} commits`);
  
  // Handle push events
  // You can analyze commits, trigger builds, update statistics, etc.
}

async function handlePullRequestEvent(event: any) {
  const { action, pull_request, repository } = event;
  console.log(`Pull request ${action}: ${repository.full_name}#${pull_request.number}`);
  
  // Handle pull request events
  switch (action) {
    case 'opened':
      // Handle new pull request
      break;
    case 'closed':
      // Handle closed pull request
      if (pull_request.merged) {
        // Handle merged pull request
      }
      break;
    case 'synchronize':
      // Handle pull request updates
      break;
    case 'review_requested':
      // Handle review requests
      break;
  }
}

async function handleIssuesEvent(event: any) {
  const { action, issue, repository } = event;
  console.log(`Issue ${action}: ${repository.full_name}#${issue.number}`);
  
  // Handle issue events
  switch (action) {
    case 'opened':
      // Handle new issue
      break;
    case 'closed':
      // Handle closed issue
      break;
    case 'reopened':
      // Handle reopened issue
      break;
    case 'labeled':
      // Handle issue labeling
      break;
    case 'assigned':
      // Handle issue assignment
      break;
  }
}

async function handleReleaseEvent(event: any) {
  const { action, release, repository } = event;
  console.log(`Release ${action}: ${repository.full_name} - ${release.tag_name}`);
  
  // Handle release events
  switch (action) {
    case 'published':
      // Handle new release
      break;
    case 'unpublished':
      // Handle unpublished release
      break;
    case 'created':
      // Handle draft release creation
      break;
    case 'edited':
      // Handle release edit
      break;
    case 'deleted':
      // Handle release deletion
      break;
  }
}

async function handleStarEvent(event: any) {
  const { action, repository, sender } = event;
  console.log(`Repository ${action === 'created' ? 'starred' : 'unstarred'}: ${repository.full_name} by ${sender.login}`);
  
  // Handle star events
  // Update repository statistics, notify maintainers, etc.
}

async function handleForkEvent(event: any) {
  const { forkee, repository } = event;
  console.log(`Repository forked: ${repository.full_name} -> ${forkee.full_name}`);
  
  // Handle fork events
  // Update repository statistics, track forks, etc.
}

async function handleInstallationEvent(event: any) {
  const { action, installation, repositories } = event;
  console.log(`Installation ${action}: ${installation.id}`);
  
  // Handle app installation events
  switch (action) {
    case 'created':
      // Handle new installation
      console.log(`App installed on ${repositories?.length || 0} repositories`);
      break;
    case 'deleted':
      // Handle installation removal
      console.log('App installation removed');
      break;
    case 'suspend':
      // Handle installation suspension
      break;
    case 'unsuspend':
      // Handle installation unsuspension
      break;
  }
}

async function handleInstallationRepositoriesEvent(event: any) {
  const { action, installation, repositories_added, repositories_removed } = event;
  console.log(`Installation repositories ${action}: ${installation.id}`);
  
  // Handle repository access changes
  if (repositories_added?.length > 0) {
    console.log(`Added repositories: ${repositories_added.map((r: any) => r.full_name).join(', ')}`);
  }
  
  if (repositories_removed?.length > 0) {
    console.log(`Removed repositories: ${repositories_removed.map((r: any) => r.full_name).join(', ')}`);
  }
}

// Disable body parsing for webhook verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

