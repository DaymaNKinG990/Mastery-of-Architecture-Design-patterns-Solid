/**
 * 🎯 TDD Learning Quiz System
 * Advanced interactive quiz functionality with beautiful animations
 */

class TDDQuiz {
    constructor(containerId, quizData) {
        this.container = document.getElementById(containerId);
        this.quizData = quizData;
        this.currentQuestion = 0;
        this.userAnswers = [];
        this.score = 0;
        this.startTime = null;
        this.endTime = null;
        this.isCompleted = false;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('Quiz container not found!');
            return;
        }
        
        this.startTime = new Date();
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        const quiz = this.quizData;
        const question = quiz.questions[this.currentQuestion];
        
        this.container.innerHTML = `
            <div class="quiz-header">
                <span class="quiz-icon">${quiz.icon || '🧪'}</span>
                <div>
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <p class="quiz-description">${quiz.description}</p>
                </div>
            </div>
            
            <div class="quiz-score">
                <div class="quiz-score-item">
                    <span class="quiz-score-value">${this.currentQuestion + 1}</span>
                    <span class="quiz-score-label">Вопрос</span>
                </div>
                <div class="quiz-score-item">
                    <span class="quiz-score-value">${quiz.questions.length}</span>
                    <span class="quiz-score-label">Всего</span>
                </div>
                <div class="quiz-score-item">
                    <span class="quiz-score-value">${this.score}</span>
                    <span class="quiz-score-label">Очки</span>
                </div>
            </div>
            
            <div class="quiz-progress">
                <div class="quiz-progress-bar" style="width: ${((this.currentQuestion + 1) / quiz.questions.length) * 100}%"></div>
            </div>
            
            <div class="quiz-content">
                <div class="quiz-question">
                    <span class="quiz-question-number">${this.currentQuestion + 1}</span>
                    ${question.question}
                </div>
                
                <ul class="quiz-options">
                    ${this.renderOptions(question)}
                </ul>
                
                <div class="quiz-controls">
                    ${this.renderControls()}
                </div>
                
                <div id="quiz-result-${this.container.id}" class="quiz-result" style="display: none;"></div>
            </div>
        `;
    }
    
    renderOptions(question) {
        const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
        const name = `quiz-${this.container.id}-q${this.currentQuestion}`;
        
        return question.options.map((option, index) => `
            <li class="quiz-option" data-index="${index}">
                <label>
                    <input type="${inputType}" name="${name}" value="${index}" />
                    <span class="quiz-option-text">${option.text}</span>
                </label>
            </li>
        `).join('');
    }
    
    renderControls() {
        const quiz = this.quizData;
        const isLastQuestion = this.currentQuestion === quiz.questions.length - 1;
        const hasAnswered = this.userAnswers[this.currentQuestion];
        
        let controls = '';
        
        if (this.currentQuestion > 0) {
            controls += '<button class="quiz-btn quiz-btn-secondary" id="prev-btn">← Назад</button>';
        }
        
        if (!hasAnswered) {
            controls += '<button class="quiz-btn quiz-btn-primary" id="check-btn">Проверить</button>';
        } else {
            if (!isLastQuestion) {
                controls += '<button class="quiz-btn quiz-btn-success" id="next-btn">Далее →</button>';
            } else {
                controls += '<button class="quiz-btn quiz-btn-success" id="finish-btn">Завершить 🎯</button>';
            }
        }
        
        return controls;
    }
    
    attachEventListeners() {
        const checkBtn = document.getElementById('check-btn');
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');
        const finishBtn = document.getElementById('finish-btn');
        
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkAnswer());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.prevQuestion());
        }
        
        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.finishQuiz());
        }
        
        // Auto-select radio buttons on click
        const options = this.container.querySelectorAll('.quiz-option label');
        options.forEach(label => {
            label.addEventListener('click', () => {
                const input = label.querySelector('input');
                if (input.type === 'radio') {
                    // Clear other selections for radio buttons
                    const radioGroup = this.container.querySelectorAll(`input[name="${input.name}"]`);
                    radioGroup.forEach(radio => {
                        radio.closest('.quiz-option').classList.remove('selected');
                    });
                    
                    input.closest('.quiz-option').classList.add('selected');
                }
            });
        });
    }
    
    checkAnswer() {
        const question = this.quizData.questions[this.currentQuestion];
        const selectedOptions = this.getSelectedOptions();
        
        if (selectedOptions.length === 0) {
            this.showResult('warning', '⚠️', 'Выберите ответ!', 'Пожалуйста, выберите хотя бы один вариант ответа.');
            return;
        }
        
        this.userAnswers[this.currentQuestion] = selectedOptions;
        
        // Calculate score for this question
        const correctAnswers = question.options
            .map((opt, index) => opt.correct ? index : null)
            .filter(index => index !== null);
        
        let isCorrect = false;
        
        if (question.type === 'multiple') {
            // For multiple choice, all correct answers must be selected and no incorrect ones
            isCorrect = correctAnswers.every(index => selectedOptions.includes(index)) &&
                       selectedOptions.every(index => correctAnswers.includes(index));
        } else {
            // For single choice, the selected answer must be correct
            isCorrect = selectedOptions.length === 1 && correctAnswers.includes(selectedOptions[0]);
        }
        
        if (isCorrect) {
            this.score += question.points || 1;
        }
        
        this.highlightAnswers(correctAnswers, selectedOptions);
        this.showQuestionResult(isCorrect, question.explanation);
        this.showNavigationButtons(); // Show next/finish button without re-rendering
    }
    
    getSelectedOptions() {
        const inputs = this.container.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
        return Array.from(inputs).map(input => parseInt(input.value));
    }
    
    highlightAnswers(correctAnswers, selectedOptions) {
        const options = this.container.querySelectorAll('.quiz-option');
        
        options.forEach((option, index) => {
            const isCorrect = correctAnswers.includes(index);
            const isSelected = selectedOptions.includes(index);
            
            if (isCorrect) {
                option.classList.add('correct');
            } else if (isSelected && !isCorrect) {
                option.classList.add('incorrect');
            } else {
                option.classList.add('neutral');
            }
            
            // Disable further interaction
            const input = option.querySelector('input');
            input.disabled = true;
        });
    }
    
    showQuestionResult(isCorrect, explanation) {
        const resultDiv = document.getElementById(`quiz-result-${this.container.id}`);
        
        if (isCorrect) {
            this.showResult('success', '🎉', 'Правильно!', explanation);
            this.createConfetti();
        } else {
            this.showResult('error', '📚', 'Неправильно', explanation);
        }
    }
    
    showResult(type, icon, title, message) {
        const resultDiv = document.getElementById(`quiz-result-${this.container.id}`);
        
        resultDiv.className = `quiz-result ${type}`;
        resultDiv.innerHTML = `
            <span class="quiz-result-icon">${icon}</span>
            <div class="quiz-result-text">${title}</div>
            <div class="quiz-result-details">${message}</div>
        `;
        resultDiv.style.display = 'block';
        
        // Animate result appearance
        setTimeout(() => {
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
    
    showNavigationButtons() {
        const controlsDiv = this.container.querySelector('.quiz-controls');
        if (!controlsDiv) return;
        
        const isLastQuestion = this.currentQuestion === this.quizData.questions.length - 1;
        let controls = '';
        
        if (this.currentQuestion > 0) {
            controls += '<button class="quiz-btn quiz-btn-secondary" id="prev-btn">← Назад</button>';
        }
        
        if (!isLastQuestion) {
            controls += '<button class="quiz-btn quiz-btn-success" id="next-btn">Далее →</button>';
        } else {
            controls += '<button class="quiz-btn quiz-btn-success" id="finish-btn">Завершить 🎯</button>';
        }
        
        controlsDiv.innerHTML = controls;
        this.attachEventListeners();
    }
    
    nextQuestion() {
        if (this.currentQuestion < this.quizData.questions.length - 1) {
            this.currentQuestion++;
            this.render();
            this.attachEventListeners();
        }
    }
    
    prevQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.render();
            this.attachEventListeners();
        }
    }
    
    finishQuiz() {
        this.endTime = new Date();
        this.isCompleted = true;
        this.showFinalResults();
    }
    
    showFinalResults() {
        const quiz = this.quizData;
        const totalQuestions = quiz.questions.length;
        const maxScore = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
        const percentage = Math.round((this.score / maxScore) * 100);
        const timeSpent = Math.round((this.endTime - this.startTime) / 1000);
        
        let grade = '';
        let gradeIcon = '';
        let gradeColor = '';
        
        if (percentage >= 90) {
            grade = 'Отлично!';
            gradeIcon = '🏆';
            gradeColor = 'success';
        } else if (percentage >= 75) {
            grade = 'Хорошо!';
            gradeIcon = '🥈';
            gradeColor = 'success';
        } else if (percentage >= 60) {
            grade = 'Удовлетворительно';
            gradeIcon = '🥉';
            gradeColor = 'warning';
        } else {
            grade = 'Нужно повторить';
            gradeIcon = '📚';
            gradeColor = 'error';
        }
        
        this.container.innerHTML = `
            <div class="quiz-header">
                <span class="quiz-icon">🎯</span>
                <div>
                    <h3 class="quiz-title">Тест завершен!</h3>
                    <p class="quiz-description">${quiz.title}</p>
                </div>
            </div>
            
            <div class="quiz-content">
                <div class="quiz-result ${gradeColor}">
                    <span class="quiz-result-icon">${gradeIcon}</span>
                    <div class="quiz-result-text">${grade}</div>
                    <div class="quiz-result-details">
                        Ваш результат: ${this.score} из ${maxScore} баллов (${percentage}%)<br>
                        Время выполнения: ${timeSpent} секунд<br>
                        Правильных ответов: ${this.getCorrectAnswersCount()} из ${totalQuestions}
                    </div>
                </div>
                
                <div class="quiz-controls">
                    <button class="quiz-btn quiz-btn-primary" onclick="location.reload()">Пройти еще раз</button>
                    <button class="quiz-btn quiz-btn-secondary" onclick="window.history.back()">Вернуться к курсу</button>
                </div>
                
                ${this.generateDetailedResults()}
            </div>
        `;
        
        this.container.classList.add('completed');
        
        if (percentage >= 75) {
            this.createMassiveConfetti();
        }
    }
    
    getCorrectAnswersCount() {
        let correct = 0;
        
        this.quizData.questions.forEach((question, qIndex) => {
            const userAnswer = this.userAnswers[qIndex];
            if (!userAnswer) return;
            
            const correctAnswers = question.options
                .map((opt, index) => opt.correct ? index : null)
                .filter(index => index !== null);
            
            let isCorrect = false;
            
            if (question.type === 'multiple') {
                isCorrect = correctAnswers.every(index => userAnswer.includes(index)) &&
                           userAnswer.every(index => correctAnswers.includes(index));
            } else {
                isCorrect = userAnswer.length === 1 && correctAnswers.includes(userAnswer[0]);
            }
            
            if (isCorrect) correct++;
        });
        
        return correct;
    }
    
    generateDetailedResults() {
        return `
            <div style="margin-top: 2rem; padding: 1rem; background: rgba(255,255,255,0.1); border-radius: 0.5rem;">
                <h4 style="margin: 0 0 1rem 0; color: white;">📊 Детальные результаты:</h4>
                ${this.quizData.questions.map((question, index) => {
                    const userAnswer = this.userAnswers[index];
                    const correctAnswers = question.options
                        .map((opt, optIndex) => opt.correct ? optIndex : null)
                        .filter(optIndex => optIndex !== null);
                    
                    let isCorrect = false;
                    
                    if (userAnswer) {
                        if (question.type === 'multiple') {
                            isCorrect = correctAnswers.every(optIndex => userAnswer.includes(optIndex)) &&
                                       userAnswer.every(optIndex => correctAnswers.includes(optIndex));
                        } else {
                            isCorrect = userAnswer.length === 1 && correctAnswers.includes(userAnswer[0]);
                        }
                    }
                    
                    return `
                        <div style="margin-bottom: 0.5rem; font-size: 0.9rem;">
                            ${isCorrect ? '✅' : '❌'} Вопрос ${index + 1}: ${isCorrect ? 'Правильно' : 'Неправильно'}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    createConfetti() {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'quiz-confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.animationDelay = Math.random() * 2 + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 3000);
            }, i * 100);
        }
    }
    
    createMassiveConfetti() {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'quiz-confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.animationDelay = Math.random() * 3 + 's';
                confetti.style.background = ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'][Math.floor(Math.random() * 5)];
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    confetti.remove();
                }, 4000);
            }, i * 50);
        }
    }
}

