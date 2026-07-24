-- CreateTable
CREATE TABLE "BlockedDay" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDay_date_key" ON "BlockedDay"("date");
