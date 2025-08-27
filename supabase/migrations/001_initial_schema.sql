-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Single denormalized table: patients with embedded microscopic results
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')) NOT NULL,

  -- Report metadata
  sample_id VARCHAR(50),
  collection_time TIME,
  analysis_date DATE,
  technician VARCHAR(255),
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'reviewed')) DEFAULT 'pending',
  report_number VARCHAR(50) UNIQUE,

  -- RBC
  rbc_count VARCHAR(50),
  rbc_unit VARCHAR(20) DEFAULT '/HPF',
  rbc_morphology VARCHAR(255),
  rbc_notes TEXT,
  rbc_status VARCHAR(20) CHECK (rbc_status IN ('normal', 'abnormal', 'critical')),
  rbc_accuracy DECIMAL(5,2) CHECK (rbc_accuracy >= 0 AND rbc_accuracy <= 100),

  -- WBC
  wbc_count VARCHAR(50),
  wbc_unit VARCHAR(20) DEFAULT '/HPF',
  wbc_morphology VARCHAR(255),
  wbc_notes TEXT,
  wbc_status VARCHAR(20) CHECK (wbc_status IN ('normal', 'abnormal', 'critical')),
  wbc_accuracy DECIMAL(5,2) CHECK (wbc_accuracy >= 0 AND wbc_accuracy <= 100),

  -- Epithelial Cells
  epithelial_cells_count VARCHAR(50),
  epithelial_cells_unit VARCHAR(20) DEFAULT '/HPF',
  epithelial_cells_morphology VARCHAR(255),
  epithelial_cells_notes TEXT,
  epithelial_cells_status VARCHAR(20) CHECK (epithelial_cells_status IN ('normal', 'abnormal', 'critical')),
  epithelial_cells_accuracy DECIMAL(5,2) CHECK (epithelial_cells_accuracy >= 0 AND epithelial_cells_accuracy <= 100),

  -- Crystals
  crystals_count VARCHAR(50),
  crystals_unit VARCHAR(20) DEFAULT '/HPF',
  crystals_morphology VARCHAR(255),
  crystals_notes TEXT,
  crystals_status VARCHAR(20) CHECK (crystals_status IN ('normal', 'abnormal', 'critical')),
  crystals_accuracy DECIMAL(5,2) CHECK (crystals_accuracy >= 0 AND crystals_accuracy <= 100),

  -- Casts
  casts_count VARCHAR(50),
  casts_unit VARCHAR(20) DEFAULT '/LPF',
  casts_morphology VARCHAR(255),
  casts_notes TEXT,
  casts_status VARCHAR(20) CHECK (casts_status IN ('normal', 'abnormal', 'critical')),
  casts_accuracy DECIMAL(5,2) CHECK (casts_accuracy >= 0 AND casts_accuracy <= 100),

  -- Bacteria
  bacteria_count VARCHAR(50),
  bacteria_unit VARCHAR(20) DEFAULT '/HPF',
  bacteria_morphology VARCHAR(255),
  bacteria_notes TEXT,
  bacteria_status VARCHAR(20) CHECK (bacteria_status IN ('normal', 'abnormal', 'critical')),
  bacteria_accuracy DECIMAL(5,2) CHECK (bacteria_accuracy >= 0 AND bacteria_accuracy <= 100),

  -- Yeast
  yeast_count VARCHAR(50),
  yeast_unit VARCHAR(20) DEFAULT '/HPF',
  yeast_morphology VARCHAR(255),
  yeast_notes TEXT,
  yeast_status VARCHAR(20) CHECK (yeast_status IN ('normal', 'abnormal', 'critical')),
  yeast_accuracy DECIMAL(5,2) CHECK (yeast_accuracy >= 0 AND yeast_accuracy <= 100),

  -- Mucus
  mucus_count VARCHAR(50),
  mucus_unit VARCHAR(20) DEFAULT '/LPF',
  mucus_morphology VARCHAR(255),
  mucus_notes TEXT,
  mucus_status VARCHAR(20) CHECK (mucus_status IN ('normal', 'abnormal', 'critical')),
  mucus_accuracy DECIMAL(5,2) CHECK (mucus_accuracy >= 0 AND mucus_accuracy <= 100),

  -- Sperm
  sperm_count VARCHAR(50),
  sperm_unit VARCHAR(20) DEFAULT '/HPF',
  sperm_morphology VARCHAR(255),
  sperm_notes TEXT,
  sperm_status VARCHAR(20) CHECK (sperm_status IN ('normal', 'abnormal', 'critical')),
  sperm_accuracy DECIMAL(5,2) CHECK (sperm_accuracy >= 0 AND sperm_accuracy <= 100),

  -- Parasites
  parasites_count VARCHAR(50),
  parasites_unit VARCHAR(20) DEFAULT '/HPF',
  parasites_morphology VARCHAR(255),
  parasites_notes TEXT,
  parasites_status VARCHAR(20) CHECK (parasites_status IN ('normal', 'abnormal', 'critical')),
  parasites_accuracy DECIMAL(5,2) CHECK (parasites_accuracy >= 0 AND parasites_accuracy <= 100),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_report_number ON patients(report_number);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
