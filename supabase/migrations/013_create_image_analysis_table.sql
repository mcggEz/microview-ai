    -- Create image_analysis table for storing individual AI analysis results for each image
    -- This table stores the AI analysis results for each individual LPF/HPF image

    CREATE TABLE IF NOT EXISTS image_analysis (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        test_id UUID NOT NULL REFERENCES urine_tests(id) ON DELETE CASCADE,
        power_mode TEXT NOT NULL CHECK (power_mode IN ('LPF', 'HPF')),
        image_index INTEGER NOT NULL, -- Which image in the array (0-based index)
        image_url TEXT NOT NULL, -- URL of the analyzed image
        
    -- LPF sediment detection results (counts)
    lpf_epithelial_cells INTEGER DEFAULT 0,
    lpf_mucus_threads INTEGER DEFAULT 0,
    lpf_casts INTEGER DEFAULT 0,
    lpf_squamous_epithelial INTEGER DEFAULT 0,
    lpf_abnormal_crystals INTEGER DEFAULT 0,
    
    -- HPF sediment detection results (counts)
    hpf_rbc INTEGER DEFAULT 0,
    hpf_wbc INTEGER DEFAULT 0,
    hpf_epithelial_cells INTEGER DEFAULT 0,
    hpf_crystals INTEGER DEFAULT 0,
    hpf_bacteria INTEGER DEFAULT 0,
    hpf_yeast INTEGER DEFAULT 0,
    hpf_sperm INTEGER DEFAULT 0,
    hpf_parasites INTEGER DEFAULT 0,
        
        -- Analysis metadata
        confidence DECIMAL(5,2) DEFAULT NULL, -- AI confidence percentage (0-100.00)
        analysis_notes TEXT DEFAULT NULL, -- AI analysis notes
        analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Ensure unique combination of test, power mode, and image index
        UNIQUE(test_id, power_mode, image_index)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_image_analysis_test_id ON image_analysis(test_id);
    CREATE INDEX IF NOT EXISTS idx_image_analysis_power_mode ON image_analysis(power_mode);
    CREATE INDEX IF NOT EXISTS idx_image_analysis_image_index ON image_analysis(image_index);
    CREATE INDEX IF NOT EXISTS idx_image_analysis_analyzed_at ON image_analysis(analyzed_at);

    -- Add comments for documentation
    COMMENT ON TABLE image_analysis IS 'Stores AI analysis results for each individual LPF/HPF image';
    COMMENT ON COLUMN image_analysis.test_id IS 'Foreign key reference to urine_tests table';
    COMMENT ON COLUMN image_analysis.power_mode IS 'Microscope power mode: LPF (Low Power Field) or HPF (High Power Field)';
    COMMENT ON COLUMN image_analysis.image_index IS 'Index of the image in the array (0-based)';
    COMMENT ON COLUMN image_analysis.image_url IS 'URL of the analyzed image';
    COMMENT ON COLUMN image_analysis.lpf_epithelial_cells IS 'AI detected epithelial cells count in LPF analysis';
    COMMENT ON COLUMN image_analysis.lpf_mucus_threads IS 'AI detected mucus threads count in LPF analysis';
    COMMENT ON COLUMN image_analysis.lpf_casts IS 'AI detected casts count in LPF analysis';
    COMMENT ON COLUMN image_analysis.lpf_squamous_epithelial IS 'AI detected squamous epithelial count in LPF analysis';
    COMMENT ON COLUMN image_analysis.lpf_abnormal_crystals IS 'AI detected abnormal crystals count in LPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_rbc IS 'AI detected RBC count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_wbc IS 'AI detected WBC count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_epithelial_cells IS 'AI detected epithelial cells count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_crystals IS 'AI detected crystals count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_bacteria IS 'AI detected bacteria count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_yeast IS 'AI detected yeast count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_sperm IS 'AI detected sperm count in HPF analysis';
    COMMENT ON COLUMN image_analysis.hpf_parasites IS 'AI detected parasites count in HPF analysis';
    COMMENT ON COLUMN image_analysis.confidence IS 'AI confidence percentage for analysis (0-100)';
    COMMENT ON COLUMN image_analysis.analysis_notes IS 'AI analysis notes';
    COMMENT ON COLUMN image_analysis.analyzed_at IS 'Timestamp when AI analysis was completed';

    -- Create trigger to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_image_analysis_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_image_analysis_updated_at ON image_analysis;
CREATE TRIGGER trigger_update_image_analysis_updated_at
    BEFORE UPDATE ON image_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_image_analysis_updated_at();
