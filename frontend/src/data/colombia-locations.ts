export type ColombiaDepartment = {
  name: string;
  lat: number;
  lng: number;
  cities: string[];
};

export const COLOMBIA_DEPARTMENTS: ColombiaDepartment[] = [
  { name: "Amazonas", lat: -4.215, lng: -69.9406, cities: ["Leticia", "Puerto Nariño"] },
  {
    name: "Antioquia",
    lat: 6.2442,
    lng: -75.5812,
    cities: [
      "Medellín",
      "Abejorral",
      "Abriaquí",
      "Alejandría",
      "Amagá",
      "Amalfi",
      "Andes",
      "Angelópolis",
      "Angostura",
      "Anorí",
      "Anzá",
      "Apartadó",
      "Arboletes",
      "Argelia",
      "Armenia",
      "Barbosa",
      "Bello",
      "Belmira",
      "Betania",
      "Betulia",
      "Briceño",
      "Buriticá",
      "Cáceres",
      "Caicedo",
      "Caldas",
      "Campamento",
      "Cañasgordas",
      "Caracolí",
      "Caramanta",
      "Carepa",
      "Carolina del Príncipe",
      "Caucasia",
      "Chigorodó",
      "Cisneros",
      "Ciudad Bolívar",
      "Cocorná",
      "Concepción",
      "Concordia",
      "Copacabana",
      "Dabeiba",
      "Donmatías",
      "Ebéjico",
      "El Bagre",
      "El Carmen de Viboral",
      "El Santuario",
      "Entrerríos",
      "Envigado",
      "Fredonia",
      "Frontino",
      "Giraldo",
      "Girardota",
      "Gómez Plata",
      "Granada",
      "Guadalupe",
      "Guarne",
      "Guatapé",
      "Heliconia",
      "Hispania",
      "Itagüí",
      "Ituango",
      "Jardín",
      "Jericó",
      "La Ceja",
      "La Estrella",
      "La Pintada",
      "La Unión",
      "Liborina",
      "Maceo",
      "Marinilla",
      "Montebello",
      "Murindó",
      "Mutatá",
      "Nariño",
      "Nechí",
      "Necoclí",
      "Olaya",
      "Peñol",
      "Peque",
      "Pueblorrico",
      "Puerto Berrío",
      "Puerto Nare",
      "Puerto Triunfo",
      "Remedios",
      "Retiro",
      "Rionegro",
      "Sabanalarga",
      "Sabaneta",
      "Salgar",
      "San Andrés de Cuerquia",
      "San Carlos",
      "San Francisco",
      "San Jerónimo",
      "San José de la Montaña",
      "San Juan de Urabá",
      "San Luis",
      "San Pedro de los Milagros",
      "San Pedro de Urabá",
      "San Rafael",
      "San Roque",
      "San Vicente Ferrer",
      "Santa Bárbara",
      "Santa Fe de Antioquia",
      "Santa Rosa de Osos",
      "Santo Domingo",
      "Segovia",
      "Sonsón",
      "Sopetrán",
      "Támesis",
      "Tarazá",
      "Tarso",
      "Titiribí",
      "Toledo",
      "Turbo",
      "Uramita",
      "Urrao",
      "Valdivia",
      "Valparaíso",
      "Vegachí",
      "Venecia",
      "Vigía del Fuerte",
      "Yalí",
      "Yarumal",
      "Yolombó",
      "Yondó",
      "Zaragoza",
    ],
  },
  { name: "Arauca", lat: 7.0903, lng: -70.7617, cities: ["Arauca", "Arauquita", "Saravena", "Tame"] },
  {
    name: "Atlántico",
    lat: 10.9639,
    lng: -74.7964,
    cities: ["Barranquilla", "Baranoa", "Galapa", "Malambo", "Puerto Colombia", "Sabanalarga", "Soledad", "Tubará"],
  },
  { name: "Bogotá D.C.", lat: 4.711, lng: -74.0721, cities: ["Bogotá"] },
  {
    name: "Bolívar",
    lat: 10.3932,
    lng: -75.4832,
    cities: ["Cartagena", "Arjona", "Magangué", "Mompox", "Santa Rosa", "Turbaco", "Turbana"],
  },
  {
    name: "Boyacá",
    lat: 5.5353,
    lng: -73.3678,
    cities: ["Tunja", "Chiquinquirá", "Duitama", "Monguí", "Paipa", "Puerto Boyacá", "Sogamoso", "Villa de Leyva"],
  },
  {
    name: "Caldas",
    lat: 5.0703,
    lng: -75.5138,
    cities: ["Manizales", "Chinchiná", "La Dorada", "Palestina", "Riosucio", "Salamina", "Villamaría"],
  },
  { name: "Caquetá", lat: 1.6144, lng: -75.6062, cities: ["Florencia", "Belén de los Andaquíes", "San Vicente del Caguán"] },
  { name: "Casanare", lat: 5.3378, lng: -72.3959, cities: ["Yopal", "Aguazul", "Monterrey", "Paz de Ariporo", "Tauramena", "Villanueva"] },
  {
    name: "Cauca",
    lat: 2.4448,
    lng: -76.6147,
    cities: ["Popayán", "Guapi", "Piendamó", "Puerto Tejada", "Santander de Quilichao", "Silvia", "Timbío"],
  },
  {
    name: "Cesar",
    lat: 10.4631,
    lng: -73.2532,
    cities: ["Valledupar", "Aguachica", "Agustín Codazzi", "Bosconia", "La Jagua de Ibirico", "Pueblo Bello"],
  },
  { name: "Chocó", lat: 5.6947, lng: -76.6611, cities: ["Quibdó", "Acandí", "Bahía Solano", "Capurganá", "Istmina", "Nuquí"] },
  {
    name: "Córdoba",
    lat: 8.7479,
    lng: -75.8814,
    cities: ["Montería", "Cereté", "Lorica", "Montelíbano", "Planeta Rica", "Sahagún", "San Antero"],
  },
  {
    name: "Cundinamarca",
    lat: 4.781,
    lng: -74.083,
    cities: [
      "Soacha",
      "Cajicá",
      "Chía",
      "Cota",
      "Facatativá",
      "Funza",
      "Fusagasugá",
      "Girardot",
      "Guatavita",
      "La Calera",
      "Madrid",
      "Mosquera",
      "Nemocón",
      "Sesquilé",
      "Sibaté",
      "Sopó",
      "Tabio",
      "Tenjo",
      "Tocancipá",
      "Ubaté",
      "Villeta",
      "Zipaquirá",
    ],
  },
  { name: "Guainía", lat: 3.8653, lng: -67.9239, cities: ["Inírida"] },
  { name: "Guaviare", lat: 2.565, lng: -72.6459, cities: ["San José del Guaviare", "Calamar", "El Retorno"] },
  {
    name: "Huila",
    lat: 2.9273,
    lng: -75.2819,
    cities: ["Neiva", "Garzón", "La Plata", "Pitalito", "Rivera", "San Agustín", "Timaná"],
  },
  {
    name: "La Guajira",
    lat: 11.5444,
    lng: -72.9072,
    cities: ["Riohacha", "Albania", "Dibulla", "Maicao", "Manaure", "San Juan del Cesar", "Uribia"],
  },
  {
    name: "Magdalena",
    lat: 11.2404,
    lng: -74.211,
    cities: ["Santa Marta", "Aracataca", "Ciénaga", "El Banco", "Fundación", "Pivijay", "Sitio Nuevo"],
  },
  {
    name: "Meta",
    lat: 4.142,
    lng: -73.6266,
    cities: ["Villavicencio", "Acacías", "Granada", "Puerto Gaitán", "Puerto López", "Restrepo", "San Martín"],
  },
  {
    name: "Nariño",
    lat: 1.2136,
    lng: -77.2811,
    cities: ["Pasto", "Ipiales", "La Unión", "Sandoná", "Tumaco", "Túquerres"],
  },
  {
    name: "Norte de Santander",
    lat: 7.8891,
    lng: -72.4967,
    cities: ["Cúcuta", "Chinácota", "Los Patios", "Ocaña", "Pamplona", "Villa del Rosario"],
  },
  { name: "Putumayo", lat: 1.1494, lng: -76.6466, cities: ["Mocoa", "Orito", "Puerto Asís", "Sibundoy", "Valle del Guamuez"] },
  {
    name: "Quindío",
    lat: 4.535,
    lng: -75.6757,
    cities: ["Armenia", "Calarcá", "Circasia", "Filandia", "Montenegro", "Quimbaya", "Salento"],
  },
  {
    name: "Risaralda",
    lat: 4.8133,
    lng: -75.6961,
    cities: ["Pereira", "Apía", "Dosquebradas", "La Virginia", "Marsella", "Santa Rosa de Cabal"],
  },
  { name: "San Andrés y Providencia", lat: 12.5847, lng: -81.7006, cities: ["San Andrés", "Providencia"] },
  {
    name: "Santander",
    lat: 7.1193,
    lng: -73.1227,
    cities: ["Bucaramanga", "Barbosa", "Barichara", "Floridablanca", "Girón", "Piedecuesta", "San Gil", "Socorro"],
  },
  { name: "Sucre", lat: 9.3047, lng: -75.3978, cities: ["Sincelejo", "Corozal", "Sampués", "San Marcos", "Tolú", "Tolú Viejo"] },
  {
    name: "Tolima",
    lat: 4.4389,
    lng: -75.2322,
    cities: ["Ibagué", "Espinal", "Flandes", "Honda", "Líbano", "Mariquita", "Melgar"],
  },
  {
    name: "Valle del Cauca",
    lat: 3.4516,
    lng: -76.532,
    cities: ["Cali", "Buenaventura", "Buga", "Candelaria", "Cartago", "Jamundí", "Palmira", "Tuluá", "Yumbo"],
  },
  { name: "Vaupés", lat: 1.1983, lng: -70.1733, cities: ["Mitú"] },
  { name: "Vichada", lat: 6.1847, lng: -67.4858, cities: ["Puerto Carreño", "Cumaribo"] },
];

