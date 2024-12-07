import React, { useState, useEffect } from "react";

import validator from "@rjsf/validator-ajv8";
import { Theme } from "./rjsf";
import { FormProps, withTheme } from "@rjsf/core";
import TextGeneratorPlugin from "#/main";

const Form = withTheme(Theme);

export default function TemplateInputModalView(props: {
  p: { plugin: TextGeneratorPlugin; close?: () => void };
  labels: string[];
  templateContext: any;
  onSubmit: any;
  metadata: any;
  children?: any;
}) {
  const handleSubmit = (data: any, event: any) => {
    event.preventDefault();
    props.onSubmit(data.formData);
    props.p.close?.();
  };

  const [JSONSchema, setJSONSchema] = useState<FormProps["schema"]>({});
  const [UISchema, setUISchema] = useState<FormProps["uiSchema"]>({});
  const [formData, setFormData] = useState<FormProps["formData"]>({});

  useEffect(() => {
    (async () => {
      const basicProps: Record<string, FormProps["schema"]> = {};
      const basicUi: Record<string, FormProps["uiSchema"]> = {};
      const required: string[] = [];
      const formData: FormProps["formData"] = {};
      props.labels.forEach((l) => {
        if (typeof props.templateContext[l] !== "object") {
          basicProps[l] = {
            type: "string",
            title: l,
          };
          basicUi[l] = {
            "ui:widget": "textarea",
            "ui:autofocus": true,
            props: {
              className: "w-full",
            },
          };
        }
        formData[l] = props.templateContext[l];
        if (props.templateContext.strict && !l.contains("_optional"))
          required.push(l);
      });

      const obj = {
        title: props.metadata.name || props.metadata.id,
        type: "object",
        properties: basicProps,
        required,
      } as FormProps["schema"];

      setJSONSchema(obj);
      setUISchema(basicUi);
      setFormData(formData);

      if (props.templateContext.templatePath) {
        const cschema =
          await props.p.plugin.contextManager?.getTemplateCustomInputConfig(
            props.templateContext.templatePath
          );
        console.log({ cschema });
        if (cschema) {
          setJSONSchema({
            ...obj,
            ...(cschema.properties ? { required: [] } : {}),
            ...cschema,
          });

          if (cschema.uiSchema) setUISchema(cschema.uiSchema);

          if (cschema.formData)
            setFormData({
              ...formData,
              ...cschema.formData,
            });
        }
      }
    })();
  }, []);

  return (
    <Form
      className="plug-tg-w-full"
      schema={JSONSchema}
      uiSchema={UISchema}
      formData={formData}
      validator={validator}
      onChange={(d) => {
        if (d.formData) setFormData(formData);
      }}
      onSubmit={handleSubmit}
    >
      {props.children}
    </Form>
  );
}
