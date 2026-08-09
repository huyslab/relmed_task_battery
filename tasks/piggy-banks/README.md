# Piggy Banks Task Module

## Overview
This module contains behavioral paradigms that utilize a shared piggy bank interface to study motivation, effort allocation, and reward processing. The module includes two main tasks: the vigour task and the Pavlovian-to-Instrumental Transfer (PIT) task. Both tasks share common visual elements and mechanics involving a virtual piggy bank that participants interact with to earn coins, while measuring different aspects of motivated behavior.

## Tasks Included

### Vigour Task
The vigour task measures participants' motivation and effort allocation by having them shake a virtual piggy bank to earn coins. Participants repeatedly tap (or click) the piggy bank to shake it, with different trials requiring varying effort levels (ratio of presses per coin) for different reward magnitudes. The task assesses how participants balance effort expenditure with reward value.

### Pavlovian-to-Instrumental Transfer (PIT) Task
The PIT task examines how Pavlovian cues influence instrumental behavior. Participants interact with the piggy bank in notional extinction, while being presented with previously conditioned stimuli, allowing researchers to study how learned associations affect motivated responding.

## File Structure

### Core Files

#### `index.js`
**Purpose**: Main entry point that centralizes all exports from the piggy banks task module.
- Re-exports all functions from vigour and PIT task components
- Provides a single import point for accessing all piggy bank task functionality

#### Vigour Task Components

##### `vigour-timeline.js`
**Purpose**: Contains timeline creation functions for the vigour task.

**Main Export Functions**:
- **`createVigourTimeline(settings)`**: Creates the complete timeline for the vigour task
  - Handles asset preloading, instructions, and core task trials
  - Returns array of jsPsych trial objects for the full task sequence

##### `vigour-utils.js`
**Purpose**: Core utility functions for vigour task construction, trial management, animations, and data tracking.

**Main Export Functions**:
- **`preloadVigour(settings)`**: Preloads all necessary images and assets for the task
- **`createVigourCoreTimeline(settings)`**: Constructs the main task trials from predefined trial structure
- **`piggyBankTrial(settings)`**: Creates individual vigour trial objects

**Animation Functions**:
- **`shakePiggy()`**: Animates piggy bank shaking when participants press keys
- **`dropCoin(magnitude, persist)`**: Animates coin dropping with different values
- **`updatePiggyTails(magnitude, ratio)`**: Updates visual indicators showing trial parameters
- **`animatePiggy(keyframes, options)`**: General animation utility for piggy bank effects

**UI Management Functions**:
- **`createPersistentCoinContainer()`**: Creates overlay for persistent coin animations
- **`updatePersistentCoinContainer()`**: Maintains coin animation positioning across screen changes
- **`observeResizing(elementId, callback)`**: Handles dynamic screen resizing during the task

##### `vigour-instructions.js`
**Purpose**: Manages interactive instruction sequence for the vigour task.

**Main Export Functions**:
- **`vigour_instructions`**: Complete interactive instruction timeline for vigour task

#### PIT Task Components

##### `PIT-timeline.js`
**Purpose**: Contains timeline creation functions for the PIT task.

##### `PIT-utils.js`
**Purpose**: Core utility functions for PIT task construction and management.

##### `PIT-instructions.js`
**Purpose**: Manages instruction sequences for the PIT task.

#### Shared Components

##### `utils.js`
**Purpose**: Shared utility functions used across both vigour and PIT tasks.

##### `styles.css`
**Purpose**: CSS styling for piggy bank task interfaces and animations.
- Defines layout for piggy bank, coins, and instruction elements
- Handles responsive design for different screen sizes
- Styles for coin dropping animations and piggy bank effects
- Manages visual feedback for tail indicators and saturation effects
- Ensures consistent presentation across trials and instruction phases

## Shared Design Elements

### Visual Interface Components
- **Piggy Bank**: Central visual element that shakes with participant interactions
- **Coin Animations**: Different coin values (1p, 2p, 5p) drop when requirements are met
- **Tail Indicators**: Visual cues showing trial parameters
  - Number of tails indicates reward magnitude
  - Saturation/brightness indicates effort requirement or other trial conditions

### Common Data Output
Both tasks record detailed behavioral data including:
- **Trial-level metrics**: Response counts, earned rewards, response times
- **Global tracking**: Total responses and rewards across trials
- **Temporal data**: Response time patterns and inter-response intervals
- **Task-specific measures**: Effort allocation strategies, cue-response relationships

## Usage Examples

### Vigour Task
```javascript
import { createVigourTimeline } from './tasks/piggy-banks/index.js';

const settings = {
  session: "wk0",
  participant_id: "sub001"
};

const vigourTimeline = createVigourTimeline(settings);
```

### PIT Task
```javascript
import { createPITTimeline } from './tasks/piggy-banks/index.js';

const settings = {
  session: "wk0",
  participant_id: "sub001"
};

const pitTimeline = createPITTimeline(settings);
```

## Dependencies
- Core utilities from `/core/utils/index.js`
- jsPsych framework and plugins (html-keyboard-response, preload)
- Asset images in `/assets/images/piggy-banks/`, `/assets/images/pavlovian-stims/`, and `/assets/images/card-choosing/outcomes/`
- Custom CSS styling for animations and responsive design

## Data Output
The tasks record detailed trial-by-trial data including:
- **Trial behaviour**: Response counts, earned rewards, response times
- **Trial parameters**: Magnitude, ratio, trial duration, and stimulus conditions
- **Behavioral patterns**: Inter-response intervals and response allocation strategies
- **Overall behaviour**: Total responses and rewards for bonus calculations
- **Task progression**: Trial numbers and completion timestamps
