# Using Beacon at Apogee

## Established Patterns

These aspects of using beacon are well-established.

- Mutable and derived state in stores remove the vast majority of instances of selectors/memoization in components
- Actions are the only way to mutate state
- Stores can reference other stores when needed (though the need should be well-justified)
- Stores do not make API calls directly.

## Emerging Patterns

These aspects of beacon usage are still very fluid, though initial patterns that seem promising are emerging.

- Stores are exposed through a central root store & root store context
- API usage and stores are mapped through some sort of intermediary module or hook. This includes:
    - "bridge" hooks that are stood up in the root store context
    - beacon middleware that manages adapting API responses to store actions
- The bridge hooks (briding API and beacon stores) should not return an API from the hook for consumers to use, instead, in those rare cases, the app emitter acts as the way to dispatch from consumers to the bridge hooks' behavior.
