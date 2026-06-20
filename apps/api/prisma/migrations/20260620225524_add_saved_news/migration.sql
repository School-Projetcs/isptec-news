-- CreateTable
CREATE TABLE "SavedNews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedNews_userId_idx" ON "SavedNews"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedNews_userId_newsId_key" ON "SavedNews"("userId", "newsId");

-- AddForeignKey
ALTER TABLE "SavedNews" ADD CONSTRAINT "SavedNews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedNews" ADD CONSTRAINT "SavedNews_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;
