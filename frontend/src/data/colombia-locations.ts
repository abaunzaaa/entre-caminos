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
      "Andes",
      "Apartadó",
      "Barbosa",
      "Bello",
      "Caldas",
      "Carepa",
      "Carmen de Viboral",
      "Copacabana",
      "El Retiro",
      "Envigado",
      "Girardota",
      "Guatapé",
      "Itagüí",
      "Jardín",
      "Jericó",
      "La Ceja",
      "La Estrella",
      "Marinilla",
      "Rionegro",
      "Sabaneta",
      "Santa Fe de Antioquia",
      "Turbo",
      "Urrao",
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

export function findDepartment(name: string) {
  const needle = name.trim().toLowerCase();
  return COLOMBIA_DEPARTMENTS.find((item) => item.name.toLowerCase() === needle);
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
