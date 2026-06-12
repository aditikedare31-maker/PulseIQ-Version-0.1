-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('DEMO', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('inactive', 'active', 'trialing');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('DEMO', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('stripe', 'razorpay');

-- CreateEnum
CREATE TYPE "VerificationCodeType" AS ENUM ('EMAIL_OTP', 'PHONE_OTP');

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workspace_type" "WorkspaceType" NOT NULL DEFAULT 'DEMO',
    "billing_status" "BillingStatus" NOT NULL DEFAULT 'inactive',
    "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'DEMO',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "trial_ends_at" TIMESTAMP(3),
    "payment_provider" "PaymentProvider",
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "razorpay_customer_id" TEXT,
    "razorpay_subscription_id" TEXT,
    "billing_phone_number" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "workspace_id" TEXT,
    "payload_hash" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceBillingTransition" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "from_subscription_status" "SubscriptionStatus",
    "to_subscription_status" "SubscriptionStatus" NOT NULL,
    "from_workspace_type" "WorkspaceType",
    "to_workspace_type" "WorkspaceType",
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceBillingTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpResendCount" INTEGER NOT NULL DEFAULT 0,
    "otpLastSentAt" TIMESTAMP(3),
    "otpLockedUntil" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VerificationCodeType" NOT NULL,
    "target" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "resendCount" INTEGER NOT NULL DEFAULT 1,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "restaurant_id" UUID NOT NULL,
    "restaurant_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "restaurant_type" TEXT NOT NULL,
    "price_tier" TEXT NOT NULL,
    "cuisine_focus" TEXT NOT NULL,
    "opening_date" TIMESTAMP(3) NOT NULL,
    "seating_capacity" INTEGER NOT NULL,
    "aggregator_dependency_score" DECIMAL(12,6) NOT NULL,
    "dine_in_preference_score" DECIMAL(12,6) NOT NULL,
    "operational_efficiency_score" DECIMAL(12,6) NOT NULL,
    "premium_score" DECIMAL(12,6) NOT NULL,
    "traffic_multiplier" DECIMAL(12,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("restaurant_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "customer_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_segment" TEXT NOT NULL,
    "preferred_channel" TEXT NOT NULL,
    "preferred_order_time" TEXT NOT NULL,
    "lifetime_value" DECIMAL(14,2) NOT NULL,
    "loyalty_points" INTEGER NOT NULL,
    "repeat_customer_score" DECIMAL(10,4) NOT NULL,
    "city" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "menu_item_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "is_veg" BOOLEAN NOT NULL,
    "is_combo" BOOLEAN NOT NULL,
    "base_price" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "gross_margin" DECIMAL(10,4) NOT NULL,
    "prep_time_mins" INTEGER NOT NULL,
    "calories" INTEGER NOT NULL,
    "popularity_score" DECIMAL(10,4) NOT NULL,
    "seasonality_score" DECIMAL(10,4) NOT NULL,
    "active_status" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("menu_item_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "order_status" TEXT NOT NULL,
    "placed_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL,
    "prepared_at" TIMESTAMP(3) NOT NULL,
    "delivered_at" TIMESTAMP(3) NOT NULL,
    "gst_amount" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "aggregator_commission" DECIMAL(12,2) NOT NULL,
    "final_amount" DECIMAL(14,2) NOT NULL,
    "payment_status" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "delivery_distance_km" DECIMAL(10,2) NOT NULL,
    "customer_rating" DECIMAL(3,1) NOT NULL,
    "feedback_sentiment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total_items" INTEGER NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "order_item_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "item_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "total_price" DECIMAL(14,2) NOT NULL,
    "gross_profit" DECIMAL(14,2) NOT NULL,
    "is_combo" BOOLEAN NOT NULL,
    "combo_group_id" TEXT,
    "item_status" TEXT NOT NULL,
    "prep_station" TEXT NOT NULL,
    "preparation_time_mins" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("order_item_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_gateway" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL,
    "transaction_amount" DECIMAL(14,2) NOT NULL,
    "gateway_fee" DECIMAL(12,2) NOT NULL,
    "transaction_timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "discount_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "discount_type" TEXT NOT NULL,
    "discount_code" TEXT NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "funded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("discount_id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "inventory_item_id" UUID NOT NULL,
    "ingredient_name" TEXT NOT NULL,
    "ingredient_category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "current_stock" DECIMAL(14,4) NOT NULL,
    "reorder_level" DECIMAL(14,4) NOT NULL,
    "cost_per_unit" DECIMAL(12,4) NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "perishable" BOOLEAN NOT NULL,
    "shelf_life_days" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("inventory_item_id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "transaction_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "transaction_timestamp" TIMESTAMP(3) NOT NULL,
    "related_order_id" UUID,
    "notes" TEXT,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "recipe_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "inventory_item_id" UUID NOT NULL,
    "ingredient_quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("recipe_id")
);

-- CreateTable
CREATE TABLE "workspace_outlets" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "restaurantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'success',
    "userId" TEXT,
    "workspaceId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "resource" TEXT,
    "requestId" TEXT,
    "meta" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_affinity_rules" (
    "rule_id" UUID NOT NULL,
    "primary_item_id" UUID NOT NULL,
    "secondary_item_id" UUID NOT NULL,
    "affinity_score" DECIMAL(10,4) NOT NULL,
    "attachment_probability" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "item_affinity_rules_pkey" PRIMARY KEY ("rule_id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT,
    "fileType" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "storagePath" TEXT,
    "rowCount" INTEGER,
    "errorCount" INTEGER,
    "metadata" JSONB,
    "parsedData" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fileUploadId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recordsFetched" INTEGER NOT NULL DEFAULT 0,
    "recordsLoaded" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "duplicateHandling" TEXT,
    "errorLog" JSONB,
    "errorMessage" TEXT,
    "result" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clean_transactions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "branchId" TEXT,
    "sourceFileId" TEXT,
    "orderId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "branchName" TEXT,
    "customerName" TEXT,
    "itemName" TEXT,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paymentMode" TEXT,
    "orderType" TEXT,
    "status" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clean_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspaces_workspace_type_idx" ON "workspaces"("workspace_type");

-- CreateIndex
CREATE INDEX "workspaces_subscription_status_idx" ON "workspaces"("subscription_status");

-- CreateIndex
CREATE INDEX "workspaces_razorpay_subscription_id_idx" ON "workspaces"("razorpay_subscription_id");

-- CreateIndex
CREATE INDEX "workspaces_stripe_subscription_id_idx" ON "workspaces"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "workspaces_createdAt_idx" ON "workspaces"("createdAt");

-- CreateIndex
CREATE INDEX "BillingWebhookEvent_workspace_id_idx" ON "BillingWebhookEvent"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_event_id_key" ON "BillingWebhookEvent"("provider", "event_id");

-- CreateIndex
CREATE INDEX "WorkspaceBillingTransition_workspace_id_created_at_idx" ON "WorkspaceBillingTransition"("workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_workspaceId_idx" ON "users"("workspaceId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "users_refreshTokenHash_idx" ON "users"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "users_workspaceId_createdAt_idx" ON "users"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "verification_codes_userId_type_idx" ON "verification_codes"("userId", "type");

-- CreateIndex
CREATE INDEX "verification_codes_target_idx" ON "verification_codes"("target");

-- CreateIndex
CREATE INDEX "verification_codes_expiresAt_idx" ON "verification_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "restaurants_city_idx" ON "restaurants"("city");

-- CreateIndex
CREATE INDEX "restaurants_restaurant_type_idx" ON "restaurants"("restaurant_type");

-- CreateIndex
CREATE INDEX "customers_city_idx" ON "customers"("city");

-- CreateIndex
CREATE INDEX "customers_preferred_channel_idx" ON "customers"("preferred_channel");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items"("restaurant_id");

-- CreateIndex
CREATE INDEX "menu_items_category_idx" ON "menu_items"("category");

-- CreateIndex
CREATE INDEX "menu_items_is_veg_idx" ON "menu_items"("is_veg");

-- CreateIndex
CREATE INDEX "orders_restaurant_id_idx" ON "orders"("restaurant_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_order_status_idx" ON "orders"("order_status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_menu_item_id_idx" ON "order_items"("menu_item_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "discounts_order_id_idx" ON "discounts"("order_id");

-- CreateIndex
CREATE INDEX "inventory_items_ingredient_category_idx" ON "inventory_items"("ingredient_category");

-- CreateIndex
CREATE INDEX "inventory_items_supplier_name_idx" ON "inventory_items"("supplier_name");

-- CreateIndex
CREATE INDEX "inventory_transactions_inventory_item_id_idx" ON "inventory_transactions"("inventory_item_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_restaurant_id_idx" ON "inventory_transactions"("restaurant_id");

-- CreateIndex
CREATE INDEX "inventory_transactions_related_order_id_idx" ON "inventory_transactions"("related_order_id");

-- CreateIndex
CREATE INDEX "recipes_menu_item_id_idx" ON "recipes"("menu_item_id");

-- CreateIndex
CREATE INDEX "recipes_inventory_item_id_idx" ON "recipes"("inventory_item_id");

-- CreateIndex
CREATE INDEX "workspace_outlets_workspaceId_idx" ON "workspace_outlets"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_outlets_restaurantId_idx" ON "workspace_outlets"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_outlets_workspaceId_restaurantId_key" ON "workspace_outlets"("workspaceId", "restaurantId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_timestamp_idx" ON "AuditLog"("workspaceId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_timestamp_idx" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_action_timestamp_idx" ON "AuditLog"("action", "timestamp");

-- CreateIndex
CREATE INDEX "item_affinity_rules_primary_item_id_idx" ON "item_affinity_rules"("primary_item_id");

-- CreateIndex
CREATE INDEX "item_affinity_rules_secondary_item_id_idx" ON "item_affinity_rules"("secondary_item_id");

-- CreateIndex
CREATE INDEX "file_uploads_workspaceId_idx" ON "file_uploads"("workspaceId");

-- CreateIndex
CREATE INDEX "file_uploads_userId_idx" ON "file_uploads"("userId");

-- CreateIndex
CREATE INDEX "file_uploads_status_idx" ON "file_uploads"("status");

-- CreateIndex
CREATE INDEX "file_uploads_createdAt_idx" ON "file_uploads"("createdAt");

-- CreateIndex
CREATE INDEX "sync_jobs_workspaceId_idx" ON "sync_jobs"("workspaceId");

-- CreateIndex
CREATE INDEX "sync_jobs_fileUploadId_idx" ON "sync_jobs"("fileUploadId");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "sync_jobs_createdAt_idx" ON "sync_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "clean_transactions_workspaceId_idx" ON "clean_transactions"("workspaceId");

-- CreateIndex
CREATE INDEX "clean_transactions_transactionDate_idx" ON "clean_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "clean_transactions_orderId_idx" ON "clean_transactions"("orderId");

-- AddForeignKey
ALTER TABLE "BillingWebhookEvent" ADD CONSTRAINT "BillingWebhookEvent_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceBillingTransition" ADD CONSTRAINT "WorkspaceBillingTransition_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("menu_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "orders"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("menu_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_outlets" ADD CONSTRAINT "workspace_outlets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_outlets" ADD CONSTRAINT "workspace_outlets_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("restaurant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_affinity_rules" ADD CONSTRAINT "item_affinity_rules_primary_item_id_fkey" FOREIGN KEY ("primary_item_id") REFERENCES "menu_items"("menu_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_affinity_rules" ADD CONSTRAINT "item_affinity_rules_secondary_item_id_fkey" FOREIGN KEY ("secondary_item_id") REFERENCES "menu_items"("menu_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "file_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clean_transactions" ADD CONSTRAINT "clean_transactions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