function foldPlaceName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^(el|la|los|las)\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findDepartment(name: string) {
  const needle = foldPlaceName(name);
  return COLOMBIA_DEPARTMENTS.find((item) => foldPlaceName(item.name) === needle);
}

export function findMunicipality(departmentName: string, municipalityName: string) {
  const department = findDepartment(departmentName);
  const needle = foldPlaceName(municipalityName);
  if (!department || !needle) {
    return "";
  }
  const aliases: Record<string, string> = {
    carolina: "carolina del principe",
    "carmen de viboral": "carmen de viboral",
    "el carmen de viboral": "carmen de viboral",
    "el retiro": "retiro",
    "don matias": "donmatias",
    "san pedro": "san pedro de los milagros",
    "san vicente": "san vicente ferrer",
    santafedeantioquia: "santa fe de antioquia",
    "santa fe de antioquia": "santa fe de antioquia",
  };
  const target = aliases[needle] ?? needle;
  return (
    department.cities.find((city) => {
      const folded = foldPlaceName(city);
      return folded === target || folded === needle;
    }) ?? ""
  );
}

export function isValidDepartmentMunicipality(departmentName: string, municipalityName: string) {
  return Boolean(findMunicipality(departmentName, municipalityName));
}

export function parseStoredLocation(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { department: "", municipality: "", address: "" };
  }

  const last = parts[parts.length - 1];
  const department = findDepartment(last)?.name ?? "";
  if (department && parts.length >= 3) {
    return {
      department,
      municipality: parts[parts.length - 2],
      address: parts.slice(0, -2).join(", "),
    };
  }
  if (department && parts.length === 2) {
    return { department, municipality: parts[0], address: "" };
  }
  if (department) {
    return { department, municipality: "", address: parts.slice(0, -1).join(", ") };
  }
  return { department: "", municipality: "", address: location.trim() };
}

function looksLikeStreet(value: string) {
  return /(?:calle|carrera|cra\.?|cll?\.?|avenida|av\.?|transversal|tv\.?|diagonal|dg\.?|vereda|km\b|#)/i.test(value);
}

export function formatDepartmentMunicipality(location?: string | null) {
  if (!location?.trim()) {
    return "";
  }
  const parsed = parseStoredLocation(location);
  const department = parsed.department.trim();
  const municipality = parsed.municipality.trim();
  const city = municipality && !looksLikeStreet(municipality) ? municipality : "";
  if (department && city) {
    return `${department} · ${city}`;
  }
  return department || city;
}

export function composeLocation(address: string, municipality: string, department: string) {
  return [address, municipality, department]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ")
    .slice(0, 160);
}
