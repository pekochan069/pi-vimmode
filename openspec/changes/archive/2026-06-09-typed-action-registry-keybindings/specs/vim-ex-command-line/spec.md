## ADDED Requirements

### Requirement: Ex transform args share action validation

Ex prompt transform commands and keymap action bindings SHALL use one shared validation contract for prompt transform args.

#### Scenario: Fence language validation matches keymap action validation

- **WHEN** `:fence ts` is accepted by the Ex parser
- **THEN** a keymap action binding for `prompt.transform.fence` with `{ "language": "ts" }` is accepted by the same validation contract

#### Scenario: Invalid fence language is rejected consistently

- **WHEN** Ex args or keymap action args provide a fence language containing whitespace
- **THEN** the invocation or binding is rejected with an invalid fence language error or warning and prompt text remains unchanged

#### Scenario: Reflow width validation matches keymap action validation

- **WHEN** `:reflow 72` is accepted by the Ex parser
- **THEN** a keymap action binding for `prompt.transform.reflow` with `{ "width": 72 }` is accepted by the same validation contract

#### Scenario: Invalid reflow width is rejected consistently

- **WHEN** Ex args or keymap action args provide a nonnumeric reflow width, a width below 20, or a width above 240
- **THEN** the invocation or binding is rejected with an invalid reflow width error or warning and prompt text remains unchanged

#### Scenario: No-arg transforms reject unexpected args consistently

- **WHEN** quote, unquote, bulletize, indent, or dedent receive unexpected Ex or keymap args
- **THEN** the invocation or binding is rejected and valid sibling config remains usable

#### Scenario: Unknown keymap args reject binding

- **WHEN** a keymap action binding object includes an arg key not defined for that prompt transform action
- **THEN** that binding is rejected with a warning and valid sibling bindings remain usable
