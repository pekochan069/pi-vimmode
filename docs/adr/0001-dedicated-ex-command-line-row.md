# Dedicated Ex command-line row

pi-vimmode will render Ex command-line input and transient Ex messages in an extra row below the prompt box, shrinking the prompt viewport by one row while that row is visible. We chose this over reusing the existing status/pending display because Ex commands can be long and Vim-fluent users expect a distinct command-line surface; the extra renderer complexity is acceptable for clearer command editing and feedback.
