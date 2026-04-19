-- AI chat message persistence (one conversation per user per tenant)
CREATE TABLE "ai_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sqlQuery" TEXT,
    "resultData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_chat_messages_userId_tenantId_createdAt_idx"
    ON "ai_chat_messages"("userId", "tenantId", "createdAt");
