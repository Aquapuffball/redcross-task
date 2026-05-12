-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('ALL', 'WOMEN', 'MEN');

-- CreateEnum
CREATE TYPE "ImmigrationReason" AS ENUM ('ALL', 'LABOR', 'FAMILY', 'REFUGEES_AND_FAMILY', 'UNDISCLOSED', 'EDUCATION_OR_OTHER');

-- CreateEnum
CREATE TYPE "ValueUnit" AS ENUM ('PERSONS', 'PERCENT');

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "county" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationBranch" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "branchNumber" TEXT,
    "organizationNumber" TEXT,
    "branchType" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "creationDate" TIMESTAMP(3) NOT NULL,
    "isTerminated" BOOLEAN NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "parentBranchId" TEXT,
    "parentBranchNumber" TEXT,
    "parentBranchName" TEXT,
    "parentBranchType" TEXT,
    "description" TEXT,
    "organizationLevel" TEXT,
    "locationMunicipality" TEXT,
    "county" TEXT,
    "region" TEXT,
    "postalAddressLine1" TEXT,
    "postalCode" TEXT,
    "postOffice" TEXT,
    "streetAddressLine1" TEXT,
    "streetPostalCode" TEXT,
    "streetPostOffice" TEXT,
    "municipalityId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "web" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchContact" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "role" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "isVolunteer" BOOLEAN,
    "isMember" BOOLEAN,
    "memberNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchActivity" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "globalActivityName" TEXT,
    "localActivityName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalityImmigrationStat" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "year" INTEGER NOT NULL,
    "immigrationReason" "ImmigrationReason" NOT NULL,
    "unit" "ValueUnit" NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalityImmigrationStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalityLeisureCenterStat" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL DEFAULT '12063',
    "municipalityId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "contentsCode" TEXT NOT NULL,
    "contentsLabel" TEXT,
    "value" DECIMAL(65,30),
    "status" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalityLeisureCenterStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_code_key" ON "Municipality"("code");

-- CreateIndex
CREATE INDEX "Municipality_name_idx" ON "Municipality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationBranch_branchId_key" ON "OrganizationBranch"("branchId");

-- CreateIndex
CREATE INDEX "OrganizationBranch_municipalityId_idx" ON "OrganizationBranch"("municipalityId");

-- CreateIndex
CREATE INDEX "BranchContact_branchId_idx" ON "BranchContact"("branchId");

-- CreateIndex
CREATE INDEX "BranchActivity_branchId_idx" ON "BranchActivity"("branchId");

-- CreateIndex
CREATE INDEX "MunicipalityImmigrationStat_municipalityId_year_idx" ON "MunicipalityImmigrationStat"("municipalityId", "year");

-- CreateIndex
CREATE INDEX "MunicipalityImmigrationStat_year_immigrationReason_unit_idx" ON "MunicipalityImmigrationStat"("year", "immigrationReason", "unit");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityImmigrationStat_municipalityId_year_gender_immi_key" ON "MunicipalityImmigrationStat"("municipalityId", "year", "gender", "immigrationReason", "unit");

-- CreateIndex
CREATE INDEX "MunicipalityLeisureCenterStat_year_contentsCode_idx" ON "MunicipalityLeisureCenterStat"("year", "contentsCode");

-- CreateIndex
CREATE INDEX "MunicipalityLeisureCenterStat_municipalityId_year_idx" ON "MunicipalityLeisureCenterStat"("municipalityId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityLeisureCenterStat_municipalityId_year_contentsC_key" ON "MunicipalityLeisureCenterStat"("municipalityId", "year", "contentsCode");

-- AddForeignKey
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_parentBranchId_fkey" FOREIGN KEY ("parentBranchId") REFERENCES "OrganizationBranch"("branchId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationBranch" ADD CONSTRAINT "OrganizationBranch_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchContact" ADD CONSTRAINT "BranchContact_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("branchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchActivity" ADD CONSTRAINT "BranchActivity_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "OrganizationBranch"("branchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityImmigrationStat" ADD CONSTRAINT "MunicipalityImmigrationStat_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityLeisureCenterStat" ADD CONSTRAINT "MunicipalityLeisureCenterStat_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;
