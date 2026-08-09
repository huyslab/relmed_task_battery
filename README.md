# RELMED Task Battery

## Overview
This repository aims to provide easy to customize code for the RELMED task battery. This system provides a standardized interface for creating and combining experimental timelines, making it easy to build complete experiments from individual task components. The framework is built on top of jsPsych and follows a modular architecture that promotes code reusability and consistency across different experimental paradigms.

## Available Tasks

The battery currently includes the following experimental tasks:

### Learning & Decision Making Tasks Based on Card Choosing
- **PILT** - Probabilistic Instrumental Learning Task: A card-choosing task measuring probabilistic learning with 2-choice decisions
- **WM** - Working Memory Task: Anne Collins's RLWM task with 3-choice decisions and reward-only feedback
- **Post Learning Test** - Extinction test phase for evaluating learning performance after card-choosing tasks
- **Pavlovian Lottery** - Conditioning task creating associations between visual cues and monetary rewards

### Reward & Motivation Tasks Based on Repeated Key Pressing
- **Max Press Test** - Tests maximum key press speed for calibrating effort-based tasks
- **Vigour Task** - Measures instrumental action vigour as a function of reward rate
- **PIT** - Pavlovian-Instrumental Transfer Task: Measures action vigour in extinction with Pavlovian cues

### Control & Exploration Tasks
- **Control Task** - Measures control-seeking, information-seeking, and reward-seeking behavior

### Miscellaneous Tasks
- **Delay Discounting** - Measures preferences for smaller-sooner vs larger-later monetary rewards
- **Open Text** - Collects open-ended text responses with customizable time limits and validation

## Repository Structure

```
relmed_task_battery/
├── README
├── api/                          # Task registry and unified interface
│   ├── index.js                 # Main API entry point
│   ├── task-registry.js         # Task definitions and configuration
│   ├── module-registry.js       # Module definitions for multi-task experiments
│   ├── messages.js              # Instruction messages for modules
│   └── utils.js                 # Core API utility functions
├── tasks/                       # Individual task implementations
│   ├── card-choosing/           # PILT and WM tasks
│   ├── control/                 # Control task
│   ├── delay-discounting/       # Delay discounting task
│   ├── max-press-test/          # Max press speed test
│   ├── open-text/               # Open text questions
│   ├── pavlovian-lottery/       # Pavlovian conditioning
│   ├── piggy-banks/             # Vigour and PIT tasks
│   └── reversal/                # Reversal learning task
├── core/                        # Shared utilities and jsPsych
│   ├── utils/                   # Common utility functions
│   └── jspsych/                 # jsPsych library and plugins
├── assets/                      # Static resources
│   ├── images/                  # Task images and stimuli
│   └── sequences/               # Experimental sequences/parameters
└── examples/                    # Working example HTML files
```

## How to Build an Experiment

### Creating Experiments is Simple

**If you don't need to modify task behavior**, creating an experiment is straightforward - you just need to write an HTML file that loads the required dependencies and calls the API functions. The framework handles all the task logic, timing, and data collection automatically.

**You have two main approaches:**
1. **Individual Tasks**: Build experiments by combining individual tasks using `createTaskTimeline()`
2. **Modules**: Use collections of tasks using `createModuleTimeline()` 

### Approach 1: Individual Tasks

This approach gives you maximum flexibility to customize which tasks to include and their order.

#### Steps to Create an HTML Experiment File

1. **Set up HTML structure**: Create a basic HTML page with a display element for jsPsych

2. **Load dependencies in the `<head>`**:
   - jsPsych core library (`jspsych.js`)
   - Required jsPsych plugins (varies by task)
   - Task-specific plugin files (check task requirements)
   - Core utilities as ES6 modules
   - CSS files (jsPsych core + task-specific styles)

3. **Initialize jsPsych** with display settings and completion handlers

4. **Create experiment logic**:
   - Import API functions (`createTaskTimeline`, `getTaskInfo`, etc.)
   - Use `createTaskTimeline()` to generate task timelines with optional configuration
   - Combine multiple tasks by concatenating their timelines
   - Add experiment entry/exit (fullscreen, etc.)

5. **Run the experiment** using `jsPsych.run()`

#### Single vs Multiple Tasks

