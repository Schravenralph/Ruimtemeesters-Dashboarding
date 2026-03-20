-- Ensure base geographic hierarchy exists before COROP regions
INSERT INTO geo_areas (code, name, level, parent_code) VALUES
  ('NL', 'Nederland', 'land', NULL)
ON CONFLICT (code) DO NOTHING;

INSERT INTO geo_areas (code, name, level, parent_code) VALUES
  ('NL-GR', 'Groningen', 'provincie', 'NL'),
  ('NL-FR', 'Fryslân', 'provincie', 'NL'),
  ('NL-DR', 'Drenthe', 'provincie', 'NL'),
  ('NL-OV', 'Overijssel', 'provincie', 'NL'),
  ('NL-FL', 'Flevoland', 'provincie', 'NL'),
  ('NL-GE', 'Gelderland', 'provincie', 'NL'),
  ('NL-UT', 'Utrecht', 'provincie', 'NL'),
  ('NL-NH', 'Noord-Holland', 'provincie', 'NL'),
  ('NL-ZH', 'Zuid-Holland', 'provincie', 'NL'),
  ('NL-ZE', 'Zeeland', 'provincie', 'NL'),
  ('NL-NB', 'Noord-Brabant', 'provincie', 'NL'),
  ('NL-LI', 'Limburg', 'provincie', 'NL')
ON CONFLICT (code) DO NOTHING;

-- COROP regions (40 statistical regions in the Netherlands)
INSERT INTO geo_areas (code, name, level, parent_code) VALUES
  ('CR01', 'Oost-Groningen', 'corop', 'NL-GR'),
  ('CR02', 'Delfzijl en omgeving', 'corop', 'NL-GR'),
  ('CR03', 'Overig Groningen', 'corop', 'NL-GR'),
  ('CR04', 'Noord-Friesland', 'corop', 'NL-FR'),
  ('CR05', 'Zuidwest-Friesland', 'corop', 'NL-FR'),
  ('CR06', 'Zuidoost-Friesland', 'corop', 'NL-FR'),
  ('CR07', 'Noord-Drenthe', 'corop', 'NL-DR'),
  ('CR08', 'Zuidoost-Drenthe', 'corop', 'NL-DR'),
  ('CR09', 'Zuidwest-Drenthe', 'corop', 'NL-DR'),
  ('CR10', 'Noord-Overijssel', 'corop', 'NL-OV'),
  ('CR11', 'Zuidwest-Overijssel', 'corop', 'NL-OV'),
  ('CR12', 'Twente', 'corop', 'NL-OV'),
  ('CR13', 'Veluwe', 'corop', 'NL-GE'),
  ('CR14', 'Achterhoek', 'corop', 'NL-GE'),
  ('CR15', 'Arnhem/Nijmegen', 'corop', 'NL-GE'),
  ('CR16', 'Zuidwest-Gelderland', 'corop', 'NL-GE'),
  ('CR17', 'Utrecht', 'corop', 'NL-UT'),
  ('CR18', 'Kop van Noord-Holland', 'corop', 'NL-NH'),
  ('CR19', 'Alkmaar en omgeving', 'corop', 'NL-NH'),
  ('CR20', 'IJmond', 'corop', 'NL-NH'),
  ('CR21', 'Agglomeratie Haarlem', 'corop', 'NL-NH'),
  ('CR22', 'Zaanstreek', 'corop', 'NL-NH'),
  ('CR23', 'Groot-Amsterdam', 'corop', 'NL-NH'),
  ('CR24', 'Het Gooi en Vechtstreek', 'corop', 'NL-NH'),
  ('CR25', 'Agglomeratie Leiden en Bollenstreek', 'corop', 'NL-ZH'),
  ('CR26', 'Agglomeratie ''s-Gravenhage', 'corop', 'NL-ZH'),
  ('CR27', 'Delft en Westland', 'corop', 'NL-ZH'),
  ('CR28', 'Oost-Zuid-Holland', 'corop', 'NL-ZH'),
  ('CR29', 'Groot-Rijnmond', 'corop', 'NL-ZH'),
  ('CR30', 'Zuidoost-Zuid-Holland', 'corop', 'NL-ZH'),
  ('CR31', 'Zeeuws-Vlaanderen', 'corop', 'NL-ZE'),
  ('CR32', 'Overig Zeeland', 'corop', 'NL-ZE'),
  ('CR33', 'West-Noord-Brabant', 'corop', 'NL-NB'),
  ('CR34', 'Midden-Noord-Brabant', 'corop', 'NL-NB'),
  ('CR35', 'Noordoost-Noord-Brabant', 'corop', 'NL-NB'),
  ('CR36', 'Zuidoost-Noord-Brabant', 'corop', 'NL-NB'),
  ('CR37', 'Noord-Limburg', 'corop', 'NL-LI'),
  ('CR38', 'Midden-Limburg', 'corop', 'NL-LI'),
  ('CR39', 'Zuid-Limburg', 'corop', 'NL-LI'),
  ('CR40', 'Flevoland', 'corop', 'NL-FL')
ON CONFLICT (code) DO NOTHING;
