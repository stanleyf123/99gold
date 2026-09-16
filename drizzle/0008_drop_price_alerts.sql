-- Retired the unused price-alert feature. Existing SQLite files keep news/settings
-- tables; this only drops price_alert_subscriptions if the previous migration created it.
DROP TABLE IF EXISTS `price_alert_subscriptions`;
