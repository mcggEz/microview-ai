-- Create sediment_analysis table for storing cropped region sediment data
-- This table stores the analysis results for each cropped region from LPF/HPF images

CREATE TABLE IF NOT EXISTS sediment_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID NOT NULL REFERENCES urine_tests(id) ON DELETE CASCADE,
    power_mode TEXT NOT NULL CHECK (power_mode IN ('LPF', 'HPF')),
    field_index INTEGER NOT NULL, -- Which field image (1, 2, 3, etc.)
    region_index INTEGER NOT NULL, -- Which cropped region within the field (1, 2, 3, etc.)
    
    -- LPF sediment types
    epithelial_cells TEXT DEFAULT 'None',
    mucus_threads TEXT DEFAULT 'None',
    casts TEXT DEFAULT 'None',
    squamous_epithelial TEXT DEFAULT 'None',
    abnormal_crystals TEXT DEFAULT 'None',
    
    -- HPF sediment types
    crystals_normal TEXT DEFAULT 'None',
    bacteria TEXT DEFAULT 'None',
    rbcs TEXT DEFAULT 'None',
    wbcs TEXT DEFAULT 'None',
    transitional_yeasts_trichomonas TEXT DEFAULT 'None',
    renal_tubular_epithelial TEXT DEFAULT 'None',
    oval_fat_bodies TEXT DEFAULT 'None',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of test, power mode, field, and region
    UNIQUE(test_id, power_mode, field_index, region_index)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sediment_analysis_test_id ON sediment_analysis(test_id);
CREATE INDEX IF NOT EXISTS idx_sediment_analysis_power_mode ON sediment_analysis(power_mode);
CREATE INDEX IF NOT EXISTS idx_sediment_analysis_field_region ON sediment_analysis(field_index, region_index);

-- Add comments for documentation
COMMENT ON TABLE sediment_analysis IS 'Stores sediment analysis results for each cropped region from LPF/HPF images';
COMMENT ON COLUMN sediment_analysis.test_id IS 'Foreign key reference to urine_tests table';
COMMENT ON COLUMN sediment_analysis.power_mode IS 'Microscope power mode: LPF (Low Power Field) or HPF (High Power Field)';
COMMENT ON COLUMN sediment_analysis.field_index IS 'Index of the field image (1-based)';
COMMENT ON COLUMN sediment_analysis.region_index IS 'Index of the cropped region within the field (1-based)';
COMMENT ON COLUMN sediment_analysis.epithelial_cells IS 'Epithelial cells count/classification for LPF analysis';
COMMENT ON COLUMN sediment_analysis.mucus_threads IS 'Mucus threads count/classification for LPF analysis';
COMMENT ON COLUMN sediment_analysis.casts IS 'Casts count/classification for LPF analysis';
COMMENT ON COLUMN sediment_analysis.squamous_epithelial IS 'Squamous epithelial count/classification for LPF analysis';
COMMENT ON COLUMN sediment_analysis.abnormal_crystals IS 'Abnormal crystals count/classification for LPF analysis';
COMMENT ON COLUMN sediment_analysis.crystals_normal IS 'Normal crystals count/classification for HPF analysis';
COMMENT ON COLUMN sediment_analysis.bacteria IS 'Bacteria count/classification for HPF analysis';
COMMENT ON COLUMN sediment_analysis.rbcs IS 'Red blood cells count/classification for HPF analysis';
COMMENT ON COLUMN sediment_analysis.wbcs IS 'White blood cells count/classification for HPF analysis';
COMMENT ON COLUMN sediment_analysis.transitional_yeasts_trichomonas IS 'Transitional cells, yeasts, or trichomonas count/classification for HPF analysis';
COMMENT ON COLUMN sediment_analysis.renal_tubular_epithelial IS 'Renal tubular epithelial cells count/classification for HPF analysis';
COMMENT ON COLUMN sediment_analysis.oval_fat_bodies IS 'Oval fat bodies count/classification for HPF analysis';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sediment_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sediment_analysis_updated_at
    BEFORE UPDATE ON sediment_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_sediment_analysis_updated_at();
