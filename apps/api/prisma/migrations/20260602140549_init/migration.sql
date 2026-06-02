-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'READER');

-- CreateEnum
CREATE TYPE "NewsStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'READER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "status" "NewsStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "coverMediaId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADED',
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "ownerId" TEXT NOT NULL,
    "newsId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaVariant" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "codec" TEXT,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "compressionRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingMs" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "bitrateKbps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "News_coverMediaId_key" ON "News"("coverMediaId");

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaVariant" ADD CONSTRAINT "MediaVariant_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
