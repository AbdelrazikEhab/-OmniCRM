-- Run this as a superuser (e.g., 'postgres')
-- 1. Create the user if not exists
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'crm_user') THEN
      CREATE USER crm_user WITH PASSWORD 'crm_password';
   END IF;
END
$do$;

-- 2. Create the database
SELECT 'CREATE DATABASE crm_inbox'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'crm_inbox')\gexec

-- 3. Grant permissions
ALTER DATABASE crm_inbox OWNER TO crm_user;
GRANT ALL PRIVILEGES ON DATABASE crm_inbox TO crm_user;

-- 4. Connect to the database and grant schema permissions
\c crm_inbox
GRANT ALL ON SCHEMA public TO crm_user;
ALTER SCHEMA public OWNER TO crm_user;
