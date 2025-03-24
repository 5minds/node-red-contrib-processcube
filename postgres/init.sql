CREATE USER engine_user with password 'enigne_password';
CREATE DATABASE engine_db;
GRANT ALL PRIVILEGES ON DATABASE engine_db TO engine_user;

\connect engine_db;

-- Berechtigungen erteilen
GRANT CREATE ON SCHEMA public TO engine_user;

-- Eigentümer des Schemas ändern
ALTER SCHEMA public OWNER TO engine_user;


