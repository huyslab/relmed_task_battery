var jsPsychSelfReportItem = (function (jspsych) {
    "use strict";

    const info = {
        name: "self-report-item",
        version: "0.1.0",
        parameters: {
            /** Which kind of screen to render: 'message' (something to read) or 'likert' (one item) */
            question_type: {
                type: jspsych.ParameterType.STRING,
                default: "likert"
            },
            /** Which questionnaire this screen belongs to, e.g. 'PHQ9'. Recorded with the answer */
            questionnaire: {
                type: jspsych.ParameterType.STRING,
                default: ""
            },
            /** Line repeated above every item, carrying the timeframe the item is asked about */
            context: {
                type: jspsych.ParameterType.HTML_STRING,
                default: ""
            },
            /** The item itself, shown large in the middle of the card */
            prompt: {
                type: jspsych.ParameterType.HTML_STRING,
                default: undefined
            },
            /** Smaller supporting line shown under the prompt */
            hint: {
                type: jspsych.ParameterType.HTML_STRING,
                default: ""
            },
            /** Identifier the answer is stored under, e.g. 'PHQ9_Q01' */
            item_id: {
                type: jspsych.ParameterType.STRING,
                default: null
            },
            /** Position of this item in its questionnaire, used for the progress bar */
            item_index: {
                type: jspsych.ParameterType.INT,
                default: null
            },
            /** Number of items in this questionnaire, used for the progress bar */
            n_items: {
                type: jspsych.ParameterType.INT,
                default: null
            },
            /** 'infrequency', 'consistency' or null - recorded so data checks can find catch items */
            catch_type: {
                type: jspsych.ParameterType.STRING,
                default: null
            },
            /** Text shown above the progress bar, e.g. "Question 3 of 10" */
            progress_label: {
                type: jspsych.ParameterType.STRING,
                default: ""
            },
            /** Response options, each {label, value}. One button per option, one tap per answer */
            options: {
                type: jspsych.ParameterType.COMPLEX,
                array: true,
                default: [],
                nested: {
                    label: {
                        type: jspsych.ParameterType.STRING,
                        default: undefined
                    },
                    value: {
                        type: jspsych.ParameterType.INT,
                        default: undefined
                    }
                }
            },
            /** Label of the forward button on a 'message' screen */
            button_label: {
                type: jspsych.ParameterType.STRING,
                default: "Continue"
            },
            /** Duration of the slide in / slide out transitions, in ms */
            transition_duration: {
                type: jspsych.ParameterType.INT,
                default: 350
            },
            /** 'touch' for tap targets, 'keyboard' to also drive the options from the keyboard,
             *  or 'auto' to pick from the device */
            input_mode: {
                type: jspsych.ParameterType.STRING,
                default: "auto"
            }
        },
        data: {
            /** Which questionnaire this screen belonged to */
            questionnaire: {
                type: jspsych.ParameterType.STRING
            },
            /** Identifier of the item, e.g. 'PHQ9_Q01'. Null on a message screen */
            item_id: {
                type: jspsych.ParameterType.STRING
            },
            /** Position of the item in its questionnaire */
            item_index: {
                type: jspsych.ParameterType.INT
            },
            /** The item text as it was shown */
            item_text: {
                type: jspsych.ParameterType.STRING
            },
            /** Which catch item this was, if any */
            catch_type: {
                type: jspsych.ParameterType.STRING
            },
            /** The score of the option chosen. Null on a message screen */
            response: {
                type: jspsych.ParameterType.INT
            },
            /** The label of the option chosen, for quick inspection of the data */
            response_label: {
                type: jspsych.ParameterType.STRING
            },
            /** Which set of controls was shown, 'touch' or 'keyboard' */
            input_mode: {
                type: jspsych.ParameterType.STRING
            },
            /** Time from screen onset to the answer that ended the trial */
            rt: {
                type: jspsych.ParameterType.INT
            }
        }
    };

    /**
     * **self-report-item**
     *
     * jsPsych plugin presenting one self-report item per screen: the timeframe, the item, and
     * one large button per response option. A single tap answers and moves on - there is no
     * separate continue button on an item screen, and no way back to an answered item.
     *
     * Built for the same devices as the medication questionnaire
     * (tasks/medication-questionnaire/plugin-medication-question.js): finger-sized controls
     * that stack down the screen rather than the item x scale grid these questionnaires are
     * usually rendered as, which needs a wide screen and precise pointing. Where a keyboard
     * drives the run, the number keys pick an option outright and the arrow keys walk them.
     *
     * @author {Yaniv Abir}
     */
    class SelfReportItemPlugin {
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

            const screen = display_element.querySelector('.srq-screen');
            const body = display_element.querySelector('.srq-body');
            screen.style.setProperty('--srq-transition', duration + 'ms');
            screen.classList.add(keyboardMode ? 'srq-keyboard' : 'srq-touch');

            // Slide the screen in from the right on the frame after it is in the DOM
            requestAnimationFrame(() => screen.classList.add('srq-screen-in'));

            /**
             * Slides the screen out to the left, then hands the answer to jsPsych.
             * @param {Object} response - {response, response_label} for this screen
             */
            const endTrial = (response) => {
                document.removeEventListener('keydown', onKeyDown);

                const trial_data = {
                    questionnaire: trial.questionnaire,
                    item_id: trial.item_id,
                    item_index: trial.item_index,
                    item_text: trial.prompt,
                    catch_type: trial.catch_type,
                    response: response.response,
                    response_label: response.response_label,
                    input_mode: keyboardMode ? 'keyboard' : 'touch',
                    rt: Math.round(performance.now() - startTime)
                };

                screen.classList.remove('srq-screen-in');
                screen.classList.add('srq-screen-out');

                this.jsPsych.pluginAPI.setTimeout(
                    () => this.jsPsych.finishTrial(trial_data),
                    duration
                );
            };

            if (trial.question_type === 'message') {
                this.setupMessage(body, trial, endTrial);
            } else if (trial.question_type === 'likert') {
                this.setupLikert(body, trial, endTrial);
            } else {
                throw new Error(`Unknown question_type "${trial.question_type}" in self-report-item plugin.`);
            }

            const buttons = Array.from(body.querySelectorAll('.srq-btn'));

            // Enter activates whichever button has focus, which the browser already does, so
            // this only covers a screen nothing is focused on. Key repeat is ignored so a held
            // Enter cannot run past a screen.
            const onKeyDown = (event) => {
                if (!keyboardMode || event.repeat || event.defaultPrevented) return;

                const active = document.activeElement;
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
                } else if (event.key === 'Enter' && position === -1 && buttons.length === 1) {
                    // A message screen has one way forward; take it even if nothing is focused
                    event.preventDefault();
                    buttons[0].click();
                }
            };
            document.addEventListener('keydown', onKeyDown);

            // A message screen has one way forward, so put the caret on it. An item screen is
            // deliberately left with nothing focused: focusing the first option would ring
            // "Not at all" as if it were already chosen, and hand it to any stray Enter or
            // space. The arrow and number keys above reach the options without it.
            if (keyboardMode && trial.question_type === 'message' && buttons.length) {
                buttons[0].focus({ preventScroll: true });
            }
        }

        /**
         * Decides whether the keyboard also drives the options.
         * 'auto' reads the device: anything with no touch points at all, or with a mouse-like
         * pointer (a laptop with a touchscreen, say), gets the keyboard controls.
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
         * Builds the shared card: progress bar, the timeframe line, the item, and an empty
         * body the per-type setup functions fill in.
         */
        buildFrame(trial) {
            let progress = '';
            if (trial.progress_label || trial.item_index !== null) {
                // The bar measures items *answered*, not items reached, so it is empty on the
                // first item and nine tenths full on the tenth. Counting the item on screen
                // instead would show a full bar over an unanswered last item, which reads as
                // "done" while the participant still has one to answer. The exact position is
                // in the label beside it ("Question 10 of 10").
                const proportion = (trial.item_index !== null && trial.n_items)
                    ? (trial.item_index / trial.n_items) * 100
                    : null;
                const bar = proportion === null ? '' :
                    `<div class="srq-progress-track"><div class="srq-progress-fill" style="width: ${proportion}%"></div></div>`;
                const label = trial.progress_label
                    ? `<div class="srq-progress-label">${trial.progress_label}</div>` : '';
                progress = `<div class="srq-progress" aria-hidden="true">${label}${bar}</div>`;
            }

            const context = trial.context ? `<div class="srq-context">${trial.context}</div>` : '';
            const hint = trial.hint ? `<div class="srq-hint">${trial.hint}</div>` : '';

            return `<div class="srq-screen">
                ${progress}
                <div class="srq-card">
                    ${context}
                    <div class="srq-prompt">${trial.prompt}</div>
                    ${hint}
                    <div class="srq-body"></div>
                </div>
            </div>`;
        }

        /** Screen with no item, just something to read and a button to move on */
        setupMessage(body, trial, endTrial) {
            body.innerHTML =
                `<button type="button" class="srq-btn srq-btn-primary" id="srq-continue">${trial.button_label}</button>`;

            body.querySelector('#srq-continue').addEventListener('click', () => {
                endTrial({ response: null, response_label: null });
            });
        }

        /** One tap per answer: the options are the buttons, so there is nothing else to press */
        setupLikert(body, trial, endTrial) {
            body.innerHTML = `<div class="srq-options">${trial.options.map((option, i) =>
                `<button type="button" class="srq-btn srq-option" data-index="${i}">${option.label}</button>`
            ).join('')}</div>`;

            body.querySelectorAll('.srq-option').forEach(button => {
                button.addEventListener('click', () => {
                    const option = trial.options[parseInt(button.dataset.index)];
                    // Mark the tapped option while the screen slides away, so the answer that
                    // was registered is visible rather than the screen just vanishing
                    button.classList.add('srq-option-chosen');
                    endTrial({ response: option.value, response_label: option.label });
                });
            });
        }

        create_simulation_data(trial, simulation_options) {
            const option = trial.options.length
                ? this.jsPsych.randomization.sampleWithoutReplacement(trial.options, 1)[0]
                : null;

            const default_data = {
                questionnaire: trial.questionnaire,
                item_id: trial.item_id,
                item_index: trial.item_index,
                item_text: trial.prompt,
                catch_type: trial.catch_type,
                response: trial.question_type === 'message' || !option ? null : option.value,
                response_label: trial.question_type === 'message' || !option ? null : option.label,
                input_mode: this.usesKeyboard(trial) ? 'keyboard' : 'touch',
                rt: this.jsPsych.randomization.sampleExGaussian(2500, 600, 1 / 1000, true)
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
                if (trial.question_type === 'message') {
                    this.jsPsych.pluginAPI.clickTarget(display_element.querySelector('#srq-continue'));
                    return;
                }

                const chosen = trial.options.findIndex(option => option.value === data.response);
                const button = display_element.querySelector(`.srq-option[data-index="${Math.max(chosen, 0)}"]`);
                if (button) this.jsPsych.pluginAPI.clickTarget(button);
            }, data.rt);
        }
    }
    SelfReportItemPlugin.info = info;

    return SelfReportItemPlugin;
})(jsPsychModule);
