-- Update existing seed data with image URLs

-- Update the first test (UT-001) with image data
UPDATE urine_tests 
SET 
  image_1_url = '/sample1.png',
  image_1_description = 'High RBC Count - Microscopic view showing high concentration of red blood cells indicating hematuria',
  image_2_url = '/sample2.png',
  image_2_description = 'Mixed Cellular Elements - Microscopic view showing mixed cellular elements with predominant RBCs and some WBCs'
WHERE test_code = 'UT-001';

-- Update the second test (UT-002) with different image data
UPDATE urine_tests 
SET 
  image_1_url = '/sample2.png',
  image_1_description = 'Mixed Cellular Elements - Microscopic view showing mixed cellular elements with predominant RBCs and some WBCs',
  image_2_url = '/sample1.png',
  image_2_description = 'High RBC Count - Microscopic view showing high concentration of red blood cells indicating hematuria'
WHERE test_code = 'UT-002';

-- Update the third test (UT-003) with image data
UPDATE urine_tests 
SET 
  image_1_url = '/sample1.png',
  image_1_description = 'High RBC Count - Microscopic view showing high concentration of red blood cells indicating hematuria'
WHERE test_code = 'UT-003';
