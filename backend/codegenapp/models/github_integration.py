"""
GitHub integration models for CI/CD flow management.

Defines models for managing GitHub integrations, pull requests,
and webhook events within the CI/CD workflow system.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional
from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class PullRequestStatus(Enum):
    """Status enumeration for pull requests."""
    OPEN = "open"
    CLOSED = "closed"
    MERGED = "merged"
    DRAFT = "draft"


class WebhookEventType(Enum):
    """Type enumeration for GitHub webhook events."""
    PULL_REQUEST_OPENED = "pull_request.opened"
    PULL_REQUEST_UPDATED = "pull_request.synchronize"
    PULL_REQUEST_CLOSED = "pull_request.closed"
    PULL_REQUEST_MERGED = "pull_request.merged"
    PUSH = "push"
    ISSUE_COMMENT = "issue_comment"


class GitHubIntegration(Base):
    """
    GitHub integration configuration for projects.
    
    Manages GitHub App installation details, webhook configurations,
    and authentication credentials for project repositories.
    """
    __tablename__ = "github_integrations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    
    # GitHub Configuration
    github_app_id = Column(String(255))
    installation_id = Column(String(255))
    repository_id = Column(String(255))
    repository_full_name = Column(String(255))  # owner/repo
    
    # Webhook Configuration
    webhook_id = Column(String(255))
    webhook_secret = Column(String(255))
    webhook_events = Column(JSON, default=[
        "pull_request",
        "push",
        "issue_comment"
    ])
    
    # Authentication
    access_token = Column(Text)  # Encrypted GitHub access token
    token_expires_at = Column(DateTime)
    
    # Settings
    auto_merge_enabled = Column(Boolean, default=True)
    status_checks_enabled = Column(Boolean, default=True)
    required_reviews = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_webhook_received = Column(DateTime)
    
    # Relationships
    project = relationship("Project", back_populates="github_integration")
    pull_requests = relationship("PullRequest", back_populates="github_integration")

    def to_dict(self) -> Dict[str, Any]:
        """Convert GitHub integration to dictionary representation."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "repository_full_name": self.repository_full_name,
            "webhook_events": self.webhook_events,
            "auto_merge_enabled": self.auto_merge_enabled,
            "status_checks_enabled": self.status_checks_enabled,
            "required_reviews": self.required_reviews,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_webhook_received": self.last_webhook_received.isoformat() if self.last_webhook_received else None,
        }

    def is_token_valid(self) -> bool:
        """Check if the GitHub access token is still valid."""
        if not self.token_expires_at:
            return True  # Assume valid if no expiration set
        return datetime.utcnow() < self.token_expires_at


class PullRequest(Base):
    """
    Pull request entity for tracking GitHub PRs.
    
    Manages pull request lifecycle, validation status,
    and integration with the CI/CD pipeline.
    """
    __tablename__ = "pull_requests"

    id = Column(String, primary_key=True)  # GitHub PR ID
    github_integration_id = Column(Integer, ForeignKey("github_integrations.id"), nullable=False)
    
    # GitHub PR Information
    number = Column(Integer, nullable=False)
    title = Column(String(500))
    description = Column(Text)
    author = Column(String(255))
    
    # Branch Information
    head_branch = Column(String(255))
    base_branch = Column(String(255))
    head_sha = Column(String(255))
    
    # Status
    status = Column(SQLEnum(PullRequestStatus), default=PullRequestStatus.OPEN)
    is_draft = Column(Boolean, default=False)
    mergeable = Column(Boolean)
    
    # Validation Status
    validation_required = Column(Boolean, default=True)
    validation_passed = Column(Boolean)
    auto_merge_eligible = Column(Boolean, default=False)
    
    # GitHub URLs
    html_url = Column(String(500))
    diff_url = Column(String(500))
    patch_url = Column(String(500))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    github_created_at = Column(DateTime)
    github_updated_at = Column(DateTime)
    merged_at = Column(DateTime)
    closed_at = Column(DateTime)
    
    # Relationships
    github_integration = relationship("GitHubIntegration", back_populates="pull_requests")
    validation_pipeline = relationship("ValidationPipeline", back_populates="pull_request", uselist=False)

    def to_dict(self) -> Dict[str, Any]:
        """Convert pull request to dictionary representation."""
        return {
            "id": self.id,
            "number": self.number,
            "title": self.title,
            "description": self.description,
            "author": self.author,
            "head_branch": self.head_branch,
            "base_branch": self.base_branch,
            "head_sha": self.head_sha,
            "status": self.status.value if self.status else None,
            "is_draft": self.is_draft,
            "mergeable": self.mergeable,
            "validation_required": self.validation_required,
            "validation_passed": self.validation_passed,
            "auto_merge_eligible": self.auto_merge_eligible,
            "html_url": self.html_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "github_created_at": self.github_created_at.isoformat() if self.github_created_at else None,
            "github_updated_at": self.github_updated_at.isoformat() if self.github_updated_at else None,
            "merged_at": self.merged_at.isoformat() if self.merged_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
        }

    def can_auto_merge(self) -> bool:
        """Check if the pull request can be automatically merged."""
        return (self.status == PullRequestStatus.OPEN and
                not self.is_draft and
                self.mergeable and
                self.validation_passed and
                self.auto_merge_eligible)

    def requires_validation(self) -> bool:
        """Check if the pull request requires validation."""
        return (self.validation_required and 
                not self.validation_passed and
                self.status == PullRequestStatus.OPEN)
