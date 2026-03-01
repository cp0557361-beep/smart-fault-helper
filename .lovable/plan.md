

## Plan: Default Line Order from Machine Type Templates

### Problem
Currently, when a machine is added to a production line, its `sequence_order` is calculated as `max + 1` of existing machines. There is no concept of a "default line order" inherited from the machine type template. The user wants:

1. Each machine type has a **default line order** (`default_line_order`) that determines where it should appear in a production line.
2. In **Templates (MachineTypesPage)**, drag-and-drop of machine types updates this `default_line_order` automatically based on visual position.
3. In **Lines (LinesPage)**, when creating a machine, it inherits this default order and is inserted at the correct position -- not simply appended. If intermediate positions are missing, it fills the next available slot, but never exceeds its default position.
4. A machine type must exist in templates before it can be added to a line (already enforced by the dropdown).

### Database Change

Add a `default_line_order` integer column to `machine_types`:

```sql
ALTER TABLE public.machine_types 
ADD COLUMN default_line_order integer DEFAULT 0;
```

Update existing rows so `default_line_order` mirrors `sequence_order`:

```sql
UPDATE public.machine_types SET default_line_order = sequence_order;
```

### Code Changes

#### 1. MachineTypesPage.tsx -- Sync drag-and-drop to `default_line_order`

- When machine types are reordered via drag-and-drop, update both `sequence_order` (visual order in the templates panel) and `default_line_order` (the value machines inherit).
- Modify `reorderMachineTypesMutation` to also set `default_line_order = i` alongside `sequence_order = i`.

#### 2. LinesPage.tsx -- Inherit and position by default order

- Fetch `default_line_order` from `machine_types` when creating a machine (already fetching `machine_types` data).
- Replace the current `nextOrder = max + 1` logic with the template's `default_line_order`.
- On machine creation, calculate the effective position: insert at `default_line_order` but if machines with lower orders are missing, compact down (never exceed the default value).
- After inserting, re-sort and re-index all machines in the line to maintain consistent ordering.
- The `sequence_order` field in the machine form becomes read-only/auto-calculated (not manually editable).

#### 3. Positioning Algorithm (on create)

```text
Given: new machine with default_line_order = D
Existing machines sorted by sequence_order: [m1, m2, ...]

1. Each existing machine has its own default_line_order from its type.
2. Merge the new machine into the list, sorted by default_line_order.
3. Assign sequence_order = 0, 1, 2... based on sorted position.
4. Update all machines in the line with new sequence_order values.
```

This ensures that adding a machine with order 10 places it after all machines with lower default orders, even if positions 7-9 don't exist yet. If position 7 is added later, it slots in before 10 automatically via re-sort.

### Technical Details

- The `default_line_order` column on `machine_types` is the single source of truth for ordering precedence.
- The `sequence_order` on `machines` table remains the actual display order within a specific line, but is now derived from `default_line_order` on creation and recalculated on each insert.
- Manual drag-and-drop reordering of machines within a line (LinesPage) will continue to work for overrides, but creating a new machine will trigger a re-sort based on default orders.
- The machine form will auto-populate `sequence_order` from the template and show it as informational.

