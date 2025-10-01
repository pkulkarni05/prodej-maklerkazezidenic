export type FormDataType = {
  jmeno: string;
  trvalyPobyt: string;
  skutecneBydliste: string;
  telefon: string;
  email: string;
  kontaktNaMajitele: string;
  delkaPronajmu: string;
  terminNastehovani: string;
  pozadovanaDelka: string;
  dalsiUzivatele: string;
  dalsiUzivatelePocet: string;
  dalsiUzivateleDetaily: string;
  domaciZvirata: string;
  //domaciZvirataDetaily: string;
  kurak: string;
  trestniRejstrik: string;
  trestniRejstrikDetaily: string;
  insolvence: string;
  insolvenceDetaily: string;
  exekuce: string;
  exekuceDetaily: string;
  pozadavky: string;
  oVas: string;
  kauce: string;
  datum: string;
  gdprConsent: boolean;
  [key: `vek_${number}`]: string | undefined;
  [key: `zamestnani_${number}`]: string | undefined;
};

export const defaultFormData: FormDataType = {
  jmeno: '',
  trvalyPobyt: '',
  skutecneBydliste: '',
  telefon: '',
  email: '',
  kontaktNaMajitele: '',
  delkaPronajmu: '',
  terminNastehovani: '',
  pozadovanaDelka: '',
  dalsiUzivatele: '',
  dalsiUzivatelePocet: '',
  dalsiUzivateleDetaily: '',
  domaciZvirata: '',
  //domaciZvirataDetaily: '',
  kurak: '',
  trestniRejstrik: '',
  trestniRejstrikDetaily: '',
  insolvence: '',
  insolvenceDetaily: '',
  exekuce: '',
  exekuceDetaily: '',
  pozadavky: '',
  oVas: '',
  kauce: '',
  datum: '',
  gdprConsent: false,
};
