# Conversation boundary

Coffee Chat is an operation, not a durable relationship or host lifecycle. Each
operation begins from the explicit target and current commit snapshot. A host
may retain conversation history under its own policy; Coffee Chat does not claim
to delete or refresh that history.
