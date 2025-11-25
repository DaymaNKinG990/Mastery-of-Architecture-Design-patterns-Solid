/**
 * CodeMirror integration for interactive code exercises
 * Provides syntax highlighting, tab handling, and better code editing experience
 */

// Store CodeMirror instances
const editorInstances = new Map();

/**
 * Initialize CodeMirror for a textarea
 * @param {string} textareaId - ID of the textarea element
 * @param {object} options - CodeMirror configuration options
 * @returns {CodeMirror} - CodeMirror instance
 */
function initCodeEditor(textareaId, options = {}) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) {
        console.error(`Textarea with id "${textareaId}" not found`);
        return null;
    }

    // Check if CodeMirror is already initialized for this textarea
    if (editorInstances.has(textareaId)) {
        return editorInstances.get(textareaId);
    }

    // Default CodeMirror configuration
    const defaultConfig = {
        mode: 'python',
        theme: 'monokai',
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        readOnly: false,  // Ensure editor is editable
        dragDrop: true,  // CRITICAL: Enable drag and drop - CodeMirror 5 handles selection correctly
        cursorBlinkRate: 530,  // Cursor blink rate
        cursorHeight: 1,  // Full height cursor
        showCursorWhenSelecting: true,  // Show cursor during selection
        // CRITICAL: CodeMirror 5 - Use textarea input style (default)
        inputStyle: 'textarea',  // Use textarea - CodeMirror 5 default
        extraKeys: {
            // Handle Tab key for indentation
            'Tab': (cm) => {
                if (cm.somethingSelected()) {
                    cm.indentSelection('add');
                } else {
                    cm.replaceSelection('    ', 'end');
                }
            },
            // Handle Shift-Tab for unindent
            'Shift-Tab': (cm) => {
                cm.indentSelection('subtract');
            },
            // Ctrl/Cmd + A to select all - CRITICAL: CodeMirror 5 API
            'Ctrl-A': (cm) => {
                // CodeMirror 5: selectAll command
                cm.execCommand('selectAll');
                // Return false to prevent browser default
                return false;
            },
            'Cmd-A': (cm) => {
                // CodeMirror 5: selectAll command  
                cm.execCommand('selectAll');
                // Return false to prevent browser default
                return false;
            },
            // Ctrl/Cmd + C to copy (explicit)
            'Ctrl-C': (cm) => {
                if (cm.somethingSelected()) {
                    document.execCommand('copy');
                }
            },
            'Cmd-C': (cm) => {
                if (cm.somethingSelected()) {
                    document.execCommand('copy');
                }
            },
            // Ctrl/Cmd + Enter to run code
            'Ctrl-Enter': (cm) => {
                const exerciseId = textareaId.replace('code_input_', '');
                const runButton = document.getElementById(`run_button_${exerciseId}`);
                if (runButton) runButton.click();
            },
            'Cmd-Enter': (cm) => {
                const exerciseId = textareaId.replace('code_input_', '');
                const runButton = document.getElementById(`run_button_${exerciseId}`);
                if (runButton) runButton.click();
            }
        }
    };

    // Merge user options with defaults
    const config = { ...defaultConfig, ...options };

    // CRITICAL: Save initial value BEFORE CodeMirror replaces textarea
    // Also check data-initial attribute as fallback
    let initialValue = textarea.value || '';
    if (!initialValue) {
        const dataInitial = textarea.getAttribute('data-initial');
        if (dataInitial) {
            initialValue = dataInitial.replace(/\\n/g, '\n');
        }
    }
    
    // Initialize CodeMirror
    const editor = CodeMirror.fromTextArea(textarea, config);
    
    // CRITICAL: Set initial value AFTER initialization
    // Use setTimeout to ensure CodeMirror is fully ready
    setTimeout(() => {
        if (initialValue) {
            editor.setValue(initialValue);
            // CRITICAL: Place cursor at end, don't select all
            const doc = editor.getDoc();
            const lastLine = doc.lastLine();
            const lastLineLength = doc.getLine(lastLine).length;
            doc.setCursor(lastLine, lastLineLength);
        }
    }, 0);

    // Set initial size - use pixel height for proper scrolling
    const minHeight = 300;
    const maxHeight = 600;
    editor.setSize('100%', minHeight);
    
    // Auto-adjust height based on content (but within limits)
    editor.on('change', (cm) => {
        // Sync with hidden textarea
        textarea.value = cm.getValue();
        
        // Auto-resize based on content
        const lines = cm.lineCount();
        const lineHeight = 20; // approximate line height
        const calculatedHeight = Math.min(Math.max(lines * lineHeight + 20, minHeight), maxHeight);
        editor.setSize('100%', calculatedHeight);
    });

    // Store instance
    editorInstances.set(textareaId, editor);

    // Initial size adjustment
    const initialLines = editor.lineCount();
    const initialHeight = Math.min(Math.max(initialLines * 20 + 20, minHeight), maxHeight);
    editor.setSize('100%', initialHeight);

    // CRITICAL: Ensure editor is editable and focusable
    editor.setOption('readOnly', false);
    
    // CRITICAL: CodeMirror 5 - Enable text selection on all elements
    const wrapper = editor.getWrapperElement();
    const scroller = editor.getScrollerElement();
    
    // Apply user-select to all CodeMirror DOM elements
    [wrapper, scroller].forEach(el => {
        if (el) {
            el.style.userSelect = 'text';
            el.style.webkitUserSelect = 'text';
            el.style.mozUserSelect = 'text';
            el.style.msUserSelect = 'text';
            el.style.cursor = 'text';
        }
    });
    
    // CRITICAL: Apply to all line elements
    setTimeout(() => {
        const codeLines = wrapper.querySelectorAll('.CodeMirror-line');
        codeLines.forEach(line => {
            line.style.userSelect = 'text';
            line.style.webkitUserSelect = 'text';
            line.style.pointerEvents = 'auto';
        });
    }, 50);
    
    // Refresh editor to ensure proper rendering
    setTimeout(() => {
        editor.refresh();
        
        // Ensure initial value is set correctly
        const currentValue = editor.getValue();
        if (!currentValue && initialValue) {
            editor.setValue(initialValue);
        }
        
        console.log(`✅ CodeMirror initialized for ${textareaId}`, {
            lines: editor.lineCount(),
            height: initialHeight,
            readOnly: editor.getOption('readOnly'),
            mode: editor.getOption('mode'),
            hasValue: editor.getValue().length > 0,
            dragDrop: editor.getOption('dragDrop'),
            inputStyle: editor.getOption('inputStyle')
        });
        
        // CRITICAL: Test selection functionality and verify CodeMirror is ready
        setTimeout(() => {
            const testSelection = editor.getSelection();
            const doc = editor.getDoc();
            const wrapper = editor.getWrapperElement();
            
            console.log(`🔍 Selection test for ${textareaId}:`, {
                hasSelection: editor.somethingSelected(),
                selectionText: testSelection,
                selectionLength: testSelection.length,
                cursorPos: doc.getCursor(),
                hasFocus: editor.hasFocus(),
                readOnly: editor.getOption('readOnly'),
                dragDrop: editor.getOption('dragDrop'),
                wrapperUserSelect: window.getComputedStyle(wrapper).userSelect
            });
            
            // CRITICAL: Verify CodeMirror selection mechanism is working
            // Try to set a test selection programmatically
            try {
                doc.setSelection({line: 0, ch: 0}, {line: 0, ch: 5});
                const testHasSelection = editor.somethingSelected();
                const testSelectionText = editor.getSelection();
                console.log(`🧪 Programmatic selection test:`, {
                    success: testHasSelection,
                    selectedText: testSelectionText,
                    length: testSelectionText.length
                });
                // Clear test selection
                doc.setCursor({line: 0, ch: 0});
            } catch (e) {
                console.error(`❌ Selection API error:`, e);
            }
        }, 200);
    }, 100);

    // CRITICAL: Track if this is first interaction to prevent text deletion
    let isFirstInteraction = true;
    
    // CRITICAL: CodeMirror 5 has built-in selection mechanism
    // DO NOT override mouse events - let CodeMirror handle selection itself
    // Only handle first interaction to prevent text deletion
    
    editor.on('mousedown', (cm, event) => {
        // If first interaction and all text is selected, deselect it
        if (isFirstInteraction) {
            const allSelected = cm.somethingSelected() && 
                               cm.getSelection() === cm.getValue();
            if (allSelected) {
                // Place cursor at end instead of selecting all
                const doc = cm.getDoc();
                const lastLine = doc.lastLine();
                const lastLineLength = doc.getLine(lastLine).length;
                doc.setCursor(lastLine, lastLineLength);
            }
            isFirstInteraction = false;
        }
        
        // Focus editor - CodeMirror will handle selection automatically
        if (!cm.hasFocus()) {
            cm.focus();
        }
    });
    
    // CRITICAL: CodeMirror 5 handles selection automatically
    // We should NOT override mousemove/mouseup as it breaks built-in selection
    
    // CRITICAL: Handle first keypress to prevent deletion
    editor.on('keydown', (cm, event) => {
        if (isFirstInteraction) {
            // If all text is selected on first keypress, clear selection first
            if (cm.somethingSelected() && cm.getSelection() === cm.getValue()) {
                const doc = cm.getDoc();
                const lastLine = doc.lastLine();
                const lastLineLength = doc.getLine(lastLine).length;
                doc.setCursor(lastLine, lastLineLength);
            }
            isFirstInteraction = false;
        }
    });
    
    // CRITICAL: Handle focus to ensure editor is active
    editor.on('focus', (cm) => {
        cm.setOption('readOnly', false);
    });
    
    // CRITICAL: Ensure selection works on double/triple click
    editor.on('dblclick', (cm) => {
        // Double click selects word - let it work
    });

    return editor;
}

