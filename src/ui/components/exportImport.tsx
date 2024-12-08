import React, { useEffect, useId, useState } from "react";
import useGlobal from "../context/global/context";
import clsx from "clsx";
import JSON5 from "json5";
import { IconFileUpload, IconPackageExport } from "@tabler/icons-react";
import { currentDate, getCurrentTime } from "#/utils";
export default function ExportImportHandler(props: {
  getConfig: () => any;
  id: string;
  title: string;
  onImport: (data: any) => Promise<void>;
  name: string;
}) {
  const global = useGlobal();
  const backupsDatasetId = useId();

  const [backups, setBackups] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const backupsDirectory = global?.plugin.getTextGenPath(`configs/${props.id}`);

  useEffect(() => {
    if (!backupsDirectory) return;
    (async () => {
      if (!(await global?.plugin.app.vault.adapter.exists(backupsDirectory)))
        return setBackups([]);
      const files =
        await global?.plugin.app.vault.adapter.list(backupsDirectory);
      if (files)
        setBackups(
          files?.files.map((f) => f.substring(backupsDirectory.length + 1))
        );
    })();
  }, [global?.enableTrigger, backupsDirectory]);

  return (
    <>
      <datalist id={backupsDatasetId}>
        {[...backups].map((bu) => (
          <option key={bu} value={bu} />
        ))}
      </datalist>
      <div className="plug-tg-flex plug-tg-w-full plug-tg-items-center plug-tg-justify-between">
        <div className="plug-tg-text-xs plug-tg-font-thin">
          {/* <Input type="checkbox" value={false} setValue={() => { }} /> */}
          {props.title}
        </div>
        <div className="plug-tg-flex plug-tg-gap-2">
          <button
            onClick={async () => {
              setError("");
              setExporting(true);
              try {
                if (!backupsDirectory) {
                  throw new Error("Backup directory not set");
                }
                await global?.plugin.app.vault.adapter.mkdir(backupsDirectory);

                const config = { ...(await props.getConfig()) };
                const configAsString = `\`\`\`JSON
${JSON5.stringify(config, null, 2)}
\`\`\``;

                let fileName =
                  props.name?.replaceAll(" ", "_") ||
                  `config_${currentDate()}${getCurrentTime()}`;

                // use the provided name if it doesn't exists already (if it exists it could just be the user selecting one of his configs)
                if (selectedBackup?.length && !backups.includes(selectedBackup))
                  fileName = selectedBackup.endsWith(".json.md")
                    ? selectedBackup.slice(0, -".json.md".length)
                    : selectedBackup;

                let newPath = `${backupsDirectory}/${fileName}`;

                if (
                  await global?.plugin.app.vault.adapter.exists(
                    newPath + ".json.md"
                  )
                )
                  newPath = `${backupsDirectory}/${fileName.replace(
                    ".json.md",
                    ""
                  )}_${getCurrentTime()}`;

                await global?.plugin.app.vault.adapter.write(
                  newPath + ".json.md",
                  configAsString
                );
              } catch (err: any) {
                setError(err?.message || err);
              }
              setExporting(false);
              global?.triggerReload();
            }}
            className={clsx("plug-tg-tooltip plug-tg-tooltip-top", {
              "plug-tg-btn-disabled plug-tg-loading": exporting,
            })}
            data-tip="Export Profile"
            disabled={exporting}
          >
            <IconPackageExport />
          </button>
          <button
            className={clsx("plug-tg-tooltip plug-tg-tooltip-top")}
            onClick={async () => {
              const content = await selectJSONMDFile();
              const r = content.trimStart().trimEnd().split("```JSON");
              r.shift();
              const r2 = r.join("```JSON").split("```");
              r2.pop();

              const jsonContent = JSON5.parse(r2.join("```"));
              props.onImport(jsonContent);
            }}
            data-tip="Import Profile"
          >
            <IconFileUpload />
          </button>
        </div>
      </div>

      <div>{error}</div>
    </>
  );
}

function selectJSONMDFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json.md";

    input.onchange = (event) => {
      // @ts-ignore
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        reject(reader.error);
      };

      reader.readAsText(file);
    };

    input.click();
  });
}
