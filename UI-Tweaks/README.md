# CSS Tweaks – Polished UI for Trilium

A set of CSS styles to improve readability and elegance of the TriliumNext interface.

## Installation
1. Import `CSS_Tweaks_UI_Polished.zip` as an appearance note (or create a **Code – CSS** note with the code and apply it via settings).
2. Adjust the styles to your preference.
3. Add the label `#appCss` to the note's attributes.

## Original link
[https://github.com/orgs/TriliumNext/discussions/9553](https://github.com/orgs/TriliumNext/discussions/9553)


---


## 🌟 Key Features

### 1. General Polish & Scrollbars

* **Minimalist Scrollbars:** Slimmer scrollbars (6px) with a transparent track and a subtle thumb that perfectly matches your current theme's border color.
* **Theme-Aware Selection:** Highlighting text now uses a beautifully tinted color mixed from the main text color.
* **Fixed Card Links:** Corrects opacity issues on card links, ensuring titles remain bold and legible while adding a smooth hover underline effect.

### 2. Sidebar & Note Tree (Launcher & Fancytree)

* **Centered Launcher Icons:** Fixes padding conflicts to ensure left-sidebar icons are perfectly sized (14px) and centered.
* **Refined Note Tree:** Increases padding and border-radius for tree items, making them more clickable and modern.
* **Active Note Highlighting:** The currently active note receives a prominent blue background badge on its title and a solid left border on the node, making it impossible to lose your place.
* **Sleek Hover Effects:** Smooth background transitions when hovering over notes in the tree.

### 3. Obsidian-Style Text Editor

* **Spacious Typography:** Increases line height (1.9) and margin spacing for paragraphs and lists to improve readability.
* **Prominent Headers:** H1, H2, and H3 tags are bolder and feature increased top and bottom margins for distinct visual hierarchy.
* **Auto-Hiding Toolbar:** The CKEditor top toolbar now fades out (50% opacity) when you are just reading, and fully appears (100% opacity) when you focus on the editor or hover over it.

### 4. Card View Enhancements

* **Responsive Grid:** Introduces dynamic auto-fill columns with proper gaps (12px) to prevent cards from touching each other on desktop.
* **Flat Design:** Removes default box-shadows in favor of clean, subtle 1px borders with rounded corners (8px).
* **Better Padding:** Increases inner padding for more "breathing room" around the text.

### 5. Elegant Kanban Board View (V3)

* **Translucent Columns:** Columns use a color-mixed semi-transparent background.
* **Color-Coded Headers:** The first 5 columns automatically receive distinct, beautifully colored top borders (Blue, Orange, Teal, Red, Purple).
* **Interactive Cards:** Board notes feature a subtle hover lift (`translateY`) and border color transition.
* **Refined Add Buttons:** "New Item" and "Add Column" buttons have dashed borders and soft background colors on hover.

### 6. Colorful Table View (Collection View)

* **Auto-Coloring Columns:** The first 15 columns are automatically color-coded with distinct, harmonious hex values for extreme data clarity.
* **Clean Borders:** Uses semi-transparent borders for cells and headers to avoid a cluttered look.
* **Row Hover Effects:** Entire rows softly highlight when hovered.
* **Refined Resize Handles:** Column resize handles only appear on hover to keep headers looking clean.

### 7. Promoted Attributes & Tags

* **Attribute Table Layout:** Transforms standard promoted attributes into a clean, aligned table layout (`Label:` `Value`).
* **Rounded Pills:** Note attributes in the list view are transformed into beautiful rounded pills with a monospace font.
* **Labels (`#`):** Rendered with a soft green background and border.
* **Relations (`~`):** Rendered with a soft blue background and border.


### 8. Mobile Optimization

* **Single-Column Cards:** Forces card views into a single column on mobile screens to prevent text from being squished or cut off.
* **Hidden Code Blocks in Cards:** Hides `<pre>` and `<code>` blocks within card previews on mobile, as long lines of code (like shebangs) often break the card layout.
* **Always-Visible Editor Toolbar:** Bypasses the auto-hiding editor toolbar on mobile, as touch devices don't have a "hover" state.
* **Horizontal Scroll for Tables:** Markdown tables now automatically scroll horizontally on small screens to prevent the entire page from breaking its width.
* **Scaled Typography:** Dynamically reduces font sizes for titles, headers, and UI elements to fit perfectly on smaller viewports.


