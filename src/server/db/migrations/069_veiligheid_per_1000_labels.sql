-- Migration 069: align Criminaliteit user-facing copy with per-1000 rate (#161)
--
-- Migration 067 switched the underlying measure to M004200_4 (per 1000 inw.)
-- but left tile descriptions + KPI label written for the old absolute count
-- ("Aantal geregistreerde misdrijven", "Absolute aantallen — interpreteer
-- naast inwoneraantal"). That copy is now actively misleading: the choropleth
-- shows a normalised rate, not raw counts. Update the strings so what
-- advisors read matches what they see.

UPDATE tiles t
   SET title = 'Misdrijven per 1000 inwoners — kaart',
       description = 'Kaartweergave van het aantal geregistreerde misdrijven per 1000 inwoners per gemeente voor het gekozen jaar. Genormaliseerd op bevolkingsomvang, dus direct vergelijkbaar tussen gemeenten van verschillende grootte.'
  FROM themes th
 WHERE t.theme_id = th.id
   AND th.slug = 'criminaliteit'
   AND t.title = 'Misdrijven per gemeente';

UPDATE tiles t
   SET title = 'Misdrijven per 1000 inwoners — trend',
       description = 'Aantal geregistreerde misdrijven per 1000 inwoners per jaar voor de focal-gemeente. Bewegingen jaar-op-jaar kunnen zowel werkelijke ontwikkeling als veranderingen in aangiftebereidheid weerspiegelen — interpreteer in context.'
  FROM themes th
 WHERE t.theme_id = th.id
   AND th.slug = 'criminaliteit'
   AND t.title = 'Geregistreerde misdrijven — trend';

UPDATE themes
   SET kpi_config = (
     SELECT jsonb_agg(
       CASE
         WHEN k->>'dataSource' = 'veiligheid_misdrijven'
           THEN jsonb_set(k, '{label}', '"Misdrijven per 1000 inw."')
         ELSE k
       END
     )
     FROM jsonb_array_elements(kpi_config) AS k
   ),
       description = 'Aantal door politie geregistreerde misdrijven per 1000 inwoners per gemeente. Anchor-metric voor de veiligheidsdriehoek-gesprekken met OM en politie — genormaliseerd op bevolkingsomvang zodat gemeenten van verschillende grootte direct vergelijkbaar zijn.'
 WHERE slug = 'criminaliteit';
