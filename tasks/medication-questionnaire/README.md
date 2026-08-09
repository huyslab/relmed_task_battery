# Medication Questionnaire

## Overview
A short questionnaire, asked at the start of a session, about the medication the participant was invited to the study for. One question per screen, a slide transition between screens, and no way back to an earlier question - each screen is its own jsPsych trial, and the answer is committed as the screen slides away.

The controls adapt to the device (`input_mode`, `'auto'` by default):

- **Touchscreen** - finger-sized controls and an on-screen keypad for numbers, which keeps the question visible instead of letting the device keyboard cover it. Nothing is focused on arrival, so the keyboard never opens over a question before it has been read.
- **Mouse and keyboard** - numbers are typed into a field rather than tapped on a keypad, the answer control is focused on arrival so typing can start immediately, Enter moves to the next question, Tab reaches every control with a visible focus ring, and on a list of options the arrow keys move between them while the number keys pick one outright.

Which set of controls a participant saw is recorded per screen as `input_mode`.

## File Structure

### Core Files

#### `index.js`
**Purpose**: Main entry point that centralizes all exports from the task module.
- Re-exports all functions from `timeline.js`

#### `timeline.js`
**Purpose**: Defines the questions and assembles them into a timeline.

**Main Export Function**:
- **`createMedicationQuestionnaireTimeline(settings)`**: Returns the full questionnaire as a single jsPsych timeline node
  - Optional intro screen, then the five question screens
  - Marks the questionnaire start and finish with `updateState()`
  - Saves to REDCap after every screen, so an interrupted session keeps the earlier answers

**Questions**:
1. `medication_name` (text) - the name of the medicine, copied from the package
2. `medication_dose_mg` (number) - the strength of one pill, in mg, entered on the keypad
3. `pills_per_day` (choice) - buttons 1-4, plus "5 or more" which opens the keypad
4. `medication_start_date` (date) - day, month and year, each optional
5. `other_medications` (list) - a yes/no question, and if yes, a list built one item at a time

#### `plugin-medication-question.js`
**Purpose**: jsPsych plugin (`jsPsychMedicationQuestion`) that renders a single questionnaire screen.

Each screen is a card with progress dots, the question, an optional supporting line, a body determined by `question_type`, and a footer holding the forward button. The card slides in from the right on trial start and out to the left when answered; `transition_duration` controls both, and the transitions are skipped in simulation mode and for users who ask for reduced motion.

**Question types**:
- `message` - something to read, and a button to move on
- `text` - a single large text field
- `number` - an on-screen keypad with a running readout on a touchscreen, or a typed field with the unit beside it on a machine with a keyboard. Anything typed that cannot be part of a number is dropped as it is entered
- `choice` - one large button per option, each ending the trial on a single tap. An option with `reveals: 'number'` swaps the same screen for the keypad instead, which is how "5 or more" is handled
- `date` - day, month and year as native selects, so the device's own picker is used. All three are optional, so a year on its own is a valid answer
- `list` - a yes/no gate; answering yes reveals a text field, an add button, and the list of items added so far, each removable

`text` and `number` screens can offer an "I'm not sure" button (`unsure_label`), which records a missing answer and sets `unsure: true` rather than leaving a participant stuck on a package they cannot read.

**Data recorded per screen**: `question_name`, `question_type`, `response`, `response_label` (a readable version of the answer), `unsure`, `input_mode`, and `rt`. `response` is a string for `text`, a number for `number` and `choice`, a `{day, month, year}` object for `date` (with `null` for anything left blank), and an array of strings for `list` (empty when the answer was "no").

The plugin implements `simulate()` in both data-only and visual modes; visual mode drives the real controls.

#### `styles.css`
**Purpose**: Styling for the questionnaire, scoped under `.medq-*`.
- 64px minimum control height, `touch-action: manipulation`, and no tap highlight, so taps land where they are aimed
- Text fields never drop below 16px, which stops iOS Safari zooming in on focus
- `.medq-keyboard` (set by the plugin on the screen) tightens the controls for a cursor, and a `(hover: hover) and (pointer: fine)` block adds hover states; `:focus-visible` rings apply everywhere
- The slide transitions, and a `prefers-reduced-motion` fallback that removes them

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `task_name` | `medication_questionnaire` | Prefix for state updates and `trialphase` values |
| `include_intro` | `true` | Whether to open with a short welcome screen |
| `allow_unsure` | `true` | Whether the name and dose questions offer an "I'm not sure" button |
| `max_pill_buttons` | `5` | Pills-per-day is answered with buttons 1 to this number minus one, plus an "N or more" button that opens the keypad |
| `earliest_year` | `1970` | Earliest year offered in the start date question |
| `transition_duration` | `350` | Slide transition duration in ms |
| `input_mode` | `auto` | `touch` for tap targets and the on-screen keypad, `keyboard` for typed entry, or `auto` to pick from the device |

## Usage

```javascript
const timeline = await createTaskTimeline('medication_questionnaire', {});
```

The experiment page must load the plugin, as the task registry only loads CSS:

```html
<script src="tasks/medication-questionnaire/plugin-medication-question.js"></script>
```

An end-to-end example is in `examples/medication-questionnaire.html`.

## Notes
- The questionnaire is deliberately not run in fullscreen in the example page: mobile browsers handle the on-screen keyboard better outside of fullscreen.
- Resumption is disabled. The questionnaire is short, and a resumed session would otherwise skip questions whose answers were never recorded.
