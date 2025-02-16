/*
  Warnings:

  - You are about to drop the column `image` on the `user` table. All the data in the column will be lost.
  - You are about to alter the column `email` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - Added the required column `quantity` to the `Costume` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `costume` ADD COLUMN `quantity` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `image`,
    ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `picture` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NOT NULL,
    MODIFY `password` VARCHAR(191) NULL;
