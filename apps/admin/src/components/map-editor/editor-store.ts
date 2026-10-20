import { emptyMap, MapLayout, SPAWN_ID, type MapObject, type MapVector } from "@lw/shared/map-layout";

const HISTORY_LIMIT = 60;
export type EditorSnapshot = {
  layout: MapLayout;
  selectedId: string | null;
  past: MapLayout[];
  future: MapLayout[];
};

/** One immutable snapshot per completed edit, including each gizmo drag. Selection is not history. */
export function createEditorStore(initial = emptyMap()) {
  let state: EditorSnapshot = { layout: MapLayout.parse(initial), selectedId: null, past: [], future: [] };
  const listeners = new Set<() => void>();
  const publish = (next: EditorSnapshot) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const validSelection = (layout: MapLayout, id: string | null) =>
    id === SPAWN_ID || layout.objects.some((object) => object.id === id) ? id : null;
  const commit = (next: MapLayout) => {
    const layout = MapLayout.parse(next);
    if (JSON.stringify(layout) === JSON.stringify(state.layout)) return;
    publish({
      layout,
      selectedId: validSelection(layout, state.selectedId),
      past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.layout],
      future: [],
    });
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    commit,
    select(id: string | null) {
      publish({ ...state, selectedId: validSelection(state.layout, id) });
    },
    restore(layout: MapLayout) {
      publish({ layout: MapLayout.parse(layout), selectedId: null, past: [], future: [] });
    },
    updateObject(id: string, update: (object: MapObject) => MapObject) {
      commit({
        ...state.layout,
        objects: state.layout.objects.map((object) => (object.id === id ? update(object) : object)),
      });
    },
    transform(id: string, transform: { position: MapVector; rotation: MapVector; scale: MapVector }) {
      if (id === SPAWN_ID) commit({ ...state.layout, spawn: transform.position });
      else this.updateObject(id, (object) => ({ ...object, ...transform }));
    },
    add(objects: MapObject[]) {
      commit({ ...state.layout, objects: [...state.layout.objects, ...objects] });
      this.select(objects.at(-1)?.id ?? null);
    },
    remove() {
      const selected = state.layout.objects.find((object) => object.id === state.selectedId);
      if (selected && !selected.locked)
        commit({
          ...state.layout,
          objects: state.layout.objects.filter((object) => object.id !== selected.id),
        });
    },
    duplicate() {
      const selected = state.layout.objects.find((object) => object.id === state.selectedId);
      if (!selected) return;
      this.add([
        {
          ...selected,
          id: crypto.randomUUID(),
          name: `${selected.name.slice(0, 85)} (bản sao)`,
          locked: false,
          position: {
            ...selected.position,
            x: Math.min(10000, selected.position.x + 2),
            z: Math.min(10000, selected.position.z + 2),
          },
        },
      ]);
    },
    undo() {
      const previous = state.past.at(-1);
      if (previous)
        publish({
          layout: previous,
          selectedId: validSelection(previous, state.selectedId),
          past: state.past.slice(0, -1),
          future: [state.layout, ...state.future],
        });
    },
    redo() {
      const next = state.future[0];
      if (next)
        publish({
          layout: next,
          selectedId: validSelection(next, state.selectedId),
          past: [...state.past, state.layout],
          future: state.future.slice(1),
        });
    },
  };
}

export type EditorStore = ReturnType<typeof createEditorStore>;
