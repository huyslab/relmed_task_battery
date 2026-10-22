// A module is a collection of tasks to be completed in a single sitting.
// Each module can contain one or more tasks, and each task can have its own configuration settings.

// Elements can be restricted to specific sessions or contexts with optional
// `sessions: [...]` and `contexts: [...]` fields; they are skipped otherwise.
// `sessions` at the module level lists the sessions the module is designed for.

export const ModuleRegistry = {
    full_battery: {
        name: "Full RELEMD Task Battery",
        description: "All tasks in a single in-lab sitting, with breaks.",
        sessions: ["wk0", "wk2", "wk4", "wk24", "wk28"],
        fullscreen: true, // Run in fullscreen regardless of context
        moduleConfig: { // Settings that apply to all tasks in the module unless overridden
            session: "wk0",
            sequence: "wk0"
        }, 
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "reversal"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "task", name: "max_press_test" },
            { type: "task", name: "pavlovian_lottery" },
            { type: "task", name: "PILT" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PILT", game_description: "card choosing game" } },
            { type: "task", name: "vigour" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "vigour", game_description: "piggy-bank game" } },
            { type: "task", name: "PIT"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "PIT", game_description: "piggy-bank game in cloudy space" } },
            { type: "task", name: "vigour_test"},
            { type: "task", name: "post_PILT_test"},
            { type: "instructions", config: { text: "break_message" } },
            { type: "task", name: "control"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "control", game_description: "shipping game" } },
            { type: "instructions", config: { text: "break_message" } },
            { type: "task", name: "WM" },
            { type: "task", name: "post_WM_test"},
            { type: "task", name: "acceptability_judgment", config: { task_name: "wm", game_description: "one-card game you just completed" } },
            { type: "task", name: "open_text" },
            { type: "task", name: "delay_discounting" },
            { type: "bonus" },
            { type: "instructions", config: { text: "end_message" } },
        ],
        max_bonus: 5.0,
        min_prop_bonus: 0.6
    },
    screening: {
        name: "Screening Module",
        description: "RELMED trial 1 screening module (instruction video and questionnaires not included).",
        sessions: ["screening"],
        moduleConfig: { // Settings that apply to all tasks in the module unless overridden
            session: "screening",
            sequence: "screening"
        }, 
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "max_press_test" },
            { type: "task", name: "PILT", config: {present_pavlovian: false} },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PILT", game_description: "card choosing game" } },
            { type: "task", name: "control" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "control", game_description: "shipping game" } },
            { type: "instructions", config: { text: "another_game_message" } },
            { type: "task", name: "reversal", config: { n_trials: 50 } },
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "instructions", config: { text: "end_message" } }
        ]
    },
    // RELMED trial 1 home assessment modules (relmed_trial1 'task' URL parameter equivalents)
    pilt_to_test: {
        name: "PILT to Test Module",
        description: "RELMED trial 1 'pilt-to-test' module: max press, Pavlovian lottery, PILT, vigour, PIT, post-vigour test and PILT test.",
        sessions: ["wk0", "wk2", "wk4", "wk24", "wk28"],
        moduleConfig: {
            session: "wk0",
            sequence: "wk0"
        },
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "max_press_test" },
            { type: "task", name: "pavlovian_lottery" },
            { type: "task", name: "PILT" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PILT", game_description: "card choosing game" } },
            { type: "task", name: "vigour" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "vigour", game_description: "piggy-bank game" } },
            { type: "task", name: "PIT" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PIT", game_description: "piggy-bank game in cloudy space" } },
            { type: "task", name: "vigour_test" },
            { type: "task", name: "post_PILT_test" },
            { type: "bonus" },
            { type: "instructions", config: { text: "end_message" } }
        ],
        max_bonus: 2.45,
        min_prop_bonus: 0.6
    },
    wm: {
        name: "Working Memory Module",
        description: "RELMED trial 1 'wm' module: WM task and post-WM test, plus delay discounting and open text at wk24/wk28.",
        sessions: ["wk0", "wk2", "wk4", "wk24", "wk28"],
        moduleConfig: {
            session: "wk0",
            sequence: "wk0"
        },
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "WM" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "wm", game_description: "one-card game you just completed" } },
            { type: "task", name: "post_WM_test" },
            { type: "task", name: "delay_discounting", sessions: ["wk24", "wk28"] },
            { type: "task", name: "open_text", sessions: ["wk24", "wk28"] },
            { type: "bonus" },
            { type: "instructions", config: { text: "end_message" } }
        ],
        max_bonus: 0.8,
        min_prop_bonus: 0.6
    },
    reversal: {
        name: "Reversal Module",
        description: "RELMED trial 1 'reversal' module.",
        sessions: ["wk0", "wk2", "wk4", "wk24", "wk28"],
        moduleConfig: {
            session: "wk0",
            sequence: "wk0"
        },
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "reversal" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "bonus" },
            { type: "instructions", config: { text: "end_message" } }
        ],
        max_bonus: 0.5,
        min_prop_bonus: 0.6
    },
    control: {
        name: "Control Module",
        description: "RELMED trial 1 'control' module.",
        sessions: ["wk0", "wk2", "wk4", "wk24", "wk28"],
        moduleConfig: {
            session: "wk0",
            sequence: "wk0"
        },
        elements: [
            { type: "task", name: "control" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "control", game_description: "shipping game" } },
            { type: "bonus" },
            { type: "instructions", config: { text: "end_message" } }
        ],
        max_bonus: 1.25,
        min_prop_bonus: 0.6
    },
    quests: {
        name: "Questionnaires Module",
        description: "RELMED trial 1 'quests' module: delay discounting and open text at wk0/wk2/wk4 (questionnaires, mood and medication items not included).",
        sessions: ["wk0", "wk2", "wk4", "wk24", "wk28"],
        moduleConfig: {
            session: "wk0",
            sequence: "wk0"
        },
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "delay_discounting", sessions: ["wk0", "wk2", "wk4"] },
            { type: "task", name: "open_text", sessions: ["wk0", "wk2", "wk4"] },
            { type: "instructions", config: { text: "end_message" } }
        ]
    }
};

