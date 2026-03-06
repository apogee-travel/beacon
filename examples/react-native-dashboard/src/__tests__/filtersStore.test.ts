export default {};

// Branch map for filtersStore:
// 1. setDestination — updates destination in state
// 2. setDepartDate — updates departDate
// 3. setReturnDate — updates returnDate
// 4. setTravelers — updates travelers count
// 5. resetFilters — resets all fields to defaults
// 6. undo — undoMiddleware reverts last change (canUndo becomes false after undo with 1 history entry)
// 7. redo — undoMiddleware re-applies undone change
// 8. canUndo / canRedo — derived values from undoMiddleware

// Dynamic imports are used because filtersStore is a module-level singleton.
// jest.resetModules() gives us a fresh instance for each test.

describe("filtersStore", () => {
    let filtersStore: any;

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();
        ({ filtersStore } = await import("../stores/filtersStore"));
    });

    describe("initial state", () => {
        it("should have empty destination", () => {
            expect(filtersStore.destination).toBe("");
        });

        it("should have 1 traveler", () => {
            expect(filtersStore.travelers).toBe(1);
        });

        it("should have canUndo false", () => {
            expect(filtersStore.canUndo).toBe(false);
        });

        it("should have canRedo false", () => {
            expect(filtersStore.canRedo).toBe(false);
        });
    });

    describe("when setDestination is called", () => {
        beforeEach(() => {
            filtersStore.actions.setDestination("Paris");
        });

        it("should update destination", () => {
            expect(filtersStore.destination).toBe("Paris");
        });

        it("should enable canUndo", () => {
            expect(filtersStore.canUndo).toBe(true);
        });
    });

    describe("when setTravelers is called", () => {
        beforeEach(() => {
            filtersStore.actions.setTravelers(4);
        });

        it("should update travelers count", () => {
            expect(filtersStore.travelers).toBe(4);
        });
    });

    describe("when setDepartDate is called", () => {
        beforeEach(() => {
            filtersStore.actions.setDepartDate("2025-06-15");
        });

        it("should update departDate", () => {
            expect(filtersStore.departDate).toBe("2025-06-15");
        });
    });

    describe("when setReturnDate is called", () => {
        beforeEach(() => {
            filtersStore.actions.setReturnDate("2025-06-22");
        });

        it("should update returnDate", () => {
            expect(filtersStore.returnDate).toBe("2025-06-22");
        });
    });

    describe("when resetFilters is called after changes", () => {
        beforeEach(() => {
            filtersStore.actions.setDestination("Tokyo");
            filtersStore.actions.setTravelers(3);
            filtersStore.actions.resetFilters();
        });

        it("should reset destination to empty string", () => {
            expect(filtersStore.destination).toBe("");
        });

        it("should reset travelers to 1", () => {
            expect(filtersStore.travelers).toBe(1);
        });
    });

    describe("when undo is called after an action", () => {
        beforeEach(() => {
            filtersStore.actions.setDestination("London");
            filtersStore.actions.undo();
        });

        it("should revert destination to empty", () => {
            expect(filtersStore.destination).toBe("");
        });

        it("should enable canRedo", () => {
            expect(filtersStore.canRedo).toBe(true);
        });

        it("should disable canUndo", () => {
            expect(filtersStore.canUndo).toBe(false);
        });
    });

    describe("when redo is called after undo", () => {
        beforeEach(() => {
            filtersStore.actions.setDestination("Barcelona");
            filtersStore.actions.undo();
            filtersStore.actions.redo();
        });

        it("should restore the undone value", () => {
            expect(filtersStore.destination).toBe("Barcelona");
        });

        it("should disable canRedo", () => {
            expect(filtersStore.canRedo).toBe(false);
        });
    });

    describe("when resetFilters is called after undo leaves redo entries", () => {
        beforeEach(() => {
            filtersStore.actions.setDestination("Munich");
            filtersStore.actions.undo();
            filtersStore.actions.resetFilters();
        });

        it("should clear the redo stack", () => {
            expect(filtersStore.canRedo).toBe(false);
        });
    });

    describe("when setTravelers is called with a value then undone", () => {
        beforeEach(() => {
            filtersStore.actions.setTravelers(8);
            filtersStore.actions.undo();
        });

        it("should revert travelers to 1", () => {
            expect(filtersStore.travelers).toBe(1);
        });
    });
});
