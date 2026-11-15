// User-supplied shadcn.io Agent source; schema renderer adapted to Rare UI CodeBlock.
"use client";

import { BotIcon } from "lucide-react";
import type React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import CodeBlock from "@/components/ui/code-block";

/**
 * A tool as the agent gets it: the AI SDK's `Tool` fits, or any object with
 * a description and a JSON Schema for its input.
 */
export interface AgentToolSchema {
  /** What the tool does: the row's title. */
  description?: string;
  /** The AI SDK's field: a JSON Schema, or `jsonSchema()`'s wrapper of one. */
  inputSchema?: unknown;
  /** The tool's input as JSON Schema. Shown before `inputSchema`. */
  jsonSchema?: unknown;
}

/** The schema a tool shows: `jsonSchema`, else `inputSchema`, unwrapped. */
const schemaOf = (tool: AgentToolSchema): unknown => {
  const schema = tool.jsonSchema ?? tool.inputSchema;
  if (schema && typeof schema === "object" && "jsonSchema" in schema) {
    return schema.jsonSchema;
  }
  return schema;
};

const LABEL = "font-medium text-muted-foreground text-sm";

/** A schema in a small Code Block, highlighted, with a copy button. */
const AgentSchema = (props: {code:string; language:string}) => <CodeBlock code={props.code} language={props.language} className="max-h-72 overflow-auto"/>;

export type AgentProps = React.ComponentProps<"div">;

export const Agent = (props: AgentProps) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn(
        "not-prose flex w-full min-w-0 flex-col rounded-lg border bg-background text-foreground",
        className
      )}
      data-slot="agent"
      {...rest}
    />
  );
};

export interface AgentHeaderProps extends React.ComponentProps<"div"> {
  /** The model it runs on, shown as a badge after its name. */
  model?: string;
  /** The agent's name. */
  name: string;
}

export const AgentHeader = (props: AgentHeaderProps) => {
  const { className, name, model, children, ...rest } = props;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-center justify-between gap-4 p-3",
        className
      )}
      data-slot="agent-header"
      {...rest}
    >
      <div className="flex min-w-0 items-center gap-2">
        <BotIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="truncate font-medium text-sm" data-slot="agent-name">
          {name}
        </span>
        {model ? (
          <Badge
            className="min-w-0 shrink font-mono"
            data-slot="agent-model"
            variant="secondary"
          >
            <span className="truncate">{model}</span>
          </Badge>
        ) : null}
      </div>
      {children}
    </div>
  );
};

export type AgentContentProps = React.ComponentProps<"div">;

export const AgentContent = (props: AgentContentProps) => {
  const { className, ...rest } = props;

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-4 p-4 pt-0", className)}
      data-slot="agent-content"
      {...rest}
    />
  );
};

export interface AgentInstructionsProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The system prompt. */
  children: string;
  /** The heading above it. */
  label?: string;
}

export const AgentInstructions = (props: AgentInstructionsProps) => {
  const { className, children, label = "Instructions", ...rest } = props;

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="agent-instructions"
      {...rest}
    >
      <span className={LABEL}>{label}</span>
      <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-muted-foreground text-sm leading-relaxed">
        <p>{children}</p>
      </div>
    </div>
  );
};

export type AgentToolsProps = Omit<Extract<React.ComponentProps<typeof Accordion>, {type:"multiple"}>,"type"> & {
  /** The heading above the list. */
  label?: string;
};

export const AgentTools = (props: AgentToolsProps) => {
  const { className, label = "Tools", ...rest } = props;
  // The label names the list for screen readers: "Tools, group".
  const labelId = useId();

  return (
    <div
      aria-labelledby={labelId}
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="agent-tools"
      role="group"
    >
      <span className={LABEL} id={labelId}>
        {label}
      </span>
      <Accordion className="rounded-md border" type="multiple" {...rest} />
    </div>
  );
};

export type AgentToolProps = React.ComponentProps<typeof AccordionItem> & {
  /** The tool: its description is the row, its input schema the panel. */
  tool: AgentToolSchema;
};

export const AgentTool = (props: AgentToolProps) => {
  const { className, tool, ...rest } = props;
  const schema = schemaOf(tool);

  return (
    <AccordionItem
      className={cn("min-w-0 border-b last:border-b-0", className)}
      data-slot="agent-tool"
      {...rest}
    >
      <AccordionTrigger className="items-center gap-2 rounded-none px-3 py-2 text-sm hover:no-underline focus-visible:ring-inset">
        {tool.description ?? "No description"}
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        <AgentSchema
          code={JSON.stringify(schema ?? {}, null, 2)}
          language="json"
        />
      </AccordionContent>
    </AccordionItem>
  );
};

export interface AgentOutputProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** The heading above it. */
  label?: string;
  /** The language the schema is highlighted in. */
  language?: string;
  /** What the agent returns: a type or a JSON Schema, as text. */
  schema: string;
}

export const AgentOutput = (props: AgentOutputProps) => {
  const {
    className,
    schema,
    label = "Output Schema",
    language = "typescript",
    ...rest
  } = props;

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="agent-output"
      {...rest}
    >
      <span className={LABEL}>{label}</span>
      <AgentSchema code={schema} language={language} />
    </div>
  );
};
