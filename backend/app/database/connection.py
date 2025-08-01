"""
Database connection and session management for CodegenApp.

Provides SQLAlchemy engine, session factory, and database
utilities for the CI/CD flow management system.
"""

import os
import logging
from typing import Generator, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://user:pass@localhost/codegenapp"
)

# Create SQLAlchemy engine with enhanced connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=os.getenv("DATABASE_DEBUG", "false").lower() == "true"
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


def get_database_session() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables."""
    # Import all models to ensure they're registered
    from ..models import (
        Project, ProjectSettings, AgentRun, ValidationPipeline, 
        ValidationStep, AuditLog, GitHubIntegration, PullRequest
    )
    
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all database tables."""
    Base.metadata.drop_all(bind=engine)


def reset_database():
    """Reset database by dropping and recreating all tables."""
    drop_tables()
    create_tables()


class DatabaseManager:
    """Enhanced database management utilities."""
    
    def __init__(self):
        self._initialized = False
    
    def initialize(self, database_url: Optional[str] = None) -> None:
        """Initialize database with custom URL if provided"""
        if database_url:
            global engine, SessionLocal
            engine = create_engine(
                database_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=os.getenv("DATABASE_DEBUG", "false").lower() == "true"
            )
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        self._initialized = True
        logger.info("Database initialized successfully")
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope around a series of operations"""
        session = SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    @staticmethod
    def health_check() -> bool:
        """
        Check database connectivity.
        
        Returns:
            bool: True if database is accessible, False otherwise
        """
        try:
            with engine.connect() as connection:
                connection.execute("SELECT 1")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    @staticmethod
    def get_connection_info() -> dict:
        """
        Get database connection information.
        
        Returns:
            dict: Connection details (without sensitive info)
        """
        url = engine.url
        return {
            "driver": url.drivername,
            "host": url.host,
            "port": url.port,
            "database": url.database,
            "username": url.username,
            "pool_size": engine.pool.size(),
            "checked_out": engine.pool.checkedout(),
        }
    
    @staticmethod
    def execute_raw_sql(sql: str, params: dict = None) -> list:
        """
        Execute raw SQL query.
        
        Args:
            sql: SQL query string
            params: Query parameters (optional)
            
        Returns:
            list: Query results
        """
        with engine.connect() as connection:
            result = connection.execute(sql, params or {})
            return result.fetchall()


# Database session dependency for FastAPI
def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for database sessions."""
    return get_database_session()
