-- AlterTable
ALTER TABLE "inbound_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
