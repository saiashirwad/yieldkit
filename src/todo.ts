import {
  TagArray,
  aria,
  button,
  className,
  context,
  disabled,
  div,
  footer,
  form,
  h1,
  header,
  htmlFor,
  id,
  input,
  label,
  li,
  local,
  main,
  nav,
  on,
  onInput,
  onMount,
  p,
  placeholder,
  provide,
  role,
  section,
  small,
  span,
  style,
  text,
  title,
  type,
  ul,
  uniqueId,
  use,
  value,
  type Setter,
  type Update,
} from "./yieldkit.ts";

export type Todo = {
  readonly id: string;
  readonly title: string;
  readonly done: boolean;
};

export type Filter = "all" | "active" | "done";

export type State = {
  readonly todos: readonly Todo[];
  readonly filter: Filter;
};

const Store = context<{ readonly state: State; readonly update: Update<State> }>(
  "Store",
);

const filters: ReadonlyArray<{ readonly key: Filter; readonly label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

export const seed: readonly Todo[] = [
  { id: crypto.randomUUID(), title: "Rewrite the yield* experiment", done: true },
  { id: crypto.randomUUID(), title: "Make every child a yield*", done: true },
  { id: crypto.randomUUID(), title: "Build a todo app with it", done: false },
  { id: crypto.randomUUID(), title: "Show it to someone", done: true },
];

const matches = (filter: Filter, todo: Todo): boolean =>
  filter === "all" || (filter === "done") === todo.done;

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const Composer = () =>
  form(function* () {
    const { update } = yield* use(Store);
    const [draft, setDraft] = yield* local("draft", "");
    const inputId = yield* uniqueId();

    yield* className("composer");
    yield* on("submit", (event) => {
      event.preventDefault();
      const title = draft.trim();
      if (!title) return;
      setDraft("");
      update((s) => ({
        ...s,
        todos: [...s.todos, { id: crypto.randomUUID(), title, done: false }],
      }));
    });

    yield* label(function* () {
      yield* className("visually-hidden");
      yield* htmlFor(inputId);
      yield* text("New task");
    });

    yield* input(function* () {
      yield* id(inputId);
      yield* className("composer-input");
      yield* placeholder("What needs doing?");
      yield* value(draft);
      yield* onInput(setDraft);
    });

    yield* button(function* () {
      yield* className("composer-add");
      yield* type("submit");
      yield* disabled(!draft.trim());
      yield* text("Add");
    });
  });

const Progress = () =>
  div(function* () {
    const { state } = yield* use(Store);
    const done = state.todos.filter((todo) => todo.done).length;
    const total = state.todos.length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    const labelId = yield* uniqueId();

    yield* className("progress");
    yield* div(function* () {
      yield* className("progress-label");
      yield* span(function* () {
        yield* id(labelId);
        yield* text(`${done} of ${total} done`);
      });
      yield* span(function* () {
        yield* className("progress-percent");
        yield* text(`${percent}%`);
      });
    });
    yield* div(function* () {
      yield* className("progress-track");
      yield* role("progressbar");
      yield* aria("labelledby", labelId);
      yield* aria("valuenow", String(percent));
      yield* aria("valuemin", "0");
      yield* aria("valuemax", "100");
      yield* div(function* () {
        yield* className("progress-fill");
        yield* style({ width: `${percent}%` });
      });
    });
  });

const Filters = () =>
  nav(function* () {
    const { state, update } = yield* use(Store);

    yield* className("filters");
    yield* aria("label", "Filter tasks");
    yield* TagArray.gen(filters, ({ key, label }) =>
      button(function* () {
        const count = state.todos.filter((todo) => matches(key, todo)).length;
        yield* className("filter", state.filter === key && "is-active");
        yield* type("button");
        yield* aria("pressed", state.filter === key);
        yield* on("click", () => update((s) => ({ ...s, filter: key })));
        yield* text(label);
        yield* span(function* () {
          yield* className("filter-count");
          yield* text(String(count));
        });
      }),
    );
  });

const Check = (todo: Todo) =>
  button(function* () {
    const { update } = yield* use(Store);

    yield* className("check");
    yield* type("button");
    yield* role("checkbox");
    yield* aria("checked", todo.done);
    yield* aria(
      "label",
      todo.done ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`,
    );
    yield* on("click", () =>
      update((s) => ({
        ...s,
        todos: s.todos.map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)),
      })),
    );
    yield* span(function* () {
      yield* className("check-mark");
      yield* text("✓");
    });
  });

const EditField = (
  draft: string,
  setDraft: Setter<string | null>,
  commit: (title: string) => void,
) =>
  input(function* () {
    yield* className("edit-input");
    yield* aria("label", "Edit task");
    yield* value(draft);
    yield* onInput(setDraft);
    yield* on("keydown", (event) => {
      if (event.key === "Enter") commit(draft);
      if (event.key === "Escape") setDraft(null);
    });
    yield* onMount((el) => {
      el.focus();
      const clickAway = (event: PointerEvent) => {
        if (!(event.target instanceof Node) || el.contains(event.target)) return;
        if (el instanceof HTMLInputElement) commit(el.value);
      };
      document.addEventListener("pointerdown", clickAway);
      return () => document.removeEventListener("pointerdown", clickAway);
    });
  });

const TodoItem = (todo: Todo) =>
  li(function* () {
    const { update } = yield* use(Store);
    const [editing, setEditing] = yield* local<string | null>("editing", null);

    const commit = (draft: string) => {
      const title = draft.trim();
      setEditing(null);
      update((s) => ({
        ...s,
        todos: title
          ? s.todos.map((t) => (t.id === todo.id ? { ...t, title } : t))
          : s.todos.filter((t) => t.id !== todo.id),
      }));
    };

    yield* className("item", todo.done && "is-done");
    yield* Check(todo);

    if (editing === null) {
      yield* span(function* () {
        yield* className("item-title");
        yield* title("Double-click to edit");
        yield* on("dblclick", () => setEditing(todo.title));
        yield* text(todo.title);
      });
    } else {
      yield* EditField(editing, setEditing, commit);
    }

    yield* button(function* () {
      yield* className("remove");
      yield* type("button");
      yield* aria("label", `Delete "${todo.title}"`);
      yield* on("click", () =>
        update((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== todo.id) })),
      );
      yield* text("×");
    });
  }).keyed(todo.id);

const Empty = () =>
  div(function* () {
    const { state } = yield* use(Store);

    yield* className("empty");
    yield* span(function* () {
      yield* className("empty-icon");
      yield* text(state.filter === "done" ? "○" : "✦");
    });
    yield* p(function* () {
      yield* text(
        state.filter === "done"
          ? "Nothing finished yet."
          : state.filter === "active"
            ? "All clear. Nice work."
            : "No tasks yet. Add one above.",
      );
    });
  });

const List = () =>
  section(function* () {
    const { state } = yield* use(Store);
    const visible = state.todos.filter((todo) => matches(state.filter, todo));

    if (visible.length === 0) {
      yield* Empty();
      return;
    }
    yield* ul(function* () {
      yield* className("list");
      yield* TagArray.gen(visible, TodoItem);
    });
  });

const Footer = () =>
  footer(function* () {
    const { state, update } = yield* use(Store);
    const left = state.todos.filter((todo) => !todo.done).length;
    const finished = state.todos.length - left;

    yield* className("card-foot");
    yield* span(function* () {
      yield* text(`${plural(left, "task")} left`);
    });
    yield* button(function* () {
      yield* className("clear");
      yield* type("button");
      yield* disabled(finished === 0);
      yield* on("click", () =>
        update((s) => ({ ...s, todos: s.todos.filter((todo) => !todo.done) })),
      );
      yield* text("Clear completed");
    });
  });

export const View = (state: State, update: Update<State>) =>
  main(function* () {
    yield* provide(Store, { state, update });
    yield* className("shell");

    yield* section(function* () {
      yield* className("card");

      yield* header(function* () {
        yield* className("card-head");
        yield* div(function* () {
          yield* small(function* () {
            yield* className("eyebrow");
            yield* text(
              new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }),
            );
          });
          yield* h1(function* () {
            yield* text("Today");
          });
        });
        yield* Progress();
      });

      yield* Composer();
      yield* Filters();
      yield* List();
      yield* Footer();
    });

    yield* p(function* () {
      yield* className("hint");
      yield* text("Double-click a task to rename it · built entirely with yield*");
    });
  });
