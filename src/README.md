# Text Generator Plugin for Obsidian

The Text Generator Plugin is a powerful tool that enhances your Obsidian experience by providing AI-powered text generation capabilities. It integrates seamlessly with various Large Language Models (LLMs) to assist you in generating content, auto-suggesting text, and managing templates within your Obsidian vault.

## Project Description

The Text Generator Plugin is designed to boost your productivity and creativity in Obsidian by leveraging the power of AI. It offers a wide range of features, including:

- AI-powered text generation within your notes
- Auto-suggest functionality for seamless writing assistance
- Template management for quick content creation
- Integration with multiple LLM providers (OpenAI, Google, Anthropic, etc.)
- Custom prompt creation and management
- Batch generation capabilities for multiple files
- Playground view for experimenting with AI-generated content
- Flexible configuration options to tailor the plugin to your needs

Whether you're a writer, researcher, or knowledge worker, the Text Generator Plugin can help streamline your workflow and enhance your note-taking experience in Obsidian.

## Repository Structure

```
src/
├── LLMProviders/          # LLM provider implementations
├── code-mirror/           # CodeMirror integration
├── extractors/            # Content extraction utilities
├── helpers/               # Helper functions and utilities
├── lib/                   # Core library components
├── models/                # Data models and interfaces
├── scope/                 # Scoped functionality (commands, tokens, etc.)
├── services/              # Core services (text generation, API, etc.)
├── ui/                    # User interface components
│   ├── components/        # Reusable UI components
│   ├── context/           # React context providers
│   ├── playground/        # Playground view implementation
│   ├── settings/          # Settings UI components
│   └── template-input-modal/ # Template input modal components
└── utils/                 # Utility functions
```

Key Files:

- `src/main.ts`: Entry point of the plugin
- `src/default-settings.ts`: Default plugin settings
- `src/types.ts`: TypeScript type definitions
- `src/constants.ts`: Constant values used throughout the plugin

## Usage Instructions

### Installation

1. Open Obsidian and go to Settings > Community Plugins
2. Disable Safe Mode
3. Click "Browse" and search for "Text Generator"
4. Install the plugin and enable it

### Getting Started

1. Configure your preferred LLM provider in the plugin settings
2. Set up your API key for the chosen provider
3. Customize the auto-suggest and slash command options as needed
4. Start using the plugin by invoking the command palette (Cmd/Ctrl + P) and searching for "Text Generator" commands

### Common Use Cases

1. Generating text within a note:

   - Place your cursor where you want to insert text
   - Use the command palette to run "Text Generator: Generate Text"
   - The AI will generate text based on the context of your note

2. Using auto-suggest:

   - Enable auto-suggest in the plugin settings
   - As you type, the plugin will offer suggestions
   - Press Tab to accept a suggestion

3. Creating and using templates:

   - Open the Templates Package Manager from the ribbon icon
   - Install or create custom templates
   - Use the command palette to apply a template to your current note

4. Batch generating content:
   - Select multiple files in the file explorer
   - Right-click and choose "Generate" from the context menu
   - Select a template and generate content for all selected files

### Troubleshooting

Common issues and solutions:

1. API Key Issues:

   - Problem: "Invalid API Key" error
   - Solution: Double-check your API key in the plugin settings and ensure it's correctly entered

2. Generation Fails:

   - Problem: Text generation fails without error
   - Solution: Check your internet connection and verify that your chosen LLM provider is operational

3. Auto-suggest Not Working:
   - Problem: Auto-suggest doesn't appear while typing
   - Solution: Ensure auto-suggest is enabled in the plugin settings and check the trigger conditions (e.g., trigger phrase)

Debugging:

- Enable debug logging by adding `debug.enable("genii:*");` to your `main.ts` file
- Check the developer console (Ctrl + Shift + I) for detailed error messages and logs

## Data Flow

1. User Input: The user interacts with the plugin through the Obsidian interface (e.g., command palette, auto-suggest, or template manager).

2. Command Processing: The plugin's command system (`src/scope/commands.ts`) interprets the user's action and routes it to the appropriate service.

3. Text Generation: The `GeniiAssistant` service (`src/services/text-generator.ts`) handles the core text generation functionality:

   - It prepares the context and prompt based on the user's input and note content.
   - Sends a request to the configured LLM provider through the appropriate `LLMProvider` implementation.
   - Receives the generated text from the LLM.

4. Content Insertion: The generated text is then passed to the `ContentManager` (`src/scope/content-manager/index.ts`), which handles inserting the text into the active note or applying it to the selected files.

5. UI Updates: The plugin updates the user interface to reflect the changes, including status bar updates and any relevant modals or views.

```
[User Input] -> [Command Processing] -> [Text Generation] -> [LLM Provider] -> [Content Insertion] -> [UI Updates]
```

Note: The auto-suggest feature follows a similar flow but operates in real-time as the user types, utilizing the `AutoSuggest` service (`src/services/auto-suggest/index.ts`) to provide inline suggestions.
