/*
  Warnings:

  - You are about to drop the `QuoteItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `price` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `eventDate` on the `Quote` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "QuoteItem";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "spec" TEXT,
    "price1to3" INTEGER NOT NULL DEFAULT 0,
    "price4to7" INTEGER NOT NULL DEFAULT 0,
    "price8to10" INTEGER NOT NULL DEFAULT 0,
    "price11to14" INTEGER NOT NULL DEFAULT 0,
    "price15to20" INTEGER NOT NULL DEFAULT 0,
    "price21to31" INTEGER NOT NULL DEFAULT 0,
    "priceOver1M" INTEGER NOT NULL DEFAULT 0,
    "imagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Item" ("category", "code", "createdAt", "id", "imagePath", "name", "spec") SELECT "category", "code", "createdAt", "id", "imagePath", "name", "spec" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");
CREATE TABLE "new_Quote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientName" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Quote" ("clientName", "createdAt", "eventName", "id", "totalAmount") SELECT "clientName", "createdAt", "eventName", "id", "totalAmount" FROM "Quote";
DROP TABLE "Quote";
ALTER TABLE "new_Quote" RENAME TO "Quote";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
