-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "assigned_to_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "leads_tenant_id_assigned_to_user_id_idx" ON "leads"("tenant_id", "assigned_to_user_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "leads_tenant_id_phone_key" ON "leads"("tenant_id", "phone");

-- CreateIndex
CREATE INDEX "messages_lead_id_created_at_idx" ON "messages"("lead_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_tenant_id_idx" ON "messages"("tenant_id");

-- CreateIndex
CREATE INDEX "inbound_events_tenant_id_idx" ON "inbound_events"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_events_tenant_id_message_id_key" ON "inbound_events"("tenant_id", "message_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_events" ADD CONSTRAINT "inbound_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
