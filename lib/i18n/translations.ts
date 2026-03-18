export type LanguageCode = 'en' | 'no' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ja' | 'zh' | 'ko';

export interface LanguageMeta {
  code: LanguageCode;
  flag: string;
  label: string;  // native name
  englishLabel: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', flag: '🇬🇧', label: 'English',    englishLabel: 'English'            },
  { code: 'no', flag: '🇳🇴', label: 'Norsk',      englishLabel: 'Norwegian'          },
  { code: 'es', flag: '🇪🇸', label: 'Español',    englishLabel: 'Spanish'            },
  { code: 'fr', flag: '🇫🇷', label: 'Français',   englishLabel: 'French'             },
  { code: 'de', flag: '🇩🇪', label: 'Deutsch',    englishLabel: 'German'             },
  { code: 'pt', flag: '🇧🇷', label: 'Português',  englishLabel: 'Portuguese'         },
  { code: 'it', flag: '🇮🇹', label: 'Italiano',   englishLabel: 'Italian'            },
  { code: 'ja', flag: '🇯🇵', label: '日本語',      englishLabel: 'Japanese'           },
  { code: 'zh', flag: '🇨🇳', label: '中文',        englishLabel: 'Chinese (Simplified)'},
  { code: 'ko', flag: '🇰🇷', label: '한국어',      englishLabel: 'Korean'             },
];

export interface Translations {
  tabs: {
    home: string;
    explore: string;
    discover: string;
    settings: string;
    profile: string;
  };
  settings: {
    title: string;
    sections: {
      account: string;
      trips: string;
      subscription: string;
      data: string;
      language: string;
      about: string;
    };
    rows: {
      signIn: string;
      createAccount: string;
      signOut: string;
      account: string;
      editProfile: string;
      addPastTrip: string;
      plan: string;
      upgradeToPro: string;
      restorePurchases: string;
      restoring: string;
      clearAllData: string;
      privacyPolicy: string;
      version: string;
      language: string;
    };
    alerts: {
      signOut: { title: string; message: string; cancel: string; confirm: string };
      clearData: { title: string; message: string; cancel: string; confirm: string };
      restored: { title: string; message: string };
      nothingToRestore: { title: string; message: string };
    };
    planPro: string;
    planFree: string; // use {count}
  };
  languagePicker: {
    title: string;
    subtitle: string;
  };
  home: {
    tagline: string;
    placeholder: string;
    generate: string;
    helperText: string;
    noTripsRemaining: string;
    tripsRemainingBanner: string; // use {count}
    upgradeDefault: string;       // use {count}
    upgradeToPro: string;
  };
  common: {
    cancel: string;
    close: string;
  };
  discover: {
    categories: {
      all: string;
      beach: string;
      city: string;
      nature: string;
      food: string;
      culture: string;
      budget: string;
    };
    seenItAll: string;
    adventurePrompt: string;
    generateYourOwn: string;
    noTrips: string;
    noCategoryTrips: string; // {category}
    beFirst: string;
    tryDifferent: string;
    generateTrip: string;
  };
  explore: {
    filters: {
      all: string;
      restaurant: string;
      tourist_attraction: string;
      cafe: string;
      bar: string;
      museum: string;
      park: string;
      shopping_mall: string;
    };
    askAI: string;
    searching: string;
    liveMap: string;
    locationPrompt: string;
    locationDenied: string;
    enableLocation: string;
    openSettings: string;
    aiItinerary: string;
    placesHere: string; // {count}
  };
  feedCard: {
    share: string;
    viewTrip: string;
    days: string;
  };
  profile: {
    edit: string;
    follow: string;
    countries: string;
    continents: string;
    ofWorld: string;
    trips: string;
    destinations: string;
    saves: string;
    worldMap: string;
    country: string;
    countries2: string;
    tabTrips: string;
    tabBeen: string;
    tabBucket: string;
    tabBadges: string;
    noPublicTrips: string;
    pastTripsPrivate: string;
    logAdventures: string;
    addPastTrip: string;
    since: string; // {date}
    travelMap: string; // {name}
    tapToMark: string;
  };
  editProfile: {
    title: string;
    sections: {
      profilePhoto: string;
      basicInfo: string;
      travelStyle: string;
      privacy: string;
      account: string;
    };
    choosePhoto: string;
    chooseEmoji: string;
    coverPhoto: string;
    cameraRoll: string;
    aiSuggested: string;
    displayName: string;
    username: string;
    bio: string; // {count}
    homeCountry: string;
    yourName: string;
    bioPlaceholder: string;
    selectCountry: string;
    travelMood: string;
    travelMoodSub: string;
    preferredLength: string;
    publicProfile: string;
    publicProfileSub: string;
    showBucketlist: string;
    showBucketlistSub: string;
    showBeenThere: string;
    showBadges: string;
    email: string;
    notSignedIn: string;
    change: string;
    cancel: string;
    newEmail: string;
    saveChanges: string;
    usernameTaken: string;
  };
}

