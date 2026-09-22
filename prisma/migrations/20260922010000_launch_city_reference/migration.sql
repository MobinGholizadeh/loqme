-- Operational reference data only: allow launch-city onboarding on a fresh deployment.
-- Preserve existing city IDs and names; do not seed accounts, merchants or reviews.
INSERT INTO "Province" (id, "nameFa", slug, "createdAt")
VALUES ('loqme-province-west-azerbaijan', 'آذربایجان غربی', 'azarbaijan-gharbi', CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "City" (id, "provinceId", "nameFa", slug, "createdAt")
SELECT 'loqme-city-urmia', id, 'ارومیه', 'urmia', CURRENT_TIMESTAMP
FROM "Province" WHERE slug = 'azarbaijan-gharbi'
ON CONFLICT ("provinceId", slug) DO NOTHING;
