-- PeerPrep Database Initialization
-- This script creates databases for services that need them in development environment
-- Currently configured for: Question Service

-- =============================================================================
-- CREATE DEVELOPMENT DATABASES
-- =============================================================================

-- Question Service Databases
CREATE DATABASE peerprep_questions_dev;
CREATE DATABASE peerprep_questions_dev_test;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Question Service
GRANT ALL PRIVILEGES ON DATABASE peerprep_questions_dev TO peerprep;
GRANT ALL PRIVILEGES ON DATABASE peerprep_questions_dev_test TO peerprep;

-- =============================================================================
-- INSTALL USEFUL EXTENSIONS IN EACH DATABASE
-- =============================================================================

-- Question Service Extensions
\c peerprep_questions_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- For question search
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- For JSON indexing

\c peerprep_questions_dev_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
