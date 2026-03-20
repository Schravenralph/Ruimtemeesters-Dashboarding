type Locale = 'nl' | 'en';

const translations: Record<Locale, Record<string, string>> = {
  nl: {
    // Navigation
    'nav.themes': 'Thema\'s',
    'nav.myDashboards': 'Mijn Dashboards',
    'nav.admin': 'Beheer',
    'nav.collapse': 'Inklappen',
    'nav.login': 'Inloggen',
    'nav.logout': 'Uitloggen',

    // Dashboard
    'dashboard.loading': 'Dashboard laden...',
    'dashboard.notFound': 'Thema niet gevonden',
    'dashboard.downloadAll': 'Alles downloaden (PDF)',
    'dashboard.editLayout': 'Layout bewerken',
    'dashboard.save': 'Opslaan',
    'dashboard.cancel': 'Annuleren',
    'dashboard.moreInfo': 'Meer informatie over dit thema',

    // Filters
    'filters.title': 'Filters',
    'filters.geoLevel': 'Gebiedsniveau',
    'filters.area': 'Gebied',
    'filters.period': 'Periode',
    'filters.compare': 'Vergelijken',
    'filters.compareWith': 'Vergelijk met',
    'filters.on': 'Aan',
    'filters.off': 'Uit',
    'filters.clear': 'Filters wissen',
    'filters.save': 'Filter opslaan',
    'filters.search': 'Zoek gemeente...',
    'filters.noResults': 'Geen resultaten',

    // Charts
    'chart.loading': 'Data laden...',
    'chart.noData': 'Geen data beschikbaar voor deze selectie',
    'chart.expand': 'Vergroten',
    'chart.remove': 'Verwijderen',

    // Export
    'export.png': 'PNG',
    'export.csv': 'CSV',
    'export.excel': 'Excel',
    'export.pdf': 'PDF',

    // Admin
    'admin.title': 'Beheer',
    'admin.policies': 'Toegangsbeleid',
    'admin.users': 'Gebruikers',
    'admin.dataSources': 'Databronnen',
    'admin.auditLog': 'Audit Log',
    'admin.newPolicy': 'Nieuw beleid',
    'admin.accessDenied': 'Alleen beheerders hebben toegang tot deze pagina.',

    // Auth
    'auth.login': 'Inloggen',
    'auth.register': 'Account aanmaken',
    'auth.email': 'E-mail',
    'auth.password': 'Wachtwoord',
    'auth.name': 'Naam',
    'auth.hasAccount': 'Al een account? Inloggen',
    'auth.noAccount': 'Nog geen account? Registreren',

    // Custom Dashboards
    'customDash.title': 'Mijn Dashboards',
    'customDash.subtitle': 'Maak en beheer je eigen dashboards (max. 5)',
    'customDash.new': 'Nieuw dashboard',
    'customDash.edit': 'Bewerken',
    'customDash.share': 'Delen',
    'customDash.delete': 'Verwijderen',
    'customDash.empty': 'Je hebt nog geen dashboards. Maak er een aan!',

    // Geo
    'geo.land': 'Nederland',
    'geo.provincie': 'Provincie',
    'geo.gemeente': 'Gemeente',
    'geo.wijk': 'Wijk',
    'geo.buurt': 'Buurt',

    // Comparison
    'comparison.vsLastYear': 't.o.v. vorig jaar',

    // Common
    'common.active': 'Actief',
    'common.save': 'Opslaan',
    'common.cancel': 'Annuleren',
    'common.delete': 'Verwijderen',
    'common.edit': 'Bewerken',
    'common.create': 'Aanmaken',
    'common.search': 'Zoeken...',
    'common.loading': 'Laden...',
    'common.error': 'Er is iets misgegaan',
    'common.retry': 'Opnieuw proberen',
    'common.previous': 'Vorige',
    'common.next': 'Volgende',
    'common.tiles': 'tegels',
    'common.updated': 'Bijgewerkt',
    'common.shared': 'Gedeeld',
  },
  en: {
    'nav.themes': 'Themes',
    'nav.myDashboards': 'My Dashboards',
    'nav.admin': 'Admin',
    'nav.collapse': 'Collapse',
    'nav.login': 'Log in',
    'nav.logout': 'Log out',

    'dashboard.loading': 'Loading dashboard...',
    'dashboard.notFound': 'Theme not found',
    'dashboard.downloadAll': 'Download all (PDF)',
    'dashboard.editLayout': 'Edit layout',
    'dashboard.save': 'Save',
    'dashboard.cancel': 'Cancel',
    'dashboard.moreInfo': 'More information about this theme',

    'filters.title': 'Filters',
    'filters.geoLevel': 'Geographic level',
    'filters.area': 'Area',
    'filters.period': 'Period',
    'filters.compare': 'Compare',
    'filters.compareWith': 'Compare with',
    'filters.on': 'On',
    'filters.off': 'Off',
    'filters.clear': 'Clear filters',
    'filters.save': 'Save filter',
    'filters.search': 'Search municipality...',
    'filters.noResults': 'No results',

    'chart.loading': 'Loading data...',
    'chart.noData': 'No data available for this selection',
    'chart.expand': 'Expand',
    'chart.remove': 'Remove',

    'export.png': 'PNG',
    'export.csv': 'CSV',
    'export.excel': 'Excel',
    'export.pdf': 'PDF',

    'admin.title': 'Admin',
    'admin.policies': 'Access Policies',
    'admin.users': 'Users',
    'admin.dataSources': 'Data Sources',
    'admin.auditLog': 'Audit Log',
    'admin.newPolicy': 'New policy',
    'admin.accessDenied': 'Only administrators have access to this page.',

    'auth.login': 'Log in',
    'auth.register': 'Create account',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Name',
    'auth.hasAccount': 'Already have an account? Log in',
    'auth.noAccount': 'No account yet? Register',

    'customDash.title': 'My Dashboards',
    'customDash.subtitle': 'Create and manage your own dashboards (max 5)',
    'customDash.new': 'New dashboard',
    'customDash.edit': 'Edit',
    'customDash.share': 'Share',
    'customDash.delete': 'Delete',
    'customDash.empty': 'You have no dashboards yet. Create one!',

    'geo.land': 'Netherlands',
    'geo.provincie': 'Province',
    'geo.gemeente': 'Municipality',
    'geo.wijk': 'District',
    'geo.buurt': 'Neighbourhood',

    'comparison.vsLastYear': 'vs. previous year',

    'common.active': 'Active',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
    'common.previous': 'Previous',
    'common.next': 'Next',
    'common.tiles': 'tiles',
    'common.updated': 'Updated',
    'common.shared': 'Shared',
  },
};

let currentLocale: Locale = 'nl';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string): string {
  return translations[currentLocale][key] || translations.nl[key] || key;
}

export function getSupportedLocales(): { value: Locale; label: string }[] {
  return [
    { value: 'nl', label: 'Nederlands' },
    { value: 'en', label: 'English' },
  ];
}
