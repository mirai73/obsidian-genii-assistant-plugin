import React, { useState, useEffect } from "react";
import DownloadSVG from "#/ui/svgs/download";
import BadgeCheckSVG from "#/ui/svgs/badge-check";
import { nFormatter } from "#/utils";
import PackageManager, { ProviderServer } from "../package-manager";
import { PackageTemplate } from "#/types";
import { PluginManifest } from "obsidian";
import { useToggle } from "usehooks-ts";
import attemptLogin from "../login";
import JSON5 from "json5";
import useGlobal from "#/ui/context/global";
import MarkDownViewer from "#/ui/components/Markdown";

export default function TemplateDetails(props: {
  packageId: any;
  packageManager: PackageManager;
  updateView: any;
  checkForUpdates: any;
  mini?: boolean;
}) {
  const glob = useGlobal();

  const { packageId, packageManager, updateView, checkForUpdates } = props;

  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState("0/0");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState("");
  const [_, triggerReload] = useToggle();
  const [htmlVar, setHtmlVar] = useState("");
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const [stateProps, setStateProps] = useState<{
    package?: PackageTemplate | null;
    installed?: any;
    ownedOrReq?: {
      allowed: boolean;
      oneRequired?: string[];
    };
  }>({});

  useEffect(() => {
    (async () => {
      const pkg = packageManager.getPackageTemplateById(packageId);
      console.log({
        package: pkg,
        installed: await packageManager.getInstalledPackageById(packageId),
        ownedOrReq:
          pkg?.price || !pkg?.packageId
            ? {
                allowed: true,
                oneRequired: [],
              }
            : await packageManager.validateOwnership(pkg?.packageId),
      });

      setStateProps({
        package: pkg,
        installed: false,
        ownedOrReq:
          pkg?.price || !pkg?.packageId
            ? {
                allowed: true,
                oneRequired: [],
              }
            : {
                allowed: false,
                oneRequired: [],
              },
      });

      packageManager.getInstalledPackageById(packageId).then((installed) => {
        console.log({ installed });
        setStateProps((p) => ({ ...p, installed }));
      });

      if (!(pkg?.price || !pkg?.packageId))
        packageManager.validateOwnership(packageId).then((ownedOrReq) => {
          setStateProps((p) => ({ ...p, ownedOrReq }));
        });
    })();
  }, [packageId, installing, enabling, _]);

  const validateOwnership = async () => {
    try {
      const ownedOrReq = stateProps.installed
        ? {
            allowed: true,
          }
        : await packageManager.validateOwnership(packageId);

      setStateProps((stateProps) => ({
        ...stateProps,
        ownedOrReq,
      }));
    } catch (err: any) {
      setStateProps((stateProps) => ({
        ...stateProps,
        ownedOrReq: {
          allowed: false,
          oneRequired: [],
        },
      }));
      setServiceUnavailable((err.message || err).includes("<html>"));
      console.error("failed to validate ownership", err);
    }
  };

  useEffect(() => {
    validateOwnership();
  }, [packageId, stateProps.installed]);

  useEffect(() => {
    packageManager.getReadme(packageId).then((html: any) => {
      setHtmlVar(html);
    });
  }, [packageId]);

  async function install() {
    setError("");
    setInstalling(true);
    try {
      await packageManager.installPackage(packageId, true, (progress) => {
        setProgress(`${progress.installed}/${progress.total}`);
      });

      updateLocalView();
      updateView();
      setInstalling(false);
    } catch (err: any) {
      setError(err.message || err);
      console.error(err);
      setInstalling(false);
    }
  }

  async function uninstall() {
    setError("");
    setInstalling(true);
    try {
      try {
        if (stateProps.package?.type === "feature") await disable();
      } catch {
        console.warn("couldn't disable the feature");
      }
      await packageManager.uninstallPackage(packageId);
      updateLocalView();
      updateView();
      setInstalling(false);
    } catch (err: any) {
      setError(err.message || err);
      console.error(err);
      setInstalling(false);
    }
  }

  async function getFeatureId() {
    if (
      !stateProps.installed ||
      !stateProps.package ||
      stateProps.package.type != "feature"
    )
      throw "getFeatureId wont work here";

    const manifestJson = `.obsidian/plugins/${stateProps.package.packageId}/manifest.json`;

    if (!(await packageManager.app.vault.adapter.exists(manifestJson)))
      throw "manifest.json doesn't exist to read the packageid";

    const manifest: PluginManifest = JSON5.parse(
      await packageManager.app.vault.adapter.read(manifestJson)
    );
    return manifest.id;
  }

  async function enable() {
    setEnabling(true);
    try {
      // @ts-ignore
      await packageManager.app.plugins.enablePlugin(await getFeatureId());
    } catch (err: any) {
      setEnabling(false);
      throw err;
    }
    setEnabling(false);
  }

  async function disable() {
    setEnabling(true);
    try {
      // @ts-ignore
      await packageManager.app.plugins.disablePlugin(await getFeatureId());
    } catch (err: any) {
      setEnabling(false);
      throw err;
    }
    setEnabling(false);
  }

  async function update() {
    setInstalling(true);
    try {
      await packageManager.updatePackage(packageId);
      updateLocalView();
      updateView();
      checkForUpdates();
    } finally {
      setInstalling(false);
    }
  }

  async function updateLocalView() {
    setStateProps({
      package: packageManager.getPackageTemplateById(packageId),
      installed: await packageManager.getInstalledPackageById(packageId),
    });
  }

  async function buy() {
    try {
      if (!stateProps.package?.packageId) throw "no package selected";
      const pkgOwn = await packageManager.validateOwnership(
        stateProps.package?.packageId
      );

      if (!pkgOwn.oneRequired) throw new Error("Not buyable");

      // open the login website
      window.open(
        new URL(
          `/dashboard/subscriptions/checkout?type=${encodeURIComponent(
            pkgOwn.oneRequired.join(",")
          )}&callback=${encodeURIComponent(
            `obsidian://text-gen?intent=bought-package&packageId=${stateProps.package?.packageId}`
          )}`,
          ProviderServer
        ).href
      );
    } catch (err: any) {
      setEnabling(false);
      throw err;
    }
  }

  const enabledFeature =
    // @ts-ignore
    !!packageManager.app.plugins.plugins["obsidian-tg-chat"];

  useEffect(() => {
    if (globalThis) {
      // @ts-ignore
      if (globalThis?.k) return;
      // @ts-ignore
      globalThis.k = true;
    }

    const onFocus = async () => {
      try {
        await packageManager.updateBoughtResources();
        triggerReload();
      } catch (err: any) {
        console.error(err);
      }
    };

    (async () => {
      try {
        window.addEventListener("focus", onFocus);
      } catch (err: any) {
        console.error(err);
      }
    })();

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (serviceUnavailable)
    return (
      <div className="plug-tg-flex plug-tg-h-full plug-tg-w-full plug-tg-flex-col plug-tg-items-center plug-tg-justify-center">
        <div className="plug-tg-flex plug-tg-flex-col plug-tg-justify-center plug-tg-gap-8">
          <h1>Service Unavailable</h1>
          <button onClick={triggerReload}>Retry</button>
        </div>
      </div>
    );

  return (
    <>
      <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-2">
        <div className="community-modal-info-name">
          {stateProps.package?.name}

          {stateProps.installed && (
            <span className="flair mod-pop">Installed</span>
          )}
        </div>
        <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-1">
          {stateProps.package?.core ? (
            <>
              <div className="plug-tg-flex plug-tg-items-center plug-tg-gap-2">
                <BadgeCheckSVG />
                <span>Made By Text-Gen</span>
              </div>
            </>
          ) : (
            <div className="community-modal-info-downloads">
              <span>
                <DownloadSVG />
              </span>
              <span className="community-modal-info-downloads-text">
                {nFormatter(stateProps.package?.downloads)}
              </span>
            </div>
          )}

          <div className="community-modal-info-version plug-tg-flex plug-tg-items-center plug-tg-gap-2">
            <span>Version:</span>
            <span> {stateProps.package?.version} </span>
            <span>
              {stateProps.installed &&
                `(currently installed: ${stateProps.installed.version})`}
            </span>
          </div>
          <div className="community-modal-info-repo plug-tg-flex plug-tg-items-center plug-tg-gap-2">
            <span>Platforms:</span>
            <span>
              {stateProps.package?.desktopOnly ? "Only Desktop" : "All"}
            </span>
          </div>
          {!stateProps.package?.price && (
            <div className="community-modal-info-repo plug-tg-flex plug-tg-items-center plug-tg-gap-2">
              <span>Repository:</span>
              <a
                target="_blank"
                href={`https://github.com/${stateProps.package?.repo}`}
                rel="noreferrer"
              >
                {stateProps.package?.repo}
              </a>
            </div>
          )}

          <div className="community-modal-info-author plug-tg-flex plug-tg-items-center plug-tg-gap-2">
            <span>By</span>
            <a
              target="_blank"
              href={`${stateProps.package?.authorUrl}`}
              rel="noreferrer"
            >
              {stateProps.package?.author}
            </a>
          </div>

          <div className="community-modal-info-desc plug-tg-select-text">
            {stateProps.package?.description}
          </div>
        </div>
      </div>
      {/* Controls */}
      <div className="community-modal-button-container">
        {!stateProps.package?.price ? (
          <>
            {!(stateProps.ownedOrReq?.allowed && !stateProps.package?.price) ? (
              <button
                className="mod-cta plug-tg-cursor-pointer"
                onClick={() => buy()}
              >
                Buy
              </button>
            ) : stateProps.installed ? (
              <>
                {/* feature controls */}
                {stateProps.package?.type === "feature" &&
                  (!enabledFeature ? (
                    <button
                      className="plug-tg-cursor-pointer plug-tg-bg-red-300"
                      onClick={() => !enabling && enable()}
                    >
                      Enabl{enabling ? "ing..." : "e"}
                    </button>
                  ) : (
                    <button
                      className="plug-tg-cursor-pointer plug-tg-bg-red-300"
                      onClick={() => !enabling && disable()}
                    >
                      Disabl{enabling ? "ing..." : "e"}
                    </button>
                  ))}

                <button
                  className="plug-tg-cursor-pointer plug-tg-bg-red-300"
                  onClick={() => !installing && uninstall()}
                >
                  Uninstall{installing ? "ing..." : ""}
                </button>
                {stateProps.installed.version !==
                  stateProps.package?.version && (
                  <button
                    className="mod-cta plug-tg-cursor-pointer"
                    onClick={() => !installing && update()}
                  >
                    Update{installing ? "ing..." : ""}
                  </button>
                )}
              </>
            ) : (
              <button
                className={
                  installing
                    ? "plug-tg-btn-disabled"
                    : "mod-cta plug-tg-cursor-pointer"
                }
                onClick={() => !installing && install()}
                disabled={installing}
              >
                Install{installing ? `ing...${progress}` : ""}
              </button>
            )}
          </>
        ) : (
          <button
            className="mod-cta plug-tg-cursor-pointer"
            onClick={async () => {
              await attemptLogin(packageManager.plugin);
              if (glob.triggerReload) glob.triggerReload();
            }}
          >
            Login
          </button>
        )}
        {!stateProps.package?.core && (
          <button
            className="mod-cta plug-tg-cursor-pointer"
            onClick={() =>
              (window.location.href = `${stateProps.package?.authorUrl}`)
            }
          >
            Support
          </button>
        )}
      </div>
      {error && <span> ERROR: {error}</span>}
      <hr />
      {/* @ts-ignore */}
      {!(htmlVar.innerHTML || htmlVar) && (
        <div role="status" className="plug-tg-max-w-sm plug-tg-animate-pulse">
          <div className="plug-tg-mb-4 plug-tg-h-8 plug-tg-w-48 plug-tg-max-w-[800px] plug-tg-rounded-full dark:plug-tg-bg-gray-300/30"></div>
          <div className="plug-tg-mb-2.5  plug-tg-h-2 plug-tg-max-w-[360px] plug-tg-rounded-full dark:plug-tg-bg-gray-300/25"></div>
          <div className="plug-tg-mb-2.5  plug-tg-h-2 plug-tg-max-w-[330px] plug-tg-rounded-full dark:plug-tg-bg-gray-300/25"></div>
          <div className="plug-tg-mb-2.5  plug-tg-h-2 plug-tg-max-w-[300px] plug-tg-rounded-full dark:plug-tg-bg-gray-300/25"></div>
          <span className="plug-tg-sr-only">Loading...</span>
        </div>
      )}

      {!props.mini && (
        <MarkDownViewer>
          {/* @ts-ignore */}
          {htmlVar.innerHTML || htmlVar || ""}
        </MarkDownViewer>
      )}
    </>
  );
}
