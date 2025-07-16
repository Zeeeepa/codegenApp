"""
Database connection and session management for CodegenApp.

Provides SQLAlchemy engine, session factory, and database
utilities for the CI/CD flow management system.
"""

import os
from typing import Generator
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://user:pass@localhost/codegenapp"
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
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
    """Database management utilities."""
    
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
        except Exception:
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

