import processedData from './cohortDataProcessed.json';

export const DIAGNOSIS_TYPES = [
  'AD and amnestic MCI',
  'bvFTD',
  'Control',
  'lvPPA',
  'svPPA',
  'nfvPPA',
  'FTD-MND',
  'CBS',
  'right SD',
  'PSP',
  'CBS + PPA | PPA + CBS',
  'PCA',
  'PPA undefined',
  'VD, DLB and Dementia NOS',
] as const;

export type DiagnosisType = typeof DIAGNOSIS_TYPES[number];

export interface DataPoint {
  id: string;
  ageBucket: string;
  sex: 'Male' | 'Female';
  diagnosis: DiagnosisType;
  diagnosisGroup: 'Dementia' | 'Non-dementia';
  memoryOrientation: number;
  everydaySkills: number;
  selfCare: number;
  abnormalBehaviour: number;
  mood: number;
  beliefs: number;
  eatingHabits: number;
  sleep: number;
  stereotypicMotor: number;
  motivation: number;
}

export const cohortData = processedData as DataPoint[];

export const domains = [
  { key: 'memoryOrientation', label: 'Memory and Orientation' },
  { key: 'everydaySkills', label: 'Everyday Skills' },
  { key: 'selfCare', label: 'Self Care' },
  { key: 'abnormalBehaviour', label: 'Abnormal Behaviour' },
  { key: 'mood', label: 'Mood' },
  { key: 'beliefs', label: 'Beliefs' },
  { key: 'eatingHabits', label: 'Eating Habits' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'stereotypicMotor', label: 'Stereotypic and Motor Behaviours' },
  { key: 'motivation', label: 'Motivation' },
] as const;

export type DomainKey = typeof domains[number]['key'];