- **Single Task**: Call `createTaskTimeline()` once with your desired configuration
- **Multiple Tasks**: Call `createTaskTimeline()` for each task and combine the resulting arrays into one timeline
- **Task Order**: Simply arrange the timeline arrays in the order you want tasks to appear

### Approach 2: Predefined Modules

Modules are predefined collections of tasks designed to be completed in a single session. They include task sequencing, instruction messages, and standardized configurations.

#### Available Modules

- **`full_battery`**: Complete RELMED task battery with all tasks and questionnaires
- **`screening`**: Shortened version for participant screening with key tasks

#### Using Modules

```javascript
// Import module functions
import { createModuleTimeline, getModuleInfo, listModules } from '/api/index.js';

// Get information about available modules
console.log(listModules()); // ['full_battery', 'screening']
console.log(getModuleInfo('screening')); // Detailed module information

// Create timeline for a module
const timeline = await createModuleTimeline('screening', {
    session: 'screening',
    sequence: 'screening'
});

// Run the experiment
await jsPsych.run([enterExperiment, ...timeline, exitFullscreen]);
```

#### Module Configuration

Modules support three levels of configuration (in order of precedence):
1. **Module-level config**: Applied to all tasks in the module
2. **Element-level config**: Applied to specific tasks within the module 
3. **Runtime config**: Passed to `createModuleTimeline()`, overrides all others

```javascript
// Module definition example (from module-registry.js)
{
    name: "Screening Module",
    moduleConfig: {           // Applied to all tasks
        max_instruction_fails: 5
    },
    elements: [
        { type: "task", name: "PILT", config: { present_pavlovian: false } }, // Task-specific config
        { type: "instructions", config: { text: "start_message" } }
    ]
}

// Runtime configuration overrides everything
const timeline = await createModuleTimeline('screening', {
    session: 'wk2'  // Applied to every task in the module
});
```

