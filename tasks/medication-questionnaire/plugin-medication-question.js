var jsPsychMedicationQuestion = (function (jspsych) {
    "use strict";

    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const info = {
        name: "medication-question",
        version: "0.1.0",
        parameters: {
            /** Which kind of screen to render: 'message', 'text', 'number', 'choice', 'date' or 'list' */
            question_type: {
                type: jspsych.ParameterType.STRING,
                default: "text"
            },
            /** The question itself, shown large at the top of the card */
            prompt: {
                type: jspsych.ParameterType.HTML_STRING,
                default: undefined
            },
            /** Smaller supporting line shown under the question */
            hint: {
                type: jspsych.ParameterType.HTML_STRING,
                default: ""
            },
            /** Field name the response is stored under */
            name: {
                type: jspsych.ParameterType.STRING,
                default: "response"
            },
            /** Placeholder for the text field ('text' and 'list' types) */
            placeholder: {
                type: jspsych.ParameterType.STRING,
                default: ""
            },
            /** Whether an answer is needed before the continue button becomes active */
            required: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
            /** Label of the escape button ('text' and 'number' types). Null hides it */
            unsure_label: {
                type: jspsych.ParameterType.STRING,
                default: null
            },
            /** Options for the 'choice' type. Each is {label, value, reveals}, where reveals:
             *  'number' swaps the screen for the keypad instead of finishing the trial */
            choices: {
                type: jspsych.ParameterType.COMPLEX,
                array: true,
                default: [],
                nested: {
                    label: {
                        type: jspsych.ParameterType.STRING,
                        default: undefined
                    },
                    value: {
                        type: jspsych.ParameterType.STRING | jspsych.ParameterType.INT | jspsych.ParameterType.FLOAT,
                        default: undefined
                    },
                    reveals: {
                        type: jspsych.ParameterType.STRING,
                        default: null
                    }
                }
            },
            /** Unit shown next to the keypad readout, e.g. 'mg' */
            unit: {
                type: jspsych.ParameterType.STRING,
                default: ""
            },
            /** Whether the keypad offers a decimal point */
            allow_decimal: {
                type: jspsych.ParameterType.BOOL,
                default: true
            },
            /** Prompt shown on the keypad screen when it is revealed by a choice option */
            keypad_prompt: {
                type: jspsych.ParameterType.HTML_STRING,
                default: ""
            },
            /** Labels for the 'list' type screens */
            list_labels: {
                type: jspsych.ParameterType.OBJECT,
                default: {
                    yes: "Yes",
                    no: "No",
                    add: "Add",
                    add_prompt: "Add each medicine, one at a time.",
                    empty: "Nothing added yet."
                }
            },
            /** Earliest year offered by the 'date' type */
            earliest_year: {
                type: jspsych.ParameterType.INT,
                default: 1970
            },
            /** Label of the main forward button */
            button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Continue"
            },
            /** Position of this question in the questionnaire, used for the progress dots */
            question_index: {
                type: jspsych.ParameterType.INT,
                default: null
            },
            /** Total number of questions, used for the progress dots */
            n_questions: {
                type: jspsych.ParameterType.INT,
                default: null
            },
            /** Duration of the slide in / slide out transitions, in ms */
            transition_duration: {
                type: jspsych.ParameterType.INT,
                default: 350
            },
            /** 'touch' for the on-screen keypad and tap targets, 'keyboard' for typed entry
             *  on a machine with a mouse and keyboard, or 'auto' to pick from the device */
            input_mode: {
                type: jspsych.ParameterType.STRING,
                default: "auto"
            }
        },
        data: {
            /** Field name the response is stored under */
            question_name: {
                type: jspsych.ParameterType.STRING
            },
            /** Which kind of screen was shown */
            question_type: {
                type: jspsych.ParameterType.STRING
            },
            /** The answer: string ('text'), number ('number', 'choice'), object ('date'), array ('list') */
            response: {
                type: jspsych.ParameterType.OBJECT
            },
            /** Human-readable version of the answer, for quick inspection of the data */
            response_label: {
                type: jspsych.ParameterType.STRING
            },
            /** Whether the participant tapped the "I'm not sure" escape button */
            unsure: {
                type: jspsych.ParameterType.BOOL
            },
            /** Which set of controls was shown, 'touch' or 'keyboard' */
            input_mode: {
                type: jspsych.ParameterType.STRING
            },
            /** Time from screen onset to the response that ended the trial */
            rt: {
                type: jspsych.ParameterType.INT
            }
        }
    };

    /**
     * **medication-question**
     *
     * jsPsych plugin presenting a single questionnaire screen: one question per screen, a
     * slide-in / slide-out transition between screens, and no way back to a previous screen -
     * each screen is its own trial and answers are committed when it slides away.
     *
     * The controls adapt to the device. On a touchscreen the screen offers large tap targets
     * and an on-screen keypad for numbers; on a machine with a mouse and keyboard, numbers are
     * typed into a field, every control is reachable by tab, Enter moves on, and the arrow keys
     * and number keys work the list of options.
     *
     * @author {Yaniv Abir}
     */
    class MedicationQuestionPlugin {
        constructor(jsPsych) {
            this.jsPsych = jsPsych;
        }

        trial(display_element, trial) {
            // Skip the transitions when running in simulation mode, so tests don't wait on them
            const simulating = window.simulating || false;
            const duration = simulating ? 0 : trial.transition_duration;

            const startTime = performance.now();
            const keyboardMode = this.usesKeyboard(trial);

            display_element.innerHTML = this.buildFrame(trial);

            const screen = display_element.querySelector('.medq-screen');
            const body = display_element.querySelector('.medq-body');
            const footer = display_element.querySelector('.medq-footer');
            screen.style.setProperty('--medq-transition', duration + 'ms');
            screen.classList.add(keyboardMode ? 'medq-keyboard' : 'medq-touch');

            // Slide the screen in from the right on the frame after it is in the DOM
            requestAnimationFrame(() => screen.classList.add('medq-screen-in'));

            /**
             * Slides the screen out to the left, then hands the answer to jsPsych.
             * @param {Object} response - {response, response_label, unsure} for this screen
             */
            const endTrial = (response) => {
                document.removeEventListener('keydown', onKeyDown);

                const trial_data = {
                    question_name: trial.name,
                    question_type: trial.question_type,
                    response: response.response,
                    response_label: response.response_label,
                    unsure: response.unsure || false,
                    input_mode: keyboardMode ? 'keyboard' : 'touch',
                    rt: Math.round(performance.now() - startTime)
                };

                screen.classList.remove('medq-screen-in');
                screen.classList.add('medq-screen-out');

                this.jsPsych.pluginAPI.setTimeout(
                    () => this.jsPsych.finishTrial(trial_data),
                    duration
                );
            };

            // Enter moves on from anywhere on the screen that doesn't already handle it.
            // Screens that act on Enter themselves (the text field, the add-a-medicine field)
            // call preventDefault, and buttons are activated by the browser, so neither
            // double-fires here. Key repeat is ignored so a held Enter cannot run past a screen.
            const onKeyDown = (event) => {
                if (event.key !== 'Enter' || event.repeat || event.defaultPrevented) return;
                if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;

                const continueButton = footer.querySelector('#medq-continue');
                if (continueButton && !continueButton.disabled) {
                    event.preventDefault();
                    continueButton.click();
                }
            };
            document.addEventListener('keydown', onKeyDown);

            // Each screen type wires up its own controls and calls endTrial when done
            switch (trial.question_type) {
                case 'message':
                    this.setupMessage(body, footer, trial, endTrial);
                    break;
                case 'text':
                    this.setupText(body, footer, trial, endTrial, keyboardMode);
                    break;
                case 'number':
                    this.setupNumber(body, footer, trial, endTrial, keyboardMode);
                    break;
                case 'choice':
                    this.setupChoice(body, footer, trial, endTrial, keyboardMode);
                    break;
                case 'date':
                    this.setupDate(body, footer, trial, endTrial);
                    break;
                case 'list':
                    this.setupList(body, footer, trial, endTrial, keyboardMode);
                    break;
                default:
                    throw new Error(`Unknown question_type "${trial.question_type}" in medication-question plugin.`);
            }

            // Put the caret where the answer goes, so a keyboard user can start typing or
            // tabbing straight away. Left alone on touchscreens, where focusing a text field
            // would throw the on-screen keyboard over the question before it has been read.
            if (keyboardMode) {
                const first = screen.querySelector('.medq-body input, .medq-body select, .medq-body button')
                    || footer.querySelector('#medq-continue');
                if (first) first.focus({ preventScroll: true });
            }
        }

        /**
         * Decides whether to show the typed controls or the touch controls.
         * 'auto' reads the device: anything with no touch points at all, or with a mouse-like
         * pointer (a laptop with a touchscreen, say), gets the typed controls.
         */
        usesKeyboard(trial) {
            if (trial.input_mode === 'keyboard') return true;
            if (trial.input_mode === 'touch') return false;

            const touchCapable = navigator.maxTouchPoints > 0;
            const finePointer = window.matchMedia
                && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
            return !touchCapable || finePointer;
        }

        /**
         * Builds the shared card: progress dots, question, hint, and empty body/footer slots
         * that the per-type setup functions fill in.
         */
        buildFrame(trial) {
            let progress = '';
            if (trial.question_index !== null && trial.n_questions !== null) {
                const dots = Array.from({ length: trial.n_questions }, (_, i) => {
                    const state = i < trial.question_index ? ' medq-dot-done'
                        : (i === trial.question_index ? ' medq-dot-current' : '');
                    return `<span class="medq-dot${state}"></span>`;
                }).join('');
                progress = `<div class="medq-progress" aria-hidden="true">${dots}</div>`;
            }

            const hint = trial.hint ? `<div class="medq-hint">${trial.hint}</div>` : '';

            return `<div class="medq-screen">
                ${progress}
                <div class="medq-card">
                    <div class="medq-prompt">${trial.prompt}</div>
                    ${hint}
                    <div class="medq-body"></div>
                    <div class="medq-footer"></div>
                </div>
            </div>`;
        }

        /** Creates the large forward button, disabled until the screen has a usable answer */
        addContinueButton(footer, trial, enabled, onClick) {
            footer.insertAdjacentHTML('beforeend',
                `<button type="button" class="medq-btn medq-btn-primary" id="medq-continue"${enabled ? '' : ' disabled'}>${trial.button_label}</button>`);
            const button = footer.querySelector('#medq-continue');
            button.addEventListener('click', onClick);
            return button;
        }

        /** Creates the quieter "I'm not sure" escape button, when the question allows one */
        addUnsureButton(footer, trial, onClick) {
            if (!trial.unsure_label) return null;
            footer.insertAdjacentHTML('beforeend',
                `<button type="button" class="medq-btn medq-btn-quiet" id="medq-unsure">${trial.unsure_label}</button>`);
            const button = footer.querySelector('#medq-unsure');
            button.addEventListener('click', onClick);
            return button;
        }

        /** Screen with no question, just something to read and a button to move on */
        setupMessage(body, footer, trial, endTrial) {
            this.addContinueButton(footer, trial, true, () => {
                endTrial({ response: null, response_label: null });
            });
        }

        /** Free text answer, typed on whichever keyboard the device has */
        setupText(body, footer, trial, endTrial, keyboardMode) {
            body.innerHTML = `<input type="text" class="medq-input" id="medq-text"
                placeholder="${trial.placeholder}" autocomplete="off" autocapitalize="words"
                autocorrect="off" spellcheck="false" enterkeyhint="done">`;

            const input = body.querySelector('#medq-text');

            const answer = () => input.value.trim();
            const submit = () => {
                if (trial.required && answer() === '') return;
                endTrial({ response: answer() || null, response_label: answer() || null });
            };

            const continueButton = this.addContinueButton(footer, trial, !trial.required, submit);
            this.addUnsureButton(footer, trial, () => {
                endTrial({ response: null, response_label: trial.unsure_label, unsure: true });
            });

            input.addEventListener('input', () => {
                continueButton.disabled = trial.required && answer() === '';
            });

            // A phone's on-screen keyboard covers the lower half of the screen, so bring the
            // field back into view once it has opened. Not needed with a real keyboard.
            if (!keyboardMode) {
                input.addEventListener('focus', () => {
                    setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
                });
            }

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    input.blur();
                    submit();
                }
            });
        }

        /**
         * Number answer. On a touchscreen this is a large on-screen keypad, which keeps the
         * question visible; with a real keyboard it is a field to type into.
         */
        setupNumber(body, footer, trial, endTrial, keyboardMode) {
            let digits = '';

            const submit = () => {
                // "50." is a valid state to be in mid-entry, but not to record
                const entered = digits.replace(/\.$/, '');
                if (trial.required && entered === '') return;
                const value = entered === '' ? null : parseFloat(entered);
                endTrial({
                    response: value,
                    response_label: value === null ? null : `${entered}${trial.unit ? ' ' + trial.unit : ''}`
                });
            };

            const keypadPrompt = trial.keypad_prompt ? `<div class="medq-hint">${trial.keypad_prompt}</div>` : '';
            const unit = trial.unit ? `<span class="medq-number-unit">${trial.unit}</span>` : '';

            if (keyboardMode) {
                body.innerHTML = `${keypadPrompt}
                    <div class="medq-number-field">
                        <input type="text" class="medq-input" id="medq-number"
                            inputmode="decimal" placeholder="${trial.placeholder}"
                            autocomplete="off" spellcheck="false" enterkeyhint="done">${unit}
                    </div>`;
            } else {
                this.renderKeypad(body, trial, keypadPrompt);
            }

            const continueButton = this.addContinueButton(footer, trial, !trial.required, submit);
            this.addUnsureButton(footer, trial, () => {
                endTrial({ response: null, response_label: trial.unsure_label, unsure: true });
            });

            if (keyboardMode) {
                const input = body.querySelector('#medq-number');

                input.addEventListener('input', () => {
                    digits = this.cleanNumber(input.value, trial.allow_decimal);
                    // Rewriting the field drops anything typed that isn't part of a number
                    if (input.value !== digits) input.value = digits;
                    continueButton.disabled = trial.required && digits === '';
                });

                input.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        submit();
                    }
                });

                return;
            }

            const readout = body.querySelector('#medq-keypad-value');
            const render = () => {
                readout.textContent = digits === '' ? '–' : digits;
                readout.classList.toggle('medq-keypad-empty', digits === '');
                continueButton.disabled = trial.required && digits === '';
            };

            body.querySelectorAll('.medq-key').forEach(key => {
                key.addEventListener('click', () => {
                    const value = key.dataset.key;
                    if (value === 'del') {
                        digits = digits.slice(0, -1);
                    } else if (value === '.') {
                        // Only one decimal point, and never as the first character
                        if (digits !== '' && !digits.includes('.')) digits += '.';
                    } else if (digits.replace('.', '').length < 6) {
                        // Drop a leading zero so "0" then "5" reads as 5, not 05
                        digits = digits === '0' ? value : digits + value;
                    }
                    render();
                });
            });

            render();
        }

        /** Keeps only what can be part of a number: digits, and at most one decimal point */
        cleanNumber(value, allowDecimal) {
            let cleaned = value.replace(/[^0-9.]/g, '');

            if (!allowDecimal) return cleaned.replace(/\./g, '');

            const firstDot = cleaned.indexOf('.');
            if (firstDot !== -1) {
                cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
            }
            return cleaned;
        }

        /** Draws the keypad markup into a body element */
        renderKeypad(body, trial, keypadPrompt) {
            const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
            keys.push(trial.allow_decimal ? '.' : '');
            keys.push('0');

            const keyButtons = keys.map(key => key === ''
                ? `<span class="medq-key medq-key-blank" aria-hidden="true"></span>`
                : `<button type="button" class="medq-key" data-key="${key}">${key}</button>`
            ).join('');

            const unit = trial.unit ? `<span class="medq-keypad-unit">${trial.unit}</span>` : '';

            body.innerHTML = `${keypadPrompt}
                <div class="medq-keypad-readout">
                    <span id="medq-keypad-value" class="medq-keypad-empty">–</span>${unit}
                </div>
                <div class="medq-keypad">
                    ${keyButtons}
                    <button type="button" class="medq-key medq-key-del" data-key="del" aria-label="Delete">⌫</button>
                </div>`;
        }

        /** One tap or click per answer: the options are the buttons, so there is nothing else to press */
        setupChoice(body, footer, trial, endTrial, keyboardMode) {
            body.innerHTML = `<div class="medq-choices">${trial.choices.map((choice, i) =>
                `<button type="button" class="medq-btn medq-choice" data-index="${i}">${choice.label}</button>`
            ).join('')}</div>`;

            const buttons = Array.from(body.querySelectorAll('.medq-choice'));

            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    const choice = trial.choices[parseInt(button.dataset.index)];

                    // An option such as "5 or more" hands over to the keypad on this same
                    // screen, rather than ending the trial
                    if (choice.reveals === 'number') {
                        footer.innerHTML = '';
                        this.setupNumber(
                            body, footer,
                            { ...trial, required: true, unit: '', allow_decimal: false },
                            endTrial, keyboardMode
                        );
                        if (keyboardMode) {
                            const field = body.querySelector('#medq-number');
                            if (field) field.focus({ preventScroll: true });
                        }
                        return;
                    }

                    endTrial({ response: choice.value, response_label: choice.label });
                });
            });

            if (keyboardMode) this.wireChoiceKeys(body, buttons);
        }

        /**
         * Arrow keys walk a list of option buttons and the number keys pick one outright.
         * Listens on the body rather than each button, and stands down once the options have
         * been replaced - the pills question swaps them for a keypad, and the digits typed
         * there must not reach the options that are no longer on screen.
         */
        wireChoiceKeys(body, buttons) {
            body.addEventListener('keydown', (event) => {
                if (!body.contains(buttons[0])) return;

                const active = document.activeElement;
                if (active && ['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName)) return;

                const position = buttons.indexOf(active);

                if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    buttons[(position + 1) % buttons.length].focus();
                } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    buttons[Math.max(position, 0) === 0 ? buttons.length - 1 : position - 1].focus();
                } else if (/^[1-9]$/.test(event.key) && buttons[Number(event.key) - 1]) {
                    event.preventDefault();
                    buttons[Number(event.key) - 1].click();
                }
            });
        }

        /** Day, month and year, each optional - a year on its own is a valid answer */
        setupDate(body, footer, trial, endTrial) {
            const thisYear = new Date().getFullYear();

            const options = (items) => items.map(item =>
                `<option value="${item.value}">${item.label}</option>`).join('');

            const days = [{ value: '', label: '–' }].concat(
                Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })));
            const months = [{ value: '', label: '–' }].concat(
                MONTHS.map((month, i) => ({ value: String(i + 1), label: month })));
            const years = [{ value: '', label: '–' }].concat(
                Array.from({ length: thisYear - trial.earliest_year + 1 },
                    (_, i) => ({ value: String(thisYear - i), label: String(thisYear - i) })));

            body.innerHTML = `<div class="medq-date">
                <label class="medq-date-field">
                    <span class="medq-date-label">Day</span>
                    <select class="medq-select" id="medq-day">${options(days)}</select>
                </label>
                <label class="medq-date-field">
                    <span class="medq-date-label">Month</span>
                    <select class="medq-select" id="medq-month">${options(months)}</select>
                </label>
                <label class="medq-date-field">
                    <span class="medq-date-label">Year</span>
                    <select class="medq-select" id="medq-year">${options(years)}</select>
                </label>
            </div>`;

            const day = body.querySelector('#medq-day');
            const month = body.querySelector('#medq-month');
            const year = body.querySelector('#medq-year');

            this.addContinueButton(footer, trial, true, () => {
                const parts = {
                    day: day.value === '' ? null : parseInt(day.value),
                    month: month.value === '' ? null : parseInt(month.value),
                    year: year.value === '' ? null : parseInt(year.value)
                };

                // Readable version, dropping whichever parts were left blank
                const label = [
                    parts.day === null ? null : String(parts.day),
                    parts.month === null ? null : MONTHS[parts.month - 1],
                    parts.year === null ? null : String(parts.year)
                ].filter(part => part !== null).join(' ');

                endTrial({ response: parts, response_label: label || null });
            });
        }

        /** A yes/no gate, then a chip list built one item at a time */
        setupList(body, footer, trial, endTrial, keyboardMode) {
            const labels = trial.list_labels;

            body.innerHTML = `<div class="medq-choices">
                <button type="button" class="medq-btn medq-choice" id="medq-list-yes">${labels.yes}</button>
                <button type="button" class="medq-btn medq-choice" id="medq-list-no">${labels.no}</button>
            </div>`;

            body.querySelector('#medq-list-no').addEventListener('click', () => {
                endTrial({ response: [], response_label: labels.no });
            });

            body.querySelector('#medq-list-yes').addEventListener('click', () => {
                this.setupListEditor(body, footer, trial, endTrial, keyboardMode);
            });

            if (keyboardMode) {
                this.wireChoiceKeys(body, Array.from(body.querySelectorAll('.medq-choice')));
            }
        }

        /** The second half of the 'list' screen: text field, add button, and the chips */
        setupListEditor(body, footer, trial, endTrial, keyboardMode) {
            const labels = trial.list_labels;
            const items = [];

            body.innerHTML = `<div class="medq-hint">${labels.add_prompt}</div>
                <div class="medq-add-row">
                    <input type="text" class="medq-input" id="medq-list-input"
                        placeholder="${trial.placeholder}" autocomplete="off" autocapitalize="words"
                        autocorrect="off" spellcheck="false" enterkeyhint="done">
                    <button type="button" class="medq-btn medq-btn-add" id="medq-list-add" disabled>${labels.add}</button>
                </div>
                <ul class="medq-chips" id="medq-chips"><li class="medq-chips-empty">${labels.empty}</li></ul>`;

            const input = body.querySelector('#medq-list-input');
            const addButton = body.querySelector('#medq-list-add');
            const chips = body.querySelector('#medq-chips');

            footer.innerHTML = '';
            const continueButton = this.addContinueButton(footer, trial, !trial.required, () => {
                if (trial.required && items.length === 0) return;
                endTrial({
                    response: items.slice(),
                    // Distinguishes an empty list reached through "yes" from an outright "no"
                    response_label: items.join(', ') || `${labels.yes}, but none listed`
                });
            });

            const renderChips = () => {
                chips.replaceChildren();

                if (items.length === 0) {
                    const empty = document.createElement('li');
                    empty.className = 'medq-chips-empty';
                    empty.textContent = labels.empty;
                    chips.appendChild(empty);
                } else {
                    items.forEach((item, i) => {
                        const li = document.createElement('li');
                        li.className = 'medq-chip';
                        li.textContent = item;

                        const remove = document.createElement('button');
                        remove.type = 'button';
                        remove.className = 'medq-chip-remove';
                        remove.dataset.index = String(i);
                        remove.setAttribute('aria-label', `Remove ${item}`);
                        remove.textContent = '×';
                        remove.addEventListener('click', () => {
                            items.splice(i, 1);
                            renderChips();
                        });

                        li.appendChild(remove);
                        chips.appendChild(li);
                    });
                }

                continueButton.disabled = trial.required && items.length === 0;
            };

            const addItem = () => {
                const value = input.value.trim();
                if (value === '') return;
                items.push(value);
                input.value = '';
                addButton.disabled = true;
                renderChips();
                input.focus();
            };

            addButton.addEventListener('click', addItem);
            input.addEventListener('input', () => { addButton.disabled = input.value.trim() === ''; });
            if (!keyboardMode) {
                input.addEventListener('focus', () => {
                    setTimeout(() => input.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
                });
            }
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addItem();
                }
            });

            renderChips();

            // Straight from "yes" into typing the first medicine
            if (keyboardMode) input.focus({ preventScroll: true });
        }

        create_simulation_data(trial, simulation_options) {
            // A plausible answer per screen type, so a simulated run produces usable data
            const responses = {
                message: { response: null, response_label: null },
                text: { response: 'Sertraline', response_label: 'Sertraline' },
                number: { response: 50, response_label: `50${trial.unit ? ' ' + trial.unit : ''}` },
                choice: {
                    response: trial.choices.length ? trial.choices[0].value : null,
                    response_label: trial.choices.length ? trial.choices[0].label : null
                },
                date: {
                    response: { day: null, month: 3, year: new Date().getFullYear() - 1 },
                    response_label: `March ${new Date().getFullYear() - 1}`
                },
                list: { response: [], response_label: trial.list_labels.no }
            };

            const default_data = {
                question_name: trial.name,
                question_type: trial.question_type,
                unsure: false,
                input_mode: this.usesKeyboard(trial) ? 'keyboard' : 'touch',
                rt: this.jsPsych.randomization.sampleExGaussian(2000, 400, 1 / 800, true),
                ...responses[trial.question_type]
            };

            const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
            this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
            return data;
        }

        simulate(trial, simulation_mode, simulation_options, load_callback) {
            if (simulation_mode == 'data-only') {
                load_callback();
                this.simulate_data_only(trial, simulation_options);
            }
            if (simulation_mode == 'visual') {
                this.simulate_visual(trial, simulation_options, load_callback);
            }
        }

        simulate_data_only(trial, simulation_options) {
            const data = this.create_simulation_data(trial, simulation_options);
            this.jsPsych.finishTrial(data);
        }

        simulate_visual(trial, simulation_options, load_callback) {
            const data = this.create_simulation_data(trial, simulation_options);
            const display_element = this.jsPsych.getDisplayElement();

            this.trial(display_element, trial);
            load_callback();

            // Drive the real controls, so simulated runs exercise the same code paths
            this.jsPsych.pluginAPI.setTimeout(() => {
                const click = (selector) => {
                    const element = display_element.querySelector(selector);
                    if (element) this.jsPsych.pluginAPI.clickTarget(element);
                };

                if (trial.question_type === 'text') {
                    const input = display_element.querySelector('#medq-text');
                    input.value = data.response === null ? '' : data.response;
                    input.dispatchEvent(new Event('input'));
                } else if (trial.question_type === 'number') {
                    // Whichever number control this device was given
                    const field = display_element.querySelector('#medq-number');
                    if (field) {
                        field.value = data.response === null ? '' : String(data.response);
                        field.dispatchEvent(new Event('input'));
                    } else {
                        String(data.response === null ? '' : data.response).split('')
                            .forEach(digit => click(`.medq-key[data-key="${digit}"]`));
                    }
                } else if (trial.question_type === 'choice') {
                    click('.medq-choice');
                    return;
                } else if (trial.question_type === 'date') {
                    const month = display_element.querySelector('#medq-month');
                    const year = display_element.querySelector('#medq-year');
                    if (data.response) {
                        month.value = data.response.month === null ? '' : String(data.response.month);
                        year.value = data.response.year === null ? '' : String(data.response.year);
                    }
                } else if (trial.question_type === 'list') {
                    click('#medq-list-no');
                    return;
                }

                click('#medq-continue');
            }, data.rt);
        }
    }
    MedicationQuestionPlugin.info = info;

    return MedicationQuestionPlugin;
})(jsPsychModule);
