# Self-Report Questionnaires

## Overview
The self-report battery - currently PHQ-9 and GAD-7 - asked one item per screen, with one large button per point of the scale. A single tap answers the item and moves on; there is no separate continue button on an item screen, and no way back to an answered item.

The items, their order, the response scale and the catch items are ported unchanged from the RELMED trial 1 battery ([huyslab/relmed_trial1](https://github.com/huyslab/relmed_trial1), `questionnaires.js`), so responses stay comparable. What changed is the presentation: trial 1 rendered each questionnaire as one wide item × scale grid of radio buttons, which needs a wide screen and precise pointing. Here each item is its own screen, sized for a fingertip, matching the [medication questionnaire](../medication-questionnaire/README.md) a participant meets earlier in the same session.

Where a keyboard drives the run (`input_mode`, `'auto'` by default), the number keys pick an option outright and the arrow keys walk them with a visible focus ring. Nothing is focused on arrival at an item screen - focusing the first option would ring "Not at all" as if it were already chosen. Which set of controls a participant saw is recorded per screen as `input_mode`.

## File Structure

### Core Files

#### `index.js`
**Purpose**: Main entry point that centralizes all exports from the task module.
- Re-exports `timeline.js` and `questionnaires.js`

#### `questionnaires.js`
**Purpose**: The questionnaire definitions - the part that must not drift from the published instruments.

Each entry holds its instructions, the timeframe line repeated above every item (`context`), the response scale, and the items. Items are numbered by position (`PHQ9_Q01` ...), counting the catch items, which matches the `Q01`... field names trial 1's grid produced.

- **`Questionnaires`**: The definitions, keyed `PHQ9` and `GAD7`
- **`getQuestionnaire(key)`**: Looks one up, throwing on an unknown key rather than quietly collecting one fewer measure than the study expects

**Catch items** carry `catch_type` and are marked `scored: false`, so they stay out of the published total:

| Item | Type | Meaning |
| --- | --- | --- |
| `PHQ9_Q09` ("Experiencing sadness or a sense of despair") | `consistency` | A near-repeat of `PHQ9_Q02` (`catch_origin`), which it should agree with |
| `GAD7_Q07` ("Worrying about the 1974 Eurovision Song Contest") | `infrequency` | An item almost nobody endorses |

Because of the inserted catch item, the PHQ-9's suicidal ideation item is `PHQ9_Q10`, not `Q09`.

#### `timeline.js`
**Purpose**: Assembles the questionnaires into a timeline.

**Main Export Function**:
- **`createSelfReportTimeline(settings)`**: Returns the requested questionnaires as a single jsPsych timeline node
  - Optional opening screen for the set, then each questionnaire's own instructions and items
  - Marks the task and each questionnaire with `updateState()`, reusing trial 1's `PHQ9_start` / `GAD7_start` names so the hosting site sees states it already knows
  - Saves to REDCap every `save_every` items and whenever a questionnaire finishes, so an interrupted session keeps the earlier answers without a full data post per tap

#### `plugin-self-report-item.js`
**Purpose**: jsPsych plugin (`jsPsychSelfReportItem`) that renders a single screen.

Each screen is a card with a progress bar, the timeframe line, the item, and the response options. The card slides in from the right on trial start and out to the left when answered; `transition_duration` controls both, and the transitions are skipped in simulation mode and for users who ask for reduced motion. The chosen option stays highlighted while the screen slides away, so the answer that registered is visible rather than the screen just vanishing.

**Screen types**:
- `message` - something to read, and a button to move on (the opening screen and each questionnaire's instructions)
- `likert` - one item, and one large button per option

A progress bar rather than the medication questionnaire's dots: these questionnaires run to ten items, and ten dots on a phone are too small to read as progress.

**Data recorded per screen**: `questionnaire`, `item_id`, `item_index`, `item_text`, `catch_type`, `response` (the score of the option chosen), `response_label`, `input_mode`, and `rt`. Message screens record `null` for `response` and `item_id`. `trialphase` is set by the timeline: the questionnaire key (`PHQ9`, `GAD7`) on item screens, and `<key>_instructions` on its opening screen.

Response-quality checks that trial 1's grid computed per questionnaire (straightlining, zigzagging) are not recorded here - with one item per screen there is no single form to compute them over. The same checks, and more, are available offline from the per-item responses and reaction times.

The plugin implements `simulate()` in both data-only and visual modes; visual mode drives the real controls.

#### `styles.css`
**Purpose**: Styling for the questionnaires, scoped under `.srq-*`, deliberately sharing the look of the medication questionnaire's `.medq-*`.
- 64px minimum control height, `touch-action: manipulation`, and no tap highlight, so taps land where they are aimed
- The item font is a shade smaller than the medication questionnaire's prompt: the longest PHQ-9 item runs to four lines on a phone and has to sit above four options without scrolling
- `.srq-keyboard` (set by the plugin on the screen) tightens the controls for a cursor, and a `(hover: hover) and (pointer: fine)` block adds hover states; `:focus-visible` rings apply everywhere
- The slide transitions, and a `prefers-reduced-motion` fallback that removes them

## Configuration

| Option | Default | Description |
| --- | --- | --- |
| `task_name` | `self_report` | Prefix for state updates and the opening screen's `trialphase` |
| `questionnaires` | `["PHQ9", "GAD7"]` | Which questionnaires to ask, in order |
| `include_intro` | `true` | Whether to open with a screen introducing the set. Each questionnaire always shows its own instructions |
| `save_every` | `5` | Save to REDCap after every this many items |
| `transition_duration` | `350` | Slide transition duration in ms |
| `input_mode` | `auto` | `touch` for tap targets, `keyboard` to also drive the options with the arrow and number keys, or `auto` to pick from the device |

## Usage

```javascript
const timeline = await createTaskTimeline('self_report', {});

// Or just one questionnaire
const timeline = await createTaskTimeline('self_report', { questionnaires: ['PHQ9'] });
```

The experiment page must load the plugin, as the task registry only loads CSS:

```html
<script src="tasks/self-report/plugin-self-report-item.js"></script>
```

An end-to-end example is in `examples/self-report.html`.

## Notes
- The questionnaires are deliberately not run in fullscreen in the example page, matching the medication questionnaire: these are reading-and-tapping screens rather than a timed task.
- Resumption is disabled. A resumed run would skip items whose answers were never recorded, leaving an unscorable questionnaire.
