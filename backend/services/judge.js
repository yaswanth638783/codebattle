const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Judge0 language IDs
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  c: 50,
  cpp: 54,
};

// Judge0 API configuration
const JUDGE0_CONFIG = {
  baseUrl: 'https://judge0-ce.p.rapidapi.com',
  headers: {
    'X-RapidAPI-Key': process.env.JUDGE0_API_KEY,
    'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 seconds timeout
};

async function evaluateCode(code, testCases, language) {
  try {
    // Validate language
    const languageId = LANGUAGE_IDS[language.toLowerCase()];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Validate test cases
    if (!testCases || !Array.isArray(testCases)) {
      throw new Error('No test cases provided for evaluation');
    }

    // Create a unique submission ID for tracking
    const submissionId = uuidv4();
    console.log(`[${submissionId}] Starting evaluation for ${language} code`);

    // Submit all test cases
    const submissionTokens = await Promise.all(
      testCases.map(async (testCase, index) => {
        // Validate test case structure
        if (!testCase.input || !testCase.output) {
          throw new Error(`Test case ${index + 1} is malformed`);
        }

        const submission = {
          source_code: code,
          language_id: languageId,
          stdin: testCase.input,
          expected_output: testCase.output.trim(),
          cpu_time_limit: 5, // 5 seconds max per test case
          memory_limit: 128000, // 128MB memory limit
        };

        try {
          const response = await axios.post(
            `${JUDGE0_CONFIG.baseUrl}/submissions?base64_encoded=false&wait=false`,
            submission,
            {
              headers: JUDGE0_CONFIG.headers,
              timeout: JUDGE0_CONFIG.timeout
            }
          );
          
          console.log(`[${submissionId}] Test case ${index + 1} submitted with token: ${response.data.token}`);
          return {
            token: response.data.token,
            expected: testCase.output.trim(),
            testCaseNumber: index + 1
          };
        } catch (error) {
          console.error(`[${submissionId}] Error submitting test case ${index + 1}:`, error.message);
          throw error;
        }
      })
    );

    // Check results with retry logic
    const results = await Promise.all(
      submissionTokens.map(async ({ token, expected, testCaseNumber }) => {
        let result;
        let attempts = 0;
        const maxAttempts = 10;
        const delayMs = 1000;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const response = await axios.get(
              `${JUDGE0_CONFIG.baseUrl}/submissions/${token}?base64_encoded=false`,
              {
                headers: JUDGE0_CONFIG.headers,
                timeout: JUDGE0_CONFIG.timeout
              }
            );

            const status = response.data.status?.description;

            // If evaluation is complete
            if (status && status !== 'In Queue' && status !== 'Processing') {
              result = {
                passed: status === 'Accepted',
                actual: response.data.stdout?.trim() || '',
                expected,
                status,
                compile_output: response.data.compile_output,
                stderr: response.data.stderr,
                time: response.data.time,
                memory: response.data.memory,
                testCaseNumber
              };
              break;
            }

            // If still processing, wait before retrying
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } catch (error) {
            console.error(`[${submissionId}] Error checking test case ${testCaseNumber} (attempt ${attempts}):`, error.message);
            if (attempts === maxAttempts) throw error;
          }
        }

        if (!result) {
          throw new Error(`Max attempts reached for test case ${testCaseNumber}`);
        }

        return result;
      })
    );

    // Compile final results
    const allPassed = results.every(r => r.passed);
    const finalResult = {
      submissionId,
      status: allPassed ? 'Solved' : 'Failed',
      message: allPassed ? 'All test cases passed!' : 'Some test cases failed.',
      testCount: testCases.length,
      passedCount: results.filter(r => r.passed).length,
      details: results.map(r => ({
        testCase: r.testCaseNumber,
        passed: r.passed,
        actual_output: r.actual,
        expected_output: r.expected,
        status: r.status,
        time: r.time,
        memory: r.memory,
        error: r.stderr || r.compile_output
      })),
    };

    console.log(`[${submissionId}] Evaluation completed: ${finalResult.status}`);
    return finalResult;

  } catch (error) {
    console.error('Code evaluation error:', error.message);
    return {
      status: 'Error',
      message: 'Error evaluating code: ' + error.message,
      details: [],
      error: error.response?.data || error.message
    };
  }
}

module.exports = { evaluateCode };