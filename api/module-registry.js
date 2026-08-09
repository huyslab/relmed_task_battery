// A module is a collection of tasks to be completed in a single sitting.
// Each module can contain one or more tasks, and each task can have its own configuration settings.
//
// A module does not declare a session. The session comes from the launch URL, is resolved
// once against the session registry (api/session-registry.js), and is applied to every task
// in the module - so the same module definition serves every session the study runs.

export const ModuleRegistry = {
    full_battery: {
        name: "Full RELEMD Task Battery",
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
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "max_press_test" },
            { type: "task", name: "PILT", config: {present_pavlovian: false} },
            { type: "task", name: "acceptability_judgment", config: { task_name: "PILT", game_description: "card choosing game" } },
            { type: "task", name: "control" },
            { type: "task", name: "acceptability_judgment", config: { task_name: "control", game_description: "shipping game" } },
            { type: "task", name: "reversal", config: { n_trials: 50 } },
            { type: "task", name: "acceptability_judgment", config: { task_name: "reversal", game_description: "squirrel game" } },
            { type: "instructions", config: { text: "end_message" } }
        ]
    }
};

