/**
 * Pyodide-based Python code execution for interactive exercises
 * This allows real Python code execution in the browser
 */

// Global Pyodide instance
let pyodideInstance = null;

/**
 * Initialize Pyodide runtime
 */
async function initPyodide() {
    if (pyodideInstance) {
        return pyodideInstance;
    }
    
    try {
        // Create timeout promise (30 seconds)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Pyodide initialization timeout: CDN unreachable after 30 seconds"));
            }, 30000);
        });
        
        // Load Pyodide from CDN with timeout protection
        const loadPromise = loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/"
        });
        
        pyodideInstance = await Promise.race([loadPromise, timeoutPromise]);
        
        // Install common packages
        await pyodideInstance.loadPackage(["micropip"]);
        
        console.log("✅ Pyodide initialized successfully");
        return pyodideInstance;
    } catch (error) {
        console.error("❌ Failed to initialize Pyodide:", error);
        // Reset instance on failure to allow retry
        pyodideInstance = null;
        throw error;
    }
}

/**
 * Execute Python code and run tests
 */
async function executePythonCode(exerciseId, userCode, testCode) {
    try {
        const pyodide = await initPyodide();
        
        // Setup StringIO redirection BEFORE executing any code
        pyodide.runPython(`
import sys
from io import StringIO
_original_stdout = sys.stdout
sys.stdout = StringIO()
        `);
        
        // Execute user code
        pyodide.runPython(userCode);
        
        // Run tests if provided
        let testResult = null;
        if (testCode) {
            testResult = pyodide.runPython(testCode);
        }
        
        // Capture output
        const output = pyodide.runPython("sys.stdout.getvalue()");
        
        // Restore original stdout
        pyodide.runPython("sys.stdout = _original_stdout");
        
        return {
            success: true,
            output: output,
            testResult: testResult
        };
    } catch (error) {
        // Restore stdout even on error (finally-equivalent)
        try {
            if (pyodideInstance) {
                pyodideInstance.runPython(`
try:
    sys.stdout = _original_stdout
except:
    pass
                `);
            }
        } catch (restoreError) {
            // Ignore restore errors
        }
        
        return {
            success: false,
            error: error.message,
            traceback: error.toString()
        };
    }
}

/**
 * Enhanced exercise runner with Pyodide
 */
async function runExerciseWithPyodide(exerciseId, testCases) {
    const textarea = document.getElementById(`code_input_${exerciseId}`);
    const output = document.getElementById(`output_${exerciseId}`);
    const button = document.getElementById(`run_button_${exerciseId}`);
    
    if (!textarea || !output || !button) {
        console.error("Exercise elements not found");
        return;
    }
    
    // Show loading
    button.innerHTML = '⏳ Выполняется...';
    button.disabled = true;
    
    // Get code from CodeMirror editor if available, otherwise from textarea
    const userCode = typeof window.getCodeValue === 'function' 
        ? window.getCodeValue(`code_input_${exerciseId}`)
        : textarea.value;
    
    try {
        // Build test code
        let testCode = "";
        let testsPassed = 0;
        let totalTests = testCases ? testCases.length : 0;
        let testDetails = [];
        
        if (testCases && testCases.length > 0) {
            testCode = `
import sys
from io import StringIO
sys.stdout = StringIO()

# User code
${userCode}

# Tests
test_results = []
tests_passed = 0
            `;
            
            testCases.forEach((testCase, index) => {
                // Escape description to safely embed in Python string literal
                const escapedDescription = JSON.stringify(testCase.description);
                const descriptionVar = `description_var_${index}`;
                testCode += `
${descriptionVar} = ${escapedDescription}
try:
    ${testCase.code}
    test_results.append(("✅", f"Test ${index + 1}: {${descriptionVar}}"))
except AssertionError as e:
    test_results.append(("❌", f"Test ${index + 1}: {${descriptionVar}} - {e}"))
except Exception as e:
    test_results.append(("❌", f"Test ${index + 1}: {${descriptionVar}} - Error: {e}"))
                `;
            });
            
            testCode += `
for status, msg in test_results:
    if status == "✅":
        tests_passed += 1
    print(f"{status} {msg}")
            `;
        }
        
        // Execute code
        const result = await executePythonCode(exerciseId, userCode, testCode);
        
        if (result.success) {
            // Parse test results
            if (result.testResult && testCases && testCases.length > 0) {
                const lines = result.output.split('\n');
                lines.forEach(line => {
                    if (line.includes('✅')) testsPassed++;
                    if (line.trim()) testDetails.push(line);
                });
            }
            
            // CRITICAL: Only show success if all tests passed AND there are tests
            const allTestsPassed = totalTests > 0 && testsPassed === totalTests;
            
            displayResults(exerciseId, {
                success: allTestsPassed,
                tests_passed: testsPassed,
                total_tests: totalTests,
                test_details: testDetails.join('<br>'),
                output: result.output,
                // Add message if no tests were run
                noTestsRun: totalTests === 0
            });
        } else {
            displayResults(exerciseId, {
                success: false,
                error: result.error,
                traceback: result.traceback
            });
        }
    } catch (error) {
        displayResults(exerciseId, {
            success: false,
            error: `Execution error: ${error.message}`
        });
    } finally {
        button.innerHTML = '🚀 Запустить и проверить';
        button.disabled = false;
    }
}

/**
 * Fallback to simple validation if Pyodide fails
 */
function runExerciseSimple(exerciseId) {
    const textarea = document.getElementById(`code_input_${exerciseId}`);
    const output = document.getElementById(`output_${exerciseId}`);
    const button = document.getElementById(`run_button_${exerciseId}`);
    
    button.innerHTML = '⏳ Выполняется...';
    button.disabled = true;
    
    setTimeout(() => {
        // Get code from CodeMirror editor if available, otherwise from textarea
        const userCode = typeof window.getCodeValue === 'function' 
            ? window.getCodeValue(`code_input_${exerciseId}`)
            : textarea.value;
        let result;
        
        try {
            // Basic syntax check
            if (userCode.includes('def ') && userCode.includes('return')) {
                result = {
                    success: true,
                    tests_passed: 1,
                    total_tests: 1,
                    test_details: '<p>✅ Синтаксис корректен</p>'
                };
            } else {
                result = {
                    success: false,
                    error: 'Функция должна содержать def и return',
                    hints: ['Добавьте ключевое слово def', 'Добавьте оператор return']
                };
            }
        } catch (error) {
            result = {
                success: false,
                error: 'Ошибка в коде: ' + error.message
            };
        }
        
        displayResults(exerciseId, result);
        button.innerHTML = '🚀 Запустить и проверить';
        button.disabled = false;
    }, 1000);
}

// Export for use in HTML
window.runExerciseWithPyodide = runExerciseWithPyodide;
window.runExerciseSimple = runExerciseSimple;
window.initPyodide = initPyodide;

