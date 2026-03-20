import { pool, query } from './pool.js';
import bcrypt from 'bcryptjs';

async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Seeding organizations...');
    await client.query(`
      INSERT INTO organizations (id, name, slug) VALUES
        ('00000000-0000-0000-0000-000000000001', 'Ruimtemeesters', 'ruimtemeesters'),
        ('00000000-0000-0000-0000-000000000002', 'Gemeente Amsterdam', 'gemeente-amsterdam'),
        ('00000000-0000-0000-0000-000000000003', 'Gemeente Den Bosch', 'gemeente-den-bosch')
      ON CONFLICT (id) DO NOTHING
    `);

    console.log('Seeding users...');
    const adminHash = await bcrypt.hash('admin12345', 12);
    const viewerHash = await bcrypt.hash('viewer12345', 12);

    await client.query(`
      INSERT INTO users (id, email, password_hash, name, role, organization_id, attributes) VALUES
        ('10000000-0000-0000-0000-000000000001', 'admin@ruimtemeesters.nl', $1, 'Admin', 'admin', '00000000-0000-0000-0000-000000000001', '{"region": "national"}'),
        ('10000000-0000-0000-0000-000000000002', 'editor@ruimtemeesters.nl', $1, 'Editor', 'editor', '00000000-0000-0000-0000-000000000001', '{"region": "national"}'),
        ('10000000-0000-0000-0000-000000000003', 'viewer@amsterdam.nl', $2, 'Amsterdam Viewer', 'viewer', '00000000-0000-0000-0000-000000000002', '{"region": "noord-holland"}'),
        ('10000000-0000-0000-0000-000000000004', 'guest@example.com', $2, 'Guest User', 'guest', NULL, '{}')
      ON CONFLICT (id) DO NOTHING
    `, [adminHash, viewerHash]);

    console.log('Seeding geographic areas...');
    // Netherlands (country level)
    await client.query(`
      INSERT INTO geo_areas (code, name, level, parent_code) VALUES
        ('NL', 'Nederland', 'land', NULL)
      ON CONFLICT (code) DO NOTHING
    `);

    // Provinces
    const provinces = [
      ['NL-GR', 'Groningen', 'NL'], ['NL-FR', 'Fryslân', 'NL'],
      ['NL-DR', 'Drenthe', 'NL'], ['NL-OV', 'Overijssel', 'NL'],
      ['NL-FL', 'Flevoland', 'NL'], ['NL-GE', 'Gelderland', 'NL'],
      ['NL-UT', 'Utrecht', 'NL'], ['NL-NH', 'Noord-Holland', 'NL'],
      ['NL-ZH', 'Zuid-Holland', 'NL'], ['NL-ZE', 'Zeeland', 'NL'],
      ['NL-NB', 'Noord-Brabant', 'NL'], ['NL-LI', 'Limburg', 'NL'],
    ];

    for (const [code, name, parent] of provinces) {
      await client.query(
        `INSERT INTO geo_areas (code, name, level, parent_code) VALUES ($1, $2, 'provincie', $3) ON CONFLICT (code) DO NOTHING`,
        [code, name, parent],
      );
    }

    // Municipalities (sample of ~50 major ones)
    const gemeenten: [string, string, string][] = [
      ['GM0363', 'Amsterdam', 'NL-NH'], ['GM0599', 'Rotterdam', 'NL-ZH'],
      ['GM0518', "'s-Gravenhage", 'NL-ZH'], ['GM0344', 'Utrecht', 'NL-UT'],
      ['GM0772', 'Eindhoven', 'NL-NB'], ['GM0855', 'Tilburg', 'NL-NB'],
      ['GM0014', 'Groningen', 'NL-GR'], ['GM0758', 'Breda', 'NL-NB'],
      ['GM0034', 'Almere', 'NL-FL'], ['GM0268', 'Nijmegen', 'NL-GE'],
      ['GM0361', 'Alkmaar', 'NL-NH'], ['GM0796', "'s-Hertogenbosch", 'NL-NB'],
      ['GM0983', 'Venlo', 'NL-LI'], ['GM0153', 'Enschede', 'NL-OV'],
      ['GM0439', 'Purmerend', 'NL-NH'], ['GM0479', 'Zaanstad', 'NL-NH'],
      ['GM0546', 'Leiden', 'NL-ZH'], ['GM0503', 'Delft', 'NL-ZH'],
      ['GM0629', 'Dordrecht', 'NL-ZH'], ['GM0200', 'Apeldoorn', 'NL-GE'],
      ['GM0193', 'Arnhem', 'NL-GE'], ['GM0757', 'Bergen op Zoom', 'NL-NB'],
      ['GM0928', 'Maastricht', 'NL-LI'], ['GM0164', 'Hengelo', 'NL-OV'],
      ['GM0867', 'Waalwijk', 'NL-NB'], ['GM0882', 'Zundert', 'NL-NB'],
      ['GM0080', 'Leeuwarden', 'NL-FR'], ['GM0762', 'Dongen', 'NL-NB'],
      ['GM0297', 'Zutphen', 'NL-GE'], ['GM0263', 'Maasdriel', 'NL-GE'],
      ['GM0547', 'Leiderdorp', 'NL-ZH'], ['GM0632', 'Gorinchem', 'NL-ZH'],
      ['GM0590', 'Albrandswaard', 'NL-ZH'], ['GM0394', 'Haarlemmermeer', 'NL-NH'],
      ['GM0392', 'Haarlem', 'NL-NH'], ['GM0088', 'Schiermonnikoog', 'NL-FR'],
      ['GM0060', 'Ameland', 'NL-FR'], ['GM0093', 'Terschelling', 'NL-FR'],
      ['GM0051', 'Dantumadiel', 'NL-FR'], ['GM0307', 'Amersfoort', 'NL-UT'],
      ['GM0327', 'Leusden', 'NL-UT'], ['GM0335', 'Renswoude', 'NL-UT'],
      ['GM0310', 'De Bilt', 'NL-UT'], ['GM0995', 'Lelystad', 'NL-FL'],
      ['GM0171', 'Zwolle', 'NL-OV'], ['GM0150', 'Deventer', 'NL-OV'],
      ['GM0160', 'Hardenberg', 'NL-OV'], ['GM0037', 'Stadskanaal', 'NL-GR'],
      ['GM0005', 'Appingedam', 'NL-GR'], ['GM0765', 'Etten-Leur', 'NL-NB'],
    ];

    for (const [code, name, parent] of gemeenten) {
      await client.query(
        `INSERT INTO geo_areas (code, name, level, parent_code) VALUES ($1, $2, 'gemeente', $3) ON CONFLICT (code) DO NOTHING`,
        [code, name, parent],
      );
    }

    console.log('Seeding themes...');
    const themes = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        slug: 'overzicht',
        name: 'Overzicht',
        description: 'Totaaloverzicht van demografische en woningmarkt indicatoren',
        icon: 'LayoutDashboard',
        order: 0,
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        slug: 'bevolking',
        name: 'Bevolking',
        description: 'Bevolkingsontwikkeling en samenstelling naar leeftijd en geslacht',
        icon: 'Users',
        order: 1,
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        slug: 'huishoudens',
        name: 'Huishoudens',
        description: 'Huishoudens naar samenstelling en ontwikkeling',
        icon: 'Home',
        order: 2,
      },
      {
        id: '20000000-0000-0000-0000-000000000004',
        slug: 'woningen',
        name: 'Woningen',
        description: 'Woningvoorraad naar eigendomsvorm en woningtype',
        icon: 'Building2',
        order: 3,
      },
      {
        id: '20000000-0000-0000-0000-000000000005',
        slug: 'woningtekort',
        name: 'Woningtekort',
        description: 'Woningtekort en -overschot analyse',
        icon: 'TrendingDown',
        order: 4,
      },
    ];

    for (const theme of themes) {
      await client.query(
        `INSERT INTO themes (id, slug, name, description, icon, "order", is_system)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (id) DO NOTHING`,
        [theme.id, theme.slug, theme.name, theme.description, theme.icon, theme.order],
      );
    }

    console.log('Seeding tiles...');
    const tiles = [
      // Overzicht tiles
      { themeId: themes[0].id, title: 'Totale bevolking', chartType: 'line', dataSource: 'bevolking', dims: [], geoLevel: 'land', order: 0 },
      { themeId: themes[0].id, title: 'Huishoudens totaal', chartType: 'bar', dataSource: 'huishoudens', dims: [], geoLevel: 'land', order: 1 },
      { themeId: themes[0].id, title: 'Woningvoorraad', chartType: 'bar', dataSource: 'woningen', dims: [], geoLevel: 'land', order: 2 },
      { themeId: themes[0].id, title: 'Woningtekort', chartType: 'line', dataSource: 'woningtekort', dims: ['metric'], geoLevel: 'land', order: 3 },

      // Bevolking tiles
      { themeId: themes[1].id, title: 'Bevolking naar leeftijd', chartType: 'bar', dataSource: 'bevolking', dims: ['age_group'], geoLevel: 'gemeente', order: 0 },
      { themeId: themes[1].id, title: 'Bevolkingsontwikkeling', chartType: 'line', dataSource: 'bevolking', dims: [], geoLevel: 'gemeente', order: 1 },
      { themeId: themes[1].id, title: 'Bevolking naar geslacht', chartType: 'pie', dataSource: 'bevolking', dims: ['gender'], geoLevel: 'gemeente', order: 2 },
      { themeId: themes[1].id, title: 'Bevolking per gemeente', chartType: 'choropleth', dataSource: 'bevolking', dims: [], geoLevel: 'gemeente', order: 3 },
      { themeId: themes[1].id, title: 'Leeftijdsopbouw', chartType: 'stacked-bar', dataSource: 'bevolking', dims: ['age_group', 'gender'], geoLevel: 'gemeente', order: 4 },
      { themeId: themes[1].id, title: 'Bevolkingsoverzicht', chartType: 'table', dataSource: 'bevolking', dims: ['age_group'], geoLevel: 'gemeente', order: 5 },

      // Huishoudens tiles
      { themeId: themes[2].id, title: 'Huishoudens naar samenstelling', chartType: 'pie', dataSource: 'huishoudens', dims: ['household_type'], geoLevel: 'gemeente', order: 0 },
      { themeId: themes[2].id, title: 'Huishoudensontwikkeling', chartType: 'line', dataSource: 'huishoudens', dims: [], geoLevel: 'gemeente', order: 1 },
      { themeId: themes[2].id, title: 'Huishoudens per type', chartType: 'stacked-bar', dataSource: 'huishoudens', dims: ['household_type'], geoLevel: 'gemeente', order: 2 },
      { themeId: themes[2].id, title: 'Huishoudens vergelijking', chartType: 'radar', dataSource: 'huishoudens', dims: ['household_type'], geoLevel: 'gemeente', order: 3 },

      // Woningen tiles
      { themeId: themes[3].id, title: 'Woningen naar eigendom', chartType: 'pie', dataSource: 'woningen', dims: ['tenure_type'], geoLevel: 'gemeente', order: 0 },
      { themeId: themes[3].id, title: 'Woningen naar type', chartType: 'bar', dataSource: 'woningen', dims: ['dwelling_type'], geoLevel: 'gemeente', order: 1 },
      { themeId: themes[3].id, title: 'Woningvoorraad ontwikkeling', chartType: 'line', dataSource: 'woningen', dims: [], geoLevel: 'gemeente', order: 2 },
      { themeId: themes[3].id, title: 'Woningen per gemeente', chartType: 'choropleth', dataSource: 'woningen', dims: [], geoLevel: 'gemeente', order: 3 },

      // Woningtekort tiles
      { themeId: themes[4].id, title: 'Woningtekort ontwikkeling', chartType: 'line', dataSource: 'woningtekort', dims: ['metric'], geoLevel: 'gemeente', order: 0 },
      { themeId: themes[4].id, title: 'Vraag vs. Aanbod', chartType: 'stacked-bar', dataSource: 'woningtekort', dims: ['metric'], geoLevel: 'gemeente', order: 1 },
      { themeId: themes[4].id, title: 'Tekort per gemeente', chartType: 'choropleth', dataSource: 'woningtekort', dims: ['metric'], geoLevel: 'gemeente', order: 2 },
      { themeId: themes[4].id, title: 'Tekort tabel', chartType: 'table', dataSource: 'woningtekort', dims: ['metric'], geoLevel: 'gemeente', order: 3 },
    ];

    for (const tile of tiles) {
      await client.query(
        `INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tile.themeId, tile.title, tile.chartType, tile.dataSource, tile.dims, tile.geoLevel, tile.order],
      );
    }

    console.log('Seeding demographic data...');
    const years = [2020, 2021, 2022, 2023, 2024, 2025, 2030, 2035, 2040];
    const ageGroups = ['0-14', '15-24', '25-44', '45-64', '65-79', '80+'];
    const genders = ['man', 'vrouw'];
    const householdTypes = ['eenpersoons', 'paar_zonder_kinderen', 'paar_met_kinderen', 'eenouder', 'overig'];
    const tenureTypes = ['eigendom', 'huur_sociaal', 'huur_particulier'];
    const dwellingTypes = ['eengezins', 'meergezins'];
    const tekortMetrics = ['tekort', 'vraag', 'aanbod'];

    // Generate data for each gemeente
    const geoResult = await client.query("SELECT code FROM geo_areas WHERE level = 'gemeente'");
    const geoCodes = geoResult.rows.map(r => r.code);

    // Use batch inserts for performance
    for (const geoCode of geoCodes) {
      // Base population factor based on municipality (simulate realistic sizes)
      const popFactor = geoCode === 'GM0363' ? 900000 : geoCode === 'GM0599' ? 650000 :
        geoCode === 'GM0518' ? 550000 : geoCode === 'GM0344' ? 360000 :
        geoCode === 'GM0772' ? 235000 : Math.floor(20000 + Math.random() * 150000);

      for (const year of years) {
        const growthFactor = 1 + (year - 2020) * 0.005 + Math.random() * 0.01;

        // Bevolking data
        for (const ageGroup of ageGroups) {
          const ageFraction = ageGroup === '0-14' ? 0.16 : ageGroup === '15-24' ? 0.12 :
            ageGroup === '25-44' ? 0.27 : ageGroup === '45-64' ? 0.26 :
            ageGroup === '65-79' ? 0.13 : 0.06;

          for (const gender of genders) {
            const genderFraction = gender === 'man' ? 0.49 : 0.51;
            const value = Math.round(popFactor * growthFactor * ageFraction * genderFraction * (0.95 + Math.random() * 0.1));

            await client.query(
              `INSERT INTO data_bevolking (geo_code, year, age_group, gender, value)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (geo_code, year, age_group, gender) DO NOTHING`,
              [geoCode, year, ageGroup, gender, value],
            );
          }
        }

        // Huishoudens data
        const hhTotal = Math.round(popFactor * growthFactor * 0.45);
        for (const hhType of householdTypes) {
          const hhFraction = hhType === 'eenpersoons' ? 0.38 : hhType === 'paar_zonder_kinderen' ? 0.22 :
            hhType === 'paar_met_kinderen' ? 0.25 : hhType === 'eenouder' ? 0.10 : 0.05;
          const value = Math.round(hhTotal * hhFraction * (0.95 + Math.random() * 0.1));

          await client.query(
            `INSERT INTO data_huishoudens (geo_code, year, household_type, value)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (geo_code, year, household_type) DO NOTHING`,
            [geoCode, year, hhType, value],
          );
        }

        // Woningen data
        const woningenTotal = Math.round(popFactor * growthFactor * 0.43);
        for (const tenure of tenureTypes) {
          const tenureFraction = tenure === 'eigendom' ? 0.57 : tenure === 'huur_sociaal' ? 0.29 : 0.14;
          for (const dwelling of dwellingTypes) {
            const dwellingFraction = dwelling === 'eengezins' ? 0.65 : 0.35;
            const value = Math.round(woningenTotal * tenureFraction * dwellingFraction * (0.95 + Math.random() * 0.1));

            await client.query(
              `INSERT INTO data_woningen (geo_code, year, tenure_type, dwelling_type, value)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (geo_code, year, tenure_type, dwelling_type) DO NOTHING`,
              [geoCode, year, tenure, dwelling, value],
            );
          }
        }

        // Woningtekort data
        for (const metric of tekortMetrics) {
          const value = metric === 'tekort' ? Math.round((0.02 + Math.random() * 0.05) * woningenTotal) :
            metric === 'vraag' ? Math.round(woningenTotal * (1.03 + Math.random() * 0.04)) :
            woningenTotal;

          await client.query(
            `INSERT INTO data_woningtekort (geo_code, year, metric, value)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (geo_code, year, metric) DO NOTHING`,
            [geoCode, year, metric, value],
          );
        }
      }
    }

    // Also seed national-level data
    for (const year of years) {
      const nationalPop = 17500000 + (year - 2020) * 50000;

      for (const ageGroup of ageGroups) {
        const ageFraction = ageGroup === '0-14' ? 0.16 : ageGroup === '15-24' ? 0.12 :
          ageGroup === '25-44' ? 0.27 : ageGroup === '45-64' ? 0.26 :
          ageGroup === '65-79' ? 0.13 : 0.06;
        for (const gender of genders) {
          const genderFraction = gender === 'man' ? 0.49 : 0.51;
          await client.query(
            `INSERT INTO data_bevolking (geo_code, year, age_group, gender, value)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
            ['NL', year, ageGroup, gender, Math.round(nationalPop * ageFraction * genderFraction)],
          );
        }
      }
    }

    console.log('Seeding ABAC policies...');
    await client.query(`
      INSERT INTO access_policies (name, description, effect, resource, conditions, priority) VALUES
        ('Admin full access', 'Admins can access everything', 'allow', '*', $1, 100),
        ('Editor theme access', 'Editors can view all themes', 'allow', 'theme:*', $2, 50),
        ('Editor dashboard create', 'Editors can create dashboards', 'allow', 'dashboard:create', $2, 50),
        ('Viewer theme access', 'Viewers can view all themes', 'allow', 'theme:*', $3, 30),
        ('Guest limited access', 'Guests can only view overzicht', 'allow', 'theme:overzicht', $4, 10),
        ('Guest deny other themes', 'Guests cannot view other themes', 'deny', 'theme:*', $4, 5)
      ON CONFLICT DO NOTHING
    `, [
      JSON.stringify([{ field: 'user.role', operator: 'eq', value: 'admin' }]),
      JSON.stringify([{ field: 'user.role', operator: 'eq', value: 'editor' }]),
      JSON.stringify([{ field: 'user.role', operator: 'eq', value: 'viewer' }]),
      JSON.stringify([{ field: 'user.role', operator: 'eq', value: 'guest' }]),
    ]);

    await client.query('COMMIT');
    console.log('Seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
