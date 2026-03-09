import React, { useRef, useCallback, useLayoutEffect } from "react";

// React 19 DOM exposes useEffectEvent, but React Native does not.
// This shim provides equivalent stable-callback semantics via useRef.
export const useEffectEvent: typeof React.useEffectEvent =
    React.useEffectEvent ??
    function useEffectEventShim<T extends (...args: any[]) => any>(fn: T): T {
        const ref = useRef(fn);
        // Mutating ref.current during render violates concurrent-mode rules.
        // useLayoutEffect ensures the update happens after commit, not during render.
        useLayoutEffect(() => {
            ref.current = fn;
        });
        return useCallback((...args: any[]) => ref.current(...args), []) as T;
    };
