# Pointer studio

Open `index.html` in a modern browser. No installation, server, build step, backend, or database is needed.

## Explore

- Arrays: create a buffer, choose capacity, insert, delete, update, search, and traverse.
- Strings: ASCII character buffers, a visible null terminator, capacity checks, traversal, reversal, comparison, and copying.
- Linked lists: singly, doubly, circular singly, and circular doubly linked lists. Insert, remove, search, traverse, reverse, and clear. Doubly linked lists support backward traversal.
- Stack: bounded push, pop, and peek.
- Practice: repair pointer assignment order.
- Quizzes: eight questions with explanations.
- Progress: mark lessons as learned. Progress and theme preferences use browser local storage when available.

Choose an operation and press **Visualize operation**. Pause, move forward or backward, or replay. Click a list node to select its zero-based position. The memory inspector shows selected pointers and live allocations. The code panel highlights relevant C statements.

## Model boundaries

The browser simulates operations in JavaScript. It does not compile or execute arbitrary C. C panels contain operation functions or snippets for use with the displayed node definition or inside a function. Simulated addresses are illustrative. The array model uses four bytes per int, while actual `sizeof(int)` depends on the implementation. String exercises use ASCII so each displayed character corresponds to one C byte.

The simulation limits active structures to ten elements to keep diagrams readable. Array and stack capacity can range from one to sixteen. List allocation failure is discussed and checked in C examples, but is not injected into the simulation.

A step sequence records one operation. Its final state becomes the starting state for the next operation. Reset restores the module's starting example. Changing modules also restores the example for that module. Saved learning progress is separate from visualization state.

## Verification

- JavaScript syntax check.
- 85 operation scenarios, including empty and single-node list cases.
- Generated C list functions compiled with C11, warnings as errors, and address/undefined-behavior sanitizers. All four variants passed repeated insertion, reversal, search, deletion, and cleanup invariant checks.
- Browser checks for step playback, deletion of the only node in all list variants, invalid insertion positions, insufficient string capacity, and quiz feedback.
- Desktop and 390px mobile visual inspection.

Built with HTML, CSS, vanilla JavaScript, and SVG. Fonts are bundled for offline use. Google Fonts typefaces retain their open-source licenses in the fonts directory.

Direct `file://` launch could not be tested in the embedded preview browser because it permits only HTTP and HTTPS. Browser interaction checks used a temporary local HTTP server. The app uses classic local scripts and styles, with no fetch calls or module imports.