/**
 * Get CodeMirror instance for a textarea
 * @param {string} textareaId - ID of the textarea
 * @returns {CodeMirror|null} - CodeMirror instance or null
 */
function getCodeEditor(textareaId) {
    return editorInstances.get(textareaId) || null;
}

/**
 * Get code value from editor (works with both CodeMirror and plain textarea)
 * @param {string} textareaId - ID of the textarea
 * @returns {string} - Code content
 */
function getCodeValue(textareaId) {
    const editor = editorInstances.get(textareaId);
    if (editor) {
        return editor.getValue();
    }
    const textarea = document.getElementById(textareaId);
    return textarea ? textarea.value : '';
}

/**
 * Set code value in editor (works with both CodeMirror and plain textarea)
 * @param {string} textareaId - ID of the textarea
 * @param {string} code - Code to set
 */
function setCodeValue(textareaId, code) {
    const editor = editorInstances.get(textareaId);
    if (editor) {
        editor.setValue(code);
    } else {
        const textarea = document.getElementById(textareaId);
        if (textarea) {
            textarea.value = code;
        }
    }
}

/**
 * Initialize all code editors on the page
 */
function initAllCodeEditors() {
    // Find all textareas with class 'code-textarea'
    const textareas = document.querySelectorAll('textarea.code-textarea');
    
    textareas.forEach(textarea => {
        // Skip if already initialized
        if (editorInstances.has(textarea.id)) {
            return;
        }
        
        // Only initialize if CodeMirror is loaded
        if (typeof CodeMirror !== 'undefined') {
            // CRITICAL: Wait a bit to ensure textarea has its initial value
            setTimeout(() => {
                const editor = initCodeEditor(textarea.id);
                if (editor) {
                    // Double-check initial value is set
                    const textareaValue = textarea.value || '';
                    const editorValue = editor.getValue();
                    if (textareaValue && !editorValue) {
                        editor.setValue(textareaValue);
                    }
                }
            }, 50);
        } else {
            console.warn('CodeMirror not loaded, using plain textarea with Tab handling fallback');
            setupPlainTextareaTabHandling(textarea);
        }
    });
}

