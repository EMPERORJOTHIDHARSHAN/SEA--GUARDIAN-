import { BoundaryPoint, PotentialFishingZone, WeatherData, BoatState } from '../types/marine';

/**
 * Official International Maritime Boundary Line (IMBL) coordinates between India and Sri Lanka.
 * Strictly based on the Historic 1974 Bilateral Maritime Agreement (Palk Strait & Palk Bay):
 *
 * • Position 1: 10° 05′ N, 80° 03′ E (10.083333° N, 80.050000° E)
 * • Position 2: 09° 57′ N, 79° 35′ E (9.950000° N, 79.583333° E)
 * • Position 3: 09° 40′ 15″ N (09° 40.25′ N), 79° 22′ 60″ E / 79° 22.60′ E (9.670833° N, 79.376667° E)
 * • Position 4: 09° 21′ 80″ N (09° 21.80′ N), 79° 30′ 70″ E / 79° 30.70′ E (9.363333° N, 79.511667° E)
 * • Position 5: 09° 13′ N, 79° 32′ E (9.216667° N, 79.533333° E)
 * • Position 6: 09° 06′ N, 79° 32′ E (9.100000° N, 79.533333° E)
 */
export const IMBL_COORDINATES: BoundaryPoint[] = [
  {
    id: 'imbl-1974-pos1',
    name: 'Position 1: 10° 05′ N, 80° 03′ E',
    nameTa: 'நிலை 1: 10° 05′ N, 80° 03′ E (பாக் ஜலசந்தி வடகிழக்கு)',
    treatyPoint: 1,
    dmsNotation: '10° 05′ N, 80° 03′ E',
    lat: 10.083333,
    lng: 80.050000,
  },
  {
    id: 'imbl-1974-pos2',
    name: 'Position 2: 09° 57′ N, 79° 35′ E',
    nameTa: 'நிலை 2: 09° 57′ N, 79° 35′ E (பாக் ஜலசந்தி மத்தி)',
    treatyPoint: 2,
    dmsNotation: '09° 57′ N, 79° 35′ E',
    lat: 9.950000,
    lng: 79.583333,
  },
  {
    id: 'imbl-1974-pos3',
    name: 'Position 3: 09° 40.25′ N, 79° 22.60′ E',
    nameTa: 'நிலை 3: 09° 40′ 15″ N, 79° 22′ 60″ E (பாக் விரிகுடா)',
    treatyPoint: 3,
    dmsNotation: '09° 40′ 15″ N (09° 40.25′ N), 79° 22′ 60″ E',
    lat: 9.670833,
    lng: 79.376667,
  },
  {
    id: 'imbl-1974-pos4',
    name: 'Position 4: 09° 21.80′ N, 79° 30.70′ E',
    nameTa: 'நிலை 4: 09° 21′ 80″ N, 79° 30′ 70″ E (கச்சத்தீவு வடக்கு)',
    treatyPoint: 4,
    dmsNotation: '09° 21′ 80″ N (09° 21.80′ N), 79° 30′ 70″ E',
    lat: 9.363333,
    lng: 79.511667,
  },
  {
    id: 'imbl-1974-pos5',
    name: 'Position 5: 09° 13′ N, 79° 32′ E',
    nameTa: 'நிலை 5: 09° 13′ N, 79° 32′ E (தனுஷ்கோடி கிழக்கு)',
    treatyPoint: 5,
    dmsNotation: '09° 13′ N, 79° 32′ E',
    lat: 9.216667,
    lng: 79.533333,
  },
  {
    id: 'imbl-1974-pos6',
    name: 'Position 6: 09° 06′ N, 79° 32′ E',
    nameTa: 'நிலை 6: 09° 06′ N, 79° 32′ E (ஆடம்ஸ் பாலம் / தலைமன்னார்)',
    treatyPoint: 6,
    dmsNotation: '09° 06′ N, 79° 32′ E',
    lat: 9.100000,
    lng: 79.533333,
  },
];

/**
 * Key coastal reference points, ports, and islands
 */
export const NAV_LANDMARKS = [
  {
    name: 'Rameswaram Fishing Jetty',
    nameTa: 'இராமேஸ்வரம் மீன்பிடி தளம்',
    lat: 9.2876,
    lng: 79.3129,
    country: 'IND',
    type: 'PORT',
    coastGuardStation: true,
  },
  {
    name: 'Dhanushkodi Point (Arichal Munai)',
    nameTa: 'தனுஷ்கோடி அரிச்சல் முனை',
    lat: 9.1528,
    lng: 79.4215,
    country: 'IND',
    type: 'LIGHTHOUSE',
    radarTower: true,
  },
  {
    name: 'Mandapam Marine Police & Coast Guard Base',
    nameTa: 'மண்டபம் கடலோர காவல்படை தளம்',
    lat: 9.2789,
    lng: 79.1245,
    country: 'IND',
    type: 'BASE',
    mrccHub: true,
  },
  {
    name: 'Kottaipattinam Jetty',
    nameTa: 'கோட்டைப்பட்டினம் துறைமுகம்',
    lat: 9.9734,
    lng: 79.2012,
    country: 'IND',
    type: 'PORT',
  },
  {
    name: 'Katchatheevu Island',
    nameTa: 'கச்சத்தீவு',
    lat: 9.3872,
    lng: 79.5244,
    country: 'LKA',
    type: 'ISLAND',
    sensitiveWarning: true,
  },
  {
    name: 'Talaimannar Pier',
    nameTa: 'தலைமன்னார் துறைமுகம்',
    lat: 9.1021,
    lng: 79.7188,
    country: 'LKA',
    type: 'PORT',
  },
  {
    name: 'Neduntheevu (Delft Island)',
    nameTa: 'நெடுந்தீவு',
    lat: 9.5167,
    lng: 79.6833,
    country: 'LKA',
    type: 'ISLAND',
  },
];

