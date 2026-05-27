import { readFileSync, writeFileSync } from "fs";

const rawData = JSON.parse(readFileSync("./data/cbi_data_cleaned.json", "utf8"));

const processed = rawData.map((item, index) => ({
  id: String(index),
  ageBucket: item.age_at_clinic_visit_bucket,
  sex: item.sex === 1 ? "Male" : "Female",
  diagnosis: item.summary_primary_diagnosis_number_4,
  diagnosisGroup: item.dementia_vs_control_neurodegeneration_1_non_dem_2 === 2 ? "Non-dementia" : "Dementia",
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

writeFileSync("./processed_json/cohortDataProcessed.json", JSON.stringify(processed, null, 2));
console.log(`Done — ${processed.length} records written to processed_json/cohortDataProcessed.json`);