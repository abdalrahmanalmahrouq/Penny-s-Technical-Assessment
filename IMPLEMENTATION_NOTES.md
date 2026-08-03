# Implementation Notes

## 1. What I changed

- Completed the list status filter. ALL keeps every loaded row, while a specific status returns only matching CRs. I also added a separate message for a filter with no matches.
- Fixed detail navigation by reloading the detail whenever its id input changes.
- Fixed line-item diff detection. Items with a changed description, quantity, or unit price are classified as changed.
- Sorted audit entries chronologically (oldest first).
- Made Approve and Reject depend on both PENDING_APPROVAL status and an approval policy.
- Fix Approve and Reject buttons + Added required, non-whitespace rejection validation. Invalid rejection attempts are stopped before reaching the API.

## 2. Component and state model

AppComponent hosts the list and detail panels, each managing its own UI and data state.
Both panels load organization-specific data through shared API and session services.
Permissions, validation, and submission state determine which actions are available.
After a successful detail action, the list refreshes to keep both panels synchronized.

## 3. Invariants I keep

| Invariant | How / where |
|---|---|
| The list shows only CRs returned for the current user's organization. | `CrApiService.listChangeRequests` provides organization-scoped rows; `CrListComponent` renders only those rows. |
| `ALL` shows every loaded CR and a status filter shows only exact matches. | `CrListComponent.visibleRows`. |
| A filter with no matches have a clear message. | `cr-list.component.html`. |
| The selected detail is reloaded when its input ID changes. | `CrDetailComponent.ngOnChanges`. |
| A matched SKU is changed when its description, quantity, or unit price differs. | `computeDiff`. |
| Timeline entries render oldest first without mutating API data. | `CrDetailComponent.timeline` copies before sorting. |
| Approve and Reject require both pending status and approval permission. | `canApprove`, `canReject`, and `canApprovePolicy`. |
| Reject never reaches the API with an empty or whitespace-only reason. | Reactive validators plus the guard in `reject()`. |
| At most one action is in flight. | `submitting` guards in both action methods and disabled template controls. |



## 4. Testing strategy

- Pure unit tests cover added, removed, changed (description, quantity, and unit price), and unchanged diff rows.
- Final verification uses `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. The current suite contains 18 passing tests across three suites.
- Given the time budget, I did not add exhaustive tests for every equivalent Approve/Reject branch or every failure/retry combination.
## 5. Assumptions and judgment calls

- A rejection reason containing only whitespace is considered missing. Valid reasons are trimmed before being sent to the API.
- I use the client timestamp (`new Date().toISOString()`) because that is the timestamp required by the provided mock API contract.
- The list reloads after an action instead of manually patching a summary row.
- When switching to a user in another organization, the previously selected ID can produce the explicit Not Found state until that user's CR is selected. Automatically selecting the first available CR would be a useful shell-level enhancement but is outside the core list/detail requirements.


## 6. Where I used AI

I used AI as a learning and review partner to translate my existing React.js experience into the Angular patterns used by this project. It helped me orient around the existing Angular component/template/test patterns, propose focused test cases. I reviewed the changes,  manually exercised the user flows, ran the application and verification commands myself, and worked through the reasoning for each submitted behavior.

## 7. What I would improve with more time

- Improve the timeline presentation by formatting ISO timestamps and adding spacing/labels while preserving the simple supplied design.

- Reset or select an appropriate detail when the acting user changes organizations, instead of initially showing Not Found for the old selection.
