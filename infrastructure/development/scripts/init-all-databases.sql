-- PeerPrep Database Initialization Script
-- Creates all databases needed for the microservices architecture

-- Question Service Databases
CREATE DATABASE peerprep_questions_dev;
CREATE DATABASE peerprep_questions_dev_test;
GRANT ALL PRIVILEGES ON DATABASE peerprep_questions_dev TO peerprep;
GRANT ALL PRIVILEGES ON DATABASE peerprep_questions_dev_test TO peerprep;

-- Uncomment when services are added
-- User Service Databases
-- CREATE DATABASE peerprep_users_dev;
-- CREATE DATABASE peerprep_users_dev_test;
-- GRANT ALL PRIVILEGES ON DATABASE peerprep_users_dev TO peerprep;
-- GRANT ALL PRIVILEGES ON DATABASE peerprep_users_dev_test TO peerprep;

-- Matching Service Databases
-- CREATE DATABASE peerprep_matching_dev;
-- CREATE DATABASE peerprep_matching_dev_test;
-- GRANT ALL PRIVILEGES ON DATABASE peerprep_matching_dev TO peerprep;
-- GRANT ALL PRIVILEGES ON DATABASE peerprep_matching_dev_test TO peerprep;

-- Collaboration Service Databases
-- CREATE DATABASE peerprep_collaboration_dev;
-- CREATE DATABASE peerprep_collaboration_dev_test;
-- GRANT ALL PRIVILEGES ON DATABASE peerprep_collaboration_dev TO peerprep;
-- GRANT ALL PRIVILEGES ON DATABASE peerprep_collaboration_dev_test TO peerprep;