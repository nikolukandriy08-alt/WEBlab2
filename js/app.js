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
    new RadioQuestion(1, 'easy', 'Яке ключове слово використовується для оголошення класу в стандартах ES6+?', ['class', 'struct', 'object', 'constructor'], 'class'),
    new RadioQuestion(2, 'easy', 'Як називається спеціальний метод класу, який автоматично викликається при створенні об’єкта через new?', ['constructor', 'init', 'create', 'main'], 'constructor'),
    new RadioQuestion(3, 'easy', 'Який оператор використовується для створення нового екземпляра класу?', ['new', 'create', 'instance', 'class'], 'new'),
    new RadioQuestion(4, 'easy', 'На що вказує ключове слово this усередині звичайного методу екземпляра класу?', ['На поточний екземпляр класу', 'На батьківський клас', 'На глобальний об’єкт window', 'На статичний метод'], 'На поточний екземпляр класу'),
    new RadioQuestion(5, 'easy', 'Яке ключове слово використовується для створення підкласу (наслідування одного класу від іншого)?', ['extends', 'inherits', 'implements', 'super'], 'extends'),
    new CheckboxQuestion(6, 'easy', 'Оберіть правильні твердження про синтаксис класів ES6+:', ['Методи всередині класу пишуться без ключового слова function', 'Тіло класу завжди виконується у суворому режимі (strict mode)'], ['Методи всередині класу пишуться без ключового слова function', 'Тіло класу завжди виконується у суворому режимі (strict mode)']),
    new CheckboxQuestion(7, 'easy', 'Що може містити тіло класу ES6+?', ['Конструктор (constructor)', 'Методи екземпляра', 'Статичні методи (static)', 'Оголошення змінних через var поза методами'], ['Конструктор (constructor)', 'Методи екземпляра', 'Статичні методи (static)']),
    new SelectQuestion(8, 'easy', 'Як називається функція, оголошена всередині тіла класу?', ['Метод', 'Конструкторський тег', 'Прототипний модуль', 'Замикання'], 'Метод'),
    new SelectQuestion(9, 'easy', 'Скільки методів constructor може мати один клас у JavaScript?', ['Лише один', 'Два (звичайний і статичний)', 'Необмежену кількість', 'Жодного, конструктор заборонений'], 'Лише один'),
    new TextQuestion(10, 'easy', 'Написання коду (Code)', 'Напишіть оголошення порожнього класу з назвою Car:', null, ['class Car {}', 'class Car { }']),
    new TextQuestion(11, 'easy', 'Заповнення пропусків (Fill-in-the-blank)', 'Заповніть пропуск, щоб створити новий екземпляр класу User:', 'const user = _____ User("Андрій");', ['new']),
    new TextQuestion(12, 'easy', 'Виправлення помилки (Debugging)', 'Виправте синтаксичну помилку в оголошенні методу класу (приберіть зайве ключове слово):', 'class Dog {\n  function bark() { return "Гав!"; }\n}', ['class Dog { bark() { return "Гав!"; } }', 'class Dog {\n  bark() { return "Гав!"; }\n}'], true),
    new DragDropQuestion(13, 'easy', 'Встановіть відповідність між елементом синтаксису класу та його призначенням:', [
        { term: 'class', definition: 'Оголошення нового класу' },
        { term: 'constructor()', definition: 'Ініціалізація властивостей об’єкта' },
        { term: 'new', definition: 'Створення екземпляра класу' }
    ]),
    new RadioQuestion(14, 'easy', 'Що станеться, якщо не описати метод constructor() у класі явно?', ['JavaScript автоматично додасть порожній конструктор за замовчуванням', 'Виникне помилка SyntaxError', 'Екземпляр класу неможливо буде створити', 'Клас стане статичним'], 'JavaScript автоматично додасть порожній конструктор за замовчуванням'),
    new SelectQuestion(15, 'easy', 'Який результат поверне оператор typeof Person, якщо Person — це клас ES6+?', ['"function"', '"class"', '"object"', '"undefined"'], '"function"'),

    new RadioQuestion(16, 'medium', 'Яке ключове слово робить метод або властивість належними самому класу, а не його екземплярам?', ['static', 'public', 'const', 'global'], 'static'),
    new RadioQuestion(17, 'medium', 'Як правильно викликати статичний метод compare() класу Article?', ['Article.compare()', 'new Article().compare()', 'this.compare()', 'Article.prototype.compare()'], 'Article.compare()'),
    new RadioQuestion(18, 'medium', 'Яке ключове слово використовується у дочірньому класі для виклику конструктора або методів батьківського класу?', ['super', 'parent', 'base', 'this'], 'super'),
    new RadioQuestion(19, 'medium', 'Яке ключове слово дозволяє визначити геттер (властивість-аксесор для читання) у класі?', ['get', 'read', 'value', 'prop'], 'get'),
    new RadioQuestion(20, 'medium', 'Який оператор перевіряє, чи належить об’єкт до певного класу або його нащадків?', ['instanceof', 'typeof', 'isClass', 'in'], 'instanceof'),
    new CheckboxQuestion(21, 'medium', 'Оберіть правильні твердження про статичні методи (static) у класах ES6+:', ['Викликаються безпосередньо на імені класу', 'Недоступні через екземпляр класу (obj.staticMethod викличе помилку)', 'Мають прямий доступ до властивостей екземпляра через this.name', 'Не успадковуються дочірніми класами'], ['Викликаються безпосередньо на імені класу', 'Недоступні через екземпляр класу (obj.staticMethod викличе помилку)']),
    new CheckboxQuestion(22, 'medium', 'Що відбувається під час наслідування (class Child extends Parent)?', ['Child успадковує методи екземпляра Parent', 'Child успадковує статичні методи Parent', 'Конструктор Parent викликається автоматично після this у Child', 'Child може наслідувати одразу два класи через кому'], ['Child успадковує методи екземпляра Parent', 'Child успадковує статичні методи Parent']),
    new SelectQuestion(23, 'medium', 'Що таке перевизначення методу (Method Overriding) у підкласі?', ['Створення в підкласі методу з такою самою назвою, як у батьківському класі', 'Видалення методу з батьківського класу', 'Перетворення методу на статичний', 'Виклик методу без дужок'], 'Створення в підкласі методу з такою самою назвою, як у батьківському класі'),
    new SelectQuestion(24, 'medium', 'Скільки параметрів приймає сеттер (set prop(...)) у класі ES6+?', ['Рівно один параметр', 'Жодного параметра', 'Два параметри (старе і нове значення)', 'Довільну кількість параметрів'], 'Рівно один параметр'),
    new TextQuestion(25, 'medium', 'Написання коду (Code)', 'Напишіть заголовок оголошення класу Student, який наслідує клас Person:', null, ['class Student extends Person', 'class Student extends Person {}', 'class Student extends Person {']),
    new TextQuestion(26, 'medium', 'Заповнення пропусків (Fill-in-the-blank)', 'Заповніть пропуск для виклику батьківського конструктора з аргументом name:', 'class Admin extends User {\n  constructor(name, role) {\n    _____(name);\n    this.role = role;\n  }\n}', ['super']),
    new TextQuestion(27, 'medium', 'Виправлення помилки (Debugging)', 'Виправте помилку виклику статичного методу:', 'class MathHelper {\n  static square(n) { return n * n; }\n}\nconst res = new MathHelper().square(5);', ['const res = MathHelper.square(5);', 'const res = MathHelper.square(5)'], true),
    new DragDropQuestion(28, 'medium', 'Встановіть відповідність між ключовим словом класу та його дією:', [
        { term: 'extends', definition: 'Вказує батьківський клас для наслідування' },
        { term: 'super()', definition: 'Викликає конструктор батьківського класу' },
        { term: 'static', definition: 'Оголошує метод, прив’язаний до самого класу' }
    ]),
    new RadioQuestion(29, 'medium', 'Як у методі підкласу викликати однойменний метод батьківського класу?', ['super.methodName()', 'parent.methodName()', 'this.parent.methodName()', 'base.methodName()'], 'super.methodName()'),
    new SelectQuestion(30, 'medium', 'Чи піднімаються (hoisting) оголошення класів так само, як Function Declaration (чи можна створити екземпляр до рядка class)?', ['Ні, класи знаходяться у Temporal Dead Zone до моменту оголошення', 'Так, клас можна викликати на початку файлу до його оголошення', 'Так, але тільки якщо конструктор порожній', 'Тільки при використанні var'], 'Ні, класи знаходяться у Temporal Dead Zone до моменту оголошення'),

    new RadioQuestion(31, 'hard', 'Що станеться, якщо у конструкторі дочірнього класу звернутися до this ДО виклику super()?', ['Виникне помилка ReferenceError', 'this буде дорівнювати undefined', 'super() викличеться автоматично', 'Властивість запишеться у батьківський клас'], 'Виникне помилка ReferenceError'),
    new RadioQuestion(32, 'hard', 'Який символ використовується в ES2022+ для оголошення справді приватних полів і методів усередині класу?', ['# (решітка)', '_ (підкреслення)', '$ (долар)', '@ (равлик)'], '# (решітка)'),
    new RadioQuestion(33, 'hard', 'На чому побудовані класи ES6+ «під капотом» у рушії JavaScript?', ['На прототипному наслідуванні та функціях-конструкторах', 'На суворій типізації компілятора C++', 'На копіюванні об’єктів через Object.assign', 'На замиканнях без прототипів'], 'На прототипному наслідуванні та функціях-конструкторах'),
    new RadioQuestion(34, 'hard', 'Де зберігаються звичайні методи екземпляра, оголошені в тілі класу class User { sayHi() {} }?', ['У властивості User.prototype', 'Копіюються у кожен окремий екземпляр', 'У глобальному об’єкті Object.methods', 'У статичному полі User.methods'], 'У властивості User.prototype'),
    new RadioQuestion(35, 'hard', 'Чому в дочірньому класі class B extends A не можна використовувати this до super()?', ['Тому що в похідному класі саме конструктор батька через super() створює та ініціалізує об’єкт this', 'Тому що this у підкласах зарезервовано для статичних методів', 'Це обмеження діє лише для стрілкових методів', 'Тому що super() очищує пам’ять екземпляра'], 'Тому що в похідному класі саме конструктор батька через super() створює та ініціалізує об’єкт this'),
    new CheckboxQuestion(36, 'hard', 'Оберіть особливості приватних полів класу (наприклад, #balance):', ['Доступні лише всередині тіла того класу, де оголошені', 'Спроба звернутися до obj.#balance ззовні викликає SyntaxError', 'Не успадковуються напряму підкласами для прямого доступу через this.#balance', 'Автоматично серіалізуються методом JSON.stringify()'], ['Доступні лише всередині тіла того класу, де оголошені', 'Спроба звернутися до obj.#balance ззовні викликає SyntaxError', 'Не успадковуються напряму підкласами для прямого доступу через this.#balance']),
    new CheckboxQuestion(37, 'hard', 'Які твердження про Class Expression (вираз класу) є правильними?', ['Клас можна присвоїти змінній: const MyClass = class {}', 'Вираз класу може бути іменованим або анонімним', 'Вираз класу не може мати конструктора', 'Class Expression не підтримує extends'], ['Клас можна присвоїти змінній: const MyClass = class {}', 'Вираз класу може бути іменованим або анонімним']),
    new SelectQuestion(38, 'hard', 'На що вказує this усередині статичного методу класу (static info())?', ['На сам конструктор класу', 'На перший створений екземпляр', 'На undefined завжди', 'На батьківський прототип'], 'На сам конструктор класу'),
    new SelectQuestion(39, 'hard', 'Що поверне вираз student instanceof Person, якщо class Student extends Person і const student = new Student()?', ['true', 'false', '"Student"', 'TypeError'], 'true'),
    new TextQuestion(40, 'hard', 'Написання коду (Code)', 'Оголосіть у класі приватне поле password зі значенням "1234":', null, ['#password = "1234"', '#password = "1234";', "#password = '1234'", "#password = '1234';"]),
    new TextQuestion(41, 'hard', 'Заповнення пропусків (Fill-in-the-blank)', 'Заповніть пропуск, щоб геттер fullName повертав ім’я та прізвище:', 'class User {\n  _____ fullName() {\n    return `${this.first} ${this.last}`;\n  }\n}', ['get']),
    new TextQuestion(42, 'hard', 'Виправлення помилки (Debugging)', 'Виправте помилку в конструкторі підкласу (this використано до super):', 'class Dog extends Animal {\n  constructor(name, breed) {\n    this.breed = breed;\n    super(name);\n  }\n}', ['constructor(name, breed) { super(name); this.breed = breed; }', 'constructor(name, breed) {\n  super(name);\n  this.breed = breed;\n}'], true),
    new DragDropQuestion(43, 'hard', 'Встановіть відповідність між конструкцією ES6+ та її результатом:', [
        { term: '#secret', definition: 'Приватне поле, інкапсульоване всередині класу' },
        { term: 'get area()', definition: 'Обчислювана властивість, доступна без дужок ()' },
        { term: 'super.render()', definition: 'Виклик батьківської реалізації методу' }
    ]),
    new RadioQuestion(44, 'hard', 'Чи є методи класу ES6+ перелічуваними (enumerable) при обході об’єкта циклом for...in?', ['Ні, усі методи класу автоматично мають дескриптор enumerable: false', 'Так, усі методи виводяться у for...in', 'Перелічуваними є лише статичні методи', 'Перелічуваними є лише геттери'], 'Ні, усі методи класу автоматично мають дескриптор enumerable: false'),
    new SelectQuestion(45, 'hard', 'Як можна створити клас, який наслідує вбудований масив JavaScript?', ['class CustomArray extends Array {}', 'class CustomArray implements Array {}', 'class CustomArray super Array {}', 'Array.extend(CustomArray)'], 'class CustomArray extends Array {}')
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