-- Seed data for refactored test-centric schema
-- Run after 003_refactor_to_tests.sql

-- Patients
INSERT INTO patients (patient_id, name, age, gender)
VALUES
  ('P-0001', 'Juan Dela Cruz', 42, 'male'),
  ('P-0002', 'Maria Santos', 35, 'female'),
  ('P-0003', 'Carlos Reyes', 29, 'male');

-- Look up generated IDs
WITH ids AS (
  SELECT patient_id, id FROM patients WHERE patient_id IN ('P-0001','P-0002','P-0003')
)
INSERT INTO urine_tests (
  test_code, patient_id,
  sample_id, collection_time, analysis_date, technician, status,
  rbc_count, rbc_unit, rbc_morphology, rbc_notes, rbc_status, rbc_accuracy,
  wbc_count, wbc_unit, wbc_morphology, wbc_notes, wbc_status, wbc_accuracy,
  epithelial_cells_count, epithelial_cells_unit, epithelial_cells_morphology, epithelial_cells_notes, epithelial_cells_status, epithelial_cells_accuracy,
  crystals_count, crystals_unit, crystals_morphology, crystals_notes, crystals_status, crystals_accuracy,
  casts_count, casts_unit, casts_morphology, casts_notes, casts_status, casts_accuracy,
  bacteria_count, bacteria_unit, bacteria_morphology, bacteria_notes, bacteria_status, bacteria_accuracy,
  yeast_count, yeast_unit, yeast_morphology, yeast_notes, yeast_status, yeast_accuracy,
  mucus_count, mucus_unit, mucus_morphology, mucus_notes, mucus_status, mucus_accuracy,
  sperm_count, sperm_unit, sperm_morphology, sperm_notes, sperm_status, sperm_accuracy,
  parasites_count, parasites_unit, parasites_morphology, parasites_notes, parasites_status, parasites_accuracy
)
SELECT * FROM (
  VALUES
    ('MSLAVE04-1243', (SELECT id FROM ids WHERE patient_id='P-0002'),
     '0018', TIME '08:30:00', DATE '2024-01-15', 'Dr. Smith','reviewed',
     '6.7↑','/HPF','Dysmorphic','Abnormal morphology detected','abnormal',94.20,
     '0.4','/HPF','Normal','Within normal range','normal',98.70,
     '2-3','/HPF','Squamous','Normal squamous cells','normal',96.50,
     '1.13↑','/HPF','Calcium Oxalate','Abnormal crystal formation','abnormal',91.80,
     '0.1','/LPF','Hyaline','Occasional hyaline casts','normal',97.30,
     '0','/HPF','None','No bacterial growth observed','normal',99.10,
     '0','/HPF','None','No yeast detected','normal',98.90,
     '0','/LPF','None','No mucus present','normal',95.40,
     '0','/HPF','None','No sperm detected','normal',99.50,
     '0','/HPF','None','No parasites observed','normal',99.80
    ),
    ('MSLAVE04-1201', (SELECT id FROM ids WHERE patient_id='P-0001'),
     '0007', TIME '09:15:00', DATE '2024-01-12', 'Dr. Lee','completed',
     '0-1','/HPF','Normal','', 'normal',98.00,
     '0-2','/HPF','Normal','', 'normal',97.50,
     '1-2','/HPF','Squamous','', 'normal',96.00,
     '0','/HPF','None','', 'normal',99.00,
     '0-1','/LPF','Hyaline','', 'normal',96.80,
     '0','/HPF','None','', 'normal',99.20,
     '0','/HPF','None','', 'normal',99.40,
     'trace','/LPF','None','', 'normal',95.00,
     '0','/HPF','None','', 'normal',99.60,
     '0','/HPF','None','', 'normal',99.70
    ),
    ('MSLAVE04-1251', (SELECT id FROM ids WHERE patient_id='P-0003'),
     '0021', TIME '10:05:00', DATE '2024-01-17', 'Dr. Patel','in_progress',
     '2-3','/HPF','Normal','', 'normal',92.00,
     '10-12↑','/HPF','Neutrophils','Elevated WBC','abnormal',90.50,
     '3-5','/HPF','Transitional','', 'normal',93.00,
     '0','/HPF','None','', 'normal',99.00,
     '0-1','/LPF','Granular','Rare granular casts','abnormal',88.00,
     'few','/HPF','Cocci','Possible contamination','abnormal',89.50,
     '0','/HPF','None','', 'normal',99.00,
     'few','/LPF','Strands','', 'abnormal',85.00,
     '0','/HPF','None','', 'normal',99.00,
     '0','/HPF','None','', 'normal',99.00
    )
) AS t(
  test_code, patient_id,
  sample_id, collection_time, analysis_date, technician, status,
  rbc_count, rbc_unit, rbc_morphology, rbc_notes, rbc_status, rbc_accuracy,
  wbc_count, wbc_unit, wbc_morphology, wbc_notes, wbc_status, wbc_accuracy,
  epithelial_cells_count, epithelial_cells_unit, epithelial_cells_morphology, epithelial_cells_notes, epithelial_cells_status, epithelial_cells_accuracy,
  crystals_count, crystals_unit, crystals_morphology, crystals_notes, crystals_status, crystals_accuracy,
  casts_count, casts_unit, casts_morphology, casts_notes, casts_status, casts_accuracy,
  bacteria_count, bacteria_unit, bacteria_morphology, bacteria_notes, bacteria_status, bacteria_accuracy,
  yeast_count, yeast_unit, yeast_morphology, yeast_notes, yeast_status, yeast_accuracy,
  mucus_count, mucus_unit, mucus_morphology, mucus_notes, mucus_status, mucus_accuracy,
  sperm_count, sperm_unit, sperm_morphology, sperm_notes, sperm_status, sperm_accuracy,
  parasites_count, parasites_unit, parasites_morphology, parasites_notes, parasites_status, parasites_accuracy
);


