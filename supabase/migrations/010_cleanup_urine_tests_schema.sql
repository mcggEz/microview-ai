-- Clean up urine_tests table to align with Strasinger quantitation table
-- Remove unnecessary columns and keep only what we actually use

-- Remove unused sediment columns (not in Strasinger table)
ALTER TABLE urine_tests 
DROP COLUMN IF EXISTS yeast_count,
DROP COLUMN IF EXISTS yeast_unit,
DROP COLUMN IF EXISTS yeast_morphology,
DROP COLUMN IF EXISTS yeast_notes,
DROP COLUMN IF EXISTS yeast_status,
DROP COLUMN IF EXISTS yeast_accuracy,
DROP COLUMN IF EXISTS sperm_count,
DROP COLUMN IF EXISTS sperm_unit,
DROP COLUMN IF EXISTS sperm_morphology,
DROP COLUMN IF EXISTS sperm_notes,
DROP COLUMN IF EXISTS sperm_status,
DROP COLUMN IF EXISTS sperm_accuracy,
DROP COLUMN IF EXISTS parasites_count,
DROP COLUMN IF EXISTS parasites_unit,
DROP COLUMN IF EXISTS parasites_morphology,
DROP COLUMN IF EXISTS parasites_notes,
DROP COLUMN IF EXISTS parasites_status,
DROP COLUMN IF EXISTS parasites_accuracy;

-- Remove old sediment count columns (replaced by AI count columns)
ALTER TABLE urine_tests 
DROP COLUMN IF EXISTS rbc_count,
DROP COLUMN IF EXISTS rbc_unit,
DROP COLUMN IF EXISTS rbc_morphology,
DROP COLUMN IF EXISTS rbc_notes,
DROP COLUMN IF EXISTS rbc_status,
DROP COLUMN IF EXISTS rbc_accuracy,
DROP COLUMN IF EXISTS wbc_count,
DROP COLUMN IF EXISTS wbc_unit,
DROP COLUMN IF EXISTS wbc_morphology,
DROP COLUMN IF EXISTS wbc_notes,
DROP COLUMN IF EXISTS wbc_status,
DROP COLUMN IF EXISTS wbc_accuracy,
DROP COLUMN IF EXISTS epithelial_cells_count,
DROP COLUMN IF EXISTS epithelial_cells_unit,
DROP COLUMN IF EXISTS epithelial_cells_morphology,
DROP COLUMN IF EXISTS epithelial_cells_notes,
DROP COLUMN IF EXISTS epithelial_cells_status,
DROP COLUMN IF EXISTS epithelial_cells_accuracy,
DROP COLUMN IF EXISTS crystals_count,
DROP COLUMN IF EXISTS crystals_unit,
DROP COLUMN IF EXISTS crystals_morphology,
DROP COLUMN IF EXISTS crystals_notes,
DROP COLUMN IF EXISTS crystals_status,
DROP COLUMN IF EXISTS crystals_accuracy,
DROP COLUMN IF EXISTS casts_count,
DROP COLUMN IF EXISTS casts_unit,
DROP COLUMN IF EXISTS casts_morphology,
DROP COLUMN IF EXISTS casts_notes,
DROP COLUMN IF EXISTS casts_status,
DROP COLUMN IF EXISTS casts_accuracy,
DROP COLUMN IF EXISTS bacteria_count,
DROP COLUMN IF EXISTS bacteria_unit,
DROP COLUMN IF EXISTS bacteria_morphology,
DROP COLUMN IF EXISTS bacteria_notes,
DROP COLUMN IF EXISTS bacteria_status,
DROP COLUMN IF EXISTS bacteria_accuracy,
DROP COLUMN IF EXISTS mucus_count,
DROP COLUMN IF EXISTS mucus_unit,
DROP COLUMN IF EXISTS mucus_morphology,
DROP COLUMN IF EXISTS mucus_notes,
DROP COLUMN IF EXISTS mucus_status,
DROP COLUMN IF EXISTS mucus_accuracy;

-- Add comments for the remaining AI count columns
COMMENT ON TABLE urine_tests IS 'Urine test records with Strasinger quantitation AI counts';
COMMENT ON COLUMN urine_tests.test_code IS 'Unique test identifier in format YYYYMMDD-HH-MM-N';
COMMENT ON COLUMN urine_tests.analysis_date IS 'Date when the urine analysis was performed';
COMMENT ON COLUMN urine_tests.status IS 'Test status: pending, in_progress, completed, reviewed';
COMMENT ON COLUMN urine_tests.collection_time IS 'Time when urine sample was collected';
COMMENT ON COLUMN urine_tests.technician IS 'Name of the lab technician performing the analysis';
