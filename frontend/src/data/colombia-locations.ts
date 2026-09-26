export type ColombiaDepartment = {
  name: string;
  lat: number;
  lng: number;
  cities: string[];
};

export const COLOMBIA_DEPARTMENTS: ColombiaDepartment[] = [
  { name: "Amazonas", lat: -4.215, lng: -69.9406, cities: ["Leticia","Puerto Nariño"] },
  { name: "Antioquia", lat: 6.2442, lng: -75.5812, cities: ["Abejorral","Abriaquí","Alejandría","Amagá","Amalfi","Andes","Angelópolis","Angostura","Anorí","Anzá","Apartadó","Arboletes","Argelia","Armenia","Barbosa","Bello","Belmira","Betania","Betulia","Briceño","Buriticá","Cáceres","Caicedo","Caldas","Campamento","Cañasgordas","Caracolí","Caramanta","Carepa","Carolina del Príncipe","Caucasia","Chigorodó","Cisneros","Ciudad Bolívar","Cocorná","Concepción","Concordia","Copacabana","Dabeiba","Donmatías","Ebéjico","El Bagre","El Carmen de Viboral","El Peñol","El Retiro","El Santuario","Entrerríos","Envigado","Fredonia","Frontino","Giraldo","Girardota","Gómez Plata","Granada","Guadalupe","Guarne","Guatapé","Heliconia","Hispania","Itagüí","Ituango","Jardín","Jericó","La Ceja","La Estrella","La Pintada","La Unión","Liborina","Maceo","Marinilla","Medellín","Montebello","Murindó","Mutatá","Nariño","Nechí","Necoclí","Olaya","Peque","Pueblorrico","Puerto Berrío","Puerto Nare","Puerto Triunfo","Remedios","Rionegro","Sabanalarga","Sabaneta","Salgar","San Andrés de Cuerquia","San Carlos","San Francisco","San Jerónimo","San José de la Montaña","San Juan de Urabá","San Luis","San Pedro de los Milagros","San Pedro de Urabá","San Rafael","San Roque","San Vicente Ferrer","Santa Bárbara","Santa Fe de Antioquia","Santa Rosa de Osos","Santo Domingo","Segovia","Sonsón","Sopetrán","Támesis","Tarazá","Tarso","Titiribí","Toledo","Turbo","Uramita","Urrao","Valdivia","Valparaíso","Vegachí","Venecia","Vigía del Fuerte","Yalí","Yarumal","Yolombó","Yondó","Zaragoza"] },
  { name: "Arauca", lat: 7.0847, lng: -70.7591, cities: ["Arauca","Arauquita","Cravo Norte","Fortul","Puerto Rondón","Saravena","Tame"] },
  { name: "Atlántico", lat: 10.9685, lng: -74.7813, cities: ["Baranoa","Barranquilla","Campo de la Cruz","Candelaria","Galapa","Juan de Acosta","Luruaco","Malambo","Manatí","Palmar de Varela","Piojó","Polonuevo","Ponedera","Puerto Colombia","Repelón","Sabanagrande","Sabanalarga","Santa Lucía","Santo Tomás","Soledad","Suán","Tubará","Usiacurí"] },
  { name: "Bogotá D.C.", lat: 4.711, lng: -74.0721, cities: ["Bogotá D.C."] },
  { name: "Bolívar", lat: 10.3997, lng: -75.5144, cities: ["Achí","Altos del Rosario","Arenal","Arjona","Arroyohondo","Barranco de Loba","Brazuelo de Papayal","Calamar","Cantagallo","Cartagena de Indias","Cicuco","Clemencia","Córdoba","El Carmen de Bolívar","El Guamo","El Peñón","Hatillo de Loba","Magangué","Mahates","Margarita","María la Baja","Mompós","Montecristo","Morales","Norosí","Pinillos","Regidor","Río Viejo","San Cristóbal","San Estanislao","San Fernando","San Jacinto","San Jacinto del Cauca","San Juan Nepomuceno","San Martín de Loba","San Pablo","Santa Catalina","Santa Rosa","Santa Rosa del Sur","Simití","Soplaviento","Talaigua Nuevo","Tiquisio","Turbaco","Turbaná","Villanueva","Zambrano"] },
  { name: "Boyacá", lat: 5.5353, lng: -73.3678, cities: ["Almeida","Aquitania","Arcabuco","Belén","Berbeo","Betéitiva","Boavita","Boyacá","Briceño","Buenavista","Busbanzá","Caldas","Campohermoso","Cerinza","Chinavita","Chiquinquirá","Chíquiza","Chiscas","Chita","Chitaraque","Chivatá","Chivor","Ciénega","Cómbita","Coper","Corrales","Covarachía","Cubará","Cucaita","Cuítiva","Duitama","El Cocuy","El Espino","Firavitoba","Floresta","Gachantivá","Gámeza","Garagoa","Guacamayas","Guateque","Guayatá","Güicán","Iza","Jenesano","Jericó","La Capilla","La Uvita","La Victoria","Labranzagrande","Macanal","Maripí","Miraflores","Mongua","Monguí","Moniquirá","Motavita","Muzo","Nobsa","Nuevo Colón","Oicatá","Otanche","Pachavita","Páez","Paipa","Pajarito","Panqueba","Pauna","Paya","Paz del Río","Pesca","Pisba","Puerto Boyacá","Quípama","Ramiriquí","Ráquira","Rondón","Saboyá","Sáchica","Samacá","San Eduardo","San José de Pare","San Luis de Gaceno","San Mateo","San Miguel de Sema","San Pablo de Borbur","Santa María","Santa Rosa de Viterbo","Santa Sofía","Santana","Sativanorte","Sativasur","Siachoque","Soatá","Socha","Socotá","Sogamoso","Somondoco","Sora","Soracá","Sotaquirá","Susacón","Sutamarchán","Sutatenza","Tasco","Tenza","Tibaná","Tibasosa","Tinjacá","Tipacoque","Toca","Togüí","Tópaga","Tota","Tunja","Tununguá","Turmequé","Tuta","Tutazá","Úmbita","Ventaquemada","Villa de Leyva","Viracachá","Zetaquira"] },
  { name: "Caldas", lat: 5.0703, lng: -75.5138, cities: ["Aguadas","Anserma","Aranzazu","Belalcázar","Chinchiná","Filadelfia","La Dorada","La Merced","Manizales","Manzanares","Marmato","Marquetalia","Marulanda","Neira","Norcasia","Pácora","Palestina","Pensilvania","Riosucio","Risaralda","Salamina","Samaná","San José","Supía","Victoria","Villamaría","Viterbo"] },
  { name: "Caquetá", lat: 1.6144, lng: -75.6062, cities: ["Albania","Belén de los Andaquíes","Cartagena del Chairá","Curillo","El Doncello","El Paujil","Florencia","La Montañita","Milán","Morelia","Puerto Rico","San José del Fragua","San Vicente del Caguán","Solano","Solita","Valparaíso"] },
  { name: "Casanare", lat: 5.3378, lng: -72.3959, cities: ["Aguazul","Chámeza","Hato Corozal","La Salina","Maní","Monterrey","Nunchía","Orocué","Paz de Ariporo","Pore","Recetor","Sabanalarga","Sácama","San Luis de Palenque","Támara","Tauramena","Trinidad","Villanueva","Yopal"] },
  { name: "Cauca", lat: 2.4448, lng: -76.6147, cities: ["Almaguer","Argelia","Balboa","Bolívar","Buenos Aires","Cajibío","Caldono","Caloto","Corinto","El Tambo","Florencia","Guachené","Guapí","Inzá","Jambaló","La Sierra","La Vega","López de Micay","Mercaderes","Miranda","Morales","Padilla","Páez","Patía","Piamonte","Piendamó","Popayán","Puerto Tejada","Puracé","Rosas","San Sebastián","Santa Rosa","Santander de Quilichao","Silvia","Sotará","Suárez","Sucre","Timbío","Timbiquí","Toribío","Totoró","Villa Rica"] },
  { name: "Cesar", lat: 10.4631, lng: -73.2532, cities: ["Aguachica","Agustín Codazzi","Astrea","Becerril","Bosconia","Chimichagua","Chiriguaná","Curumaní","El Copey","El Paso","Gamarra","González","La Gloria","La Jagua de Ibirico","La Paz","Manaure Balcón del Cesar","Pailitas","Pelaya","Pueblo Bello","Río de Oro","San Alberto","San Diego","San Martín","Tamalameque","Valledupar"] },
  { name: "Chocó", lat: 5.6947, lng: -76.6611, cities: ["Acandí","Alto Baudó","Bagadó","Bahía Solano","Bajo Baudó","Bojayá","Cantón de San Pablo","Cértegui","Condoto","El Atrato","El Carmen de Atrato","El Carmen del Darién","Istmina","Juradó","Litoral de San Juan","Lloró","Medio Atrato","Medio Baudó","Medio San Juan","Nóvita","Nuquí","Quibdó","Río Iró","Río Quito","Riosucio","San José del Palmar","Sipí","Tadó","Unguía","Unión Panamericana"] },
  { name: "Córdoba", lat: 8.75, lng: -75.8833, cities: ["Ayapel","Buenavista","Canalete","Cereté","Chimá","Chinú","Ciénaga de Oro","Cotorra","La Apartada","Lorica","Los Córdobas","Momil","Montelíbano","Montería","Moñitos","Planeta Rica","Pueblo Nuevo","Puerto Escondido","Puerto Libertador","Purísima","Sahagún","San Andrés de Sotavento","San Antero","San Bernardo del Viento","San Carlos","San José de Uré","San Pelayo","Tierralta","Tuchín","Valencia"] },
  { name: "Cundinamarca", lat: 4.6097, lng: -74.0817, cities: ["Agua de Dios","Albán","Anapoima","Anolaima","Apulo","Arbeláez","Beltrán","Bituima","Bogotá D.C.","Bojacá","Cabrera","Cachipay","Cajicá","Caparrapí","Cáqueza","Carmen de Carupa","Chaguaní","Chía","Chipaque","Choachí","Chocontá","Cogua","Cota","Cucunubá","El Colegio","El Peñón","El Rosal","Facatativá","Fómeque","Fosca","Funza","Fúquene","Fusagasugá","Gachalá","Gachancipá","Gachetá","Gama","Girardot","Granada","Guachetá","Guaduas","Guasca","Guataquí","Guatavita","Guayabal de Síquima","Guayabetal","Gutiérrez","Jerusalén","Junín","La Calera","La Mesa","La Palma","La Peña","La Vega","Lenguazaque","Machetá","Madrid","Manta","Medina","Mosquera","Nariño","Nemocón","Nilo","Nimaima","Nocaima","Pacho","Paime","Pandi","Paratebueno","Pasca","Puerto Salgar","Pulí","Quebradanegra","Quetame","Quipile","Ricaurte","San Antonio del Tequendama","San Bernardo","San Cayetano","San Francisco","San Juan de Rioseco","Sasaima","Sesquilé","Sibaté","Silvania","Simijaca","Soacha","Sopó","Subachoque","Suesca","Supatá","Susa","Sutatausa","Tabio","Tausa","Tena","Tenjo","Tibacuy","Tibirita","Tocaima","Tocancipá","Topaipí","Ubalá","Ubaque","Ubaté","Une","Útica","Venecia","Vergara","Vianí","Villagómez","Villapinzón","Villeta","Viotá","Yacopí","Zipacón","Zipaquirá"] },
  { name: "Guainía", lat: 3.8653, lng: -67.9239, cities: ["Barranco Minas","Cacahual","Inírida","La Guadalupe","Mapiripana","Morichal","Pana Pana","Puerto Colombia","San Felipe"] },
  { name: "Guaviare", lat: 2.5703, lng: -72.6417, cities: ["Calamar","El Retorno","Miraflores","San José del Guaviare"] },
  { name: "Huila", lat: 2.9273, lng: -75.2819, cities: ["Acevedo","Agrado","Aipe","Algeciras","Altamira","Baraya","Campoalegre","Colombia","El Pital","Elías","Garzón","Gigante","Guadalupe","Hobo","Íquira","Isnos","La Argentina","La Plata","Nátaga","Neiva","Oporapa","Paicol","Palermo","Palestina","Pitalito","Rivera","Saladoblanco","San Agustín","Santa María","Suaza","Tarqui","Tello","Teruel","Tesalia","Timaná","Villavieja","Yaguará"] },
  { name: "La Guajira", lat: 11.5444, lng: -72.9072, cities: ["Albania","Barrancas","Dibulla","Distracción","El Molino","Fonseca","Hatonuevo","La Jagua del Pilar","Maicao","Manaure","Riohacha","San Juan del Cesar","Uribia","Urumita","Villanueva"] },
  { name: "Magdalena", lat: 11.2408, lng: -74.199, cities: ["Algarrobo","Aracataca","Ariguaní","Cerro de San Antonio","Chibolo","Ciénaga","Concordia","El Banco","El Piñón","El Retén","Fundación","Guamal","Nueva Granada","Pedraza","Pijiño del Carmen","Pivijay","Plato","Pueblo Viejo","Remolino","Sabanas de San Ángel","Salamina","San Sebastián de Buenavista","San Zenón","Santa Ana","Santa Bárbara de Pinto","Santa Marta","Sitionuevo","Tenerife","Zapayán","Zona Bananera"] },
  { name: "Meta", lat: 4.142, lng: -73.6266, cities: ["Acacías","Barranca de Upía","Cabuyaro","Castilla la Nueva","Cubarral","Cumaral","El Calvario","El Castillo","El Dorado","Fuente de Oro","Granada","Guamal","La Macarena","La Uribe","Lejanías","Mapiripán","Mesetas","Puerto Concordia","Puerto Gaitán","Puerto Lleras","Puerto López","Puerto Rico","Restrepo","San Carlos de Guaroa","San Juan de Arama","San Juanito","San Martín","Villavicencio","Vista Hermosa"] },
  { name: "Nariño", lat: 1.2136, lng: -77.2811, cities: ["Aldana","Ancuyá","Arboleda","Barbacoas","Belén","Buesaco","Chachagüí","Colón","Consacá","Contadero","Córdoba","Cuaspud","Cumbal","Cumbitara","El Charco","El Peñol","El Rosario","El Tablón","El Tambo","Francisco Pizarro","Funes","Guachucal","Guaitarilla","Gualmatán","Iles","Imués","Ipiales","La Cruz","La Florida","La Llanada","La Tola","La Unión","Leiva","Linares","Los Andes","Magüí Payán","Mallama","Mosquera","Nariño","Olaya Herrera","Ospina","Pasto","Policarpa","Potosí","Providencia","Puerres","Pupiales","Ricaurte","Roberto Payán","Samaniego","San Bernardo","San José de Albán","San Lorenzo","San Pablo","San Pedro de Cartago","Sandoná","Santa Bárbara","Santacruz","Sapuyes","Taminango","Tangua","Tumaco","Túquerres","Yacuanquer"] },
  { name: "Norte de Santander", lat: 7.8939, lng: -72.5078, cities: ["Ábrego","Arboledas","Bochalema","Bucarasica","Cáchira","Cácota","Chinácota","Chitagá","Convención","Cúcuta","Cucutilla","Duranía","El Carmen","El Tarra","El Zulia","Gramalote","Hacarí","Herrán","La Esperanza","La Playa de Belén","Labateca","Los Patios","Lourdes","Mutiscua","Ocaña","Pamplona","Pamplonita","Puerto Santander","Ragonvalia","Salazar de Las Palmas","San Calixto","San Cayetano","Santiago","Santo Domingo de Silos","Sardinata","Teorama","Tibú","Toledo","Villa Caro","Villa del Rosario"] },
  { name: "Putumayo", lat: 1.1528, lng: -76.6528, cities: ["Colón","Mocoa","Orito","Puerto Asís","Puerto Caicedo","Puerto Guzmán","Puerto Leguízamo","San Francisco","San Miguel","Santiago","Sibundoy","Valle del Guamuez","Villagarzón"] },
  { name: "Quindío", lat: 4.5339, lng: -75.6811, cities: ["Armenia","Buenavista","Calarcá","Circasia","Córdoba","Filandia","Génova","La Tebaida","Montenegro","Pijao","Quimbaya","Salento"] },
  { name: "Risaralda", lat: 4.8133, lng: -75.6961, cities: ["Apía","Balboa","Belén de Umbría","Dosquebradas","Guática","La Celia","La Virginia","Marsella","Mistrató","Pereira","Pueblo Rico","Quinchía","Santa Rosa de Cabal","Santuario"] },
  { name: "San Andrés y Providencia", lat: 12.5847, lng: -81.7006, cities: ["Providencia y Santa Catalina Islas","San Andrés"] },
  { name: "Santander", lat: 7.1193, lng: -73.1227, cities: ["Aguada","Albania","Aratoca","Barbosa","Barichara","Barrancabermeja","Betulia","Bolívar","Bucaramanga","Cabrera","California","Capitanejo","Carcasí","Cepitá","Cerrito","Charalá","Charta","Chima","Chipatá","Cimitarra","Concepción","Confines","Contratación","Coromoro","Curití","El Carmen de Chucurí","El Guacamayo","El Peñón","El Playón","El Socorro","Encino","Enciso","Florián","Floridablanca","Galán","Gámbita","Girón","Guaca","Guadalupe","Guapotá","Guavatá","Güepsa","Hato","Jesús María","Jordán","La Belleza","La Paz","Landázuri","Lebrija","Los Santos","Macaravita","Málaga","Matanza","Mogotes","Molagavita","Ocamonte","Oiba","Onzaga","Palmar","Palmas del Socorro","Páramo","Piedecuesta","Pinchote","Puente Nacional","Puerto Parra","Puerto Wilches","Rionegro","Sabana de Torres","San Andrés","San Benito","San Gil","San Joaquín","San José de Miranda","San Miguel","San Vicente de Chucurí","Santa Bárbara","Santa Helena del Opón","Simacota","Suaita","Sucre","Suratá","Tona","Valle de San José","Vélez","Vetas","Villanueva","Zapatoca"] },
  { name: "Sucre", lat: 9.3047, lng: -75.3978, cities: ["Buenavista","Caimito","Chalán","Colosó","Corozal","Coveñas","El Roble","Galeras","Guaranda","La Unión","Los Palmitos","Majagual","Morroa","Ovejas","Sampués","San Antonio de Palmito","San Benito Abad","San Juan de Betulia","San Marcos","San Onofre","San Pedro","Sincé","Sincelejo","Sucre","Tolú","Tolú Viejo"] },
  { name: "Tolima", lat: 4.4389, lng: -75.2322, cities: ["Alpujarra","Alvarado","Ambalema","Anzoátegui","Armero","Ataco","Cajamarca","Carmen de Apicalá","Casabianca","Chaparral","Coello","Coyaima","Cunday","Dolores","El Espinal","Falán","Flandes","Fresno","Guamo","Herveo","Honda","Ibagué","Icononzo","Lérida","Líbano","Mariquita","Melgar","Murillo","Natagaima","Ortega","Palocabildo","Piedras","Planadas","Prado","Purificación","Rioblanco","Roncesvalles","Rovira","Saldaña","San Antonio","San Luis","Santa Isabel","Suárez","Valle de San Juan","Venadillo","Villahermosa","Villarrica"] },
  { name: "Valle del Cauca", lat: 3.4516, lng: -76.532, cities: ["Alcalá","Andalucía","Ansermanuevo","Argelia","Bolívar","Buenaventura","Buga","Bugalagrande","Caicedonia","Cali","Calima","Candelaria","Cartago","Dagua","El Águila","El Cairo","El Cerrito","El Dovio","Florida","Ginebra","Guacarí","Jamundí","La Cumbre","La Unión","La Victoria","Obando","Palmira","Pradera","Restrepo","Riofrío","Roldanillo","San Pedro","Sevilla","Toro","Trujillo","Tuluá","Ulloa","Versalles","Vijes","Yotoco","Yumbo","Zarzal"] },
  { name: "Vaupés", lat: 1.1983, lng: -70.1733, cities: ["Carurú","Mitú","Taraira"] },
  { name: "Vichada", lat: 6.1847, lng: -67.4858, cities: ["Cumaribo","La Primavera","Puerto Carreño","Santa Rosalía"] },
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
