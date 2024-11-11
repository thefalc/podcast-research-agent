-- Creates model for pulling questions from research source material
CREATE MODEL `question_generation`
INPUT (text STRING)
OUTPUT (response STRING)
WITH (
  'openai.connection'='openai-connection',
  'provider'='openai',
  'task'='text_generation',
  'openai.model_version' = 'gpt-3.5-turbo',
  'openai.system_prompt' = 'Extract the most interesting questions asked from the text. Paraphrase the questions and seperate each one by a blank line. Do not number the questions.'
);

-- Generates questions based on text pulled from research source material
INSERT INTO `podprep-mined-questions` SELECT `key`, `bundleId`, `url`, q.response AS questions FROM `podprep-full-text-1`,
  LATERAL TABLE (ml_predict('question_generation', content)) AS q;

-- Writes the bundleId to the complete topic once all questions have been created
INSERT INTO `processed-research-bundles-1`
SELECT '' AS id, pmq.bundleId
FROM (
    SELECT bundleId, COUNT(url) AS url_count_mined
    FROM `podprep-mined-questions`
    GROUP BY bundleId
) AS pmq
JOIN (
    SELECT bundleId, COUNT(url) AS url_count_full
    FROM `podprep-full-text-1`
    GROUP BY bundleId
) AS pft
ON pmq.bundleId = pft.bundleId
WHERE pmq.url_count_mined = pft.url_count_full;