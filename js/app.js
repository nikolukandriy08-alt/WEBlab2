class Question {
    constructor(id, level, type, prompt, points = 1) {
        this.id = id;
        this.level = level;
        this.type = type;
        this.prompt = prompt;
        this.points = points;
    }

    static shuffle(array) {
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    render(container) {
        throw new Error('Метод render() має бути перевизначений у підкласі');
    }

    checkAnswer(formElement) {
        throw new Error('Метод checkAnswer() має бути перевизначений у підкласі');
    }
}

class RadioQuestion extends Question {
    constructor(id, level, prompt, options, correctAnswer) {
        super(id, level, 'Одна правильна відповідь (Radio)', prompt, 1);
        this.options = options;
        this.correctAnswer = correctAnswer;
    }

    render(container) {
        const shuffled = Question.shuffle(this.options);
        const optionsHTML = shuffled.map(opt => `
            <label class="option-label">
                <input type="radio" name="q_${this.id}" value="${this.escapeHTML(opt)}" required>
                <span>${this.escapeHTML(opt)}</span>
            </label>
        `).join('');

        container.innerHTML = `
            <div class="question-card">
                <span class="question-type-badge">${this.type}</span>
                <div class="question-title">${this.escapeHTML(this.prompt)}</div>
                <div class="options-group">${optionsHTML}</div>
            </div>
        `;
    }

    checkAnswer(form) {
        const selected = form.querySelector(`input[name="q_${this.id}"]:checked`);
        const userVal = selected ? selected.value : '';
        return {
            isCorrect: userVal === this.correctAnswer,
            userAnswer: userVal || 'Не обрано',
            correctAnswer: this.correctAnswer
        };
    }

    escapeHTML(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

class CheckboxQuestion extends Question {
    constructor(id, level, prompt, options, correctAnswers) {
        super(id, level, 'Кілька правильних відповідей (Checkbox)', prompt, 2);
        this.options = options;
        this.correctAnswers = correctAnswers;
    }

    render(container) {
        const shuffled = Question.shuffle(this.options);
        const optionsHTML = shuffled.map(opt => `
            <label class="option-label">
                <input type="checkbox" name="q_${this.id}" value="${this.escapeHTML(opt)}">
                <span>${this.escapeHTML(opt)}</span>
            </label>
        `).join('');

        container.innerHTML = `
            <div class="question-card">
                <span class="question-type-badge">${this.type}</span>
                <div class="question-title">${this.escapeHTML(this.prompt)}</div>
                <div class="options-group">${optionsHTML}</div>
            </div>
        `;
    }

    checkAnswer(form) {
        const checkedNodes = Array.from(form.querySelectorAll(`input[name="q_${this.id}"]:checked`));
        const userValues = checkedNodes.map(node => node.value).sort();
        const expectedSorted = [...this.correctAnswers].sort();

        const isCorrect = userValues.length === expectedSorted.length &&
            userValues.every((val, idx) => val === expectedSorted[idx]);

        return {
            isCorrect,
            userAnswer: userValues.length ? userValues.join(', ') : 'Нічого не обрано',
            correctAnswer: this.correctAnswers.join(', ')
        };
    }

    escapeHTML(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

class SelectQuestion extends Question {
    constructor(id, level, prompt, options, correctAnswer) {
        super(id, level, 'Випадаючий список (Select)', prompt, 1);
        this.options = options;
        this.correctAnswer = correctAnswer;
    }

    render(container) {
        const shuffled = Question.shuffle(this.options);
        const optionsHTML = shuffled.map(opt =>
            `<option value="${this.escapeHTML(opt)}">${this.escapeHTML(opt)}</option>`
        ).join('');

        container.innerHTML = `
            <div class="question-card">
                <span class="question-type-badge">${this.type}</span>
                <div class="question-title">${this.escapeHTML(this.prompt)}</div>
                <div class="form-group">
                    <select name="q_${this.id}" required>
                        <option value="">-- Оберіть варіант --</option>
                        ${optionsHTML}
                    </select>
                </div>
            </div>
        `;
    }

    checkAnswer(form) {
        const select = form.querySelector(`select[name="q_${this.id}"]`);
        const userVal = select ? select.value : '';
        return {
            isCorrect: userVal === this.correctAnswer,
            userAnswer: userVal || 'Не обрано',
            correctAnswer: this.correctAnswer
        };
    }

    escapeHTML(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

class TextQuestion extends Question {
    constructor(id, level, subtypeLabel, prompt, codeSnippet, acceptedAnswers, isMultiline = false) {
        super(id, level, subtypeLabel, prompt, 2);
        this.codeSnippet = codeSnippet;
        this.acceptedAnswers = acceptedAnswers;
        this.isMultiline = isMultiline;
    }

    render(container) {
        const snippetHTML = this.codeSnippet
            ? `<pre class="code-snippet">${this.escapeHTML(this.codeSnippet)}</pre>`
            : '';

        const fieldHTML = this.isMultiline
            ? `<textarea id="text_q_${this.id}" class="code-input-area" rows="3" placeholder="Введіть код або виправлений рядок..." required></textarea>`
            : `<input type="text" id="text_q_${this.id}" class="code-input-area" placeholder="Введіть відповідь..." required>`;

        container.innerHTML = `
            <div class="question-card">
                <span class="question-type-badge">${this.type}</span>
                <div class="question-title">${this.escapeHTML(this.prompt)}</div>
                ${snippetHTML}
                ${fieldHTML}
                <div id="live-status-${this.id}" class="live-check-status" style="color: #764ba2;">
                    Очікування введення...
                </div>
            </div>
        `;

        const inputEl = document.getElementById(`text_q_${this.id}`);
        const statusEl = document.getElementById(`live-status-${this.id}`);
        inputEl.addEventListener('input', () => {
            const val = this.normalize(inputEl.value);
            if (!val) {
                statusEl.textContent = 'Поле порожнє — введіть відповідь.';
                statusEl.style.color = '#d93025';
                return;
            }
            const matched = this.acceptedAnswers.some(ans => this.normalize(ans) === val);
            if (matched) {
                statusEl.textContent = '✔ Синтаксис і значення виглядають коректно!';
                statusEl.style.color = '#2e7d32';
            } else {
                statusEl.textContent = `Введено символів: ${inputEl.value.length} (перевірка триває...)`;
                statusEl.style.color = '#b24fd3';
            }
        });
    }

    normalize(str) {
        return String(str).trim().replace(/\s+/g, ' ').replace(/;$/, '').toLowerCase();
    }

    checkAnswer() {
        const inputEl = document.getElementById(`text_q_${this.id}`);
        const rawVal = inputEl ? inputEl.value.trim() : '';
        const normVal = this.normalize(rawVal);
        const isCorrect = this.acceptedAnswers.some(ans => this.normalize(ans) === normVal);

        return {
            isCorrect,
            userAnswer: rawVal || 'Порожньо',
            correctAnswer: this.acceptedAnswers[0]
        };
    }

    escapeHTML(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

class DragDropQuestion extends Question {
    constructor(id, level, prompt, pairs) {
        super(id, level, 'Встановлення відповідності (Drag & Drop)', prompt, 2);
        this.pairs = pairs;
    }

    render(container) {
        const shuffledTerms = Question.shuffle(this.pairs.map((p, idx) => ({ id: `item_${this.id}_${idx}`, text: p.term })));

        const poolHTML = shuffledTerms.map(item => `
            <div class="dnd-item" draggable="true" id="${item.id}" data-term="${this.escapeHTML(item.text)}">
                ${this.escapeHTML(item.text)}
            </div>
        `).join('');

        const slotsHTML = this.pairs.map((pair, idx) => `
            <div class="dnd-slot-row">
                <div class="dnd-slot-label">${this.escapeHTML(pair.definition)}</div>
                <div class="dnd-dropzone" data-slot-index="${idx}">Перетягніть сюди</div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="question-card">
                <span class="question-type-badge">${this.type}</span>
                <div class="question-title">${this.escapeHTML(this.prompt)} (перетягніть елементи зліва у відповідні поля справа; клік по вставленому елементу повертає його назад)</div>
                <div class="dnd-wrapper" id="dnd-root-${this.id}">
                    <div class="dnd-pool" id="dnd-pool-${this.id}">
                        ${poolHTML}
                    </div>
                    <div class="dnd-targets">
                        ${slotsHTML}
                    </div>
                </div>
            </div>
        `;

        this.attachDnDEvents();
    }

    attachDnDEvents() {
        const root = document.getElementById(`dnd-root-${this.id}`);
        const pool = document.getElementById(`dnd-pool-${this.id}`);

        root.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('dnd-item')) {
                e.dataTransfer.setData('text/plain', e.target.id);
            }
        });

        const zones = root.querySelectorAll('.dnd-dropzone');
        zones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                const draggedEl = document.getElementById(draggedId);
                if (!draggedEl) return;

                const existing = zone.querySelector('.dnd-item');
                if (existing) {
                    pool.appendChild(existing);
                }
                zone.textContent = '';
                zone.appendChild(draggedEl);
            });
        });

        root.addEventListener('click', (e) => {
            if (e.target.classList.contains('dnd-item') && e.target.parentElement.classList.contains('dnd-dropzone')) {
                const zone = e.target.parentElement;
                pool.appendChild(e.target);
                zone.textContent = 'Перетягніть сюди';
            }
        });
    }

    checkAnswer() {
        const root = document.getElementById(`dnd-root-${this.id}`);
        const zones = Array.from(root.querySelectorAll('.dnd-dropzone'));
        let allCorrect = true;
        const userSummary = [];

        zones.forEach((zone, idx) => {
            const item = zone.querySelector('.dnd-item');
            const placedTerm = item ? item.getAttribute('data-term') : 'Порожньо';
            const expectedTerm = this.pairs[idx].term;
            if (placedTerm !== expectedTerm) {
                allCorrect = false;
            }
            userSummary.push(`${this.pairs[idx].definition} → ${placedTerm}`);
        });

        const correctSummary = this.pairs.map(p => `${p.definition} → ${p.term}`).join('; ');

        return {
            isCorrect: allCorrect,
            userAnswer: userSummary.join('; '),
            correctAnswer: correctSummary
        };
    }

    escapeHTML(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}

const questionBank = [
    new RadioQuestion(1, 'easy', 'Яке ключове слово використовується для оголошення константи в JavaScript?', ['const', 'let', 'var', 'static'], 'const'),
    new RadioQuestion(2, 'easy', 'Який метод виводить повідомлення у консоль браузера?', ['console.log()', 'print()', 'alert.log()', 'document.writeConsole()'], 'console.log()'),
    new RadioQuestion(3, 'easy', 'Яке значення поверне вираз typeof "Hello"?', ['"string"', '"text"', '"char"', '"object"'], '"string"'),
    new RadioQuestion(4, 'easy', 'Який оператор перевіряє сувору рівність (і за значенням, і за типом)?', ['===', '==', '=', '!=='], '==='),
    new RadioQuestion(5, 'easy', 'Як отримати елемент за його унікальним атрибутом id?', ['document.getElementById("id")', 'document.querySelectorAll("#id")', 'document.getElement("id")', 'window.findId("id")'], 'document.getElementById("id")'),
    new CheckboxQuestion(6, 'easy', 'Оберіть примітивні типи даних у JavaScript:', ['number', 'string', 'boolean', 'array'], ['number', 'string', 'boolean']),
    new CheckboxQuestion(7, 'easy', 'Які ключові слова дозволяють оголошувати змінні з блочною областю видимості?', ['let', 'const', 'var', 'global'], ['let', 'const']),
    new SelectQuestion(8, 'easy', 'Яка подія виникає при натисканні лівої кнопки миші на елемент?', ['click', 'hover', 'submit', 'keydown'], 'click'),
    new SelectQuestion(9, 'easy', 'Яка властивість змінює лише текстовий вміст елемента без парсингу HTML-тегів?', ['textContent', 'innerHTML', 'outerHTML', 'className'], 'textContent'),
    new TextQuestion(10, 'easy', 'Написання коду (Code)', 'Напишіть інструкцію, яка оголошує змінну age зі значенням 20 через let:', null, ['let age = 20', 'let age = 20;']),
    new TextQuestion(11, 'easy', 'Заповнення пропусків (Fill-in-the-blank)', 'Заповніть пропуск, щоб додати клас "active" до елемента btn:', 'btn.classList._____("active");', ['add']),
    new TextQuestion(12, 'easy', 'Виправлення помилки (Debugging)', 'Виправте помилку у спробі змінити значення константи (перепишіть рядок правильно):', 'const score = 10;\nscore = 20;', ['let score = 10; score = 20;', 'let score = 10;\nscore = 20;'], true),
    new DragDropQuestion(13, 'easy', 'Встановіть відповідність між типом даних та прикладом значення:', [
        { term: '42', definition: 'Number' },
        { term: '"Привіт"', definition: 'String' },
        { term: 'true', definition: 'Boolean' }
    ]),
    new RadioQuestion(14, 'easy', 'Який метод додає елемент у кінець масиву?', ['push()', 'pop()', 'shift()', 'unshift()'], 'push()'),
    new SelectQuestion(15, 'easy', 'Яке значення має неініціалізована змінна let x;?', ['undefined', 'null', '0', 'NaN'], 'undefined'),

    new RadioQuestion(16, 'medium', 'Що повертає метод document.querySelectorAll(".item")?', ['Статичний NodeList', 'Живу HTMLCollection', 'Звичайний масив Array', 'Перший знайдений елемент'], 'Статичний NodeList'),
    new RadioQuestion(17, 'medium', 'Який метод скасовує стандартну дію браузера (наприклад, перезавантаження при submit)?', ['event.preventDefault()', 'event.stopPropagation()', 'event.cancelBubble()', 'return false'], 'event.preventDefault()'),
    new RadioQuestion(18, 'medium', 'Який метод масиву створює новий масив, трансформуючи кожен елемент?', ['map()', 'forEach()', 'filter()', 'find()'], 'map()'),
    new RadioQuestion(19, 'medium', 'Як правильно додати обробник події кліку до кнопки btn?', ['btn.addEventListener("click", handler)', 'btn.attachEvent("click", handler)', 'btn.on("click", handler)', 'btn.listen("click", handler)'], 'btn.addEventListener("click", handler)'),
    new RadioQuestion(20, 'medium', 'Як перетворити об’єкт user у JSON-рядок для збереження в localStorage?', ['JSON.stringify(user)', 'JSON.parse(user)', 'user.toString()', 'Object.toJSON(user)'], 'JSON.stringify(user)'),
    new CheckboxQuestion(21, 'medium', 'Оберіть методи масивів, які повертають новий масив:', ['map()', 'filter()', 'slice()', 'forEach()'], ['map()', 'filter()', 'slice()']),
    new CheckboxQuestion(22, 'medium', 'Які події використовуються при роботі з HTML-формами?', ['submit', 'input', 'change', 'dblclick'], ['submit', 'input', 'change']),
    new SelectQuestion(23, 'medium', 'Яка властивість об’єкта події вказує на елемент, на якому безпосередньо відбулася подія?', ['event.target', 'event.currentTarget', 'event.type', 'event.src'], 'event.target'),
    new SelectQuestion(24, 'medium', 'Який метод класу викликається автоматично під час створення нового екземпляра через new?', ['constructor()', 'init()', 'super()', 'render()'], 'constructor()'),
    new TextQuestion(25, 'medium', 'Написання коду (Code)', 'Напишіть стрілкову функцію double, яка приймає x і повертає x * 2:', null, ['const double = x => x * 2', 'const double = (x) => x * 2', 'const double = (x) => { return x * 2; }']),
    new TextQuestion(26, 'medium', 'Заповнення пропусків (Fill-in-the-blank)', 'Заповніть пропуск для деструктуризації властивості name з об’єкта user:', 'const { _____ } = user;', ['name']),
    new TextQuestion(27, 'medium', 'Виправлення помилки (Debugging)', 'Виправте помилку при отриманні об’єкта з localStorage:', 'const data = localStorage.getItem("user"); // зараз це рядок\nconst user = JSON.stringify(data);', ['const user = JSON.parse(data);', 'const user = JSON.parse(data)'], true),
    new DragDropQuestion(28, 'medium', 'Встановіть відповідність між методом масиву та його призначенням:', [
        { term: 'filter()', definition: 'Відбирає елементи за умовою' },
        { term: 'find()', definition: 'Повертає перший елемент, що підходить' },
        { term: 'reduce()', definition: 'Зводить масив до одного значення' }
    ]),
    new RadioQuestion(29, 'medium', 'Що таке спливання подій (Event Bubbling)?', ['Поширення події від цільового елемента вгору до батьківських', 'Поширення події від document вниз до елемента', 'Видалення обробника події після спрацювання', 'Асинхронний виклик колбеку'], 'Поширення події від цільового елемента вгору до батьківських'),
    new SelectQuestion(30, 'medium', 'Який метод classList перемикає клас (додає, якщо немає, і видаляє, якщо є)?', ['toggle()', 'switch()', 'replace()', 'contains()'], 'toggle()'),

    new RadioQuestion(31, 'hard', 'Яке ключове слово використовується в конструкторі підкласу для виклику конструктора батьківського класу?', ['super()', 'parent()', 'this()', 'extends()'], 'super()'),
    new RadioQuestion(32, 'hard', 'Чому в обробнику події dragover обов’язково викликати event.preventDefault()?', ['Щоб дозволити скидання елемента (подію drop)', 'Щоб зупинити анімацію перетягування', 'Щоб очистити dataTransfer', 'Щоб уникнути спливання події'], 'Щоб дозволити скидання елемента (подію drop)'),
    new RadioQuestion(33, 'hard', 'Який метод використовується для передачі текстових даних під час Drag & Drop?', ['e.dataTransfer.setData("text/plain", id)', 'e.clipboardData.set("text", id)', 'e.target.setDragData(id)', 'localStorage.setDrag(id)'], 'e.dataTransfer.setData("text/plain", id)'),
    new RadioQuestion(34, 'hard', 'Чим sessionStorage відрізняється від localStorage?', ['Дані в sessionStorage видаляються після закриття вкладки', 'sessionStorage зберігає об’єкти без JSON.stringify', 'localStorage працює лише в межах однієї сесії', 'sessionStorage доступний на сервері'], 'Дані в sessionStorage видаляються після закриття вкладки'),
    new RadioQuestion(35, 'hard', 'Який метод робить об’єкт повністю незмінним (забороняє додавання, видалення та зміну властивостей)?', ['Object.freeze(obj)', 'Object.seal(obj)', 'Object.lock(obj)', 'const obj'], 'Object.freeze(obj)'),
    new CheckboxQuestion(36, 'hard', 'Оберіть переваги делегування подій (Event Delegation):', ['Економія пам’яті за рахунок одного обробника на батьківському елементі', 'Автоматична робота з динамічно доданими елементами', 'Зупинка фази занурення (Capturing)', 'Блокування стандартної поведінки форми'], ['Економія пам’яті за рахунок одного обробника на батьківському елементі', 'Автоматична робота з динамічно доданими елементами']),
    new CheckboxQuestion(37, 'hard', 'Оберіть валідні властивості об’єкта ValidityState (input.validity):', ['valueMissing', 'typeMismatch', 'patternMismatch', 'isEmptyError'], ['valueMissing', 'typeMismatch', 'patternMismatch']),
    new SelectQuestion(38, 'hard', 'Як викликається статичний метод static create() класу User?', ['User.create()', 'new User().create()', 'this.create()', 'User.prototype.create()'], 'User.create()'),
    new SelectQuestion(39, 'hard', 'Який метод перевіряє, чи відповідає елемент заданому CSS-селектору (корисно при делегуванні)?', ['element.matches(".btn")', 'element.contains(".btn")', 'element.closestSelector(".btn")', 'element.hasClass(".btn")'], 'element.matches(".btn")'),
    new TextQuestion(40, 'hard', 'Написання коду (Code)', 'Напишіть заголовок оголошення класу Student, який наслідує клас Person:', null, ['class Student extends Person', 'class Student extends Person {}', 'class Student extends Person {']),
    new TextQuestion(41, 'hard', 'Заповнення пропусків (Fill-in-the-blank)', 'Заповніть пропуск для отримання ID перетягуваного елемента у події drop:', 'const id = e.dataTransfer._____("text/plain");', ['getData']),
    new TextQuestion(42, 'hard', 'Виправлення помилки (Debugging)', 'Виправте помилку в конструкторі підкласу (this використано до super):', 'constructor(name, group) {\n  this.group = group;\n  super(name);\n}', ['constructor(name, group) { super(name); this.group = group; }', 'constructor(name, group) {\n  super(name);\n  this.group = group;\n}'], true),
    new DragDropQuestion(43, 'hard', 'Встановіть відповідність між подією Drag & Drop та моментом її виникнення:', [
        { term: 'dragstart', definition: 'Користувач почав тягнути елемент' },
        { term: 'dragover', definition: 'Елемент утримується над зоною скидання' },
        { term: 'drop', definition: 'Елемент відпущено у зоні скидання' }
    ]),
    new RadioQuestion(44, 'hard', 'Що поверне вираз [1, 2, 3].reduce((acc, n) => acc + n, 10)?', ['16', '6', '10', '123'], '16'),
    new SelectQuestion(45, 'hard', 'Який метод DOM видаляє сам елемент із дерева без звернення до parentNode?', ['element.remove()', 'element.delete()', 'element.detach()', 'document.destroy(element)'], 'element.remove()')
];

class Quiz {
    constructor(allQuestions) {
        this.allQuestions = allQuestions;
        this.currentQuestions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.maxScore = 0;
        this.resultsLog = [];
        this.student = { name: '', group: '', level: 'easy' };
    }

    start(name, group, level) {
        this.student = { name, group, level };
        const filtered = this.allQuestions.filter(q => q.level === level);
        this.currentQuestions = Question.shuffle(filtered).slice(0, 10);
        this.currentIndex = 0;
        this.score = 0;
        this.maxScore = this.currentQuestions.reduce((sum, q) => sum + q.points, 0);
        this.resultsLog = [];
    }

    getCurrentQuestion() {
        return this.currentQuestions[this.currentIndex];
    }

    submitCurrentAnswer(formElement) {
        const question = this.getCurrentQuestion();
        const evaluation = question.checkAnswer(formElement);

        if (evaluation.isCorrect) {
            this.score += question.points;
        }

        this.resultsLog.push({
            prompt: question.prompt,
            ...evaluation
        });

        this.currentIndex++;
        return this.currentIndex < this.currentQuestions.length;
    }

    saveToLocalStorage() {
        const history = JSON.parse(localStorage.getItem('js_quiz_history')) || [];
        history.unshift({
            name: this.student.name,
            group: this.student.group,
            level: this.student.level.toUpperCase(),
            score: `${this.score} / ${this.maxScore}`,
            date: new Date().toLocaleString('uk-UA')
        });
        localStorage.setItem('js_quiz_history', JSON.stringify(history.slice(0, 5)));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const startForm = document.getElementById('start-form');
    if (!startForm) return;

    const quiz = new Quiz(questionBank);

    const startScreen = document.getElementById('start-screen');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');

    const nameInput = document.getElementById('student-name');
    const groupInput = document.getElementById('student-group');
    const levelSelect = document.getElementById('difficulty-level');

    const nameError = document.getElementById('name-error');
    const groupError = document.getElementById('group-error');

    const playerDisplay = document.getElementById('player-display');
    const progressDisplay = document.getElementById('progress-display');
    const questionContainer = document.getElementById('question-container');
    const quizForm = document.getElementById('quiz-form');
    const nextBtn = document.getElementById('next-btn');

    function renderHistory() {
        const historyList = document.getElementById('history-list');
        const history = JSON.parse(localStorage.getItem('js_quiz_history')) || [];
        if (!history.length) {
            historyList.innerHTML = '<p>Поки що немає збережених спроб.</p>';
            return;
        }
        historyList.innerHTML = history.map(item => `
            <div class="result-item">
                <strong>${item.name} (${item.group})</strong> — Рівень: <b>${item.level}</b> |
                Результат: <b>${item.score}</b> <small>(${item.date})</small>
            </div>
        `).join('');
    }

    renderHistory();

    document.getElementById('clear-history-btn').addEventListener('click', () => {
        localStorage.removeItem('js_quiz_history');
        renderHistory();
    });

    function validateStartForm() {
        let valid = true;
        nameError.textContent = '';
        groupError.textContent = '';
        nameInput.classList.remove('input-invalid');
        groupInput.classList.remove('input-invalid');

        if (!nameInput.checkValidity()) {
            nameError.textContent = 'Введіть коректне ім’я (мінімум 3 символи).';
            nameInput.classList.add('input-invalid');
            valid = false;
        }

        if (!groupInput.checkValidity()) {
            groupError.textContent = 'Введіть групу у форматі ТР-52 (2 літери, дефіс, 2 цифри).';
            groupInput.classList.add('input-invalid');
            valid = false;
        }

        return valid;
    }

    startForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validateStartForm()) return;

        quiz.start(nameInput.value.trim(), groupInput.value.trim(), levelSelect.value);

        startScreen.classList.add('hidden');
        resultScreen.classList.add('hidden');
        quizScreen.classList.remove('hidden');

        playerDisplay.textContent = `${quiz.student.name} (${quiz.student.group}) | Рівень: ${quiz.student.level.toUpperCase()}`;
        renderCurrentStep();
    });

    function renderCurrentStep() {
        const currentQ = quiz.getCurrentQuestion();
        progressDisplay.textContent = `Питання ${quiz.currentIndex + 1} з ${quiz.currentQuestions.length}`;
        nextBtn.textContent = (quiz.currentIndex === quiz.currentQuestions.length - 1)
            ? 'Завершити тест ✔'
            : 'Відповісти та далі ➔';
        currentQ.render(questionContainer);
    }

    quizForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const hasMore = quiz.submitCurrentAnswer(quizForm);

        if (hasMore) {
            renderCurrentStep();
        } else {
            showResults();
        }
    });

    function showResults() {
        quiz.saveToLocalStorage();
        quizScreen.classList.add('hidden');
        resultScreen.classList.remove('hidden');

        const percent = Math.round((quiz.score / quiz.maxScore) * 100);
        document.getElementById('score-summary').innerHTML = `
            <p>Студент: <strong>${quiz.student.name}</strong> (${quiz.student.group})</p>
            <p style="font-size: 1.5rem; color: #b24fd3; margin: 0.5rem 0;">
                Набрано балів: <strong>${quiz.score} із ${quiz.maxScore}</strong> (${percent}%)
            </p>
        `;

        document.getElementById('detailed-results').innerHTML = quiz.resultsLog.map((res, i) => `
            <div class="result-item ${res.isCorrect ? 'correct' : 'incorrect'}">
                <div><strong>${i + 1}. ${res.prompt}</strong></div>
                <div>Ваша відповідь: <em>${res.userAnswer}</em></div>
                ${!res.isCorrect ? `<div>Правильна відповідь: <strong>${res.correctAnswer}</strong></div>` : ''}
            </div>
        `).join('');
    }

    document.getElementById('restart-btn').addEventListener('click', () => {
        resultScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        renderHistory();
    });
});