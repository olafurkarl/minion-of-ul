import * as levenshtein from "fast-levenshtein";

export const earlyAgeNations = {
  Arcoscephale: 5,
  Mekone: 6,
  Pangaea: 7,
  Ermor: 8,
  Sauromatia: 9,
  Fomoria: 10,
  TirnanOg: 11,
  Marverni: 12,
  Ulm: 13,
  Pyrene: 14,
  Agartha: 15,
  Abysia: 16,
  Hinnom: 17,
  Ubar: 18,
  Ur: 19,
  Kailasa: 20,
  Lanka: 21,
  TienChi: 22,
  Yomi: 23,
  Caelum: 24,
  Mictlan: 25,
  Xibalba: 26,
  Ctis: 27,
  Machaka: 28,
  Berytos: 29,
  Vanheim: 30,
  Helheim: 31,
  Rus: 32,
  Niefelheim: 33,
  Muspelheim: 34,
  Pelagia: 40,
  Oceania: 41,
  Therodos: 42,
  Atlantis: 43,
  Rlyeh: 44,
};

// TODO: Fix MA/LA numbers
export const middleAgeNations = {
  Arcoscephale: 43,
  Ermor: 44,
  Sceleria: 45,
  Pythium: 46,
  Man: 47,
  Eriu: 48,
  Ulm: 49,
  Marignon: 50,
  Mictlan: 51,
  TienChi: 52,
  Machaka: 53,
  Agartha: 54,
  Abysia: 55,
  Caelum: 56,
  Ctis: 57,
  Pangaea: 58,
  Asphodel: 59,
  Vanheim: 60,
  Jotunheim: 61,
  Vanarus: 62,
  Bandar: 63,
  Shinuyama: 64,
  Ashdod: 65,
  Uruk: 66,
  Nazca: 67,
  Xibalba: 68,
  Phlegra: 69,
  Phaeacia: 70,
  Ind: 71,
  NaBa: 72,
  Atlantis: 73,
  Rlyeh: 74,
  Pelagia: 75,
  Oceania: 76,
  Ys: 77,
};

export const lateAgeNations = {
  Arcoscephale: 80,
  Pythium: 81,
  Lemuria: 82,
  Man: 83,
  Ulm: 84,
  Marignon: 85,
  Mictlan: 86,
  TienChi: 87,
  Jomon: 89,
  Agartha: 90,
  Abysia: 91,
  Caelum: 92,
  Ctis: 93,
  Pangaea: 94,
  Midgard: 95,
  Utgard: 96,
  Bogarus: 97,
  Patala: 98,
  Gath: 99,
  Ragha: 100,
  Xibalba: 101,
  Phlegra: 102,
  Vaettiheim: 103,
  Atlantis: 106,
  Rlyeh: 107,
  Erytheia: 108,
};

export const allNations = {
  ...earlyAgeNations,
//   ...middleAgeNations,
//   ...lateAgeNations,
};

export type NationKey = keyof typeof allNations;

export const getClosestNation = (maybeNationKey: string) => {
  let closest = 10;
  let best: NationKey | undefined;
  for (const [key, value] of Object.entries(allNations)) {
    const l = levenshtein.get(key, maybeNationKey);
    if (l < closest) {
        best = key as NationKey;
        closest = l;
    }
  }

  console.log("distance", closest)
  return { best, closest };
};
