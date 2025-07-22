-- Update departments table with the specified departments
UPDATE departments SET name = 'ICT', description = 'Information and Communication Technology' WHERE name = 'Computer Science';
UPDATE departments SET name = 'Management Science', description = 'Business and Management Studies' WHERE name = 'Engineering';

-- Insert new departments if they don't exist
INSERT INTO departments (name, description) 
VALUES 
  ('Medicine', 'Medical Sciences and Clinical Practice'),
  ('Public Health', 'Community Health and Preventive Medicine')
ON CONFLICT (name) DO NOTHING;