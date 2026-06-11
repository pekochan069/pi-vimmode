## ADDED Requirements

### Requirement: Prompt buffer owns operator character-search operations

The prompt buffer module SHALL expose operation-level APIs that resolve and apply line-local character-search operator targets without requiring modal callers to compose raw offsets or inclusive selection ranges.

#### Scenario: Delete by find-forward character search

- **WHEN** caller requests a delete operation from a cursor through the next matching character on the current line
- **THEN** the prompt buffer removes the range including the matched character, returns the removed text as a character register, and places the cursor at the range start

#### Scenario: Delete by till-forward character search

- **WHEN** caller requests a delete operation from a cursor until before the next matching character on the current line
- **THEN** the prompt buffer removes the non-empty range before the matched character, returns the removed text as a character register, and preserves the matched character in prompt text

#### Scenario: Yank by backward character search

- **WHEN** caller requests a yank operation using a backward find or till character-search target on the current line
- **THEN** the prompt buffer returns the addressed characterwise register without mutating prompt text

#### Scenario: Change by character search preserves edit semantics

- **WHEN** caller requests a change operation using a valid character-search target
- **THEN** the prompt buffer returns the same edit result semantics as delete for the addressed range so the modal layer can enter insert mode without recomputing range math

#### Scenario: Missing character target is safe

- **WHEN** caller requests an operator character-search operation and the target character does not exist in the requested direction on the current line
- **THEN** the prompt buffer returns a safe no-op edit result or no register and does not corrupt prompt text

#### Scenario: Empty till range is safe

- **WHEN** caller requests a till-forward or till-backward operator range whose resolved range would be empty
- **THEN** the prompt buffer returns a safe no-op edit result or no register instead of deleting or yanking the cursor character

#### Scenario: Character-search operations remain line-local

- **WHEN** a matching character exists only on another prompt line
- **THEN** the prompt buffer treats the target as missing for operator character-search operations