/**
 * 🎨 Utility Functions
 */

// Initialize quiz from data attribute
function initQuizFromData(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const quizDataScript = container.querySelector('script[type="application/json"]');
    if (!quizDataScript) {
        console.error('Quiz data not found!');
        return;
    }
    
    try {
        const quizData = JSON.parse(quizDataScript.textContent);
        new TDDQuiz(containerId, quizData);
    } catch (error) {
        console.error('Error parsing quiz data:', error);
    }
}

// Auto-initialize all quizzes on page load
document.addEventListener('DOMContentLoaded', function() {
    const quizContainers = document.querySelectorAll('.quiz-container');
    quizContainers.forEach((container, index) => {
        // If container doesn't have an id, generate one
        if (!container.id) {
            container.id = `quiz-container-${index}-${Date.now()}`;
        }
        
        if (container.querySelector('script[type="application/json"]')) {
            initQuizFromData(container.id);
        }
    });
});

/**
 * 🎯 Quiz Data Templates
 */

// Helper function to create quiz quickly
function createQuiz(containerId, title, description, questions, icon = '🧪') {
    const quizData = {
        title,
        description,
        icon,
        questions
    };
    
    return new TDDQuiz(containerId, quizData);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TDDQuiz, createQuiz, initQuizFromData };
}
