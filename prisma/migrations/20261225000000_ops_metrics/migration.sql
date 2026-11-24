CREATE TABLE "ops_metric_buckets" (
    "bucket" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "labels" TEXT NOT NULL DEFAULT '',
    "n" INTEGER NOT NULL,
    "sum" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ops_metric_buckets_pkey" PRIMARY KEY ("bucket","metric","labels")
);

CREATE INDEX "ops_metric_buckets_metric_bucket_idx" ON "ops_metric_buckets"("metric", "bucket");

ALTER TABLE "ops_metric_buckets" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "ops_metric_hourly" (
    "bucket" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "labels" TEXT NOT NULL DEFAULT '',
    "n" INTEGER NOT NULL,
    "sum" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ops_metric_hourly_pkey" PRIMARY KEY ("bucket","metric","labels")
);

CREATE INDEX "ops_metric_hourly_metric_bucket_idx" ON "ops_metric_hourly"("metric", "bucket");

ALTER TABLE "ops_metric_hourly" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "ops_alert_state" (
    "rule" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "breachSince" TIMESTAMP(3),
    "lastValue" DOUBLE PRECISION,
    "lastNotifiedAt" TIMESTAMP(3),
    "lastNotifiedStatus" TEXT,
    "silencedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ops_alert_state_pkey" PRIMARY KEY ("rule")
);

ALTER TABLE "ops_alert_state" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "ops_alert_events" (
    "id" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ops_alert_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ops_alert_events_at_idx" ON "ops_alert_events"("at");

CREATE INDEX "ops_alert_events_rule_at_idx" ON "ops_alert_events"("rule", "at");

ALTER TABLE "ops_alert_events" ENABLE ROW LEVEL SECURITY;