/**
 * INCOIS Potential Fishing Zones (PFZ) within Indian Territorial Waters
 */
export const SAMPLE_PFZ_ZONES: PotentialFishingZone[] = [
  {
    id: 'pfz-1',
    name: 'Dhanushkodi South Trawl Bank',
    nameTa: 'தனுஷ்கோடி தெற்கு மீன்பிடி பகுதி',
    lat: 9.1200,
    lng: 79.3200,
    depthMeters: 14,
    surfaceTempC: 28.4,
    chlorophyllMgM3: 0.82,
    catchProbabilityPercent: 92,
    targetSpecies: ['Tuna (சூரை)', 'Mackerel (கானாங்கெளுத்தி)', 'Tiger Prawn (இறால்)'],
    safeDistanceToIMBLKm: 14.8,
    isWithinIndianWaters: true,
    advisedRoute: 'Safe clear water - 12 NM south-west of Dhanushkodi lighthouse.',
  },
  {
    id: 'pfz-2',
    name: 'Palk Bay Central Deep Trench',
    nameTa: 'பாக் ஜலசந்தி மத்திய மீன்வள பகுதி',
    lat: 9.4200,
    lng: 79.2800,
    depthMeters: 11,
    surfaceTempC: 27.9,
    chlorophyllMgM3: 0.74,
    catchProbabilityPercent: 85,
    targetSpecies: ['Kingfish / Seer (வஞ்சிரம்)', 'Sardinella (சாளை)', 'Squid (கணவாய்)'],
    safeDistanceToIMBLKm: 8.5,
    isWithinIndianWaters: true,
    advisedRoute: 'Maintain bearing 010° from Rameswaram. Stay west of 79°24\'E.',
  },
  {
    id: 'pfz-3',
    name: 'Mandapam Coral Edge Ridge',
    nameTa: 'மண்டபம் பவளப்பாறை விளிம்பு',
    lat: 9.2100,
    lng: 79.1800,
    depthMeters: 18,
    surfaceTempC: 29.1,
    chlorophyllMgM3: 0.91,
    catchProbabilityPercent: 78,
    targetSpecies: ['Snapper (சங்கரா)', 'Grouper (களவா)', 'Crab (நண்டு)'],
    safeDistanceToIMBLKm: 28.2,
    isWithinIndianWaters: true,
    advisedRoute: 'Ultra-safe zone in Gulf of Mannar Marine Biosphere buffer.',
  },
  {
    id: 'pfz-4',
    name: 'Kottaipattinam Outer Shoal',
    nameTa: 'கோட்டைப்பட்டினம் வெளிக்கடல்',
    lat: 9.8500,
    lng: 79.3500,
    depthMeters: 16,
    surfaceTempC: 28.2,
    chlorophyllMgM3: 0.68,
    catchProbabilityPercent: 88,
    targetSpecies: ['Anchovy (நெத்திலி)', 'Silver Pomfret (வெள்ளை வவ்வால்)'],
    safeDistanceToIMBLKm: 12.0,
    isWithinIndianWaters: true,
    advisedRoute: 'Sail east-northeast from Kottaipattinam jetty. Strong calm water.',
  },
];

/**
 * Initial Primary Boat State (User's boat: e.g. Rameswaram Mechanized Trawler)
 */
export const INITIAL_PRIMARY_BOAT: BoatState = {
  id: 'boat-tn06-1204',
  name: 'RMS Titanic (BlueShield Flagship - டைட்டானிக்)',
  regNumber: 'IND-TN-06-TITANIC-1912',
  type: 'Titanic Class Ocean Liner (4 Funnels)',
  skipperName: 'Capt. E. J. Smith / M. Antony Raj',
  crewCount: 8,
  homePort: 'Rameswaram Marine Terminal',
  lat: 9.2850,
  lng: 79.3650, // Approx 4.8 km inside Indian waters
  sog: 6.8, // 6.8 knots
  cog: 75, // Heading 075° towards East-Northeast
  batteryVolts: 12.6,
  fuelPercent: 74,
  gsmSignal: 3,
  loraSignalRssi: -68,
  satelliteCount: 14,
  hdop: 0.78,
  isEngineRunning: true,
  lastUpdated: new Date().toLocaleTimeString(),
};