/**
 * Fallback: Setup Tab handling for plain textarea (if CodeMirror is not available)
 * @param {HTMLTextAreaElement} textarea - Textarea element
 */
function setupPlainTextareaTabHandling(textarea) {
    textarea.addEventListener('keydown', function(e) {
        // Handle Tab key
        if (e.key === 'Tab') {
            e.preventDefault();
            
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const value = this.value;
            
            if (e.shiftKey) {
                // Shift+Tab: Remove indentation
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const line = value.substring(lineStart, start);
                
                if (line.startsWith('    ')) {
                    this.value = value.substring(0, lineStart) + 
                                value.substring(lineStart + 4);
                    this.selectionStart = this.selectionEnd = start - 4;
                } else if (line.startsWith('\t')) {
                    this.value = value.substring(0, lineStart) + 
                                value.substring(lineStart + 1);
                    this.selectionStart = this.selectionEnd = start - 1;
                }
            } else {
                // Tab: Add indentation
                this.value = value.substring(0, start) + '    ' + value.substring(end);
                this.selectionStart = this.selectionEnd = start + 4;
            }
        }
        
        // Ctrl/Cmd + Enter: Run code
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const exerciseId = this.id.replace('code_input_', '');
            const runButton = document.getElementById(`run_button_${exerciseId}`);
            if (runButton) runButton.click();
        }
    });
}

/**
 * Reset code editor to initial value
 * @param {string} exerciseId - Exercise ID
 */
function resetCodeEditor(exerciseId) {
    const textareaId = `code_input_${exerciseId}`;
    const textarea = document.getElementById(textareaId);
    
    if (!textarea) return;
    
    const initialCode = textarea.getAttribute('data-initial') || '';
    const decodedCode = initialCode.replace(/\\n/g, '\n');
    
    setCodeValue(textareaId, decodedCode);
    
    // Hide output
    const output = document.getElementById(`output_${exerciseId}`);
    if (output) {
        output.style.display = 'none';
    }
}

/**
 * Enhanced resetCode function that works with CodeMirror
 */
window.resetCode = resetCodeEditor;

// Initialize editors when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCodeEditors);
} else {
    initAllCodeEditors();
}

// Re-initialize on navigation (for SPA-like behavior in MkDocs Material)
document.addEventListener('DOMContentLoaded', function() {
    // MkDocs Material theme instant navigation support
    const instantNavigation = document.querySelector('[data-md-component="navigation"]');
    if (instantNavigation) {
        document.addEventListener('instant:navigation', initAllCodeEditors);
    }
});

// Export functions for global use
window.initCodeEditor = initCodeEditor;
window.getCodeEditor = getCodeEditor;
window.getCodeValue = getCodeValue;
window.setCodeValue = setCodeValue;
window.resetCodeEditor = resetCodeEditor;

