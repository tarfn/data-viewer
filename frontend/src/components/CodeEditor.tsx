import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { json } from "@codemirror/lang-json";
import { autocompletion } from "@codemirror/autocomplete";

export function CodeEditor({
  value,
  language,
  onChange,
  onRun,
}: {
  value: string;
  language: "sql" | "json";
  onChange: (value: string) => void;
  onRun: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onRun });
  callbacks.current = { onChange, onRun };
  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          language === "sql"
            ? sql({
                dialect: PostgreSQL,
                schema: {
                  public: {
                    users: ["id", "name", "email"],
                    orders: ["id", "user_id", "total"],
                  },
                },
              })
            : json(),
          ...(language === "json"
            ? [
                autocompletion({
                  override: [
                    (context) => {
                      const word = context.matchBefore(/[\w$]+/);
                      if (!word || (!context.explicit && word.from === word.to))
                        return null;
                      return {
                        from: word.from,
                        options: [
                          "$eq",
                          "$gt",
                          "$in",
                          "find",
                          "filter",
                          "projection",
                          "limit",
                          "name",
                          "active",
                        ].map((label) => ({ label, type: "property" })),
                      };
                    },
                  ],
                }),
              ]
            : []),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                callbacks.current.onRun();
                return true;
              },
            },
          ]),
          EditorView.contentAttributes.of({
            "aria-label":
              language === "sql" ? "SQL statement" : "MongoDB command JSON",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              callbacks.current.onChange(update.state.doc.toString());
          }),
          EditorView.lineWrapping,
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
    // The editor is created for a language; controlled document updates happen below.
  }, [language]);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
  }, [value]);
  return <div className="code-editor" ref={host} />;
}