/**
 * Other Fleet boats in the Palk Bay / Gulf of Mannar area for multi-vessel tracking
 */
export const FLEET_BOATS: BoatState[] = [
  {
    id: 'boat-tn10-8842',
    name: 'Kadal Raja (கடல் ராஜா)',
    regNumber: 'IND-TN-10-F-8842',
    type: 'Country Boat / Motorized FRP',
    skipperName: 'S. Murugan (முருகன்)',
    crewCount: 4,
    homePort: 'Pamban',
    lat: 9.2300,
    lng: 79.3800,
    sog: 5.2,
    cog: 95,
    batteryVolts: 12.4,
    fuelPercent: 62,
    gsmSignal: 2,
    loraSignalRssi: -78,
    satelliteCount: 12,
    hdop: 0.9,
    isEngineRunning: true,
    lastUpdated: 'Just now',
  },
  {
    id: 'boat-tn06-3391',
    name: 'St. Joseph (தூய சூசையப்பர்)',
    regNumber: 'IND-TN-06-MM-3391',
    type: 'Trawler',
    skipperName: 'K. Xavier (சேவியர்)',
    crewCount: 6,
    homePort: 'Rameswaram',
    lat: 9.3400,
    lng: 79.3900, // Approaching 1.8km yellow alert
    sog: 4.1,
    cog: 80,
    batteryVolts: 12.1,
    fuelPercent: 54,
    gsmSignal: 1,
    loraSignalRssi: -84,
    satelliteCount: 11,
    hdop: 1.1,
    isEngineRunning: true,
    lastUpdated: '1 min ago',
  },
  {
    id: 'boat-tn08-4412',
    name: 'Meenakshi Amman (மீனாட்சி அம்மன்)',
    regNumber: 'IND-TN-08-F-4412',
    type: 'Deep Sea Gillnetter',
    skipperName: 'P. Karuppiah (கருப்பையா)',
    crewCount: 5,
    homePort: 'Kottaipattinam',
    lat: 9.7200,
    lng: 79.3100,
    sog: 7.0,
    cog: 45,
    batteryVolts: 12.8,
    fuelPercent: 82,
    gsmSignal: 3,
    loraSignalRssi: -65,
    satelliteCount: 15,
    hdop: 0.7,
    isEngineRunning: true,
    lastUpdated: 'Just now',
  },
  {
    id: 'boat-tn10-1092',
    name: 'Arockia Mary (ஆரோக்கிய மேரி)',
    regNumber: 'IND-TN-10-MM-1092',
    type: 'Trawler',
    skipperName: 'V. Sundaram (சுந்தரம்)',
    crewCount: 4,
    homePort: 'Mandapam',
    lat: 9.1800,
    lng: 79.2500,
    sog: 6.2,
    cog: 140,
    batteryVolts: 12.5,
    fuelPercent: 68,
    gsmSignal: 4,
    loraSignalRssi: -60,
    satelliteCount: 13,
    hdop: 0.8,
    isEngineRunning: true,
    lastUpdated: '2 min ago',
  },
];

/**
 * Current Weather and Cyclone Advisory (Indian Meteorological Dept & INCOIS Bulletin)
 */
export const INITIAL_WEATHER: WeatherData = {
  seaState: 'Moderate',
  seaStateTa: 'மிதமான கடல் அலை',
  waveHeightM: 1.4,
  swellPeriodSec: 7,
  windKnots: 18,
  windDirectionDeg: 65, // ENE
  windDirectionLabel: 'ENE (வடகிழக்கு-கிழக்கு)',
  gustKnots: 24,
  visibilityKm: 8.5,
  waterTempC: 28.5,
  airPressureHpa: 1008,
  cycloneStatus: 'ALERT_YELLOW',
  cycloneTitleEn: 'IMD Bulletin: Depression over Southwest Bay of Bengal',
  cycloneTitleTa: 'வானிலை மையம்: தென்மேற்கு வங்கக்கடலில் காற்றழுத்த தாழ்வு நிலை',
  advisoryEn: 'Squally winds 40-50 kmph gusting to 60 kmph likely along Tamil Nadu & Palk Strait. Fishermen are advised to exercise extreme caution and remain within 10 NM.',
  advisoryTa: 'தமிழ்நாடு மற்றும் பாக் ஜலசந்தி பகுதிகளில் மணிக்கு 40-50 கி.மீ வேகத்தில் பலத்த காற்று வீசக்கூடும். மீனவர்கள் எச்சரிக்கையுடன் இருக்குமாறு அறிவுறுத்தப்படுகிறார்கள்.',
  issuedBy: 'Regional Meteorological Centre (RMC), Chennai & INCOIS Hyderabad',
  validUntil: 'Today 23:59 IST',
};
