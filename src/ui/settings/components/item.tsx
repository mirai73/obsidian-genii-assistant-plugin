import clsx from "clsx";
import React, { useEffect, useId } from "react";
import { useSearchContext } from "../sections";

export default function SettingItem(props: {
  id?: string;
  name: string;
  description?: string;
  children?: any;
  className?: string;
  sectionId?: string;
  tip?: string;
  textArea?: boolean;
}) {
  const searchContext = useSearchContext();
  const id = props.id || useId();
  useEffect(() => {
    searchContext?.register(
      id,
      `${props.name}, ${props.description}`.toLocaleLowerCase(),
      props.sectionId
    );

    return () => searchContext?.unRegister(id);
  }, [id, props.name, props.description]);

  return (
    <div
      data-tip={props.tip}
      className={clsx(
        "plug-tg-flex plug-tg-w-full plug-tg-gap-2 plug-tg-py-2",
        {
          "plug-tg-items-center plug-tg-justify-between": !props.textArea,
          "plug-tg-flex-col": props.textArea,
        },
        props.className,
        {
          "plug-tg-hidden":
            searchContext && !searchContext.listOfAllowed.contains(id),
          "plug-tg-tooltip": props.tip?.length,
        }
      )}
    >
      <div className="plug-tg-flex plug-tg-flex-col plug-tg-gap-1">
        <div>{props.name}</div>
        <div className="plug-tg-text-[8px] plug-tg-opacity-70 md:plug-tg-text-xs">
          {props.description}
        </div>
      </div>
      <div className="plug-tg-flex plug-tg-items-center plug-tg-gap-2">
        {props.children}
      </div>
    </div>
  );
}