const en: Translations = {
  tabs: {
    home: 'Home',
    explore: 'Explore',
    discover: 'Discover',
    settings: 'Settings',
    profile: 'Profile',
  },
  settings: {
    title: 'Settings',
    sections: {
      account: 'Account',
      trips: 'Trips',
      subscription: 'Subscription',
      data: 'Data',
      language: 'Language',
      about: 'About',
    },
    rows: {
      signIn: 'Sign In',
      createAccount: 'Create Account',
      signOut: 'Sign Out',
      account: 'Account',
      editProfile: 'Edit Profile',
      addPastTrip: 'Add a past trip',
      plan: 'Plan',
      upgradeToPro: 'Upgrade to Pro',
      restorePurchases: 'Restore Purchases',
      restoring: 'Restoring...',
      clearAllData: 'Clear All Local Data',
      privacyPolicy: 'Privacy Policy',
      version: 'Version',
      language: 'Language',
    },
    alerts: {
      signOut: {
        title: 'Sign Out',
        message: 'Are you sure you want to sign out?',
        cancel: 'Cancel',
        confirm: 'Sign Out',
      },
      clearData: {
        title: 'Clear All Data',
        message: 'This will delete your local trip history and reset your free trip counter. This cannot be undone.',
        cancel: 'Cancel',
        confirm: 'Clear',
      },
      restored: {
        title: 'Restored',
        message: 'Your Pro subscription has been restored.',
      },
      nothingToRestore: {
        title: 'Nothing to restore',
        message: 'No active subscription found for this account.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Free ({count} trips left)',
  },
  languagePicker: {
    title: 'Language',
    subtitle: 'Choose your preferred language',
  },
  home: {
    tagline: 'Share · Explore · Go',
    placeholder: 'Paste a TikTok, Reel or YouTube link',
    generate: 'Generate',
    helperText: 'AI extracts every location and builds your itinerary',
    noTripsRemaining: 'No free trips remaining',
    tripsRemainingBanner: '{count} free trips remaining',
    upgradeDefault: '{count} free trips/month',
    upgradeToPro: 'Upgrade to Pro',
  },
  common: {
    cancel: 'Cancel',
    close: 'Close',
  },
  discover: {
    categories: { all: '✨ All', beach: '🏖️ Beach', city: '🏙️ City', nature: '🏔️ Nature', food: '🍜 Food', culture: '🎭 Culture', budget: '💰 Budget' },
    seenItAll: "You've seen it all",
    adventurePrompt: 'Ready to plan your own adventure?',
    generateYourOwn: 'Generate your own',
    noTrips: 'No trips yet',
    noCategoryTrips: 'No {category} trips',
    beFirst: 'Be the first to share a trip to the feed',
    tryDifferent: 'Try a different category or check back later',
    generateTrip: 'Generate a Trip',
  },
  explore: {
    filters: { all: 'All', restaurant: '🍽️ Food', tourist_attraction: '⭐ Sights', cafe: '☕ Café', bar: '🍸 Bars', museum: '🏛️ Culture', park: '🌿 Parks', shopping_mall: '🛍️ Shopping' },
    askAI: 'Ask AI',
    searching: 'Searching...',
    liveMap: 'Live Travel Map',
    locationPrompt: 'ReelRoam uses your location to show nearby restaurants, attractions, and hidden gems — and to power the AI travel guide.',
    locationDenied: 'Location access is turned off. Enable it in Settings to use the live map.',
    enableLocation: 'Enable Location',
    openSettings: 'Open Settings',
    aiItinerary: 'AI ITINERARY',
    placesHere: '{count} places here',
  },
  feedCard: {
    share: 'Share',
    viewTrip: 'View Trip',
    days: 'days',
  },
  profile: {
    edit: 'Edit',
    follow: 'Follow',
    countries: 'Countries',
    continents: 'Continents',
    ofWorld: 'of World',
    trips: 'Trips',
    destinations: 'Destinations',
    saves: 'Saves',
    worldMap: 'World Map',
    country: 'country',
    countries2: 'countries',
    tabTrips: 'Trips',
    tabBeen: 'Been',
    tabBucket: 'Bucket',
    tabBadges: 'Badges',
    noPublicTrips: 'No public trips yet',
    pastTripsPrivate: 'Past trips are private',
    logAdventures: 'Log your past adventures here',
    addPastTrip: '+ Add a past trip',
    since: 'Since {date}',
    travelMap: "{name}'s travel map",
    tapToMark: 'Tap to mark visited',
  },
  editProfile: {
    title: 'Edit Profile',
    sections: { profilePhoto: 'Profile photo', basicInfo: 'Basic info', travelStyle: 'Travel style', privacy: 'Privacy', account: 'Account' },
    choosePhoto: 'Choose Photo',
    chooseEmoji: 'Choose Emoji',
    coverPhoto: 'COVER PHOTO',
    cameraRoll: 'Camera Roll',
    aiSuggested: 'AI Suggested',
    displayName: 'Display name',
    username: 'Username',
    bio: 'Bio  {count}/120',
    homeCountry: 'Home country',
    yourName: 'Your name',
    bioPlaceholder: 'Tell your travel story...',
    selectCountry: 'Select your country',
    travelMood: 'TRAVEL MOOD — select all that apply',
    travelMoodSub: 'This helps us personalize your feed',
    preferredLength: 'PREFERRED TRIP LENGTH',
    publicProfile: 'Public profile',
    publicProfileSub: 'Allow others to discover your profile',
    showBucketlist: 'Show Bucketlist',
    showBucketlistSub: 'Visible to others on your profile',
    showBeenThere: 'Show Been There trips',
    showBadges: 'Show badges on profile',
    email: 'Email',
    notSignedIn: 'Not signed in',
    change: 'Change',
    cancel: 'Cancel',
    newEmail: 'New email address',
    saveChanges: 'Save Changes',
    usernameTaken: 'Username already taken',
  },
};

const no: Translations = {
  tabs: {
    home: 'Hjem',
    explore: 'Utforsk',
    discover: 'Oppdage',
    settings: 'Innstillinger',
    profile: 'Profil',
  },
  settings: {
    title: 'Innstillinger',
    sections: {
      account: 'Konto',
      trips: 'Turer',
      subscription: 'Abonnement',
      data: 'Data',
      language: 'Språk',
      about: 'Om',
    },
    rows: {
      signIn: 'Logg inn',
      createAccount: 'Opprett konto',
      signOut: 'Logg ut',
      account: 'Konto',
      editProfile: 'Rediger profil',
      addPastTrip: 'Legg til en tidligere tur',
      plan: 'Plan',
      upgradeToPro: 'Oppgrader til Pro',
      restorePurchases: 'Gjenopprett kjøp',
      restoring: 'Gjenoppretter...',
      clearAllData: 'Slett all lokal data',
      privacyPolicy: 'Personvernerklæring',
      version: 'Versjon',
      language: 'Språk',
    },
    alerts: {
      signOut: {
        title: 'Logg ut',
        message: 'Er du sikker på at du vil logge ut?',
        cancel: 'Avbryt',
        confirm: 'Logg ut',
      },
      clearData: {
        title: 'Slett all data',
        message: 'Dette vil slette din lokale turhistorikk og nullstille gratisturtelleren. Dette kan ikke angres.',
        cancel: 'Avbryt',
        confirm: 'Slett',
      },
      restored: {
        title: 'Gjenopprettet',
        message: 'Ditt Pro-abonnement er gjenopprettet.',
      },
      nothingToRestore: {
        title: 'Ingenting å gjenopprette',
        message: 'Ingen aktive abonnement funnet for denne kontoen.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Gratis ({count} turer igjen)',
  },
  languagePicker: {
    title: 'Språk',
    subtitle: 'Velg ønsket språk',
  },
  home: {
    tagline: 'Del · Utforsk · Reis',
    placeholder: 'Lim inn en TikTok, Reel eller YouTube-lenke',
    generate: 'Generer',
    helperText: 'AI henter ut alle steder og lager reiseruten din',
    noTripsRemaining: 'Ingen gratisturer igjen',
    tripsRemainingBanner: '{count} gratisturer igjen',
    upgradeDefault: '{count} gratisturer/mnd',
    upgradeToPro: 'Oppgrader til Pro',
  },
  common: {
    cancel: 'Avbryt',
    close: 'Lukk',
  },
  discover: {
    categories: { all: '✨ Alle', beach: '🏖️ Strand', city: '🏙️ By', nature: '🏔️ Natur', food: '🍜 Mat', culture: '🎭 Kultur', budget: '💰 Budsjett' },
    seenItAll: 'Du har sett alt',
    adventurePrompt: 'Klar til å planlegge ditt eget eventyr?',
    generateYourOwn: 'Generer din egen',
    noTrips: 'Ingen turer ennå',
    noCategoryTrips: 'Ingen {category}-turer',
    beFirst: 'Vær den første til å dele en tur til feeden',
    tryDifferent: 'Prøv en annen kategori eller kom tilbake senere',
    generateTrip: 'Generer en tur',
  },
  explore: {
    filters: { all: 'Alle', restaurant: '🍽️ Mat', tourist_attraction: '⭐ Severdigheter', cafe: '☕ Kafé', bar: '🍸 Barer', museum: '🏛️ Kultur', park: '🌿 Parker', shopping_mall: '🛍️ Shopping' },
    askAI: 'Spør AI',
    searching: 'Søker...',
    liveMap: 'Live reisekart',
    locationPrompt: 'ReelRoam bruker din posisjon for å vise nærliggende restauranter, attraksjoner og skjulte perler — og for å drive AI-reiseguiden.',
    locationDenied: 'Posisjonstilgang er slått av. Aktiver det i innstillinger for å bruke live-kartet.',
    enableLocation: 'Aktiver posisjon',
    openSettings: 'Åpne innstillinger',
    aiItinerary: 'AI-REISEPLAN',
    placesHere: '{count} steder her',
  },
  feedCard: {
    share: 'Del',
    viewTrip: 'Se tur',
    days: 'dager',
  },
  profile: {
    edit: 'Rediger',
    follow: 'Følg',
    countries: 'Land',
    continents: 'Kontinenter',
    ofWorld: 'av verden',
    trips: 'Turer',
    destinations: 'Destinasjoner',
    saves: 'Lagret',
    worldMap: 'Verdenskart',
    country: 'land',
    countries2: 'land',
    tabTrips: 'Turer',
    tabBeen: 'Vært',
    tabBucket: 'Ønsker',
    tabBadges: 'Merker',
    noPublicTrips: 'Ingen offentlige turer ennå',
    pastTripsPrivate: 'Tidligere turer er private',
    logAdventures: 'Logg dine tidligere eventyr her',
    addPastTrip: '+ Legg til en tidligere tur',
    since: 'Siden {date}',
    travelMap: '{name}s reisekart',
    tapToMark: 'Trykk for å merke besøkt',
  },
  editProfile: {
    title: 'Rediger profil',
    sections: { profilePhoto: 'Profilbilde', basicInfo: 'Grunnleggende info', travelStyle: 'Reisestil', privacy: 'Personvern', account: 'Konto' },
    choosePhoto: 'Velg bilde',
    chooseEmoji: 'Velg emoji',
    coverPhoto: 'COVERBILDE',
    cameraRoll: 'Kamerarull',
    aiSuggested: 'AI-foreslått',
    displayName: 'Visningsnavn',
    username: 'Brukernavn',
    bio: 'Bio  {count}/120',
    homeCountry: 'Hjemland',
    yourName: 'Ditt navn',
    bioPlaceholder: 'Fortell din reisehistorie...',
    selectCountry: 'Velg ditt land',
    travelMood: 'REISESTEMNING — velg alle som passer',
    travelMoodSub: 'Dette hjelper oss med å tilpasse feeden din',
    preferredLength: 'FORETRUKKET TURVARIGHET',
    publicProfile: 'Offentlig profil',
    publicProfileSub: 'La andre oppdage profilen din',
    showBucketlist: 'Vis ønskeliste',
    showBucketlistSub: 'Synlig for andre på profilen din',
    showBeenThere: "Vis 'Vært der'-turer",
    showBadges: 'Vis merker på profil',
    email: 'E-post',
    notSignedIn: 'Ikke innlogget',
    change: 'Endre',
    cancel: 'Avbryt',
    newEmail: 'Ny e-postadresse',
    saveChanges: 'Lagre endringer',
    usernameTaken: 'Brukernavn er allerede tatt',
  },
};

const es: Translations = {
  tabs: {
    home: 'Inicio',
    explore: 'Explorar',
    discover: 'Descubrir',
    settings: 'Ajustes',
    profile: 'Perfil',
  },
  settings: {
    title: 'Ajustes',
    sections: {
      account: 'Cuenta',
      trips: 'Viajes',
      subscription: 'Suscripción',
      data: 'Datos',
      language: 'Idioma',
      about: 'Acerca de',
    },
    rows: {
      signIn: 'Iniciar sesión',
      createAccount: 'Crear cuenta',
      signOut: 'Cerrar sesión',
      account: 'Cuenta',
      editProfile: 'Editar perfil',
      addPastTrip: 'Añadir un viaje pasado',
      plan: 'Plan',
      upgradeToPro: 'Mejorar a Pro',
      restorePurchases: 'Restaurar compras',
      restoring: 'Restaurando...',
      clearAllData: 'Borrar todos los datos locales',
      privacyPolicy: 'Política de privacidad',
      version: 'Versión',
      language: 'Idioma',
    },
    alerts: {
      signOut: {
        title: 'Cerrar sesión',
        message: '¿Estás seguro de que quieres cerrar sesión?',
        cancel: 'Cancelar',
        confirm: 'Cerrar sesión',
      },
      clearData: {
        title: 'Borrar todos los datos',
        message: 'Esto eliminará tu historial local de viajes y restablecerá tu contador de viajes gratuitos. No se puede deshacer.',
        cancel: 'Cancelar',
        confirm: 'Borrar',
      },
      restored: {
        title: 'Restaurado',
        message: 'Tu suscripción Pro ha sido restaurada.',
      },
      nothingToRestore: {
        title: 'Nada que restaurar',
        message: 'No se encontró ninguna suscripción activa para esta cuenta.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Gratis ({count} viajes restantes)',
  },
  languagePicker: {
    title: 'Idioma',
    subtitle: 'Elige tu idioma preferido',
  },
  home: {
    tagline: 'Comparte · Explora · Viaja',
    placeholder: 'Pega un enlace de TikTok, Reel o YouTube',
    generate: 'Generar',
    helperText: 'La IA extrae todos los lugares y crea tu itinerario',
    noTripsRemaining: 'No quedan viajes gratuitos',
    tripsRemainingBanner: '{count} viajes gratuitos restantes',
    upgradeDefault: '{count} viajes gratuitos/mes',
    upgradeToPro: 'Mejorar a Pro',
  },
  common: {
    cancel: 'Cancelar',
    close: 'Cerrar',
  },
  discover: {
    categories: { all: '✨ Todos', beach: '🏖️ Playa', city: '🏙️ Ciudad', nature: '🏔️ Naturaleza', food: '🍜 Comida', culture: '🎭 Cultura', budget: '💰 Económico' },
    seenItAll: 'Lo has visto todo',
    adventurePrompt: '¿Listo para planear tu propia aventura?',
    generateYourOwn: 'Genera el tuyo',
    noTrips: 'Aún no hay viajes',
    noCategoryTrips: 'No hay viajes de {category}',
    beFirst: 'Sé el primero en compartir un viaje',
    tryDifferent: 'Prueba otra categoría o vuelve más tarde',
    generateTrip: 'Generar un viaje',
  },
  explore: {
    filters: { all: 'Todos', restaurant: '🍽️ Comida', tourist_attraction: '⭐ Atracciones', cafe: '☕ Café', bar: '🍸 Bares', museum: '🏛️ Cultura', park: '🌿 Parques', shopping_mall: '🛍️ Compras' },
    askAI: 'Pregunta a la IA',
    searching: 'Buscando...',
    liveMap: 'Mapa de viaje en vivo',
    locationPrompt: 'ReelRoam usa tu ubicación para mostrar restaurantes, atracciones y joyas ocultas cercanas — y para impulsar la guía de viaje IA.',
    locationDenied: 'El acceso a la ubicación está desactivado. Actívalo en Ajustes para usar el mapa en vivo.',
    enableLocation: 'Activar ubicación',
    openSettings: 'Abrir ajustes',
    aiItinerary: 'ITINERARIO IA',
    placesHere: '{count} lugares aquí',
  },
  feedCard: {
    share: 'Compartir',
    viewTrip: 'Ver viaje',
    days: 'días',
  },
  profile: {
    edit: 'Editar',
    follow: 'Seguir',
    countries: 'Países',
    continents: 'Continentes',
    ofWorld: 'del mundo',
    trips: 'Viajes',
    destinations: 'Destinos',
    saves: 'Guardados',
    worldMap: 'Mapa mundial',
    country: 'país',
    countries2: 'países',
    tabTrips: 'Viajes',
    tabBeen: 'Visitado',
    tabBucket: 'Deseos',
    tabBadges: 'Insignias',
    noPublicTrips: 'Aún no hay viajes públicos',
    pastTripsPrivate: 'Los viajes pasados son privados',
    logAdventures: 'Registra tus aventuras pasadas aquí',
    addPastTrip: '+ Añadir un viaje pasado',
    since: 'Desde {date}',
    travelMap: 'Mapa de {name}',
    tapToMark: 'Toca para marcar visitado',
  },
  editProfile: {
    title: 'Editar perfil',
    sections: { profilePhoto: 'Foto de perfil', basicInfo: 'Info básica', travelStyle: 'Estilo de viaje', privacy: 'Privacidad', account: 'Cuenta' },
    choosePhoto: 'Elegir foto',
    chooseEmoji: 'Elegir emoji',
    coverPhoto: 'FOTO DE PORTADA',
    cameraRoll: 'Galería',
    aiSuggested: 'Sugerido por IA',
    displayName: 'Nombre visible',
    username: 'Nombre de usuario',
    bio: 'Bio  {count}/120',
    homeCountry: 'País de origen',
    yourName: 'Tu nombre',
    bioPlaceholder: 'Cuenta tu historia de viaje...',
    selectCountry: 'Selecciona tu país',
    travelMood: 'ESTADO DE VIAJE — selecciona todos los que apliquen',
    travelMoodSub: 'Esto nos ayuda a personalizar tu feed',
    preferredLength: 'DURACIÓN DE VIAJE PREFERIDA',
    publicProfile: 'Perfil público',
    publicProfileSub: 'Permite que otros descubran tu perfil',
    showBucketlist: 'Mostrar lista de deseos',
    showBucketlistSub: 'Visible para otros en tu perfil',
    showBeenThere: "Mostrar viajes 'Estado allí'",
    showBadges: 'Mostrar insignias en perfil',
    email: 'Correo',
    notSignedIn: 'No has iniciado sesión',
    change: 'Cambiar',
    cancel: 'Cancelar',
    newEmail: 'Nueva dirección de correo',
    saveChanges: 'Guardar cambios',
    usernameTaken: 'Nombre de usuario ya en uso',
  },
};

const fr: Translations = {
  tabs: {
    home: 'Accueil',
    explore: 'Explorer',
    discover: 'Découvrir',
    settings: 'Paramètres',
    profile: 'Profil',
  },
  settings: {
    title: 'Paramètres',
    sections: {
      account: 'Compte',
      trips: 'Voyages',
      subscription: 'Abonnement',
      data: 'Données',
      language: 'Langue',
      about: 'À propos',
    },
    rows: {
      signIn: 'Se connecter',
      createAccount: 'Créer un compte',
      signOut: 'Se déconnecter',
      account: 'Compte',
      editProfile: 'Modifier le profil',
      addPastTrip: 'Ajouter un voyage passé',
      plan: 'Plan',
      upgradeToPro: 'Passer à Pro',
      restorePurchases: 'Restaurer les achats',
      restoring: 'Restauration...',
      clearAllData: 'Supprimer toutes les données locales',
      privacyPolicy: 'Politique de confidentialité',
      version: 'Version',
      language: 'Langue',
    },
    alerts: {
      signOut: {
        title: 'Se déconnecter',
        message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
        cancel: 'Annuler',
        confirm: 'Se déconnecter',
      },
      clearData: {
        title: 'Supprimer toutes les données',
        message: 'Cela supprimera votre historique de voyages local et réinitialisera votre compteur de voyages gratuits. Cette action est irréversible.',
        cancel: 'Annuler',
        confirm: 'Supprimer',
      },
      restored: {
        title: 'Restauré',
        message: 'Votre abonnement Pro a été restauré.',
      },
      nothingToRestore: {
        title: 'Rien à restaurer',
        message: 'Aucun abonnement actif trouvé pour ce compte.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Gratuit ({count} voyages restants)',
  },
  languagePicker: {
    title: 'Langue',
    subtitle: 'Choisissez votre langue préférée',
  },
  home: {
    tagline: 'Partager · Explorer · Voyager',
    placeholder: 'Collez un lien TikTok, Reel ou YouTube',
    generate: 'Générer',
    helperText: "L'IA extrait chaque lieu et crée votre itinéraire",
    noTripsRemaining: 'Plus de voyages gratuits',
    tripsRemainingBanner: '{count} voyages gratuits restants',
    upgradeDefault: '{count} voyages gratuits/mois',
    upgradeToPro: 'Passer à Pro',
  },
  common: {
    cancel: 'Annuler',
    close: 'Fermer',
  },
  discover: {
    categories: { all: '✨ Tous', beach: '🏖️ Plage', city: '🏙️ Ville', nature: '🏔️ Nature', food: '🍜 Cuisine', culture: '🎭 Culture', budget: '💰 Budget' },
    seenItAll: 'Tu as tout vu',
    adventurePrompt: "Prêt à planifier ta propre aventure ?",
    generateYourOwn: 'Générer le tien',
    noTrips: 'Pas encore de voyages',
    noCategoryTrips: 'Pas de voyages {category}',
    beFirst: 'Sois le premier à partager un voyage',
    tryDifferent: 'Essaie une autre catégorie ou reviens plus tard',
    generateTrip: 'Générer un voyage',
  },
  explore: {
    filters: { all: 'Tous', restaurant: '🍽️ Cuisine', tourist_attraction: '⭐ Attractions', cafe: '☕ Café', bar: '🍸 Bars', museum: '🏛️ Culture', park: '🌿 Parcs', shopping_mall: '🛍️ Shopping' },
    askAI: "Demander à l'IA",
    searching: 'Recherche...',
    liveMap: 'Carte de voyage en direct',
    locationPrompt: 'ReelRoam utilise votre position pour afficher les restaurants, attractions et trésors cachés à proximité — et pour alimenter le guide de voyage IA.',
    locationDenied: "L'accès à la localisation est désactivé. Activez-le dans Réglages pour utiliser la carte en direct.",
    enableLocation: 'Activer la localisation',
    openSettings: 'Ouvrir les réglages',
    aiItinerary: 'ITINÉRAIRE IA',
    placesHere: '{count} endroits ici',
  },
  feedCard: {
    share: 'Partager',
    viewTrip: 'Voir le voyage',
    days: 'jours',
  },
  profile: {
    edit: 'Modifier',
    follow: 'Suivre',
    countries: 'Pays',
    continents: 'Continents',
    ofWorld: 'du monde',
    trips: 'Voyages',
    destinations: 'Destinations',
    saves: 'Sauvegardes',
    worldMap: 'Carte du monde',
    country: 'pays',
    countries2: 'pays',
    tabTrips: 'Voyages',
    tabBeen: 'Visité',
    tabBucket: 'Liste',
    tabBadges: 'Badges',
    noPublicTrips: 'Pas encore de voyages publics',
    pastTripsPrivate: 'Les voyages passés sont privés',
    logAdventures: 'Enregistre tes aventures passées ici',
    addPastTrip: '+ Ajouter un voyage passé',
    since: 'Depuis {date}',
    travelMap: 'Carte de {name}',
    tapToMark: 'Appuie pour marquer visité',
  },
  editProfile: {
    title: 'Modifier le profil',
    sections: { profilePhoto: 'Photo de profil', basicInfo: 'Infos de base', travelStyle: 'Style de voyage', privacy: 'Confidentialité', account: 'Compte' },
    choosePhoto: 'Choisir une photo',
    chooseEmoji: 'Choisir un emoji',
    coverPhoto: 'PHOTO DE COUVERTURE',
    cameraRoll: 'Pellicule',
    aiSuggested: 'Suggéré par IA',
    displayName: 'Nom affiché',
    username: "Nom d'utilisateur",
    bio: 'Bio  {count}/120',
    homeCountry: "Pays d'origine",
    yourName: 'Ton prénom',
    bioPlaceholder: 'Raconte ton histoire de voyage...',
    selectCountry: 'Sélectionne ton pays',
    travelMood: "HUMEUR DE VOYAGE — coche tout ce qui s'applique",
    travelMoodSub: 'Cela nous aide à personnaliser ton fil',
    preferredLength: 'DURÉE DE VOYAGE PRÉFÉRÉE',
    publicProfile: 'Profil public',
    publicProfileSub: 'Permet aux autres de découvrir ton profil',
    showBucketlist: 'Afficher la liste',
    showBucketlistSub: 'Visible par les autres sur ton profil',
    showBeenThere: "Afficher les voyages 'Déjà visité'",
    showBadges: 'Afficher les badges sur le profil',
    email: 'E-mail',
    notSignedIn: 'Non connecté',
    change: 'Modifier',
    cancel: 'Annuler',
    newEmail: 'Nouvelle adresse e-mail',
    saveChanges: 'Enregistrer les modifications',
    usernameTaken: "Nom d'utilisateur déjà pris",
  },
};

const de: Translations = {
  tabs: {
    home: 'Start',
    explore: 'Erkunden',
    discover: 'Entdecken',
    settings: 'Einstellungen',
    profile: 'Profil',
  },
  settings: {
    title: 'Einstellungen',
    sections: {
      account: 'Konto',
      trips: 'Reisen',
      subscription: 'Abonnement',
      data: 'Daten',
      language: 'Sprache',
      about: 'Über',
    },
    rows: {
      signIn: 'Anmelden',
      createAccount: 'Konto erstellen',
      signOut: 'Abmelden',
      account: 'Konto',
      editProfile: 'Profil bearbeiten',
      addPastTrip: 'Vergangene Reise hinzufügen',
      plan: 'Plan',
      upgradeToPro: 'Auf Pro upgraden',
      restorePurchases: 'Käufe wiederherstellen',
      restoring: 'Wird wiederhergestellt...',
      clearAllData: 'Alle lokalen Daten löschen',
      privacyPolicy: 'Datenschutzrichtlinie',
      version: 'Version',
      language: 'Sprache',
    },
    alerts: {
      signOut: {
        title: 'Abmelden',
        message: 'Möchtest du dich wirklich abmelden?',
        cancel: 'Abbrechen',
        confirm: 'Abmelden',
      },
      clearData: {
        title: 'Alle Daten löschen',
        message: 'Dies löscht deinen lokalen Reiseverlauf und setzt deinen kostenlosen Reisezähler zurück. Dies kann nicht rückgängig gemacht werden.',
        cancel: 'Abbrechen',
        confirm: 'Löschen',
      },
      restored: {
        title: 'Wiederhergestellt',
        message: 'Dein Pro-Abonnement wurde wiederhergestellt.',
      },
      nothingToRestore: {
        title: 'Nichts wiederherzustellen',
        message: 'Kein aktives Abonnement für dieses Konto gefunden.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Kostenlos ({count} Reisen übrig)',
  },
  languagePicker: {
    title: 'Sprache',
    subtitle: 'Wähle deine bevorzugte Sprache',
  },
  home: {
    tagline: 'Teilen · Erkunden · Reisen',
    placeholder: 'TikTok-, Reel- oder YouTube-Link einfügen',
    generate: 'Generieren',
    helperText: 'KI extrahiert jeden Ort und erstellt deine Reiseroute',
    noTripsRemaining: 'Keine kostenlosen Reisen mehr',
    tripsRemainingBanner: '{count} kostenlose Reisen übrig',
    upgradeDefault: '{count} kostenlose Reisen/Monat',
    upgradeToPro: 'Auf Pro upgraden',
  },
  common: {
    cancel: 'Abbrechen',
    close: 'Schließen',
  },
  discover: {
    categories: { all: '✨ Alle', beach: '🏖️ Strand', city: '🏙️ Stadt', nature: '🏔️ Natur', food: '🍜 Essen', culture: '🎭 Kultur', budget: '💰 Budget' },
    seenItAll: 'Du hast alles gesehen',
    adventurePrompt: 'Bereit, dein eigenes Abenteuer zu planen?',
    generateYourOwn: 'Eigene erstellen',
    noTrips: 'Noch keine Reisen',
    noCategoryTrips: 'Keine {category}-Reisen',
    beFirst: 'Sei der Erste, der eine Reise teilt',
    tryDifferent: 'Versuche eine andere Kategorie oder schau später vorbei',
    generateTrip: 'Reise generieren',
  },
  explore: {
    filters: { all: 'Alle', restaurant: '🍽️ Essen', tourist_attraction: '⭐ Sehenswürdigkeiten', cafe: '☕ Café', bar: '🍸 Bars', museum: '🏛️ Kultur', park: '🌿 Parks', shopping_mall: '🛍️ Shopping' },
    askAI: 'KI fragen',
    searching: 'Suche...',
    liveMap: 'Live-Reisekarte',
    locationPrompt: 'ReelRoam nutzt deinen Standort, um nahegelegene Restaurants, Attraktionen und versteckte Schätze zu zeigen — und den KI-Reiseführer anzutreiben.',
    locationDenied: 'Standortzugriff ist deaktiviert. Aktiviere ihn in den Einstellungen, um die Live-Karte zu nutzen.',
    enableLocation: 'Standort aktivieren',
    openSettings: 'Einstellungen öffnen',
    aiItinerary: 'KI-REISEPLAN',
    placesHere: '{count} Orte hier',
  },
  feedCard: {
    share: 'Teilen',
    viewTrip: 'Reise ansehen',
    days: 'Tage',
  },
  profile: {
    edit: 'Bearbeiten',
    follow: 'Folgen',
    countries: 'Länder',
    continents: 'Kontinente',
    ofWorld: 'der Welt',
    trips: 'Reisen',
    destinations: 'Reiseziele',
    saves: 'Gespeichert',
    worldMap: 'Weltkarte',
    country: 'Land',
    countries2: 'Länder',
    tabTrips: 'Reisen',
    tabBeen: 'War da',
    tabBucket: 'Wunsch',
    tabBadges: 'Abzeichen',
    noPublicTrips: 'Noch keine öffentlichen Reisen',
    pastTripsPrivate: 'Vergangene Reisen sind privat',
    logAdventures: 'Protokolliere deine vergangenen Abenteuer hier',
    addPastTrip: '+ Vergangene Reise hinzufügen',
    since: 'Seit {date}',
    travelMap: '{name}s Reisekarte',
    tapToMark: 'Tippe um als besucht zu markieren',
  },
  editProfile: {
    title: 'Profil bearbeiten',
    sections: { profilePhoto: 'Profilfoto', basicInfo: 'Grundlegende Infos', travelStyle: 'Reisestil', privacy: 'Datenschutz', account: 'Konto' },
    choosePhoto: 'Foto auswählen',
    chooseEmoji: 'Emoji auswählen',
    coverPhoto: 'TITELBILD',
    cameraRoll: 'Kamerarolle',
    aiSuggested: 'KI-Vorschlag',
    displayName: 'Anzeigename',
    username: 'Benutzername',
    bio: 'Bio  {count}/120',
    homeCountry: 'Heimatland',
    yourName: 'Dein Name',
    bioPlaceholder: 'Erzähl deine Reisegeschichte...',
    selectCountry: 'Wähle dein Land',
    travelMood: 'REISESTIMMUNG — alle zutreffenden auswählen',
    travelMoodSub: 'Das hilft uns, deinen Feed zu personalisieren',
    preferredLength: 'BEVORZUGTE REISEDAUER',
    publicProfile: 'Öffentliches Profil',
    publicProfileSub: 'Anderen erlauben, dein Profil zu entdecken',
    showBucketlist: 'Bucketlist anzeigen',
    showBucketlistSub: 'Für andere auf deinem Profil sichtbar',
    showBeenThere: "'War dort'-Reisen anzeigen",
    showBadges: 'Abzeichen auf Profil anzeigen',
    email: 'E-Mail',
    notSignedIn: 'Nicht angemeldet',
    change: 'Ändern',
    cancel: 'Abbrechen',
    newEmail: 'Neue E-Mail-Adresse',
    saveChanges: 'Änderungen speichern',
    usernameTaken: 'Benutzername bereits vergeben',
  },
};

const pt: Translations = {
  tabs: {
    home: 'Início',
    explore: 'Explorar',
    discover: 'Descobrir',
    settings: 'Configurações',
    profile: 'Perfil',
  },
  settings: {
    title: 'Configurações',
    sections: {
      account: 'Conta',
      trips: 'Viagens',
      subscription: 'Assinatura',
      data: 'Dados',
      language: 'Idioma',
      about: 'Sobre',
    },
    rows: {
      signIn: 'Entrar',
      createAccount: 'Criar conta',
      signOut: 'Sair',
      account: 'Conta',
      editProfile: 'Editar perfil',
      addPastTrip: 'Adicionar viagem anterior',
      plan: 'Plano',
      upgradeToPro: 'Atualizar para Pro',
      restorePurchases: 'Restaurar compras',
      restoring: 'Restaurando...',
      clearAllData: 'Limpar todos os dados locais',
      privacyPolicy: 'Política de privacidade',
      version: 'Versão',
      language: 'Idioma',
    },
    alerts: {
      signOut: {
        title: 'Sair',
        message: 'Tem certeza de que deseja sair?',
        cancel: 'Cancelar',
        confirm: 'Sair',
      },
      clearData: {
        title: 'Limpar todos os dados',
        message: 'Isso excluirá seu histórico local de viagens e redefinirá seu contador de viagens gratuitas. Esta ação não pode ser desfeita.',
        cancel: 'Cancelar',
        confirm: 'Limpar',
      },
      restored: {
        title: 'Restaurado',
        message: 'Sua assinatura Pro foi restaurada.',
      },
      nothingToRestore: {
        title: 'Nada para restaurar',
        message: 'Nenhuma assinatura ativa encontrada para esta conta.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Gratuito ({count} viagens restantes)',
  },
  languagePicker: {
    title: 'Idioma',
    subtitle: 'Escolha seu idioma preferido',
  },
  home: {
    tagline: 'Compartilhar · Explorar · Viajar',
    placeholder: 'Cole um link do TikTok, Reel ou YouTube',
    generate: 'Gerar',
    helperText: 'A IA extrai cada local e cria seu itinerário',
    noTripsRemaining: 'Sem viagens gratuitas restantes',
    tripsRemainingBanner: '{count} viagens gratuitas restantes',
    upgradeDefault: '{count} viagens gratuitas/mês',
    upgradeToPro: 'Atualizar para Pro',
  },
  common: {
    cancel: 'Cancelar',
    close: 'Fechar',
  },
  discover: {
    categories: { all: '✨ Todos', beach: '🏖️ Praia', city: '🏙️ Cidade', nature: '🏔️ Natureza', food: '🍜 Comida', culture: '🎭 Cultura', budget: '💰 Econômico' },
    seenItAll: 'Você viu tudo',
    adventurePrompt: 'Pronto para planejar sua própria aventura?',
    generateYourOwn: 'Gerar o seu',
    noTrips: 'Ainda sem viagens',
    noCategoryTrips: 'Sem viagens de {category}',
    beFirst: 'Seja o primeiro a compartilhar uma viagem',
    tryDifferent: 'Tente outra categoria ou volte mais tarde',
    generateTrip: 'Gerar uma viagem',
  },
  explore: {
    filters: { all: 'Todos', restaurant: '🍽️ Comida', tourist_attraction: '⭐ Atrações', cafe: '☕ Café', bar: '🍸 Bares', museum: '🏛️ Cultura', park: '🌿 Parques', shopping_mall: '🛍️ Compras' },
    askAI: 'Perguntar à IA',
    searching: 'Buscando...',
    liveMap: 'Mapa de viagem ao vivo',
    locationPrompt: 'ReelRoam usa sua localização para mostrar restaurantes, atrações e joias escondidas próximas — e para alimentar o guia de viagem IA.',
    locationDenied: 'O acesso à localização está desativado. Ative-o em Configurações para usar o mapa ao vivo.',
    enableLocation: 'Ativar localização',
    openSettings: 'Abrir configurações',
    aiItinerary: 'ROTEIRO IA',
    placesHere: '{count} lugares aqui',
  },
  feedCard: {
    share: 'Compartilhar',
    viewTrip: 'Ver viagem',
    days: 'dias',
  },
  profile: {
    edit: 'Editar',
    follow: 'Seguir',
    countries: 'Países',
    continents: 'Continentes',
    ofWorld: 'do mundo',
    trips: 'Viagens',
    destinations: 'Destinos',
    saves: 'Salvos',
    worldMap: 'Mapa mundial',
    country: 'país',
    countries2: 'países',
    tabTrips: 'Viagens',
    tabBeen: 'Estive',
    tabBucket: 'Lista',
    tabBadges: 'Medalhas',
    noPublicTrips: 'Ainda sem viagens públicas',
    pastTripsPrivate: 'Viagens passadas são privadas',
    logAdventures: 'Registre suas aventuras passadas aqui',
    addPastTrip: '+ Adicionar viagem anterior',
    since: 'Desde {date}',
    travelMap: 'Mapa de {name}',
    tapToMark: 'Toque para marcar visitado',
  },
  editProfile: {
    title: 'Editar perfil',
    sections: { profilePhoto: 'Foto de perfil', basicInfo: 'Informações básicas', travelStyle: 'Estilo de viagem', privacy: 'Privacidade', account: 'Conta' },
    choosePhoto: 'Escolher foto',
    chooseEmoji: 'Escolher emoji',
    coverPhoto: 'FOTO DE CAPA',
    cameraRoll: 'Câmera',
    aiSuggested: 'Sugerido por IA',
    displayName: 'Nome de exibição',
    username: 'Nome de usuário',
    bio: 'Bio  {count}/120',
    homeCountry: 'País natal',
    yourName: 'Seu nome',
    bioPlaceholder: 'Conte sua história de viagem...',
    selectCountry: 'Selecione seu país',
    travelMood: 'HUMOR DE VIAGEM — selecione todos que se aplicam',
    travelMoodSub: 'Isso nos ajuda a personalizar seu feed',
    preferredLength: 'DURAÇÃO PREFERIDA DE VIAGEM',
    publicProfile: 'Perfil público',
    publicProfileSub: 'Permitir que outros descubram seu perfil',
    showBucketlist: 'Mostrar lista de desejos',
    showBucketlistSub: 'Visível para outros no seu perfil',
    showBeenThere: "Mostrar viagens 'Já estive'",
    showBadges: 'Mostrar medalhas no perfil',
    email: 'E-mail',
    notSignedIn: 'Não conectado',
    change: 'Alterar',
    cancel: 'Cancelar',
    newEmail: 'Novo endereço de e-mail',
    saveChanges: 'Salvar alterações',
    usernameTaken: 'Nome de usuário já em uso',
  },
};

const it: Translations = {
  tabs: {
    home: 'Home',
    explore: 'Esplora',
    discover: 'Scopri',
    settings: 'Impostazioni',
    profile: 'Profilo',
  },
  settings: {
    title: 'Impostazioni',
    sections: {
      account: 'Account',
      trips: 'Viaggi',
      subscription: 'Abbonamento',
      data: 'Dati',
      language: 'Lingua',
      about: 'Informazioni',
    },
    rows: {
      signIn: 'Accedi',
      createAccount: 'Crea account',
      signOut: 'Esci',
      account: 'Account',
      editProfile: 'Modifica profilo',
      addPastTrip: 'Aggiungi un viaggio passato',
      plan: 'Piano',
      upgradeToPro: 'Passa a Pro',
      restorePurchases: 'Ripristina acquisti',
      restoring: 'Ripristino...',
      clearAllData: 'Cancella tutti i dati locali',
      privacyPolicy: 'Informativa sulla privacy',
      version: 'Versione',
      language: 'Lingua',
    },
    alerts: {
      signOut: {
        title: 'Esci',
        message: 'Sei sicuro di voler uscire?',
        cancel: 'Annulla',
        confirm: 'Esci',
      },
      clearData: {
        title: 'Cancella tutti i dati',
        message: 'Questo eliminerà la cronologia locale dei viaggi e azzererà il contatore dei viaggi gratuiti. Non è possibile annullare.',
        cancel: 'Annulla',
        confirm: 'Cancella',
      },
      restored: {
        title: 'Ripristinato',
        message: 'Il tuo abbonamento Pro è stato ripristinato.',
      },
      nothingToRestore: {
        title: 'Nulla da ripristinare',
        message: 'Nessun abbonamento attivo trovato per questo account.',
      },
    },
    planPro: 'Pro ✨',
    planFree: 'Gratuito ({count} viaggi rimasti)',
  },
  languagePicker: {
    title: 'Lingua',
    subtitle: 'Scegli la tua lingua preferita',
  },
  home: {
    tagline: 'Condividi · Esplora · Viaggia',
    placeholder: 'Incolla un link TikTok, Reel o YouTube',
    generate: 'Genera',
    helperText: "L'IA estrae ogni luogo e crea il tuo itinerario",
    noTripsRemaining: 'Nessun viaggio gratuito rimasto',
    tripsRemainingBanner: '{count} viaggi gratuiti rimasti',
    upgradeDefault: '{count} viaggi gratuiti/mese',
    upgradeToPro: 'Passa a Pro',
  },
  common: {
    cancel: 'Annulla',
    close: 'Chiudi',
  },
  discover: {
    categories: { all: '✨ Tutti', beach: '🏖️ Spiaggia', city: '🏙️ Città', nature: '🏔️ Natura', food: '🍜 Cibo', culture: '🎭 Cultura', budget: '💰 Budget' },
    seenItAll: 'Hai visto tutto',
    adventurePrompt: 'Pronto per pianificare la tua avventura?',
    generateYourOwn: 'Genera il tuo',
    noTrips: 'Ancora nessun viaggio',
    noCategoryTrips: 'Nessun viaggio {category}',
    beFirst: 'Sii il primo a condividere un viaggio',
    tryDifferent: 'Prova un\'altra categoria o ricontrolla più tardi',
    generateTrip: 'Genera un viaggio',
  },
  explore: {
    filters: { all: 'Tutti', restaurant: '🍽️ Cibo', tourist_attraction: '⭐ Attrazioni', cafe: '☕ Caffè', bar: '🍸 Bar', museum: '🏛️ Cultura', park: '🌿 Parchi', shopping_mall: '🛍️ Shopping' },
    askAI: "Chiedi all'IA",
    searching: 'Ricerca...',
    liveMap: 'Mappa di viaggio dal vivo',
    locationPrompt: 'ReelRoam usa la tua posizione per mostrare ristoranti, attrazioni e gemme nascoste vicine — e per alimentare la guida di viaggio IA.',
    locationDenied: "L'accesso alla posizione è disattivato. Abilitalo nelle Impostazioni per usare la mappa dal vivo.",
    enableLocation: 'Attiva posizione',
    openSettings: 'Apri impostazioni',
    aiItinerary: 'ITINERARIO IA',
    placesHere: '{count} posti qui',
  },
  feedCard: {
    share: 'Condividi',
    viewTrip: 'Vedi viaggio',
    days: 'giorni',
  },
  profile: {
    edit: 'Modifica',
    follow: 'Segui',
    countries: 'Paesi',
    continents: 'Continenti',
    ofWorld: 'del mondo',
    trips: 'Viaggi',
    destinations: 'Destinazioni',
    saves: 'Salvati',
    worldMap: 'Mappa del mondo',
    country: 'paese',
    countries2: 'paesi',
    tabTrips: 'Viaggi',
    tabBeen: 'Visitato',
    tabBucket: 'Lista',
    tabBadges: 'Badge',
    noPublicTrips: 'Ancora nessun viaggio pubblico',
    pastTripsPrivate: 'I viaggi passati sono privati',
    logAdventures: 'Registra le tue avventure passate qui',
    addPastTrip: '+ Aggiungi un viaggio passato',
    since: 'Da {date}',
    travelMap: 'Mappa di {name}',
    tapToMark: 'Tocca per segnare visitato',
  },
  editProfile: {
    title: 'Modifica profilo',
    sections: { profilePhoto: 'Foto profilo', basicInfo: 'Info di base', travelStyle: 'Stile di viaggio', privacy: 'Privacy', account: 'Account' },
    choosePhoto: 'Scegli foto',
    chooseEmoji: 'Scegli emoji',
    coverPhoto: 'FOTO DI COPERTINA',
    cameraRoll: 'Rullino',
    aiSuggested: "Suggerito dall'IA",
    displayName: 'Nome visualizzato',
    username: 'Nome utente',
    bio: 'Bio  {count}/120',
    homeCountry: "Paese d'origine",
    yourName: 'Il tuo nome',
    bioPlaceholder: 'Racconta la tua storia di viaggio...',
    selectCountry: 'Seleziona il tuo paese',
    travelMood: 'UMORE DI VIAGGIO — seleziona tutto ciò che si applica',
    travelMoodSub: 'Questo ci aiuta a personalizzare il tuo feed',
    preferredLength: 'DURATA PREFERITA DEL VIAGGIO',
    publicProfile: 'Profilo pubblico',
    publicProfileSub: 'Permetti ad altri di scoprire il tuo profilo',
    showBucketlist: 'Mostra lista dei desideri',
    showBucketlistSub: 'Visibile agli altri sul tuo profilo',
    showBeenThere: "Mostra viaggi 'Già visitato'",
    showBadges: 'Mostra badge sul profilo',
    email: 'Email',
    notSignedIn: 'Non connesso',
    change: 'Modifica',
    cancel: 'Annulla',
    newEmail: 'Nuovo indirizzo email',
    saveChanges: 'Salva modifiche',
    usernameTaken: 'Nome utente già in uso',
  },
};

const ja: Translations = {
  tabs: {
    home: 'ホーム',
    explore: '探索',
    discover: '発見',
    settings: '設定',
    profile: 'プロフィール',
  },
  settings: {
    title: '設定',
    sections: {
      account: 'アカウント',
      trips: '旅行',
      subscription: 'サブスクリプション',
      data: 'データ',
      language: '言語',
      about: '情報',
    },
    rows: {
      signIn: 'サインイン',
      createAccount: 'アカウント作成',
      signOut: 'サインアウト',
      account: 'アカウント',
      editProfile: 'プロフィール編集',
      addPastTrip: '過去の旅行を追加',
      plan: 'プラン',
      upgradeToPro: 'Proにアップグレード',
      restorePurchases: '購入を復元',
      restoring: '復元中...',
      clearAllData: 'すべてのローカルデータを削除',
      privacyPolicy: 'プライバシーポリシー',
      version: 'バージョン',
      language: '言語',
    },
    alerts: {
      signOut: {
        title: 'サインアウト',
        message: 'サインアウトしてもよろしいですか？',
        cancel: 'キャンセル',
        confirm: 'サインアウト',
      },
      clearData: {
        title: 'すべてのデータを削除',
        message: 'ローカルの旅行履歴が削除され、無料旅行カウンターがリセットされます。この操作は元に戻せません。',
        cancel: 'キャンセル',
        confirm: '削除',
      },
      restored: {
        title: '復元完了',
        message: 'Proサブスクリプションが復元されました。',
      },
      nothingToRestore: {
        title: '復元するものがありません',
        message: 'このアカウントのアクティブなサブスクリプションが見つかりませんでした。',
      },
    },
    planPro: 'Pro ✨',
    planFree: '無料（残り{count}回）',
  },
  languagePicker: {
    title: '言語',
    subtitle: '使用言語を選択してください',
  },
  home: {
    tagline: 'シェア · 探索 · 旅へ',
    placeholder: 'TikTok、Reel、YouTubeのリンクを貼り付け',
    generate: '生成',
    helperText: 'AIがすべての場所を抽出し、旅程を作成します',
    noTripsRemaining: '無料旅行の残りなし',
    tripsRemainingBanner: '残り{count}回の無料旅行',
    upgradeDefault: '月{count}回の無料旅行',
    upgradeToPro: 'Proにアップグレード',
  },
  common: {
    cancel: 'キャンセル',
    close: '閉じる',
  },
  discover: {
    categories: { all: '✨ すべて', beach: '🏖️ ビーチ', city: '🏙️ 都市', nature: '🏔️ 自然', food: '🍜 グルメ', culture: '🎭 文化', budget: '💰 節約' },
    seenItAll: 'すべて見ました',
    adventurePrompt: '自分だけの冒険を計画しませんか？',
    generateYourOwn: '自分で生成',
    noTrips: 'まだ旅行がありません',
    noCategoryTrips: '{category}の旅行はありません',
    beFirst: '最初に旅行をシェアしましょう',
    tryDifferent: '別のカテゴリを試すか後で確認してください',
    generateTrip: '旅行を生成',
  },
  explore: {
    filters: { all: 'すべて', restaurant: '🍽️ グルメ', tourist_attraction: '⭐ 観光', cafe: '☕ カフェ', bar: '🍸 バー', museum: '🏛️ 文化', park: '🌿 公園', shopping_mall: '🛍️ ショッピング' },
    askAI: 'AIに聞く',
    searching: '検索中...',
    liveMap: 'ライブ旅行マップ',
    locationPrompt: 'ReelRoamは位置情報を使用して近くのレストラン、観光スポット、隠れた名所を表示します。',
    locationDenied: '位置情報へのアクセスがオフになっています。設定で有効にしてライブマップを使用してください。',
    enableLocation: '位置情報を有効にする',
    openSettings: '設定を開く',
    aiItinerary: 'AI旅程',
    placesHere: 'ここに{count}か所',
  },
  feedCard: {
    share: 'シェア',
    viewTrip: '旅行を見る',
    days: '日',
  },
  profile: {
    edit: '編集',
    follow: 'フォロー',
    countries: '国',
    continents: '大陸',
    ofWorld: '世界の',
    trips: '旅行',
    destinations: '目的地',
    saves: '保存',
    worldMap: '世界地図',
    country: 'カ国',
    countries2: 'カ国',
    tabTrips: '旅行',
    tabBeen: '訪問済',
    tabBucket: 'バケツ',
    tabBadges: 'バッジ',
    noPublicTrips: 'まだ公開旅行がありません',
    pastTripsPrivate: '過去の旅行は非公開です',
    logAdventures: '過去の冒険をここに記録してください',
    addPastTrip: '+ 過去の旅行を追加',
    since: '{date}から',
    travelMap: '{name}の旅行マップ',
    tapToMark: 'タップして訪問済みにマーク',
  },
  editProfile: {
    title: 'プロフィール編集',
    sections: { profilePhoto: 'プロフィール写真', basicInfo: '基本情報', travelStyle: '旅行スタイル', privacy: 'プライバシー', account: 'アカウント' },
    choosePhoto: '写真を選択',
    chooseEmoji: '絵文字を選択',
    coverPhoto: 'カバー写真',
    cameraRoll: 'カメラロール',
    aiSuggested: 'AI提案',
    displayName: '表示名',
    username: 'ユーザー名',
    bio: 'Bio  {count}/120',
    homeCountry: '出身国',
    yourName: 'お名前',
    bioPlaceholder: '旅の物語を教えてください...',
    selectCountry: '国を選択してください',
    travelMood: '旅行の気分 — 当てはまるものを全て選択',
    travelMoodSub: 'これによりフィードをカスタマイズします',
    preferredLength: '希望の旅行期間',
    publicProfile: '公開プロフィール',
    publicProfileSub: '他のユーザーがプロフィールを見つけられる',
    showBucketlist: 'バケツリストを表示',
    showBucketlistSub: 'プロフィールで他の人に表示される',
    showBeenThere: '訪問済み旅行を表示',
    showBadges: 'プロフィールにバッジを表示',
    email: 'メール',
    notSignedIn: 'サインインしていません',
    change: '変更',
    cancel: 'キャンセル',
    newEmail: '新しいメールアドレス',
    saveChanges: '変更を保存',
    usernameTaken: 'ユーザー名は既に使用されています',
  },
};

const zh: Translations = {
  tabs: {
    home: '首页',
    explore: '探索',
    discover: '发现',
    settings: '设置',
    profile: '个人资料',
  },
  settings: {
    title: '设置',
    sections: {
      account: '账户',
      trips: '旅行',
      subscription: '订阅',
      data: '数据',
      language: '语言',
      about: '关于',
    },
    rows: {
      signIn: '登录',
      createAccount: '创建账户',
      signOut: '退出登录',
      account: '账户',
      editProfile: '编辑资料',
      addPastTrip: '添加过去的旅行',
      plan: '计划',
      upgradeToPro: '升级到专业版',
      restorePurchases: '恢复购买',
      restoring: '恢复中...',
      clearAllData: '清除所有本地数据',
      privacyPolicy: '隐私政策',
      version: '版本',
      language: '语言',
    },
    alerts: {
      signOut: {
        title: '退出登录',
        message: '您确定要退出登录吗？',
        cancel: '取消',
        confirm: '退出',
      },
      clearData: {
        title: '清除所有数据',
        message: '这将删除您的本地旅行记录并重置免费旅行次数。此操作无法撤销。',
        cancel: '取消',
        confirm: '清除',
      },
      restored: {
        title: '已恢复',
        message: '您的专业版订阅已恢复。',
      },
      nothingToRestore: {
        title: '无可恢复内容',
        message: '未找到此账户的活跃订阅。',
      },
    },
    planPro: '专业版 ✨',
    planFree: '免费版（剩余{count}次旅行）',
  },
  languagePicker: {
    title: '语言',
    subtitle: '选择您的首选语言',
  },
  home: {
    tagline: '分享 · 探索 · 出发',
    placeholder: '粘贴TikTok、Reel或YouTube链接',
    generate: '生成',
    helperText: 'AI提取每个地点并为您创建行程',
    noTripsRemaining: '没有剩余的免费旅行',
    tripsRemainingBanner: '剩余{count}次免费旅行',
    upgradeDefault: '每月{count}次免费旅行',
    upgradeToPro: '升级到专业版',
  },
  common: {
    cancel: '取消',
    close: '关闭',
  },
  discover: {
    categories: { all: '✨ 全部', beach: '🏖️ 海滩', city: '🏙️ 城市', nature: '🏔️ 自然', food: '🍜 美食', culture: '🎭 文化', budget: '💰 经济' },
    seenItAll: '你已经看完了',
    adventurePrompt: '准备好规划自己的冒险了吗？',
    generateYourOwn: '生成自己的',
    noTrips: '还没有旅行',
    noCategoryTrips: '没有{category}旅行',
    beFirst: '成为第一个分享旅行的人',
    tryDifferent: '尝试其他类别或稍后再查看',
    generateTrip: '生成旅行',
  },
  explore: {
    filters: { all: '全部', restaurant: '🍽️ 美食', tourist_attraction: '⭐ 景点', cafe: '☕ 咖啡', bar: '🍸 酒吧', museum: '🏛️ 文化', park: '🌿 公园', shopping_mall: '🛍️ 购物' },
    askAI: '问AI',
    searching: '搜索中...',
    liveMap: '实时旅行地图',
    locationPrompt: 'ReelRoam使用您的位置显示附近的餐厅、景点和隐藏宝藏，并为AI旅行指南提供支持。',
    locationDenied: '位置访问已关闭。在设置中启用它以使用实时地图。',
    enableLocation: '启用位置',
    openSettings: '打开设置',
    aiItinerary: 'AI行程',
    placesHere: '这里{count}个地点',
  },
  feedCard: {
    share: '分享',
    viewTrip: '查看旅行',
    days: '天',
  },
  profile: {
    edit: '编辑',
    follow: '关注',
    countries: '国家',
    continents: '大洲',
    ofWorld: '世界',
    trips: '旅行',
    destinations: '目的地',
    saves: '收藏',
    worldMap: '世界地图',
    country: '个国家',
    countries2: '个国家',
    tabTrips: '旅行',
    tabBeen: '去过',
    tabBucket: '心愿',
    tabBadges: '徽章',
    noPublicTrips: '还没有公开旅行',
    pastTripsPrivate: '过去的旅行是私密的',
    logAdventures: '在此记录您的过去冒险',
    addPastTrip: '+ 添加过去的旅行',
    since: '自{date}',
    travelMap: '{name}的旅行地图',
    tapToMark: '点击标记已访问',
  },
  editProfile: {
    title: '编辑资料',
    sections: { profilePhoto: '个人照片', basicInfo: '基本信息', travelStyle: '旅行风格', privacy: '隐私', account: '账户' },
    choosePhoto: '选择照片',
    chooseEmoji: '选择表情',
    coverPhoto: '封面照片',
    cameraRoll: '相册',
    aiSuggested: 'AI建议',
    displayName: '显示名',
    username: '用户名',
    bio: 'Bio  {count}/120',
    homeCountry: '国籍',
    yourName: '你的名字',
    bioPlaceholder: '讲述您的旅行故事...',
    selectCountry: '选择您的国家',
    travelMood: '旅行心情 — 选择所有适用的',
    travelMoodSub: '这有助于我们为您个性化feed',
    preferredLength: '首选旅行时长',
    publicProfile: '公开资料',
    publicProfileSub: '允许其他人发现您的资料',
    showBucketlist: '显示心愿单',
    showBucketlistSub: '在您的资料上对他人可见',
    showBeenThere: "显示'去过'旅行",
    showBadges: '在资料上显示徽章',
    email: '邮箱',
    notSignedIn: '未登录',
    change: '更改',
    cancel: '取消',
    newEmail: '新邮箱地址',
    saveChanges: '保存更改',
    usernameTaken: '用户名已被占用',
  },
};

const ko: Translations = {
  tabs: {
    home: '홈',
    explore: '탐색',
    discover: '발견',
    settings: '설정',
    profile: '프로필',
  },
  settings: {
    title: '설정',
    sections: {
      account: '계정',
      trips: '여행',
      subscription: '구독',
      data: '데이터',
      language: '언어',
      about: '정보',
    },
    rows: {
      signIn: '로그인',
      createAccount: '계정 만들기',
      signOut: '로그아웃',
      account: '계정',
      editProfile: '프로필 편집',
      addPastTrip: '과거 여행 추가',
      plan: '플랜',
      upgradeToPro: 'Pro로 업그레이드',
      restorePurchases: '구매 복원',
      restoring: '복원 중...',
      clearAllData: '모든 로컬 데이터 삭제',
      privacyPolicy: '개인정보처리방침',
      version: '버전',
      language: '언어',
    },
    alerts: {
      signOut: {
        title: '로그아웃',
        message: '정말 로그아웃하시겠어요?',
        cancel: '취소',
        confirm: '로그아웃',
      },
      clearData: {
        title: '모든 데이터 삭제',
        message: '로컬 여행 기록이 삭제되고 무료 여행 횟수가 초기화됩니다. 이 작업은 취소할 수 없습니다.',
        cancel: '취소',
        confirm: '삭제',
      },
      restored: {
        title: '복원 완료',
        message: 'Pro 구독이 복원되었습니다.',
      },
      nothingToRestore: {
        title: '복원할 항목 없음',
        message: '이 계정에서 활성 구독을 찾을 수 없습니다.',
      },
    },
    planPro: 'Pro ✨',
    planFree: '무료 (여행 {count}회 남음)',
  },
  languagePicker: {
    title: '언어',
    subtitle: '사용할 언어를 선택하세요',
  },
  home: {
    tagline: '공유 · 탐색 · 출발',
    placeholder: 'TikTok, Reel 또는 YouTube 링크 붙여넣기',
    generate: '생성',
    helperText: 'AI가 모든 장소를 추출하고 여행 일정을 만듭니다',
    noTripsRemaining: '무료 여행 없음',
    tripsRemainingBanner: '무료 여행 {count}회 남음',
    upgradeDefault: '월 무료 여행 {count}회',
    upgradeToPro: 'Pro로 업그레이드',
  },
  common: {
    cancel: '취소',
    close: '닫기',
  },
  discover: {
    categories: { all: '✨ 전체', beach: '🏖️ 해변', city: '🏙️ 도시', nature: '🏔️ 자연', food: '🍜 음식', culture: '🎭 문화', budget: '💰 예산' },
    seenItAll: '모두 보셨습니다',
    adventurePrompt: '나만의 모험을 계획할 준비가 됐나요?',
    generateYourOwn: '나만의 생성',
    noTrips: '아직 여행이 없습니다',
    noCategoryTrips: '{category} 여행이 없습니다',
    beFirst: '첫 번째로 여행을 공유하세요',
    tryDifferent: '다른 카테고리를 시도하거나 나중에 확인하세요',
    generateTrip: '여행 생성',
  },
  explore: {
    filters: { all: '전체', restaurant: '🍽️ 음식', tourist_attraction: '⭐ 관광', cafe: '☕ 카페', bar: '🍸 바', museum: '🏛️ 문화', park: '🌿 공원', shopping_mall: '🛍️ 쇼핑' },
    askAI: 'AI에게 묻기',
    searching: '검색 중...',
    liveMap: '실시간 여행 지도',
    locationPrompt: 'ReelRoam은 위치를 사용하여 근처 레스토랑, 명소, 숨겨진 보석을 보여주고 AI 여행 가이드를 제공합니다.',
    locationDenied: '위치 액세스가 꺼져 있습니다. 설정에서 활성화하여 실시간 지도를 사용하세요.',
    enableLocation: '위치 활성화',
    openSettings: '설정 열기',
    aiItinerary: 'AI 일정',
    placesHere: '여기 {count}곳',
  },
  feedCard: {
    share: '공유',
    viewTrip: '여행 보기',
    days: '일',
  },
  profile: {
    edit: '편집',
    follow: '팔로우',
    countries: '나라',
    continents: '대륙',
    ofWorld: '세계',
    trips: '여행',
    destinations: '목적지',
    saves: '저장',
    worldMap: '세계 지도',
    country: '개국',
    countries2: '개국',
    tabTrips: '여행',
    tabBeen: '다녀온',
    tabBucket: '버킷',
    tabBadges: '배지',
    noPublicTrips: '아직 공개 여행이 없습니다',
    pastTripsPrivate: '지난 여행은 비공개입니다',
    logAdventures: '과거 모험을 여기에 기록하세요',
    addPastTrip: '+ 지난 여행 추가',
    since: '{date}부터',
    travelMap: '{name}의 여행 지도',
    tapToMark: '탭하여 방문 표시',
  },
  editProfile: {
    title: '프로필 편집',
    sections: { profilePhoto: '프로필 사진', basicInfo: '기본 정보', travelStyle: '여행 스타일', privacy: '개인정보', account: '계정' },
    choosePhoto: '사진 선택',
    chooseEmoji: '이모지 선택',
    coverPhoto: '커버 사진',
    cameraRoll: '카메라 롤',
    aiSuggested: 'AI 추천',
    displayName: '표시 이름',
    username: '사용자 이름',
    bio: 'Bio  {count}/120',
    homeCountry: '출신 국가',
    yourName: '이름',
    bioPlaceholder: '여행 이야기를 알려주세요...',
    selectCountry: '국가를 선택하세요',
    travelMood: '여행 무드 — 해당하는 것 모두 선택',
    travelMoodSub: '이는 피드를 맞춤화하는 데 도움이 됩니다',
    preferredLength: '선호 여행 기간',
    publicProfile: '공개 프로필',
    publicProfileSub: '다른 사람들이 프로필을 발견할 수 있게 허용',
    showBucketlist: '버킷리스트 표시',
    showBucketlistSub: '프로필에서 다른 사람에게 표시',
    showBeenThere: "'다녀온' 여행 표시",
    showBadges: '프로필에 배지 표시',
    email: '이메일',
    notSignedIn: '로그인하지 않음',
    change: '변경',
    cancel: '취소',
    newEmail: '새 이메일 주소',
    saveChanges: '변경 저장',
    usernameTaken: '사용자 이름이 이미 사용 중입니다',
  },
};

export const ALL_TRANSLATIONS: Record<LanguageCode, Translations> = {
  en, no, es, fr, de, pt, it, ja, zh, ko,
};

/** Replace {key} placeholders in a string. */
export function interpolate(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}
