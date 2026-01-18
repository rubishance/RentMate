-- Drop the saved_calculations table as it's no longer needed
-- Calculator sharing now uses URL-encoded links (stateless, no database storage)

DROP TABLE IF EXISTS saved_calculations;
