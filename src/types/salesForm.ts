// src/types/salesForm.ts

export type FinancingMethod =
  | "Vlastními zdroji"
  | "Hypotékou"
  | "Kombinací hypotéky a vlastních zdrojů"
  | "";

export type MortgageAdvisorChoice =
  | "Ano"
  | "Ne"
  | "Ne, uvítal/a bych doporučení na spolehlivého specialistu"
  | "";

export type MortgageProgress =
  | "Teprve budu začínat"
  | "Zatím zjišťuji možnosti a podmínky"
  | "Mám již rozjednanou hypotéku / konzultaci v bance"
  | "Hypotéku mám již schválenou"
  | "";

export type TiedToSale = "Ano" | "Ne" | "";

export interface SalesFinanceFormData {
  // identifikace zájemce
  jmeno: string;
  prijmeni: string;
  telefon: string;
  email: string;

  // Q1
  financovani: FinancingMethod;

  // Q2 (volitelné; vyžadujeme smysluplné hodnoty jen pokud je zvolena hypo/kombinace)
  vlastniProcent: string; // držíme jako string kvůli input[type=number]
  hypotekyProcent: string;

  // Q3
  financniPoradce: MortgageAdvisorChoice;

  // Q4
  stavHypoteky: MortgageProgress;

  // Q5
  vazanoNaProdej: TiedToSale;

  // Q6 (volitelné)
  poznamka: string;
}
