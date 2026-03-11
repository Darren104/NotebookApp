# 1. Project Used

Out of the three projects, I decided to go with first project "The Notebook, Multi-File Markdown editor". 

# 2. Tools used

- HTML, CSS, JavaScript was used to build the web based application. The reason why they are used because they are the standard languages used for building browser based applications. Besides that, since it was specified that the application operates on the client side and stores data using the browser's own local storage, this stack allows the application to run without any backend service. 

- ClaudeAI was used to help build the application, the reason why I chose to use ClaudeAI compared to other AI Generative tools is because ClaudeAI excels at more complex tasks, especially at building larger projects.

# 3. High Level Approach

After generating the initial implementation, the application was executed locally and tested in the browser to ensure that all core features worked as expected. The interface and functionality were manually tested to verify that note creation, editing, and preview rendering behaved correctly.

If unexpected behaviour or errors were encountered during testing, the issue was investigated and resolved either by refining the prompts used with LLM or by manually adjusting the generated code.

# 4. Final Prompts

1. I want to build a browser-based note-taking application, it has a 3 panel layout which are file list, markdown editor and live preview. Then functions for user include writing, managing and preview multiple markdown files in a clean three panel interface. The stack I will be using is mainly HTML, Javascript and CSS. Can you generate a template for the following?

2. Can you refactor the code so that HTML, CSS and JS are placed in their own files for better readability?

3. Can you explain on the how the saving and retrieving on localStorage is carried out for the application?

# 5. Instructions
1. Clone the repository
2. Open the project folder
3. Open index.html
4. Create and edit notes directly in the browser
5. Notes will automatically be saved via localStorage

# 6. Challenges & Iterations
The initial generated implementation placed HTML, CSS, and
JavaScript in a single file, which reduced readability. This was resolved by refactoring the code into separate files
to improve maintainability.

Another challenge was understanding how notes were stored and
retrieved using localStorage. Additional prompts were used to
clarify the implementation to ensure the logic was fully
understood before making further improvements.

# 7. Deployment URL
https://darren104.github.io/NotebookApp/
