export const ContextVariables: Record<
  string,
  {
    example: string;
    hint?: string;
  }
> = {
  title: {
    example: "{{title}}",
    hint: "Represents the note's title.",
  },
  content: {
    example: "{{content}}",
    hint: "Represents the entirety of the note's content.",
  },
  selection: {
    example: "{{selection}}",
    hint: "The portion of text that has been selected by the user.",
  },
  tg_selection: {
    example: "{{tg_selection}}",
    hint: "The text selected using the text generator method.",
  },

  inverseSelection: {
    example: `{{inverseSelection}}`,
    hint: "Shows an error notice when the inverse selection (excluding the currently selected text) is empty.",
  },

  previousWord: {
    example: `{{previousWord}}`,
    hint: "Shows an error notice when the previous word relative to the cursor's position is empty.",
  },

  nextWord: {
    example: `{{nextWord}}`,
    hint: "Shows an error notice when the next word relative to the cursor's position is empty.",
  },

  cursorParagraph: {
    example: `{{cursorParagraph}}`,
    hint: "Shows an error notice when the paragraph where the cursor is currently located is empty.",
  },

  cursorSentence: {
    example: `{{cursorSentence}}`,
    hint: "Shows an error notice when the sentence surrounding the cursor is empty.",
  },

  beforeCursor: {
    example: `{{beforeCursor}}`,
    hint: "Shows an error notice when the text before the cursor's current position is empty.",
  },

  afterCursor: {
    example: `{{afterCursor}}`,
    hint: "Shows an error notice when the text after the cursor's current position is empty.",
  },

  starredBlocks: {
    example: "{{starredBlocks}}",
    hint: "Content under headings marked with a star (*) in the note.",
  },

  clipboard: {
    example: "{{clipboard}}",
    hint: "The current content copied to the clipboard.",
  },
  selections: {
    example: "{{#each selections}} {{this}} {{/each}}",
    hint: "All selected text segments in the note, especially when multiple selections are made.",
  },
  highlights: {
    example: "{{#each highlights}} {{this}} {{/each}}",
    hint: "Highlighted segments marked with ==...== in the note.",
  },
  children: {
    example: "{{#each children}} {{this.content}} {{/each}}",
    hint: "An array of notes or sub-notes that are cited or related to the primary note.",
  },
  "mentions(linked)": {
    example: "{{#each mentions.linked}} {{this.results}} {{/each}}",
    hint: "Mentions across the entire vault where a note is directly linked, e.g., [[note]].",
  },
  "mentions(unlinked)": {
    example: "{{#each mentions.unlinked}} {{this.results}} {{/each}}",
    hint: "Mentions across the vault where a note is referenced without a direct link, e.g., '...note...'.",
  },
  extractions: {
    example: `{{#each extractions}} {{this}} {{/each}}

Or
{{#each extractions.pdf}} {{this}} {{/each}}
    `,
    hint: `Extracted content from various sources like PDFs, images, audio files, web pages, and YouTube URLs. possible extractions: `,
  },
  headings: {
    example: `{{#each headings}}
# HEADER: {{@key}}
{{this}}
{{/each}}`,
    hint: "Contains all the headings within the note and their respective content.",
  },

  metadata: {
    example: `{{metadata}}`,
    hint: "The initial metadata of the note, often provided in YAML format.",
  },

  yaml: {
    example: `{{#each yaml}}
{{@key}}: {{this}}
{{/each}}`,
    hint: "The initial metadata (Object) of the note.",
  },

  // extractors
  extract: {
    example: `{{#extract "web_md" "var1" "a"}}
  http://www.google.com
{{/extract}}

Or

{{extract "pdf" "test.pdf"}}
{{extract "youtube" "ytUrl"}}
{{extract "web" "https://example.com"}}`,
    hint: "Extracts content from various sources like PDFs, images, audio files, web pages, and YouTube URLs. possible values: web_md, web_html, pdf, yt, img, audio",
  },

  read: {
    example: `{{read "readme.md"}}`,
    hint: "Reads the content of a file from the vault",
  },

  write: {
    example: `{{#write "readme.md"}}
  text {{selection}}
{{/write}}

Or
{{write "readme.md" selection}}
`,
    hint: "Writes a text or variable into a file",
  },

  append: {
    example: `{{#append "readme.md"}}
  text {{selection}}
{{/append}}

Or
{{append "readme.md" selection}}
`,
    hint: "Appends a text or variable into a file",
  },

  run: {
    example: `{{#run "otherTemplateId" "var1" "selection"}}
  this text will be the "selection" variable for the other template
  it can be any variable even custom ones
{{/run}}

Or
{{#run "otherTemplateId" "var1"}}
  this text will be the "tg_selection" variable for the other template
{{/run}}
`,
    hint: "Runs another template, and sending a value to it, the result will be stored in a variable(var1).",
  },

  script: {
    example: `{{#script}}
  return "hello world";
{{/script}}

Or
{{#script "otherTemplateId" "var1"}}
\`\`\`js
  return "hello world";
\`\`\`
{{/script}}
`,
    hint: "Runs javascript code, avoid using it for security reasons.",
  },

  get: {
    example: `{{get "var1"}}`,
    hint: "Gets value of a variable",
  },

  set: {
    example: `{{#set "var1"}}
    text {{selection}}
{{/set}}

  Or
{{set "var1" selection}}
  `,
    hint: "Gets value of a variable",
  },

  log: {
    example: `{{log "test" selection}}`,
    hint: "Logs anything to console (open console in devtools Ctrl+Shift+i)",
  },

  notice: {
    example: `{{notice "test"}}`,
    hint: "Shows a notice to the user",
  },

  error: {
    example: `{{error "Selection was empty"}}`,
    hint: "Shows a error notice to the user, and it will stop the execution.",
  },

  dataview: {
    example: `{{#dataview}}
    TABLE file.name, file.size
    WHERE file.size > 2048
{{/dataview}}`,
    hint: "Executes a dataview",
  },
};
