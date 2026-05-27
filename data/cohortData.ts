import rawData from './cbi_data_cleaned.json'; // Update path as needed

// Valid diagnosis types (from summary_primary_diagnosis_number_4 field)
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

interface RawDataPoint {
  pid: number;
  summary_primary_diagnosis_number_4: DiagnosisType; // Diagnosis name directly
  age_at_clinic_visit_bucket: string; // "<55", "55-64", "65-74", "75+"
  sex: number; // 1 = Male, 2 = Female
  dementia_vs_control_neurodegeneration_1_non_dem_2: number; // 1 = Dementia, 2 = Non-dementia
  cbi_score_memory_f: number;
  cbi_score_everyday_f: number;
  cbi_score_selfcare_f: number;
  cbi_score_abnormal_f: number;
  cbi_score_mood_f: number;
  cbi_score_beliefs_f: number;
  cbi_score_eating_f: number;
  cbi_score_sleep_f: number;
  cbi_score_stereotypical_f: number;
  cbi_score_motivation_f: number;
  cbi_percent_memory_f_corrected: number;
  cbi_percent_everyday_f_corrected: number;
  cbi_percent_self_care_f_corrected: number;
  cbi_percent_abnormal_f_corrected: number;
  cbi_percent_mood_f_corrected: number;
  cbi_percent_beliefs_f_corrected: number;
  cbi_percent_eating_f_corrected: number;
  cbi_percent_sleep_f_corrected: number;
  cbi_percent_stereotypical_f_corrected: number;
  cbi_percent_motivation_f_corrected: number;
}

export interface DataPoint {
  id: string;
  ageBucket: string; // Original age bucket from data: "<55", "55-64", "65-74", "75+"
  sex: 'Male' | 'Female';
  diagnosis: DiagnosisType;
  diagnosisGroup: 'Dementia' | 'Non-dementia'; // Grouped for visualization
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

// Map raw data to expected format
export const cohortData: DataPoint[] = (rawData as RawDataPoint[]).map((item) => ({
  id: String(item.pid),
  ageBucket: item.age_at_clinic_visit_bucket,
  sex: item.sex === 1 ? 'Male' : 'Female', // 1 = Male, 2 = Female
  diagnosis: item.summary_primary_diagnosis_number_4 as DiagnosisType,
  diagnosisGroup: item.dementia_vs_control_neurodegeneration_1_non_dem_2 === 2 ? 'Non-dementia' : 'Dementia',
  memoryOrientation: item.cbi_percent_memory_f_corrected,
  everydaySkills: item.cbi_percent_everyday_f_corrected,
  selfCare: item.cbi_percent_self_care_f_corrected,
  abnormalBehaviour: item.cbi_percent_abnormal_f_corrected,
  mood: item.cbi_percent_mood_f_corrected,
  beliefs: item.cbi_percent_beliefs_f_corrected,
  eatingHabits: item.cbi_percent_eating_f_corrected,
  sleep: item.cbi_percent_sleep_f_corrected,
  stereotypicMotor: item.cbi_percent_stereotypical_f_corrected,
  motivation: item.cbi_percent_motivation_f_corrected,
}));

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