Note that `session` is not something a module declares. `experiment.html` resolves it from the
launch URL and passes it as runtime config, so one module definition serves every session the
study runs - see [Sessions](#sessions) below.

#### Creating Custom Modules

You can define your own modules in `api/module-registry.js`:

```javascript
export const ModuleRegistry = {
    my_custom_module: {
        name: "My Custom Module",
        moduleConfig: {
            session: "custom",
            sequence: "wk0"
        },
        elements: [
            { type: "instructions", config: { text: "start_message" } },
            { type: "task", name: "PILT" },
            { type: "task", name: "control", config: { max_instruction_fails: 5 } },
            { type: "task", name: "open_text" },
            { type: "instructions", config: { text: "end_message" } }
        ]
    }
};
```

### Required Files and Dependencies

**For every experiment, you must include:**

1. **jsPsych core files**: Always load `jspsych.js` and required plugins
2. **Core utilities**: Load `/core/utils/index.js` as a module
3. **Task-specific files**: Check each task's requirements in the task registry
4. **CSS files**: Include `jspsych.css` and task-specific stylesheets

**Task-specific requirements** (check `api/task-registry.js` for complete details):
- **PILT/WM**: Requires `plugin-card-choosing.js` and `styles.css`
- **Control**: Requires multiple control plugins and `styles.css`
- **Vigour/PIT**: Requires piggy-banks plugins and `styles.css`
- **Delay Discounting**: Requires only core plugins and `styles.css`

### Task Configuration

Each task accepts a configuration object to customize behavior. If you don't need to change anything, you can use the default settings by passing an empty object `{}` or omitting the configuration entirely.

**Example configurations for different tasks:**

```javascript
// PILT with custom settings
const piltConfig = {
    task_name: "pilt",
    n_choices: 2,
    valence: "mixed",           // "mixed", "reward", "punishment", "both"
    present_pavlovian: true,
    sequence: 'wk0',
    include_instructions: true
};

// Control task with custom timing
const controlConfig = {
    session: "wk0",
    max_instruction_fails: 3,
    default_response_deadline: 4000,
    long_response_deadline: 6000
};

// Delay discounting with default settings (just pass empty object)
const ddConfig = {};
```

### Getting Task Information

Use `getTaskInfo()` to explore available configuration options:

```javascript
const taskInfo = getTaskInfo('PILT');
console.log(taskInfo.configOptions);  // Shows all available config options
console.log(taskInfo.defaultConfig);  // Shows default values
```

## API Reference

### Core Functions

#### Individual Tasks
- `createTaskTimeline(taskName, config)` - Creates a timeline for the specified task
- `getTaskInfo(taskName)` - Returns task information including configuration options
- `listTasks()` - Returns array of all available task names
- `getTask(taskName)` - Returns the complete task object from registry

#### Modules (Multi-Task Collections)
- `createModuleTimeline(moduleName, config)` - Creates a timeline for an entire module
- `getModuleInfo(moduleName)` - Returns module information including task sequence
- `listModules()` - Returns array of all available module names
- `getModule(moduleName)` - Returns the complete module object from registry

#### Messages and Instructions
- `getMessage(moduleName, messageKey, settings)` - Retrieves instruction messages for modules

### Utility Functions

- `enterExperiment` - Standard fullscreen entry point for experiments
- Various bonus calculation, data handling, and resumption utilities in `/core/utils/`

### Task Names

Use these exact strings when calling `createTaskTimeline()`:
- `'PILT'`, `'WM'`, `'post_learning_test'`, `'post_PILT_test'`, `'post_WM_test'`
- `'delay_discounting'`, `'vigour'`, `'vigour_test'`, `'PIT'` 
- `'control'`, `'max_press_test'`, `'pavlovian_lottery'`, `'open_text'`
- `'reversal'`, `'acceptability_judgment'`

### Module Names

Use these exact strings when calling `createModuleTimeline()`:
- `'full_battery'` - Complete RELMED task battery 
- `'screening'` - Shortened screening version

### Launching a Session

`experiment.html` is the entry point a hosting website loads, and it runs either a module or a
single task:

| Parameter | Description |
| --- | --- |
| `module` | Name of a module to run, e.g. `module=full_battery`. Takes precedence: when both are given, `task` is ignored |
| `task` | Name of a single task to run, e.g. `task=reversal`. The task's bonus is revealed at the end |
| `participant_id` | Participant identifier. Containing `simulate` runs jsPsych's simulate mode, `debug` or `TST` relaxes the termination guard |
| `context` | `relmed` or `prolific` - governs where data is submitted |
| `session` | Session label from the hosting site, e.g. `Session 1` or `Week 0`. Required, and must resolve against the session registry - see [Sessions](#sessions) |

`index.html` provides a form that builds these URLs for local runs.

## Sessions

A session is what the study is running today: which trial sequences load, which stimulus set
is shown, which variant of the rules and instructions participants get, and how resumption is
signalled back to the hosting site. All of that comes from one place,
[`api/session-registry.js`](api/session-registry.js).

The hosting site sends a **label** (`Session 2`, `Week 2`, `Training`). `experiment.html`
resolves that label to a **canonical session key** exactly once, at launch, and the key is
then applied to every task in the run - single task or whole module alike. Six keys exist:
`screening`, `wk0`, `wk2`, `wk4`, `wk24`, `wk28`.

Resolution accepts, in order: the raw key (`wk2`), an alias a session declares (`Training` →
`screening`), a week label (`Week 2` → `wk2`), and an ordinal (`Session 2` → the session whose
`order` is 2). `Session N` follows the `order` field, not position in the file, and `screening`
has `order: null` so it never answers to an ordinal. **A label that doesn't resolve stops the
run before any task loads**, with an error listing what is accepted.

### What the registry controls

| Field | Controls |
| --- | --- |
| `aliases`, `order` | Which hosting-site labels resolve to this session |
| `name` | How the session is described in error messages |
| `variant` | `screening` vs `full`: rule sets, instruction wording, coin values, practice length |
| `stimulusSet` | The asset folder segment for pavlovian, control, card-choosing and PIT images |
| `resumePolicy` | `standard` vs `restricted`: which resumption signal open-text and WM send to the site |
| the key itself | Which trial sequence each task loads, via that task's own `sequences` map |

Tasks read these through `settings.sessionInfo` (attached once in `createTaskTimeline`), so no
task compares session names itself.

### What is *not* in the registry

Adding or changing a session means adding an entry **and** working through this list. None of
it is enforced by the registry:

- **Asset folders must exist** for the `stimulusSet`: `assets/images/pavlovian-stims/<set>/`
  and `assets/images/control/session-specific/<set>/`. A missing folder shows up as a 404
  mid-task, not as a startup error. Known gap: `pavlovian-stims/` has no `screening` folder
  while control's does - harmless only because no screening run reaches pavlovian stimuli.
- **Sequence files must exist** for the new key in every task with a `sequences` map: PILT,
  WM, both post-learning tests, reversal. A task with a `sequences` map and no entry for the
  running session throws at setup, so a half-added session fails loudly rather than mid-run.
  WM and the post-learning tests deliberately have no `screening` sequence.
- **Control's per-session tables** stay in [`tasks/control/configuration.js`](tasks/control/configuration.js):
  the island fruit names (`i1_name`) are keyed by session key and need a new entry. The
  `baseRule` / `controlRule` maps switch on `variant` and need nothing.
- **Random seeds.** `shuffleArray(..., settings.session)` in card-choosing instructions seeds
  practice-trial order from the session key, so renaming an existing key silently changes what
  participants saw. Keys are append-only in practice.
- **A new `variant` is a code change.** Adding a session that reuses `screening` or `full`
  needs no task edits; introducing a third variant means revisiting the branches in
  card-choosing, control and reversal.
- **The hosting site is the other half of the contract.** `aliases` and `order` have to match
  the labels the hosting site actually sends; adding a key here doesn't make a site offer it.
- **REDCap.** `window.session` stays the raw label the site sent, so existing exports are
  unchanged. The resolved key is recorded alongside it in the trial data as `session_key`.
- **Modules can't pin a session.** A module that must always run one specific session is not
  expressible - the launch URL decides. That would need a new mechanism.

## Examples

Complete working examples are available in the `examples/` folder:

### Individual Task Examples
- `PILT.html` - Card choosing learning task
- `control.html` - Control-seeking task  
- `delay-discounting.html` - Intertemporal choice task
- `vigour.html` - Action vigour task
- And more...

Each example demonstrates proper file loading, API usage, and task configuration for that specific task type.

### Module Example
- `experiment.html` - Complete module-based experiment using `createModuleTimeline()`

This example shows how to:
- Load all required dependencies for multiple tasks
- Use URL parameters to select modules (`full_battery` vs `screening`)
- Handle module configuration and timeline creation
- Support simulation mode for testing

**Key features demonstrated:**
```javascript
// Module selection based on URL parameter
const module_name = session == "screening" ? 'screening' : 'full_battery';

// Module timeline creation
const timeline = await createModuleTimeline(module_name, settings);

// Complete experiment structure
const fullTimeline = [
    enterExperiment,
    ...timeline,
    exitFullscreen
];
```

## Testing

Cross-device checks for the vigour and reversal tasks live under `validation/playwright/`, in two parts:

- **Rendering matrix** (`*-rendering.spec.js`, `support/render-check.js`): runs each task (via its page in `examples/`, driven by jsPsych's simulate mode) across all 21 device projects - common phones, tablets, and desktop browsers - asserting it actually renders (no console errors, no collapsed/overflowing layout, the orientation "please rotate" gate shows only where expected). A task can add its own assertions through `extraChecks` - the questionnaire uses this to check that each screen commits to exactly one input mode and renders only that mode's controls.
- **Journey checks** (`*-journey.spec.js`, `support/journey-check.js`): drives a real (non-simulate) run - real clicks/taps/keypresses through the actual flow - on a small curated subset of 5 devices, to deterministically capture checkpoints simulate mode can't reliably land on, since it auto-advances through everything. For vigour and reversal that is the static instructions text and an in-task feedback/coin moment.

Both save a screenshot per device/checkpoint to `validation/playwright/screenshots/`.

Per-task settings (page URL, preferred orientation, the selector that pins the real trial) live in `support/task-config.js`. A task with no `preferredOrientation` is never orientation-gated, which is how both questionnaires are treated.

```bash
npm install
npx playwright install        # first time only, downloads browser binaries
npm run test:e2e              # run everything (rendering matrix + journeys)
npm run test:e2e:report       # browse the last run's HTML report (includes screenshots)
```

Run a subset with `npx playwright test --project="iPhone 14"` or `--project="iPhone 14 (journey)"` (see `playwright.config.js` for the full device list).